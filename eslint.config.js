import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import reactRefreshPlugin from './frontend/node_modules/eslint-plugin-react-refresh/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const requireFrontend = createRequire(path.join(__dirname, 'frontend', 'package.json'));

const pluginReact = requireFrontend('eslint-plugin-react');
const pluginReactHooks = requireFrontend('eslint-plugin-react-hooks');
const globals = requireFrontend('globals');

/** 从 frontend 包解析插件（React 相关依赖保留在子包） */
const reactRecommended = pluginReact.configs.flat.recommended;
const reactJsxRuntime = pluginReact.configs.flat['jsx-runtime'];
const reactHooksRecommended = pluginReactHooks.configs.flat.recommended;
const reactRefreshVite = reactRefreshPlugin.configs.vite;

export default tseslint.config(
  {
    ignores: [
      '.vscode/**',
      '.cursor/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/swagger/**',
      '**/*.config.js',
      'lint-staged.config.mjs',
      '**/generated/**',
      'backend/prisma/**',
      '**/*.d.ts',
      'backend/prisma/migrations/**',
      'backend/src/generated/**'
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    rules: {
      'no-console': 'warn',
      'no-debugger': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off'
    }
  },
  {
    files: ['backend/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off'
    }
  },
  {
    files: ['frontend/**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    plugins: {
      ...reactRecommended.plugins,
      ...reactHooksRecommended.plugins,
      ...reactRefreshVite.plugins
    },
    languageOptions: {
      ...reactRecommended.languageOptions,
      ...reactJsxRuntime.languageOptions,
      globals: {
        ...reactRecommended.languageOptions?.globals,
        ...reactJsxRuntime.languageOptions?.globals,
        ...globals.browser
      }
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      ...reactRecommended.rules,
      ...reactJsxRuntime.rules,
      ...reactHooksRecommended.rules,
      ...reactRefreshVite.rules,
      'react/prop-types': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn'
    }
  }
);
