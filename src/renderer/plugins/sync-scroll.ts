import { debounce } from 'lodash-es'
import type { Plugin, Ctx } from '@fe/context/plugin'
import type { Doc } from '@fe/support/types'
import { sleep } from '@fe/utils'

export default {
  name: 'sync-scroll',
  register: (ctx: Ctx) => {
    type ScrollTop = { editor?: number, view?: number }

    const STORAGE_KEY = 'plugin.scroll-position'

    let enableSyncScroll = true
    let xTimer: any
    async function disableSyncScroll (fn: Function) {
      clearTimeout(xTimer)
      enableSyncScroll = false
      await fn()
      xTimer = setTimeout(() => {
        enableSyncScroll = true
      }, 500)
    }

    function saveScrollPosition (scrollTop: ScrollTop) {
      const key = ctx.doc.toUri(ctx.store.state.currentFile)
      const data: Record<string, ScrollTop> = ctx.storage.get(STORAGE_KEY, {})
      data[key] = { ...data[key], ...scrollTop }
      ctx.storage.set(STORAGE_KEY, data)
    }

    // 切换文件后恢复滚动位置
    ctx.bus.on('doc.switched', async (file?: Doc) => {
      if (file) {
        await sleep(0)

        const key = ctx.doc.toUri(ctx.store.state.currentFile)
        const data: Record<string, ScrollTop> = ctx.storage.get(STORAGE_KEY, {})
        const position = data[key] || { editor: 0, view: 0 }

        await ctx.editor.whenEditorReady()

        disableSyncScroll(async () => {
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
        const line = Math.max(1, editor.getVisibleRanges()[0].startLineNumber - 2)
        const top = editor.getScrollTop()
        if (enableSyncScroll) {
          ctx.view.revealLine(line)
        }
        savePosition({ editor: top })
      })
    })

    const savePosition = debounce(saveScrollPosition, 500)
    ctx.registerHook('ON_VIEW_SCROLL', (e: WheelEvent) => {
      if (ctx.store.state.currentFile?.status) {
        const { scrollTop } = e.target as HTMLElement
        savePosition({ view: scrollTop })
      }
    })

    ctx.registerHook('ON_VIEW_ELEMENT_CLICK', async (e: MouseEvent) => {
      const target = e.target as HTMLElement

      if (
        ctx.store.state.showEditor &&
        !ctx.store.state.presentation &&
        target.classList.contains('source-line') &&
        window.getSelection()!.toString().length < 1
      ) {
        disableSyncScroll(() => {
          ctx.editor.revealLineInCenter(parseInt(target.dataset.sourceLine || '0'))
        })
      }

      return false
    })
  }
} as Plugin
