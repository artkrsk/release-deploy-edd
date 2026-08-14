<?php
/**
 * PHPStan Bootstrap File
 *
 * Defines project-specific constants for static analysis.
 * WordPress functions are provided by szepeviktor/phpstan-wordpress extension.
 */

// Plugin constants
if ( ! defined( 'ARTS_EDD_RD_PLUGIN_FILE' ) ) {
	define( 'ARTS_EDD_RD_PLUGIN_FILE', __DIR__ . '/../src/wordpress-plugin/release-deploy-edd.php' );
}

if ( ! defined( 'ARTS_EDD_RD_PLUGIN_PATH' ) ) {
	define( 'ARTS_EDD_RD_PLUGIN_PATH', __DIR__ . '/../' );
}

if ( ! defined( 'ARTS_EDD_RD_PLUGIN_VERSION' ) ) {
	define( 'ARTS_EDD_RD_PLUGIN_VERSION', '1.0.0' );
}

