import type { PositionState } from '@fe/types'
import { DOM_ATTR_NAME } from '@fe/support/args'
import store from '@fe/support/store'
import { sleep } from '@fe/utils'
import * as editor from './editor'
import * as view from './view'

/**
 * Change position.
 * @param position
 */
export async function changePosition (position: PositionState) {
  if (
    'editorScrollTop' in position &&
    'viewScrollTop' in position &&
    typeof position.editorScrollTop === 'number' &&
    typeof position.viewScrollTop === 'number'
  ) {
    view.disableSyncScrollAwhile(async () => {
      await Promise.resolve()
      editor.getEditor().setScrollTop(position.editorScrollTop!)
      view.scrollTopTo(position.viewScrollTop!)
      await sleep(50)
      view.scrollTopTo(position.viewScrollTop!)
    })
  } else if ('editorScrollTop' in position && typeof position.editorScrollTop === 'number') {
    await Promise.resolve()
    editor.getEditor().setScrollTop(position.editorScrollTop!)
  } else if ('viewScrollTop' in position && typeof position.viewScrollTop === 'number') {
    await Promise.resolve()
    view.scrollTopTo(position.viewScrollTop)
    await sleep(50)
    view.scrollTopTo(position.viewScrollTop)
  } else if ('line' in position) {
    view.disableSyncScrollAwhile(async () => {
      await Promise.resolve()
      editor.highlightLine(position.line, true)
      editor.getEditor().setPosition({ lineNumber: position.line, column: position.column || 1 })
      editor.getEditor().focus()

      await sleep(50)
      view.highlightLine(position.line, true)
    })
  } else if ('anchor' in position) {
    await sleep(50)
    const el = await view.highlightAnchor(position.anchor, true)
    if (el) {
      // reveal editor line when click heading
      if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName)) {
        if (editor.isDefault() && store.state.showEditor) {
          view.disableSyncScrollAwhile(() => {
            const line = parseInt(el.getAttribute(DOM_ATTR_NAME.SOURCE_LINE_START) || '0')
            const lineEnd = parseInt(el.getAttribute(DOM_ATTR_NAME.SOURCE_LINE_END) || '0')
            editor.highlightLine(lineEnd ? [line, lineEnd - 1] : line, true, 1000)
          })
        }
        el.click()
      }
    }
  }
}
