/**
 * Component Parser Module
 *
 * Analyzes HTML structure to identify reusable component patterns
 */

import type { HtmlSection } from './extractHtml';

export interface ComponentPattern {
  id: string;
  type: ComponentType;
  name: string;
  description: string;
  structure: HtmlSection;
  props: ComponentProp[];
  children: ComponentPattern[];
  occurrences: number;
  confidence: number; // 0-1 score of pattern confidence
}

export interface ComponentProp {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'element';
  value?: any;
  required: boolean;
  description?: string;
}

export type ComponentType =
  | 'page'
  | 'layout'
  | 'header'
  | 'footer'
  | 'nav'
  | 'section'
  | 'card'
  | 'list'
  | 'button'
  | 'form'
  | 'input'
  | 'image'
  | 'text'
  | 'container'
  | 'generic';

export interface ParseResult {
  root: ComponentPattern;
  components: ComponentPattern[];
  stats: {
    totalComponents: number;
    reusableComponents: number;
    semanticComponents: number;
    maxDepth: number;
  };
}

/**
 * Parse HTML structure into component patterns
 */
export function parseComponents(structure: HtmlSection): ParseResult {
  console.log('🔍 Parsing component structure...');

  const patterns = new Map<string, ComponentPattern>();
  let idCounter = 0;

  // Generate unique ID
  const generateId = () => `comp-${++idCounter}`;

  // Parse structure recursively
  const root = parseNode(structure, patterns, generateId, 0);

  // Extract all patterns
  const components = Array.from(patterns.values())
    .sort((a, b) => b.confidence - a.confidence);

  // Calculate stats
  const stats = {
    totalComponents: components.length,
    reusableComponents: components.filter(c => c.occurrences > 1).length,
    semanticComponents: components.filter(c => c.type !== 'generic').length,
    maxDepth: calculateMaxDepth(root)
  };

  console.log(`✅ Parsed ${stats.totalComponents} components`);
  console.log(`   - Reusable: ${stats.reusableComponents}`);
  console.log(`   - Semantic: ${stats.semanticComponents}`);
  console.log(`   - Max depth: ${stats.maxDepth}`);

  return {
    root,
    components,
    stats
  };
}

/**
 * Parse a single node into a component pattern
 */
function parseNode(
  node: HtmlSection,
  patterns: Map<string, ComponentPattern>,
  generateId: () => string,
  depth: number
): ComponentPattern {
  // Identify component type
  const type = identifyComponentType(node);

  // Extract props from node
  const props = extractProps(node);

  // Parse children recursively
  const children = node.children.map(child =>
    parseNode(child, patterns, generateId, depth + 1)
  );

  // Generate component name
  const name = generateComponentName(node, type);

  // Calculate confidence score
  const confidence = calculateConfidence(node, type, children);

  // Create pattern
  const pattern: ComponentPattern = {
    id: generateId(),
    type,
    name,
    description: generateDescription(node, type),
    structure: node,
    props,
    children,
    occurrences: 1,
    confidence
  };

  // Try to find similar pattern
  const signature = generatePatternSignature(node, type);
  const existing = patterns.get(signature);

  if (existing) {
    // Pattern already exists, increment occurrence
    existing.occurrences++;
    return existing;
  } else {
    // New pattern, add to map
    patterns.set(signature, pattern);
    return pattern;
  }
}

/**
 * Identify component type from HTML structure
 */
function identifyComponentType(node: HtmlSection): ComponentType {
  const { tag, role, classes, attributes } = node;

  // Semantic HTML elements
  if (tag === 'header') return 'header';
  if (tag === 'footer') return 'footer';
  if (tag === 'nav') return 'nav';
  if (tag === 'section') return 'section';
  if (tag === 'main') return 'layout';

  // Role attribute
  if (role === 'navigation') return 'nav';
  if (role === 'banner') return 'header';
  if (role === 'contentinfo') return 'footer';
  if (role === 'button') return 'button';
  if (role === 'form') return 'form';

  // Form elements
  if (tag === 'form') return 'form';
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return 'input';
  if (tag === 'button') return 'button';

  // Image elements
  if (tag === 'img' || tag === 'picture' || tag === 'svg') return 'image';

  // List patterns
  if (tag === 'ul' || tag === 'ol') return 'list';

  // Card patterns (common class names)
  const classString = classes.join(' ').toLowerCase();
  if (classString.includes('card')) return 'card';
  if (classString.includes('item') && node.children.length > 2) return 'card';

  // Container patterns
  if (tag === 'div' && node.children.length > 3) {
    // Check if contains repeated patterns (likely a container)
    const childTypes = node.children.map(c => c.tag);
    const uniqueTypes = new Set(childTypes);
    if (uniqueTypes.size < childTypes.length / 2) {
      return 'container';
    }
  }

  // Text elements
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a'].includes(tag)) {
    return 'text';
  }

  // Generic fallback
  return 'generic';
}

/**
 * Extract props from HTML node
 */
function extractProps(node: HtmlSection): ComponentProp[] {
  const props: ComponentProp[] = [];

  // ID prop
  if (node.id) {
    props.push({
      name: 'id',
      type: 'string',
      value: node.id,
      required: false
    });
  }

  // ClassName prop
  if (node.classes.length > 0) {
    props.push({
      name: 'className',
      type: 'string',
      value: node.classes.join(' '),
      required: false
    });
  }

  // Common attributes
  const attrMap: Record<string, 'string' | 'boolean'> = {
    href: 'string',
    src: 'string',
    alt: 'string',
    title: 'string',
    type: 'string',
    name: 'string',
    value: 'string',
    placeholder: 'string',
    disabled: 'boolean',
    required: 'boolean',
    checked: 'boolean'
  };

  Object.entries(node.attributes).forEach(([key, value]) => {
    const propType = attrMap[key] || 'string';
    props.push({
      name: key,
      type: propType,
      value: propType === 'boolean' ? (value === 'true' || value === key) : value,
      required: false,
      description: `${key} attribute`
    });
  });

  // Text content prop
  if (node.text && node.text.trim()) {
    props.push({
      name: 'children',
      type: 'string',
      value: node.text,
      required: false,
      description: 'Text content'
    });
  }

  // Children prop (if has child elements)
  if (node.children.length > 0) {
    props.push({
      name: 'children',
      type: 'element',
      required: false,
      description: 'Child elements'
    });
  }

  return props;
}

/**
 * Generate component name from structure
 */
function generateComponentName(node: HtmlSection, type: ComponentType): string {
  // Use ID if available
  if (node.id) {
    return toPascalCase(node.id);
  }

  // Use first class if available
  if (node.classes.length > 0) {
    const firstClass = node.classes[0];
    if (firstClass && !firstClass.startsWith('css-')) {
      return toPascalCase(firstClass);
    }
  }

  // Use type-based name
  return toPascalCase(type);
}

/**
 * Generate component description
 */
function generateDescription(node: HtmlSection, type: ComponentType): string {
  if (type === 'header') return 'Page header component';
  if (type === 'footer') return 'Page footer component';
  if (type === 'nav') return 'Navigation component';
  if (type === 'section') return 'Content section component';
  if (type === 'card') return 'Card component';
  if (type === 'list') return 'List component';
  if (type === 'button') return 'Button component';
  if (type === 'form') return 'Form component';
  if (type === 'input') return 'Input component';
  if (type === 'image') return 'Image component';
  if (type === 'text') return `${node.tag.toUpperCase()} text component`;
  if (type === 'container') return 'Container component';

  return `${toPascalCase(node.tag)} component`;
}

/**
 * Calculate confidence score for component identification
 */
function calculateConfidence(
  node: HtmlSection,
  type: ComponentType,
  children: ComponentPattern[]
): number {
  let score = 0;

  // Semantic HTML gets high confidence
  if (['header', 'footer', 'nav', 'section', 'main'].includes(node.tag)) {
    score += 0.4;
  }

  // Role attribute adds confidence
  if (node.role) {
    score += 0.3;
  }

  // Meaningful classes add confidence
  if (node.classes.length > 0 && !node.classes[0].startsWith('css-')) {
    score += 0.2;
  }

  // Complex structure adds confidence
  if (children.length > 2) {
    score += 0.1;
  }

  // Non-generic type adds confidence
  if (type !== 'generic') {
    score += 0.2;
  }

  return Math.min(score, 1.0);
}

/**
 * Generate pattern signature for deduplication
 */
function generatePatternSignature(node: HtmlSection, type: ComponentType): string {
  const classStr = node.classes.slice(0, 3).join(',');
  const childTags = node.children.slice(0, 5).map(c => c.tag).join(',');
  return `${type}:${node.tag}:${classStr}:${childTags}`;
}

/**
 * Calculate maximum depth of component tree
 */
function calculateMaxDepth(pattern: ComponentPattern): number {
  if (pattern.children.length === 0) {
    return 1;
  }
  return 1 + Math.max(...pattern.children.map(calculateMaxDepth));
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
    .replace(/^./, char => char.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Find reusable components (occurring more than once)
 */
export function findReusableComponents(result: ParseResult): ComponentPattern[] {
  return result.components.filter(c => c.occurrences > 1);
}

/**
 * Find semantic components (headers, footers, nav, etc.)
 */
export function findSemanticComponents(result: ParseResult): ComponentPattern[] {
  const semanticTypes: ComponentType[] = ['header', 'footer', 'nav', 'section', 'form', 'button'];
  return result.components.filter(c => semanticTypes.includes(c.type));
}

/**
 * Group components by type
 */
export function groupComponentsByType(result: ParseResult): Map<ComponentType, ComponentPattern[]> {
  const groups = new Map<ComponentType, ComponentPattern[]>();

  result.components.forEach(component => {
    const existing = groups.get(component.type) || [];
    existing.push(component);
    groups.set(component.type, existing);
  });

  return groups;
}
