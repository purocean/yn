// https://github.com/Oktavilla/markdown-it-table-of-contents

import { h } from 'vue'
import Markdown from 'markdown-it'
import StateInline from 'markdown-it/lib/rules_inline/state_inline'
import ctx, { Plugin } from '@fe/context'

const slugify = (s: string) => encodeURIComponent(String(s).trim().toUpperCase().replace(/\s+/g, '-'))

const defaults = {
  level: [2, 3],
  containerClass: 'table-of-contents',
  slugify,
  markerPattern: /^\[toc\](.*?)$/im,
  type: 'ul',
  format: undefined,
  forceFullToc: false,
  containerHeaderHtml: '',
  containerFooterHtml: ''
}

const MarkdownItPlugin = (md: Markdown, o: any) => {
  const options = Object.assign({}, defaults, o)
  const tocRegexp = options.markerPattern
  let gTokens: any[]

  function toc (state: StateInline, silent: any) {
    let match

    // Reject if the token does not start with [
    if (state.src.charCodeAt(state.pos) !== 0x5B) {
      return false
    }
    // Don't run any pairs in validation mode
    if (silent) {
      return false
    }

    // Detect TOC markdown
    match = tocRegexp.exec(state.src.substr(state.pos))
    match = !match ? [] : match.filter((m: any) => !!m)
    if (match.length < 1) {
      return false
    }

    if (match.length > 1) { // custom params.
      try {
        const ext = JSON.parse(match[1].replace(/(['"])?([a-z0-9A-Z_]+)(['"])?:/g, '"$2": '))
        Object.assign(options, defaults, o, ext)
      } catch (error) {
        console.log('parse params error', match)
      }
    } else {
      Object.assign(options, defaults, o)
    }

    // Build content
    const token = state.push('toc_body', 'toc', 0)
    token.markup = '[[toc]]'
    token.block = true

    // Update pos so the parser can continue
    const newline = state.src.indexOf('\n', state.pos)
    if (newline !== -1) {
      state.pos = newline
    } else {
      state.pos = state.pos + state.posMax + 1
    }

    return true
  }

  function renderChildrenTokens (pos: any, tokens: any) {
    const headings = []
    let buffer = ''
    let currentLevel
    let subHeadings
    const size = tokens.length
    let i = pos
    while (i < size) {
      const token = tokens[i]
      const heading = tokens[i - 1]
      const level = token.tag && parseInt(token.tag.substr(1, 1))
      if (token.type !== 'heading_close' || options.level.indexOf(level) === -1 || heading.type !== 'inline') {
        i++
        continue // Skip if not matching criteria
      }
      if (!currentLevel) {
        currentLevel = level // We init with the first found level
      } else {
        if (level > currentLevel) {
          subHeadings = renderChildrenTokens(i, tokens)
          buffer += subHeadings[1]
          i = subHeadings[0]
          continue
        }
        if (level < currentLevel) {
          // Finishing the sub headings
          buffer += '</li>'
          headings.push(buffer)
          return [i, `<${options.type}>${headings.join('')}</${options.type}>`]
        }
        if (level === currentLevel) {
          // Finishing the sub headings
          buffer += '</li>'
          headings.push(buffer)
        }
      }

      // Add id to heading.

      const slug = options.slugify(heading.content)

      buffer = `<li><a href="#${slug}">`
      buffer += typeof options.format === 'function' ? options.format(heading.content) : heading.content
      buffer += '</a>'
      i++
    }
    buffer += buffer === '' ? '' : '</li>'
    headings.push(buffer)
    return [i, `<${options.type}>${headings.join('')}</${options.type}>`]
  }

  md.renderer.rules.toc_body = function () {
    if (!gTokens) {
      return
    }

    let tocBody = ''

    if (options.forceFullToc) {
      /*

      Renders full TOC even if the hierarchy of headers contains
      a header greater than the first appearing header

      ## heading 2
      ### heading 3
      # heading 1

      Result TOC:
      - heading 2
         - heading 3
      - heading 1

      */
      let pos = 0
      const tokenLength = gTokens.length

      while (pos < tokenLength) {
        const tocHierarchy = renderChildrenTokens(pos, gTokens)
        pos = tocHierarchy[0]
        tocBody += tocHierarchy[1]
      }
    } else {
      tocBody = renderChildrenTokens(0, gTokens)[1]
    }

    const html = `
      ${options.containerHeaderHtml}
      ${tocBody}
      ${options.containerFooterHtml}
    `

    return h('div', { key: html, class: options.containerClass, innerHTML: html }) as any
  }

  const headTitle = ctx.action.getKeyLabel(ctx.action.Keys.CtrlCmd) + ' + ' + ctx.i18n.t('click-to-copy-link')

  md.renderer.rules.heading_open = function (tokens, idx, opt, env, slf) {
    const header = tokens[idx]
    const headContent = tokens[idx + 1]
    const slug = options.slugify(headContent.content)

    if (header.attrIndex('id') < 0) {
      header.attrSet('id', slug)
    }

    if (header.attrIndex('title') < 0) {
      header.attrSet('title', headTitle)
    }

    header.attrSet('data-tag', header.tag)

    return slf.renderToken(tokens, idx, opt)
  }

  // Catch all the tokens for iteration later
  md.core.ruler.push('grab_state', function (state) {
    // only heading close and heading content
    const maxIdx = state.tokens.length - 1
    gTokens = state.tokens.filter((token: any, i: number, arr: any[]) => {
      return token.type === 'heading_close' ||
        (i < maxIdx && arr[i + 1].type === 'heading_close' && token.type === 'inline')
    })
    return true
  })

  // Insert TOC
  md.inline.ruler.after('emphasis', 'toc', toc)
}

export default {
  name: 'markdown-toc',
  register: ctx => {
    ctx.view.addStyles(`
      .markdown-view .markdown-body .table-of-contents ol {
        counter-reset: ol-number;
        list-style-type: none;
        padding-left: 0;
      }

      .markdown-view .markdown-body .table-of-contents li > ol {
        padding-left: 2em;
      }

      .markdown-view .markdown-body .table-of-contents ol > li::before {
        counter-increment: ol-number;
        content: counters(ol-number, ".") " ";
      }

      .markdown-view .markdown-body .table-of-contents > ol > li::before {
        counter-increment: ol-number;
        content: counter(ol-number) ". ";
      }
    `)

    ctx.markdown.registerPlugin(MarkdownItPlugin)

    ctx.editor.tapSimpleCompletionItems(items => {
      /* eslint-disable no-template-curly-in-string */

      items.push(
        { label: '/ [toc] Table of content', insertText: '[toc]{type: "${1|ul,ol|}", level: [2,3]}' },
      )
    })
  }
} as Plugin
