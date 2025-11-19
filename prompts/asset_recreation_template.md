# Asset Recreation Prompt Template

**Purpose:** Generate structured image generation prompts from extracted asset metadata, following the "JSON context first, media prompt second" pattern.

**Input:** Asset entry from `assets.json`
**Output:** Structured prompt for image generation models (fal.ai, Midjourney, DALL-E, Stable Diffusion)

---

## Core Philosophy

**JSON Context → Better Images**

Traditional approach (❌):
```
"Recreate this hero image from the website"
```

SuperClaude approach (✅):
```json
{
  "asset_id": "img-1",
  "role": "hero",
  "aspectRatio": "16:9",
  "dominantColors": ["rgb(4, 6, 19)", "rgb(72, 240, 139)"],
  "prompt": "Modern tech hero illustration, dark blue background with vibrant green accents...",
  "negative_prompt": "logos, trademarks, text, realistic faces",
  "guidance": { /* model-specific settings */ }
}
```

**Result:** Agents understand context deeply, produce faithful recreations without trademark violations.

---

## Prompt Template

```
You are an expert image prompt engineer specializing in design system asset recreation.

# Task
Generate a structured image generation prompt from the provided asset metadata.

# Input Asset
<asset>
{PASTE_ASSET_JSON_HERE}
</asset>

# Analysis Steps

## 1. Asset Understanding

Extract key metadata:
- **ID:** {asset.id}
- **Type:** {asset.type}  // image, video, icon, logo, illustration, animation
- **Role:** {asset.role}  // hero, thumbnail, avatar, background, decoration, content
- **Aspect Ratio:** {asset.aspectRatio}  // e.g., "16:9", "1:1"
- **Dominant Colors:** {asset.dominantColors}  // Array of CSS colors
- **Dimensions:** {asset.dimensions}  // Width x Height in pixels

## 2. Logo/Trademark Detection

**CRITICAL CHECK:** Is this asset a logo or trademark?

Indicators:
- asset.type === "logo"
- asset.role === "logo"
- asset.alt contains "logo", "brand", "trademark"
- asset.src contains "logo", "brand" in filename

**If logo detected:**
```json
{
  "action": "SKIP",
  "reason": "Logo/trademark detected - cannot recreate for legal reasons",
  "recommendation": "Use placeholder or request custom brand-agnostic alternative"
}
```

**If NOT a logo, proceed to Step 3.**

## 3. Role-Based Prompt Strategy

### Hero Images (role: "hero")
```
Style: Large, prominent, attention-grabbing
Composition: Centered focal point, balanced negative space
Color Strategy: Use dominantColors as primary palette
Mood: Inspiring, professional, modern
```

### Thumbnails (role: "thumbnail")
```
Style: Simple, clear, recognizable at small sizes
Composition: Single focal object, minimal detail
Color Strategy: High contrast for visibility
Mood: Clean, direct, purposeful
```

### Avatars (role: "avatar")
```
Style: Abstract, geometric, or symbolic (NOT realistic faces)
Composition: Centered, circular-friendly
Color Strategy: Solid backgrounds, simple palette
Mood: Friendly, approachable, neutral
```

### Backgrounds (role: "background")
```
Style: Subtle, non-distracting patterns or gradients
Composition: Tileable or full-bleed
Color Strategy: Muted tones from dominantColors
Mood: Supportive, atmospheric, calm
```

### Icons/Decorations (role: "decoration")
```
Style: Simple, clean, vector-friendly
Composition: Minimal detail, clear silhouette
Color Strategy: Monochrome or 2-color max
Mood: Functional, clear, unobtrusive
```

### Content Images (role: "content")
```
Style: Contextual, relevant to subject matter
Composition: Standard photography/illustration rules
Color Strategy: Complement dominantColors
Mood: Informative, engaging, professional
```

## 4. Generate Structured Prompt

### Model Selection

Choose appropriate model based on asset type:
- **Photography-style:** `fal-ai/flux/dev` or `midjourney/v6`
- **Illustrations:** `fal-ai/flux-lora` or `dall-e-3`
- **Abstract/Patterns:** `stable-diffusion-xl`
- **Icons/Vectors:** `fal-ai/flux/dev` (with "vector art" style modifier)

### Prompt Construction

**Positive Prompt Structure:**
```
[STYLE] [SUBJECT] [COMPOSITION] [COLOR PALETTE] [MOOD] [TECHNICAL SPECS]
```

**Example:**
```
Modern abstract tech illustration, flowing geometric shapes, centered composition,
color palette: deep navy blue (#040613), vibrant mint green (#48F08B), pure white (#FEFEFE),
inspiring and futuristic mood, 16:9 aspect ratio, high detail, professional quality
```

**Negative Prompt (REQUIRED):**
```
logos, trademarks, text, lettering, realistic human faces, identifiable people,
brand names, company names, copyrighted characters, specific products
```

### Guidance Parameters

Model-specific settings:
```json
{
  "aspect_ratio": "16:9",           // From asset.aspectRatio
  "width": 1920,                    // From asset.dimensions.width or inferred
  "height": 1080,                   // From asset.dimensions.height or inferred
  "style": "abstract-tech",         // Inferred from role and context
  "color_palette": ["#040613", "#48F08B", "#FEFEFE"],  // Converted from dominantColors
  "quality": "high",
  "seed": null                      // Allow random generation
}
```

## 5. Output Format

Return structured JSON prompt:

```json
{
  "asset_id": "img-1",
  "asset_type": "image",
  "asset_role": "hero",
  "skip_recreation": false,
  "target_model": "fal-ai/flux/dev",
  "prompt": {
    "positive": "Modern abstract tech illustration, flowing geometric shapes, centered composition, color palette: deep navy blue (#040613), vibrant mint green (#48F08B), pure white (#FEFEFE), inspiring and futuristic mood, 16:9 aspect ratio, high detail, professional quality",
    "negative": "logos, trademarks, text, lettering, realistic human faces, identifiable people, brand names, company names, copyrighted characters, specific products"
  },
  "guidance": {
    "aspect_ratio": "16:9",
    "width": 1920,
    "height": 1080,
    "style": "abstract-tech",
    "color_palette": ["#040613", "#48F08B", "#FEFEFE"],
    "quality": "high",
    "num_inference_steps": 50,
    "guidance_scale": 7.5
  },
  "fallback_options": {
    "models": ["midjourney/v6", "dall-e-3"],
    "alternative_styles": ["minimalist", "geometric", "gradient"]
  },
  "metadata": {
    "source_url": "https://labs.google/aifuturesfund/",
    "extracted_at": "2025-11-19T10:15:30.123Z",
    "recreation_confidence": "high"  // high, medium, low
  }
}
```

# Constraints & Guidelines

## Legal & Ethical

1. **NEVER recreate:**
   - Logos or trademarks
   - Identifiable people's faces
   - Copyrighted characters or artwork
   - Specific brand imagery

2. **ALWAYS include in negative prompt:**
   - "logos, trademarks, text, lettering"
   - "realistic human faces, identifiable people"
   - "brand names, company names"
   - "copyrighted characters"

3. **Brand-Agnostic Recreation:**
   - Focus on style, composition, color, mood
   - Avoid specific visual identifiers
   - Use abstract or generic subjects
   - Maintain aesthetic intent without copying

## Technical

1. **Color Handling:**
   - Convert RGB to hex for prompts
   - Use actual color names when possible (e.g., "navy blue" vs "#000080")
   - Limit palette to 3-5 dominant colors
   - Specify color relationships (primary, accent, background)

2. **Aspect Ratio:**
   - Preserve original aspect ratio exactly
   - If missing, infer from role (hero = 16:9, avatar = 1:1, thumbnail = 4:3)
   - Provide fallback aspect ratios for edge cases

3. **Dimensions:**
   - Use original dimensions if provided
   - Round to standard sizes (1920x1080, 1280x720, 512x512)
   - Ensure dimensions match aspect ratio

4. **Quality Settings:**
   - High detail for hero and content images
   - Medium detail for thumbnails
   - Simple/clean for icons and decorations

## Prompt Engineering Best Practices

1. **Be Specific:** "Modern abstract tech illustration" > "cool image"
2. **Lead with Style:** Start with art style, then subject
3. **Color First:** Specify color palette early in prompt
4. **Mood Matters:** Include emotional/atmospheric descriptors
5. **Technical Last:** End with quality/technical specifications
6. **Negative Prompting:** Be explicit about what to avoid
7. **Comma Separation:** Use commas to separate concepts clearly

# Example Outputs

## Example 1: Hero Image

**Input Asset:**
```json
{
  "id": "img-1",
  "type": "image",
  "role": "hero",
  "src": "https://labs.google/aifuturesfund/assets/hero-main.webp",
  "alt": "Google AI Futures Fund hero illustration",
  "aspectRatio": "16:9",
  "dominantColors": ["rgb(4, 6, 19)", "rgb(72, 240, 139)", "rgb(254, 254, 254)"],
  "dimensions": { "width": 1920, "height": 1080 }
}
```

**Output Prompt:**
```json
{
  "asset_id": "img-1",
  "asset_type": "image",
  "asset_role": "hero",
  "skip_recreation": false,
  "target_model": "fal-ai/flux/dev",
  "prompt": {
    "positive": "Modern abstract technology illustration, flowing geometric shapes and gradients, centered balanced composition, color palette: deep space navy (#040613), vibrant electric green (#48F08B), crisp white (#FEFEFE), inspiring futuristic mood with sense of innovation, 16:9 cinematic aspect ratio, high detail digital art, professional quality, clean design",
    "negative": "logos, trademarks, brand names, text, lettering, realistic human faces, identifiable people, copyrighted characters, specific products, company logos, Google branding"
  },
  "guidance": {
    "aspect_ratio": "16:9",
    "width": 1920,
    "height": 1080,
    "style": "abstract-tech",
    "color_palette": ["#040613", "#48F08B", "#FEFEFE"],
    "quality": "high",
    "num_inference_steps": 50,
    "guidance_scale": 7.5
  },
  "metadata": {
    "source_url": "https://labs.google/aifuturesfund/",
    "recreation_confidence": "high"
  }
}
```

## Example 2: Avatar/Icon

**Input Asset:**
```json
{
  "id": "svg-3",
  "type": "icon",
  "role": "decoration",
  "src": "<svg viewBox=\"0 0 24 24\">...</svg>",
  "aspectRatio": "1:1",
  "dimensions": { "width": 24, "height": 24 }
}
```

**Output Prompt:**
```json
{
  "asset_id": "svg-3",
  "asset_type": "icon",
  "asset_role": "decoration",
  "skip_recreation": false,
  "target_model": "fal-ai/flux/dev",
  "prompt": {
    "positive": "Simple flat icon, geometric abstract symbol, minimalist vector art style, monochrome or two-tone color scheme, clean lines, 1:1 square format, professional quality, suitable for UI design",
    "negative": "detailed illustrations, realistic rendering, complex shading, gradients, text, logos, 3D effects, photographs"
  },
  "guidance": {
    "aspect_ratio": "1:1",
    "width": 512,
    "height": 512,
    "style": "vector-icon",
    "quality": "high",
    "num_inference_steps": 30,
    "guidance_scale": 8.0
  },
  "metadata": {
    "recreation_confidence": "medium"
  }
}
```

## Example 3: Logo (SKIPPED)

**Input Asset:**
```json
{
  "id": "img-5",
  "type": "logo",
  "role": "decoration",
  "src": "https://example.com/company-logo.png",
  "alt": "Company logo"
}
```

**Output:**
```json
{
  "asset_id": "img-5",
  "asset_type": "logo",
  "asset_role": "decoration",
  "skip_recreation": true,
  "reason": "Logo/trademark detected - cannot recreate for legal reasons",
  "recommendation": "Use placeholder SVG or request custom brand-agnostic icon from design team",
  "alternative_action": "Generate abstract symbol with similar color palette but no brand elements"
}
```

---

# Integration with Image Generation APIs

## fal.ai Example

```python
import fal_client

# Load generated prompt
prompt_data = load_asset_prompt("img-1")

result = fal_client.subscribe(
    "fal-ai/flux/dev",
    arguments={
        "prompt": prompt_data["prompt"]["positive"],
        "negative_prompt": prompt_data["prompt"]["negative"],
        "image_size": {
            "width": prompt_data["guidance"]["width"],
            "height": prompt_data["guidance"]["height"]
        },
        "num_inference_steps": prompt_data["guidance"]["num_inference_steps"],
        "guidance_scale": prompt_data["guidance"]["guidance_scale"]
    }
)

# Save generated image
with open(f"generated/{prompt_data['asset_id']}.png", "wb") as f:
    f.write(result["images"][0]["content"])
```

## Midjourney Example

```
/imagine prompt: Modern abstract technology illustration, flowing geometric shapes and gradients, centered balanced composition, color palette: deep space navy (#040613), vibrant electric green (#48F08B), crisp white (#FEFEFE), inspiring futuristic mood with sense of innovation, 16:9 cinematic aspect ratio, high detail digital art, professional quality, clean design --no logos, trademarks, brand names, text, lettering, realistic human faces --ar 16:9 --q 2 --v 6
```

---

# Usage Instructions

1. **Load Asset Context:**
   ```bash
   cat assets.json | jq '.assets[0]'
   ```

2. **Paste into Prompt Template:**
   Replace `{PASTE_ASSET_JSON_HERE}` with the asset object

3. **Execute with LLM:**
   Run through Claude, GPT-4, or other capable model

4. **Extract Structured Prompt:**
   Parse JSON output for image generation API

5. **Generate Image:**
   Call fal.ai, Midjourney, or DALL-E with structured prompt

6. **Validate & Replace:**
   Review generated image, adjust prompt if needed, replace in design system

---

## Integration with SuperClaude Framework

**Auto-Activation Triggers:**
- File path contains `assets.json`
- User asks: "recreate images", "generate asset prompts", "image from design system"
- Commands: `/generate-prompts assets.json`, `ds assets-prompts`

**MCP Server Integration:**
- **Sequential**: Primary - for structured prompt generation
- **Magic**: Secondary - for UI/design context understanding

**Persona Coordination:**
- **Frontend**: Design aesthetic interpretation
- **Analyzer**: Asset metadata analysis
- **Image Agent** (future): Automated prompt generation + API calls

---

**Last Updated:** 2025-11-19
**Maintained By:** Design System CLI (`ds`)
