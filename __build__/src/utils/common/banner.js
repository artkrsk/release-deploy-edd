/**
 * Generates dynamic UMD banner for builds based on project externals
 * @param {string} globalName - The global variable name for the library
 * @param {Object} externals - Map of external package names to global variable names
 * @returns {string} The UMD wrapper opening code
 */
export function generateUmdBanner(globalName, externals = {}) {
  // Get external package names as an array
  const externalPackages = Object.keys(externals)

  // If no externals, generate a simpler UMD wrapper
  if (externalPackages.length === 0) {
    return (
      '(function(root, factory) {' +
      "if (typeof define === 'function' && define.amd) {" +
      'define([], factory);' +
      "} else if (typeof module === 'object' && module.exports) {" +
      'module.exports = factory();' +
      '} else {' +
      'root.' +
      globalName +
      ' = factory();' +
      '}' +
      "}(typeof self !== 'undefined' ? self : this, function() {"
    )
  }

  // Generate parts for the UMD pattern
  const commonJsRequires = externalPackages.map((pkg) => `require('${pkg}')`).join(', ')
  const amdDeps = JSON.stringify(externalPackages)
  const globalAccess = externalPackages.map((pkg) => `root.${externals[pkg]}`).join(', ')
  const factoryParams = Object.values(externals).join(', ')

  return (
    '(function(root, factory) {' +
    "if (typeof define === 'function' && define.amd) {" +
    'define(' +
    amdDeps +
    ', factory);' +
    "} else if (typeof module === 'object' && module.exports) {" +
    'module.exports = factory(' +
    commonJsRequires +
    ');' +
    '} else {' +
    'root.' +
    globalName +
    ' = factory(' +
    globalAccess +
    ');' +
    '}' +
    "}(typeof self !== 'undefined' ? self : this, function(" +
    factoryParams +
    ') {'
  )
}

/**
 * Generate UMD footer (closing part)
 * @param {string} globalName - The global variable name for the library
 * @returns {string} The UMD wrapper closing code
 */
export function generateUmdFooter(globalName) {
  return 'return ' + globalName + ';' + '}));'
}

/**
 * Generate a banner for compiled files
 * @param {Object} options - Banner options
 * @param {string} options.name - Project name
 * @param {string} options.version - Project version
 * @param {string} [options.author] - Project author
 * @param {string} [options.license] - Project license
 * @param {string} [options.homepage] - Project homepage
 * @param {string} [options.copyright] - Project copyright
 * @param {string} [options.repository] - Project repository
 * @returns {string} - Banner text
 */
export function generateBanner(options = {}) {
  // Default values
  options = {
    name: 'Unknown Project',
    version: '1.0.0',
    author: '',
    license: '',
    homepage: '',
    copyright: '',
    repository: '',
    ...options
  }

  const currentYear = new Date().getFullYear()

  // Generate the copyright line
  const copyrightLine =
    options.copyright ||
    (options.author ? `© ${currentYear} ${options.author}` : `© ${currentYear}`)

  // Build the banner
  const bannerLines = [
    `/*!`,
    ` * ${options.name} v${options.version}`,
    options.description ? ` * ${options.description}` : '',
    options.homepage ? ` * ${options.homepage}` : '',
    options.repository ? ` * ${options.repository}` : '',
    ` * ${copyrightLine}`,
    options.license ? ` * License: ${options.license}` : '',
    ` */`
  ]

  // Filter out empty lines and join
  return bannerLines.filter((line) => line !== '').join('\n')
}

/**
 * Generate a package banner with version information
 * @param {Object} packageInfo - Package information (name, version, etc.)
 * @returns {string} The banner text
 */
export function generatePackageBanner(packageInfo) {
  const { name, version, author, license, homepage, repository } = packageInfo
  const date = new Date().toISOString().split('T')[0]
  const year = new Date().getFullYear()
  const authorStr = typeof author === 'string' ? author : author?.name

  const lines = [`/*!`, ` * ${name} v${version}`]

  // Use current year only for copyright
  lines.push(` * Copyright © ${year}`)

  if (authorStr) {
    lines.push(` * Author: ${authorStr}`)
  }

  if (license) {
    lines.push(` * License: ${license}`)
  }

  if (homepage) {
    lines.push(` * Website: ${homepage}`)
  }

  if (repository) {
    lines.push(` * Repository: ${repository}`)
  }

  lines.push(` * Generated on: ${date}`)
  lines.push(` */`)

  return lines.join('\n')
}

/**
 * Wrap content in a UMD wrapper
 * @param {string} content - The code content to wrap
 * @param {string} globalName - The global variable name for the library
 * @param {Object} externals - Map of external package names to global variable names
 * @param {Object} packageMetadata - Package metadata for banner
 * @returns {string} - Wrapped content
 */
export function wrapAsUmd(content, globalName, externals = {}, packageMetadata = {}) {
  const banner = generateBanner(packageMetadata)

  // Get UMD wrapper
  const umdBanner = generateUmdBanner(globalName, externals)
  const umdFooter = generateUmdFooter(globalName)

  return `${banner}\n${umdBanner}\n${content}\n${umdFooter}`
}

export default {
  generateUmdBanner,
  generateUmdFooter,
  generateBanner,
  wrapAsUmd
}
