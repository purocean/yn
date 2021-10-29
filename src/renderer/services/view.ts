import { useBus } from '@fe/core/bus'
import { Escape } from '@fe/core/command'
import { getActionHandler, registerAction } from '@fe/core/action'
import { useToast } from '@fe/support/ui/toast'
import store from '@fe/support/store'

function present (flag: boolean) {
  if (flag) {
    useToast().show('info', '按下 Esc 键退出演示模式')
  }
  store.commit('setPresentation', flag)
  setTimeout(() => {
    useBus().emit('global.resize')
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
