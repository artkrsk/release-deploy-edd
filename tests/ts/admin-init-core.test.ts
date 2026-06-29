import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@arts/release-deploy-core', () => ({
  EDD_SELECTORS: {
    UPLOAD_FIELD: '.edd_repeatable_upload_field',
    UPLOAD_WRAPPER: '.edd_repeatable_upload_wrapper',
    NAME_FIELD: '.edd_repeatable_name_field',
    UPLOAD_FIELD_CONTAINER: '.edd_repeatable_upload_field_container',
    REPEATABLE_ROW: '.edd-repeatable-row-standard-fields'
  },
  SettingsApp: vi.fn(() => null),
  FileStatus: vi.fn(() => null),
  injectVersionSyncUI: vi.fn(),
  injectChangelogSyncUI: vi.fn(),
  initVersionSync: vi.fn(),
  initChangelogSync: vi.fn()
}))

vi.mock('@/media/edd-media-browser', () => ({
  initEDDMediaBrowser: vi.fn()
}))

import { initCore } from '@/admin-init-core'
import { initEDDMediaBrowser } from '@/media/edd-media-browser'
import { initVersionSync, initChangelogSync } from '@arts/release-deploy-core'

describe('initCore', () => {
  let originalWp: any
  /** Events registered via jQuery(document).on(event, cb) */
  let registeredEvents: Map<string, Function[]>

  beforeEach(() => {
    originalWp = (global as any).wp
    vi.clearAllMocks()

    registeredEvents = new Map()

    const mockJqObj: any = {}
    mockJqObj.on = vi.fn((event: string, cb: Function) => {
      if (!registeredEvents.has(event)) {
        registeredEvents.set(event, [])
      }
      registeredEvents.get(event)!.push(cb)
      return mockJqObj
    })
    mockJqObj.ready = vi.fn((cb: Function) => {
      cb()
      return mockJqObj
    })

    vi.mocked(global.jQuery).mockReturnValue(mockJqObj as any)

    ;(global as any).wp = {
      ...originalWp,
      element: {
        render: vi.fn(),
        unmountComponentAtNode: vi.fn(),
        // Return a non-null value so expect.anything() passes
        createElement: vi.fn().mockReturnValue({ type: 'mock-element' })
      }
    }
  })

  afterEach(() => {
    ;(global as any).wp = originalWp
    document.body.innerHTML = ''
  })

  test('returns early when wp is undefined', () => {
    delete (global as any).wp

    initCore()

    expect(initEDDMediaBrowser).not.toHaveBeenCalled()
  })

  test('returns early when wp.element is missing', () => {
    ;(global as any).wp = { i18n: {} }

    initCore()

    expect(initEDDMediaBrowser).not.toHaveBeenCalled()
  })

  test('calls initEDDMediaBrowser', () => {
    initCore()

    expect(initEDDMediaBrowser).toHaveBeenCalledOnce()
  })

  test('mounts SettingsApp into #release-deploy-edd-settings-root', () => {
    const settingsRoot = document.createElement('div')
    settingsRoot.id = 'release-deploy-edd-settings-root'
    document.body.appendChild(settingsRoot)

    initCore()

    expect(wp.element.render).toHaveBeenCalledWith(
      expect.anything(),
      settingsRoot
    )
  })

  test('does not call wp.element.render when settings root is absent', () => {
    initCore()

    expect(wp.element.render).not.toHaveBeenCalled()
  })

  test('registers release-deploy-edd-version-sync-ready listener', () => {
    initCore()

    expect(registeredEvents.has('release-deploy-edd-version-sync-ready')).toBe(true)
  })

  test('registers release-deploy-edd-changelog-sync-ready listener', () => {
    initCore()

    expect(registeredEvents.has('release-deploy-edd-changelog-sync-ready')).toBe(true)
  })

  test('version-sync-ready listener invokes initVersionSync', () => {
    initCore()

    const [cb] = registeredEvents.get('release-deploy-edd-version-sync-ready')!
    cb!()

    expect(initVersionSync).toHaveBeenCalledOnce()
  })

  test('changelog-sync-ready listener invokes initChangelogSync', () => {
    initCore()

    const [cb] = registeredEvents.get('release-deploy-edd-changelog-sync-ready')!
    cb!()

    expect(initChangelogSync).toHaveBeenCalledOnce()
  })

  describe('initializeFileStatusForElement', () => {
    test('moves status root into upload field container and mounts FileStatus', () => {
      // Build DOM:
      // wrapper
      //   container (upload field container)
      //     input (upload field, has a file URL)
      //   statusRoot (initially outside container, should be moved in)
      const wrapper = document.createElement('div')
      wrapper.className = 'edd_repeatable_upload_wrapper'

      const container = document.createElement('div')
      container.className = 'edd_repeatable_upload_field_container'

      const input = document.createElement('input')
      input.className = 'edd_repeatable_upload_field'
      input.value = 'edd-release-deploy://owner/repo/v1.0.0/plugin.zip'
      container.appendChild(input)

      const statusRoot = document.createElement('div')
      statusRoot.className = 'release-deploy-edd-file-status-root'
      statusRoot.setAttribute('data-file-url', '')

      wrapper.appendChild(container)
      wrapper.appendChild(statusRoot)
      document.body.appendChild(wrapper)

      initCore()

      // The status root should have been relocated into the container
      expect(statusRoot.parentElement).toBe(container)

      // wp.element.render should have been called with the status root as mount point
      expect(wp.element.render).toHaveBeenCalledWith(
        expect.anything(),
        statusRoot
      )
    })

    test('skips status root that has no upload wrapper ancestor', () => {
      // Status root with no .edd_repeatable_upload_wrapper parent
      const statusRoot = document.createElement('div')
      statusRoot.className = 'release-deploy-edd-file-status-root'
      document.body.appendChild(statusRoot)

      initCore()

      // render should not be called — no wrapper, early return
      expect(wp.element.render).not.toHaveBeenCalled()
    })

    test('does not relocate status root already inside container', () => {
      const wrapper = document.createElement('div')
      wrapper.className = 'edd_repeatable_upload_wrapper'

      const container = document.createElement('div')
      container.className = 'edd_repeatable_upload_field_container'

      // Status root already inside container
      const statusRoot = document.createElement('div')
      statusRoot.className = 'release-deploy-edd-file-status-root'
      container.appendChild(statusRoot)

      wrapper.appendChild(container)
      document.body.appendChild(wrapper)

      initCore()

      // Should still be inside container
      expect(statusRoot.parentElement).toBe(container)
      // But render was still called
      expect(wp.element.render).toHaveBeenCalledWith(
        expect.anything(),
        statusRoot
      )
    })
  })
})
