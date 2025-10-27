<?php

namespace Arts\EDD\ReleaseDeploy\Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use Arts\Base\Plugins\BasePlugin;

/**
 * Base Plugin Class
 *
 * @extends BasePlugin<ManagersContainer>
 */
abstract class Plugin extends BasePlugin {
	/**
	 * Services container.
	 *
	 * @var \Arts\EDD\ReleaseDeploy\Base\ServicesContainer
	 */
	protected $services;

	/**
	 * Initialize plugin
	 */
	protected function init() {
		$this->init_services_container();
		$this->register_services();
		parent::init();
		$this->inject_services_to_managers();

		return $this;
	}

	/**
	 * Inject services container to all managers
	 */
	protected function inject_services_to_managers() {
		if ( ! is_object( $this->managers ) ) {
			return;
		}

		foreach ( $this->managers as $manager ) {
			if ( method_exists( $manager, 'set_services' ) ) {
				$manager->set_services( $this->services );
			}
		}
	}

	/**
	 * Initialize services container
	 */
	protected function init_services_container() {
		$this->services = new ServicesContainer();
	}

	/**
	 * Register all services
	 */
	protected function register_services() {
		// Register core services
		$this->register_core_services();

		// Register pro services if available
		$this->register_pro_services();
	}

	/**
	 * Register core services
	 */
	protected function register_core_services() {
		$core_services = $this->get_core_services_classes();

		foreach ( $core_services as $name => $class ) {
			if ( class_exists( $class ) ) {
				$this->services->$name = new $class( $this );
			}
		}
	}

	/**
	 * Register pro services if they exist
	 */
	protected function register_pro_services() {
		$pro_services = $this->get_pro_services_classes();

		foreach ( $pro_services as $name => $class ) {
			if ( class_exists( $class ) ) {
				$this->services->$name = new $class( $this );
			}
		}
	}

	/**
	 * Get core services classes to register
	 *
	 * @return array Service name => class mappings
	 */
	abstract protected function get_core_services_classes();

	/**
	 * Get pro services classes to register
	 *
	 * @return array Service name => class mappings
	 */
	protected function get_pro_services_classes() {
		// Default empty, can be overridden in child class
		return array();
	}

	/**
	 * Get all registered services
	 *
	 * @return \Arts\EDD\ReleaseDeploy\Base\ServicesContainer
	 */
	public function get_services() {
		return $this->services;
	}

	/**
	 * Initialize the managers container.
	 *
	 * Override to use custom ManagersContainer instead of default \stdClass.
	 *
	 * @return void
	 */
	protected function init_managers_container() {
		$this->managers = new ManagersContainer();
	}

	/**
	 * Get managers container (for services to access managers)
	 *
	 * @return \Arts\EDD\ReleaseDeploy\Base\ManagersContainer
	 */
	public function get_managers() {
		return $this->managers;
	}
}
