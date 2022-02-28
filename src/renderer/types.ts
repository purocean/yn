import type { Language } from '@share/i18n'
import type * as Monaco from 'monaco-editor'

export interface PathItem {
  repo: string;
  path: string;
}

export interface FileItem extends PathItem { name: string }

export interface Doc extends PathItem {
  type: 'file' | 'dir';
  name: string;
  content?: string;
  title?: string;
  passwordHash?: string;
  contentHash?: string;
  status?: 'loaded' | 'save-failed' | 'saved';
  absolutePath?: string,
}

export interface Repo {
  name: string;
  path: string;
}

export namespace Components {
  export namespace Modal {
    export type ConfirmModalParams = { title?: string; content?: string; component?: any }
    export type AlertModalParams = { title?: string; content?: string; component?: any }

    export type InputModalParams = {
      type?: string;
      title?: string;
      content?: string;
      value?: string;
      hint?: string;
      modalWidth?: string;
      readonly?: boolean;
      select?: boolean | [number, number, 'forward' | 'backward' | 'none'];
    }
  }

  export namespace Toast {
    export type ToastType = 'warning' | 'info'
  }

  export namespace ContextMenu {
    export type SeparatorItem = { type: 'separator', hidden?: boolean; }

    export type NormalItem = {
      type?: 'normal';
      id: string;
      label: string;
      hidden?: boolean;
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
    }
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
}

export type ThemeName = 'system' | 'dark' | 'light'
export type LanguageName = 'system' | Language
export type ExportTypes = 'pdf' | 'docx' | 'html' | 'rst' | 'adoc'

export type RenderEnv = { source: string, file: Doc | null, renderCount: number, attributes?: Record<string, any> }

export type BuildInSettings = {
  'repos': Repo[],
  'theme': ThemeName,
  'language': LanguageName,
  'custom-css': string,
  'assets-dir': string,
  'shell': string,
  'editor.mouse-wheel-zoom': boolean,
  'editor.font-size': number,
  'editor.tab-size': 2 | 4,
  'editor.ordered-list-completion': 'auto' | 'increase' | 'one',
  'plugin.image-hosting-picgo.server-url': string,
  'plugin.image-hosting-picgo.enable-paste-image': boolean,
  'license': string,
  'mark': FileItem[],
  'updater.source': 'github.com' | 'ghproxy.com' | 'mirror.ghproxy.com',
  'doc-history.number-limit': number,
  'server.host': string,
  'server.port': number,
  'keep-running-after-closing-window': boolean,
}

export type BuildInActions = {
  'view.render-immediately': () => void,
  'view.render': () => void,
  'view.refresh': () => void,
  'view.reveal-line': (startLine: number) => void,
  'view.scroll-top-to': (top: number) => void,
  'view.get-content-html': () => string,
  'view.get-view-dom': () => HTMLElement | null,
  'view.get-render-env': () => RenderEnv | null,
  'view.enter-presentation': () => void,
  'view.exit-presentation': () => void,
  'doc.show-history': (doc?: Doc) => void
  'doc.hide-history': () => void,
  'layout.toggle-view': (visible?: boolean) => void,
  'layout.toggle-side': (visible?: boolean) => void,
  'layout.toggle-xterm': (visible?: boolean) => void,
  'layout.toggle-editor': (visible?: boolean) => void,
  'control-center.toggle': (visible?: boolean) => void,
  'status-bar.refresh-menu': () => void,
  'control-center.refresh': () => void,
  'tree.refresh': () => void,
  'editor.toggle-wrap': () => void,
  'filter.show-quick-open': () => void,
  'filter.choose-document': () => Promise<Doc>,
  'file-tabs.switch-left': () => void,
  'file-tabs.switch-right': () => void,
  'file-tabs.switch-next': () => void,
  'xterm.run-code': (language: string, code: string, exit: boolean) => void,
  'xterm.run': (code: string) => void,
  'xterm.init': () => void,
  'plugin.document-history-stack.back': () => void,
  'plugin.document-history-stack.forward': () => void,
  'plugin.image-hosting-picgo.upload': (file: File) => void,
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
}

export type BuildInActionName = keyof BuildInActions

export type BuildInHookTypes = {
  STARTUP: never,
  GLOBAL_RESIZE: never,
  ACTION_BEFORE_RUN: { name: string },
  ACTION_AFTER_RUN: { name: string }
  THEME_CHANGE: { name: ThemeName },
  EDITOR_PASTE_IMAGE: { file: File },
  MARKDOWN_BEFORE_RENDER: { src: string, env: RenderEnv }
  VIEW_ELEMENT_CLICK: { e: MouseEvent, view: HTMLElement },
  VIEW_ELEMENT_DBCLICK: { e: MouseEvent, view: HTMLElement },
  VIEW_KEY_DOWN: { e: KeyboardEvent, view: HTMLElement },
  VIEW_SCROLL: { e: WheelEvent },
  VIEW_RENDER: never,
  VIEW_RENDERED: never,
  VIEW_MOUNTED: never,
  VIEW_FILE_CHANGE: never,
  VIEW_BEFORE_REFRESH: never,
  VIEW_AFTER_REFRESH: never,
  VIEW_ON_GET_HTML_FILTER_NODE: {
    node: HTMLElement,
    options: {
      inlineStyle?: boolean,
      inlineLocalImage?: boolean,
      highlightCode?: boolean,
      nodeProcessor?: (node: HTMLElement) => void
    }
  },
  TREE_NODE_SELECT: { node: Components.Tree.Node },
  MONACO_CHANGE_VALUE : { uri: string, value: string },
  MONACO_BEFORE_INIT: { monaco: typeof Monaco },
  MONACO_READY: { editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco },
  EDITOR_READY: { editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco },
  EDITOR_CHANGE: { uri: string, value: string },
  DOC_CREATED: { doc: Doc },
  DOC_DELETED: { doc: Doc },
  DOC_MOVED: { oldDoc: Doc, newDoc: Doc },
  DOC_SAVED: { doc: Doc },
  DOC_SWITCHED: { doc: Doc | null },
  DOC_SWITCH_FAILED: { doc?: Doc | null, message: string },
  DOC_CHANGED: { doc: Doc },
  DOC_BEFORE_EXPORT: { type: ExportTypes },
  I18N_CHANGE_LANGUAGE: { lang: LanguageName, currentLang: Language },
  SETTING_PANEL_BEFORE_SHOW: {},
  SETTING_CHANGED: { changedKeys: (keyof BuildInSettings)[], oldSettings: BuildInSettings, settings: BuildInSettings }
  SETTING_FETCHED: { settings: BuildInSettings, oldSettings: BuildInSettings },
  SETTING_BEFORE_WRITE: { settings: BuildInSettings },
}

export type BuildInIOCTypes = { [key in keyof BuildInHookTypes]: any; } & {
  STATUS_BAR_MENU_TAPPERS: any;
  CONTROL_CENTER_SCHEMA_TAPPERS: any;
}

export type FrontMatterAttrs = {
  headingNumber?: boolean,
  enableMacro?: boolean,
}
