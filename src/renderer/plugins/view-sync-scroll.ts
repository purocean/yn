import { Plugin, Ctx } from '@fe/context/plugin'

export default {
  name: 'view-sync-scroll',
  register: (ctx: Ctx) => {
    ctx.registerHook('ON_VIEW_ELEMENT_CLICK', async (e: MouseEvent) => {
      const target = e.target as HTMLElement

      if (
        ctx.store.state.showEditor &&
        !ctx.store.state.presentation &&
        target.classList.contains('source-line') &&
        window.getSelection()!.toString().length < 1
      ) {
        ctx.editor.revealLineInCenter(parseInt(target.dataset.sourceLine || '0'))
      }

      return false
    })
  }
} as Plugin
