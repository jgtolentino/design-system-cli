import * as fs from 'fs';
import * as path from 'path';

/**
 * Brand stripping utility - removes brand names, copy, and identifiable content
 * from extracted HTML and components
 */

export interface BrandStrippingConfig {
  // Brand names to remove
  brandNames: string[];

  // Replacement strategy
  replacements: Record<string, string>;

  // Generic fallbacks
  genericReplacements: {
    companyName: string;
    productName: string;
    tagline: string;
  };

  // Patterns to detect and replace
  patterns: {
    urls?: string[];
    emails?: string[];
    socialHandles?: string[];
  };
}

export interface BrandStrippingResult {
  filesProcessed: number;
  replacementsMade: number;
  brandMentionsRemoved: string[];
  warnings: string[];
}

const DEFAULT_CONFIG: BrandStrippingConfig = {
  brandNames: [],
  replacements: {},
  genericReplacements: {
    companyName: 'InsightPulse',
    productName: 'Product Name',
    tagline: 'Your tagline here'
  },
  patterns: {}
};

/**
 * Detect brand names automatically from content
 */
export function detectBrandNames(content: string): string[] {
  const detected: Set<string> = new Set();

  // Common brand patterns
  const patterns = [
    // Company names in titles/headers
    /<h[1-6][^>]*>([^<]+(?:Inc|LLC|Corp|Ltd|Corporation|Company|Technologies|Labs|Studio|Group))<\/h[1-6]>/gi,

    // Copyright notices
    /©\s*\d{4}\s+([A-Z][a-zA-Z\s]+(?:Inc|LLC|Corp|Ltd))/g,

    // Meta tags
    /<meta[^>]*content="([^"]*(?:Inc|LLC|Corp|Ltd)[^"]*)"/gi,

    // Capitalized multi-word phrases (likely brand names)
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g
  ];

  patterns.forEach(pattern => {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 3) {
        detected.add(match[1].trim());
      }
    }
  });

  return Array.from(detected)
    .filter(name => {
      // Filter out common false positives
      const commonWords = ['The Company', 'Our Team', 'Learn More', 'Contact Us', 'About Us'];
      return !commonWords.includes(name);
    })
    .sort((a, b) => b.length - a.length); // Sort by length (replace longer strings first)
}

/**
 * Strip brand names from a single file
 */
export function stripBrandFromFile(
  filePath: string,
  config: BrandStrippingConfig
): { replacements: number; content: string } {
  let content = fs.readFileSync(filePath, 'utf-8');
  let replacements = 0;

  // Replace brand names
  config.brandNames.forEach(brandName => {
    const regex = new RegExp(brandName, 'gi');
    const matches = content.match(regex);

    if (matches) {
      const replacement = config.replacements[brandName] || config.genericReplacements.companyName;
      content = content.replace(regex, replacement);
      replacements += matches.length;
    }
  });

  // Replace URLs
  if (config.patterns.urls) {
    config.patterns.urls.forEach(url => {
      const regex = new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = content.match(regex);

      if (matches) {
        content = content.replace(regex, 'https://example.com');
        replacements += matches.length;
      }
    });
  }

  // Replace email addresses
  if (config.patterns.emails) {
    config.patterns.emails.forEach(email => {
      const regex = new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = content.match(regex);

      if (matches) {
        content = content.replace(regex, 'contact@example.com');
        replacements += matches.length;
      }
    });
  }

  // Replace social handles
  if (config.patterns.socialHandles) {
    config.patterns.socialHandles.forEach(handle => {
      const regex = new RegExp(handle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = content.match(regex);

      if (matches) {
        content = content.replace(regex, '@example');
        replacements += matches.length;
      }
    });
  }

  return { replacements, content };
}

/**
 * Process entire directory
 */
export function stripBrandFromDirectory(
  directory: string,
  config: Partial<BrandStrippingConfig>
): BrandStrippingResult {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  console.log('🧹 Stripping brand identifiers...\n');

  let filesProcessed = 0;
  let totalReplacements = 0;
  const brandMentions: Set<string> = new Set();
  const warnings: string[] = [];

  // If no brand names provided, attempt auto-detection
  if (fullConfig.brandNames.length === 0) {
    console.log('🔍 Auto-detecting brand names...');

    const htmlPath = path.join(directory, 'extracted.html');
    if (fs.existsSync(htmlPath)) {
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
      const detected = detectBrandNames(htmlContent);

      if (detected.length > 0) {
        console.log(`   Found ${detected.length} potential brand names:`);
        detected.forEach(name => console.log(`   - ${name}`));
        console.log('');

        fullConfig.brandNames = detected;
      } else {
        warnings.push('Auto-detection found no brand names. Manual configuration recommended.');
      }
    }
  }

  // Process files
  const filesToProcess = [
    path.join(directory, 'extracted.html'),
    ...findFilesRecursive(path.join(directory, 'components'), ['.tsx', '.ts']),
    ...findFilesRecursive(path.join(directory, 'pages'), ['.tsx', '.ts'])
  ];

  filesToProcess.forEach(filePath => {
    if (!fs.existsSync(filePath)) return;

    const result = stripBrandFromFile(filePath, fullConfig);

    if (result.replacements > 0) {
      fs.writeFileSync(filePath, result.content, 'utf-8');
      filesProcessed++;
      totalReplacements += result.replacements;

      fullConfig.brandNames.forEach(name => {
        if (result.content.includes(name)) {
          brandMentions.add(name);
        }
      });

      console.log(`   ✓ ${path.basename(filePath)}: ${result.replacements} replacements`);
    }
  });

  console.log(`\n✅ Processed ${filesProcessed} files, ${totalReplacements} replacements made\n`);

  return {
    filesProcessed,
    replacementsMade: totalReplacements,
    brandMentionsRemoved: fullConfig.brandNames,
    warnings
  };
}

/**
 * Find all files with specific extensions recursively
 */
function findFilesRecursive(dir: string, extensions: string[]): string[] {
  if (!fs.existsSync(dir)) return [];

  const files: string[] = [];
  const items = fs.readdirSync(dir);

  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findFilesRecursive(fullPath, extensions));
    } else if (extensions.some(ext => fullPath.endsWith(ext))) {
      files.push(fullPath);
    }
  });

  return files;
}

/**
 * Create a brand stripping config from command-line args or interactive prompts
 */
export function createBrandStrippingConfig(options: {
  brandNames?: string[];
  companyName?: string;
  productName?: string;
  tagline?: string;
}): BrandStrippingConfig {
  const config: BrandStrippingConfig = {
    brandNames: options.brandNames || [],
    replacements: {},
    genericReplacements: {
      companyName: options.companyName || 'InsightPulse',
      productName: options.productName || 'Product Name',
      tagline: options.tagline || 'Your tagline here'
    },
    patterns: {}
  };

  // Create specific replacements if brand names provided
  if (config.brandNames.length > 0) {
    config.brandNames.forEach((brandName, index) => {
      if (index === 0) {
        config.replacements[brandName] = config.genericReplacements.companyName;
      } else {
        config.replacements[brandName] = config.genericReplacements.productName;
      }
    });
  }

  return config;
}
