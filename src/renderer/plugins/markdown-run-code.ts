import { computed, defineComponent, h, ref, VNode } from 'vue'
import CryptoJS from 'crypto-js'
import Markdown from 'markdown-it'
import { Plugin } from '@fe/context/plugin'
import { getAction } from '@fe/context/action'

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

    const run = async () => {
      const { code, language } = props

      result.value = '运行中……'

      fetch('/api/run', {
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ language, code })
      }).then(res => {
        res.json().then(({ data, status, message }) => {
          if (status === 'ok') {
            result.value = data
            localStorage.setItem(`${cachePrefix}${hash.value}`, data)
          } else {
            result.value = message
          }
        }).catch(e => {
          result.value = e.message
        })
      }).catch(e => {
        result.value = e.message
      })
    }

    const runInXterm = (e: MouseEvent) => {
      getAction('xterm.run-code')(props.language, props.code, e.ctrlKey)
    }

    return () => {
      const runResult = result.value || localStorage[`${cachePrefix}${hash.value}`] || ''

      return h(
        'div',
        {
          class: 'run-code',
          style: 'position: relative;border-top: dashed 1px #888; padding: .5em 0; margin-top: 1.5em;'
        },
        [
          h('div', { class: 'run-code-result', style: 'padding: .5em 0', innerHTML: runResult }),
          h('button', {
            title: '运行代码',
            style: 'position: absolute; top: -.7em; height: 0; width: 0; border-left: .7em #b7b3b3 solid; border-top: .6em #dddddd00 solid; border-bottom: .6em #dddddd00 solid; border-right: 0; background: rgba(0, 0, 0, 0); cursor: pointer; outline: none',
            onClick: run
          }),
          h('button', {
            title: '在终端中运行代码，Ctrl + 单击不退出解释器',
            style: 'position: absolute; top: -.25em; right: -0.4em; height: 0; width: 0; border-left: .7em #b7b3b3 solid; border-top: .6em #dddddd00 solid; border-bottom: .6em #dddddd00 solid; border-right: 0; background: rgba(0, 0, 0, 0); cursor: pointer; outline: none;transform: rotate(90deg);',
            onClick: runInXterm
          }),
        ]
      )
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
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(cachePrefix)) {
      localStorage.removeItem(key)
    }
  })
}

export default {
  name: 'run-code',
  register: ctx => {
    ctx.markdown.registerPlugin(RunPlugin)
    ctx.registerHook('ON_STARTUP', clearCache)
  }
} as Plugin
