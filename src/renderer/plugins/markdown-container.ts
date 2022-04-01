import MarkdownItContainer from 'markdown-it-container'
import { Fragment, h } from 'vue'
import type Token from 'markdown-it/lib/token'
import { Plugin } from '@fe/context'

export default {
  name: 'markdown-container',
  register: ctx => {
    ctx.theme.addStyles(`
      .markdown-view .markdown-body .custom-container.details,
      .markdown-view .markdown-body .custom-container.danger,
      .markdown-view .markdown-body .custom-container.warning,
      .markdown-view .markdown-body .custom-container.tip {
        padding: 2px 16px;
        padding-top: 16px;
        margin: 16px 0;
        border-left-width: 8px;
        border-left-style: solid;
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

      .markdown-view .markdown-body .custom-container.details > summary {
        margin-top: 0;
      }

      .markdown-view .markdown-body .custom-container.details > summary + *,
      .markdown-view .markdown-body .custom-container.details > :first-child:not(summary) {
        margin-top: 16px;
      }

      .markdown-view .markdown-body .custom-container.details > :last-child:not(summary) {
        margin-bottom: 0;
      }

      .markdown-view .markdown-body .custom-container.group {
        position: relative;
        display: flex;
        flex-wrap: wrap;
        margin-bottom: 16px;
        background: var(--g-color-80);
        border-radius: var(--g-border-radius);
        border: 1px solid var(--g-color-80);
      }

      .markdown-view .markdown-body .custom-container.group p {
        order: 100;
        width: 100%;
      }

      .markdown-view .markdown-body .custom-container.group > .custom-container-title {
        order: 1;
        padding-left: 8px;
        margin: 0;
        font-size: 14px;
        line-height: 2.2em;
      }

      .markdown-view .markdown-body .custom-container.group .group-item-radio {
        position: fixed;
        right: -99999999px;
      }

      .markdown-view .markdown-body .custom-container.group .group-item-label {
        order: 1;
        cursor: pointer;
        font-size: 14px;
        line-height: 2;
        padding: 0 1em;
        color: var(--g-color-20);
      }

      .markdown-view .markdown-body .custom-container.group .group-item-label:hover {
        background: var(--g-color-85);
      }

      .markdown-view .markdown-body .custom-container.group .group-item-content {
        order: 2;
        width: 100%;
        display: none;
        border-radius: var(--g-border-radius);
        border-top-left-radius: 0;
        padding: 12px;
        padding-bottom: 0;
        background: var(--g-color-100);
      }

      .markdown-view .markdown-body .custom-container.group .group-item-radio:checked + .group-item-label {
        background: var(--g-color-100);
        border-top-left-radius: var(--g-border-radius);
        border-top-right-radius: var(--g-border-radius);
        color: var(--g-color-0);
        font-weight: 500;
      }

      .markdown-view .markdown-body .custom-container.group .group-item-radio:checked + .group-item-label + .group-item-content {
        display: block;
      }

      @media screen {
        html[app-theme=dark] .markdown-view .markdown-body .custom-container.danger {
          background-color: #503f3f;
          color: #d9bebe;
        }

        html[app-theme=dark] .markdown-view .markdown-body .custom-container.warning {
          background-color: #4a4738;
          color: #cbb759;
        }
      }

      @media (prefers-color-scheme: dark) {
        html[app-theme=system] .markdown-view .markdown-body .custom-container.danger {
          background-color: #503f3f;
          color: #d9bebe;
        }

        html[app-theme=system] .markdown-view .markdown-body .custom-container.warning {
          background-color: #4a4738;
          color: #cbb759;
        }
      }
    `)

    let groupItemIdx = 0
    let groupItemSeq = 0
    let groupItemBase = Date.now()
    let groupItemName = groupItemBase + groupItemSeq

    ctx.registerHook('MARKDOWN_BEFORE_RENDER', ({ env }) => {
      // first render, reset count
      if (env.renderCount === 0) {
        groupItemBase = Date.now()
      }

      groupItemSeq = 0
    })

    ctx.markdown.registerPlugin(md => {
      ['tip', 'warning', 'danger', 'details', 'group-item', 'group'].forEach(name => {
        const reg = new RegExp(`^${name}\\s*(.*)$`)

        md.use(MarkdownItContainer, name, {
          validate: (params: string) => {
            return reg.test(params.trim())
          },
          render: function (tokens: Token[], idx: number) {
            const info = tokens[idx].info.trim()
            const match = info.match(reg)

            if (tokens[idx].nesting === 1) {
              const title = md.utils.escapeHtml(match![1])
              const containerClass = `custom-container ${name}`

              if (name === 'group-item') {
                const parent = h('div', { class: 'group-item-content' }, [])
                const radioName = `group-item-${groupItemName}`
                const id = `group-item-${groupItemName}-${groupItemIdx++}`
                const checked = groupItemIdx === 1 || title.startsWith('*')

                return {
                  node: h(Fragment, [
                    h('input', { key: id, class: 'group-item-radio', id, name: radioName, type: 'radio', checked }),
                    h('label', { class: 'group-item-label', for: id }, title.replace('*', '').trim() || 'Group Item'),
                    parent
                  ]),
                  parent
                }
              } else if (name === 'group') {
                groupItemIdx = 0
                groupItemSeq++
                groupItemName = groupItemBase + groupItemSeq
              }

              const containerTag = name === 'details' ? 'details' : 'div'
              const titleTag = name === 'details' ? 'summary' : 'p'
              const titleClass = name === 'details' ? '' : 'custom-container-title'

              const children = (title || name === 'group') ? [h(titleTag, { class: titleClass }, title)] : []
              const props: Record<string, any> = { class: containerClass }

              if (name === 'group') {
                props.key = groupItemName
              }

              return h(containerTag, props, children)
            }
          }
        })
      })
    })
  }
} as Plugin
