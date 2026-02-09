import { defineConfig } from 'eslint/config'
import tseslint from '@electron-toolkit/eslint-config-ts'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import eslintReact from '@eslint-react/eslint-plugin'
import { reactRefresh } from 'eslint-plugin-react-refresh'

export default defineConfig(
  {
    ignores: [
      '**/node_modules',
      '**/dist',
      '**/out',
      'src/generated',
      'src/generated/**',
      '**/build',
      '**/storybook-static',
      '**/backups',
      '**/coverage',
      '**/.gemini'
    ]
  },
  tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    ...eslintReact.configs['recommended-typescript'],
    plugins: {
      'react-refresh': reactRefresh.plugin
    },
    rules: {
      ...reactRefresh.configs.vite.rules
    }
  },
  eslintConfigPrettier
)
