import { createVitestConfig } from '@arts/wp-plugin-tooling/vitest'
import { defineConfig } from 'vitest/config'

const shared = createVitestConfig({
  defineKey: '__ARTS_RELEASE_DEPLOY_EDD_VERSION__',
  setupFiles: ['tests/ts/setup.ts']
})

export default defineConfig({
  ...shared,
  test: {
    ...shared.test,
    // React Testing Library against WordPress components needs a DOM.
    environment: 'jsdom',
    globals: true,
    include: ['tests/ts/**/*.test.ts']
  }
})
