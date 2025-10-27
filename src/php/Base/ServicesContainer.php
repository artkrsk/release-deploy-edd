<?php

namespace Arts\EDD\ReleaseDeploy\Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Services Container
 *
 * Provides dynamic property access to services with type safety.
 * Implements IteratorAggregate to support foreach iteration.
 *
 * @property \Arts\GH\ReleaseBrowser\Core\Services\GitHubAPI $github_api
 * @property \Arts\GH\ReleaseBrowser\Core\Services\URIParser $uri_parser
 * @property \Arts\GH\ReleaseBrowser\Core\Services\AssetResolver $asset_resolver
 *
 * @implements \IteratorAggregate<string,object>
 */
class ServicesContainer extends \stdClass implements \IteratorAggregate {
	/**
	 * Get iterator for foreach loops
	 *
	 * @return \Traversable<string, object>
	 */
	public function getIterator(): \Traversable {
		return new \ArrayIterator( get_object_vars( $this ) );
	}
}
