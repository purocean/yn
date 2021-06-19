declare module '*.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, any>
  export default component
}

declare module 'markdown-it-task-lists'
declare module 'markdown-it-attrs'
declare module 'markdown-it-multimd-table'
declare module 'markdown-it-footnote'
declare module 'markdown-it-katex'
declare module '@json-editor/json-editor'
declare module 'mermaid/dist/mermaid.js'
