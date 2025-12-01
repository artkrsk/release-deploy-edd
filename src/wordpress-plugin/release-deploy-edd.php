<?php
/**
 * Plugin Name: Release Deploy for Easy Digital Downloads
 * Description: Automate your EDD workflow. Push a tag, create a GitHub release, and files are instantly available—supports private repos, no local storage.
 * Author: Artem Semkin
 * Author URI: https://artemsemkin.com
 * Plugin URI: https://artemsemkin.gumroad.com/l/release-deploy-edd-pro
 * Text Domain: release-deploy-edd
 * Version: 1.0.1
 * License: GPL-3.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-3.0
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Tested up to: 6.9
 * Requires Plugins: easy-digital-downloads
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

require_once __DIR__ . '/vendor/autoload.php';

use Arts\Utilities\Utilities;
use Arts\EDD\ReleaseDeploy\Plugin;

$plugin_file    = __FILE__;
$plugin_version = Utilities::get_plugin_version( $plugin_file );

define( 'ARTS_EDD_RD_PLUGIN_VERSION', $plugin_version );
define( 'ARTS_EDD_RD_PLUGIN_FILE', $plugin_file );
define( 'ARTS_EDD_RD_PLUGIN_PATH', untrailingslashit( plugin_dir_path( $plugin_file ) ) );
define( 'ARTS_EDD_RD_PLUGIN_URL', untrailingslashit( plugin_dir_url( $plugin_file ) ) );

// If Pro is active - show conflict notice and don't load Lite
if ( defined( 'ARTS_EDD_RD_PRO_PLUGIN_VERSION' ) ) {
	add_action( 'admin_notices', 'release_deploy_edd_show_conflict_notice' );
	// Don't load the current plugin (Lite) if Pro version is active
	return;
}

// Check if Pro is installed but not active and show notice
$pro_plugin_file = 'release-deploy-edd-pro/release-deploy-edd-pro.php';
$plugins_dir     = dirname( ARTS_EDD_RD_PLUGIN_PATH );
if ( file_exists( $plugins_dir . '/' . $pro_plugin_file ) ) {
	add_action( 'admin_notices', 'release_deploy_edd_show_pro_activation_notice' );
}

Plugin::instance();

/**
 * Display conflict notice when Pro plugin is active
 */
function release_deploy_edd_show_conflict_notice() {
	// Get deactivation URL with nonce
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
	// Get activation URL with nonce
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
