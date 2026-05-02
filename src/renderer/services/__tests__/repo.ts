import type { Repo } from '@fe/types'

const mocks = vi.hoisted(() => ({
  repos: [] as Repo[],
  currentRepo: undefined as Repo | undefined,
  writeSettings: vi.fn(async (settings: { repos: Repo[] }) => {
    mocks.repos = settings.repos
  }),
}))

vi.mock('@fe/services/setting', () => ({
  getSetting: vi.fn((key: string, fallback: unknown) => key === 'repos' ? mocks.repos : fallback),
  writeSettings: mocks.writeSettings,
}))

vi.mock('@fe/support/store', () => ({
  default: {
    state: {
      get currentRepo () {
        return mocks.currentRepo
      },
      set currentRepo (value) {
        mocks.currentRepo = value
      },
    },
  },
}))

import { getAllRepos, getRepo, isNormalRepo, setCurrentRepo, toggleRepoIndexing } from '@fe/services/repo'

const normalRepo: Repo = { name: 'notes', path: '/repo/notes', enableIndexing: true }
const otherRepo: Repo = { name: 'work', path: '/repo/work', enableIndexing: false }

beforeEach(() => {
  mocks.repos = [normalRepo, otherRepo]
  mocks.currentRepo = undefined
  mocks.writeSettings.mockClear()
})

test('reads all repos and finds repo by name', () => {
  expect(getAllRepos()).toStrictEqual([normalRepo, otherRepo])
  expect(getRepo('work')).toBe(otherRepo)
  expect(getRepo('missing')).toBeUndefined()
})

test('sets current repo as a copy and clears it', () => {
  setCurrentRepo('notes')

  expect(mocks.currentRepo).toStrictEqual(normalRepo)
  expect(mocks.currentRepo).not.toBe(normalRepo)

  setCurrentRepo()

  expect(mocks.currentRepo).toBeUndefined()
})

test('does not replace current repo when selected repo has equal data', () => {
  mocks.currentRepo = { ...normalRepo }
  const current = mocks.currentRepo

  setCurrentRepo('notes')

  expect(mocks.currentRepo).toBe(current)
})

test('throws when setting an unknown current repo', () => {
  expect(() => setCurrentRepo('missing')).toThrow('Repository missing not found.')
})

test('toggles repo indexing and refreshes current repo when affected', async () => {
  mocks.currentRepo = { ...normalRepo }

  await toggleRepoIndexing('notes', false)

  expect(mocks.writeSettings).toHaveBeenCalledWith({
    repos: [
      { ...normalRepo, enableIndexing: false },
      otherRepo,
    ],
  })
  expect(mocks.currentRepo).toStrictEqual({ ...normalRepo, enableIndexing: false })
})

test('checks normal repo names from either string or repo object', () => {
  expect(isNormalRepo('notes')).toBe(true)
  expect(isNormalRepo({ ...normalRepo, name: '__demo' })).toBe(false)
})
