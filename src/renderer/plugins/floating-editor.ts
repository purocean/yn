import type { Plugin } from '@fe/context'
import { DOM_ATTR_NAME } from '@fe/support/args'

type ShowFloatingEditorOptions = {
  line: number
  lineEnd?: number
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
const REVEAL_TOP_CONTEXT_LINES = 3
const SIDE_MARGIN = 24
const SCREEN_MARGIN = 8
const HINT_STORAGE_KEY = 'plugin.floating-editor.preview-hint-count'
const HINT_LIMIT = 5
const HINT_DURATION = 5000
const EDITOR_SCROLL_SYNC_PAUSE_TIMEOUT = 350
const CLOSE_SYNC_PAUSE_TIMEOUT = 800
const PREVIEW_CLICK_IGNORE_TAGS = ['button', 'input', 'textarea', 'select', 'option', 'img', 'canvas', 'video', 'audio', 'details', 'summary']
const FLOATING_EDITOR_STYLES = `
  .floating-editor-active {
    display: flex !important;
    position: fixed !important;
    z-index: 200000 !important;
    box-sizing: border-box !important;
    padding-top: ${TITLE_HEIGHT}px !important;
    padding-bottom: 0 !important;
    border: 1px solid var(--g-color-80) !important;
    border-radius: 6px !important;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.28) !important;
    background: var(--g-color-96) !important;
    overflow: hidden !important;
    min-width: 0 !important;
    max-width: none !important;
    flex: none !important;
  }

  .floating-editor-titlebar {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: ${TITLE_HEIGHT}px;
    display: flex;
    align-items: center;
    gap: 6px;
    box-sizing: border-box;
    padding: 3px 6px 3px 10px;
    border-bottom: 1px solid var(--g-color-86);
    background: var(--g-color-96);
    color: var(--g-color-20);
    cursor: grab;
    user-select: none;
    z-index: 2;
  }

  .floating-editor-titlebar.floating-editor-dragging {
    cursor: grabbing;
  }

  .floating-editor-title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    font-weight: 600;
    text-align: right;
  }

  .floating-editor-button {
    width: 22px;
    height: 22px;
    padding: 0;
    margin: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--g-color-30);
    cursor: default;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
  }

  .floating-editor-button:hover {
    background: var(--g-color-86);
    color: var(--g-color-0);
  }

  .floating-editor-resize-handle {
    position: absolute;
    left: 0;
    right: 0;
    height: ${RESIZE_HANDLE_SIZE}px;
    cursor: ns-resize;
    background: transparent;
    z-index: 3;
  }

  .floating-editor-resize-top {
    top: 0;
  }

  .floating-editor-resize-bottom {
    bottom: 0;
  }

  .floating-editor-hint {
    position: fixed;
    z-index: 200001;
    max-width: min(360px, calc(100vw - 32px));
    padding: 7px 10px;
    border: 1px solid var(--g-color-82);
    border-radius: 6px;
    background: var(--g-color-96);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
    color: var(--g-color-40);
    font-size: 12px;
    line-height: 18px;
    pointer-events: none;
    user-select: none;
  }
`

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
    let dragIframeOffsetTop = 0
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

    ctx.theme.addStyles(FLOATING_EDITOR_STYLES).catch(console.warn)

    function getHintText () {
      const key = ctx.keybinding.getKeysLabel([ctx.keybinding.Alt])
      return ctx.i18n.t('floating-editor.preview-hint', key)
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

    function stopWheelBubble (e: WheelEvent) {
      e.stopPropagation()
    }

    function revealEditorLineAtTop (line: number) {
      const editor = ctx.editor.getEditor()
      const lineHeight = editor.getOption(ctx.editor.getMonaco().editor.EditorOption.lineHeight)
      const top = Math.max(0, editor.getTopForLineNumber(line) - lineHeight * REVEAL_TOP_CONTEXT_LINES)

      editor.setScrollTop(top)
    }

    function pausePreviewSyncForEditorScroll () {
      if (!visible) {
        return
      }

      ctx.view.disableSyncScrollAwhile(() => undefined, EDITOR_SCROLL_SYNC_PAUSE_TIMEOUT).catch(console.warn)
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

    function resetFloatingState (scheduleHint = false) {
      hideFloatingEditor()
      hideHint()
      lastHintEligible = false

      if (scheduleHint) {
        scheduleCheckHint()
      }
    }

    function makeButton (title: string, onClick: () => void) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.title = title
      btn.setAttribute('aria-label', title)
      btn.className = 'floating-editor-button'
      btn.addEventListener('mousedown', e => e.stopPropagation())
      btn.addEventListener('dblclick', e => e.stopPropagation())
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
        dragIframeOffsetTop = iframe.getBoundingClientRect().top
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
      dragIframeOffsetTop = 0
      document.body.style.userSelect = savedUserSelect || ''
      savedUserSelect = null
    }

    function getClientY (e: MouseEvent) {
      return e.view === dragIframeWindow ? e.clientY + dragIframeOffsetTop : e.clientY
    }

    function startDrag (e: MouseEvent, state: DragState) {
      if (e.button !== 0) {
        return
      }

      e.preventDefault()
      e.stopPropagation()
      dragState = state
      if (state.type === 'move' && titleBar) {
        titleBar.classList.add('floating-editor-dragging')
      }
      bindDragListeners().catch(console.warn)
    }

    function createResizeHandle (position: 'top' | 'bottom') {
      const handle = document.createElement('div')
      handle.className = `floating-editor-resize-handle floating-editor-resize-${position}`
      handle.title = ctx.i18n.t('floating-editor.resize')
      handle.addEventListener('mousedown', (e) => {
        const clientY = getClientY(e)
        startDrag(e, position === 'top'
          ? { type: 'resizeTop', startY: clientY, startTop: top, startHeight: height }
          : { type: 'resizeBottom', startY: clientY, startTop: top, startHeight: height })
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
      titleBar.addEventListener('mousedown', (e) => {
        startDrag(e, { type: 'move', startY: getClientY(e), startTop: top })
      })
      titleBar.addEventListener('dblclick', (e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleMaximizeFrame()
      })

      const title = document.createElement('div')
      title.className = 'floating-editor-title'

      const splitEditorBtn = makeButton(ctx.i18n.t('floating-editor.show-editor'), showInlineEditor)
      splitEditorBtn.appendChild(createSplitEditorIcon())
      titleBar.appendChild(splitEditorBtn)

      const closeBtn = makeButton(ctx.i18n.t('close'), hideFloatingEditor)
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

      editorDom.classList.add('floating-editor-active')
      editorDom.addEventListener('wheel', stopWheelBubble)
    }

    function restoreEditorStyle () {
      const editorDom = getEditorDom()
      if (!editorDom || savedStyle === null) {
        return
      }

      editorDom.classList.remove('floating-editor-active')
      editorDom.setAttribute('style', savedStyle)
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
        const editor = ctx.editor.getEditor()

        editor.layout()
        window.setTimeout(() => {
          ctx.view.disableSyncScrollAwhile(() => {
            ctx.editor.highlightLine(highlightEnd > options.line ? [options.line, highlightEnd] : options.line, false, 1000)
            editor.setPosition({ lineNumber: options.line, column: 1 })
            revealEditorLineAtTop(options.line)
            editor.focus()
          }).catch(console.warn)
        }, 50)
      })
    }

    function hideFloatingEditor () {
      if (!visible) {
        return
      }

      ctx.view.disableSyncScrollAwhile(() => undefined, CLOSE_SYNC_PAUSE_TIMEOUT).catch(console.warn)
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
      const clientY = getClientY(e)

      if (dragState.type === 'move') {
        top = dragState.startTop + clientY - dragState.startY
      } else if (dragState.type === 'resizeTop') {
        const bounds = getFrameBounds()
        const minTop = bounds?.minTop ?? SCREEN_MARGIN
        const offset = clientY - dragState.startY
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
          dragState.startTop + dragState.startHeight + clientY - dragState.startY,
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
        titleBar.classList.remove('floating-editor-dragging')
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
      ctx.action.getActionHandler(ACTION_SHOW)({ ...range, clientY: e.clientY })
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
    ctx.editor.whenEditorReady().then(({ editor }) => {
      editor.onDidScrollChange(pausePreviewSyncForEditorScroll)
    }).catch(console.warn)
    ctx.lib.vue.watch(() => canShowFloatingEditor(), (canShow) => {
      if (!canShow) {
        if (visible) {
          hideFloatingEditor()
        }

        hideHint()
        lastHintEligible = false
        return
      }

      checkHint()
    }, { immediate: true })
    ctx.registerHook('GLOBAL_RESIZE', () => {
      if (visible) {
        clampFrame()
        relayoutEditor()
      }
      positionHint()
    })
    ctx.registerHook('DOC_BEFORE_SWITCH', () => {
      resetFloatingState()
    })
    ctx.registerHook('VIEW_FILE_CHANGE', () => {
      resetFloatingState(true)
    })
  }
} as Plugin
