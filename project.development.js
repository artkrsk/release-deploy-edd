/**
 * Development-specific configuration overrides for `@arts/release-deploy-edd`.
 * @param {Object} baseConfig - The base configuration object
 * @returns {Object} - Modified configuration for development
 */
export default function (baseConfig) {
  // Create a deep copy to avoid modifying the original
  const config = JSON.parse(JSON.stringify(baseConfig))

  // Set environment
  config.currentEnvironment = 'development'

  // Development-specific settings
  config.build.sourcemap = false
  config.build.minify = false

  // Configure Sass for development
  config.sass.options.sourceMap = false
  config.sass.options.outputStyle = 'expanded'

  // Configure live reload for development
  config.liveReload.logLevel = 'debug'
  config.liveReload.reloadOnRestart = true

  // Configure WordPress plugin target
  config.wordpressPlugin.target =
    '/Users/art/Local Sites/dev/app/public/wp-content/plugins/release-deploy-edd'

  config.wordpressPlugin.debug = true

  // Enable debug logging
  config.wordpress.debug = true

  return config
}
