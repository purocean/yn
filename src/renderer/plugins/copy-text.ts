import { Plugin } from '@fe/context'
import { hasCtrlCmd } from '@fe/core/command'
import { copyText, encodeMarkdownLink } from '@fe/utils'
import store from '@fe/support/store'

export default {
  name: 'copy-text',
  register: (ctx) => {
    ctx.registerHook('VIEW_ELEMENT_CLICK', async ({ e }) => {
      const target = e.target as HTMLElement

      const preventEvent = () => {
        e.preventDefault()
        e.stopPropagation()
        return true
      }

      // copy heading link.
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

      // copy content.
      if (target.classList.contains('copy-inner-text') && hasCtrlCmd(e)) {
        copyText(target.innerText)
        return preventEvent()
      }

      return false
    })
  }
} as Plugin
