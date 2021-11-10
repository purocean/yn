import { nextTick } from 'vue'
import store from '@fe/support/store'
import { triggerHook } from '@fe/core/hook'
import { getActionHandler, registerAction } from '@fe/core/action'
import { Alt } from '@fe/core/command'
import * as view from './view'

/**
 * 下一个 tick 抛出 resize 事件
 */
export function emitResize () {
  nextTick(() => triggerHook('GLOBAL_RESIZE'))
}

/**
 * 切换侧栏展示
 * @param visible 是否展示
 */
export function toggleSide (visible?: boolean) {
  store.commit('setShowSide', typeof visible === 'boolean' ? visible : !store.state.showSide)
  emitResize()
}

/**
 * 切换预览展示
 * @param visible 是否展示
 */
export function toggleView (visible?: boolean) {
  const val = typeof visible === 'boolean' ? visible : !store.state.showView
  val && nextTick(view.refresh)

  store.commit('setShowView', val)
  store.commit('setShowEditor', true)
  emitResize()
}

/**
 * 切换编辑器展示
 * @param visible 是否展示
 */
export function toggleEditor (visible?: boolean) {
  store.commit('setShowView', true)
  store.commit('setShowEditor', typeof visible === 'boolean' ? visible : !store.state.showEditor)
  emitResize()
}

/**
 * 切换终端展示
 * @param visible 是否展示
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

registerAction({ name: 'layout.toggle-side', handler: toggleSide, keys: [Alt, 'e'] })
registerAction({ name: 'layout.toggle-editor', handler: toggleEditor, keys: [Alt, 'x'] })
registerAction({ name: 'layout.toggle-view', handler: toggleView, keys: [Alt, 'v'] })
registerAction({ name: 'layout.toggle-xterm', handler: toggleXterm, keys: [Alt, 't'] })
