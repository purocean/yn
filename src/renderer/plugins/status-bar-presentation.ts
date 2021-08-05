import type { Plugin } from '@fe/context/plugin'

export default {
  name: 'status-bar-presentation',
  register: ctx => {
    const present = (flag: boolean) => {
      if (flag) {
        ctx.ui.useToast().show('info', '按下 Esc 键退出演示模式')
      }
      ctx.store.commit('setPresentation', flag)
      setTimeout(() => {
        ctx.bus.emit('global.resize')
      }, 0)
    }

    const enterPresentation = ctx.action.registerAction({
      name: 'status-bar.enter-presentation',
      handler: () => present(true),
      keys: ['F5']
    })

    ctx.action.registerAction({
      name: 'status-bar.exit-presentation',
      handler: () => present(false),
      keys: [ctx.shortcut.Escape],
      when: () => {
        const el = window.document.activeElement
        return ctx.store.state.presentation &&
          el?.tagName !== 'INPUT' &&
          el?.tagName !== 'TEXTAREA' &&
          [...document.body.children] // 判断页面是否有浮层遮住
            .filter(x => x.tagName === 'DIV' && x.clientWidth > 10 && x.clientHeight > 10)
            .length < 2
      }
    })

    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-presentation'] = {
        id: 'status-bar-presentation',
        position: 'right',
        tips: `预览 (${ctx.shortcut.getKeysLabel(enterPresentation.name)})`,
        icon: 'presentation',
        onClick: () => present(true)
      }
    })
  }
} as Plugin
