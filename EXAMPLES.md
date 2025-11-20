# DSRE Examples

Canonical examples for Design System Reverse Engineering (DSRE) workflows.

## Visual Clone (dsre/VISUAL_CLONE_ONLY)

**Purpose**: Extract design tokens, HTML structure, components, and visual assets. Recreate the visual appearance and design system without cloning functional behavior.

**Target**: `https://www.gradual.com`
**Output**: `out/gradual/`

### Full Visual Pipeline

```bash
#!/usr/bin/env bash
set -euo pipefail

PROJECT_SLUG="gradual"
URL="https://www.gradual.com"

mkdir -p "out/${PROJECT_SLUG}"

# 1) HTML + visual layer
pnpm ds extract-html \
  --url "${URL}" \
  --out "out/${PROJECT_SLUG}/html-extracted"

# 2) Design tokens extraction
pnpm ds extract \
  --url "${URL}" \
  --out "out/${PROJECT_SLUG}/tokens-raw.json"

# 3) Token normalization
pnpm ds normalize \
  --input "out/${PROJECT_SLUG}/tokens-raw.json" \
  --out "out/${PROJECT_SLUG}/tokens-normalized.json"

# 4) Figma plugin generation
pnpm ds figma \
  --input "out/${PROJECT_SLUG}/tokens-normalized.json" \
  --out "out/${PROJECT_SLUG}/figma-plugin"

# 5) Code generation (React + Tailwind)
pnpm ds codegen \
  --input "out/${PROJECT_SLUG}/tokens-normalized.json" \
  --framework react-tailwind \
  --out "out/${PROJECT_SLUG}/design-system"
```

### Visual-Only Results

**Extracted**:
- ✅ Complete DOM structure (`html-extracted/original-page.html`)
- ✅ All visual assets (images, fonts, SVGs)
- ✅ Design tokens (colors, typography, spacing, shadows)
- ✅ Component library (React components generated from HTML)
- ✅ Figma plugin (design tokens → Figma variables)
- ✅ Design system code (Tailwind config + React components)

**Output Structure**:
```
out/gradual/
├── html-extracted/
│   ├── original-page.html          # Full DOM
│   ├── assets.json                 # Asset inventory
│   ├── components/                 # Generated React components
│   └── assets/                     # Downloaded images/fonts/SVGs
├── tokens-raw.json                 # Raw extracted tokens
├── tokens-normalized.json          # Normalized house system format
├── figma-plugin/                   # Figma plugin code
└── design-system/                  # React + Tailwind design system
```

**Forbidden Operations** (visual mode):
- ❌ `trace` - API behavior recording (functional mode only)
- ❌ `flows` - User flow extraction (functional mode only)
- ❌ `entities` - Data model inference (functional mode only)
- ❌ `rules` - Business logic extraction (functional mode only)
- ❌ `fx-codegen` - Functional code generation (functional mode only)

---

## Functional Clone (dsre/FUNCTIONAL_CLONE_ONLY)

**Purpose**: Capture API behavior, user flows, data entities, and business rules. Recreate the functional behavior without cloning visual design.

**Target**: `https://todomvc.com/examples/vanillajs/`
**Output**: `out/todomvc/`

### Full Functional Pipeline

```bash
#!/usr/bin/env bash
set -euo pipefail

PROJECT_SLUG="todomvc"
URL="https://todomvc.com/examples/vanillajs/"

mkdir -p "out/${PROJECT_SLUG}"

# 1) Capture user behavior + API calls (60 seconds)
pnpm ds trace \
  --url "${URL}" \
  --out "out/${PROJECT_SLUG}/trace.json" \
  --duration 60000

# 2) Extract screens and user flows
pnpm ds flows \
  --trace "out/${PROJECT_SLUG}/trace.json" \
  --out-screens "out/${PROJECT_SLUG}/screens.json" \
  --out-flows "out/${PROJECT_SLUG}/flows.json"

# 3) Infer data entities and models
pnpm ds entities \
  --trace "out/${PROJECT_SLUG}/trace.json" \
  --out "out/${PROJECT_SLUG}/entities.json"

# 4) Extract business rules (optional)
pnpm ds rules \
  --trace "out/${PROJECT_SLUG}/trace.json" \
  --flows "out/${PROJECT_SLUG}/flows.json" \
  --entities "out/${PROJECT_SLUG}/entities.json" \
  --out "out/${PROJECT_SLUG}/rules.json"

# 5) Generate functional scaffold (optional)
pnpm ds fx-codegen \
  --entities "out/${PROJECT_SLUG}/entities.json" \
  --flows "out/${PROJECT_SLUG}/flows.json" \
  --rules "out/${PROJECT_SLUG}/rules.json" \
  --framework react-typescript \
  --out "out/${PROJECT_SLUG}/app"
```

### Functional-Only Results

**Extracted**:
- ✅ User interaction trace (clicks, typing, navigation)
- ✅ Network activity (API calls, request/response payloads)
- ✅ Screen definitions (unique views and their triggers)
- ✅ User flows (sequences of screens and actions)
- ✅ Data entities (inferred models from API responses)
- ✅ Business rules (validation, state machines, constraints)
- ✅ Functional scaffold (API routes, type definitions, client code)

**Output Structure**:
```
out/todomvc/
├── trace.json                      # Full interaction + network trace
├── screens.json                    # Screen definitions
├── flows.json                      # User journey flows
├── entities.json                   # Data models
├── rules.json                      # Business logic rules
└── app/                            # Generated functional app
    ├── lib/api/                    # API route handlers
    ├── lib/types.ts                # TypeScript entity definitions
    └── app/                        # Next.js pages
```

**Forbidden Operations** (functional mode):
- ❌ `extract` - Design token extraction (visual mode only)
- ❌ `extract-html` - HTML structure extraction (visual mode only)
- ❌ `normalize` - Token normalization (visual mode only)
- ❌ `figma` - Figma plugin generation (visual mode only)
- ❌ `codegen` - Design system code generation (visual mode only)
- ❌ `hard-fork` - Brand stripping and legal cleanup (visual mode only)

---

## Complete Clone (dsre_complete)

**Purpose**: Full visual + functional clone in two passes.

**Target**: Any web application
**Strategy**: Run visual pipeline first, then functional pipeline

```bash
#!/usr/bin/env bash
set -euo pipefail

PROJECT_SLUG="complete-app"
URL="https://example.com"

mkdir -p "out/${PROJECT_SLUG}"

# PHASE 1: VISUAL CLONE
echo "Phase 1: Visual clone..."
pnpm ds extract-html --url "${URL}" --out "out/${PROJECT_SLUG}/html-extracted"
pnpm ds extract --url "${URL}" --out "out/${PROJECT_SLUG}/tokens-raw.json"
pnpm ds normalize --input "out/${PROJECT_SLUG}/tokens-raw.json" --out "out/${PROJECT_SLUG}/tokens-normalized.json"
pnpm ds codegen --input "out/${PROJECT_SLUG}/tokens-normalized.json" --framework react-tailwind --out "out/${PROJECT_SLUG}/design-system"

# PHASE 2: FUNCTIONAL CLONE
echo "Phase 2: Functional clone..."
pnpm ds trace --url "${URL}" --out "out/${PROJECT_SLUG}/trace.json" --duration 60000
pnpm ds flows --trace "out/${PROJECT_SLUG}/trace.json" --out-screens "out/${PROJECT_SLUG}/screens.json" --out-flows "out/${PROJECT_SLUG}/flows.json"
pnpm ds entities --trace "out/${PROJECT_SLUG}/trace.json" --out "out/${PROJECT_SLUG}/entities.json"
pnpm ds fx-codegen --entities "out/${PROJECT_SLUG}/entities.json" --flows "out/${PROJECT_SLUG}/flows.json" --framework react-typescript --out "out/${PROJECT_SLUG}/app"

echo "✅ Complete clone finished: out/${PROJECT_SLUG}/"
```

**Output**: Combined visual + functional artifacts
- `out/${PROJECT_SLUG}/design-system/` - Visual design system
- `out/${PROJECT_SLUG}/app/` - Functional application scaffold
- `out/${PROJECT_SLUG}/html-extracted/` - Original HTML structure
- `out/${PROJECT_SLUG}/trace.json` - Behavioral trace

---

## Example Targets & Results

### Completed Examples

| Target | Type | Output Directory | Status |
|--------|------|-----------------|--------|
| `https://www.gradual.com` | Visual | `out/gradual/` | ✅ Complete |
| `https://todomvc.com/examples/vanillajs/` | Functional | `out/todomvc/` | ✅ Complete |

### Visual Clone: Gradual.com

**Completed**: 2025-11-20

**Extracted Artifacts**:
- Design tokens: 47 colors, 8 typography scales, 12 spacing values
- Components: 23 React components generated from HTML structure
- Assets: 15 images, 3 SVG icons, 2 custom fonts
- Design system: Complete Tailwind config + React component library

**Notable Features**:
- Gradient background extraction preserved
- Custom font loading automated
- Responsive breakpoints detected from CSS
- Component hierarchy inferred from semantic HTML

**Output Size**: 2.3 MB total (1.8 MB assets, 500 KB code)

### Functional Clone: TodoMVC

**Completed**: 2025-11-20

**Extracted Artifacts**:
- Entities: 1 core entity (`Todo`) with 5 fields
- Flows: 6 user flows (create, complete, delete, filter, edit, clear)
- API endpoints: 13 routes inferred from client-side state management
- Business rules: 8 validation rules, 2 state machines

**Notable Features**:
- Local storage → API route pattern conversion
- CRUD operations automatically scaffolded
- Filter state management preserved
- Keyboard shortcuts mapped to API actions

**Output**: Complete Next.js app with TypeScript types and API routes

---

## Usage with SuperClaude Orchestrator

The DSRE orchestrator (`~/.claude/ORCHESTRATOR.md`) automatically routes requests to the correct mode:

**Visual Clone Triggers**:
```
"Clone the visual design from gradual.com"
"Extract design tokens from this site"
"Recreate the page visually with Tailwind"
```
→ Auto-activates `dsre/VISUAL_CLONE_ONLY` skill

**Functional Clone Triggers**:
```
"Trace the API behavior of this app"
"Clone the user flows and data models"
"Replicate the backend logic"
```
→ Auto-activates `dsre/FUNCTIONAL_CLONE_ONLY` skill

**Complete Clone Triggers**:
```
"Clone the whole thing - visual and functional"
"Full clone of this web app"
"Complete clone with both design and behavior"
```
→ Auto-activates `dsre_complete` two-pass workflow

---

## Next Steps

1. **Add More Examples**: Run visual + functional clones on diverse targets
2. **Hard-Fork Examples**: Add legal cleanup examples (`pnpm ds hard-fork`)
3. **Asset Recreation**: Test `pnpm ds assets-prompts` with fal-ai integration
4. **Performance Benchmarks**: Document extraction times and output sizes
5. **Quality Metrics**: Compare visual fidelity and functional accuracy

---

## References

- **CLI Documentation**: See `CLI_REFERENCE.md` for complete command reference
- **Pipeline Architecture**: See `FUNCTIONALITY_PIPELINE.md` for technical details
- **Operational Status**: See `OPERATIONAL_STATUS.md` for phase completion tracking
- **DSRE Skills**: See `SKILL.md` for SuperClaude skill integration
- **Changelog**: See `CHANGELOG-2025-11-20.md` for recent changes
