import { triggerHook } from '@fe/core/hook'
import { getPurchased } from '@fe/others/premium'
import type { ThemeName } from '@fe/types'
import * as storage from '@fe/utils/storage'
import * as ioc from '@fe/core/ioc'

export interface ThemeStyle {
  from: 'custom' | 'extension'
  name: string,
  css: string,
}

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
 * @return style tag id
 */
export function addStyles (style: string) {
  const css = document.createElement('style')
  css.id = 'style-' + Math.random().toString(36).slice(2, 9) + '-' + Date.now()
  css.innerHTML = style
  document.getElementsByTagName('head')[0].appendChild(css)
  return css.id
}

/**
 * Remove styles from page.
 * @param id style tag id
 */
export function removeStyles (id: string) {
  const css = document.getElementById(id)
  if (css) {
    css.remove()
  }
}

export function registerThemeStyle (style: ThemeStyle) {
  ioc.register('THEME_STYLES', style)
}

export function getThemeStyles (): ThemeStyle[] {
  return ioc.get('THEME_STYLES')
}

export function removeThemeStyle (style: ThemeStyle | ((item: ThemeStyle) => boolean)) {
  if (typeof style === 'function') {
    ioc.removeWhen('THEME_STYLES', style)
  } else {
    ioc.remove('THEME_STYLES', (item: any) => item.from === style.from && item.name === style.name && item.css === style.css)
  }
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (getThemeName() === 'system' && !window.matchMedia('print').matches) {
    setTheme('system')
  }
})
