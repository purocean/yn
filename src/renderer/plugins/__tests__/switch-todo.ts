import switchTodo from '../switch-todo'

const actionName = 'plugin.switch-todo.switch'
const checkboxClass = 'task-list-item-checkbox'

function createCtx () {
  const actions = new Map<string, any>()
  const hooks = new Map<string, Function>()
  const lines = new Map<number, string>([
    [1, '- [ ] first'],
    [2, '- [ ] second'],
    [3, '- [ ] third'],
    [4, ''],
  ])
  const schema = { properties: {} as Record<string, any> }
  const settings = {
    'editor.todo-with-time': true,
  } as Record<string, any>
  const selection = {
    startLineNumber: 1,
    endLineNumber: 1,
    endColumn: 10,
  }

  const ctx = {
    action: {
      registerAction: vi.fn((action: any) => actions.set(action.name, action)),
      getActionHandler: vi.fn((name: string) => actions.get(name).handler),
    },
    args: {
      DOM_CLASS_NAME: {
        TASK_LIST_ITEM_CHECKBOX: checkboxClass,
      },
    },
    editor: {
      getEditor: vi.fn(() => ({
        getSelection: vi.fn(() => selection),
      })),
      getLineContent: vi.fn((line: number) => lines.get(line) || ''),
      replaceLine: vi.fn((line: number, value: string) => {
        lines.set(line, value)
      }),
    },
    i18n: {
      t: vi.fn((key: string) => key),
    },
    keybinding: {
      Alt: 'Alt',
    },
    lib: {
      dayjs: vi.fn(() => ({
        format: vi.fn(() => '2026-05-02 12:34'),
      })),
    },
    registerHook: vi.fn((name: string, fn: Function) => hooks.set(name, fn)),
    setting: {
      changeSchema: vi.fn((fn: Function) => fn(schema)),
      getSetting: vi.fn((key: string, fallback?: any) => key in settings ? settings[key] : fallback),
    },
    actions,
    hooks,
    lines,
    schema,
    selection,
    settings,
  } as any

  return ctx
}

describe('switch-todo plugin', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('registers switch action, preview click hook, and todo-with-time setting schema', () => {
    const ctx = createCtx()

    switchTodo.register(ctx)

    expect(ctx.action.registerAction).toHaveBeenCalledWith(expect.objectContaining({
      name: actionName,
      description: 'command-desc.plugin_switch-todo_switch',
      keys: ['Alt', 'o'],
      forUser: true,
      forMcp: true,
      mcpDescription: 'Switch todo status. Args: [line:number?, checked:boolean?]. No return.',
      handler: expect.any(Function),
    }))
    expect(ctx.registerHook).toHaveBeenCalledWith('VIEW_ELEMENT_CLICK', expect.any(Function))
    expect(ctx.schema.properties['editor.todo-with-time']).toEqual({
      defaultValue: true,
      title: 'T_setting-panel.schema.editor.todo-with-time',
      type: 'boolean',
      format: 'checkbox',
      group: 'editor',
      required: true,
    })
  })

  test('uses explicit line and checked arguments', () => {
    const ctx = createCtx()
    switchTodo.register(ctx)
    const handler = ctx.actions.get(actionName).handler

    handler(1, true)
    expect(ctx.editor.replaceLine).toHaveBeenLastCalledWith(1, '- [x] ~~2026-05-02 12:34~~ first')

    ctx.lines.set(2, '- [x] ~~2026-05-01 10:20~~ done')
    handler(2, false)
    expect(ctx.editor.replaceLine).toHaveBeenLastCalledWith(2, '- [ ] done')
  })

  test('toggles from current line when checked is omitted', () => {
    const ctx = createCtx()
    ctx.selection.startLineNumber = 1
    ctx.selection.endLineNumber = 1
    switchTodo.register(ctx)
    const handler = ctx.actions.get(actionName).handler

    handler()
    expect(ctx.editor.replaceLine).toHaveBeenLastCalledWith(1, '- [x] ~~2026-05-02 12:34~~ first')

    ctx.lines.set(1, '- [x] done')
    handler()
    expect(ctx.editor.replaceLine).toHaveBeenLastCalledWith(1, '- [ ] done')
  })

  test('respects todo-with-time setting when checking a todo', () => {
    const ctx = createCtx()
    ctx.settings['editor.todo-with-time'] = false
    switchTodo.register(ctx)

    ctx.actions.get(actionName).handler(1, true)

    expect(ctx.editor.replaceLine).toHaveBeenCalledWith(1, '- [x] first')
    expect(ctx.setting.getSetting).toHaveBeenCalledWith('editor.todo-with-time', true)
  })

  test('updates selected lines and excludes a trailing empty line when endColumn is 1', () => {
    const ctx = createCtx()
    ctx.selection.startLineNumber = 1
    ctx.selection.endLineNumber = 4
    ctx.selection.endColumn = 1
    switchTodo.register(ctx)

    ctx.actions.get(actionName).handler()

    expect(ctx.editor.replaceLine).toHaveBeenCalledTimes(3)
    expect(ctx.editor.replaceLine.mock.calls.map(([line]: any[]) => line)).toEqual([1, 2, 3])
    expect(ctx.lines.get(1)).toBe('- [x] ~~2026-05-02 12:34~~ first')
    expect(ctx.lines.get(2)).toBe('- [x] ~~2026-05-02 12:34~~ second')
    expect(ctx.lines.get(3)).toBe('- [x] ~~2026-05-02 12:34~~ third')
    expect(ctx.lines.get(4)).toBe('')
  })

  test('preview checkbox hook invokes the action and prevents the event', async () => {
    const ctx = createCtx()
    switchTodo.register(ctx)
    const hook = ctx.hooks.get('VIEW_ELEMENT_CLICK')!
    const parent = document.createElement('li')
    const target = document.createElement('input')
    const event = {
      target,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    }
    parent.dataset.sourceLine = '2'
    target.type = 'checkbox'
    target.checked = true
    target.classList.add(checkboxClass)
    parent.appendChild(target)

    await expect(hook({ e: event })).resolves.toBe(true)

    expect(ctx.action.getActionHandler).toHaveBeenCalledWith(actionName)
    expect(ctx.editor.replaceLine).toHaveBeenCalledWith(2, '- [x] ~~2026-05-02 12:34~~ second')
    expect(event.preventDefault).toHaveBeenCalled()
    expect(event.stopPropagation).toHaveBeenCalled()
  })

  test('preview click hook returns false for non-checkbox targets', async () => {
    const ctx = createCtx()
    switchTodo.register(ctx)
    const hook = ctx.hooks.get('VIEW_ELEMENT_CLICK')!
    const event = {
      target: document.createElement('span'),
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    }

    await expect(hook({ e: event })).resolves.toBe(false)

    expect(ctx.action.getActionHandler).not.toHaveBeenCalled()
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(event.stopPropagation).not.toHaveBeenCalled()
  })
})
