export default (md) => {
  const Fun = fn => (tokens, idx, options, env, slf) => {
    if (tokens[idx].attrIndex('title') < 0) {
      tokens[idx].attrPush(['title', 'Ctrl + 单击复制代码'])
      tokens[idx].attrPush(['onclick', `event.ctrlKey && window.appVm.$bus.emit('copy-text', this.innerText)`])
    }

    return (fn)(tokens, idx, options, env, slf)
  }

  md.renderer.rules.code_inline = Fun(md.renderer.rules.code_inline.bind(md.renderer.rules))
}
