import type { Plugin, Ctx } from '@fe/context/plugin'
import type { Doc } from '@fe/support/types'

export default {
  name: 'document-history-stack',
  register: (ctx: Ctx) => {
    const stack: Doc[] = []
    let idx = -1

    const backId = 'plugin.document-history-stack.back'
    const forwardId = 'plugin.document-history-stack.forward'

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

    function updateMenu () {
      console.log(idx, idx < stack.length - 1, idx > 0)
      ctx.statusBar.tapMenus(menus => {
        const list = menus['status-bar-navigation']?.list || []
        if (list) {
          menus['status-bar-navigation'].list = [
            {
              id: forwardId,
              type: 'normal' as any,
              title: '前进',
              disabled: idx >= stack.length - 1,
              subTitle: ctx.shortcut.getKeysLabel(forwardId),
              onClick: ctx.action.getActionHandler(forwardId)
            },
            {
              id: backId,
              type: 'normal' as any,
              title: '后退',
              disabled: idx <= 0,
              subTitle: ctx.shortcut.getKeysLabel(backId),
              onClick: ctx.action.getActionHandler(backId)
            },
          ].concat(list.filter(x => ![forwardId, backId].includes(x.id)) as any)
        }
      })
    }

    function removeFromStack (doc?: Doc) {
      const newStack = stack.filter(x => ctx.doc.toUri(doc) !== ctx.doc.toUri(x))
      stack.splice(0, stack.length)
      stack.push(...newStack)
      updateMenu()
    }

    ctx.bus.on('doc.switched', (file?: Doc) => {
      if (file) {
        if (!ctx.doc.isSameFile(stack[idx], file)) {
          stack.splice(idx + 1, stack.length)
          stack.push({ type: file.type, repo: file.repo, name: file.name, path: file.path })
          idx = stack.length - 1
        }
      }
      updateMenu()
    })

    ctx.bus.on('doc.deleted', removeFromStack)
    ctx.bus.on('doc.moved', ({ oldDoc }) => removeFromStack(oldDoc))

    ctx.action.registerAction({
      name: backId,
      handler: () => go(-1),
      keys: [ctx.shortcut.Alt, ctx.shortcut.BracketLeft],
    })

    ctx.action.registerAction({
      name: forwardId,
      handler: () => go(1),
      keys: [ctx.shortcut.Alt, ctx.shortcut.BracketRight],
    })
  }
} as Plugin
