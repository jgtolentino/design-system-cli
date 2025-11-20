/**
 * Phase 11: Functional Entities Extractor
 *
 * Infers data models and CRUD operations from network traces.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { TraceOutput, TraceEvent, NetworkShape } from '@ds-cli/functional-trace';
import {
  EntitiesConfig,
  EntitiesResult,
  Entity,
  EntityField,
  EntityOperation,
  EntitiesOutput,
  FieldType,
  OperationKind
} from './types';

/**
 * Extract entity name from URL path
 */
function extractEntityName(urlPath: string): string | null {
  try {
    // Remove leading/trailing slashes and API prefix
    const clean = urlPath
      .replace(/^\//, '')
      .replace(/\/$/, '')
      .replace(/^api\//, '')
      .replace(/^v\d+\//, '');  // Remove version prefix (v1, v2, etc.)

    // Split by slashes
    const parts = clean.split('/');

    if (parts.length === 0) return null;

    // First part is usually the resource name
    let resourceName = parts[0];

    // Remove ID patterns (numeric, uuid, etc.)
    resourceName = resourceName.replace(/:\w+$/, '');  // Remove :id
    resourceName = resourceName.replace(/\{\w+\}$/, '');  // Remove {id}

    // Singularize if plural (simple heuristic)
    if (resourceName.endsWith('ies')) {
      resourceName = resourceName.slice(0, -3) + 'y';  // categories → category
    } else if (resourceName.endsWith('ses')) {
      resourceName = resourceName.slice(0, -2);  // courses → course
    } else if (resourceName.endsWith('s') && !resourceName.endsWith('ss')) {
      resourceName = resourceName.slice(0, -1);  // users → user
    }

    // Convert to PascalCase
    return resourceName
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  } catch (error) {
    return null;
  }
}

/**
 * Infer field type from value
 */
function inferFieldType(value: any): FieldType {
  if (value === null || value === undefined) {
    return 'unknown';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  const type = typeof value;

  if (type === 'string') {
    // Check for date/datetime patterns
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return 'date-time';
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return 'date';
    }
    return 'string';
  }

  if (type === 'number') {
    return 'number';
  }

  if (type === 'boolean') {
    return 'boolean';
  }

  if (type === 'object') {
    return 'object';
  }

  return 'unknown';
}

/**
 * Extract fields from network shape
 */
function extractFieldsFromShape(
  shape: NetworkShape,
  source: 'request' | 'response',
  existingFields: Map<string, EntityField>
): void {
  for (const [key, value] of Object.entries(shape)) {
    // Skip internal/metadata fields
    if (key.startsWith('_') || key.startsWith('$')) continue;

    const fieldType = typeof value === 'string' ? (value as FieldType) : inferFieldType(value);

    if (!existingFields.has(key)) {
      existingFields.set(key, {
        name: key,
        type: fieldType,
        required: false,  // Will be updated based on frequency
        source: source
      });
    } else {
      // Update existing field
      const existing = existingFields.get(key)!;

      // If types differ, make it more general
      if (existing.type !== fieldType && fieldType !== 'unknown') {
        if (existing.type === 'unknown') {
          existing.type = fieldType;
        }
      }

      // Track multiple sources
      if (existing.source !== source) {
        existing.source = 'inferred';
      }
    }
  }
}

/**
 * Infer operation kind from method and path
 */
function inferOperationKind(method: string, path: string): OperationKind {
  const hasId = path.includes('/:') || path.includes('/{') || /\/\d+/.test(path);

  switch (method) {
    case 'GET':
      return hasId ? 'read' : 'list';
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'list';
  }
}

/**
 * Normalize URL path (replace IDs with parameters)
 */
function normalizeUrlPath(path: string): string {
  try {
    const url = new URL(path, 'http://example.com');
    let pathname = url.pathname;

    // Replace numeric IDs
    pathname = pathname.replace(/\/\d+/g, '/:id');

    // Replace UUID patterns
    pathname = pathname.replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '/:id'
    );

    return pathname;
  } catch (error) {
    return path;
  }
}

/**
 * Extract entities from trace
 */
export async function entities(config: EntitiesConfig): Promise<EntitiesResult> {
  try {
    console.log(`📦 Extracting entities and operations...`);
    console.log(`   Input: ${config.tracePath}`);

    // Load trace
    const traceData = fs.readFileSync(config.tracePath, 'utf-8');
    const trace: TraceOutput = JSON.parse(traceData);

    // Track entities by resource path
    const entityMap = new Map<string, {
      name: string;
      fields: Map<string, EntityField>;
      operations: Map<string, EntityOperation>;
      baseUrl: string;
    }>();

    // Process all network events
    for (const session of trace.sessions) {
      for (const event of session.events) {
        if (event.type !== 'network' || !event.url || !event.method) continue;

        const normalizedPath = normalizeUrlPath(event.url);
        const entityName = extractEntityName(normalizedPath);

        if (!entityName) continue;

        // Initialize entity if not exists
        if (!entityMap.has(entityName)) {
          entityMap.set(entityName, {
            name: entityName,
            fields: new Map(),
            operations: new Map(),
            baseUrl: normalizedPath
          });
        }

        const entityData = entityMap.get(entityName)!;

        // Extract fields from request
        if (event.requestShape) {
          extractFieldsFromShape(event.requestShape, 'request', entityData.fields);
        }

        // Extract fields from response
        if (event.responseShape) {
          extractFieldsFromShape(event.responseShape, 'response', entityData.fields);
        }

        // Track operation
        const operationKind = inferOperationKind(event.method, normalizedPath);
        const operationKey = `${event.method}:${normalizedPath}`;

        if (!entityData.operations.has(operationKey)) {
          entityData.operations.set(operationKey, {
            kind: operationKind,
            method: event.method as any,
            path: normalizedPath
          });
        }
      }
    }

    // Convert to Entity array
    const entitiesArray: Entity[] = Array.from(entityMap.entries()).map(
      ([name, data]) => {
        // Determine primary key (common patterns)
        const primaryKey = data.fields.has('id')
          ? 'id'
          : data.fields.has('_id')
          ? '_id'
          : undefined;

        // Detect timestamps
        const timestamps = {
          createdAt: data.fields.has('createdAt')
            ? 'createdAt'
            : data.fields.has('created_at')
            ? 'created_at'
            : undefined,
          updatedAt: data.fields.has('updatedAt')
            ? 'updatedAt'
            : data.fields.has('updated_at')
            ? 'updated_at'
            : undefined
        };

        return {
          name,
          label: name,
          fields: Array.from(data.fields.values()),
          operations: Array.from(data.operations.values()),
          metadata: {
            baseUrl: data.baseUrl,
            primaryKey,
            timestamps: timestamps.createdAt || timestamps.updatedAt ? timestamps : undefined
          }
        };
      }
    );

    // Create output
    const output: EntitiesOutput = {
      entities: entitiesArray,
      metadata: config.includeMetadata !== false ? {
        extractedAt: new Date().toISOString(),
        totalEntities: entitiesArray.length,
        totalOperations: entitiesArray.reduce((sum, e) => sum + e.operations.length, 0)
      } : undefined
    };

    // Write output
    const outDir = path.dirname(config.out);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(config.out, JSON.stringify(output, null, 2), 'utf-8');

    console.log(`\n✅ Entity extraction complete!`);
    console.log(`   Output: ${config.out}`);
    console.log(`   Entities: ${entitiesArray.length}`);
    console.log(`   Operations: ${output.metadata?.totalOperations || 0}`);

    return {
      success: true,
      outputPath: config.out,
      entitiesFound: entitiesArray.length,
      operationsFound: output.metadata?.totalOperations || 0
    };
  } catch (error: any) {
    console.error(`❌ Entity extraction failed:`, error.message);

    return {
      success: false,
      outputPath: config.out,
      entitiesFound: 0,
      operationsFound: 0,
      errors: [error.message]
    };
  }
}
