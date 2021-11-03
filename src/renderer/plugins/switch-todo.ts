import type { BuildInActionName } from '@fe/types'
import type { Plugin } from '@fe/context'

export default {
  name: 'switch-todo',
  register: (ctx) => {
    const actionName: BuildInActionName = 'plugin.switch-todo.switch'

    ctx.action.registerAction({
      name: actionName,
      keys: [ctx.command.Alt, 'o'],
      handler: (line?: number, checked?: boolean) => {
        if (!line) {
          line = ctx.editor.getSelectionInfo().line
        }

        const lineText = ctx.editor.getLineContent(line)

        if (typeof checked !== 'boolean') {
          checked = !lineText.includes(' [x] ')
        }

        const value = checked
          ? lineText.replace('[ ]', `[x] ~~${ctx.lib.dayjs().format('YYYY-MM-DD HH:mm')}~~`)
          : lineText.replace(/(\[x\] ~~[\d-: ]+~~|\[x\])/, '[ ]')

        if (value !== lineText) {
          ctx.editor.replaceLine(line, value)
        }
      }
    })

    ctx.registerHook('ON_VIEW_ELEMENT_CLICK', async (e: MouseEvent) => {
      const target = e.target as HTMLElement

      const preventEvent = () => {
        e.preventDefault()
        e.stopPropagation()
        return true
      }

      if (target.tagName === 'INPUT' && target.parentElement!.classList.contains('source-line')) {
        const line = parseInt(target.parentElement!.dataset.sourceLine || '0')
        const checked = (target as HTMLInputElement).checked
        ctx.action.getActionHandler(actionName)(line, checked)
        return preventEvent()
      }

      return false
    })
  }
} as Plugin
