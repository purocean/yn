<template>
  <div id="editor">
  </div>
</template>

<script>
import dayjs from 'dayjs'

export default {
  name: 'editor',
  props: {
    value: String
  },
  data () {
    return {
      editor: null
    }
  },
  mounted () {
    if (!(window).require) {
      let loaderScript = document.createElement('script')
      loaderScript.type = 'text/javascript'
      loaderScript.src = 'vs/loader.js'
      loaderScript.addEventListener('load', this.onGotAmdLoader)
      document.body.appendChild(loaderScript)
    } else {
      this.onGotAmdLoader()
    }
    window.addEventListener('resize', this.resize)
    this.$bus.on('editor-replace-value', this.replaceValue)
    this.$bus.on('editor-toggle-wrap', this.toggleWrap)
  },
  beforeDestroy () {
    window.removeEventListener('paste', this.paste)
    window.removeEventListener('resize', this.resize)
    this.$bus.off('editor-replace-value', this.replaceValue)
    this.$bus.off('editor-toggle-wrap', this.toggleWrap)
  },
  methods: {
    resize () {
      if (this.editor) {
        this.editor.layout()
      }
    },
    onGotAmdLoader () {
      window.require(['vs/editor/editor.main'], () => {
        this.initMonaco()
      })
    },
    initMonaco () {
      this.editor = window.monaco.editor.create(window.document.getElementById('editor'), {
        value: this.value,
        language: 'markdown',
        theme: 'vs-dark',
        fontSize: '20',
        wordWrap: false,
        // wordWrapColumn: 40,
        // Set this to false to not auto word wrap minified files
        wordWrapMinified: true,
        // try "same", "indent" or "none"
        wrappingIndent: 'same'
      })

      this.editor.onDidChangeCursorSelection(e => {
        this.$bus.emit('change-document', this.getDucumentInfo())
      })

      this.editor.onDidChangeModelContent(e => {
        let val = this.getValue()
        const eol = this.editor.getModel().getEOL()
        if (!val.endsWith(eol)) {
          val += eol
          this.setValue(val)
        }
        this.$emit('input', val)
      })

      this.editor.onDidScrollChange(e => {
        const line = this.editor.getVisibleRanges()[0].startLineNumber
        this.$emit('scroll-line', line)
      })

      this.keyBind()
      window.addEventListener('paste', this.paste)

      setTimeout(() => {
        this.$emit('ready')
      }, 500)
    },
    keyBind () {
      const KM = window.monaco.KeyMod
      const KC = window.monaco.KeyCode

      this.editor.addCommand(KM.CtrlCmd | KM.Alt | KC.KEY_F, this.addAttachment)

      this.editor.addCommand(KM.CtrlCmd | KM.Alt | KC.KEY_D, () => {
        this.insert(dayjs().format('YYYY-MM-DD'))
      })

      this.editor.addCommand(KM.CtrlCmd | KM.Alt | KC.KEY_T, () => {
        this.insert(dayjs().format('HH:mm:ss'))
      })

      this.editor.addCommand(KM.CtrlCmd | KC.Enter, () => {
        this.insert(this.editor.getModel().getEOL())
      })

      this.editor.addCommand(KM.Shift | KC.Enter, () => {
        this.insert(this.editor.getModel().getOneIndent())
      })

      this.editor.addCommand(KM.CtrlCmd | KM.Shift | KC.UpArrow, () => {
        this.editor.getAction('editor.action.moveLinesUpAction').run()
      })

      this.editor.addCommand(KM.CtrlCmd | KM.Shift | KC.DownArrow, () => {
        this.editor.getAction('editor.action.moveLinesDownAction').run()
      })

      this.editor.addCommand(KM.CtrlCmd | KM.Shift | KC.KEY_D, () => {
        this.editor.getAction('editor.action.copyLinesDownAction').run()
      })

      this.editor.addCommand(KM.CtrlCmd | KC.KEY_S, () => {
        this.$emit('save')
      })

      this.editor.addCommand(KM.CtrlCmd | KC.KEY_J, () => {
        this.editor.getAction('editor.action.joinLines').run()
      })

      window.monaco.languages.setLanguageConfiguration('markdown', {
        onEnterRules: [
          {beforeText: /^\s*> .*$/, action: {indentAction: window.monaco.languages.IndentAction.None, appendText: '> '}},
          {beforeText: /^\s*\+ \[ \] .*$/, action: {indentAction: window.monaco.languages.IndentAction.None, appendText: '+ [ ] '}},
          {beforeText: /^\s*- \[ \] .*$/, action: {indentAction: window.monaco.languages.IndentAction.None, appendText: '- [ ] '}},
          {beforeText: /^\s*\* \[ \] .*$/, action: {indentAction: window.monaco.languages.IndentAction.None, appendText: '* [ ] '}},
          {beforeText: /^\s*\+ \[x\] .*$/, action: {indentAction: window.monaco.languages.IndentAction.None, appendText: '+ [ ] '}},
          {beforeText: /^\s*- \[x\] .*$/, action: {indentAction: window.monaco.languages.IndentAction.None, appendText: '- [ ] '}},
          {beforeText: /^\s*\* \[x\] .*$/, action: {indentAction: window.monaco.languages.IndentAction.None, appendText: '* [ ] '}},
          {beforeText: /^\s*\+ .*$/, action: {indentAction: window.monaco.languages.IndentAction.None, appendText: '+ '}},
          {beforeText: /^\s*- .*$/, action: {indentAction: window.monaco.languages.IndentAction.None, appendText: '- '}},
          {beforeText: /^\s*\* .*$/, action: {indentAction: window.monaco.languages.IndentAction.None, appendText: '* '}},
          {beforeText: /^\s*1. .*$/, action: {indentAction: window.monaco.languages.IndentAction.None, appendText: '1. '}}
        ]
      })

      // this.editor.addCommand(KC.Enter, () => {
      //   const p = this.editor.getPosition()
      //   this.editor.executeEdits('', [{
      //     range: new window.monaco.Range(p.lineNumber, p.column, p.lineNumber, p.column),
      //     text: '\nresult',
      //     forceMoveMarkers: true
      //   }])
      //   console.log(this.editor.getModel().getLineContent(this.editor.getPosition().lineNumber))
      // })
    },
    paste (e) {
      if (this.editor.isFocused()) {
        const items = e.clipboardData.items
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.match(/^image\/(png|jpg|jpeg|gif)$/i)) {
            this.$emit('paste-img', items[i].getAsFile())
          }
        }
      }
    },
    addAttachment () {
      const input = window.document.createElement('input')
      input.type = 'file'
      input.onchange = () => {
        for (let i = 0; i < input.files.length; i++) {
          this.$emit('upload-file', input.files[i])
        }
      }
      input.click()
    },
    insert (text) {
      const selection = this.editor.getSelection()
      this.editor.executeEdits('', [
        {
          range: new window.monaco.Range(selection.endLineNumber, selection.endColumn, selection.endLineNumber, selection.endColumn),
          text,
          forceMoveMarkers: true
        }
      ])
    },
    replaceLine (line, text) {
      const length = this.editor.getModel().getLineLength(line)

      this.editor.executeEdits('', [
        { range: new window.monaco.Range(line, 1, line, length + 1), text }
      ])
    },
    revealLine (line) {
      this.editor.revealLineInCenter(line)
    },
    switchTodo (line, checked) {
      if (checked) {
        const value = this.editor.getModel().getLineContent(line).replace('[ ]', `[x] ~~${dayjs().format('YYYY-MM-DD HH:mm')}~~`)
        this.replaceLine(line, value)
      } else {
        const value = this.editor.getModel().getLineContent(line).replace(/(\[x\] ~~[\d-: ]+~~|\[x\])/, '[ ]')
        this.replaceLine(line, value)
      }
    },
    getValue () {
      return this.editor.getModel().getValue(window.monaco.editor.DefaultEndOfLine.LF)
    },
    setValue (val) {
      this.editor.getModel().setValue(val)
    },
    replaceValue (oldValue, newValue) {
      this.setValue(this.getValue().replace(oldValue, newValue))
    },
    getDucumentInfo () {
      const selection = this.editor.getSelection()

      return {
        line: selection.positionLineNumber,
        column: selection.positionColumn,
        lineCount: this.editor.getModel().getLineCount(),
        textLength: this.getValue().length,
        selectedLength: this.editor.getModel().getValueInRange(selection).length
      }
    },
    setPosition (position) {
      console.log(position)
      this.editor.setScrollTop(0)
    },
    toggleWrap () {
      const isWrapping = this.editor.getConfiguration().wrappingInfo.isViewportWrapping
      this.editor.updateOptions({wordWrap: !isWrapping})
    }
  }
}
</script>
