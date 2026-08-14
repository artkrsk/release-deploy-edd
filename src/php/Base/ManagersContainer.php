<?php

namespace Arts\EDD\ReleaseDeploy\Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use ArtsEDDRD\Arts\Base\Containers\ManagersContainer as BaseManagersContainer;

/**
 * Managers Container
 *
 * Extends the framework container (ArrayObject + property magic) so the
 * plugin's `BasePlugin<TManagers>` generic constraint holds; the @property
 * tags type the dynamic access for static analysis.
 *
 * @property \Arts\EDD\ReleaseDeploy\Managers\Downloads $downloads
 * @property \Arts\EDD\ReleaseDeploy\Managers\Frontend $frontend
 * @property \Arts\EDD\ReleaseDeploy\Managers\Settings $settings
 * @property \Arts\EDD\ReleaseDeploy\Managers\Metabox $metabox
 */
class ManagersContainer extends BaseManagersContainer {
}
