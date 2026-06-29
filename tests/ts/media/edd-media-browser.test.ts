import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@arts/release-deploy-core', () => ({
  EDD_SELECTORS: {
    UPLOAD_FIELD: '.edd_repeatable_upload_field',
    UPLOAD_WRAPPER: '.edd_repeatable_upload_wrapper',
    NAME_FIELD: '.edd_repeatable_name_field',
    UPLOAD_FIELD_CONTAINER: '.edd_repeatable_upload_field_container',
    REPEATABLE_ROW: '.edd-repeatable-row-standard-fields'
  }
}))

import { initEDDMediaBrowser } from '@/media/edd-media-browser'

/** Helpers to capture jQuery(document).on(event, selector, cb) calls. */
type ClickHandler = { event: string; selector: string; cb: Function }

function buildMockMedia() {
  const mockFrame: any = {
    states: { add: vi.fn() },
    on: vi.fn(),
    menu: { view: {}, render: vi.fn() },
    close: vi.fn()
  }

  const mockMedia = {
    frames: {} as Record<string, any>,
    controller: {
      // Must be a regular function — arrow functions cannot be used with `new`
      State: vi.fn(function (this: any, cfg: any) {
        Object.assign(this, cfg)
      })
    },
    View: {
      extend: vi.fn().mockImplementation((definition: any) => {
        /** Minimal Backbone.View constructor stub */
        function ContentViewCtor(this: any) {
          this.$el = { html: vi.fn() }
        }
        Object.assign(ContentViewCtor.prototype, definition)
        return ContentViewCtor
      })
    }
  }

  return { mockFrame, mockMedia }
}

describe('initEDDMediaBrowser', () => {
  let clickHandlers: ClickHandler[]
  let mockDocumentJq: any
  let mockMedia: any
  let mockFrame: any

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    clickHandlers = []

    ;({ mockFrame, mockMedia } = buildMockMedia())

    ;(window as any).wp = {
      ...(window as any).wp,
      media: mockMedia,
      element: {
        render: vi.fn(),
        unmountComponentAtNode: vi.fn(),
        createElement: vi.fn()
      }
    }

    ;(window as any).githubReleaseBrowserConfig = {
      apiUrl: 'https://api.example.com',
      nonce: 'test-nonce',
      actionPrefix: 'test_',
      protocol: 'edd-release-deploy://'
    }

    ;(window as any).ArtsGitHubReleaseBrowser = vi.fn()

    mockDocumentJq = {
      on: vi.fn((event: string, selector: string, cb: Function) => {
        clickHandlers.push({ event, selector, cb })
        return mockDocumentJq
      })
    }

    vi.mocked(global.jQuery).mockImplementation((selector: any) => {
      if (selector === document) {
        return mockDocumentJq as any
      }
      return {
        find: vi.fn().mockReturnValue({
          val: vi.fn().mockReturnThis(),
          trigger: vi.fn().mockReturnThis()
        })
      } as any
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    delete (window as any).githubReleaseBrowserConfig
    delete (window as any).ArtsGitHubReleaseBrowser
    delete (window as any).formfield
    document.body.innerHTML = ''
  })

  // ---------------------------------------------------------------------------
  // Click binding
  // ---------------------------------------------------------------------------

  test('binds click handler on .edd_upload_file_button', () => {
    initEDDMediaBrowser()

    expect(mockDocumentJq.on).toHaveBeenCalledWith(
      'click',
      '.edd_upload_file_button',
      expect.any(Function)
    )
  })

  test('returns early when jQuery is not available', () => {
    const saved = (window as any).jQuery
    delete (window as any).jQuery

    initEDDMediaBrowser()

    expect(mockDocumentJq.on).not.toHaveBeenCalled()

    ;(window as any).jQuery = saved
  })

  test('returns early when wp.media is not available', () => {
    ;(window as any).wp.media = undefined

    initEDDMediaBrowser()

    expect(mockDocumentJq.on).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // augmentFrame: state / menu listener / content view
  // ---------------------------------------------------------------------------

  describe('augmentFrame', () => {
    beforeEach(() => {
      // Frame is already open with menu ready → augmentFrame runs synchronously
      mockMedia.frames.file_frame = mockFrame

      initEDDMediaBrowser()
    })

    function triggerClick() {
      const handler = clickHandlers.find(h => h.selector === '.edd_upload_file_button')
      expect(handler).toBeDefined()
      handler!.cb()
    }

    test('adds the github-releases state', () => {
      triggerClick()

      expect(mockFrame.states.add).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'github-releases', title: 'GitHub Releases' })
      ])
    })

    test('registers menu:render:default listener', () => {
      triggerClick()

      const events = mockFrame.on.mock.calls.map((c: any[]) => c[0])
      expect(events).toContain('menu:render:default')
    })

    test('registers content:create:github-releases listener', () => {
      triggerClick()

      const events = mockFrame.on.mock.calls.map((c: any[]) => c[0])
      expect(events).toContain('content:create:github-releases')
    })

    test('is idempotent: does not re-add state on repeated clicks', () => {
      triggerClick()
      triggerClick()

      // states.add called only once because __grbAugmented guards the block
      expect(mockFrame.states.add).toHaveBeenCalledTimes(1)
    })
  })

  // ---------------------------------------------------------------------------
  // mountBrowser + onSelectAsset
  // ---------------------------------------------------------------------------

  describe('mountBrowser and onSelectAsset', () => {
    let capturedOnSelectAsset: Function | undefined

    function triggerFullMount() {
      mockMedia.frames.file_frame = mockFrame

      // Track createElement to capture onSelectAsset from BrowserApp config
      ;(window as any).wp.element.createElement = vi.fn((_comp: any, props: any) => {
        if (props?.config?.onSelectAsset) {
          capturedOnSelectAsset = props.config.onSelectAsset
        }
        return { type: 'mock-element' }
      })

      // Ensure the browser root exists in the DOM before mountBrowser runs
      const browserRoot = document.createElement('div')
      browserRoot.id = 'github-release-browser-root'
      document.body.appendChild(browserRoot)

      initEDDMediaBrowser()
      // Trigger click → augmentFrame → registers content:create handler
      const handler = clickHandlers.find(h => h.selector === '.edd_upload_file_button')!
      handler.cb()

      // Fire the content:create:github-releases callback → region.view = new ContentView()
      const contentCreateCall = mockFrame.on.mock.calls.find(
        (c: any[]) => c[0] === 'content:create:github-releases'
      )
      expect(contentCreateCall).toBeDefined()

      const region: any = {}
      contentCreateCall![1](region)

      // Call render() on the view → queues mountBrowser via setTimeout
      expect(region.view).toBeDefined()
      region.view.render()

      // Advance timers → mountBrowser executes
      vi.runAllTimers()
    }

    beforeEach(() => {
      capturedOnSelectAsset = undefined
      triggerFullMount()
    })

    test('renders BrowserApp into the browser root element', () => {
      expect((window as any).wp.element.render).toHaveBeenCalledWith(
        expect.anything(),
        document.getElementById('github-release-browser-root')
      )
    })

    test('onSelectAsset writes edd-release-deploy:// URI into formfield', () => {
      expect(capturedOnSelectAsset).toBeDefined()

      const formfield = document.createElement('div')
      ;(window as any).formfield = formfield

      const mockVal = vi.fn().mockReturnThis()
      const mockTrigger = vi.fn().mockReturnThis()
      const mockFind = vi.fn().mockReturnValue({ val: mockVal, trigger: mockTrigger })

      vi.mocked(global.jQuery).mockImplementation(() => ({
        find: mockFind
      } as any))

      capturedOnSelectAsset!({
        repo: 'owner/repo',
        release: 'v1.0.0',
        asset: { name: 'plugin.zip', isDirectory: false }
      })

      expect(mockVal).toHaveBeenCalledWith('edd-release-deploy://owner/repo/v1.0.0/plugin.zip')
    })

    test('onSelectAsset writes the filename into the name field', () => {
      expect(capturedOnSelectAsset).toBeDefined()

      const formfield = document.createElement('div')
      ;(window as any).formfield = formfield

      const mockVal = vi.fn().mockReturnThis()
      const mockTrigger = vi.fn().mockReturnThis()
      vi.mocked(global.jQuery).mockImplementation(() => ({
        find: vi.fn().mockReturnValue({ val: mockVal, trigger: mockTrigger })
      } as any))

      capturedOnSelectAsset!({
        repo: 'owner/repo',
        release: 'v1.0.0',
        asset: { name: 'plugin.zip', isDirectory: false }
      })

      expect(mockVal).toHaveBeenCalledWith('plugin.zip')
    })

    test('onSelectAsset closes the frame after selection', () => {
      expect(capturedOnSelectAsset).toBeDefined()

      capturedOnSelectAsset!({
        repo: 'owner/repo',
        release: 'v1.0.0',
        asset: { name: 'plugin.zip', isDirectory: false }
      })

      expect(mockFrame.close).toHaveBeenCalled()
    })

    test('onSelectAsset uses the directory name as URI when asset is a directory', () => {
      expect(capturedOnSelectAsset).toBeDefined()

      const formfield = document.createElement('div')
      ;(window as any).formfield = formfield

      const mockVal = vi.fn().mockReturnThis()
      vi.mocked(global.jQuery).mockImplementation(() => ({
        find: vi.fn().mockReturnValue({ val: mockVal, trigger: vi.fn().mockReturnThis() })
      } as any))

      capturedOnSelectAsset!({
        repo: 'owner/repo',
        release: 'v1.0.0',
        asset: { name: 'my-dir', isDirectory: true }
      })

      // For directories the uri equals the bare name, not a full protocol URI
      expect(mockVal).toHaveBeenCalledWith('my-dir')
    })
  })
})
