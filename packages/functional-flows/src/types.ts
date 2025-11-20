/**
 * Phase 10: Functional Flows Types
 *
 * Screen and user journey extraction from traces.
 */

/**
 * Screen (application state/view)
 */
export interface Screen {
  id: string;
  urlPattern: string;
  label: string;
  primaryActions: string[];  // Action IDs that can be taken from this screen
}

/**
 * Flow step types
 */
export type FlowStepType = 'view' | 'click' | 'input' | 'navigate' | 'network';

/**
 * Individual step in a user flow
 */
export interface FlowStep {
  type: FlowStepType;
  screen?: string;  // Screen ID
  action?: string;  // Action ID
  operation?: string;  // Network operation (e.g., "POST /api/workspaces")
  duration?: number;  // Step duration in ms
}

/**
 * Complete user flow (journey)
 */
export interface Flow {
  id: string;
  name: string;
  fromScreen: string;
  toScreen: string;
  steps: FlowStep[];
  frequency?: number;  // How often this flow appears in traces
  avgDuration?: number;  // Average duration in ms
}

/**
 * Screens output
 */
export interface ScreensOutput {
  screens: Screen[];
}

/**
 * Flows output
 */
export interface FlowsOutput {
  flows: Flow[];
}

/**
 * Flow extraction configuration
 */
export interface FlowsConfig {
  tracePath: string;
  outScreens: string;
  outFlows: string;

  // Screen detection
  minActionsForScreen?: number;  // Min actions to constitute a screen (default: 1)

  // Flow detection
  minStepsForFlow?: number;  // Min steps to constitute a flow (default: 2)
  maxFlowDuration?: number;  // Max duration to consider a flow (default: 5 minutes)
}

/**
 * Flow extraction result
 */
export interface FlowsResult {
  success: boolean;
  screensPath: string;
  flowsPath: string;
  screensFound: number;
  flowsFound: number;
  errors?: string[];
}
