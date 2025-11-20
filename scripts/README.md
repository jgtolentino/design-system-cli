# Asset Generation Scripts

Scripts for enhancing prompts and generating images from extracted visual assets.

## 1️⃣ Enhance Prompts

Replace TODO placeholders with descriptive prompts:

```bash
# Interactive enhancement for a single asset
node scripts/enhance-prompt.js --prompts google-ai-prompts.json --id img-1

# Manual enhancement (edit the JSON directly)
# Find items with "TODO" and replace with specific descriptions
```

### Example Enhancement

**Before:**
```json
{
  "id": "img-1",
  "prompt": "TODO: describe content for https://labs.google/aifuturesfund/",
  "guidance": {
    "aspect_ratio": "1:1",
    "role": "content"
  }
}
```

**After:**
```json
{
  "id": "img-1",
  "prompt": "Modern abstract illustration showing AI neural network connections, purple and blue gradient, minimalist flat design, clean geometric shapes, professional quality",
  "guidance": {
    "aspect_ratio": "1:1",
    "role": "content"
  }
}
```

## 2️⃣ Generate Images (Gemini)

Use Google AI Studio's Imagen API to generate images:

```bash
# Set API key (already in ~/.zshrc)
export GOOGLE_AI_STUDIO_KEY=AIzaSyANWwk2ScfDdif2UmhRpSBYZVFhyugF1zE

# Generate all enhanced prompts
node scripts/generate-assets-gemini.js \
  --prompts google-ai-prompts.json \
  --out generated-assets/google-ai

# Generate limited set (for testing)
node scripts/generate-assets-gemini.js \
  --prompts google-ai-prompts.json \
  --out generated-assets/google-ai \
  --limit 5
```

### Output

```
generated-assets/google-ai/
├── img-1.png
├── img-2.png
├── img-3.png
├── ...
└── generation-results.json  # Metadata and success/failure log
```

## 3️⃣ Alternative: OpenAI DALL-E

If you prefer OpenAI's DALL-E 3:

```bash
# Use OpenAI API key (already in ~/.zshrc)
export OPENAI_API_KEY=sk-proj-...

# Create similar script for DALL-E
node scripts/generate-assets-dalle.js \
  --prompts google-ai-prompts.json \
  --out generated-assets/google-ai \
  --model dall-e-3
```

## Workflow

1. **Extract assets**: `ds pipeline --url <url> --assets-out assets.json`
2. **Generate prompts**: `ds assets-prompts --assets assets.json --out prompts.json`
3. **Enhance prompts**: Use `enhance-prompt.js` or edit JSON manually
4. **Generate images**: Use `generate-assets-gemini.js` or your preferred AI service
5. **Update components**: Replace image sources with generated assets

## Tips

### Prompt Enhancement

- **Be specific**: Describe colors, style, composition
- **Include keywords**: "professional", "modern", "clean", "minimal"
- **Match aspect ratio**: Mention the aspect ratio in the prompt
- **Consider role**: Hero images need more detail than decorative elements

### Generation Best Practices

- **Test first**: Generate 1-2 images before batch processing
- **Rate limits**: Scripts include 1-second delays between requests
- **Skip TODOs**: Scripts automatically skip unenhanced prompts
- **Review results**: Check `generation-results.json` for failures

### Cost Management

- **Gemini Imagen**: ~$0.02-$0.04 per image
- **DALL-E 3**: ~$0.04 per image (1024x1024)
- **Batch wisely**: Test with `--limit 5` before full generation

---

# Visual Regression Testing

Independent snapshot and comparison tools designed for n8n workflow automation.

## Tools

1. **`snapshot.js`** - Captures screenshots of websites at multiple viewports
2. **`compare.js`** - Compares two sets of screenshots and generates diff reports

Both tools output JSON for n8n automation integration.

## Quick Start

### 1. Snapshot Original Website

```bash
node scripts/snapshot.js \
  --url https://labs.google/aifuturesfund/ \
  --out snapshots/original
```

### 2. Snapshot Generated Design System

```bash
# Start your generated design system first
cd design-system && npm run dev

# In another terminal
node scripts/snapshot.js \
  --url http://localhost:3000 \
  --out snapshots/generated
```

### 3. Compare Snapshots

```bash
node scripts/compare.js \
  --original-dir snapshots/original \
  --generated-dir snapshots/generated \
  --out comparison-results
```

### 4. View Results

```bash
open comparison-results/report.html
```

## Snapshot Tool

### Usage

```bash
node scripts/snapshot.js --url <url> --out <dir>
```

### Options

- `--url <url>` - Website URL to snapshot (required)
- `--out <dir>` - Output directory (default: `./snapshots`)
- `--viewports <json>` - Custom viewports JSON (optional)

### Default Viewports

- **mobile**: 375x812 (iPhone 13)
- **tablet**: 768x1024 (iPad)
- **desktop**: 1440x900
- **desktop-xl**: 1920x1080

### Output

```
snapshots/
├── mobile.png
├── tablet.png
├── desktop.png
├── desktop-xl.png
└── metadata.json
```

### JSON Output (for n8n)

```json
{
  "success": true,
  "url": "https://example.com",
  "outputDir": "snapshots/original",
  "snapshotCount": 4,
  "metadata": "snapshots/original/metadata.json",
  "snapshots": [...]
}
```

## Comparison Tool

### Usage

```bash
node scripts/compare.js \
  --original-dir <dir> \
  --generated-dir <dir> \
  --out <dir>
```

### Options

- `--original-dir <dir>` - Original snapshots directory (required)
- `--generated-dir <dir>` - Generated snapshots directory (required)
- `--out <dir>` - Output directory (default: `./comparison-results`)
- `--threshold <float>` - Pixelmatch threshold 0-1 (default: 0.1)
- `--pass-threshold <float>` - Pass percentage 0-100 (default: 95)

### Output

```
comparison-results/
├── diff/
│   ├── mobile.png
│   ├── tablet.png
│   ├── desktop.png
│   └── desktop-xl.png
├── report.json
└── report.html
```

### JSON Output (for n8n)

```json
{
  "success": true,
  "passed": true,
  "summary": {
    "total": 4,
    "passed": 4,
    "failed": 0,
    "averageSimilarity": 97.5
  },
  "reportPath": "comparison-results/report.json",
  "htmlReportPath": "comparison-results/report.html",
  "results": [...]
}
```

## n8n Workflow Integration

### Workflow Structure

```
[Trigger: Website Changed]
    ↓
[Execute: Snapshot Original]
    ↓
[Execute: Generate Design System]
    ↓
[Execute: Snapshot Generated]
    ↓
[Execute: Compare]
    ↓
[Conditional: Tests Passed?]
    ├─ Yes → [Notify Success]
    └─ No  → [Notify Failure + Report Link]
```

### Parse JSON Output in n8n

Add a Code node after each script execution:

```javascript
const output = $input.item.json.stdout;
const jsonMatch = output.match(/JSON_OUTPUT_START\s*({[\s\S]*?})\s*JSON_OUTPUT_END/);
if (jsonMatch) {
  return JSON.parse(jsonMatch[1]);
}
throw new Error('No JSON output found');
```

### Check Test Results

Add an IF node:

```javascript
// Condition
{{ $json.passed }} === true
```

## Configuration

### Custom Viewports

Create a JSON file:

```json
[
  { "name": "iphone-se", "width": 375, "height": 667 },
  { "name": "iphone-13", "width": 390, "height": 844 },
  { "name": "ipad-pro", "width": 1024, "height": 1366 }
]
```

Use with snapshot tool:

```bash
node scripts/snapshot.js \
  --url https://example.com \
  --viewports '[{"name":"iphone-se","width":375,"height":667}]' \
  --out snapshots/original
```

### Comparison Thresholds

**Pixelmatch Threshold** (`--threshold`):
- Controls pixel-level sensitivity (0-1)
- Lower = more sensitive to differences
- Default: 0.1

**Pass Threshold** (`--pass-threshold`):
- Required similarity percentage (0-100)
- Higher = stricter requirements
- Default: 95% (95% similar required to pass)

## Best Practices

### 1. Version Control

Add to `.gitignore`:
```
snapshots/
comparison-results/
visual-regression-results/
```

### 2. Progressive Enhancement

Start with loose thresholds, tighten over time:

```bash
# Initial testing (90% similarity)
node scripts/compare.js --pass-threshold 90 ...

# Production-ready (95% similarity)
node scripts/compare.js --pass-threshold 95 ...
```

### 3. Baseline Management

Store baseline snapshots:
- Commit to `tests/visual-baseline/` for version control
- Or store in cloud storage (S3, DO Spaces) for large teams

## Troubleshooting

### Issue: Screenshots differ due to dynamic content

**Solution:** Add wait times or hide dynamic elements

### Issue: Font rendering differences

**Solution:** Tool already waits for fonts to load (`document.fonts.ready`)

### Issue: False positives from animations

**Solution:** Increase wait time in `snapshot.js` (line 52):

```javascript
await page.waitForTimeout(5000); // 5 seconds instead of 2
```

### Issue: Color profile differences

**Solution:** Increase threshold:

```bash
node scripts/compare.js --threshold 0.2 # More lenient
```

## Reference

- [Ant Design Visual Regression](https://ant.design/docs/blog/visual-regression/)
- [Playwright Screenshot API](https://playwright.dev/docs/api/class-page#page-screenshot)
- [pixelmatch](https://github.com/mapbox/pixelmatch)
- [pngjs](https://github.com/lukeapage/pngjs)
