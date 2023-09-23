import type { Plugin } from '@fe/context'

export default {
  name: 'record-recent-document',
  register: (ctx) => {
    // only support electron
    if (!ctx.env.isElectron) {
      return
    }

    // record recent document after markdown file saved
    ctx.registerHook('DOC_SAVED', ({ doc }) => {
      setTimeout(() => {
        if (ctx.doc.isMarkdownFile(doc) && doc.absolutePath) {
          let path = doc.absolutePath

          // replace '/' to '\' on windows
          if (ctx.env.isWindows) {
            path = path.replaceAll('/', '\\')
          }

          ctx.env.getElectronRemote().app.addRecentDocument(path)
        }
      }, 0)
    })
  }
} as Plugin
