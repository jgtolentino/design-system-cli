import * as fs from 'fs';
import * as path from 'path';

/**
 * Token shifting utility - transforms color palettes and typography
 * to create brand-distinct design systems from extracted tokens
 */

export interface TokenShiftConfig {
  // Color transformation
  colorShift?: {
    hueShift?: number; // Degrees to shift hue (-180 to 180)
    saturationMultiplier?: number; // Multiply saturation (0.5 = desaturate, 1.5 = saturate)
    lightnessShift?: number; // Shift lightness (-50 to 50)
  };

  // Typography transformation
  typographyOverride?: {
    fontFamilies?: Record<string, string>;
    scaleMultiplier?: number; // Scale all sizes by factor
  };

  // Spacing transformation
  spacingOverride?: {
    scaleMultiplier?: number;
    roundTo?: number; // Round to nearest multiple (e.g., 4, 8)
  };

  // Target brand palette (optional - overrides shifts)
  targetPalette?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    neutral?: string[];
  };
}

export interface TokenShiftResult {
  originalTokens: any;
  shiftedTokens: any;
  transformations: {
    colorsShifted: number;
    fontsReplaced: number;
    spacingAdjusted: number;
  };
}

/**
 * Convert hex color to HSL
 */
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    if (max === r) {
      h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / delta + 2) / 6;
    } else {
      h = ((r - g) / delta + 4) / 6;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * Convert HSL to hex
 */
function hslToHex(h: number, s: number, l: number): string {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Shift a single color
 */
export function shiftColor(hexColor: string, config: TokenShiftConfig['colorShift']): string {
  if (!config) return hexColor;

  const hsl = hexToHSL(hexColor);

  // Apply hue shift
  if (config.hueShift) {
    hsl.h = (hsl.h + config.hueShift + 360) % 360;
  }

  // Apply saturation multiplier
  if (config.saturationMultiplier) {
    hsl.s = Math.min(100, Math.max(0, hsl.s * config.saturationMultiplier));
  }

  // Apply lightness shift
  if (config.lightnessShift) {
    hsl.l = Math.min(100, Math.max(0, hsl.l + config.lightnessShift));
  }

  return hslToHex(hsl.h, hsl.s, hsl.l);
}

/**
 * Shift entire color palette
 */
function shiftColorPalette(colors: any, config: TokenShiftConfig): any {
  if (!colors) return colors;

  const shifted: any = {};
  let shiftsApplied = 0;

  // If target palette provided, use it directly
  if (config.targetPalette) {
    Object.keys(colors).forEach(key => {
      if (config.targetPalette!.primary && key.includes('primary')) {
        shifted[key] = config.targetPalette!.primary;
        shiftsApplied++;
      } else if (config.targetPalette!.secondary && key.includes('secondary')) {
        shifted[key] = config.targetPalette!.secondary;
        shiftsApplied++;
      } else if (config.targetPalette!.accent && key.includes('accent')) {
        shifted[key] = config.targetPalette!.accent;
        shiftsApplied++;
      } else {
        // Apply shift
        shifted[key] = shiftColor(colors[key], config.colorShift);
        shiftsApplied++;
      }
    });
  } else {
    // Apply algorithmic shift
    Object.keys(colors).forEach(key => {
      shifted[key] = shiftColor(colors[key], config.colorShift);
      shiftsApplied++;
    });
  }

  return { shifted, count: shiftsApplied };
}

/**
 * Transform typography tokens
 */
function transformTypography(typography: any, config: TokenShiftConfig): any {
  if (!typography) return typography;

  const transformed: any = { ...typography };
  let replacements = 0;

  // Replace font families
  if (config.typographyOverride?.fontFamilies) {
    Object.keys(config.typographyOverride.fontFamilies).forEach(oldFont => {
      const newFont = config.typographyOverride!.fontFamilies![oldFont];

      Object.keys(transformed).forEach(key => {
        if (transformed[key].fontFamily === oldFont) {
          transformed[key].fontFamily = newFont;
          replacements++;
        }
      });
    });
  }

  // Scale font sizes
  if (config.typographyOverride?.scaleMultiplier) {
    const multiplier = config.typographyOverride.scaleMultiplier;

    Object.keys(transformed).forEach(key => {
      if (transformed[key].fontSize) {
        const size = parseFloat(transformed[key].fontSize);
        if (!isNaN(size)) {
          transformed[key].fontSize = `${(size * multiplier).toFixed(2)}rem`;
          replacements++;
        }
      }
    });
  }

  return { transformed, count: replacements };
}

/**
 * Transform spacing tokens
 */
function transformSpacing(spacing: any, config: TokenShiftConfig): any {
  if (!spacing) return spacing;

  const transformed: any = {};
  let adjustments = 0;

  Object.keys(spacing).forEach(key => {
    let value = spacing[key];

    // Apply scale multiplier
    if (config.spacingOverride?.scaleMultiplier) {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        value = parsed * config.spacingOverride.scaleMultiplier;
        adjustments++;
      }
    }

    // Round to nearest multiple
    if (config.spacingOverride?.roundTo) {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        const roundTo = config.spacingOverride.roundTo;
        value = Math.round(parsed / roundTo) * roundTo;
      }
    }

    transformed[key] = typeof value === 'number' ? `${value}rem` : value;
  });

  return { transformed, count: adjustments };
}

/**
 * Shift entire token file
 */
export function shiftTokens(
  tokensPath: string,
  outputPath: string,
  config: TokenShiftConfig
): TokenShiftResult {
  console.log('🎨 Shifting design tokens...\n');

  // Read original tokens
  const originalTokens = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));

  // Create shifted version
  const shiftedTokens: any = { ...originalTokens };

  let colorsShifted = 0;
  let fontsReplaced = 0;
  let spacingAdjusted = 0;

  // Shift colors
  if (originalTokens.colors) {
    const colorResult = shiftColorPalette(originalTokens.colors, config);
    shiftedTokens.colors = colorResult.shifted;
    colorsShifted = colorResult.count;
    console.log(`   ✓ Colors shifted: ${colorsShifted}`);
  }

  // Transform typography
  if (originalTokens.typography) {
    const typographyResult = transformTypography(originalTokens.typography, config);
    shiftedTokens.typography = typographyResult.transformed;
    fontsReplaced = typographyResult.count;
    console.log(`   ✓ Typography transformed: ${fontsReplaced}`);
  }

  // Transform spacing
  if (originalTokens.spacing) {
    const spacingResult = transformSpacing(originalTokens.spacing, config);
    shiftedTokens.spacing = spacingResult.transformed;
    spacingAdjusted = spacingResult.count;
    console.log(`   ✓ Spacing adjusted: ${spacingAdjusted}`);
  }

  // Write shifted tokens
  fs.writeFileSync(outputPath, JSON.stringify(shiftedTokens, null, 2), 'utf-8');

  console.log(`\n✅ Shifted tokens saved to: ${path.basename(outputPath)}\n`);

  return {
    originalTokens,
    shiftedTokens,
    transformations: {
      colorsShifted,
      fontsReplaced,
      spacingAdjusted
    }
  };
}

/**
 * Preset configurations for common transformations
 */
export const TOKEN_SHIFT_PRESETS: Record<string, TokenShiftConfig> = {
  // Subtle shift - maintain visual harmony
  subtle: {
    colorShift: {
      hueShift: 30,
      saturationMultiplier: 1.1,
      lightnessShift: 0
    },
    typographyOverride: {
      scaleMultiplier: 1.0
    }
  },

  // Moderate shift - clearly different but related
  moderate: {
    colorShift: {
      hueShift: 60,
      saturationMultiplier: 1.2,
      lightnessShift: 5
    },
    typographyOverride: {
      scaleMultiplier: 1.05
    }
  },

  // Dramatic shift - completely different visual identity
  dramatic: {
    colorShift: {
      hueShift: 120,
      saturationMultiplier: 1.5,
      lightnessShift: 10
    },
    typographyOverride: {
      scaleMultiplier: 1.1
    }
  },

  // InsightPulse brand preset
  insightpulse: {
    targetPalette: {
      primary: '#FF9900',
      secondary: '#20232A',
      accent: '#00C2FF',
      neutral: ['#050509', '#0E1018', '#1A1D26', '#2C3038']
    },
    typographyOverride: {
      fontFamilies: {
        'Google Sans': 'Inter',
        'Product Sans': 'Inter',
        'Roboto': 'Inter'
      }
    }
  }
};
