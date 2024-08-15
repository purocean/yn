import { basename, dirname, join, normalizeSep, resolve } from '@fe/utils/path'
import { MARKDOWN_FILE_EXT } from '@share/misc'
import { DOM_ATTR_NAME, RESOURCE_TAG_NAMES } from '@fe/support/args'
import { getLogger, removeQuery } from '@fe/utils/pure'
import { isWindows } from '@fe/support/env'
import type { Token } from 'markdown-it'
import type StateCore from 'markdown-it/lib/rules_core/state_core'
import type { Components, Doc, PathItem, PositionState, ResourceTagName } from '@fe/types'

const logger = getLogger('markdown-link-lib')

const RE_POS = /:([0-9]+),?([0-9]+)?$/
const RE_EXTERNAL_LINK = /^[a-zA-Z]{1,}:/

export function isAnchorToken (token: Token) {
  return token.tag === 'a'
}

export function isResourceToken (token: Token) {
  return RESOURCE_TAG_NAMES.includes(token.tag as ResourceTagName)
}

export function normalizeExternalLink (link: string) {
  if (link.startsWith('//')) {
    return 'https:' + link
  }

  if (isWindows && /^[a-zA-Z]:[\\/].+/.test(link)) { // windows path
    return 'file://' + link
  }

  return link
}

export function isDataUrl (url: string) {
  return url.startsWith('data:')
}

export function getFirstMatchPath (tree: Components.Tree.Node[], dir: string, fileName: string) {
  if (fileName.includes('/')) {
    return fileName
  }

  const findInDir = (items: Components.Tree.Node[]): string | null => {
    for (const item of items) {
      const p = normalizeSep(item.path)
      if (
        item.type === 'file' &&
          (p === normalizeSep(join(dir, fileName)) ||
          p === normalizeSep(join(dir, fileName + MARKDOWN_FILE_EXT)))
      ) {
        return item.path
      }

      if (item.children) {
        const found = findInDir(item.children)
        if (found) {
          return found
        }
      }
    }

    return null
  }

  const findByName = (items: Components.Tree.Node[]): string | null => {
    for (const item of items) {
      if (item.type === 'file' && (item.name === fileName || item.name === `${fileName}${MARKDOWN_FILE_EXT}`)) {
        return item.path
      }

      if (item.children) {
        const found = findByName(item.children)
        if (found) {
          return found
        }
      }
    }

    return null
  }

  return findInDir(tree) || findByName(tree)
}

export function convertResourceState (currentFile: PathItem, state: StateCore, buildAttachmentUrl?: (file: Doc) => string) {
  const { repo, path } = currentFile || {}
  if (!repo || !path) {
    throw new Error('currentFile is required')
  }

  const link = (token: Token) => {
    const attrName = 'src'
    let attrVal = decodeURIComponent(token.attrGet(attrName) || '')
    if (!attrVal) {
      return
    }

    attrVal = normalizeExternalLink(attrVal)

    if (RE_EXTERNAL_LINK.test(attrVal)) { // external link
      return
    }

    const basePath = dirname(path)

    const originAttr = DOM_ATTR_NAME.ORIGIN_SRC
    const originPath = removeQuery(attrVal).replace(RE_POS, '')
    const filePath = resolve(basePath, originPath)
    const fileName = basename(filePath)

    const file: Doc = {
      type: 'file',
      repo,
      path: filePath,
      name: fileName,
    }

    token.attrSet(DOM_ATTR_NAME.LOCAL_IMAGE, 'true')
    token.attrSet(DOM_ATTR_NAME.TARGET_PATH, filePath)
    token.attrSet(DOM_ATTR_NAME.TARGET_REPO, repo)
    token.attrSet(originAttr, attrVal)

    if (buildAttachmentUrl) {
      token.attrSet(attrName, buildAttachmentUrl(file))
    }
  }

  const convert = (tokens: Token[]) => {
    tokens.forEach(token => {
      if (isResourceToken(token)) {
        link(token)
      }

      if (token.children) {
        convert(token.children)
      }
    })
  }

  convert(state.tokens)

  return true
}

export type ParseLinkResult = { type: 'external', href: string } | { type: 'internal', path: string, position: PositionState | null }
export function parseLink (currentFile: PathItem, href: string, isWikiLink: false): ParseLinkResult | null
export function parseLink (currentFile: PathItem, href: string, isWikiLink: true, tree: Components.Tree.Node[]): ParseLinkResult | null
export function parseLink (currentFile: PathItem, href: string, isWikiLink: boolean, tree?: Components.Tree.Node[]): ParseLinkResult | null {
  if (!currentFile) {
    return null
  }

  href = href.trim()

  if (!href) {
    return null
  }

  href = normalizeExternalLink(href)

  if (RE_EXTERNAL_LINK.test(href)) {
    return { type: 'external', href }
  }

  const tmp = decodeURI(href).split('#')

  const parsePathPos = (path: string): {pos: [number, number] | null, path: string} => {
    const match = path.match(RE_POS)
    let pos: [number, number] | null = null
    if (match) {
      path = path.replace(RE_POS, '')
      pos = [parseInt(match[1]), match[2] ? parseInt(match[2]) : 1]
    }

    return { pos, path }
  }

  let { path, pos } = parsePathPos(normalizeSep(tmp[0]))
  const baseDir = dirname(currentFile.path)
  path = path.trim()

  if (path) {
    if (isWikiLink && tree) {
      path = normalizeSep(path)
      path = path.replace(/:/g, '/') // replace all ':' to '/'
      path = getFirstMatchPath(tree, baseDir, path) || path
      path = path.endsWith(MARKDOWN_FILE_EXT) ? path : `${path}${MARKDOWN_FILE_EXT}`
    }

    if (!path.startsWith('/')) { // to absolute path
      path = join(baseDir, path)
    }
  }

  const hash = tmp.slice(1).join('#')
  const position: PositionState | null = pos ? { line: pos[0], column: pos[1] } : hash ? { anchor: hash } : null

  const result: ParseLinkResult = { type: 'internal', path, position }

  logger.debug('parseLink', href, result)

  return result
}
