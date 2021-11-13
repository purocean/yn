import StateCore from 'markdown-it/lib/rules_core/state_core'
import Token from 'markdown-it/lib/token'
import { Plugin } from '@fe/context'
import store from '@fe/support/store'
import { sleep } from '@fe/utils'
import { isElectron, nodeRequire } from '@fe/support/env'
import { basename, dirname, join, resolve } from '@fe/utils/path'
import { switchDoc } from '@fe/services/document'

const handleLink = (link: HTMLAnchorElement, view: HTMLElement) => {
  const { currentFile } = store.state
  if (!currentFile) {
    return
  }

  const { repo: fileRepo, path: filePath } = currentFile

  // open attachment in os
  if (link.classList.contains('open')) {
    fetch(link.href.replace('api/attachment', 'api/open'))
    return true
  }

  const href = link.getAttribute('href') || ''

  if (/^(http:|https:|ftp:)\/\//i.test(href)) { // external link
    // use node opn in Electron.
    if (isElectron) {
      nodeRequire && nodeRequire('opn')(link.href)
      return true
    }
  } else { // relative link
    // better scrollIntoView
    const scrollIntoView = (el: HTMLElement) => {
      el.scrollIntoView()
      const wrap = view.parentElement
      // retain 60 px for better view.
      if (wrap && wrap.scrollHeight !== wrap.scrollTop + wrap.clientHeight) {
        wrap.scrollTop -= 60
      }
    }

    if (/(\.md$|\.md#)/.test(href)) { // markdown file
      const tmp = decodeURI(href).split('#')

      let path = tmp[0]
      if (!path.startsWith('/')) { // to absolute path
        path = join(dirname(filePath || ''), path)
      }

      switchDoc({
        path,
        name: basename(path),
        repo: fileRepo,
        type: 'file'
      }).then(async () => {
        const hash = tmp.slice(1).join('#')
        // jump anchor
        if (hash) {
          await sleep(50)
          const el = document.getElementById(hash) ||
            document.getElementById(encodeURIComponent(hash)) ||
            document.getElementById(hash.replace(/^h-/, '')) ||
            document.getElementById(encodeURIComponent(hash.replace(/^h-/, '')))

          if (el) {
            await sleep(0)
            scrollIntoView(el)

            // reveal editor lint when click heading
            if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName)) {
              el.click()
            }
          }
        }
      })

      return true
    } else if (href && href.startsWith('#')) { // for anchor
      const el = document.getElementById(href.replace(/^#/, ''))
      el && scrollIntoView(el)
      return true
    }

    return false
  }
}

function convertLink (state: StateCore) {
  const tags = ['audio', 'img', 'source', 'video', 'track', 'a']

  const { repo, path, name } = state.env.file || {}
  if (!repo || !path || !name) {
    return false
  }

  const link = (token: Token) => {
    const attrName = token.tag === 'a' ? 'href' : 'src'
    const attrVal = decodeURIComponent(token.attrGet(attrName) || '')
    if (!attrVal) {
      return
    }

    if (/^[^:]*:/.test(attrVal) || attrVal.startsWith('//')) { // xxx:
      return
    }

    const basePath = dirname(path)
    const fileName = basename(attrVal)

    if (token.tag === 'a') {
      // keep markdown file.
      if (fileName.endsWith('.md')) {
        return
      }

      // keep anchor hash.
      if (attrVal.indexOf('#') > -1) {
        return
      }
    }

    token.attrSet(`origin-${attrName}`, attrVal)

    const val = attrVal.replace(/[#?].*$/, '')

    if (repo === '__help__') {
      token.attrSet(attrName, `api/help/file?path=${encodeURIComponent(val)}`)
      return
    }

    const filePath = resolve(basePath, val)
    token.attrSet(attrName, `api/attachment/${encodeURIComponent(fileName)}?repo=${repo}&path=${encodeURIComponent(filePath)}`)
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
    ctx.registerHook('VIEW_ELEMENT_CLICK', async ({ e, view }) => {
      const target = e.target as HTMLElement

      const preventEvent = () => {
        e.preventDefault()
        e.stopPropagation()
        return true
      }

      if (target.tagName === 'A' || target.parentElement?.tagName === 'A') {
        if (handleLink(target as HTMLAnchorElement, view)) {
          return preventEvent()
        } else {
          return true
        }
      }

      return false
    })

    ctx.markdown.registerPlugin(md => {
      md.core.ruler.push('convert_relative_path', convertLink)
      md.renderer.rules.link_open = (tokens, idx, options, _, slf) => {
        if (tokens[idx].attrIndex('target') < 0) {
          tokens[idx].attrPush(['target', '_blank'])
        }

        return slf.renderToken(tokens, idx, options)
      }
    })
  }
} as Plugin
