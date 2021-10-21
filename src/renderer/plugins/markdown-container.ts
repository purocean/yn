import MarkdownItContainer from 'markdown-it-container'
import { h } from 'vue'
import { Plugin } from '@fe/context/plugin'
import type Token from 'markdown-it/lib/token'

export default {
  name: 'markdown-container',
  register: ctx => {
    ctx.theme.addStyles(`
      .markdown-view .markdown-body .custom-container.details,
      .markdown-view .markdown-body .custom-container.danger,
      .markdown-view .markdown-body .custom-container.warning,
      .markdown-view .markdown-body .custom-container.tip {
        padding: 2px 24px;
        margin: 16px 0;
        border-left-width: 8px;
        border-left-style: solid;
        padding-top: 16px;
        border-radius: var(--g-border-radius);
      }

      .markdown-view .markdown-body .custom-container-title {
        font-weight: 600;
        margin-bottom: 10px;
        margin-top: -6px;
        font-size: 1.1em;
      }

      .markdown-view .markdown-body .custom-container.danger {
        border-color: #cc0000;
        background-color: #ffe0e0;
        color: #660000;
      }

      .markdown-view .markdown-body .custom-container.warning {
        border-color: #e7c000;
        background-color: #fffae3;
        color: #746000;
      }

      .markdown-view .markdown-body .custom-container.tip {
        border-color: #42b983;
        background-color: var(--g-color-90);
        color: var(--g-color-10);
      }

      .markdown-view .markdown-body .custom-container.details {
        border: none;
        background-color: var(--g-color-90);
        padding: 16px 20px;
      }
    `)

    ctx.markdown.registerPlugin(md => {
      ['tip', 'warning', 'danger', 'details'].forEach(name => {
        const reg = new RegExp(`^${name}\\s*(.*)$`)
        console.log('xxx', reg)

        md.use(MarkdownItContainer, name, {
          validate: (params: string) => {
            return reg.test(params.trim())
          },
          render: function (tokens: Token[], idx: number) {
            const info = tokens[idx].info.trim()
            const match = info.match(reg)

            if (tokens[idx].nesting === 1) {
              const title = md.utils.escapeHtml(match![1])
              const containerTag = name === 'details' ? 'details' : 'div'
              const containerClass = `custom-container ${name}`
              const titleTag = name === 'details' ? 'summary' : 'p'
              const titleClass = name === 'details' ? '' : 'custom-container-title'

              const children = title ? [h(titleTag, { class: titleClass }, title)] : []
              return h(containerTag, { class: containerClass }, children)
            }
          }
        })
      })
    })
  }
} as Plugin
