import { h, VNode } from 'vue'
import { Plugin } from '@fe/context/plugin'
import SvgIcon from '@fe/components/SvgIcon.vue'

export default {
  name: 'markdown-code-copy',
  register: ctx => {
    ctx.theme.addStyles(`
      .markdown-view .markdown-body .copy-code-btn {
        position: absolute;
        right: 10px;
        top: 10px;
        cursor: pointer;
        padding: 6px;
        border-radius: 6px;
        opacity: 0;
        transition: opacity 200ms;
        background: var(--g-color-78);
        display: flex;
        align-items: center;
      }

      .markdown-view .markdown-body pre:hover > .copy-code-btn {
        opacity: 1;
      }

      .markdown-view .markdown-body .copy-code-btn:hover {
        background: var(--g-color-68);
      }
    `)

    ctx.markdown.registerPlugin(md => {
      const codeInline = (fn: Function) => (tokens: any, idx: any, options: any, env: any, slf: any) => {
        if (tokens[idx].attrIndex('title') < 0) {
          tokens[idx].attrJoin('class', 'copy-inner-text')
          tokens[idx].attrPush(['title', ctx.shortcut.getKeyLabel('CtrlCmd') + ' + 单击复制'])
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
          codeNode.children.push(h(
            'div',
            { class: 'copy-code-btn copy-text no-print', 'data-text': code, title: '复制代码' },
            h(SvgIcon, { name: 'clipboard', style: 'pointer-events: none' }))
          )
        }

        return codeNode as any
      }

      md.renderer.rules.fence = codeBlock(md.renderer.rules.fence!.bind(md.renderer.rules))
      md.renderer.rules.code_inline = codeInline(md.renderer.rules.code_inline!.bind(md.renderer.rules))
    })
  }
} as Plugin
