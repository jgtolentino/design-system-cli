#!/usr/bin/env node

/**
 * Interactive prompt enhancer - replace TODO prompts with descriptive ones
 *
 * Usage:
 *   node scripts/enhance-prompt.js --prompts google-ai-prompts.json --id img-1
 */

const fs = require('fs');
const readline = require('readline');

const args = process.argv.slice(2);
const promptsPath = args[args.indexOf('--prompts') + 1];
const targetId = args[args.indexOf('--id') + 1];

if (!promptsPath || !targetId) {
  console.error('❌ Error: --prompts and --id arguments required');
  console.error('\nUsage: node scripts/enhance-prompt.js --prompts <path> --id <asset-id>');
  process.exit(1);
}

// Load prompts
const data = JSON.parse(fs.readFileSync(promptsPath, 'utf-8'));
const item = data.items.find(i => i.id === targetId);

if (!item) {
  console.error(`❌ Error: Asset ID "${targetId}" not found`);
  process.exit(1);
}

console.log(`\n🎨 Enhancing prompt for: ${item.id}`);
console.log(`   Type: ${item.type}`);
console.log(`   Current prompt: ${item.prompt}`);
console.log(`   Aspect ratio: ${item.guidance.aspect_ratio}`);
console.log(`   Role: ${item.guidance.role}`);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('\n✏️  Enter enhanced prompt (or press Enter to use example): ', (newPrompt) => {
  const enhanced = newPrompt.trim() || generateExamplePrompt(item);

  // Update the item
  item.prompt = enhanced;

  console.log(`\n✅ Updated prompt to:`);
  console.log(`   "${enhanced}"`);

  rl.question('\n💾 Save changes? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      fs.writeFileSync(promptsPath, JSON.stringify(data, null, 2));
      console.log(`\n✅ Saved to ${promptsPath}`);
    } else {
      console.log('\n❌ Changes discarded');
    }
    rl.close();
  });
});

function generateExamplePrompt(item) {
  const role = item.guidance.role;
  const aspectRatio = item.guidance.aspect_ratio;

  const templates = {
    hero: `A striking hero image featuring abstract geometric patterns in vibrant colors, modern minimal design, ${aspectRatio} aspect ratio, professional photography quality`,
    content: `Clean modern illustration with simple geometric shapes, flat design style, corporate aesthetic, ${aspectRatio} composition`,
    icon: `Minimalist icon design, simple line art, monochromatic color scheme, scalable vector style`,
    decoration: `Abstract decorative element with flowing curves, gradient colors, modern web design aesthetic`,
    thumbnail: `Compact thumbnail image with clear focal point, balanced composition, professional quality`,
    background: `Subtle background pattern with geometric elements, low contrast, repeating texture`
  };

  return templates[role] || `Modern ${item.type} with clean design, professional quality, ${aspectRatio} aspect ratio`;
}
