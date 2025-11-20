/**
 * Phase 10: Functional Flows Extractor
 *
 * Converts traces into screens and user journeys.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { TraceOutput, TraceEvent } from '@ds-cli/functional-trace';
import {
  FlowsConfig,
  FlowsResult,
  Screen,
  Flow,
  FlowStep,
  ScreensOutput,
  FlowsOutput
} from './types';

/**
 * Generate screen ID from URL
 */
function generateScreenId(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    if (pathname === '/' || pathname === '') {
      return 'screen-landing';
    }

    // Clean pathname for ID
    const clean = pathname
      .replace(/^\//, '')
      .replace(/\/$/, '')
      .replace(/\//g, '-')
      .replace(/[^a-z0-9-]/gi, '');

    return `screen-${clean || 'root'}`;
  } catch (error) {
    return 'screen-unknown';
  }
}

/**
 * Generate screen label from URL
 */
function generateScreenLabel(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    if (pathname === '/' || pathname === '') {
      return 'Landing Page';
    }

    // Extract readable label from pathname
    const parts = pathname
      .split('/')
      .filter(p => p.length > 0)
      .map(p => {
        // Convert kebab-case to Title Case
        return p
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      });

    return parts.join(' → ');
  } catch (error) {
    return 'Unknown Screen';
  }
}

/**
 * Extract screens from trace events
 */
function extractScreens(trace: TraceOutput, config: FlowsConfig): Screen[] {
  const screenMap = new Map<string, Screen>();

  // Iterate through all sessions
  for (const session of trace.sessions) {
    let currentUrl = trace.meta.url;
    const actions: string[] = [];

    for (const event of session.events) {
      // Track navigation
      if (event.type === 'navigate' && event.toUrl) {
        currentUrl = event.toUrl;
      }

      // Track actions from current screen
      if (event.type === 'click' && currentUrl) {
        actions.push(event.id);
      }

      // Create/update screen
      if (currentUrl) {
        const screenId = generateScreenId(currentUrl);

        if (!screenMap.has(screenId)) {
          screenMap.set(screenId, {
            id: screenId,
            urlPattern: new URL(currentUrl).pathname,
            label: generateScreenLabel(currentUrl),
            primaryActions: []
          });
        }

        // Add unique actions
        const screen = screenMap.get(screenId)!;
        for (const actionId of actions) {
          if (!screen.primaryActions.includes(actionId)) {
            screen.primaryActions.push(actionId);
          }
        }
      }
    }
  }

  return Array.from(screenMap.values());
}

/**
 * Extract flows from trace events
 */
function extractFlows(
  trace: TraceOutput,
  screens: Screen[],
  config: FlowsConfig
): Flow[] {
  const flows: Flow[] = [];
  const minSteps = config.minStepsForFlow || 2;
  const maxDuration = config.maxFlowDuration || 5 * 60 * 1000; // 5 minutes

  // Track screen ID map
  const screenIdMap = new Map<string, string>();
  for (const screen of screens) {
    screenIdMap.set(screen.urlPattern, screen.id);
  }

  // Iterate through sessions
  for (const session of trace.sessions) {
    const events = session.events;
    let currentUrl = trace.meta.url;
    let currentScreenId = generateScreenId(currentUrl);
    let flowSteps: FlowStep[] = [];
    let flowStartTime = session.startTime;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      // Add step to current flow
      const step: FlowStep = {
        type: event.type as any,
        screen: currentScreenId,
        duration: i > 0 ? event.timestamp - events[i - 1].timestamp : 0
      };

      if (event.type === 'click') {
        step.action = event.selector;
      } else if (event.type === 'network') {
        step.operation = `${event.method} ${new URL(event.url!).pathname}`;
      }

      flowSteps.push(step);

      // Check for navigation (flow boundary)
      if (event.type === 'navigate' && event.toUrl) {
        const newUrl = event.toUrl;
        const newScreenId = generateScreenId(newUrl);

        // Navigation detected - create flow if enough steps
        if (
          newScreenId !== currentScreenId &&
          flowSteps.length >= minSteps
        ) {
          const flowDuration = event.timestamp - flowStartTime;

          if (flowDuration <= maxDuration) {
            // Infer flow name from screens
            const fromScreen = screens.find(s => s.id === currentScreenId);
            const toScreen = screens.find(s => s.id === newScreenId);

            const flowName = `${fromScreen?.label || 'Unknown'} → ${toScreen?.label || 'Unknown'}`;

            flows.push({
              id: `flow-${flows.length + 1}`,
              name: flowName,
              fromScreen: currentScreenId,
              toScreen: newScreenId,
              steps: flowSteps,
              avgDuration: flowDuration
            });
          }

          // Reset for new flow
          flowSteps = [];
          flowStartTime = event.timestamp;
        }

        currentUrl = newUrl;
        currentScreenId = newScreenId;
      }
    }
  }

  return flows;
}

/**
 * Main flows extraction function
 */
export async function flows(config: FlowsConfig): Promise<FlowsResult> {
  try {
    console.log(`📊 Extracting screens and flows...`);
    console.log(`   Input: ${config.tracePath}`);

    // Load trace
    const traceData = fs.readFileSync(config.tracePath, 'utf-8');
    const trace: TraceOutput = JSON.parse(traceData);

    // Extract screens
    console.log(`🖥️  Extracting screens...`);
    const screens = extractScreens(trace, config);
    console.log(`   Found ${screens.length} screens`);

    // Extract flows
    console.log(`🔄 Extracting flows...`);
    const flowList = extractFlows(trace, screens, config);
    console.log(`   Found ${flowList.length} flows`);

    // Write outputs
    const screensOutput: ScreensOutput = { screens };
    const flowsOutput: FlowsOutput = { flows: flowList };

    const outDirScreens = path.dirname(config.outScreens);
    const outDirFlows = path.dirname(config.outFlows);

    if (!fs.existsSync(outDirScreens)) {
      fs.mkdirSync(outDirScreens, { recursive: true });
    }
    if (!fs.existsSync(outDirFlows)) {
      fs.mkdirSync(outDirFlows, { recursive: true });
    }

    fs.writeFileSync(
      config.outScreens,
      JSON.stringify(screensOutput, null, 2),
      'utf-8'
    );
    fs.writeFileSync(
      config.outFlows,
      JSON.stringify(flowsOutput, null, 2),
      'utf-8'
    );

    console.log(`\n✅ Flows extraction complete!`);
    console.log(`   Screens: ${config.outScreens}`);
    console.log(`   Flows: ${config.outFlows}`);

    return {
      success: true,
      screensPath: config.outScreens,
      flowsPath: config.outFlows,
      screensFound: screens.length,
      flowsFound: flowList.length
    };
  } catch (error: any) {
    console.error(`❌ Flows extraction failed:`, error.message);

    return {
      success: false,
      screensPath: config.outScreens,
      flowsPath: config.outFlows,
      screensFound: 0,
      flowsFound: 0,
      errors: [error.message]
    };
  }
}
