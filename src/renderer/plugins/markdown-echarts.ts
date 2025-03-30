import { h } from 'vue'
import type Markdown from 'markdown-it'
import type { Plugin } from '@fe/context'
import { getInitialized, getLoadStatus } from '@fe/others/extension'
import { t } from '@fe/services/i18n'
import { RenderEnv } from '@fe/types'

const MarkdownItPlugin = (md: Markdown) => {
  const extensionId = '@yank-note/extension-echarts'

  const checkExtensionLoaded = () => !!getLoadStatus(extensionId).version

  const render = () => {
    if (!getInitialized()) {
      return null
    }

    return h('p', h(
      'a',
      { href: `javascript:ctx.showExtensionManager('${extensionId}')` },
      h('i', t('install-extension-tips', 'ECharts'))
    ))
  }

  const temp = md.renderer.rules.fence!.bind(md.renderer.rules)
  md.renderer.rules.fence = (tokens, idx, options, env: RenderEnv, slf) => {
    if (checkExtensionLoaded() || env.safeMode) {
      return temp(tokens, idx, options, env, slf)
    }

    const token = tokens[idx]

    const code = token.content.trim()
    const firstLine = code.split(/\n/)[0].trim()
    if (token.info !== 'js' || !firstLine.includes('--echarts--')) {
      return temp(tokens, idx, options, env, slf)
    }

    return render() as any
  }
}

export default {
  name: 'markdown-echarts',
  register: ctx => {
    ctx.markdown.registerPlugin(MarkdownItPlugin)

    ctx.editor.tapSimpleCompletionItems(items => {
      /* eslint-disable no-template-curly-in-string */

      items.push(
        { language: 'markdown', label: '/ ``` ECharts', insertText: '```js\n// --echarts-- \nconst option = {\n  xAxis: {\n    type: "category",\n    data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]\n  },\n  yAxis: {\n    type: "value"\n  },\n  series: [\n    {\n      data: [150, 230, 224, 218, 135, 147, 260],\n      type: "line"\n    }\n  ]\n}\n\nchart.setOption(option, true)\n```\n', block: true },
      )
    })
  }
} as Plugin
