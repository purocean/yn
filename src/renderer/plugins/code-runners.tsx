import type { Plugin } from '@fe/context'
import { sleep } from '@fe/utils'

class JavascriptExecutor implements ReadableStreamDefaultReader<string> {
  private code: string;
  private _readResolve: (value: string) => void = () => 0;

  closed: Promise<undefined>;
  _state: 'pending' | 'done' | 'error';

  constructor (code: string) {
    this.code = code
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

  private getIframeWindow () {
    const id = 'code-runner-javascript-vm'

    // clean up
    document.getElementById(id)?.remove()

    const iframe = document.createElement('iframe')
    iframe.id = id
    iframe.style.display = 'none'
    document.body.appendChild(iframe)
    const iframeWindow = iframe.contentWindow! as Window & typeof globalThis

    iframeWindow.ctx = window.ctx

    return iframeWindow
  }

  private async runCode (): Promise<undefined> {
    const stringify = (args: any[]) => args.map((arg) => {
      if (['boolean', 'number', 'bigint', 'string', 'symbol', 'function'].includes(typeof arg)) {
        return arg.toString()
      } else {
        return JSON.stringify(arg)
      }
    }).join(' ')

    const tick = async (args: any[]) => {
      const str = stringify(args) + '\n'
      await sleep(0)
      this._readResolve(str)
    }

    const iframeWindow = this.getIframeWindow()
    const xConsole = new Proxy(iframeWindow.console, {
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

export default {
  name: 'code-runners',
  register: (ctx) => {
    ctx.runner.registerRunner({
      name: 'javascript',
      order: 100,
      match (language) {
        return ['js', 'javascript'].includes(language.toLowerCase())
      },
      getTerminalCmd () {
        return null
      },
      async run (_, code) {
        const firstLine = code.split('\n')[0].trim()
        const outputHtml = firstLine.includes('--output-html--')
        return {
          type: outputHtml ? 'html' : 'plain',
          value: new JavascriptExecutor(code)
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
        { label: '/ ``` Run Code', insertText: '```js\n// --run--\n${1:await new Promise(r => setTimeout(r, 500))\nctx.ui.useToast().show("info", "HELLOWORLD!")\nconsole.log("hello world!")}\n```\n' },
      )
    })
  }
} as Plugin
