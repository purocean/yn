import juice from 'juice'
import { Escape } from '@fe/core/keybinding'
import { getActionHandler, registerAction } from '@fe/core/action'
import { registerHook, triggerHook } from '@fe/core/hook'
import * as ioc from '@fe/core/ioc'
import { DOM_ATTR_NAME, DOM_CLASS_NAME } from '@fe/support/args'
import { useToast } from '@fe/support/ui/toast'
import store from '@fe/support/store'
import { sleep } from '@fe/utils'
import type { BuildInHookTypes, Components, Previewer } from '@fe/types'
import { t } from './i18n'
import { emitResize } from './layout'
import { isSameFile } from './document'

export type MenuItem = Components.ContextMenu.Item
export type BuildContextMenu = (items: MenuItem[], e: MouseEvent) => void
export type Heading = {
  tag: string;
  class: string;
  text: string;
  id: string;
  level: number;
  sourceLine: number;
  activated?: boolean;
}

let tmpEnableSyncScroll = true
let syncScrollTimer: any
let renderIframe: HTMLIFrameElement

const contextMenuFunList: BuildContextMenu[] = []

function present (flag: boolean) {
  if (flag) {
    useToast().show('info', t('exit-presentation-msg'))
  }
  store.state.presentation = flag
  setTimeout(() => {
    emitResize()
  }, 0)
}

async function getElement (id: string) {
  id = id.replaceAll('%28', '(').replaceAll('%29', ')')

  const document = (await getRenderIframe()).contentDocument!

  const _find = (id: string) => document.getElementById(id) ||
    document.getElementById(decodeURIComponent(id)) ||
    document.getElementById(encodeURIComponent(id)) ||
    document.getElementById(id.replace(/^h-/, '')) ||
    document.getElementById(decodeURIComponent(id.replace(/^h-/, ''))) ||
    document.getElementById(encodeURIComponent(id.replace(/^h-/, '')))

  return _find(id) || _find(id.toUpperCase())
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
  getActionHandler('view.refresh')()
}

/**
 * Reveal line.
 * @param startLine
 */
export async function revealLine (startLine: number) {
  return getActionHandler('view.reveal-line')(startLine)
}

/**
 * Highlight line.
 * @param line
 * @@param reveal
 * @param duration
 */
export async function highlightLine (line: number, reveal: boolean, duration = 1000) {
  const viewDom = getViewDom()

  let el: HTMLElement | null | undefined = null

  if (reveal) {
    el = await revealLine(line)
    const contentWindow = (await getRenderIframe()).contentWindow!
    contentWindow.scrollBy(0, -120)
  } else {
    el = viewDom?.querySelector<HTMLElement>(`[${DOM_ATTR_NAME.SOURCE_LINE_START}="${line}"]`)
  }

  if (el) {
    el.classList.add(DOM_CLASS_NAME.PREVIEW_HIGHLIGHT)
    if (duration) {
      sleep(duration).then(() => {
        el!.classList.remove(DOM_CLASS_NAME.PREVIEW_HIGHLIGHT)
      })
    }
  }

  return el
}

/**
 * Highlight anchor.
 * @param anchor
 * @param reveal
 * @param duration
 */
export async function highlightAnchor (anchor: string, reveal: boolean, duration = 1000) {
  const el = await getElement(anchor)
  if (!el) {
    return null
  }

  if (reveal) {
    el.scrollIntoView()

    // retain 60 px for better view.
    const contentWindow = (await getRenderIframe()).contentWindow!
    contentWindow.scrollBy(0, -60)
  }

  // highlight element
  el.classList.add(DOM_CLASS_NAME.PREVIEW_HIGHLIGHT)

  if (duration) {
    sleep(duration).then(() => {
      el.classList.remove(DOM_CLASS_NAME.PREVIEW_HIGHLIGHT)
    })
  }

  return el
}

/**
 * Scroll to a position.
 * @param top
 */
export async function scrollTopTo (top: number) {
  const iframe = await getRenderIframe()
  iframe.contentWindow?.scrollTo(0, top)
}

export function getScrollTop () {
  if (renderIframe) {
    return renderIframe.contentWindow?.scrollY
  }
}

export function getPreviewStyles () {
  let styles = `article.${DOM_CLASS_NAME.PREVIEW_MARKDOWN_BODY} { max-width: 1024px; margin: 20px auto; }`

  const getCssRules = (item: CSSStyleSheet) => {
    try {
      return item.cssRules
    } catch (error) {
      console.warn('Failed to get css rules', error)
      return []
    }
  }

  Array.prototype.forEach.call(renderIframe.contentDocument!.styleSheets, (item: CSSStyleSheet) => {
    const node = item.ownerNode as HTMLElement | null
    const flag = (node?.tagName === 'STYLE' && node.getAttribute(DOM_ATTR_NAME.SKIP_EXPORT) !== 'true') ||
      Array.prototype.some.call(getCssRules(item), (rule: CSSRule) => {
        return rule.cssText.includes('--common-styles')
      })

    Array.prototype.forEach.call(getCssRules(item), (rule) => {
      if (rule.selectorText && (
        flag ||
        rule.selectorText.includes('.' + DOM_CLASS_NAME.PREVIEW_MARKDOWN_BODY)
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

      if (node.tagName === 'A' && node.getAttribute('href')?.startsWith('#')) {
        node.removeAttribute('target')
      }

      if (node.tagName === 'AUDIO') {
        node.removeAttribute('preload')
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

  let html = getActionHandler('view.get-content-html')(options.onlySelected)
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
export function getHeadings (withActivated = false): Heading[] {
  const document = renderIframe.contentDocument
  const dom = getViewDom()
  if (!dom || !document) {
    return []
  }

  const tags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']

  let breakCheck = false
  const isActivated = (nodes: NodeListOf<HTMLHeadElement>, i: number) => {
    if (!withActivated) {
      return undefined
    }

    if (breakCheck) {
      return false
    }

    const node = nodes[i]
    const nodeRect = node.getBoundingClientRect()

    const bottom = document.documentElement.clientHeight / 3 * 2

    // in view
    if (nodeRect.top >= 0 && nodeRect.top < bottom) {
      breakCheck = true
      return true
    } else if (nodeRect.top < 0) { // before view
      const nextNode = i < nodes.length - 1 ? nodes[i + 1] : undefined
      const res = !nextNode || nextNode.getBoundingClientRect().top > bottom
      if (res) {
        breakCheck = true
      }

      return res
    } else { // after view
      breakCheck = true
    }

    return false
  }

  const nodes = dom.querySelectorAll<HTMLHeadElement>(tags.join(','))
  return Array.from(nodes).map((node, i) => {
    const tag = node.tagName.toLowerCase()
    return {
      tag,
      class: `heading ${node.className} tag-${tag}`,
      id: node.id,
      text: node.textContent || '',
      level: tags.indexOf(tag),
      sourceLine: parseInt(node.dataset.sourceLine || '0'),
      activated: isActivated(nodes, i),
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
  store.state.autoPreview = typeof flag === 'boolean' ? flag : !store.state.autoPreview
}

/**
 * Toggle sync scroll.
 * @param flag
 */
export function toggleSyncScroll (flag?: boolean) {
  store.state.syncScroll = typeof flag === 'boolean' ? flag : !store.state.syncScroll
}

/**
 * Add a context menu processor.
 * @param fun
 */
export function tapContextMenus (fun: BuildContextMenu) {
  contextMenuFunList.push(fun)
}

/**
 * Switch current previewer
 * @param name Previewer name
 */
export function switchPreviewer (name: string) {
  const oldPreviewer = store.state.previewer
  if (ioc.get('VIEW_PREVIEWER').some((item) => item.name === name)) {
    store.state.previewer = name
  } else {
    store.state.previewer = 'default'
  }

  if (oldPreviewer !== store.state.previewer) {
    triggerHook('VIEW_PREVIEWER_CHANGE', { type: 'switch' })
  }
}

/**
 * Register a previewer.
 * @param previewer Previewer
 */
export function registerPreviewer (previewer: Previewer) {
  ioc.register('VIEW_PREVIEWER', previewer)
  triggerHook('VIEW_PREVIEWER_CHANGE', { type: 'register' })
}

/**
 * Remove a previewer.
 * @param name Previewer name
 */
export function removePreviewer (name: string) {
  ioc.removeWhen('VIEW_PREVIEWER', item => item.name === name)
  triggerHook('VIEW_PREVIEWER_CHANGE', { type: 'remove' })
  switchPreviewer('default')
}

/**
 * Get all previewers.
 * @returns Previewers
 */
export function getAllPreviewers () {
  return ioc.get('VIEW_PREVIEWER')
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
  return tmpEnableSyncScroll &&
    store.state.syncScroll &&
    isSameFile(getRenderEnv()?.file, store.state.currentFile)
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

/**
 * Get render Iframe
 * @returns
 */
export function getRenderIframe (): Promise<HTMLIFrameElement> {
  if (renderIframe) {
    return Promise.resolve(renderIframe)
  }

  return new Promise((resolve) => {
    registerHook('VIEW_RENDER_IFRAME_READY', ({ iframe }) => {
      renderIframe = iframe
      resolve(iframe)
    }, true)
  })
}

/**
 * Add styles to default preview.
 * @param style
 * @param skipExport
 * @return css dom
 */
export async function addStyles (style: string, skipExport = false) {
  const iframe = await getRenderIframe()
  const document = iframe.contentDocument!
  const css = document.createElement('style')
  css.id = 'style-' + Math.random().toString(36).slice(2, 9) + '-' + Date.now()

  if (skipExport) {
    css.setAttribute(DOM_ATTR_NAME.SKIP_EXPORT, 'true')
  }

  css.innerHTML = style

  document.head.appendChild(css)

  return css
}

/**
 * Add style link to default preview.
 * @param href
 * @returns link dom
 */
export async function addStyleLink (href: string) {
  const iframe = await getRenderIframe()
  const document = iframe.contentDocument!
  const link = document.createElement('link')
  link.id = 'link-' + Math.random().toString(36).slice(2, 9) + '-' + Date.now()
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)

  return link
}

/**
 * Add script to default preview.
 * @param src
 * @returns script dom
 */
export async function addScript (src: string) {
  const iframe = await getRenderIframe()
  const document = iframe.contentDocument!
  const script = document.createElement('script')
  script.id = 'script-' + Math.random().toString(36).slice(2, 9) + '-' + Date.now()
  script.src = src
  document.body.appendChild(script)

  return script
}

registerHook('VIEW_RENDER_IFRAME_READY', ({ iframe }) => {
  renderIframe = iframe
})

registerAction({
  name: 'view.enter-presentation',
  forUser: true,
  description: t('command-desc.view_enter-presentation'),
  handler: () => present(true),
  keys: ['F5']
})

registerAction({
  name: 'view.exit-presentation',
  handler: () => present(false),
  keys: [Escape],
  when: () => {
    const el = (renderIframe?.contentDocument || window.document).activeElement
    return store.state.presentation &&
      el?.tagName !== 'INPUT' &&
      el?.tagName !== 'TEXTAREA' &&
      [...document.body.children] // has mask?
        .filter(x => x.tagName === 'DIV' && x.clientWidth > 10 && x.clientHeight > 10)
        .length < 2
  }
})
