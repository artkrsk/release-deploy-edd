import { IConfig, IWordPressMedia } from '@arts/release-deploy-core'
import type { BrowserApp } from '@arts/github-release-browser'

declare global {
  interface Window {
    // Main centralized configuration
    releaseDeployEDD: IConfig

    // WordPress AJAX URL
    ajaxurl: string

    // Package browser component
    ArtsGitHubReleaseBrowser: typeof BrowserApp

    wp: {
      element: typeof import('@wordpress/element')
      components: typeof import('@wordpress/components')
      i18n: typeof import('@wordpress/i18n')
      date: typeof import('@wordpress/date')
      apiFetch: typeof import('@wordpress/api-fetch').default
      media?: IWordPressMedia
    }
  }

  const wp: Window['wp']
}

/** Extended window type for EDD media library parent frame */
export interface EDDParentWindow extends Window {
  formfield?: JQuery
  tb_remove?: () => void
}
