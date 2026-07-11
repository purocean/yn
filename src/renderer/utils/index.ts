import CryptoJS from 'crypto-js'
import { useToast } from '@fe/support/ui/toast'
import { t } from '@fe/services/i18n'

export * as storage from './storage'
export * as crypto from './crypto'
export * as composable from './composable'
export * from './pure'

export function downloadContent (filename: string, content: Blob): void
export function downloadContent (filename: string, content: ArrayBuffer | Buffer | string, type: string): void
export function downloadContent (filename: string, content: ArrayBuffer | Buffer | Blob | string, type = 'application/octet-stream') {
  const blob = content instanceof Blob ? content : new Blob([content], { type })
  const href = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  link.target = '_blank'
  link.click()

  setTimeout(() => {
    window.URL.revokeObjectURL(href)
  }, 20000)
}

export function downloadDataURL (filename: string, dataURL: string) {
  const byteString = atob(dataURL.split(',')[1])
  const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0]
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)

  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }

  downloadContent(filename, ab, mimeString)
}

export function md5 (content: any) {
  return CryptoJS.MD5(content).toString()
}

export function binMd5 (data: any) {
  return md5(CryptoJS.enc.Latin1.parse(data))
}

export function strToBase64 (str: string) {
  return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(str))
}

export function copyText (text?: string) {
  if (text === undefined) {
    return
  }

  const toast = useToast()

  const textarea = document.createElement('textarea')
  textarea.style.position = 'absolute'
  textarea.style.background = 'red'
  textarea.style.left = '-999999px'
  textarea.style.top = '-999999px'
  textarea.style.zIndex = '-1000'
  textarea.style.opacity = '0'
  textarea.value = text
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
  toast.show('info', t('copied'))
}

/**
 * create a text highlighter
 * @param container
 * @param highlightName
 * @param css
 * @returns
 */
export function createTextHighlighter (
  container: HTMLElement | undefined | null | (() => HTMLElement | undefined | null),
  highlightName: string,
  css: string | undefined | null | ((colorScheme: 'light' | 'dark') => string) = color => `color: ${color === 'dark' ? '#ffec99' : '#bd7f02'}`
) {
  const resolveContainer = () => typeof container === 'function' ? container() : container

  let style: HTMLStyleElement | null = null
  let contextDocument = resolveContainer()?.ownerDocument || document
  let contextWindow = contextDocument.defaultView || window

  const installStyle = () => {
    if (!css) {
      return
    }

    // remove existing styles
    const existingStyle = contextDocument.querySelectorAll(`style[data-highlight-name="${highlightName}"]`)
    existingStyle.forEach(style => style.remove())

    style = contextDocument.createElement('style')
    style.dataset.highlightName = highlightName
    style.textContent = `
      @media screen {
        html ::highlight(${highlightName}) {
          ${typeof css === 'function' ? css('light') : css}
        }

        html[app-theme=dark] ::highlight(${highlightName}) {
          ${typeof css === 'function' ? css('dark') : css}
        }
      }
      @media (prefers-color-scheme: dark) {
        html[app-theme=system] ::highlight(${highlightName}) {
          ${typeof css === 'function' ? css('dark') : css}
        }
      }
    `

    contextDocument.head.appendChild(style)
  }

  const switchContext = (nextDocument: Document) => {
    if (nextDocument === contextDocument) {
      return
    }

    contextWindow.CSS.highlights.delete(highlightName)
    style?.remove()
    style = null
    contextDocument = nextDocument
    contextWindow = nextDocument.defaultView || window
    installStyle()
  }

  const remove = () => {
    contextWindow.CSS.highlights.delete(highlightName)
  }

  const dispose = () => {
    remove()
    style?.remove()
    style = null
  }

  const applyRanges = (ranges: Range[], targetDocument: Document) => {
    switchContext(targetDocument)
    remove()

    if (ranges.length > 0) {
      const HighlightConstructor = (contextWindow as any).Highlight
      contextWindow.CSS.highlights.set(highlightName, new HighlightConstructor(...ranges))
    }

    return remove
  }

  /** Highlight precomputed DOM ranges, such as ranges restored from review annotations. */
  const highlightRanges = (ranges: Range[]) => {
    const targetDocument = ranges[0]?.startContainer.ownerDocument ||
      resolveContainer()?.ownerDocument ||
      contextDocument

    return applyRanges(ranges, targetDocument)
  }

  const highlight = (keyword: string | RegExp) => {
    keyword = typeof keyword === 'string' ? keyword.trim() : keyword

    if (!keyword) {
      remove()
      return
    }

    const ranges: Range[] = []
    const containerElement = resolveContainer()

    if (!containerElement) {
      remove()
      return
    }

    switchContext(containerElement.ownerDocument)

    const treeWalker = contextDocument.createTreeWalker(containerElement, contextWindow.NodeFilter.SHOW_TEXT)

    let node: Node | null = null

    do {
      node = treeWalker.nextNode()
      if (node && node.nodeType === contextWindow.Node.TEXT_NODE) {
        const textContent = (node as Text).textContent || ''
        const regex = typeof keyword === 'string' ? new RegExp(`(${keyword})`, 'gi') : keyword
        let match: RegExpExecArray | null

        while ((match = regex.exec(textContent)) !== null) {
          const range = contextDocument.createRange()
          range.setStart(node, match.index)
          range.setEnd(node, match.index + match[0].length)
          ranges.push(range)
        }
      }
    } while (node)

    return applyRanges(ranges, containerElement.ownerDocument)
  }

  installStyle()

  return {
    dispose,
    remove,
    highlight,
    highlightRanges,
  }
}
