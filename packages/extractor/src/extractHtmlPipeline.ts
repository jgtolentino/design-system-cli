/**
 * HTML Extraction Pipeline
 *
 * Orchestrates the complete HTML extraction workflow:
 * 1. Extract HTML structure and assets
 * 2. Download assets
 * 3. Parse components
 * 4. Generate React components
 */

import * as fs from 'fs';
import * as path from 'path';
import { chromium, type Browser, type Page } from 'playwright';
import { extractHtml, type HtmlExtractionResult } from './extractHtml';
import { downloadAssets, saveInlineStyles, createAssetManifest, type AssetDownloadResult } from './downloadAssets';
import { parseComponents, type ParseResult } from './parseComponents';
import {
  generateComponents,
  generatePageComponent,
  generateReadme,
  type GenerateOptions,
  type GenerateResult
} from './generateComponents';

export interface HtmlPipelineOptions {
  url: string;
  outputDir: string;
  framework?: 'react-tailwind';
  typescript?: boolean;
  downloadAssets?: boolean;
  generateComponents?: boolean;
  headless?: boolean;
  timeout?: number;
}

export interface HtmlPipelineResult {
  extraction: HtmlExtractionResult;
  assets?: AssetDownloadResult;
  parse: ParseResult;
  components?: GenerateResult;
  outputDir: string;
  summary: {
    htmlExtracted: boolean;
    assetsDownloaded: boolean;
    componentsParsed: number;
    componentsGenerated: number;
  };
}

/**
 * Run the complete HTML extraction pipeline
 */
export async function extractHtmlPipeline(
  options: HtmlPipelineOptions
): Promise<HtmlPipelineResult> {
  console.log('🚀 Starting HTML extraction pipeline...\n');

  const {
    url,
    outputDir,
    framework = 'react-tailwind',
    typescript = true,
    downloadAssets: shouldDownloadAssets = true,
    generateComponents: shouldGenerateComponents = true,
    headless = true,
    timeout = 60000
  } = options;

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Launch browser
    console.log('🌐 Launching browser...');
    browser = await chromium.launch({ headless });
    page = await browser.newPage();

    // Navigate to URL
    console.log(`📍 Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

    // Wait for fonts
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(2000);

    // Step 1: Extract HTML structure
    console.log('\n📝 Step 1/4: Extracting HTML structure...');
    const extraction = await extractHtml(page);

    // Save raw HTML
    const htmlPath = path.join(outputDir, 'extracted.html');
    fs.writeFileSync(htmlPath, extraction.html, 'utf-8');
    console.log(`💾 Saved HTML: ${path.basename(htmlPath)}`);

    // Save extraction metadata
    const metaPath = path.join(outputDir, 'extraction-meta.json');
    fs.writeFileSync(metaPath, JSON.stringify({
      url,
      timestamp: new Date().toISOString(),
      meta: extraction.meta,
      stats: {
        images: extraction.images.length,
        fonts: extraction.fonts.length,
        externalStyles: extraction.externalStyles.length,
        inlineStylesSize: extraction.inlineStyles.length
      }
    }, null, 2), 'utf-8');

    // Close browser (no longer needed)
    await browser.close();
    browser = null;

    // Step 2: Download assets (optional)
    let assets: AssetDownloadResult | undefined;
    if (shouldDownloadAssets) {
      console.log('\n📥 Step 2/4: Downloading assets...');
      assets = await downloadAssets(extraction, outputDir);

      // Save inline styles
      saveInlineStyles(extraction.inlineStyles, outputDir);

      // Create asset manifest
      createAssetManifest(assets, outputDir);
    } else {
      console.log('\n⏭️  Step 2/4: Skipping asset download');
    }

    // Step 3: Parse components
    console.log('\n🔍 Step 3/4: Parsing component structure...');
    const parse = parseComponents(extraction.structure);

    // Save parse results
    const parsePath = path.join(outputDir, 'components-parsed.json');
    fs.writeFileSync(parsePath, JSON.stringify({
      timestamp: new Date().toISOString(),
      stats: parse.stats,
      components: parse.components.map(c => ({
        id: c.id,
        type: c.type,
        name: c.name,
        description: c.description,
        occurrences: c.occurrences,
        confidence: c.confidence,
        propsCount: c.props.length,
        childrenCount: c.children.length
      }))
    }, null, 2), 'utf-8');
    console.log(`💾 Saved parse results: ${path.basename(parsePath)}`);

    // Step 4: Generate components (optional)
    let componentsResult: GenerateResult | undefined;
    if (shouldGenerateComponents) {
      console.log('\n🎨 Step 4/4: Generating React components...');

      const generateOptions: GenerateOptions = {
        outputDir,
        framework,
        typescript
      };

      componentsResult = await generateComponents(parse, generateOptions);

      // Generate page component
      generatePageComponent(parse, outputDir, generateOptions);

      // Generate README
      generateReadme(parse, componentsResult, outputDir);
    } else {
      console.log('\n⏭️  Step 4/4: Skipping component generation');
    }

    // Summary
    const summary = {
      htmlExtracted: true,
      assetsDownloaded: shouldDownloadAssets && !!assets,
      componentsParsed: parse.components.length,
      componentsGenerated: componentsResult?.summary.successful || 0
    };

    console.log('\n✅ HTML extraction pipeline complete!\n');
    console.log('📊 Summary:');
    console.log(`   - HTML extracted: ${summary.htmlExtracted ? '✅' : '❌'}`);
    console.log(`   - Assets downloaded: ${summary.assetsDownloaded ? '✅' : '⏭️ '}`);
    console.log(`   - Components parsed: ${summary.componentsParsed}`);
    console.log(`   - Components generated: ${summary.componentsGenerated}`);
    console.log(`\n📁 Output directory: ${outputDir}`);

    return {
      extraction,
      assets,
      parse,
      components: componentsResult,
      outputDir,
      summary
    };

  } catch (error) {
    console.error('\n❌ Pipeline failed:', error);
    throw error;
  } finally {
    // Cleanup
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * CLI-friendly wrapper with simple options
 */
export async function extractHtmlCommand(options: {
  url: string;
  out: string;
  downloadAssets?: boolean;
  generateComponents?: boolean;
}): Promise<void> {
  await extractHtmlPipeline({
    url: options.url,
    outputDir: options.out,
    downloadAssets: options.downloadAssets !== false,
    generateComponents: options.generateComponents !== false,
    headless: true
  });
}
