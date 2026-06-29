import { defineConfig } from 'vitest/config'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/ts/setup.ts'],
    globals: true,

    exclude: ['node_modules/**', 'dist/**', '__build__/**'],

    coverage: {
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.d.ts',
        '**/index.ts',
        'src/global.d.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/ts'),
      '@arts/release-deploy-core': resolve(__dirname, '../packages/release-deploy-core/src')
    }
  }
})
