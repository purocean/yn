import { Escape } from '@fe/core/command'
import { triggerHook } from '@fe/core/hook'
import { getActionHandler, registerAction } from '@fe/core/action'
import { useToast } from '@fe/support/ui/toast'
import store from '@fe/support/store'

function present (flag: boolean) {
  if (flag) {
    useToast().show('info', '按下 Esc 键退出演示模式')
  }
  store.commit('setPresentation', flag)
  setTimeout(() => {
    triggerHook('GLOBAL_RESIZE')
  }, 0)
}

/**
 * 刷新渲染
 */
export function refresh () {
  getActionHandler('view.refresh')()
}

/**
 * 聚焦到某一行
 * @param line 行号
 */
export function revealLine (line: number) {
  getActionHandler('view.reveal-line')(line)
}

/**
 * 滚动到指定位置
 * @param top 顶部偏移
 */
export function scrollTopTo (top: number) {
  getActionHandler('view.scroll-top-to')(top)
}

/**
 * 获取渲染后的 HTML
 * @returns HTML
 */
export function getContentHtml () {
  return getActionHandler('view.get-content-html')()
}

/**
 * 进入演示模式
 */
export function enterPresent () {
  getActionHandler('view.enter-presentation')()
}

/**
 * 退出演示模式
 */
export function exitPresent () {
  getActionHandler('view.exit-presentation')()
}

/**
 * 切换自动预览刷新
 * @param flag 是否开启自动刷新预览
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
      [...document.body.children] // 判断页面是否有浮层遮住
        .filter(x => x.tagName === 'DIV' && x.clientWidth > 10 && x.clientHeight > 10)
        .length < 2
  }
})
