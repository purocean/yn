import { nextTick } from 'vue'
import store from '@fe/support/store'
import { useBus } from '@fe/core/bus'
import { getActionHandler, registerAction } from '../core/action'
import { Alt } from '../core/shortcut'

const bus = useBus()

/**
 * 下一个 tick 抛出 resize 事件
 */
export function emitResize () {
  nextTick(() => bus.emit('global.resize'))
}

/**
 * 切换侧栏展示
 * @param val 是否展示
 */
export function toggleSide (val?: boolean) {
  store.commit('setShowSide', typeof val === 'boolean' ? val : !store.state.showSide)
  emitResize()
}

/**
 * 切换预览展示
 * @param val 是否展示
 */
export function toggleView (val?: boolean) {
  store.commit('setShowView', typeof val === 'boolean' ? val : !store.state.showView)
  store.commit('setShowEditor', true)
  emitResize()
}

/**
 * 切换编辑器展示
 * @param val 是否展示
 */
export function toggleEditor (val?: boolean) {
  store.commit('setShowView', true)
  store.commit('setShowEditor', typeof val === 'boolean' ? val : !store.state.showEditor)
  emitResize()
}

/**
 * 切换终端展示
 * @param val 是否展示
 */
export function toggleXterm (val?: boolean) {
  const showXterm = store.state.showXterm
  const show = typeof val === 'boolean' ? val : !showXterm

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
