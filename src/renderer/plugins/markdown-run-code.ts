import { computed, defineComponent, h, onBeforeUnmount, ref, VNode, watch } from 'vue'
import CryptoJS from 'crypto-js'
import Markdown from 'markdown-it'
import { Plugin } from '@fe/context/plugin'
import { getActionHandler } from '@fe/context/action'
import * as api from '@fe/support/api'
import { FLAG_DISABLE_XTERM } from '@fe/support/global-args'
import storage from '@fe/utils/storage'

const cachePrefix = 'run_code_result_'

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
    const result = ref('')
    const hash = computed(() => CryptoJS.MD5(props.code).toString())
    const id = Date.now()
    let hasResult = false

    let appendLog: any = (res: string) => {
      if (hasResult) {
        result.value += '\n' + res
      } else {
        result.value = res
        hasResult = true
      }

      storage.set(`${cachePrefix}${hash.value}`, result.value)
    }

    const run = async () => {
      const { code, language } = props

      hasResult = false
      result.value = '运行中……'

      try {
        await api.runCode(language!, code, {
          name: `_l_${id}_${hash.value}`,
          handler: res => appendLog && appendLog(res)
        })
      } catch (error) {
        result.value = error.message
      }
    }

    const runInXterm = (e: MouseEvent) => {
      getActionHandler('xterm.run-code')(props.language, props.code, e.ctrlKey)
    }

    watch(() => props.code, () => {
      result.value = ''
    })

    onBeforeUnmount(() => {
      appendLog = undefined
    })

    return () => {
      const runResult = result.value || storage.get(`${cachePrefix}${hash.value}`, '')

      return [
        h('div', { class: 'run-code-action', style: 'position: sticky; left: 0; border-top: dashed 1px #888; margin: 1em 0' }, [
          h('div', {
            title: '运行代码',
            style: 'position: absolute; top: -.7em; height: 0; width: 0; border-left: .7em #b7b3b3 solid; border-top: .6em #dddddd00 solid; border-bottom: .6em #dddddd00 solid; border-right: 0; background: rgba(0, 0, 0, 0); cursor: pointer; outline: none',
            onClick: run
          }),
          h('div', {
            title: '在终端中运行代码，Ctrl + 单击不退出解释器',
            class: 'no-print',
            style: 'position: absolute; top: -.5em; right: -0; height: 0; width: 0; border-left: .7em #b7b3b3 solid; border-top: .6em #dddddd00 solid; border-bottom: .6em #dddddd00 solid; border-right: 0; background: rgba(0, 0, 0, 0); cursor: pointer; outline: none;transform: rotate(90deg);',
            onClick: runInXterm
          }),
        ]),
        h('div', { class: 'run-code-result', style: 'padding: .5em 0 0 0', innerHTML: runResult }),
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

const clearCache = () => {
  Object.keys(storage.getAll()).forEach(key => {
    if (key.startsWith(cachePrefix)) {
      storage.remove(key)
    }
  })
}

export default {
  name: 'run-code',
  register: ctx => {
    ctx.theme.addStyles(`
      @media print {
        .markdown-view .markdown-body .run-code-result {
          white-space: pre-wrap;
        }
      }
    `)

    ctx.markdown.registerPlugin(RunPlugin)
    ctx.registerHook('ON_STARTUP', clearCache)

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
