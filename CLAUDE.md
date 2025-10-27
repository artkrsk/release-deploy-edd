# Release Deploy for Easy Digital Downloads - Claude AI Assistant Guide

## Project Overview

**Release Deploy for Easy Digital Downloads** is a WordPress plugin that automates your EDD workflow by connecting GitHub releases directly to your Easy Digital Downloads store. Push a tag, create a GitHub release, and files are instantly available—supports private repos, no local storage. This is the **Lite/Free version** designed for WordPress.org distribution.

## Repository Information

- **Type**: WordPress Plugin (Free/Lite)
- **Framework**: WordPress + Easy Digital Downloads
- **Frontend**: React 18 + TypeScript + WordPress Components
- **Styling**: Sass with CSS custom properties
- **Build**: Custom build system with pnpm
- **License**: GPL-3.0-or-later
- **Text Domain**: `release-deploy-edd`
- **Namespace**: `Arts\EDD\ReleaseDeploy`
- **Distribution**: WordPress.org
- **Plugin URI**: https://artemsemkin.gumroad.com/l/release-deploy-edd-pro
- **Repository**: https://github.com/artkrsk/release-deploy-edd

## Architecture

### Core Concepts

- **Services Pattern**: Core services only in `src/php/Services/Core/`
- **Managers Pattern**: WordPress integration in `src/php/Managers/`
- **No License Dependency**: Standalone, no ArtsLicensePro dependency
- **Upgrade CTAs**: Pro feature prompts throughout UI
- **Freemium Model**: Pro version exists separately at `/Users/art/Projects/Release Deploy for EDD/Release Deploy for EDD Pro`

### Features

**Core Features (Lite):**

- Direct delivery from GitHub CDN without storing assets in `/wp-uploads`
- Private & public repositories with secure token authentication
- Visual file browser to select GitHub release assets
- Smart caching to stay within GitHub rate limits
- Real-time validation of file accessibility
- Rate limit monitoring for GitHub API usage

**Pro Features (Not in Lite):**

- "Latest" release keyword support
- GitHub webhooks for instant updates
- Version & changelog sync with EDD Software Licensing
- Email notifications for download failures and rate limits
- Priority support

**Upgrade CTAs**: Purple-themed prompts for Pro features throughout the UI

## Development Guidelines

### Code Standards

- **PHP**: WordPress Coding Standards, PSR-4 autoloading
- **TypeScript**: Strict mode, WordPress Components patterns
- **Sass**: BEM methodology, CSS custom properties
- **Security**: All inputs sanitized, outputs escaped, capability checks
- **WordPress.org Compliance**: 5-tag limit, proper text domain, no external dependencies

### Naming Conventions

- **CSS Classes**: `release-deploy-edd-{component}__element` (e.g., `release-deploy-edd-browser`, `release-deploy-edd-file-status`)
- **CSS Variables**: `--edd-gh-{property}` (legacy naming, e.g., `--edd-gh-pro-accent`, `--edd-gh-accent`)
- **PHP Classes**: PascalCase with namespace `Arts\EDD\ReleaseDeploy\{Type}\{Class}`
- **TypeScript**: PascalCase components, camelCase utilities
- **Hooks**: `edd_release_deploy_{action}` (e.g., `edd_release_deploy_test_connection`, `edd_release_deploy_get_repos`)
- **AJAX Actions**: `edd_release_deploy_{action}` (e.g., `edd_release_deploy_test_file`, `edd_release_deploy_clear_cache`)
- **Post Meta**: `_edd_release_deploy_{key}` (e.g., `_edd_release_deploy_version`, `_edd_release_deploy_changelog_linked`)
- **Constants**: `ARTS_EDD_RD_{NAME}` (e.g., `ARTS_EDD_RD_PLUGIN_VERSION`, `ARTS_EDD_RD_PLUGIN_FILE`)

### File Organization

- **PHP Services**: Core services only in `src/php/Services/Core/`
  - `GitHubAPI.php` - GitHub REST API communication
  - `URIParser.php` - Parse `edd-release-deploy://` URIs
  - `AssetResolver.php` - Resolve GitHub release assets
- **PHP Managers**: WordPress integration in `src/php/Managers/`
  - `GitHub.php` - GitHub API AJAX handlers
  - `Downloads.php` - Download file serving
  - `FileBrowser.php` - Media modal integration
  - `Frontend.php` - Admin assets enqueuing
  - `Settings.php` - Settings page management
  - `Metabox.php` - Download edit screen integration
- **React Components**: Core components + local ProBadge (no external dependency)
  - `src/ts/core/browser/` - Release browser UI
  - `src/ts/core/settings/` - Settings page UI
  - `src/ts/core/metabox/` - File status indicators
  - `src/ts/core/components/ProBadge.tsx` - Local ProBadge component
- **Sass**: Core styles only, upgrade CTA styling
  - `src/styles/core/components/` - Component styles
  - `src/styles/core/base/` - Variables and icons
- **No Pro Directory**: `src/ts/pro/` and `src/styles/pro/` do not exist (Pro features are stubs/badges)

## Build System

### Commands

```bash
pnpm run build     # Production build
pnpm run dev       # Development watch mode
pnpm run lint      # Code linting
pnpm run test      # Run tests
```

### Key Files

- **project.config.js**: Build configuration (Lite-specific)
  - Build formats: IIFE (UMD)
  - WordPress externals: React, ReactDOM, WordPress Components
  - Plugin package name: `release-deploy-edd`
  - Output: `dist/release-deploy-edd/`
- **composer.json**: PHP dependencies
  - `arts/base` - Plugin architecture foundation
  - `arts/utilities` - WordPress utility functions
  - No ArtsLicensePro dependency
- **package.json**: Node dependencies (React 18.3.1 for WordPress compatibility)
  - Custom build system in `__build__/`
  - React 18.3.1 + WordPress Components
  - TypeScript + Sass compilation

## Upgrade CTA System

### Purple Branding

- **Primary Color**: `--edd-gh-pro-accent: #7c3aed`
- **Light Backgrounds**: `color-mix(in srgb, var(--edd-gh-pro-accent) 5%, white)`
- **Borders**: `color-mix(in srgb, var(--edd-gh-pro-accent) 30%, white)`

### CTA Locations

1. **Settings Page**: "Get Release Deploy Pro for Easy Digital Downloads" banner with star icon (`release-deploy-edd-upgrade-pro`)
2. **Plugin Actions**: "Upgrade to Pro" link (first position when Pro not installed) - styled with `release-deploy-edd-upgrade-link`
3. **Browser Footer**: "Upgrade to Pro" button with purple theme
4. **Sync Features**: ProBadge components in purple containers
   - Version Sync (EDD Software Licensing integration)
   - Changelog Sync (EDD Software Licensing integration)

### ProBadge Implementation

- **Local Component**: `src/ts/core/components/ProBadge.tsx` (copied from ArtsLicensePro)
- **No External Dependency**: Prevents ArtsLicensePro requirement
- **Styling**: `src/styles/core/components/_pro-badge.sass`
- **CSS Classes**: `arts-license-pro-badge`, `arts-license-pro-badge-wrapper`
- **Usage**: Used in VersionSync and ChangelogSync components (stubs that show Pro badges)
- **Props**: `label`, `icon`, `href`, `text`, `status`, `showWrapper`, `renderAsLink`, `openInNewWindow`

## Testing

### WordPress.org Compliance

- Run WordPress Plugin Checker (must pass with 0 errors)
- Verify 5-tag limit in readme.txt (current tags: `easy-digital-downloads, github, workflow, webhook, automation`)
- Test with EDD 3.0+ on WordPress 6.0+
- Verify no external dependencies (only `arts/base` and `arts/utilities` which are GPL-3.0-or-later)
- Check proper text domain usage (`release-deploy-edd`)
- Requires Plugins: `easy-digital-downloads`

### Key Test Scenarios

- Install on clean WordPress → All core features work
- Configure GitHub token → Connection successful, rate limit displays
- Add GitHub URIs → File downloads work (`edd-release-deploy://owner/repo/release/file.zip` format)
- Browse repositories → Media modal works (`media_upload_github_releases` tab)
- View Pro features → Upgrade CTAs display correctly (Version Sync, Changelog Sync)
- Test file validation → Status indicators show correctly in Downloads metabox
- Test EDD Software Licensing integration → Version/Changelog sync badges appear

## Conflict Handling

### Pro Detection

- **Constant Check**: `defined('ARTS_EDD_RD_PRO_PLUGIN_VERSION')` - Pro is active
- **File Check**: `file_exists($plugins_dir . '/release-deploy-edd-pro/release-deploy-edd-pro.php')` - Pro is installed but inactive
- **Plugin File**: `release-deploy-edd-pro/release-deploy-edd-pro.php`

### Notice Types

1. **Pro Active**: Shows conflict notice with "Deactivate Lite" button (`notice-warning`)
   - Prevents Lite from loading if Pro is active
   - One-click deactivation link
2. **Pro Inactive**: Shows info notice with "Activate Pro" button (`notice-info`)
   - Encourages activation of installed Pro version
   - One-click activation link
3. **One-Click Actions**: Direct plugin activation/deactivation links via `wp_nonce_url()`

## AJAX Endpoints

### Core AJAX Actions

All registered in `Plugin::add_actions()`:

- `edd_release_deploy_test_connection` - Test GitHub token connection
- `edd_release_deploy_test_file` - Validate file accessibility
- `edd_release_deploy_get_repos` - Fetch user repositories
- `edd_release_deploy_get_releases` - Fetch repository releases
- `edd_release_deploy_clear_cache` - Clear GitHub API cache
- `edd_release_deploy_get_rate_limit` - Get GitHub API rate limit status

### Pro Feature Stubs

Pro feature AJAX endpoints return "Pro feature" error messages:

```php
public function ajax_sync_version() {
    check_ajax_referer('edd_release_deploy_version_sync', 'nonce');
    if (!current_user_can('edit_products')) {
        wp_send_json_error(['message' => 'Unauthorized']);
    }
    wp_send_json_error(['message' => __('Version sync is a Pro feature', 'release-deploy-edd')]);
}
```

Similar stubs exist for:

- `ajax_sync_version()` - Version sync
- `ajax_sync_changelog()` - Changelog sync
- `ajax_get_changelog()` - Get changelog from GitHub

## Constants & Configuration

### Plugin Constants

Defined in `src/wordpress-plugin/release-deploy-edd.php`:

- `ARTS_EDD_RD_PLUGIN_VERSION` - Plugin version from file header
- `ARTS_EDD_RD_PLUGIN_FILE` - Main plugin file path
- `ARTS_EDD_RD_PLUGIN_PATH` - Plugin directory path
- `ARTS_EDD_RD_PLUGIN_URL` - Plugin URL

### Configuration

- **Purchase URL**: `https://artemsemkin.gumroad.com/l/release-deploy-edd-pro/`
- **Text Domain**: `release-deploy-edd`
- **Namespace**: `Arts\EDD\ReleaseDeploy`
- **UMD Global**: `ArtsEDDReleaseDeploy` (defined in `project.config.js`)

## Memory Bank

Comprehensive project documentation may be available at: `/Users/art/Projects/memory-bank/ReleaseDeployEDD/`

## Common Tasks

### Adding Upgrade CTA

1. Use purple branding (`--edd-gh-pro-accent: #7c3aed`)
2. Follow existing CTA patterns (light background, purple border)
   - Background: `color-mix(in srgb, var(--edd-gh-pro-accent) 5%, white)`
   - Border: `color-mix(in srgb, var(--edd-gh-pro-accent) 30%, white)`
3. Include star icon for major CTAs (`dashicons-star-filled`)
4. Link to purchase URL: `https://artemsemkin.gumroad.com/l/release-deploy-edd-pro/`
5. Use ProBadge component for inline badges: `<ProBadge href={purchaseUrl} />`
6. Use upgrade section class: `release-deploy-edd-upgrade-pro` for full sections

### Debugging Missing Features

- Verify service doesn't exist: `!isset($this->services->version_sync)` or `!isset($this->services->webhook)`
- Check ProBadge renders correctly - inspect React root elements
- Verify upgrade CTAs display - check Settings page and plugin action links
- Check purple container styling applied - verify CSS variables load
- Check AJAX endpoints return Pro feature messages
- Verify EDD Software Licensing detection: `function_exists('edd_software_licensing')`

### WordPress.org Submission

- Ensure 5-tag limit in readme.txt (current: `easy-digital-downloads, github, workflow, webhook, automation`)
- Run Plugin Checker for compliance (must pass with 0 errors)
- Verify no external dependencies (only GPL-3.0-or-later packages)
- Test on clean WordPress installation
- Provide screenshots and assets (in `__assets__/` directory)
- Verify all text domains use `release-deploy-edd`
- Ensure proper `Requires Plugins` header: `easy-digital-downloads`

## Related Repository

**Pro Version**: `/Users/art/Projects/Release Deploy for EDD/Release Deploy for EDD Pro`

- Includes all Lite features plus Pro services
- Uses ArtsLicensePro for license management
- License-gated service loading
- Full functionality when properly licensed
- Pro services: `LatestRelease`, `Webhooks`, `Notification`, `VersionSync`, `ChangelogSync`

## URI Format

The plugin uses a custom URI scheme for GitHub release assets:

```
edd-release-deploy://owner/repo/release/file.zip
```

Example:

```
edd-release-deploy://artkrsk/release-deploy-edd/v1.0.0/release-deploy-edd.zip
```

This URI format is parsed by `URIParser` service and resolved to actual GitHub download URLs by `AssetResolver` service.
