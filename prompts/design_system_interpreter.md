# Design System Interpreter Prompt

**Purpose:** Analyze normalized design tokens and provide structured interpretation for code generation and design system understanding.

**Input:** `tokens-normalized.json`
**Output:** Structured analysis with framework mapping, design patterns, and implementation recommendations

---

## Prompt Template

```
You are a design system analyst with expertise in Tailwind CSS, Material-UI, and modern design frameworks.

# Task
Analyze the provided design tokens and generate a comprehensive design system interpretation report.

# Input
<tokens>
{PASTE_TOKENS_NORMALIZED_JSON_HERE}
</tokens>

# Analysis Framework

## 1. Design System Classification

Examine the token structure and classify the design system:
- **Framework Affinity:** Does this resemble Material Design 3, Tailwind, Chakra UI, Ant Design, or a custom system?
- **Confidence Level:** Rate 0-100% based on token patterns, naming conventions, and structure
- **Evidence:** List specific indicators (color scales, typography patterns, spacing system)

## 2. Color System Analysis

Analyze the color tokens:
- **Semantic Roles:** Identify which color scales represent primary, secondary, error, warning, success, info
- **Scale Completeness:** Check if scales have full 50-950 shades or are partial
- **Color Naming Issues:** Note any raw RGB values used as keys (e.g., "rgb(0, 0, 0)")
- **Mapping Recommendations:** Suggest semantic names for unnamed colors

### Output Format:
```json
{
  "colors": {
    "primary": {
      "scale": "partial",  // or "complete"
      "shades": ["500", "DEFAULT"],
      "recommendation": "Add 50-950 scale for full flexibility"
    },
    "issues": [
      "Color 'rgb(0, 0, 0)' should be renamed to 'black' or 'neutral-900'"
    ]
  }
}
```

## 3. Typography System Analysis

Examine typography tokens:
- **Font Families:** Identify sans, serif, mono families and their fallback chains
- **Font Scale:** Check if fontSize follows standard scale (xs, sm, base, lg, xl, etc.)
- **Weight Distribution:** Verify font weights cover common needs (400, 500, 600, 700)
- **Line Height Strategy:** Determine if using unitless multipliers or specific units

### Output Format:
```json
{
  "typography": {
    "strategy": "custom",  // or "material3", "tailwind"
    "fontFamilies": {
      "sans": {
        "primary": "Google Sans",
        "fallbacks": ["Helvetica", "Arial", "sans-serif"],
        "recommendation": "Modern, web-safe font stack"
      }
    },
    "scale": {
      "type": "custom",
      "values": ["h2", "h3", "h4", "body"],
      "recommendation": "Consider adding xs, sm, base, lg, xl for utility-first frameworks"
    }
  }
}
```

## 4. Spacing System Analysis

Evaluate spacing scale:
- **Base Unit:** Identify the base increment (4px, 8px, etc.)
- **Scale Type:** Linear, exponential, or custom progression
- **Tailwind Compatibility:** Does it map to Tailwind's 0.25rem base unit?

### Output Format:
```json
{
  "spacing": {
    "baseUnit": "0.5rem",  // 8px
    "scale": "linear",
    "tailwindCompatible": true,
    "recommendation": "Compatible with Tailwind spacing utilities"
  }
}
```

## 5. Component Patterns

Identify design patterns from the tokens:
- **Border Radius Strategy:** Sharp, soft, or pill-shaped
- **Shadow Elevation:** Material-style elevation levels or custom shadows
- **Breakpoints:** Mobile-first or desktop-first approach

## 6. Framework Mapping

### Tailwind CSS Mapping
Provide exact mapping to Tailwind config structure:
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // Map normalized colors to Tailwind format
        primary: tokens.colors.primary,
        // ...
      },
      fontFamily: {
        sans: tokens.typography.fontFamily.sans,
        // ...
      },
      // Continue mapping...
    }
  }
}
```

### Material-UI Mapping
Provide MUI theme structure:
```typescript
// mui-theme.ts
const theme = createTheme({
  palette: {
    primary: {
      main: tokens.colors.primary?.['500'],
      light: tokens.colors.primary?.['300'],
      dark: tokens.colors.primary?.['700'],
    },
    // ...
  },
  typography: {
    fontFamily: tokens.typography.fontFamily.sans?.join(', '),
    // ...
  },
});
```

## 7. Implementation Recommendations

### High Priority:
- [ ] Issues that break functionality
- [ ] Incomplete color scales missing DEFAULT values
- [ ] Missing critical typography values

### Medium Priority:
- [ ] Color naming improvements (replace RGB keys with semantic names)
- [ ] Add missing font weights for complete range
- [ ] Standardize line height strategy

### Low Priority:
- [ ] Add additional breakpoints for edge cases
- [ ] Expand shadow elevation levels
- [ ] Add custom animation tokens

## 8. Quality Assessment

Rate the design system on:
- **Completeness:** 0-100% (are all necessary tokens present?)
- **Consistency:** 0-100% (do patterns follow conventions?)
- **Framework Compatibility:** 0-100% (how well does it map to target frameworks?)
- **Production Readiness:** 0-100% (ready for use without modifications?)

### Overall Score:
```
Design System Quality: [X]/100

Strengths:
- [List 3 key strengths]

Weaknesses:
- [List 3 key weaknesses]

Critical Blockers:
- [List any issues preventing immediate use]
```

# Output Format

Provide your analysis in structured sections:

1. **Executive Summary** (2-3 sentences)
2. **Framework Classification** (with confidence %)
3. **Color System Analysis** (JSON + recommendations)
4. **Typography Analysis** (JSON + recommendations)
5. **Spacing & Layout** (JSON + recommendations)
6. **Tailwind Mapping** (code snippet)
7. **Material-UI Mapping** (code snippet)
8. **Implementation Roadmap** (prioritized checklist)
9. **Quality Score** (overall rating + strengths/weaknesses)

# Constraints

- DO NOT invent token values not present in the input
- DO call out missing or incomplete data explicitly
- DO provide actionable recommendations with examples
- DO NOT assume framework without evidence
- DO respect the "house-system" designation (this is a normalized format, not the original framework)

# Example Usage

Input: tokens-normalized.json from Google AI Futures Fund
Output: "This design system shows 60% affinity with Material Design 3 based on color naming ('primary', 'surface') and typography patterns. However, it uses a custom spacing scale (0.5rem base unit vs. Material's 8px). Color system is partially complete with only DEFAULT shades for most roles. Recommend adding 50-950 scales for primary and secondary colors to enable full Tailwind utility generation."

---

Begin your analysis now.
```

---

## Usage Instructions

### 1. Prepare Input

Read the normalized tokens file:
```bash
cat tokens-normalized.json
```

### 2. Execute Prompt

Copy the contents of `tokens-normalized.json` and paste into the prompt template where indicated:
```
<tokens>
{PASTE_TOKENS_NORMALIZED_JSON_HERE}
</tokens>
```

### 3. Process Output

The LLM will return structured analysis in sections. Use this to:
- **Validate extraction quality** - Check if tokens are complete
- **Plan normalization improvements** - Identify color naming issues, missing scales
- **Generate framework-specific code** - Use Tailwind/MUI mappings directly
- **Prioritize fixes** - Follow implementation roadmap

### 4. Integrate with Workflows

**Code Generation Workflow:**
```
tokens-normalized.json
  → Design System Interpreter
  → Framework Mapping
  → tailwind.config.ts / mui-theme.ts
```

**Quality Assurance Workflow:**
```
tokens-normalized.json
  → Design System Interpreter
  → Quality Assessment
  → Issue Tracking / Normalization Fixes
```

---

## Expected Output Structure

```markdown
# Design System Analysis Report

## Executive Summary
This design system exhibits partial Material Design 3 patterns with custom typography and spacing. Extracted from https://labs.google/aifuturesfund/, it includes 15 color values, 4 typography styles, and 20 spacing tokens. Production readiness: 65/100 - requires color scale completion and semantic naming.

## Framework Classification
**Affinity:** Material Design 3 (60% confidence)
**Evidence:**
- Material Angular library detected (mat-typography class)
- Color naming uses "primary" semantic role
- Typography includes Material-style font families (Google Sans)

**This is NOT Material Design 3:**
- Missing secondary, error, warning, success color roles
- Custom spacing scale (0.5rem vs 8dp base unit)
- Incomplete color scales (only DEFAULT shades)

## Color System Analysis
{Detailed JSON analysis}

## [Continue with remaining sections...]
```

---

## Integration with SuperClaude Framework

**Auto-Activation Triggers:**
- File path contains `tokens-normalized.json`
- User asks: "analyze design system", "interpret tokens", "map to Tailwind"
- Commands: `/analyze tokens-normalized.json`, `/review design-system/`

**MCP Server Integration:**
- **Sequential**: Primary - for structured multi-step analysis
- **Context7**: Secondary - for framework pattern verification

**Persona Coordination:**
- **Analyzer**: Root cause analysis of token issues
- **Frontend**: UI framework mapping recommendations
- **Architect**: Design system structure evaluation

---

**Last Updated:** 2025-11-19
**Maintained By:** Design System CLI (`ds`)
