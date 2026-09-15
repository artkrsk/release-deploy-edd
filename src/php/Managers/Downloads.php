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
	 * @param string                   $file Current file path.
	 * @param array<int|string, mixed> $download_files All files for this download.
	 * @param int|string               $file_key Index of file being requested.
	 * @param array<string, mixed>     $args Download arguments (optional for EDD SL compatibility).
	 * @return string File path or S3 URL
	 */
	public function maybe_serve_from_github( $file, $download_files, $file_key, $args = array() ) {
		$entry = $download_files[ $file_key ] ?? null;

		if ( ! is_array( $entry ) || ! isset( $entry['file'] ) || ! is_string( $entry['file'] ) ) {
			return $file;
		}

		$file_path = $entry['file'];

		if ( ! $this->services->uri_parser->is_github_file( $file_path ) ) {
			return $file;
		}

		// Absent when EDD Software Licensing applies this filter: it passes only
		// three arguments, so $args defaults to an empty array on that path.
		$payment_id  = isset( $args['payment_id'] ) && is_numeric( $args['payment_id'] ) ? (int) $args['payment_id'] : null;
		$download_id = isset( $args['download_id'] ) && is_numeric( $args['download_id'] ) ? (int) $args['download_id'] : null;

		// Try to resolve GitHub URL, fallback to original file on any error
		$github_url = $this->resolve_github_url( $file_path, $payment_id, $download_id );

		return $github_url ? $github_url : $file;
	}

	/**
	 * Resolve GitHub URI to S3 download URL
	 *
	 * @param string   $file_path GitHub URI.
	 * @param int|null $payment_id Optional payment ID for notification context.
	 * @param int|null $download_id Optional download ID for notification context.
	 * @return string|null S3 URL or null on error
	 */
	private function resolve_github_url( $file_path, $payment_id = null, $download_id = null ) {
		$parsed = $this->services->uri_parser->parse( $file_path );

		if ( is_wp_error( $parsed ) || empty( $parsed['valid'] ) || ! isset( $parsed['repo'], $parsed['release'] ) ) {
			return null;
		}

		$release = $this->resolve_release( $parsed['repo'], $parsed['release'] );

		if ( ! $release ) {
			return null;
		}

		$asset = $this->services->asset_resolver->find_asset_in_release( $release, $parsed['asset'] ?? null );

		if ( ! $asset || empty( $asset['id'] ) || ! is_numeric( $asset['id'] ) ) {
			return null;
		}

		// Get download URL — the API contract signals failure with an empty
		// string, not a WP_Error (the old is_wp_error() check here was dead).
		$s3_url = $this->services->github_api->get_download_url( $parsed['repo'], (int) $asset['id'] );

		if ( '' === $s3_url ) {
			return null;
		}

		return $s3_url;
	}

	/**
	 * Resolve release using available services
	 *
	 * @param string $repo Repository in owner/name form.
	 * @param string $release Release tag from the parsed URI.
	 * @return array<string, mixed>|null Release data or null
	 */
	private function resolve_release( $repo, $release ) {
		// Lite version only supports specific release tags (not "latest" keyword - that's Pro)
		if ( $release !== 'latest' ) {
			return $this->services->github_api->get_release_by_tag( $repo, $release );
		}

		// "latest" keyword requires Pro version
		return null;
	}
	/**
	 * Answer `edd_release_deploy_asset_file` — download a release asset and hand back a local path.
	 *
	 * The integration seam for code that needs an asset's BYTES (to read a version out of a ZIP, say).
	 * A filter rather than an accessor on purpose: the two tiers ship different class namespaces and the
	 * vendored GitHub client is namespace-prefixed per build, so no class or interface name is stable
	 * for an outside caller — a hook name is. Nothing internal is handed out.
	 *
	 * The caller owns the returned file and must delete it. Returns the unmodified default ('' unless
	 * another callback got there first) on any failure, so a consumer can treat '' as "not available".
	 *
	 * @param string|mixed $path      Default, normally ''.
	 * @param string|mixed $repo      Repository in `owner/name` form.
	 * @param int|mixed    $asset_id  Release asset id.
	 * @param int|mixed    $max_bytes Refuse anything larger, 0 for no limit.
	 * @return string
	 */
	public function filter_asset_file( $path, $repo = '', $asset_id = 0, $max_bytes = 0 ) {
		if ( ! is_string( $path ) ) {
			$path = '';
		}

		if ( '' !== $path ) {
			return $path;
		}

		$repo     = is_string( $repo ) ? $repo : '';
		$asset_id = is_numeric( $asset_id ) ? (int) $asset_id : 0;

		if ( '' === $repo || $asset_id <= 0 ) {
			return $path;
		}

		$api = $this->services->github_api;

		// Older builds of the GitHub client predate this method; the seam degrades to "unavailable"
		// rather than fatalling, which is what a consumer's '' check already expects.
		if ( ! method_exists( $api, 'download_asset_to_file' ) ) {
			return $path;
		}

		$file = $api->download_asset_to_file(
			$repo,
			$asset_id,
			60,
			is_numeric( $max_bytes ) ? (int) $max_bytes : 0
		);

		return is_string( $file ) ? $file : $path;
	}
}
