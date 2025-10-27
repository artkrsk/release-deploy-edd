import fs from 'fs-extra'
import path from 'path'
import { logger } from '../../logger/index.js'
import {
  getLibraryDir,
  getPluginDestPath,
  shouldCreateDistFolder,
  getDirectLibraryPath,
  getDirectChunksOutputDir
} from '../common/paths.js'
import { isDevelopment } from '../../config/index.js'

/**
 * Clean specified directories based on configuration
 * @param {Object} config - Project configuration
 * @returns {Promise<void>}
 */
export async function cleanDirectories(config) {
  const isDev = isDevelopment(config)

  // Start with base paths to clean
  const cleanPaths = []

  // Add dist directory in production mode if createDistFolder is not explicitly disabled
  if (!isDev && shouldCreateDistFolder(config)) {
    cleanPaths.push(config.paths.dist)
  }

  // Add target directories from WordPress config
  if (config.wordpress?.targets && config.wordpress.targets.length) {
    cleanPaths.push(...config.wordpress.targets)
  }

  // Add WordPress plugin target if configured (for dev mode)
  if (isDev && config.wordpressPlugin?.target) {
    cleanPaths.push(config.wordpressPlugin.target)
  }

  // Ensure library directory for direct output
  const directLibraryPath = getDirectLibraryPath(config)
  if (directLibraryPath) {
    await fs.ensureDir(directLibraryPath)
  }

  logger.info('🧹 Cleaning directories...')

  for (const dirPath of cleanPaths) {
    try {
      await cleanDirectory(dirPath)
    } catch (error) {
      logger.warn(`⚠️ Failed to clean directory ${dirPath}: ${error.message}`)
    }
  }

  // Clean specific files from library directory (both UMD and ESM files)
  await cleanLibraryFiles(config)

  // Ensure necessary subdirectories exist
  await ensurePluginDirectories(config)

  // Ensure the languages directory exists without deleting its contents
  if (config.i18n?.enabled) {
    const langDir = path.dirname(config.i18n.dest)
    await fs.ensureDir(langDir)
    logger.debug(`📁 Ensured languages directory exists: ${langDir}`)
  }

  logger.success('✅ Directories cleaned successfully')
}

/**
 * Clean library files including both UMD and ESM files with chunks
 * @param {Object} config - Project configuration
 * @returns {Promise<void>}
 */
async function cleanLibraryFiles(config) {
  const directLibraryPath = getDirectLibraryPath(config)
  if (!directLibraryPath || !(await fs.pathExists(directLibraryPath))) {
    return
  }

  try {
    const files = await fs.readdir(directLibraryPath)

    // Get patterns to match JS/ESM files and chunks
    // Include both index.mjs and index.js to handle transitional states
    const jsPatterns = ['index.umd.js', 'index.mjs', 'index.js', 'chunk.*.mjs', 'chunk.*.js']

    // Get patterns for sourcemaps
    const mapPatterns = jsPatterns.map((pattern) => `${pattern}.map`)

    // Combine all patterns
    const allPatterns = [...jsPatterns, ...mapPatterns]

    // Find files to delete
    const filesToDelete = files.filter((file) => {
      return allPatterns.some((pattern) => {
        if (pattern.includes('*')) {
          // Handle wildcard pattern
          const regex = new RegExp('^' + pattern.replace('*', '.*') + '$')
          return regex.test(file)
        } else {
          // Direct match
          return file === pattern
        }
      })
    })

    // Delete each matched file
    for (const file of filesToDelete) {
      const filePath = path.join(directLibraryPath, file)
      await fs.remove(filePath)
      logger.debug(`🧹 Removed stale file: ${filePath}`)
    }

    logger.debug(`🧹 Cleaned library files in ${directLibraryPath}`)
  } catch (error) {
    logger.warn(`⚠️ Failed to clean library files: ${error.message}`)
  }
}

/**
 * Ensure plugin directories exist with proper structure
 * @param {Object} config - Project configuration
 * @returns {Promise<void>}
 */
async function ensurePluginDirectories(config) {
  // Get library directory based on environment
  const libraryDir = getLibraryDir(config)
  await fs.ensureDir(libraryDir)

  // Ensure direct library directory exists
  const directLibraryPath = getDirectLibraryPath(config)
  if (directLibraryPath) {
    await fs.ensureDir(directLibraryPath)
  }

  // Ensure chunks directory exists
  const chunksDir = getDirectChunksOutputDir(config)
  if (chunksDir) {
    await fs.ensureDir(chunksDir)
  }

  // Ensure WordPress plugin directory exists if target is set
  if (config.wordpressPlugin?.target) {
    const pluginDir = getPluginDestPath(config)
    await fs.ensureDir(pluginDir)
  }
}

/**
 * Clean a specific directory
 * @param {string} dirPath - Directory path to clean
 * @returns {Promise<void>}
 */
export async function cleanDirectory(dirPath) {
  try {
    if (await fs.pathExists(dirPath)) {
      await fs.emptyDir(dirPath)
      logger.debug(`🧹 Cleaned directory: ${dirPath}`)
    } else {
      await fs.ensureDir(dirPath)
      logger.debug(`📁 Created directory: ${dirPath}`)
    }
  } catch (error) {
    logger.warn(`⚠️ Failed to clean directory ${dirPath}: ${error.message}`)
    throw error
  }
}

export default {
  cleanDirectories,
  cleanDirectory
}
