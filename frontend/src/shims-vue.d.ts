declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare global {
  interface Window {
    documentSaved: boolean;
    runInXterm: Function;
  }
}

declare module 'markdown-it-task-lists'
declare module 'markdown-it-attrs'
declare module 'markdown-it-multimd-table'
declare module 'markdown-it-footnote'
declare module 'markdown-it-katex'
declare module '@json-editor/json-editor'
