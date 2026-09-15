<?php
/**
 * Plugin Name: Release Deploy for Easy Digital Downloads
 * Description: Automate your EDD workflow. Push a tag, create a GitHub release, and files are instantly available—supports private repos, no local storage.
 * Author: Artem Semkin
 * Author URI: https://artemsemkin.com
 * Plugin URI: https://artemsemkin.com/plugins/release-deploy-edd/
 * Text Domain: release-deploy-edd
 * Version: 1.1.0
 * License: GPL-3.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-3.0
 * Requires at least: 6.0
 * Requires PHP: 8.0
 * Tested up to: 7.1
 * Requires Plugins: easy-digital-downloads
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

require_once __DIR__ . '/vendor/autoload.php';

use ArtsEDDRD\Arts\Utilities\Utilities;
use Arts\EDD\ReleaseDeploy\Plugin;

// Deliberately no top-level $plugin_file/$plugin_version — WordPress includes every active plugin's
// main file in one shared global scope, and unprefixed top-level variables here can collide with an
// equally-generic one from another plugin.
define( 'ARTS_EDD_RD_PLUGIN_VERSION', Utilities::get_plugin_version( __FILE__ ) );
define( 'ARTS_EDD_RD_PLUGIN_FILE', __FILE__ );
define( 'ARTS_EDD_RD_PLUGIN_PATH', untrailingslashit( plugin_dir_path( __FILE__ ) ) );
define( 'ARTS_EDD_RD_PLUGIN_URL', untrailingslashit( plugin_dir_url( __FILE__ ) ) );

/**
 * Deferred to plugins_loaded, not run at top-level file execution: WordPress includes every active
 * plugin's main file in the order they appear in the `active_plugins` option (activation order, not
 * anything deterministic), all before plugins_loaded fires. Checking `defined('ARTS_EDD_RD_PRO_PLUGIN_VERSION')`
 * at top level only catches the conflict when Pro's file happens to load first in THIS request — if
 * Lite was activated before Pro (installing Pro without deactivating Lite first is an ordinary path),
 * Lite's own file runs before Pro's has defined anything, the check silently passes, and both plugins'
 * Plugin::instance() end up constructed in the same request. plugins_loaded fires only after every
 * active plugin's file has already run, so the same check there is activation-order-independent.
 * is_plugin_active() is not a substitute — it lives in an admin-only file, absent on front-end/REST.
 */
add_action(
	'plugins_loaded',
	function () {
		// If Pro is active - show conflict notice and don't load Lite
		if ( defined( 'ARTS_EDD_RD_PRO_PLUGIN_VERSION' ) ) {
			add_action( 'admin_notices', 'release_deploy_edd_show_conflict_notice' );
			return;
		}

		// Check if Pro is installed but not active and show notice
		$pro_plugin_file = 'release-deploy-edd-pro/release-deploy-edd-pro.php';
		$plugins_dir     = dirname( ARTS_EDD_RD_PLUGIN_PATH );
		if ( file_exists( $plugins_dir . '/' . $pro_plugin_file ) ) {
			add_action( 'admin_notices', 'release_deploy_edd_show_pro_activation_notice' );
		}

		Plugin::instance();
	}
);

/**
 * Display conflict notice when Pro plugin is active
 */
function release_deploy_edd_show_conflict_notice() {
	$deactivate_url = wp_nonce_url(
		admin_url( 'plugins.php?action=deactivate&plugin=' . urlencode( plugin_basename( ARTS_EDD_RD_PLUGIN_FILE ) ) ),
		'deactivate-plugin_' . plugin_basename( ARTS_EDD_RD_PLUGIN_FILE )
	);
	?>
<div class="notice notice-warning">
	<p>
		<strong><?php esc_html_e( 'Release Deploy Pro for Easy Digital Downloads', 'release-deploy-edd' ); ?></strong>
		<?php esc_html_e( 'is active and includes all features from the Lite version. Please deactivate the Lite version to avoid conflicts.', 'release-deploy-edd' ); ?>
		<a href="<?php echo esc_url( $deactivate_url ); ?>" class="button" style="margin-left: 10px;">
			<?php esc_html_e( 'Deactivate Lite', 'release-deploy-edd' ); ?>
		</a>
	</p>
</div>
	<?php
}

/**
 * Display notice encouraging Pro activation when installed but inactive
 */
function release_deploy_edd_show_pro_activation_notice() {
	$pro_plugin_file = 'release-deploy-edd-pro/release-deploy-edd-pro.php';
	$activate_url    = wp_nonce_url(
		admin_url( 'plugins.php?action=activate&plugin=' . urlencode( $pro_plugin_file ) ),
		'activate-plugin_' . $pro_plugin_file
	);
	?>
<div class="notice notice-info">
	<p>
		<strong><?php esc_html_e( 'Release Deploy Pro for Easy Digital Downloads', 'release-deploy-edd' ); ?></strong>
		<?php esc_html_e( 'is installed but not active. Activate Pro to unlock webhooks and advanced automation features.', 'release-deploy-edd' ); ?>
		<a href="<?php echo esc_url( $activate_url ); ?>" class="button button-primary" style="margin-left: 10px;">
			<?php esc_html_e( 'Activate Pro', 'release-deploy-edd' ); ?>
		</a>
	</p>
</div>
	<?php
}
