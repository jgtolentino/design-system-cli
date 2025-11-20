/**
 * Phase 9: Functional Trace Types
 *
 * Captures user interactions, network calls, and navigation for behavioral analysis.
 */

/**
 * User interaction event types
 */
export type EventType =
  | 'click'
  | 'input'
  | 'change'
  | 'submit'
  | 'keyDown'
  | 'navigate'
  | 'network'
  | 'view';

/**
 * Network request/response shape (type inference only, not full data)
 */
export type NetworkShape =
  | string
  | NetworkShape[]
  | { [key: string]: NetworkShape };

/**
 * Individual interaction event
 */
export interface TraceEvent {
  id: string;
  type: EventType;
  timestamp: number;
  screenId?: string;

  // UI event properties
  selector?: string;
  label?: string;
  value?: string;

  // Network event properties
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url?: string;
  status?: number;
  requestShape?: NetworkShape;
  responseShape?: NetworkShape;

  // Navigation properties
  fromUrl?: string;
  toUrl?: string;
}

/**
 * Session: sequence of related user interactions
 */
export interface TraceSession {
  id: string;
  startTime: number;
  endTime?: number;
  events: TraceEvent[];
}

/**
 * Complete trace output
 */
export interface TraceOutput {
  meta: {
    url: string;
    recordedAt: string;
    viewport: [number, number];
    userAgent?: string;
    duration?: number;
  };
  sessions: TraceSession[];
}

/**
 * Trace recording configuration
 */
export interface TraceConfig {
  url: string;
  out: string;
  viewport?: [number, number];
  stepsScript?: string;  // Optional scripted interactions
  duration?: number;     // Max recording duration (ms)

  // Recording options
  captureNetwork?: boolean;
  captureConsole?: boolean;
  captureScreenshots?: boolean;

  // Filtering
  ignoreUrls?: string[];  // URL patterns to ignore
  ignoreSelectors?: string[];  // Selectors to ignore
}

/**
 * Script step for automated interaction recording
 */
export interface ScriptStep {
  type: 'click' | 'type' | 'wait' | 'navigate' | 'select';
  selector?: string;
  value?: string;
  url?: string;
  timeout?: number;
}

/**
 * Trace recording result
 */
export interface TraceResult {
  success: boolean;
  outputPath: string;
  sessionsRecorded: number;
  eventsRecorded: number;
  duration: number;
  errors?: string[];
}
