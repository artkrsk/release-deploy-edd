<?php

namespace Arts\EDD\ReleaseDeploy\Managers;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use Arts\EDD\ReleaseDeploy\Base\Manager;

/**
 * Settings Manager
 */
class Settings extends Manager {

	/**
	 * Add Release Deploy section to Extensions tab
	 *
	 * @param array $sections Settings sections array.
	 * @return array
	 */
	public function add_section( $sections ) {
		$sections['release_deploy'] = __( 'Release Deploy', 'release-deploy-edd' );

		return $sections;
	}

	/**
	 * Add settings fields
	 *
	 * @param array $settings Settings array from EDD filter.
	 * @return array
	 */
	public function add_settings( $settings ) {
		$github_settings = array(
			'release_deploy' => array(
				array(
					'id'   => 'release_deploy_edd_header',
					'name' => '<strong>' . __( 'Release Deploy Settings', 'release-deploy-edd' ) . '</strong>',
					'desc' => __( 'Configure GitHub API access for serving downloads', 'release-deploy-edd' ),
					'type' => 'header',
				),
				array(
					'id'   => 'release_deploy_edd_token_react',
					'name' => __( 'Personal Access Token', 'release-deploy-edd' ),
					'desc' => '',
					'type' => 'hook',
				),
			),
		);

		// Upgrade to Pro section
		$github_settings['release_deploy'][] = array(
			'id'   => 'release_deploy_edd_upgrade_pro_react',
			'name' => __( 'Upgrade to Pro', 'release-deploy-edd' ),
			'desc' => '',
			'type' => 'hook',
		);

		return array_merge( $settings, $github_settings );
	}

	/**
	 * Render React root for token field
	 */
	public function render_token_field() {
		?><div id="release-deploy-edd-settings-root"></div>
		<?php
	}

	/**
	 * Render Pro upgrade CTA
	 */
	public function render_upgrade_pro_field() {
		$purchase_url = $this->config['purchase_url'] ?? 'https://artemsemkin.gumroad.com/l/release-deploy-edd-pro/';
		?>
<div class="release-deploy-edd-upgrade-pro">
	<h3 class="release-deploy-edd-upgrade-pro__title">
		<span class="dashicons dashicons-star-filled"></span>
		<?php echo esc_html__( 'Get Release Deploy Pro for Easy Digital Downloads', 'release-deploy-edd' ); ?>
	</h3>
	<p class="release-deploy-edd-upgrade-pro__description">
		<?php echo esc_html__( 'True CI/CD deployment for your EDD store', 'release-deploy-edd' ); ?>
	</p>
	<p class="release-deploy-edd-upgrade-pro__subtitle">
		<?php echo esc_html__( 'Push a tag. Your EDD store updates instantly. Customers get the latest version. You do nothing.', 'release-deploy-edd' ); ?>
	</p>
	<p class="release-deploy-edd-upgrade-pro__unlock">
		<?php echo esc_html__( 'Upgrade to Release Deploy Pro and unlock:', 'release-deploy-edd' ); ?>
	</p>
	<ul class="release-deploy-edd-upgrade-pro__features">
		<li>
			<?php printf( '%1$s – %2$s', '<strong>' . esc_html__( '"Latest" release keyword', 'release-deploy-edd' ) . '</strong>', esc_html__( 'set once, never update Download files again when you release', 'release-deploy-edd' ) ); ?>
		</li>
		<li>
			<?php printf( '%1$s – %2$s', '<strong>' . esc_html__( 'GitHub webhooks', 'release-deploy-edd' ) . '</strong>', esc_html__( 'customers get new releases instantly after you push, zero manual sync', 'release-deploy-edd' ) ); ?>
		</li>
		<li>
			<?php printf( '%1$s – %2$s', '<strong>' . esc_html__( 'Version & changelog sync', 'release-deploy-edd' ) . '</strong>', esc_html__( 'write once on GitHub, version numbers and changelogs update everywhere automatically', 'release-deploy-edd' ) ); ?>
		</li>
		<li>
			<?php printf( '%1$s – %2$s', '<strong>' . esc_html__( 'Email notifications', 'release-deploy-edd' ) . '</strong>', esc_html__( 'get alerted immediately if downloads fail or rate limits approach', 'release-deploy-edd' ) ); ?>
		</li>
		<li>
			<?php printf( '%1$s – %2$s', '<strong>' . esc_html__( 'Priority support', 'release-deploy-edd' ) . '</strong>', esc_html__( 'dedicated support forum with 24-hour response target', 'release-deploy-edd' ) ); ?>
		</li>
	</ul>
	<p class="release-deploy-edd-upgrade-pro__button">
		<a href="<?php echo esc_url( $purchase_url ); ?>" class="button button-primary" target="_blank">
			<?php esc_html_e( 'Get Pro Now', 'release-deploy-edd' ); ?>
		</a>
	</p>
</div>
		<?php
	}

	/**
	 * Handle AJAX test connection request
	 */
	public function ajax_test_connection() {
		check_ajax_referer( 'edd_release_deploy_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_shop_settings' ) ) {
			wp_send_json_error( array( 'message' => 'Unauthorized' ) );
		}

		$token = isset( $_POST['token'] ) ? sanitize_text_field( wp_unslash( $_POST['token'] ) ) : '';

		/** Test GitHub API connection result @var bool $result */
		$result = $this->services->github_api->test_connection( $token );

		if ( $result === true ) {
			wp_send_json_success( array( 'message' => __( 'Connection successful', 'release-deploy-edd' ) ) );
		}

		/** Test GitHub API connection result @var bool $result */
		$message = __( 'Connection failed', 'release-deploy-edd' );
		wp_send_json_error( array( 'message' => $message ) );
	}

	/**
	 * Add plugin action links to the plugins screen
	 *
	 * @param array $links Array of plugin action links.
	 * @return array Modified array of plugin action links.
	 */
	public function add_plugin_action_links( $links ) {
		$new_links = array();

		// Add Pro upgrade link FIRST if Pro is not installed
		$plugins_dir     = dirname( ARTS_EDD_RD_PLUGIN_PATH );
		$pro_plugin_file = $plugins_dir . '/release-deploy-edd-pro/release-deploy-edd-pro.php';
		if ( ! file_exists( $pro_plugin_file ) ) {
			$purchase_url = $this->config['purchase_url'] ?? 'https://artemsemkin.gumroad.com/l/release-deploy-edd-pro/';
			$new_links[]  = sprintf(
				'<a href="%s" target="_blank" class="release-deploy-edd-upgrade-link">%s</a>',
				esc_url( $purchase_url ),
				esc_html__( 'Upgrade to Pro', 'release-deploy-edd' )
			);
		}

		// Add Settings link
		$settings_url = $this->config['settings_url'];
		$new_links[]  = sprintf(
			'<a href="%s">%s</a>',
			esc_url( $settings_url ),
			esc_html__( 'Settings', 'release-deploy-edd' )
		);

		return array_merge( $new_links, $links );
	}
}
