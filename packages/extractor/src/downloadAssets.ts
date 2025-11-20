/**
 * Asset Downloader Module
 *
 * Downloads images, fonts, and stylesheets from URLs
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import type { HtmlExtractionResult } from './extractHtml';

export interface AssetDownloadResult {
  images: AssetResult[];
  fonts: AssetResult[];
  styles: AssetResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  };
}

export interface AssetResult {
  url: string;
  path: string;
  success: boolean;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

/**
 * Download all assets from HTML extraction result
 */
export async function downloadAssets(
  extractionResult: HtmlExtractionResult,
  outputDir: string
): Promise<AssetDownloadResult> {
  console.log('📥 Downloading assets...');

  // Create output directories
  const imagesDir = path.join(outputDir, 'images');
  const fontsDir = path.join(outputDir, 'fonts');
  const stylesDir = path.join(outputDir, 'styles');

  [imagesDir, fontsDir, stylesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Download images
  console.log(`\n📸 Downloading ${extractionResult.images.length} images...`);
  const images = await downloadAssetList(
    extractionResult.images,
    imagesDir,
    'image'
  );

  // Download fonts
  console.log(`\n🔤 Downloading ${extractionResult.fonts.length} fonts...`);
  const fonts = await downloadAssetList(
    extractionResult.fonts,
    fontsDir,
    'font'
  );

  // Download stylesheets
  console.log(`\n🎨 Downloading ${extractionResult.externalStyles.length} stylesheets...`);
  const styles = await downloadAssetList(
    extractionResult.externalStyles,
    stylesDir,
    'style'
  );

  // Calculate summary
  const allResults = [...images, ...fonts, ...styles];
  const summary = {
    total: allResults.length,
    successful: allResults.filter(r => r.success).length,
    failed: allResults.filter(r => !r.success && !r.skipped).length,
    skipped: allResults.filter(r => r.skipped).length
  };

  console.log(`\n✅ Download complete:`);
  console.log(`   - Successful: ${summary.successful}`);
  console.log(`   - Failed: ${summary.failed}`);
  console.log(`   - Skipped: ${summary.skipped}`);

  return {
    images,
    fonts,
    styles,
    summary
  };
}

/**
 * Download a list of assets
 */
async function downloadAssetList(
  urls: string[],
  outputDir: string,
  type: 'image' | 'font' | 'style'
): Promise<AssetResult[]> {
  const results: AssetResult[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`   [${i + 1}/${urls.length}] ${url.substring(0, 80)}...`);

    try {
      // Skip data URLs (already embedded)
      if (url.startsWith('data:')) {
        results.push({
          url,
          path: '',
          success: false,
          skipped: true,
          reason: 'Data URL (already embedded)'
        });
        continue;
      }

      // Generate filename
      const filename = generateFilename(url, type, i);
      const outputPath = path.join(outputDir, filename);

      // Download asset
      await downloadFile(url, outputPath);

      results.push({
        url,
        path: outputPath,
        success: true
      });

      console.log(`   ✅ Saved: ${filename}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        url,
        path: '',
        success: false,
        error: errorMessage
      });
      console.log(`   ❌ Failed: ${errorMessage}`);
    }
  }

  return results;
}

/**
 * Download a file from URL
 */
function downloadFile(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Choose protocol
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl, outputPath).then(resolve).catch(reject);
          return;
        }
      }

      // Check status
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      // Write to file
      const fileStream = fs.createWriteStream(outputPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', (error) => {
        fs.unlinkSync(outputPath);
        reject(error);
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    // Set timeout
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Generate filename from URL
 */
function generateFilename(url: string, type: 'image' | 'font' | 'style', index: number): string {
  try {
    const urlObj = new URL(url);
    let pathname = urlObj.pathname;

    // Get filename from URL
    let filename = path.basename(pathname);

    // If no filename or generic, use index-based name
    if (!filename || filename === '/' || filename === '') {
      filename = `${type}-${index}`;
    }

    // Ensure proper extension
    filename = ensureExtension(filename, type, urlObj);

    // Sanitize filename
    filename = sanitizeFilename(filename);

    return filename;
  } catch (error) {
    // Invalid URL, use index-based name
    return `${type}-${index}.${getDefaultExtension(type)}`;
  }
}

/**
 * Ensure file has proper extension
 */
function ensureExtension(filename: string, type: 'image' | 'font' | 'style', urlObj: URL): string {
  const ext = path.extname(filename).toLowerCase();

  // If has valid extension, keep it
  const validExtensions = getValidExtensions(type);
  if (validExtensions.includes(ext)) {
    return filename;
  }

  // Try to infer from URL query params or hash
  const fullUrl = urlObj.href.toLowerCase();
  for (const validExt of validExtensions) {
    if (fullUrl.includes(validExt)) {
      return filename + validExt;
    }
  }

  // Add default extension
  return filename + '.' + getDefaultExtension(type);
}

/**
 * Get valid extensions for asset type
 */
function getValidExtensions(type: 'image' | 'font' | 'style'): string[] {
  switch (type) {
    case 'image':
      return ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.avif', '.ico'];
    case 'font':
      return ['.woff', '.woff2', '.ttf', '.otf', '.eot'];
    case 'style':
      return ['.css'];
    default:
      return [];
  }
}

/**
 * Get default extension for asset type
 */
function getDefaultExtension(type: 'image' | 'font' | 'style'): string {
  switch (type) {
    case 'image':
      return 'png';
    case 'font':
      return 'woff2';
    case 'style':
      return 'css';
    default:
      return 'bin';
  }
}

/**
 * Sanitize filename (remove invalid characters)
 */
function sanitizeFilename(filename: string): string {
  // Replace invalid characters with dash
  return filename
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 200); // Limit length
}

/**
 * Save inline styles to file
 */
export function saveInlineStyles(inlineStyles: string, outputDir: string): string {
  const stylesPath = path.join(outputDir, 'styles', 'inline-styles.css');

  // Ensure directory exists
  const stylesDir = path.dirname(stylesPath);
  if (!fs.existsSync(stylesDir)) {
    fs.mkdirSync(stylesDir, { recursive: true });
  }

  // Write styles to file
  fs.writeFileSync(stylesPath, inlineStyles, 'utf-8');

  console.log(`\n💾 Saved inline styles: ${path.basename(stylesPath)}`);

  return stylesPath;
}

/**
 * Create manifest file with asset mapping
 */
export function createAssetManifest(
  result: AssetDownloadResult,
  outputDir: string
): string {
  const manifestPath = path.join(outputDir, 'asset-manifest.json');

  const manifest = {
    timestamp: new Date().toISOString(),
    summary: result.summary,
    assets: {
      images: result.images.map(r => ({
        url: r.url,
        path: r.success ? path.relative(outputDir, r.path) : null,
        success: r.success,
        error: r.error,
        skipped: r.skipped
      })),
      fonts: result.fonts.map(r => ({
        url: r.url,
        path: r.success ? path.relative(outputDir, r.path) : null,
        success: r.success,
        error: r.error,
        skipped: r.skipped
      })),
      styles: result.styles.map(r => ({
        url: r.url,
        path: r.success ? path.relative(outputDir, r.path) : null,
        success: r.success,
        error: r.error,
        skipped: r.skipped
      }))
    }
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(`\n📋 Created asset manifest: ${path.basename(manifestPath)}`);

  return manifestPath;
}
