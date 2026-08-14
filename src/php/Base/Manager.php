<?php

namespace Arts\EDD\ReleaseDeploy\Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use ArtsEDDRD\Arts\Base\Managers\BaseManager;

/**
 * Base Manager Class
 *
 * Managers handle WordPress integration (hooks, admin UI, etc.)
 */
abstract class Manager extends BaseManager {
	/**
	 * Managers container.
	 *
	 * @var \Arts\EDD\ReleaseDeploy\Base\ManagersContainer|null
	 */
	protected $managers;

	/**
	 * Services container.
	 *
	 * @var \Arts\EDD\ReleaseDeploy\Base\ServicesContainer
	 */
	protected $services;

	/**
	 * Set services container
	 *
	 * @param \Arts\EDD\ReleaseDeploy\Base\ServicesContainer $services Services container instance.
	 */
	public function set_services( $services ): void {
		$this->services = $services;
	}
}
