import fs from 'fs-extra'
import path from 'path'

/**
 * Read package.json and return its contents
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object>} Package.json contents
 */
export async function readPackageJson(projectRoot) {
  const packageJsonPath = path.join(projectRoot, 'package.json')
  try {
    return await fs.readJson(packageJsonPath)
  } catch (error) {
    throw new Error(`Failed to read package.json: ${error.message}`)
  }
}

/**
 * Get version from package.json
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<string>} Package version
 */
export async function getPackageVersion(projectRoot) {
  const packageJson = await readPackageJson(projectRoot)
  return packageJson.version || '0.0.0'
}
