import { Plugin } from '@fe/context'

export default {
  name: 'misc',
  register: ctx => {
    ctx.markdown.registerPlugin(md => {
      md.renderer.rules.paragraph_open = (tokens, idx, options, env, self) => {
        // auto recognize block image
        if (
          tokens[idx + 1]?.type === 'inline' &&
          tokens[idx + 2]?.type === 'paragraph_close' &&
          tokens[idx + 1]?.children?.length === 1 &&
          tokens[idx + 1]?.children?.[0]?.type === 'image'
        ) {
          tokens[idx + 1]?.children?.[0].attrSet(ctx.args.DOM_ATTR_NAME.ONLY_CHILD, 'true')
        }

        return self.renderToken(tokens, idx, options)
      }
    })
  }
} as Plugin
