import { Escape } from '@fe/core/command'
import { triggerHook } from '@fe/core/hook'
import { getActionHandler, registerAction } from '@fe/core/action'
import { useToast } from '@fe/support/ui/toast'
import store from '@fe/support/store'
import { t } from './i18n'

function present (flag: boolean) {
  if (flag) {
    useToast().show('info', t('exit-presentation-msg'))
  }
  store.commit('setPresentation', flag)
  setTimeout(() => {
    triggerHook('GLOBAL_RESIZE')
  }, 0)
}

/**
 * Rerender view.
 */
export function render () {
  getActionHandler('view.render')()
}

/**
 * Refresh view.
 */
export function refresh () {
  getActionHandler('view.refresh')()
}

/**
 * REveal a line.
 * @param line
 */
export function revealLine (line: number) {
  getActionHandler('view.reveal-line')(line)
}

/**
 * Scroll to a position.
 * @param top
 */
export function scrollTopTo (top: number) {
  getActionHandler('view.scroll-top-to')(top)
}

/**
 * Get rendered HTML.
 * @returns HTML
 */
export function getContentHtml () {
  return getActionHandler('view.get-content-html')()
}

/**
 * Enter presentation mode.
 */
export function enterPresent () {
  getActionHandler('view.enter-presentation')()
}

/**
 * Exit presentation mode.
 */
export function exitPresent () {
  getActionHandler('view.exit-presentation')()
}

/**
 * Toggle auto render preview.
 * @param flag
 */
export function toggleAutoPreview (flag?: boolean) {
  const showXterm = store.state.autoPreview
  store.commit('setAutoPreview', typeof flag === 'boolean' ? flag : !showXterm)
}

registerAction({
  name: 'view.enter-presentation',
  handler: () => present(true),
  keys: ['F5']
})

registerAction({
  name: 'view.exit-presentation',
  handler: () => present(false),
  keys: [Escape],
  when: () => {
    const el = window.document.activeElement
    return store.state.presentation &&
      el?.tagName !== 'INPUT' &&
      el?.tagName !== 'TEXTAREA' &&
      [...document.body.children] // has mask?
        .filter(x => x.tagName === 'DIV' && x.clientWidth > 10 && x.clientHeight > 10)
        .length < 2
  }
})
