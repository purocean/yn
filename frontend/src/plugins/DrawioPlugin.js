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

    return `
      <div style="position: relative">
        ${iframe.outerHTML}
      </div>
    `
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
    if (token.info !== 'xml' || !firstLine.includes('--drawio--')) {
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

  const srcdoc = `
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

      html, body {
        height: 100%;
      }
    </style>
    ${div.outerHTML}
    <script src="${location.origin}/viewer.min.js"></script>
  `

  const resize = () => {
    el.contentDocument.body.style.height = 'auto'
    el.contentDocument.documentElement.style.height = 'auto'
    el.height = el.contentDocument.documentElement.scrollHeight + 'px'
    el.contentDocument.body.style.height = el.contentDocument.body.clientHeight + 'px'
    appVm.$bus.emit('resize')
  }

  const appVm = window.appVm
  el.onload = () => setTimeout(resize, 300)
  el.srcdoc = srcdoc

  const button1 = document.createElement('button')
  button1.style.cssText = 'font-size: 14px;background: #444444; border: 0; padding: 0 6px; color: #ccc; cursor: pointer; border-radius: 2px; transition: all .3s ease-in-out; line-height: 24px;'
  button1.innerText = '适应高度'
  button1.onclick = resize
  const button2 = document.createElement('button')
  button2.style.cssText = 'font-size: 14px;background: #444444; border: 0; padding: 0 6px; color: #ccc; cursor: pointer; border-radius: 2px; transition: all .3s ease-in-out; line-height: 24px;'
  button2.innerText = '新窗口打开'
  button2.onclick = () => {
    // const a = document.createElement('a')
    // a.href = 'data:text/html,nihao' // + encodeURIComponent(srcdoc)
    // a.target = '_blank'
    // a.click()
    const opener = window.open('about:blank')
    const frame = document.createElement('iframe')
    frame.width = '100%'
    frame.height = '100%'
    frame.frameBorder = '0'
    frame.srcdoc = srcdoc
    opener.document.body.style.height = '100vh'
    opener.document.body.style.margin = '0'
    opener.document.body.appendChild(frame)
  }

  const action = document.createElement('div')
  action.style.cssText = 'position: absolute; right: 15px; top: 3px; z-index: 1;'
  action.appendChild(button2)
  action.appendChild(button1)
  el.parentElement.appendChild(action)
}

export default Plugin
