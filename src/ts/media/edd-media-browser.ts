/**
 * GitHub Releases browser integration for EDD's media modal.
 *
 * EDD opens a pruned wp.media "post" frame (wp.media.frames.file_frame) for the
 * Download "Files" field and empties its menu on every default render. We register
 * a Backbone menu item + a content view that mounts the @arts GitHub release
 * browser directly in the modal (no iframe), and on selection write the
 * edd-release-deploy:// URI into the file row that triggered the upload.
 *
 * This replaces the fragile classic `media_upload_tabs` iframe tab, which EDD's
 * pruned frame discards (the tab "appeared once, gone after a reset").
 *
 * BrowserApp is read from the `window.ArtsGitHubReleaseBrowser` global that the
 * @arts/github-release-browser UMD exposes (its wp-init entry sets the component
 * as the UMD default export); its config comes from `window.githubReleaseBrowserConfig`,
 * which the package's PHP localizes on admin pages.
 */
import { EDD_SELECTORS } from '@arts/release-deploy-core'

const STATE_ID = 'github-releases'
const ROOT_ID = 'github-release-browser-root'

/** Config localized by the @arts/github-release-browser PHP (window.githubReleaseBrowserConfig). */
interface IBrowserGlobalConfig {
  apiUrl: string
  nonce: string
  actionPrefix: string
  protocol: string
  [key: string]: unknown
}

/** Register the media-frame integration. Safe to call on any admin page. */
export function initEDDMediaBrowser(): void {
  const w = window as any
  const $ = w.jQuery
  const wpMedia = w.wp?.media

  if (!$ || !wpMedia || !wpMedia.frames) {
    return
  }

  // EDD creates/opens wp.media.frames.file_frame in its own delegated click
  // handler, but the menu region renders a tick later. Poll until the frame's
  // menu view exists, then augment. EDD reuses the frame, so re-augment is cheap.
  $(document).on('click', '.edd_upload_file_button', () => {
    waitForFrameMenu(wpMedia, 0)
  })
}

/** Poll for EDD's media frame and its rendered menu, then augment it. */
function waitForFrameMenu(wpMedia: any, tries: number): void {
  const frame = wpMedia.frames.file_frame
  if (frame && frame.menu && frame.menu.view) {
    augmentFrame(frame)
    return
  }
  if (tries < 60) {
    window.setTimeout(() => waitForFrameMenu(wpMedia, tries + 1), 50)
  }
}

/** Add our state, menu item, and content view to EDD's media frame (idempotent). */
function augmentFrame(frame: any): void {
  const w = window as any
  const wpMedia = w.wp?.media
  const config: IBrowserGlobalConfig | undefined = w.githubReleaseBrowserConfig

  if (!frame || !wpMedia || !config) {
    return
  }

  if (!frame.__grbAugmented) {
    frame.__grbAugmented = true

    frame.states.add([
      new wpMedia.controller.State({
        id: STATE_ID,
        title: 'GitHub Releases',
        menu: 'default',
        content: STATE_ID,
        priority: 200
      })
    ])

    // EDD empties the menu on every default render; re-add our item afterwards.
    frame.on('menu:render:default', (view: any) => addMenuItem(view))

    // Mount the React browser when our content region is created.
    frame.on(`content:create:${STATE_ID}`, (region: any) => {
      const ContentView = wpMedia.View.extend({
        className: 'github-release-browser-media-view',
        /** Render the mount point, then mount React once it is in the DOM. */
        render(this: any) {
          this.$el.html(`<div id="${ROOT_ID}"></div>`)
          window.setTimeout(() => mountBrowser(frame, config), 0)
          return this
        }
      })
      region.view = new ContentView()
    })
  }

  // The menu already rendered before our listener was attached (first open).
  // Re-render the menu region so menu:render:default fires again and our item
  // appears now. (frame.menu.view.set is unavailable; render() is the path.)
  if (frame.menu && typeof frame.menu.render === 'function') {
    frame.menu.render()
  }
}

/** Add (or refresh) the "GitHub Releases" item on a media menu view. */
function addMenuItem(view: any): void {
  if (!view || typeof view.set !== 'function') {
    return
  }

  view.set(STATE_ID, {
    text: 'GitHub Releases',
    priority: 200
  })
}

/** Mount the @arts browser into the modal content and wire selection back to EDD. */
function mountBrowser(frame: any, config: IBrowserGlobalConfig): void {
  const w = window as any
  const wpEl = w.wp?.element
  const BrowserApp = w.ArtsGitHubReleaseBrowser
  const root = document.getElementById(ROOT_ID)

  if (!wpEl || !BrowserApp || !root) {
    return
  }

  wpEl.render(
    wpEl.createElement(BrowserApp, {
      config: {
        ...config,
        onSelectAsset: (asset: any) => {
          const $ = w.jQuery
          const formfield = w.formfield
          const name: string = asset?.asset?.name ?? ''
          const uri: string = asset?.asset?.isDirectory
            ? name
            : `${config.protocol}${asset.repo}/${asset.release}/${name}`

          if (formfield && $) {
            $(formfield).find(EDD_SELECTORS.UPLOAD_FIELD).val(uri).trigger('change')
            $(formfield).find(EDD_SELECTORS.NAME_FIELD).val(name).trigger('change')
          }

          frame.close()
        },
        features: w.releaseDeployEDD?.features,
        upgradeUrl: w.releaseDeployEDD?.purchaseUrl
      }
    }),
    root
  )
}
