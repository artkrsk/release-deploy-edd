import React from 'react'
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// The mocks below stand in for host-provided globals (WP admin provides wp/
// React/jQuery at runtime), so they are assigned through an untyped view of
// globalThis on purpose — typing them as the real modules would claim a
// fidelity these stubs don't have. window.releaseDeployEDD stays typed: it is
// OUR contract (IConfig), and the compiler should verify the mock matches it.
interface HostGlobals {
  React?: unknown
  wp?: unknown
  jQuery?: unknown
  $?: unknown
}
const host = globalThis as HostGlobals

// Make React global for JSX (WordPress pattern)
host.React = React

// Mock WordPress globals
host.wp = {
  i18n: {
    __: vi.fn((text: string) => text)
  },
  element: {
    ...React,
    render: vi.fn(),
    unmountComponentAtNode: vi.fn()
  },
  components: {
    Card: ({ children, className, onClick }: any) =>
      React.createElement('div', { className: `wp-card ${className || ''}`, onClick }, children),
    CardBody: ({ children, className }: any) =>
      React.createElement('div', { className: `wp-card-body ${className || ''}` }, children),
    TextControl: ({
      value,
      onChange,
      onBlur,
      type,
      placeholder,
      disabled,
      help,
      className,
      maxLength
    }: any) =>
      React.createElement('div', { className: 'wp-text-control' }, [
        React.createElement('input', {
          key: 'input',
          type: type || 'text',
          value: value || '',
          onChange: (e: any) => onChange?.(e.target.value),
          onBlur: onBlur,
          placeholder,
          disabled,
          className,
          maxLength
        }),
        help && React.createElement('div', { key: 'help', className: 'wp-text-control-help' }, help)
      ]),
    Button: ({ children, variant, onClick, icon, disabled, label, className }: any) =>
      React.createElement(
        'button',
        {
          type: 'button',
          onClick,
          disabled,
          'aria-label': label,
          className: `wp-button wp-button-${variant || 'primary'} ${className || ''}`,
          title: label
        },
        [
          icon &&
            React.createElement('span', { key: 'icon', className: `dashicons dashicons-${icon}` }),
          children
        ]
      ),
    Notice: ({ children, status, isDismissible, className }: any) =>
      React.createElement(
        'div',
        {
          className: `wp-notice wp-notice-${status || 'info'} ${className || ''}`,
          'data-dismissible': isDismissible
        },
        children
      ),
    Spinner: () =>
      React.createElement('div', { className: 'wp-spinner', 'data-testid': 'spinner' }),
    SearchControl: ({ value, onChange, placeholder }: any) =>
      React.createElement('input', {
        type: 'search',
        value: value || '',
        onChange: (e: any) => onChange?.(e.target.value),
        placeholder,
        className: 'wp-search-control'
      })
  }
}

// Mock window globals — Lite version: all Pro features false, no webhook/license context
global.window.releaseDeployEDD = {
  purchaseUrl: 'https://example.com/purchase',
  supportUrl: 'https://example.com/support',
  renewSupportUrl: 'https://example.com/renew',
  settingsUrl:
    '/wp-admin/edit.php?post_type=download&page=edd-settings&tab=extensions&section=release_deploy',
  ajaxUrl: '/wp-admin/admin-ajax.php',
  features: {
    useLatestRelease: false,
    webhooks: false,
    notifications: false,
    versionSync: false,
    changelogSync: false
  },
  contexts: {
    settings: {
      token: '',
      isConstantDefined: false,
      nonce: 'test-nonce'
    },
    metabox: {
      downloadId: 1,
      nonce: 'test-nonce'
    },
    browser: {
      nonce: 'test-nonce'
    }
  }
}

/** Mock jQuery for DOM manipulation tests */
const jQueryMock = vi.fn((_selector: any) => {
  const mockElement = {
    length: 0,
    val: vi.fn().mockReturnValue(''),
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    closest: vi.fn().mockReturnValue(null),
    find: vi.fn().mockReturnValue({
      val: vi.fn().mockReturnThis(),
      trigger: vi.fn().mockReturnThis()
    }),
    after: vi.fn().mockReturnThis(),
    append: vi.fn().mockReturnThis(),
    data: vi.fn().mockReturnValue({}),
    trigger: vi.fn().mockReturnThis(),
    ready: vi.fn((cb: (...args: unknown[]) => unknown) => {
      cb()
      return mockElement
    }),
    0: null,
    1: null
  }

  return mockElement
})

host.jQuery = jQueryMock

// Make jQuery available as $ too
host.$ = jQueryMock
