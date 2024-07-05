import type { Plugin } from '@fe/context'

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
      name: 'html',
      when (env) {
        return !!(env.file && !env.safeMode && env.file.path.toLowerCase().endsWith('.html'))
      },
      render (src) {
        const iframeProps = { style: `background: #fff; position: fixed; left: 0; top: 0; height: var(${ctx.args.CSS_VAR_NAME.PREVIEWER_HEIGHT})` }
        return ctx.lib.vue.h(ctx.embed.IFrame, { html: src, triggerParentKeyBoardEvent: true, iframeProps })
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
  }
} as Plugin
