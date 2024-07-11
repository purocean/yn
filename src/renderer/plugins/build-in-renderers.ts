import type { Plugin } from '@fe/context'
import type { Doc } from '@fe/types'

export default {
  name: 'build-in-renderers',
  register: (ctx) => {
    ctx.renderer.registerRenderer({
      name: 'not-markdown-file',
      order: 999999999,
      when (env) {
        return !env.file || !ctx.doc.isMarkdownFile(env.file)
      },
      render (_, env) {
        const { h } = ctx.lib.vue
        return [
          h('h1', env.file?.name),
          h('p', [h('em', 'Not a markdown file.')])
        ]
      },
    })

    ctx.renderer.registerRenderer({
      name: 'markdown',
      order: -255,
      when (env) {
        return !!(env.file && ctx.doc.isMarkdownFile(env.file))
      },
      render (src, env) {
        return ctx.markdown.markdown.render(src, env)
      },
    })

    ctx.renderer.registerRenderer({
      name: 'plain-text',
      when (env) {
        return !!(env.file && env.file.path.toLowerCase().endsWith('.txt'))
      },
      render (src) {
        return ctx.lib.vue.h('div', {
          style: {
            padding: '20px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          },
        }, src)
      },
    })

    function isHtmlDoc (doc: Doc) {
      return doc.type === 'file' && doc.path.toLowerCase().endsWith('.html')
    }

    let renderHtmlTime = 0
    ctx.renderer.registerRenderer({
      name: 'html',
      when (env) {
        return !!(env.file && !env.safeMode && isHtmlDoc(env.file))
      },
      render (src, env) {
        const iframeProps = { style: `background: #fff; position: fixed; left: 0; top: 0; height: var(${ctx.args.CSS_VAR_NAME.PREVIEWER_HEIGHT})` }
        const doc = env.file
        if (doc) {
          const url = ctx.base.getAttachmentURL(doc) + '?_t=' + renderHtmlTime
          const html = `<iframe src="${url}" style="${iframeProps.style};width: 100vw; height: 100vh; display: block; border: none;" />`
          return ctx.lib.vue.h(ctx.embed.IFrame, { html, triggerParentKeyBoardEvent: true, iframeProps })
        } else {
          return ctx.lib.vue.h(ctx.embed.IFrame, { html: src, triggerParentKeyBoardEvent: true, iframeProps })
        }
      },
    })

    ctx.registerHook('DOC_SAVED', ({ doc }) => {
      if (isHtmlDoc(doc)) { // render html doc after saved
        renderHtmlTime = Date.now()
        ctx.view.render()
      }
    })
  }
} as Plugin
