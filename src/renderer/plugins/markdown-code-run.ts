import { computed, defineComponent, getCurrentInstance, h, onBeforeUnmount, ref, VNode, watch, watchEffect } from 'vue'
import Markdown from 'markdown-it'
import { escape } from 'lodash-es'
import { Plugin } from '@fe/context'
import { getActionHandler } from '@fe/core/action'
import { FLAG_DISABLE_XTERM } from '@fe/support/args'
import { CtrlCmd, getKeyLabel, matchKeys } from '@fe/core/command'
import { useI18n } from '@fe/services/i18n'
import { getLogger, md5 } from '@fe/utils'
import SvgIcon from '@fe/components/SvgIcon.vue'
import { getAllRunners } from '@fe/services/runner'
import { registerHook, removeHook } from '@fe/core/hook'
import type { CodeRunner } from '@fe/types'

const cache: Record<string, string> = {}

const logger = getLogger('markdown-code-run')

const RunCode = defineComponent({
  name: 'run-code',
  props: {
    code: {
      type: String,
      default: ''
    },
    language: String,
    firstLine: String,
  },
  setup (props) {
    const { t } = useI18n()
    const instance = getCurrentInstance()
    const result = ref('')
    const hash = computed(() => md5(props.language + props.code))
    const runner = ref<CodeRunner>()
    const getTerminalCmd = computed(() => runner.value?.getTerminalCmd(props.language!, props.firstLine!))

    let hasResult = false

    let appendLog: ((type: 'html' | 'plain', res: string) => void) | undefined = (type, res) => {
      if (type === 'plain') {
        res = escape(res)
      }

      if (hasResult) {
        result.value += res
      } else {
        result.value = res
        hasResult = true
      }

      cache[hash.value] = result.value
    }

    const run = async () => {
      const { code, language } = props

      hasResult = false

      if (!runner.value) {
        result.value = "No runner found for language '" + language + "'"
        return
      }

      result.value = t('code-run.running')

      try {
        const { type, value: val } = await runner.value.run(language!, code)

        if (typeof val === 'string') {
          appendLog?.(type, val)
          return
        }

        // read stream
        while (true) {
          const { done, value } = await val.read()
          if (done) {
            logger.debug('run code done >', value)
            appendLog?.(type, value || '')
            break
          }

          logger.debug('run code result >', value)

          if (!appendLog) {
            break
          }

          let valStr = value

          if (typeof value !== 'string') {
            try {
              valStr = new TextDecoder().decode(value)
            } catch {
              valStr = String(value)
            }
          }

          appendLog(type, valStr)
        }
      } catch (error: any) {
        result.value = error.message
      }
    }

    const runInXterm = (e: MouseEvent) => {
      const cmd = runner.value?.getTerminalCmd(props.language!, props.firstLine!)

      if (!cmd) {
        return
      }

      getActionHandler('xterm.run')({
        code: props.code,
        start: cmd.start,
        exit: matchKeys(e, [CtrlCmd]) ? undefined : cmd.exit,
      })
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

    const refreshRunner = () => {
      runner.value = getAllRunners().find((runner) => runner.match(props.language!, props.firstLine!))
    }

    watchEffect(refreshRunner)
    registerHook('CODE_RUNNER_CHANGE', refreshRunner)

    onBeforeUnmount(() => {
      appendLog = undefined
      removeHook('CODE_RUNNER_CHANGE', refreshRunner)
    })

    return () => {
      const runResult = result.value || cache[hash.value]

      return [
        h('div', { class: 'p-mcr-run-code-action skip-export' }, [
          h('div', {
            title: t('code-run.run'),
            class: 'p-mcr-run-btn',
            onClick: run
          }),
          h('div', {
            title: t('code-run.run-in-xterm-tips', getKeyLabel(CtrlCmd)),
            class: 'p-mcr-run-xterm-btn skip-print',
            hidden: !getTerminalCmd.value,
            onClick: runInXterm
          }),
        ]),
        h('div', { class: 'p-mcr-run-code-result skip-export', style: 'padding: .5em 0 0 0', key: runResult, innerHTML: runResult }),
        h('div', { class: 'p-mcr-clear-btn-wrapper skip-print' }, h(
          h(
            'div',
            { class: 'p-mcr-clear-btn', style: { display: runResult ? 'flex' : 'none' }, title: t('code-run.clear'), onClick: clearResult },
            h(SvgIcon, { name: 'times', style: 'pointer-events: none' })
          ),
        )),
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
        firstLine,
        language: token.info,
      }))
    }

    return codeNode as any
  }
}

export default {
  name: 'markdown-code-run',
  register: ctx => {
    ctx.view.addStyles(`
      .markdown-view .markdown-body .p-mcr-run-code-action {
        position: sticky;
        left: 0;
        border-top: dashed 1px #888;
        margin: 1em 0;
      }

      .markdown-view .markdown-body .p-mcr-run-btn {
        position: absolute;
        top: -.7em;
        height: 0;
        width: 0;
        border-left: .7em #b7b3b3 solid;
        border-top: .6em #dddddd00 solid;
        border-bottom: .6em #dddddd00 solid;
        border-right: 0;
        background: rgba(0, 0, 0, 0);
        cursor: pointer;
        outline: none;
      }

      .markdown-view .markdown-body .p-mcr-run-xterm-btn {
        position: absolute;
        top: -.5em;
        right: -0;
        height: 0;
        width: 0;
        border-left: .7em #b7b3b3 solid;
        border-top: .6em #dddddd00 solid;
        border-bottom: .6em #dddddd00 solid;
        border-right: 0;
        background: rgba(0, 0, 0, 0);
        cursor: pointer;
        outline: none;transform: rotate(90deg);
      }

      .markdown-view .markdown-body .p-mcr-clear-btn-wrapper {
        width: 0;
        height: 0;
        position: sticky;
        left: 100%;
        bottom: 0;
        float: right;
      }

      .markdown-view .markdown-body .p-mcr-clear-btn {
        width: 20px;
        height: 20px;
        position: relative;
        right: 12px;
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
    `)

    ctx.markdown.registerPlugin(RunPlugin)

    !FLAG_DISABLE_XTERM && ctx.editor.whenEditorReady().then(({ editor, monaco }) => {
      editor.addAction({
        id: 'plugin.editor.run-in-xterm',
        label: ctx.i18n.t('code-run.run-in-xterm'),
        contextMenuGroupId: 'other',
        precondition: 'editorHasSelection',
        keybindings: [
          monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyR
        ],
        run: () => {
          getActionHandler('xterm.run')(editor.getModel()!.getValueInRange(editor.getSelection()!))
        }
      })
    })
  }
} as Plugin
