import { computed, defineComponent, getCurrentInstance, h, onBeforeUnmount, ref, VNode, watch } from 'vue'
import Markdown from 'markdown-it'
import { Plugin } from '@fe/context'
import { getActionHandler } from '@fe/core/action'
import * as api from '@fe/support/api'
import { FLAG_DISABLE_XTERM } from '@fe/support/args'
import SvgIcon from '@fe/components/SvgIcon.vue'
import { CtrlCmd, getKeyLabel, matchKeys } from '@fe/core/command'
import { md5 } from '@fe/utils'

const cache: Record<string, string> = {}

const RunCode = defineComponent({
  name: 'run-code',
  props: {
    code: {
      type: String,
      default: ''
    },
    language: String,
  },
  setup (props) {
    const instance = getCurrentInstance()
    const result = ref('')
    const hash = computed(() => md5(props.language + props.code))
    const isJs = computed(() => ['js', 'javascript'].includes((props.language || '').toLowerCase()))
    const id = Date.now()
    let hasResult = false

    let appendLog: any = (res: string) => {
      if (hasResult) {
        result.value += '\n' + res
      } else {
        result.value = res
        hasResult = true
      }

      cache[hash.value] = result.value
    }

    const run = async () => {
      const { code, language } = props

      hasResult = false
      result.value = isJs.value ? '' : '运行中……'

      try {
        await api.runCode(language!, code, {
          name: `_l_${id}_${hash.value}`,
          handler: res => appendLog && appendLog(res)
        })
      } catch (error: any) {
        result.value = error.message
      }
    }

    const runInXterm = (e: MouseEvent) => {
      getActionHandler('xterm.run-code')(
        props.language || '',
        props.code,
        !matchKeys(e, [CtrlCmd]),
      )
    }

    const clearResult = () => {
      delete cache[hash.value]
      hasResult = false
      result.value = ''
      instance?.proxy?.$forceUpdate()
    }

    watch(() => props.code, () => {
      result.value = ''
    })

    onBeforeUnmount(() => {
      appendLog = undefined
    })

    return () => {
      const runResult = result.value || cache[hash.value]

      return [
        h('div', { class: 'run-code-action', style: 'position: sticky; left: 0; border-top: dashed 1px #888; margin: 1em 0' }, [
          h('div', {
            title: '运行代码',
            style: 'position: absolute; top: -.7em; height: 0; width: 0; border-left: .7em #b7b3b3 solid; border-top: .6em #dddddd00 solid; border-bottom: .6em #dddddd00 solid; border-right: 0; background: rgba(0, 0, 0, 0); cursor: pointer; outline: none',
            onClick: run
          }),
          h('div', {
            title: `在终端中运行代码，${getKeyLabel(CtrlCmd)} + 单击不退出解释器`,
            class: 'no-print',
            hidden: isJs.value,
            style: 'position: absolute; top: -.5em; right: -0; height: 0; width: 0; border-left: .7em #b7b3b3 solid; border-top: .6em #dddddd00 solid; border-bottom: .6em #dddddd00 solid; border-right: 0; background: rgba(0, 0, 0, 0); cursor: pointer; outline: none;transform: rotate(90deg);',
            onClick: runInXterm
          }),
        ]),
        h('div', { class: 'p-mcr-run-code-result', style: 'padding: .5em 0 0 0', innerHTML: runResult }),
        h(
          'div',
          { class: 'p-mcr-clear-btn no-print', style: { display: runResult ? 'flex' : 'none' }, title: '清空运行结果', onClick: clearResult },
          h(SvgIcon, { name: 'times', style: 'pointer-events: none' })
        ),
      ]
    }
  }
})

const RunPlugin = (md: Markdown) => {
  const temp = md.renderer.rules.fence!.bind(md.renderer.rules)
  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx]

    const code = token.content.trim()
    const firstLine = code.split(/\n/)[0].trim()
    if (!firstLine.includes('--run--')) {
      return temp(tokens, idx, options, env, slf)
    }

    const codeNode: VNode = temp(tokens, idx, options, env, slf) as any

    if (codeNode && Array.isArray(codeNode.children)) {
      codeNode.children.push(h(RunCode, {
        code,
        language: token.info
      }))
    }

    return codeNode as any
  }
}

export default {
  name: 'markdown-code-run',
  register: ctx => {
    ctx.theme.addStyles(`
      .markdown-view .markdown-body .p-mcr-clear-btn {
        width: 20px;
        height: 20px;
        position: absolute;
        right: 10px;
        bottom: 10px;
        padding: 6px;
        border-radius: 50%;
        transition: opacity 200ms;
        display: flex;
        align-items: center;
        color: var(--g-color-30)
      }

      .markdown-view .markdown-body .p-mcr-clear-btn:hover {
        background: var(--g-color-80);
      }

      @media print {
        .markdown-view .markdown-body .p-mcr-run-code-result {
          white-space: pre-wrap;
        }
      }
    `)

    ctx.markdown.registerPlugin(RunPlugin)

    !FLAG_DISABLE_XTERM && ctx.editor.whenEditorReady().then(({ editor, monaco }) => {
      editor.addAction({
        id: 'plugin.editor.run-in-xterm',
        label: '终端中运行',
        contextMenuGroupId: 'other',
        precondition: 'editorHasSelection',
        keybindings: [
          monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KEY_R
        ],
        run: () => {
          getActionHandler('xterm.run')(editor.getModel()!.getValueInRange(editor.getSelection()!))
        }
      })
    })
  }
} as Plugin
