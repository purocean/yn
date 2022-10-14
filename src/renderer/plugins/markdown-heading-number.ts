import type { Plugin } from '@fe/context'
import type { FrontMatterAttrs } from '@fe/types'

export default {
  name: 'markdown-heading-number',
  register: ctx => {
    ctx.theme.addStyles(`
      .outline-toc {
        counter-reset: outline-h2counter outline-h3counter outline-h4counter outline-h5counter outline-h6counter;
      }

      .outline-toc .tag-h1.show-number { counter-reset: outline-h2counter; }
      .outline-toc .tag-h2.show-number { counter-reset: outline-h3counter; }
      .outline-toc .tag-h3.show-number { counter-reset: outline-h4counter; }
      .outline-toc .tag-h4.show-number { counter-reset: outline-h5counter; }
      .outline-toc .tag-h5.show-number { counter-reset: outline-h6counter; }

      .outline-toc .tag-h2.show-number:before {
        counter-increment: outline-h2counter;
        content: counter(outline-h2counter) ".\\0000a0\\0000a0";
      }

      .outline-toc .tag-h3.show-number:before {
        counter-increment: outline-h3counter;
        content: counter(outline-h2counter) "."
                counter(outline-h3counter) ".\\0000a0\\0000a0";
      }

      .outline-toc .tag-h4.show-number:before {
        counter-increment: outline-h4counter;
        content: counter(outline-h2counter) "."
                counter(outline-h3counter) "."
                counter(outline-h4counter) ".\\0000a0\\0000a0";
      }

      .outline-toc .tag-h5.show-number:before {
        counter-increment: outline-h5counter;
        content: counter(outline-h2counter) "."
                counter(outline-h3counter) "."
                counter(outline-h4counter) "."
                counter(outline-h5counter) ".\\0000a0\\0000a0";
      }

      .outline-toc .tag-h6.show-number:before {
        counter-increment: outline-h6counter;
        content: counter(outline-h2counter) "."
                counter(outline-h3counter) "."
                counter(outline-h4counter) "."
                counter(outline-h5counter) "."
                counter(outline-h6counter) ".\\0000a0\\0000a0";
      }
    `)

    ctx.view.addStyles(`
      .markdown-view .markdown-body {
        counter-reset: h2counter h3counter h4counter h5counter h6counter;
      }

      .markdown-view .markdown-body h1.show-number { counter-reset: h2counter; }
      .markdown-view .markdown-body h2.show-number { counter-reset: h3counter; }
      .markdown-view .markdown-body h3.show-number { counter-reset: h4counter; }
      .markdown-view .markdown-body h4.show-number { counter-reset: h5counter; }
      .markdown-view .markdown-body h5.show-number { counter-reset: h6counter; }

      .markdown-view .markdown-body h2.show-number:before {
        counter-increment: h2counter;
        content: counter(h2counter) ".\\0000a0\\0000a0";
      }

      .markdown-view .markdown-body h3.show-number:before {
        counter-increment: h3counter;
        content: counter(h2counter) "."
                counter(h3counter) ".\\0000a0\\0000a0";
      }

      .markdown-view .markdown-body h4.show-number:before {
        counter-increment: h4counter;
        content: counter(h2counter) "."
                counter(h3counter) "."
                counter(h4counter) ".\\0000a0\\0000a0";
      }

      .markdown-view .markdown-body h5.show-number:before {
        counter-increment: h5counter;
        content: counter(h2counter) "."
                counter(h3counter) "."
                counter(h4counter) "."
                counter(h5counter) ".\\0000a0\\0000a0";
      }

      .markdown-view .markdown-body h6.show-number:before {
        counter-increment: h6counter;
        content: counter(h2counter) "."
                counter(h3counter) "."
                counter(h4counter) "."
                counter(h5counter) "."
                counter(h6counter) ".\\0000a0\\0000a0";
      }
    `)

    ctx.markdown.registerPlugin(md => {
      const headingOpen = md.renderer.rules.heading_open!

      md.renderer.rules.heading_open = function (tokens, idx, opt, env, slf) {
        const attrs: FrontMatterAttrs = env.attributes
        if (attrs.headingNumber) {
          const token = tokens[idx]
          token.attrJoin('class', 'show-number')
        }

        return headingOpen.call(this, tokens, idx, opt, env, slf)
      }
    })
  }
} as Plugin
