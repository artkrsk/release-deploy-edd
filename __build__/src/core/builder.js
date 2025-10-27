import path from 'path'
import { fileURLToPath } from 'url'
import process from 'process'
import { logger } from '../logger/index.js'
import { loadConfig as loadProjectConfig, validateConfig } from '../config/index.js'
import {
  getDirectLibraryPath,
  shouldCreateDistFolder,
  getLibraryDir
} from '../utils/common/paths.js'
import { getPackageVersion } from '../utils/common/package.js'
import fs from 'fs-extra'

// Core utilities
import { compileJavaScript, watchJavaScript } from '../utils/assets/javascript.js'
import { compileTypeScript, watchTypeScript } from '../utils/assets/typescript.js'
import { compileSass, watchSass } from '../utils/assets/sass.js'
import { cleanDirectories } from '../utils/filesystem/clean.js'
import { syncFiles, watchForFileChanges } from '../utils/filesystem/sync.js'
import { createZipArchive } from '../utils/filesystem/archive.js'
import { updatePluginMeta, watchComposerJson } from '../utils/wordpress/plugin-meta.js'
import { generatePot, watchPhpForTranslations } from '../utils/wordpress/i18n.js'
import { startLiveReloadServer } from '../utils/common/live-reload.js'

/**
 * Main Builder class for the Fluid Design System
 */
export class Builder {
  constructor() {
    // Use process.cwd() to get the actual project directory regardless of symlinks
    // This assumes the build script is always run from the project root
    const PROJECT_ROOT = process.cwd()

    // Get the actual build directory path by resolving from the current module
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const BUILD_DIR = path.resolve(__dirname, '..')

    this.config = null
    this.logger = logger
    this.paths = {
      project: PROJECT_ROOT,
      build: BUILD_DIR
    }
    this.liveReloadServer = null
    this.watchers = {}
  }

  /**
   * Load project configuration based on environment or variant
   * @param {string} env - Environment ('development', 'production') or variant name
   * @returns {Promise<Object>} Merged configuration object
   */
  async loadConfig(env = process.env.NODE_ENV || 'development') {
    try {
      // Load configuration
      logger.info(`📋 Loading configuration for "${env}" environment...`)
      this.config = await loadProjectConfig(this.paths.project, env)

      // Validate configuration
      validateConfig(this.config)

      logger.success(`✅ Configuration loaded for "${env}" environment`)
      return this.config
    } catch (error) {
      logger.error('❌ Failed to load configuration:', error)
      throw error
    }
  }

  /**
   * Ensure the required directories exist
   * @private
   */
  async ensureDirectories() {
    try {
      // Ensure library directory exists
      const directLibraryPath = getDirectLibraryPath(this.config)
      if (directLibraryPath) {
        await fs.ensureDir(directLibraryPath)
        logger.debug(`📁 Created library directory: ${directLibraryPath}`)
      }

      // Ensure languages directory exists for i18n
      if (this.config.i18n?.enabled && this.config.i18n?.dest) {
        const langDir = path.dirname(this.config.i18n.dest)
        await fs.ensureDir(langDir)
        logger.debug(`📁 Created languages directory: ${langDir}`)
      }

      // Only create dist directory if explicitly enabled
      if (shouldCreateDistFolder(this.config)) {
        await fs.ensureDir(this.config.paths.dist)
        logger.debug(`📁 Created dist directory: ${this.config.paths.dist}`)
      }
    } catch (error) {
      logger.warn(`⚠️ Failed to ensure directories: ${error.message}`)
    }
  }

  /**
   * Remove dist folder if it exists and shouldn't be created
   * @private
   */
  async cleanupDistFolder() {
    if (!shouldCreateDistFolder(this.config) && this.config.paths.dist) {
      const distPath = this.config.paths.dist
      if (await fs.pathExists(distPath)) {
        try {
          await fs.remove(distPath)
          logger.debug(`🧹 Removed unnecessary dist folder: ${distPath}`)
        } catch (error) {
          logger.warn(`⚠️ Failed to remove dist folder: ${error.message}`)
        }
      }
    }
  }

  /**
   * Check if TypeScript compilation is enabled
   * @private
   * @returns {Promise<boolean>} Whether TypeScript compilation is enabled
   */
  async isTypeScriptEnabled() {
    try {
      // Check if TypeScript is explicitly enabled in config
      if (this.config.ts?.enabled === true) {
        return true
      }

      // Check if TypeScript entry file exists
      if (this.config.ts?.entry) {
        const entryPath = path.isAbsolute(this.config.ts.entry)
          ? this.config.ts.entry
          : path.resolve(this.config._absoluteProjectRoot, this.config.ts.entry)

        if (await fs.pathExists(entryPath)) {
          logger.info(
            `Found TypeScript entry file: ${path.relative(this.config._absoluteProjectRoot, entryPath)}`
          )
          return true
        }
      }

      // Check if tsconfig.json exists
      const tsconfigPath = path.isAbsolute(this.config.ts?.tsconfigPath || 'tsconfig.json')
        ? this.config.ts?.tsconfigPath || 'tsconfig.json'
        : path.resolve(
            this.config._absoluteProjectRoot,
            this.config.ts?.tsconfigPath || 'tsconfig.json'
          )

      if (await fs.pathExists(tsconfigPath)) {
        // Only auto-enable if the primary JS entry point doesn't exist but TS version does
        const jsEntryPath = path.isAbsolute(this.config.entry)
          ? this.config.entry
          : path.resolve(this.config._absoluteProjectRoot, this.config.entry)

        const tsEntryPath = jsEntryPath.replace(
          new RegExp(`${this.config.ts?.jsExtension || '.js'}$`),
          this.config.ts?.extension || '.ts'
        )

        const jsExists = await fs.pathExists(jsEntryPath)
        const tsExists = await fs.pathExists(tsEntryPath)

        if (!jsExists && tsExists) {
          logger.info(
            `JS entry not found but TS entry exists, enabling TypeScript: ${path.relative(this.config._absoluteProjectRoot, tsEntryPath)}`
          )
          return true
        }
      }

      return false
    } catch (error) {
      logger.warn(`Error detecting TypeScript, defaulting to disabled: ${error.message}`)
      return false
    }
  }

  /**
   * Run the build process for production
   * @param {string} [variant] - Optional variant name (e.g., 'free', 'pro')
   */
  async build(variant = null) {
    try {
      if (!this.config) {
        const configEnv = variant || 'production'
        await this.loadConfig(configEnv)
      }

      logger.info('🚀 Starting production build...')

      // Get package version
      const version = await getPackageVersion(this.paths.project)
      this.config.version = version

      // Ensure required directories exist
      await this.ensureDirectories()

      // Clean directories (will respect createDistFolder setting)
      await cleanDirectories(this.config)

      // Update plugin metadata based on composer.json if we're creating dist folder
      if (shouldCreateDistFolder(this.config)) {
        await updatePluginMeta(this.config)
      }

      // Check if TypeScript is enabled
      const useTypeScript = await this.isTypeScriptEnabled()

      if (useTypeScript) {
        // Compile TypeScript if enabled
        await compileTypeScript(this.config)
      } else {
        // Compile JavaScript if TypeScript is not enabled
        await compileJavaScript(this.config)
      }

      // Compile Sass (will build to direct library or dist based on config)
      await compileSass(this.config)

      // Generate POT file
      await generatePot(this.config)

      // Sync files to target directories (if any)
      await syncFiles(this.config, false)

      // Force copy library files to ensure they're in the right place
      if (shouldCreateDistFolder(this.config)) {
        logger.info('🔄 Ensuring library files are correctly placed...')

        const libraryDir = getLibraryDir(this.config, false)

        // Log what we're going to copy for debugging
        logger.debug(`📂 Making sure library directory exists: ${libraryDir}`)
        await fs.ensureDir(libraryDir)

        // Create ZIP archive
        await createZipArchive(this.config)
      } else {
        // Make sure no dist folder exists if it shouldn't
        await this.cleanupDistFolder()
      }

      logger.success('✨ Build completed successfully!')
    } catch (error) {
      logger.error('❌ Build failed:', error)
      throw error
    }
  }

  /**
   * Start development mode with file watching
   * @param {string} [variant] - Optional variant name (e.g., 'free', 'pro')
   */
  async dev(variant = null) {
    try {
      if (!this.config) {
        const configEnv = variant || 'development'
        await this.loadConfig(configEnv)
      }

      logger.info('🔧 Starting development mode...')

      // Ensure required directories exist
      await this.ensureDirectories()

      // Clean directories
      await cleanDirectories(this.config)

      // Update plugin metadata based on composer.json if we're using WordPress plugin
      if (this.config.wordpressPlugin?.target) {
        await updatePluginMeta(this.config)
      }

      // Check if TypeScript is enabled
      const useTypeScript = await this.isTypeScriptEnabled()

      // Initial builds
      if (useTypeScript) {
        await compileTypeScript(this.config)
      } else {
        await compileJavaScript(this.config)
      }

      await compileSass(this.config)
      await generatePot(this.config)

      // Start live reload server if enabled
      this.liveReloadServer = await startLiveReloadServer(this.config)

      // Initial sync of files
      await syncFiles(this.config, true)

      // Clean up dist folder if not needed
      if (!shouldCreateDistFolder(this.config)) {
        await this.cleanupDistFolder()
      }

      // Set up watchers
      if (useTypeScript) {
        this.watchers.ts = await watchTypeScript(this.config, this.liveReloadServer)
      } else {
        this.watchers.js = await watchJavaScript(this.config, this.liveReloadServer)
      }

      this.watchers.sass = await watchSass(this.config, this.liveReloadServer)
      this.watchers.php = await watchPhpForTranslations(this.config)
      this.watchers.composer = await watchComposerJson(this.config)
      this.watchers.files = await watchForFileChanges(this.config, this.liveReloadServer)

      logger.success('✨ Development mode started')
      logger.info('⛔ Press Ctrl+C to stop')

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        this.shutdown()
        process.exit(0)
      })
    } catch (error) {
      logger.error('❌ Development mode failed to start:', error)
      throw error
    }
  }

  /**
   * Shut down all running services
   */
  shutdown() {
    logger.info('🛑 Shutting down...')

    // Close all watchers
    Object.keys(this.watchers).forEach((key) => {
      if (this.watchers[key] && typeof this.watchers[key].close === 'function') {
        this.watchers[key].close()
        this.watchers[key] = null
      }
    })

    // Close live reload server if running
    if (this.liveReloadServer) {
      this.liveReloadServer.close()
      this.liveReloadServer = null
    }

    logger.info('👋 Shutdown complete')
  }
}

export default Builder
