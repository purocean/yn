import { h } from 'vue'
import * as echarts from 'echarts'
import CryptoJS from 'crypto-js'
import Markdown from 'markdown-it'
import { Plugin } from '@fe/context/plugin'
import { getColorScheme } from '@fe/context/theme'

const render = (code: string) => {
  const id = `echart-${CryptoJS.MD5(code).toString()}-${Math.random().toString(36).substr(2)}`

  return h(
    'div', { class: 'echarts', id, 'data-code': encodeURIComponent(code) })
}

const EChartsPlugin = (md: Markdown) => {
  const temp = md.renderer.rules.fence!.bind(md.renderer.rules)

  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx]
    const code = token.content.trim()
    if (token.info === 'js' && code.split(/\n/)[0].trim().includes('--echarts--')) {
      return render(code) as any
    }

    return temp(tokens, idx, options, env, slf)
  }
}

let charts: {[key: string]: any} = {}

const update = (theme: string | null = null, animation: boolean | undefined = undefined, renderImg = false) => {
  theme ??= getColorScheme()

  Object.values(charts).forEach(x => x.chart.dispose())
  charts = {}

  for (const ele of document.getElementsByClassName('echarts')) {
    const el = ele as HTMLDivElement
    try {
      const id = el.getAttribute('id')!
      const code = el.dataset.code

      if (code) {
        const chart = echarts.init(el, theme)
        // eslint-disable-next-line
        eval(`(${decodeURIComponent(code)})(chart)`)

        if (animation !== undefined) {
          chart.setOption({ animation })
        }

        let img = null

        if (renderImg) {
          img = new Image()
          img.width = el.clientWidth
          img.height = el.clientHeight
          img.src = chart.getDataURL({})
        }

        charts[id] = { chart, img }
      }
    } catch (error) {
      el.innerText = error
    }
  }
}

const preparePrint = () => {
  update('light', false, true)

  for (const ele of document.getElementsByClassName('echarts')) {
    while (ele.firstChild) {
      ele.firstChild.remove()
    }

    const id = ele.getAttribute('id')!

    if (charts[id] && charts[id].img) {
      ele.appendChild(charts[id].img)
    }
  }
}

window.addEventListener('resize', () => {
  Object.values(charts).forEach(x => x.chart.resize())
})

window.addEventListener('beforeprint', () => {
  update('light', false)
})

export default {
  name: 'markdown-echarts',
  register: ctx => {
    ctx.theme.addStyles(`
      .markdown-view .markdown-body .echarts {
        width: 100%;
        height: 350px;
      }
    `)

    ctx.markdown.registerPlugin(EChartsPlugin)
    ctx.registerHook('ON_VIEW_RENDERED', () => {
      update()
    })
    ctx.registerHook('ON_VIEW_BEFORE_CONVERT', () => {
      preparePrint() // 转换成图片形式，设置主题
      setTimeout(() => update(), 0) // 恢复
    })

    ctx.bus.on('theme.change', () => update())
  }
} as Plugin
