#!/usr/bin/env node

/**
 * Visual Regression Testing for Design System CLI
 *
 * Compares original website screenshots with generated design system screenshots
 * using pixelmatch for pixel-by-pixel comparison.
 *
 * Usage:
 *   node scripts/visual-regression.js \
 *     --original-url https://example.com \
 *     --generated-url http://localhost:3000 \
 *     --out visual-regression/
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

// Parse arguments
const args = process.argv.slice(2);
const originalUrl = args[args.indexOf('--original-url') + 1];
const generatedUrl = args[args.indexOf('--generated-url') + 1];
const outputDir = args[args.indexOf('--out') + 1] || './visual-regression';
const threshold = parseFloat(args[args.indexOf('--threshold') + 1]) || 0.1;
const viewports = args.includes('--viewports')
  ? JSON.parse(args[args.indexOf('--viewports') + 1])
  : [
      { name: 'mobile', width: 375, height: 812 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1440, height: 900 }
    ];

if (!originalUrl || !generatedUrl) {
  console.error('❌ Error: --original-url and --generated-url are required');
  console.error('\nUsage: node scripts/visual-regression.js --original-url <url> --generated-url <url>');
  process.exit(1);
}

/**
 * Capture screenshot with Playwright
 */
async function captureScreenshot(page, url, viewport, outputPath) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);

  // Additional wait for animations
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: outputPath,
    fullPage: true
  });

  console.log(`   ✓ Captured: ${path.basename(outputPath)}`);
}

/**
 * Compare two PNG images
 */
function compareImages(img1Path, img2Path, diffPath) {
  const img1 = PNG.sync.read(fs.readFileSync(img1Path));
  const img2 = PNG.sync.read(fs.readFileSync(img2Path));

  const { width, height } = img1;
  const diff = new PNG({ width, height });

  // Ensure images are same size
  if (img2.width !== width || img2.height !== height) {
    console.warn(`   ⚠️  Image size mismatch: ${width}x${height} vs ${img2.width}x${img2.height}`);
    return { pixelDifference: Infinity, percentageDifference: 100 };
  }

  const pixelDifference = pixelmatch(
    img1.data,
    img2.data,
    diff.data,
    width,
    height,
    { threshold }
  );

  // Write diff image
  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  const totalPixels = width * height;
  const percentageDifference = (pixelDifference / totalPixels) * 100;

  return {
    pixelDifference,
    percentageDifference,
    totalPixels,
    similarityScore: 100 - percentageDifference
  };
}

/**
 * Main visual regression test
 */
async function runVisualRegression() {
  console.log('\n🎨 Visual Regression Testing\n');
  console.log(`📍 Original: ${originalUrl}`);
  console.log(`📍 Generated: ${generatedUrl}`);
  console.log(`📁 Output: ${outputDir}\n`);

  // Create output directories
  const originalDir = path.join(outputDir, 'original');
  const generatedDir = path.join(outputDir, 'generated');
  const diffDir = path.join(outputDir, 'diff');

  [originalDir, generatedDir, diffDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const viewport of viewports) {
      console.log(`\n📱 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);

      const page = await browser.newPage();

      // Capture original
      const originalPath = path.join(originalDir, `${viewport.name}.png`);
      console.log('   📸 Capturing original...');
      await captureScreenshot(page, originalUrl, viewport, originalPath);

      // Capture generated
      const generatedPath = path.join(generatedDir, `${viewport.name}.png`);
      console.log('   📸 Capturing generated...');
      await captureScreenshot(page, generatedUrl, viewport, generatedPath);

      await page.close();

      // Compare
      console.log('   🔍 Comparing images...');
      const diffPath = path.join(diffDir, `${viewport.name}.png`);
      const comparison = compareImages(originalPath, generatedPath, diffPath);

      const result = {
        viewport: viewport.name,
        dimensions: `${viewport.width}x${viewport.height}`,
        ...comparison,
        passed: comparison.percentageDifference < 5, // 5% threshold
        originalPath,
        generatedPath,
        diffPath
      };

      results.push(result);

      const emoji = result.passed ? '✅' : '❌';
      console.log(`   ${emoji} Similarity: ${result.similarityScore.toFixed(2)}%`);
      console.log(`   📊 Pixel diff: ${result.pixelDifference.toLocaleString()} / ${result.totalPixels.toLocaleString()}`);
    }
  } finally {
    await browser.close();
  }

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    originalUrl,
    generatedUrl,
    threshold,
    viewports,
    results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      averageSimilarity: results.reduce((sum, r) => sum + r.similarityScore, 0) / results.length
    }
  };

  const reportPath = path.join(outputDir, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Generate HTML report
  generateHtmlReport(report, path.join(outputDir, 'report.html'));

  console.log(`\n📊 Test Summary:`);
  console.log(`   Total: ${report.summary.total}`);
  console.log(`   Passed: ${report.summary.passed} ✅`);
  console.log(`   Failed: ${report.summary.failed} ❌`);
  console.log(`   Average Similarity: ${report.summary.averageSimilarity.toFixed(2)}%`);
  console.log(`\n💾 Report saved to: ${reportPath}`);
  console.log(`📄 HTML report: ${path.join(outputDir, 'report.html')}`);

  // Exit with error if tests failed
  if (report.summary.failed > 0) {
    process.exit(1);
  }
}

/**
 * Generate HTML report
 */
function generateHtmlReport(report, outputPath) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Regression Report - ${new Date(report.timestamp).toLocaleString()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 40px;
      background: #f5f5f5;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { margin-bottom: 30px; color: #333; }
    .summary {
      background: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .summary-card {
      background: #f9f9f9;
      padding: 20px;
      border-radius: 6px;
      text-align: center;
    }
    .summary-card h3 { color: #666; font-size: 14px; margin-bottom: 10px; }
    .summary-card .value { font-size: 32px; font-weight: bold; color: #333; }
    .passed { color: #22c55e; }
    .failed { color: #ef4444; }
    .viewport {
      background: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .viewport h2 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      color: #333;
    }
    .badge {
      font-size: 12px;
      padding: 4px 12px;
      border-radius: 12px;
      font-weight: 600;
    }
    .badge.passed { background: #dcfce7; color: #166534; }
    .badge.failed { background: #fee2e2; color: #991b1b; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 30px;
    }
    .metric {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 6px;
    }
    .metric-label { font-size: 12px; color: #666; margin-bottom: 5px; }
    .metric-value { font-size: 20px; font-weight: bold; color: #333; }
    .images {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    .image-container h3 {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
    }
    .image-container img {
      width: 100%;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Visual Regression Report</h1>

    <div class="summary">
      <h2>Summary</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <h3>Total Tests</h3>
          <div class="value">${report.summary.total}</div>
        </div>
        <div class="summary-card">
          <h3>Passed</h3>
          <div class="value passed">${report.summary.passed}</div>
        </div>
        <div class="summary-card">
          <h3>Failed</h3>
          <div class="value failed">${report.summary.failed}</div>
        </div>
        <div class="summary-card">
          <h3>Average Similarity</h3>
          <div class="value">${report.summary.averageSimilarity.toFixed(2)}%</div>
        </div>
      </div>
      <p style="margin-top: 20px; color: #666;">
        <strong>Original:</strong> ${report.originalUrl}<br>
        <strong>Generated:</strong> ${report.generatedUrl}<br>
        <strong>Timestamp:</strong> ${new Date(report.timestamp).toLocaleString()}
      </p>
    </div>

    ${report.results.map(result => `
      <div class="viewport">
        <h2>
          ${result.viewport}
          <span class="badge ${result.passed ? 'passed' : 'failed'}">
            ${result.passed ? '✅ PASSED' : '❌ FAILED'}
          </span>
        </h2>

        <div class="metrics">
          <div class="metric">
            <div class="metric-label">Dimensions</div>
            <div class="metric-value">${result.dimensions}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Similarity Score</div>
            <div class="metric-value ${result.passed ? 'passed' : 'failed'}">
              ${result.similarityScore.toFixed(2)}%
            </div>
          </div>
          <div class="metric">
            <div class="metric-label">Pixel Difference</div>
            <div class="metric-value">
              ${result.pixelDifference.toLocaleString()}
            </div>
          </div>
          <div class="metric">
            <div class="metric-label">Percentage Difference</div>
            <div class="metric-value">
              ${result.percentageDifference.toFixed(2)}%
            </div>
          </div>
        </div>

        <div class="images">
          <div class="image-container">
            <h3>Original</h3>
            <img src="${path.relative(path.dirname(outputPath), result.originalPath)}" alt="Original">
          </div>
          <div class="image-container">
            <h3>Generated</h3>
            <img src="${path.relative(path.dirname(outputPath), result.generatedPath)}" alt="Generated">
          </div>
          <div class="image-container">
            <h3>Difference</h3>
            <img src="${path.relative(path.dirname(outputPath), result.diffPath)}" alt="Diff">
          </div>
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>
  `.trim();

  fs.writeFileSync(outputPath, html);
}

// Run
runVisualRegression().catch(err => {
  console.error('❌ Visual regression test failed:', err);
  process.exit(1);
});
