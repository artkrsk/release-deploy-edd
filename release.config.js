/**
 * Release Configuration for Release Deploy for EDD
 *
 * This file contains all project-specific settings for the release pipeline.
 * To reuse this pipeline in another WordPress plugin, just update these values.
 */
export default {
  plugin: {
    slug: 'release-deploy-edd',
    mainFile: 'src/wordpress-plugin/release-deploy-edd.php',
    zipFile: 'dist/release-deploy-edd.zip',
    assetsDirectory: '__assets__'
  },
  validation: {
    criticalFiles: [
      'vendor/autoload.php',
      'release-deploy-edd.php',
      'readme.txt',
      'src/php/libraries/release-deploy-edd/index.umd.js',
      'src/php/libraries/release-deploy-edd/index.css'
    ]
  },
  github: {
    nodeVersion: '23',
    buildCommand:
      'corepack enable && cd __build__ && pnpm install && cd .. && pnpm install --ignore-scripts=false && composer install --no-dev && pnpm run build',
    deployToWordPress: true
  }
}
