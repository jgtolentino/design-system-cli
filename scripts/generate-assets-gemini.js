#!/usr/bin/env node

/**
 * Generate images from asset prompts using Google AI (Gemini) Imagen API
 *
 * Usage:
 *   node scripts/generate-assets-gemini.js --prompts google-ai-prompts.json --out generated-assets/
 *
 * Environment:
 *   GOOGLE_AI_STUDIO_KEY - Your Google AI Studio API key
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Parse command line arguments
const args = process.argv.slice(2);
const promptsPath = args[args.indexOf('--prompts') + 1];
const outputDir = args[args.indexOf('--out') + 1] || './generated-assets';
const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : undefined;

if (!promptsPath) {
  console.error('❌ Error: --prompts argument required');
  console.error('\nUsage: node scripts/generate-assets-gemini.js --prompts <path> --out <dir> [--limit <number>]');
  process.exit(1);
}

const API_KEY = process.env.GOOGLE_AI_STUDIO_KEY;
if (!API_KEY) {
  console.error('❌ Error: GOOGLE_AI_STUDIO_KEY environment variable not set');
  process.exit(1);
}

// Load prompts
const prompts = JSON.parse(fs.readFileSync(promptsPath, 'utf-8'));
console.log(`📋 Loaded ${prompts.items.length} asset prompts from ${promptsPath}`);

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`📁 Created output directory: ${outputDir}`);
}

// Generate images
async function generateImage(item, index) {
  console.log(`\n🎨 [${index + 1}/${prompts.items.length}] Generating: ${item.id}`);
  console.log(`   Prompt: ${item.prompt.substring(0, 80)}...`);

  // Note: Google AI Studio's Imagen API endpoint
  // This is a placeholder - actual endpoint may vary
  const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1/models/imagen-3.0-generate-001:predict?key=${API_KEY}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const requestBody = JSON.stringify({
    instances: [{
      prompt: item.prompt,
      negativePrompt: item.negative_prompt,
      aspectRatio: item.guidance?.aspect_ratio || '1:1',
      sampleCount: 1
    }]
  });

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);

            // Extract image data (format depends on API response)
            if (result.predictions && result.predictions[0]) {
              const imageData = result.predictions[0].bytesBase64Encoded;
              const buffer = Buffer.from(imageData, 'base64');

              // Save image
              const filename = `${item.id}.png`;
              const filepath = path.join(outputDir, filename);
              fs.writeFileSync(filepath, buffer);

              console.log(`   ✅ Saved: ${filename}`);
              resolve({ id: item.id, filepath, success: true });
            } else {
              console.error(`   ❌ No image data in response`);
              resolve({ id: item.id, success: false, error: 'No image data' });
            }
          } catch (error) {
            console.error(`   ❌ Error parsing response: ${error.message}`);
            resolve({ id: item.id, success: false, error: error.message });
          }
        } else {
          console.error(`   ❌ API error: ${res.statusCode}`);
          console.error(`   Response: ${data}`);
          resolve({ id: item.id, success: false, error: `HTTP ${res.statusCode}` });
        }
      });
    });

    req.on('error', (error) => {
      console.error(`   ❌ Request failed: ${error.message}`);
      resolve({ id: item.id, success: false, error: error.message });
    });

    req.write(requestBody);
    req.end();
  });
}

// Process items sequentially with delay
async function processItems() {
  const itemsToProcess = limit ? prompts.items.slice(0, limit) : prompts.items;
  const results = [];

  for (let i = 0; i < itemsToProcess.length; i++) {
    const item = itemsToProcess[i];

    // Skip items with TODO prompts (not yet enhanced)
    if (item.prompt.includes('TODO')) {
      console.log(`\n⏭️  [${i + 1}/${itemsToProcess.length}] Skipping ${item.id} (TODO prompt)`);
      results.push({ id: item.id, success: false, error: 'TODO prompt' });
      continue;
    }

    const result = await generateImage(item, i);
    results.push(result);

    // Add delay to avoid rate limits (1 second between requests)
    if (i < itemsToProcess.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Save results
  const resultsPath = path.join(outputDir, 'generation-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    source_prompts: promptsPath,
    total_items: prompts.items.length,
    processed: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  }, null, 2));

  console.log(`\n📊 Generation Summary:`);
  console.log(`   Total items: ${prompts.items.length}`);
  console.log(`   Processed: ${results.length}`);
  console.log(`   Successful: ${results.filter(r => r.success).length}`);
  console.log(`   Failed: ${results.filter(r => !r.success).length}`);
  console.log(`\n💾 Results saved to: ${resultsPath}`);
}

// Run
processItems().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
