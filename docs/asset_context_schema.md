# Asset Context Schema

**Version:** 1.0.0
**Format:** JSON
**Purpose:** Structured asset metadata for LLM-driven image recreation and design system completeness

## Overview

The `assets.json` file contains metadata about all visual assets (images, videos, icons, illustrations) extracted from a design system. This schema serves as **JSON context for LLM image generation**, enabling agents to recreate visuals with proper understanding of their role, dimensions, and styling.

**Key Design Decision:** Assets are separated from design tokens to enable independent workflows for image generation without polluting the token namespace.

---

## Top-Level Structure

```jsonc
{
  "page": "https://labs.google/aifuturesfund/",
  "capturedAt": "2025-11-19T10:15:30.123Z",
  "assets": [
    { /* Asset 1 */ },
    { /* Asset 2 */ },
    // ...
  ]
}
```

---

## AssetContext Type

**Type:** `object`

Root container for all extracted assets.

```typescript
interface AssetContext {
  page: string;           // Source URL
  capturedAt: string;     // ISO 8601 timestamp
  assets: Asset[];        // Array of asset objects
}
```

**Fields:**
- `page` (string, required): Original URL where assets were extracted
- `capturedAt` (string, required): ISO 8601 timestamp of extraction
- `assets` (Array<Asset>, required): Array of asset metadata objects

---

## Asset Type

**Type:** `object`

Individual asset with classification, dimensions, and styling metadata.

```typescript
interface Asset {
  id: string;                    // Unique identifier
  type: AssetType;               // Asset classification
  role?: AssetRole;              // Semantic role in design
  src: string;                   // URL or inline SVG
  alt?: string;                  // Alt text (for images)
  aspectRatio?: string;          // e.g., "16:9", "1:1"
  dominantColors?: string[];     // Array of CSS colors
  dimensions?: {
    width: number;
    height: number;
  };
}
```

### Asset Fields

#### `id` (string, required)

Unique identifier for the asset within the extraction context.

**Format:** `{type}-{counter}`

**Examples:**
- `img-1`, `img-2`, `img-3`
- `video-1`
- `svg-1`, `svg-2`
- `bg-1`, `bg-2`

#### `type` (AssetType, required)

Classification of the asset type.

```typescript
type AssetType = 'image' | 'video' | 'icon' | 'logo' | 'illustration' | 'animation';
```

**Values:**
- `image`: Raster images (JPEG, PNG, WebP, GIF)
- `video`: Video elements (MP4, WebM, etc.)
- `icon`: Small SVG graphics (<100px width/height)
- `logo`: Brand logos (detected or manually classified)
- `illustration`: Large SVG graphics (≥100px width/height)
- `animation`: Animated content (GIF, Lottie, animated SVG)

**Detection Logic:**
- `icon` vs `illustration`: SVG with width/height <100px = icon, else illustration
- `image` vs `logo`: Manual classification (logo detection not yet implemented)

#### `role` (AssetRole, optional)

Semantic role of the asset in the design system.

```typescript
type AssetRole = 'hero' | 'thumbnail' | 'avatar' | 'background' | 'decoration' | 'content';
```

**Values:**
- `hero`: Primary hero image at top of page (large, prominent)
- `thumbnail`: Preview/thumbnail image in lists or cards
- `avatar`: User profile picture or avatar
- `background`: Background image (from CSS `background-image`)
- `decoration`: Decorative graphics, icons, dividers
- `content`: Inline content images within articles or sections

**Detection Logic:**
- Class name contains `hero` or parent contains `hero` → `hero`
- Class name contains `avatar` or parent contains `avatar` → `avatar`
- Class name contains `thumb` or parent contains `thumb` → `thumbnail`
- Class name contains `background` or parent contains `background` → `background`
- Element is `<svg>` → `decoration`
- Default → `content`

#### `src` (string, required)

Source URL or inline SVG content.

**For External Assets (images, videos):**
- Absolute URL: `https://example.com/assets/hero.jpg`
- Relative URL: `/assets/hero.jpg`
- Data URLs excluded: `data:image/png;base64,...` (not extracted)

**For Inline SVG:**
- Truncated SVG markup (max 500 characters): `<svg viewBox="0 0 24 24"><path d="M..." /></svg>`

**Examples:**
```json
{
  "src": "https://labs.google/aifuturesfund/assets/hero-main.webp"
}
```

```json
{
  "src": "<svg viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z\"/></svg>"
}
```

#### `alt` (string, optional)

Alt text from `<img>` tags. Used for accessibility and semantic understanding.

**Only Present For:** `<img>` elements with `alt` attribute
**Excluded For:** SVG, video, background images

**Examples:**
```json
{
  "alt": "Google AI Futures Fund hero illustration"
}
```

#### `aspectRatio` (string, optional)

Calculated aspect ratio in simplified fraction form.

**Format:** `{width}:{height}` (simplified using GCD)

**Examples:**
- `16:9` (common video/hero images)
- `4:3` (traditional photo ratio)
- `1:1` (square images, avatars)
- `3:2` (photography standard)
- `21:9` (ultrawide)

**Calculation:**
```typescript
function getAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}
```

#### `dominantColors` (string[], optional)

Array of dominant colors extracted from the asset or its surrounding context.

**Format:** CSS color values (hex, rgb, hsl)

**Sources:**
1. For images: Background color of image element
2. For SVG: Computed background color
3. For background images: Parent element's computed background color

**Note:** Current implementation extracts background colors, not pixel-sampled dominant colors. Future enhancement could use canvas-based color quantization.

**Examples:**
```json
{
  "dominantColors": ["rgb(4, 6, 19)", "rgb(81, 246, 163)", "rgb(254, 254, 254)"]
}
```

#### `dimensions` (object, optional)

Exact pixel dimensions of the asset.

```typescript
interface Dimensions {
  width: number;    // Width in pixels
  height: number;   // Height in pixels
}
```

**For Images:** `naturalWidth` and `naturalHeight` (intrinsic dimensions)
**For Video:** `videoWidth` and `videoHeight`
**For SVG:** `clientWidth` and `clientHeight` (rendered dimensions)

**Examples:**
```json
{
  "dimensions": {
    "width": 1920,
    "height": 1080
  }
}
```

---

## Complete Asset Examples

### Hero Image

```json
{
  "id": "img-1",
  "type": "image",
  "role": "hero",
  "src": "https://labs.google/aifuturesfund/assets/hero-main.webp",
  "alt": "AI Futures Fund hero illustration",
  "aspectRatio": "16:9",
  "dominantColors": ["rgb(4, 6, 19)", "rgb(72, 240, 139)"],
  "dimensions": {
    "width": 1920,
    "height": 1080
  }
}
```

### SVG Icon

```json
{
  "id": "svg-3",
  "type": "icon",
  "role": "decoration",
  "src": "<svg viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z\"/></svg>",
  "aspectRatio": "1:1",
  "dimensions": {
    "width": 24,
    "height": 24
  }
}
```

### Background Image

```json
{
  "id": "bg-2",
  "type": "image",
  "role": "background",
  "src": "https://labs.google/aifuturesfund/assets/pattern-bg.png",
  "dominantColors": ["rgb(171, 169, 169)"]
}
```

### Video Element

```json
{
  "id": "video-1",
  "type": "video",
  "role": "content",
  "src": "https://labs.google/aifuturesfund/videos/demo.mp4",
  "aspectRatio": "16:9",
  "dimensions": {
    "width": 1280,
    "height": 720
  }
}
```

---

## Usage with LLM Image Generation

### Workflow Pattern

1. **Extract Assets:** `ds extract --url <url> --assets-out assets.json`
2. **Load Asset Context:** Read `assets.json` into LLM context
3. **Generate Prompts:** Use [Asset Recreation Template](../prompts/asset_recreation_template.md)
4. **Call Image Model:** Pass structured prompts to fal.ai, Midjourney, DALL-E, etc.
5. **Replace Assets:** Update design system with generated images

### Prompt Generation Example

```typescript
import assets from './assets.json';

const heroAsset = assets.assets.find(a => a.role === 'hero');

const prompt = {
  target_model: "fal-ai/flux/dev",
  prompt: `Create a ${heroAsset.aspectRatio} hero illustration for a tech website.
           Dominant colors: ${heroAsset.dominantColors?.join(', ')}.
           Style: Modern, clean, abstract technology theme.
           NO logos, NO trademarks, brand-agnostic design.`,
  negative_prompt: "logos, trademarks, text, realistic faces, specific brands",
  guidance: {
    aspect_ratio: heroAsset.aspectRatio,
    style: "abstract-tech",
    color_palette: heroAsset.dominantColors
  }
};
```

---

## Constraints & Guidelines

### Logo/Trademark Exclusion

**Constraint:** Do NOT recreate logos, trademarks, or brand-specific imagery.

**Implementation:** Future enhancement to detect and flag logos:
```typescript
const isLogo = (asset: Asset): boolean => {
  return asset.type === 'logo' ||
         asset.role === 'logo' ||
         /logo|brand|trademark/i.test(asset.alt || '') ||
         /logo|brand/i.test(asset.src);
};
```

**Action:** Filter out detected logos before prompt generation:
```typescript
const nonLogoAssets = assets.assets.filter(a => !isLogo(a));
```

### Brand-Agnostic Recreation

When generating prompts from asset context:
1. ✅ DO: Use aspect ratios, color palettes, general style
2. ✅ DO: Describe role ("hero image", "avatar", "illustration")
3. ❌ DON'T: Copy specific visual elements that identify brands
4. ❌ DON'T: Include text, logos, or trademarked imagery
5. ❌ DON'T: Recreate specific people's faces or identifiable imagery

---

## Validation Rules

1. **Required Fields:** `page`, `capturedAt`, `assets`
2. **Asset Required Fields:** `id`, `type`, `src`
3. **Valid Asset Types:** Must be one of: `image`, `video`, `icon`, `logo`, `illustration`, `animation`
4. **Valid Roles:** Must be one of: `hero`, `thumbnail`, `avatar`, `background`, `decoration`, `content`
5. **Aspect Ratio Format:** Must match `{number}:{number}` (e.g., `"16:9"`)
6. **Dimensions:** If present, both `width` and `height` must be positive integers
7. **Color Format:** CSS color values (hex, rgb, rgba, hsl, hsla)

---

## Known Limitations

1. **Dominant Colors:** Currently extracts background colors, not pixel-sampled dominant colors
2. **Logo Detection:** No automatic logo/trademark detection (manual filtering required)
3. **SVG Truncation:** Inline SVG truncated to 500 characters (may lose detail)
4. **Data URLs:** Data URLs (base64-encoded images) are excluded
5. **Lazy-Loaded Assets:** May miss assets not visible after initial page load + 2s wait

---

## Example: Complete Asset Context

```json
{
  "page": "https://labs.google/aifuturesfund/",
  "capturedAt": "2025-11-19T10:15:30.123Z",
  "assets": [
    {
      "id": "img-1",
      "type": "image",
      "role": "hero",
      "src": "https://labs.google/aifuturesfund/assets/hero-main.webp",
      "alt": "Google AI Futures Fund hero illustration",
      "aspectRatio": "16:9",
      "dominantColors": ["rgb(4, 6, 19)", "rgb(72, 240, 139)", "rgb(254, 254, 254)"],
      "dimensions": {
        "width": 1920,
        "height": 1080
      }
    },
    {
      "id": "svg-1",
      "type": "icon",
      "role": "decoration",
      "src": "<svg viewBox=\"0 0 24 24\"><path d=\"M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z\"/></svg>",
      "aspectRatio": "1:1",
      "dimensions": {
        "width": 24,
        "height": 24
      }
    },
    {
      "id": "bg-1",
      "type": "image",
      "role": "background",
      "src": "https://labs.google/aifuturesfund/assets/pattern-bg.png",
      "dominantColors": ["rgb(171, 169, 169)"]
    }
  ]
}
```

---

## Agent Integration

When consuming `assets.json` in LLM workflows:

1. **Filter by Role:** Extract specific asset types (heroes, thumbnails, etc.)
2. **Respect Constraints:** Exclude logos/trademarks from recreation
3. **Use Semantic Context:** Leverage `role` and `alt` for prompt generation
4. **Preserve Dimensions:** Maintain aspect ratios for faithful recreation
5. **Color Harmony:** Use `dominantColors` for consistent color palettes
6. **Handle Missing Fields:** Not all assets have all optional fields (check presence)

---

## Related Documentation

- [Normalized Tokens Schema](./normalized_tokens_schema.md) - Schema for `tokens-normalized.json`
- [Asset Recreation Template](../prompts/asset_recreation_template.md) - LLM prompt template for image generation
- [Design System Interpreter Prompt](../prompts/design_system_interpreter.md) - Understanding design tokens

---

**Last Updated:** 2025-11-19
**Maintained By:** Design System CLI (`ds`)
