import { cloneDeep, cloneDeepWith, isEqual, uniq } from 'lodash-es'
import { triggerHook } from '@fe/core/hook'
import { MsgPath } from '@share/i18n'
import * as api from '@fe/support/api'
import { FLAG_DISABLE_XTERM, FLAG_MAS } from '@fe/support/args'
import store from '@fe/support/store'
import { basename } from '@fe/utils/path'
import type{ BuildInSettings, FileItem, PathItem } from '@fe/types'
import { getThemeName } from './theme'
import { t } from './i18n'

export type TTitle = keyof {[K in MsgPath as `T_${K}`]: never}

export type Schema = {
  type: string,
  title: TTitle,
  properties: {[K in keyof BuildInSettings]: {
    type: string,
    title: TTitle,
    description?: TTitle,
    required?: boolean,
    defaultValue: BuildInSettings[K] extends any ? BuildInSettings[K] : any,
    enum?: string[] | number [],
    group: 'repos' | 'appearance' | 'editor' | 'image' | 'other',
    items?: {
      type: string,
      title: TTitle,
      properties: {
        [K in string] : {
          type: string,
          title: TTitle,
          description?: TTitle,
          options: {
            inputAttributes: { placeholder: TTitle }
          }
        }
      }
    },
    [key: string]: any,
  }},
  required: (keyof BuildInSettings)[],
}

const schema: Schema = {
  type: 'object',
  title: 'T_setting-panel.setting',
  properties: {
    repos: {
      defaultValue: [],
      type: 'array',
      title: 'T_setting-panel.schema.repos.repos',
      format: 'table',
      group: 'repos',
      items: {
        type: 'object',
        title: 'T_setting-panel.schema.repos.repo',
        properties: {
          name: {
            type: 'string',
            title: 'T_setting-panel.schema.repos.name',
            defaultValue: '',
            maxLength: 10,
            options: {
              inputAttributes: { placeholder: 'T_setting-panel.schema.repos.name-placeholder' }
            },
          },
          path: {
            type: 'string',
            title: 'T_setting-panel.schema.repos.path',
            readonly: true,
            options: {
              inputAttributes: { placeholder: 'T_setting-panel.schema.repos.path-placeholder', style: 'cursor: pointer' }
            },
          }
        }
      },
    },
    theme: {
      defaultValue: 'system',
      title: 'T_setting-panel.schema.theme',
      type: 'string',
      enum: ['system', 'dark', 'light'],
      group: 'appearance',
      required: true,
    },
    language: {
      defaultValue: 'system',
      title: 'T_setting-panel.schema.language',
      type: 'string',
      enum: ['system', 'en', 'zh-CN'],
      group: 'appearance',
      required: true,
    },
    'custom-css': {
      defaultValue: 'github.css',
      title: 'T_setting-panel.schema.custom-css',
      type: 'string',
      enum: ['github.css'],
      group: 'appearance',
      required: true,
    },
    'updater.source': {
      defaultValue: 'github.com',
      title: 'T_setting-panel.schema.updater.source',
      type: 'string',
      enum: ['github.com', 'ghproxy.com', 'mirror.ghproxy.com'],
      group: 'other',
      required: true,
    },
    'doc-history.number-limit': {
      defaultValue: 500,
      title: 'T_setting-panel.schema.doc-history.number-limit',
      type: 'number',
      enum: [0, 10, 20, 50, 100, 200, 500, 1000],
      options: {
        enum_titles: ['Disable'],
      },
      required: true,
      group: 'other',
    },
    'assets-dir': {
      defaultValue: './FILES/{docSlug}',
      title: 'T_setting-panel.schema.assets-dir',
      type: 'string',
      minLength: 1,
      description: 'T_setting-panel.schema.assets-desc',
      group: 'image',
    },
    'editor.tab-size': {
      defaultValue: 4,
      title: 'T_setting-panel.schema.editor.tab-size',
      type: 'number',
      enum: [2, 4],
      group: 'editor',
      required: true,
    },
    'editor.ordered-list-completion': {
      defaultValue: 'auto',
      title: 'T_setting-panel.schema.editor.ordered-list-completion',
      type: 'string',
      enum: ['auto', 'increase', 'one'],
      options: {
        enum_titles: ['Auto', '1. ···, 2. ···, 3. ···', '1. ···, 1. ···, 1. ···'],
      },
      group: 'editor',
      required: true,
    },
    'editor.font-size': {
      defaultValue: 16,
      title: 'T_setting-panel.schema.editor.font-size',
      type: 'number',
      format: 'range',
      minimum: 12,
      maximum: 40,
      group: 'editor',
    },
    'editor.mouse-wheel-zoom': {
      defaultValue: true,
      title: 'T_setting-panel.schema.editor.mouse-wheel-zoom',
      type: 'boolean',
      format: 'checkbox',
      group: 'editor',
      required: true,
    },
    shell: {
      defaultValue: '',
      title: 'T_setting-panel.schema.shell',
      type: 'string',
      group: 'other',
    },
    'server.host': {
      defaultValue: 'localhost',
      title: 'T_setting-panel.schema.server.host',
      type: 'string',
      enum: ['localhost', '0.0.0.0'],
      group: 'other',
      required: true,
    },
    'server.port': {
      defaultValue: 3044,
      title: 'T_setting-panel.schema.server.port',
      description: 'T_setting-panel.schema.server.port-desc',
      type: 'number',
      group: 'other',
      required: true,
      minimum: 10,
      maximum: 65535,
    },
    'keep-running-after-closing-window': {
      defaultValue: !FLAG_MAS,
      title: 'T_setting-panel.keep-running-after-closing-window',
      type: 'boolean',
      group: 'other',
      format: 'checkbox',
      required: true,
    }
  } as Partial<Schema['properties']> as any,
  required: [],
}

const settings = {
  ...getDefaultSetting(),
  ...transformSettings(window._INIT_SETTINGS)
}

if (FLAG_DISABLE_XTERM) {
  delete (schema.properties as any).shell
  delete (schema.properties as any)['server.host']
  delete (schema.properties as any)['server.port']
  delete (schema.properties as any)['updater.source']
}

if (FLAG_MAS) {
  delete (schema.properties as any)['updater.source']
}

/**
 * Get Schema.
 * @returns Schema
 */
export function getSchema (): Schema {
  schema.required = (Object.keys(schema.properties) as any[])
    .filter((key: keyof Schema['properties']) => schema.properties[key].required)
  return cloneDeepWith(schema, val => {
    if (typeof val === 'string' && val.startsWith('T_')) {
      return t(val.substring(2) as any)
    }
  })
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
  ) as BuildInSettings
}

/**
 * Fetch remote settings and refresh local value.
 * @returns settings
 */
export async function fetchSettings () {
  const oldSettings = cloneDeep(getSettings())
  const data = transformSettings(await api.fetchSettings())

  Object.assign(settings, {
    ...getDefaultSetting(),
    ...data
  })

  triggerHook('SETTING_FETCHED', { settings, oldSettings })

  const changedKeys = uniq([...Object.keys(oldSettings), ...Object.keys(settings)] as (keyof BuildInSettings)[])
    .filter((key) => !isEqual(settings[key], oldSettings[key]))

  if (changedKeys.length > 0) {
    triggerHook('SETTING_CHANGED', { settings, oldSettings, changedKeys })
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

  triggerHook('SETTING_BEFORE_WRITE', { settings } as any)

  await api.writeSettings(data)
  return await fetchSettings()
}

/**
 * Get local settings.
 * @returns settings
 */
export function getSettings () {
  return settings
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
 */
export function showSettingPanel () {
  store.commit('setShowSetting', true)
}

/**
 * Hide setting panel.
 */
export function hideSettingPanel () {
  store.commit('setShowSetting', false)
}
