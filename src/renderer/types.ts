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
}

export interface Repo {
  name: string;
  path: string;
}

export namespace Components {
  export namespace Modal {
    export type ConfirmModalParams = { title?: string; content?: string }

    export type InputModalParams = {
      type?: string;
      title?: string;
      content?: string;
      value?: string;
      hint?: string;
      modalWidth?: string;
      select?: boolean | [number, number, 'forward' | 'backward' | 'none'];
    }
  }

  export namespace Toast {
    export type ToastType = 'warning' | 'info'
  }

  export namespace ContextMenu {
    export type SeparatorItem = { type: 'separator' }

    export type NormalItem = {
      type?: 'normal';
      id: string;
      label: string;
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
    }
  }
}

export type ThemeName = 'system' | 'dark' | 'light'

export type BuildInEvents = {
  'global.resize': never,
  'theme.change': ThemeName,
  'monaco.change-value': { uri: string, value: string },
  'monaco.before-init': { monaco: typeof Monaco },
  'monaco.ready': { editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco },
  'editor.ready': { editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco },
  'editor.change': { uri: string, value: string },
  'doc.created': Doc,
  'doc.deleted': Doc,
  'doc.moved': { oldDoc: Doc, newDoc: Doc },
  'doc.saved': Doc,
  'doc.switched': Doc | null,
  'doc.switch-failed': { doc?: Doc | null, message: string },
  'doc.changed': Doc,
}

export type BuildInSettings = {
  'repos': { name: string, path: string }[],
  'theme': ThemeName,
  'assets-dir': string,
  'shell': string,
  'plugin.image-hosting-picgo.server-url': string,
  'plugin.image-hosting-picgo.enable-paste-image': boolean
}

export type HookType = 'ON_STARTUP'
  | 'ON_EDITOR_PASTE_IMAGE'
  | 'ON_VIEW_ELEMENT_CLICK'
  | 'ON_VIEW_ELEMENT_DBCLICK'
  | 'ON_VIEW_KEY_DOWN'
  | 'ON_VIEW_SCROLL'
  | 'ON_VIEW_RENDER'
  | 'ON_VIEW_RENDERED'
  | 'ON_VIEW_MOUNTED'
  | 'ON_VIEW_FILE_CHANGE'
  | 'ON_TREE_NODE_SELECT'
  | 'ON_DOC_BEFORE_EXPORT'

export type BuildInActionName = 'view.refresh'
  | 'view.reveal-line'
  | 'view.scroll-top-to'
  | 'view.get-content-html'
  | 'view.enter-presentation'
  | 'view.exit-presentation'
  | 'layout.toggle-view'
  | 'layout.toggle-side'
  | 'layout.toggle-xterm'
  | 'layout.toggle-editor'
  | 'status-bar.refresh-menu'
  | 'tree.refresh'
  | 'editor.toggle-wrap'
  | 'filter.show-quick-open'
  | 'filter.choose-document'
  | 'file-tabs.switch-left'
  | 'file-tabs.switch-right'
  | 'file-tabs.switch-next'
  | 'xterm.run-code'
  | 'xterm.run'
  | 'xterm.init'
  | 'plugin.document-history-stack.back'
  | 'plugin.document-history-stack.forward'
  | 'plugin.image-hosting-picgo.upload'
  | 'plugin.status-bar-help.show-readme'
  | 'plugin.status-bar-help.show-features'
  | 'plugin.status-bar-help.show-shortcuts'
  | 'plugin.status-bar-help.show-plugin'
  | 'plugin.transform-img-link.all'
  | 'plugin.transform-img-link.single-by-click'
  | 'plugin.switch-todo.switch'
