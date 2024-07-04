import StateCore from 'markdown-it/lib/rules_core/state_core'
import Token from 'markdown-it/lib/token'
import ctx, { Plugin } from '@fe/context'
import store from '@fe/support/store'
import { removeQuery } from '@fe/utils'
import { isElectron, isWindows } from '@fe/support/env'
import { useToast } from '@fe/support/ui/toast'
import { DOM_ATTR_NAME, DOM_CLASS_NAME } from '@fe/support/args'
import { basename, dirname, join, normalizeSep, resolve } from '@fe/utils/path'
import { getAttachmentURL, getRepo, openExternal, openPath } from '@fe/services/base'
import { getAllCustomEditors } from '@fe/services/editor'
import { fetchTree } from '@fe/support/api'
import type { Doc } from '@share/types'
import type { Components, PositionState } from '@fe/types'

async function getFirstMatchPath (repo: string, dir: string, fileName: string) {
  if (fileName.includes('/')) {
    return fileName
  }

  const findInDir = (items: Components.Tree.Node[]): string | null => {
    for (const item of items) {
      const p = normalizeSep(item.path)
      if (
        item.type === 'file' &&
          (p === normalizeSep(join(dir, fileName)) ||
          p === normalizeSep(join(dir, `${fileName}.md`)))
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
      if (item.type === 'file' && (item.name === fileName || item.name === `${fileName}.md`)) {
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

  const tree = await fetchTree(repo, { by: 'mtime', order: 'desc' }).catch(() => [])

  return findInDir(tree) || findByName(tree)
}

function getAnchorElement (target: HTMLElement) {
  let cur: HTMLElement | null = target
  while (cur && cur.tagName !== 'A' && cur.tagName !== 'ARTICLE') {
    cur = cur.parentElement
  }

  return cur?.tagName === 'A' ? <HTMLAnchorElement>cur : null
}

function handleLink (link: HTMLAnchorElement): boolean {
  const { currentFile } = store.state
  if (!currentFile) {
    return false
  }

  const { repo: fileRepo, path: filePath } = currentFile

  // open attachment in os
  const href = link.getAttribute('href') || ''

  if (!href.trim()) {
    useToast().show('warning', 'Link is empty.')
    return true
  } else if (/^(http:|https:|ftp:)\/\//i.test(href) || /^(mailto|tel):/i.test(href)) { // external link
    if (isElectron) {
      openExternal(link.href)
    } else {
      window.open(link.href)
    }

    return true
  } else if (/^file:\/\//i.test(href)) {
    openPath(decodeURI(href.replace(/^file:\/\//i, '')))
    return true
  } else if (link.classList.contains(DOM_CLASS_NAME.MARK_OPEN)) {
    const path = link.getAttribute(DOM_ATTR_NAME.ORIGIN_HREF) || decodeURI(href)

    let basePath = path.startsWith('/')
      ? (getRepo(fileRepo)?.path || '/')
      : dirname(currentFile.absolutePath || '/')

    // net drive path start with '\\' on Windows, so we need to replace '/' to '\\' to prevent `join` lost the first part.
    if (isWindows) {
      basePath = basePath.replaceAll('/', '\\')
    }

    openPath(join(basePath, path))
    return true
  } else { // relative link
    const tmp = decodeURI(href).split('#')
    const rePos = /:([0-9]+),?([0-9]+)?$/

    const parsePathPos = (path: string): {pos: [number, number] | null, path: string} => {
      const match = path.match(rePos)
      let pos: [number, number] | null = null
      if (match) {
        path = path.replace(rePos, '')
        pos = [parseInt(match[1]), match[2] ? parseInt(match[2]) : 1]
      }

      return { pos, path }
    }

    const isWikiLink = !!link.getAttribute(DOM_ATTR_NAME.WIKI_LINK)

    const _switchDoc = async () => {
      let { path, pos } = parsePathPos(normalizeSep(tmp[0]))
      const dir = dirname(filePath || '')

      if (isWikiLink) {
        path = normalizeSep(path)
        path = path.replace(/:/g, '/') // replace all ':' to '/'
        path = await getFirstMatchPath(fileRepo, dir, path) || path
        path = path.endsWith('.md') ? path : `${path}.md`
      }

      if (!path.startsWith('/')) { // to absolute path
        path = join(dir, path)
      }

      const file: Doc = { path, type: 'file', name: basename(path), repo: fileRepo }

      const hash = tmp.slice(1).join('#')
      const position: PositionState | null = pos ? { line: pos[0], column: pos[1] } : hash ? { anchor: hash } : null
      await ctx.doc.switchDoc(file, { source: 'markdown-link', position })
    }

    const path = normalizeSep(tmp[0])
    const file: Doc = { path, type: 'file', name: basename(path), repo: fileRepo }

    const isMarkdownFile = /(\.md$|\.md#|\.md:)/.test(href)
    const supportOpenDirectly = isMarkdownFile || getAllCustomEditors().some(x => x.when?.({ doc: file }))

    if (supportOpenDirectly) {
      _switchDoc()
      return true
    } else if (href && href.startsWith('#')) { // for anchor
      const position: PositionState = { anchor: href.replace(/^#/, '') }
      ctx.doc.switchDoc(ctx.store.state.currentFile!, { source: 'markdown-link', position })
      return true
    } else if (href && href.startsWith(':') && rePos.test(href)) { // for pos
      const { pos } = parsePathPos(href)
      if (pos) {
        const position = { line: pos[0], column: pos[1] }
        ctx.doc.switchDoc(ctx.store.state.currentFile!, { source: 'markdown-link', position })
      }
      return true
    } else if (isWikiLink) {
      _switchDoc()
      return true
    } else {
      return false
    }
  }
}

function convertLink (state: StateCore) {
  const tags = ['audio', 'img', 'source', 'video', 'track', 'a', 'iframe', 'embed']

  const { repo, path, name } = state.env.file || {}
  if (!repo || !path || !name) {
    return false
  }

  const link = (token: Token) => {
    if (token.attrGet(DOM_ATTR_NAME.WIKI_LINK)) {
      return
    }

    const isAnchor = token.tag === 'a'
    const attrName = isAnchor ? 'href' : 'src'
    const attrVal = decodeURIComponent(token.attrGet(attrName) || '')
    if (!attrVal) {
      return
    }

    if (/^[^:]*:/.test(attrVal) || attrVal.startsWith('//')) { // xxx:
      return
    }

    const basePath = dirname(path)
    const fileName = basename(removeQuery(attrVal))

    const originAttr = isAnchor ? DOM_ATTR_NAME.ORIGIN_HREF : DOM_ATTR_NAME.ORIGIN_SRC
    const originPath = removeQuery(attrVal)
    const filePath = resolve(basePath, originPath)

    if (isAnchor) {
      // keep markdown file.
      if (fileName.endsWith('.md')) {
        return
      }

      // keep anchor hash.
      if (attrVal.indexOf('#') > -1) {
        return
      }

      // support custom editor
      const file: Doc = { path: resolve(basePath, attrVal), type: 'file', name: fileName, repo }
      if (getAllCustomEditors().some(x => x.when?.({ doc: file }))) {
        return
      }

      // open other file in os
      token.attrJoin('class', DOM_CLASS_NAME.MARK_OPEN)
    } else {
      token.attrSet(DOM_ATTR_NAME.LOCAL_IMAGE, 'true')
    }

    const targetUri = getAttachmentURL({
      type: 'file',
      repo,
      path: filePath,
      name: fileName,
    })

    token.attrSet(DOM_ATTR_NAME.TARGET_PATH, filePath)
    token.attrSet(DOM_ATTR_NAME.TARGET_REPO, repo)
    token.attrSet(originAttr, attrVal)
    token.attrSet(attrName, targetUri)
  }

  const convert = (tokens: Token[]) => {
    tokens.forEach(token => {
      if (tags.includes(token.tag)) {
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

export default {
  name: 'markdown-link',
  register: (ctx) => {
    ctx.registerHook('VIEW_ON_GET_HTML_FILTER_NODE', async ({ node, options }) => {
      // local image
      const src = (node as any).src
      if (src && node.getAttribute(DOM_ATTR_NAME.LOCAL_IMAGE)) {
        if (options.useRemoteSrcOfLocalImage) {
          node.setAttribute('src', src)
          return
        }

        if (options.inlineLocalImage || options.uploadLocalImage) {
          try {
            const originSrc = node.getAttribute(DOM_ATTR_NAME.ORIGIN_SRC)
            const res: Response = await ctx.api.fetchHttp(src)
            const fileName = originSrc ? ctx.utils.path.basename(removeQuery(originSrc)) : 'img'
            const file = new File(
              [await res.blob()],
              fileName,
              { type: ctx.lib.mime.getType(fileName) || undefined }
            )

            let url: string | undefined
            if (options.inlineLocalImage) {
              url = await ctx.utils.fileToBase64URL(file)
            } else if (options.uploadLocalImage) {
              url = await ctx.action.getActionHandler('plugin.image-hosting-picgo.upload')(file)
            }

            if (url) {
              node.setAttribute('src', url)
              node.removeAttribute(DOM_ATTR_NAME.ORIGIN_SRC)
            }
          } catch (error) {
            console.log(error)
          }
        } else {
          node.setAttribute('src', src)
        }
      }

      const originSrc = node.getAttribute(DOM_ATTR_NAME.ORIGIN_SRC)
      if (originSrc) {
        node.setAttribute('src', originSrc)
        node.removeAttribute(DOM_ATTR_NAME.ORIGIN_SRC)
      }
    })

    ctx.registerHook('VIEW_ELEMENT_CLICK', async ({ e }) => {
      const anchorTarget = getAnchorElement(<HTMLElement>e.target)

      if (anchorTarget) {
        if (handleLink(anchorTarget)) {
          e.preventDefault()
          e.stopPropagation()
          return true
        } else {
          return true
        }
      }

      return false
    })

    ctx.registerHook('VIEW_AFTER_REFRESH', () => {
      ctx.view.getRenderIframe().then(iframe => {
        // reload all images
        const images = iframe.contentDocument!.querySelectorAll('img')
        for (let i = 0; i < images.length; i++) {
          const img = images[i]

          if (img.getAttribute(DOM_ATTR_NAME.LOCAL_IMAGE)) {
            if (img.src) {
              // add timestamp to force reload
              img.src = img.src.includes('?') ? `${img.src}&_t=${Date.now()}` : `${img.src}?_t=${Date.now()}`
            }
          }
        }
      })
    })

    ctx.registerHook('DOC_SWITCH_SKIPPED', ({ opts }) => {
      if (opts?.position) {
        ctx.routines.changePosition(opts.position)
      }
    })

    ctx.registerHook('DOC_SWITCHED', ({ doc, opts }) => {
      if (doc && opts?.position) {
        ctx.routines.changePosition(opts.position)
      }
    })

    ctx.markdown.registerPlugin(md => {
      md.core.ruler.push('convert_relative_path', convertLink)
      md.renderer.rules.link_open = (tokens, idx, options, _, slf) => {
        if (tokens[idx].attrIndex('target') < 0) {
          tokens[idx].attrPush(['target', '_blank'])
        }

        return slf.renderToken(tokens, idx, options)
      }

      // skip link validate
      md.validateLink = () => true
    })

    ctx.view.tapContextMenus((menus, e) => {
      const target = e.target as HTMLLinkElement
      const parent = target.parentElement
      const link = target.getAttribute('href') || ''
      const text = target.innerText

      if (
        target.tagName === 'A' &&
        parent?.dataset?.sourceLine &&
        (text === link || text === decodeURI(link)) &&
        /^http:\/\/|^https:\/\//.test(link)
      ) {
        menus.push({
          id: 'plugin.markdown-link.transform-link',
          type: 'normal',
          label: ctx.i18n.t('markdown-link.convert-to-titled-link'),
          onClick: async () => {
            try {
              ctx.ui.useToast().show('info', 'Loading……', 0)
              const res = await ctx.api.proxyFetch(target.href, { timeout: 10000 }).then(r => r.text())
              const match = res.match(/<title[^>]*>([^<]*)<\/title>/si) || []
              const title = ctx.lib.lodash.unescape(match[1] || '').trim()

              if (!title) {
                throw new Error('No title')
              }

              const lineStart = parseInt(parent.getAttribute(DOM_ATTR_NAME.SOURCE_LINE_START) || '0')
              const lineEnd = parseInt(parent.getAttribute(DOM_ATTR_NAME.SOURCE_LINE_END) || '0') - 1

              const content = ctx.editor.getLinesContent(lineStart, lineEnd)
                .replace(new RegExp(`(?<!\\()<?${link}>?(?!\\))`, 'i'), `[${title}](${link})`)

              ctx.editor.replaceLines(lineStart, lineEnd, content)
              ctx.ui.useToast().hide()
            } catch (error: any) {
              console.error(error)
              ctx.ui.useToast().show('warning', error.message)
            }
          }
        })
      }
    })

    return { mdRuleConvertLink: convertLink, htmlHandleLink: handleLink }
  }
} as Plugin
