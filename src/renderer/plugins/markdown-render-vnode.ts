import { createVNode, Fragment, Text, VNode } from 'vue'
import Token from 'markdown-it/lib/token'
import Renderer from 'markdown-it/lib/renderer'
import { escapeHtml, unescapeAll } from 'markdown-it/lib/common/utils'
import { Plugin } from '@fe/useful/plugin'

const defaultRules = {} as any

defaultRules.code_inline = function (tokens: Token[], idx: number, _: any, __: any, slf: Renderer) {
  const token = tokens[idx]
  return createVNode('code', slf.renderAttrs(token) as any, token.content)
}

defaultRules.code_block = function (tokens: Token[], idx: number, _: any, __: any, slf: Renderer) {
  const token = tokens[idx]
  return createVNode(
    'pre',
    slf.renderAttrs(token) as any,
    createVNode('code', {}, token.content)
  )
}

defaultRules.fence = function (tokens: Token[], idx: number, options: any, _: any, slf: Renderer) {
  const token = tokens[idx]
  const info = token.info ? unescapeAll(token.info).trim() : ''
  let langName = ''
  let langAttrs = ''
  let highlighted; let i; let arr; let tmpAttrs; let tmpToken

  if (info) {
    arr = info.split(/(\s+)/g)
    langName = arr[0]
    langAttrs = arr.slice(2).join('')
  }

  if (options.highlight) {
    highlighted = options.highlight(token.content, langName, langAttrs) || escapeHtml(token.content)
  } else {
    highlighted = escapeHtml(token.content)
  }

  if (highlighted.indexOf('<pre') === 0) {
    return highlighted + '\n'
  }

  const renderAttrs = Renderer.prototype.renderAttrs.bind(slf)

  // If language exists, inject class gently, without modifying original token.
  // May be, one day we will add .deepClone() for token and simplify this part, but
  // now we prefer to keep things local.
  if (info) {
    i = token.attrIndex('class')
    tmpAttrs = token.attrs ? token.attrs.slice() : []

    if (i < 0) {
      tmpAttrs.push(['class', options.langPrefix + langName])
    } else {
      tmpAttrs[i] = tmpAttrs[i].slice() as any
      tmpAttrs[i][1] += ' ' + options.langPrefix + langName
    }

    // Fake token just to render attributes
    tmpToken = {
      attrs: tmpAttrs
    }

    return '<pre><code' + renderAttrs(tmpToken as any) + '>' +
          highlighted +
          '</code></pre>\n'
  }

  return '<pre><code' + renderAttrs(token) + '>' +
        highlighted +
        '</code></pre>\n'
}

defaultRules.image = function (tokens: Token[], idx: number, options: any, env: any, slf: Renderer) {
  const token = tokens[idx]

  return createVNode('img', {
    ...slf.renderAttrs(token) as any,
    alt: slf.renderInlineAsText(token.children || [], options, env)
  }, [])
}

defaultRules.hardbreak = function () {
  return createVNode('br')
}
defaultRules.softbreak = function (_: Token[], __: number, options: any) {
  return options.breaks ? createVNode('br') : null
}

defaultRules.text = function (tokens: Token[], idx: number) {
  return createVNode(Text, {}, tokens[idx].content)
}

defaultRules.html_block = function (tokens: Token[], idx: number) {
  return createHtmlVNode(tokens[idx].content)
}

defaultRules.html_inline = function (tokens: Token[], idx: number) {
  return createHtmlVNode(tokens[idx].content)
}

function createHtmlVNode (html: string) {
  const div = document.createElement('div')
  div.innerHTML = html
  const children = []
  for (let i = 0; i < div.children.length; i++) {
    const element = div.children[i]
    const tagName = element.tagName.toLowerCase()
    const attrs: Record<string, any> = {
      key: element.outerHTML
    }

    for (let j = 0; j < element.attributes.length; j++) {
      const attr = element.attributes[j]
      attrs[attr.name] = attr.value
    }

    attrs.innerHTML = element.innerHTML

    children.push(createVNode(tagName, attrs))
  }

  return createVNode(Fragment, {}, children)
}

function renderToken (this: Renderer, tokens: Token[], idx: number): any {
  const token = tokens[idx]

  if (token.nesting === -1) {
    return null
  }

  // Tight list paragraphs
  if (token.hidden) {
    return createVNode(Fragment, {}, [])
  }

  return createVNode(token.tag, this.renderAttrs(token) as any, [])
}

function renderAttrs (this: Renderer, token: Token) {
  if (!token.attrs) {
    return {}
  }

  const result: any = {}

  token.attrs.forEach(token => {
    result[token[0]] = token[1]
  })

  return result
}

function render (this: Renderer, tokens: Token[], options: any, env: any) {
  const rules: any = this.rules

  const vNodeParents: VNode[] = []

  return tokens.map((token, i) => {
    const type = token.type

    let vnode: VNode | null = null
    let parent: VNode | null = null

    if (type === 'inline') {
      vnode = createVNode(Fragment, {}, this.render(token.children || [], options, env))
    } else if (rules[type]) {
      const result = rules[type](tokens, i, options, env, this)
      if (typeof result === 'string') {
        vnode = createHtmlVNode(result)
      } else if (result && result.node && result.parent) {
        parent = result.parent
        vnode = result.node
      } else {
        vnode = result
      }
    } else {
      vnode = this.renderToken(tokens, i, options) as any
    }

    let isChild = false
    const parentNode = vNodeParents.length > 0 ? vNodeParents[vNodeParents.length - 1] : null
    if (vnode && parentNode) {
      const children = Array.isArray(parentNode.children) ? parentNode.children : []
      parentNode.children = children.concat([vnode])
      isChild = true
    }

    if (token.nesting === 1) {
      if (parent) {
        console.log(tokens, parent, vnode)
        vNodeParents.push(parent)
      } else if (vnode) {
        vNodeParents.push(vnode)
      }
    }

    if (token.nesting === -1) {
      vNodeParents.pop()
    }

    return isChild ? null : vnode
  }).filter(node => !!node) as any
}

export default {
  name: 'markdown-render-vnode',
  register: ctx => {
    ctx.markdown.registerPlugin(md => {
      md.renderer.rules = { ...md.renderer.rules, ...defaultRules }
      md.renderer.render = render
      md.renderer.renderInline = render
      md.renderer.renderAttrs = renderAttrs
      md.renderer.renderToken = renderToken
    })
  }
} as Plugin
