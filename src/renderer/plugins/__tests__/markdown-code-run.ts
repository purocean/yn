const mocks = vi.hoisted(() => ({
  actionHandler: vi.fn(),
  registerHook: vi.fn(),
  removeHook: vi.fn(),
  getAllRunners: vi.fn(() => []),
  useI18n: vi.fn(() => ({ t: (key: string, value?: string) => value ? `${key}:${value}` : key })),
}))

vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

vi.mock('@fe/core/action', () => ({
  getActionHandler: vi.fn(() => mocks.actionHandler),
}))

vi.mock('@fe/core/hook', () => ({
  registerHook: mocks.registerHook,
  removeHook: mocks.removeHook,
}))

vi.mock('@fe/core/keybinding', () => ({
  CtrlCmd: 'mod',
  getKeyLabel: vi.fn(() => 'Ctrl'),
  matchKeys: vi.fn(() => false),
}))

vi.mock('@fe/services/i18n', () => ({
  useI18n: mocks.useI18n,
}))

vi.mock('@fe/services/runner', () => ({
  getAllRunners: mocks.getAllRunners,
}))

vi.mock('@fe/support/args', () => ({
  DOM_CLASS_NAME: { SKIP_EXPORT: 'skip-export' },
  FLAG_DISABLE_XTERM: false,
}))

vi.mock('@fe/utils', () => ({
  getLogger: vi.fn(() => ({ debug: vi.fn() })),
  md5: vi.fn((value: string) => `hash:${value}`),
  sleep: vi.fn(() => Promise.resolve()),
}))

vi.mock('@fe/components/SvgIcon.vue', () => ({
  default: { name: 'svg-icon', props: ['name'] },
}))

import MarkdownIt from 'markdown-it'
import { h, nextTick } from 'vue'
import markdownCodeRun from '../markdown-code-run'

function createCtx (md: MarkdownIt) {
  return {
    editor: {
      whenEditorReady: vi.fn(() => Promise.resolve({
        editor: {
          addAction: vi.fn(),
          getModel: vi.fn(() => ({ getValueInRange: vi.fn(() => 'selected code') })),
          getSelection: vi.fn(() => ({})),
        },
        monaco: {
          KeyCode: { KeyR: 3 },
          KeyMod: { Alt: 1, Shift: 2 },
        },
      })),
    },
    i18n: { t: vi.fn((key: string) => key) },
    lib: { vue: { h } },
    markdown: {
      registerPlugin: vi.fn((plugin: any) => md.use(plugin)),
    },
    view: { addStyles: vi.fn() },
  } as any
}

function fenceToken (content: string, info = 'js') {
  return {
    content,
    info,
    meta: {},
  }
}

function getRunCodeComponent (md: MarkdownIt) {
  const baseNode: any = { children: [] }
  md.renderer.rules.fence = vi.fn(() => baseNode) as any
  markdownCodeRun.register(createCtx(md))

  const rendered = md.renderer.rules.fence!([fenceToken('// --run--\nconsole.log(1)')] as any, 0, md.options, {}, md.renderer as any) as any
  return rendered.children[0].type
}

function getOutputVNode (vnodes: any[]) {
  return Array.isArray(vnodes[1].children) ? vnodes[1].children[0] : vnodes[1].children
}

function findVNode (node: any, predicate: (node: any) => boolean): any {
  if (!node) {
    return undefined
  }

  if (Array.isArray(node)) {
    return node.map(child => findVNode(child, predicate)).find(Boolean)
  }

  if (predicate(node)) {
    return node
  }

  return findVNode(node.children, predicate)
}

describe('markdown-code-run plugin', () => {
  beforeEach(() => {
    mocks.actionHandler.mockClear()
    mocks.registerHook.mockClear()
    mocks.removeHook.mockClear()
    mocks.getAllRunners.mockReset()
    mocks.getAllRunners.mockReturnValue([])
  })

  test('registers styles, markdown plugin, and editor xterm action', async () => {
    const md = new MarkdownIt()
    const ctx = createCtx(md)

    markdownCodeRun.register(ctx)
    await ctx.editor.whenEditorReady.mock.results[0].value

    expect(ctx.view.addStyles).toHaveBeenCalledWith(expect.stringContaining('.p-mcr-run-code-action'), true)
    expect(ctx.markdown.registerPlugin).toHaveBeenCalledWith(expect.any(Function))
    expect((await ctx.editor.whenEditorReady.mock.results[0].value).editor.addAction).toHaveBeenCalledWith(expect.objectContaining({
      id: 'plugin.editor.run-in-xterm',
      keybindings: [3],
      run: expect.any(Function),
    }))
  })

  test('wraps runnable fences with a RunCode vnode and leaves safe mode or normal fences untouched', () => {
    const md = new MarkdownIt()
    markdownCodeRun.register(createCtx(md))

    const originalNode: any = { children: ['code'] }
    md.renderer.rules.fence = vi.fn(() => originalNode) as any
    markdownCodeRun.register(createCtx(md))

    const runnable = md.renderer.rules.fence!([fenceToken('// --run--\nconsole.log(1)')] as any, 0, md.options, {}, md.renderer as any) as any
    const normal = md.renderer.rules.fence!([fenceToken('console.log(1)')] as any, 0, md.options, {}, md.renderer as any) as any
    const safe = md.renderer.rules.fence!([fenceToken('// --run--\nconsole.log(1)')] as any, 0, md.options, { safeMode: true }, md.renderer as any) as any

    expect(runnable.children).toHaveLength(2)
    expect(runnable.children[1].type.name).toBe('run-code')
    expect(runnable.children[1].props).toMatchObject({
      code: '// --run--\nconsole.log(1)',
      firstLine: '// --run--',
      language: 'js',
    })
    expect(normal).toBe(originalNode)
    expect(safe).toBe(originalNode)
  })

  test('run-code component renders no-runner output through click handler', async () => {
    const md = new MarkdownIt()
    markdownCodeRun.register(createCtx(md))
    const baseNode: any = { children: [] }
    md.renderer.rules.fence = vi.fn(() => baseNode) as any
    markdownCodeRun.register(createCtx(md))

    const rendered = md.renderer.rules.fence!([fenceToken('// --run--\nconsole.log(1)')] as any, 0, md.options, {}, md.renderer as any) as any
    const component = rendered.children[0].type
    const render = component.setup({ code: 'console.log(1)', language: 'js', firstLine: '// --run--' })
    const vnode = render()

    expect(mocks.registerHook).toHaveBeenCalledWith('CODE_RUNNER_CHANGE', expect.any(Function))
    await vnode[0].children[0].props.onClick()
    await nextTick()

    const updated = render()
    const output = Array.isArray(updated[1].children) ? updated[1].children[0] : updated[1].children
    expect(output.props.innerHTML).toBe("No runner found for language 'js'")
  })

  test('run-code component appends html and plain runner output, then clears cached result', async () => {
    const md = new MarkdownIt()
    markdownCodeRun.register(createCtx(md))
    const runner = {
      match: vi.fn(() => true),
      getTerminalCmd: vi.fn(() => null),
      run: vi.fn(async (_language: string, _code: string, opts: any) => {
        opts.flusher('html', '<b>one</b>')
        opts.flusher('plain', '<two>')
        return { type: 'plain', value: 'three' }
      }),
    }
    mocks.getAllRunners.mockReturnValue([runner])
    const component = getRunCodeComponent(md)
    const render = component.setup({ code: '// --run--\nconsole.log(1)', language: 'js', firstLine: '// --run--' })

    await render()[0].children[0].props.onClick()
    await nextTick()

    const updated = render()
    const output = getOutputVNode(updated)
    expect(output.props.innerHTML).toBe('<b>one</b>&lt;two&gt;three')
    expect(runner.run).toHaveBeenCalledWith('js', '// --run--\nconsole.log(1)', expect.objectContaining({
      signal: expect.any(AbortSignal),
      flusher: expect.any(Function),
    }))

    const clearButton = findVNode(updated, node => node.props?.class === 'p-mcr-clear-btn')
    clearButton.props.onClick()
    expect(getOutputVNode(render()).props.innerHTML).toBe('')
  })

  test('run-code component consumes readable streams and routes xterm runs with modifier-aware exit', async () => {
    const md = new MarkdownIt()
    markdownCodeRun.register(createCtx(md))
    const reader = {
      read: vi.fn()
        .mockResolvedValueOnce({ done: false, value: new Uint8Array([65, 66]) })
        .mockResolvedValueOnce({ done: false, value: 'C' })
        .mockResolvedValueOnce({ done: true, value: 'D' }),
    }
    const runner = {
      match: vi.fn(() => true),
      getTerminalCmd: vi.fn(() => ({ start: 'node $tmpFile', exit: 'rm $tmpFile' })),
      run: vi.fn(async () => ({ type: 'plain', value: reader })),
    }
    mocks.getAllRunners.mockReturnValue([runner])
    const component = getRunCodeComponent(md)
    const render = component.setup({ code: '// --run--\nconsole.log(1)', language: 'js', firstLine: '// --run--' })

    const first = render()
    expect(first[0].children[1].props.hidden).toBe(false)
    first[0].children[1].props.onClick(new MouseEvent('click'))
    expect(mocks.actionHandler).toHaveBeenCalledWith({
      code: '// --run--\nconsole.log(1)',
      start: 'node $tmpFile',
      exit: 'rm $tmpFile',
    })

    await first[0].children[0].props.onClick()
    await nextTick()

    const output = getOutputVNode(render())
    expect(output.props.innerHTML).toBe('ABCD')
    expect(reader.read).toHaveBeenCalledTimes(3)
  })

  test('run-code component truncates long output and reports non-abort errors', async () => {
    const md = new MarkdownIt()
    markdownCodeRun.register(createCtx(md))
    const runner = {
      match: vi.fn(() => true),
      getTerminalCmd: vi.fn(() => null),
      run: vi.fn(async (_language: string, _code: string, opts: any) => {
        opts.flusher('plain', 'x'.repeat(33 * 1024))
        throw new Error('boom')
      }),
    }
    mocks.getAllRunners.mockReturnValue([runner])
    const component = getRunCodeComponent(md)
    const render = component.setup({ code: '// --run--\nconsole.log(1)', language: 'js', firstLine: '// --run--' })

    await render()[0].children[0].props.onClick()
    await nextTick()

    const output = getOutputVNode(render())
    expect(output.props.innerHTML).toContain('------Output too long, truncated to 32K------')
    expect(output.props.innerHTML).toContain('boom')
  })
})
