import { Plugin, Ctx } from '@fe/useful/plugin'
import { hasCtrlCmd } from '@fe/useful/shortcut'
import { encodeMarkdownLink } from '@fe/useful/utils'
import { useBus } from '@fe/useful/bus'
import { copyText } from '@fe/useful/copy-text'
import store from '@fe/store'

export default {
  name: 'copy-text',
  register: (ctx: Ctx) => {
    ctx.registerHook('ON_STARTUP', () => {
      const bus = useBus()
      bus.on('copy-text', copyText)
    })

    ctx.registerHook('ON_VIEW_ELEMENT_CLICK', async (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const bus = useBus()

      const preventEvent = () => {
        e.preventDefault()
        e.stopPropagation()
        return true
      }

      // 复制标题链接
      if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].indexOf(target.tagName) > -1 && target.id && hasCtrlCmd(e)) {
        const { currentFile } = store.state
        bus.emit('copy-text', encodeMarkdownLink(currentFile.path) + '#' + encodeMarkdownLink(decodeURIComponent(target.id)))
        return preventEvent()
      }

      // 复制内容
      if (target.classList.contains('copy-inner-text') && hasCtrlCmd(e)) {
        bus.emit('copy-text', target.innerText)
        return preventEvent()
      }

      return false
    })
  }
} as Plugin
