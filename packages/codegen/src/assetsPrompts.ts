/**
 * Asset recreation prompt generator
 * Converts assets.json into LLM prompts for image generation
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { AssetContext, AssetPromptEntry, AssetPromptsFile } from '@ds-cli/core';

export async function generateAssetPrompts(
  assetsPath: string,
  outPath: string
): Promise<void> {
  const raw = await fs.readFile(assetsPath, 'utf-8');
  const ctx = JSON.parse(raw) as AssetContext;

  const items: AssetPromptEntry[] = ctx.assets.map((asset) => ({
    id: asset.id,
    type: asset.type,
    target_model: 'fal-ai/image',
    prompt: `TODO: describe ${asset.role ?? asset.type} for ${ctx.page}`,
    negative_prompt: 'text, watermark, logos, UI chrome',
    guidance: {
      aspect_ratio: asset.aspectRatio,
      color_palette: asset.dominantColors,
      style_notes: `role: ${asset.role ?? 'generic'}`,
      role: asset.role,
    },
  }));

  const out: AssetPromptsFile = {
    page: ctx.page,
    items,
  };

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(out, null, 2), 'utf-8');
}
