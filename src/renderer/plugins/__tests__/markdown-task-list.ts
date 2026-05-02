vi.mock('@fe/context', () => ({
  Plugin: class {},
}))

vi.mock('@fe/support/args', () => ({
  DOM_CLASS_NAME: {
    TASK_LIST_ITEM_CHECKBOX: 'task-list-item-checkbox',
  },
}))

import MarkdownIt from 'markdown-it'
import markdownTaskList from '../markdown-task-list'

function createCtx (md: MarkdownIt) {
  return {
    markdown: {
      registerPlugin: vi.fn((plugin: any, options?: any) => md.use(plugin, options)),
    },
    registerHook: vi.fn(),
  } as any
}

describe('markdown-task-list plugin', () => {
  test('registers markdown-it plugin and html filter hook', () => {
    const ctx = createCtx(new MarkdownIt())

    markdownTaskList.register(ctx)

    expect(ctx.markdown.registerPlugin).toHaveBeenCalledTimes(1)
    expect(ctx.markdown.registerPlugin).toHaveBeenCalledWith(expect.any(Function), { enabled: true })
    expect(ctx.registerHook).toHaveBeenCalledWith('VIEW_ON_GET_HTML_FILTER_NODE', expect.any(Function))
  })

  test('turns GitHub todo list markers into checkbox vnodes and list classes', () => {
    const md = new MarkdownIt()
    markdownTaskList.register(createCtx(md))

    const tokens = md.parse('- [ ] open\n- [x] done\n- [X] done upper\n- plain', {})
    const listOpen = tokens.find(token => token.type === 'bullet_list_open')!
    const itemOpenTokens = tokens.filter(token => token.type === 'list_item_open')
    const inlineTokens = tokens.filter(token => token.type === 'inline')
    const checkboxTokens = inlineTokens.map(token => token.children?.[0]).filter(token => token?.contentVNode) as any[]

    expect(listOpen.attrGet('class')).toBe('contains-task-list')
    expect(itemOpenTokens.map(token => token.attrGet('class'))).toEqual([
      'task-list-item enabled',
      'task-list-item enabled',
      'task-list-item enabled',
      null,
    ])
    expect(inlineTokens.map(token => token.content)).toEqual([' open', ' done', ' done upper', 'plain'])
    expect(checkboxTokens).toHaveLength(3)
    expect(checkboxTokens.map(token => token.type)).toEqual(['html_inline', 'html_inline', 'html_inline'])
    expect(checkboxTokens.map(token => token.contentVNode.props)).toMatchObject([
      { class: 'task-list-item-checkbox', type: 'checkbox', disabled: false, checked: false, 'data-checked': 'false' },
      { class: 'task-list-item-checkbox', type: 'checkbox', disabled: false, checked: true, 'data-checked': 'true' },
      { class: 'task-list-item-checkbox', type: 'checkbox', disabled: false, checked: true, 'data-checked': 'true' },
    ])
  })

  test('html filter serializes checkbox checked and disabled state', () => {
    const ctx = createCtx(new MarkdownIt())
    markdownTaskList.register(ctx)
    const filter = ctx.registerHook.mock.calls[0][1]
    const node = document.createElement('input')
    node.className = 'task-list-item-checkbox'

    node.dataset.checked = 'true'
    filter({ node })
    expect(node.getAttribute('disabled')).toBe('disabled')
    expect(node.getAttribute('checked')).toBe('checked')

    node.dataset.checked = 'false'
    filter({ node })
    expect(node.getAttribute('checked')).toBe(null)
  })
})
