/**
 * Get all params from url.
 * @returns params
 */
export function $args () {
  const win = window.opener || window.parent || window
  return new URLSearchParams(win.location.search)
}

export const URL_GITHUB = 'https://github.com/purocean/yn'
export const URL_MAS = 'https://apps.apple.com/cn/app/yank-note/id1551528618'

export const JWT_TOKEN = $args().get('token') || ''
export const MODE: 'normal' | 'share-preview' = $args().get('mode') || 'normal' as any

export const FLAG_DISABLE_SHORTCUTS = MODE !== 'normal'
export const FLAG_DISABLE_XTERM = false
export const FLAG_MAS = false
export const FLAG_DEMO = import.meta.env.MODE === 'demo'
export const FLAG_READONLY = $args().get('readonly') === 'true' || MODE !== 'normal'
export const FLAG_DEBUG = import.meta.env.MODE === 'development' || $args().get('debug') === 'true'
