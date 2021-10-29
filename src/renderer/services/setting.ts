import * as api from '@fe/support/api'
import { FLAG_DISABLE_XTERM } from '@fe/support/args'
import store from '@fe/support/store'
import { BuildInSettings } from '@fe/types'
import { getThemeName } from './theme'

export type Schema = {
  type: string,
  title: string,
  properties: {[K in keyof BuildInSettings]: {
    defaultValue: BuildInSettings[K] extends any ? BuildInSettings[K] : any
    [key: string]: any,
  }},
  required: (keyof BuildInSettings)[],
}

const schema: Schema = {
  type: 'object',
  title: '配置项',
  properties: {
    repos: {
      defaultValue: [],
      type: 'array',
      title: '仓库',
      format: 'table',
      items: {
        type: 'object',
        title: '仓库',
        properties: {
          name: {
            type: 'string',
            title: '仓库名',
            maxLength: 10,
            options: {
              inputAttributes: { placeholder: '请输入' }
            },
          },
          path: {
            type: 'string',
            title: '路径',
            readonly: true,
            options: {
              inputAttributes: { placeholder: '请选择储存位置', style: 'cursor: pointer' }
            },
          }
        }
      },
    },
    theme: {
      defaultValue: 'system',
      title: '主题',
      type: 'string',
      enum: ['system', 'dark', 'light']
    },
    'assets-dir': {
      defaultValue: './FILES/{docSlug}',
      title: '图片存放目录',
      type: 'string',
      minLength: 1,
      description: '支持相对路径和绝对路径（限于仓库内部）,可用变量：docSlug, date'
    } as any,
    shell: {
      defaultValue: '',
      title: '终端 Shell',
      type: 'string',
    } as any,
  } as any,
  required: ['theme'],
}

const settings = getDefaultSetting()

if (FLAG_DISABLE_XTERM) {
  delete (schema.properties as any).shell
}

/**
 * 获取配置 Schema
 * @returns 配置 Schema
 */
export function getSchema () {
  return schema
}

/**
 * 更改 Schema
 * @param fun 处理方法
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
 * 获取默认配置
 * @returns 配置
 */
export function getDefaultSetting () {
  return Object.fromEntries(
    Object.entries(schema.properties).map(([key, val]) => [key, val.defaultValue])
  ) as BuildInSettings
}

/**
 * 从服务器获取配置并更新本地配置
 * @returns 配置
 */
export async function fetchSettings () {
  const data = transformSettings(await api.fetchSettings())

  return Object.assign(settings, {
    ...getDefaultSetting(),
    ...data
  })
}

/**
 * 写入配置
 * @param data 配置内容
 * @returns 配置
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

  await api.writeSettings(data)
  return await fetchSettings()
}

/**
 * 获取本地配置
 * @returns 配置
 */
export function getSettings () {
  return settings
}

/**
 * 展示设置面板
 */
export function showSettingPanel () {
  store.commit('setShowSetting', true)
}

/**
 * 隐藏设置面板
 */
export function hideSettingPanel () {
  store.commit('setShowSetting', false)
}
