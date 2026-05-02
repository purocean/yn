import type { Plugin } from '@fe/context'
import { DOM_ATTR_NAME } from '@fe/support/args'

type ShowFloatingEditorOptions = {
  line: number
  lineEnd?: number
  clientX?: number
  clientY?: number
}

type DragState =
  | { type: 'move', startY: number, startTop: number }
  | { type: 'resize', startY: number, startHeight: number }

const ACTION_SHOW = 'layout.show-floating-editor'
const ACTION_HIDE = 'layout.hide-floating-editor'
const TITLE_HEIGHT = 30
const RESIZER_HEIGHT = 7
const DEFAULT_HEIGHT = 420
const MIN_HEIGHT = 220
const SCREEN_MARGIN = 8

function clamp (value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default {
  name: 'floating-editor',
  register: (ctx) => {
    let visible = false
    let savedStyle: string | null = null
    let top = SCREEN_MARGIN
    let height = DEFAULT_HEIGHT
    let titleBar: HTMLDivElement | null = null
    let resizer: HTMLDivElement | null = null
    let dragState: DragState | null = null

    function getEditorDom () {
      return ctx.layout.getContainerDom('editor')
    }

    function getPreviewDom () {
      return ctx.layout.getContainerDom('preview')
    }

    function canShowFloatingEditor () {
      const file = ctx.store.state.currentFile

      return ctx.args.MODE === 'normal' &&
        !ctx.args.FLAG_READONLY &&
        ctx.store.state.showView &&
        !ctx.store.state.showEditor &&
        !ctx.store.state.presentation &&
        ctx.store.state.previewer === 'default' &&
        ctx.editor.isDefault() &&
        !!file?.plain &&
        file.writeable !== false &&
        !!getEditorDom() &&
        !!getPreviewDom()
    }

    function relayoutEditor () {
      requestAnimationFrame(() => {
        ctx.editor.getEditor()?.layout()
      })
    }

    function clampFrame () {
      const previewDom = getPreviewDom()
      if (!previewDom) {
        return
      }

      const previewRect = previewDom.getBoundingClientRect()
      const maxHeight = Math.max(MIN_HEIGHT, window.innerHeight - SCREEN_MARGIN * 2)

      height = clamp(height, MIN_HEIGHT, maxHeight)
      top = clamp(top, SCREEN_MARGIN, Math.max(SCREEN_MARGIN, window.innerHeight - height - SCREEN_MARGIN))

      const editorDom = getEditorDom()
      if (!editorDom || !visible) {
        return
      }

      editorDom.style.left = `${Math.round(previewRect.left)}px`
      editorDom.style.top = `${Math.round(top)}px`
      editorDom.style.width = `${Math.round(previewRect.width)}px`
      editorDom.style.height = `${Math.round(height)}px`
    }

    function moveFrame (offset: number) {
      top = clamp(top + offset, SCREEN_MARGIN, Math.max(SCREEN_MARGIN, window.innerHeight - height - SCREEN_MARGIN))
      clampFrame()
      relayoutEditor()
    }

    function makeButton (text: string, title: string, onClick: () => void) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.textContent = text
      btn.title = title
      btn.style.width = '24px'
      btn.style.height = '22px'
      btn.style.padding = '0'
      btn.style.margin = '0'
      btn.style.border = '1px solid var(--g-color-82)'
      btn.style.borderRadius = '3px'
      btn.style.background = 'var(--g-color-96)'
      btn.style.color = 'var(--g-color-20)'
      btn.style.cursor = 'pointer'
      btn.style.lineHeight = '20px'
      btn.style.fontSize = '13px'
      btn.addEventListener('mousedown', e => e.stopPropagation())
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        onClick()
      })
      return btn
    }

    function updateTitle (line: number) {
      if (!titleBar) {
        return
      }

      const title = titleBar.querySelector<HTMLDivElement>('.floating-editor-title')
      if (title) {
        title.textContent = `${ctx.store.state.currentFile?.name || 'Editor'} - L${line}`
      }
    }

    function createControls (line: number) {
      const editorDom = getEditorDom()
      if (!editorDom) {
        return
      }

      titleBar?.remove()
      resizer?.remove()

      titleBar = document.createElement('div')
      titleBar.className = 'floating-editor-titlebar'
      titleBar.style.position = 'absolute'
      titleBar.style.left = '0'
      titleBar.style.right = '0'
      titleBar.style.top = '0'
      titleBar.style.height = `${TITLE_HEIGHT}px`
      titleBar.style.display = 'flex'
      titleBar.style.alignItems = 'center'
      titleBar.style.gap = '6px'
      titleBar.style.boxSizing = 'border-box'
      titleBar.style.padding = '3px 6px 3px 10px'
      titleBar.style.borderBottom = '1px solid var(--g-color-86)'
      titleBar.style.background = 'var(--g-color-96)'
      titleBar.style.color = 'var(--g-color-20)'
      titleBar.style.cursor = 'ns-resize'
      titleBar.style.userSelect = 'none'
      titleBar.style.zIndex = '2'
      titleBar.addEventListener('mousedown', (e) => {
        if (e.button !== 0) {
          return
        }

        e.preventDefault()
        dragState = { type: 'move', startY: e.clientY, startTop: top }
      })

      const title = document.createElement('div')
      title.className = 'floating-editor-title'
      title.style.flex = '1'
      title.style.minWidth = '0'
      title.style.overflow = 'hidden'
      title.style.textOverflow = 'ellipsis'
      title.style.whiteSpace = 'nowrap'
      title.style.fontSize = '12px'
      title.style.fontWeight = '600'
      titleBar.appendChild(title)

      titleBar.appendChild(makeButton('^', 'Move up', () => moveFrame(-48)))
      titleBar.appendChild(makeButton('v', 'Move down', () => moveFrame(48)))
      titleBar.appendChild(makeButton('x', 'Close', hideFloatingEditor))

      resizer = document.createElement('div')
      resizer.className = 'floating-editor-resizer'
      resizer.title = 'Resize'
      resizer.style.position = 'absolute'
      resizer.style.left = '0'
      resizer.style.right = '0'
      resizer.style.bottom = '0'
      resizer.style.height = `${RESIZER_HEIGHT}px`
      resizer.style.cursor = 'ns-resize'
      resizer.style.background = 'var(--g-color-94)'
      resizer.style.borderTop = '1px solid var(--g-color-86)'
      resizer.style.zIndex = '2'
      resizer.addEventListener('mousedown', (e) => {
        if (e.button !== 0) {
          return
        }

        e.preventDefault()
        dragState = { type: 'resize', startY: e.clientY, startHeight: height }
      })

      editorDom.appendChild(titleBar)
      editorDom.appendChild(resizer)
      updateTitle(line)
    }

    function applyFloatingStyle () {
      const editorDom = getEditorDom()
      if (!editorDom) {
        return
      }

      if (savedStyle === null) {
        savedStyle = editorDom.getAttribute('style') || ''
      }

      editorDom.style.setProperty('display', 'flex', 'important')
      editorDom.style.setProperty('position', 'fixed', 'important')
      editorDom.style.setProperty('z-index', '200000', 'important')
      editorDom.style.setProperty('box-sizing', 'border-box', 'important')
      editorDom.style.setProperty('padding-top', `${TITLE_HEIGHT}px`, 'important')
      editorDom.style.setProperty('padding-bottom', `${RESIZER_HEIGHT}px`, 'important')
      editorDom.style.setProperty('border', '1px solid var(--g-color-80)', 'important')
      editorDom.style.setProperty('border-radius', '6px', 'important')
      editorDom.style.setProperty('box-shadow', '0 8px 28px rgba(0, 0, 0, 0.28)', 'important')
      editorDom.style.setProperty('background', 'var(--g-color-backdrop)', 'important')
      editorDom.style.setProperty('overflow', 'hidden', 'important')
      editorDom.style.setProperty('min-width', '0', 'important')
      editorDom.style.setProperty('max-width', 'none', 'important')
      editorDom.style.setProperty('flex', 'none', 'important')
    }

    function restoreEditorStyle () {
      const editorDom = getEditorDom()
      if (!editorDom || savedStyle === null) {
        return
      }

      editorDom.setAttribute('style', savedStyle)
      savedStyle = null
    }

    async function showFloatingEditor (options: ShowFloatingEditorOptions) {
      if (!canShowFloatingEditor()) {
        return
      }

      const iframe = await ctx.view.getRenderIframe()
      const iframeRect = iframe.getBoundingClientRect()
      const preferredTop = typeof options.clientY === 'number'
        ? iframeRect.top + options.clientY - TITLE_HEIGHT / 2
        : (getPreviewDom()?.getBoundingClientRect().top || SCREEN_MARGIN) + 80

      top = preferredTop
      height = clamp(height || DEFAULT_HEIGHT, MIN_HEIGHT, window.innerHeight - SCREEN_MARGIN * 2)
      visible = true

      applyFloatingStyle()
      createControls(options.line)
      clampFrame()

      requestAnimationFrame(() => {
        const lineEnd = options.lineEnd || 0
        const highlightEnd = lineEnd > options.line ? lineEnd - 1 : options.line

        ctx.editor.getEditor().layout()
        ctx.view.disableSyncScrollAwhile(() => {
          ctx.editor.highlightLine(highlightEnd > options.line ? [options.line, highlightEnd] : options.line, true, 1000)
          ctx.editor.getEditor().setPosition({ lineNumber: options.line, column: 1 })
          ctx.editor.getEditor().focus()
        })
      })
    }

    function hideFloatingEditor () {
      if (!visible) {
        return
      }

      visible = false
      dragState = null
      titleBar?.remove()
      resizer?.remove()
      titleBar = null
      resizer = null
      restoreEditorStyle()
      ctx.layout.emitResize()
    }

    function handleMouseMove (e: MouseEvent) {
      if (!dragState) {
        return
      }

      if (dragState.type === 'move') {
        top = dragState.startTop + e.clientY - dragState.startY
      } else {
        height = dragState.startHeight + e.clientY - dragState.startY
      }

      clampFrame()
      relayoutEditor()
    }

    function handleMouseUp () {
      dragState = null
    }

    function handleKeydown (e: KeyboardEvent) {
      if (visible && e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        hideFloatingEditor()
        return true
      }

      return false
    }

    function handleAltClick (e: MouseEvent) {
      if (!e.altKey || !canShowFloatingEditor()) {
        return false
      }

      const target = e.target as HTMLElement
      const tagName = target.tagName.toLowerCase()
      if (['button', 'input', 'textarea', 'select', 'option', 'img', 'canvas', 'video', 'audio', 'details', 'summary'].includes(tagName)) {
        return false
      }

      if (target.ownerDocument?.defaultView?.getSelection()?.toString()?.length) {
        return false
      }

      const sourceEl = target.closest<HTMLElement>(`[${DOM_ATTR_NAME.SOURCE_LINE_START}]`)
      if (!sourceEl) {
        return false
      }

      const line = parseInt(sourceEl.getAttribute(DOM_ATTR_NAME.SOURCE_LINE_START) || '0')
      const lineEnd = parseInt(sourceEl.getAttribute(DOM_ATTR_NAME.SOURCE_LINE_END) || '0')
      if (!line) {
        return false
      }

      e.preventDefault()
      e.stopPropagation()
      ctx.action.getActionHandler(ACTION_SHOW)({ line, lineEnd, clientX: e.clientX, clientY: e.clientY })
      return true
    }

    ctx.action.registerAction({
      name: ACTION_SHOW,
      description: 'Show Floating Editor',
      handler: showFloatingEditor,
      when: canShowFloatingEditor,
    })

    ctx.action.registerAction({
      name: ACTION_HIDE,
      description: 'Hide Floating Editor',
      handler: hideFloatingEditor,
      when: () => visible,
    })

    ctx.registerHook('VIEW_ELEMENT_CLICK', ({ e }) => handleAltClick(e))
    ctx.registerHook('VIEW_KEY_DOWN', ({ e }) => handleKeydown(e))
    ctx.registerHook('GLOBAL_KEYDOWN', handleKeydown)
    ctx.registerHook('GLOBAL_RESIZE', () => {
      if (visible) {
        clampFrame()
        relayoutEditor()
      }
    })
    ctx.registerHook('ACTION_BEFORE_RUN', ({ name }) => {
      if (visible && name === 'layout.toggle-editor') {
        hideFloatingEditor()
      }
    })
    ctx.registerHook('DOC_BEFORE_SWITCH', hideFloatingEditor)
    ctx.registerHook('VIEW_FILE_CHANGE', hideFloatingEditor)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }
} as Plugin
