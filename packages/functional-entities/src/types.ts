/**
 * Phase 11: Functional Entities Types
 *
 * Data model and CRUD operation inference from network traces.
 */

/**
 * Field data types
 */
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'date-time'
  | 'array'
  | 'object'
  | 'enum'
  | 'unknown';

/**
 * Field source (where the field was observed)
 */
export type FieldSource = 'request' | 'response' | 'form' | 'table' | 'inferred';

/**
 * Field constraints/validators
 */
export type FieldConstraint =
  | `min:${number}`
  | `max:${number}`
  | `minLength:${number}`
  | `maxLength:${number}`
  | `pattern:${string}`
  | 'email'
  | 'url'
  | 'uuid'
  | 'required';

/**
 * Entity field definition
 */
export interface EntityField {
  name: string;
  type: FieldType;
  format?: string;  // For date, date-time, etc.
  required: boolean;
  source: FieldSource;
  constraints?: FieldConstraint[];
  enum?: string[];  // For enum types
  description?: string;
  defaultValue?: any;
}

/**
 * CRUD operation kinds
 */
export type OperationKind = 'list' | 'create' | 'read' | 'update' | 'delete' | 'search' | 'export';

/**
 * API operation definition
 */
export interface EntityOperation {
  kind: OperationKind;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  requestFields?: string[];  // Field names used in request
  responseFields?: string[];  // Field names in response
  queryParams?: string[];  // Query parameters
  pagination?: boolean;
}

/**
 * Entity definition
 */
export interface Entity {
  name: string;
  label: string;
  pluralName?: string;
  fields: EntityField[];
  operations: EntityOperation[];
  relationships?: EntityRelationship[];
  metadata?: {
    baseUrl?: string;
    resourcePath?: string;
    primaryKey?: string;
    timestamps?: {
      createdAt?: string;
      updatedAt?: string;
    };
  };
}

/**
 * Entity relationship types
 */
export type RelationshipType = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';

/**
 * Entity relationship
 */
export interface EntityRelationship {
  type: RelationshipType;
  entity: string;  // Related entity name
  foreignKey?: string;
  inverseOf?: string;
}

/**
 * Entities output
 */
export interface EntitiesOutput {
  entities: Entity[];
  metadata?: {
    extractedAt: string;
    totalEntities: number;
    totalOperations: number;
  };
}

/**
 * Entity extraction configuration
 */
export interface EntitiesConfig {
  tracePath: string;
  out: string;

  // Inference options
  minOccurrences?: number;  // Min times an endpoint must appear (default: 1)
  inferRelationships?: boolean;  // Attempt to infer relationships (default: true)
  includeMetadata?: boolean;  // Include extraction metadata (default: true)

  // Filtering
  ignoreEndpoints?: string[];  // Endpoint patterns to ignore
  entityNameMap?: Record<string, string>;  // Manual entity name overrides
}

/**
 * Entity extraction result
 */
export interface EntitiesResult {
  success: boolean;
  outputPath: string;
  entitiesFound: number;
  operationsFound: number;
  errors?: string[];
}
