import { h, VNode } from 'vue'
import { Plugin } from '@fe/context'
import SvgIcon from '@fe/components/SvgIcon.vue'

export default {
  name: 'markdown-code-copy',
  register: ctx => {
    ctx.theme.addStyles(`
      .markdown-view .markdown-body .p-mcc-copy-btn-wrapper {
        width: 0;
        height: 0;
        position: sticky;
        left: 100%;
        top: 0;
        float: right;
      }

      .markdown-view .markdown-body .p-mcc-copy-btn {
        width: 20px;
        height: 20px;
        position: relative;
        right: 12px;
        top: -10px;
        padding: 6px;
        border-radius: 50%;
        opacity: 0;
        transition: opacity 200ms;
        display: flex;
        align-items: center;
        color: var(--g-color-30)
      }

      .markdown-view .markdown-body pre:hover .p-mcc-copy-btn {
        opacity: 1;
      }

      .markdown-view .markdown-body .p-mcc-copy-btn:hover {
        background: var(--g-color-80);
      }
    `)

    ctx.markdown.registerPlugin(md => {
      const codeInline = (fn: Function) => (tokens: any, idx: any, options: any, env: any, slf: any) => {
        if (tokens[idx].attrIndex('title') < 0) {
          tokens[idx].attrJoin('class', 'copy-inner-text')
          tokens[idx].attrPush(['title', ctx.command.getKeyLabel('CtrlCmd') + ' + ' + ctx.i18n.t('click-to-copy')])
        }

        return (fn)(tokens, idx, options, env, slf)
      }

      const codeBlock = (fn: Function) => (tokens: any, idx: any, options: any, env: any, slf: any) => {
        const token = tokens[idx]
        const code = token.content
        const codeNode: VNode = fn(tokens, idx, options, env, slf) as any

        if (!code.trim()) {
          return codeNode as any
        }

        if (codeNode && Array.isArray(codeNode.children)) {
          codeNode.children.unshift(h('div', { class: 'p-mcc-copy-btn-wrapper no-print' }, h(
            'div',
            { class: 'p-mcc-copy-btn copy-text', 'data-text': code, title: ctx.i18n.t('copy-code') },
            h(SvgIcon, { name: 'clipboard', style: 'pointer-events: none' }))
          ))
        }

        return codeNode as any
      }

      md.renderer.rules.fence = codeBlock(md.renderer.rules.fence!.bind(md.renderer.rules))
      md.renderer.rules.code_inline = codeInline(md.renderer.rules.code_inline!.bind(md.renderer.rules))
    })
  }
} as Plugin
