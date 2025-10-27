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
import { isDevelopment, getConfigValue } from '../../config/index.js'

/**
 * Compile TypeScript files
 * @param {Object} config - Project configuration
 * @returns {Promise<void>}
 */
export async function compileTypeScript(config) {
  logger.info('🔧 Compiling TypeScript...')

  const isDev = isDevelopment(config)
  const shouldCreateDist = shouldCreateDistFolder(config)

  // Get TypeScript config or use defaults
  const tsConfig = config.ts || {}

  // In development, always include ESM format for code splitting
  const formats = isDev
    ? [getConfigValue(config, 'ts.devFormat', 'iife'), 'esm']
    : shouldCreateDist
      ? config.build.formats
      : [getConfigValue(config, 'ts.devFormat', 'iife'), 'esm']

  try {
    const packageMetadata = await getPackageMetadata(config)

    // Process each format
    for (const format of formats) {
      logger.debug(`⚙️ Building TypeScript to ${format} format...`)

      // Skip non-IIFE/non-ESM formats if we're not creating a dist folder
      if (
        format !== 'esm' &&
        format !== getConfigValue(config, 'ts.devFormat', 'iife') &&
        !shouldCreateDist
      ) {
        logger.debug(`⏩ Skipping ${format} format (dist folder disabled)`)
        continue
      }

      // Determine output file based on format and dist folder setting
      let outputFile
      if (format === getConfigValue(config, 'ts.devFormat', 'iife')) {
        // Always use direct library path for development format builds
        outputFile = getDirectJsOutputPath(config)
      } else if (format === 'esm') {
        // Use ESM specific output path
        outputFile = getDirectEsmOutputPath(config)
      } else {
        // Only use dist path for other formats when dist folder is enabled
        outputFile = getOutputFilePath(config, format)
      }

      const outputDir = path.dirname(outputFile)

      // Ensure output directory exists
      await fs.ensureDir(outputDir)

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

      // Create build configuration
      const buildConfig = {
        entryPoints: [entryPoint],
        outfile: outputFile,
        bundle: true,
        minify: !isDev,
        sourcemap: isDev,
        target: config.build.target,
        format,
        globalName:
          format === getConfigValue(config, 'ts.devFormat', 'iife')
            ? config.build.umd.name
            : undefined,
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

      // Add TypeScript specific options
      if (await fs.pathExists(tsconfigFullPath)) {
        buildConfig.tsconfig = tsconfigFullPath
      }

      // Add loaders from config or use defaults
      buildConfig.loader = getConfigValue(config, 'ts.loaders', {
        '.ts': 'ts',
        '.tsx': 'tsx'
      })

      // Add global definitions for development format build
      if (format === getConfigValue(config, 'ts.devFormat', 'iife') && config.build.umd?.globals) {
        buildConfig.globalName = config.build.umd.name
        buildConfig.define = Object.entries(config.build.umd.globals).reduce(
          (acc, [key, value]) => {
            acc[key] = JSON.stringify(value)
            return acc
          },
          {}
        )
      }

      // Add any additional esbuild options from config
      const additionalOptions = getConfigValue(config, 'ts.esbuildOptions', {})
      Object.assign(buildConfig, additionalOptions)

      // Build the TypeScript
      await build(buildConfig)

      // For development format builds, wrap the output in a UMD wrapper
      if (format === getConfigValue(config, 'ts.devFormat', 'iife')) {
        await wrapTsAsUmd(outputFile, config, packageMetadata)
        logger.success(`✅ TypeScript ${format} build completed: ${outputFile}`)

        // Copy to PHP libraries if we're using dist and not already built to direct path
        if (shouldCreateDist) {
          await copyUmdToLibrary(outputFile, config, isDev)
        }
      } else if (format === 'esm') {
        logger.success(`✅ TypeScript ESM build completed with code splitting`)

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
        logger.success(`✅ TypeScript ${format} build completed: ${outputFile}`)
      }
    }

    logger.success('🎉 TypeScript compilation completed')
  } catch (error) {
    logger.error('❌ TypeScript compilation failed:', error)
    throw error
  }
}

/**
 * Wrap TypeScript file as UMD
 * @param {string} outputFile - Path to the output file
 * @param {Object} config - Project configuration
 * @param {Object} packageMetadata - Package metadata for banner
 * @returns {Promise<void>}
 */
async function wrapTsAsUmd(outputFile, config, packageMetadata) {
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

  logger.debug(`📂 Copying TypeScript UMD build to library: ${libraryDir}`)

  // Copy main file
  await fs.copyFile(outputFile, path.join(libraryDir, path.basename(outputFile)))

  // Copy sourcemap if in development mode
  if (isDev) {
    await fs.copyFile(
      `${outputFile}.map`,
      path.join(libraryDir, `${path.basename(outputFile)}.map`)
    )
  }

  logger.debug(`📂 Copied TypeScript UMD build to PHP libraries`)
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

  // Create pattern for watching specific extensions
  const extensionPattern =
    extensions.length > 1 ? `**/*{${extensions.join(',')}}` : `**/*${extensions[0]}`

  // Create debounced build function
  const debouncedBuild = debounce(
    async (filePath) => {
      logger.info(`🔄 TypeScript file changed: ${path.relative(process.cwd(), filePath)}`)

      try {
        await compileTypeScript(config)

        // Notify live reload server
        if (liveReloadServer) {
          // Notify for both UMD and ESM builds
          const jsFile = getDirectJsOutputPath(config)
          const esmFile = getDirectEsmOutputPath(config)

          liveReloadServer.notifyChange(jsFile)
          liveReloadServer.notifyChange(esmFile)
        }
      } catch (error) {
        logger.error('❌ Failed to rebuild TypeScript files:', error)
      }
    },
    getConfigValue(config, 'ts.debounceTime', 300)
  )

  // Setup watcher with configurable options
  const watcherOptions = {
    ignored: getConfigValue(config, 'watch.ignored', ['**/node_modules/**', '**/dist/**']),
    persistent: true,
    ignoreInitial: true,
    ignorePermissionErrors: getConfigValue(config, 'ts.ignorePermissionErrors', true)
  }

  // Add any additional watcher options from config
  const additionalOptions = getConfigValue(config, 'ts.watcherOptions', {})
  Object.assign(watcherOptions, additionalOptions)

  // Create the watcher
  const watcher = chokidar.watch(tsDir, watcherOptions)

  watcher.on('change', debouncedBuild)
  watcher.on('error', (error) => {
    logger.error(`❌ TypeScript watcher error:`, error)
  })

  return watcher
}

export default {
  compileTypeScript,
  watchTypeScript
}
