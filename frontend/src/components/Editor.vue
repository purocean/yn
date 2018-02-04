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
        theme: 'vs-dark'
      })

      this.editor.onDidChangeModelContent((e) => {
        this.$emit('input', this.editor.getModel().getValue())
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
    },
    setValue (val) {
      this.editor.getModel().setValue(val)
    }
  }
}
</script>
