import { nextTick } from 'vue'
import { debounce, throttle } from 'lodash-es'
import * as ioc from '@fe/core/ioc'
import { triggerHook } from '@fe/core/hook'
import { getActionHandler, registerAction } from '@fe/core/action'
import { Alt } from '@fe/core/command'
import store from '@fe/support/store'
import type { Components } from '@fe/types'
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
  val && nextTick(view.render)

  store.commit('setShowView', val)

  if (store.state.editorPreviewExclusive && store.state.showEditor) {
    store.commit('setShowEditor', false)
  } else {
    store.commit('setShowEditor', true)
  }

  emitResize()
}

/**
 * Toggle editor visible.
 * @param visible
 */
export function toggleEditor (visible?: boolean) {
  const val = typeof visible === 'boolean' ? visible : !store.state.showEditor
  store.commit('setShowEditor', val)

  if (store.state.editorPreviewExclusive && store.state.showView) {
    store.commit('setShowView', false)
  } else {
    store.commit('setShowView', true)
  }

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
 * Toggle editor preview exclusive.
 * @param exclusive
 */
export function toggleEditorPreviewExclusive (exclusive?: boolean) {
  const val = typeof exclusive === 'boolean' ? exclusive : !store.state.editorPreviewExclusive

  store.commit('setEditorPreviewExclusive', val)

  if (val && store.state.showEditor && store.state.showView) {
    store.commit('setShowView', false)
  }

  emitResize()
}

const _refreshTabsActionBtns = debounce(() => {
  getActionHandler('file-tabs.refresh-action-btns')()
}, 10)

/**
 * Refresh tabs action buttons.
 */
export function refreshTabsActionBtns () {
  _refreshTabsActionBtns()
}

/**
 * Add a tabs action button processor.
 * @param tapper
 */
export function tapTabsActionBtns (tapper: (btns: Components.Tabs.ActionBtn[]) => void) {
  ioc.register('TABS_ACTION_BTN_TAPPERS', tapper)
  refreshTabsActionBtns()
}

/**
 * Remove a tabs action button processor.
 * @param tapper
 */
export function removeTabsActionBtnTapper (tapper: (btns: Components.Tabs.ActionBtn[]) => void) {
  ioc.remove('TABS_ACTION_BTN_TAPPERS', tapper)
  refreshTabsActionBtns()
}

/**
 * Get tabs action buttons.
 * @returns
 */
export function getTabsActionBtns () {
  const btns: Components.Tabs.ActionBtn[] = []
  const tappers = ioc.get('TABS_ACTION_BTN_TAPPERS')
  tappers.forEach(tap => tap(btns))
  return btns
}

registerAction({ name: 'layout.toggle-side', handler: toggleSide, keys: [Alt, 'e'] })
registerAction({ name: 'layout.toggle-editor', handler: toggleEditor, keys: [Alt, 'x'] })
registerAction({ name: 'layout.toggle-view', handler: toggleView, keys: [Alt, 'v'] })
registerAction({ name: 'layout.toggle-xterm', handler: toggleXterm, keys: [Alt, 't'] })
