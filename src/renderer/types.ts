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

export type BuildInHookTypes = {
  ON_STARTUP: [],
  ON_EDITOR_PASTE_IMAGE: [File],
  ON_VIEW_ELEMENT_CLICK: [MouseEvent],
  ON_VIEW_ELEMENT_DBCLICK: [MouseEvent],
  ON_VIEW_KEY_DOWN: [KeyboardEvent, HTMLElement | null ],
  ON_VIEW_SCROLL: [WheelEvent],
  ON_VIEW_RENDER: [{ getViewDom: ()=> HTMLElement | null }],
  ON_VIEW_RENDERED: [{ getViewDom: ()=> HTMLElement | null }],
  ON_VIEW_MOUNTED: [{ getViewDom: ()=> HTMLElement | null }],
  ON_VIEW_FILE_CHANGE: [{ getViewDom: ()=> HTMLElement | null }],
  ON_TREE_NODE_SELECT: [Components.Tree.Node],
  ON_DOC_BEFORE_EXPORT: [],
}

export type BuildInActions = {
  'view.refresh': () => void,
  'view.reveal-line': (line: number) => void,
  'view.scroll-top-to': (top: number) => void,
  'view.get-content-html': () => string,
  'view.enter-presentation': () => void,
  'view.exit-presentation': () => void,
  'layout.toggle-view': (visible?: boolean) => void,
  'layout.toggle-side': (visible?: boolean) => void,
  'layout.toggle-xterm': (visible?: boolean) => void,
  'layout.toggle-editor': (visible?: boolean) => void,
  'status-bar.refresh-menu': () => void,
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
  'plugin.transform-img-link.all': () => void,
  'plugin.switch-todo.switch': (line?: number, checked?: boolean) => void,
}

export type BuildInActionName = keyof BuildInActions

export type FrontMatterAttrs = {
  'headingNumber'?: boolean
}
