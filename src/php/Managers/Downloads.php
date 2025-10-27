<?php

namespace Arts\EDD\ReleaseDeploy\Managers;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use Arts\EDD\ReleaseDeploy\Base\Manager;

/**
 * Downloads Manager
 */
class Downloads extends Manager {

	/**
	 * Intercept download and serve from GitHub if configured
	 *
	 * @param string $file Current file path
	 * @param array  $download_files All files for this download
	 * @param int    $file_key Index of file being requested
	 * @param array  $args Download arguments (optional for EDD SL compatibility)
	 * @return string File path or S3 URL
	 */
	public function maybe_serve_from_github( $file, $download_files, $file_key, $args = array() ) {
		// Early return for non-GitHub files
		if ( ! isset( $download_files[ $file_key ]['file'] ) ) {
			return $file;
		}

		$file_path = $download_files[ $file_key ]['file'];

		if ( ! $this->services->uri_parser->is_github_file( $file_path ) ) {
			return $file;
		}

		// Extract payment/order context if available
		$payment_id  = isset( $args['payment_id'] ) ? $args['payment_id'] : null;
		$download_id = isset( $args['download_id'] ) ? $args['download_id'] : null;

		// Try to resolve GitHub URL, fallback to original file on any error
		$github_url = $this->resolve_github_url( $file_path, $payment_id, $download_id );

		return $github_url ? $github_url : $file;
	}

	/**
	 * Resolve GitHub URI to S3 download URL
	 *
	 * @param string $file_path GitHub URI
	 * @param int    $payment_id Optional payment ID for notification context
	 * @param int    $download_id Optional download ID for notification context
	 * @return string|null S3 URL or null on error
	 */
	private function resolve_github_url( $file_path, $payment_id = null, $download_id = null ) {
		$parsed = $this->services->uri_parser->parse( $file_path );

		if ( is_wp_error( $parsed ) ) {
			return null;
		}

		// Resolve the release using available services
		$release = $this->resolve_release( $parsed );

		if ( ! $release ) {
			return null;
		}

		// Find asset in release
		$asset = $this->services->asset_resolver->find_asset_in_release( $release, $parsed['asset'] );

		if ( ! $asset || empty( $asset['id'] ) ) {
			return null;
		}

		// Get download URL
		$s3_url = $this->services->github_api->get_download_url( $parsed['repo'], $asset['id'] );

		if ( is_wp_error( $s3_url ) ) {
			return null;
		}

		return $s3_url;
	}

	/**
	 * Resolve release using available services
	 *
	 * @param array $parsed Parsed GitHub URI
	 * @return array|null Release data or null
	 */
	private function resolve_release( $parsed ) {
		// Lite version only supports specific release tags (not "latest" keyword - that's Pro)
		if ( $parsed['release'] !== 'latest' ) {
			return $this->services->github_api->get_release_by_tag( $parsed['repo'], $parsed['release'] );
		}

		// "latest" keyword requires Pro version
		return null;
	}
}
