import { registerAction } from '@fe/core/action'
import { Alt, Shift } from '@fe/core/command'
import store from '@fe/support/store'

/**
 * Toggle outline visible.
 * @param visible
 */
export function toggleOutline (visible?: boolean) {
  store.commit('setShowOutline', typeof visible === 'boolean' ? visible : !store.state.showOutline)
}

registerAction({ name: 'workbench.toggle-outline', handler: toggleOutline, keys: [Shift, Alt, 'o'] })
