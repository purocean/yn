import { Plugin, Ctx } from '@fe/useful/plugin'
import { useBus } from '@fe/useful/bus'
import dayjs from 'dayjs'

export default {
  name: 'switch-todo',
  register: (ctx: Ctx) => {
    ctx.registerHook('ON_VIEW_ELEMENT_CLICK', async (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const bus = useBus()

      const preventEvent = () => {
        e.preventDefault()
        e.stopPropagation()
        return true
      }

      function switchTodo (line: number, checked: boolean) {
        let lineText = ''
        bus.emit('editor-get-line', { line, callback: (val: string) => { lineText = val } })

        const value = checked
          ? lineText.replace('[ ]', `[x] ~~${dayjs().format('YYYY-MM-DD HH:mm')}~~`)
          : lineText.replace(/(\[x\] ~~[\d-: ]+~~|\[x\])/, '[ ]')
        bus.emit('editor-replace-line', { line, value })
      }

      if (target.tagName === 'INPUT' && target.parentElement!.classList.contains('source-line')) {
        switchTodo(parseInt(target.parentElement!.dataset.sourceLine || '0'), (target as HTMLInputElement).checked)
        return preventEvent()
      }

      return false
    })
  }
} as Plugin
