import { debounce } from 'lodash-es'
import * as ioc from '@fe/core/ioc'
import { getActionHandler, registerAction } from '@fe/core/action'
import { Alt, Escape, Shift } from '@fe/core/command'
import store from '@fe/support/store'
import type { Components } from '@fe/types'

/**
 * Toggle outline visible.
 * @param visible
 */
export function toggleOutline (visible?: boolean) {
  store.commit('setShowOutline', typeof visible === 'boolean' ? visible : !store.state.showOutline)
}

registerAction({ name: 'workbench.toggle-outline', handler: toggleOutline, keys: [Shift, Alt, 'o'] })

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
    return schema
  },

  /**
   * Toggle visible
   * @param visible
   */
  toggle (visible?: boolean) {
    const val = typeof visible === 'boolean' ? visible : !store.state.showControlCenter
    store.commit('setShowControlCenter', val)
  },
}

registerAction({ name: 'control-center.toggle', handler: ControlCenter.toggle, keys: [Alt, 'c'] })

registerAction({
  name: 'control-center.hide',
  handler: ControlCenter.toggle.bind(null, false),
  keys: [Escape],
  when: () => store.state.showControlCenter
})
