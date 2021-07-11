import { useBus } from '@fe/support/bus'
import storage from '@fe/utils/storage'

const bus = useBus()

export function getThemeName () {
  const theme = document.documentElement.getAttribute('app-theme')

  if (theme === 'dark' || theme === 'light' || theme === 'system') {
    return theme
  }

  return storage.get('app.theme')
}

export function getColorScheme () {
  const theme = getThemeName()

  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  return theme
}

export function setTheme(name: 'system' | 'dark' | 'light') {
  document.documentElement.setAttribute('app-theme', name)
  bus.emit('theme.change', name)
  storage.set('app.theme', name)
}

export function addStyles (style: string) {
  const css = document.createElement('style')
  css.innerHTML = style
  document.getElementsByTagName('head')[0].appendChild(css)
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (getThemeName() === 'system') {
    setTheme('system')
  }
});
