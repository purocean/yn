import type * as Monaco from 'monaco-editor'
import type { Ctx, Plugin } from '@fe/context'
import { getLogger } from '@fe/utils'

const actionName = 'plugin.editor-openai.trigger'
const settingKeyToken = 'plugin.editor-openai.api-token'
const settingKeyEngine = 'plugin.editor-openai.engine-id'
const settingKeyMode = 'plugin.editor-openai.mode'
const settingKeyMaxTokens = 'plugin.editor-openai.max-tokens'
const settingKeyRange = 'plugin.editor-openai.range'
const settingKeyArgs = 'plugin.editor-openai.args-json'
const defaultEngine = 'text-davinci-002'

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

    const range = this.ctx.setting.getSetting(settingKeyRange, 256)

    let prefix = ''
    let suffix = ''

    // get selection of editor model
    const selection = this.ctx.editor.getEditor().getSelection()
    const selectionText = selection && model.getValueInRange(selection)

    if (selectionText) {
      prefix = selectionText
      position = selection!.getEndPosition()
    } else {
      const contentPrefix = model.getValueInRange(new this.monaco.Range(
        1,
        1,
        position.lineNumber,
        position.column,
      ))

      const maxLine = model.getLineCount()
      const maxColumn = model.getLineMaxColumn(maxLine)

      const contentSuffix = model.getValueInRange(new this.monaco.Range(
        position.lineNumber,
        position.column,
        maxLine,
        maxColumn,
      ))

      prefix = contentPrefix.substring(Math.max(0, contentPrefix.length - range))
      suffix = contentSuffix.substring(0, range)
    }

    this.logger.debug('provideInlineCompletions', range, prefix, suffix)

    return {
      items: await this.provideSuggestions(prefix, suffix, position)
    }
  }

  private async provideSuggestions (prompt: string, suffix: string, position: Monaco.Position): Promise<Monaco.languages.InlineCompletion[]> {
    const range = new this.monaco.Range(
      position.lineNumber,
      position.column,
      position.lineNumber,
      position.column,
    )

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
    } catch (e: any) {
      this.ctx.ui.useToast().show('warning', `OpenAI: Custom Arguments Error "${e.message}"`, 5000)
      throw e
    }

    const mode = this.ctx.setting.getSetting(settingKeyMode, 'insert')
    const maxTokens = this.ctx.setting.getSetting(settingKeyMaxTokens, 256)

    const body = {
      temperature: 0.3,
      n: 1,
      top_p: 1,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      // stop: '\n',
      ...args,
      prompt: prompt,
      max_tokens: maxTokens,
      suffix: mode === 'insert' && suffix.trim() ? suffix : undefined
    }

    const engineId = this.ctx.setting.getSetting('plugin.editor-openai.engine-id', defaultEngine)

    this.logger.debug('provideSuggestions', 'request', engineId, body)

    try {
      const res = await this.ctx.api.proxyRequest(
        `https://api.openai.com/v1/engines/${engineId}/completions`,
        { headers, body: JSON.stringify(body), method: 'post' },
        true
      ).then(x => x.json())

      this.logger.debug('provideSuggestions', 'result', res)

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
      this.logger.error('provideSuggestions', 'error', error)
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
      schema.groups.push({ label: 'OpenAI' as any, value: 'openai' })

      schema.properties[settingKeyMode] = {
        title: 'T_openai.mode',
        type: 'string',
        defaultValue: 'insert',
        enum: ['insert', 'complete'],
        group: 'openai',
        required: true,
      }

      schema.properties[settingKeyEngine] = {
        title: 'T_openai.engine-id',
        description: 'T_openai.engine-id-desc',
        type: 'string',
        defaultValue: defaultEngine,
        group: 'openai',
        enum: [
          'text-davinci-002',
          'text-curie-001',
          'text-babbage-001',
          'text-ada-001',
        ],
        required: true,
      }

      schema.properties[settingKeyToken] = {
        title: 'T_openai.api-token',
        description: 'T_openai.api-token-desc',
        type: 'string',
        defaultValue: '',
        group: 'openai',
        options: {
          inputAttributes: { placeholder: 'sk-' + 'x'.repeat(10) }
        },
      }

      schema.properties[settingKeyMaxTokens] = {
        title: 'T_openai.max-tokens',
        type: 'number',
        defaultValue: 256,
        group: 'openai',
        required: true,
        minimum: 4,
        maximum: 4096,
        options: {
          inputAttributes: { placeholder: 'T_openai.max-tokens' }
        },
      }

      schema.properties[settingKeyRange] = {
        title: 'T_openai.range',
        type: 'number',
        defaultValue: 256,
        group: 'openai',
        required: true,
        minimum: 10,
        maximum: 10240,
        options: {
          inputAttributes: { placeholder: 'T_openai.range-desc' }
        },
      }

      schema.properties[settingKeyArgs] = {
        title: 'T_openai.args-json',
        description: 'T_openai.args-json-desc',
        type: 'string',
        defaultValue: '{"temperature": 0.3}',
        group: 'openai',
        options: {
          inputAttributes: { placeholder: '{"temperature": 0.3}' }
        },
      }
    })

    ctx.action.registerAction({
      name: actionName,
      keys: [ctx.command.CtrlCmd, ctx.command.Alt, 'Period'],
      handler: () => {
        ctx.editor.getEditor().getAction('editor.action.inlineSuggest.trigger').run()
        ctx.editor.getEditor().focus()
      },
      when: () => ctx.store.state.showEditor && !ctx.store.state.presentation,
    })

    ctx.statusBar.tapMenus((menus) => {
      if (!ctx.store.state.showEditor || ctx.store.state.presentation) {
        return
      }

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
