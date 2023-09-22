<template>
  <div id="editor" ref="refEditor" />
</template>

<script lang="ts">
import type * as monaco from 'monaco-editor'
import { defineComponent, onMounted, ref } from 'vue'
import { getDefaultOptions } from '@fe/services/editor'
import { toUri } from '@fe/services/document'
import { triggerHook } from '@fe/core/hook'
import { MONACO_EDITOR_NLS } from '@fe/support/args'

export default defineComponent({
  name: 'monaco-editor',
  props: {
    nls: String,
  },
  setup (props) {
    let editor: monaco.editor.IStandaloneCodeEditor | null = null
    const refEditor = ref<HTMLElement | null>(null)

    const getMonaco = () => window.monaco
    const getEditor = () => editor!
    const resize = () => editor && editor.layout()

    function createModel (uriString: string, value: string) {
      const monaco = getMonaco()
      const editor = getEditor()
      const models: monaco.editor.ITextModel[] = monaco.editor.getModels()
      const uri: monaco.Uri = monaco.Uri.parse(uriString)

      let model = models.find(x => uri.toString() === x.uri.toString())

      if (model) {
        if (model.getValue() !== value) {
          model.pushEditOperations(
            null,
            [
              {
                range: model.getFullModelRange(),
                text: value,
              },
            ],
            () => null
          )
        }
      } else {
        model = monaco.editor.createModel(value, undefined, uri)
        model!.setValue(value)
      }

      editor.setModel(model!)
    }

    function initMonaco () {
      triggerHook('MONACO_BEFORE_INIT', { monaco: getMonaco() })

      editor = getMonaco().editor.create(refEditor.value, {
        ...getDefaultOptions(),
        fixedOverflowWidgets: true,
      })

      createModel(toUri(null), '')

      setTimeout(() => {
        triggerHook('MONACO_READY', { editor: getEditor(), monaco: getMonaco() })
      }, 500)
    }

    function onGotAmdLoader () {
      if (props.nls && Object.keys(MONACO_EDITOR_NLS).includes(props.nls)) {
        (window as any).require.config({
          'vs/nls': {
            availableLanguages: {
              '*': props.nls,
            }
          }
        })
      }

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
    })

    return {
      refEditor,
      resize,
      createModel,
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

<style lang="scss">
@import '@fe/styles/mixins.scss';

.monaco-editor .inputarea {
  display: unset;
  box-sizing: content-box;
  background: unset;
  transition: none;
}

.monaco-editor .margin-view-overlays {
  user-select: none;
}

.editor .monaco-editor .suggest-widget {
  background-color: rgba(var(--g-color-98-rgb), 0.6);
  backdrop-filter: var(--g-backdrop-filter);
  border-radius: var(--g-border-radius);
  box-shadow: rgba(0, 0, 0, 0.2) 2px 2px 5px;
  --vscode-editorSuggestWidget-selectedBackground: var(--g-color-active-a);
  --vscode-list-hoverBackground: var(--g-color-active-x);
  --vscode-editorSuggestWidget-selectedForeground: var(--g-color-0);
  --vscode-editorSuggestWidget-focusHighlightForeground: var(--vscode-editorSuggestWidget-highlightForeground);
}

.editor .monaco-editor {
  --vscode-menu-selectionForeground: var(--g-color-0);
  --vscode-menu-selectionBackground: var(--g-color-active-a);
  --vscode-quickInputList-focusBackground: var(--g-color-active-a);
  --vscode-quickInputList-focusForeground: var(--g-color-0);
}

@include dark-theme {
  .editor .monaco-editor .suggest-widget {
    background: rgba(var(--g-color-86-rgb), 0.65);
    box-shadow: rgba(0, 0, 0, 0.3) 2px 2px 10px;
    --vscode-editorSuggestWidget-selectedBackground: var(--g-color-active-b);
    --vscode-list-hoverBackground: var(--g-color-active-a);
  }

  .editor .monaco-editor {
    --vscode-menu-selectionForeground: var(--g-color-0);
    --vscode-menu-selectionBackground: var(--g-color-active-b);
    --vscode-quickInputList-focusBackground: var(--g-color-active-b);
    --vscode-quickInputList-focusForeground: var(--g-color-0);
  }
}
</style>
