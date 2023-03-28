import type { Language } from '@share/i18n'
import type MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token'
import type * as Monaco from 'monaco-editor'

export interface PathItem {
  repo: string;
  path: string;
}

export interface FileItem extends PathItem { name: string }

export interface FileStat {
  mtime: number,
  birthtime: number,
  size: number,
}

export interface Doc extends PathItem {
  type: 'file' | 'dir';
  name: string;
  content?: string;
  title?: string;
  passwordHash?: string;
  contentHash?: string;
  stat?: FileStat,
  status?: 'loaded' | 'save-failed' | 'saved';
  absolutePath?: string,
  plain?: boolean;
}

export interface Repo {
  name: string;
  path: string;
}

export namespace Components {
  export namespace Modal {
    interface BaseParams {
      title?: string;
      content?: string;
      okText?: string;
      cancelText?: string;
      modalWidth?: string;
    }

    export interface ConfirmModalParams extends BaseParams {
      component?: any;
      action?: any;
    }

    export interface AlertModalParams extends BaseParams {
      component?: any;
      action?: any;
    }

    export interface InputModalParams extends BaseParams {
      type?: string;
      value?: string;
      hint?: string;
      readonly?: boolean;
      select?: boolean | [number, number, 'forward' | 'backward' | 'none'];
    }
  }

  export namespace Toast {
    export type ToastType = 'warning' | 'info'
  }

  export namespace ContextMenu {
    export type ShowOpts = { mouseX?: number | ((x: number) => number), mouseY?: number | ((y: number) => number) }
    export type SeparatorItem = { type: 'separator', hidden?: boolean; }

    export type NormalItem = {
      type?: 'normal';
      id: string;
      label: string;
      hidden?: boolean;
      checked?: boolean;
      onClick: (item?: NormalItem) => void;
    }

    export type Item = SeparatorItem | NormalItem
  }

  export namespace Tabs {
    export interface Item {
      key: string;
      label: string;
      description?: string;
      payload: any;
      fixed?: boolean;
      temporary?: boolean;
    }

    export type ActionBtn = {
      type: 'normal',
      key?: string | number,
      icon: string,
      title: string,
      order?: number,
      hidden?: boolean,
      style?: string,
      onClick: (e: MouseEvent) => void,
    }
    | { type: 'separator', order?: number, hidden?: boolean }
    | { type: 'custom', key?: string | number, hidden?: boolean, component: any, order?: number }
  }

  export namespace FileTabs {
    export interface Item extends Tabs.Item {
      payload: {
        file: Doc | null;
      };
    }
  }

  export namespace Tree {
    export interface Node extends Pick<Doc, 'type' | 'name' | 'path' | 'repo'> {
      mtime?: number;
      birthtime?: number;
      marked?: boolean;
      children?: Node[];
      level: number;
    }
  }

  export namespace QuickFilter {
    export interface Item {
      label: string,
      key: string,
    }

    export interface Props {
      filterInputHidden?: boolean;
      top?: string | undefined;
      right?: string | undefined;
      bottom?: string | undefined;
      left?: string | undefined;
      placeholder?: string | undefined;
      current?: string | undefined;
      list: Item[];
    }
  }

  export namespace ControlCenter {
    export type Item = {
      type: 'btn',
      flat?: boolean,
      checked?: boolean,
      disabled?: boolean,
      icon: string,
      title: string,
      onClick?: () => void,
      showInActionBar?: boolean,
    }

    export type SchemaItem = { items: Item[] }
    export type Schema = {
      [category: string]: SchemaItem | undefined
    } & {
      switch: SchemaItem,
      navigation: SchemaItem,
    }

    export type SchemaTapper = (schema: Schema) => void
  }
}

export type FileSort = { by: 'mtime' | 'birthtime' | 'name' | 'serial', order: 'asc' | 'desc' }

export type ThemeName = 'system' | 'dark' | 'light'
export type LanguageName = 'system' | Language
export type ExportType = 'print' | 'pdf' | 'docx' | 'html' | 'rst' | 'adoc'
export type SettingGroup = 'repos' | 'appearance' | 'editor' | 'image' | 'proxy' | 'other' | 'macros' | 'render'
export type RegistryHostname = 'registry.npmjs.org' | 'registry.npmmirror.com'

export type PrintOpts = {
  landscape?: boolean,
  pageSize?: string,
  scaleFactor?: number,
  printBackground?: boolean,
}

export type ConvertOpts = {
  fromType: 'markdown' | 'html',
  toType: 'docx' | 'html' | 'rst' | 'adoc',
  fromHtmlOptions?: {
    inlineLocalImage: boolean,
    uploadLocalImage: boolean,
    inlineStyle: boolean,
    includeStyle: boolean,
    highlightCode: boolean,
  }
}

export type RenderEnv = {
  source: string,
  file: Doc | null,
  renderCount: number,
  attributes?: Record<string, any>,
  tokens: Token[]
}

export type ExtensionCompatible = { value: boolean, reason: string }
export type ExtensionLoadStatus = { version?: string, themes: boolean, plugin: boolean, style: boolean, activationTime: number }
export type FindInRepositoryQuery = {
  pattern?: string,
  caseSensitive?: boolean,
  wholeWord?: boolean,
  regExp?: boolean,
  include?: string,
  exclude?: string,
}

export interface Extension {
  id: string;
  displayName: string;
  description: string;
  icon: string;
  readmeUrl: string;
  changelogUrl: string;
  homepage: string;
  license: string;
  author: {
    name: string;
    email?: string;
    url?: string;
  };
  version: string;
  themes: { name: string; css: string }[];
  requirements: { premium?: boolean, terminal?: boolean };
  compatible: ExtensionCompatible;
  main: string;
  style: string;
  enabled?: boolean;
  installed: boolean;
  origin: 'official' | 'registry' | 'unknown';
  dist: { tarball: string, unpackedSize: number };
  isDev?: boolean;
}

export interface BuildInSettings {
  'repos': Repo[],
  'macros': { match: string, replace: string }[],
  'theme': ThemeName,
  'language': LanguageName,
  'auto-save': number,
  'custom-css': string,
  'assets-dir': string,
  'shell': string,
  'envs': string,
  'editor.mouse-wheel-zoom': boolean,
  'editor.font-size': number,
  'editor.tab-size': 2 | 4,
  'editor.ordered-list-completion': 'auto' | 'increase' | 'one',
  'editor.minimap': boolean,
  'editor.line-numbers': 'on' | 'off' | 'relative' | 'interval',
  'editor.enable-preview': boolean,
  'editor.font-family': string,
  'editor.complete-emoji': boolean,
  'render.md-html': boolean,
  'render.md-breaks': boolean,
  'render.md-linkify': boolean,
  'render.md-typographer': boolean,
  'render.md-emoji': boolean,
  'render.md-sub': boolean,
  'render.md-sup': boolean,
  'assets.path-type': 'relative' | 'absolute' | 'auto',
  'plugin.image-hosting-picgo.server-url': string,
  'plugin.image-hosting-picgo.enable-paste-image': boolean,
  'license': string,
  'mark': FileItem[],
  'updater.source': 'github.com' | 'ghproxy.com',
  'doc-history.number-limit': number,
  'search.number-limit': number,
  'server.host': string,
  'server.port': number,
  'tree.exclude': string,
  'proxy.enabled': boolean,
  'proxy.server': string,
  'proxy.pac-url': string,
  'proxy.bypass-list': string,
  'extension.registry': RegistryHostname,
  'extension.auto-upgrade': boolean,
  'keep-running-after-closing-window': boolean,
  'plantuml-api': string,
}

export type BuildInActions = {
  'view.render-immediately': () => void,
  'view.render': () => void,
  'view.refresh': () => void,
  'view.reveal-line': (startLine: number) => Promise<HTMLElement | null>,
  'view.get-content-html': (selected?: boolean) => string,
  'view.get-view-dom': () => HTMLElement | null,
  'view.get-render-env': () => RenderEnv | null,
  'view.enter-presentation': () => void,
  'view.exit-presentation': () => void,
  'doc.show-history': (doc?: Doc) => void
  'doc.hide-history': () => void,
  'extension.show-manager': (id?: string) => void,
  'layout.toggle-view': (visible?: boolean) => void,
  'layout.toggle-side': (visible?: boolean) => void,
  'layout.toggle-xterm': (visible?: boolean) => void,
  'layout.toggle-editor': (visible?: boolean) => void,
  'control-center.toggle': (visible?: boolean) => void,
  'status-bar.refresh-menu': () => void,
  'control-center.refresh': () => void,
  'tree.refresh': () => void,
  'tree.reveal-current-node': () => void,
  'editor.toggle-wrap': () => void,
  'editor.refresh-custom-editor': () => void,
  'editor.trigger-save': () => void,
  'filter.show-quick-open': () => void,
  'filter.choose-document': () => Promise<Doc>,
  'file-tabs.switch-left': () => void,
  'file-tabs.switch-right': () => void,
  'file-tabs.close-current': () => void,
  'file-tabs.search-tabs': () => void,
  'file-tabs.refresh-action-btns': () => void,
  'xterm.run': (cmd: { code: string, start: string, exit?: string } | string) => void,
  'xterm.init': (opts?: { cwd?: string }) => void,
  'plugin.document-history-stack.back': () => void,
  'plugin.document-history-stack.forward': () => void,
  'plugin.image-hosting-picgo.upload': (file: File) => Promise<string | undefined>,
  'plugin.status-bar-help.show-readme': () => void,
  'plugin.status-bar-help.show-features': () => void,
  'plugin.status-bar-help.show-shortcuts': () => void,
  'plugin.status-bar-help.show-plugin': () => void,
  'plugin.image-localization.all': () => void,
  'plugin.switch-todo.switch': (line?: number, checked?: boolean) => void,
  'plugin.electron-zoom.zoom-in': () => void,
  'plugin.electron-zoom.zoom-out': () => void,
  'plugin.electron-zoom.zoom-reset': () => void,
  'premium.show': () => void,
  'base.find-in-repository': (query?: FindInRepositoryQuery) => void,
  'workbench.toggle-outline': (visible?: boolean) => void,
}

export type BuildInActionName = keyof BuildInActions

export type BuildInHookTypes = {
  STARTUP: never,
  GLOBAL_RESIZE: never,
  GLOBAL_KEYDOWN: KeyboardEvent,
  GLOBAL_KEYUP: KeyboardEvent,
  ACTION_BEFORE_RUN: { name: string },
  ACTION_AFTER_RUN: { name: string }
  THEME_CHANGE: { name: ThemeName },
  EDITOR_PASTE_IMAGE: { file: File },
  MARKDOWN_BEFORE_RENDER: { src: string, env: RenderEnv, md: MarkdownIt },
  VIEW_ELEMENT_CLICK: { e: MouseEvent, view: HTMLElement },
  VIEW_ELEMENT_DBCLICK: { e: MouseEvent, view: HTMLElement },
  VIEW_KEY_DOWN: { e: KeyboardEvent, view: HTMLElement },
  VIEW_SCROLL: { e: Event },
  VIEW_RENDER: never,
  VIEW_RENDERED: never,
  VIEW_MOUNTED: never,
  VIEW_FILE_CHANGE: never,
  VIEW_BEFORE_REFRESH: never,
  VIEW_AFTER_REFRESH: never,
  VIEW_PREVIEWER_CHANGE: { type: 'register' | 'remove' | 'switch' },
  VIEW_RENDER_IFRAME_READY: { iframe: HTMLIFrameElement },
  EXPORT_BEFORE_PREPARE: { type: ExportType },
  EXPORT_AFTER_PREPARE: { type: ExportType },
  VIEW_ON_GET_HTML_FILTER_NODE: {
    node: HTMLElement,
    options: {
      inlineStyle?: boolean,
      includeStyle?: boolean,
      inlineLocalImage?: boolean,
      uploadLocalImage?: boolean,
      highlightCode?: boolean,
      preferPng?: boolean,
      onlySelected?: boolean,
      nodeProcessor?: (node: HTMLElement) => void,
    }
  },
  TREE_NODE_SELECT: { node: Components.Tree.Node },
  TREE_NODE_DBLCLICK: { node: Components.Tree.Node },
  MONACO_CHANGE_VALUE : { uri: string, value: string },
  MONACO_BEFORE_INIT: { monaco: typeof Monaco },
  MONACO_READY: { editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco },
  EDITOR_READY: { editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco },
  EDITOR_CUSTOM_EDITOR_CHANGE: { type: 'register' | 'remove' | 'switch' },
  EDITOR_CURRENT_EDITOR_CHANGE: { current?: CustomEditor | null },
  EDITOR_CHANGE: { uri: string, value: string },
  DOC_CREATED: { doc: Doc },
  DOC_DELETED: { doc: Doc },
  DOC_MOVED: { oldDoc: Doc, newDoc: Doc },
  DOC_BEFORE_SAVE: { doc: Doc, content: string },
  DOC_SAVED: { doc: Doc },
  DOC_BEFORE_SWITCH: { doc?: Doc | null },
  DOC_SWITCHING: { doc?: Doc | null },
  DOC_SWITCHED: { doc: Doc | null },
  DOC_SWITCH_FAILED: { doc?: Doc | null, message: string },
  DOC_CHANGED: { doc: Doc },
  I18N_CHANGE_LANGUAGE: { lang: LanguageName, currentLang: Language },
  SETTING_PANEL_BEFORE_SHOW: {},
  SETTING_CHANGED: { changedKeys: (keyof BuildInSettings)[], oldSettings: BuildInSettings, settings: BuildInSettings }
  SETTING_FETCHED: { settings: BuildInSettings, oldSettings: BuildInSettings },
  SETTING_BEFORE_WRITE: { settings: Partial<BuildInSettings> },
  EXTENSION_READY: { extensions: Extension[] },
  CODE_RUNNER_CHANGE: { type: 'register' | 'remove' },
  PLUGIN_HOOK: {
    plugin: 'markdown-katex',
    type: 'before-render',
    payload: { latex: string, options: any }
  },
}

export type Previewer = {
  name: string,
  displayName?: string,
  component: any,
}

export type CustomEditorCtx = {
  doc?: Doc | null,
}

export type CustomEditor = {
  name: string,
  displayName: string,
  hiddenPreview?: boolean,
  when: (ctx: CustomEditorCtx) => boolean | Promise<boolean>,
  component: any,
}

export interface CodeRunner {
  name: string;
  order?: number;
  match: (language: string, magicComment: string) => boolean;
  getTerminalCmd: (language: string, magicComment: string) => {
    start: string,
    exit: string,
  } | null;
  run: (language: string, code: string) => Promise<{
    type: 'html' | 'plain',
    value: ReadableStreamDefaultReader | string,
  }>;
}

export type BuildInIOCTypes = { [key in keyof BuildInHookTypes]: any; } & {
  TABS_ACTION_BTN_TAPPERS: (btns: Components.Tabs.ActionBtn[]) => void;
  STATUS_BAR_MENU_TAPPERS: any;
  CONTROL_CENTER_SCHEMA_TAPPERS: any;
  EDITOR_SIMPLE_COMPLETION_ITEM_TAPPERS: any;
  EDITOR_MARKDOWN_MONARCH_LANGUAGE_TAPPERS: any;
  THEME_STYLES: any;
  VIEW_PREVIEWER: Previewer;
  EDITOR_CUSTOM_EDITOR: CustomEditor,
  CODE_RUNNER: CodeRunner;
}

export type FrontMatterAttrs = {
  headingNumber?: boolean,
  wrapCode?: boolean,
  enableMacro?: boolean,
  define?: Record<string, boolean>,
  mdOptions?: Record<string, boolean>,
  defaultPreviewer?: string,
}
