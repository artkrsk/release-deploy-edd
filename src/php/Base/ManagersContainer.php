<?php

namespace Arts\EDD\ReleaseDeploy\Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Managers Container
 *
 * Provides dynamic property access to managers with type safety.
 * Implements IteratorAggregate to support foreach iteration.
 *
 * @property \Arts\EDD\ReleaseDeploy\Managers\Downloads $downloads
 * @property \Arts\EDD\ReleaseDeploy\Managers\Frontend $frontend
 * @property \Arts\EDD\ReleaseDeploy\Managers\Settings $settings
 * @property \Arts\EDD\ReleaseDeploy\Managers\Metabox $metabox
 *
 * @implements \IteratorAggregate<string,object>
 */
class ManagersContainer extends \stdClass implements \IteratorAggregate {
	/**
	 * Get iterator for foreach loops
	 *
	 * @return \Traversable<string, object>
	 */
	public function getIterator(): \Traversable {
		return new \ArrayIterator( get_object_vars( $this ) );
	}
}
