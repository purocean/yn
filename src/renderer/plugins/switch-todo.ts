import type { BuildInActionName } from '@fe/types'
import type { Plugin } from '@fe/context'

export default {
  name: 'switch-todo',
  register: (ctx) => {
    const actionName: BuildInActionName = 'plugin.switch-todo.switch'

    function switchTodo (line: number, checked?: boolean) {
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

    ctx.action.registerAction({
      name: actionName,
      keys: [ctx.command.Alt, 'o'],
      handler: (line?: number, checked?: boolean) => {
        if (line) {
          switchTodo(line, checked)
        } else {
          const selection = ctx.editor.getEditor().getSelection()
          if (selection) {
            for (let i = selection.startLineNumber; i <= selection.endLineNumber; i++) {
              switchTodo(i, checked)
            }
          }
        }
      }
    })

    ctx.registerHook('VIEW_ELEMENT_CLICK', async ({ e }) => {
      const target = e.target as HTMLElement

      const preventEvent = () => {
        e.preventDefault()
        e.stopPropagation()
        return true
      }

      if (target.tagName === 'INPUT' && target.classList.contains(ctx.args.DOM_CLASS_NAME.TASK_LIST_ITEM_CHECKBOX) && target.parentElement!.dataset.sourceLine) {
        const line = parseInt(target.parentElement!.dataset.sourceLine || '0')
        const checked = (target as HTMLInputElement).checked
        ctx.action.getActionHandler(actionName)(line, checked)
        return preventEvent()
      }

      return false
    })
  }
} as Plugin
