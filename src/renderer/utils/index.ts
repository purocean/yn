import env from './env'

export const encodeMarkdownLink = (path: string) => {
  return path
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/ /g, '%20')
}

export const openInNewWindow = (title: string, srcdoc: string, alwaysOnTop = true) => {
  const opener = env.openAlwaysOnTopWindow(env.isElectron ? '/blank.html' : 'about:blank', '_blank', alwaysOnTop)
  const frame = document.createElement('iframe')
  frame.width = '100%'
  frame.height = '100%'
  frame.frameBorder = '0'
  frame.srcdoc = srcdoc

  if (env.isElectron) {
    const json = JSON.stringify(frame.outerHTML)
    opener.eval(`
      document.title = '${title}'
      document.body.style.height = '100vh'
      document.body.style.margin = '0'
      document.body.innerHTML = ${json}
    `)
  } else {
    opener.document.title = title
    opener.document.body.style.height = '100vh'
    opener.document.body.style.margin = '0'
    opener.document.body.appendChild(frame)
  }

  return opener
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
