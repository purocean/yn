import { cloneDeepWith } from 'lodash-es'
import { triggerHook } from '@fe/core/hook'
import { MsgPath } from '@share/i18n'
import * as api from '@fe/support/api'
import { FLAG_DISABLE_XTERM } from '@fe/support/args'
import store from '@fe/support/store'
import type{ BuildInSettings } from '@fe/types'
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
    defaultValue: BuildInSettings[K] extends any ? BuildInSettings[K] : any,
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
      enum: ['system', 'dark', 'light']
    },
    language: {
      defaultValue: 'system',
      title: 'T_setting-panel.schema.language',
      type: 'string',
      enum: ['system', 'en', 'zh-CN']
    },
    'assets-dir': {
      defaultValue: './FILES/{docSlug}',
      title: 'T_setting-panel.schema.assets-dir',
      type: 'string',
      minLength: 1,
      description: 'T_setting-panel.schema.assets-desc'
    },
    shell: {
      defaultValue: '',
      title: 'T_setting-panel.schema.shell',
      type: 'string',
    },
  } as Partial<Schema['properties']> as any,
  required: ['theme', 'language'],
}

const settings = getDefaultSetting()

if (FLAG_DISABLE_XTERM) {
  delete (schema.properties as any).shell
}

/**
 * Get Schema.
 * @returns Schema
 */
export function getSchema () {
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
export function tapSchema (fun: (schema: Schema) => void) {
  fun(schema)
}

function transformSettings (data: any) {
  data.repos = Object.keys(data.repositories).map(name => ({
    name,
    path: data.repositories[name]
  }))

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
  const data = transformSettings(await api.fetchSettings())

  Object.assign(settings, {
    ...getDefaultSetting(),
    ...data
  })

  triggerHook('SETTING_FETCHED', { settings })

  return settings
}

/**
 * Write settings.
 * @param data settings
 * @returns settings
 */
export async function writeSettings (data: Record<string, any>) {
  const repositories: any = {}
  data.repos.forEach(({ name, path }: any) => {
    name = name.trim()
    path = path.trim()
    if (name && path) {
      repositories[name] = path
    }
  })

  delete data.repos
  delete data.theme
  data.repositories = repositories

  triggerHook('SETTING_BEFORE_WRITE', { settings })

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
