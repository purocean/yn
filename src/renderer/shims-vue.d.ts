declare module '*.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, any>
  export default component
}

declare module 'markdown-it-sub'
declare module 'markdown-it-sup'
declare module 'markdown-it-mark'
declare module 'markdown-it-abbr'
declare module 'markdown-it-container'
declare module 'markdown-it-task-lists'
declare module 'markdown-it-attrs'
declare module 'markdown-it-multimd-table'
declare module 'markdown-it-katex'
declare module '@json-editor/json-editor'
declare module 'mermaid/dist/mermaid.js'
declare module 'filenamify/browser'
declare module 'katex'
declare module 'luckyexcel'
declare module 'xterm-theme'
declare module 'path-browserify' {
  import path from 'path'
  export default path
}

declare interface Window {
  ctx: any;
  embedCtx: any;
  registerPlugin: any;
  documentSaved: boolean;
  monaco: any;
  kityminder: any;
  kityminderM: any;
  kityM: any;
  _INIT_SETTINGS: any;
}

declare const __APP_VERSION__: string
