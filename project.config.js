/**
 * Project Configuration for `@arts/release-deploy-edd`
 */
export default {
  // Basic project information
  name: 'release-deploy-edd',
  entry: './src/ts/index.ts',
  author: 'Artem Semkin',
  license: 'GPL-3.0',
  description: 'Lite version - Serve EDD downloads directly from GitHub releases',
  homepage: 'https://artemsemkin.com',
  repository: 'https://github.com/artkrsk/release-deploy-edd',
  donateUrl: 'https://buymeacoffee.com/artemsemkin',

  // Path configuration
  paths: {
    root: './',
    src: './src',
    dist: './dist',
    php: './src/php',
    styles: './src/styles',
    ts: './src/ts',
    wordpress: {
      plugin: './src/wordpress-plugin',
      languages: './src/wordpress-plugin/languages'
    },
    library: {
      base: 'libraries',
      name: 'release-deploy-edd',
      assets: 'src/php/libraries/release-deploy-edd'
    },
    aliases: {
      '@': './src/ts'
    }
  },

  // Development configuration
  dev: {
    root: './src/ts/www',
    server: {
      port: 8080,
      host: 'localhost'
    }
  },

  // Live reloading server configuration
  liveReload: {
    enabled: false,
    port: 3000,
    host: 'localhost',
    https: {
      key: '/Users/art/.localhost-ssl/smooth-scrolling.local+4-key.pem',
      cert: '/Users/art/.localhost-ssl/smooth-scrolling.local+4.pem'
    },
    injectChanges: true,
    reloadDebounce: 500,
    reloadThrottle: 1000,
    notify: {
      styles: {
        top: 'auto',
        bottom: '0',
        right: '0',
        left: 'auto',
        padding: '5px',
        borderRadius: '5px 0 0 0',
        fontSize: '12px'
      }
    },
    ghostMode: {
      clicks: false,
      forms: false,
      scroll: false
    },
    open: false,
    snippet: false
  },

  // WordPress sync configuration
  wordpress: {
    enabled: true,
    source: './src/php',
    extensions: ['.js', '.css', '.php', '.jsx', '.ts', '.tsx'],
    targets: [], // Targets will be added by the build system based on environment
    debug: false
  },

  // WordPress plugin development configuration
  wordpressPlugin: {
    enabled: true,
    source: './src/wordpress-plugin',
    extensions: ['.php', '.js', '.css', '.jsx', '.ts', '.tsx', '.json', '.txt', '.md'],
    target: null, // Set in the environment-specific config
    debug: false,
    vendor: {
      source: './vendor',
      target: 'vendor',
      extensions: ['.php', '.js', '.css', '.json', '.txt', '.md'],
      delete: true,
      watch: true
    },
    packageName: 'release-deploy-edd',
    zipOutputName: 'release-deploy-edd.zip',
    packageExclude: [
      'node_modules',
      '.git',
      '.DS_Store',
      '**/.DS_Store',
      '.*',
      '**/.*',
      '*.log',
      '*.map',
      '*.zip',
      'package.json',
      'package-lock.json',
      'pnpm-lock.yaml',
      'yarn.lock',
      'README.md',
      'LICENSE',
      '.gitignore',
      '.editorconfig',
      '.eslintrc',
      '.prettierrc',
      'tsconfig.json',
      'vite.config.js',
      'vitest.config.js',
      'cypress.config.js',
      '__tests__',
      '__e2e__',
      'coverage',
      'dist'
    ],
    sourceFiles: {
      php: './src/php',
      vendor: './vendor',
      dist: {
        files: ['index.umd.js', 'index.mjs', 'chunk.*.js', 'index.css']
      },
      composer: ['composer.json', 'composer.lock']
    }
  },

  // Build configuration
  build: {
    formats: ['iife'],
    target: 'es2018',
    sourcemap: false,
    externals: {
      react: 'React',
      'react-dom': 'ReactDOM',
      '@wordpress/element': 'wp.element',
      '@wordpress/components': 'wp.components',
      '@wordpress/i18n': 'wp.i18n',
      '@wordpress/api-fetch': 'wp.apiFetch'
    },
    globals: {},
    cleanOutputDir: true,
    umd: {
      name: 'ArtsEDDReleaseDeploy',
      exports: 'named',
      globals: {}
    },
    // Output filenames by format
    output: {
      cjs: 'index.cjs',
      esm: 'index.mjs',
      iife: 'index.iife.js'
    }
  },

  // Sass configuration
  sass: {
    enabled: true,
    entry: './src/styles/index.sass',
    output: './dist/index.css',
    options: {
      sourceMap: false,
      outputStyle: 'compressed',
      includePaths: ['node_modules', '../packages']
    }
  },

  // Watch options
  watch: {
    ignored: ['node_modules/**', 'dist/**']
  },

  // Internationalization options
  i18n: {
    enabled: true,
    src: 'src/php/**/*.php',
    dest: 'src/wordpress-plugin/languages/release-deploy-edd.pot',
    domain: 'release-deploy-edd',
    package: 'Release Deploy for Easy Digital Downloads',
    bugReport: 'https://artemsemkin.com',
    lastTranslator: 'Artem Semkin',
    team: 'Artem Semkin',
    relativeTo: './'
  }
}
