const mocks = vi.hoisted(() => ({
  component: { name: 'GetStartedStub' },
}))

vi.mock('../GetStarted.vue', () => ({
  default: mocks.component,
}))

describe('get-started plugin', () => {
  test('registers the get-started custom editor for normal mode without an open doc', async () => {
    const { default: plugin } = await import('../index')
    const registerCustomEditor = vi.fn()
    const ctx = {
      args: { MODE: 'normal' },
      editor: { registerCustomEditor },
    }

    plugin.register(ctx as any)

    expect(registerCustomEditor).toHaveBeenCalledTimes(1)
    const editor = registerCustomEditor.mock.calls[0][0]
    expect(editor).toMatchObject({
      name: 'get-started',
      displayName: 'Get Started',
      hiddenPreview: true,
      component: mocks.component,
    })
    expect(editor.when({ doc: null })).toBe(true)
    expect(editor.when({ doc: { path: '/note.md' } })).toBe(false)

    ctx.args.MODE = 'preview'
    expect(editor.when({ doc: null })).toBe(false)
  })
})
