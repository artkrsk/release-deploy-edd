# Developer Reference

The public integration contract, additive-only once released. This plugin's admin UI is internal and
may change freely; integrate against the hook below, not against control IDs or DOM structure.

This tier fires exactly one hook of its own. Everything else — version sync, webhooks, changelog sync —
requires [Release Deploy Pro](https://artemsemkin.com/plugins/release-deploy-edd-pro/).

## Asset bytes

`edd_release_deploy_asset_file` — downloads a release asset to a local temp file for a consumer that
needs to inspect its contents.

```php
/**
 * @param string $default   '' unless another callback already resolved it — always check for that
 *                           first and return it unchanged if so.
 * @param string $repo      owner/name.
 * @param int    $asset_id  A release asset's id, e.g. from a GitHub API response you fetched yourself.
 * @param int    $max_bytes Refuse anything larger, 0 for no limit.
 * @return string Absolute path to the downloaded file ('' on any failure). The caller owns it and
 *                must delete it.
 */
$path = apply_filters( 'edd_release_deploy_asset_file', '', $repo, $asset_id, $max_bytes );
```

## Services, if you must

Reachable only through the plugin's own stable namespace, never a stored reference to a vendored type
— the vendored GitHub client's class names are Strauss-prefixed per build and differ from the Pro
tier's, so nothing outside this plugin can stably type-hint against them:

```php
if ( class_exists( '\Arts\EDD\ReleaseDeploy\Plugin' ) ) {
	$services = \Arts\EDD\ReleaseDeploy\Plugin::instance()->get_services();
}
```

Registered on this tier: `github_api`, `uri_parser`, `asset_resolver`. Treat every member as untyped —
call methods, never `instanceof` or type-hint against the class you get back. The filter above exists
precisely so you don't need this; prefer it.

## What stays out

No facade function, no `class_alias`, no global accessor. No version-sync or webhook hooks on this
tier — see Release Deploy Pro's own `docs/developers.md` for those.
