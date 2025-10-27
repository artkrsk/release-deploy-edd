import path from 'path'
import process from 'process'
import { isDevelopment } from '../../config/index.js'

/**
 * Path utility functions for the build system
 */

/**
 * Resolve a path that might be relative to the project root
 * @param {Object} config - Project configuration
 * @param {string} relativePath - Path that may be relative
 * @returns {string} Absolute path
 */
export function resolveProjectPath(config, relativePath) {
  if (path.isAbsolute(relativePath)) {
    return relativePath
  }

  // Use the stored absolute project root if available
  const projectRoot = config._absoluteProjectRoot || process.cwd()
  return path.resolve(projectRoot, relativePath)
}

/**
 * Get the library directory path based on environment
 * @param {Object} config - Project configuration
 * @param {boolean} [isDev=null] - Whether this is a development build (auto-detected if null)
 * @returns {string} Library directory path
 */
export function getLibraryDir(config, isDev = null) {
  // If isDev is not provided, detect from config
  if (isDev === null) {
    isDev = isDevelopment(config)
  }

  // For development, use the direct path within the WordPress plugin target if provided
  if (isDev && config.wordpressPlugin?.target) {
    return path.resolve(
      config.wordpressPlugin.target,
      'src/php',
      config.paths.library.base,
      config.paths.library.name
    )
  }

  // For production or if WordPress plugin target is not provided, use direct library path
  return getDirectLibraryPath(config)
}

/**
 * Get direct library path (where files are built)
 * @param {Object} config - Project configuration
 * @returns {string} Direct library path
 */
export function getDirectLibraryPath(config) {
  return path.resolve(config._absoluteProjectRoot, config.paths.library.assets)
}

/**
 * Get plugin path (supports variant-specific sources)
 * @param {Object} config - Project configuration
 * @param {string} [subpath] - Subpath within the plugin
 * @returns {string} The path to the plugin file or directory
 */
export function getPluginPath(config, subpath = '') {
  // Use variant-specific source if available, otherwise use default
  const pluginSource = config.wordpressPlugin?.source || config.paths.wordpress.plugin
  return path.join(resolveProjectPath(config, pluginSource), subpath)
}

/**
 * Get the plugin main file path
 * @param {Object} config - Project configuration
 * @returns {string} The path to the plugin main file
 */
export function getPluginMainFile(config) {
  const pluginFileName = `${config.wordpressPlugin.packageName}.php`
  return getPluginPath(config, pluginFileName)
}

/**
 * Get the distributable path
 * @param {Object} config - Project configuration
 * @param {string} [subpath] - Subpath within the dist directory
 * @returns {string} The path to the dist directory or file
 */
export function getDistPath(config, subpath = '') {
  return path.join(resolveProjectPath(config, config.paths.dist), subpath)
}

/**
 * Should create dist folder based on config
 * @param {Object} config - Project configuration
 * @returns {boolean} Whether to create the dist folder
 */
export function shouldCreateDistFolder(config) {
  // If explicitly set to false, don't create dist folder
  if (config.build?.createDistFolder === false) {
    return false
  }

  // In production mode or if explicitly enabled, create dist folder
  return !isDevelopment(config) || config.build?.createDistFolder === true
}

/**
 * Get the WordPress plugin destination path based on environment
 * @param {Object} config - Project configuration
 * @param {boolean} [isDev=null] - Whether this is a development build (auto-detected if null)
 * @returns {string} Plugin destination path
 */
export function getPluginDestPath(config, isDev = null) {
  // If isDev is not provided, detect from config
  if (isDev === null) {
    isDev = isDevelopment(config)
  }

  // In development, use plugin target if provided
  if (isDev && config.wordpressPlugin?.target) {
    return config.wordpressPlugin.target
  }

  // In production, use dist folder path (only if createDistFolder is not explicitly disabled)
  if (!isDev && shouldCreateDistFolder(config)) {
    return path.join(config.paths.dist, config.wordpressPlugin.packageName)
  }

  return null
}

/**
 * Get output file path for a specific format
 * @param {Object} config - Project configuration
 * @param {string} format - Build format ('cjs', 'iife', etc.)
 * @returns {string} The path to the output file
 */
export function getOutputFilePath(config, format) {
  // Skip if createDistFolder is explicitly disabled and we're not in dev mode
  if (!shouldCreateDistFolder(config) && !isDevelopment(config)) {
    return null
  }

  // Get filename based on format
  let filename
  if (format === 'esm') {
    filename = config.build.output.esm || 'index.mjs'
  } else if (format === 'cjs') {
    filename = config.build.output.cjs || 'index.cjs'
  } else if (format === 'iife') {
    filename = config.build.output.iife || 'index.iife.js'
  } else {
    filename = `index.${format}.js`
  }

  return path.resolve(config.paths.dist, filename)
}

/**
 * Get direct library output path for JS
 * @param {Object} config - Project configuration
 * @returns {string} Direct JS output path
 */
export function getDirectJsOutputPath(config) {
  return path.resolve(getDirectLibraryPath(config), 'index.umd.js')
}

/**
 * Get direct library output path for ESM
 * @param {Object} config - Project configuration
 * @returns {string} Direct ESM output path
 */
export function getDirectEsmOutputPath(config) {
  return path.resolve(getDirectLibraryPath(config), 'index.mjs')
}

/**
 * Get direct library output directory for chunks
 * @param {Object} config - Project configuration
 * @returns {string} Direct chunks output directory
 */
export function getDirectChunksOutputDir(config) {
  return getDirectLibraryPath(config)
}

/**
 * Get direct library output path for CSS
 * @param {Object} config - Project configuration
 * @returns {string} Direct CSS output path
 */
export function getDirectCssOutputPath(config) {
  return path.resolve(getDirectLibraryPath(config), 'index.css')
}

export default {
  resolveProjectPath,
  getLibraryDir,
  getPluginPath,
  getPluginMainFile,
  getDistPath,
  getPluginDestPath,
  getOutputFilePath,
  getDirectLibraryPath,
  getDirectJsOutputPath,
  getDirectEsmOutputPath,
  getDirectChunksOutputDir,
  getDirectCssOutputPath,
  shouldCreateDistFolder
}
