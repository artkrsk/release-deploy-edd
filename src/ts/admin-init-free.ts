/**
 * Admin area initialization (Lite version - badge-only Pro features)
 */
import { initVersionSync, initChangelogSync } from '@arts/release-deploy-core'

export function initFree() {
  // Initialize badge-only version sync (shows "Get Pro" badges)
  initVersionSync()
  initChangelogSync()
}
