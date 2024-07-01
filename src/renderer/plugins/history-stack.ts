import type { Plugin, Ctx } from '@fe/context'
import type { Doc, PathItem, PositionState, SwitchDocOpts } from '@fe/types'

type State = { doc: Doc, position?: PositionState | null}

export default {
  name: 'history-stack',
  register: (ctx: Ctx) => {
    const maxLength = 100
    let stack: State[] = []
    let idx = -1

    const backId = 'plugin.document-history-stack.back'
    const forwardId = 'plugin.document-history-stack.forward'

    function refresh () {
      ctx.workbench.ControlCenter.refresh()
      ctx.statusBar.refreshMenu()
    }

    function go (offset: number) {
      const index = idx + offset
      if (index >= stack.length || index < 0) {
        return
      }

      const nextState = stack[index]

      ctx.doc.switchDoc(nextState.doc, { source: 'history-stack', ext: { position: nextState.position } }).then(() => {
        if (nextState.position) {
          ctx.routines.changePosition(nextState.position)
        }
      })

      idx = index
      refresh()
    }

    function removeFromStack (doc?: PathItem) {
      stack = stack.filter(x => !ctx.doc.isSubOrSameFile(doc, x.doc))
      idx = stack.length - 1
      refresh()
    }

    function record (doc: Doc | null | undefined, opts: SwitchDocOpts | null | undefined) {
      if (!doc) {
        return
      }

      const newState: State = { doc: { type: doc.type, repo: doc.repo, name: doc.name, path: doc.path }, position: opts?.ext?.position }

      if (ctx.lib.lodash.isEqual(newState, stack[idx])) {
        return
      }

      stack.splice(idx + 1, stack.length)
      stack.push(newState)
      idx = stack.length - 1

      if (stack.length > maxLength) {
        stack = stack.slice(stack.length - maxLength)
      }

      refresh()
    }

    ctx.registerHook('PLUGIN_HOOK', ({ plugin, type, payload }) => {
      if (plugin === 'markdown-link' && type === 'after-change-position-only') {
        record(ctx.store.state.currentFile, { ext: { position: payload.position } })
      }
    })

    ctx.registerHook('DOC_SWITCHED', ({ doc, opts }) => record(doc, opts))
    ctx.registerHook('DOC_DELETED', ({ doc }) => removeFromStack(doc))
    ctx.registerHook('DOC_MOVED', ({ oldDoc }) => removeFromStack(oldDoc))

    ctx.action.registerAction({
      name: backId,
      description: ctx.i18n.t('command-desc.plugin_document-history-stack_back'),
      forUser: true,
      handler: () => go(-1),
      keys: [ctx.keybinding.Alt, ctx.keybinding.BracketLeft],
    })

    ctx.action.registerAction({
      name: forwardId,
      description: ctx.i18n.t('command-desc.plugin_document-history-stack_forward'),
      forUser: true,
      handler: () => go(1),
      keys: [ctx.keybinding.Alt, ctx.keybinding.BracketRight],
    })

    ctx.registerHook('STARTUP', () => {
      ctx.statusBar.tapMenus(menus => {
        menus['status-bar-navigation']?.list?.push(
          {
            id: forwardId,
            type: 'normal' as any,
            title: ctx.i18n.t('status-bar.nav.forward'),
            disabled: idx >= stack.length - 1,
            subTitle: ctx.keybinding.getKeysLabel(forwardId),
            onClick: () => ctx.action.getActionHandler(forwardId)()
          },
          {
            id: backId,
            type: 'normal' as any,
            title: ctx.i18n.t('status-bar.nav.back'),
            disabled: idx <= 0,
            subTitle: ctx.keybinding.getKeysLabel(backId),
            onClick: () => ctx.action.getActionHandler(backId)()
          },
        )
      })
    })

    ctx.workbench.ControlCenter.tapSchema(schema => {
      schema.navigation.items.push(
        {
          type: 'btn',
          icon: 'arrow-left-solid',
          flat: true,
          title: ctx.i18n.t('control-center.navigation.back', ctx.keybinding.getKeysLabel(backId)),
          disabled: idx <= 0,
          showInActionBar: true,
          onClick: () => ctx.action.getActionHandler(backId)()
        },
        {
          type: 'btn',
          icon: 'arrow-right-solid',
          flat: true,
          title: ctx.i18n.t('control-center.navigation.forward', ctx.keybinding.getKeysLabel(forwardId)),
          disabled: idx >= stack.length - 1,
          showInActionBar: true,
          onClick: () => ctx.action.getActionHandler(forwardId)()
        },
      )
    })
  }
} as Plugin
