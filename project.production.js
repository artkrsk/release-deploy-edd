/**
 * Production-specific configuration overrides for `@arts/release-deploy-edd`.
 * @param {Object} baseConfig - The base configuration object
 * @returns {Object} - Modified configuration for production
 */
export default function (baseConfig) {
  // Create a deep copy to avoid modifying the original
  const config = JSON.parse(JSON.stringify(baseConfig))

  // Set environment
  config.currentEnvironment = 'production'

  // Production settings
  config.build.sourcemap = false
  config.build.minify = true
  config.sass.options.sourceMap = false
  config.sass.options.outputStyle = 'compressed'
  config.liveReload.enabled = false
  config.wordpress.debug = false
  config.wordpressPlugin.debug = false

  return config
}
