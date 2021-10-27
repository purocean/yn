import { useBus } from '@fe/core/bus'
import { Escape } from '@fe/core/shortcut'
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

export function refresh () {
  getActionHandler('view.refresh')()
}

export function revealLine (line: number) {
  getActionHandler('view.reveal-line')(line)
}

export function scrollTopTo (top: number) {
  getActionHandler('view.scroll-top-to')(top)
}

export function getContentHtml () {
  return getActionHandler('view.get-content-html')()
}

export function enterPresent () {
  getActionHandler('view.enter-presentation')()
}

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
