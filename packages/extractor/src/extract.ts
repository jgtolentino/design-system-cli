import { chromium, Page } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import type { ExtractOptions, RawDesignTokens, ComponentPattern, FrameworkDetection, Asset, AssetContext } from '@ds-cli/core';
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
 * Extract assets (images, videos, icons, etc.)
 */
async function extractAssets(page: Page): Promise<Asset[]> {
  return page.evaluate(() => {
    const assets: Asset[] = [];
    let idCounter = 1;

    // Helper to safely get className as string (handles SVGAnimatedString)
    const getClassName = (el: Element | null): string => {
      if (!el) return '';
      const cn = el.className;
      if (typeof cn === 'string') return cn;
      if (cn && typeof cn === 'object' && 'baseVal' in cn) return (cn as any).baseVal;
      return '';
    };

    // Helper to determine asset role
    const determineRole = (el: Element): Asset['role'] | undefined => {
      const className = getClassName(el).toLowerCase();
      const parent = el.parentElement;
      const parentClass = getClassName(parent).toLowerCase();

      if (className.includes('hero') || parentClass.includes('hero')) return 'hero';
      if (className.includes('avatar') || parentClass.includes('avatar')) return 'avatar';
      if (className.includes('thumb') || parentClass.includes('thumb')) return 'thumbnail';
      if (className.includes('background') || parentClass.includes('background')) return 'background';
      if (className.includes('icon') || el.tagName === 'SVG') return 'decoration';
      return 'content';
    };

    // Helper to calculate aspect ratio
    const getAspectRatio = (width: number, height: number): string => {
      if (!width || !height) return '';
      const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
      const divisor = gcd(width, height);
      return `${width / divisor}:${height / divisor}`;
    };

    // Helper to extract dominant colors (simplified - samples center pixel)
    const getDominantColor = (el: HTMLElement): string[] => {
      const style = window.getComputedStyle(el);
      const bgColor = style.backgroundColor;
      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
        return [bgColor];
      }
      return [];
    };

    // Extract images
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      const src = img.src || img.getAttribute('data-src');
      if (src && !src.startsWith('data:')) {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        assets.push({
          id: `img-${idCounter++}`,
          type: 'image',
          role: determineRole(img),
          src,
          alt: img.alt || undefined,
          aspectRatio: getAspectRatio(width, height),
          dominantColors: getDominantColor(img as HTMLElement),
          dimensions: width && height ? { width, height } : undefined,
        });
      }
    });

    // Extract videos
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      const src = video.src || video.querySelector('source')?.src;
      if (src) {
        assets.push({
          id: `video-${idCounter++}`,
          type: 'video',
          role: determineRole(video),
          src,
          aspectRatio: getAspectRatio(video.videoWidth, video.videoHeight),
          dimensions: video.videoWidth && video.videoHeight
            ? { width: video.videoWidth, height: video.videoHeight }
            : undefined,
        });
      }
    });

    // Extract SVG icons/illustrations
    const svgs = document.querySelectorAll('svg');
    svgs.forEach(svg => {
      const viewBox = svg.getAttribute('viewBox');
      const isIcon = svg.classList.contains('icon') ||
                     svg.parentElement?.classList.contains('icon') ||
                     (svg.clientWidth < 100 && svg.clientHeight < 100);

      // Only include if it has meaningful content (not just decorative)
      if (svg.querySelector('path, circle, rect, polygon')) {
        const width = svg.clientWidth || 24;
        const height = svg.clientHeight || 24;

        assets.push({
          id: `svg-${idCounter++}`,
          type: isIcon ? 'icon' : 'illustration',
          role: determineRole(svg),
          src: svg.outerHTML.substring(0, 500), // Truncate for inline SVG
          aspectRatio: getAspectRatio(width, height),
          dimensions: { width, height },
        });
      }
    });

    // Extract background images
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      const style = window.getComputedStyle(el);
      const bgImage = style.backgroundImage;

      if (bgImage && bgImage !== 'none' && bgImage.startsWith('url(')) {
        const url = bgImage.slice(5, -2); // Extract URL from url("...")
        if (url && !url.startsWith('data:')) {
          assets.push({
            id: `bg-${idCounter++}`,
            type: 'image',
            role: 'background',
            src: url,
            dominantColors: getDominantColor(el as HTMLElement),
          });
        }
      }
    });

    return assets;
  });
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
    await page.goto(options.url, { waitUntil: 'domcontentloaded', timeout: options.timeout || 60000 });

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

    console.log('🖼️  Extracting assets...');
    const assets = await extractAssets(page);

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
      assets,
    };

    // Write tokens output
    console.log(`💾 Writing tokens to: ${options.out}`);
    await fs.mkdir(path.dirname(options.out), { recursive: true });
    await fs.writeFile(options.out, JSON.stringify(result, null, 2));

    // Write assets output if requested
    if (options.assetsOut) {
      const assetContext: AssetContext = {
        page: options.url,
        capturedAt: new Date().toISOString(),
        assets,
      };

      console.log(`💾 Writing assets to: ${options.assetsOut}`);
      await fs.mkdir(path.dirname(options.assetsOut), { recursive: true });
      await fs.writeFile(options.assetsOut, JSON.stringify(assetContext, null, 2));
    }

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
    console.log(`   Assets: ${assets.length} (images, videos, icons)`);
    console.log(`   Framework: ${framework.primary} (${Math.round(framework.confidence * 100)}% confidence)`);

  } finally {
    await browser.close();
  }
}
