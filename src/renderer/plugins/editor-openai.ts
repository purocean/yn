import type * as Monaco from 'monaco-editor'
import type { Ctx, Plugin } from '@fe/context'
import { getLogger } from '@fe/utils'

const actionName = 'plugin.editor-openai.trigger'
const settingKeyToken = 'plugin.editor-openai.api-token'
const settingKeyArgs = 'plugin.editor-openai.args-json'

class CompletionProvider implements Monaco.languages.InlineCompletionsProvider {
  private readonly monaco: typeof Monaco
  private readonly ctx: Ctx
  private logger = getLogger('editor-openai')

  constructor (monaco: typeof Monaco, ctx: Ctx) {
    this.monaco = monaco
    this.ctx = ctx
  }

  freeInlineCompletions (): void {
    this.ctx.ui.useToast().hide()
  }

  handleItemDidShow (): void {
    this.ctx.ui.useToast().hide()
  }

  public async provideInlineCompletions (model: Monaco.editor.IModel, position: Monaco.Position, context: Monaco.languages.InlineCompletionContext): Promise<Monaco.languages.InlineCompletions> {
    if (context.triggerKind !== this.monaco.languages.InlineCompletionTriggerKind.Explicit) {
      return { items: [] }
    }

    this.ctx.ui.useToast().show('info', 'OpenAI: Loading...', 10000)

    const content = model.getValueInRange(new this.monaco.Range(
      1,
      1,
      position.lineNumber,
      position.column,
    ))

    this.logger.debug('provideInlineCompletions', content.length)

    // get end of 2048 characters of content
    const text = content.substring(Math.max(0, content.length - 2048))

    return {
      items: await this.provideSuggestions(text, position)
    }
  }

  private async provideSuggestions (text: string, position: Monaco.Position): Promise<Monaco.languages.InlineCompletion[]> {
    const range = new this.monaco.Range(
      position.lineNumber,
      position.column,
      position.lineNumber,
      position.column,
    )

    const url = 'https://api.openai.com/v1/engines/text-davinci-002/completions'
    const token = this.ctx.setting.getSetting(settingKeyToken, '')

    if (token.length < 40) {
      this.ctx.ui.useToast().show('warning', 'OpenAI: No API token')
      return []
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }

    let args = {}
    try {
      args = JSON.parse(this.ctx.setting.getSetting(settingKeyArgs, '{}'))
    } catch (e) {
      this.logger.error(e)
    }

    const body = {
      prompt: text,
      temperature: 0,
      max_tokens: 100,
      n: 1,
      top_p: 1,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      ...args
    }

    try {
      const res = await this.ctx.api.proxyRequest(
        url,
        { headers, body: JSON.stringify(body), method: 'post' },
        true
      ).then(x => x.json())

      this.logger.debug('provideSuggestions', res)

      if (!res.choices) {
        this.ctx.ui.useToast().show('warning', JSON.stringify(res), 5000)
        return []
      }

      return res.choices.map((x: any) => ({
        text: x.text,
        range,
      }))
    } catch (error: any) {
      this.ctx.ui.useToast().show('warning', error.message || `${error}`, 5000)
      this.logger.error('provideSuggestions', error)
      throw error
    }
  }
}

export default {
  name: 'editor-md-ai',
  register: (ctx) => {
    ctx.editor.whenEditorReady().then(({ monaco }) => {
      monaco.languages.registerInlineCompletionsProvider(
        'markdown',
        new CompletionProvider(monaco, ctx)
      )
    })

    ctx.setting.changeSchema((schema) => {
      schema.properties[settingKeyToken] = {
        title: 'T_openai.api-token',
        description: 'T_openai.api-token-desc',
        type: 'string',
        defaultValue: '',
        group: 'editor',
        options: {
          inputAttributes: { placeholder: 'sk-' + 'x'.repeat(10) }
        },
      }

      schema.properties[settingKeyArgs] = {
        title: 'T_openai.args-json',
        description: 'T_openai.args-json-desc',
        type: 'string',
        defaultValue: '{"max_tokens": 256}',
        group: 'editor',
        options: {
          inputAttributes: { placeholder: '{"max_tokens": 256}' }
        },
      }
    })

    ctx.action.registerAction({
      name: actionName,
      keys: [ctx.command.CtrlCmd, ctx.command.Shift, ctx.command.Alt, ctx.command.Space],
      handler: () => {
        ctx.editor.getEditor().getAction('editor.action.inlineSuggest.trigger').run()
        ctx.editor.getEditor().focus()
      }
    })

    ctx.statusBar.tapMenus((menus) => {
      menus['status-bar-tool']?.list?.push(
        {
          id: actionName,
          type: 'normal',
          title: ctx.i18n.t('openai.openai-complete'),
          subTitle: ctx.command.getKeysLabel(actionName),
          onClick: () => ctx.action.getActionHandler(actionName)()
        },
      )
    })
  }
} as Plugin
