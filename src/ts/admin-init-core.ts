/**
 * Core features initialization (Free + Pro shared)
 */
import {
  EDD_SELECTORS,
  SettingsApp,
  FileStatus,
  injectVersionSyncUI,
  injectChangelogSyncUI,
  initVersionSync,
  initChangelogSync
} from '@arts/release-deploy-core'
import type { ISelectedAsset } from '@arts/github-release-browser'

export function initCore() {
  if (typeof wp === 'undefined' || !wp.element) {
    return
  }

  // Token settings (always available)
  const settingsRoot = document.getElementById('release-deploy-edd-settings-root')
  if (settingsRoot) {
    wp.element.render(wp.element.createElement(SettingsApp), settingsRoot)
  }

  // File browser (shows Pro badges for locked features)
  const browserRoot = document.getElementById('github-release-browser-root')
  if (browserRoot) {
    // Package Browser - loaded from window.ArtsGitHubReleaseBrowser global
    const BrowserApp = window.ArtsGitHubReleaseBrowser

    if (!BrowserApp) {
      console.error('BrowserApp not found. Package script may not be loaded.')
      return
    }

    wp.element.render(
      wp.element.createElement(BrowserApp, {
        config: {
          apiUrl: window.releaseDeployEDD.ajaxUrl,
          nonce: window.releaseDeployEDD.contexts.browser?.nonce || '',
          actionPrefix: 'edd_release_deploy',
          protocol: 'edd-release-deploy://',
          onSelectAsset: (asset: ISelectedAsset) => {
            const parent = window.parent as Window & { formfield?: JQuery; tb_remove?: () => void }
            if (parent && parent.formfield) {
              // Build custom protocol URL
              const fileUrl = `edd-release-deploy://${asset.repo}/${asset.release}/${asset.asset.name}`

              // Update EDD formfields
              parent.formfield.find(EDD_SELECTORS.UPLOAD_FIELD).val(fileUrl).trigger('change')
              parent.formfield
                .find(EDD_SELECTORS.NAME_FIELD)
                .val(asset.asset.name)
                .trigger('change')

              // Close modal
              if (typeof parent.tb_remove === 'function') {
                parent.tb_remove()
              }
            }
          },
          features: window.releaseDeployEDD.features,
          upgradeUrl: window.releaseDeployEDD.purchaseUrl,
          strings: {
            // Optional: Override default strings with EDD-specific ones
          }
        }
      }),
      browserRoot
    )
  }

  // Inject sync UI if on metabox page (only if Software Licensing is enabled)
  if (window.releaseDeployEDD?.contexts?.metabox) {
    jQuery(document).ready(() => {
      injectVersionSyncUI()
      injectChangelogSyncUI()
    })
  }

  // Version sync - Lite version (looks for *-free-root)
  jQuery(document).on('release-deploy-edd-version-sync-ready', function () {
    initVersionSync()
  })

  // Changelog sync - Lite version (looks for *-free-root)
  jQuery(document).on('release-deploy-edd-changelog-sync-ready', function () {
    initChangelogSync()
  })

  // File status indicators
  initializeFileStatusIndicators()

  // Setup file row observers
  setupFileRowObservers()
}

// Initialize file status indicators for all existing rows
function initializeFileStatusIndicators() {
  const fileStatusRoots = document.querySelectorAll('.release-deploy-edd-file-status-root')
  if (fileStatusRoots.length === 0) return

  fileStatusRoots.forEach((root) => {
    initializeFileStatusForElement(root as HTMLElement, FileStatus)
  })
}

// Initialize a single file status indicator element
function initializeFileStatusForElement(root: HTMLElement, FileStatusComponent?: any) {
  // Move status indicator into file URL control container if needed
  const wrapper = root.closest(EDD_SELECTORS.UPLOAD_WRAPPER)
  if (!wrapper) return

  const fileUrlControl = wrapper.querySelector(EDD_SELECTORS.UPLOAD_FIELD_CONTAINER)
  if (!fileUrlControl || root.parentElement === fileUrlControl) {
    // Already in the right place or can't find container
  } else {
    fileUrlControl.appendChild(root)
  }

  // Find the file URL input to get the current value
  const fileUrlInput = wrapper.querySelector(EDD_SELECTORS.UPLOAD_FIELD) as HTMLInputElement
  const fileUrl = fileUrlInput?.value || root.getAttribute('data-file-url') || ''

  // Update the data attribute to match the current input value
  root.setAttribute('data-file-url', fileUrl)

  // Use the FileStatus component (already imported at the top)
  const component = FileStatusComponent || FileStatus

  // Unmount any existing React component first
  wp.element.unmountComponentAtNode(root)

  // Mount the React component with rootElement to help identify the correct input
  wp.element.render(wp.element.createElement(component, { fileUrl, rootElement: root }), root)
}

// Setup observers for file row changes
function setupFileRowObservers() {
  // Listen for new file rows being added/removed/sorted by EDD
  document.addEventListener('edd_repeatable_row_change', async (event: Event) => {
    const customEvent = event as CustomEvent
    const row = customEvent.detail?.row

    if (!row) return

    // Convert jQuery object to DOM element if needed
    // EDD passes jQuery objects in the event detail
    const rowElement = row && typeof row === 'object' && row.jquery ? row[0] : row
    if (!rowElement) return

    // Check if this row has a file status indicator
    const fileStatusRoot = rowElement.querySelector('.release-deploy-edd-file-status-root')
    if (!fileStatusRoot) return

    // Initialize the status indicator for this new row
    initializeFileStatusForElement(fileStatusRoot as HTMLElement)
  })

  // Watch for removed rows to clean up React components
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return
        const element = node as Element

        // Check if the removed node contains status indicators
        const statusIndicators = element.classList?.contains('release-deploy-edd-file-status-root')
          ? [element]
          : Array.from(element.querySelectorAll('.release-deploy-edd-file-status-root'))

        statusIndicators.forEach((statusRoot) => {
          // Explicitly unmount the React component to ensure cleanup
          wp.element.unmountComponentAtNode(statusRoot)
        })
      })
    })
  })

  // Observe the file rows container for removals
  const fileRowsContainer = document.querySelector(EDD_SELECTORS.REPEATABLE_ROW)
  if (fileRowsContainer) {
    observer.observe(fileRowsContainer.parentElement || document.body, {
      childList: true,
      subtree: true
    })
  }

  // Cleanup observer on page unload
  window.addEventListener('beforeunload', () => {
    observer.disconnect()
  })
}
