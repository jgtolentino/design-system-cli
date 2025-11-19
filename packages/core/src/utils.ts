import type { ColorToken, TypographyToken } from './types';

/**
 * Parse color string to normalized format
 */
export function parseColor(value: string): ColorToken {
  const hexPattern = /^#([0-9a-fA-F]{3,8})$/;
  const rgbPattern = /^rgba?\(/;
  const hslPattern = /^hsla?\(/;
  const varPattern = /^var\(/;

  if (hexPattern.test(value)) {
    return { value, type: 'hex' };
  } else if (rgbPattern.test(value)) {
    return { value, type: 'rgb' };
  } else if (hslPattern.test(value)) {
    return { value, type: 'hsl' };
  } else if (varPattern.test(value)) {
    return { value, type: 'var' };
  }

  return { value, type: 'hex' };
}

/**
 * Convert px to rem
 */
export function pxToRem(px: number, baseFontSize: number = 16): string {
  return `${px / baseFontSize}rem`;
}

/**
 * Extract spacing scale from array of values
 */
export function inferSpacingScale(values: number[]): Record<string, string> {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  const scale: Record<string, string> = { '0': '0' };

  sorted.forEach((value, index) => {
    const key = value <= 4 ? String(value) : String(value / 4);
    scale[key] = pxToRem(value);
  });

  return scale;
}

/**
 * Generate color scale from single color
 */
export function generateColorScale(baseColor: string): Record<string, string> {
  // Simplified version - in production, use a proper color manipulation library
  return {
    '50': baseColor,
    '100': baseColor,
    '200': baseColor,
    '300': baseColor,
    '400': baseColor,
    '500': baseColor,
    '600': baseColor,
    '700': baseColor,
    '800': baseColor,
    '900': baseColor,
    DEFAULT: baseColor,
  };
}

/**
 * Normalize font family string
 */
export function normalizeFontFamily(fontFamily: string): string[] {
  return fontFamily
    .split(',')
    .map((f) => f.trim().replace(/['"]/g, ''))
    .filter(Boolean);
}

/**
 * Parse typography token from computed styles
 */
export function parseTypography(
  fontFamily: string,
  fontSize: string,
  fontWeight: string,
  lineHeight: string,
  letterSpacing?: string
): TypographyToken {
  return {
    fontFamily: normalizeFontFamily(fontFamily),
    fontSize,
    fontWeight,
    lineHeight,
    letterSpacing,
  };
}

/**
 * Detect framework from HTML content
 */
export function detectFramework(html: string): {
  primary: string;
  confidence: number;
  evidence: string[];
} {
  const frameworks = {
    angular: {
      patterns: [/_ngcontent/, /ng-version/, /\[_nghost\]/],
      weight: 0.4,
    },
    react: {
      patterns: [/data-react/, /__NEXT_DATA__/, /_reactRoot/],
      weight: 0.3,
    },
    vue: {
      patterns: [/data-v-/, /__VUE__/],
      weight: 0.3,
    },
  };

  const scores: Record<string, number> = {};
  const evidence: Record<string, string[]> = {};

  for (const [name, config] of Object.entries(frameworks)) {
    let score = 0;
    evidence[name] = [];

    for (const pattern of config.patterns) {
      const matches = html.match(pattern);
      if (matches) {
        score += config.weight;
        evidence[name].push(pattern.toString());
      }
    }

    scores[name] = score;
  }

  const primary = Object.keys(scores).reduce((a, b) =>
    scores[a] > scores[b] ? a : b
  );

  return {
    primary: primary || 'unknown',
    confidence: scores[primary] || 0,
    evidence: evidence[primary] || [],
  };
}
