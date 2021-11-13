import CryptoJS from 'crypto-js'
import { useToast } from '@fe/support/ui/toast'
import { t } from '@fe/services/i18n'

export * as path from './path'
export * as storage from './storage'
export * as crypto from './crypto'

export const encodeMarkdownLink = (path: string) => {
  return path
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/ /g, '%20')
}

export const dataURItoBlobLink = (dataURI: string) => {
  const byteString = atob(dataURI.split(',')[1])
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)

  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }

  const blob = new Blob([ab], { type: mimeString })
  return window.URL.createObjectURL(blob)
}

export function fileToBase64URL (file: File) {
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader()
    fr.readAsDataURL(file)
    fr.onload = () => resolve(fr.result as string)
    fr.onerror = error => reject(error)
  })
}

export const getLogger = (subject: string) => {
  const logger = (level: string) => (...args: any) => {
    const time = `${new Date().toLocaleString()}.${Date.now() % 1000}`
    ;(console as any)[level](`[${time}] ${subject} >`, ...args)
  }

  return {
    debug: logger('debug'),
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
