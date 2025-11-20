/**
 * Phase 9: Functional Trace Recorder
 *
 * Captures user interactions, network calls, and navigation using Playwright.
 */

import { chromium, Browser, Page, Request, Response } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import {
  TraceConfig,
  TraceOutput,
  TraceSession,
  TraceEvent,
  TraceResult,
  ScriptStep,
  NetworkShape
} from './types';

let eventCounter = 0;
let sessionCounter = 0;

/**
 * Generate unique event ID
 */
function generateEventId(type: string): string {
  return `${type}-${String(eventCounter++).padStart(3, '0')}`;
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `session-${String(sessionCounter++).padStart(2, '0')}`;
}

/**
 * Infer data shape from object (types only, not values)
 */
function inferShape(data: any): NetworkShape {
  if (data === null || data === undefined) {
    return {};
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return [];
    return [inferShape(data[0])];
  }

  if (typeof data === 'object') {
    const shape: NetworkShape = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        shape[key] = 'null';
      } else if (Array.isArray(value)) {
        shape[key] = value.length > 0 ? [inferShape(value[0])] : [];
      } else if (typeof value === 'object') {
        shape[key] = inferShape(value);
      } else {
        shape[key] = typeof value;
      }
    }
    return shape;
  }

  return typeof data;
}

/**
 * Extract label from element (text content, aria-label, or placeholder)
 */
async function extractElementLabel(page: Page, selector: string): Promise<string | undefined> {
  try {
    const element = await page.$(selector);
    if (!element) return undefined;

    // Try aria-label first
    const ariaLabel = await element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    // Try placeholder
    const placeholder = await element.getAttribute('placeholder');
    if (placeholder) return placeholder;

    // Try text content (truncated)
    const textContent = await element.textContent();
    if (textContent) {
      const trimmed = textContent.trim();
      return trimmed.length > 50 ? trimmed.substring(0, 47) + '...' : trimmed;
    }

    return undefined;
  } catch (error) {
    return undefined;
  }
}

/**
 * Check if URL should be ignored
 */
function shouldIgnoreUrl(url: string, ignorePatterns?: string[]): boolean {
  if (!ignorePatterns || ignorePatterns.length === 0) return false;

  return ignorePatterns.some(pattern => {
    if (pattern.startsWith('/') && pattern.endsWith('/')) {
      // Regex pattern
      const regex = new RegExp(pattern.slice(1, -1));
      return regex.test(url);
    }
    // Simple string contains
    return url.includes(pattern);
  });
}

/**
 * Setup network request/response listeners
 */
function setupNetworkListeners(
  page: Page,
  events: TraceEvent[],
  config: TraceConfig
): void {
  page.on('request', async (request: Request) => {
    const url = request.url();

    // Ignore assets and specified patterns
    if (
      shouldIgnoreUrl(url, config.ignoreUrls) ||
      url.match(/\.(png|jpg|jpeg|gif|svg|css|woff2?|ttf)$/i)
    ) {
      return;
    }

    // Track request
    const event: TraceEvent = {
      id: generateEventId('net'),
      type: 'network',
      timestamp: Date.now(),
      method: request.method() as any,
      url: url
    };

    // Capture request shape for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(request.method())) {
      try {
        const postData = request.postDataJSON();
        if (postData) {
          event.requestShape = inferShape(postData);
        }
      } catch (error) {
        // Ignore parsing errors
      }
    }

    events.push(event);
  });

  page.on('response', async (response: Response) => {
    const url = response.url();

    // Find matching request event
    const requestEvent = events.find(
      e => e.type === 'network' && e.url === url && !e.status
    );

    if (!requestEvent) return;

    // Add response data
    requestEvent.status = response.status();

    // Capture response shape for JSON responses
    try {
      const contentType = response.headers()['content-type'];
      if (contentType && contentType.includes('application/json')) {
        const json = await response.json();
        requestEvent.responseShape = inferShape(json);
      }
    } catch (error) {
      // Ignore parsing errors
    }
  });
}

/**
 * Setup UI event listeners
 */
function setupUIListeners(page: Page, events: TraceEvent[], config: TraceConfig): void {
  // Navigation events
  page.on('framenavigated', async (frame) => {
    if (frame === page.mainFrame()) {
      events.push({
        id: generateEventId('nav'),
        type: 'navigate',
        timestamp: Date.now(),
        toUrl: frame.url()
      });
    }
  });
}

/**
 * Execute scripted steps (if provided)
 */
async function executeSteps(page: Page, steps: ScriptStep[]): Promise<void> {
  for (const step of steps) {
    switch (step.type) {
      case 'navigate':
        if (step.url) {
          await page.goto(step.url, { waitUntil: 'networkidle' });
        }
        break;

      case 'click':
        if (step.selector) {
          await page.click(step.selector);
          await page.waitForTimeout(step.timeout || 1000);
        }
        break;

      case 'type':
        if (step.selector && step.value) {
          await page.fill(step.selector, step.value);
        }
        break;

      case 'select':
        if (step.selector && step.value) {
          await page.selectOption(step.selector, step.value);
        }
        break;

      case 'wait':
        await page.waitForTimeout(step.timeout || 1000);
        break;
    }
  }
}

/**
 * Main trace recording function
 */
export async function trace(config: TraceConfig): Promise<TraceResult> {
  const startTime = Date.now();
  let browser: Browser | undefined;

  try {
    console.log(`🎬 Starting functional trace recording...`);
    console.log(`   URL: ${config.url}`);

    // Initialize browser
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
      viewport: config.viewport
        ? { width: config.viewport[0], height: config.viewport[1] }
        : { width: 1440, height: 900 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    // Initialize session
    const session: TraceSession = {
      id: generateSessionId(),
      startTime: Date.now(),
      events: []
    };

    // Setup listeners
    if (config.captureNetwork !== false) {
      setupNetworkListeners(page, session.events, config);
    }
    setupUIListeners(page, session.events, config);

    // Navigate to initial URL
    console.log(`📍 Navigating to ${config.url}...`);
    await page.goto(config.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Record initial view
    session.events.push({
      id: generateEventId('view'),
      type: 'view',
      timestamp: Date.now(),
      url: config.url
    });

    // Execute scripted steps if provided
    if (config.stepsScript) {
      console.log(`📝 Executing scripted interactions from ${config.stepsScript}...`);
      const steps = require(path.resolve(config.stepsScript)) as ScriptStep[];
      await executeSteps(page, steps);
    } else {
      // Manual mode: wait for specified duration
      const duration = config.duration || 30000; // Default 30 seconds
      console.log(
        `⏱️  Recording in manual mode for ${duration / 1000} seconds...`
      );
      console.log(`   Interact with the application, then wait for completion.`);
      await page.waitForTimeout(duration);
    }

    // Finalize session
    session.endTime = Date.now();

    // Create output
    // Safely get user agent (page context might be destroyed)
    let userAgent = 'Mozilla/5.0 (unknown)';
    try {
      if (!page.isClosed()) {
        userAgent = await page.evaluate('navigator.userAgent');
      }
    } catch (e) {
      // Page context destroyed, use default
    }

    const output: TraceOutput = {
      meta: {
        url: config.url,
        recordedAt: new Date().toISOString(),
        viewport: config.viewport || [1440, 900],
        userAgent,
        duration: session.endTime - session.startTime
      },
      sessions: [session]
    };

    // Write output file
    const outDir = path.dirname(config.out);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(config.out, JSON.stringify(output, null, 2), 'utf-8');

    await browser.close();

    const duration = Date.now() - startTime;

    console.log(`\n✅ Trace recording complete!`);
    console.log(`   Output: ${config.out}`);
    console.log(`   Sessions: ${output.sessions.length}`);
    console.log(`   Events: ${session.events.length}`);
    console.log(`   Duration: ${duration}ms`);

    return {
      success: true,
      outputPath: config.out,
      sessionsRecorded: output.sessions.length,
      eventsRecorded: session.events.length,
      duration
    };
  } catch (error: any) {
    if (browser) {
      await browser.close();
    }

    console.error(`❌ Trace recording failed:`, error.message);

    return {
      success: false,
      outputPath: config.out,
      sessionsRecorded: 0,
      eventsRecorded: 0,
      duration: Date.now() - startTime,
      errors: [error.message]
    };
  }
}
