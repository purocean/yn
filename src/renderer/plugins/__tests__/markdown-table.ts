const mocks = vi.hoisted(() => {
  const lines = new Map<number, string>()
  return {
    lines,
    replaceLine: vi.fn((line: number, text: string) => lines.set(line, text)),
    deleteLine: vi.fn((line: number) => lines.delete(line)),
    disableSyncScrollAwhile: vi.fn((fn: () => void) => fn()),
    renderImmediately: vi.fn(),
    hasCtrlCmd: vi.fn(() => false),
    modalInput: vi.fn(),
    sortableOptions: [] as any[],
    sortableInstances: [] as any[],
    toastShow: vi.fn(),
  }
})

vi.mock('sortablejs', () => ({
  default: {
    create: vi.fn((_el: HTMLElement, options: any) => {
      const instance = {
        toArray: vi.fn(() => ['a', 'b']),
        sort: vi.fn(),
        destroy: vi.fn(),
      }
      mocks.sortableOptions.push(options)
      mocks.sortableInstances.push(instance)
      return instance
    }),
  },
}))

vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

vi.mock('@fe/support/ui/modal', () => ({
  useModal: vi.fn(() => ({
    input: mocks.modalInput,
  })),
}))

vi.mock('@fe/core/keybinding', () => ({
  hasCtrlCmd: mocks.hasCtrlCmd,
}))

vi.mock('@fe/support/args', () => ({
  DOM_ATTR_NAME: {
    TOKEN_IDX: 'data-token-idx',
  },
  FLAG_READONLY: false,
}))

vi.mock('@fe/support/ui/toast', () => ({
  useToast: vi.fn(() => ({
    show: mocks.toastShow,
  })),
}))

vi.mock('@fe/services/view', () => ({
  disableSyncScrollAwhile: mocks.disableSyncScrollAwhile,
  renderImmediately: mocks.renderImmediately,
}))

vi.mock('@fe/services/editor', () => ({
  getLineContent: vi.fn((line: number) => mocks.lines.get(line) || ''),
  deleteLine: mocks.deleteLine,
  replaceLine: mocks.replaceLine,
  getEditor: vi.fn(() => ({
    getModel: () => ({ getLineLength: (line: number) => (mocks.lines.get(line) || '').length }),
    executeEdits: vi.fn((_source: string, edits: any[]) => {
      const range = edits[0].range
      mocks.lines.set(range.startLineNumber, edits[0].text)
    }),
    setPosition: vi.fn(),
    focus: vi.fn(),
  })),
  getMonaco: vi.fn(() => ({
    Range: class {
      startLineNumber: number
      constructor (startLineNumber: number) {
        this.startLineNumber = startLineNumber
      }
    },
    Position: class {},
  })),
}))

vi.mock('@fe/services/i18n', () => ({
  t: vi.fn((key: string) => key),
}))

vi.mock('@fe/utils', () => ({
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
  })),
}))

import MarkdownIt from 'markdown-it'
import { h } from 'vue'
import markdownTable from '../markdown-table'

function createCtx (md: MarkdownIt) {
  return {
    args: { FLAG_READONLY: false },
    editor: {
      getLineContent: vi.fn((line: number) => mocks.lines.get(line) || ''),
    },
    i18n: { t: vi.fn((key: string) => key) },
    lib: { vue: { h } },
    markdown: {
      registerPlugin: vi.fn((plugin: any, options?: any) => md.use(plugin, options)),
    },
    registerHook: vi.fn(),
    theme: { addStyles: vi.fn() },
    ui: {
      useToast: vi.fn(() => ({ show: mocks.toastShow })),
    },
    view: {
      addStyles: vi.fn(),
      getViewDom: vi.fn(() => document.createElement('div')),
      tapContextMenus: vi.fn(),
    },
  } as any
}

function buildTableDom () {
  const table = document.createElement('table')
  const thead = document.createElement('thead')
  const tbody = document.createElement('tbody')
  const headRow = document.createElement('tr')
  const bodyRowA = document.createElement('tr')
  const bodyRowB = document.createElement('tr')

  const th1 = document.createElement('th')
  const th2 = document.createElement('th')
  th1.className = 'yn-table-cell'
  th2.className = 'yn-table-cell'
  th1.dataset.sourceLine = '1'
  th1.dataset.sourceLineEnd = '2'
  th2.dataset.sourceLine = '1'
  th2.dataset.sourceLineEnd = '2'
  headRow.append(th1, th2)
  thead.append(headRow)

  const rowA1 = document.createElement('td')
  const rowA2 = document.createElement('td')
  rowA1.className = 'yn-table-cell'
  rowA2.className = 'yn-table-cell'
  rowA1.dataset.sourceLine = '3'
  rowA1.dataset.sourceLineEnd = '4'
  rowA2.dataset.sourceLine = '3'
  rowA2.dataset.sourceLineEnd = '4'
  bodyRowA.append(rowA1, rowA2)

  const rowB1 = document.createElement('td')
  const rowB2 = document.createElement('td')
  rowB1.className = 'yn-table-cell'
  rowB2.className = 'yn-table-cell'
  rowB1.dataset.sourceLine = '4'
  rowB1.dataset.sourceLineEnd = '5'
  rowB2.dataset.sourceLine = '4'
  rowB2.dataset.sourceLineEnd = '5'
  bodyRowB.append(rowB1, rowB2)

  tbody.append(bodyRowA, bodyRowB)
  table.append(thead, tbody)
  document.body.appendChild(table)

  return { rowA1, rowA2, table, th2 }
}

function getMenusForTarget (ctx: any, target: HTMLElement, eventType = 'contextmenu') {
  const menus: any[] = []
  const tap = ctx.view.tapContextMenus.mock.calls[0][0]
  tap(menus, {
    type: eventType,
    target,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  })
  return menus
}

describe('markdown-table plugin', () => {
  beforeEach(() => {
    mocks.lines.clear()
    mocks.replaceLine.mockClear()
    mocks.deleteLine.mockClear()
    mocks.disableSyncScrollAwhile.mockClear()
    mocks.hasCtrlCmd.mockReset()
    mocks.hasCtrlCmd.mockReturnValue(false)
    mocks.modalInput.mockReset()
    mocks.sortableOptions.length = 0
    mocks.sortableInstances.length = 0
    mocks.toastShow.mockClear()
    document.body.innerHTML = ''
  })

  test('registers styles, markdown rules, hooks, and context menus', () => {
    const md = new MarkdownIt({ html: true })
    const ctx = createCtx(md)

    markdownTable.register(ctx)

    expect(ctx.view.addStyles).toHaveBeenCalledWith(expect.stringContaining('.table-wrapper'))
    expect(ctx.theme.addStyles).toHaveBeenCalledWith(expect.stringContaining('.plugin-table-cell-edit-insert-nums'))
    expect(ctx.markdown.registerPlugin).toHaveBeenCalledWith(expect.any(Function))
    expect(ctx.registerHook.mock.calls.map(([name]: any[]) => name)).toEqual([
      'VIEW_ELEMENT_DBCLICK',
      'VIEW_ELEMENT_CLICK',
      'VIEW_RENDERED',
      'VIEW_ON_GET_HTML_FILTER_NODE',
    ])
    expect(ctx.view.tapContextMenus).toHaveBeenCalledWith(expect.any(Function))
  })

  test('wraps table_open output and injects editable cell classes', () => {
    const md = new MarkdownIt({ html: true })
    markdownTable.register(createCtx(md))
    const tokens = md.parse('| A | B |\n| - | - |\n| 1 | 2 |', {})
    const tableIndex = tokens.findIndex(token => token.type === 'table_open')
    const thIndex = tokens.findIndex(token => token.type === 'th_open')
    const tdIndex = tokens.findIndex(token => token.type === 'td_open')

    const tableResult = md.renderer.rules.table_open!(tokens, tableIndex, md.options, {}, md.renderer as any) as any
    const thHtml = md.renderer.rules.th_open!(tokens, thIndex, md.options, {}, md.renderer as any)
    const tdHtml = md.renderer.rules.td_open!(tokens, tdIndex, md.options, {}, md.renderer as any)

    expect(tableResult.node.type).toBe('div')
    expect(tableResult.node.props.class).toBe('table-wrapper')
    expect(tableResult.node.children).toBe('<table>\n')
    expect(thHtml).toBe('<th class="yn-table-cell">')
    expect(tdHtml).toBe('<td class="yn-table-cell">')
  })

  test('context menu alignment rewrites the selected table column alignment row', () => {
    const md = new MarkdownIt()
    const ctx = createCtx(md)
    markdownTable.register(ctx)
    mocks.lines.set(1, '| Name | Score |')
    mocks.lines.set(2, '| --- | --- |')
    mocks.lines.set(3, '| A | 2 |')
    mocks.lines.set(4, '| B | 1 |')
    const { rowA2 } = buildTableDom()
    const menus = getMenusForTarget(ctx, rowA2)

    menus.find(menu => menu.id === 'plugin.table.cell-edit.align-right').onClick()

    expect(mocks.replaceLine).toHaveBeenCalledWith(2, '| --- | ---: |')
    expect(mocks.disableSyncScrollAwhile).toHaveBeenCalled()
  })

  test('context menu sorts body rows numerically and preserves escaped pipe cells', () => {
    const md = new MarkdownIt()
    const ctx = createCtx(md)
    markdownTable.register(ctx)
    mocks.lines.set(1, '| Name | Score |')
    mocks.lines.set(2, '| --- | --- |')
    mocks.lines.set(3, '| A\\|x | 10 |')
    mocks.lines.set(4, '| B | 2 |')
    const { rowA2 } = buildTableDom()
    const menus = getMenusForTarget(ctx, rowA2)

    menus.find(menu => menu.id === 'plugin.table.cell-edit.sort-asc').onClick()

    expect(mocks.replaceLine).toHaveBeenNthCalledWith(1, 3, '| B | 2 |')
    expect(mocks.replaceLine).toHaveBeenNthCalledWith(2, 4, '| A\\|x | 10 |')
  })

  test('context menu can add and delete columns across all markdown table rows', () => {
    const md = new MarkdownIt()
    const ctx = createCtx(md)
    markdownTable.register(ctx)
    mocks.lines.set(1, '| Name | Score |')
    mocks.lines.set(2, '| --- | --- |')
    mocks.lines.set(3, '| A | 10 |')
    mocks.lines.set(4, '| B | 2 |')
    const { rowA2 } = buildTableDom()
    const menus = getMenusForTarget(ctx, rowA2)

    menus.find(menu => menu.id === 'plugin.table.cell-edit.add-col-left').onClick()

    expect(mocks.lines.get(1)).toBe('| Name | -- | Score |')
    expect(mocks.lines.get(2)).toBe('| --- | -- | --- |')
    expect(mocks.lines.get(3)).toBe('| A | -- | 10 |')
    expect(mocks.lines.get(4)).toBe('| B | -- | 2 |')

    getMenusForTarget(ctx, rowA2).find(menu => menu.id === 'plugin.table.cell-edit.delete-col').onClick()

    expect(mocks.lines.get(1)).toBe('| Name | Score |')
    expect(mocks.lines.get(2)).toBe('| --- | --- |')
    expect(mocks.lines.get(3)).toBe('| A | 10 |')
    expect(mocks.lines.get(4)).toBe('| B | 2 |')
  })

  test('context menu can add and delete markdown table rows', () => {
    const md = new MarkdownIt()
    const ctx = createCtx(md)
    markdownTable.register(ctx)
    mocks.lines.set(1, '| Name | Score |')
    mocks.lines.set(2, '| --- | --- |')
    mocks.lines.set(3, '| A | 10 |')
    mocks.lines.set(4, '| B | 2 |')
    const { rowA1 } = buildTableDom()
    const menus = getMenusForTarget(ctx, rowA1)

    menus.find(menu => menu.id === 'plugin.table.cell-edit.add-row-above').onClick()
    expect(mocks.replaceLine).toHaveBeenLastCalledWith(3, '| --- | --- |\n| A | 10 |')

    mocks.lines.set(3, '| A | 10 |')
    menus.find(menu => menu.id === 'plugin.table.cell-edit.add-row-below').onClick()
    expect(mocks.replaceLine).toHaveBeenLastCalledWith(3, '| A | 10 |\n| --- | --- |')

    menus.find(menu => menu.id === 'plugin.table.cell-edit.delete-row').onClick()
    expect(mocks.deleteLine).toHaveBeenCalledWith(3)
  })

  test('context menus reject invalid table shapes and invalid source line spans', () => {
    const md = new MarkdownIt()
    const ctx = createCtx(md)
    markdownTable.register(ctx)
    mocks.lines.set(1, '| Name | Score |')
    mocks.lines.set(2, '| --- | --- |')
    mocks.lines.set(3, '| A | 10 |')
    mocks.lines.set(4, '| B | 2 |')
    const { rowA1, rowA2 } = buildTableDom()

    rowA1.dataset.sourceLineEnd = '6'
    getMenusForTarget(ctx, rowA2).find(menu => menu.id === 'plugin.table.cell-edit.add-col-right').onClick()
    expect(mocks.replaceLine).not.toHaveBeenCalled()

    mocks.lines.set(2, '| | --- |')
    expect(() => getMenusForTarget(ctx, rowA1)).toThrow('Incorrect table format')
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'Incorrect table format')
  })

  test('modal and quick cell editing rewrite escaped cell content and support cancellation', async () => {
    const md = new MarkdownIt()
    const ctx = createCtx(md)
    markdownTable.register(ctx)
    mocks.lines.set(1, '| Name | Score |')
    mocks.lines.set(2, '| --- | --- |')
    mocks.lines.set(3, '| A | 10 |')
    mocks.lines.set(4, '| B | 2 |')
    const { rowA2 } = buildTableDom()
    const menus = getMenusForTarget(ctx, rowA2)

    mocks.modalInput.mockResolvedValue('20|x')
    menus.find(menu => menu.id === 'plugin.table.cell-edit.edit').onClick()
    await Promise.resolve()
    await Promise.resolve()

    expect(mocks.modalInput).toHaveBeenCalledWith(expect.objectContaining({
      title: 'table-cell-edit.edit-title',
      value: '10',
    }))
    expect(mocks.replaceLine).toHaveBeenLastCalledWith(3, '| A | 20\\|x |')

    mocks.modalInput.mockResolvedValue(undefined)
    menus.find(menu => menu.id === 'plugin.table.cell-edit.edit').onClick()
    await Promise.resolve()
    await Promise.resolve()

    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'table-cell-edit.canceled')

    const dbClick = new MouseEvent('dblclick', { bubbles: true })
    Object.defineProperty(dbClick, 'target', { value: rowA2 })
    ctx.registerHook.mock.calls.find(([name]: any[]) => name === 'VIEW_ELEMENT_DBCLICK')[1]({ e: dbClick })
    const input = rowA2.querySelector('textarea')!
    input.value = '30'
    input.dispatchEvent(new Event('blur'))
    await Promise.resolve()

    expect(mocks.replaceLine).toHaveBeenLastCalledWith(3, '| A | 30 |')
  })

  test('quick cell editing handles keyboard cancellation and link-style navigation', async () => {
    vi.useFakeTimers()
    const md = new MarkdownIt()
    const ctx = createCtx(md)
    markdownTable.register(ctx)
    mocks.lines.set(1, '| Name | Score |')
    mocks.lines.set(2, '| --- | --- |')
    mocks.lines.set(3, '| A | 10 |')
    mocks.lines.set(4, '| B | 2 |')
    const { rowA1, rowA2 } = buildTableDom()

    getMenusForTarget(ctx, rowA2).find(menu => menu.id === 'plugin.table.cell-edit.quick-edit').onClick()
    let input = rowA2.querySelector('textarea')!
    input.value = '99'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await Promise.resolve()
    expect(mocks.replaceLine).not.toHaveBeenCalled()

    getMenusForTarget(ctx, rowA1).find(menu => menu.id === 'plugin.table.cell-edit.quick-edit').onClick()
    input = rowA1.querySelector('textarea')!
    input.value = 'A2'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    await Promise.resolve()
    await Promise.resolve()
    vi.runOnlyPendingTimers()
    await Promise.resolve()

    vi.useRealTimers()
    expect(mocks.replaceLine).toHaveBeenCalledWith(3, '| A2 | 10 |')
  })

  test('sort mode restores DOM order then rewrites columns and rows from drag callbacks', async () => {
    const md = new MarkdownIt()
    const ctx = createCtx(md)
    markdownTable.register(ctx)
    mocks.lines.set(1, '| Name | Score |')
    mocks.lines.set(2, '| --- | ---: |')
    mocks.lines.set(3, '| A | 10 |')
    mocks.lines.set(4, '| B | 2 |')
    const { rowA1, table } = buildTableDom()
    const menus = getMenusForTarget(ctx, rowA1)

    menus.find(menu => menu.id === 'plugin.table.cell-edit.sort-mode').onClick()

    expect(table.getAttribute('sort-mode')).toBe('true')
    expect(mocks.sortableOptions).toHaveLength(2)

    mocks.sortableOptions[0].onEnd({ oldIndex: 0, newIndex: 1 })
    expect(mocks.sortableInstances[0].sort).toHaveBeenCalledWith(['b', 'a'])
    expect(mocks.lines.get(1)).toBe('| Score | Name |')
    expect(mocks.lines.get(2)).toBe('| ---: | --- |')
    expect(mocks.lines.get(3)).toBe('| 10 | A |')
    expect(mocks.renderImmediately).toHaveBeenCalled()

    mocks.sortableOptions[1].onEnd({ oldIndex: 0, newIndex: 1 })
    expect(mocks.sortableInstances[1].sort).toHaveBeenCalledWith(['b', 'a'])
    expect(mocks.deleteLine).toHaveBeenCalledWith(3)
    expect(mocks.replaceLine).toHaveBeenLastCalledWith(4, '| 10 | A |\n| 2 | B |')

    table.onkeydown!(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(table.hasAttribute('sort-mode')).toBe(false)
    expect(mocks.sortableInstances[0].destroy).toHaveBeenCalled()
    expect(mocks.sortableInstances[1].destroy).toHaveBeenCalled()

    await Promise.resolve()
  })

  test('html filter strips table sizing before export', () => {
    const md = new MarkdownIt()
    const ctx = createCtx(md)
    markdownTable.register(ctx)
    const filter = ctx.registerHook.mock.calls.find(([name]: any[]) => name === 'VIEW_ON_GET_HTML_FILTER_NODE')[1]
    const table = document.createElement('table')
    table.style.width = '400px'
    table.style.height = '200px'

    filter({ node: table })

    expect(table.style.width).toBe('')
    expect(table.style.height).toBe('')
  })
})
