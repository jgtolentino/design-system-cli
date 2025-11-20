/**
 * Phase 12: Functional Codegen Types
 *
 * Code generation for functional application scaffolds.
 */

import type { Screen } from '@ds-cli/functional-flows';
import type { Entity } from '@ds-cli/functional-entities';
import type { FunctionalRules } from '@ds-cli/functional-rules';

/**
 * Supported frameworks for code generation
 */
export type Framework =
  | 'nextjs'
  | 'nextjs-supabase'
  | 'react-spa'
  | 'vue-spa';

/**
 * Codegen configuration
 */
export interface CodegenConfig {
  screensPath: string;
  flowsPath: string;
  entitiesPath: string;
  rulesPath: string;
  framework: Framework;
  out: string;
  includeTests?: boolean;
  includeStorybook?: boolean;
}

/**
 * Codegen result
 */
export interface CodegenResult {
  success: boolean;
  outputPath: string;
  filesGenerated: number;
  componentsGenerated: number;
  pagesGenerated: number;
  errors?: string[];
}

/**
 * Codegen inputs loaded from files
 */
export interface CodegenInputs {
  screens: Screen[];
  flows: any[];
  entities: Entity[];
  rules: FunctionalRules;
}

/**
 * Generated file metadata
 */
export interface GeneratedFile {
  path: string;
  content: string;
  type: 'page' | 'component' | 'api' | 'lib' | 'config' | 'test';
}
