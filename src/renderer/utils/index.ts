export * as path from './path'

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
