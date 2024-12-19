import StateCore from 'markdown-it/lib/rules_core/state_core'
import ctx, { Plugin } from '@fe/context'
import store from '@fe/support/store'
import { removeQuery } from '@fe/utils'
import { isElectron, isWindows } from '@fe/support/env'
import { useToast } from '@fe/support/ui/toast'
import { DOM_ATTR_NAME, DOM_CLASS_NAME } from '@fe/support/args'
import { basename, join } from '@fe/utils/path'
import { getAttachmentURL, openExternal, openPath } from '@fe/services/base'
import { getRepo } from '@fe/services/repo'
import { getAllCustomEditors } from '@fe/services/editor'
import { fetchTree } from '@fe/support/api'
import type { Doc } from '@share/types'
import { isMarkdownFile } from '@share/misc'
import { getRenderEnv } from '@fe/services/view'
import { convertResourceState, parseLink } from './lib'
import workerIndexerUrl from './worker-indexer?worker&url'
import type { ParseLinkResult } from '@fe/types'

function getAnchorElement (target: HTMLElement) {
  let cur: HTMLElement | null = target
  while (cur && cur.tagName !== 'A' && cur.tagName !== 'ARTICLE') {
    cur = cur.parentElement
  }

  return cur?.tagName === 'A' ? <HTMLAnchorElement>cur : null
}

function handleLink (link: HTMLAnchorElement): boolean {
  const currentFile = getRenderEnv()?.file || store.state.currentFile
  if (!currentFile) {
    return false
  }

  const href = link.getAttribute('href') || ''

  if (!href.trim()) {
    useToast().show('warning', 'Link is empty.')
    return true
  }

  const _switchDoc = async (parsedLink: ParseLinkResult | null) => {
    if (parsedLink?.type !== 'internal') {
      ctx.ui.useToast().show('warning', 'Invalid File Path.')
      return
    }

    const file: Doc = parsedLink.path
      ? { path: parsedLink.path, type: 'file', name: parsedLink.name || basename(parsedLink.path), repo: currentFile.repo }
      : currentFile

    await ctx.doc.switchDoc(file, { source: 'markdown-link', position: parsedLink.position })
  }

  const isWikiLink = !!link.getAttribute(DOM_ATTR_NAME.WIKI_LINK)
  if (!isWikiLink) {
    const parsedLink = parseLink(currentFile, href, false)
    if (parsedLink?.type === 'external') {
      if (/^file:\/\//i.test(parsedLink?.href)) {
        openPath(decodeURI(parsedLink.href.replace(/^file:\/\//i, '')))
        return true
      } else if (/javascript:/i.test(href)) {
        return false
      } else {
        try {
          if (isElectron) {
            openExternal(link.href)
          } else {
            window.open(link.href)
          }
        } catch (error) {
          console.error(error)
          useToast().show('warning', 'Failed to open link')
        }

        return true
      }
    } else if (parsedLink?.type === 'internal') {
      const openFile = () => {
        const parsedLink = parseLink(currentFile, href, false)
        const path = (parsedLink && 'path' in parsedLink) ? parsedLink.path : ''

        if (!path) {
          return true
        }

        let basePath = (getRepo(currentFile.repo)?.path || '/')

        // net drive path start with '\\' on Windows, so we need to replace '/' to '\\' to prevent `join` lost the first part.
        if (isWindows) {
          basePath = basePath.replaceAll('/', '\\')
        }

        openPath(join(basePath, path))
      }

      if (link.classList.contains(DOM_CLASS_NAME.MARK_OPEN)) {
        openFile()
        return true
      } else if (
        (!parsedLink.path && parsedLink.position) || // anchor
        isMarkdownFile(parsedLink.path) || // markdown file
        getAllCustomEditors() // custom editor support
          .some(x => x.when?.({ doc: { path: parsedLink.path, type: 'file', name: basename(parsedLink.path), repo: currentFile.repo } }))
      ) {
        _switchDoc(parsedLink)
        return true
      } else {
        openFile()
        return true
      }
    } else {
      useToast().show('warning', 'Invalid link.')
      return true
    }
  } else {
    if (store.state.currentRepo?.name === currentFile.repo && store.state.tree) {
      _switchDoc(parseLink(currentFile, href, true, store.state.tree))
    } else {
      fetchTree(currentFile.repo, { by: 'mtime', order: 'desc' }).catch(() => []).then(tree => {
        const parsedLink = parseLink(currentFile, href, true, tree)
        _switchDoc(parsedLink)
      })
    }

    return true
  }
}

function convertLink (state: StateCore) {
  const currentFile = state.env.file || store.state.currentFile
  return convertResourceState(currentFile, state, getAttachmentURL)
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
      md.core.ruler.push('convert-relative-path', convertLink)
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

    ctx.indexer.importScriptsToWorker(new URL(workerIndexerUrl, import.meta.url))

    return { mdRuleConvertLink: convertLink, htmlHandleLink: handleLink }
  }
} as Plugin
