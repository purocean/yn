import type { Plugin } from '@fe/context'
import { sleep } from '@fe/utils'
import type { ReadableStreamDefaultReadResult } from 'stream/web'

const getConsole = (console: Console, resolve: (value: string) => void) => {
  const stringify = (args: any[]) => args.map((arg) => {
    if (['boolean', 'number', 'bigint', 'string', 'symbol', 'function'].includes(typeof arg)) {
      return arg.toString()
    } else {
      return JSON.stringify(arg)
    }
  }).join(' ')

  const tick = async (args: any[]) => {
    const str = stringify(args) + '\n'
    await new Promise(resolve => setTimeout(resolve, 0))
    resolve(str)
  }

  return new Proxy(console, {
    get: (obj: any, prop: any) => ['error', 'warn', 'info', 'log', 'debug'].includes(prop)
      ? (...args: any[]) => {
          obj[prop](...args)
          if (prop === 'log') {
            tick(args)
          } else {
            tick([`${prop[0]}:`, ...args])
          }
        }
      : obj[prop]
  })
}

let javascriptWorker: Worker | null = null

class JavascriptIframeExecutor implements ReadableStreamDefaultReader<string> {
  private code: string
  private signal?: AbortSignal
  private _readResolve: (value: string) => void = () => 0

  closed: Promise<undefined>
  _state: 'pending' | 'done' | 'error'

  constructor (code: string, opts?: { signal?: AbortSignal }) {
    this.code = code
    this.signal = opts?.signal
    this._state = 'pending'
    this.closed = this.runCode()

    // javascript never ends
    this.closed.then(() => {
      // this._state = 'done'
    }).catch((error) => {
      this._readResolve(error.message || String(error))
      // this._state = 'error'
    })
  }

  private getIframe () {
    const id = 'code-runner-javascript-vm'

    // clean up
    document.getElementById(id)?.remove()

    const iframe = document.createElement('iframe')
    iframe.id = id
    iframe.style.display = 'none'
    document.body.appendChild(iframe)

    const iframeWindow = iframe.contentWindow! as Window & typeof globalThis
    iframeWindow.ctx = window.ctx

    return iframe
  }

  private async runCode (): Promise<undefined> {
    const iframe = this.getIframe()
    const iframeWindow = iframe.contentWindow! as Window & typeof globalThis

    this.signal?.addEventListener('abort', () => {
      iframe.remove()
    })

    const xConsole = getConsole(iframeWindow.console, val => this._readResolve(val))

    const AsyncFunction = iframeWindow.eval('(async function(){}).constructor')
    const fn = new AsyncFunction('console', 'ctx', this.code)
    await fn.call(iframeWindow, xConsole, window.ctx)

    await sleep(0)
    this._readResolve('')

    return undefined
  }

  read (): Promise<ReadableStreamDefaultReadResult<string>> {
    if (this._state === 'done') {
      return Promise.resolve({ done: true })
    }

    if (this._state === 'error') {
      return Promise.reject(new Error('Error while running code'))
    }

    return new Promise((resolve) => {
      this._readResolve = (value: string) => {
        this._readResolve = () => 0
        resolve({ value, done: false })
      }
    })
  }

  releaseLock (): void {
    throw new Error('Method not implemented.')
  }

  cancel (): Promise<void> {
    throw new Error('Method not implemented.')
  }
}

class JavascriptWorkerExecutor implements ReadableStreamDefaultReader<string> {
  private code: string
  private signal?: AbortSignal
  private _readResolve: (value: string) => void = () => 0
  private workerScript = `
    const getConsole = ${getConsole.toString()}
    self.onmessage = async (event) => {
      const { code } = event.data
      const xConsole = getConsole(console, val => self.postMessage({ type: 'output', value: val }))
      const AsyncFunction = eval('(async function(){}).constructor')

      try {
        const fn = new AsyncFunction('console', code)
        await fn.call(self, xConsole)
        self.postMessage({ type: 'done' })
      } catch (error) {
        self.postMessage({ type: 'error', value: error.message || String(error) })
      }
    }
  `

  closed: Promise<undefined>
  _state: 'pending' | 'done' | 'error'

  constructor (code: string, opts?: { signal?: AbortSignal }) {
    this.code = code
    this.signal = opts?.signal
    this._state = 'pending'
    this.closed = this.runCode()

    // javascript never ends
    this.closed.then(() => {
      // this._state = 'done'
    }).catch((error) => {
      this._readResolve(error.message || String(error))
      // this._state = 'error'
    })
  }

  private getWorker () {
    if (javascriptWorker) {
      javascriptWorker.terminate()
      javascriptWorker = null
    }

    const blob = new Blob([this.workerScript], { type: 'application/javascript' })
    const url = URL.createObjectURL(blob)
    javascriptWorker = new Worker(url)
    URL.revokeObjectURL(url)

    return javascriptWorker
  }

  private async runCode (): Promise<undefined> {
    await new Promise<void>(resolve => {
      const worker = this.getWorker()
      worker.onmessage = async (event) => {
        const { type, value } = event.data
        if (type === 'output') {
          this._readResolve(value)
        } else if (type === 'error') {
          this._readResolve(value)
        } else if (type === 'done') {
          resolve()
        }
      }

      worker.postMessage({ code: this.code })

      this.signal?.addEventListener('abort', () => {
        worker.terminate()
        resolve()
      })
    })

    await sleep(0)
    this._readResolve('')

    return undefined
  }

  read (): Promise<ReadableStreamDefaultReadResult<string>> {
    if (this._state === 'done') {
      return Promise.resolve({ done: true })
    }

    if (this._state === 'error') {
      return Promise.reject(new Error('Error while running code'))
    }

    return new Promise((resolve) => {
      this._readResolve = (value: string) => {
        this._readResolve = () => 0
        resolve({ value, done: false })
      }
    })
  }

  releaseLock (): void {
    throw new Error('Method not implemented.')
  }

  cancel (): Promise<void> {
    throw new Error('Method not implemented.')
  }
}

export default {
  name: 'code-runners',
  register: (ctx) => {
    ctx.runner.registerRunner({
      name: 'javascript',
      order: 100,
      nonInterruptible: true,
      match (language) {
        return ['js', 'javascript'].includes(language.toLowerCase())
      },
      getTerminalCmd () {
        return null
      },
      async run (_, code, opts) {
        const firstLine = code.split('\n')[0].trim()
        const noWorker = firstLine.includes('--no-worker--')
        const outputHtml = firstLine.includes('--output-html--')
        return {
          type: outputHtml ? 'html' : 'plain',
          value: noWorker ? new JavascriptIframeExecutor(code, opts) : new JavascriptWorkerExecutor(code, opts)
        }
      },
    })

    ctx.runner.registerRunner({
      name: '_scripts',
      order: 255,
      match (language) {
        return [
          'sh', 'shell',
          'bash', 'php',
          'python', 'py',
          'node', 'bat',
        ].includes(language.toLowerCase())
      },
      getTerminalCmd () {
        return null
      },
      async run () {
        const extensionId = '@yank-note/extension-code-runner'
        return {
          type: 'html',
          value: `<a href="javascript:ctx.showExtensionManager('${extensionId}')"><i>${
            ctx.i18n.t('install-extension-tips', 'Code Runner')
          }</i></a>`
        }
      },
    })

    ctx.editor.tapSimpleCompletionItems(items => {
      /* eslint-disable no-template-curly-in-string */

      items.push(
        { label: '/ ``` Run Code (JavaScript)', insertText: '```js\n// --run--\n${1:await new Promise(r => setTimeout(r, 500))\nconsole.log("hello world!")}\n```\n', block: true },
        { label: '/ ``` Run Code (JavaScript - No Worker)', insertText: '```js\n// --run-- --no-worker--\n${1:await new Promise(r => setTimeout(r, 500))\nctx.ui.useToast().show("info", "HELLOWORLD!")\nconsole.log("hello world!")}\n```\n', block: true },
        { label: '/ ``` Run Code (Bash)', insertText: '```bash\n# --run--\n${1:echo HELLOWORLD}\n```\n', block: true },
        { label: '/ ``` Run Code (C)', insertText: '```c\n// --run-- gcc \\$tmpFile.c -o \\$tmpFile.out && \\$tmpFile.out\n${1:#include <stdio.h>\n \nint main () {\n    printf("Hello, World!");\n    return 0;\n}}\n```\n', block: true },
      )
    })
  }
} as Plugin
