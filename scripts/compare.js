#!/usr/bin/env node

/**
 * Comparison Tool - Compare original and generated screenshots
 *
 * Compares screenshots from two snapshot directories and generates
 * visual diff reports.
 *
 * Usage:
 *   node scripts/compare.js \
 *     --original-dir snapshots/original \
 *     --generated-dir snapshots/generated \
 *     --out comparison-results
 *
 * For n8n automation:
 *   Trigger this after both snapshots are captured
 */

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

// Parse arguments
const args = process.argv.slice(2);
const originalDir = args[args.indexOf('--original-dir') + 1];
const generatedDir = args[args.indexOf('--generated-dir') + 1];
const outputDir = args[args.indexOf('--out') + 1] || './comparison-results';
const threshold = parseFloat(args[args.indexOf('--threshold') + 1]) || 0.1;
const passThreshold = parseFloat(args[args.indexOf('--pass-threshold') + 1]) || 95; // 95% similarity required

if (!originalDir || !generatedDir) {
  console.error('❌ Error: --original-dir and --generated-dir are required');
  console.error('\nUsage: node scripts/compare.js --original-dir <dir> --generated-dir <dir> [--out <dir>]');
  process.exit(1);
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
    return {
      pixelDifference: Infinity,
      percentageDifference: 100,
      totalPixels: width * height,
      similarityScore: 0
    };
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
        <strong>Original:</strong> ${report.originalDir}<br>
        <strong>Generated:</strong> ${report.generatedDir}<br>
        <strong>Pass Threshold:</strong> ${report.passThreshold}% similarity<br>
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

/**
 * Main comparison function
 */
async function runComparison() {
  console.log('\n🔍 Visual Regression Comparison\n');
  console.log(`📁 Original: ${originalDir}`);
  console.log(`📁 Generated: ${generatedDir}`);
  console.log(`📁 Output: ${outputDir}\n`);

  // Create output directories
  const diffDir = path.join(outputDir, 'diff');

  if (!fs.existsSync(diffDir)) {
    fs.mkdirSync(diffDir, { recursive: true });
  }

  // Load metadata from original snapshots
  const originalMetadataPath = path.join(originalDir, 'metadata.json');
  if (!fs.existsSync(originalMetadataPath)) {
    throw new Error(`Original metadata not found: ${originalMetadataPath}`);
  }

  const originalMetadata = JSON.parse(fs.readFileSync(originalMetadataPath, 'utf8'));
  const viewports = originalMetadata.viewports;

  const results = [];

  for (const viewport of viewports) {
    console.log(`\n📱 Comparing ${viewport.name} (${viewport.width}x${viewport.height})`);

    const originalPath = path.join(originalDir, `${viewport.name}.png`);
    const generatedPath = path.join(generatedDir, `${viewport.name}.png`);

    // Check if both images exist
    if (!fs.existsSync(originalPath)) {
      console.log(`   ⚠️  Original not found: ${originalPath}`);
      continue;
    }

    if (!fs.existsSync(generatedPath)) {
      console.log(`   ⚠️  Generated not found: ${generatedPath}`);
      continue;
    }

    // Compare
    console.log('   🔍 Comparing images...');
    const diffPath = path.join(diffDir, `${viewport.name}.png`);
    const comparison = compareImages(originalPath, generatedPath, diffPath);

    const result = {
      viewport: viewport.name,
      dimensions: `${viewport.width}x${viewport.height}`,
      ...comparison,
      passed: comparison.similarityScore >= passThreshold,
      originalPath,
      generatedPath,
      diffPath
    };

    results.push(result);

    const emoji = result.passed ? '✅' : '❌';
    console.log(`   ${emoji} Similarity: ${result.similarityScore.toFixed(2)}%`);
    console.log(`   📊 Pixel diff: ${result.pixelDifference.toLocaleString()} / ${result.totalPixels.toLocaleString()}`);
  }

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    originalDir,
    generatedDir,
    threshold,
    passThreshold,
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

  // Output JSON for n8n automation
  console.log('\nJSON_OUTPUT_START');
  console.log(JSON.stringify({
    success: report.summary.failed === 0,
    passed: report.summary.failed === 0,
    summary: report.summary,
    reportPath,
    htmlReportPath: path.join(outputDir, 'report.html'),
    results
  }));
  console.log('JSON_OUTPUT_END');

  // Exit with error if tests failed
  if (report.summary.failed > 0) {
    process.exit(1);
  }
}

// Run
runComparison().catch(err => {
  console.error('❌ Comparison failed:', err.message);
  console.error(err.stack);

  // Output error JSON for n8n
  console.log('\nJSON_OUTPUT_START');
  console.log(JSON.stringify({
    success: false,
    error: err.message,
    stack: err.stack
  }));
  console.log('JSON_OUTPUT_END');

  process.exit(1);
});
