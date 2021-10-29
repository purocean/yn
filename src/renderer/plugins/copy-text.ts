import { Plugin } from '@fe/context'
import { hasCtrlCmd } from '@fe/core/command'
import { copyText, encodeMarkdownLink } from '@fe/utils'
import store from '@fe/support/store'

export default {
  name: 'copy-text',
  register: (ctx) => {
    ctx.registerHook('ON_VIEW_ELEMENT_CLICK', async (e: MouseEvent) => {
      const target = e.target as HTMLElement

      const preventEvent = () => {
        e.preventDefault()
        e.stopPropagation()
        return true
      }

      // 复制标题链接
      if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].indexOf(target.tagName) > -1 && target.id && hasCtrlCmd(e)) {
        const { currentFile } = store.state
        if (currentFile) {
          let path = currentFile.path
          if (!path.startsWith('/')) {
            path = '/' + path
          }

          copyText(encodeMarkdownLink(path) + '#' + encodeMarkdownLink(decodeURIComponent(target.id)))
          return preventEvent()
        }
      }

      if (target.classList.contains('copy-text') && target.dataset.text) {
        copyText(target.dataset.text)
        return preventEvent()
      }

      // 复制内容
      if (target.classList.contains('copy-inner-text') && hasCtrlCmd(e)) {
        copyText(target.innerText)
        return preventEvent()
      }

      return false
    })
  }
} as Plugin
