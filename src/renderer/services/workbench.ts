import { debounce } from 'lodash-es'
import * as ioc from '@fe/core/ioc'
import { getActionHandler, registerAction } from '@fe/core/action'
import { Alt, Shift } from '@fe/core/keybinding'
import store from '@fe/support/store'
import type { Components, Doc, PositionState } from '@fe/types'
import { sleep } from '@fe/utils'
import { t } from './i18n'
import { switchDoc } from './document'
import * as view from './view'
import * as editor from './editor'
import { DOM_ATTR_NAME } from '@fe/support/args'

/**
 * Toggle outline visible.
 * @param visible
 */
export function toggleOutline (visible?: boolean) {
  store.state.showOutline = typeof visible === 'boolean' ? visible : !store.state.showOutline
}

registerAction({
  name: 'workbench.toggle-outline',
  description: t('command-desc.workbench_toggle-outline'),
  forUser: true,
  handler: toggleOutline,
  keys: [Shift, Alt, 'o']
})

const _refreshTabsActionBtns = debounce(() => {
  getActionHandler('file-tabs.refresh-action-btns')()
}, 10)

export const FileTabs = {
  /**
   * Refresh tabs action buttons.
   */
  refreshActionBtns () {
    _refreshTabsActionBtns()
  },

  /**
   * Add a tabs action button processor.
   * @param tapper
   */
  tapActionBtns (tapper: (btns: Components.Tabs.ActionBtn[]) => void) {
    ioc.register('TABS_ACTION_BTN_TAPPERS', tapper)
    FileTabs.refreshActionBtns()
  },

  /**
   * Remove a tabs action button processor.
   * @param tapper
   */
  removeActionBtnTapper (tapper: (btns: Components.Tabs.ActionBtn[]) => void) {
    ioc.remove('TABS_ACTION_BTN_TAPPERS', tapper)
    FileTabs.refreshActionBtns()
  },

  /**
   * Get tabs action buttons.
   * @returns
   */
  getActionBtns () {
    const btns: Components.Tabs.ActionBtn[] = []
    const tappers = ioc.get('TABS_ACTION_BTN_TAPPERS')
    tappers.forEach(tap => tap(btns))
    return btns
  },

  /**
   * Add a tab context menu processor.
   * @param tapper
   */
  tapTabContextMenus (tapper: (items: Components.ContextMenu.Item[], tab: Components.Tabs.Item) => void) {
    ioc.register('TABS_TAB_CONTEXT_MENU_TAPPERS', tapper)
  },

  /**
   * Remove a tab context menu processor.
   * @param tapper
   */
  removeTabContextMenuTapper (tapper: (items: Components.ContextMenu.Item[], tab: Components.Tabs.Item) => void) {
    ioc.remove('TABS_TAB_CONTEXT_MENU_TAPPERS', tapper)
  },

  /**
   * Get tab context menus.
   * @param tab
   * @returns
   */
  getTabContextMenus (tab: Components.Tabs.Item) {
    const items: Components.ContextMenu.Item[] = []
    const tappers = ioc.get('TABS_TAB_CONTEXT_MENU_TAPPERS')
    tappers.forEach(tap => tap(items, tab))
    return items
  }
}

const _refreshControlCenter = debounce(() => {
  getActionHandler('control-center.refresh')()
  getActionHandler('action-bar.refresh')()
}, 10)

export const ControlCenter = {
  /**
   * Refresh control center.
   */
  refresh () {
    _refreshControlCenter()
  },

  /**
   * Add a schema processor.
   * @param tapper
   */
  tapSchema (tapper: Components.ControlCenter.SchemaTapper) {
    ioc.register('CONTROL_CENTER_SCHEMA_TAPPERS', tapper)
    ControlCenter.refresh()
  },

  /**
   * Get schema.
   * @returns
   */
  getSchema () {
    const schema: Components.ControlCenter.Schema = { switch: { items: [] }, navigation: { items: [] } }
    const tappers: Components.ControlCenter.SchemaTapper[] = ioc.get('CONTROL_CENTER_SCHEMA_TAPPERS')
    tappers.forEach(tap => tap(schema))
    const sortFun = (a: Components.ControlCenter.Item, b: Components.ControlCenter.Item) => (a.order || 256) - (b.order || 256)
    schema.switch.items = schema.switch.items.sort(sortFun)
    schema.navigation.items = schema.navigation.items.sort(sortFun)
    return schema
  },

  /**
   * Toggle visible
   * @param visible
   */
  toggle (visible?: boolean) {
    getActionHandler('control-center.toggle')(visible)
  },
}

/**
 * Navigate to
 */
export async function navigateTo (
  doc?: Doc | null,
  position?: { anchor: string } | { line: number, column?: number } | PositionState
) {
  if (!doc && !position) {
    throw new Error('doc or position must be provided')
  }

  if (doc) {
    await switchDoc(doc)
  }

  if (!position) {
    return
  }

  if ('anchor' in position) {
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

    return
  }

  if ('line' in position) {
    view.disableSyncScrollAwhile(async () => {
      if (editor.isDefault()) {
        editor.highlightLine(position.line, true)
        editor.getEditor().setPosition({ lineNumber: position.line, column: position.column || 1 })
        editor.getEditor().focus()
      }

      await sleep(50)
      view.highlightLine(position.line, true)
    })
    return
  }

  if ('editorScrollTop' in position && position.editorScrollTop && editor.isDefault()) {
    editor.getEditor().setScrollTop(position.editorScrollTop)
  }

  if ('viewScrollTop' in position && position.viewScrollTop) {
    await sleep(50)
    view.scrollTopTo(position.viewScrollTop)
  }
}
