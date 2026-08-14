<?php

namespace Arts\EDD\ReleaseDeploy\Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Services Container
 *
 * Same ArrayObject-plus-property-magic shape as the framework's managers
 * container: `$services->github_api = …` stores through offsets, `foreach`
 * iterates them, and an unregistered service reads as `null` instead of
 * raising a notice.
 *
 * @property \ArtsEDDRD\Arts\GH\ReleaseBrowser\Core\Interfaces\IPlatformAPI $github_api
 * @property \ArtsEDDRD\Arts\GH\ReleaseBrowser\Core\Services\URIParser $uri_parser
 * @property \ArtsEDDRD\Arts\GH\ReleaseBrowser\Core\Services\AssetResolver $asset_resolver
 *
 * @extends \ArrayObject<string, object>
 */
class ServicesContainer extends \ArrayObject {

	/**
	 * @param string $name Service id.
	 * @return object|null `null` when the service isn't registered (vs. raising a notice).
	 */
	public function __get( $name ) {
		return $this->offsetExists( $name ) ? $this->offsetGet( $name ) : null;
	}

	/**
	 * @param string $name  Service id.
	 * @param object $value Service instance.
	 * @return void
	 */
	public function __set( $name, $value ) {
		$this->offsetSet( $name, $value );
	}

	/**
	 * @param string $name Service id.
	 * @return bool
	 */
	public function __isset( $name ) {
		return $this->offsetExists( $name );
	}
}
