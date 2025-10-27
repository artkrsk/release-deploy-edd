/**
 * Admin area initialization (Lite version)
 */
import { initCore } from './admin-init-core'
import { initFree } from './admin-init-free'

export async function initAdmin() {
  if (typeof wp === 'undefined' || !wp.element) {
    return
  }

  initCore()
  initFree()
}
