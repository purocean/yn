const hookMocks = vi.hoisted(() => ({
  registerHook: vi.fn(),
  removeHook: vi.fn(),
}))

vi.mock('@fe/core/hook', () => hookMocks)

import directives, {
  autoFocus,
  autoResize,
  autoZIndex,
  fixedFloat,
  placeholder,
  textareaOnEnter,
  upDownHistory,
} from '@fe/directives'

function createApp () {
  const registered = new Map<string, any>()
  return {
    registered,
    app: {
      directive: vi.fn((name: string, definition: any) => {
        registered.set(name, definition)
      }),
    } as any,
  }
}

function installOne (installer: { install: (app: any) => void }, name: string) {
  const { app, registered } = createApp()
  installer.install(app)
  return registered.get(name)
}

describe('renderer directives', () => {
  beforeEach(() => {
    vi.useRealTimers()
    hookMocks.registerHook.mockClear()
    hookMocks.removeHook.mockClear()
  })

  test('registers all built-in directives', () => {
    const { app, registered } = createApp()

    directives(app)

    expect(app.directive).toHaveBeenCalledTimes(7)
    expect([...registered.keys()]).toEqual([
      'auto-focus',
      'auto-resize',
      'placeholder',
      'up-down-history',
      'fixed-float',
      'textarea-on-enter',
      'auto-z-index',
    ])
  })

  test('auto-focus focuses immediately, on next tick, or after delay', async () => {
    const directive = installOne(autoFocus, 'auto-focus')
    const immediate = document.createElement('input')
    const delayed = document.createElement('input')
    const next = document.createElement('input')
    vi.spyOn(immediate, 'focus')
    vi.spyOn(delayed, 'focus')
    vi.spyOn(next, 'focus')

    directive.mounted(immediate, { value: {} })
    expect(immediate.focus).toHaveBeenCalled()

    vi.useFakeTimers()
    directive.mounted(delayed, { value: { delay: 20 } })
    expect(delayed.focus).not.toHaveBeenCalled()
    vi.advanceTimersByTime(20)
    expect(delayed.focus).toHaveBeenCalled()

    directive.mounted(next, { value: { delay: true } })
    await Promise.resolve()
    expect(next.focus).toHaveBeenCalled()
  })

  test('auto-resize clamps height and reacts to input', async () => {
    const directive = installOne(autoResize, 'auto-resize')
    const textarea = document.createElement('textarea')
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      lineHeight: '10px',
      paddingTop: '2px',
      paddingBottom: '3px',
    } as CSSStyleDeclaration)
    Object.defineProperty(textarea, 'scrollHeight', { value: 50, configurable: true })

    directive.mounted(textarea, { value: { minRows: 2, maxRows: 4 } })
    textarea.dispatchEvent(new Event('input'))

    expect(textarea.style.height).toBe('45px')
    expect(textarea.style.overflowY).toBe('auto')

    Object.defineProperty(textarea, 'scrollHeight', { value: 30, configurable: true })
    textarea.dispatchEvent(new Event('input'))
    expect(textarea.style.height).toBe('30px')
    expect(textarea.style.overflowY).toBe('hidden')
  })

  test('placeholder switches text on focus and blur', () => {
    const directive = installOne(placeholder, 'placeholder')
    const input = document.createElement('input')

    directive.mounted(input, { value: { focus: 'typing', blur: 'idle' } })

    expect(input.placeholder).toBe('idle')
    input.dispatchEvent(new Event('focus'))
    expect(input.placeholder).toBe('typing')
    input.dispatchEvent(new Event('blur'))
    expect(input.placeholder).toBe('idle')
  })

  test('textarea-on-enter calls callback or inserts newline with modifiers', () => {
    const directive = installOne(textareaOnEnter, 'textarea-on-enter')
    const textarea = document.createElement('textarea')
    const submit = vi.fn()
    const inputListener = vi.fn()
    textarea.value = 'hello'
    textarea.setSelectionRange(2, 2)
    textarea.addEventListener('input', inputListener)

    directive.mounted(textarea, { value: submit })

    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(submit).toHaveBeenCalledTimes(1)

    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true }))
    expect(textarea.value).toBe('he\nllo')
    expect(inputListener).toHaveBeenCalled()
    expect(textarea.selectionStart).toBe(3)
  })

  test('up-down-history records enter submissions and navigates with arrows', () => {
    const directive = installOne(upDownHistory, 'up-down-history')
    const textarea = document.createElement('textarea')
    const inputListener = vi.fn()
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      lineHeight: '20px',
      paddingTop: '0px',
      paddingBottom: '0px',
    } as CSSStyleDeclaration)
    Object.defineProperty(textarea, 'clientHeight', { value: 10, configurable: true })
    textarea.addEventListener('input', inputListener)

    directive.mounted(textarea, { value: { maxLength: 2 } })

    textarea.value = 'first'
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    textarea.value = 'second'
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    textarea.value = 'draft'
    textarea.setSelectionRange(0, 0)
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }))

    expect(textarea.value).toBe('first')
    expect(inputListener).toHaveBeenCalled()

    textarea.setSelectionRange(textarea.value.length, textarea.value.length)
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
    expect(textarea.value).toBe('second')
  })

  test('fixed-float manages focus, blur, self-click, and escape close reasons', () => {
    const directive = installOne(fixedFloat, 'fixed-float')
    const el = document.createElement('div')
    const onClose = vi.fn()
    const onBlur = vi.fn()
    const onEsc = vi.fn()
    vi.spyOn(el, 'focus')

    directive.mounted(el, { value: { onClose, onBlur, onEsc } })

    expect(el.tabIndex).toBe(0)
    expect(el.style.outline).toContain('none')
    expect(el.focus).toHaveBeenCalled()

    el.dispatchEvent(new FocusEvent('blur'))
    expect(onBlur).toHaveBeenLastCalledWith(false)
    expect(onClose).toHaveBeenLastCalledWith('blur')

    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    el.dispatchEvent(new FocusEvent('blur'))
    expect(onBlur).toHaveBeenLastCalledWith(true)
    expect(onClose).toHaveBeenLastCalledWith('byClickSelf')

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(onEsc).toHaveBeenCalled()
    expect(onClose).toHaveBeenLastCalledWith('esc')
  })

  test('auto-z-index bumps layers and unregisters escape handler', () => {
    const directive = installOne(autoZIndex, 'auto-z-index')
    const lower = document.createElement('div')
    const top = document.createElement('div')
    const lowerEsc = vi.fn()
    const topEsc = vi.fn()

    directive.mounted(lower, { value: { layer: 'modal', onEsc: lowerEsc } })
    directive.mounted(top, { value: { layer: 'modal', onEsc: topEsc } })

    expect(Number(top.style.zIndex)).toBeGreaterThan(Number(lower.style.zIndex))
    expect(hookMocks.registerHook).toHaveBeenCalledTimes(2)

    const lowerHandler = hookMocks.registerHook.mock.calls[0][1]
    const topHandler = hookMocks.registerHook.mock.calls[1][1]
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    vi.spyOn(escape, 'stopPropagation')
    lowerHandler(escape)
    expect(lowerEsc).not.toHaveBeenCalled()
    topHandler(escape)
    expect(topEsc).toHaveBeenCalled()
    expect(escape.stopPropagation).toHaveBeenCalled()

    directive.beforeUnmount(top)
    expect(hookMocks.removeHook).toHaveBeenCalledWith('GLOBAL_KEYDOWN', topHandler)
  })
})
