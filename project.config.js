import process from 'node:process'

export default {
  slug: 'release-deploy-edd',
  versionConstant: 'ARTS_EDD_RD_PLUGIN_VERSION',
  defineKey: '__ARTS_RELEASE_DEPLOY_EDD_VERSION__',
  esbuildTarget: 'es2018',
  entry: { ts: './src/ts/index.ts', sass: './src/styles/index.scss' },
  bundles: [],
  bannerLines: [],
  zip: { budgetMb: 0.5 },
  paths: { php: './src/php', plugin: './src/wordpress-plugin', dist: './dist' },
  // Machine-specific: the Local site's plugin dir, from the gitignored .env (DEV_TARGET)
  devTarget: process.env.DEV_TARGET ?? null,
  // null = derived from the slug
  vendor: { autoloaderOnly: true, autoloaderSuffix: null },
  // The settings UI is React on WordPress's own runtime — bundling react inline
  // would load a second copy next to wp-admin's and break hooks state.
  // (@wordpress/date is deliberately absent: it was never externalized, WP core
  // doesn't guarantee wp.date on this screen, so it stays bundled.)
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM',
    '@wordpress/element': 'wp.element',
    '@wordpress/components': 'wp.components',
    '@wordpress/i18n': 'wp.i18n',
    '@wordpress/api-fetch': 'wp.apiFetch'
  },
  blueprint: null
}
