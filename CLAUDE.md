# Release Deploy for Easy Digital Downloads (Lite)

WordPress plugin that serves EDD download files straight from GitHub release assets instead of
`/wp-uploads`: a Download's file field holds an `edd-release-deploy://` URI, and the plugin
swaps it for GitHub's signed S3 URL at download time. This repo is the **free/Lite** edition on
wp.org; the paid edition is a separate repo (see *Related repositories*).

- Namespace: `Arts\EDD\ReleaseDeploy` (`src/php/`) — text domain `release-deploy-edd`
- License GPL-3.0-or-later · Requires WP 6.0+, PHP 8.0+, EDD 3.0+ (`Requires Plugins: easy-digital-downloads`)
- Plugin URI `https://artemsemkin.com/plugins/release-deploy-edd/` · repo `github.com/artkrsk/release-deploy-edd`
- Purchase URL (every Pro CTA points here): `https://artemsemkin.gumroad.com/l/release-deploy-edd-pro/`

## Architecture

Almost all real logic lives in shared packages; this repo is the EDD-specific wiring.

- **Services** come from `arts/github-release-browser` — there is no local `Services/` directory.
  `Plugin::register_core_services()` constructs the package's `Browser` and copies its
  `github_api` / `uri_parser` / `asset_resolver` onto the typed `ServicesContainer`.
- **Managers** (`src/php/Managers/`) hold the WordPress integration:
  - `Downloads` — filters `edd_requested_file`, resolves the URI to a GitHub asset URL
  - `Frontend` — admin asset enqueue + the localized `releaseDeployEDD` blob
  - `Settings` — EDD settings section, token field, `ajax_test_connection`, plugin action links
  - `Metabox` — renders the file-status React root on the Download edit screen
- **Base** (`src/php/Base/`) — thin subclasses of `arts/base` plus `ServicesContainer` /
  `ManagersContainer`, whose `@property` tags are the only type source for the magic accessors.
- **TypeScript** is glue only. `SettingsApp`, `FileStatus`, `VersionSync`, `ChangelogSync`,
  `EDD_SELECTORS` come from `@arts/release-deploy-core`; the browser UI from
  `@arts/github-release-browser`. Local: `admin-init*.ts` (bootstrap) and
  `media/edd-media-browser.ts` (bridges the browser into EDD's `wp.media` modal).
- **Sass**: `src/styles/index.scss` → `core/index.scss`, which `@use`s the core package's `dist`
  plus `components/_settings.scss` and `components/_upgrade-pro.scss`. The release browser ships
  and enqueues its own CSS from its package — nothing here styles it.

No license dependency: Lite never registers Pro services, so `version_sync`, `webhook`, etc. are
absent from the container by construction. Pro features render as upgrade badges/CTAs only.

## Commands

```bash
pnpm run dev:plugin   # watch + sync into a Local site (needs .env DEV_TARGET)
pnpm run build        # arts-wp build → dist/release-deploy-edd/ (+ .zip)
pnpm run test         # vitest (tests/ts/)
pnpm run release      # arts-wp release
```

Gates, all runnable locally and wired into lefthook (pre-commit: biome, stylelint, phpcbf, tsc;
pre-push: vitest, phpstan, phpcs):

```bash
pnpm exec tsc --noEmit && pnpm exec biome check . && pnpm exec stylelint 'src/styles/**/*.scss'
vendor/bin/phpstan analyse --memory-limit=1G && vendor/bin/phpcs
```

## Gotchas

- **`composer.json` is the single source of version and plugin meta.** `arts-wp` stamps the
  plugin header, readme.txt and package.json from it — never hand-edit a version anywhere else.
  Changelogs are hand-written in `readme.txt` as `* added:` / `* improved:` / `* fixed:` /
  `* security:` bullets and validated at release.
- **Strauss prefixes vendor code to `ArtsEDDRD\`** into `vendor-prefixed/` (classmap-autoloaded)
  on every composer install/update. First-party `Arts\EDD\ReleaseDeploy\` is NOT prefixed — so
  imports look like `use ArtsEDDRD\Arts\GH\ReleaseBrowser\Browser;` next to unprefixed local ones.
- **React stays `^18`** and is externalized to WordPress's own runtime copy. A major bump breaks
  silently at runtime (two React copies, dead hooks state); renovate disables react majors.
  `@wordpress/date` is deliberately *not* externalized — WP doesn't guarantee `wp.date` here.
- **Built assets land in `src/php/libraries/release-deploy-edd/`** inside the packaged plugin;
  that path is baked into the `wp_enqueue_*` calls in `Frontend`.
- **`edd_requested_file` arrives with 4 args from EDD core but only 3 from EDD Software
  Licensing**, so `$args` (payment/download context) is empty on the SL path — hence the default.
- **`get_download_url()` signals failure with an empty string, not a `WP_Error`.**
- The `"latest"` release keyword is Pro-only: `Downloads::resolve_release()` returns `null` for it.
- wp.org compliance: readme.txt is capped at **5 tags** (`easy-digital-downloads, github,
  workflow, webhook, automation`); Plugin Checker must pass with 0 errors.

## Frozen identifiers

Renaming any of these is a breaking change — they cross the PHP/JS/DB boundary.

| Kind | Value |
|---|---|
| URI scheme | `edd-release-deploy://owner/repo/release/file.zip` |
| Settings section | `release_deploy` (Extensions tab); page URL `edit.php?post_type=download&page=edd-settings&tab=extensions&section=release_deploy` |
| Option / constant | `edd_release_deploy_token` in `edd_settings`; override constant `EDD_RELEASE_DEPLOY_TOKEN` |
| AJAX action | `edd_release_deploy_test_connection` (cap `manage_shop_settings`) — the only one registered here; the browser's endpoints are registered by its package under the `edd_release_deploy` prefix |
| Nonces | `edd_release_deploy_nonce`, `edd_release_deploy_metabox`, `edd_release_deploy_version_sync`, `edd_release_deploy_changelog_sync` |
| EDD field hooks | `edd_release_deploy_edd_token_react`, `edd_release_deploy_edd_upgrade_pro_react` |
| Script/style handle | `release-deploy-edd`; localized global `window.releaseDeployEDD` |
| Browser globals | `window.ArtsGitHubReleaseBrowser` (UMD component), `window.githubReleaseBrowserConfig` (localized by the package's PHP) |
| DOM roots | `#release-deploy-edd-settings-root`, `.release-deploy-edd-file-status-root`, `#github-release-browser-root` |
| Media frame | state/menu id `github-releases` on `wp.media.frames.file_frame` |
| Post meta | `_edd_release_deploy_*` (e.g. `_edd_release_deploy_version`, `_edd_release_deploy_changelog_linked`) |
| PHP constants | `ARTS_EDD_RD_PLUGIN_VERSION` / `_FILE` / `_PATH` / `_URL` |
| CSS | classes `release-deploy-edd-{component}__element`; custom properties keep the legacy `--edd-gh-*` names |

## Conventions

- PHP: WordPress Coding Standards via `arts/wp-plugin-standards`; PSR-4 under `src/php/`.
  Sanitize input, escape output, capability-check every AJAX handler.
- TypeScript strict; components follow WordPress Components patterns.
- Sass uses BEM with `_` modifiers and the `--edd-gh-*` custom properties.
- Pro CTAs use the purple accent `--edd-gh-pro-accent` (`#7c3aed`) with
  `color-mix(in srgb, … 5%, white)` backgrounds and `… 30%, white` borders. They appear on the
  settings page (`.release-deploy-edd-upgrade-pro`), as a plugin action link
  (`.release-deploy-edd-upgrade-link`), in the browser footer, and as sync badges.

## Pro conflict handling

`src/wordpress-plugin/release-deploy-edd.php` bails before `Plugin::instance()` when Pro is
active (`defined('ARTS_EDD_RD_PRO_PLUGIN_VERSION')`) and shows a warning notice with a one-click
"Deactivate Lite" link. If Pro is installed but inactive (`release-deploy-edd-pro/release-deploy-edd-pro.php`
exists), Lite still loads and shows an info notice with an "Activate Pro" link. The plugin action
link only offers "Upgrade to Pro" when that Pro file is absent.

## Related repositories

- Pro edition: `/Users/art/Projects/Plugins/release-deploy-edd-pro` — same feature set plus
  latest-release keyword, webhooks, version/changelog sync, notifications; adds ArtsLicensePro
  and its own updater, and is distributed via GitHub releases rather than wp.org.
- Shared TS core: `@arts/release-deploy-core` · GitHub services + browser UI:
  `@arts/github-release-browser` · build/release CLI: `@arts/wp-plugin-tooling` (`arts-wp`).
