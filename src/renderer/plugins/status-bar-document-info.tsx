import { defineComponent, onBeforeUnmount, shallowRef } from 'vue'
import type { Plugin } from '@fe/context'
import { useI18n } from '@fe/services/i18n'
import { getSelectionInfo, whenEditorReady } from '@fe/services/editor'

const DocumentInfo = defineComponent({
  name: 'document-info',
  setup () {
    const { $t } = useI18n()
    let disposable: { dispose(): void }[] = []

    const selectionInfo = shallowRef<ReturnType<typeof getSelectionInfo>>({
      textLength: 0,
      selectedLength: 0,
      selectedLines: 0,
      lineCount: 0,
      line: 0,
      column: 0,
      selectionCount: 1,
    })

    function updateSelectionInfo () {
      selectionInfo.value = getSelectionInfo()
    }

    whenEditorReady().then(({ editor }) => {
      updateSelectionInfo()

      disposable = [
        editor.onDidChangeCursorSelection(updateSelectionInfo),
        editor.onDidChangeModel(updateSelectionInfo)
      ]
    })

    onBeforeUnmount(() => {
      disposable.forEach(disposable => disposable.dispose())
    })

    return () => <div class="document-info">
      <span>L {selectionInfo.value.line},</span>
      <span>C {selectionInfo.value.column}</span>
      {selectionInfo.value.selectionCount > 1 && <span>{$t.value('status-bar.document-info.selections')}: {selectionInfo.value.selectionCount}</span>}
      {selectionInfo.value.selectionCount <= 1 && selectionInfo.value.selectedLength > 0 && <>
        <span>{$t.value('status-bar.document-info.selected')}: {selectionInfo.value.selectedLength}, {selectionInfo.value.selectedLines}</span>
      </>}
      {selectionInfo.value.selectionCount <= 1 && selectionInfo.value.selectedLength <= 0 && <>
        <span>{$t.value('status-bar.document-info.lines')}: {selectionInfo.value.lineCount}</span>
        <span>{$t.value('status-bar.document-info.chars')}: {selectionInfo.value.textLength}</span>
      </>}
    </div>
  }
})

export default {
  name: 'status-bar-document-info',
  register: ctx => {
    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-document-info'] = {
        id: 'status-bar-document-info',
        position: 'right',
        title: DocumentInfo,
        list: [],
        order: -1024,
        onClick: () => {
          if (ctx.store.state.showEditor) {
            ctx.editor.getEditor().focus()
            ctx.editor.getEditor().getAction('editor.action.gotoLine')?.run()
          }
        }
      }
    })

    ctx.theme.addStyles(`
      .status-bar-menu .document-info {
        padding-right: 0.3em;
        cursor: pointer;
      }

      .status-bar-menu .document-info > span {
        display: inline-block;
        padding: 0 0.2em;
      }
    `)
  }
} as Plugin
