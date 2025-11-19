/**
 * Core design token types
 * Based on W3C Design Tokens Community Group spec + Material Design 3
 */

export interface DesignSystemMeta {
  url: string;
  capturedAt: string;
  framework?: FrameworkDetection;
  method: 'browser' | 'static' | 'api';
  version?: string;
}

export interface FrameworkDetection {
  primary: 'react' | 'angular' | 'vue' | 'svelte' | 'unknown';
  confidence: number;
  evidence: string[];
  libraries: {
    mui?: boolean;
    materialAngular?: boolean;
    chakra?: boolean;
    antd?: boolean;
    [key: string]: boolean | undefined;
  };
}

export interface ColorToken {
  value: string;
  type: 'hex' | 'rgb' | 'hsl' | 'var';
  source?: string;
  role?: 'primary' | 'secondary' | 'surface' | 'error' | 'warning' | 'info' | 'success';
}

export interface ColorScale {
  50?: string;
  100?: string;
  200?: string;
  300?: string;
  400?: string;
  500?: string;
  600?: string;
  700?: string;
  800?: string;
  900?: string;
  950?: string;
  DEFAULT?: string;
}

export interface TypographyToken {
  fontFamily: string[];
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing?: string;
  textTransform?: string;
}

export interface SpacingToken {
  value: number;
  unit: 'px' | 'rem' | 'em';
  source?: string;
}

export interface ShadowToken {
  value: string;
  elevation?: number;
  source?: string;
}

export interface RawDesignTokens {
  meta: DesignSystemMeta;
  tokens: {
    rawCssVars: Record<string, string>;
    computed: {
      colors: Record<string, string>;
      typography: Record<string, TypographyToken>;
      spacingScale: number[];
      radiusScale: number[];
      shadows: string[];
      breakpoints: Record<string, number>;
    };
  };
  components: {
    [componentName: string]: ComponentPattern[];
  };
}

export interface ComponentPattern {
  className: string;
  tagName: string;
  role?: string;
  states?: {
    hover?: Record<string, string>;
    focus?: Record<string, string>;
    active?: Record<string, string>;
    disabled?: Record<string, string>;
  };
}

export interface NormalizedDesignTokens {
  meta: {
    source: string;
    system: string;
    normalizedAt: string;
  };
  colors: {
    primary?: ColorScale;
    secondary?: ColorScale;
    surface?: ColorScale;
    error?: ColorScale;
    warning?: ColorScale;
    info?: ColorScale;
    success?: ColorScale;
    gray?: ColorScale;
    [key: string]: ColorScale | undefined;
  };
  typography: {
    fontFamily: {
      sans?: string[];
      serif?: string[];
      mono?: string[];
      display?: string[];
      [key: string]: string[] | undefined;
    };
    fontSize: Record<string, string | [string, { lineHeight: string }]>;
    fontWeight: Record<string, string>;
    lineHeight: Record<string, string>;
    letterSpacing?: Record<string, string>;
  };
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  boxShadow: Record<string, string>;
  screens: Record<string, string>;
}

export interface TokenMapping {
  color: {
    match: string[];
    rename: Record<string, string>;
  };
  typography: {
    strategy: 'material3_to_house' | 'custom' | 'passthrough';
    fontFamilyMapping?: Record<string, string[]>;
  };
  spacing: {
    baseUnit: number;
    scale: 'linear' | 'exponential' | 'custom';
  };
}

export interface FigmaPluginOutput {
  manifest: {
    name: string;
    id: string;
    api: string;
    main: string;
    ui: string;
  };
  code: string;
  ui: string;
  tokens: NormalizedDesignTokens;
}

export interface CodegenFramework {
  name: 'react-tailwind' | 'react-mui' | 'vue-tailwind' | 'svelte-tailwind';
  configFile: string;
  componentTemplate: string;
}

export interface CodegenOutput {
  framework: CodegenFramework;
  files: Array<{
    path: string;
    content: string;
  }>;
}

export interface ExtractOptions {
  url: string;
  out: string;
  screenshots?: string;
  maxDepth?: number;
  viewport?: string;
  headless?: boolean;
  timeout?: number;
}

export interface NormalizeOptions {
  input: string;
  map: string;
  out: string;
}

export interface FigmaOptions {
  input: string;
  out: string;
  mode: 'plugin' | 'push';
  fileId?: string;
  token?: string;
}

export interface CodegenOptions {
  input: string;
  framework: CodegenFramework['name'];
  out: string;
}
