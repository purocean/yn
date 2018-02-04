<template>
  <div id="editor">
  </div>
</template>

<script>
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
  },
  methods: {
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
        fontSize: '20'
      })

      this.editor.onDidChangeModelContent((e) => {
        this.$emit('input', this.editor.getModel().getValue(window.monaco.editor.DefaultEndOfLine.LF))
      })

      this.keyBind()
    },
    keyBind () {
      const KM = window.monaco.KeyMod
      const KC = window.monaco.KeyCode

      this.editor.addCommand(KM.CtrlCmd | KM.Shift | KC.UpArrow, () => {
        this.editor.getAction('editor.action.moveLinesUpAction').run()
      })

      this.editor.addCommand(KM.CtrlCmd | KM.Shift | KC.DownArrow, () => {
        this.editor.getAction('editor.action.moveLinesDownAction').run()
      })

      this.editor.addCommand(KM.CtrlCmd | KC.KEY_S, () => {
        this.$emit('save')
      })

      window.monaco.languages.setLanguageConfiguration('markdown', {
        onEnterRules: [
          {beforeText: /\+ \[ \] .*$/, action: {indentAction: window.monaco.languages.IndentAction.None, appendText: '+ [ ] '}},
          {beforeText: /- \[ \] .*$/, action: {indentAction: window.monaco.languages.IndentAction.None, appendText: '- [ ] '}},
          {beforeText: /\* \[ \] .*$/, action: {indentAction: window.monaco.languages.IndentAction.None, appendText: '* [ ] '}},
          {beforeText: /\+ \[x\] .*$/, action: {indentAction: window.monaco.languages.IndentAction.None, appendText: '+ [x] '}},
          {beforeText: /- \[x\] .*$/, action: {indentAction: window.monaco.languages.IndentAction.None, appendText: '- [x] '}},
          {beforeText: /\* \[x\] .*$/, action: {indentAction: window.monaco.languages.IndentAction.None, appendText: '* [x] '}},
          {beforeText: /\+ .*$/, action: {indentAction: window.monaco.languages.IndentAction.None, appendText: '+ '}},
          {beforeText: /- .*$/, action: {indentAction: window.monaco.languages.IndentAction.None, appendText: '- '}},
          {beforeText: /\* .*$/, action: {indentAction: window.monaco.languages.IndentAction.None, appendText: '* '}}
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
    setValue (val) {
      this.editor.getModel().setValue(val)
    }
  }
}
</script>
