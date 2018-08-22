const MyPlugin = (md) => {
  const LinkTargetBlank = (tokens, idx, options, env, slf) => {
    if (tokens[idx].attrIndex('target') < 0) {
      tokens[idx].attrPush(['target', '_blank'])
    }

    return slf.renderToken(tokens, idx, options, env, slf)
  }

  md.renderer.rules.link_open = LinkTargetBlank
}

export default MyPlugin
