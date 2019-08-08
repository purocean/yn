const Plugin = md => {
  const temp = md.renderer.rules.link_open.bind(md.renderer.rules)

  md.renderer.rules.link_open = (tokens, idx, options, env, slf) => {
    const token = tokens[idx]

    if (token.attrGet('title') !== 'drawio') {
      return temp(tokens, idx, options, env, slf)
    }

    let linkText = ''
    const nextToken = tokens[idx + 1]
    if (nextToken && nextToken.type === 'text') {
      linkText = nextToken.content
      nextToken.content = ''
    }

    const iframe = document.createElement('iframe')
    iframe.className = 'drawio-view'
    iframe.frameBorder = '0'
    iframe.width = '100%'
    iframe.height = '300px'
    iframe.dataset['text'] = linkText
    iframe.src = 'http://g.cn'

    return iframe.outerHTML
  }
}

export default Plugin
