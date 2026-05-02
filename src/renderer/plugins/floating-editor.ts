import type { Plugin } from '@fe/context'
import { DOM_ATTR_NAME } from '@fe/support/args'
import { isMacOS } from '@fe/support/env'

type ShowFloatingEditorOptions = {
  line: number
  lineEnd?: number
  clientX?: number
  clientY?: number
}

type DragState =
  | { type: 'move', startY: number, startTop: number }
  | { type: 'resizeTop', startY: number, startTop: number, startHeight: number }
  | { type: 'resizeBottom', startY: number, startTop: number, startHeight: number }

const ACTION_SHOW = 'layout.show-floating-editor'
const ACTION_HIDE = 'layout.hide-floating-editor'
const TITLE_HEIGHT = 30
const RESIZE_HANDLE_SIZE = 8
const MIN_HEIGHT = 220
const DEFAULT_HEIGHT = MIN_HEIGHT
const SIDE_MARGIN = 24
const SCREEN_MARGIN = 8
const HINT_STORAGE_KEY = 'plugin.floating-editor.preview-hint-count'
const HINT_LIMIT = 3
const HINT_DURATION = 5000
const PREVIEW_CLICK_IGNORE_TAGS = ['button', 'input', 'textarea', 'select', 'option', 'img', 'canvas', 'video', 'audio', 'details', 'summary']

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
    let topResizer: HTMLDivElement | null = null
    let bottomResizer: HTMLDivElement | null = null
    let dragState: DragState | null = null
    let dragIframeWindow: Window | null = null
    let savedUserSelect: string | null = null
    let maximized = false
    let hint: HTMLDivElement | null = null
    let hintTimer: number | null = null
    let lastHintEligible = false

    function getEditorDom () {
      return ctx.layout.getContainerDom('editor')
    }

    function getPreviewDom () {
      return ctx.layout.getContainerDom('preview')
    }

    function getHintText () {
      const key = isMacOS ? 'Option' : 'Alt'
      if (navigator.language.toLowerCase().startsWith('zh')) {
        return `${key} + 点击预览文本，可打开浮动编辑器`
      }

      return `${key} + click preview text to open the floating editor`
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

    function pausePreviewSyncForWheel () {
      ctx.view.disableSyncScrollAwhile(() => undefined, 350).catch(console.warn)
    }

    function stopWheelBubble (e: WheelEvent) {
      e.stopPropagation()
    }

    function getFrameBounds () {
      const previewDom = getPreviewDom()
      if (!previewDom) {
        return null
      }

      const previewRect = previewDom.getBoundingClientRect()
      const minTop = previewRect.top + SCREEN_MARGIN
      const maxBottom = previewRect.bottom - SCREEN_MARGIN
      const maxHeight = Math.max(TITLE_HEIGHT + RESIZE_HANDLE_SIZE, maxBottom - minTop)
      const minHeight = Math.min(MIN_HEIGHT, maxHeight)

      return { previewRect, minTop, maxBottom, minHeight, maxHeight }
    }

    function clampFrame () {
      const bounds = getFrameBounds()
      if (!bounds) {
        return
      }

      height = clamp(height, bounds.minHeight, bounds.maxHeight)
      top = clamp(top, bounds.minTop, Math.max(bounds.minTop, bounds.maxBottom - height))

      const editorDom = getEditorDom()
      if (!editorDom || !visible) {
        return
      }

      const { previewRect } = bounds
      const sideMargin = previewRect.width >= SIDE_MARGIN * 4 ? SIDE_MARGIN : SCREEN_MARGIN

      editorDom.style.left = `${Math.round(previewRect.left + sideMargin)}px`
      editorDom.style.top = `${Math.round(top)}px`
      editorDom.style.width = `${Math.round(Math.max(0, previewRect.width - sideMargin * 2))}px`
      editorDom.style.height = `${Math.round(height)}px`
    }

    function getHintCount () {
      return ctx.storage.get(HINT_STORAGE_KEY, 0)
    }

    function setHintCount (count: number) {
      ctx.storage.set(HINT_STORAGE_KEY, count)
    }

    function hideHint () {
      if (hintTimer) {
        clearTimeout(hintTimer)
        hintTimer = null
      }

      hint?.remove()
      hint = null
    }

    function positionHint () {
      if (!hint) {
        return
      }

      const previewRect = getPreviewDom()?.getBoundingClientRect()
      if (!previewRect) {
        return
      }

      hint.style.left = `${Math.round(previewRect.left + SIDE_MARGIN)}px`
      hint.style.top = `${Math.round(previewRect.bottom - hint.offsetHeight - SCREEN_MARGIN - 4)}px`
    }

    function showHint () {
      if (visible || hint || getHintCount() >= HINT_LIMIT) {
        return
      }

      const previewDom = getPreviewDom()
      if (!previewDom) {
        return
      }

      hint = document.createElement('div')
      hint.className = 'floating-editor-hint'
      hint.textContent = getHintText()
      hint.style.position = 'fixed'
      hint.style.zIndex = '200001'
      hint.style.maxWidth = 'min(360px, calc(100vw - 32px))'
      hint.style.padding = '7px 10px'
      hint.style.border = '1px solid var(--g-color-82)'
      hint.style.borderRadius = '6px'
      hint.style.background = 'var(--g-color-96)'
      hint.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.18)'
      hint.style.color = 'var(--g-color-40)'
      hint.style.fontSize = '12px'
      hint.style.lineHeight = '18px'
      hint.style.pointerEvents = 'none'
      hint.style.userSelect = 'none'
      document.body.appendChild(hint)
      positionHint()
      setHintCount(getHintCount() + 1)

      hintTimer = window.setTimeout(hideHint, HINT_DURATION)
    }

    function checkHint () {
      const eligible = canShowFloatingEditor()

      if (!eligible) {
        lastHintEligible = false
        hideHint()
        return
      }

      if (!lastHintEligible) {
        showHint()
      } else {
        positionHint()
      }

      lastHintEligible = true
    }

    function scheduleCheckHint () {
      window.setTimeout(checkHint)
    }

    function makeButton (title: string, onClick: () => void) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.title = title
      btn.setAttribute('aria-label', title)
      btn.style.width = '22px'
      btn.style.height = '22px'
      btn.style.padding = '0'
      btn.style.margin = '0'
      btn.style.border = '0'
      btn.style.borderRadius = '50%'
      btn.style.background = 'transparent'
      btn.style.color = 'var(--g-color-30)'
      btn.style.cursor = 'default'
      btn.style.display = 'flex'
      btn.style.alignItems = 'center'
      btn.style.justifyContent = 'center'
      btn.style.flex = 'none'
      btn.addEventListener('mousedown', e => e.stopPropagation())
      btn.addEventListener('dblclick', e => e.stopPropagation())
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'var(--g-color-86)'
        btn.style.color = 'var(--g-color-0)'
      })
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'transparent'
        btn.style.color = 'var(--g-color-30)'
      })
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        onClick()
      })
      return btn
    }

    function createLineIcon (paths: string[]) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('viewBox', '0 0 24 24')
      svg.setAttribute('width', '14')
      svg.setAttribute('height', '14')
      svg.setAttribute('aria-hidden', 'true')
      svg.style.display = 'block'

      paths.forEach((d) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        path.setAttribute('d', d)
        path.setAttribute('fill', 'none')
        path.setAttribute('stroke', 'currentColor')
        path.setAttribute('stroke-width', '2')
        path.setAttribute('stroke-linecap', 'round')
        path.setAttribute('stroke-linejoin', 'round')
        svg.appendChild(path)
      })

      return svg
    }

    function createCloseIcon () {
      return createLineIcon(['M18 6 6 18', 'm6 6 12 12'])
    }

    function createSplitEditorIcon () {
      return createLineIcon(['M4 5h16v14H4z', 'M12 5v14'])
    }

    function showInlineEditor () {
      hideFloatingEditor()
      ctx.action.getActionHandler('layout.toggle-editor')(true)
    }

    async function bindDragListeners () {
      window.addEventListener('mousemove', handleMouseMove, true)
      window.addEventListener('mouseup', handleMouseUp, true)

      if (savedUserSelect === null) {
        savedUserSelect = document.body.style.userSelect
      }
      document.body.style.userSelect = 'none'

      try {
        const iframe = await ctx.view.getRenderIframe()
        if (!dragState) {
          return
        }

        dragIframeWindow = iframe.contentWindow
        dragIframeWindow?.addEventListener('mousemove', handleMouseMove, true)
        dragIframeWindow?.addEventListener('mouseup', handleMouseUp, true)
      } catch (error) {
        console.warn(error)
      }
    }

    function unbindDragListeners () {
      window.removeEventListener('mousemove', handleMouseMove, true)
      window.removeEventListener('mouseup', handleMouseUp, true)
      dragIframeWindow?.removeEventListener('mousemove', handleMouseMove, true)
      dragIframeWindow?.removeEventListener('mouseup', handleMouseUp, true)
      dragIframeWindow = null
      document.body.style.userSelect = savedUserSelect || ''
      savedUserSelect = null
    }

    function startDrag (e: MouseEvent, state: DragState) {
      if (e.button !== 0) {
        return
      }

      e.preventDefault()
      e.stopPropagation()
      dragState = state
      if (state.type === 'move' && titleBar) {
        titleBar.style.cursor = 'grabbing'
      }
      bindDragListeners().catch(console.warn)
    }

    function createResizeHandle (position: 'top' | 'bottom') {
      const handle = document.createElement('div')
      handle.className = `floating-editor-resize-${position}`
      handle.title = 'Resize'
      handle.style.position = 'absolute'
      handle.style.left = '0'
      handle.style.right = '0'
      handle.style[position] = '0'
      handle.style.height = `${RESIZE_HANDLE_SIZE}px`
      handle.style.cursor = 'ns-resize'
      handle.style.background = 'transparent'
      handle.style.zIndex = '3'
      handle.addEventListener('mousedown', (e) => {
        startDrag(e, position === 'top'
          ? { type: 'resizeTop', startY: e.clientY, startTop: top, startHeight: height }
          : { type: 'resizeBottom', startY: e.clientY, startTop: top, startHeight: height })
      })
      handle.addEventListener('dblclick', (e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleMaximizeFrame()
      })
      return handle
    }

    function updateTitle () {
      if (!titleBar) {
        return
      }

      const title = titleBar.querySelector<HTMLDivElement>('.floating-editor-title')
      if (title) {
        title.textContent = ctx.store.state.currentFile?.name || 'Editor'
      }
    }

    function maximizeFrame () {
      const bounds = getFrameBounds()
      if (!bounds) {
        return
      }

      maximized = true
      top = bounds.minTop
      height = bounds.maxHeight
      clampFrame()
      relayoutEditor()
    }

    function restoreDefaultFrame () {
      const bounds = getFrameBounds()
      if (!bounds) {
        return
      }

      maximized = false
      height = DEFAULT_HEIGHT
      top = bounds.previewRect.top + (bounds.previewRect.height - height) / 2
      clampFrame()
      relayoutEditor()
    }

    function toggleMaximizeFrame () {
      if (maximized) {
        restoreDefaultFrame()
      } else {
        maximizeFrame()
      }
    }

    function createControls () {
      const editorDom = getEditorDom()
      if (!editorDom) {
        return
      }

      titleBar?.remove()
      topResizer?.remove()
      bottomResizer?.remove()

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
      titleBar.style.cursor = 'grab'
      titleBar.style.userSelect = 'none'
      titleBar.style.zIndex = '2'
      titleBar.addEventListener('mousedown', (e) => {
        startDrag(e, { type: 'move', startY: e.clientY, startTop: top })
      })
      titleBar.addEventListener('dblclick', (e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleMaximizeFrame()
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
      title.style.textAlign = 'right'

      const splitEditorBtn = makeButton('Show Editor', showInlineEditor)
      splitEditorBtn.appendChild(createSplitEditorIcon())
      titleBar.appendChild(splitEditorBtn)

      const closeBtn = makeButton('Close', hideFloatingEditor)
      closeBtn.appendChild(createCloseIcon())
      titleBar.appendChild(closeBtn)
      titleBar.appendChild(title)

      topResizer = createResizeHandle('top')
      bottomResizer = createResizeHandle('bottom')

      editorDom.appendChild(titleBar)
      editorDom.appendChild(topResizer)
      editorDom.appendChild(bottomResizer)
      updateTitle()
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
      editorDom.style.setProperty('padding-bottom', '0', 'important')
      editorDom.style.setProperty('border', '1px solid var(--g-color-80)', 'important')
      editorDom.style.setProperty('border-radius', '6px', 'important')
      editorDom.style.setProperty('box-shadow', '0 8px 28px rgba(0, 0, 0, 0.28)', 'important')
      editorDom.style.setProperty('background', 'var(--g-color-96)', 'important')
      editorDom.style.setProperty('overflow', 'hidden', 'important')
      editorDom.style.setProperty('min-width', '0', 'important')
      editorDom.style.setProperty('max-width', 'none', 'important')
      editorDom.style.setProperty('flex', 'none', 'important')
      editorDom.addEventListener('wheel', pausePreviewSyncForWheel, true)
      editorDom.addEventListener('wheel', stopWheelBubble)
    }

    function restoreEditorStyle () {
      const editorDom = getEditorDom()
      if (!editorDom || savedStyle === null) {
        return
      }

      editorDom.setAttribute('style', savedStyle)
      editorDom.removeEventListener('wheel', pausePreviewSyncForWheel, true)
      editorDom.removeEventListener('wheel', stopWheelBubble)
      savedStyle = null
    }

    async function showFloatingEditor (options: ShowFloatingEditorOptions) {
      if (!canShowFloatingEditor()) {
        return
      }

      const iframe = await ctx.view.getRenderIframe()
      const iframeRect = iframe.getBoundingClientRect()
      const preferredTop = typeof options.clientY === 'number'
        ? iframeRect.top + options.clientY - height / 2
        : (getPreviewDom()?.getBoundingClientRect().top || SCREEN_MARGIN) + 80

      top = preferredTop
      height = height || DEFAULT_HEIGHT
      maximized = false
      visible = true
      hideHint()

      applyFloatingStyle()
      createControls()
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
      maximized = false
      dragState = null
      unbindDragListeners()
      titleBar?.remove()
      topResizer?.remove()
      bottomResizer?.remove()
      titleBar = null
      topResizer = null
      bottomResizer = null
      restoreEditorStyle()
      ctx.layout.emitResize()
      scheduleCheckHint()
    }

    function handleMouseMove (e: MouseEvent) {
      if (!dragState) {
        return
      }

      e.preventDefault()
      e.stopPropagation()
      maximized = false

      if (dragState.type === 'move') {
        top = dragState.startTop + e.clientY - dragState.startY
      } else if (dragState.type === 'resizeTop') {
        const bounds = getFrameBounds()
        const minTop = bounds?.minTop ?? SCREEN_MARGIN
        const offset = e.clientY - dragState.startY
        const maxOffset = dragState.startHeight - (bounds?.minHeight ?? MIN_HEIGHT)
        const fixedOffset = clamp(offset, minTop - dragState.startTop, maxOffset)
        top = dragState.startTop + fixedOffset
        height = dragState.startHeight - fixedOffset
      } else {
        const bounds = getFrameBounds()
        const minHeight = bounds?.minHeight ?? MIN_HEIGHT
        const maxBottom = bounds?.maxBottom ?? window.innerHeight - SCREEN_MARGIN
        const fixedTop = dragState.startTop
        const bottom = clamp(
          dragState.startTop + dragState.startHeight + e.clientY - dragState.startY,
          fixedTop + minHeight,
          maxBottom
        )

        top = fixedTop
        height = bottom - fixedTop
      }

      clampFrame()
      relayoutEditor()
    }

    function handleMouseUp (e?: MouseEvent) {
      e?.preventDefault()
      e?.stopPropagation()
      dragState = null
      if (titleBar) {
        titleBar.style.cursor = 'grab'
      }
      unbindDragListeners()
    }

    function getClickSourceRange (e: MouseEvent) {
      const target = e.target as HTMLElement
      const tagName = target.tagName.toLowerCase()
      if (PREVIEW_CLICK_IGNORE_TAGS.includes(tagName)) {
        return null
      }

      if (target.ownerDocument?.defaultView?.getSelection()?.toString()?.length) {
        return null
      }

      const sourceEl = target.closest<HTMLElement>(`[${DOM_ATTR_NAME.SOURCE_LINE_START}]`)
      if (!sourceEl) {
        return null
      }

      const line = parseInt(sourceEl.getAttribute(DOM_ATTR_NAME.SOURCE_LINE_START) || '0')
      const lineEnd = parseInt(sourceEl.getAttribute(DOM_ATTR_NAME.SOURCE_LINE_END) || '0')
      if (!line) {
        return null
      }

      return { line, lineEnd }
    }

    function highlightPreviewClickLine (e: MouseEvent) {
      if (!visible || e.altKey || ctx.store.state.presentation) {
        return false
      }

      const range = getClickSourceRange(e)
      if (!range) {
        return false
      }

      ctx.view.disableSyncScrollAwhile(() => {
        ctx.editor.highlightLine(range.lineEnd ? [range.line, range.lineEnd - 1] : range.line, true, 1000)
      }).catch(console.warn)
      return false
    }

    function handleAltClick (e: MouseEvent) {
      if (!e.altKey || !canShowFloatingEditor()) {
        return false
      }

      const range = getClickSourceRange(e)
      if (!range) {
        return false
      }

      e.preventDefault()
      e.stopPropagation()
      hideHint()
      ctx.action.getActionHandler(ACTION_SHOW)({ ...range, clientX: e.clientX, clientY: e.clientY })
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

    ctx.registerHook('VIEW_ELEMENT_CLICK', ({ e }) => handleAltClick(e) || highlightPreviewClickLine(e))
    ctx.registerHook('GLOBAL_RESIZE', () => {
      if (visible) {
        clampFrame()
        relayoutEditor()
      }
      positionHint()
    })
    ctx.registerHook('ACTION_BEFORE_RUN', ({ name }) => {
      if (visible && name === 'layout.toggle-editor') {
        hideFloatingEditor()
      }
    })
    ctx.registerHook('ACTION_AFTER_RUN', ({ name }) => {
      if (name === 'layout.toggle-editor') {
        scheduleCheckHint()
      }
    })
    ctx.registerHook('VIEW_RENDERED', scheduleCheckHint)
    ctx.registerHook('DOC_BEFORE_SWITCH', () => {
      hideFloatingEditor()
      hideHint()
      lastHintEligible = false
    })
    ctx.registerHook('VIEW_FILE_CHANGE', () => {
      hideFloatingEditor()
      hideHint()
      lastHintEligible = false
      scheduleCheckHint()
    })
  }
} as Plugin
