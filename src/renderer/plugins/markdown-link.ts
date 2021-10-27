import StateCore from 'markdown-it/lib/rules_core/state_core'
import Token from 'markdown-it/lib/token'
import { Plugin } from '@fe/context'
import store from '@fe/support/store'
import { sleep } from '@fe/utils'
import { isElectron, nodeRequire } from '@fe/support/env'
import { basename, dirname, join, resolve } from '@fe/utils/path'
import { switchDoc } from '@fe/services/document'

const handleLink = (link: HTMLAnchorElement) => {
  const { currentFile } = store.state
  if (!currentFile) {
    return
  }

  const { repo: fileRepo, path: filePath } = currentFile

  // 系统中打开附件
  if (link.classList.contains('open')) {
    fetch(link.href.replace('api/attachment', 'api/open'))
    return true
  }

  const href = link.getAttribute('href') || ''

  if (/^(http:|https:|ftp:)\/\//i.test(href)) { // 处理外链
    // Electron 中打开外链
    if (isElectron) {
      nodeRequire && nodeRequire('opn')(link.href)
      return true
    }
  } else { // 处理相对链接
    if (/(\.md$|\.md#)/.test(href)) { // 处理打开相对 md 文件
      const tmp = decodeURI(href).split('#')

      let path = tmp[0]
      if (!path.startsWith('/')) { // 将相对路径转换为绝对路径
        path = join(dirname(filePath || ''), path)
      }

      // 打开文件
      switchDoc({
        path,
        name: basename(path),
        repo: fileRepo,
        type: 'file'
      }).then(async () => {
        const hash = tmp.slice(1).join('#')
        // 跳转锚点
        if (hash) {
          await sleep(50)
          const el = document.getElementById(hash) ||
            document.getElementById(encodeURIComponent(hash)) ||
            document.getElementById(hash.replace(/^h-/, '')) ||
            document.getElementById(encodeURIComponent(hash.replace(/^h-/, '')))

          if (el) {
            el.scrollIntoView()

            // 如果是标题的话，也顺便将编辑器滚动到可视区域
            if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName)) {
              el.click()
            }
          }
        }
      })

      return true
    } else if (href && href.startsWith('#')) { // 处理 TOC 跳转
      const el = document.getElementById(href.replace(/^#/, ''))
      if (el) {
        el.scrollIntoView()
      }
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

    if (/^[^:]*:/.test(attrVal) || attrVal.startsWith('//')) { // xxx: : 开头不转换
      return
    }

    const basePath = dirname(path)
    const fileName = basename(attrVal)

    if (token.tag === 'a') {
      // md 文件不替换
      if (fileName.endsWith('.md')) {
        return
      }

      // 路径中有 hash 不替换
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
    ctx.registerHook('ON_VIEW_ELEMENT_CLICK', async (e: MouseEvent) => {
      const target = e.target as HTMLElement

      const preventEvent = () => {
        e.preventDefault()
        e.stopPropagation()
        return true
      }

      if (target.tagName === 'A' || target.parentElement?.tagName === 'A') {
        if (handleLink(target as HTMLAnchorElement)) {
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
