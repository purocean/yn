import type { Plugin, Ctx } from '@fe/context'
import type { Doc } from '@fe/types'

export default {
  name: 'document-history-stack',
  register: (ctx: Ctx) => {
    let stack: Doc[] = []
    let idx = -1

    const backId = 'plugin.document-history-stack.back'
    const forwardId = 'plugin.document-history-stack.forward'

    function refresh () {
      ctx.controlCenter.refresh()
    }

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
      refresh()
    }

    function removeFromStack (doc?: Doc) {
      stack = stack.filter(x => !ctx.doc.isSubOrSameFile(doc, x))
      idx = stack.length - 1
      refresh()
    }

    ctx.registerHook('DOC_SWITCHED', ({ doc }) => {
      if (doc) {
        if (!ctx.doc.isSameFile(stack[idx], doc)) {
          stack.splice(idx + 1, stack.length)
          stack.push({ type: doc.type, repo: doc.repo, name: doc.name, path: doc.path })
          idx = stack.length - 1
        }
      }
      refresh()
    })

    ctx.registerHook('DOC_DELETED', ({ doc }) => removeFromStack(doc))
    ctx.registerHook('DOC_MOVED', ({ oldDoc }) => removeFromStack(oldDoc))

    ctx.action.registerAction({
      name: backId,
      handler: () => go(-1),
      keys: [ctx.command.Alt, ctx.command.BracketLeft],
    })

    ctx.action.registerAction({
      name: forwardId,
      handler: () => go(1),
      keys: [ctx.command.Alt, ctx.command.BracketRight],
    })

    ctx.controlCenter.tapSchema(schema => {
      schema.navigation.items.push(
        {
          type: 'btn',
          icon: 'arrow-left-solid',
          flat: true,
          title: ctx.i18n.t('control-center.navigation.back', ctx.command.getKeysLabel(backId)),
          disabled: idx <= 0,
          onClick: () => ctx.action.getActionHandler(backId)()
        },
        {
          type: 'btn',
          icon: 'arrow-right-solid',
          flat: true,
          title: ctx.i18n.t('control-center.navigation.forward', ctx.command.getKeysLabel(forwardId)),
          disabled: idx >= stack.length - 1,
          onClick: () => ctx.action.getActionHandler(forwardId)()
        },
      )
    })
  }
} as Plugin
