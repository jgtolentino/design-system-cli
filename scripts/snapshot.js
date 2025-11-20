#!/usr/bin/env node

/**
 * Snapshot Tool - Capture original website screenshots
 *
 * Captures screenshots of the original website at multiple viewports
 * and saves them for later comparison.
 *
 * Usage:
 *   node scripts/snapshot.js --url https://example.com --out snapshots/
 *
 * For n8n automation:
 *   Trigger this when the original website changes or during initial setup
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);
const url = args[args.indexOf('--url') + 1];
const outputDir = args[args.indexOf('--out') + 1] || './snapshots';
const viewports = args.includes('--viewports')
  ? JSON.parse(args[args.indexOf('--viewports') + 1])
  : [
      { name: 'mobile', width: 375, height: 812 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'desktop-xl', width: 1920, height: 1080 }
    ];

if (!url) {
  console.error('❌ Error: --url is required');
  console.error('\nUsage: node scripts/snapshot.js --url <url> [--out <dir>]');
  process.exit(1);
}

/**
 * Capture screenshot with Playwright
 */
async function captureScreenshot(page, url, viewport, outputPath) {
  console.log(`   📸 ${viewport.name} (${viewport.width}x${viewport.height})`);

  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);

  // Additional wait for animations and dynamic content
  await page.waitForTimeout(2000);

  // Capture screenshot
  await page.screenshot({
    path: outputPath,
    fullPage: true
  });

  console.log(`   ✅ Saved: ${path.basename(outputPath)}`);

  return {
    viewport: viewport.name,
    dimensions: `${viewport.width}x${viewport.height}`,
    path: outputPath,
    url
  };
}

/**
 * Main snapshot function
 */
async function captureSnapshots() {
  console.log('\n📸 Snapshot Tool\n');
  console.log(`🌐 URL: ${url}`);
  console.log(`📁 Output: ${outputDir}\n`);

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const snapshots = [];

  try {
    const page = await browser.newPage();

    for (const viewport of viewports) {
      const outputPath = path.join(outputDir, `${viewport.name}.png`);
      const result = await captureScreenshot(page, url, viewport, outputPath);
      snapshots.push(result);
    }

    await page.close();
  } finally {
    await browser.close();
  }

  // Save metadata
  const metadata = {
    url,
    timestamp: new Date().toISOString(),
    snapshots,
    viewports
  };

  const metadataPath = path.join(outputDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  console.log(`\n✅ Snapshot Complete!`);
  console.log(`📊 Captured ${snapshots.length} viewports`);
  console.log(`💾 Metadata: ${metadataPath}\n`);

  // Output JSON for n8n automation
  console.log('JSON_OUTPUT_START');
  console.log(JSON.stringify({
    success: true,
    url,
    outputDir,
    snapshotCount: snapshots.length,
    metadata: metadataPath,
    snapshots
  }));
  console.log('JSON_OUTPUT_END');
}

// Run
captureSnapshots().catch(err => {
  console.error('❌ Snapshot failed:', err.message);
  console.error(err.stack);

  // Output error JSON for n8n
  console.log('JSON_OUTPUT_START');
  console.log(JSON.stringify({
    success: false,
    error: err.message,
    stack: err.stack
  }));
  console.log('JSON_OUTPUT_END');

  process.exit(1);
});
