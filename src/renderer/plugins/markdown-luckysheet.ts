import { h } from 'vue'
import Markdown from 'markdown-it'
import { Plugin } from '@fe/context'
import store from '@fe/support/store'
import { getInitialized, getLoadStatus } from '@fe/others/extension'
import { t } from '@fe/services/i18n'

const MarkdownItPlugin = (md: Markdown) => {
  const extensionId = '@yank-note/extension-luckysheet'

  const checkExtensionLoaded = () => !!getLoadStatus(extensionId).version

  const render = () => {
    if (!getInitialized()) {
      return null
    }

    return h('p', h(
      'a',
      { href: `javascript:ctx.showExtensionManager('${extensionId}')` },
      h('i', t('install-extension-tips', 'Luckyseet'))
    ))
  }

  const linkTemp = md.renderer.rules.link_open!.bind(md.renderer.rules)
  md.renderer.rules.link_open = (tokens, idx, options, env, slf) => {
    if (checkExtensionLoaded()) {
      return linkTemp(tokens, idx, options, env, slf)
    }

    const token = tokens[idx]

    if (token.attrGet('link-type') !== 'luckysheet') {
      return linkTemp(tokens, idx, options, env, slf)
    }

    const { currentFile } = store.state
    if (!currentFile) {
      return linkTemp(tokens, idx, options, env, slf)
    }

    const url = token.attrGet('href')
    if (!url || url.includes(':')) {
      return linkTemp(tokens, idx, options, env, slf)
    }

    const nextToken = tokens[idx + 1]
    if (nextToken && nextToken.type === 'text') {
      nextToken.content = ''
    }

    return render() as any
  }
}

export default {
  name: 'markdown-luckysheet',
  register: ctx => {
    ctx.markdown.registerPlugin(MarkdownItPlugin)

    ctx.editor.tapSimpleCompletionItems(items => {
      /* eslint-disable no-template-curly-in-string */

      items.push(
        { language: 'markdown', label: '/ []() Luckysheet Link', insertText: '[${2:Luckysheet}]($1){link-type="luckysheet"}', block: true },
      )
    })
  }
} as Plugin
