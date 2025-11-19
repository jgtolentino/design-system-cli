import { chromium, Page } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import type { ExtractOptions, RawDesignTokens, ComponentPattern, FrameworkDetection } from '@ds-cli/core';
import { detectFramework } from '@ds-cli/core';

/**
 * Extract all CSS custom properties from the page
 */
async function extractCssVariables(page: Page): Promise<{ declared: Record<string, string>; computed: Record<string, string> }> {
  return page.evaluate(() => {
    const allStyles = Array.from(document.styleSheets);
    const vars: Record<string, string> = {};

    allStyles.forEach(sheet => {
      try {
        const rules = Array.from(sheet.cssRules || sheet.rules || []);
        rules.forEach((rule: any) => {
          if (rule.style) {
            for (let i = 0; i < rule.style.length; i++) {
              const prop = rule.style[i];
              if (prop.startsWith('--')) {
                const value = rule.style.getPropertyValue(prop);
                vars[prop] = value.trim();
              }
            }
          }
        });
      } catch (e) {
        // CORS-blocked stylesheets
      }
    });

    // Also get root variables
    const rootVars: Record<string, string> = {};
    const rootStyle = getComputedStyle(document.documentElement);
    for (let i = 0; i < rootStyle.length; i++) {
      const prop = rootStyle[i];
      if (prop.startsWith('--')) {
        rootVars[prop] = rootStyle.getPropertyValue(prop).trim();
      }
    }

    return { declared: vars, computed: rootVars };
  });
}

/**
 * Extract color palette from all elements
 */
async function extractColors(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const colors = new Map<string, string>();
    const elements = document.querySelectorAll('*');

    elements.forEach(el => {
      const style = getComputedStyle(el);
      ['color', 'background-color', 'border-color', 'fill', 'stroke'].forEach(prop => {
        const value = style.getPropertyValue(prop);
        if (value && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') {
          colors.set(value, value);
        }
      });
    });

    return Object.fromEntries(colors);
  });
}

/**
 * Extract typography system
 */
async function extractTypography(page: Page): Promise<Record<string, any>> {
  return page.evaluate(() => {
    const typographyMap: Record<string, any> = {};
    const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

    headings.forEach(tag => {
      const el = document.querySelector(tag);
      if (el) {
        const style = getComputedStyle(el);
        typographyMap[tag] = {
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
        };
      }
    });

    // Body text
    typographyMap.body = {
      fontFamily: getComputedStyle(document.body).fontFamily,
      fontSize: getComputedStyle(document.body).fontSize,
      fontWeight: getComputedStyle(document.body).fontWeight,
      lineHeight: getComputedStyle(document.body).lineHeight,
    };

    return typographyMap;
  });
}

/**
 * Extract spacing patterns
 */
async function extractSpacing(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const spacingValues = new Set<number>();
    const elements = document.querySelectorAll('*');

    elements.forEach(el => {
      const style = getComputedStyle(el);
      ['margin-top', 'margin-right', 'margin-bottom', 'margin-left',
       'padding-top', 'padding-right', 'padding-bottom', 'padding-left'].forEach(prop => {
        const value = parseFloat(style.getPropertyValue(prop));
        if (value > 0 && value < 200) {
          spacingValues.add(value);
        }
      });
    });

    return Array.from(spacingValues).sort((a, b) => a - b);
  });
}

/**
 * Extract border radius patterns
 */
async function extractBorderRadius(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const radiusValues = new Set<number>();
    const elements = document.querySelectorAll('*');

    elements.forEach(el => {
      const style = getComputedStyle(el);
      const br = style.borderRadius;
      if (br && br !== '0px') {
        const parsed = parseFloat(br);
        if (!isNaN(parsed)) {
          radiusValues.add(parsed);
        }
      }
    });

    return Array.from(radiusValues).sort((a, b) => a - b);
  });
}

/**
 * Extract box shadow patterns
 */
async function extractShadows(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const shadowValues = new Set<string>();
    const elements = document.querySelectorAll('*');

    elements.forEach(el => {
      const style = getComputedStyle(el);
      const bs = style.boxShadow;
      if (bs && bs !== 'none') {
        shadowValues.add(bs);
      }
    });

    return Array.from(shadowValues);
  });
}

/**
 * Extract breakpoints from media queries
 */
async function extractBreakpoints(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() => {
    const bps = new Set<number>();
    const allStyles = Array.from(document.styleSheets);

    allStyles.forEach(sheet => {
      try {
        const rules = Array.from(sheet.cssRules || sheet.rules || []);
        rules.forEach((rule: any) => {
          if (rule.media) {
            const mediaText = rule.media.mediaText;
            const matches = mediaText.match(/\d+px/g);
            if (matches) {
              matches.forEach((m: string) => bps.add(parseInt(m)));
            }
          }
        });
      } catch (e) {
        // CORS
      }
    });

    const sorted = Array.from(bps).sort((a, b) => a - b);
    const breakpoints: Record<string, number> = {};
    const names = ['sm', 'md', 'lg', 'xl', '2xl'];

    sorted.forEach((bp, i) => {
      if (i < names.length) {
        breakpoints[names[i]] = bp;
      }
    });

    return breakpoints;
  });
}

/**
 * Extract component patterns
 */
async function extractComponents(page: Page): Promise<Record<string, ComponentPattern[]>> {
  return page.evaluate(() => {
    const patterns: Record<string, ComponentPattern[]> = {};

    // Buttons
    const buttons = document.querySelectorAll('button, [role="button"], .btn, .button');
    patterns.buttons = Array.from(buttons).slice(0, 10).map(btn => ({
      className: btn.className,
      tagName: btn.tagName,
      role: btn.getAttribute('role') || undefined,
    }));

    // Cards
    const cards = document.querySelectorAll('.card, [class*="card"]');
    patterns.cards = Array.from(cards).slice(0, 5).map(card => ({
      className: card.className,
      tagName: card.tagName,
    }));

    // Navigation
    const navs = document.querySelectorAll('nav, [role="navigation"]');
    patterns.navigation = Array.from(navs).slice(0, 3).map(nav => ({
      className: nav.className,
      tagName: nav.tagName,
      role: nav.getAttribute('role') || undefined,
    }));

    return patterns;
  });
}

/**
 * Detect framework being used
 */
async function detectPageFramework(page: Page): Promise<FrameworkDetection> {
  const html = await page.content();
  const detection = detectFramework(html);

  const libraries = await page.evaluate(() => {
    return {
      mui: !!(document.querySelector('[class*="Mui"]') || document.querySelector('[data-mui-internal]')),
      materialAngular: !!document.querySelector('.mat-typography'),
      chakra: !!document.querySelector('[class*="chakra"]'),
      antd: !!document.querySelector('[class*="ant-"]'),
    };
  });

  return {
    primary: detection.primary as any,
    confidence: detection.confidence,
    evidence: detection.evidence,
    libraries,
  };
}

/**
 * Main extraction function
 */
export async function extract(options: ExtractOptions): Promise<void> {
  console.log(`🚀 Starting extraction from: ${options.url}`);

  const browser = await chromium.launch({
    headless: options.headless !== false,
    timeout: options.timeout || 60000
  });

  const context = await browser.newContext({
    viewport: options.viewport
      ? { width: parseInt(options.viewport.split('x')[0]), height: parseInt(options.viewport.split('x')[1]) }
      : { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  try {
    console.log('📡 Loading page...');
    await page.goto(options.url, { waitUntil: 'networkidle', timeout: options.timeout || 60000 });

    // Scroll to bottom to trigger lazy-loaded content
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(2000);

    console.log('🎨 Extracting CSS variables...');
    const cssVars = await extractCssVariables(page);

    console.log('🌈 Extracting colors...');
    const colors = await extractColors(page);

    console.log('✍️ Extracting typography...');
    const typography = await extractTypography(page);

    console.log('📏 Extracting spacing...');
    const spacing = await extractSpacing(page);

    console.log('🔘 Extracting border radius...');
    const radius = await extractBorderRadius(page);

    console.log('✨ Extracting shadows...');
    const shadows = await extractShadows(page);

    console.log('📱 Extracting breakpoints...');
    const breakpoints = await extractBreakpoints(page);

    console.log('🧩 Extracting components...');
    const components = await extractComponents(page);

    console.log('🔍 Detecting framework...');
    const framework = await detectPageFramework(page);

    // Take screenshots if requested
    if (options.screenshots) {
      console.log('📸 Capturing screenshots...');
      await fs.mkdir(options.screenshots, { recursive: true });
      await page.screenshot({
        path: path.join(options.screenshots, 'full-page.png'),
        fullPage: true
      });
    }

    // Compile results
    const result: RawDesignTokens = {
      meta: {
        url: options.url,
        capturedAt: new Date().toISOString(),
        framework,
        method: 'browser',
      },
      tokens: {
        rawCssVars: cssVars.declared,
        computed: {
          colors,
          typography,
          spacingScale: spacing,
          radiusScale: radius,
          shadows,
          breakpoints,
        },
      },
      components,
    };

    // Write output
    console.log(`💾 Writing output to: ${options.out}`);
    await fs.mkdir(path.dirname(options.out), { recursive: true });
    await fs.writeFile(options.out, JSON.stringify(result, null, 2));

    console.log('✅ Extraction complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   Colors: ${Object.keys(colors).length}`);
    console.log(`   CSS Variables: ${Object.keys(cssVars.declared).length}`);
    console.log(`   Typography: ${Object.keys(typography).length} styles`);
    console.log(`   Spacing: ${spacing.length} values`);
    console.log(`   Border Radius: ${radius.length} values`);
    console.log(`   Shadows: ${shadows.length} values`);
    console.log(`   Breakpoints: ${Object.keys(breakpoints).length}`);
    console.log(`   Components: ${Object.keys(components).length} types`);
    console.log(`   Framework: ${framework.primary} (${Math.round(framework.confidence * 100)}% confidence)`);

  } finally {
    await browser.close();
  }
}
