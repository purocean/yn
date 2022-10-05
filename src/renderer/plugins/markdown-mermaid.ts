import type Markdown from 'markdown-it'
import { h } from 'vue'
import type { Plugin } from '@fe/context'
import { getInitialized, getLoadStatus } from '@fe/others/extension'
import { t } from '@fe/services/i18n'

const MermaidPlugin = (md: Markdown) => {
  const extensionId = '@yank-note/extension-mermaid'

  const checkExtensionLoaded = () => !!getLoadStatus(extensionId).version

  const render = () => {
    if (!getInitialized()) {
      return null
    }

    return h('p', h(
      'a',
      { href: `javascript:ctx.showExtensionManager('${extensionId}')` },
      h('i', t('install-extension-tips', 'Mermaid'))
    ))
  }

  const temp = md.renderer.rules.fence!.bind(md.renderer.rules)
  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    if (checkExtensionLoaded()) {
      return temp(tokens, idx, options, env, slf)
    }

    const token = tokens[idx]
    if (token.info === 'mermaid') {
      return render() as any
    }

    return temp(tokens, idx, options, env, slf)
  }
}

export default {
  name: 'markdown-mermaid',
  register: ctx => {
    ctx.markdown.registerPlugin(MermaidPlugin)

    ctx.editor.tapSimpleCompletionItems(items => {
      /* eslint-disable no-template-curly-in-string */

      items.push(
        { label: '/ ``` Mermaid', insertText: '```mermaid\ngraph LR\n${1:A[Hard] --> |Text| B(Round)}\n```\n' },
      )
    })
  }
} as Plugin
