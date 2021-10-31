declare module '*.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, any>
  export default component
}

declare interface Window {
  ctx: any;
  globalBus: any;
  registerPlugin: any;
  documentSaved: boolean;
  monaco: any;
}

declare module 'markdown-it-container'
declare module 'markdown-it-task-lists'
declare module 'markdown-it-attrs'
declare module 'markdown-it-multimd-table'
declare module 'markdown-it-katex'
declare module '@json-editor/json-editor'
declare module 'mermaid/dist/mermaid.js'
declare module 'katex'
declare module 'luckyexcel'
declare module 'xterm-theme'
declare module 'path-browserify' {
  import path from 'path'
  export default path
}
