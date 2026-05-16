vi.mock('@fe/core/hook', () => ({
  triggerHook: vi.fn(),
}))

import { DOM_ATTR_NAME } from '@fe/support/args'
import { triggerHook } from '@fe/core/hook'
import {
  convertResourceState,
  getFirstMdMatchPath,
  isAnchorToken,
  isDataUrl,
  isResourceToken,
  normalizeExternalLink,
  parseLink,
} from '../lib'

function createToken (tag: string, attrs: Record<string, string> = {}, children?: any[]) {
  const token = {
    tag,
    type: tag,
    attrs: Object.entries(attrs),
    children,
    attrGet (name: string) {
      return this.attrs.find(([key]) => key === name)?.[1] ?? null
    },
    attrSet (name: string, value: string) {
      const item = this.attrs.find(([key]) => key === name)
      if (item) {
        item[1] = value
      } else {
        this.attrs.push([name, value])
      }
    },
  }

  return token
}

const currentFile = {
  type: 'file',
  repo: 'repo-a',
  path: '/notes/current.md',
  name: 'current.md',
} as any

describe('markdown-link lib', () => {
  beforeEach(() => {
    vi.mocked(triggerHook).mockClear()
  })

  test('identifies anchor, resource, and data URL inputs', () => {
    expect(isAnchorToken({ tag: 'a' } as any)).toBe(true)
    expect(isAnchorToken({ tag: 'img' } as any)).toBe(false)
    expect(isResourceToken({ tag: 'img' } as any)).toBe(true)
    expect(isResourceToken({ tag: 'a' } as any)).toBe(false)
    expect(isDataUrl('data:image/png;base64,abc')).toBe(true)
    expect(isDataUrl('https://example.com/image.png')).toBe(false)
  })

  test('normalizes protocol-relative external links', () => {
    expect(normalizeExternalLink('//cdn.example.com/app.js')).toBe('https://cdn.example.com/app.js')
    expect(normalizeExternalLink('https://example.com')).toBe('https://example.com')
  })

  test('finds markdown files in the current directory before falling back to the first tree match', () => {
    const tree = [
      { type: 'file', name: 'Topic.md', path: '/archive/Topic.md' },
      {
        type: 'folder',
        name: 'notes',
        path: '/notes',
        children: [
          { type: 'file', name: 'Topic.md', path: '/notes/Topic.md' },
          { type: 'file', name: 'Draft.txt', path: '/notes/Draft.txt' },
        ],
      },
    ] as any

    expect(getFirstMdMatchPath(tree, '/notes', 'Topic.md')).toBe('/notes/Topic.md')
    expect(getFirstMdMatchPath(tree, '/missing', 'Topic.md')).toBe('/archive/Topic.md')
    expect(getFirstMdMatchPath(tree, '/notes', 'folder/Topic.md')).toBe('folder/Topic.md')
    expect(getFirstMdMatchPath(tree, '/notes', 'Draft.txt')).toBe(null)
  })

  test('parses external links and internal links with decoded paths and line positions', () => {
    expect(parseLink(currentFile, ' //example.com/a.png ', false)).toEqual({
      type: 'external',
      href: 'https://example.com/a.png',
    })

    const result = parseLink(currentFile, 'docs/Page%20One.md:12,5#ignored-anchor', false)

    expect(result).toEqual({
      type: 'internal',
      path: '/notes/docs/Page One.md',
      name: 'Page One.md',
      position: { line: 12, column: 5 },
    })
    expect(triggerHook).toHaveBeenCalledWith('AFTER_PARSE_LINK', {
      params: {
        currentFile,
        href: 'docs/Page%20One.md:12,5#ignored-anchor',
        isWikiLink: false,
        tree: undefined,
      },
      result,
    })
  })

  test('parses internal hash anchors when no line position is present', () => {
    expect(parseLink(currentFile, './guide.md#Getting Started', false)).toEqual({
      type: 'internal',
      path: '/notes/guide.md',
      name: 'guide.md',
      position: { anchor: 'Getting Started' },
    })
  })

  test('resolves wiki links through markdown tree matches and appends markdown extension', () => {
    const tree = [
      { type: 'file', name: 'Topic.md', path: '/archive/Topic.md' },
      { type: 'file', name: 'Other.mdx', path: '/notes/Other.mdx' },
    ] as any

    expect(parseLink(currentFile, 'Topic', true, tree)).toEqual({
      type: 'internal',
      path: '/archive/Topic.md',
      name: 'Topic.md',
      position: null,
    })

    expect(parseLink(currentFile, 'folder/Nested#Part', true, tree)).toEqual({
      type: 'internal',
      path: '/notes/folder/Nested.md',
      name: 'Nested.md',
      position: { anchor: 'Part' },
    })
  })

  test('returns null for empty link inputs', () => {
    expect(parseLink(null as any, 'target.md', false)).toBe(null)
    expect(parseLink(currentFile, '  ', false)).toBe(null)
  })

  test('converts local resource tokens recursively and leaves external resources unchanged', () => {
    const nestedImage = createToken('img', { src: 'assets/photo%201.png:3,2?cache=1' })
    const externalImage = createToken('img', { src: 'https://example.com/photo.png' })
    const audio = createToken('img', { src: './voice.mp3' })
    const parent = createToken('span', {}, [nestedImage, externalImage, audio])
    const state = { tokens: [parent] } as any
    const buildAttachmentUrl = vi.fn((file) => `asset://${file.repo}${file.path}`)

    expect(convertResourceState(currentFile, state, buildAttachmentUrl)).toBe(true)

    expect(nestedImage.attrGet(DOM_ATTR_NAME.TARGET_PATH)).toBe('/notes/assets/photo 1.png')
    expect(nestedImage.attrGet(DOM_ATTR_NAME.TARGET_REPO)).toBe('repo-a')
    expect(nestedImage.attrGet(DOM_ATTR_NAME.ORIGIN_SRC)).toBe('assets/photo 1.png:3,2?cache=1')
    expect(nestedImage.attrGet(DOM_ATTR_NAME.LOCAL_IMAGE)).toBe('true')
    expect(nestedImage.attrGet('src')).toBe('asset://repo-a/notes/assets/photo 1.png')
    expect(externalImage.attrGet(DOM_ATTR_NAME.TARGET_PATH)).toBe(null)
    expect(audio.tag).toBe('audio')
    expect(audio.type).toBe('media')
    expect(audio.attrGet('preload')).toBe('none')
  })

  test('requires current file context when converting resources', () => {
    expect(() => convertResourceState(null as any, { tokens: [] } as any)).toThrow('currentFile is required')
  })
})
