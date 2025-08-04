import { cloneDeep } from 'lodash-es'
import { DEFAULT_EXCLUDE_REGEX } from '@share/misc'
import { isMacOS, isWindows } from '@fe/support/env'
import { FLAG_DISABLE_XTERM, FLAG_MAS } from '@fe/support/args'
import { SettingSchema } from '@fe/types'

const schema: SettingSchema = ({
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
            openDialogOptions: { properties: ['openDirectory', 'createDirectory'] },
            options: {
              inputAttributes: { placeholder: 'T_setting-panel.schema.repos.path-placeholder', style: 'cursor: pointer' }
            },
          },
          enableIndexing: {
            type: 'boolean',
            title: 'T_setting-panel.schema.repos.enable-indexing',
            defaultValue: false,
            format: 'checkbox',
          },
        }
      },
    },
    theme: {
      defaultValue: 'system',
      title: 'T_setting-panel.schema.theme',
      type: 'string',
      enum: ['system', 'dark', 'light'],
      options: {
        enum_titles: ['System', 'Dark', 'Light'],
      },
      group: 'appearance',
      required: true,
    },
    language: {
      defaultValue: 'system',
      title: 'T_setting-panel.schema.language',
      type: 'string',
      enum: ['system', 'en', 'zh-CN', 'zh-TW', 'ru'],
      options: {
        enum_titles: ['System', 'English', '简体中文', '繁體中文', 'русский'],
      },
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
    'view.default-previewer-max-width': {
      defaultValue: 1024,
      title: 'T_setting-panel.schema.view.default-previewer-max-width',
      type: 'number',
      format: 'number',
      group: 'appearance',
      required: true,
      description: 'T_setting-panel.schema.view.default-previewer-max-width-desc',
      minimum: 10,
      maximum: Number.MAX_SAFE_INTEGER,
    },
    'view.default-previewer-font-family': {
      defaultValue: '',
      title: 'T_setting-panel.schema.view.default-previewer-font-family',
      type: 'string',
      group: 'appearance',
      options: {
        inputAttributes: { placeholder: 'e.g., \'Courier New\', monospace' }
      },
    },
    'updater.source': {
      defaultValue: 'auto',
      title: 'T_setting-panel.schema.updater.source',
      type: 'string',
      enum: ['auto', 'yank-note', 'github'],
      group: 'other',
      required: true,
    },
    'plantuml-api': {
      defaultValue: 'local-png',
      title: 'T_setting-panel.schema.plantuml-api',
      type: 'string',
      enum: [
        'local-png',
        'local-svg',
        'https://www.plantuml.com/plantuml/png/{data}',
        'https://www.plantuml.com/plantuml/svg/{data}',
      ],
      options: {
        enum_titles: [
          'Local (PNG) - Need Java and Graphviz',
          'Local (SVG) - Need Java and Graphviz',
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
      defaultValue: 700,
      title: 'T_setting-panel.schema.search.number-limit',
      type: 'number',
      enum: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1300, 1600, 2000],
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
      enum: ['auto', 'increase', 'one', 'off'],
      options: {
        enum_titles: ['Auto', '1. ···, 2. ···, 3. ···', '1. ···, 1. ···, 1. ···', 'Off'],
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
    'editor.wrap-indent': {
      defaultValue: 'same',
      title: 'T_setting-panel.schema.editor.wrap-indent',
      type: 'string',
      enum: ['same', 'indent', 'deepIndent', 'none'],
      options: {
        enum_titles: ['Same', 'Indent', 'Deep Indent', 'None'],
      },
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
    'editor.mouse-wheel-scroll-sensitivity': {
      defaultValue: 1.0,
      title: 'T_setting-panel.schema.editor.mouse-wheel-scroll-sensitivity',
      type: 'number',
      format: 'range',
      minimum: 0.1,
      maximum: 5,
      step: 0.1,
      group: 'editor',
      required: true,
    },
    'editor.rulers': {
      defaultValue: '',
      title: 'T_setting-panel.schema.editor.rulers',
      type: 'string',
      group: 'editor',
      options: {
        inputAttributes: { placeholder: 'e.g., 80,120' }
      },
    },
    'editor.font-ligatures': {
      defaultValue: false,
      title: 'T_setting-panel.schema.editor.font-ligatures',
      type: 'boolean',
      format: 'checkbox',
      group: 'editor',
      required: true,
    },
    'editor.mouse-wheel-zoom': {
      defaultValue: false,
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
    'editor.quick-suggestions': {
      defaultValue: false,
      title: 'T_setting-panel.schema.editor.quick-suggestions',
      type: 'boolean',
      format: 'checkbox',
      group: 'editor',
      required: true,
    },
    'editor.suggest-on-trigger-characters': {
      defaultValue: true,
      title: 'T_setting-panel.schema.editor.suggest-on-trigger-characters',
      type: 'boolean',
      format: 'checkbox',
      group: 'editor',
      required: true,
    },
    'editor.sticky-scroll-enabled': {
      defaultValue: true,
      title: 'T_setting-panel.schema.editor.sticky-scroll-enabled',
      type: 'boolean',
      format: 'checkbox',
      group: 'editor',
      required: true,
    },
    'editor.enable-trigger-suggest-bulb': {
      defaultValue: true,
      title: 'T_setting-panel.schema.editor.enable-trigger-suggest-bulb',
      type: 'boolean',
      format: 'checkbox',
      group: 'editor',
      required: true,
    },
    'editor.enable-ai-copilot-action': {
      defaultValue: true,
      title: 'T_setting-panel.schema.editor.enable-ai-copilot-action',
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
    'render.md-wiki-links': {
      defaultValue: true,
      title: 'T_setting-panel.schema.render.md-wiki-links',
      type: 'boolean',
      format: 'checkbox',
      group: 'render',
      required: true,
    },
    'render.md-hash-tags': {
      defaultValue: true,
      title: 'T_setting-panel.schema.render.md-hash-tags',
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
    'render.multimd-multiline': {
      defaultValue: true,
      title: 'T_setting-panel.schema.render.multimd-multiline',
      type: 'boolean',
      format: 'checkbox',
      group: 'render',
      required: true,
      needReloadWindowWhenChanged: true,
    },
    'render.multimd-rowspan': {
      defaultValue: false,
      title: 'T_setting-panel.schema.render.multimd-rowspan',
      type: 'boolean',
      format: 'checkbox',
      group: 'render',
      required: true,
      needReloadWindowWhenChanged: true,
    },
    'render.multimd-headerless': {
      defaultValue: false,
      title: 'T_setting-panel.schema.render.multimd-headerless',
      type: 'boolean',
      format: 'checkbox',
      group: 'render',
      required: true,
      needReloadWindowWhenChanged: true,
    },
    'render.multimd-multibody': {
      defaultValue: false,
      title: 'T_setting-panel.schema.render.multimd-multibody',
      type: 'boolean',
      format: 'checkbox',
      group: 'render',
      required: true,
      needReloadWindowWhenChanged: true,
    },
    'render.extra-css-style': {
      defaultValue: '.markdown-view .markdown-body a {\n  /* color: red; */\n}',
      title: 'T_setting-panel.schema.render.extra-css-style',
      type: 'string',
      group: 'render',
      format: 'textarea',
      options: {
        inputAttributes: { placeholder: 'e.g., .markdown-view .markdown-body a { color: red; }', style: 'height: 8em' }
      },
    },
    shell: {
      defaultValue: '',
      title: 'T_setting-panel.schema.shell',
      type: 'string',
      group: 'other',
    },
    'server.host': {
      defaultValue: '127.0.0.1',
      title: 'T_setting-panel.schema.server.host',
      type: 'string',
      enum: ['127.0.0.1', '0.0.0.0'],
      group: 'other',
      required: true,
    },
    'server.port': {
      defaultValue: 3044,
      title: 'T_setting-panel.schema.server.port',
      description: 'T_setting-panel.schema.server.port-desc',
      type: 'integer',
      format: 'number',
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
      title: 'T_setting-panel.schema.keep-running-after-closing-window',
      type: 'boolean',
      group: 'other',
      format: 'checkbox',
      required: true,
    },
    'hide-main-window-on-startup': {
      defaultValue: false,
      title: 'T_setting-panel.schema.hide-main-window-on-startup',
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
        inputAttributes: { placeholder: 'e.g. 127.0.0.1:8080', }
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
  } as Partial<SettingSchema['properties']> as any,
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

export function getDefaultSettingSchema (): SettingSchema {
  return cloneDeep(schema)
}
