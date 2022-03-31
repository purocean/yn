import customStyles from '@fe/plugins/custom-styles'
import electronZoom from '@fe/plugins/electron-zoom'
import documentHistoryStack from '@fe/plugins/document-history-stack'
import fileTreeContextMenu from '@fe/plugins/file-tree-context-menu'
import statusBarSetting from '@fe/plugins/status-bar-setting'
import statusBarRepositorySwitch from '@fe/plugins/status-bar-repository-switch'
import statusBarView from '@fe/plugins/status-bar-view'
import statusBarNavigation from '@fe/plugins/status-bar-navigation'
import statusBarInsert from '@fe/plugins/status-bar-insert'
import statusBarTool from '@fe/plugins/status-bar-tool'
import statusBarHelp from '@fe/plugins/status-bar-help'
import statusBarHistory from './plugins/status-bar-history'
import statusBarPresentation from '@fe/plugins/status-bar-presentation'
import statusBarControlCenter from '@fe/plugins/status-bar-control-center'
import statusBarTerminal from '@fe/plugins/status-bar-terminal'
import statusBarGet from '@fe/plugins/status-bar-get'
import editorPaste from '@fe/plugins/editor-paste'
import editorAttachment from '@fe/plugins/editor-attachment'
import editorMarkdown from '@fe/plugins/editor-markdown'
import editorMdSyntax from '@fe/plugins/editor-md-syntax'
import editorWords from '@fe/plugins/editor-words'
import editorEmoji from '@fe/plugins/editor-emoji'
import editorPathCompletion from '@fe/plugins/editor-path-completion'
import copyText from '@fe/plugins/copy-text'
import switchTodo from '@fe/plugins/switch-todo'
import imageViewer from '@fe/plugins/image-viewer'
import markdownHtml from '@fe/plugins/markdown-html'
import markdownRenderVnode from '@fe/plugins/markdown-render-vnode'
import markdownMacro from '@fe/plugins/markdown-macro'
import markdownFrontMatter from '@fe/plugins/markdown-front-matter'
import markdownImsize from '@fe/plugins/markdown-imsize'
import markdownToc from '@fe/plugins/markdown-toc'
import markdownCodeWrap from '@fe/plugins/markdown-code-wrap'
import markdownCodeHighlight from '@fe/plugins/markdown-code-highlight'
import markdownLink from '@fe/plugins/markdown-link'
import markdownTable from '@fe/plugins/markdown-table'
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
import markdownContainer from '@fe/plugins/markdown-container'
import markdownHeadingNumber from '@fe/plugins/markdown-heading-number'
import syncScroll from '@fe/plugins/sync-scroll'
import imageLocalization from '@fe/plugins/image-localization'
import imageHostingPicgo from '@fe/plugins/image-hosting-picgo'
import copyContent from '@fe/plugins/copy-content'
import sharePreview from '@fe/plugins/share-preview'

export default [
  customStyles,
  electronZoom,
  documentHistoryStack,
  fileTreeContextMenu,
  statusBarSetting,
  statusBarRepositorySwitch,
  statusBarView,
  statusBarNavigation,
  statusBarInsert,
  statusBarTool,
  statusBarHelp,
  statusBarHistory,
  statusBarTerminal,
  statusBarControlCenter,
  statusBarPresentation,
  statusBarGet,
  editorPaste,
  editorAttachment,
  editorMarkdown,
  editorMdSyntax,
  editorEmoji,
  editorWords,
  editorPathCompletion,
  copyText,
  switchTodo,
  imageViewer,
  markdownHtml,
  markdownRenderVnode,
  markdownMacro,
  markdownFrontMatter,
  markdownImsize,
  markdownToc,
  markdownCodeWrap,
  markdownCodeHighlight,
  markdownLink,
  markdownTable,
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
  markdownContainer,
  markdownHeadingNumber,
  syncScroll,
  imageLocalization,
  imageHostingPicgo,
  copyContent,
  sharePreview,
]
