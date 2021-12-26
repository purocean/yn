import { debounce } from 'lodash-es'
import type { Plugin } from '@fe/context'
import { sleep } from '@fe/utils'

export default {
  name: 'sync-scroll',
  register: (ctx) => {
    type ScrollTop = { editor?: number, view?: number }

    const STORAGE_KEY = 'plugin.scroll-position'

    function saveScrollPosition (scrollTop: ScrollTop) {
      const key = ctx.doc.toUri(ctx.store.state.currentFile)
      const data: Record<string, ScrollTop> = ctx.storage.get(STORAGE_KEY, {})
      data[key] = { ...data[key], ...scrollTop }
      ctx.storage.set(STORAGE_KEY, data)
    }

    // restore scroll bar location after file switched.
    ctx.registerHook('DOC_SWITCHED', async ({ doc }) => {
      if (doc) {
        await sleep(0)

        const key = ctx.doc.toUri(ctx.store.state.currentFile)
        const data: Record<string, ScrollTop> = ctx.storage.get(STORAGE_KEY, {})
        const position = data[key] || { editor: 0, view: 0 }

        await ctx.editor.whenEditorReady()

        ctx.view.disableSyncScrollAwhile(async () => {
          ctx.editor.setScrollToTop(position.editor || 0)
          if (typeof position.view === 'number') {
            await sleep(0)
            ctx.view.scrollTopTo(position.view)
          }
        })
      }
    })

    ctx.editor.whenEditorReady().then(({ editor }) => {
      const savePosition = debounce(saveScrollPosition, 500)
      editor.onDidScrollChange(() => {
        const visibleRange = editor.getVisibleRanges()[0]
        const startLine = Math.max(1, visibleRange.startLineNumber - 2)
        const endLine = Math.max(startLine, visibleRange.endLineNumber)

        const top = editor.getScrollTop()
        if (ctx.view.getEnableSyncScroll()) {
          ctx.view.revealLine(startLine, startLine + (endLine - startLine) / 2)
        }
        savePosition({ editor: top })
      })
    })

    const savePosition = debounce(saveScrollPosition, 500)
    ctx.registerHook('VIEW_SCROLL', ({ e }) => {
      if (ctx.store.state.currentFile?.status) {
        const { scrollTop } = e.target as HTMLElement
        savePosition({ view: scrollTop })
      }
    })

    function clickScroll (e: MouseEvent) {
      const target = e.target as HTMLElement

      if (
        ctx.store.state.showEditor &&
        !ctx.store.state.presentation &&
        target.dataset.sourceLine &&
        window.getSelection()!.toString().length < 1
      ) {
        ctx.view.disableSyncScrollAwhile(() => {
          ctx.editor.revealLineInCenter(parseInt(target.dataset.sourceLine || '0'))
        })
      }

      return false
    }

    let clickTimer: number | null = null
    ctx.registerHook('VIEW_ELEMENT_CLICK', async ({ e }) => {
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
