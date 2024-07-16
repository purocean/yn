import type { Plugin, Ctx } from '@fe/context'
import type { Doc, PathItem, PositionState } from '@fe/types'

type State = { doc: Doc, position?: PositionState | null}

export default {
  name: 'history-stack',
  register: (ctx: Ctx) => {
    const maxLength = 100
    let stack: State[] = []
    let idx = -1
    const logger = ctx.utils.getLogger('plugin:history-stack')

    const backId = 'plugin.document-history-stack.back'
    const forwardId = 'plugin.document-history-stack.forward'

    function refresh () {
      ctx.workbench.ControlCenter.refresh()
      ctx.statusBar.refreshMenu()

      logger.debug('refresh', stack, idx, stack[idx])
    }

    function go (offset: number) {
      const index = idx + offset
      if (index >= stack.length || index < 0) {
        return
      }

      const nextState = stack[index]

      ctx.doc.switchDoc(nextState.doc, { source: 'history-stack', position: nextState.position }).then(() => {
        idx = index
        refresh()
      })
    }

    function removeFromStack (doc?: PathItem) {
      stack = stack.filter(x => !ctx.doc.isSubOrSameFile(doc, x.doc))
      if (idx >= stack.length) {
        idx = stack.length - 1
      }

      refresh()
    }

    function record (doc: Doc, position: PositionState | null) {
      const newState: State = { doc: { type: doc.type, repo: doc.repo, name: doc.name, path: doc.path }, position }

      // check same doc
      if (stack[idx] && ctx.doc.isSameFile(doc, stack[idx].doc)) {
        if (position) {
          // check same position
          if (ctx.lib.lodash.isEqual(position, stack[idx].position)) {
            return
          }
        } else {
          // not special position, check if already has position
          if (isScrollPosition(stack[idx].position)) {
            return
          }
        }
      }

      stack.splice(idx + 1, stack.length)
      stack.push(newState)
      idx = stack.length - 1

      if (stack.length > maxLength) {
        stack = stack.slice(stack.length - maxLength)
      }

      refresh()
    }

    function isScrollPosition (position: PositionState | undefined | null) {
      return position && ('editorScrollTop' in position || 'viewScrollTop' in position)
    }

    function savePosition () {
      const currentState = stack[idx]
      const currentDoc = ctx.store.state.currentFile
      if (!currentState || !currentDoc) {
        return
      }

      // update scroll position when switching doc
      if ((!currentState.position || isScrollPosition(currentState.position)) && ctx.doc.isSubOrSameFile(currentDoc, currentState.doc)) {
        const viewScrollTop = ctx.view.getScrollTop() || 0
        const editorScrollTop = ctx.editor.getEditor().getScrollTop()
        currentState.position = { viewScrollTop, editorScrollTop }
      }
    }

    ctx.registerHook('DOC_PRE_SWITCH', () => {
      savePosition()
    })

    ctx.registerHook('DOC_SWITCHED', ({ doc, opts }) => {
      // do not record position when switching doc by history stack
      if (opts?.source === 'history-stack') {
        return
      }

      if (!doc && !opts?.position) {
        return
      }

      const _doc = doc || ctx.store.state.currentFile
      if (!_doc) {
        return
      }

      const position = opts?.position || (stack as any).findLast((x: State) => {
        return isScrollPosition(x.position) && ctx.doc.isSubOrSameFile(_doc, x.doc)
      })?.position

      if (!opts?.position && position) {
        ctx.routines.changePosition(position)
      }

      record(_doc, null) // do not record cross doc position
    })

    ctx.registerHook('DOC_SWITCH_SKIPPED', ({ doc, opts }) => {
      if (opts?.source === 'history-stack') {
        return
      }

      // record in page navigation
      if (doc && opts?.position) {
        record(doc, opts?.position)
      }
    })

    ctx.registerHook('DOC_DELETED', ({ doc }) => removeFromStack(doc))
    ctx.registerHook('DOC_MOVED', ({ oldDoc }) => removeFromStack(oldDoc))
    ctx.registerHook('DOC_SWITCH_FAILED', ({ doc }) => { doc && removeFromStack(doc) })

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
