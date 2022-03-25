import juice from 'juice'
import { CtrlCmd, Escape, registerCommand } from '@fe/core/command'
import { getActionHandler, registerAction } from '@fe/core/action'
import { triggerHook } from '@fe/core/hook'
import { DOM_CLASS_NAME } from '@fe/support/constant'
import { useToast } from '@fe/support/ui/toast'
import store from '@fe/support/store'
import type { BuildInHookTypes, Components } from '@fe/types'
import { t } from './i18n'
import { emitResize } from './layout'
import { switchDoc } from './document'

export type MenuItem = Components.ContextMenu.Item
export type BuildContextMenu = (items: MenuItem[], e: MouseEvent) => void
export type Heading = {
  tag: string;
  class: string[];
  text: string;
  level: number;
  sourceLine: number;
}

let tmpEnableSyncScroll = true
let syncScrollTimer: any

const contextMenuFunList: BuildContextMenu[] = []

function present (flag: boolean) {
  if (flag) {
    useToast().show('info', t('exit-presentation-msg'))
  }
  store.commit('setPresentation', flag)
  setTimeout(() => {
    emitResize()
  }, 0)
}

/**
 * Rerender view.
 */
export function render () {
  getActionHandler('view.render')()
}

/**
 * Render Markdown immediately.
 */
export function renderImmediately () {
  getActionHandler('view.render-immediately')()
}

/**
 * Refresh view.
 */
export async function refresh () {
  if (store.state.currentFile) {
    const { type, name, path, repo } = store.state.currentFile
    await switchDoc({ type, name, path, repo }, true)
  }

  getActionHandler('view.refresh')()
}

/**
 * Reveal line.
 * @param startLine
 */
export function revealLine (startLine: number) {
  getActionHandler('view.reveal-line')(startLine)
}

/**
 * Scroll to a position.
 * @param top
 */
export function scrollTopTo (top: number) {
  getActionHandler('view.scroll-top-to')(top)
}

export function getPreviewStyles () {
  let styles = 'article.markdown-body { max-width: 980px; margin: 20px auto; }'
  Array.prototype.forEach.call(document.styleSheets, item => {
    // inject global styles, normalize.css
    const flag = item.cssRules[0] &&
      item.cssRules[0].selectorText === 'html' &&
      item.cssRules[0].cssText === 'html { line-height: 1.15; text-size-adjust: 100%; }'

    Array.prototype.forEach.call(item.cssRules, (rule) => {
      if (rule.selectorText && (
        flag ||
        rule.selectorText.includes('.markdown-body') ||
        rule.selectorText.startsWith('.katex')
      )) {
        // skip contain rules
        if (rule?.style?.getPropertyValue('--skip-contain')) {
          return
        }

        styles += rule.cssText.replace(/\.markdown-view /g, '') + '\n'
      }
    })
  })

  return styles
}

/**
 * Get rendered HTML.
 * @param options
 * @returns HTML
 */
export async function getContentHtml (options: BuildInHookTypes['VIEW_ON_GET_HTML_FILTER_NODE']['options'] = {}) {
  const { inlineStyle, nodeProcessor } = options

  async function filterHtml (html: string) {
    const div = document.createElement('div')
    div.innerHTML = html

    const filter = async (node: HTMLElement) => {
      if (nodeProcessor) {
        nodeProcessor(node)
      }

      if (await triggerHook('VIEW_ON_GET_HTML_FILTER_NODE', { node, options }, { breakable: true })) {
        return
      }

      if (node.classList.contains(DOM_CLASS_NAME.SKIP_PRINT) || node.classList.contains(DOM_CLASS_NAME.SKIP_EXPORT)) {
        node.remove()
        return
      }

      if (node.classList.length < 1) {
        node.removeAttribute('class')
      }

      if (node.tagName !== 'ABBR') {
        node.removeAttribute('title')
      }

      if (node.dataset) {
        Object.keys(node.dataset).forEach(key => {
          delete node.dataset[key]
        })
      }

      const len = node.children.length
      for (let i = len - 1; i >= 0; i--) {
        const ele = node.children[i]
        await filter(ele as HTMLElement)
      }
    }

    await filter(div)

    div.firstElementChild?.setAttribute('powered-by', 'Yank Note')
    return div.innerHTML || ''
  }

  let html = getActionHandler('view.get-content-html')()
    .replace(/ src="/g, ' loading="lazy" src="')

  if (inlineStyle) {
    html = juice(html, { extraCss: getPreviewStyles() })
  }

  return (await filterHtml(html)).replace(/ loading="lazy"/g, '')
}

/**
 * Get view dom.
 * @returns
 */
export function getViewDom () {
  return getActionHandler('view.get-view-dom')()
}

/**
 * Get Headings
 */
export function getHeadings (): Heading[] {
  const tags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
  const dom = getViewDom()
  if (!dom) {
    return []
  }

  const nodes = dom.querySelectorAll<HTMLHeadElement>(tags.join(','))
  return Array.from(nodes).map(node => {
    const tag = node.tagName.toLowerCase()
    return {
      tag,
      class: [...node.classList, 'tag-' + tag],
      text: node.innerText,
      level: tags.indexOf(tag),
      sourceLine: parseInt(node.dataset.sourceLine || '0')
    }
  })
}

/**
 * Get render env.
 * @returns
 */
export function getRenderEnv () {
  return getActionHandler('view.get-render-env')()
}

/**
 * Enter presentation mode.
 */
export function enterPresent () {
  getActionHandler('view.enter-presentation')()
}

/**
 * Exit presentation mode.
 */
export function exitPresent () {
  getActionHandler('view.exit-presentation')()
}

/**
 * Toggle auto render preview.
 * @param flag
 */
export function toggleAutoPreview (flag?: boolean) {
  store.commit('setAutoPreview', typeof flag === 'boolean' ? flag : !store.state.autoPreview)
}

/**
 * Toggle sync scroll.
 * @param flag
 */
export function toggleSyncScroll (flag?: boolean) {
  store.commit('setSyncScroll', typeof flag === 'boolean' ? flag : !store.state.syncScroll)
}

/**
 * Add a context menu processor.
 * @param fun
 */
export function tapContextMenus (fun: BuildContextMenu) {
  contextMenuFunList.push(fun)
}

/**
 * Get context menus
 * @param e
 * @returns
 */
export function getContextMenuItems (e: MouseEvent) {
  const items: MenuItem[] = []

  contextMenuFunList.forEach((fun) => {
    fun(items, e)
  })

  return items
}

/**
 * get enableSyncScroll
 * @returns
 */
export function getEnableSyncScroll () {
  return tmpEnableSyncScroll && store.state.syncScroll
}

/**
 * disable sync scroll for a while
 * @param fn
 * @param timeout
 */
export async function disableSyncScrollAwhile (fn: Function, timeout = 500) {
  clearTimeout(syncScrollTimer)
  tmpEnableSyncScroll = false
  await fn()
  syncScrollTimer = setTimeout(() => {
    tmpEnableSyncScroll = true
  }, timeout)
}

registerAction({
  name: 'view.enter-presentation',
  handler: () => present(true),
  keys: ['F5']
})

registerAction({
  name: 'view.exit-presentation',
  handler: () => present(false),
  keys: [Escape],
  when: () => {
    const el = window.document.activeElement
    return store.state.presentation &&
      el?.tagName !== 'INPUT' &&
      el?.tagName !== 'TEXTAREA' &&
      [...document.body.children] // has mask?
        .filter(x => x.tagName === 'DIV' && x.clientWidth > 10 && x.clientHeight > 10)
        .length < 2
  }
})

registerCommand({
  id: 'view.refresh',
  handler: refresh,
  keys: [CtrlCmd, 'r']
})
