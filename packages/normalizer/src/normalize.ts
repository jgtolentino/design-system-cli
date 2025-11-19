import fs from 'fs/promises';
import path from 'path';
import type {
  RawDesignTokens,
  NormalizedDesignTokens,
  TokenMapping,
  NormalizeOptions,
  ColorScale,
} from '@ds-cli/core';
import {
  parseColor,
  pxToRem,
  inferSpacingScale,
  generateColorScale,
  normalizeFontFamily,
} from '@ds-cli/core';

/**
 * Detect color role from color name/value patterns
 */
function detectColorRole(
  name: string,
  value: string
): 'primary' | 'secondary' | 'surface' | 'error' | 'warning' | 'info' | 'success' | 'gray' | undefined {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('primary') || nameLower.includes('brand')) return 'primary';
  if (nameLower.includes('secondary') || nameLower.includes('accent')) return 'secondary';
  if (nameLower.includes('surface') || nameLower.includes('background')) return 'surface';
  if (nameLower.includes('error') || nameLower.includes('danger') || nameLower.includes('red')) return 'error';
  if (nameLower.includes('warning') || nameLower.includes('yellow') || nameLower.includes('orange')) return 'warning';
  if (nameLower.includes('info') || nameLower.includes('blue')) return 'info';
  if (nameLower.includes('success') || nameLower.includes('green')) return 'success';
  if (nameLower.includes('gray') || nameLower.includes('grey') || nameLower.includes('neutral')) return 'gray';

  return undefined;
}

/**
 * Group colors into scales based on naming patterns
 */
function groupColorsIntoScales(colors: Record<string, string>): Record<string, ColorScale> {
  const scales: Record<string, ColorScale> = {};

  // Pattern 1: color-[weight] (e.g., primary-500, gray-900)
  const weightPattern = /^(.+?)-(\d{2,3})$/;

  // Pattern 2: color[Weight] (e.g., primary500, gray900)
  const camelWeightPattern = /^(.+?)(\d{2,3})$/;

  // Group colors by base name
  const groups: Record<string, Record<string, string>> = {};

  for (const [name, value] of Object.entries(colors)) {
    let baseName = name;
    let weight = 'DEFAULT';

    const dashMatch = name.match(weightPattern);
    const camelMatch = name.match(camelWeightPattern);

    if (dashMatch) {
      baseName = dashMatch[1];
      weight = dashMatch[2];
    } else if (camelMatch) {
      baseName = camelMatch[1];
      weight = camelMatch[2];
    }

    if (!groups[baseName]) groups[baseName] = {};
    groups[baseName][weight] = value;
  }

  // Convert groups to scales
  for (const [baseName, variants] of Object.entries(groups)) {
    const scale: ColorScale = {};

    for (const [weight, value] of Object.entries(variants)) {
      if (weight === 'DEFAULT') {
        scale.DEFAULT = value;
      } else {
        const numWeight = parseInt(weight);
        if ([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].includes(numWeight)) {
          scale[numWeight as keyof ColorScale] = value;
        }
      }
    }

    scales[baseName] = scale;
  }

  return scales;
}

/**
 * Normalize colors from raw tokens
 */
function normalizeColors(
  rawColors: Record<string, string>,
  mapping: TokenMapping
): NormalizedDesignTokens['colors'] {
  const scales = groupColorsIntoScales(rawColors);
  const normalized: NormalizedDesignTokens['colors'] = {};

  // Apply role detection and mapping
  for (const [name, scale] of Object.entries(scales)) {
    const role = detectColorRole(name, Object.values(scale)[0] || '');

    // Apply rename mapping if configured
    const mappedName = mapping.color.rename[name] || name;

    if (role) {
      normalized[role] = scale;
    } else {
      normalized[mappedName] = scale;
    }
  }

  // If we don't have a primary color, try to infer one
  if (!normalized.primary && Object.keys(scales).length > 0) {
    const firstScale = Object.entries(scales)[0];
    normalized.primary = firstScale[1];
  }

  return normalized;
}

/**
 * Normalize typography from raw tokens
 */
function normalizeTypography(
  rawTypography: Record<string, any>,
  mapping: TokenMapping
): NormalizedDesignTokens['typography'] {
  const fontFamily: Record<string, string[]> = {};
  const fontSize: Record<string, string | [string, { lineHeight: string }]> = {};
  const fontWeight: Record<string, string> = {};
  const lineHeight: Record<string, string> = {};

  // Extract font families
  const seenFamilies = new Set<string>();
  for (const token of Object.values(rawTypography)) {
    if (token.fontFamily && Array.isArray(token.fontFamily)) {
      const familyKey = token.fontFamily[0]?.toLowerCase() || '';
      if (!seenFamilies.has(familyKey) && familyKey) {
        seenFamilies.add(familyKey);

        // Classify as sans, serif, or mono
        if (familyKey.includes('mono') || familyKey.includes('code')) {
          fontFamily.mono = token.fontFamily;
        } else if (familyKey.includes('serif')) {
          fontFamily.serif = token.fontFamily;
        } else {
          fontFamily.sans = token.fontFamily;
        }
      }
    }
  }

  // Extract font sizes and weights
  for (const [name, token] of Object.entries(rawTypography)) {
    if (token.fontSize) {
      fontSize[name] = token.lineHeight
        ? [token.fontSize, { lineHeight: token.lineHeight }]
        : token.fontSize;
    }

    if (token.fontWeight) {
      fontWeight[name] = token.fontWeight;
    }

    if (token.lineHeight) {
      lineHeight[name] = token.lineHeight;
    }
  }

  return {
    fontFamily,
    fontSize,
    fontWeight,
    lineHeight,
  };
}

/**
 * Normalize spacing from raw scale
 */
function normalizeSpacing(
  rawSpacing: number[],
  mapping: TokenMapping
): Record<string, string> {
  return inferSpacingScale(rawSpacing);
}

/**
 * Normalize border radius from raw scale
 */
function normalizeBorderRadius(
  rawRadius: number[]
): Record<string, string> {
  const sorted = [...new Set(rawRadius)].sort((a, b) => a - b);
  const radius: Record<string, string> = { none: '0' };

  const names = ['sm', 'DEFAULT', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];

  sorted.forEach((value, index) => {
    if (index < names.length) {
      radius[names[index]] = `${value}px`;
    }
  });

  return radius;
}

/**
 * Normalize shadows from raw values
 */
function normalizeBoxShadow(
  rawShadows: string[]
): Record<string, string> {
  const shadows: Record<string, string> = { none: 'none' };

  const names = ['sm', 'DEFAULT', 'md', 'lg', 'xl', '2xl', 'inner'];

  rawShadows.forEach((value, index) => {
    if (index < names.length) {
      shadows[names[index]] = value;
    }
  });

  return shadows;
}

/**
 * Normalize breakpoints to screen values
 */
function normalizeScreens(
  rawBreakpoints: Record<string, number>
): Record<string, string> {
  const screens: Record<string, string> = {};

  for (const [name, value] of Object.entries(rawBreakpoints)) {
    screens[name] = `${value}px`;
  }

  return screens;
}

/**
 * Main normalization function
 */
export async function normalize(options: NormalizeOptions): Promise<void> {
  console.log(`🔄 Starting normalization from: ${options.input}`);

  // Read raw tokens
  const rawData = await fs.readFile(options.input, 'utf-8');
  const raw: RawDesignTokens = JSON.parse(rawData);

  // Read mapping configuration
  let mapping: TokenMapping;
  try {
    const mapData = await fs.readFile(options.map, 'utf-8');
    mapping = JSON.parse(mapData);
  } catch (error) {
    console.log('⚠️  No mapping file found, using default mapping');
    mapping = {
      color: {
        match: [],
        rename: {},
      },
      typography: {
        strategy: 'passthrough',
      },
      spacing: {
        baseUnit: 4,
        scale: 'linear',
      },
    };
  }

  console.log('🎨 Normalizing colors...');
  const colors = normalizeColors(raw.tokens.computed.colors, mapping);

  console.log('✍️ Normalizing typography...');
  const typography = normalizeTypography(raw.tokens.computed.typography, mapping);

  console.log('📏 Normalizing spacing...');
  const spacing = normalizeSpacing(raw.tokens.computed.spacingScale, mapping);

  console.log('🔘 Normalizing border radius...');
  const borderRadius = normalizeBorderRadius(raw.tokens.computed.radiusScale);

  console.log('✨ Normalizing shadows...');
  const boxShadow = normalizeBoxShadow(raw.tokens.computed.shadows);

  console.log('📱 Normalizing breakpoints...');
  const screens = normalizeScreens(raw.tokens.computed.breakpoints);

  // Compile normalized result
  const normalized: NormalizedDesignTokens = {
    meta: {
      source: raw.meta.url,
      system: 'house-system',
      normalizedAt: new Date().toISOString(),
    },
    colors,
    typography,
    spacing,
    borderRadius,
    boxShadow,
    screens,
  };

  // Write output
  console.log(`💾 Writing output to: ${options.out}`);
  await fs.mkdir(path.dirname(options.out), { recursive: true });
  await fs.writeFile(options.out, JSON.stringify(normalized, null, 2));

  console.log('✅ Normalization complete!');
  console.log(`\n📊 Summary:`);
  console.log(`   Colors: ${Object.keys(colors).length} scales`);
  console.log(`   Font Families: ${Object.keys(typography.fontFamily).length}`);
  console.log(`   Font Sizes: ${Object.keys(typography.fontSize).length}`);
  console.log(`   Spacing: ${Object.keys(spacing).length} values`);
  console.log(`   Border Radius: ${Object.keys(borderRadius).length} values`);
  console.log(`   Shadows: ${Object.keys(boxShadow).length} values`);
  console.log(`   Breakpoints: ${Object.keys(screens).length}`);
}
