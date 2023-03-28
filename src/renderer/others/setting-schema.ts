import { cloneDeep } from 'lodash-es'
import { MsgPath } from '@share/i18n'
import { DEFAULT_EXCLUDE_REGEX } from '@share/misc'
import { BuildInSettings, SettingGroup } from '@fe/types'
import { isMacOS, isWindows } from '@fe/support/env'
import { FLAG_DISABLE_XTERM, FLAG_MAS } from '@fe/support/args'

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
    group: SettingGroup,
    validator?: (schema: Schema['properties'][K], value: BuildInSettings[K], path: string) =>
      {path: string, property: K, message: string}[]
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
  groups: {
    label: TTitle,
    value: SettingGroup,
  }[],
}

const schema: Schema = ({
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
      options: {
        enum_titles: ['github.css'],
      },
      group: 'appearance',
      required: true,
    },
    'updater.source': {
      defaultValue: 'github.com',
      title: 'T_setting-panel.schema.updater.source',
      type: 'string',
      enum: ['github.com', 'ghproxy.com'],
      group: 'other',
      required: true,
    },
    'plantuml-api': {
      defaultValue: 'local',
      title: 'T_setting-panel.schema.plantuml-api',
      type: 'string',
      enum: [
        'local',
        'https://www.plantuml.com/plantuml/png/{data}',
        'https://www.plantuml.com/plantuml/svg/{data}',
      ],
      options: {
        enum_titles: [
          'Local - Need Java and Graphviz',
          'Online (plantuml.com) - PNG',
          'Online (plantuml.com) - SVG',
        ],
      },
      required: true,
      group: 'other',
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
    'search.number-limit': {
      defaultValue: 300,
      title: 'T_setting-panel.schema.search.number-limit',
      type: 'number',
      enum: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000],
      required: true,
      group: 'other',
    },
    'assets-dir': {
      defaultValue: './FILES/{docName}',
      title: 'T_setting-panel.schema.assets-dir',
      type: 'string',
      description: 'T_setting-panel.schema.assets-desc',
      group: 'image',
      required: true,
      pattern: '^(?![./]+\\{docName\\})[^\\\\<>?:"|*]{1,}$',
      options: {
        patternmessage: '[\\<>?:"|*] are not allowed. Cannot starts with ./{docName}, /{docName} or {docName}.'
      },
    },
    'assets.path-type': {
      defaultValue: 'auto',
      title: 'T_setting-panel.schema.assets.path-type',
      type: 'string',
      group: 'image',
      required: true,
      enum: ['auto', 'relative', 'absolute'],
      options: {
        enum_titles: ['Auto', 'Relative', 'Absolute'],
      },
    },
    'editor.line-numbers': {
      defaultValue: 'on',
      title: 'T_setting-panel.schema.editor.line-numbers',
      enum: ['on', 'off', 'relative', 'interval'],
      options: {
        enum_titles: ['On', 'Off', 'Relative', 'Interval'],
      },
      type: 'string',
      group: 'editor',
      required: true,
    },
    'auto-save': {
      defaultValue: 2000,
      title: 'T_setting-panel.schema.auto-save',
      enum: [0, 2000, 4000, 8000, 30000, 60000],
      options: {
        enum_titles: ['Disable', '2s', '4s', '8s', '30s', '60s'],
      },
      type: 'number',
      group: 'editor',
      required: true,
    },
    'editor.ordered-list-completion': {
      defaultValue: 'increase',
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
    'editor.tab-size': {
      defaultValue: 4,
      title: 'T_setting-panel.schema.editor.tab-size',
      type: 'number',
      enum: [2, 4],
      group: 'editor',
      required: true,
    },
    'editor.font-family': {
      defaultValue: '',
      title: 'T_setting-panel.schema.editor.font-family',
      type: 'string',
      group: 'editor',
      options: {
        inputAttributes: { placeholder: 'e.g., \'Courier New\', monospace' }
      },
    },
    'editor.mouse-wheel-zoom': {
      defaultValue: true,
      title: 'T_setting-panel.schema.editor.mouse-wheel-zoom',
      type: 'boolean',
      format: 'checkbox',
      group: 'editor',
      required: true,
    },
    'editor.minimap': {
      defaultValue: true,
      title: 'T_setting-panel.schema.editor.minimap',
      type: 'boolean',
      format: 'checkbox',
      group: 'editor',
      required: true,
    },
    'editor.enable-preview': {
      defaultValue: true,
      title: 'T_setting-panel.schema.editor.enable-preview',
      type: 'boolean',
      format: 'checkbox',
      group: 'editor',
      required: true,
    },
    'render.md-html': {
      defaultValue: true,
      title: 'T_setting-panel.schema.render.md-html',
      type: 'boolean',
      format: 'checkbox',
      group: 'render',
      required: true,
    },
    'render.md-breaks': {
      defaultValue: true,
      title: 'T_setting-panel.schema.render.md-breaks',
      type: 'boolean',
      format: 'checkbox',
      group: 'render',
      required: true,
    },
    'render.md-linkify': {
      defaultValue: true,
      title: 'T_setting-panel.schema.render.md-linkify',
      type: 'boolean',
      format: 'checkbox',
      group: 'render',
      required: true,
    },
    'render.md-typographer': {
      defaultValue: false,
      title: 'T_setting-panel.schema.render.md-typographer',
      type: 'boolean',
      format: 'checkbox',
      group: 'render',
      required: true,
    },
    'render.md-sup': {
      defaultValue: true,
      title: 'T_setting-panel.schema.render.md-sup',
      type: 'boolean',
      format: 'checkbox',
      group: 'render',
      required: true,
    },
    'render.md-sub': {
      defaultValue: true,
      title: 'T_setting-panel.schema.render.md-sub',
      type: 'boolean',
      format: 'checkbox',
      group: 'render',
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
    'tree.exclude': {
      defaultValue: DEFAULT_EXCLUDE_REGEX,
      title: 'T_setting-panel.schema.tree.exclude',
      type: 'string',
      group: 'other',
      description: 'e.g., ' + DEFAULT_EXCLUDE_REGEX,
      validator: (_schema, value, path) => {
        if (value === '') return []
        try {
          // eslint-disable-next-line no-new
          new RegExp(value)
          return []
        } catch (e: any) {
          return [{ property: 'tree.exclude', path, message: e.message }]
        }
      }
    },
    'keep-running-after-closing-window': {
      defaultValue: !isMacOS,
      title: 'T_setting-panel.keep-running-after-closing-window',
      type: 'boolean',
      group: 'other',
      format: 'checkbox',
      required: true,
    },
    envs: {
      defaultValue: '',
      title: 'T_setting-panel.schema.envs',
      type: 'string',
      group: 'other',
      format: 'textarea',
      options: {
        inputAttributes: { placeholder: 'PATH: /opt/homebrew/bin:/use/local/bin\nGRAPHVIZ_DOT: /opt/homebrew/bin/dot', style: 'height: 4em' }
      }
    },
    'proxy.enabled': {
      defaultValue: false,
      title: 'T_setting-panel.schema.proxy.enabled',
      type: 'boolean',
      format: 'checkbox',
      group: 'proxy',
    },
    'proxy.server': {
      defaultValue: '',
      title: 'T_setting-panel.schema.proxy.server',
      type: 'string',
      group: 'proxy',
      pattern: '^(|.+:\\d{2,5})$',
      options: {
        inputAttributes: { placeholder: 'T_setting-panel.schema.proxy.server-hint', }
      }
    },
    'proxy.bypass-list': {
      defaultValue: '<local>',
      title: 'T_setting-panel.schema.proxy.bypass-list',
      type: 'string',
      group: 'proxy',
      options: {
        inputAttributes: { placeholder: '<local>;*.google.com;*foo.com;1.2.3.4:5678', }
      }
    },
    'proxy.pac-url': {
      defaultValue: '',
      title: 'T_setting-panel.schema.proxy.pac-url',
      type: 'string',
      group: 'proxy',
      options: {
        inputAttributes: { placeholder: 'http://', }
      }
    },
  } as Partial<Schema['properties']> as any,
  required: [],
  groups: [
    { label: 'T_setting-panel.tabs.repos', value: 'repos' },
    { label: 'T_setting-panel.tabs.appearance', value: 'appearance' },
    { label: 'T_setting-panel.tabs.editor', value: 'editor' },
    { label: 'T_setting-panel.tabs.render', value: 'render' },
    { label: 'T_setting-panel.tabs.image', value: 'image' },
    { label: 'T_setting-panel.tabs.proxy', value: 'proxy' },
  ]
})

if (isWindows || FLAG_DISABLE_XTERM) {
  delete (schema.properties as any).envs
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

export function getDefaultSettingSchema (): Schema {
  return cloneDeep(schema)
}
