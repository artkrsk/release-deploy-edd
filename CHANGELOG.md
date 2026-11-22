# Changelog

## 1.1.5 – November 22, 2026

* improved: tested with WordPress 7.2.
* improved: requests to GitHub now give up after 10 seconds instead of 30, so a slow GitHub response no longer keeps a customer waiting as long.
* fixed: a download that could not be fetched from GitHub now shows a short "temporarily unavailable" message that browsers can retry, instead of a server error.
* fixed: licensed updates served through EDD Software Licensing failed with a server error for downloads hosted on GitHub.

## 1.1.4 – November 18, 2026

* improved: the GitHub file browser says why a repository's releases could not be loaded (an invalid token, the API rate limit, a network failure) instead of reporting that it has none.
* fixed: the edd_release_deploy_asset_file filter returned a truncated file when the asset was larger than the requested max_bytes; it now returns an empty string.

## 1.1.3 – November 9, 2026

* fixed: downloads served from GitHub failed with an HTTP 500 on LiteSpeed 1.9 and newer servers. EDD Software Licensing sends an empty Content-Length header for files it can't measure, which those servers reject; the plugin now drops that empty header.

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
