import { defineComponent, h, onMounted, ref, watch } from 'vue'
import { debounce } from 'lodash-es'
import Renderer from 'markdown-it/lib/renderer'
import { Plugin } from '@fe/context/plugin'
import crypto from '@fe/utils/crypto'
import { dataURItoBlobLink, openInNewWindow } from '@fe/utils'
import storage from '@fe/utils/storage'

const layoutStorageKey = 'mind-map-layout'

const buildSrcdoc = (json: string, btns: string) => {
  return `
    <html>
      <head>
        <link rel="stylesheet" href="${location.origin}/kityminder.core.css" rel="stylesheet">
        <script src="${location.origin}/kity.min.js"></script>
        <script src="${location.origin}/kityminder.core.min.js"></script>
        <style>
          body {
            margin: 0;
            padding: 0;
            height: 100%;
          }

          #minder-view {
            position: absolute;
            border: 1px solid #ccc;
            left: 10px;
            top: 10px;
            bottom: 10px;
            right: 10px;
          }
        </style>
      </head>
      <body style="width: 100%; height: 100vh; padding: 0; margin: 0">
        ${btns}
        <script id="minder-view" type="application/kityminder" minder-data-type="json">${json}</script>
        <script type="text/javascript">
          var km = window.km = new kityminder.Minder();
          km.setup('#minder-view');
          km.disable();
          km.execCommand('hand');

          const switchLayout = () => {
            const tplList = ['default', 'right', 'structure', 'filetree', 'tianpan', 'fish-bone']
            const tpl = km.getTemplate()
            const index = tplList.indexOf(tpl)
            const nextIndex = index > tplList.length - 2 ? 0 : index + 1
            km.useTemplate(tplList[nextIndex])
            km.execCommand('camera')
          }

          const switchCompat = () => {
            const theme = km.getTheme().split('-')
            if (theme[theme.length - 1] === 'compat') {
              theme.pop()
            } else {
              theme.push('compat')
            }

            km.useTheme(theme.join('-'))
            km.execCommand('camera')
          }

          const zoomOut = () => km.execCommand('zoomOut')
          const zoomIn = () => km.execCommand('zoomIn')
        </script>
      </body>
    </html>
  `
}

const render = async (ele: HTMLElement, content: string) => {
  const code = (content || '').trim()

  const div = document.createElement('div')
  div.setAttribute('minder-data-type', 'text')
  div.style.position = 'relative'
  div.style.height = '400px'
  ele.innerHTML = ''
  ele.appendChild(div)

  const km = new (window as any).kityminder.Minder()
  // Hack 一下，防止脑图自动聚焦
  km.focus = () => 0
  km.setup(div)
  km.disable()
  try {
    await km.importData('text', code)
    km.useTemplate(storage.get(layoutStorageKey, 'default'))
  } catch (error) {
    await km.importData('text', '转换错误\n    1. 请保证大纲只有一个根项目\n    2. 请保证大纲层级正确')
    km.useTemplate('structure')
  }

  km.execCommand('hand')
  km.useTheme('fresh-green-compat')
  km.execCommand('camera')

  const switchLayout = () => {
    const tplList = ['default', 'right', 'structure', 'filetree', 'tianpan', 'fish-bone']
    const tpl = km.getTemplate()
    const index = tplList.indexOf(tpl)
    const nextIndex = index > tplList.length - 2 ? 0 : index + 1
    const layout = tplList[nextIndex]
    storage.set(layoutStorageKey, layout)
    km.useTemplate(layout)
    km.execCommand('camera')
  }

  const switchCompat = () => {
    const theme = km.getTheme().split('-')
    if (theme[theme.length - 1] === 'compat') {
      theme.pop()
    } else {
      theme.push('compat')
    }

    km.useTheme(theme.join('-'))
    km.execCommand('camera')
  }

  const zoomOut = () => km.execCommand('zoomOut')
  const zoomIn = () => km.execCommand('zoomIn')

  const exportData = async (type: 'png' | 'svg' | 'km') => {
    const download = (url: string, name: string) => {
      const link = document.createElement('a')
      link.href = dataURItoBlobLink(url)
      link.target = '_blank'
      link.download = name
      link.click()
    }

    switch (type) {
      case 'svg':
        download('data:image/svg+xml;base64,' + crypto.strToBase64(await km.exportData('svg')), 'mindmap.svg')
        break
      case 'km':
        download('data:application/octet-stream;base64,' + crypto.strToBase64(await km.exportData('json')), 'mindmap.km')
        break
      case 'png':
        download(await km.exportData('png'), 'mindmap.png')
        break
      default:
        break
    }
  }

  const buildButton = (text: string, fun: () => void, onclick = '') => {
    const button = document.createElement('button')
    button.style.cssText = 'margin-left: 5px;font-size: 14px;background: #cacaca; border: 0; padding: 0 6px; color: #2c2b2b; cursor: pointer; border-radius: 2px; transition: all .1s ease-in-out; line-height: 24px;'
    button.innerText = text
    button.onclick = fun
    button.dataset.onclick = `${onclick}()`
    return button
  }

  const action = document.createElement('div')
  action.className = 'no-print'
  action.style.cssText = 'position: absolute; right: 15px; top: 3px; z-index: 1;'
  action.appendChild(buildButton('放大', zoomIn, 'zoomIn'))
  action.appendChild(buildButton('缩小', zoomOut, 'zoomOut'))
  action.appendChild(buildButton('切换布局', switchLayout, 'switchLayout'))
  action.appendChild(buildButton('紧凑/宽松', switchCompat, 'switchCompat'))
  const actionsStr = action.outerHTML.replace(/data-onclick/g, 'onclick')
  action.appendChild(buildButton('新窗口打开', () => {
    const srcdoc = buildSrcdoc(JSON.stringify(km.exportJson()), actionsStr)
    openInNewWindow(srcdoc)
  }))
  action.appendChild(buildButton('导出 PNG', () => exportData('png')))
  action.appendChild(buildButton('导出 SVG', () => exportData('svg')))
  action.appendChild(buildButton('导出 KM', () => exportData('km')))

  div.appendChild(action)
}

const MindMap = defineComponent({
  name: 'mind-map',
  props: {
    content: {
      type: String,
      default: ''
    }
  },
  setup (props) {
    const container = ref<HTMLElement>()

    const renderMindMap = debounce(() => {
      container.value && render(container.value, props.content)
    }, 1000, { leading: true })

    watch(() => props.content, renderMindMap)

    onMounted(renderMindMap)

    return () => h('div', { ref: container, class: 'mind-map' })
  }
})

const renderRule: Renderer.RenderRule = (tokens, idx, options, { source }, slf) => {
  const token = tokens[idx]
  const nextToken = tokens[idx + 1]
  if (token.level === 0 && token.map && nextToken && nextToken.attrGet('class')?.includes('mindmap')) {
    const content = source
      .split('\n')
      .slice(token.map[0], token.map[1])
      .join('\n')
      .replace(/\{.mindmap[^}]*\}/gm, '')
      .replace(/^(\s*)([+-]*|\d+.) /gm, '$1')

    return h(MindMap, { content }) as any
  }

  return slf.renderToken(tokens, idx, options)
}

export default {
  name: 'markdown-mind-map',
  register: ctx => {
    ctx.markdown.registerPlugin(md => {
      md.renderer.rules.bullet_list_open = renderRule
    })
  }
} as Plugin
