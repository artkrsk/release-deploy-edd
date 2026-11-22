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
	 * Resolves `$file` itself, never `$download_files[ $file_key ]`: when a download has no
	 * `_edd_sl_upgrade_file_key`, EDD SL serves its first row by `array_shift`ing it out of
	 * `$download_files` and still passes the empty key, so a key lookup misses.
	 *
	 * A GitHub file that can't be resolved ends the request with a 503. Handing the raw URI back
	 * would make EDD and EDD SL treat it as a path, which fails with a bare 500 or a 501.
	 *
	 * @param string                   $file The file EDD or EDD SL is about to serve.
	 * @param array<int|string, mixed> $download_files All files for this download (unused, kept for hook arity).
	 * @param int|string               $file_key Index of file being requested (unused, kept for hook arity).
	 * @param array<string, mixed>     $args Download arguments (unused, kept for hook arity; EDD SL passes none).
	 * @return string File path or S3 URL
	 */
	public function maybe_serve_from_github( $file, $download_files, $file_key, $args = array() ) {
		if ( ! is_string( $file ) || ! $this->services->uri_parser->is_github_file( $file ) ) {
			return $file;
		}

		$github_url = $this->resolve_github_url( $file );

		if ( is_wp_error( $github_url ) ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- Lets a failed delivery be traced from the server alone.
			error_log( sprintf( 'Release Deploy for EDD: download of %s failed: [%s] %s', $file, $github_url->get_error_code(), $github_url->get_error_message() ) );

			self::die_unavailable();
		}

		// EDD SL sends `Content-Length: ` + filesize() of the URL, which is false for a remote
		// file, so the header goes out empty. LiteSpeed 1.9+ rejects that response with a 500.
		self::drop_empty_content_length_on_send();

		return $github_url;
	}

	/**
	 * End the request with a retryable 503 that a customer can read.
	 *
	 * @return never
	 */
	private static function die_unavailable() {
		if ( ! headers_sent() ) {
			header( 'Retry-After: 120' );
		}

		wp_die(
			esc_html__( 'This download is temporarily unavailable. Please try again in a few minutes.', 'release-deploy-edd' ),
			esc_html__( 'Download unavailable', 'release-deploy-edd' ),
			array( 'response' => 503 )
		);
	}

	/**
	 * Remove an empty Content-Length header right before headers are sent. A valid one is kept.
	 */
	private static function drop_empty_content_length_on_send(): void {
		static $registered = false;

		if ( $registered ) {
			return;
		}

		$registered = true;

		header_register_callback(
			static function (): void {
				foreach ( headers_list() as $header ) {
					if ( preg_match( '/^Content-Length:\s*$/i', $header ) ) {
						header_remove( 'Content-Length' );
						return;
					}
				}
			}
		);
	}

	/**
	 * Resolve GitHub URI to S3 download URL
	 *
	 * @param string $file_path GitHub URI.
	 * @return string|\WP_Error S3 URL, or why it couldn't be resolved
	 */
	private function resolve_github_url( $file_path ) {
		$parsed = $this->services->uri_parser->parse( $file_path );

		if ( is_wp_error( $parsed ) ) {
			return $parsed;
		}

		if ( empty( $parsed['valid'] ) || ! isset( $parsed['repo'], $parsed['release'] ) ) {
			return new \WP_Error( 'invalid_uri', 'Invalid GitHub URI' );
		}

		$release = $this->resolve_release( $parsed['repo'], $parsed['release'] );

		if ( is_wp_error( $release ) ) {
			return new \WP_Error( $release->get_error_code(), 'Release lookup failed: ' . $release->get_error_message() );
		}

		$asset = $this->services->asset_resolver->find_asset_in_release( $release, $parsed['asset'] ?? null );

		if ( ! $asset || empty( $asset['id'] ) || ! is_numeric( $asset['id'] ) ) {
			return new \WP_Error( 'asset_not_found', 'Asset not found in release' );
		}

		$s3_url = $this->services->github_api->get_download_url( $parsed['repo'], (int) $asset['id'] );

		if ( is_wp_error( $s3_url ) ) {
			return new \WP_Error( $s3_url->get_error_code(), 'Download URL request failed: ' . $s3_url->get_error_message() );
		}

		return $s3_url;
	}

	/**
	 * Resolve release using available services
	 *
	 * @param string $repo Repository in owner/name form.
	 * @param string $release Release tag from the parsed URI.
	 * @return array<string, mixed>|\WP_Error Release data, or the GitHub error
	 */
	private function resolve_release( $repo, $release ) {
		// Lite version only supports specific release tags (not "latest" keyword - that's Pro)
		if ( $release !== 'latest' ) {
			return $this->services->github_api->get_release_by_tag( $repo, $release );
		}

		return new \WP_Error( 'latest_requires_pro', 'The "latest" release keyword requires Release Deploy Pro' );
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

		$file = $this->services->github_api->download_asset_to_file(
			$repo,
			$asset_id,
			60,
			is_numeric( $max_bytes ) ? (int) $max_bytes : 0
		);

		return is_wp_error( $file ) ? $path : $file;
	}
}
