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
  }
} as Plugin
