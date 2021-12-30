import { debounce } from 'lodash-es'
import * as ioc from '@fe/core/ioc'
import { getActionHandler, registerAction } from '@fe/core/action'
import store from '@fe/support/store'
import { Alt, Escape } from '@fe/core/command'

export type Item = {
  type: 'btn',
  flat?: boolean,
  checked?: boolean,
  disabled?: boolean,
  icon: string,
  title: string,
  onClick?: () => void,
}

export type SchemaItem = { items: Item[] }
export type Schema = {
  [category: string]: SchemaItem | undefined
} & {
  switch: SchemaItem,
  navigation: SchemaItem,
}

export type SchemaTapper = (schema: Schema) => void

const _refresh = debounce(() => {
  getActionHandler('control-center.refresh')()
}, 10)

/**
 * Refresh control center.
 */
export function refresh () {
  _refresh()
}

/**
 * Add a schema processor.
 * @param tapper
 */
export function tapSchema (tapper: SchemaTapper) {
  ioc.register('CONTROL_CENTER_SCHEMA_TAPPERS', tapper)
  refresh()
}

/**
 * Get schema.
 * @returns
 */
export function getSchema () {
  const schema: Schema = { switch: { items: [] }, navigation: { items: [] } }
  const tappers: SchemaTapper[] = ioc.get('CONTROL_CENTER_SCHEMA_TAPPERS')
  tappers.forEach(tap => tap(schema))
  return schema
}

/**
 * Toggle visible
 * @param visible
 */
export function toggle (visible?: boolean) {
  const val = typeof visible === 'boolean' ? visible : !store.state.showControlCenter
  store.commit('setShowControlCenter', val)
}

registerAction({ name: 'control-center.toggle', handler: toggle, keys: [Alt, 'c'] })

registerAction({
  name: 'control-center.hide',
  handler: toggle.bind(null, false),
  keys: [Escape],
  when: () => store.state.showControlCenter
})
