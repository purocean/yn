import { cloneDeep, cloneDeepWith, isEqual, uniq } from 'lodash-es'
import { triggerHook } from '@fe/core/hook'
import * as api from '@fe/support/api'
import store from '@fe/support/store'
import { basename } from '@fe/utils/path'
import { sleep } from '@fe/utils'
import type { BuildInSettings, FileItem, PathItem, SettingGroup, SettingSchema } from '@fe/types'
import { getDefaultSettingSchema } from '@fe/others/setting-schema'
import { getThemeName } from './theme'
import { t } from './i18n'

type Schema = SettingSchema

const schema = getDefaultSettingSchema()

const settings = {
  ...getDefaultSetting(),
  ...transformSettings(window._INIT_SETTINGS)
}

/**
 * Get Schema.
 * @returns Schema
 */
export function getSchema (): Schema {
  schema.required = (Object.keys(schema.properties) as any[])
    .filter((key: keyof Schema['properties']) => schema.properties[key].required)
  const result: Schema = cloneDeepWith(schema, val => {
    if (typeof val === 'string' && val.startsWith('T_')) {
      return t(val.substring(2) as any)
    }
  })

  result.groups = [...result.groups, { label: t('setting-panel.tabs.other') as any, value: 'other' }]

  return result
}

/**
 * Change Schema.
 * @param fun
 */
export function changeSchema (fun: (schema: Schema) => void) {
  fun(schema)
}

function transformSettings (data: any) {
  if (!data) {
    return {}
  }

  data.repos = Object.keys(data.repositories || {}).map(name => ({
    name,
    path: data.repositories[name]
  }))

  data.mark = (data.mark || []).map((item: PathItem) => ({
    name: basename(item.path),
    path: item.path,
    repo: item.repo,
  })) as FileItem[]

  data.theme = getThemeName()

  delete data.repositories

  return data
}

/**
 * Get default settings.
 * @returns settings
 */
export function getDefaultSetting () {
  return Object.fromEntries(
    Object.entries(schema.properties).map(([key, val]) => [key, val.defaultValue])
  ) as unknown as BuildInSettings
}

/**
 * Fetch remote settings and refresh local value.
 * @returns settings
 */
export async function fetchSettings () {
  const oldSettings = getSettings()
  const data = transformSettings(await api.fetchSettings())

  Object.assign(settings, {
    ...getDefaultSetting(),
    ...data
  })

  triggerHook('SETTING_FETCHED', { settings, oldSettings })

  const changedKeys = uniq([...Object.keys(oldSettings), ...Object.keys(settings)] as (keyof BuildInSettings)[])
    .filter((key) => !isEqual(settings[key], oldSettings[key]))

  if (changedKeys.length > 0) {
    const schema = getSchema()
    triggerHook('SETTING_CHANGED', { schema, settings, oldSettings, changedKeys })
  }

  return settings
}

/**
 * Write settings.
 * @param settings
 * @returns settings
 */
export async function writeSettings (settings: Record<string, any>) {
  const data = cloneDeep(settings)

  if (data.repos) {
    const repositories: any = {}
    data.repos.forEach(({ name, path }: any) => {
      name = name.trim()
      path = path.trim()
      if (name && path) {
        repositories[name] = path
      }
    })

    delete data.repos
    data.repositories = repositories
  }

  if (data.theme) {
    delete data.theme
  }

  triggerHook('SETTING_BEFORE_WRITE', { settings: data } as any)

  await api.writeSettings(data)
  return await fetchSettings()
}

/**
 * Get local settings.
 * @returns settings
 */
export function getSettings () {
  return cloneDeep(settings)
}

/**
 * get setting val by key
 * @param key
 * @param defaultVal
 * @returns
 */
export function getSetting<T extends keyof BuildInSettings> (key: T, defaultVal: BuildInSettings[T]): BuildInSettings[T]
export function getSetting<T extends keyof BuildInSettings> (key: T, defaultVal?: null): BuildInSettings[T] | null
export function getSetting<T extends keyof BuildInSettings> (key: T, defaultVal: BuildInSettings[T] | null = null): BuildInSettings[T] | null {
  const settings = getSettings()
  if (typeof settings[key] !== 'undefined') {
    return settings[key]
  }

  return defaultVal
}

/**
 * set setting val
 * @param key
 * @param val
 * @returns
 */
export async function setSetting<T extends keyof BuildInSettings> (key: T, val: BuildInSettings[T]) {
  await writeSettings({ [key]: val })
}

/**
 * Show setting panel.
 * @param keyOrGroup
 */
export async function showSettingPanel (keyOrGroup?: SettingGroup | keyof BuildInSettings): Promise<void>
export async function showSettingPanel (keyOrGroup?: string): Promise<void>
export async function showSettingPanel (keyOrGroup?: string) {
  store.commit('setShowSetting', true)
  if (!keyOrGroup) {
    return
  }

  const schema = getSchema().properties[keyOrGroup as keyof Schema['properties']]
  const group = schema?.group || keyOrGroup

  await sleep(200)
  const tab: HTMLElement | null = document.querySelector(`.editor-wrapper div[data-key="${group}"]`)
  tab?.click()

  if (schema) {
    const el: HTMLElement | null = document.querySelector(`.editor-wrapper .row > div[data-schemapath="root.${keyOrGroup}"]`)
    if (el) {
      await sleep(200)
      el.style.backgroundColor = 'rgba(255, 255, 50, 0.3)'
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      await sleep(2000)
      el.style.backgroundColor = ''
    }
  }
}

/**
 * Hide setting panel.
 */
export function hideSettingPanel () {
  store.commit('setShowSetting', false)
}
