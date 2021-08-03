import type { Plugin, Ctx } from '@fe/context/plugin'
import type { Doc } from '@fe/support/types'

export default {
  name: 'document-history-stack',
  register: (ctx: Ctx) => {
    const stack: Doc[] = []
    let idx = -1

    ctx.bus.on('doc.switched', (file?: Doc) => {
      if (file) {
        if (!ctx.doc.isSameFile(stack[idx], file)) {
          stack.splice(idx + 1, stack.length)
          stack.push({ type: file.type, repo: file.repo, name: file?.name, path: file?.path })
          idx = stack.length - 1
        }
      }
    })

    function go (offset: number) {
      const index = idx + offset
      if (index >= stack.length || index < 0) {
        return
      }

      const nextFile = stack[index]
      if (!ctx.doc.isSameFile(nextFile, ctx.store.state.currentFile)) {
        ctx.doc.switchDoc(nextFile)
      }

      idx = index
    }

    ctx.action.registerAction({
      name: 'document-history-stack.back',
      handler: () => go(-1),
      keys: [ctx.shortcut.Alt, ctx.shortcut.BracketLeft],
    })

    ctx.action.registerAction({
      name: 'document-history-stack.forward',
      handler: () => go(1),
      keys: [ctx.shortcut.Alt, ctx.shortcut.BracketRight],
    })
  }
} as Plugin
