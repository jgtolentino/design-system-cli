import fs from 'fs/promises';
import path from 'path';
import type {
  NormalizedDesignTokens,
  CodegenOutput,
  CodegenFramework,
} from '@ds-cli/core';

interface CodegenOptions {
  input: string;
  out: string;
  framework: 'react-tailwind' | 'react-mui' | 'vue-tailwind' | 'svelte-tailwind';
}

/**
 * Generate Tailwind config from tokens
 */
function generateTailwindConfig(tokens: NormalizedDesignTokens): string {
  return `import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: ${JSON.stringify(tokens.colors, null, 6).replace(/"([^"]+)":/g, '$1:')},
      fontFamily: ${JSON.stringify(tokens.typography.fontFamily, null, 6).replace(/"([^"]+)":/g, '$1:')},
      fontSize: ${JSON.stringify(tokens.typography.fontSize, null, 6).replace(/"([^"]+)":/g, '$1:')},
      fontWeight: ${JSON.stringify(tokens.typography.fontWeight, null, 6).replace(/"([^"]+)":/g, '$1:')},
      lineHeight: ${JSON.stringify(tokens.typography.lineHeight, null, 6).replace(/"([^"]+)":/g, '$1:')},
      spacing: ${JSON.stringify(tokens.spacing, null, 6).replace(/"([^"]+)":/g, '$1:')},
      borderRadius: ${JSON.stringify(tokens.borderRadius, null, 6).replace(/"([^"]+)":/g, '$1:')},
      boxShadow: ${JSON.stringify(tokens.boxShadow, null, 6).replace(/"([^"]+)":/g, '$1:')},
      screens: ${JSON.stringify(tokens.screens, null, 6).replace(/"([^"]+)":/g, '$1:')},
    },
  },
  plugins: [],
}

export default config
`;
}

/**
 * Generate MUI theme from tokens
 */
function generateMuiTheme(tokens: NormalizedDesignTokens): string {
  // Convert tokens to MUI palette format
  const palette: any = {
    primary: {
      main: tokens.colors.primary?.['500'] || tokens.colors.primary?.DEFAULT || '#000',
    },
    secondary: {
      main: tokens.colors.secondary?.['500'] || tokens.colors.secondary?.DEFAULT || '#666',
    },
  };

  if (tokens.colors.error) {
    palette.error = {
      main: tokens.colors.error['500'] || tokens.colors.error.DEFAULT || '#f00',
    };
  }

  if (tokens.colors.warning) {
    palette.warning = {
      main: tokens.colors.warning['500'] || tokens.colors.warning.DEFAULT || '#ff0',
    };
  }

  if (tokens.colors.info) {
    palette.info = {
      main: tokens.colors.info['500'] || tokens.colors.info.DEFAULT || '#0ff',
    };
  }

  if (tokens.colors.success) {
    palette.success = {
      main: tokens.colors.success['500'] || tokens.colors.success.DEFAULT || '#0f0',
    };
  }

  return `import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: ${JSON.stringify(palette, null, 4)},
  typography: {
    fontFamily: ${JSON.stringify(tokens.typography.fontFamily.sans || ['system-ui', 'sans-serif'])},
    ${Object.entries(tokens.typography.fontSize)
      .map(([name, size]) => {
        const sizeValue = Array.isArray(size) ? size[0] : size;
        const lineHeight = Array.isArray(size) ? size[1]?.lineHeight : undefined;
        return `${name}: {
      fontSize: '${sizeValue}',${lineHeight ? `\n      lineHeight: '${lineHeight}',` : ''}
    }`;
      })
      .join(',\n    ')}
  },
  spacing: 4, // Base spacing unit (4px)
  shape: {
    borderRadius: ${parseInt(tokens.borderRadius.DEFAULT || '8')},
  },
  shadows: [
    'none',
    ${Object.values(tokens.boxShadow)
      .filter((s) => s !== 'none')
      .map((s) => `'${s}'`)
      .join(',\n    ')}
  ] as any,
});

export default theme;
`;
}

/**
 * Generate React Button component with Tailwind
 */
function generateReactTailwindButton(): string {
  return `import React from 'react';
import { cn } from '../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        {
          'bg-primary-500 text-white hover:bg-primary-600': variant === 'primary',
          'bg-secondary-500 text-white hover:bg-secondary-600': variant === 'secondary',
          'border-2 border-primary-500 text-primary-500 hover:bg-primary-50': variant === 'outline',
          'text-primary-500 hover:bg-primary-50': variant === 'ghost',
        },
        {
          'h-8 px-3 text-sm': size === 'sm',
          'h-10 px-4 text-base': size === 'md',
          'h-12 px-6 text-lg': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
`;
}

/**
 * Generate React Button component with MUI
 */
function generateReactMuiButton(): string {
  return `import React from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps } from '@mui/material';

interface ButtonProps extends Omit<MuiButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
}

export function Button({
  variant = 'primary',
  ...props
}: ButtonProps) {
  const muiVariant = variant === 'outline' ? 'outlined' : variant === 'text' ? 'text' : 'contained';
  const color = variant === 'primary' ? 'primary' : 'secondary';

  return (
    <MuiButton
      variant={muiVariant}
      color={color}
      {...props}
    />
  );
}
`;
}

/**
 * Generate cn utility for Tailwind (clsx + tailwind-merge)
 */
function generateCnUtil(): string {
  return `import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;
}

/**
 * Generate package.json dependencies
 */
function generatePackageJson(framework: string): string {
  const deps: Record<string, any> = {
    react: '^18.2.0',
    'react-dom': '^18.2.0',
  };

  const devDeps: Record<string, any> = {
    '@types/react': '^18.2.0',
    '@types/react-dom': '^18.2.0',
    typescript: '^5.3.0',
  };

  if (framework.includes('tailwind')) {
    deps.clsx = '^2.0.0';
    deps['tailwind-merge'] = '^2.0.0';
    devDeps.tailwindcss = '^3.4.0';
    devDeps.autoprefixer = '^10.4.0';
    devDeps.postcss = '^8.4.0';
  }

  if (framework.includes('mui')) {
    deps['@mui/material'] = '^5.14.0';
    deps['@emotion/react'] = '^11.11.0';
    deps['@emotion/styled'] = '^11.11.0';
  }

  return JSON.stringify(
    {
      name: 'design-system',
      version: '1.0.0',
      dependencies: deps,
      devDependencies: devDeps,
    },
    null,
    2
  );
}

/**
 * Generate README
 */
function generateReadme(framework: string, tokens: NormalizedDesignTokens): string {
  return `# Design System

Generated from: ${tokens.meta.source}
Framework: ${framework}
Generated at: ${new Date().toISOString()}

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

${
  framework.includes('tailwind')
    ? `### Tailwind CSS

Import the Tailwind config:

\`\`\`js
import config from './tailwind.config'
\`\`\`

Use in your components:

\`\`\`jsx
<div className="bg-primary-500 text-white p-4 rounded-md">
  Hello World
</div>
\`\`\`
`
    : ''
}

${
  framework.includes('mui')
    ? `### Material-UI

Wrap your app with the theme provider:

\`\`\`jsx
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      {/* Your app */}
    </ThemeProvider>
  );
}
\`\`\`
`
    : ''
}

### Components

Example Button component:

\`\`\`jsx
import { Button } from './components/Button';

<Button variant="primary" size="md">
  Click me
</Button>
\`\`\`

## Token Summary

- **Colors**: ${Object.keys(tokens.colors).length} scales
- **Typography**: ${Object.keys(tokens.typography.fontSize).length} sizes
- **Spacing**: ${Object.keys(tokens.spacing).length} values
- **Border Radius**: ${Object.keys(tokens.borderRadius).length} values
- **Shadows**: ${Object.keys(tokens.boxShadow).length} values
- **Breakpoints**: ${Object.keys(tokens.screens).length} values
`;
}

/**
 * Main codegen function
 */
export async function codegen(options: CodegenOptions): Promise<void> {
  console.log(`🎨 Starting code generation: ${options.framework}`);

  // Read normalized tokens
  const tokensData = await fs.readFile(options.input, 'utf-8');
  const tokens: NormalizedDesignTokens = JSON.parse(tokensData);

  const files: Array<{ path: string; content: string }> = [];

  // Generate config files
  if (options.framework.includes('tailwind')) {
    console.log('⚙️  Generating Tailwind config...');
    files.push({
      path: 'tailwind.config.ts',
      content: generateTailwindConfig(tokens),
    });
    files.push({
      path: 'src/utils/cn.ts',
      content: generateCnUtil(),
    });
  }

  if (options.framework.includes('mui')) {
    console.log('⚙️  Generating MUI theme...');
    files.push({
      path: 'src/theme.ts',
      content: generateMuiTheme(tokens),
    });
  }

  // Generate components
  console.log('🧩 Generating components...');
  if (options.framework === 'react-tailwind') {
    files.push({
      path: 'src/components/Button.tsx',
      content: generateReactTailwindButton(),
    });
  } else if (options.framework === 'react-mui') {
    files.push({
      path: 'src/components/Button.tsx',
      content: generateReactMuiButton(),
    });
  }

  // Generate package.json
  files.push({
    path: 'package.json',
    content: generatePackageJson(options.framework),
  });

  // Generate README
  files.push({
    path: 'README.md',
    content: generateReadme(options.framework, tokens),
  });

  // Write all files
  console.log('💾 Writing files...');
  for (const file of files) {
    const fullPath = path.join(options.out, file.path);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file.content);
    console.log(`   ✓ ${file.path}`);
  }

  console.log('✅ Code generation complete!');
  console.log(`\n📦 Generated files:`);
  files.forEach((f) => console.log(`   ${f.path}`));
  console.log(`\n🚀 Next steps:`);
  console.log(`   cd ${options.out}`);
  console.log(`   npm install`);
  console.log(`   # Start using your design system!`);
}
