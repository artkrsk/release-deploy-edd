import { build as viteBuild } from 'vite' // Use vite build
import fs from 'fs-extra'
import path from 'path'
import chokidar from 'chokidar'
import debounce from 'debounce'
import { logger } from '../../logger/index.js'
import { generateBanner } from '../common/banner.js' // Keep banner generation
import { getPackageMetadata } from '../common/version.js'
import {
  getLibraryDir,
  // getOutputFilePath, // No longer needed for specific formats
  // getDirectJsOutputPath, // We'll use getLibraryDir directly
  // getDirectEsmOutputPath, // No longer needed
  // getDirectChunksOutputDir, // No longer needed
  shouldCreateDistFolder // Keep this logic if relevant elsewhere, but Vite handles output dir
} from '../common/paths.js'
import { isDevelopment, getConfigValue } from '../../config/index.js'

// Define a temporary directory for Vite builds
const getViteTempOutputDir = (config) => {
  return path.join(config._absoluteProjectRoot, '__build__', 'temp_vite_build')
}

/**
 * Compile TypeScript files using Vite
 * @param {Object} config - Project configuration
 * @returns {Promise<void>}
 */
export async function compileTypeScript(config) {
  logger.info('🔧 Compiling TypeScript with Vite...')

  const isDev = isDevelopment(config)
  const packageMetadata = await getPackageMetadata(config)
  const viteTempOutputDir = getViteTempOutputDir(config)
  const finalOutputDir = getLibraryDir(config, isDev) // Target WP library dir

  try {
    // Get entry point from config
    const entryPoint =
      getConfigValue(config, 'ts.entry', null) ||
      getConfigValue(config, 'entry', './src/js/index.js').replace(
        new RegExp(`${getConfigValue(config, 'ts.jsExtension', '.js')}$`),
        getConfigValue(config, 'ts.extension', '.ts')
      )

    // Get tsconfig path from config or use default
    const tsconfigPath = getConfigValue(config, 'ts.tsconfigPath', 'tsconfig.json')
    const tsconfigFullPath = path.isAbsolute(tsconfigPath)
      ? tsconfigPath
      : path.join(config._absoluteProjectRoot, tsconfigPath)

    // --- Vite Build Configuration ---
    const viteConfig = {
      configFile: false, // Don't look for vite.config.js
      root: config._absoluteProjectRoot, // Project root for resolving paths
      build: {
        lib: {
          entry: path.resolve(config._absoluteProjectRoot, entryPoint),
          name: config.build.umd.name, // UMD global name
          formats: ['umd'], // Build only UMD for wp_enqueue_script
          fileName: (format) => `index.${format}.js` // Output filename pattern
        },
        outDir: viteTempOutputDir, // Build to temporary directory first
        sourcemap: isDev,
        minify: !isDev ? 'terser' : false,
        emptyOutDir: true, // Clean temp dir before build
        target: config.build.target,
        rollupOptions: {
          external: Object.keys(config.build.externals || {}),
          output: {
            globals: config.build.externals, // Map externals to globals for UMD
            // Consistent chunk naming for easier copying
            chunkFileNames: 'chunks/[name]-[hash].umd.js',
            // Consistent asset naming (e.g., CSS)
            assetFileNames: (assetInfo) => {
              // If CSS is bundled via TS/JS import, name it index.css
              if (assetInfo.name && assetInfo.name.endsWith('.css')) {
                return 'index.css'
              }
              return 'assets/[name]-[hash][extname]'
            },
            banner: generateBanner(packageMetadata), // Add banner using Vite's option
            inlineDynamicImports: false
          }
        },
        terserOptions: !isDev
          ? {
              compress: {
                drop_console: true
              },
              format: {
                comments: false // Remove comments in production
              }
            }
          : {}
      },
      // Add tsconfig path if it exists
      ...((await fs.pathExists(tsconfigFullPath)) ? { tsconfig: tsconfigFullPath } : {}),
      // Add any additional Vite options from config (optional)
      ...getConfigValue(config, 'ts.viteOptions', {})
    }
    // --- End Vite Build Configuration ---

    // Run Vite build
    await viteBuild(viteConfig)

    logger.success(`✅ Vite UMD build completed in: ${viteTempOutputDir}`)

    // Sync Vite output to the final WordPress library directory
    await syncViteOutputToLibrary(viteTempOutputDir, finalOutputDir, isDev)

    logger.success('🎉 TypeScript compilation and sync completed')
  } catch (error) {
    logger.error('❌ TypeScript compilation failed:', error)
    // Clean up temp dir on error (but keep it for debugging now)
    // await fs.remove(viteTempOutputDir)
    logger.warn(`⚠️ Temporary build directory NOT removed after error: ${viteTempOutputDir}`)
    throw error
  }
}

/**
 * Sync Vite build output from temporary dir to the final library directory.
 * @param {string} sourceDir - Temporary Vite output directory
 * @param {string} targetDir - Final library directory (e.g., src/php/libraries/...)
 * @param {boolean} isDev - Whether this is a development build (for sourcemaps)
 * @returns {Promise<void>}
 */
async function syncViteOutputToLibrary(sourceDir, targetDir, isDev) {
  logger.info(`📂 Syncing build output from ${sourceDir} to ${targetDir}...`)

  try {
    // Ensure target directory exists
    await fs.ensureDir(targetDir)

    // Read all files/dirs in the source directory
    const items = await fs.readdir(sourceDir)
    logger.debug(`  Items found in temp dir (${sourceDir}): ${items.join(', ')}`) // Log items found

    for (const item of items) {
      const sourcePath = path.join(sourceDir, item)
      const targetPath = path.join(targetDir, item)
      const stats = await fs.stat(sourcePath)

      if (stats.isDirectory()) {
        // Recursively copy directories (e.g., chunks, assets)
        logger.debug(`  Attempting to copy directory: ${item}`) // Log directory copy attempt
        await fs.copy(sourcePath, targetPath, { overwrite: true })
        logger.debug(`  Copied directory: ${item}`)
      } else if (stats.isFile()) {
        // Copy individual files (e.g., index.umd.js, index.css)
        await fs.copyFile(sourcePath, targetPath)
        logger.debug(`  Copied file: ${item}`)

        // Copy corresponding sourcemap if it exists and in development mode
        const sourceMapPath = `${sourcePath}.map`
        if (isDev && (await fs.pathExists(sourceMapPath))) {
          await fs.copyFile(sourceMapPath, `${targetPath}.map`)
          logger.debug(`  Copied sourcemap: ${item}.map`)
        }
      }
    }

    // --- TEMPORARY CHANGE: Comment out cleanup for debugging ---
    // await fs.remove(sourceDir)
    // logger.debug(`🗑️ Removed temporary build directory: ${sourceDir}`)
    logger.warn(`⚠️ Temporary build directory NOT removed for debugging: ${sourceDir}`) // Add warning
    // --- END TEMPORARY CHANGE ---

    logger.success(`✅ Sync complete to: ${targetDir}`)
  } catch (error) {
    logger.error(`❌ Failed to sync build output to ${targetDir}:`, error)
    // Attempt to clean up temp dir even on sync error
    // --- TEMPORARY CHANGE: Comment out cleanup on error too ---
    // await fs.remove(sourceDir).catch(() => {}) // Ignore errors during cleanup on error
    logger.warn(`⚠️ Temporary build directory NOT removed after error: ${sourceDir}`) // Add warning
    // --- END TEMPORARY CHANGE ---
    throw error // Re-throw the sync error
  }
}

/**
 * Watch TypeScript files for changes
 * @param {Object} config - Project configuration
 * @param {Object} liveReloadServer - Live reload server instance
 * @returns {Object} - Watcher instance
 */
export async function watchTypeScript(config, liveReloadServer) {
  // Determine TypeScript directory from config
  const tsDir = path.resolve(getConfigValue(config, 'paths.ts', config.paths.js))

  logger.info(`👀 Watching TypeScript files in ${path.relative(process.cwd(), tsDir)}`)

  // Get file extensions to watch from config or use defaults
  const extensions = getConfigValue(config, 'ts.watchExtensions', ['.ts', '.tsx'])

  // Create debounced build function
  const debouncedBuild = debounce(
    async (filePath) => {
      logger.info(`🔄 TypeScript file changed: ${path.relative(process.cwd(), filePath)}`)

      try {
        await compileTypeScript(config) // This now uses Vite and syncs

        // Notify live reload server *after* files are synced to the final location
        if (liveReloadServer) {
          const finalOutputDir = getLibraryDir(config, true) // Get dev library dir
          const mainJsFile = path.join(finalOutputDir, 'index.umd.js') // Main UMD file
          const mainCssFile = path.join(finalOutputDir, 'index.css') // Main CSS file (if exists)

          // Notify for the main JS file
          liveReloadServer.notifyChange(mainJsFile)

          // Notify for CSS file if it exists after build
          if (await fs.pathExists(mainCssFile)) {
            liveReloadServer.notifyChange(mainCssFile)
          }
          // Note: LiveReload might automatically pick up chunk changes if watching the whole dir,
          // but explicitly notifying for the main entry point is usually sufficient.
        }
      } catch (error) {
        // Error is already logged in compileTypeScript/syncViteOutputToLibrary
        // logger.error('❌ Failed to rebuild TypeScript files:', error)
      }
    },
    getConfigValue(config, 'ts.debounceTime', 300)
  )

  // Setup watcher with configurable options
  const watcherOptions = {
    ignored: getConfigValue(config, 'watch.ignored', [
      '**/node_modules/**',
      '**/dist/**',
      '**/__build__/temp_vite_build/**' // Ignore the temp build dir
    ]),
    persistent: true,
    ignoreInitial: true,
    ignorePermissionErrors: getConfigValue(config, 'ts.ignorePermissionErrors', true)
  }

  // Add any additional watcher options from config
  const additionalOptions = getConfigValue(config, 'ts.watcherOptions', {})
  Object.assign(watcherOptions, additionalOptions)

  // Create the watcher - watch the source TS directory
  const watcher = chokidar.watch(tsDir, watcherOptions)

  watcher.on('change', debouncedBuild)
  watcher.on('add', debouncedBuild) // Also trigger on new file additions
  watcher.on('unlink', debouncedBuild) // Also trigger on file deletions
  watcher.on('error', (error) => {
    logger.error(`❌ TypeScript watcher error:`, error)
  })

  return watcher
}

// Remove unused functions related to esbuild/manual UMD wrapping/ESM handling
// - wrapTsAsUmd
// - copyUmdToLibrary
// - copyEsmToLibrary

export default {
  compileTypeScript,
  watchTypeScript
}
