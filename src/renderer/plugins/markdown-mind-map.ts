import { defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { debounce } from 'lodash-es'
import Renderer from 'markdown-it/lib/renderer'
import { Plugin } from '@fe/context'
import { downloadDataURL, getLogger, strToBase64 } from '@fe/utils'
import { openWindow } from '@fe/support/env'
import * as storage from '@fe/utils/storage'
import { buildSrc } from '@fe/support/embed'
import store from '@fe/support/store'
import { registerHook, removeHook } from '@fe/core/hook'
import { t } from '@fe/services/i18n'

const logger = getLogger('markdown-mind-map')

const layoutStorageKey = 'mind-map-layout'
let links = ''

let mindMapId = 0
const instances = new Map()

// kityminder has memory leak at CustomEvent, make CustomEvent readonly
const CustomEvent = window.CustomEvent
Object.defineProperty(window, 'CustomEvent', {
  get: () => CustomEvent,
  set: () => undefined
})

Object.defineProperty(window, 'kity', {
  get: () => {
    logger.debug('new kity')
    return window.kityM()
  },
})

Object.defineProperty(window, 'kityminder', {
  get: () => {
    logger.debug('new kityminder')
    return window.kityminderM()
  },
})

function newMinder () {
  // hack addEventListener, fix memory leak.
  const realAddEventListener = window.addEventListener.bind(window)
  const events: {type: string, listener: any}[] = []
  window.addEventListener = (type: string, listener: any) => {
    logger.debug('hack addEventListener', type)
    events.push({ type, listener })
    realAddEventListener(type, listener)
  }

  const km = new window.kityminder.Minder()

  // restore addEventListener
  window.addEventListener = realAddEventListener

  // fix bug: origin enableAnimation has bug not work.
  km.enableAnimation = function () {
    km.setOption('enableAnimation', true)
    km.setOption('layoutAnimationDuration', 300)
    km.setOption('viewAnimationDuration', 100)
    km.setOption('zoomAnimationDuration', 300)
  }

  const paperEvent = 'click dblclick mousedown contextmenu mouseup mousemove mouseover mousewheel DOMMouseScroll touchstart touchmove touchend dragenter dragleave drop'

  const firePharse = km._firePharse.bind(km)
  km._bindEvents = function () {
    this._paper.on(paperEvent, firePharse)
    window.addEventListener('resize', firePharse)
    events.push({ type: 'resize', listener: firePharse })
  }

  const camera = km._commands.camera.execute
  km._commands.camera.execute = function (km: any, focusNode: any) {
    if (km._status === 'normal') {
      return
    }

    if (focusNode) {
      camera.call(this, km, focusNode)
      return
    }

    // eslint-disable-next-line no-proto
    const Point = km.getRoot().getVertexIn().__proto__.constructor

    const tpl = km.getTemplate()

    if (['right', 'fish-bone'].includes(tpl)) {
      const viewport = km.getPaper().getViewPort()
      const x = viewport.center.x - viewport.center.x / viewport.zoom + 20 / viewport.zoom
      const y = viewport.center.y + 10 / viewport.zoom
      const duration = km.getOption('viewAnimationDuration')
      km._viewDragger.moveTo(new Point(x, y), duration)
    } else if (['structure', 'filetree'].includes(tpl)) {
      const viewport = km.getPaper().getViewPort()
      const x = viewport.center.x
      const y = viewport.center.y - viewport.center.y / viewport.zoom + 40 / viewport.zoom
      const duration = km.getOption('viewAnimationDuration')
      km._viewDragger.moveTo(new Point(x, y), duration)
    } else {
      camera.call(this, km)
    }
  }

  // disable mouseup event listening
  km._modules.Select.init = () => 0

  // fix bug: origin dispose has bug not work.
  km.viewer.dispose = function () {
    try {
      document.removeEventListener('keydown', this.hotkeyHandler)
      this.close()
    } catch {}
  }

  // fix bug: https://github.com/fex-team/kityminder-editor/issues/704
  km.clearSelect = function () {
    paperEvent.split(' ').forEach(type => this._paper.off(type, firePharse))
    km.viewer.dispose()
    events.forEach(({ type, listener }) => {
      window.removeEventListener(type, listener)
    })
  }

  const kmDestroy = km.destroy.bind(km)
  km.destroy = function () {
    km._bindEvents = () => 0
    kmDestroy()
  }

  // hack, avoid KM editor auto focus.
  km.focus = () => 0

  km._setTemplate = km.setTemplate

  const importNode = km.importNode.bind(km)
  km.importNode = function (node: any, json: any) {
    if (json && json.data && json.data.text) {
      json.data.text = (json.data.text as string).replace(/^\[(\d+)\]\s*/, (match, $1) => {
        const num = parseInt($1)
        if (num > 0) {
          json.data.priority = num
          return ''
        }

        return match
      })
    }

    return importNode(node, json)
  }

  const priorityRender = km._modules.PriorityModule.renderers.left
  const priorityIconCreate = priorityRender.prototype.create
  priorityRender.prototype.create = () => {
    const icon = priorityIconCreate()
    const setValue = icon.setValue.bind(icon)
    icon.setValue = function (val: number) {
      this.mask.fill('#A3A3A3')
      this.back.fill('#515151')
      setValue(val)
    }

    return icon
  }

  km.disableAnimationAwhile = async (fn: Function) => {
    // hack for avoid auto set template
    km.setTemplate = () => 0
    km.disableAnimation()
    await fn()
    km.enableAnimation()
    // recover setTemplate
    km.setTemplate = km._setTemplate
  }

  const importJson = km.importJson.bind(km)
  km.importJson = function (json: any) {
    if (json) {
      importJson(json)
    }
  }

  return km
}

const buildSrcdoc = (json: string, btns: string) => {
  return `
    ${links}
    <style>
      body {
        margin: 0;
        padding: 0;
        height: 100%;
        background: #fff;
      }

      .mind-map-action {
        position: absolute;
        right: 10px;
        top: 3px;
        z-index: 1;
        text-align: right;
        background: transparent;
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
  div.style.height = '300px'
  div.style.minHeight = '300px'
  ele.innerHTML = ''
  ele.appendChild(div)

  const km = newMinder()

  km.setup(div)
  km.disable()
  km.setOption('defaultTheme', 'fresh-green-compat')
  km.setTemplate(storage.get(layoutStorageKey, 'default'))

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
  const fitHeight = () => {
    const paper = km.getPaper()
    const kmView = paper.container
    const svgG = paper.shapeNode
    if (kmView && svgG) {
      kmView.style.height = (svgG.getBoundingClientRect().height + 40) + 'px'
      km._modules.View.events.resize.apply(km)
      km.zoom(km.getZoomValue()) // reset view port
      setTimeout(() => {
        km.execCommand('camera')
      }, 0)
    }
  }

  const exportData = async (type: 'png' | 'svg' | 'km') => {
    const filename = `mindmap-${Date.now()}.${type}`

    switch (type) {
      case 'svg':
        downloadDataURL(filename, 'data:image/svg+xml;base64,' + strToBase64(await km.exportData('svg')))
        break
      case 'km':
        downloadDataURL(filename, 'data:application/octet-stream;base64,' + strToBase64(await km.exportData('json')))
        break
      case 'png':
        downloadDataURL(filename, await km.exportData('png'))
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
  action.className = 'mind-map-action skip-print'
  action.appendChild(buildButton(t('mind-map.zoom-in'), zoomIn, 'zoomIn'))
  action.appendChild(buildButton(t('mind-map.zoom-out'), zoomOut, 'zoomOut'))
  action.appendChild(buildButton(t('mind-map.switch-layout'), switchLayout, 'switchLayout'))
  action.appendChild(buildButton(t('mind-map.switch-loose'), switchCompat, 'switchCompat'))
  const actionsStr = action.outerHTML.replace(/data-onclick/g, 'onclick')
  action.appendChild(buildButton(t('open-in-new-window'), () => {
    const srcdoc = buildSrcdoc(JSON.stringify(km.exportJson()), actionsStr)
    openWindow(buildSrc(srcdoc, t('view-figure'), true), '_blank', { backgroundColor: '#fff' })
  }))
  action.prepend(buildButton(t('mind-map.fit-height'), fitHeight, 'fitHeight'))
  action.appendChild(buildButton('PNG', () => exportData('png')))
  action.appendChild(buildButton('SVG', () => exportData('svg')))
  action.appendChild(buildButton('KM', () => exportData('km')))

  div.appendChild(action)

  return km
}

const render = async (km: any, content: string) => {
  let code = (content || '').trim()

  try {
    // replace 2 spaces to 4 spaces
    if (code.match(/^ {2}[^ ]/gm)) {
      code = code.replace(/^ {2,}[^ ]/gm, (match) => {
        return match.replace(/ {2}/g, '    ')
      })
    }

    await km.importData('text', code)
  } catch (error) {
    await km.importData('text', t('mind-map.convert-error'))
    km.execCommand('camera')
  }
}

const MindMap = defineComponent({
  name: 'mind-map',
  props: {
    attrs: Object,
    content: {
      type: String,
      default: ''
    }
  },
  setup (props) {
    const id = `mind-map-${mindMapId++}`
    const container = ref<HTMLElement>()

    let km: any = null
    const renderMindMap = debounce(() => {
      if (!container.value) {
        return
      }

      if (!km) {
        km = init(container.value)
        km.disableAnimationAwhile(async () => {
          await render(km, props.content)
          km.execCommand('hand')
          km.execCommand('camera')
        })
        instances.set(id, km)
      } else {
        km.disableAnimationAwhile(() => render(km, props.content))
      }
    }, 200, { leading: true })

    function clean () {
      km && km.destroy()
      km = null
      instances.delete(id)
    }

    function reload () {
      clean()
      renderMindMap()
    }

    watch(() => props.content, renderMindMap)

    watch(() => store.state.showView, (visible) => {
      if (visible) {
        nextTick(reload)
      }
    })

    onMounted(() => setTimeout(renderMindMap, 0))

    registerHook('I18N_CHANGE_LANGUAGE', reload)
    onBeforeUnmount(() => {
      clean()
      removeHook('I18N_CHANGE_LANGUAGE', reload)
    })

    let focused = false

    return () => h('div', {
      id,
      ref: container,
      class: 'mind-map reduce-brightness',
      tabIndex: -1,
      onClickCapture: () => { container.value?.focus() },
      onFocus: () => { focused = true },
      onBlur: () => { focused = false },
      onMousewheelCapture: (e: WheelEvent) => { !focused && e.stopPropagation() },
      ...props.attrs,
    })
  }
})

const renderRule: Renderer.RenderRule = (tokens, idx, options, { bMarks, source }, slf) => {
  const token = tokens[idx]
  const nextToken = tokens[idx + 1]
  if (token.map && nextToken && nextToken.attrGet('class')?.includes('mindmap')) {
    const content = source
      .substring(bMarks[token.map[0]], bMarks[token.map[1]])
      .replace(/\{.mindmap[^}]*\}/gm, '')
      .replace(/^(\s*)([+-]*|\d+.) /gm, '$1')

    return h(MindMap, { attrs: token.meta?.attrs, content }) as any
  }

  return slf.renderToken(tokens, idx, options)
}

export default {
  name: 'markdown-mind-map',
  register: ctx => {
    ctx.theme.addStyles(`
      .markdown-view .markdown-body .mind-map {
        overflow: hidden;
      }

      .markdown-view .markdown-body .mind-map > div {
        margin-top: -20px;
      }

      .markdown-view .markdown-body .mind-map .mind-map-action {
        position: absolute;
        right: 10px;
        top: 23px;
        z-index: 1;
        text-align: right;
        background: transparent;
        opacity: 0;
        transition: opacity .2s;
      }

      .markdown-view .markdown-body .mind-map:hover .mind-map-action {
        opacity: 1;
      }
    `)

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

    ctx.registerHook('VIEW_ON_GET_HTML_FILTER_NODE', async ({ node, options }) => {
      if (node.classList.contains('mind-map') && node.id) {
        const km = instances.get(node.id)
        if (km) {
          const img = document.createElement('img')
          img.alt = 'mind-map'

          if (options.preferPng) {
            img.src = await km.exportData('png')
          } else {
            const svg = await km.exportData('svg')
            img.src = 'data:image/svg+xml;base64,' + ctx.utils.strToBase64(svg)
          }

          node.outerHTML = img.outerHTML
        }
      }
    })

    ctx.editor.tapSimpleCompletionItems(items => {
      /* eslint-disable no-template-curly-in-string */

      items.push(
        { label: '/ + MindMap', insertText: '+ ${1:Subject}{.mindmap}\n    + ${2:Topic}' },
      )
    })
  }
} as Plugin
