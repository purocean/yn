const mocks = vi.hoisted(() => ({
  state: {
    showOutline: false,
    currentRightSidePanel: null as string | null,
  },
  ioc: new Map<string, any[]>(),
  triggerHook: vi.fn(),
  actions: [] as any[],
  handlers: new Map<string, ReturnType<typeof vi.fn>>(),
}))

vi.mock('lodash-es', async importOriginal => ({
  ...await importOriginal<typeof import('lodash-es')>(),
  debounce: (fn: any) => () => fn(),
}))

vi.mock('@fe/core/ioc', () => ({
  register: vi.fn((key: string, value: unknown) => {
    mocks.ioc.set(key, [...(mocks.ioc.get(key) || []), value])
  }),
  get: vi.fn((key: string) => mocks.ioc.get(key) || []),
  remove: vi.fn((key: string, value: unknown) => {
    mocks.ioc.set(key, (mocks.ioc.get(key) || []).filter(item => item !== value))
  }),
  removeWhen: vi.fn((key: string, predicate: (item: unknown) => boolean) => {
    mocks.ioc.set(key, (mocks.ioc.get(key) || []).filter(item => !predicate(item)))
  }),
}))

vi.mock('@fe/core/hook', () => ({
  triggerHook: mocks.triggerHook,
}))

vi.mock('@fe/core/action', () => ({
  registerAction: vi.fn((action: any) => {
    mocks.actions.push(action)
    return action
  }),
  getActionHandler: vi.fn((name: string) => {
    if (!mocks.handlers.has(name)) {
      mocks.handlers.set(name, vi.fn())
    }

    return mocks.handlers.get(name)
  }),
}))

vi.mock('@fe/core/keybinding', () => ({
  Alt: 'Alt',
  Shift: 'Shift',
}))

vi.mock('@fe/support/store', () => ({
  default: {
    state: mocks.state,
  },
}))

vi.mock('@fe/services/i18n', () => ({
  t: (key: string) => key,
}))

import { ContentRightSide, ControlCenter, FileTabs, toggleOutline } from '@fe/services/workbench'

beforeEach(() => {
  mocks.state.showOutline = false
  mocks.state.currentRightSidePanel = null
  mocks.ioc.clear()
  mocks.triggerHook.mockClear()
  mocks.handlers.clear()
})

test('registers outline action and toggles outline visibility', () => {
  const action = mocks.actions.find(action => action.name === 'workbench.toggle-outline')

  expect(action?.handler).toBe(toggleOutline)

  toggleOutline()
  expect(mocks.state.showOutline).toBe(true)

  toggleOutline(false)
  expect(mocks.state.showOutline).toBe(false)
})

test('file tabs register tappers, refresh actions, and build outputs', () => {
  const tapper = vi.fn((btns: any[]) => btns.push({ id: 'pin' }))
  const contextTapper = vi.fn((items: any[], tab: any) => items.push({ id: tab.id }))

  FileTabs.tapActionBtns(tapper)
  expect(mocks.handlers.get('file-tabs.refresh-action-btns')).toHaveBeenCalledTimes(1)
  expect(FileTabs.getActionBtns()).toStrictEqual([{ id: 'pin' }])

  FileTabs.tapTabContextMenus(contextTapper)
  expect(FileTabs.getTabContextMenus({ id: 'tab-1' } as any)).toStrictEqual([{ id: 'tab-1' }])

  FileTabs.removeActionBtnTapper(tapper)
  FileTabs.removeTabContextMenuTapper(contextTapper)

  expect(FileTabs.getActionBtns()).toStrictEqual([])
  expect(FileTabs.getTabContextMenus({ id: 'tab-1' } as any)).toStrictEqual([])
})

test('control center refreshes, sorts schema items, and delegates toggle', () => {
  ControlCenter.tapSchema(schema => {
    schema.switch.items.push({ id: 'late', order: 20 } as any)
    schema.switch.items.push({ id: 'early', order: 1 } as any)
    schema.navigation.items.push({ id: 'default' } as any)
    schema.navigation.items.push({ id: 'first', order: 0 } as any)
  })

  expect(mocks.handlers.get('control-center.refresh')).toHaveBeenCalledTimes(1)
  expect(mocks.handlers.get('action-bar.refresh')).toHaveBeenCalledTimes(1)
  expect(ControlCenter.getSchema()).toStrictEqual({
    switch: { items: [{ id: 'early', order: 1 }, { id: 'late', order: 20 }] },
    navigation: { items: [{ id: 'default' }, { id: 'first', order: 0 }] },
  })

  ControlCenter.toggle(true)
  expect(mocks.handlers.get('control-center.toggle')).toHaveBeenCalledWith(true)
})

test('right side panels register, sort, override, and emit change hooks', () => {
  const first = { name: 'first', component: {}, order: 20 } as any
  const second = { name: 'second', component: {}, order: 1 } as any

  ContentRightSide.registerPanel(first)
  ContentRightSide.registerPanel(second)

  expect(ContentRightSide.getAllPanels()).toStrictEqual([second, first])
  expect(() => ContentRightSide.registerPanel({ ...first })).toThrow('Panel first is already registered')

  ContentRightSide.registerPanel({ ...first, component: 'override' }, true)
  expect(ContentRightSide.getAllPanels().find(panel => panel.name === 'first')?.component).toBe('override')
  expect(mocks.triggerHook).toHaveBeenCalledWith('RIGHT_SIDE_PANEL_CHANGE', { type: 'register' })
})

test('right side panel switching, showing, hiding, toggling, and removal update state', () => {
  ContentRightSide.registerPanel({ name: 'a', component: {}, order: 1 } as any)
  ContentRightSide.registerPanel({ name: 'b', component: {}, order: 2 } as any)

  ContentRightSide.switchPanel('b')
  expect(mocks.state.currentRightSidePanel).toBe('b')
  expect(mocks.handlers.get('layout.toggle-content-right-side')).toHaveBeenLastCalledWith(true)

  ContentRightSide.removePanel('b')
  expect(mocks.state.currentRightSidePanel).toBe('a')

  ContentRightSide.hide()
  ContentRightSide.toggle(false)
  expect(mocks.handlers.get('layout.toggle-content-right-side')).toHaveBeenCalledWith(false)

  mocks.state.currentRightSidePanel = null
  ContentRightSide.show()
  expect(mocks.state.currentRightSidePanel).toBe('a')

  expect(() => ContentRightSide.switchPanel('missing')).toThrow('Panel missing not found')
  expect(() => ContentRightSide.registerPanel({ name: 'bad' } as any)).toThrow('Panel component is required')

  ContentRightSide.removePanel('a')
  ContentRightSide.toggle(true)

  expect(mocks.state.currentRightSidePanel).toBeNull()
})
