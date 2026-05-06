const mocks = vi.hoisted(() => ({
  fetchedSettings: {} as any,
  writtenSettings: undefined as any,
  hooks: [] as any[],
  registeredHooks: [] as any[],
  showSetting: false,
  themeName: 'dark',
}))

vi.mock('@fe/others/setting-schema', () => ({
  getDefaultSettingSchema: () => ({
    groups: [{ label: 'General', value: 'general' }],
    properties: {
      theme: { defaultValue: 'system', group: 'appearance', required: false },
      repos: { defaultValue: [], group: 'repos', required: true },
      mark: { defaultValue: [], group: 'general', required: false },
      readonly: { defaultValue: false, group: 'general', required: false },
      title: { defaultValue: 'T_title.default', group: 'general', required: false },
    },
  }),
}))

vi.mock('@fe/core/hook', () => ({
  triggerHook: vi.fn(async (name: string, payload: any, options?: any) => {
    mocks.hooks.push({ name, payload, options })
  }),
  registerHook: vi.fn((name: string, handler: () => void, once?: boolean) => {
    mocks.registeredHooks.push({ name, handler, once })
  }),
}))

vi.mock('@fe/support/api', () => ({
  fetchSettings: vi.fn(async () => mocks.fetchedSettings),
  writeSettings: vi.fn(async (settings: any) => {
    mocks.writtenSettings = settings
  }),
}))

vi.mock('@fe/support/store', () => ({
  default: {
    state: {
      get showSetting () {
        return mocks.showSetting
      },
      set showSetting (value) {
        mocks.showSetting = value
      },
    },
  },
}))

vi.mock('@fe/utils', () => ({
  sleep: vi.fn(() => Promise.resolve()),
}))

vi.mock('@fe/utils/path', () => ({
  basename: (path: string) => path.split('/').pop() || path,
}))

vi.mock('@fe/services/i18n', () => ({
  t: (key: string) => `translated:${key}`,
}))

vi.mock('../theme', () => ({
  getThemeName: () => mocks.themeName,
}))

async function importSetting (initSettings?: any) {
  vi.resetModules()
  ;(window as any)._INIT_SETTINGS = initSettings

  return await import('@fe/services/setting')
}

beforeEach(() => {
  mocks.fetchedSettings = {}
  mocks.writtenSettings = undefined
  mocks.hooks = []
  mocks.registeredHooks = []
  mocks.showSetting = false
  mocks.themeName = 'dark'
  document.body.innerHTML = ''
  delete (window as any)._INIT_SETTINGS
})

test('builds defaults and transforms init settings at import time', async () => {
  const setting = await importSetting({
    repositories: { notes: '/repo/notes' },
    enableIndexingRepos: ['notes'],
    mark: [{ path: '/repo/notes/a.md', repo: 'notes' }],
    readonly: true,
  })

  expect(setting.getDefaultSetting()).toStrictEqual({
    theme: 'system',
    repos: [],
    mark: [],
    readonly: false,
    title: 'T_title.default',
  })
  expect(setting.getSettings()).toStrictEqual({
    enableIndexingRepos: ['notes'],
    theme: 'dark',
    repos: [{ name: 'notes', path: '/repo/notes', enableIndexing: true }],
    mark: [{ name: 'a.md', path: '/repo/notes/a.md', repo: 'notes' }],
    readonly: true,
    title: 'T_title.default',
  })
})

test('returns translated schema, required keys, and allows schema mutation', async () => {
  const setting = await importSetting()

  setting.changeSchema(schema => {
    schema.properties.extra = { defaultValue: 1, group: 'other', required: true } as any
  })

  const schema = setting.getSchema()

  expect(schema.required).toStrictEqual(['repos', 'extra'])
  expect(schema.properties.title.defaultValue).toBe('translated:title.default')
  expect(schema.groups).toContainEqual({ label: 'translated:setting-panel.tabs.other', value: 'other' })
})

test('fetches settings, refreshes local state, and emits change hooks', async () => {
  const setting = await importSetting({ readonly: false })
  mocks.fetchedSettings = {
    repositories: { work: '/repo/work' },
    enableIndexingRepos: [],
    mark: [{ path: '/repo/work/todo.md', repo: 'work' }],
    readonly: true,
  }

  const result = await setting.fetchSettings()

  expect(result).toStrictEqual({
    enableIndexingRepos: [],
    theme: 'dark',
    repos: [{ name: 'work', path: '/repo/work', enableIndexing: false }],
    mark: [{ name: 'todo.md', path: '/repo/work/todo.md', repo: 'work' }],
    readonly: true,
    title: 'T_title.default',
  })
  expect(mocks.hooks[0]).toMatchObject({ name: 'SETTING_FETCHED' })
  expect(mocks.hooks[1].name).toBe('SETTING_CHANGED')
  expect(mocks.hooks[1].payload.changedKeys).toEqual(expect.arrayContaining(['repos', 'mark', 'readonly']))
})

test('writes normalized settings and removes renderer-only theme', async () => {
  const setting = await importSetting()
  mocks.fetchedSettings = { readonly: true }

  await setting.writeSettings({
    theme: 'light',
    readonly: true,
    repos: [
      { name: ' notes__drafts ', path: ' /repo/notes ', enableIndexing: true },
      { name: ' ', path: '/repo/empty', enableIndexing: true },
      { name: 'missingPath', path: ' ', enableIndexing: true },
    ],
  })

  expect(mocks.hooks[0]).toStrictEqual({
    name: 'SETTING_BEFORE_WRITE',
    payload: {
      settings: {
        readonly: true,
        repositories: { notes_drafts: '/repo/notes' },
        enableIndexingRepos: ['notes_drafts'],
      },
    },
    options: { breakable: true },
  })
  expect(mocks.writtenSettings).toStrictEqual({
    readonly: true,
    repositories: { notes_drafts: '/repo/notes' },
    enableIndexingRepos: ['notes_drafts'],
  })
})

test('gets and sets individual settings without exposing mutable local state', async () => {
  const setting = await importSetting({
    repositories: { notes: '/repo/notes' },
  })
  mocks.fetchedSettings = { readonly: true }

  const repos = setting.getSetting('repos')
  repos?.push({ name: 'mutated', path: '/tmp', enableIndexing: false })

  expect(setting.getSetting('repos')).toStrictEqual([
    { name: 'notes', path: '/repo/notes', enableIndexing: false },
  ])
  expect(setting.getSetting('missing' as any, 'fallback' as any)).toBe('fallback')

  await setting.setSetting('readonly', true)
  expect(mocks.writtenSettings).toStrictEqual({ readonly: true })
})

test('shows, locates, and hides setting panel', async () => {
  const setting = await importSetting()
  const tab = document.createElement('div')
  tab.dataset.key = 'general'
  const row = document.createElement('div')
  row.dataset.schemapath = 'root.readonly'
  const tabClick = vi.spyOn(tab, 'click')
  const scrollIntoView = vi.fn()
  row.scrollIntoView = scrollIntoView
  document.body.innerHTML = '<section class="editor-wrapper"><div class="row"></div></section>'
  document.querySelector('.editor-wrapper')!.append(tab)
  document.querySelector('.editor-wrapper .row')!.append(row)

  mocks.showSetting = true
  await setting.showSettingPanel('readonly')
  await Promise.resolve()

  expect(mocks.showSetting).toBe(true)
  expect(tabClick).toHaveBeenCalledTimes(1)
  expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })

  setting.hideSettingPanel()
  expect(mocks.showSetting).toBe(false)
})

test('defers panel location until after first show', async () => {
  const setting = await importSetting()

  await setting.showSettingPanel('general')

  expect(mocks.showSetting).toBe(true)
  expect(mocks.registeredHooks).toHaveLength(1)
  expect(mocks.registeredHooks[0]).toMatchObject({
    name: 'SETTING_PANEL_AFTER_SHOW',
    once: true,
  })
})
