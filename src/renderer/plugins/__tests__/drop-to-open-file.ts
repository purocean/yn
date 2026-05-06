vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

import dropToOpenFile from '../drop-to-open-file'

const dragClassName = 'drop-file-dragover-mask'

type ListenerMap = Record<string, (event: DragEvent) => void>

function createLayout () {
  document.body.innerHTML = `
    <div id="app">
      <div class="layout">
        <div class="main">
          <div class="left"></div>
          <div class="right"><div class="target"></div></div>
        </div>
      </div>
    </div>
  `

  return {
    right: document.querySelector('.right') as HTMLElement,
    target: document.querySelector('.target') as HTMLElement,
  }
}

function createDragEvent (target: HTMLElement, item: any) {
  return {
    dataTransfer: {
      items: [item],
    },
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    target,
  } as any as DragEvent
}

function createCtx (isElectron = true) {
  const iframeListeners: ListenerMap = {}
  const iframeWindow = {
    addEventListener: vi.fn((type: string, listener: any) => {
      iframeListeners[type] = listener
    }),
  }
  const iframe = { contentWindow: iframeWindow }

  return {
    env: { isElectron },
    doc: {
      switchDocByPath: vi.fn(),
    },
    theme: {
      addStyles: vi.fn(),
    },
    utils: {
      sleep: vi.fn((ms: number) => new Promise(resolve => setTimeout(resolve, ms))),
    },
    view: {
      getRenderIframe: vi.fn(() => Promise.resolve(iframe)),
    },
    _iframeListeners: iframeListeners,
    _iframeWindow: iframeWindow,
  } as any
}

function registerAndCapture (ctx = createCtx()) {
  const windowListeners: ListenerMap = {}
  const addEventListener = vi.spyOn(window, 'addEventListener').mockImplementation(((type: string, listener: any) => {
    windowListeners[type] = listener
  }) as any)

  dropToOpenFile.register(ctx)

  return { addEventListener, ctx, windowListeners }
}

describe('drop-to-open-file plugin', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('does nothing outside Electron', () => {
    const ctx = createCtx(false)
    const addEventListener = vi.spyOn(window, 'addEventListener')

    dropToOpenFile.register(ctx)

    expect(addEventListener).not.toHaveBeenCalled()
    expect(ctx.view.getRenderIframe).not.toHaveBeenCalled()
    expect(ctx.theme.addStyles).not.toHaveBeenCalled()
  })

  test('registers window and iframe drag/drop listeners and adds styles in Electron', async () => {
    const { ctx, addEventListener } = registerAndCapture()
    await Promise.resolve()

    const expectedEvents = ['dragover', 'dragenter', 'dragend', 'dragleave', 'drop']
    expect(addEventListener.mock.calls.map(([type]) => type)).toEqual(expectedEvents)
    expect(addEventListener.mock.calls.map(([, , capture]) => capture)).toEqual([true, true, true, true, true])
    expect(ctx.view.getRenderIframe).toHaveBeenCalledTimes(1)
    expect(ctx._iframeWindow.addEventListener.mock.calls.map(([type]: any[]) => type)).toEqual(expectedEvents)
    expect(ctx._iframeWindow.addEventListener.mock.calls.map(([, , capture]: any[]) => capture)).toEqual([true, true, true, true, true])
    expect(ctx.theme.addStyles).toHaveBeenCalledWith(expect.stringContaining(`.${dragClassName}::after`))
  })

  test('dragover and dragenter on right-side file drags show the mask and stop browser handling', () => {
    const { right, target } = createLayout()
    const { windowListeners } = registerAndCapture()
    const item = { kind: 'file', type: 'text/markdown' }

    const dragover = createDragEvent(target, item)
    windowListeners.dragover(dragover)

    expect(right.classList.contains(dragClassName)).toBe(true)
    expect(dragover.preventDefault).toHaveBeenCalledTimes(1)
    expect(dragover.stopPropagation).toHaveBeenCalledTimes(1)

    right.classList.remove(dragClassName)
    const dragenter = createDragEvent(target, item)
    windowListeners.dragenter(dragenter)

    expect(right.classList.contains(dragClassName)).toBe(true)
    expect(dragenter.preventDefault).toHaveBeenCalledTimes(1)
    expect(dragenter.stopPropagation).toHaveBeenCalledTimes(1)
  })

  test('drop opens non-image files by their filesystem path', () => {
    const { right, target } = createLayout()
    const { ctx, windowListeners } = registerAndCapture()
    right.classList.add(dragClassName)

    const event = createDragEvent(target, {
      getAsFile: vi.fn(() => ({ path: '/notes/todo.md' })),
      kind: 'file',
      type: 'text/markdown',
    })
    windowListeners.drop(event)

    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(event.stopPropagation).toHaveBeenCalledTimes(1)
    expect(ctx.doc.switchDocByPath).toHaveBeenCalledWith('/notes/todo.md')
  })

  test('drop ignores image files so the editor can handle them', () => {
    const { target } = createLayout()
    const { ctx, windowListeners } = registerAndCapture()

    const event = createDragEvent(target, {
      getAsFile: vi.fn(() => ({ path: '/images/photo.png' })),
      kind: 'file',
      type: 'image/png',
    })
    windowListeners.drop(event)

    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(event.stopPropagation).not.toHaveBeenCalled()
    expect(ctx.doc.switchDocByPath).not.toHaveBeenCalled()
  })

  test('dragleave and dragend remove the mask after the configured delay', async () => {
    vi.useFakeTimers()
    const { right } = createLayout()
    const { ctx, windowListeners } = registerAndCapture()
    right.classList.add(dragClassName)

    windowListeners.dragleave({} as DragEvent)
    await vi.advanceTimersByTimeAsync(49)
    expect(right.classList.contains(dragClassName)).toBe(true)

    await vi.advanceTimersByTimeAsync(1)
    expect(ctx.utils.sleep).toHaveBeenCalledWith(50)
    expect(right.classList.contains(dragClassName)).toBe(false)

    right.classList.add(dragClassName)
    windowListeners.dragend({} as DragEvent)
    await vi.advanceTimersByTimeAsync(50)
    expect(right.classList.contains(dragClassName)).toBe(false)
  })
})
