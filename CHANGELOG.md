# Changelog

## 1.1.2 – November 7, 2026

* fixed: a download with no update file selected in Software Licensing went out as a raw edd-release-deploy:// link instead of the GitHub file, because Licensing serves its first file row through a path the plugin did not recognise.
* fixed: the file status in the download editor showed Ready even when GitHub would not serve the file. It now checks that a download link can actually be fetched.
* fixed: the token field reported GitHub's anonymous 60 API calls per hour for a valid token. The rate limit was checked against the saved token rather than the one being validated, so a freshly entered token showed the unauthenticated limit, cached for a minute past saving.

## 1.1.1 – September 21, 2026

* fixed: the GitHub release browser rendered unstyled in the admin - a stray byte-order mark in the built stylesheet made browsers drop its color variables.

## 1.1.0 – September 15, 2026

* added: edd_release_deploy_asset_file filter downloads a release asset's bytes to a local file for inspection.
* fixed: the plugin could fail to detect an already-active Release Deploy Pro install depending on which plugin was activated first, occasionally leading to both loading in the same request.
* security: the GitHub release browser's AJAX handlers required only a "read" capability and had no nopriv gate removed - tightened to a configurable capability (edit_products here), dropped the unauthenticated registrations, and the download-URL handler now only accepts api.github.com as a target.

## 1.0.4 – August 13, 2026

* improved: full compatibility with WordPress 7.1

## 1.0.3 – June 29, 2026

* Fixed: the GitHub release browser could fail to open in the Download file editor; it now mounts reliably in WordPress's media modal.
* Improved: internal build, release, and test tooling.

## 1.0.2 – May 21, 2026

* improved: full compatibility with WordPress 7.0

## 1.0.0 – November 8, 2025

* Initial public release.
