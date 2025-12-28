import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/e2e/**',
      '**/*.e2e.ts',
      '**/*.e2e.spec.ts',
      // Temporarily exclude tests that need refactoring from Jest to Vitest
      // or are missing dependencies / have complex retry logic
      '**/ChatInterface.test.tsx',
      '**/DeployCanvas.test.tsx',
      '**/paperTrading.test.ts',
      '**/hyperliquid.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/components/ui/**', // Shadcn UI 组件
        '**/*.config.*',
        '**/types/**',
        '**/*.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
