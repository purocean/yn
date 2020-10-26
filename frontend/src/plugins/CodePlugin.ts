import Markdown from 'markdown-it'

export default (md: Markdown) => {
  const Fun = (fn: Function) => (tokens: any, idx: any, options: any, env: any, slf: any) => {
    if (tokens[idx].attrIndex('title') < 0) {
      tokens[idx].attrPush(['title', 'Ctrl + 单击复制代码'])
      tokens[idx].attrPush(['onclick', "event.ctrlKey && window.globalBus.emit('copy-text', this.innerText)"])
    }

    return (fn)(tokens, idx, options, env, slf)
  }

  md.renderer.rules.code_inline = Fun(md.renderer.rules.code_inline!!.bind(md.renderer.rules))
}
