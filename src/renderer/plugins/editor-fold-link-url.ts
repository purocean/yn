import type * as Monaco from 'monaco-editor'
import type { Plugin } from '@fe/context'

export default {
  name: 'editor-fold-link-url',
  register: (ctx) => {
    const className = 'monaco-editor-fold-link-url'
    const maxMatchCount = 5000
    const maxExecTime = 600

    let decorationsCollection: Monaco.editor.IEditorDecorationsCollection | null = null

    function process (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) {
      const model = editor.getModel()
      if (!model) {
        return
      }

      const selections = editor.getSelections()
      const text = model.getValue()
      // eslint-disable-next-line no-empty-character-class
      const regex = /\[[^\]\n]+\]\(([^)\n]+)\)/dg

      const startTime = Date.now()
      const decorations: Monaco.editor.IModelDeltaDecoration[] = []
      let match: RegExpExecArray | null
      while ((match = regex.exec(text))) {
        if (Date.now() - startTime > maxExecTime) {
          break
        }

        if (match.length > maxMatchCount) {
          break
        }

        const startPosition = model.getPositionAt(match.indices![1][0])
        const endPosition = model.getPositionAt(match.indices![1][1])

        const range = new monaco.Range(
          startPosition.lineNumber,
          startPosition.column,
          endPosition.lineNumber,
          endPosition.column
        )

        if (selections?.some(selection => {
          const notIntersect = selection.getEndPosition().isBefore(range.getStartPosition()) ||
          range.getEndPosition().isBefore(selection.getStartPosition())

          return !notIntersect
        })) {
          // skip
        } else {
          const decoration: Monaco.editor.IModelDeltaDecoration = {
            range,
            options: {
              isWholeLine: false,
              inlineClassName: className,
              beforeContentClassName: className + '-before',
              hoverMessage: { value: match[1] },
            },
          }

          decorations.push(decoration)
        }
      }

      console.log('xxx', decorations)

      if (!decorationsCollection) {
        decorationsCollection = editor.createDecorationsCollection(decorations)
      } else {
        decorationsCollection.set(decorations)
      }
    }

    function onChange (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) {
      process(editor, monaco)
    }

    ctx.editor.whenEditorReady().then(({ editor, monaco }) => {
      const _onChange = onChange.bind(null, editor, monaco)
      const _onChangeDebounced = ctx.lib.lodash.debounce(_onChange, 1000)
      editor.onDidChangeModel(_onChangeDebounced)
      editor.onDidChangeModelContent(_onChangeDebounced)
      editor.onDidChangeCursorPosition(_onChange)
    })

    ctx.theme.addStyles(`
      .monaco-editor .${className} {
        color: red;
        text-decoration: underline;
        display: none;
      }

      .monaco-editor .${className + '-before'}:before {
        content: '***';
        color: #9e9e9e;
        font-style: italic;
      }
    `)
  }
} as Plugin
