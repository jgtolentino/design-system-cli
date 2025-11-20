# Functionality Pipeline - Phases 9-12

**Purpose**: Complement visual cloning (Phases 1-8) with **functional cloning** - capture and recreate application behavior, flows, and logic.

---

## Architecture Overview

**DS Pipeline** (Phases 1-8): Extract design tokens, assets, HTML → Generate styled components
**FX Pipeline** (Phases 9-12): Extract interactions, flows, entities, rules → Generate functional scaffold

```
Website URL
    ↓
Phase 9: trace        → trace.json (interactions + network)
    ↓
Phase 10: flows       → screens.json + flows.json (user journeys)
    ↓
Phase 11: entities    → entities.json (data models + CRUD)
    ↓
Phase 12: rules       → rules.json (state machines + validations)
    ↓
Phase 12: fx-codegen  → Functional app scaffold
```

---

## Phase 9: Interaction Trace Recorder

### Package: `@ds-cli/functional-trace`

**Purpose**: Record user interactions, network calls, and navigation using Playwright.

**Key Files**:
- `packages/functional-trace/src/types.ts` - TypeScript types
- `packages/functional-trace/src/trace.ts` - Playwright recorder
- `packages/functional-trace/src/index.ts` - Package exports

**CLI Command**:
```bash
ds trace \
  --url https://gradual.com \
  --out out/gradual/trace.json \
  --duration 30000  # Optional: max recording duration (ms)
```

**Output Format** (`trace.json`):
```jsonc
{
  "meta": {
    "url": "https://gradual.com/",
    "recordedAt": "2025-11-20T10:30:00Z",
    "viewport": [1440, 900],
    "duration": 28500
  },
  "sessions": [
    {
      "id": "session-1",
      "startTime": 1732082400000,
      "endTime": 1732082428500,
      "events": [
        {
          "id": "evt-001",
          "type": "click",
          "selector": "button[data-test='create-workspace']",
          "label": "Create workspace",
          "timestamp": 1732082400000
        },
        {
          "id": "net-001",
          "type": "network",
          "method": "POST",
          "url": "/api/workspaces",
          "status": 201,
          "requestShape": { "name": "string", "plan": "string" },
          "responseShape": { "id": "string", "name": "string", "createdAt": "string" }
        },
        {
          "id": "nav-001",
          "type": "navigate",
          "toUrl": "/workspaces/abc123"
        }
      ]
    }
  ]
}
```

**Captured Data**:
- ✅ User events: click, input, change, submit, keyDown
- ✅ Navigation: URL changes, history pushes
- ✅ Network calls: method, URL, status, request/response **shapes** (types only)
- ✅ Minimal DOM context: CSS selectors + labels

**Recording Modes**:
- Manual: User drives interaction for specified duration
- Scripted: Pre-programmed interactions via `--steps-script` (future)

---

## Phase 10: Screens & Flows Extractor

### Package: `@ds-cli/functional-flows`

**Purpose**: Convert raw traces into structured screens and user journeys.

**CLI Command**:
```bash
ds flows \
  --trace out/gradual/trace.json \
  --out-screens out/gradual/screens.json \
  --out-flows out/gradual/flows.json
```

**Output 1** (`screens.json`):
```jsonc
{
  "screens": [
    {
      "id": "screen-landing",
      "urlPattern": "/",
      "label": "Landing Page",
      "primaryActions": ["go_to_login", "go_to_signup"]
    },
    {
      "id": "screen-workspace-list",
      "urlPattern": "/workspaces",
      "label": "Workspace List",
      "primaryActions": ["create_workspace", "open_workspace", "search_workspaces"]
    },
    {
      "id": "screen-workspace-detail",
      "urlPattern": "/workspaces/:id",
      "label": "Workspace Detail",
      "primaryActions": ["edit_workspace", "delete_workspace", "add_member"]
    }
  ]
}
```

**Output 2** (`flows.json`):
```jsonc
{
  "flows": [
    {
      "id": "flow-create-workspace",
      "name": "Create new workspace",
      "fromScreen": "screen-workspace-list",
      "toScreen": "screen-workspace-detail",
      "avgDuration": 2500,
      "steps": [
        { "type": "view", "screen": "screen-workspace-list" },
        { "type": "click", "action": "create_workspace_button" },
        { "type": "network", "operation": "POST /api/workspaces" },
        { "type": "navigate", "screen": "screen-workspace-detail" }
      ]
    }
  ]
}
```

**Detection Heuristics**:
- **Screen Boundaries**: URL changes, major layout shifts
- **Flow Segmentation**: Navigation events, success states, inactivity timeouts
- **Action Identification**: Click events with selectors + labels

---

## Phase 11: Entity & Data Model Inference

### Package: `@ds-cli/functional-entities`

**Purpose**: Infer entities, fields, and CRUD operations from network payloads and forms.

**CLI Command**:
```bash
ds entities \
  --trace out/gradual/trace.json \
  --out out/gradual/entities.json
```

**Output** (`entities.json`):
```jsonc
{
  "entities": [
    {
      "name": "Workspace",
      "label": "Workspace",
      "fields": [
        {
          "name": "id",
          "type": "string",
          "required": true,
          "source": "response"
        },
        {
          "name": "name",
          "type": "string",
          "required": true,
          "source": "form",
          "constraints": ["min:1", "max:100"]
        },
        {
          "name": "plan",
          "type": "string",
          "required": false,
          "source": "form",
          "enum": ["free", "pro", "enterprise"]
        },
        {
          "name": "createdAt",
          "type": "string",
          "format": "date-time",
          "source": "response"
        }
      ],
      "operations": [
        { "kind": "list", "method": "GET", "path": "/api/workspaces" },
        { "kind": "create", "method": "POST", "path": "/api/workspaces" },
        { "kind": "read", "method": "GET", "path": "/api/workspaces/:id" },
        { "kind": "update", "method": "PATCH", "path": "/api/workspaces/:id" },
        { "kind": "delete", "method": "DELETE", "path": "/api/workspaces/:id" }
      ]
    }
  ]
}
```

**Inference Strategies**:
1. **Network Clustering**: Group endpoints by base path (`/api/workspaces`)
2. **Entity Naming**: Extract from URL paths + response keys
3. **Field Types**: Infer from sample payloads (string, number, boolean, array, object)
4. **CRUD Detection**: Map HTTP methods to operations (GET=read/list, POST=create, PATCH/PUT=update, DELETE=delete)
5. **Constraint Extraction**: From form validation attributes, error messages

---

## Phase 12A: Business Rules & State Machines

### Package: `@ds-cli/functional-rules`

**Purpose**: Extract validation rules, permissions, and state machines.

**CLI Command**:
```bash
ds rules \
  --flows out/gradual/flows.json \
  --entities out/gradual/entities.json \
  --trace out/gradual/trace.json \
  --out out/gradual/rules.json
```

**Output** (`rules.json`):
```jsonc
{
  "stateMachines": [
    {
      "entity": "Workspace",
      "states": ["creating", "active", "suspended", "archived"],
      "initial": "creating",
      "transitions": [
        { "from": "creating", "to": "active", "trigger": "creation_success" },
        { "from": "active", "to": "suspended", "trigger": "payment_failed" },
        { "from": "active", "to": "archived", "trigger": "archive" },
        { "from": "suspended", "to": "active", "trigger": "payment_resolved" }
      ]
    }
  ],
  "validationRules": [
    {
      "entity": "Workspace",
      "field": "name",
      "rule": "required",
      "source": "inline error 'Workspace name is required'"
    },
    {
      "entity": "Workspace",
      "field": "name",
      "rule": "maxLength:100",
      "source": "API 422 response"
    }
  ],
  "permissions": [
    {
      "entity": "Workspace",
      "operation": "delete",
      "requires": ["role:owner", "state:active"]
    }
  ]
}
```

**Extraction Methods**:
- **State Machines**: Analyze status field values across flows, infer transitions from network responses
- **Validations**: Extract from inline error messages, 400/422 responses, form attributes
- **Permissions**: Detect from 403 responses, hidden UI elements, conditional rendering

**Implementation**: LLM-assisted analysis (SuperClaude skill) + heuristics

---

## Phase 12B: Functional Codegen

### Package: `@ds-cli/functional-codegen`

**Purpose**: Generate production-ready functional app scaffold from extracted specifications.

**CLI Command**:
```bash
ds fx-codegen \
  --screens out/gradual/screens.json \
  --flows out/gradual/flows.json \
  --entities out/gradual/entities.json \
  --rules out/gradual/rules.json \
  --framework nextjs \
  --out apps/gradual-fx
```

**Framework Support**:
- `nextjs` - Next.js 14 App Router (default)
- `react-spa` - Create React App / Vite
- `vue` - Vue 3 + Composition API
- `svelte` - SvelteKit

**Output Structure** (Next.js example):
```
apps/gradual-fx/
├─ app/
│  ├─ layout.tsx                    # Root layout
│  ├─ page.tsx                      # Landing (screen-landing)
│  ├─ workspaces/
│  │  ├─ page.tsx                  # List (screen-workspace-list)
│  │  ├─ new/page.tsx              # Create form
│  │  └─ [id]/
│  │     ├─ page.tsx               # Detail (screen-workspace-detail)
│  │     └─ edit/page.tsx          # Edit form
├─ lib/
│  ├─ api/
│  │  └─ workspaces.ts             # Typed API client
│  ├─ state/
│  │  └─ workspaceMachine.ts       # XState machine from rules.json
│  └─ types/
│     └─ entities.ts               # TypeScript types from entities.json
├─ components/
│  ├─ WorkspaceForm.tsx            # Form with validation
│  ├─ WorkspaceList.tsx            # List view
│  ├─ WorkspaceCard.tsx            # Item component
│  └─ Navigation.tsx               # Navigation component
├─ tokens/
│  └─ tailwind.config.js           # Can import from ds hard-fork
├─ package.json
├─ next.config.js
└─ FUNCTIONALITY_SPEC.md           # Generated specification
```

**Generated Components**:

1. **Route/Page Structure**: Based on `screens.json`
2. **CRUD Forms**: Based on `entities.json` fields + validation rules
3. **API Clients**: Typed fetch/axios wrappers from operations
4. **State Machines**: XState/Zustand implementations from `rules.json`
5. **TypeScript Types**: Zod schemas + type definitions
6. **Validation Logic**: Client-side validators from rules
7. **Navigation**: Route configuration from flows

**Code Quality**:
- ✅ Full TypeScript types
- ✅ Form validation (Zod/Yup)
- ✅ State management (XState/Zustand)
- ✅ API error handling
- ✅ Loading states
- ✅ Accessibility (ARIA labels, keyboard nav)

---

## Complete Workflow Example

### Extract Gradual.com Functionality

```bash
# 1) Capture behavior
ds trace \
  --url https://gradual.com \
  --out out/gradual/trace.json \
  --duration 60000  # 1 minute manual interaction

# 2) Derive flows + screens
ds flows \
  --trace out/gradual/trace.json \
  --out-screens out/gradual/screens.json \
  --out-flows out/gradual/flows.json

# 3) Derive entities
ds entities \
  --trace out/gradual/trace.json \
  --out out/gradual/entities.json

# 4) Derive rules/state machines
ds rules \
  --flows out/gradual/flows.json \
  --entities out/gradual/entities.json \
  --trace out/gradual/trace.json \
  --out out/gradual/rules.json

# 5) Generate functional app scaffold
ds fx-codegen \
  --screens out/gradual/screens.json \
  --flows out/gradual/flows.json \
  --entities out/gradual/entities.json \
  --rules out/gradual/rules.json \
  --framework nextjs \
  --out apps/gradual-fx

# 6) Optional: Combine with visual hard fork
ds extract-html --url https://some-design-ref.com --out out/gradual/design
ds hard-fork --source out/gradual/design --preset insightpulse --out out/gradual/design-fork

# 7) Use the template
cd apps/gradual-fx
npm install
npm run dev  # http://localhost:3000
```

**Result**: A functional app that behaves like Gradual (entities, flows, rules) but styled as you choose.

---

## Integration with Existing Pipelines

### DS + FX Combined

**Visual Cloning** (DS):
- `ds pipeline` → tokens + assets
- `ds hard-fork` → brand-neutral components

**Functional Cloning** (FX):
- `ds trace` → interactions
- `ds flows/entities/rules` → specifications
- `ds fx-codegen` → functional scaffold

**Merge Strategy**:
1. Run DS pipeline for design
2. Run FX pipeline for logic
3. Merge: Import tokens from DS hard-fork into FX codegen output
4. Result: App with target functionality + your visual identity

### Odoo/SAP Integration

For enterprise SaaS like Gradual, Concur, SAP alternatives:

**FX Pipeline** extracts:
- Entities → **Odoo models** (`hr.expense`, `project.task`, etc.)
- Flows → **Odoo workflows** (state transitions, approvals)
- Rules → **Odoo constraints** (computed fields, validations)

**Code Generation Targets**:
- `--framework odoo` → Odoo 19 module scaffolding
- `--framework supabase` → Supabase tables + RLS policies + Edge Functions
- `--framework nextjs` → Next.js frontend + API routes

---

## SuperClaude Integration

### New Skill: `functionality-extractor-cli`

**Auto-Activation Triggers**:
- Keywords: "clone workflow", "recreate functionality", "extract entities", "capture flows"
- User requests to understand app behavior
- Competitive analysis requests

**Workflow Orchestration**:
```
User: "Clone the workflow of Gradual.com"

SuperClaude:
1. Activates functionality-extractor-cli skill
2. Runs: ds trace (manual mode - prompts user to interact)
3. Runs: ds flows → screens.json + flows.json
4. Runs: ds entities → entities.json
5. Runs: ds rules (LLM-assisted) → rules.json
6. Runs: ds fx-codegen → apps/gradual-fx/
7. Generates: FUNCTIONALITY_SPEC.md
8. Returns: "Functional scaffold created at apps/gradual-fx/"
```

### Persona Coordination

- **Analyzer**: Flow analysis, entity detection
- **Architect**: System design, state machine modeling
- **Backend**: API client generation, data validation
- **Frontend**: Component scaffolding, form generation
- **Scribe**: Specification documentation (FUNCTIONALITY_SPEC.md)

---

## Current Status

### ✅ Implemented (Phase 9-10 Partial)
- Phase 9: Trace package structure + types + Playwright recorder
- Phase 10: Flows package structure + types + screen/flow extraction

### ⏳ In Progress
- Phase 10: Complete flows.ts implementation
- Phase 11: Entities package
- Phase 12: Rules package
- Phase 12: fx-codegen package
- CLI integration for all new commands

### 📋 Next Steps
1. Complete Phase 10 flows extraction
2. Create Phase 11 entities package
3. Create Phase 12 rules package (with LLM assistance)
4. Create Phase 12 fx-codegen package
5. Add CLI commands to `bin/ds`
6. Update OPERATIONAL_STATUS.md
7. Test end-to-end on Gradual.com or similar SaaS

---

## File Structure

```
packages/
├─ functional-trace/          # Phase 9
│  ├─ src/
│  │  ├─ types.ts            ✅
│  │  ├─ trace.ts            ✅
│  │  └─ index.ts            ✅
│  ├─ package.json           ✅
│  └─ tsconfig.json          ✅
├─ functional-flows/          # Phase 10
│  ├─ src/
│  │  ├─ types.ts            ✅
│  │  ├─ flows.ts            ✅
│  │  └─ index.ts            ✅
│  ├─ package.json           ✅
│  └─ tsconfig.json          ✅
├─ functional-entities/       # Phase 11 (TODO)
├─ functional-rules/          # Phase 12A (TODO)
└─ functional-codegen/        # Phase 12B (TODO)
```

---

## Success Metrics

**Functionality Fidelity**:
- Entity coverage: ≥90% of core entities detected
- Flow coverage: ≥80% of common user journeys captured
- Rule coverage: ≥70% of validations and state machines identified
- Code quality: Generated code compiles and runs without errors

**Performance**:
- Trace recording: <5% performance overhead
- Flow extraction: <10 seconds for typical trace
- Entity inference: <5 seconds for typical trace
- Codegen: <30 seconds for complete app scaffold

---

**Status**: Phase 9 ✅ | Phase 10 🔄 | Phase 11-12 📋
