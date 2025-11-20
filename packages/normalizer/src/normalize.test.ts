import { test } from 'node:test';
import assert from 'node:assert';
import { normalizeColors } from './normalize.js';
import type { TokenMapping } from '@ds-cli/core';

const defaultMapping: TokenMapping = {
  color: {
    match: [],
    rename: {},
  },
  typography: {
    strategy: 'passthrough',
  },
  spacing: {
    baseUnit: 4,
    scale: 'linear',
  },
};

test('normalizeColors: converts RGB keys to semantic names', () => {
  const rawColors = {
    'rgb(0, 0, 0)': 'rgb(0, 0, 0)',
    'rgb(255, 255, 255)': 'rgb(255, 255, 255)',
    'rgb(128, 128, 128)': 'rgb(128, 128, 128)',
    'rgb(0, 122, 255)': 'rgb(0, 122, 255)',
  };

  const normalized = normalizeColors(rawColors, defaultMapping);

  // Should have semantic color names, not RGB keys
  assert.ok(normalized.black, 'Should have black color');
  assert.ok(normalized.white, 'Should have white color');
  assert.ok(
    normalized['gray-500'] || normalized['gray-300'],
    'Should have gray color'
  );
  assert.ok(normalized['blue-500'], 'Should have blue color');

  // Should NOT have RGB keys
  assert.strictEqual(normalized['rgb(0, 0, 0)'], undefined);
  assert.strictEqual(normalized['rgb(255, 255, 255)'], undefined);
});

test('normalizeColors: detects color roles (primary, secondary, error)', () => {
  const rawColors = {
    primary: 'rgb(0, 122, 255)',
    secondary: 'rgb(255, 59, 48)',
    error: 'rgb(255, 59, 48)',
  };

  const normalized = normalizeColors(rawColors, defaultMapping);

  // Should preserve role-based names
  assert.ok(normalized.primary, 'Should have primary color');
  assert.ok(normalized.secondary, 'Should have secondary color');
  assert.ok(normalized.error, 'Should have error color');
});

test('normalizeColors: creates color scales with DEFAULT', () => {
  const rawColors = {
    'rgb(0, 0, 0)': 'rgb(0, 0, 0)',
    'rgb(255, 255, 255)': 'rgb(255, 255, 255)',
  };

  const normalized = normalizeColors(rawColors, defaultMapping);

  // Each color should be a scale with DEFAULT value
  assert.strictEqual(typeof normalized.black, 'object');
  assert.ok(normalized.black?.DEFAULT, 'Black should have DEFAULT value');

  assert.strictEqual(typeof normalized.white, 'object');
  assert.ok(normalized.white?.DEFAULT, 'White should have DEFAULT value');
});

test('normalizeColors: handles achromatic colors correctly', () => {
  const rawColors = {
    'rgb(0, 0, 0)': 'rgb(0, 0, 0)', // Black
    'rgb(255, 255, 255)': 'rgb(255, 255, 255)', // White
    'rgb(26, 26, 26)': 'rgb(26, 26, 26)', // Very dark gray
    'rgb(128, 128, 128)': 'rgb(128, 128, 128)', // Mid gray
    'rgb(220, 220, 220)': 'rgb(220, 220, 220)', // Light gray
  };

  const normalized = normalizeColors(rawColors, defaultMapping);

  assert.ok(normalized.black, 'Should detect black');
  assert.ok(normalized.white, 'Should detect white');
  assert.ok(normalized['gray-900'], 'Should detect dark gray');
  assert.ok(
    normalized['gray-500'] || normalized['gray-300'],
    'Should detect mid gray'
  );
  assert.ok(normalized['gray-100'], 'Should detect light gray');
});

test('normalizeColors: handles chromatic colors with hue detection', () => {
  const rawColors = {
    'rgb(0, 122, 255)': 'rgb(0, 122, 255)', // Blue
    'rgb(255, 59, 48)': 'rgb(255, 59, 48)', // Red
    'rgb(52, 199, 89)': 'rgb(52, 199, 89)', // Green
    'rgb(255, 140, 103)': 'rgb(255, 140, 103)', // Orange
  };

  const normalized = normalizeColors(rawColors, defaultMapping);

  assert.ok(normalized['blue-500'], 'Should detect blue');
  assert.ok(normalized['red-500'] || normalized['red-300'], 'Should detect red');
  assert.ok(
    normalized['green-500'] || normalized['green-300'],
    'Should detect green'
  );
  assert.ok(
    normalized['orange-300'] || normalized['red-300'],
    'Should detect orange/warm color'
  );
});

test('normalizeColors: consolidates duplicate colors', () => {
  const rawColors = {
    'rgb(0, 0, 0)': 'rgb(0, 0, 0)',
    'rgb(0, 0, 0) rgb(0, 0, 0) rgb(255, 255, 255)': 'rgb(0, 0, 0)',
  };

  const normalized = normalizeColors(rawColors, defaultMapping);

  // Should consolidate to single black entry
  assert.ok(normalized.black, 'Should have black color');
  assert.strictEqual(typeof normalized.black, 'object');
  assert.ok(normalized.black.DEFAULT, 'Should have DEFAULT value');
});
