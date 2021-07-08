import dayjs from 'dayjs'
import { getLineContent, replaceLine } from '@fe/context/editor'
import { Plugin, Ctx } from '@fe/context/plugin'

export default {
  name: 'switch-todo',
  register: (ctx: Ctx) => {
    ctx.registerHook('ON_VIEW_ELEMENT_CLICK', async (e: MouseEvent) => {
      const target = e.target as HTMLElement

      const preventEvent = () => {
        e.preventDefault()
        e.stopPropagation()
        return true
      }

      function switchTodo (line: number, checked: boolean) {
        const lineText = getLineContent(line)

        const value = checked
          ? lineText.replace('[ ]', `[x] ~~${dayjs().format('YYYY-MM-DD HH:mm')}~~`)
          : lineText.replace(/(\[x\] ~~[\d-: ]+~~|\[x\])/, '[ ]')

        replaceLine(line, value)
      }

      if (target.tagName === 'INPUT' && target.parentElement!.classList.contains('source-line')) {
        switchTodo(parseInt(target.parentElement!.dataset.sourceLine || '0'), (target as HTMLInputElement).checked)
        return preventEvent()
      }

      return false
    })
  }
} as Plugin
