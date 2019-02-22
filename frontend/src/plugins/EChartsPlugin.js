import echarts from 'echarts'
import CryptoJS from 'crypto-js'

const renderHtml = code => {
  const id = `echart-${CryptoJS.MD5(code).toString()}-${Math.random().toString(36).substr(2)}`

  return `<div class="echarts" id="${id}" data-code="${encodeURIComponent(code)}"></div>`
}

const EChartsPlugin = md => {
  const temp = md.renderer.rules.fence.bind(md.renderer.rules)

  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx]
    const code = token.content.trim()
    if (token.info === 'js' && code.split(/\n/)[0].trim().includes('--echarts--')) {
      return renderHtml(code)
    }

    return temp(tokens, idx, options, env, slf)
  }
}

let charts = {}

EChartsPlugin.update = (theme = 'dark', animation = undefined, renderImg = false) => {
  Object.values(charts).forEach(x => x.chart.dispose())
  charts = {}

  for (let ele of document.getElementsByClassName('echarts')) {
    try {
      const id = ele.getAttribute('id')
      const code = ele.dataset['code']

      if (code) {
        const chart = echarts.init(ele, theme)
        // eslint-disable-next-line
        eval(`(${decodeURIComponent(code)})(chart)`)

        if (animation !== undefined) {
          chart.setOption({animation})
        }

        let img = null

        if (renderImg) {
          img = new Image()
          img.width = ele.clientWidth
          img.height = ele.clientHeight
          img.src = chart.getDataURL()
        }

        charts[id] = { chart, img }
      }
    } catch (error) {
      ele.innerText = error
    }
  }
}

EChartsPlugin.preparePrint = () => {
  EChartsPlugin.update('light', false, true)

  for (let ele of document.getElementsByClassName('echarts')) {
    while (ele.firstChild) {
      ele.firstChild.remove()
    }

    const id = ele.getAttribute('id')

    if (charts[id] && charts[id].img) {
      ele.appendChild(charts[id].img)
    }
  }
}

window.addEventListener('resize', () => {
  Object.values(charts).forEach(x => x.chart.resize())
})

window.addEventListener('beforeprint', () => {
  EChartsPlugin.update('light', false)
})

export default EChartsPlugin
