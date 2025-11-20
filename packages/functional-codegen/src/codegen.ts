/**
 * Phase 12: Functional Codegen
 *
 * Generates functional application scaffolds from behavioral data.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  CodegenConfig,
  CodegenResult,
  CodegenInputs,
  GeneratedFile
} from './types';

/**
 * Load all input files
 */
function loadInputs(config: CodegenConfig): CodegenInputs {
  const screensData = JSON.parse(fs.readFileSync(config.screensPath, 'utf-8'));
  const screens = screensData.screens || [];

  const flowsData = JSON.parse(fs.readFileSync(config.flowsPath, 'utf-8'));
  const flows = flowsData.flows || [];

  const entitiesData = JSON.parse(fs.readFileSync(config.entitiesPath, 'utf-8'));
  const entities = entitiesData.entities || [];

  const rules = JSON.parse(fs.readFileSync(config.rulesPath, 'utf-8'));

  return { screens, flows, entities, rules };
}

/**
 * Generate Next.js package.json
 */
function generatePackageJson(): GeneratedFile {
  const content = `{
  "name": "functional-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zod": "^3.23.0",
    "react-hook-form": "^7.51.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.3.3",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.2.0"
  }
}`;

  return {
    path: 'package.json',
    content,
    type: 'config'
  };
}

/**
 * Generate Next.js tsconfig.json
 */
function generateTsConfig(): GeneratedFile {
  const content = `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}`;

  return {
    path: 'tsconfig.json',
    content,
    type: 'config'
  };
}

/**
 * Generate Next.js layout
 */
function generateLayout(entities: any[]): GeneratedFile {
  const entityLinks = entities.map(e =>
    `          <a href="/${e.name.toLowerCase()}s" className="px-4 py-2 hover:bg-gray-100 rounded">
            ${e.label || e.name}
          </a>`
  ).join('\n');

  const content = `import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Functional App',
  description: 'Generated functional application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <nav className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-4">
            <a href="/" className="font-bold text-xl">Functional App</a>
${entityLinks}
          </div>
        </nav>
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}`;

  return {
    path: 'app/layout.tsx',
    content,
    type: 'page'
  };
}

/**
 * Generate entity list page
 */
function generateEntityListPage(entity: any): GeneratedFile {
  const entityLower = entity.name.toLowerCase();
  const entityPlural = entityLower + 's';

  const content = `'use client'

import { useEffect, useState } from 'react'
import { ${entity.name} } from '@/lib/types'
import { get${entity.name}s } from '@/lib/api/${entityPlural}'

export default function ${entity.name}ListPage() {
  const [items, setItems] = useState<${entity.name}[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    try {
      const data = await get${entity.name}s()
      setItems(data)
    } catch (error) {
      console.error('Failed to load ${entityPlural}:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">${entity.label || entity.name}s</h1>
        <a
          href="/${entityPlural}/new"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create ${entity.name}
        </a>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <a
            key={item.id}
            href={\`/${entityPlural}/\${item.id}\`}
            className="block p-4 border border-gray-200 rounded hover:border-gray-400"
          >
            <div className="font-semibold">{item.name || item.id}</div>
            ${entity.fields.some((f: any) => f.name === 'status') ? '<div className="text-sm text-gray-600 mt-1">{item.status}</div>' : ''}
          </a>
        ))}
      </div>
    </div>
  )
}`;

  return {
    path: `app/${entityPlural}/page.tsx`,
    content,
    type: 'page'
  };
}

/**
 * Generate API client for entity
 */
function generateApiClient(entity: any): GeneratedFile {
  const entityLower = entity.name.toLowerCase();
  const entityPlural = entityLower + 's';
  const baseUrl = entity.metadata?.baseUrl || `/${entityPlural}`;

  const content = `import { ${entity.name} } from '../types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export async function get${entity.name}s(): Promise<${entity.name}[]> {
  const res = await fetch(\`\${API_BASE}${baseUrl}\`)
  if (!res.ok) throw new Error('Failed to fetch ${entityPlural}')
  return res.json()
}

export async function get${entity.name}(id: string): Promise<${entity.name}> {
  const res = await fetch(\`\${API_BASE}${baseUrl}/\${id}\`)
  if (!res.ok) throw new Error('Failed to fetch ${entityLower}')
  return res.json()
}

export async function create${entity.name}(data: Partial<${entity.name}>): Promise<${entity.name}> {
  const res = await fetch(\`\${API_BASE}${baseUrl}\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to create ${entityLower}')
  return res.json()
}

export async function update${entity.name}(id: string, data: Partial<${entity.name}>): Promise<${entity.name}> {
  const res = await fetch(\`\${API_BASE}${baseUrl}/\${id}\`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update ${entityLower}')
  return res.json()
}

export async function delete${entity.name}(id: string): Promise<void> {
  const res = await fetch(\`\${API_BASE}${baseUrl}/\${id}\`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Failed to delete ${entityLower}')
}`;

  return {
    path: `lib/api/${entityPlural}.ts`,
    content,
    type: 'lib'
  };
}

/**
 * Generate TypeScript types from entities
 */
function generateTypes(entities: any[]): GeneratedFile {
  const types = entities.map(entity => {
    const fields = entity.fields.map((f: any) => {
      const tsType = f.type === 'string' ? 'string' :
                    f.type === 'number' ? 'number' :
                    f.type === 'boolean' ? 'boolean' :
                    f.type === 'date-time' ? 'string' :
                    f.type === 'array' ? 'any[]' :
                    f.type === 'object' ? 'any' : 'any';
      return `  ${f.name}${f.required ? '' : '?'}: ${tsType}`;
    }).join('\n');

    return `export interface ${entity.name} {
${fields}
}`;
  }).join('\n\n');

  return {
    path: 'lib/types.ts',
    content: types,
    type: 'lib'
  };
}

/**
 * Generate README with functionality spec
 */
function generateReadme(inputs: CodegenInputs): GeneratedFile {
  const content = `# Functional Application

Generated from behavioral analysis.

## Entities

${inputs.entities.map(e => `- **${e.name}**: ${e.fields.length} fields, ${e.operations.length} operations`).join('\n')}

## State Machines

${inputs.rules.stateMachines.map(sm => `- **${sm.entity}**: ${sm.states.join(', ')}`).join('\n')}

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000)

## Structure

- \`app/\` - Next.js pages and layouts
- \`lib/\` - API clients, types, utilities
- \`components/\` - Reusable React components

## Generated From

- Screens: ${inputs.screens.length}
- Flows: ${inputs.flows.length}
- Entities: ${inputs.entities.length}
- State Machines: ${inputs.rules.stateMachines.length}
- Validation Rules: ${inputs.rules.validationRules.length}
`;

  return {
    path: 'README.md',
    content,
    type: 'config'
  };
}

/**
 * Write files to disk
 */
function writeFiles(files: GeneratedFile[], outDir: string): void {
  for (const file of files) {
    const filePath = path.join(outDir, file.path);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, file.content, 'utf-8');
  }
}

/**
 * Main codegen function
 */
export async function generateCode(config: CodegenConfig): Promise<CodegenResult> {
  try {
    console.log(`🎨 Generating functional application...`);
    console.log(`   Framework: ${config.framework}`);
    console.log(`   Output: ${config.out}`);

    // Load inputs
    const inputs = loadInputs(config);

    // Generate files
    const files: GeneratedFile[] = [];

    // Config files
    files.push(generatePackageJson());
    files.push(generateTsConfig());
    files.push(generateReadme(inputs));

    // Types
    files.push(generateTypes(inputs.entities));

    // Layout
    files.push(generateLayout(inputs.entities));

    // Entity pages and API clients
    for (const entity of inputs.entities) {
      files.push(generateEntityListPage(entity));
      files.push(generateApiClient(entity));
    }

    // Write all files
    writeFiles(files, config.out);

    console.log(`\n✅ Code generation complete!`);
    console.log(`   Output: ${config.out}`);
    console.log(`   Files: ${files.length}`);
    console.log(`   Pages: ${files.filter(f => f.type === 'page').length}`);
    console.log(`   Components: ${files.filter(f => f.type === 'component').length}`);

    return {
      success: true,
      outputPath: config.out,
      filesGenerated: files.length,
      componentsGenerated: files.filter(f => f.type === 'component').length,
      pagesGenerated: files.filter(f => f.type === 'page').length
    };
  } catch (error: any) {
    console.error(`❌ Code generation failed:`, error.message);

    return {
      success: false,
      outputPath: config.out,
      filesGenerated: 0,
      componentsGenerated: 0,
      pagesGenerated: 0,
      errors: [error.message]
    };
  }
}
