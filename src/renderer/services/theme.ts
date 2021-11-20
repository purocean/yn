import { triggerHook } from '@fe/core/hook'
import { getPurchased } from '@fe/others/premium'
import type { ThemeName } from '@fe/types'
import * as storage from '@fe/utils/storage'

/**
 * Get current theme name.
 * @returns
 */
export function getThemeName () {
  const theme = document.documentElement.getAttribute('app-theme')

  if (theme === 'dark' || theme === 'light' || theme === 'system') {
    return theme
  }

  return storage.get<ThemeName>('app.theme', 'system')
}

/**
 * Get current color schema.
 * @returns
 */
export function getColorScheme () {
  const theme = getThemeName()

  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  return theme
}

/**
 * Set theme.
 * @param name
 */
export function setTheme (name: ThemeName) {
  if (!getPurchased()) {
    name = 'light'
  }

  document.documentElement.setAttribute('app-theme', name)
  triggerHook('THEME_CHANGE', { name })
  storage.set('app.theme', name)
}

/**
 * Add styles to page.
 * @param style
 */
export function addStyles (style: string) {
  const css = document.createElement('style')
  css.innerHTML = style
  document.getElementsByTagName('head')[0].appendChild(css)
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (getThemeName() === 'system') {
    setTheme('system')
  }
})
