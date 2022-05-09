import Markdown from 'markdown-it'
import { h } from 'vue'
import { Plugin } from '@fe/context'
import { t } from '@fe/services/i18n'
import { getInitialized, getLoadStatus } from '@fe/others/extension'

const MarkdownItPlugin = (md: Markdown) => {
  const extensionId = '@yank-note/extension-drawio'

  const checkExtenstionLoaded = () => !!getLoadStatus(extensionId).version

  const render = () => {
    if (!getInitialized()) {
      return null
    }

    return h('p', h(
      'a',
      { href: `javascript:ctx.showExtensionManager('${extensionId}')` },
      h('i', t('install-extension-tips', 'Drawio'))
    ))
  }

  const linkTemp = md.renderer.rules.link_open!.bind(md.renderer.rules)
  md.renderer.rules.link_open = (tokens, idx, options, env, slf) => {
    if (checkExtenstionLoaded()) {
      return linkTemp(tokens, idx, options, env, slf)
    }

    const token = tokens[idx]

    if (token.attrGet('link-type') !== 'drawio') {
      return linkTemp(tokens, idx, options, env, slf)
    }

    const nextToken = tokens[idx + 1]
    if (nextToken && nextToken.type === 'text') {
      nextToken.content = ''
    }

    return render() as any
  }

  const fenceTemp = md.renderer.rules.fence!.bind(md.renderer.rules)
  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    if (checkExtenstionLoaded()) {
      return fenceTemp(tokens, idx, options, env, slf)
    }

    const token = tokens[idx]

    const code = token.content.trim()
    const firstLine = code.split(/\n/)[0].trim()
    if (token.info !== 'xml' || !firstLine.includes('--drawio--')) {
      return fenceTemp(tokens, idx, options, env, slf)
    }

    return render() as any
  }
}

export default {
  name: 'markdown-drawio',
  register: ctx => {
    ctx.markdown.registerPlugin(MarkdownItPlugin)
  }
} as Plugin
