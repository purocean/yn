import { nextTick } from 'vue'
import { flushPromises, shallowMount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  storeState: {
    currentFile: undefined as any,
  },
  contextMenuShow: vi.fn(),
  triggerHook: vi.fn(),
  getContextMenuItems: vi.fn(),
  getNodeActionButtons: vi.fn(),
  refreshTree: vi.fn(),
  switchDoc: vi.fn(),
  moveDoc: vi.fn(),
  duplicateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  toastShow: vi.fn(),
  upload: vi.fn(),
}))

vi.mock('@fe/support/ui/context-menu', () => ({
  useContextMenu: () => ({ show: mocks.contextMenuShow }),
}))

vi.mock('@fe/core/hook', () => ({
  triggerHook: mocks.triggerHook,
}))

vi.mock('@fe/services/tree', () => ({
  getContextMenuItems: mocks.getContextMenuItems,
  getNodeActionButtons: mocks.getNodeActionButtons,
  refreshTree: mocks.refreshTree,
}))

vi.mock('@fe/services/document', () => ({
  deleteDoc: mocks.deleteDoc,
  duplicateDoc: mocks.duplicateDoc,
  isMarkdownFile: (node: any) => String(node.path || node).endsWith('.md'),
  isMarked: (node: any) => !!node.marked,
  moveDoc: mocks.moveDoc,
  switchDoc: mocks.switchDoc,
}))

vi.mock('@fe/services/i18n', () => ({
  useI18n: () => ({ t: (key: string, ...args: string[]) => args.length ? `${key}:${args.join(':')}` : key }),
}))

vi.mock('@fe/utils/path', () => ({
  dirname: (path: string) => path.split('/').slice(0, -1).join('/') || '/',
  extname: (path: string) => (path.match(/\.[^.]+$/)?.[0] || ''),
  isBelongTo: (a: string, b: string) => b.startsWith(`${a}/`),
  join: (...args: string[]) => args.join('/').replace(/\/+/g, '/'),
}))

vi.mock('@fe/support/ui/toast', () => ({
  useToast: () => ({ show: mocks.toastShow, hide: vi.fn() }),
}))

vi.mock('@fe/support/args', () => ({ FLAG_READONLY: false }))

vi.mock('@fe/utils', () => ({
  encodeMarkdownLink: (path: string) => encodeURI(path),
  escapeMd: (text: string) => text.replace('[', '\\[').replace(']', '\\]'),
  fileToBase64URL: vi.fn(async (file: File) => `data:${file.name}`),
}))

vi.mock('@fe/support/store', () => ({
  default: { state: mocks.storeState },
}))

vi.mock('@fe/support/api', () => ({ upload: mocks.upload }))

vi.mock('../SvgIcon.vue', () => ({
  default: { name: 'SvgIcon', props: ['name', 'title'], emits: ['click'], template: '<button class="svg-icon" @click="$emit(\'click\', $event)">{{name}}</button>' },
}))

import TreeNode from '../TreeNode.vue'

const fileNode = {
  type: 'file',
  name: 'Alpha.md',
  path: '/docs/Alpha.md',
  repo: 'repo',
  level: 2,
  birthtime: 0,
  mtime: 0,
}

const dirNode = {
  type: 'dir',
  name: 'docs',
  path: '/docs',
  repo: 'repo',
  level: 1,
  children: [fileNode],
}

beforeEach(() => {
  Element.prototype.scrollIntoViewIfNeeded = vi.fn()
  mocks.storeState.currentFile = undefined
  mocks.contextMenuShow.mockReset()
  mocks.triggerHook.mockReset()
  mocks.triggerHook.mockResolvedValue(false)
  mocks.getContextMenuItems.mockReset()
  mocks.getContextMenuItems.mockReturnValue([{ label: 'Open' }])
  mocks.getNodeActionButtons.mockReset()
  mocks.getNodeActionButtons.mockReturnValue([{ id: 'new', icon: 'plus', title: 'New', onClick: vi.fn() }])
  mocks.refreshTree.mockReset()
  mocks.switchDoc.mockReset()
  mocks.moveDoc.mockReset()
  mocks.duplicateDoc.mockReset()
  mocks.deleteDoc.mockReset()
  mocks.toastShow.mockReset()
  mocks.upload.mockReset()
})

describe('TreeNode', () => {
  test('renders file state, selects with hook fallback, opens context menu and supports drag text', async () => {
    mocks.storeState.currentFile = { repo: 'repo', path: '/docs/Alpha.md' }
    const wrapper = shallowMount(TreeNode, {
      props: { item: fileNode },
      global: { stubs: { SvgIcon: true } },
    })

    expect(wrapper.find('.file-name').classes()).toContain('selected')
    expect(wrapper.find('.item-label').classes()).toContain('type-md')

    await wrapper.find('.file-name').trigger('click')
    expect(mocks.triggerHook).toHaveBeenCalledWith('TREE_NODE_SELECT', { node: fileNode }, { breakable: true, ignoreError: true })
    expect(mocks.switchDoc).toHaveBeenCalledWith(fileNode)

    await wrapper.find('.file-name').trigger('dblclick')
    expect(mocks.triggerHook).toHaveBeenCalledWith('TREE_NODE_DBLCLICK', { node: fileNode })

    await wrapper.find('.file-name').trigger('contextmenu')
    expect(mocks.contextMenuShow).toHaveBeenCalledWith([{ label: 'Open' }])

    const dataTransfer = { setData: vi.fn() }
    await wrapper.find('.item-label').trigger('dragstart', { dataTransfer })
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', '[Alpha.md](/docs/Alpha.md)')
    expect(dataTransfer.setData).toHaveBeenCalledWith('node-info', expect.stringContaining('"path":"/docs/Alpha.md"'))
  })

  test('renders directories, opens for selected descendants, handles actions and drops', async () => {
    vi.useFakeTimers()
    mocks.storeState.currentFile = { repo: 'repo', path: '/docs/Alpha.md' }
    const wrapper = shallowMount(TreeNode, {
      props: { item: dirNode },
      global: {
        stubs: {
          TreeNode: true,
          SvgIcon: { template: '<button class="svg-icon">{{name}}</button>', props: ['name'] },
        },
      },
    })
    await nextTick()

    expect((wrapper.vm as any).shouldOpen).toBe(true)
    expect((wrapper.vm as any).open).toBe(true)

    await wrapper.find('.item').trigger('mouseenter')
    await nextTick()
    expect(mocks.getNodeActionButtons).toHaveBeenCalledWith(dirNode)
    expect(wrapper.find('.svg-icon').text()).toBe('plus')

    await wrapper.find('summary').trigger('contextmenu')
    expect(mocks.contextMenuShow).toHaveBeenCalledWith([{ label: 'Open' }])

    const dataTransfer = { getData: vi.fn(() => JSON.stringify(fileNode)) }
    await wrapper.find('details').trigger('drop', { dataTransfer, altKey: true })
    expect(mocks.duplicateDoc).toHaveBeenCalledWith(fileNode, undefined)
    expect((wrapper.vm as any).dragOver).toBe(false)
    vi.useRealTimers()
  })

  test('handles drag variants, file uploads, copy naming, move guards, and undo toasts', async () => {
    const imageNode = { ...fileNode, name: 'photo.png', path: '/docs/photo.png' }
    const imageWrapper = shallowMount(TreeNode, {
      props: { item: imageNode },
      global: { stubs: { SvgIcon: true } },
    })
    const imageTransfer = { setData: vi.fn() }
    await imageWrapper.find('.item-label').trigger('dragstart', { dataTransfer: imageTransfer })
    expect(imageTransfer.setData).toHaveBeenCalledWith('text/plain', '![Img](/docs/photo.png)')

    const plainNode = { ...fileNode, name: 'notes.txt', path: '/docs/notes.txt' }
    const plainWrapper = shallowMount(TreeNode, {
      props: { item: plainNode },
      global: { stubs: { SvgIcon: true } },
    })
    const plainTransfer = { setData: vi.fn() }
    await plainWrapper.find('.item-label').trigger('dragstart', { dataTransfer: plainTransfer })
    expect(plainTransfer.setData).toHaveBeenCalledWith('text/plain', '/docs/notes.txt')

    const wrapper = shallowMount(TreeNode, {
      props: { item: dirNode },
      global: {
        stubs: {
          TreeNode: true,
          SvgIcon: true,
        },
      },
    })

    await wrapper.find('details').trigger('drop', {
      altKey: true,
      dataTransfer: { getData: vi.fn(() => JSON.stringify(plainNode)) },
    })
    expect(mocks.duplicateDoc).toHaveBeenCalledWith(plainNode, '/docs/notes-copy.txt')
    expect(mocks.toastShow).toHaveBeenCalledWith('info', expect.anything(), 4000)

    await wrapper.find('details').trigger('drop', {
      altKey: false,
      dataTransfer: { getData: vi.fn(() => JSON.stringify({ ...dirNode, path: '/docs', name: 'docs' })) },
    })
    expect(mocks.toastShow).toHaveBeenCalledWith('warning', 'Cannot move to self or its children')

    const files = [
      new File(['a'], 'upload-a.md', { type: 'text/markdown' }),
      new File(['b'], 'upload-b.png', { type: 'image/png' }),
    ] as any
    files.item = (idx: number) => files[idx]
    mocks.upload.mockResolvedValue(undefined)
    await wrapper.find('details').trigger('drop', {
      dataTransfer: {
        getData: vi.fn(() => ''),
        items: [{ kind: 'file' }],
        files,
      },
    })
    await flushPromises()
    expect(mocks.upload).toHaveBeenCalledWith('repo', 'data:upload-a.md', '/docs/upload-a.md', 'rename')
    expect(mocks.upload).toHaveBeenCalledWith('repo', 'data:upload-b.png', '/docs/upload-b.png', 'rename')
    expect(mocks.refreshTree).toHaveBeenCalled()

    const dataTransfer = { dropEffect: '' }
    await wrapper.find('details').trigger('dragover', { altKey: true, dataTransfer })
    expect(dataTransfer.dropEffect).toBe('copy')
    await wrapper.find('details').trigger('dragexit')
    expect((wrapper.vm as any).dragOver).toBe(false)
  })
})
