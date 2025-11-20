/**
 * Phase 12: Functional Rules Types
 *
 * Business rules, state machines, validation, and permissions inferred from traces.
 */

import type { TraceOutput } from '@ds-cli/functional-trace';
import type { Screen, Flow } from '@ds-cli/functional-flows';
import type { Entity } from '@ds-cli/functional-entities';

/**
 * State machine definition for entity lifecycle
 */
export interface StateMachine {
  entity: string;
  states: string[];
  initial: string;
  transitions: StateTransition[];
}

export interface StateTransition {
  from: string;
  to: string;
  trigger: string;
  conditions?: string[];
  guards?: string[];
}

/**
 * Validation rule for entity fields
 */
export interface ValidationRule {
  entity: string;
  field: string;
  rule: string;         // "required", "max:500", "email", "min:3", etc.
  message?: string;
  source: 'inline_error' | 'api_422' | 'heuristic' | 'inferred';
}

/**
 * Permission/authorization rule
 */
export interface PermissionRule {
  entity: string;
  action: string;       // "create", "update", "delete", "approve", "archive"
  roles?: string[];     // ["admin", "owner", "manager"]
  conditions?: string[];
  source: 'heuristic' | 'inferred' | 'api_403';
}

/**
 * Business rule (general constraints)
 */
export interface BusinessRule {
  entity: string;
  name: string;
  description: string;
  condition: string;
  action: string;
  source: 'inferred' | 'heuristic';
}

/**
 * Complete functional rules output
 */
export interface FunctionalRules {
  stateMachines: StateMachine[];
  validationRules: ValidationRule[];
  permissionRules: PermissionRule[];
  businessRules: BusinessRule[];
  metadata?: {
    extractedAt: string;
    totalStateMachines: number;
    totalValidationRules: number;
    totalPermissionRules: number;
    totalBusinessRules: number;
  };
}

/**
 * Rules extraction configuration
 */
export interface RulesConfig {
  tracePath: string;
  flowsPath: string;
  entitiesPath: string;
  out: string;
  llmProfile?: string;  // Optional SuperClaude integration
  includeMetadata?: boolean;
}

/**
 * Rules extraction result
 */
export interface RulesResult {
  success: boolean;
  outputPath: string;
  stateMachinesFound: number;
  validationRulesFound: number;
  permissionRulesFound: number;
  businessRulesFound: number;
  errors?: string[];
}

/**
 * Inputs loaded from files
 */
export interface RulesInputs {
  trace: TraceOutput;
  screens: Screen[];
  flows: Flow[];
  entities: Entity[];
}
