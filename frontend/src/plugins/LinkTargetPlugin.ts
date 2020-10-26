import Markdown from 'markdown-it'

const LinkTargetPlugin = (md: Markdown) => {
  md.renderer.rules.link_open = (tokens, idx, options, _, slf) => {
    if (tokens[idx].attrIndex('target') < 0) {
      tokens[idx].attrPush(['target', '_blank'])
    }

    return slf.renderToken(tokens, idx, options)
  }
}

export default LinkTargetPlugin
