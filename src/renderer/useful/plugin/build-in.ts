import statusBarSetting from '@fe/plugins/status-bar-setting'
import statusBarRepositorySwitch from '@fe/plugins/status-bar-repository-switch'
import statusBarView from '@fe/plugins/status-bar-view'
import statusBarHelp from '@fe/plugins/status-bar-help'
import statusBarRefresh from '@fe/plugins/status-bar-refresh'
import statusBarGet from '@fe/plugins/status-bar-get'
import markdownHtml from '@/renderer/plugins/markdown-html'
import markdownRenderVnode from '@/renderer/plugins/markdown-render-vnode'
import markdownSourceLine from '@fe/plugins/markdown-source-line'
import markdownToc from '@fe/plugins/markdown-toc'
import markdownCode from '@fe/plugins/markdown-code'
import markdownLink from '@fe/plugins/markdown-link'
import markdownTaskList from '@fe/plugins/markdown-task-list'
import markdownFootnote from '@/renderer/plugins/markdown-footnote'
import transformImgOutLink from '@fe/plugins/transform-img-out-link'
import markdownItKatex from '@/renderer/plugins/markdown-it-katex'
import copyText from '@fe/plugins/copy-text'
import tableCellEdit from '@fe/plugins/table-cell-edit'
import switchTodo from '@fe/plugins/switch-todo'
import runCode from '@fe/plugins/run-code'
import plantuml from '@fe/plugins/plantuml'
import drawio from '@fe/plugins/drawio'
import mindMap from '@fe/plugins/mind-map'
import mermaid from '@fe/plugins/mermaid'
import applet from '@fe/plugins/applet'
import echarts from '@fe/plugins/echarts'

export default [
  statusBarSetting,
  statusBarRepositorySwitch,
  statusBarView,
  statusBarHelp,
  statusBarRefresh,
  statusBarGet,
  markdownHtml,
  markdownRenderVnode,
  markdownSourceLine,
  markdownToc,
  markdownCode,
  markdownLink,
  markdownTaskList,
  markdownFootnote,
  markdownItKatex,
  transformImgOutLink,
  copyText,
  tableCellEdit,
  switchTodo,
  runCode,
  plantuml,
  drawio,
  mindMap,
  mermaid,
  applet,
  echarts,
]
