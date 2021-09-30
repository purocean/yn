import documentHistoryStack from '@fe/plugins/document-history-stack'
import statusBarSetting from '@fe/plugins/status-bar-setting'
import statusBarRepositorySwitch from '@fe/plugins/status-bar-repository-switch'
import statusBarView from '@fe/plugins/status-bar-view'
import statusBarNavigation from '@fe/plugins/status-bar-navigation'
import statusBarTool from '@fe/plugins/status-bar-tool'
import statusBarHelp from '@fe/plugins/status-bar-help'
import statusBarRefresh from '@fe/plugins/status-bar-refresh'
import statusBarPresentation from '@fe/plugins/status-bar-presentation'
import statusBarGet from '@fe/plugins/status-bar-get'
import editorPaste from '@fe/plugins/editor-paste'
import editorAttachment from '@fe/plugins/editor-attachment'
import editorMarkdown from '@fe/plugins/editor-markdown'
import copyText from '@fe/plugins/copy-text'
import transformImgOutLink from '@fe/plugins/transform-img-out-link'
import switchTodo from '@fe/plugins/switch-todo'
import tableCellEdit from '@fe/plugins/table-cell-edit'
import imageViewer from '@fe/plugins/image-viewer'
import markdownHtml from '@fe/plugins/markdown-html'
import markdownRenderVnode from '@fe/plugins/markdown-render-vnode'
import markdownSourceLine from '@fe/plugins/markdown-source-line'
import markdownImsize from '@fe/plugins/markdown-imsize'
import markdownToc from '@fe/plugins/markdown-toc'
import markdownCodeHighlight from '@fe/plugins/markdown-code-highlight'
import markdownLink from '@fe/plugins/markdown-link'
import markdownTaskList from '@fe/plugins/markdown-task-list'
import markdownFootnote from '@fe/plugins/markdown-footnote'
import markdownKatex from '@fe/plugins/markdown-katex'
import markdownCodeCopy from '@fe/plugins/markdown-code-copy'
import markdownCodeRun from '@fe/plugins/markdown-code-run'
import markdownPlantuml from '@fe/plugins/markdown-plantuml'
import markdownDrawio from '@fe/plugins/markdown-drawio'
import markdownMindMap from '@fe/plugins/markdown-mind-map'
import markdownMermaid from '@fe/plugins/markdown-mermaid'
import markdownApplet from '@fe/plugins/markdown-applet'
import markdownEcharts from '@fe/plugins/markdown-echarts'
import markdownLuckysheet from '@fe/plugins/markdown-luckysheet'
import syncScroll from '@fe/plugins/sync-scroll'

export default [
  documentHistoryStack,
  statusBarSetting,
  statusBarRepositorySwitch,
  statusBarView,
  statusBarNavigation,
  statusBarTool,
  statusBarHelp,
  statusBarRefresh,
  statusBarPresentation,
  statusBarGet,
  transformImgOutLink,
  editorPaste,
  editorAttachment,
  editorMarkdown,
  copyText,
  tableCellEdit,
  switchTodo,
  imageViewer,
  markdownHtml,
  markdownRenderVnode,
  markdownSourceLine,
  markdownImsize,
  markdownToc,
  markdownCodeHighlight,
  markdownLink,
  markdownTaskList,
  markdownFootnote,
  markdownKatex,
  markdownCodeCopy,
  markdownCodeRun,
  markdownPlantuml,
  markdownDrawio,
  markdownMindMap,
  markdownMermaid,
  markdownApplet,
  markdownEcharts,
  markdownLuckysheet,
  syncScroll,
]
