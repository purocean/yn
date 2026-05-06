const mocks = vi.hoisted(() => ({
  state: {
    currentRepo: undefined as { name: string } | undefined,
    treeSort: undefined as any,
    tree: undefined as any,
  },
  tappers: [] as any[],
  actions: [] as any[],
  reveal: vi.fn(),
  fetchTree: vi.fn(),
  toastShow: vi.fn(),
  warn: vi.fn(),
  watchCallback: undefined as any,
}))

vi.mock('vue', async importOriginal => ({
  ...await importOriginal<typeof import('vue')>(),
  markRaw: (value: unknown) => value,
  nextTick: vi.fn(() => Promise.resolve()),
}))

vi.mock('@fe/core/action', () => ({
  registerAction: vi.fn((action: any) => {
    mocks.actions.push(action)
    return action
  }),
  getActionHandler: vi.fn((name: string) => {
    if (name !== 'tree.reveal-current-node') {
      throw new Error(`Unexpected action: ${name}`)
    }

    return mocks.reveal
  }),
}))

vi.mock('@fe/core/ioc', () => ({
  register: vi.fn((key: string, value: unknown) => {
    if (key === 'TREE_NODE_ACTION_BTN_TAPPERS') {
      mocks.tappers.push(value)
    }
  }),
  get: vi.fn((key: string) => key === 'TREE_NODE_ACTION_BTN_TAPPERS' ? mocks.tappers : []),
}))

vi.mock('@fe/support/store', () => ({
  default: {
    state: mocks.state,
    watch: vi.fn((_getter: Function, callback: Function) => {
      mocks.watchCallback = callback
    }),
  },
}))

vi.mock('@fe/support/ui/toast', () => ({
  useToast: () => ({ show: mocks.toastShow }),
}))

vi.mock('@fe/support/api', () => ({
  fetchTree: mocks.fetchTree,
}))

vi.mock('@fe/services/i18n', () => ({
  t: (key: string) => key,
}))

import {
  getContextMenuItems,
  getNodeActionButtons,
  refreshTree,
  revealCurrentNode,
  tapContextMenus,
  tapNodeActionButtons,
} from '@fe/services/tree'

beforeEach(() => {
  mocks.state.currentRepo = undefined
  mocks.state.treeSort = undefined
  mocks.state.tree = undefined
  mocks.tappers = []
  mocks.fetchTree.mockReset()
  mocks.toastShow.mockClear()
  mocks.reveal.mockClear()
  mocks.warn.mockClear()
  vi.spyOn(console, 'warn').mockImplementation(mocks.warn)
})

afterEach(() => {
  vi.restoreAllMocks()
})

test('registers tree refresh action on import', () => {
  expect(mocks.actions.map(action => action.name)).toContain('tree.refresh')
  expect(mocks.actions.find(action => action.name === 'tree.refresh')?.handler).toBe(refreshTree)
})

test('builds context menus through registered processors', () => {
  const node = { name: 'note.md' } as any
  const vueCtx = { localMarked: { value: false } } as any

  tapContextMenus((items, currentNode, currentVueCtx) => {
    items.push({ id: currentNode.name, label: String(currentVueCtx.localMarked.value) } as any)
  })

  expect(getContextMenuItems(node, vueCtx)).toStrictEqual([
    { id: 'note.md', label: 'false' },
  ])
})

test('builds node action buttons through ioc tappers', () => {
  const node = { name: 'note.md' } as any

  tapNodeActionButtons((btns, currentNode) => {
    btns.push({ id: currentNode.name } as any)
  })

  expect(getNodeActionButtons(node)).toStrictEqual([{ id: 'note.md' }])
})

test('refreshes tree for current repo and renames root node', async () => {
  mocks.state.currentRepo = { name: 'notes' }
  mocks.state.treeSort = { by: 'name', order: 'desc' }
  mocks.fetchTree.mockResolvedValue([{ name: '/', children: [] }, { name: 'b.md' }])

  await refreshTree()

  expect(mocks.fetchTree).toHaveBeenCalledWith('notes', { by: 'name', order: 'desc' })
  expect(mocks.state.tree).toStrictEqual([{ name: 'notes', children: [] }, { name: 'b.md' }])
})

test('uses default sorting and reports fetch errors', async () => {
  mocks.state.currentRepo = { name: 'notes' }
  mocks.fetchTree.mockRejectedValue(new Error('failed'))

  await refreshTree()

  expect(mocks.fetchTree).toHaveBeenCalledWith('notes', { by: 'serial', order: 'asc' })
  expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'failed')
})

test('does not fetch without a current repo and reveals current node via action', async () => {
  await refreshTree()
  revealCurrentNode()

  expect(mocks.fetchTree).not.toHaveBeenCalled()
  expect(mocks.warn).toHaveBeenCalledWith('No repo')
  expect(mocks.reveal).toHaveBeenCalledTimes(1)
})

test('refreshes and reveals when tree sort changes', async () => {
  mocks.state.currentRepo = { name: 'notes' }
  mocks.fetchTree.mockResolvedValue([{ name: '/', children: [] }])

  await mocks.watchCallback()

  expect(mocks.fetchTree).toHaveBeenCalledWith('notes', { by: 'serial', order: 'asc' })
  expect(mocks.reveal).toHaveBeenCalledTimes(1)
})
