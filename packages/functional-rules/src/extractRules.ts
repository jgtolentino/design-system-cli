/**
 * Phase 12: Functional Rules Extractor
 *
 * Extracts business rules, state machines, validation, and permissions from behavioral data.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  RulesConfig,
  RulesResult,
  RulesInputs,
  FunctionalRules,
  StateMachine,
  ValidationRule,
  PermissionRule,
  BusinessRule
} from './types';

/**
 * Load all input files
 */
function loadInputs(config: RulesConfig): RulesInputs {
  const trace = JSON.parse(fs.readFileSync(config.tracePath, 'utf-8'));

  // Load flows file (contains both screens and flows)
  const flowsData = JSON.parse(fs.readFileSync(config.flowsPath, 'utf-8'));
  const screens = flowsData.screens || [];
  const flows = flowsData.flows || [];

  const entitiesData = JSON.parse(fs.readFileSync(config.entitiesPath, 'utf-8'));
  const entities = entitiesData.entities || [];

  return { trace, screens, flows, entities };
}

/**
 * Extract state machines from entities with status/state fields
 */
function extractStateMachines(inputs: RulesInputs): StateMachine[] {
  const machines: StateMachine[] = [];

  for (const entity of inputs.entities) {
    // Look for status/state fields
    const stateField = entity.fields.find(f =>
      ['status', 'state', 'phase', 'stage'].includes(f.name.toLowerCase())
    );

    if (!stateField) continue;

    // Infer states from enum if available, or use common patterns
    const states = stateField.enum || inferStatesFromFlows(entity.name, inputs.flows);

    if (states.length === 0) continue;

    // Determine initial state (common patterns)
    const initial = states.find(s =>
      ['draft', 'pending', 'new', 'created', 'initial'].includes(s.toLowerCase())
    ) || states[0];

    // Extract transitions from flows
    const transitions = extractTransitions(entity.name, states, inputs.flows);

    machines.push({
      entity: entity.name,
      states,
      initial,
      transitions
    });
  }

  return machines;
}

/**
 * Infer possible states from flow patterns
 */
function inferStatesFromFlows(entityName: string, flows: any[]): string[] {
  const states = new Set<string>();

  // Common state patterns
  const commonStates = ['draft', 'pending', 'active', 'completed', 'archived', 'deleted'];

  // Look for entity-specific patterns in flow names and steps
  for (const flow of flows) {
    if (flow.name.toLowerCase().includes(entityName.toLowerCase())) {
      // Extract state-like words from flow names
      const words = flow.name.split(/[\s→-]+/);
      for (const word of words) {
        const lower = word.toLowerCase();
        if (commonStates.includes(lower)) {
          states.add(lower);
        }
      }
    }
  }

  // If we found states, return them; otherwise return common defaults
  return states.size > 0 ? Array.from(states) : ['draft', 'active', 'archived'];
}

/**
 * Extract state transitions from flows
 */
function extractTransitions(entityName: string, states: string[], flows: any[]): any[] {
  const transitions: any[] = [];
  const transitionMap = new Map<string, any>();

  for (const flow of flows) {
    // Look for flows involving this entity
    if (!flow.name.toLowerCase().includes(entityName.toLowerCase())) continue;

    // Analyze flow steps for state changes
    for (let i = 0; i < flow.steps.length - 1; i++) {
      const step = flow.steps[i];
      const nextStep = flow.steps[i + 1];

      // Look for network operations that might change state
      if (step.type === 'network' && step.operation) {
        const method = step.operation.split(' ')[0];

        // POST = creation (draft → active)
        if (method === 'POST') {
          const key = 'draft→active';
          if (!transitionMap.has(key)) {
            transitionMap.set(key, {
              from: 'draft',
              to: 'active',
              trigger: 'create_success',
              conditions: ['POST request succeeded']
            });
          }
        }

        // PATCH/PUT = updates (might change state)
        if (method === 'PATCH' || method === 'PUT') {
          // Look for common action words in flow name
          const flowLower = flow.name.toLowerCase();
          if (flowLower.includes('archive')) {
            const key = 'active→archived';
            if (!transitionMap.has(key)) {
              transitionMap.set(key, {
                from: 'active',
                to: 'archived',
                trigger: 'archive'
              });
            }
          } else if (flowLower.includes('approve')) {
            const key = 'pending→active';
            if (!transitionMap.has(key)) {
              transitionMap.set(key, {
                from: 'pending',
                to: 'active',
                trigger: 'approve'
              });
            }
          }
        }

        // DELETE = deletion (any → deleted)
        if (method === 'DELETE') {
          for (const state of states) {
            if (state !== 'deleted') {
              const key = `${state}→deleted`;
              if (!transitionMap.has(key)) {
                transitionMap.set(key, {
                  from: state,
                  to: 'deleted',
                  trigger: 'delete'
                });
              }
            }
          }
        }
      }
    }
  }

  return Array.from(transitionMap.values());
}

/**
 * Extract validation rules from entities and trace errors
 */
function extractValidationRules(inputs: RulesInputs): ValidationRule[] {
  const rules: ValidationRule[] = [];

  for (const entity of inputs.entities) {
    for (const field of entity.fields) {
      // Required fields (inferred from field.required or common patterns)
      if (field.required || ['id', 'name', 'email'].includes(field.name.toLowerCase())) {
        rules.push({
          entity: entity.name,
          field: field.name,
          rule: 'required',
          message: `${field.name} is required`,
          source: field.required ? 'inferred' : 'heuristic'
        });
      }

      // Type-based validation
      if (field.type === 'string') {
        // Email validation
        if (field.name.toLowerCase().includes('email')) {
          rules.push({
            entity: entity.name,
            field: field.name,
            rule: 'email',
            message: `${field.name} must be a valid email address`,
            source: 'heuristic'
          });
        }

        // Max length (heuristic: 500 for text fields)
        rules.push({
          entity: entity.name,
          field: field.name,
          rule: 'max:500',
          message: `${field.name} must not exceed 500 characters`,
          source: 'heuristic'
        });
      }

      if (field.type === 'number') {
        // Min value for numeric fields
        rules.push({
          entity: entity.name,
          field: field.name,
          rule: 'min:0',
          message: `${field.name} must be at least 0`,
          source: 'heuristic'
        });
      }

      // Constraints from field metadata
      if (field.constraints) {
        for (const constraint of field.constraints) {
          rules.push({
            entity: entity.name,
            field: field.name,
            rule: constraint,
            source: 'inferred'
          });
        }
      }
    }
  }

  return rules;
}

/**
 * Extract permission rules from operations and common patterns
 */
function extractPermissionRules(inputs: RulesInputs): PermissionRule[] {
  const rules: PermissionRule[] = [];

  for (const entity of inputs.entities) {
    // Create permission (common: authenticated users)
    if (entity.operations.some(op => op.kind === 'create')) {
      rules.push({
        entity: entity.name,
        action: 'create',
        roles: ['authenticated'],
        source: 'heuristic'
      });
    }

    // Update permission (common: owner or admin)
    if (entity.operations.some(op => op.kind === 'update')) {
      rules.push({
        entity: entity.name,
        action: 'update',
        roles: ['owner', 'admin'],
        source: 'heuristic'
      });
    }

    // Delete permission (common: admin only)
    if (entity.operations.some(op => op.kind === 'delete')) {
      rules.push({
        entity: entity.name,
        action: 'delete',
        roles: ['admin'],
        source: 'heuristic'
      });
    }

    // Special actions (inferred from flows)
    for (const flow of inputs.flows) {
      const flowLower = flow.name.toLowerCase();
      const entityLower = entity.name.toLowerCase();

      if (flowLower.includes(entityLower)) {
        if (flowLower.includes('approve')) {
          rules.push({
            entity: entity.name,
            action: 'approve',
            roles: ['manager', 'admin'],
            source: 'inferred'
          });
        }

        if (flowLower.includes('archive')) {
          rules.push({
            entity: entity.name,
            action: 'archive',
            roles: ['owner', 'admin'],
            source: 'inferred'
          });
        }
      }
    }
  }

  return rules;
}

/**
 * Extract general business rules
 */
function extractBusinessRules(inputs: RulesInputs): BusinessRule[] {
  const rules: BusinessRule[] = [];

  // Example: workflow requirements
  for (const entity of inputs.entities) {
    // If entity has a state machine, add workflow rule
    const hasStateMachine = entity.fields.some(f =>
      ['status', 'state'].includes(f.name.toLowerCase())
    );

    if (hasStateMachine) {
      rules.push({
        entity: entity.name,
        name: 'workflow_progression',
        description: `${entity.name} must follow defined workflow states`,
        condition: 'state transition requested',
        action: 'validate transition is allowed',
        source: 'inferred'
      });
    }

    // Timestamp rules
    const hasTimestamps = entity.metadata?.timestamps;
    if (hasTimestamps) {
      rules.push({
        entity: entity.name,
        name: 'timestamp_immutability',
        description: 'Creation timestamp cannot be modified',
        condition: 'update request includes createdAt',
        action: 'reject update',
        source: 'heuristic'
      });
    }
  }

  return rules;
}

/**
 * Main rules extraction function
 */
export async function extractRules(config: RulesConfig): Promise<RulesResult> {
  try {
    console.log(`📋 Extracting business rules...`);
    console.log(`   Trace: ${config.tracePath}`);
    console.log(`   Flows: ${config.flowsPath}`);
    console.log(`   Entities: ${config.entitiesPath}`);

    // Load inputs
    const inputs = loadInputs(config);

    // Extract all rule types
    const stateMachines = extractStateMachines(inputs);
    const validationRules = extractValidationRules(inputs);
    const permissionRules = extractPermissionRules(inputs);
    const businessRules = extractBusinessRules(inputs);

    // Create output
    const output: FunctionalRules = {
      stateMachines,
      validationRules,
      permissionRules,
      businessRules,
      metadata: config.includeMetadata !== false ? {
        extractedAt: new Date().toISOString(),
        totalStateMachines: stateMachines.length,
        totalValidationRules: validationRules.length,
        totalPermissionRules: permissionRules.length,
        totalBusinessRules: businessRules.length
      } : undefined
    };

    // Write output
    const outDir = path.dirname(config.out);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(config.out, JSON.stringify(output, null, 2), 'utf-8');

    console.log(`\n✅ Rules extraction complete!`);
    console.log(`   Output: ${config.out}`);
    console.log(`   State Machines: ${stateMachines.length}`);
    console.log(`   Validation Rules: ${validationRules.length}`);
    console.log(`   Permission Rules: ${permissionRules.length}`);
    console.log(`   Business Rules: ${businessRules.length}`);

    return {
      success: true,
      outputPath: config.out,
      stateMachinesFound: stateMachines.length,
      validationRulesFound: validationRules.length,
      permissionRulesFound: permissionRules.length,
      businessRulesFound: businessRules.length
    };
  } catch (error: any) {
    console.error(`❌ Rules extraction failed:`, error.message);

    return {
      success: false,
      outputPath: config.out,
      stateMachinesFound: 0,
      validationRulesFound: 0,
      permissionRulesFound: 0,
      businessRulesFound: 0,
      errors: [error.message]
    };
  }
}
