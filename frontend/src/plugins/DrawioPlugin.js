import file from '@/lib/file'

const Plugin = md => {
  const temp = md.renderer.rules.link_open.bind(md.renderer.rules)

  md.renderer.rules.link_open = (tokens, idx, options, env, slf) => {
    const token = tokens[idx]

    if (token.attrGet('title') !== 'drawio') {
      return temp(tokens, idx, options, env, slf)
    }

    const file = token.attrGet('href')
    let linkText = ''
    const nextToken = tokens[idx + 1]
    if (nextToken && nextToken.type === 'text') {
      linkText = nextToken.content
      nextToken.content = ''
    }

    const iframe = document.createElement('iframe')
    iframe.className = 'drawio'
    iframe.frameBorder = '0'
    iframe.width = '100%'
    iframe.height = '300px'
    iframe.dataset['text'] = linkText
    iframe.dataset['file'] = file

    return iframe.outerHTML
  }
}

Plugin.load = async (el, repo, path) => {
  if (!el.dataset['file']) {
    return
  }

  const { content } = await file.read({ repo, path })

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
      appVm.$bus.emit('resize')
    }

    this.contentWindow.resize = resize
    // 点击 fit 的时候调整窗口大小
    this.contentDocument.addEventListener('click', e => {
      if (e.target.parentElement.title === 'Fit') {
        resize()
      }
    })
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
    </style>
    ${div.outerHTML}
    <script type="text/javascript" src="https://www.draw.io/js/viewer.min.js"></script>
    <script>
      setTimeout(() => {
        resize()
      }, 300)
    </script>
  `
}

export default Plugin
