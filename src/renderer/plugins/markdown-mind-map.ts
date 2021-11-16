import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { debounce } from 'lodash-es'
import Renderer from 'markdown-it/lib/renderer'
import { Plugin } from '@fe/context'
import { dataURItoBlobLink, strToBase64 } from '@fe/utils'
import { openWindow } from '@fe/support/env'
import * as storage from '@fe/utils/storage'
import { buildSrc } from '@fe/support/embed'
import { registerHook, removeHook } from '@fe/core/hook'
import { t } from '@fe/services/i18n'

const layoutStorageKey = 'mind-map-layout'
let links = ''

const buildSrcdoc = (json: string, btns: string) => {
  return `
    ${links}
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
  `
}

const init = (ele: HTMLElement) => {
  const div = document.createElement('div')
  div.setAttribute('minder-data-type', 'text')
  div.style.position = 'relative'
  div.style.height = '400px'
  ele.innerHTML = ''
  ele.appendChild(div)

  const km = new (window as any).kityminder.Minder()
  // Hack, avoid KM editor auto focus.
  km.focus = () => 0
  km.setup(div)
  km.disable()
  km.setOption('defaultTheme', 'fresh-green-compat')
  km.setTemplate(storage.get(layoutStorageKey, 'default'))
  // origin enableAnimation has bug not work.
  km.enableAnimation = function () {
    km.setOption('enableAnimation', true)
    km.setOption('layoutAnimationDuration', 300)
    km.setOption('viewAnimationDuration', 100)
    km.setOption('zoomAnimationDuration', 300)
  }

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
        download('data:image/svg+xml;base64,' + strToBase64(await km.exportData('svg')), 'mindmap.svg')
        break
      case 'km':
        download('data:application/octet-stream;base64,' + strToBase64(await km.exportData('json')), 'mindmap.km')
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
    button.className = 'small'
    button.innerText = text
    button.onclick = fun
    button.dataset.onclick = `${onclick}()`
    return button
  }

  const action = document.createElement('div')
  action.className = 'no-print'
  action.style.cssText = 'position: absolute; right: 10px; top: 3px; z-index: 1; text-align: right'
  action.appendChild(buildButton(t('mind-map.zoom-in'), zoomIn, 'zoomIn'))
  action.appendChild(buildButton(t('mind-map.zoom-out'), zoomOut, 'zoomOut'))
  action.appendChild(buildButton(t('mind-map.switch-layout'), switchLayout, 'switchLayout'))
  action.appendChild(buildButton(t('mind-map.switch-loose'), switchCompat, 'switchCompat'))
  const actionsStr = action.outerHTML.replace(/data-onclick/g, 'onclick')
  action.appendChild(buildButton(t('open-in-new-window'), () => {
    const srcdoc = buildSrcdoc(JSON.stringify(km.exportJson()), actionsStr)
    openWindow(buildSrc(srcdoc, t('view-figure')), '_blank', { backgroundColor: '#fff' })
  }))
  action.appendChild(buildButton('PNG', () => exportData('png')))
  action.appendChild(buildButton('SVG', () => exportData('svg')))
  action.appendChild(buildButton('KM', () => exportData('km')))

  div.appendChild(action)

  return km
}

const render = async (km: any, content: string) => {
  const code = (content || '').trim()

  try {
    const setTemplate = km.setTemplate
    // hack for avoid auto set template
    km.setTemplate = () => 0

    km.disableAnimation()
    await km.importData('text', code)
    km.enableAnimation()

    // recover setTemplate
    km.setTemplate = setTemplate
  } catch (error) {
    await km.importData('text', t('mind-map.convert-error'))
    km.useTemplate('structure')
  }

  km.execCommand('hand')
  km.execCommand('camera')
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

    let km: any = null
    const renderMindMap = debounce(() => {
      if (!container.value) {
        return
      }

      if (!km) {
        km = init(container.value)
      }

      render(km, props.content)
    }, 200, { leading: true })

    watch(() => props.content, renderMindMap)

    onMounted(() => setTimeout(renderMindMap, 0))

    registerHook('I18N_CHANGE_LANGUAGE', renderMindMap)
    onBeforeUnmount(() => {
      removeHook('I18N_CHANGE_LANGUAGE', renderMindMap)
    })

    return () => h('div', { ref: container, class: 'mind-map reduce-brightness' })
  }
})

const renderRule: Renderer.RenderRule = (tokens, idx, options, { bMarks, source }, slf) => {
  const token = tokens[idx]
  const nextToken = tokens[idx + 1]
  if (token.level === 0 && token.map && nextToken && nextToken.attrGet('class')?.includes('mindmap')) {
    const content = source
      .substring(bMarks[token.map[0]], bMarks[token.map[1]])
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

      const style = document.createElement('link')
      style.rel = 'stylesheet'
      style.href = '/kity/kityminder.core.css'
      document.getElementsByTagName('head')[0].appendChild(style)

      const script1 = document.createElement('script')
      script1.src = '/kity/kity.min.js'
      script1.async = false
      document.body.appendChild(script1)

      const script2 = document.createElement('script')
      script2.src = '/kity/kityminder.core.min.js'
      script2.async = false
      document.body.appendChild(script2)

      links = [style.outerHTML, script1.outerHTML, script2.outerHTML].join('\n')
    })
  }
} as Plugin
