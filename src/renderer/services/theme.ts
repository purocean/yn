import { useBus } from '@fe/core/bus'
import type { ThemeName } from '@fe/types'
import * as storage from '@fe/utils/storage'

const bus = useBus()

/**
 * 获取当前主题设置
 * @returns 主题名
 */
export function getThemeName () {
  const theme = document.documentElement.getAttribute('app-theme')

  if (theme === 'dark' || theme === 'light' || theme === 'system') {
    return theme
  }

  return storage.get<ThemeName>('app.theme', 'system')
}

/**
 * 获取当前色彩方案
 * @returns 色彩方案
 */
export function getColorScheme () {
  const theme = getThemeName()

  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  return theme
}

/**
 * 设置主题
 * @param name 主题名
 */
export function setTheme (name: ThemeName) {
  document.documentElement.setAttribute('app-theme', name)
  bus.emit('theme.change', name)
  storage.set('app.theme', name)
}

/**
 * 给网页添加样式
 * @param style 样式
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
