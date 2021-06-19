import { Plugin, Ctx } from '@fe/useful/plugin'
import store from '@fe/store'
import env from '@fe/useful/env'
import file from '@fe/useful/file'

const handleLink = (link: HTMLAnchorElement, ctx: Ctx) => {
  const { currentFile } = store.state
  const { repo: fileRepo, path: filePath } = currentFile

  // 系统中打开附件
  if (link.classList.contains('open')) {
    fetch(link.href.replace('api/attachment', 'api/open'))
    return true
  }

  const href = link.getAttribute('href') || ''

  if (/^(http:|https:|ftp:)\/\//i.test(href)) { // 处理外链
    // Electron 中打开外链
    if (env.isElectron) {
      env.require && env.require('opn')(link.href)
      return true
    }
  } else { // 处理相对链接
    if (/(\.md$|\.md#)/.test(href)) { // 处理打开相对 md 文件
      const tmp = decodeURI(href).split('#')

      let path = tmp[0]
      if (path.startsWith('.')) { // 将相对路径转换为绝对路径
        path = file.dirname(filePath || '') + path.replace('.', '')
      }

      // 打开文件
      store.commit('setCurrentFile', {
        path,
        name: file.basename(path),
        repo: fileRepo,
        type: 'file'
      })

      // 跳转锚点
      const hash = tmp.slice(1).join('#')
      if (hash) {
        ctx.registerHook('ON_VIEW_RENDERED', () => {
          const el = document.getElementById(hash) ||
            document.getElementById(encodeURIComponent(hash))

          if (el) {
            // 如果是标题的话，也顺便将编辑器滚动到可视区域
            if (hash.startsWith('h-')) {
              el.click()
            }
            el.scrollIntoView()
          }
        }, true)
      }

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

export default {
  name: 'markdown-link',
  register: (ctx: Ctx) => {
    ctx.registerHook('ON_VIEW_ELEMENT_CLICK', async (e: MouseEvent) => {
      const target = e.target as HTMLElement

      const preventEvent = () => {
        e.preventDefault()
        e.stopPropagation()
        return true
      }

      if (target.tagName === 'A' || target.parentElement?.tagName === 'A') {
        if (handleLink(target as HTMLAnchorElement, ctx)) {
          return preventEvent()
        } else {
          return true
        }
      }

      return false
    })

    ctx.markdown.registerPlugin(md => {
      md.renderer.rules.link_open = (tokens, idx, options, _, slf) => {
        if (tokens[idx].attrIndex('target') < 0) {
          tokens[idx].attrPush(['target', '_blank'])
        }

        return slf.renderToken(tokens, idx, options)
      }
    })
  }
} as Plugin
