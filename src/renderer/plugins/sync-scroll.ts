import type { Plugin } from '@fe/context'

export default {
  name: 'sync-scroll',
  register: (ctx) => {
    function syncScrollByEditor () {
      const editor = ctx.editor.getEditor()
      const visibleRange = editor.getVisibleRanges()[0]
      if (!visibleRange) {
        return
      }

      const startLine = Math.max(1, visibleRange.startLineNumber - 1)

      if (ctx.view.getEnableSyncScroll()) {
        ctx.view.revealLine(startLine)
      }
    }

    ctx.editor.whenEditorReady().then(({ editor }) => {
      editor.onDidScrollChange(syncScrollByEditor)
      editor.onDidChangeModel(() => {
        ctx.registerHook('VIEW_RENDERED', syncScrollByEditor, true)
      })
    })

    function clickScroll (e: MouseEvent) {
      const _target = e.target as HTMLElement
      if (['button', 'div', 'img', 'input', 'canvas', 'details', 'summary'].includes(_target.tagName.toLowerCase())) {
        return
      }

      const target: HTMLElement | null = (e.target as HTMLElement).closest('[data-source-line]')

      if (
        target &&
        ctx.store.state.showEditor &&
        !ctx.store.state.presentation && // not in presentation mode
        !(target.ownerDocument?.defaultView?.getSelection()?.toString()?.length) // not select text
      ) {
        ctx.view.disableSyncScrollAwhile(() => {
          const line = parseInt(target!.dataset.sourceLine || '0')
          const lineEnd = parseInt(target!.dataset.sourceLineEnd || '0')
          ctx.editor.highlightLine(lineEnd ? [line, lineEnd - 1] : line, true, 1000)
        })
      }

      return false
    }

    let clickTimer: number | null = null
    ctx.registerHook('VIEW_ELEMENT_CLICK', async ({ e }) => {
      if ((e.target as HTMLElement).ownerDocument?.defaultView?.getSelection()?.toString()?.length) {
        return
      }

      if (clickTimer) {
        clearTimeout(clickTimer)
        clickTimer = null
      } else {
        clickTimer = setTimeout(() => {
          clickScroll(e)
          clickTimer = null
        }, 200) as any
      }
    })
  }
} as Plugin
