const mocks = vi.hoisted(() => ({
  storage: new Map<string, any>(),
  now: 1_700_000_000_000,
}))

vi.mock('@fe/utils/storage', () => ({
  get: vi.fn((key: string, fallback?: any) => mocks.storage.has(key) ? mocks.storage.get(key) : fallback),
  set: vi.fn((key: string, value: any) => {
    mocks.storage.set(key, value)
  }),
}))

vi.mock('@share/misc', () => ({
  isNormalRepoName: (repo: string) => !repo.startsWith('__'),
}))

async function importStore () {
  vi.resetModules()
  return await import('@fe/support/store')
}

beforeEach(() => {
  mocks.storage.clear()
  mocks.now = 1_700_000_000_000
  vi.spyOn(Date, 'now').mockImplementation(() => mocks.now)
})

afterEach(() => {
  vi.restoreAllMocks()
})

test('initializes state from storage and ignores invalid current file records', async () => {
  mocks.storage.set('treeSort', { by: 'name', order: 'desc' })
  mocks.storage.set('wordWrap', 'off')
  mocks.storage.set('typewriterMode', true)
  mocks.storage.set('currentRepo', { name: 'notes', path: '/repo' })
  mocks.storage.set('currentFile', { repo: 'notes', path: '/missing-type.md' })

  const store = (await importStore()).default

  expect(store.state.treeSort).toStrictEqual({ by: 'name', order: 'desc' })
  expect(store.state.wordWrap).toBe('off')
  expect(store.state.typewriterMode).toBe(true)
  expect(store.state.currentRepo).toStrictEqual({ name: 'notes', path: '/repo' })
  expect(store.state.currentFile).toBeNull()
})

test('computes saved state from file status and content', async () => {
  const store = (await importStore()).default

  expect(store.getters.isSaved.value).toBe(true)

  store.state.currentFile = { type: 'file', repo: 'notes', path: '/a.md', name: 'a.md', status: 'unsaved', content: 'a' } as any
  store.state.currentContent = 'a'
  expect(store.getters.isSaved.value).toBe(false)

  store.state.currentFile = { ...store.state.currentFile, status: 'loaded', content: 'a' } as any
  expect(store.getters.isSaved.value).toBe(true)

  store.state.currentContent = 'changed'
  expect(store.getters.isSaved.value).toBe(false)
})

test('watchers persist layout fields, current repo, tabs, and reset tree on repo change', async () => {
  const { nextTick } = await import('vue')
  const store = (await importStore()).default

  store.state.tree = [{ key: 'node' }] as any
  store.state.treeSort = { by: 'name', order: 'desc' }
  store.state.wordWrap = 'off'
  store.state.typewriterMode = true
  store.state.showView = false
  store.state.showEditor = false
  store.state.editorPreviewExclusive = true
  store.state.showSide = false
  store.state.tabs = [{ repo: 'notes', path: '/a.md' }] as any
  store.state.currentRepo = { name: 'notes', path: '/repo' } as any
  await nextTick()

  expect(mocks.storage.get('treeSort')).toStrictEqual({ by: 'name', order: 'desc' })
  expect(mocks.storage.get('wordWrap')).toBe('off')
  expect(mocks.storage.get('typewriterMode')).toBe(true)
  expect(mocks.storage.get('showView')).toBe(false)
  expect(mocks.storage.get('showEditor')).toBe(false)
  expect(mocks.storage.get('editorPreviewExclusive')).toBe(true)
  expect(mocks.storage.get('showSide')).toBe(false)
  expect(mocks.storage.get('tabs')).toStrictEqual([{ repo: 'notes', path: '/a.md' }])
  expect(mocks.storage.get('currentRepo')).toStrictEqual({ name: 'notes', path: '/repo' })
  expect(store.state.tree).toBeNull()
})

test('current file watcher persists a safe file shape and records recent normal files only', async () => {
  const { nextTick } = await import('vue')
  const store = (await importStore()).default

  store.state.currentFile = {
    type: 'file',
    repo: 'notes',
    path: '/a.md',
    name: 'a.md',
    content: 'private',
    status: 'loaded',
    extra: { source: 'test' },
  } as any
  await nextTick()

  expect(mocks.storage.get('currentFile')).toStrictEqual({
    repo: 'notes',
    path: '/a.md',
    type: 'file',
    name: 'a.md',
    extra: { source: 'test' },
  })
  expect(mocks.storage.get('recentOpenTime')).toStrictEqual({
    'notes|/a.md': mocks.now,
  })

  store.state.currentFile = { type: 'file', repo: '__help__', path: '/intro.md', name: 'intro.md' } as any
  await nextTick()
  expect(mocks.storage.get('recentOpenTime')).toStrictEqual({
    'notes|/a.md': mocks.now,
  })

  store.state.currentFile = null
  await nextTick()
  expect(mocks.storage.get('currentFile')).toBeNull()
})

test('current repo watcher clears index status', async () => {
  const { nextTick } = await import('vue')
  const store = (await importStore()).default

  store.state.currentRepoIndexStatus = { repo: 'old', status: 'indexed' as any }
  store.state.currentRepo = { name: 'next', path: '/next' } as any
  await nextTick()

  expect(store.state.currentRepoIndexStatus).toBeNull()
})
