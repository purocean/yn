const mocks = vi.hoisted(() => ({
  settings: new Map<string, any>(),
  triggerHook: vi.fn(),
}))

vi.mock('@fe/core/hook', () => ({
  triggerHook: mocks.triggerHook,
}))

vi.mock('@fe/support/args', () => ({
  HELP_REPO_NAME: '__help__',
}))

vi.mock('@fe/services/setting', () => ({
  getSetting: (key: string, fallback?: any) => mocks.settings.has(key) ? mocks.settings.get(key) : fallback,
}))

vi.mock('@fe/plugins/markdown-wiki-links/lib', () => ({
  RULE_NAME: 'wiki_link',
}))

vi.mock('@fe/plugins/markdown-hashtags/lib', () => ({
  RULE_NAME: 'hashtag',
}))

beforeEach(() => {
  mocks.settings.clear()
  mocks.triggerHook.mockClear()
})

async function loadMarkdown () {
  vi.resetModules()
  return await import('@fe/services/markdown')
}

test('registerPlugin applies markdown-it plugins with params', async () => {
  const { markdown, registerPlugin } = await loadMarkdown()
  const plugin = vi.fn((md, params) => {
    md.core.ruler.push('test_plugin', state => {
      state.env.pluginParam = params.enabled
      return true
    })
  })

  registerPlugin(plugin, { enabled: true })
  const env: any = {}
  markdown.render('body', env)

  expect(plugin).toHaveBeenCalledWith(markdown, { enabled: true })
  expect(env.pluginParam).toBe(true)
})

test('render applies setting-driven markdown options and triggers before-render hook', async () => {
  const { markdown } = await loadMarkdown()
  mocks.settings.set('render.md-html', false)
  mocks.settings.set('render.md-breaks', false)
  mocks.settings.set('render.md-linkify', false)
  mocks.settings.set('render.md-typographer', true)
  mocks.settings.set('render.md-sup', false)
  mocks.settings.set('render.md-sub', false)

  const env: any = { file: { repo: 'notes', path: '/a.md' } }
  const html = markdown.render('x<sup>raw</sup>\n2^10^ H~2~O', env)

  expect(mocks.triggerHook).toHaveBeenCalledWith('MARKDOWN_BEFORE_RENDER', {
    src: 'x<sup>raw</sup>\n2^10^ H~2~O',
    env,
    md: markdown,
  })
  expect(markdown.options.html).toBe(false)
  expect(markdown.options.breaks).toBe(false)
  expect(markdown.options.linkify).toBe(false)
  expect(markdown.options.typographer).toBe(true)
  expect(html).toContain('&lt;sup&gt;raw&lt;/sup&gt;')
  expect(html).toContain('2^10^ H~2~O')
})

test('help repo always allows raw html even when html setting is disabled', async () => {
  const { markdown } = await loadMarkdown()
  mocks.settings.set('render.md-html', false)

  const html = markdown.render('<span>help</span>', { file: { repo: '__help__' } } as any)

  expect(markdown.options.html).toBe(true)
  expect(html).toContain('<span>help</span>')
})

test('tokenize and normalize rules attach source, tokens, and line marks to env', async () => {
  const { markdown } = await loadMarkdown()
  const env: any = {}

  markdown.render('# Title\n\nBody', env)

  expect(env.source).toBe('# Title\n\nBody')
  expect(Array.isArray(env.tokens)).toBe(true)
  expect(env.tokens.some((token: any) => token.type === 'heading_open')).toBe(true)
  expect(Array.isArray(env.bMarks)).toBe(true)
  expect(Array.isArray(env.eMarks)).toBe(true)
  expect(env.bMarks[0]).toBe(0)
  expect(env.eMarks[0]).toBe(7)
})

test('cjk friendly plugin is only applied when the render setting is enabled at startup', async () => {
  const src = '**该星号不会被识别，而是直接显示。**这是因为它没有被识别为强调符号。'

  const { markdown: plainMarkdown } = await loadMarkdown()
  expect(plainMarkdown.renderInline(src)).toBe(src)

  mocks.settings.set('render.md-cj-friendly', true)
  const { markdown: cjFriendlyMarkdown } = await loadMarkdown()
  expect(cjFriendlyMarkdown.renderInline(src)).toContain('<strong>该星号不会被识别，而是直接显示。</strong>')
})
