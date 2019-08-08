import file from '@/lib/file'

const Plugin = md => {
  const renderHtml = ({ file, content }) => {
    const iframe = document.createElement('iframe')
    iframe.className = 'drawio'
    iframe.frameBorder = '0'
    iframe.width = '100%'
    iframe.height = '300px'
    iframe.dataset['file'] = file || ''
    iframe.dataset['content'] = content || ''

    return iframe.outerHTML
  }

  const linkTemp = md.renderer.rules.link_open.bind(md.renderer.rules)
  md.renderer.rules.link_open = (tokens, idx, options, env, slf) => {
    const token = tokens[idx]

    if (token.attrGet('title') !== '--drawio--') {
      return linkTemp(tokens, idx, options, env, slf)
    }

    const file = token.attrGet('href')
    const nextToken = tokens[idx + 1]
    if (nextToken && nextToken.type === 'text') {
      nextToken.content = ''
    }

    return renderHtml({ file })
  }

  const fenceTemp = md.renderer.rules.fence.bind(md.renderer.rules)
  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx]

    const code = token.content.trim()
    const firstLine = code.split(/\n/)[0].trim()
    if (!firstLine.includes('--drawio--')) {
      return fenceTemp(tokens, idx, options, env, slf)
    }

    return renderHtml({ content: code })
  }
}

Plugin.load = async (el, repo, path) => {
  let content = el.dataset['content']
  if (!content) {
    content = (await file.read({ repo, path })).content
  }

  content = content.replace(/<!--.*?-->/gs, '').trim()

  const div = document.createElement('div')
  div.className = 'mxgraph'
  div.dataset['mxgraph'] = JSON.stringify({
    highlight: '#00afff',
    lightbox: false,
    nav: true,
    resize: true,
    toolbar: 'zoom layers',
    xml: content
  })

  const appVm = window.appVm
  el.onload = function () {
    const resize = () => {
      this.height = this.contentDocument.documentElement.scrollHeight + 'px'
      this.contentDocument.body.style.height = this.contentDocument.body.clientHeight + 'px'
      appVm.$bus.emit('resize')
    }

    this.contentWindow.resize = resize
    // 点击 fit 的时候调整窗口大小
    this.contentDocument.addEventListener('click', e => {
      if (e.target.parentElement.title === 'Fit') {
        resize()
      }
    })

    setTimeout(resize, 300)
  }

  el.srcdoc = `
    <style>
      ::selection {
        background: #d3d3d3;
      }

      ::-webkit-scrollbar {
        width: 7px;
        height: 7px;
      }

      ::-webkit-scrollbar-track {
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.08);
        box-shadow: inset 0 0 5px rgba(255, 255, 255, 0.1);
      }

      ::-webkit-scrollbar-thumb {
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.09);
        box-shadow: inset 0 0 6px rgba(255, 255, 255, 0.1);
      }

      ::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.15);
      }

      .mxgraph {
        max-width: 100%;
      }

      .geDiagramContainer {
        max-width: 100%;
        max-height: 100%;
      }
    </style>
    ${div.outerHTML}
    <script src="./viewer.min.js"></script>
  `
}

export default Plugin
