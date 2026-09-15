# Changelog

## 1.1.0

* added: edd_release_deploy_asset_file filter downloads a release asset's bytes to a local file for inspection.
* fixed: the plugin could fail to detect an already-active Release Deploy Pro install depending on which plugin was activated first, occasionally leading to both loading in the same request.
* security: the GitHub release browser's AJAX handlers required only a "read" capability and had no nopriv gate removed - tightened to a configurable capability (edit_products here), dropped the unauthenticated registrations, and the download-URL handler now only accepts api.github.com as a target.

## 1.0.4

* improved: full compatibility with WordPress 7.1

## 1.0.3

* Fixed: the GitHub release browser could fail to open in the Download file editor; it now mounts reliably in WordPress's media modal.
* Improved: internal build, release, and test tooling.

## 1.0.2

* improved: full compatibility with WordPress 7.0

## 1.0.0

* Initial public release.
