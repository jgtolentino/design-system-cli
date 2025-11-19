#!/bin/bash

# Design System CLI - Example Workflow
# This script demonstrates the complete token extraction → normalization → generation pipeline

set -e  # Exit on error

echo "🚀 Design System CLI - Example Workflow"
echo "========================================"
echo ""

# Configuration
URL="https://labs.google/aifuturesfund/"
RAW_TOKENS="./tokens-raw.json"
NORMALIZED_TOKENS="./tokens-normalized.json"
TOKEN_MAPPING="./examples/token-mapping.example.json"
FIGMA_OUTPUT="./figma-plugin"
CODE_OUTPUT="./design-system"
FRAMEWORK="react-tailwind"

# Step 1: Extract design tokens
echo "📍 Step 1/4: Extracting design tokens from $URL"
echo "─────────────────────────────────────────────"
pnpm ds extract \
  --url "$URL" \
  --out "$RAW_TOKENS" \
  --screenshots ./screenshots

echo ""
echo "✅ Extracted tokens saved to: $RAW_TOKENS"
echo ""

# Step 2: Normalize tokens
echo "📍 Step 2/4: Normalizing tokens to house system"
echo "──────────────────────────────────────────────"
pnpm ds normalize \
  --input "$RAW_TOKENS" \
  --map "$TOKEN_MAPPING" \
  --out "$NORMALIZED_TOKENS"

echo ""
echo "✅ Normalized tokens saved to: $NORMALIZED_TOKENS"
echo ""

# Step 3: Generate Figma plugin
echo "📍 Step 3/4: Generating Figma plugin"
echo "───────────────────────────────────"
pnpm ds figma \
  --input "$NORMALIZED_TOKENS" \
  --out "$FIGMA_OUTPUT" \
  --mode plugin

echo ""
echo "✅ Figma plugin generated at: $FIGMA_OUTPUT/"
echo ""

# Step 4: Generate React code
echo "📍 Step 4/4: Generating $FRAMEWORK code"
echo "─────────────────────────────────────"
pnpm ds codegen \
  --input "$NORMALIZED_TOKENS" \
  --out "$CODE_OUTPUT" \
  --framework "$FRAMEWORK"

echo ""
echo "✅ Code generated at: $CODE_OUTPUT/"
echo ""

# Summary
echo "🎉 Workflow complete!"
echo "═══════════════════"
echo ""
echo "📦 Generated artifacts:"
echo "  • Raw tokens:        $RAW_TOKENS"
echo "  • Normalized tokens: $NORMALIZED_TOKENS"
echo "  • Figma plugin:      $FIGMA_OUTPUT/"
echo "  • React code:        $CODE_OUTPUT/"
echo ""
echo "🚀 Next steps:"
echo "  1. Import Figma plugin:"
echo "     - Open Figma Desktop"
echo "     - Plugins → Development → Import plugin from manifest"
echo "     - Select: $FIGMA_OUTPUT/manifest.json"
echo ""
echo "  2. Use generated code:"
echo "     cd $CODE_OUTPUT"
echo "     npm install"
echo "     # Start building your app!"
echo ""
