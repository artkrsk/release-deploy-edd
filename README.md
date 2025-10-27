# Release Deploy for Easy Digital Downloads

**Source code repository for the [Release Deploy for EDD WordPress plugin](https://wordpress.org/plugins/release-deploy-edd/).**

Automate your EDD workflow. Push a tag, create a GitHub release, and files are instantly available—supports private repos, no local storage.

## About

This plugin connects your GitHub releases directly to your Easy Digital Downloads store, eliminating the need for ZIP uploads and local file storage. Create a GitHub release and your customers instantly get secure access to download files.

## Features

- **Direct delivery** – Serve files from GitHub CDN without storing assets in `/wp-uploads`
- **Private & public repos** – Both fully supported with secure token authentication
- **Visual file browser** – Select GitHub release assets as easily as picking images from Media Library
- **Smart caching** – Stay well within GitHub rate limits to ensure uninterrupted downloads
- **Real-time validation** – Instant confirmation that files are accessible and ready to serve
- **Rate limit monitoring** – Stay informed about your GitHub API usage

[View full feature list on WordPress.org →](https://wordpress.org/plugins/release-deploy-edd/)

## Building from Source

This repository contains the full source code including non-compiled TypeScript and Sass files.

### Requirements

- Node.js 18+ and pnpm
- PHP 7.4+ with Composer

### Build Steps

```bash
# Install dependencies
pnpm install
composer install

# Development build (with watch mode)
pnpm run dev

# Production build
pnpm run build
```

The compiled plugin will be in the `dist/release-deploy-edd/` directory.

### Build Process

- TypeScript → JavaScript compilation
- Sass → CSS compilation  
- Webpack for bundling
- WordPress component integration

## Directory Structure

- `src/php/` - PHP source code (PSR-4 autoloaded)
- `src/ts/` - TypeScript source code
- `src/styles/` - Sass stylesheets
- `src/wordpress-plugin/` - WordPress plugin metadata and readme
- `__build__/` - Custom build system
- `dist/` - Compiled plugin output

## Dependencies

This plugin uses the following libraries (included in the distribution):

- [arts/base](https://github.com/artkrsk/arts-base) - Plugin architecture foundation
- [arts/utilities](https://github.com/artkrsk/arts-utilities) - WordPress utility functions

All dependencies are GPL-3.0-or-later licensed for full WordPress compatibility.

## Pro Version

Upgrade to [Release Deploy Pro](https://artemsemkin.gumroad.com/l/release-deploy-edd-pro/) for advanced automation:

- **"Latest" release keyword** – Set once, never update Download files again
- **GitHub webhooks** – Customers get new releases instantly after you push
- **Version & changelog sync** – Automatic updates everywhere
- **Email notifications** – Get alerted immediately if downloads fail
- **Priority support** – 24-hour response target

## License

GPL-3.0-or-later - See [LICENSE](LICENSE) file

## Support

- [WordPress.org Support Forum](https://wordpress.org/support/plugin/release-deploy-edd/)
- [Documentation](https://wordpress.org/plugins/release-deploy-edd/)

---

Made with ❤️ by [Artem Semkin](https://artemsemkin.com)

