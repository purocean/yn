import type { Plugin } from '@fe/context'
import { sleep } from '@fe/utils'
import type { CodeRunnerRunOptions } from '@fe/types'

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
    resolve(str)
  }

  return new Proxy<typeof console>(console, {
    get: (obj: any, prop: any) => ['error', 'warn', 'info', 'log', 'debug'].includes(prop)
      ? (...args: any[]) => {
          // obj[prop](...args)
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

class JavascriptIframeExecutor {
  private _code: string
  private _signal: AbortSignal
  private _outputType: 'plain' | 'html'
  private _flush: CodeRunnerRunOptions['flusher']

  constructor (code: string, outputHtml: boolean, opts: CodeRunnerRunOptions) {
    this._code = code
    this._signal = opts.signal
    this._flush = opts.flusher
    this._outputType = outputHtml ? 'html' : 'plain'
  }

  private _getIframe () {
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

  public async run () {
    await sleep(0)
    const iframe = this._getIframe()
    const iframeWindow = iframe.contentWindow! as Window & typeof globalThis

    const closed = new Promise<void>(resolve => {
      this._signal.addEventListener('abort', () => {
        iframe.remove()
        resolve()
      })
    })

    const xConsole = getConsole(
      iframeWindow.console,
      val => this._flush(this._outputType, val),
    )

    const AsyncFunction = iframeWindow.eval('(async function(){}).constructor')
    const fn = new AsyncFunction('console', 'ctx', this._code)

    await sleep(0)
    await fn.call(iframeWindow, xConsole, window.ctx)
    await sleep(0)
    this._flush(this._outputType, '')

    await closed

    return null
  }
}

class JavascriptWorkerExecutor {
  private _code: string
  private _signal: AbortSignal
  private _flush: CodeRunnerRunOptions['flusher']
  private _outputType: 'plain' | 'html'

  private _workerScript = `
    const getConsole = ${getConsole.toString()}
    self.onmessage = async (event) => {
      const { code, isb } = event.data

      const maxBuffer = 8 * 1024
      const maxFlushInterval = 100

      let buffer = ''

      const flushBuffer = () => {
        if (buffer) {
          Atomics.wait(isb, 0, 1)
          self.postMessage({ type: 'output', value: buffer })
          buffer = ''
        }
      }

      const flush = (type, val) => {
        if (type === 'output') {
          buffer += val

          if (buffer.length > maxBuffer) {
            flushBuffer()
          }
        } else {
          flushBuffer()
          Atomics.wait(isb, 0, 1)
          self.postMessage({ type, value: val })
        }
      }

      setInterval(flushBuffer, 100)

      const xConsole = getConsole(console, val => flush('output', val))
      const AsyncFunction = eval('(async function(){}).constructor')

      try {
        const fn = new AsyncFunction('console', code)
        await fn.call(self, xConsole)
        flush('done', '')
      } catch (error) {
        flush('error', error.message || String(error))
      }
    }
  `

  constructor (code: string, outputHtml: boolean, opts: CodeRunnerRunOptions) {
    this._code = code
    this._signal = opts.signal
    this._flush = opts.flusher
    this._outputType = outputHtml ? 'html' : 'plain'
  }

  private _getWorker () {
    if (javascriptWorker) {
      javascriptWorker.terminate()
      javascriptWorker = null
    }

    const blob = new Blob([this._workerScript], { type: 'application/javascript' })
    const url = URL.createObjectURL(blob)
    javascriptWorker = new Worker(url)
    URL.revokeObjectURL(url)

    return javascriptWorker
  }

  public async run () {
    await sleep(0)
    await new Promise<void>(resolve => {
      const isb = new Int32Array(new SharedArrayBuffer(4))

      const _flush = (value: string) => {
        Atomics.store(isb, 0, 1)
        Atomics.notify(isb, 0)
        this._flush(this._outputType, value)
        Atomics.store(isb, 0, 0)
        Atomics.notify(isb, 0)
      }

      const worker = this._getWorker()
      worker.onmessage = async (event) => {
        const { type, value } = event.data
        if (type === 'output') {
          _flush(value)
        } else if (type === 'error') {
          _flush(value)
        } else if (type === 'done') {
          _flush('')
        }
      }

      worker.postMessage({ code: this._code, isb })

      this._signal.addEventListener('abort', () => {
        worker.terminate()
        resolve()
      })
    })

    return null
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
        return noWorker
          ? new JavascriptIframeExecutor(code, outputHtml, opts).run()
          : new JavascriptWorkerExecutor(code, outputHtml, opts).run()
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
