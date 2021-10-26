import { Plugin } from '@fe/context'

export default {
  name: 'markdown-table',
  register: (ctx) => {
    ctx.theme.addStyles(`
      @media screen {
        .markdown-view .markdown-body .table-wrapper {
          overflow-x: auto;
          margin-bottom: 16px;
        }

        .markdown-view .markdown-body .table-wrapper > table {
          margin-bottom: 6px;
        }

        .markdown-view .markdown-body .table-wrapper > table th {
          white-space: nowrap;
        }

        .markdown-view .markdown-body .table-wrapper > table tr:hover {
          outline: 2px #b3833b dashed;
          outline-offset: -2px;
        }

        .markdown-view .markdown-body .table-wrapper > table tbody {
          counter-reset: tr-number;
        }

        .markdown-view .markdown-body .table-wrapper > table tbody:hover td:first-child:before {
          counter-increment: tr-number;
          content: counter(tr-number);
          position: absolute;
          right: 100%;
          padding-right: 5px;
          color: #999;
          font-family: monospace;
        }
      }
    `)

    ctx.markdown.registerPlugin(md => {
      md.renderer.rules.table_open = (tokens, idx, options, _, slf) => {
        const table = slf.renderToken(tokens, idx, options)
        return {
          node: ctx.lib.vue.h('div', {
            class: 'table-wrapper'
          }, table),
          parent: table
        } as any
      }
    })
  }
} as Plugin
