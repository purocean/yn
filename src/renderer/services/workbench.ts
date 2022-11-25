import { debounce } from 'lodash-es'
import * as ioc from '@fe/core/ioc'
import { getActionHandler, registerAction } from '@fe/core/action'
import { Alt, Shift } from '@fe/core/command'
import store from '@fe/support/store'
import type { Components } from '@fe/types'

/**
 * Toggle outline visible.
 * @param visible
 */
export function toggleOutline (visible?: boolean) {
  store.commit('setShowOutline', typeof visible === 'boolean' ? visible : !store.state.showOutline)
}

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

registerAction({ name: 'workbench.toggle-outline', handler: toggleOutline, keys: [Shift, Alt, 'o'] })
