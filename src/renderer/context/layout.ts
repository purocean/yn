import { nextTick } from 'vue'
import store from '@fe/support/store'
import { useBus } from '@fe/support/bus'
import { getActionHandler, registerAction } from './action'
import { Alt } from './shortcut'

export type ActionName = 'layout.toggle-view'
  | 'layout.toggle-side'
  | 'layout.toggle-xterm'

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
registerAction({ name: 'layout.toggle-view', handler: toggleView, keys: [Alt, 'v'] })
registerAction({ name: 'layout.toggle-xterm', handler: toggleXterm, keys: [Alt, 't'] })
