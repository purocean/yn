const mocks = vi.hoisted(() => ({
  stores: vi.fn(),
  version: vi.fn(),
  where: vi.fn(),
  put: vi.fn(),
  bulkPut: vi.fn(),
  bulkDelete: vi.fn(),
  getDatabaseNames: vi.fn(),
  deleteDatabase: vi.fn(),
  debug: vi.fn(),
}))

vi.mock('@fe/utils/pure', () => ({
  getLogger: () => ({ debug: mocks.debug }),
}))

vi.mock('dexie', () => ({
  default: Object.assign(vi.fn(function Dexie (this: any, name: string) {
    this.name = name
    this.version = mocks.version.mockReturnValue({ stores: mocks.stores })
    this.documents = {
      where: mocks.where,
      put: mocks.put,
      bulkPut: mocks.bulkPut,
      bulkDelete: mocks.bulkDelete,
    }
  }), {
    getDatabaseNames: mocks.getDatabaseNames,
    delete: mocks.deleteDatabase,
  }),
  EntityTable: class EntityTable {},
}))

import Dexie from 'dexie'

let documents: typeof import('../db').documents
let removeOldDatabases: typeof import('../db').removeOldDatabases

beforeAll(async () => {
  vi.stubGlobal('__APP_VERSION__', '__APP_VERSION__')
  const db = await import('../db')
  documents = db.documents
  removeOldDatabases = db.removeOldDatabases
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.version.mockReturnValue({ stores: mocks.stores })
})

test('initializes the versioned documents table', () => {
  expect(documents.getTable()).toMatchObject({
    where: mocks.where,
    put: mocks.put,
    bulkPut: mocks.bulkPut,
    bulkDelete: mocks.bulkDelete,
  })
})

test('finds and writes document entities', async () => {
  const first = vi.fn(async () => ({ id: 1, repo: 'notes', path: 'a.md' }))
  mocks.where.mockReturnValue({ first })
  mocks.put.mockResolvedValue(2)
  mocks.bulkPut.mockResolvedValue([1, 2])

  await expect(documents.findByRepoAndPath('notes', 'a.md')).resolves.toEqual({ id: 1, repo: 'notes', path: 'a.md' })
  await expect(documents.put({ repo: 'notes', path: 'b.md' } as any)).resolves.toBe(2)
  await expect(documents.bulkPut([{ repo: 'notes', path: 'c.md' } as any])).resolves.toEqual([1, 2])

  expect(mocks.where).toHaveBeenCalledWith({ repo: 'notes', path: 'a.md' })
  expect(mocks.put).toHaveBeenCalledWith({ repo: 'notes', path: 'b.md' })
  expect(mocks.bulkPut).toHaveBeenCalledWith([{ repo: 'notes', path: 'c.md' }], { allKeys: true })
})

test('collects mtimes and deletes by repo filters', async () => {
  const each = vi.fn(async (callback: any) => {
    callback({ id: 1, repo: 'notes', path: 'a.md', mtimeMs: 10 })
    callback({ id: 2, repo: 'notes', path: 'b.md', mtimeMs: 20 })
  })
  const deleteByWhere = vi.fn(async () => 3)
  const noneOf = vi.fn(() => ({ delete: deleteByWhere }))
  mocks.where.mockImplementation((query: any) => {
    if (query === 'repo') return { noneOf }
    return { each, delete: deleteByWhere }
  })

  const mtimes = await documents.findAllMtimeMsByRepo('notes')
  await expect(documents.deleteByRepo('notes')).resolves.toBe(3)
  await expect(documents.deleteUnusedRepo(['notes'])).resolves.toBe(3)
  await expect(documents.deletedByRepoAndPath('notes', 'a.md')).resolves.toBe(3)

  expect(mtimes.get('a.md')).toEqual({ id: 1, mtimeMs: 10 })
  expect(mtimes.get('b.md')).toEqual({ id: 2, mtimeMs: 20 })
  expect(noneOf).toHaveBeenCalledWith(['notes'])
  expect(mocks.where).toHaveBeenCalledWith({ repo: 'notes', path: 'a.md' })
})

test('deletes unused document ids inside a repo', async () => {
  const primaryKeys = vi.fn(async () => [1, 2, 3, 4])
  mocks.where.mockReturnValue({ primaryKeys })
  mocks.bulkDelete.mockResolvedValue(undefined)

  await expect(documents.deleteUnusedInRepo('notes', [2, 4])).resolves.toBe(2)

  expect(mocks.where).toHaveBeenCalledWith({ repo: 'notes' })
  expect(mocks.bulkDelete).toHaveBeenCalledWith([1, 3])
})

test('removes old versioned databases', async () => {
  mocks.getDatabaseNames.mockResolvedValue([
    'yank-note-old',
    'yank-note-__APP_VERSION__',
    'other',
  ])
  mocks.deleteDatabase.mockResolvedValue(undefined)

  await removeOldDatabases()

  expect(Dexie.delete).toHaveBeenCalledTimes(1)
  expect(Dexie.delete).toHaveBeenCalledWith('yank-note-old')
})
