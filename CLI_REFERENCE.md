# Design System CLI - Complete Command Reference

## Full Automated Pipeline ⚡

### One Command - Complete Visual Clone
```bash
node bin/ds pipeline --url <URL> --framework <framework>
```

**Example**:
```bash
node bin/ds pipeline --url https://www.gradual.com --framework react-tailwind
```

**What it does** (4 steps in 12 seconds):
1. ✅ Extracts all design tokens from the website
2. ✅ Normalizes tokens to standard format
3. ✅ Generates Figma plugin for import
4. ✅ Generates framework code (React/Vue/etc)

**Frameworks supported**:
- `react-tailwind` - Next.js + Tailwind CSS + TypeScript
- `vue-tailwind` - Vue 3 + Tailwind CSS
- `angular-scss` - Angular + SCSS
- `vanilla-css` - Plain HTML/CSS/JS

---

## Individual Commands (Step-by-Step)

### 1. Extract Design Tokens
```bash
node bin/ds extract --url <URL> [options]
```

**Options**:
- `--url <URL>` - Target website URL (required)
- `--out <path>` - Output file path (default: `./tokens-raw.json`)
- `--viewport <width>,<height>` - Browser viewport (default: `1440,900`)
- `--timeout <ms>` - Navigation timeout (default: `60000`)
- `--headless` - Run browser in headless mode (default: `true`)

**Examples**:
```bash
# Basic extraction
node bin/ds extract --url https://www.gradual.com

# Custom output path
node bin/ds extract --url https://example.com --out my-tokens.json

# Mobile viewport
node bin/ds extract --url https://example.com --viewport 375,812

# Visible browser (for debugging)
node bin/ds extract --url https://example.com --headless false
```

**Output**: `tokens-raw.json` with:
- Colors (RGB, hex, CSS variables)
- Typography (font families, sizes, weights, line heights)
- Spacing (margins, paddings)
- Border radius values
- Shadows
- Breakpoints
- Component patterns
- Assets (images, icons, videos)

---

### 2. Normalize Tokens
```bash
node bin/ds normalize --input <file> [options]
```

**Options**:
- `--input <file>` - Raw tokens JSON file (required)
- `--out <path>` - Output file path (default: `./tokens-normalized.json`)
- `--mapping <file>` - Custom mapping file for token names

**Examples**:
```bash
# Basic normalization
node bin/ds normalize --input tokens-raw.json

# Custom output
node bin/ds normalize --input tokens-raw.json --out design-tokens.json

# With custom mapping
node bin/ds normalize --input tokens-raw.json --mapping custom-map.json
```

**What it does**:
- Converts raw values to semantic names
- Creates color scales (50-900)
- Normalizes spacing to rem units
- Standardizes font sizes
- Creates consistent breakpoint names

**Output**: `tokens-normalized.json` ready for Figma/code generation

---

### 3. Generate Figma Plugin
```bash
node bin/ds figma --input <file> [options]
```

**Options**:
- `--input <file>` - Normalized tokens JSON (required)
- `--mode <mode>` - Generation mode: `plugin` or `import` (default: `plugin`)
- `--out <dir>` - Output directory (default: `./figma-plugin`)

**Examples**:
```bash
# Generate Figma plugin
node bin/ds figma --input tokens-normalized.json

# Custom output directory
node bin/ds figma --input tokens-normalized.json --out my-figma-plugin

# Import mode (generates import script)
node bin/ds figma --input tokens-normalized.json --mode import
```

**Output**:
- `figma-plugin/manifest.json` - Plugin configuration
- `figma-plugin/code.js` - Token import logic
- `figma-plugin/ui.html` - Plugin UI

**Usage in Figma**:
1. Open Figma Desktop
2. Go to: Plugins → Development → Import plugin from manifest
3. Select `figma-plugin/manifest.json`
4. Run the plugin to import all tokens

---

### 4. Generate Framework Code
```bash
node bin/ds codegen --input <file> --framework <framework> [options]
```

**Options**:
- `--input <file>` - Normalized tokens JSON (required)
- `--framework <name>` - Target framework (required)
- `--out <dir>` - Output directory (default: `./design-system`)

**Frameworks**:
- `react-tailwind` - Next.js + Tailwind CSS + TypeScript
- `vue-tailwind` - Vue 3 + Tailwind CSS + TypeScript
- `angular-scss` - Angular + SCSS modules
- `vanilla-css` - Plain CSS custom properties

**Examples**:
```bash
# React + Tailwind
node bin/ds codegen --input tokens-normalized.json --framework react-tailwind

# Vue + Tailwind
node bin/ds codegen --input tokens-normalized.json --framework vue-tailwind

# Custom output directory
node bin/ds codegen --input tokens-normalized.json --framework react-tailwind --out my-design-system
```

**Generated files**:
- `tailwind.config.ts` - Complete Tailwind theme
- `src/utils/cn.ts` - className utility
- `src/components/Button.tsx` - Sample component
- `package.json` - Dependencies
- `README.md` - Usage guide

---

## Advanced Usage

### Chain Commands
```bash
# Extract, normalize, and generate in sequence
node bin/ds extract --url https://example.com && \
node bin/ds normalize --input tokens-raw.json && \
node bin/ds codegen --input tokens-normalized.json --framework react-tailwind
```

### Custom Workflow
```bash
# 1. Extract with mobile viewport
node bin/ds extract --url https://example.com --viewport 375,812 --out mobile-tokens.json

# 2. Extract with desktop viewport
node bin/ds extract --url https://example.com --viewport 1920,1080 --out desktop-tokens.json

# 3. Normalize both
node bin/ds normalize --input mobile-tokens.json --out mobile-normalized.json
node bin/ds normalize --input desktop-tokens.json --out desktop-normalized.json

# 4. Generate responsive code
node bin/ds codegen --input mobile-normalized.json --framework react-tailwind
```

### Compare Design Systems
```bash
# Extract from competitor
node bin/ds extract --url https://competitor.com --out competitor-tokens.json
node bin/ds normalize --input competitor-tokens.json --out competitor-normalized.json

# Extract from your site
node bin/ds extract --url https://yoursite.com --out your-tokens.json
node bin/ds normalize --input your-tokens.json --out your-normalized.json

# Compare
diff competitor-normalized.json your-normalized.json
```

---

## Troubleshooting

### Site Loads Too Slowly
**Problem**: Extraction times out

**Solutions**:
```bash
# Increase timeout
node bin/ds extract --url <URL> --timeout 120000

# Try different viewport
node bin/ds extract --url <URL> --viewport 375,812

# Run with visible browser to debug
node bin/ds extract --url <URL> --headless false
```

### Bot Protection Detected
**Problem**: Site blocks automated browsers

**Solutions**:
1. **Use existing browser session** (future feature)
2. **Manual HTML save** (visual-only, no functional data)
3. **HAR file import** (future feature)

### Missing Dependencies
```bash
# Install CLI dependencies
pnpm install

# Rebuild if needed
pnpm build

# Install Playwright browsers
npx playwright install --with-deps chromium
```

### Generated Code Won't Build
```bash
# Navigate to generated directory
cd design-system

# Install dependencies
npm install

# Start dev server
npm run dev
```

---

## Performance Benchmarks

| Site | Size | Colors | Assets | Time | Status |
|------|------|--------|--------|------|--------|
| Gradual.com | Medium | 35 | 90 | 12s | ✅ |
| TodoMVC | Small | 13 | 52 | 8s | ✅ |
| Google AI Fund | Large | 15 | 60 | 15s | ✅ |

**Typical extraction times**:
- Small sites (< 50 assets): 5-10 seconds
- Medium sites (50-200 assets): 10-20 seconds
- Large sites (> 200 assets): 20-40 seconds

---

## Output Files Structure

```
project/
├── tokens-raw.json          # Raw extraction (35 KB typical)
├── tokens-normalized.json   # Normalized tokens (5 KB typical)
├── assets.json             # Asset inventory (20-50 KB)
├── figma-plugin/
│   ├── manifest.json       # Figma plugin config
│   ├── code.js            # Import logic
│   └── ui.html            # Plugin UI
└── design-system/
    ├── tailwind.config.ts # Tailwind theme (5-10 KB)
    ├── src/
    │   ├── components/    # Sample components
    │   └── utils/         # Utilities
    ├── package.json       # Dependencies
    └── README.md          # Usage guide
```

---

## Common Workflows

### Workflow 1: Quick Prototype
```bash
# One command to clone and start coding
node bin/ds pipeline --url https://example.com --framework react-tailwind && \
cd design-system && npm install && npm run dev
```

### Workflow 2: Design Handoff
```bash
# Extract for designer review
node bin/ds extract --url https://example.com
node bin/ds normalize --input tokens-raw.json
node bin/ds figma --input tokens-normalized.json

# Share figma-plugin/ folder with designer
```

### Workflow 3: Multi-Framework Support
```bash
# Extract once
node bin/ds extract --url https://example.com
node bin/ds normalize --input tokens-raw.json

# Generate for React
node bin/ds codegen --input tokens-normalized.json --framework react-tailwind --out react-app

# Generate for Vue
node bin/ds codegen --input tokens-normalized.json --framework vue-tailwind --out vue-app

# Generate for Angular
node bin/ds codegen --input tokens-normalized.json --framework angular-scss --out angular-app
```

---

## Next Features (Coming Soon)

- [ ] HAR file import for functional cloning
- [ ] Chrome DevTools Protocol (CDP) browser connection
- [ ] Component screenshot generation
- [ ] Visual diff comparison
- [ ] Figma API direct import
- [ ] Storybook generation
- [ ] Theme switcher generation
- [ ] Dark mode extraction
- [ ] Animation/transition extraction
- [ ] SVG optimization
