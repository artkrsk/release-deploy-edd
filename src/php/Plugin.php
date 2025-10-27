<?php

namespace Arts\EDD\ReleaseDeploy;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use Arts\EDD\ReleaseDeploy\Base\Plugin as BasePlugin;
use Arts\GH\ReleaseBrowser\Browser;

/**
 * Main Plugin Class
 *
 * Release Deploy for Easy Digital Downloads
 */
class Plugin extends BasePlugin {

	/**
	 * Package browser instance
	 *
	 * @var Browser
	 */
	private $package_browser;

	/**
	 * Get default plugin configuration
	 *
	 * @return array Configuration array
	 */
	protected function get_default_config() {
		return array(
			'purchase_url' => 'https://artemsemkin.gumroad.com/l/release-deploy-edd-pro/',
			'settings_url' => $this->get_settings_url(),
		);
	}

	/**
	 * Get default strings
	 *
	 * @return array Empty strings array
	 */
	protected function get_default_strings() {
		return array();
	}

	/**
	 * Get settings URL
	 *
	 * @return string Settings page URL
	 */
	protected function get_settings_url() {
		return admin_url( 'edit.php?post_type=download&page=edd-settings&tab=extensions&section=release_deploy' );
	}

	/**
	 * Get default run action
	 *
	 * @return string WordPress action hook name
	 */
	protected function get_default_run_action() {
		return 'init';
	}

	/**
	 * Get core services classes
	 *
	 * @return array Service name => class mappings (empty - using package services)
	 */
	protected function get_core_services_classes() {
		return array();
	}

	/**
	 * Override to register package browser services
	 */
	protected function register_core_services() {
		// Initialize package browser first
		$this->init_package_browser();

		// Register package browser's services directly
		$this->register_package_services();
	}

	/**
	 * Register package browser services
	 */
	protected function register_package_services() {
		$this->services->github_api     = $this->package_browser->get_github_api();
		$this->services->uri_parser     = $this->package_browser->get_uri_parser();
		$this->services->asset_resolver = $this->package_browser->get_asset_resolver();
	}

	/**
	 * Get GitHub token from settings
	 *
	 * @return string
	 */
	private function get_github_token() {
		if ( defined( 'EDD_RELEASE_DEPLOY_TOKEN' ) ) {
			return constant( 'EDD_RELEASE_DEPLOY_TOKEN' );
		}

		// Use get_option directly to avoid dependency on EDD loading order
		$edd_settings = get_option( 'edd_settings', array() );
		return isset( $edd_settings['edd_release_deploy_token'] )
			? $edd_settings['edd_release_deploy_token']
			: '';
	}

	/**
	 * Get managers classes
	 *
	 * @return array Manager name => class mappings
	 */
	protected function get_managers_classes() {
		$managers = array(
			'downloads' => Managers\Downloads::class,
		);

		if ( is_admin() ) {
			$managers['frontend'] = Managers\Frontend::class;
			$managers['settings'] = Managers\Settings::class;
			$managers['metabox']  = Managers\Metabox::class;
		}

		return $managers;
	}

	/**
	 * Register WordPress actions
	 *
	 * @return self Method chaining
	 */
	protected function add_actions() {
		if ( is_admin() ) {
			add_action( 'admin_enqueue_scripts', array( $this->managers->frontend, 'enqueue_scripts' ) );
			add_action( 'edd_download_file_table_row', array( $this->managers->metabox, 'render_file_status' ), 10, 3 );
			add_action( 'wp_ajax_edd_release_deploy_test_connection', array( $this->managers->settings, 'ajax_test_connection' ) );
			add_action( 'edd_release_deploy_edd_token_react', array( $this->managers->settings, 'render_token_field' ) );
			add_action( 'edd_release_deploy_edd_upgrade_pro_react', array( $this->managers->settings, 'render_upgrade_pro_field' ) );
		}

		return $this;
	}

	/**
	 * Register WordPress filters
	 *
	 * @return self Method chaining
	 */
	protected function add_filters() {
		add_filter( 'edd_requested_file', array( $this->managers->downloads, 'maybe_serve_from_github' ), 10, 4 );

		if ( is_admin() ) {
			add_filter( 'edd_settings_sections_extensions', array( $this->managers->settings, 'add_section' ) );
			add_filter( 'edd_settings_extensions', array( $this->managers->settings, 'add_settings' ) );

			// Plugin action links
			if ( defined( 'ARTS_EDD_RD_PLUGIN_FILE' ) ) {
				add_filter( 'plugin_action_links_' . plugin_basename( ARTS_EDD_RD_PLUGIN_FILE ), array( $this->managers->settings, 'add_plugin_action_links' ) );
			}
		}

		return $this;
	}

	/**
	 * Initialize package browser
	 *
	 * @return self Method chaining
	 */
	protected function init_package_browser() {
		$this->package_browser = new Browser(
			array(
				'cache_prefix'  => 'edd_release_deploy_',
				'github_token'  => $this->get_github_token(),
				'protocol'      => 'edd-release-deploy://',
				'action_prefix' => 'edd_release_deploy',
				'settings_url'  => $this->get_settings_url(),
			)
		);

		$this->package_browser->register_modal_integration();

		return $this;
	}
}
