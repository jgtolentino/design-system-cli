/**
 * Component Generator Module
 *
 * Generates React + TypeScript + Tailwind CSS components from parsed patterns
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ComponentPattern, ComponentProp, ParseResult } from './parseComponents';
import type { HtmlSection } from './extractHtml';

export interface GenerateOptions {
  outputDir: string;
  framework: 'react-tailwind';
  typescript: boolean;
  designTokens?: any; // Extracted design tokens
}

export interface GenerateResult {
  components: GeneratedComponent[];
  indexFile: string;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export interface GeneratedComponent {
  name: string;
  path: string;
  success: boolean;
  error?: string;
}

/**
 * Generate React components from parsed patterns
 */
export async function generateComponents(
  parseResult: ParseResult,
  options: GenerateOptions
): Promise<GenerateResult> {
  console.log('🎨 Generating React components...');

  const componentsDir = path.join(options.outputDir, 'components');

  // Create components directory
  if (!fs.existsSync(componentsDir)) {
    fs.mkdirSync(componentsDir, { recursive: true });
  }

  const components: GeneratedComponent[] = [];

  // Generate each component
  for (const pattern of parseResult.components) {
    console.log(`   📝 ${pattern.name}`);

    try {
      const componentPath = path.join(
        componentsDir,
        `${pattern.name}.tsx`
      );

      const code = generateComponentCode(pattern, options);
      fs.writeFileSync(componentPath, code, 'utf-8');

      components.push({
        name: pattern.name,
        path: componentPath,
        success: true
      });

      console.log(`   ✅ Generated: ${pattern.name}.tsx`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      components.push({
        name: pattern.name,
        path: '',
        success: false,
        error: errorMessage
      });
      console.log(`   ❌ Failed: ${errorMessage}`);
    }
  }

  // Generate index file
  const indexPath = path.join(componentsDir, 'index.ts');
  const indexCode = generateIndexFile(components);
  fs.writeFileSync(indexPath, indexCode, 'utf-8');

  const summary = {
    total: components.length,
    successful: components.filter(c => c.success).length,
    failed: components.filter(c => !c.success).length
  };

  console.log(`\n✅ Generated ${summary.successful}/${summary.total} components`);

  return {
    components,
    indexFile: indexPath,
    summary
  };
}

/**
 * Generate code for a single component
 */
function generateComponentCode(
  pattern: ComponentPattern,
  options: GenerateOptions
): string {
  const { name, props, structure, children } = pattern;

  // Generate imports
  const imports = generateImports(pattern, options);

  // Generate interface
  const propsInterface = generatePropsInterface(name, props);

  // Generate component body
  const componentBody = generateComponentBody(pattern, options);

  // Combine all parts
  return `${imports}

${propsInterface}

export function ${name}(${props.length > 0 ? `{ ${props.map(p => p.name).join(', ')} }: ${name}Props` : ''}) {
${componentBody}
}

export default ${name};
`;
}

/**
 * Generate imports section
 */
function generateImports(pattern: ComponentPattern, options: GenerateOptions): string {
  const imports: string[] = [];

  // React import
  if (pattern.children.length > 0 || pattern.props.some(p => p.name === 'children')) {
    imports.push(`import type { ReactNode } from 'react';`);
  }

  // Child component imports
  const childImports = pattern.children
    .map(child => child.name)
    .filter((name, index, self) => self.indexOf(name) === index) // Unique names
    .filter(name => name !== pattern.name); // Don't import self

  if (childImports.length > 0) {
    childImports.forEach(childName => {
      imports.push(`import { ${childName} } from './${childName}';`);
    });
  }

  return imports.join('\n');
}

/**
 * Generate props interface
 */
function generatePropsInterface(name: string, props: ComponentProp[]): string {
  if (props.length === 0) {
    return '';
  }

  const propLines = props.map(prop => {
    const tsType = mapPropTypeToTS(prop.type);
    const optional = prop.required ? '' : '?';
    const comment = prop.description ? `\n  /** ${prop.description} */` : '';
    return `${comment}\n  ${prop.name}${optional}: ${tsType};`;
  });

  return `interface ${name}Props {${propLines.join('')}
}`;
}

/**
 * Map prop type to TypeScript type
 */
function mapPropTypeToTS(type: string): string {
  switch (type) {
    case 'string': return 'string';
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'array': return 'any[]';
    case 'object': return 'Record<string, any>';
    case 'element': return 'ReactNode';
    default: return 'any';
  }
}

/**
 * Generate component body (JSX)
 */
function generateComponentBody(pattern: ComponentPattern, options: GenerateOptions): string {
  const indent = '  ';
  const jsx = generateJSX(pattern.structure, pattern, indent + '  ', options);

  return `${indent}return (\n${jsx}\n${indent});`;
}

/**
 * Generate JSX for HTML structure
 */
function generateJSX(
  node: HtmlSection,
  pattern: ComponentPattern,
  indent: string,
  options: GenerateOptions
): string {
  const { tag, classes, attributes, children, text } = node;

  // Convert HTML tag to React
  const reactTag = tag === 'class' ? 'className' : tag;

  // Build attributes
  const attrs: string[] = [];

  // Add className with Tailwind classes
  if (classes.length > 0) {
    const classNames = classes.join(' ');
    attrs.push(`className="${classNames}"`);
  }

  // Add other attributes
  Object.entries(attributes).forEach(([key, value]) => {
    const reactKey = mapHtmlAttrToReact(key);
    attrs.push(`${reactKey}="${value}"`);
  });

  // Self-closing tags
  const selfClosing = ['img', 'input', 'br', 'hr', 'meta', 'link'];
  if (selfClosing.includes(tag) && children.length === 0) {
    return `${indent}<${reactTag}${attrs.length > 0 ? ' ' + attrs.join(' ') : ''} />`;
  }

  // Opening tag
  let jsx = `${indent}<${reactTag}${attrs.length > 0 ? ' ' + attrs.join(' ') : ''}>`;

  // Text content
  if (text && text.trim()) {
    jsx += `\n${indent}  {${JSON.stringify(text.trim())}}`;
  }

  // Children
  if (children.length > 0) {
    children.forEach(child => {
      const childJsx = generateJSX(child, pattern, indent + '  ', options);
      jsx += `\n${childJsx}`;
    });
  }

  // Closing tag
  if (children.length > 0 || (text && text.trim())) {
    jsx += `\n${indent}</${reactTag}>`;
  } else {
    jsx += `</${reactTag}>`;
  }

  return jsx;
}

/**
 * Map HTML attribute to React attribute
 */
function mapHtmlAttrToReact(attr: string): string {
  const map: Record<string, string> = {
    'class': 'className',
    'for': 'htmlFor',
    'tabindex': 'tabIndex',
    'readonly': 'readOnly',
    'maxlength': 'maxLength',
    'minlength': 'minLength',
    'autocomplete': 'autoComplete',
    'autofocus': 'autoFocus'
  };

  return map[attr] || attr;
}

/**
 * Generate index file that exports all components
 */
function generateIndexFile(components: GeneratedComponent[]): string {
  const successful = components.filter(c => c.success);

  const exports = successful
    .map(c => `export { ${c.name} } from './${c.name}';`)
    .join('\n');

  return `/**
 * Component Library - Auto-generated from HTML extraction
 */

${exports}
`;
}

/**
 * Generate page component that combines all sections
 */
export function generatePageComponent(
  parseResult: ParseResult,
  outputDir: string,
  options: GenerateOptions
): string {
  const pagePath = path.join(outputDir, 'pages', 'ExtractedPage.tsx');

  // Create pages directory
  const pagesDir = path.dirname(pagePath);
  if (!fs.existsSync(pagesDir)) {
    fs.mkdirSync(pagesDir, { recursive: true });
  }

  // Import all top-level components
  const topLevelComponents = parseResult.root.children
    .map(c => c.name)
    .filter((name, index, self) => self.indexOf(name) === index);

  const imports = topLevelComponents
    .map(name => `import { ${name} } from '../components/${name}';`)
    .join('\n');

  const componentUsage = topLevelComponents
    .map(name => `      <${name} />`)
    .join('\n');

  const code = `import type { ReactNode } from 'react';
${imports}

export function ExtractedPage() {
  return (
    <div className="extracted-page">
${componentUsage}
    </div>
  );
}

export default ExtractedPage;
`;

  fs.writeFileSync(pagePath, code, 'utf-8');

  console.log(`\n📄 Generated page: ${path.basename(pagePath)}`);

  return pagePath;
}

/**
 * Generate README for generated components
 */
export function generateReadme(
  parseResult: ParseResult,
  generateResult: GenerateResult,
  outputDir: string
): string {
  const readmePath = path.join(outputDir, 'README.md');

  const content = `# Extracted Components

Auto-generated React + TypeScript + Tailwind CSS components from HTML extraction.

## Stats

- **Total Components**: ${generateResult.summary.total}
- **Successfully Generated**: ${generateResult.summary.successful}
- **Failed**: ${generateResult.summary.failed}
- **Reusable Components**: ${parseResult.stats.reusableComponents}
- **Semantic Components**: ${parseResult.stats.semanticComponents}
- **Max Depth**: ${parseResult.stats.maxDepth}

## Components

${generateResult.components
    .filter(c => c.success)
    .map(c => `- **${c.name}** - \`${path.relative(outputDir, c.path)}\``)
    .join('\n')}

## Usage

\`\`\`tsx
import { ExtractedPage } from './pages/ExtractedPage';

export default function App() {
  return <ExtractedPage />;
}
\`\`\`

## Individual Components

\`\`\`tsx
import { Header, Footer, Nav } from './components';

export function MyPage() {
  return (
    <>
      <Header />
      <Nav />
      <Footer />
    </>
  );
}
\`\`\`

---

*Generated with design-system-cli Phase 7: HTML Structure Extraction*
`;

  fs.writeFileSync(readmePath, content, 'utf-8');

  console.log(`📖 Generated README: ${path.basename(readmePath)}`);

  return readmePath;
}
