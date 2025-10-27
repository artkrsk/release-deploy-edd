import { initAdmin } from './admin-init'

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdmin)
} else {
  initAdmin()
}
