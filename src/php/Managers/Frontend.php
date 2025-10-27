<?php

namespace Arts\EDD\ReleaseDeploy\Managers;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use Arts\EDD\ReleaseDeploy\Base\Manager;

/**
 * Admin Frontend Manager
 */
class Frontend extends Manager {

	/**
	 * Enqueue admin scripts
	 *
	 * @param string $hook_suffix Current WordPress admin page hook.
	 */
	public function enqueue_scripts( $hook_suffix ) {
		$this->enqueue_settings_scripts( $hook_suffix );
		$this->enqueue_metabox_scripts( $hook_suffix );
		$this->enqueue_plugins_page_styles( $hook_suffix );
		$this->enqueue_browser_scripts( $hook_suffix );
	}

	/**
	 * Enqueue browser scripts for media library iframe
	 *
	 * @param string $hook_suffix Current WordPress admin page hook.
	 */
	private function enqueue_browser_scripts( $hook_suffix ) {
		// Check if we're in the media upload iframe
		if ( defined( 'IFRAME_REQUEST' ) && IFRAME_REQUEST ) {
			// Package browser assets are auto-enqueued by the Browser's Frontend class
			// Enqueue plugin-specific scripts for browser context
			$this->enqueue_common_scripts( array( 'browser' ) );
		}
	}

	/**
	 * Enqueue styles for plugins page
	 *
	 * @param string $hook_suffix Current WordPress admin page hook.
	 */
	private function enqueue_plugins_page_styles( $hook_suffix ) {
		if ( $hook_suffix !== 'plugins.php' ) {
			return;
		}

		wp_enqueue_style(
			'release-deploy-edd',
			untrailingslashit( $this->plugin_dir_url ) . '/libraries/release-deploy-edd/index.css',
			array(),
			ARTS_EDD_RD_PLUGIN_VERSION
		);
	}

	/**
	 * Enqueue settings page scripts
	 *
	 * @param string $hook_suffix Current WordPress admin page hook.
	 */
	private function enqueue_settings_scripts( $hook_suffix ) {
		if ( $hook_suffix !== 'download_page_edd-settings' ) {
			return;
		}

		$current_tab     = filter_input( INPUT_GET, 'tab', FILTER_SANITIZE_SPECIAL_CHARS );
		$current_section = filter_input( INPUT_GET, 'section', FILTER_SANITIZE_SPECIAL_CHARS );

		// Only load on Extensions tab when section is release_deploy or no section (default)
		if ( 'extensions' !== $current_tab ) {
			return;
		}

		// Don't load if it's a different section
		if ( $current_section && 'release_deploy' !== $current_section ) {
			return;
		}

		// Include settings context
		$contexts = array( 'settings' );

		$this->enqueue_common_scripts( $contexts );
	}

	/**
	 * Enqueue metabox scripts
	 *
	 * @param string $hook_suffix Current WordPress admin page hook.
	 */
	private function enqueue_metabox_scripts( $hook_suffix ) {
		global $post;

		if ( $hook_suffix !== 'post.php' && $hook_suffix !== 'post-new.php' ) {
			return;
		}

		if ( ! isset( $post ) || $post->post_type !== 'download' ) {
			return;
		}

		$this->enqueue_common_scripts( array( 'metabox', 'browser' ) );
	}

	/**
	 * Enqueue common scripts and styles
	 *
	 * @param array $contexts Contexts to include in localized data.
	 */
	public function enqueue_common_scripts( $contexts = array() ) {
		wp_enqueue_script(
			'release-deploy-edd',
			untrailingslashit( $this->plugin_dir_url ) . '/libraries/release-deploy-edd/index.umd.js',
			array( 'react', 'react-dom', 'wp-element', 'wp-components', 'wp-i18n', 'wp-api-fetch' ),
			ARTS_EDD_RD_PLUGIN_VERSION,
			true
		);

		wp_enqueue_style(
			'release-deploy-edd',
			untrailingslashit( $this->plugin_dir_url ) . '/libraries/release-deploy-edd/index.css',
			array( 'wp-components' ),
			ARTS_EDD_RD_PLUGIN_VERSION
		);

		// Localize script with centralized data
		wp_localize_script(
			'release-deploy-edd',
			'releaseDeployEDD',
			$this->get_localized_data( $contexts )
		);
	}

	/**
	 * Get available features based on registered services
	 *
	 * @return array Feature flags for frontend
	 */
	public function get_available_features() {
		// Lite version - all Pro features are false (used for showing upgrade prompts)
		return array(
			'useLatestRelease' => false,
			'webhooks'         => false,
			'notifications'    => false,
			'versionSync'      => false,
			'changelogSync'    => false,
		);
	}

	/**
	 * Get translated strings for frontend
	 *
	 * @return array Translation strings
	 */
	private function get_frontend_strings() {
		return array(
			// Common strings
			'common.getPro'            => __( 'Get Pro', 'release-deploy-edd' ),
			'common.fixIt'             => __( 'Fix It', 'release-deploy-edd' ),

			// Token field strings
			'token.checking'           => __( 'Checking connection...', 'release-deploy-edd' ),
			'token.connected'          => __( 'Connected', 'release-deploy-edd' ),
			'token.invalid'            => __( 'Invalid GitHub token', 'release-deploy-edd' ),
			'token.apiCalls'           => __( 'API calls remaining', 'release-deploy-edd' ),
			'token.managedViaConstant' => __( 'Managed via PHP constant', 'release-deploy-edd' ),
			'token.constantHelp'       => __( 'Token is defined via EDD_RELEASE_DEPLOY_TOKEN constant (typically in wp-config.php)', 'release-deploy-edd' ),
			'token.enterHelp'          => __( 'Enter your GitHub PAT with repo scope. You can also define EDD_RELEASE_DEPLOY_TOKEN constant in wp-config.php', 'release-deploy-edd' ),
			'token.hide'               => __( 'Hide token', 'release-deploy-edd' ),
			'token.show'               => __( 'Show token', 'release-deploy-edd' ),
			'token.refresh'            => __( 'Click to refresh', 'release-deploy-edd' ),
			'token.howToCreate'        => __( 'How to Create a GitHub Token', 'release-deploy-edd' ),
			'token.instruction1'       => __( 'Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)', 'release-deploy-edd' ),
			'token.instruction2'       => __( 'Click "Generate new token (classic)"', 'release-deploy-edd' ),
			'token.instruction3'       => __( 'Give your token a descriptive name (e.g., "WordPress EDD")', 'release-deploy-edd' ),
			'token.instruction4'       => __( 'Select the "repo" scope (full control of private repositories)', 'release-deploy-edd' ),
			'token.instruction5'       => __( 'Click "Generate token" and copy the token immediately', 'release-deploy-edd' ),
			'token.instruction6'       => __( 'Paste the token in the field above and it will be validated automatically', 'release-deploy-edd' ),

			// File status strings
			'file.testing'             => __( 'Testing...', 'release-deploy-edd' ),
			'file.ready'               => __( 'Ready', 'release-deploy-edd' ),
			'file.networkError'        => __( 'Network error', 'release-deploy-edd' ),
			'file.retest'              => __( 'Click to re-test', 'release-deploy-edd' ),
			'file.retry'               => __( 'Click to retry', 'release-deploy-edd' ),

			// Sync strings
			'sync.autoVersionSync'     => __( 'Auto Version Sync', 'release-deploy-edd' ),
			'sync.autoChangelogSync'   => __( 'Auto Changelog Sync', 'release-deploy-edd' ),
		);
	}

	/**
	 * Get centralized localized data for JavaScript
	 *
	 * @param string|array $contexts Specific contexts to include ('settings', 'metabox', 'browser', 'webhook')
	 * @return array Localized data configuration
	 */
	public function get_localized_data( $contexts = array() ) {
		// Ensure contexts is an array
		if ( ! is_array( $contexts ) ) {
			$contexts = array( $contexts );
		}

		// Build base configuration with common data
		$data = array(
			'ajaxUrl'         => admin_url( 'admin-ajax.php' ),
			'features'        => $this->get_available_features(),
			'purchaseUrl'     => $this->config['purchase_url'] ?? '',
			'supportUrl'      => $this->config['support_url'] ?? '',
			'renewSupportUrl' => $this->config['renew_support_url'] ?? '',
			'settingsUrl'     => $this->config['settings_url'],
			'strings'         => $this->get_frontend_strings(),
			'contexts'        => array(),
		);

		// Add context-specific data
		foreach ( $contexts as $context ) {
			switch ( $context ) {
				case 'settings':
					$data['contexts']['settings'] = array(
						'token'             => edd_get_option( 'edd_release_deploy_token', '' ),
						'isConstantDefined' => defined( 'EDD_RELEASE_DEPLOY_TOKEN' ),
						'nonce'             => wp_create_nonce( 'edd_release_deploy_nonce' ),
					);
					break;

				case 'metabox':
					global $post;
					$post_id = $post ? $post->ID : 0;

					$data['contexts']['metabox'] = array(
						'downloadId' => $post_id,
						'nonce'      => wp_create_nonce( 'edd_release_deploy_metabox' ),
					);

					// Only include sync data if EDD Software Licensing is active
					if ( function_exists( 'edd_software_licensing' ) ) {
						$data['contexts']['metabox']['versionSync']   = array(
							'enabled'        => get_post_meta( $post_id, '_edd_sl_enabled', true ),
							'currentVersion' => get_post_meta( $post_id, '_edd_sl_version', true ),
							'githubVersion'  => get_post_meta( $post_id, '_edd_release_deploy_version', true ),
							'lastSync'       => get_post_meta( $post_id, '_edd_release_deploy_last_sync', true ),
							'nonce'          => wp_create_nonce( 'edd_release_deploy_version_sync' ),
						);
						$data['contexts']['metabox']['changelogSync'] = array(
							'enabled'  => get_post_meta( $post_id, '_edd_sl_enabled', true ),
							'lastSync' => get_post_meta( $post_id, '_edd_release_deploy_changelog_last_sync', true ),
							'isLinked' => get_post_meta( $post_id, '_edd_release_deploy_changelog_linked', true ),
							'nonce'    => wp_create_nonce( 'edd_release_deploy_changelog_sync' ),
						);
					}
					break;

				case 'browser':
					$data['contexts']['browser'] = array(
						'nonce' => wp_create_nonce( 'edd_release_deploy_nonce' ),
					);
					break;

				case 'webhook':
					// Webhooks are Pro-only feature - not available in Lite
					break;
			}
		}

		return $data;
	}
}
