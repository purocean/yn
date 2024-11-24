import { FLAG_DEBUG } from '@fe/support/args'
export * as path from './path'

const MD_ESCAPE_CHARS_RE = /[*#/()[\]_`]/g

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

export function escapeMd (str: string) {
  return str.replace(MD_ESCAPE_CHARS_RE, '\\$&')
}

export function removeQuery (url: string) {
  const questionMarkIndex = url.indexOf('?')
  const hashIndex = url.indexOf('#')

  if (questionMarkIndex === -1 && hashIndex === -1) {
    return url
  }

  if (questionMarkIndex === -1) {
    return url.slice(0, hashIndex)
  }

  if (hashIndex === -1) {
    return url.slice(0, questionMarkIndex)
  }

  return url.slice(0, Math.min(questionMarkIndex, hashIndex))
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

/**
 * Wait until condition is true
 * @param fn
 * @param interval
 * @param timeout
 */
export function waitCondition (fn: () => boolean | Promise<boolean>, interval = 30, timeout = 10000): (Promise<void> | { cancel: () => void }) {
  let cancelFlag = false

  const cancel = () => {
    cancelFlag = true
  }

  const check = async () => {
    const startTime = Date.now()

    while (true) {
      if (cancelFlag) {
        throw new Error('waitCondition canceled')
      }

      if (Date.now() - startTime > timeout) {
        throw new Error('waitCondition timeout')
      }

      if (await fn()) {
        return
      }

      await sleep(interval)
    }
  }

  const promise: any = check()
  promise.cancel = cancel

  return promise
}
