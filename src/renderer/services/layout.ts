import { nextTick } from 'vue'
import { throttle } from 'lodash-es'
import { triggerHook } from '@fe/core/hook'
import { getActionHandler, Keys, registerAction } from '@fe/core/action'
import store from '@fe/support/store'
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

registerAction({ name: 'layout.toggle-side', handler: toggleSide, keys: [Keys.Alt, 'e'] })
registerAction({ name: 'layout.toggle-editor', handler: toggleEditor, keys: [Keys.Alt, 'x'] })
registerAction({ name: 'layout.toggle-view', handler: toggleView, keys: [Keys.Alt, 'v'] })
registerAction({ name: 'layout.toggle-xterm', handler: toggleXterm, keys: [Keys.Alt, 't'] })
