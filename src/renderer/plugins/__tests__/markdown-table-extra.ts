const mocks = vi.hoisted(() => {
  const lines = new Map<number, string>()
  const editorInstance = {
    getModel: () => ({ getLineLength: (line: number) => (lines.get(line) || '').length }),
    executeEdits: vi.fn((_source: string, edits: any[]) => {
      const range = edits[0].range
      lines.set(range.startLineNumber, edits[0].text)
    }),
    setPosition: vi.fn(),
    focus: vi.fn(),
  }

  return {
    lines,
    editorInstance,
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
        toArray: vi.fn(() => ['a', 'b', 'c']),
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
  getEditor: vi.fn(() => mocks.editorInstance),
  getMonaco: vi.fn(() => ({
    Range: class {
      startLineNumber: number
      constructor (startLineNumber: number) {
        this.startLineNumber = startLineNumber
      }
    },
    Position: class {
      lineNumber: number
      column: number
      constructor (lineNumber: number, column: number) {
        this.lineNumber = lineNumber
        this.column = column
      }
    },
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

function createCtx (md = new MarkdownIt(), viewDom = document.createElement('div')) {
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
      getViewDom: vi.fn(() => viewDom),
      tapContextMenus: vi.fn(),
    },
  } as any
}

function setTableLines () {
  mocks.lines.set(1, '| Name | Score | Note |')
  mocks.lines.set(2, '| :---: | --- | ---: |')
  mocks.lines.set(3, '| A | 10 | z |')
  mocks.lines.set(4, '| B | 2 | a |')
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
  const th3 = document.createElement('th')
  ;[th1, th2, th3].forEach(th => {
    th.className = 'yn-table-cell'
    th.dataset.sourceLine = '1'
    th.dataset.sourceLineEnd = '2'
  })
  headRow.append(th1, th2, th3)
  thead.append(headRow)

  const rowA = [document.createElement('td'), document.createElement('td'), document.createElement('td')]
  const rowB = [document.createElement('td'), document.createElement('td'), document.createElement('td')]
  rowA.forEach(td => {
    td.className = 'yn-table-cell'
    td.dataset.sourceLine = '3'
    td.dataset.sourceLineEnd = '4'
  })
  rowB.forEach(td => {
    td.className = 'yn-table-cell'
    td.dataset.sourceLine = '4'
    td.dataset.sourceLineEnd = '5'
  })
  bodyRowA.append(...rowA)
  bodyRowB.append(...rowB)
  tbody.append(bodyRowA, bodyRowB)
  table.append(thead, tbody)
  document.body.appendChild(table)

  return { table, th1, th2, th3, rowA1: rowA[0], rowA2: rowA[1], rowA3: rowA[2], rowB2: rowB[1] }
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

function getHook (ctx: any, name: string) {
  return ctx.registerHook.mock.calls.find(([hookName]: any[]) => hookName === name)[1]
}

describe('markdown-table plugin extra coverage', () => {
  beforeEach(() => {
    vi.useRealTimers()
    mocks.lines.clear()
    mocks.replaceLine.mockClear()
    mocks.deleteLine.mockClear()
    mocks.disableSyncScrollAwhile.mockClear()
    mocks.renderImmediately.mockClear()
    mocks.hasCtrlCmd.mockReset()
    mocks.hasCtrlCmd.mockReturnValue(false)
    mocks.modalInput.mockReset()
    mocks.sortableOptions.length = 0
    mocks.sortableInstances.length = 0
    mocks.toastShow.mockClear()
    mocks.editorInstance.executeEdits.mockClear()
    mocks.editorInstance.setPosition.mockClear()
    mocks.editorInstance.focus.mockClear()
    document.body.innerHTML = ''
  })

  test('rendered hook annotates legacy table cells and respects readonly context', () => {
    const viewDom = document.createElement('div')
    const legacyCell = document.createElement('td')
    legacyCell.className = 'yank-table-cell'
    viewDom.appendChild(legacyCell)
    const ctx = createCtx(new MarkdownIt(), viewDom)
    markdownTable.register(ctx)

    getHook(ctx, 'VIEW_RENDERED')()
    expect(legacyCell.title).toBe('table-cell-edit.db-click-edit')

    legacyCell.title = ''
    ctx.args.FLAG_READONLY = true
    getHook(ctx, 'VIEW_RENDERED')()
    expect(legacyCell.title).toBe('')
  })

  test('context menu ignores readonly, non-table-cell, and table cells without source rows', () => {
    const ctx = createCtx()
    markdownTable.register(ctx)
    const tap = ctx.view.tapContextMenus.mock.calls[0][0]
    const menus: any[] = []
    const plain = document.createElement('td')

    tap(menus, { target: plain })
    expect(menus).toEqual([])

    plain.className = 'yn-table-cell'
    tap(menus, { target: plain })
    expect(menus).toEqual([])

    ctx.args.FLAG_READONLY = true
    setTableLines()
    const { rowA1 } = buildTableDom()
    tap(menus, { target: rowA1 })
    expect(menus).toEqual([])
  })

  test('header menus omit row actions and exercise alignment visibility/actions', () => {
    const ctx = createCtx()
    markdownTable.register(ctx)
    setTableLines()
    const { th1 } = buildTableDom()

    const menus = getMenusForTarget(ctx, th1)
    expect(menus.find(menu => menu.id === 'plugin.table.cell-edit.add-row-above')).toBeUndefined()
    expect(menus.find(menu => menu.id === 'plugin.table.cell-edit.align-center').hidden).toBe(true)
    expect(menus.find(menu => menu.id === 'plugin.table.cell-edit.align-normal').hidden).toBe(false)

    menus.find(menu => menu.id === 'plugin.table.cell-edit.align-left').onClick()
    expect(mocks.replaceLine).toHaveBeenLastCalledWith(2, '| :--- | --- | ---: |')

    mocks.lines.set(2, '| :---: | --- | ---: |')
    menus.find(menu => menu.id === 'plugin.table.cell-edit.align-center').onClick()
    expect(mocks.replaceLine).toHaveBeenLastCalledWith(2, '| :---: | --- | ---: |')

    menus.find(menu => menu.id === 'plugin.table.cell-edit.align-normal').onClick()
    expect(mocks.replaceLine).toHaveBeenLastCalledWith(2, '| --- | --- | ---: |')
  })

  test('insert number inputs update persisted counts and stop menu events', () => {
    const ctx = createCtx()
    markdownTable.register(ctx)
    setTableLines()
    const { rowA2 } = buildTableDom()
    const menus = getMenusForTarget(ctx, rowA2)
    const addRight = menus.find(menu => menu.id === 'plugin.table.cell-edit.add-col-right')
    const inputVNode = addRight.label.children[1]
    const stopped = { stopPropagation: vi.fn(), target: { value: '3', parentNode: { click: vi.fn() } }, keyCode: 13 }

    inputVNode.props.onInput(stopped)
    inputVNode.props.onClick(stopped)
    inputVNode.props.onKeyup(stopped)
    addRight.onClick()

    expect(stopped.stopPropagation).toHaveBeenCalledTimes(2)
    expect(stopped.target.parentNode.click).toHaveBeenCalled()
    expect(mocks.lines.get(1)).toBe('| Name | Score | -- | -- | -- | Note |')
    expect(mocks.lines.get(2)).toBe('| :---: | --- | -- | -- | -- | ---: |')
    expect(mocks.editorInstance.focus).toHaveBeenCalled()
  })

  test('quick edit supports composition guard, ctrl-enter newline, and ctrl-shift enter add-row flow', async () => {
    vi.useFakeTimers()
    const ctx = createCtx()
    markdownTable.register(ctx)
    setTableLines()
    const { rowA1, rowA2 } = buildTableDom()

    getMenusForTarget(ctx, rowA2).find(menu => menu.id === 'plugin.table.cell-edit.quick-edit').onClick()
    let input = rowA2.querySelector('textarea')!
    input.dispatchEvent(new Event('compositionstart'))
    input.value = '11'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await Promise.resolve()
    expect(mocks.replaceLine).not.toHaveBeenCalled()

    input.dispatchEvent(new Event('compositionend'))
    mocks.hasCtrlCmd.mockReturnValue(true)
    input.setSelectionRange(1, 1)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(input.value).toBe('1\n1')
    input.dispatchEvent(new Event('blur'))
    await Promise.resolve()
    expect(mocks.replaceLine).toHaveBeenLastCalledWith(3, '| A | 1 1 | z |')

    mocks.replaceLine.mockClear()
    mocks.hasCtrlCmd.mockReturnValue(false)
    mocks.lines.set(3, '| A | 10 | z |')
    getMenusForTarget(ctx, rowA1).find(menu => menu.id === 'plugin.table.cell-edit.quick-edit').onClick()
    input = rowA1.querySelector('textarea')!
    input.value = 'AA'
    mocks.hasCtrlCmd.mockReturnValue(true)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }))
    await Promise.resolve()
    await Promise.resolve()
    await vi.runAllTimersAsync()
    await Promise.resolve()

    expect(mocks.replaceLine).toHaveBeenCalledWith(3, '| A | 10 | z |\n| ----- | --- | ---- |')
    expect(mocks.replaceLine).toHaveBeenCalledWith(3, '| AA | 10 | z |')
    expect((rowA1.parentElement!.nextElementSibling!.children[0] as HTMLElement).querySelector('textarea')).toBeTruthy()
    vi.useRealTimers()
  })

  test('quick edit can move to previous and above cells', async () => {
    vi.useFakeTimers()
    const ctx = createCtx()
    markdownTable.register(ctx)
    setTableLines()
    const { rowA2, rowB2 } = buildTableDom()

    getMenusForTarget(ctx, rowA2).find(menu => menu.id === 'plugin.table.cell-edit.quick-edit').onClick()
    let input = rowA2.querySelector('textarea')!
    input.value = '12'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    await Promise.resolve()
    await Promise.resolve()
    await vi.runAllTimersAsync()
    await Promise.resolve()
    expect(rowA2.previousElementSibling!.querySelector('textarea')).toBeTruthy()

    getMenusForTarget(ctx, rowB2).find(menu => menu.id === 'plugin.table.cell-edit.quick-edit').onClick()
    input = rowB2.querySelector('textarea')!
    input.value = '22'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }))
    await Promise.resolve()
    await Promise.resolve()
    await vi.runAllTimersAsync()
    await Promise.resolve()
    expect((rowB2.parentElement!.previousElementSibling!.children[1] as HTMLElement).querySelector('textarea')).toBeTruthy()
    vi.useRealTimers()
  })

  test('click hook requires ctrl for modal editing and quick edit skips ctrl-clicks', async () => {
    const ctx = createCtx()
    markdownTable.register(ctx)
    setTableLines()
    const { rowA2 } = buildTableDom()
    const clickHook = getHook(ctx, 'VIEW_ELEMENT_CLICK')
    const dblClickHook = getHook(ctx, 'VIEW_ELEMENT_DBCLICK')

    const plainClick = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(plainClick, 'target', { value: rowA2 })
    await clickHook({ e: plainClick })
    expect(mocks.modalInput).not.toHaveBeenCalled()

    mocks.hasCtrlCmd.mockReturnValue(true)
    mocks.modalInput.mockResolvedValue('21')
    const ctrlClick = new MouseEvent('click', { bubbles: true })
    Object.defineProperty(ctrlClick, 'target', { value: rowA2 })
    await clickHook({ e: ctrlClick })
    await Promise.resolve()
    expect(mocks.modalInput).toHaveBeenCalled()

    const ctrlDblClick = new MouseEvent('dblclick', { bubbles: true })
    Object.defineProperty(ctrlDblClick, 'target', { value: rowA2 })
    await dblClickHook({ e: ctrlDblClick })
    expect(rowA2.querySelector('textarea')).toBeNull()
  })

  test('invalid source cell edits report edit errors and strip stale quick inputs', async () => {
    const ctx = createCtx()
    markdownTable.register(ctx)
    setTableLines()
    const { rowA2, rowA3 } = buildTableDom()
    rowA2.colSpan = 4

    const dbClick = new MouseEvent('dblclick', { bubbles: true })
    Object.defineProperty(dbClick, 'target', { value: rowA3 })
    getHook(ctx, 'VIEW_ELEMENT_DBCLICK')({ e: dbClick })
    await Promise.resolve()
    await Promise.resolve()

    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'table-cell-edit.edit-error')
    expect(rowA3.querySelector('textarea')).toBeNull()
  })

  test('sort mode no-ops same or missing indexes and cleans up on blur', async () => {
    const ctx = createCtx()
    markdownTable.register(ctx)
    setTableLines()
    const { table, rowA1 } = buildTableDom()
    getMenusForTarget(ctx, rowA1).find(menu => menu.id === 'plugin.table.cell-edit.sort-mode').onClick()

    mocks.sortableOptions[0].onEnd({ oldIndex: 1, newIndex: 1 })
    mocks.sortableOptions[1].onEnd({ oldIndex: undefined, newIndex: 1 })
    expect(mocks.renderImmediately).not.toHaveBeenCalled()

    table.onblur!(new FocusEvent('blur'))
    expect(table.hasAttribute('sort-mode')).toBe(false)
    expect(mocks.sortableInstances[0].destroy).toHaveBeenCalled()
    expect(mocks.sortableInstances[1].destroy).toHaveBeenCalled()
    await Promise.resolve()
  })

  test('sort rows descending covers nonnumeric ordering and single-column delete hidden state', () => {
    const ctx = createCtx()
    markdownTable.register(ctx)
    mocks.lines.set(1, 'Name|')
    mocks.lines.set(2, '---|')
    mocks.lines.set(3, 'A|')
    mocks.lines.set(4, 'B|')
    const { rowA1 } = buildTableDom()
    const menus = getMenusForTarget(ctx, rowA1)

    expect(menus.find(menu => menu.id === 'plugin.table.cell-edit.delete-col').hidden).toBe(true)
    menus.find(menu => menu.id === 'plugin.table.cell-edit.sort-desc').onClick()

    expect(mocks.replaceLine).toHaveBeenNthCalledWith(1, 3, 'B|')
    expect(mocks.replaceLine).toHaveBeenNthCalledWith(2, 4, 'A|')
  })
})
