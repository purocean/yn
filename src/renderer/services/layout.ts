import { nextTick } from 'vue'
import { throttle } from 'lodash-es'
import store from '@fe/support/store'
import { triggerHook } from '@fe/core/hook'
import { getActionHandler, registerAction } from '@fe/core/action'
import { Alt, Shift } from '@fe/core/command'
import * as view from './view'

const emitResizeDebounce = throttle(() => {
  triggerHook('GLOBAL_RESIZE')
}, 50, { leading: true })

/**
 * Trigger resize hook after next tick.
 */
export function emitResize () {
  nextTick(emitResizeDebounce)
}

/**
 * Toggle side bar visible.
 * @param visible
 */
export function toggleSide (visible?: boolean) {
  store.commit('setShowSide', typeof visible === 'boolean' ? visible : !store.state.showSide)
  emitResize()
}

/**
 * Toggle preview visible.
 * @param visible
 */
export function toggleView (visible?: boolean) {
  const val = typeof visible === 'boolean' ? visible : !store.state.showView
  val && nextTick(view.refresh)

  store.commit('setShowView', val)
  store.commit('setShowEditor', true)
  emitResize()
}

/**
 * Toggle editor visible.
 * @param visible
 */
export function toggleEditor (visible?: boolean) {
  store.commit('setShowView', true)
  store.commit('setShowEditor', typeof visible === 'boolean' ? visible : !store.state.showEditor)
  emitResize()
}

/**
 * Toggle integrated terminal visible.
 * @param visible
 */
export function toggleXterm (visible?: boolean) {
  const showXterm = store.state.showXterm
  const show = typeof visible === 'boolean' ? visible : !showXterm

  store.commit('setShowXterm', show)

  nextTick(() => {
    emitResize()

    if (!showXterm) {
      getActionHandler('xterm.init')()
    }
  })
}
/**
 * Toggle outline visible.
 * @param visible
 */
export function toggleOutline (visible?: boolean) {
  store.commit('setShowOutline', typeof visible === 'boolean' ? visible : !store.state.showOutline)
}

registerAction({ name: 'layout.toggle-side', handler: toggleSide, keys: [Alt, 'e'] })
registerAction({ name: 'layout.toggle-editor', handler: toggleEditor, keys: [Alt, 'x'] })
registerAction({ name: 'layout.toggle-view', handler: toggleView, keys: [Alt, 'v'] })
registerAction({ name: 'layout.toggle-xterm', handler: toggleXterm, keys: [Alt, 't'] })
registerAction({ name: 'layout.toggle-outline', handler: toggleOutline, keys: [Shift, Alt, 'o'] })
