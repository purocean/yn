import MarkdownItContainer from 'markdown-it-container'
import { applyAttrs, getAttrs, parseInfo } from 'markdown-it-attributes'
import { Fragment, h } from 'vue'
import type Token from 'markdown-it/lib/token'
import { Plugin } from '@fe/context'

export default {
  name: 'markdown-container',
  register: ctx => {
    ctx.theme.addStyles(`
      .markdown-view .markdown-body .custom-container.section {
        padding: 12px;
        border: 1px solid var(--g-color-80);
        border-radius: var(--g-border-radius);
        margin-top: 16px;
        position: relative;
      }

      .markdown-view .markdown-body .custom-container.section > :first-child {
        margin-top: 0;
      }

      .markdown-view .markdown-body .custom-container.row {
        display: flex;
        justify-content: space-between;
        position: relative;
        margin-top: 16px;
      }

      .markdown-view .markdown-body .custom-container.row.has-title {
        border-top: 24px solid transparent;
      }

      .markdown-view .markdown-body .custom-container.row > .custom-container-title {
        background: var(--g-color-80);
        position: absolute;
        padding-left: 8px;
        margin: 0;
        font-size: 14px;
        line-height: 2.2em;
        left: 0;
        top: -2.2em;
        width: 100%;
        border: 1px solid var(--g-color-80);
        border-top-left-radius: var(--g-border-radius);
        border-top-right-radius: var(--g-border-radius);
      }

      .markdown-view .markdown-body .custom-container.row > .custom-container.col > .custom-container-title {
        font-size: 14px;
        line-height: 1.2;
      }

      .markdown-view .markdown-body .custom-container.col {
        width: 100%;
        padding: 12px;
        padding-bottom: 0;
        border: 1px solid var(--g-color-80);
        border-radius: var(--g-border-radius);
        margin-right: 8px;
        background: var(--g-color-100);
      }

      .markdown-view .markdown-body .custom-container.row.has-title > .custom-container.col {
        margin-right: -1px;
        border-radius: 0;
      }

      .markdown-view .markdown-body .custom-container.col:last-of-type,
      .markdown-view .markdown-body .custom-container.row.has-title > .custom-container.col:last-of-type {
        margin-right: 0;
        border-bottom-right-radius: var(--g-border-radius);
      }

      .markdown-view .markdown-body .custom-container.row.has-title > .custom-container.col:first-of-type {
        border-bottom-left-radius: var(--g-border-radius);
      }

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

      .markdown-view .markdown-body .custom-container.danger,
      .markdown-view .markdown-body .custom-container.warning,
      .markdown-view .markdown-body .custom-container.tip {
        page-break-inside: avoid;
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
        display: none;
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
      ['tip', 'warning', 'danger', 'details', 'group-item', 'group', 'row', 'col', 'section'].forEach(name => {
        const reg = new RegExp(`^${name}\\s*(.*)$`)

        md.use(MarkdownItContainer, name, {
          validate: (params: string) => {
            return reg.test(params.trim())
          },
          render: function (tokens: Token[], idx: number) {
            const token = tokens[idx]

            if (token.nesting === 1) {
              // TODO: get options
              const attrsOpts = { leftDelimiter: '{', rightDelimiter: '}', allowedAttributes: undefined }

              // apply attributes
              const attrInfo = parseInfo(attrsOpts, token.info)
              if (attrInfo) {
                const attrs = getAttrs(attrInfo.exp)
                token.info = attrInfo.text
                applyAttrs(attrsOpts, token, attrs)
              }

              const match = token.info.trim().match(reg)
              const title = md.utils.escapeHtml(match![1])
              const containerClass = `custom-container ${name}`

              if (name === 'group-item') {
                token.attrJoin('class', 'group-item-content')
                const parent = h('div', Object.fromEntries(token.attrs || []), [])
                const radioName = `group-item-${groupItemName}`
                const id = `group-item-${groupItemName}-${groupItemIdx++}`
                const checked = groupItemIdx === 1 || title.startsWith('*')

                return {
                  node: h(Fragment, [
                    h('input', { key: id, class: 'group-item-radio', id, name: radioName, type: 'radio', 'data-default-checked': checked, checked }),
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

              const containerTag = { details: 'details', section: 'section' }[name] || 'div'
              const titleTag = name === 'details' ? 'summary' : 'p'
              const titleClass = name === 'details' ? '' : 'custom-container-title'

              const children = (title || name === 'group') ? [h(titleTag, { class: titleClass }, title)] : []

              token.attrJoin('class', containerClass)
              if (title) {
                token.attrJoin('class', 'has-title')
              }

              const props: Record<string, any> = Object.fromEntries(token.attrs || [])

              if (name === 'group') {
                props.key = groupItemName
              }

              return h(containerTag, props, children)
            }
          }
        })
      })
    })

    ctx.registerHook('VIEW_ON_GET_HTML_FILTER_NODE', ({ node }) => {
      if (node.classList.contains('group-item-radio') && node.dataset.defaultChecked === 'true') {
        node.setAttribute('checked', 'checked')
      }
    })

    ctx.editor.tapSimpleCompletionItems(items => {
      /* eslint-disable no-template-curly-in-string */

      items.push(
        { label: '/ ::: Container', insertText: '${3|:::,::::,:::::|} ${1|tip,warning,danger,details,group,group-item,row,col,section|} ${2:Title}\n${4:Content}\n${3|:::,::::,:::::|}\n' },
        { label: '/ ::: Group Container', insertText: ':::: group ${1:Title}\n::: group-item Tab 1\ntest 1\n:::\n::: group-item *Tab 2\ntest 2\n:::\n::: group-item Tab 3\ntest 3\n:::\n::::\n' },
        { label: '/ ::: Column Container', insertText: ':::: row ${1:Title}\n::: col\ntest 1\n:::\n::: col\ntest 2\n:::\n::::\n' },
      )
    })

    ctx.editor.tapMarkdownMonarchLanguage(mdLanguage => {
      mdLanguage.tokenizer.root.unshift(
        [/^:{3,}.*$/, 'tag']
      )
    })
  }
} as Plugin
