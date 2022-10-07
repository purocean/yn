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

  private async runCode (): Promise<undefined> {
    const stringify = (args: any[]) => args.map((arg) => {
      if (['boolean', 'number', 'bigint', 'string', 'symbol', 'function'].includes(typeof arg)) {
        return arg.toString()
      } else {
        return JSON.stringify(arg)
      }
    }).join(' ')

    const tick = async (args: any[]) => {
      await sleep(0)
      const str = stringify(args) + '\n'
      this._readResolve(str)
    }

    // eslint-disable-next-line no-eval
    await eval(`(async () => {
      const console = new Proxy(window.console, {
        get: (obj, prop) => ['error', 'warn', 'info', 'log', 'debug'].includes(prop)
          ? (...args) => {
            obj[prop](...args);
            ${tick.name}(args);
          }
          : obj[prop]
      });
      ${this.code}
    })()`)

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
      order: 255,
      match (language) {
        return ['js', 'javascript'].includes(language.toLowerCase())
      },
      getTerminalCmd () {
        return null
      },
      async run (_, code) {
        return {
          type: 'html',
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
