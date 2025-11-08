=== Release Deploy for Easy Digital Downloads ===
Contributors:       artemsemkin
Tags:               easy-digital-downloads, github, workflow, webhook, automation
Requires at least: 6.0
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.0.0
license: GPL-3.0-or-later
License URI: https://www.gnu.org/licenses/gpl-3.0

Automate your EDD workflow. Push a tag, create a GitHub release, and files are instantly available—supports private repos, no local storage.

== Description ==

Release Deploy for Easy Digital Downloads connects your GitHub releases directly to your EDD store—no ZIP uploads, no manual updates, no local file storage.

**Perfect for developers** who want to streamline their release workflow: create a GitHub release and your customers instantly and securely get access.

**How it works**

Create a GitHub release (manually or via CI/CD) → Upload your ZIP as a release asset → Select it in EDD → Files serve directly to customers.

Your GitHub repository becomes the single source of truth for both your code and your downloads.

**Core features**

* **Direct delivery** – serve files from GitHub CDN without storing assets in `/wp-uploads`
* **Private & public repos** – both fully supported with secure token authentication
* **Visual file browser** – select GitHub release assets as easily as picking images from Media Library
* **Smart caching** – stay well within GitHub rate limits to ensure uninterrupted downloads
* **Real-time validation** – instant confirmation that files are accessible and ready to serve to customers
* **Rate limit monitoring** – stay informed about your GitHub API usage

**True CI/CD deployment for your EDD store**

Push a tag. Your EDD store updates instantly. Customers get the latest version. You do nothing.

== Source Code ==

The complete source code for this plugin, including non-compiled JavaScript and CSS, is available on [GitHub](https://github.com/artkrsk/release-deploy-edd)

Please see the GitHub repository for build instructions and development setup.

**Upgrade to Pro**

Upgrade to [Release Deploy Pro](https://artemsemkin.gumroad.com/l/release-deploy-edd-pro/BF2025) and unlock:

* **"Latest" release keyword** – set once, never update Download files again when you release
* **GitHub webhooks** – customers get new releases instantly after you push, zero manual sync
* **Version & changelog sync** – write once on GitHub, version numbers and changelogs update everywhere automatically
* **Email notifications** – get alerted immediately if downloads fail or rate limits approach
* **Priority support** – dedicated support forum with 24-hour response target

== Installation ==

1. Install and activate the plugin from the Plugins screen in WordPress.
2. Navigate to **Downloads → Settings → Extensions → Release Deploy** and add a Personal Access Token from your GitHub account.
3. Edit (or create) a Download and open the **Files** section.
4. Click **Browse Releases** to pick files from your repositories.
5. (Optional) Use the URL format `edd-release-deploy://owner/repo/release/file.zip` for quick configurations.

Your token is stored securely on your server and never leaves your WordPress installation.

== Frequently Asked Questions ==

= How does this work with my Easy Digital Downloads store? =

Instead of uploading ZIP files to WordPress, you store them as GitHub release assets. The plugin serves files directly from GitHub to your customers—no local storage needed.

This eliminates bandwidth costs and storage limitations of your hosting since files serve from reliable GitHub's CDN.

You can create releases manually on GitHub.com or automate the process with CI/CD pipelines. The plugin works with both workflows.

= Can I use private repositories? =

Yes! Add a GitHub Personal Access Token with `repo` scope. Your token is stored securely and never exposed to customers.

= What's the difference between Lite and Pro? =

**Lite (this plugin)** provides core file delivery from GitHub releases. You manually select which release to serve.

**Pro** adds full automation: "latest" release support, webhooks for instant updates, automatic version/changelog sync with EDD Software Licensing, and email notifications.

= Do I need both Lite and Pro installed? =

No. Pro is standalone and includes all Lite features. If you upgrade to Pro, deactivate and delete the Lite version to avoid conflicts.

= Is this compatible with EDD Software Licensing? =

Yes! Both Lite and Pro work seamlessly with EDD Software Licensing:

* **Automatic updates** – select your GitHub release file as the "Update File" and EDD Software Licensing will serve it to customers automatically
* **License validation** – all standard EDD SL features work normally
* **Pro bonus** – automatic version number and changelog syncing from your GitHub release notes

= How much does this cost GitHub API rate limits? =

The plugin caches GitHub API requests intelligently to minimize API calls. GitHub provides 5,000 requests per hour for authenticated requests, which is more than sufficient for any EDD store. The admin panel shows your current rate limit status, and Pro version includes email alerts if you approach the limit.

= Can I serve files from multiple repositories? =

Yes! Each Download can point to a different repository, release, or even a different GitHub account.

== External Services ==

This plugin connects to GitHub's REST API to serve downloadable files from your repositories.

**What service is used:**
[GitHub REST API](https://api.github.com)

**What data is sent:**
- Your Personal Access Token (for authentication)
- Repository names (to fetch releases)
- Release information (to retrieve download files)

**When data is sent:**
- When browsing repositories in the admin interface
- When validating file availability
- When customers download files from your store
- When checking API rate limits

**Privacy & Terms:**
- [GitHub Terms of Service](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service)
- [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement)

Your GitHub Personal Access Token is stored securely on your WordPress server and is never exposed to customers or third parties. All API requests are made server-side.

== Screenshots ==

1. GitHub Releases Browser - visually select files from your repositories.
2. EDD Download Edit Screen - remote GitHub file configured and validated, ready to serve to customers.
3. Settings Page - GitHub token configuration with API rate limit monitoring.

== Upgrade Notice ==

= 1.0.0 =
Initial public release.

== Changelog ==

= 1.0.0 =
* Initial public release.
