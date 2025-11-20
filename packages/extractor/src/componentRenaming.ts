import * as fs from 'fs';
import * as path from 'path';

/**
 * Component renaming utility - generates generic, semantic names
 * for extracted components based on their structure and role
 */

export interface ComponentRenamingConfig {
  // Naming convention
  convention?: 'semantic' | 'pattern' | 'hybrid';

  // Prefix for all components (optional)
  prefix?: string;

  // Custom name mappings
  customMappings?: Record<string, string>;
}

export interface ComponentRenamingResult {
  renamed: number;
  mappings: Record<string, string>;
  errors: string[];
}

interface ComponentAnalysis {
  name: string;
  path: string;
  role: ComponentRole;
  confidence: number;
}

type ComponentRole =
  | 'hero'
  | 'navigation'
  | 'footer'
  | 'card'
  | 'grid'
  | 'list'
  | 'button'
  | 'form'
  | 'section'
  | 'container'
  | 'layout'
  | 'header'
  | 'banner'
  | 'cta'
  | 'testimonial'
  | 'feature'
  | 'pricing'
  | 'faq'
  | 'timeline'
  | 'team'
  | 'generic';

/**
 * Analyze component to determine its role
 */
function analyzeComponentRole(filePath: string, content: string): ComponentRole {
  const fileName = path.basename(filePath, '.tsx').toLowerCase();

  // Check for semantic HTML elements in content
  const hasHeader = /<header/i.test(content);
  const hasFooter = /<footer/i.test(content);
  const hasNav = /<nav/i.test(content);
  const hasButton = /<button/i.test(content);
  const hasForm = /<form/i.test(content);
  const hasSection = /<section/i.test(content);

  // Check for common class patterns
  const classPatterns = {
    hero: /hero|banner|jumbotron/i,
    navigation: /nav|menu|header-nav/i,
    footer: /footer|bottom|site-footer/i,
    card: /card|item-card|product-card/i,
    grid: /grid|layout-grid|column/i,
    list: /list|items-list/i,
    cta: /cta|call-to-action|signup/i,
    testimonial: /testimonial|review|quote/i,
    feature: /feature|benefit|highlight/i,
    pricing: /pricing|plan|tier/i,
    faq: /faq|question|accordion/i,
    timeline: /timeline|history|milestone/i,
    team: /team|member|staff|people/i
  };

  // Check filename against patterns
  for (const [role, pattern] of Object.entries(classPatterns)) {
    if (pattern.test(fileName)) {
      return role as ComponentRole;
    }
  }

  // Check content for patterns
  for (const [role, pattern] of Object.entries(classPatterns)) {
    if (pattern.test(content)) {
      return role as ComponentRole;
    }
  }

  // Check structural elements
  if (hasHeader && fileName.includes('header')) return 'header';
  if (hasFooter && fileName.includes('footer')) return 'footer';
  if (hasNav) return 'navigation';
  if (hasButton && !hasForm) return 'button';
  if (hasForm) return 'form';
  if (hasSection) return 'section';

  return 'generic';
}

/**
 * Generate semantic name for component
 */
function generateSemanticName(
  role: ComponentRole,
  index: number,
  existingNames: Set<string>
): string {
  const baseNames: Record<ComponentRole, string> = {
    hero: 'HeroSection',
    navigation: 'Navigation',
    footer: 'Footer',
    card: 'Card',
    grid: 'Grid',
    list: 'List',
    button: 'Button',
    form: 'Form',
    section: 'Section',
    container: 'Container',
    layout: 'Layout',
    header: 'Header',
    banner: 'Banner',
    cta: 'CallToAction',
    testimonial: 'Testimonial',
    feature: 'Feature',
    pricing: 'Pricing',
    faq: 'FaqSection',
    timeline: 'Timeline',
    team: 'TeamSection',
    generic: 'Component'
  };

  let name = baseNames[role];

  // Add suffix if name exists
  if (existingNames.has(name)) {
    let suffix = 1;
    while (existingNames.has(`${name}${suffix}`)) {
      suffix++;
    }
    name = `${name}${suffix}`;
  }

  return name;
}

/**
 * Analyze all components in directory
 */
function analyzeComponents(componentsDir: string): ComponentAnalysis[] {
  if (!fs.existsSync(componentsDir)) {
    return [];
  }

  const files = fs.readdirSync(componentsDir)
    .filter(file => file.endsWith('.tsx') || file.endsWith('.ts'))
    .filter(file => file !== 'index.ts');

  return files.map(file => {
    const filePath = path.join(componentsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const role = analyzeComponentRole(filePath, content);

    return {
      name: path.basename(file, path.extname(file)),
      path: filePath,
      role,
      confidence: role === 'generic' ? 0.3 : 0.8
    };
  });
}

/**
 * Rename a single component file
 */
function renameComponent(
  analysis: ComponentAnalysis,
  newName: string,
  componentsDir: string
): void {
  const oldPath = analysis.path;
  const newPath = path.join(componentsDir, `${newName}.tsx`);

  // Read content
  let content = fs.readFileSync(oldPath, 'utf-8');

  // Update function/component name
  const oldComponentName = analysis.name;

  // Replace export statements
  content = content.replace(
    new RegExp(`export function ${oldComponentName}`, 'g'),
    `export function ${newName}`
  );

  content = content.replace(
    new RegExp(`export default ${oldComponentName}`, 'g'),
    `export default ${newName}`
  );

  // Replace interface names
  content = content.replace(
    new RegExp(`interface ${oldComponentName}Props`, 'g'),
    `interface ${newName}Props`
  );

  // Write to new file
  fs.writeFileSync(newPath, content, 'utf-8');

  // Remove old file if different
  if (oldPath !== newPath) {
    fs.unlinkSync(oldPath);
  }
}

/**
 * Update imports in other files
 */
function updateImports(
  componentsDir: string,
  mappings: Record<string, string>
): void {
  const files = [
    ...findFilesRecursive(componentsDir, ['.tsx', '.ts']),
    ...findFilesRecursive(path.join(path.dirname(componentsDir), 'pages'), ['.tsx', '.ts'])
  ];

  files.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    Object.entries(mappings).forEach(([oldName, newName]) => {
      // Update import statements
      const importRegex = new RegExp(`import\\s+\\{([^}]*\\b${oldName}\\b[^}]*)\\}\\s+from`, 'g');

      if (importRegex.test(content)) {
        content = content.replace(
          new RegExp(`\\b${oldName}\\b`, 'g'),
          newName
        );
        modified = true;
      }

      // Update JSX usage
      const jsxRegex = new RegExp(`<${oldName}[\\s/>]`, 'g');
      if (jsxRegex.test(content)) {
        content = content.replace(
          new RegExp(`<${oldName}([\\s/>])`, 'g'),
          `<${newName}$1`
        );
        content = content.replace(
          new RegExp(`</${oldName}>`, 'g'),
          `</${newName}>`
        );
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
  });
}

/**
 * Generate index file with new names
 */
function updateIndexFile(componentsDir: string, mappings: Record<string, string>): void {
  const indexPath = path.join(componentsDir, 'index.ts');

  const newNames = Object.values(mappings).sort();

  const indexContent = newNames
    .map(name => `export { default as ${name} } from './${name}';`)
    .join('\n') + '\n';

  fs.writeFileSync(indexPath, indexContent, 'utf-8');
}

/**
 * Find files recursively
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
 * Rename all components in directory
 */
export function renameComponents(
  extractionDir: string,
  config: ComponentRenamingConfig = {}
): ComponentRenamingResult {
  console.log('📝 Renaming components to generic names...\n');

  const componentsDir = path.join(extractionDir, 'components');

  // Analyze all components
  const analyses = analyzeComponents(componentsDir);

  console.log(`   Analyzed ${analyses.length} components\n`);

  // Generate new names
  const existingNames = new Set<string>();
  const mappings: Record<string, string> = {};
  const errors: string[] = [];

  // Sort by confidence (rename high-confidence first)
  analyses.sort((a, b) => b.confidence - a.confidence);

  analyses.forEach((analysis, index) => {
    // Check for custom mapping
    if (config.customMappings && config.customMappings[analysis.name]) {
      const newName = config.customMappings[analysis.name];
      mappings[analysis.name] = newName;
      existingNames.add(newName);
      return;
    }

    // Generate semantic name
    const newName = generateSemanticName(analysis.role, index, existingNames);
    const finalName = config.prefix ? `${config.prefix}${newName}` : newName;

    mappings[analysis.name] = finalName;
    existingNames.add(finalName);

    console.log(`   ${analysis.name} → ${finalName} (${analysis.role}, ${(analysis.confidence * 100).toFixed(0)}% confidence)`);
  });

  console.log('');

  // Rename files
  let renamed = 0;
  analyses.forEach(analysis => {
    try {
      const newName = mappings[analysis.name];
      renameComponent(analysis, newName, componentsDir);
      renamed++;
    } catch (error) {
      errors.push(`Failed to rename ${analysis.name}: ${(error as Error).message}`);
    }
  });

  // Update imports
  console.log('   Updating imports...');
  updateImports(componentsDir, mappings);

  // Update index file
  console.log('   Updating index file...');
  updateIndexFile(componentsDir, mappings);

  console.log(`\n✅ Renamed ${renamed} components\n`);

  if (errors.length > 0) {
    console.log('⚠️  Errors:');
    errors.forEach(error => console.log(`   - ${error}`));
    console.log('');
  }

  return {
    renamed,
    mappings,
    errors
  };
}
