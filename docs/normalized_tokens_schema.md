# Normalized Design Tokens Schema

**Version:** 1.0.0
**Format:** JSON
**Purpose:** Standardized design token representation for cross-framework code generation

## Overview

The `tokens-normalized.json` file represents design tokens in a house system format compatible with Tailwind CSS, Material-UI, and other design frameworks. This schema serves as the "contract" between extraction, normalization, and code generation stages.

---

## Top-Level Structure

```jsonc
{
  "meta": { /* Metadata about the normalization process */ },
  "colors": { /* Color scales with semantic roles */ },
  "typography": { /* Font families, sizes, weights, line heights */ },
  "spacing": { /* Spacing scale (margins, padding) */ },
  "borderRadius": { /* Border radius values */ },
  "boxShadow": { /* Shadow definitions */ },
  "screens": { /* Responsive breakpoints */ }
}
```

---

## Meta Section

**Type:** `object`

Metadata about the source and normalization process.

```jsonc
{
  "meta": {
    "source": "https://labs.google/aifuturesfund/",  // Original URL
    "system": "house-system",                        // Target system name
    "normalizedAt": "2025-11-19T09:43:07.881Z"       // ISO 8601 timestamp
  }
}
```

**Fields:**
- `source` (string, required): URL of the original design system
- `system` (string, required): Target design system identifier (typically "house-system")
- `normalizedAt` (string, required): ISO 8601 timestamp of normalization

---

## Colors Section

**Type:** `object<string, ColorScale>`

Semantic color scales organized by role. Each role contains shades from 50 (lightest) to 950 (darkest).

```jsonc
{
  "colors": {
    "primary": {
      "50": "#e3f2fd",
      "100": "#bbdefb",
      "500": "#2196f3",    // DEFAULT shade
      "900": "#0d47a1",
      "DEFAULT": "#2196f3"  // Fallback for unsuffixed usage
    },
    "gray": { /* neutral colors */ },
    "error": { /* error/danger states */ },
    "warning": { /* warning states */ },
    "success": { /* success states */ },
    "info": { /* informational states */ }
  }
}
```

### ColorScale Type

```typescript
interface ColorScale {
  50?: string;     // Lightest tint
  100?: string;
  200?: string;
  300?: string;
  400?: string;
  500?: string;    // Mid-tone (typically the "DEFAULT")
  600?: string;
  700?: string;
  800?: string;
  900?: string;
  950?: string;    // Darkest shade
  DEFAULT?: string; // Fallback color
}
```

**Semantic Roles:**
- `primary`: Primary brand color
- `secondary`: Secondary brand color
- `surface`: Background and surface colors
- `error`: Error states, destructive actions
- `warning`: Warning states, caution
- `info`: Informational states
- `success`: Success states, confirmations
- `gray` / `neutral`: Neutral colors for text, borders, backgrounds

**Color Format:** Hex (#RRGGBB), RGB (rgb(r, g, b)), or HSL (hsl(h, s%, l%))

---

## Typography Section

**Type:** `object`

Font families, sizes, weights, line heights, and optional letter spacing.

```jsonc
{
  "typography": {
    "fontFamily": {
      "sans": ["Inter", "system-ui", "sans-serif"],
      "serif": ["Georgia", "serif"],
      "mono": ["Fira Code", "monospace"]
    },
    "fontSize": {
      "xs": ["0.75rem", { "lineHeight": "1rem" }],
      "sm": ["0.875rem", { "lineHeight": "1.25rem" }],
      "base": ["1rem", { "lineHeight": "1.5rem" }],
      "lg": ["1.125rem", { "lineHeight": "1.75rem" }],
      "xl": ["1.25rem", { "lineHeight": "1.75rem" }],
      "2xl": ["1.5rem", { "lineHeight": "2rem" }]
    },
    "fontWeight": {
      "normal": "400",
      "medium": "500",
      "semibold": "600",
      "bold": "700"
    },
    "lineHeight": {
      "none": "1",
      "tight": "1.25",
      "snug": "1.375",
      "normal": "1.5",
      "relaxed": "1.625",
      "loose": "2"
    }
  }
}
```

**fontFamily:**
- Keys: `sans`, `serif`, `mono`, `display` (custom keys allowed)
- Values: Array of font family names with fallbacks

**fontSize:**
- Keys: Size names (`xs`, `sm`, `base`, `lg`, `xl`, `2xl`, etc.)
- Values: Either string (`"1rem"`) or tuple (`["1rem", { "lineHeight": "1.5rem" }]`)

**fontWeight:**
- Keys: Weight names (`thin`, `normal`, `medium`, `semibold`, `bold`, `black`)
- Values: String numbers (`"100"` to `"900"`)

**lineHeight:**
- Keys: Line height names (`none`, `tight`, `normal`, `loose`, etc.)
- Values: String numbers (unitless multipliers or specific units)

---

## Spacing Section

**Type:** `object<string, string>`

Spacing scale for margins, padding, gaps, and positioning.

```jsonc
{
  "spacing": {
    "0": "0",
    "1": "0.25rem",   // 4px
    "2": "0.5rem",    // 8px
    "4": "1rem",      // 16px
    "8": "2rem",      // 32px
    "16": "4rem"      // 64px
  }
}
```

**Keys:** Numeric or semantic (e.g., `"0"`, `"1"`, `"2"`, `"px"`)
**Values:** CSS length values (`px`, `rem`, `em`)

**Standard Scale:** Based on 4px/0.25rem base unit (Tailwind-compatible)

---

## Border Radius Section

**Type:** `object<string, string>`

Border radius values for rounded corners.

```jsonc
{
  "borderRadius": {
    "none": "0",
    "sm": "0.125rem",   // 2px
    "DEFAULT": "0.25rem", // 4px
    "md": "0.375rem",   // 6px
    "lg": "0.5rem",     // 8px
    "xl": "0.75rem",    // 12px
    "2xl": "1rem",      // 16px
    "full": "9999px"    // Pill shape
  }
}
```

**Keys:** Size names (`none`, `sm`, `DEFAULT`, `lg`, `full`, etc.)
**Values:** CSS length values

---

## Box Shadow Section

**Type:** `object<string, string>`

Shadow definitions for elevation and depth.

```jsonc
{
  "boxShadow": {
    "none": "none",
    "sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    "DEFAULT": "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
    "md": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    "lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    "xl": "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
  }
}
```

**Keys:** Elevation names (`none`, `sm`, `DEFAULT`, `lg`, `xl`)
**Values:** CSS box-shadow values (can include multiple shadows)

---

## Screens (Breakpoints) Section

**Type:** `object<string, string>`

Responsive breakpoints for media queries.

```jsonc
{
  "screens": {
    "sm": "640px",   // Small devices
    "md": "768px",   // Medium devices (tablets)
    "lg": "1024px",  // Large devices (desktops)
    "xl": "1280px",  // Extra large devices
    "2xl": "1536px"  // 2X extra large devices
  }
}
```

**Keys:** Breakpoint names (`sm`, `md`, `lg`, `xl`, `2xl`, etc.)
**Values:** CSS pixel values (e.g., `"768px"`)

**Mobile-First:** Breakpoints define minimum widths for media queries

---

## Usage with Code Generation

### Tailwind CSS

The normalized schema maps directly to `tailwind.config.ts`:

```typescript
import tokens from './tokens-normalized.json';

export default {
  theme: {
    extend: {
      colors: tokens.colors,
      fontFamily: tokens.typography.fontFamily,
      fontSize: tokens.typography.fontSize,
      spacing: tokens.spacing,
      borderRadius: tokens.borderRadius,
      boxShadow: tokens.boxShadow,
      screens: tokens.screens,
    },
  },
};
```

### Material-UI

Convert to MUI theme structure:

```typescript
import tokens from './tokens-normalized.json';

const theme = createTheme({
  palette: {
    primary: {
      main: tokens.colors.primary?.['500'] || '#2196f3',
      light: tokens.colors.primary?.['300'],
      dark: tokens.colors.primary?.['700'],
    },
    // ...more palette config
  },
  typography: {
    fontFamily: tokens.typography.fontFamily.sans?.join(', '),
    // ...fontSize mappings
  },
  spacing: 8, // Base unit from spacing scale
  // ...more theme config
});
```

---

## Validation Rules

1. **Required Top-Level Fields:** `meta`, `colors`, `typography`, `spacing`
2. **Meta Required Fields:** `source`, `system`, `normalizedAt`
3. **Color Values:** Must be valid CSS colors (hex, rgb, hsl)
4. **Spacing/BorderRadius Values:** Must be valid CSS length values
5. **Screens Values:** Must be pixel values (e.g., `"768px"`)
6. **FontFamily Arrays:** Must contain at least one font family string

---

## Known Limitations

1. **Color Naming:** Currently may include raw RGB values (e.g., `"rgb(0, 0, 0)"`) as keys instead of semantic names. This is a normalization improvement area.
2. **Incomplete Scales:** Not all color roles may have full 50-950 scales
3. **Typography Extraction:** Limited to visible heading and body text styles
4. **Custom Properties:** Framework-specific tokens (e.g., Material Design elevation) may be missing

---

## Example: Complete Normalized Tokens

```json
{
  "meta": {
    "source": "https://labs.google/aifuturesfund/",
    "system": "house-system",
    "normalizedAt": "2025-11-19T09:43:07.881Z"
  },
  "colors": {
    "primary": {
      "500": "rgb(0, 122, 255)",
      "DEFAULT": "rgb(0, 122, 255)"
    },
    "gray": {
      "500": "rgb(128, 128, 128)",
      "DEFAULT": "rgb(128, 128, 128)"
    }
  },
  "typography": {
    "fontFamily": {
      "sans": ["Google Sans", "Helvetica", "Arial", "sans-serif"],
      "mono": ["Space Mono", "monospace"]
    },
    "fontSize": {
      "h2": ["21px", { "lineHeight": "normal" }],
      "h3": ["21px", { "lineHeight": "normal" }],
      "h4": ["29px", { "lineHeight": "normal" }],
      "body": ["10px", { "lineHeight": "normal" }]
    },
    "fontWeight": {
      "h2": "400",
      "h3": "500",
      "h4": "500",
      "body": "400"
    },
    "lineHeight": {
      "h2": "normal",
      "h3": "normal",
      "h4": "normal",
      "body": "normal"
    }
  },
  "spacing": {
    "0": "0",
    "2": "0.5rem",
    "4": "1rem",
    "8": "2rem"
  },
  "borderRadius": {
    "none": "0",
    "sm": "20px",
    "DEFAULT": "50px",
    "lg": "114px"
  },
  "boxShadow": {
    "none": "none"
  },
  "screens": {
    "sm": "767px",
    "md": "768px",
    "lg": "1023px",
    "xl": "1024px",
    "2xl": "1920px"
  }
}
```

---

## Agent Integration

When consuming `tokens-normalized.json` in LLM workflows:

1. **Read Schema First:** Understand the structure before making assumptions
2. **Validate Presence:** Check if expected fields exist (not all sections may be complete)
3. **Handle Missing Values:** Provide sensible defaults for missing color shades or typography values
4. **Respect Semantic Roles:** Use `primary` for brand colors, `error` for destructive actions, etc.
5. **Mobile-First Breakpoints:** Remember that `screens` define minimum widths, not maximum

---

## Related Documentation

- [Asset Context Schema](./asset_context_schema.md) - Schema for `assets.json`
- [Design System Interpreter Prompt](../prompts/design_system_interpreter.md) - LLM prompt for understanding tokens
- [Token Mapping Configuration](../examples/token-mapping.example.json) - Customizing normalization behavior

---

**Last Updated:** 2025-11-19
**Maintained By:** Design System CLI (`ds`)
