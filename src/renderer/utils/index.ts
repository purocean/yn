import CryptoJS from 'crypto-js'
import { useToast } from '@fe/support/ui/toast'
import { t } from '@fe/services/i18n'
import { FLAG_DEBUG } from '@fe/support/args'

export * as path from './path'
export * as storage from './storage'
export * as crypto from './crypto'

/**
 * quote string
 * @param str
 * @param quote
 */
export function quote (str: string, quote = '`') {
  return quote + str.replaceAll('\\', '\\\\').replaceAll(quote, '\\' + quote) + quote
}

export function encodeMarkdownLink (path: string) {
  return path
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/ /g, '%20')
}

export function removeQuery (url: string) {
  return url.replace(/[#?].*$/, '')
}

export function dataURLtoBlob (dataURL: string) {
  const byteString = atob(dataURL.split(',')[1])
  const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0]
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)

  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }

  return new Blob([ab], { type: mimeString })
}

export function fileToBase64URL (file: File | Blob) {
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader()
    fr.readAsDataURL(file)
    fr.onload = () => resolve(fr.result as string)
    fr.onerror = error => reject(error)
  })
}

export function getLogger (subject: string) {
  const logger = (level: string) => (...args: any) => {
    const time = `${new Date().toLocaleString()}.${Date.now() % 1000}`
    ;(console as any)[level](`[${time}] [${level}] ${subject} >`, ...args)
  }

  return {
    debug: FLAG_DEBUG ? logger('debug') : () => 0,
    log: logger('log'),
    info: logger('info'),
    warn: logger('warn'),
    error: logger('error')
  }
}

export function sleep (ms: number) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

export function objectInsertAfterKey (obj: {}, key: string, content: {}) {
  const items = Object.entries(obj)
  const idx = items.findIndex(([k]) => k === key)
  if (idx > -1) {
    items.splice(idx + 1, 0, ...Object.entries(content))
  }
  return Object.fromEntries(items)
}

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
