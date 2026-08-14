<?php

namespace Arts\EDD\ReleaseDeploy\Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use ArtsEDDRD\Arts\Base\Plugins\BasePlugin;

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
	protected function init(): void {
		$this->init_services_container();
		$this->register_services();
		parent::init();
		$this->inject_services_to_managers();
	}

	/**
	 * Inject services container to all managers
	 */
	protected function inject_services_to_managers(): void {
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
	protected function init_services_container(): void {
		$this->services = new ServicesContainer();
	}

	/**
	 * Register all services
	 */
	protected function register_services(): void {
		// Register core services
		$this->register_core_services();

		// Register pro services if available
		$this->register_pro_services();
	}

	/**
	 * Register core services
	 */
	protected function register_core_services(): void {
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
	protected function register_pro_services(): void {
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
	 * @return array<string, class-string> Service name => class mappings
	 */
	abstract protected function get_core_services_classes();

	/**
	 * Get pro services classes to register
	 *
	 * @return array<string, class-string> Service name => class mappings
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
	 * Override to use the typed ManagersContainer.
	 */
	protected function init_managers_container(): void {
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
