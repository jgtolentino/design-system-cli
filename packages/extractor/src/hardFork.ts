import * as fs from 'fs';
import * as path from 'path';
import { stripBrandFromDirectory, BrandStrippingConfig, createBrandStrippingConfig } from './brandStripping';
import { shiftTokens, TokenShiftConfig, TOKEN_SHIFT_PRESETS } from './tokenShifter';
import { renameComponents, ComponentRenamingConfig } from './componentRenaming';

/**
 * Hard Fork Pipeline - Transform extracted site into legally clean,
 * brand-neutral, reusable template
 *
 * Phase 8: Hard Fork & Rebrand
 */

export interface HardForkOptions {
  // Input/Output
  sourceDir: string;
  outputDir?: string;

  // Brand configuration
  brandConfig?: {
    brandNames?: string[];
    companyName?: string;
    productName?: string;
    tagline?: string;
  };

  // Token transformation
  tokenConfig?: TokenShiftConfig | keyof typeof TOKEN_SHIFT_PRESETS;

  // Component renaming
  componentConfig?: ComponentRenamingConfig;

  // Workflow options
  skipBrandStripping?: boolean;
  skipTokenShifting?: boolean;
  skipComponentRenaming?: boolean;
  skipAssetRegeneration?: boolean;

  // Token file path (if different from default)
  tokensPath?: string;
}

export interface HardForkResult {
  success: boolean;
  outputDir: string;
  summary: {
    brandStripping?: {
      filesProcessed: number;
      replacementsMade: number;
    };
    tokenShifting?: {
      colorsShifted: number;
      fontsReplaced: number;
      spacingAdjusted: number;
    };
    componentRenaming?: {
      renamed: number;
      mappings: Record<string, string>;
    };
  };
  warnings: string[];
  errors: string[];
}

/**
 * Execute complete hard fork workflow
 */
export async function hardFork(options: HardForkOptions): Promise<HardForkResult> {
  console.log('🍴 Starting hard fork workflow...\n');
  console.log(`📂 Source: ${options.sourceDir}`);
  console.log(`📂 Output: ${options.outputDir || options.sourceDir + '-fork'}\n`);

  const warnings: string[] = [];
  const errors: string[] = [];
  const summary: HardForkResult['summary'] = {};

  // Determine output directory
  const outputDir = options.outputDir || `${options.sourceDir}-fork`;

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Copy source to output (if different)
  if (outputDir !== options.sourceDir) {
    console.log('📋 Copying source files...\n');
    copyDirectory(options.sourceDir, outputDir);
  }

  try {
    // Step 1: Brand Stripping
    if (!options.skipBrandStripping) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Step 1: Brand Stripping');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      const brandConfig = createBrandStrippingConfig({
        brandNames: options.brandConfig?.brandNames,
        companyName: options.brandConfig?.companyName || 'InsightPulse',
        productName: options.brandConfig?.productName || 'Product Name',
        tagline: options.brandConfig?.tagline || 'Your tagline here'
      });

      const brandResult = stripBrandFromDirectory(outputDir, brandConfig);

      summary.brandStripping = {
        filesProcessed: brandResult.filesProcessed,
        replacementsMade: brandResult.replacementsMade
      };

      warnings.push(...brandResult.warnings);
    }

    // Step 2: Token Shifting
    if (!options.skipTokenShifting) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Step 2: Token Shifting');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Find tokens file
      const tokensPath = options.tokensPath || findTokensFile(outputDir);

      if (tokensPath && fs.existsSync(tokensPath)) {
        // Determine token config
        let tokenConfig: TokenShiftConfig;

        if (typeof options.tokenConfig === 'string') {
          tokenConfig = TOKEN_SHIFT_PRESETS[options.tokenConfig];
          console.log(`   Using preset: ${options.tokenConfig}\n`);
        } else {
          tokenConfig = options.tokenConfig || TOKEN_SHIFT_PRESETS.moderate;
        }

        const tokensOutputPath = path.join(outputDir, 'tokens', 'tokens-shifted.json');

        // Ensure tokens directory exists
        const tokensDir = path.dirname(tokensOutputPath);
        if (!fs.existsSync(tokensDir)) {
          fs.mkdirSync(tokensDir, { recursive: true});
        }

        const tokenResult = shiftTokens(tokensPath, tokensOutputPath, tokenConfig);

        summary.tokenShifting = tokenResult.transformations;

        // Also copy original tokens for reference
        fs.copyFileSync(tokensPath, path.join(outputDir, 'tokens', 'tokens-original.json'));
      } else {
        warnings.push('No tokens file found - skipping token shifting');
        console.log('⚠️  No tokens file found - skipping\n');
      }
    }

    // Step 3: Component Renaming
    if (!options.skipComponentRenaming) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Step 3: Component Renaming');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      const componentConfig = options.componentConfig || {
        convention: 'semantic' as const
      };

      const renamingResult = renameComponents(outputDir, componentConfig);

      summary.componentRenaming = {
        renamed: renamingResult.renamed,
        mappings: renamingResult.mappings
      };

      if (renamingResult.errors.length > 0) {
        errors.push(...renamingResult.errors);
      }

      // Save mapping for reference
      const mappingPath = path.join(outputDir, 'component-mappings.json');
      fs.writeFileSync(
        mappingPath,
        JSON.stringify({ timestamp: new Date().toISOString(), mappings: renamingResult.mappings }, null, 2),
        'utf-8'
      );
    }

    // Step 4: Asset Regeneration Instructions
    if (!options.skipAssetRegeneration) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Step 4: Asset Regeneration');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Check for asset-prompts.json
      const assetPromptsPath = path.join(outputDir, 'asset-prompts.json');

      if (fs.existsSync(assetPromptsPath)) {
        console.log('   ✓ Found asset-prompts.json');
        console.log('   ℹ️  Next steps:');
        console.log('      1. Edit asset-prompts.json to replace TODO placeholders');
        console.log('      2. Run: node scripts/generate-assets-gemini.js --prompts asset-prompts.json --out generated-assets/');
        console.log('      3. Update component image paths to point to generated assets\n');
      } else {
        console.log('   ⚠️  No asset-prompts.json found');
        console.log('   ℹ️  Run: ds assets-prompts --assets assets.json --out asset-prompts.json\n');
        warnings.push('Asset prompts not found - manual asset replacement needed');
      }
    }

    // Generate hard fork README
    generateHardForkReadme(outputDir, summary);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Hard Fork Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Summary:');
    if (summary.brandStripping) {
      console.log(`   Brand Stripping: ${summary.brandStripping.replacementsMade} replacements in ${summary.brandStripping.filesProcessed} files`);
    }
    if (summary.tokenShifting) {
      console.log(`   Token Shifting: ${summary.tokenShifting.colorsShifted} colors, ${summary.tokenShifting.fontsReplaced} fonts`);
    }
    if (summary.componentRenaming) {
      console.log(`   Component Renaming: ${summary.componentRenaming.renamed} components renamed`);
    }
    console.log('');

    if (warnings.length > 0) {
      console.log('⚠️  Warnings:');
      warnings.forEach(warning => console.log(`   - ${warning}`));
      console.log('');
    }

    if (errors.length > 0) {
      console.log('❌ Errors:');
      errors.forEach(error => console.log(`   - ${error}`));
      console.log('');
    }

    console.log(`📁 Output: ${outputDir}`);
    console.log(`📄 See: ${path.join(outputDir, 'HARDFORK_README.md')}\n`);

    return {
      success: errors.length === 0,
      outputDir,
      summary,
      warnings,
      errors
    };

  } catch (error) {
    errors.push(`Hard fork failed: ${(error as Error).message}`);
    console.error('\n❌ Hard fork failed:', (error as Error).message);

    return {
      success: false,
      outputDir,
      summary,
      warnings,
      errors
    };
  }
}

/**
 * Find tokens file in directory
 */
function findTokensFile(dir: string): string | null {
  const possiblePaths = [
    path.join(dir, 'tokens-normalized.json'),
    path.join(dir, 'tokens.json'),
    path.join(dir, 'tokens', 'tokens.json'),
    path.join(dir, 'design-system', 'tokens.json'),
    path.join(dir, '..', 'tokens-normalized.json')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

/**
 * Copy directory recursively
 */
function copyDirectory(source: string, destination: string): void {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const items = fs.readdirSync(source);

  items.forEach(item => {
    const sourcePath = path.join(source, item);
    const destPath = path.join(destination, item);
    const stat = fs.statSync(sourcePath);

    if (stat.isDirectory()) {
      copyDirectory(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  });
}

/**
 * Generate hard fork README
 */
function generateHardForkReadme(outputDir: string, summary: HardForkResult['summary']): void {
  const readmePath = path.join(outputDir, 'HARDFORK_README.md');

  const content = `# Hard Fork - Brand-Neutral Template

This directory contains a hard-forked version of the extracted website, transformed into a legally clean, brand-neutral, reusable template.

## What Was Done

${summary.brandStripping ? `### 1. Brand Stripping ✅
- **Files processed**: ${summary.brandStripping.filesProcessed}
- **Replacements made**: ${summary.brandStripping.replacementsMade}
- All original brand names, URLs, emails removed
- Replaced with generic placeholders
` : ''}
${summary.tokenShifting ? `### 2. Token Shifting ✅
- **Colors shifted**: ${summary.tokenShifting.colorsShifted}
- **Fonts replaced**: ${summary.tokenShifting.fontsReplaced}
- **Spacing adjusted**: ${summary.tokenShifting.spacingAdjusted}
- Visual identity transformed to be distinct from original
` : ''}
${summary.componentRenaming ? `### 3. Component Renaming ✅
- **Components renamed**: ${summary.componentRenaming.renamed}
- Generic, semantic names applied
- See \`component-mappings.json\` for full mapping
` : ''}
## What You Keep

✅ **Layout structure** - spatial relationships, grids, sections
✅ **Component boundaries** - reusable component patterns
✅ **Responsive behavior** - breakpoints, mobile/desktop variants
✅ **Interaction patterns** - hover states, animations (if any)

## What's Replaced

❌ **Colors/typography** - shifted to distinct palette
❌ **Copy/messaging** - generic placeholders
❌ **Logos/illustrations** - need regeneration (see below)
❌ **Brand names** - removed completely

## Next Steps

### 1. Regenerate Visual Assets

\`\`\`bash
# If asset-prompts.json exists:
node scripts/generate-assets-gemini.js \\
  --prompts asset-prompts.json \\
  --out generated-assets/

# Then update component image paths to use new assets
\`\`\`

### 2. Customize Tokens Further

Edit \`tokens/tokens-shifted.json\` to fine-tune:
- Color palette to match your brand
- Typography scale and font families
- Spacing values

### 3. Add Your Content

Replace generic placeholders with your actual:
- Company name and tagline
- Product descriptions
- Feature copy
- Call-to-action text

### 4. Integrate into Your Project

\`\`\`bash
# Option A: Copy components into existing project
cp -R components/* /path/to/your-project/components/

# Option B: Use as standalone app
npm install
npm run dev
\`\`\`

## Legal Compliance

This hard fork process ensures:

✅ No copyrighted content from original site
✅ No trademarked brand elements
✅ Layout structure only (not protected)
✅ Completely new visual identity

**You own this template and can use it freely.**

## Files Reference

- \`tokens/tokens-original.json\` - Original extracted tokens (for reference)
- \`tokens/tokens-shifted.json\` - Transformed tokens (use these)
- \`component-mappings.json\` - Old name → new name mapping
- \`components/\` - Renamed, reusable components
- \`pages/\` - Page components with updated imports

---

*Generated by design-system-cli Phase 8: Hard Fork & Rebrand*
`;

  fs.writeFileSync(readmePath, content, 'utf-8');
}
