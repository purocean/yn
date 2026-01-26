import { debounce, orderBy } from 'lodash-es'
import * as ioc from '@fe/core/ioc'
import { triggerHook } from '@fe/core/hook'
import { getActionHandler, registerAction } from '@fe/core/action'
import { Alt, Shift } from '@fe/core/keybinding'
import store from '@fe/support/store'
import type { Components, RightSidePanel } from '@fe/types'
import { t } from './i18n'

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
  mcpDescription: 'Toggle outline panel visibility. No parameters required.',
  forUser: true,
  forMcp: true,
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

export const ContentRightSide = {
  /**
   * Register a right side panel.
   * @param panel Panel
   * @param override Override the existing panel
   */
  registerPanel (panel: RightSidePanel, override = false) {
    if (!panel.component) {
      throw new Error('Panel component is required')
    }

    // check if the panel is already registered
    if (ioc.get('RIGHT_SIDE_PANEL').some(item => item.name === panel.name)) {
      if (override) {
        ContentRightSide.removePanel(panel.name)
      } else {
        throw new Error(`Panel ${panel.name} is already registered`)
      }
    }

    ioc.register('RIGHT_SIDE_PANEL', panel)
    triggerHook('RIGHT_SIDE_PANEL_CHANGE', { type: 'register' })
  },

  /**
   * Remove a right side panel.
   * @param name Panel name
   */
  removePanel (name: string) {
    ioc.removeWhen('RIGHT_SIDE_PANEL', item => item.name === name)

    // if the current panel is removed, switch to another one or hide
    if (store.state.currentRightSidePanel === name) {
      const panels = ContentRightSide.getAllPanels()
      if (panels.length > 0) {
        ContentRightSide.switchPanel(panels[0].name)
      } else {
        store.state.currentRightSidePanel = null
      }
    }

    triggerHook('RIGHT_SIDE_PANEL_CHANGE', { type: 'remove' })
  },

  /**
   * Get all registered panels.
   * @returns Panels
   */
  getAllPanels (): RightSidePanel[] {
    return [...orderBy(ioc.get('RIGHT_SIDE_PANEL'), x => x.order ?? 256, 'asc')]
  },

  /**
   * Switch to a panel by name.
   * @param name Panel name
   */
  switchPanel (name: string) {
    const panel = ContentRightSide.getAllPanels().find(p => p.name === name)
    if (!panel) {
      throw new Error(`Panel ${name} not found`)
    }

    store.state.currentRightSidePanel = name
    triggerHook('RIGHT_SIDE_PANEL_CHANGE', { type: 'switch' })
    getActionHandler('layout.toggle-content-right-side')(true)
  },

  /**
   * Show right side panel with a specific panel.
   * @param name Panel name, if not provided, show the current or first panel
   */
  show (name?: string) {
    const panels = ContentRightSide.getAllPanels()
    if (panels.length === 0) {
      return
    }

    if (name) {
      ContentRightSide.switchPanel(name)
    } else {
      const currentPanel = store.state.currentRightSidePanel
      if (!currentPanel || !panels.find(p => p.name === currentPanel)) {
        store.state.currentRightSidePanel = panels[0].name
      }
      getActionHandler('layout.toggle-content-right-side')(true)
    }
  },

  /**
   * Hide right side panel.
   */
  hide () {
    getActionHandler('layout.toggle-content-right-side')(false)
  },

  /**
   * Toggle right side panel visibility.
   * @param visible
   */
  toggle (visible?: boolean) {
    // Do nothing if no panels registered
    if (ContentRightSide.getAllPanels().length === 0) {
      return
    }
    getActionHandler('layout.toggle-content-right-side')(visible)
  },
}
