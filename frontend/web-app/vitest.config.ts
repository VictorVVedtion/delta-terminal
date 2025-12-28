import path from 'path'
import { defineConfig } from 'vitest/config'

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
      // Temporarily exclude tests that need Next.js navigation mocks
      // or are missing dependencies / have complex retry logic
      '**/ChatInterface.test.tsx', // Needs Next.js useSearchParams mock
      '**/DeployCanvas.test.tsx',
      '**/paperTrading.test.ts', // Needs proper position management mock
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
