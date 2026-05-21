import webpack from 'webpack'
import TerserPlugin from 'terser-webpack-plugin'
import fs from 'fs-extra'
import path from 'path'
import chokidar from 'chokidar'
import debounce from 'debounce'
import { logger } from '../../logger/index.js'
import { generateBanner } from '../common/banner.js'
import { getPackageMetadata } from '../common/version.js'
import { getLibraryDir, getDistPath, shouldCreateDistFolder } from '../common/paths.js'
import { isDevelopment, getConfigValue } from '../../config/index.js'

/**
 * Compile TypeScript files using Webpack
 * @param {Object} config - Project configuration
 * @param {boolean} watchMode - Whether to run in watch mode
 * @param {Object} liveReloadServer - Live reload server instance (optional)
 * @returns {Promise<void>}
 */
export async function compileTypeScript(config, watchMode = false, liveReloadServer = null) {
  logger.info(`🔧 Compiling TypeScript with Webpack (${watchMode ? 'watch' : 'build'} mode)...`)

  const isDev = isDevelopment(config)
  const packageMetadata = await getPackageMetadata(config)
  const finalOutputDir = getLibraryDir(config, isDev)
  const shouldCreateDist = shouldCreateDistFolder(config)
  const distOutputDir = shouldCreateDist ? getDistPath(config) : null

  try {
    // Get entry point from config
    const entryPoint =
      getConfigValue(config, 'ts.entry', null) ||
      getConfigValue(config, 'entry', './src/js/index.js').replace(
        new RegExp(`${getConfigValue(config, 'ts.jsExtension', '.js')}$`),
        getConfigValue(config, 'ts.extension', '.ts')
      )
    const entryPointPath = path.resolve(config._absoluteProjectRoot, entryPoint)

    // Get tsconfig path from config or use default
    const tsconfigPath = getConfigValue(config, 'ts.tsconfigPath', 'tsconfig.json')
    const tsconfigFullPath = path.isAbsolute(tsconfigPath)
      ? tsconfigPath
      : path.join(config._absoluteProjectRoot, tsconfigPath)

    // Webpack Configuration for UMD build
    const webpackConfig = {
      mode: isDev ? 'development' : 'production',
      entry: entryPointPath,
      output: {
        path: finalOutputDir, // Output directly to the library directory
        filename: 'index.umd.js',
        chunkFilename: 'chunk.[name].js',
        library: {
          name: config.build.umd.name,
          type: 'umd',
          export: 'default'
        },
        globalObject: 'this',
        clean: false // Don't clean the directory since we might have other files there
      },
      devtool: isDev ? 'source-map' : false,
      target: ['web', 'es2018'],
      module: {
        rules: [
          {
            test: /\.tsx?$/,
            loader: 'ts-loader',
            exclude: /node_modules/,
            options: {
              ...((await fs.pathExists(tsconfigFullPath)) ? { configFile: tsconfigFullPath } : {})
            }
          }
        ]
      },
      resolve: {
        extensions: ['.tsx', '.ts', '.js']
      },
      externals: config.build.externals || {},
      optimization: {
        minimize: !isDev,
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              compress: {
                drop_console: !isDev
              },
              format: {
                comments: false
              }
            },
            extractComments: false
          })
        ]
      },
      plugins: [
        new webpack.BannerPlugin({
          banner: generateBanner(packageMetadata),
          raw: true
        })
      ],
      ...getConfigValue(config, 'ts.webpackOptions', {})
    }

    // If we should create a dist folder, prepare second config for ESM output
    let esmWebpackConfig = null
    if (shouldCreateDist && !isDev) {
      // Create a separate ESM build that outputs to dist
      esmWebpackConfig = { ...webpackConfig }

      // Configure ESM output
      esmWebpackConfig.output = {
        path: distOutputDir,
        filename: 'index.mjs',
        chunkFilename: 'chunk.[name].js',
        library: {
          type: 'module'
        },
        clean: false,
        environment: {
          module: true
        }
      }
      esmWebpackConfig.experiments = {
        outputModule: true
      }
    }

    // Create UMD compiler
    const compiler = webpack(webpackConfig)

    // Create ESM compiler if needed
    const esmCompiler = esmWebpackConfig ? webpack(esmWebpackConfig) : null

    const handleBuildComplete = async (err, stats, isEsm = false) => {
      if (err) {
        logger.error(`❌ Webpack ${isEsm ? 'ESM' : 'UMD'} fatal error:`, err.stack || err)
        if (err.details) {
          logger.error(err.details)
        }
        return
      }

      const info = stats.toJson()

      if (stats.hasErrors()) {
        logger.error(`❌ Webpack ${isEsm ? 'ESM' : 'UMD'} compilation failed with errors:`)
        info.errors.forEach((e) => logger.error(e.message || e))
      } else {
        if (stats.hasWarnings()) {
          logger.warn(`⚠️ Webpack ${isEsm ? 'ESM' : 'UMD'} compilation finished with warnings:`)
          info.warnings.forEach((w) => logger.warn(w.message || w))
        }
        logger.success(
          `✅ Webpack ${isEsm ? 'ESM' : 'UMD'} build completed in ${stats.endTime - stats.startTime}ms`
        )

        // Notify live reload server if needed
        if (liveReloadServer) {
          const outputFile = isEsm
            ? path.join(distOutputDir, 'index.mjs')
            : path.join(finalOutputDir, 'index.umd.js')
          liveReloadServer.notifyChange(outputFile)
        }
      }
    }

    if (watchMode) {
      logger.info('👀 Starting Webpack watch...')
      return compiler.watch(
        {
          aggregateTimeout: getConfigValue(config, 'ts.watchAggregateTimeout', 300),
          ignored: getConfigValue(config, 'watch.ignored', ['**/node_modules/**'])
        },
        (err, stats) => handleBuildComplete(err, stats, false)
      )
    } else {
      // Run single build
      return new Promise((resolve, reject) => {
        compiler.run(async (err, stats) => {
          handleBuildComplete(err, stats, false)

          // If we need to build ESM version as well
          if (esmCompiler) {
            logger.info('🔧 Building ESM version for dist folder...')

            await new Promise((esmResolve, esmReject) => {
              esmCompiler.run((esmErr, esmStats) => {
                handleBuildComplete(esmErr, esmStats, true)
                esmCompiler.close((closeErr) => {
                  if (closeErr) logger.error('❌ Error closing ESM Webpack compiler:', closeErr)
                  if (esmErr || esmStats.hasErrors()) {
                    esmReject(new Error('ESM Webpack build failed.'))
                  } else {
                    esmResolve()
                  }
                })
              })
            }).catch((error) => {
              logger.error('❌ ESM build error:', error)
            })
          }

          compiler.close((closeErr) => {
            if (closeErr) {
              logger.error('❌ Error closing UMD Webpack compiler:', closeErr)
            }
            if (err || stats.hasErrors()) {
              reject(new Error('UMD Webpack build failed.'))
            } else {
              resolve()
            }
          })
        })
      })
    }
  } catch (error) {
    logger.error('❌ Error setting up Webpack configuration:', error)
    throw error
  }
}

/**
 * Watch TypeScript files for changes
 * @param {Object} config - Project configuration
 * @param {Object} liveReloadServer - Live reload server instance
 * @returns {Object} - Watcher instance
 */
export async function watchTypeScript(config, liveReloadServer) {
  const tsDir = path.resolve(getConfigValue(config, 'paths.ts', config.paths.js))
  logger.info(`👀 Watching TypeScript files in ${path.relative(process.cwd(), tsDir)}`)

  const extensions = getConfigValue(config, 'ts.watchExtensions', ['.ts', '.tsx'])
  const filePattern = `**/*.{${extensions.map((ext) => ext.substring(1)).join(',')}}`

  const debouncedBuild = debounce(
    async (filePath) => {
      logger.info(`🔄 TypeScript file changed: ${path.relative(process.cwd(), filePath)}`)

      try {
        await compileTypeScript(config, false, liveReloadServer)
      } catch (error) {
        // Error is already logged in compileTypeScript
      }
    },
    getConfigValue(config, 'ts.debounceTime', 300)
  )

  const watcherOptions = {
    ignored: getConfigValue(config, 'watch.ignored', ['**/node_modules/**', '**/dist/**']),
    persistent: true,
    ignoreInitial: true,
    ignorePermissionErrors: getConfigValue(config, 'ts.ignorePermissionErrors', true),
    ...getConfigValue(config, 'ts.watcherOptions', {})
  }

  const watcher = chokidar.watch(tsDir, watcherOptions)

  watcher.on('change', debouncedBuild)
  watcher.on('add', debouncedBuild)
  watcher.on('unlink', debouncedBuild)
  watcher.on('error', (error) => {
    logger.error(`❌ TypeScript watcher error:`, error)
  })

  return watcher
}

export default {
  compileTypeScript,
  watchTypeScript
}
