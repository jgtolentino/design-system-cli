/**
 * HTML Structure Extraction Module
 *
 * Extracts complete HTML structure from a webpage for recreation
 */

import type { Page } from 'playwright';

export interface HtmlSection {
  tag: string;
  id?: string;
  classes: string[];
  role?: string;
  children: HtmlSection[];
  text?: string;
  attributes: Record<string, string>;
}

export interface HtmlExtractionResult {
  html: string;
  structure: HtmlSection;
  images: string[];
  fonts: string[];
  externalStyles: string[];
  inlineStyles: string;
  meta: {
    title: string;
    description: string;
    lang: string;
  };
}

/**
 * Extract complete HTML structure from page
 */
export async function extractHtml(page: Page): Promise<HtmlExtractionResult> {
  console.log('🔍 Extracting HTML structure...');

  // Get full HTML content
  const html = await page.content();

  // Extract meta information
  const meta = await page.evaluate(() => {
    return {
      title: document.title || '',
      description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      lang: document.documentElement.lang || 'en'
    };
  });

  // Extract component structure
  const structure = await extractComponentStructure(page);

  // Extract all image URLs
  const images = await page.evaluate(() => {
    const imgs: string[] = [];

    // From <img> tags
    document.querySelectorAll('img').forEach(img => {
      if (img.src) imgs.push(img.src);
      if (img.srcset) {
        img.srcset.split(',').forEach(src => {
          const url = src.trim().split(' ')[0];
          if (url) imgs.push(url);
        });
      }
    });

    // From background images in inline styles
    document.querySelectorAll('[style*="background"]').forEach(el => {
      const style = (el as HTMLElement).style.backgroundImage;
      const matches = style.match(/url\(['"]?([^'"]+)['"]?\)/g);
      if (matches) {
        matches.forEach(match => {
          const url = match.replace(/url\(['"]?|['"]?\)/g, '');
          imgs.push(url);
        });
      }
    });

    // From CSS background-image
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      const computed = window.getComputedStyle(el);
      const bgImage = computed.backgroundImage;
      if (bgImage && bgImage !== 'none') {
        const matches = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/g);
        if (matches) {
          matches.forEach(match => {
            const url = match.replace(/url\(['"]?|['"]?\)/g, '');
            imgs.push(url);
          });
        }
      }
    });

    return Array.from(new Set(imgs)).filter(url =>
      !url.startsWith('data:') && url.length > 0
    );
  });

  // Extract font URLs
  const fonts = await page.evaluate(() => {
    const fontUrls: string[] = [];

    // From <link> tags
    document.querySelectorAll('link[rel="preload"][as="font"]').forEach(link => {
      const href = link.getAttribute('href');
      if (href) fontUrls.push(href);
    });

    // From @font-face rules in stylesheets
    const styleSheets = Array.from(document.styleSheets);
    styleSheets.forEach(sheet => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        rules.forEach(rule => {
          if (rule instanceof CSSFontFaceRule) {
            const src = rule.style.getPropertyValue('src');
            const matches = src.match(/url\(['"]?([^'"]+)['"]?\)/g);
            if (matches) {
              matches.forEach(match => {
                const url = match.replace(/url\(['"]?|['"]?\)/g, '');
                fontUrls.push(url);
              });
            }
          }
        });
      } catch (e) {
        // Cross-origin stylesheet, skip
      }
    });

    return Array.from(new Set(fontUrls)).filter(url =>
      !url.startsWith('data:') && url.length > 0
    );
  });

  // Extract external stylesheet URLs
  const externalStyles = await page.evaluate(() => {
    const styleUrls: string[] = [];
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      const href = link.getAttribute('href');
      if (href) styleUrls.push(href);
    });
    return styleUrls;
  });

  // Extract all inline styles
  const inlineStyles = await page.evaluate(() => {
    let styles = '';
    document.querySelectorAll('style').forEach(style => {
      styles += style.textContent + '\n';
    });
    return styles;
  });

  console.log(`✅ Extracted:`);
  console.log(`   - ${images.length} images`);
  console.log(`   - ${fonts.length} fonts`);
  console.log(`   - ${externalStyles.length} external stylesheets`);
  console.log(`   - ${(inlineStyles.length / 1024).toFixed(1)} KB inline styles`);

  return {
    html,
    structure,
    images,
    fonts,
    externalStyles,
    inlineStyles,
    meta
  };
}

/**
 * Extract semantic component structure from DOM
 */
async function extractComponentStructure(page: Page): Promise<HtmlSection> {
  return await page.evaluate(() => {
    function parseElement(element: Element): HtmlSection {
      const section: HtmlSection = {
        tag: element.tagName.toLowerCase(),
        classes: Array.from(element.classList),
        attributes: {},
        children: []
      };

      // Extract ID
      if (element.id) {
        section.id = element.id;
      }

      // Extract role
      const role = element.getAttribute('role');
      if (role) {
        section.role = role;
      }

      // Extract key attributes
      const keyAttrs = ['href', 'src', 'alt', 'title', 'type', 'name', 'value', 'placeholder'];
      keyAttrs.forEach(attr => {
        const value = element.getAttribute(attr);
        if (value) {
          section.attributes[attr] = value;
        }
      });

      // Extract text content (only direct text nodes)
      const textNodes = Array.from(element.childNodes).filter(
        node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
      );
      if (textNodes.length > 0) {
        section.text = textNodes.map(node => node.textContent?.trim()).join(' ');
      }

      // Recursively parse children (but skip script/style tags)
      const skipTags = ['script', 'style', 'noscript'];
      Array.from(element.children).forEach(child => {
        if (!skipTags.includes(child.tagName.toLowerCase())) {
          section.children.push(parseElement(child));
        }
      });

      return section;
    }

    // Start from body element
    const body = document.body;
    return parseElement(body);
  });
}

/**
 * Identify semantic sections in HTML structure
 */
export function identifySemanticSections(structure: HtmlSection): {
  header?: HtmlSection;
  nav?: HtmlSection;
  main?: HtmlSection;
  footer?: HtmlSection;
  sections: HtmlSection[];
} {
  const result: {
    header?: HtmlSection;
    nav?: HtmlSection;
    main?: HtmlSection;
    footer?: HtmlSection;
    sections: HtmlSection[];
  } = {
    sections: []
  };

  function traverse(node: HtmlSection) {
    // Identify semantic HTML5 elements
    if (node.tag === 'header' && !result.header) {
      result.header = node;
    } else if (node.tag === 'nav' && !result.nav) {
      result.nav = node;
    } else if (node.tag === 'main' && !result.main) {
      result.main = node;
    } else if (node.tag === 'footer' && !result.footer) {
      result.footer = node;
    } else if (node.tag === 'section') {
      result.sections.push(node);
    }

    // Check children
    node.children.forEach(child => traverse(child));
  }

  traverse(structure);
  return result;
}
