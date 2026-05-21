import fs from 'fs-extra'
import path from 'path'
import { logger } from '../logger/index.js'
import { handleBuildError } from '../logger/error-handler.js'

/**
 * Default environment fallbacks
 */
const DEFAULT_ENV = process.env.NODE_ENV || 'development'
const CONFIG_FILENAME = 'project.config.js'

/**
 * Load project configuration based on environment or variant
 * @param {string} projectRoot - Path to the project root
 * @param {string} [env=DEFAULT_ENV] - Environment name ('development', 'production') or variant name
 * @returns {Promise<Object>} Merged configuration object
 */
export async function loadConfig(projectRoot, env = DEFAULT_ENV) {
  try {
    logger.info(`Loading configuration for ${env} environment...`)

    // Ensure we have absolute paths
    const absoluteProjectRoot = path.isAbsolute(projectRoot)
      ? projectRoot
      : path.resolve(process.cwd(), projectRoot)

    // Load base configuration
    const configPath = path.join(absoluteProjectRoot, CONFIG_FILENAME)
    if (!(await fs.pathExists(configPath))) {
      throw new Error(`Configuration file not found: ${configPath}`)
    }

    // Use file:// URL format for dynamic imports to ensure they work with symlinks
    const configFileUrl = new URL(`file://${configPath}`).href
    const baseConfig = (await import(configFileUrl)).default

    // Load environment-specific or variant-specific configuration
    const envConfigPath = path.join(absoluteProjectRoot, `project.${env}.js`)
    if (!(await fs.pathExists(envConfigPath))) {
      // If variant config doesn't exist, try to fall back to development config for variants
      const isVariant = !['development', 'production'].includes(env)
      if (isVariant) {
        const fallbackPath = path.join(absoluteProjectRoot, 'project.development.js')
        if (await fs.pathExists(fallbackPath)) {
          logger.warn(
            `Variant config not found: ${envConfigPath}, using development config as fallback`
          )
          const fallbackConfigFileUrl = new URL(`file://${fallbackPath}`).href
          const fallbackConfig = (await import(fallbackConfigFileUrl)).default
          const mergedConfig = fallbackConfig(baseConfig)
          mergedConfig.currentVariant = env
          mergedConfig._absoluteProjectRoot = absoluteProjectRoot
          return mergedConfig
        }
      }
      throw new Error(`Configuration not found: ${envConfigPath}`)
    }

    const envConfigFileUrl = new URL(`file://${envConfigPath}`).href
    const envConfig = (await import(envConfigFileUrl)).default

    // Apply environment config to base config
    const mergedConfig = envConfig(baseConfig)

    // Set environment in config
    mergedConfig.currentEnvironment = env

    // Store the absolute project root in the config for reference
    mergedConfig._absoluteProjectRoot = absoluteProjectRoot

    // Initialize TypeScript config if not present
    if (!mergedConfig.ts) {
      // Check for presence of tsconfig.json to auto-enable
      const tsconfigPath = path.join(absoluteProjectRoot, 'tsconfig.json')
      const hasTsConfig = await fs.pathExists(tsconfigPath)

      // Build default TypeScript configuration
      mergedConfig.ts = {
        enabled: hasTsConfig,
        // Default entry point is the same as JS but with .ts extension
        entry: mergedConfig.entry
          ? mergedConfig.entry.replace(/\.(js|jsx)$/, '.ts')
          : './src/js/index.ts',
        // Default TypeScript directory is the same as JS directory
        directory: mergedConfig.paths?.js || './src/js',
        // Configuration for file extensions
        extension: '.ts',
        jsExtension: '.js',
        watchExtensions: ['.ts', '.tsx'],
        // TypeScript compiler options
        tsconfigPath: 'tsconfig.json',
        // Format used in development mode
        devFormat: 'iife',
        // Default loaders for esbuild
        loaders: {
          '.ts': 'ts',
          '.tsx': 'tsx'
        },
        // Watcher options
        debounceTime: 300,
        ignorePermissionErrors: true,
        // Additional esbuild options
        esbuildOptions: {}
      }
    }

    logger.success(`Loaded configuration for ${env} environment`)
    return mergedConfig
  } catch (error) {
    handleBuildError(error, 'configuration loading')
    throw error
  }
}

/**
 * Validate required configuration values
 * @param {Object} config - Configuration object to validate
 * @returns {boolean} True if valid, throws Error if invalid
 */
export function validateConfig(config) {
  // Essential configurations that must be present
  const requiredFields = [
    'name',
    'entry',
    'paths.dist',
    'paths.php',
    'paths.styles',
    'paths.wordpress.plugin',
    'paths.library.assets',
    'wordpressPlugin.packageName'
  ]

  for (const field of requiredFields) {
    const parts = field.split('.')
    let value = config

    for (const part of parts) {
      value = value?.[part]
      if (value === undefined) {
        throw new Error(`Missing required configuration: ${field}`)
      }
    }
  }

  // Check if TypeScript is explicitly enabled
  if (config.ts?.enabled === true) {
    logger.info('TypeScript compilation is enabled')

    // Check entry point
    if (!config.ts.entry) {
      logger.warn('TypeScript entry point not specified, using default derived from JS entry')
      config.ts.entry = config.entry.replace(
        new RegExp(`${config.ts.jsExtension || '.js'}$`),
        config.ts.extension || '.ts'
      )
    }

    // Ensure TypeScript config path is valid
    const tsconfigPath = path.isAbsolute(config.ts.tsconfigPath)
      ? config.ts.tsconfigPath
      : path.join(config._absoluteProjectRoot, config.ts.tsconfigPath || 'tsconfig.json')

    if (!fs.existsSync(tsconfigPath)) {
      logger.warn(`TypeScript config file not found at ${tsconfigPath}, will use esbuild defaults`)
    }
  }

  return true
}

export default {
  loadConfig,
  validateConfig
}
