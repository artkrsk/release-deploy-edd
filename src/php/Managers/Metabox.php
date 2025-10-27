<?php

namespace Arts\EDD\ReleaseDeploy\Managers;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use Arts\EDD\ReleaseDeploy\Base\Manager;

/**
 * Metabox Manager
 */
class Metabox extends Manager {

	/**
	 * Render Release Deploy status indicator for each file
	 *
	 * @param int   $post_id Download ID
	 * @param int   $key File key/index
	 * @param array $args File arguments
	 */
	public function render_file_status( $post_id, $key, $args ) {
		$file_url = isset( $args['file'] ) ? $args['file'] : '';

		?>
<div class="release-deploy-edd-file-status-root" data-file-url="<?php echo esc_attr( $file_url ); ?>"></div>
		<?php
	}
}
