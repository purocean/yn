vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

import MarkdownIt from 'markdown-it'
import markdownContainer from '../markdown-container'

function createCtx (md: MarkdownIt) {
  return {
    view: { addStyles: vi.fn() },
    markdown: {
      registerPlugin: vi.fn((plugin: any, options?: any) => md.use(plugin, options)),
    },
    registerHook: vi.fn(),
    editor: {
      tapSimpleCompletionItems: vi.fn(),
      tapMarkdownMonarchLanguage: vi.fn((fn: any) => fn({ tokenizer: { root: [] } })),
    },
  } as any
}

describe('markdown-container plugin', () => {
  test('registers styles, markdown containers, hooks, completions, and monarch rule', () => {
    const md = new MarkdownIt()
    const ctx = createCtx(md)

    markdownContainer.register(ctx)

    expect(ctx.view.addStyles).toHaveBeenCalledWith(expect.stringContaining('.custom-container.tip'))
    expect(ctx.markdown.registerPlugin).toHaveBeenCalledWith(expect.any(Function))
    expect(ctx.registerHook).toHaveBeenCalledWith('MARKDOWN_BEFORE_RENDER', expect.any(Function))
    expect(ctx.registerHook).toHaveBeenCalledWith('VIEW_ON_GET_HTML_FILTER_NODE', expect.any(Function))
    expect(ctx.editor.tapSimpleCompletionItems).toHaveBeenCalledWith(expect.any(Function))
    expect(ctx.editor.tapMarkdownMonarchLanguage).toHaveBeenCalledWith(expect.any(Function))
  })

  test('renders titled containers as vnodes with escaped titles and parsed attrs', () => {
    const md = new MarkdownIt()
    markdownContainer.register(createCtx(md))
    const tokens = md.parse('::: tip Hello <World> {.note #box}\nBody\n:::', {})
    const openIndex = tokens.findIndex(token => token.type === 'container_tip_open')

    const vnode = md.renderer.rules.container_tip_open!(tokens, openIndex, md.options, {}, md.renderer as any) as any

    expect(vnode.type).toBe('div')
    expect(vnode.props).toMatchObject({ id: 'box' })
    expect(vnode.props.class).toContain('note')
    expect(vnode.props.class).toContain('custom-container tip')
    expect(vnode.props.class).toContain('has-title')
    expect(vnode.children[0]).toMatchObject({
      type: 'p',
      props: { class: 'custom-container-title' },
      children: 'Hello &lt;World&gt;',
    })
  })

  test('renders details containers with summary title and details tag', () => {
    const md = new MarkdownIt()
    markdownContainer.register(createCtx(md))
    const tokens = md.parse('::: details More\nBody\n:::', {})
    const openIndex = tokens.findIndex(token => token.type === 'container_details_open')

    const vnode = md.renderer.rules.container_details_open!(tokens, openIndex, md.options, {}, md.renderer as any) as any

    expect(vnode.type).toBe('details')
    expect(vnode.props.class).toContain('custom-container details')
    expect(vnode.children[0]).toMatchObject({ type: 'summary', children: 'More' })
  })

  test('resets group item ids before each first render and preserves default selected tabs for export', () => {
    const md = new MarkdownIt()
    const ctx = createCtx(md)
    vi.spyOn(Date, 'now').mockReturnValue(12345)
    markdownContainer.register(ctx)
    const beforeRender = ctx.registerHook.mock.calls.find(([name]: any[]) => name === 'MARKDOWN_BEFORE_RENDER')[1]
    const filter = ctx.registerHook.mock.calls.find(([name]: any[]) => name === 'VIEW_ON_GET_HTML_FILTER_NODE')[1]

    beforeRender({ env: { renderCount: 0 } })
    const tokens = md.parse(':::: group Tabs\n::: group-item *Second\nBody\n:::\n::::', {})
    const groupOpenIndex = tokens.findIndex(token => token.type === 'container_group_open')
    const itemOpenIndex = tokens.findIndex(token => token.type === 'container_group-item_open')

    md.renderer.rules.container_group_open!(tokens, groupOpenIndex, md.options, {}, md.renderer as any)
    const itemResult = md.renderer.rules['container_group-item_open']!(tokens, itemOpenIndex, md.options, {}, md.renderer as any) as any
    const radioVNode = itemResult.node.children[0]
    const labelVNode = itemResult.node.children[1]
    const input = document.createElement('input')

    expect(radioVNode.props.name).toBe('group-item-12346')
    expect(radioVNode.props.checked).toBe(true)
    expect(labelVNode.children).toBe('Second')

    input.className = 'group-item-radio'
    input.dataset.defaultChecked = 'true'
    filter({ node: input })
    expect(input.getAttribute('checked')).toBe('checked')
  })

  test('marks code-group fences and wraps fences in group item vnode', () => {
    const md = new MarkdownIt()
    markdownContainer.register(createCtx(md))
    const tokens = md.parse('::: code-group Files\n```ts [a.ts]\nconst a = 1\n```\n:::', {})
    const groupOpenIndex = tokens.findIndex(token => token.type === 'container_code-group_open')
    const fenceIndex = tokens.findIndex(token => token.type === 'fence')

    md.renderer.rules['container_code-group_open']!(tokens, groupOpenIndex, md.options, {}, md.renderer as any)
    const vnode = md.renderer.rules.fence!(tokens, fenceIndex, md.options, {}, md.renderer as any) as any

    expect(tokens[fenceIndex].meta.isCodeGroupItem).toBe(true)
    expect(tokens[fenceIndex].info).toBe('ts')
    expect(vnode.children[1]).toMatchObject({ type: 'label', children: 'a.ts' })
    expect(vnode.children[2].props.class).toBe('group-item-content')
    expect(vnode.children[2].children[0]).toContain('<pre><code class="language-ts">')
  })
})
