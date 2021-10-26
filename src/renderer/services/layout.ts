import { nextTick } from 'vue'
import store from '@fe/support/store'
import { useBus } from '@fe/core/bus'
import { getActionHandler, registerAction } from '../core/action'
import { Alt } from '../core/shortcut'

const bus = useBus()

export function emitResize () {
  nextTick(() => bus.emit('global.resize'))
}

export function toggleSide () {
  store.commit('setShowSide', !store.state.showSide)
  emitResize()
}

export function toggleView () {
  store.commit('setShowView', !store.state.showView)
  store.commit('setShowEditor', true)
  emitResize()
}

export function toggleEditor () {
  store.commit('setShowView', true)
  store.commit('setShowEditor', !store.state.showEditor)
  emitResize()
}

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
