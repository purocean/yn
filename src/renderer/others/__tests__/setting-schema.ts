async function loadSchema (opts: { isMacOS?: boolean, isWindows?: boolean, disableXterm?: boolean, mas?: boolean } = {}) {
  vi.resetModules()
  vi.doMock('@fe/support/env', () => ({
    isMacOS: !!opts.isMacOS,
    isWindows: !!opts.isWindows,
  }))
  vi.doMock('@fe/support/args', () => ({
    DOM_CLASS_NAME: {},
    FLAG_DISABLE_XTERM: !!opts.disableXterm,
    FLAG_MAS: !!opts.mas,
  }))
  vi.doMock('@share/misc', () => ({
    DEFAULT_EXCLUDE_REGEX: '^node_modules/$',
  }))

  return await import('@fe/others/setting-schema')
}

describe('setting schema', () => {
  afterEach(() => {
    vi.doUnmock('@fe/support/env')
    vi.doUnmock('@fe/support/args')
    vi.doUnmock('@share/misc')
  })

  test('returns deep-cloned schemas with default groups and validators', async () => {
    const { getDefaultSettingSchema } = await loadSchema()

    const schemaA = getDefaultSettingSchema()
    const schemaB = getDefaultSettingSchema()

    expect(schemaA).not.toBe(schemaB)
    expect(schemaA.properties.theme.defaultValue).toBe('system')
    expect(schemaA.groups.map(group => group.value)).toEqual(['repos', 'appearance', 'editor', 'render', 'image', 'proxy'])

    ;(schemaA.properties.theme as any).defaultValue = 'dark'
    expect(schemaB.properties.theme.defaultValue).toBe('system')

    const validator = schemaA.properties['tree.exclude'].validator!
    expect(validator(schemaA.properties['tree.exclude'], '', 'tree.exclude')).toEqual([])
    expect(validator(schemaA.properties['tree.exclude'], '^ok$', 'tree.exclude')).toEqual([])
    expect(validator(schemaA.properties['tree.exclude'], '[', 'tree.exclude')).toEqual([
      expect.objectContaining({ property: 'tree.exclude', path: 'tree.exclude' }),
    ])
  })

  test('sets platform-dependent defaults and removes terminal fields on Windows', async () => {
    const { getDefaultSettingSchema } = await loadSchema({ isWindows: true })
    const schema = getDefaultSettingSchema()

    expect(schema.properties['keep-running-after-closing-window'].defaultValue).toBe(true)
    expect(schema.properties.envs).toBeUndefined()
    expect(schema.properties.shell).toBeDefined()
  })

  test('removes terminal and updater settings when xterm is disabled', async () => {
    const { getDefaultSettingSchema } = await loadSchema({ disableXterm: true, isMacOS: true })
    const schema = getDefaultSettingSchema()

    expect(schema.properties.envs).toBeUndefined()
    expect(schema.properties.shell).toBeUndefined()
    expect(schema.properties['server.host']).toBeUndefined()
    expect(schema.properties['server.port']).toBeUndefined()
    expect(schema.properties['updater.source']).toBeUndefined()
    expect(schema.properties['keep-running-after-closing-window'].defaultValue).toBe(false)
  })

  test('removes updater source in MAS builds', async () => {
    const { getDefaultSettingSchema } = await loadSchema({ mas: true })
    const schema = getDefaultSettingSchema()

    expect(schema.properties['updater.source']).toBeUndefined()
    expect(schema.properties.shell).toBeDefined()
  })
})
