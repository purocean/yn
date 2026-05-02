const loggerMocks = vi.hoisted(() => ({
  debug: vi.fn(),
}))

const hookMocks = vi.hoisted(() => ({
  triggerHook: vi.fn(),
}))

vi.mock('@fe/utils', () => ({
  getLogger: () => loggerMocks,
}))

vi.mock('@fe/core/hook', () => hookMocks)

describe('renderer action registry', () => {
  beforeEach(async () => {
    vi.resetModules()
    hookMocks.triggerHook.mockClear()
    loggerMocks.debug.mockClear()
    const ioc = await import('@fe/core/ioc')
    ioc.removeAll('ACTION_TAPPERS')
  })

  test('registers, returns sorted cloned actions, and removes actions', async () => {
    const action = await import('@fe/core/action')
    const beta = { name: 'beta', description: 'Beta', handler: vi.fn() }
    const alpha = { name: 'alpha', description: 'Alpha', handler: vi.fn() }

    expect(action.registerAction(beta)).toBe(beta)
    action.registerAction(alpha)

    const raw = action.getRawActions()
    expect(raw.map(item => item.name)).toEqual(['alpha', 'beta'])
    raw[0].name = 'mutated'
    expect(action.getAction('alpha')?.name).toBe('alpha')

    action.removeAction('alpha')
    expect(action.getAction('alpha')).toBeUndefined()
    expect(action.getRawActions().map(item => item.name)).toEqual(['beta'])
  })

  test('applies action tappers to cloned actions', async () => {
    const action = await import('@fe/core/action')
    const tapper = vi.fn((item: any) => {
      item.description = 'Tapped'
    })

    action.registerAction({ name: 'format', description: 'Format', handler: vi.fn() })
    action.tapAction(tapper)

    expect(action.getAction('format')?.description).toBe('Tapped')
    expect(action.getRawActions()[0].description).toBe('Format')

    action.removeActionTapper(tapper)
    expect(action.getAction('format')?.description).toBe('Format')
  })

  test('executes handlers through before and after hooks', async () => {
    const action = await import('@fe/core/action')
    const handler = vi.fn((a: number, b: number) => a + b)

    action.registerAction({ name: 'sum', description: 'Sum', handler })

    expect(action.executeAction('sum', 2, 3)).toBe(5)
    expect(handler).toHaveBeenCalledWith(2, 3)
    expect(hookMocks.triggerHook).toHaveBeenCalledWith('ACTION_BEFORE_RUN', { name: 'sum' }, { breakable: true })
    expect(hookMocks.triggerHook).toHaveBeenCalledWith('ACTION_AFTER_RUN', { name: 'sum' }, { breakable: true })
  })

  test('skips actions whose when guard is false', async () => {
    const action = await import('@fe/core/action')
    const handler = vi.fn()

    action.registerAction({ name: 'guarded', description: 'Guarded', handler, when: () => false })

    expect(action.getActionHandler('guarded')()).toBeUndefined()
    expect(handler).not.toHaveBeenCalled()
    expect(hookMocks.triggerHook).toHaveBeenCalledTimes(2)
  })

  test('returns undefined for missing actions but still emits lifecycle hooks', async () => {
    const action = await import('@fe/core/action')

    expect(action.getActionHandler('missing')('arg')).toBeUndefined()
    expect(hookMocks.triggerHook).toHaveBeenCalledWith('ACTION_BEFORE_RUN', { name: 'missing' }, { breakable: true })
    expect(hookMocks.triggerHook).toHaveBeenCalledWith('ACTION_AFTER_RUN', { name: 'missing' }, { breakable: true })
  })
})
