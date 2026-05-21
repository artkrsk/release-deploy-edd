import { build } from 'esbuild'
import fs from 'fs-extra'
import path from 'path'
import chokidar from 'chokidar'
import debounce from 'debounce'
import { logger } from '../../logger/index.js'
import { generateBanner, wrapAsUmd } from '../common/banner.js'
import { getPackageMetadata } from '../common/version.js'
import {
  getLibraryDir,
  getOutputFilePath,
  getDirectJsOutputPath,
  getDirectEsmOutputPath,
  getDirectChunksOutputDir,
  shouldCreateDistFolder
} from '../common/paths.js'
import { isDevelopment } from '../../config/index.js'

/**
 * Compile JavaScript files
 * @param {Object} config - Project configuration
 * @returns {Promise<void>}
 */
export async function compileJavaScript(config) {
  logger.info('🔧 Compiling JavaScript...')

  const isDev = isDevelopment(config)
  const shouldCreateDist = shouldCreateDistFolder(config)

  // In development, always include ESM format for code splitting
  const formats = isDev
    ? ['iife', 'esm']
    : shouldCreateDist
      ? config.build.formats
      : ['iife', 'esm']

  try {
    const packageMetadata = await getPackageMetadata(config)

    // Process each format
    for (const format of formats) {
      logger.debug(`⚙️ Building ${format} format...`)

      // Skip non-IIFE/non-ESM formats if we're not creating a dist folder
      if (format !== 'esm' && format !== 'iife' && !shouldCreateDist) {
        logger.debug(`⏩ Skipping ${format} format (dist folder disabled)`)
        continue
      }

      // Determine output file based on format and dist folder setting
      let outputFile
      if (format === 'iife') {
        // Always use direct library path for IIFE builds
        outputFile = getDirectJsOutputPath(config)
      } else if (format === 'esm') {
        // Use ESM specific output path for ESM builds
        outputFile = getDirectEsmOutputPath(config)
      } else {
        // Only use dist path for other formats when dist folder is enabled
        outputFile = getOutputFilePath(config, format)
      }

      const outputDir = path.dirname(outputFile)

      // Ensure output directory exists
      await fs.ensureDir(outputDir)

      // Create build configuration
      const buildConfig = {
        entryPoints: [config.entry],
        outfile: outputFile,
        bundle: true,
        minify: !isDev,
        sourcemap: isDev,
        target: config.build.target,
        format,
        globalName: format === 'iife' ? config.build.umd.name : undefined,
        external: Object.keys(config.build.externals || {}),
        banner: {
          js: generateBanner(packageMetadata)
        }
      }

      // Enable code splitting for ESM format
      if (format === 'esm') {
        // For ESM, use outdir instead of outfile to enable code splitting
        delete buildConfig.outfile
        buildConfig.outdir = format === 'esm' ? getDirectChunksOutputDir(config) : outputDir
        buildConfig.splitting = true
        buildConfig.chunkNames = 'chunk.[name]'
        buildConfig.entryNames = '[name]'
        buildConfig.outExtension = { '.js': '.mjs' } // Force output to use .mjs extension

        // Remove banner for chunk files - we'll add it manually only to main file later
        delete buildConfig.banner
      }

      // Add global definitions for IIFE build
      if (format === 'iife' && config.build.umd?.globals) {
        buildConfig.globalName = config.build.umd.name
        buildConfig.define = Object.entries(config.build.umd.globals).reduce(
          (acc, [key, value]) => {
            acc[key] = JSON.stringify(value)
            return acc
          },
          {}
        )
      }

      // Build the JavaScript
      await build(buildConfig)

      // For IIFE builds, wrap the output in a UMD wrapper
      if (format === 'iife') {
        await wrapJsAsUmd(outputFile, config, packageMetadata)
        logger.success(`✅ JavaScript IIFE build completed: ${outputFile}`)

        // Copy to PHP libraries if we're using dist and not already built to direct path
        if (shouldCreateDist) {
          await copyUmdToLibrary(outputFile, config, isDev)
        }
      } else if (format === 'esm') {
        logger.success(`✅ JavaScript ESM build completed with code splitting`)

        // Add banner only to main ESM file but not to chunks
        const indexMjsPath = path.join(getDirectChunksOutputDir(config), 'index.mjs')
        if (await fs.pathExists(indexMjsPath)) {
          const content = await fs.readFile(indexMjsPath, 'utf8')
          const banner = generateBanner(packageMetadata)
          await fs.writeFile(indexMjsPath, `${banner}\n${content}`)
          logger.debug('📝 Added banner to index.mjs')
        }

        // Copy ESM files to dist if needed
        if (shouldCreateDist) {
          await copyEsmToLibrary(config, isDev)
        }
      } else {
        logger.success(`✅ JavaScript ${format} build completed: ${outputFile}`)
      }
    }

    logger.success('🎉 JavaScript compilation completed')
  } catch (error) {
    logger.error('❌ JavaScript compilation failed:', error)
    throw error
  }
}

/**
 * Wrap JavaScript file as UMD
 * @param {string} outputFile - Path to the output file
 * @param {Object} config - Project configuration
 * @param {Object} packageMetadata - Package metadata for banner
 * @returns {Promise<void>}
 */
async function wrapJsAsUmd(outputFile, config, packageMetadata) {
  const content = await fs.readFile(outputFile, 'utf8')
  const wrappedContent = wrapAsUmd(
    content,
    config.build.umd.name,
    config.build.externals,
    packageMetadata
  )
  await fs.writeFile(outputFile, wrappedContent)
}

/**
 * Copy UMD build to library directory
 * @param {string} outputFile - Path to the output file
 * @param {Object} config - Project configuration
 * @param {boolean} isDev - Whether this is a development build
 * @returns {Promise<void>}
 */
async function copyUmdToLibrary(outputFile, config, isDev) {
  // Skip if we're using direct path already
  const directPath = getDirectJsOutputPath(config)
  if (outputFile === directPath) {
    return
  }

  // Get library directory
  const libraryDir = getLibraryDir(config, isDev)

  // Ensure dir exists
  await fs.ensureDir(libraryDir)

  logger.debug(`📂 Copying UMD build to library: ${libraryDir}`)

  // Copy main file
  await fs.copyFile(outputFile, path.join(libraryDir, path.basename(outputFile)))

  // Copy sourcemap if in development mode
  if (isDev) {
    await fs.copyFile(
      `${outputFile}.map`,
      path.join(libraryDir, `${path.basename(outputFile)}.map`)
    )
  }

  logger.debug(`📂 Copied UMD build to PHP libraries`)
}

/**
 * Copy ESM build with chunks to library directory
 * @param {Object} config - Project configuration
 * @param {boolean} isDev - Whether this is a development build
 * @returns {Promise<void>}
 */
async function copyEsmToLibrary(config, isDev) {
  const directChunksDir = getDirectChunksOutputDir(config)
  const targetDir = getLibraryDir(config, isDev)

  // Skip if we're already building directly to the target path
  if (directChunksDir === targetDir) {
    return
  }

  // Ensure target directory exists
  await fs.ensureDir(targetDir)

  logger.debug(`📂 Copying ESM build with chunks to: ${targetDir}`)

  // Read all files in the chunks directory
  const files = await fs.readdir(directChunksDir)

  // Copy ESM main file and chunks - support both .mjs and .js for transition
  const esmFiles = files.filter(
    (file) =>
      file.endsWith('.mjs') ||
      file === 'index.js' ||
      (file.startsWith('chunk.') && file.endsWith('.js'))
  )

  for (const file of esmFiles) {
    const sourcePath = path.join(directChunksDir, file)
    const targetPath = path.join(targetDir, file)

    // Skip directories
    const stats = await fs.stat(sourcePath)
    if (stats.isDirectory()) continue

    await fs.copyFile(sourcePath, targetPath)

    // Copy sourcemap if it exists and we're in development mode
    if (isDev && (await fs.pathExists(`${sourcePath}.map`))) {
      await fs.copyFile(`${sourcePath}.map`, `${targetPath}.map`)
    }
  }

  logger.debug(`📂 Copied ESM build with chunks to PHP libraries`)
}

/**
 * Watch JavaScript files for changes
 * @param {Object} config - Project configuration
 * @param {Object} liveReloadServer - Live reload server instance
 * @returns {Object} - Watcher instance
 */
export async function watchJavaScript(config, liveReloadServer) {
  const jsDir = path.resolve(config.paths.js)

  logger.info(`👀 Watching JavaScript files in ${path.relative(process.cwd(), jsDir)}`)

  // Create debounced build function
  const debouncedBuild = debounce(async (filePath) => {
    logger.info(`🔄 JavaScript file changed: ${path.relative(process.cwd(), filePath)}`)

    try {
      await compileJavaScript(config)

      // Notify live reload server
      if (liveReloadServer) {
        // Notify for both UMD and ESM builds
        const jsFile = getDirectJsOutputPath(config)
        const esmFile = getDirectEsmOutputPath(config)

        liveReloadServer.notifyChange(jsFile)
        liveReloadServer.notifyChange(esmFile)
      }
    } catch (error) {
      logger.error('❌ Failed to rebuild JavaScript files:', error)
    }
  }, 300)

  // Setup watcher
  const watcher = chokidar.watch(jsDir, {
    ignored: config.watch.ignored || ['**/node_modules/**', '**/dist/**'],
    persistent: true,
    ignoreInitial: true
  })

  watcher.on('change', debouncedBuild)
  watcher.on('error', (error) => {
    logger.error(`❌ JavaScript watcher error:`, error)
  })

  return watcher
}

export default {
  compileJavaScript,
  watchJavaScript
}
