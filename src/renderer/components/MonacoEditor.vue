<template>
  <div id="editor" ref="refEditor"></div>
</template>

<script lang="ts">
import dayjs from 'dayjs'
import TurndownService from 'turndown'
import * as monaco from 'monaco-editor'
import { defineComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import { $args } from '../useful/global-args'
import env from '../useful/env'

const models: {[key: string]: monaco.editor.ITextModel} = {}

let keys: {[key: string]: boolean} = {}

export default defineComponent({
  name: 'monaco-editor',
  setup (_, { emit }) {
    let editor: monaco.editor.IStandaloneCodeEditor | null = null
    const refEditor = ref<HTMLElement | null>(null)

    const getMonaco = () => (window as any).monaco
    const getEditor = () => editor!
    const resize = () => editor && editor.layout()

    function getModel (uri: string, value: string) {
      let model = models[uri]

      if (!model) {
        model = getMonaco().editor.createModel(value, undefined, getMonaco().Uri.parse(uri))
        model.onDidChangeContent(() => {
          let value = model.getValue()
          const eol = model.getEOL()
          if (!value.endsWith(eol)) {
            value += eol
            model.setValue(value)
          }
          emit('change', { uri, value })
        })
      }

      // TODO 不用 set value 保留编辑状态
      model.setValue(value)

      // TODO 缓存 model
      models[uri] = model

      return model
    }

    function setModel (uri: string, value: string) {
      const model = getModel(uri, value || '')
      getEditor().setModel(model)
    }

    function addAttachment () {
      const input = window.document.createElement('input')
      input.type = 'file'
      input.onchange = () => {
        for (let i = 0; i < input.files!.length; i++) {
          emit('upload-file', input.files![i])
        }
      }
      input.click()
    }

    function insert (text: string) {
      const selection = getEditor().getSelection()!
      getEditor().executeEdits('', [
        {
          range: new (getMonaco().Range)(selection.endLineNumber, selection.endColumn, selection.endLineNumber, selection.endColumn),
          text,
          forceMoveMarkers: true
        }
      ])
    }

    function keyBind () {
      const KM = getMonaco().KeyMod
      const KC = getMonaco().KeyCode

      getEditor().addCommand(KM.Shift | KM.Alt | KC.KEY_F, addAttachment)

      getEditor().addCommand(KM.Shift | KM.Alt | KC.KEY_D, () => {
        insert(dayjs().format('YYYY-MM-DD'))
      })

      getEditor().addCommand(KM.Shift | KM.Alt | KC.KEY_T, () => {
        insert(dayjs().format('HH:mm:ss'))
      })

      getEditor().addCommand(KM.Shift | KM.Alt | KC.KEY_R, () => {
        emit('xterm-run', getEditor().getModel()!.getValueInRange(getEditor().getSelection()!))
      })

      getEditor().addCommand(KM.CtrlCmd | KC.Enter, () => {
        insert(getEditor().getModel()!.getEOL())
      })

      getEditor().addCommand(KM.Shift | KC.Enter, () => {
        // getOneIndent 接口被移除了 https://github.com/microsoft/monaco-editor/issues/1565
        const getOneIndent = () => {
          const options = getEditor().getModel()!.getOptions()
          return options.insertSpaces ? ' '.repeat(options.tabSize) : '\t'
        }

        insert(getOneIndent())
      })

      getEditor().addCommand(KM.CtrlCmd | KM.Shift | KC.UpArrow, () => {
        getEditor().getAction('editor.action.moveLinesUpAction').run()
      })

      getEditor().addCommand(KM.CtrlCmd | KM.Shift | KC.DownArrow, () => {
        getEditor().getAction('editor.action.moveLinesDownAction').run()
      })

      getEditor().addCommand(KM.CtrlCmd | KM.Shift | KC.KEY_D, () => {
        getEditor().getAction('editor.action.copyLinesDownAction').run()
      })

      getEditor().addCommand(KM.CtrlCmd | KC.KEY_S, () => {
        emit('save')
      })

      getEditor().addCommand(KM.CtrlCmd | KC.KEY_J, () => {
        getEditor().getAction('editor.action.joinLines').run()
      })

      getEditor().addCommand(KM.chord(KM.CtrlCmd | KC.KEY_K, KM.CtrlCmd | KC.KEY_U), () => {
        getEditor().getAction('editor.action.transformToUppercase').run()
      })

      getEditor().addCommand(KM.chord(KM.CtrlCmd | KC.KEY_K, KM.CtrlCmd | KC.KEY_L), () => {
        getEditor().getAction('editor.action.transformToLowercase').run()
      })

      getMonaco().languages.setLanguageConfiguration('markdown', {
        onEnterRules: [
          { beforeText: /^\s*> .*$/, action: { indentAction: getMonaco().languages.IndentAction.None, appendText: '> ' } },
          { beforeText: /^\s*\+ \[ \] .*$/, action: { indentAction: getMonaco().languages.IndentAction.None, appendText: '+ [ ] ' } },
          { beforeText: /^\s*- \[ \] .*$/, action: { indentAction: getMonaco().languages.IndentAction.None, appendText: '- [ ] ' } },
          { beforeText: /^\s*\* \[ \] .*$/, action: { indentAction: getMonaco().languages.IndentAction.None, appendText: '* [ ] ' } },
          { beforeText: /^\s*\+ \[x\] .*$/, action: { indentAction: getMonaco().languages.IndentAction.None, appendText: '+ [ ] ' } },
          { beforeText: /^\s*- \[x\] .*$/, action: { indentAction: getMonaco().languages.IndentAction.None, appendText: '- [ ] ' } },
          { beforeText: /^\s*\* \[x\] .*$/, action: { indentAction: getMonaco().languages.IndentAction.None, appendText: '* [ ] ' } },
          { beforeText: /^\s*\+ .*$/, action: { indentAction: getMonaco().languages.IndentAction.None, appendText: '+ ' } },
          { beforeText: /^\s*- .*$/, action: { indentAction: getMonaco().languages.IndentAction.None, appendText: '- ' } },
          { beforeText: /^\s*\* .*$/, action: { indentAction: getMonaco().languages.IndentAction.None, appendText: '* ' } },
          { beforeText: /^\s*1. .*$/, action: { indentAction: getMonaco().languages.IndentAction.None, appendText: '1. ' } }
        ]
      })
    }

    function paste (e: ClipboardEvent) {
      if (getEditor().hasTextFocus()) {
        const items = e.clipboardData!.items
        if (keys.d || keys.D) { // 粘贴 HTML 转为 markdown
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.match(/^text\/html$/i)) {
              items[i].getAsString(str => {
                const md = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '+' }).turndown(str)
                insert(md)
              })
            }
          }

          e.preventDefault()
          e.stopPropagation()
        } else {
          for (let i = 0; i < items.length; i++) {
            const fileType = items[i].type
            if (fileType.match(/^image\/(png|jpg|jpeg|gif)$/i)) {
              const asBase64 = keys.b || keys.B // 粘贴的同时 按下了 B 键，就粘贴 base64 图像
              emit('paste-img', items[i].getAsFile(), asBase64)
            }
          }
        }
      }
    }

    function replaceLine (line: number, text: string) {
      const length = getEditor().getModel()!.getLineLength(line)

      getEditor().executeEdits('', [
        { range: new (getMonaco().Range)(line, 1, line, length + 1), text }
      ])
    }

    function revealLineInCenter (line: number) {
      getEditor().revealLineInCenter(line)
    }

    function revealLine (line: number) {
      getEditor().revealLine(line)
    }

    function setScrollToTop (top: number) {
      getEditor().setScrollTop(top)
    }

    function getLineContent (line: number) {
      return getEditor().getModel()!.getLineContent(line)
    }

    function getValue () {
      return getEditor().getModel()!.getValue(getMonaco().editor.DefaultEndOfLine.LF)
    }

    function replaceValue (oldValue: string, newValue: string) {
      getEditor().getModel()!.setValue(getValue().replace(oldValue, newValue))
    }

    function getDucumentInfo () {
      const selection = getEditor().getSelection()!

      return {
        line: selection.positionLineNumber,
        column: selection.positionColumn,
        lineCount: getEditor().getModel()!.getLineCount(),
        textLength: getValue().length,
        selectedLength: getEditor().getModel()!.getValueInRange(selection).length
      }
    }

    function toggleWrap () {
      const isWrapping = getEditor().getOption(monaco.editor.EditorOption.wrappingInfo).isViewportWrapping
      getEditor().updateOptions({ wordWrap: (isWrapping ? 'off' : 'on') })
    }

    function recordKeys (e: KeyboardEvent) {
      if (e.type === 'keydown') {
        keys[e.key] = true
      } else {
        keys = {}
      }
    }

    function initMonaco () {
      // window.supportedExtensions = getMonaco().languages.getLanguages().flatMap(x => x.extensions)

      const model = getModel('yank-note://system/blank.md', '')

      editor = (window as any).monaco.editor.create(refEditor.value, {
        value: '',
        theme: 'vs-dark',
        fontSize: 18,
        wordWrap: false,
        links: !env.isElectron,
        // wordWrapColumn: 40,
        // Set this to false to not auto word wrap minified files
        wordWrapMinified: true,
        mouseWheelZoom: true,
        // try "same", "indent" or "none"
        wrappingIndent: 'same',
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        scrollbar: {
          vertical: 'hidden',
          verticalScrollbarSize: 0
        },
        model,
        readOnly: $args().get('readonly') === 'true',
      })

      getEditor().onDidChangeCursorSelection(() => {
        emit('change-document', getDucumentInfo())
      })

      getEditor().onDidScrollChange(() => {
        const line = getEditor().getVisibleRanges()[0].startLineNumber
        const top = getEditor().getScrollTop()
        emit('scroll-view', { line, top })
      })

      keyBind()
      window.addEventListener('paste', paste as any, true)

      setTimeout(() => {
        emit('ready')
      }, 500)
    }

    function onGotAmdLoader () {
      (window as any).require(['vs/editor/editor.main'], initMonaco)
    }

    onMounted(() => {
      if (!window.require) {
        const loaderScript = document.createElement('script')
        loaderScript.type = 'text/javascript'
        loaderScript.src = 'vs/loader.js'
        loaderScript.addEventListener('load', onGotAmdLoader)
        document.body.appendChild(loaderScript)
      } else {
        onGotAmdLoader()
      }

      window.addEventListener('keydown', recordKeys, true)
      window.addEventListener('keyup', recordKeys, true)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('paste', paste as any)
      window.removeEventListener('keydown', recordKeys)
      window.removeEventListener('keyup', recordKeys)
    })

    return {
      refEditor,
      resize,
      revealLine,
      revealLineInCenter,
      setScrollToTop,
      replaceValue,
      replaceLine,
      toggleWrap,
      setModel,
      insert,
      getLineContent,
    }
  }
})
</script>

<style scoped>
#editor {
  height: 100%;
  width: 100%;
}
</style>
