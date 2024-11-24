import { Plugin } from '@fe/context'
import { getInitialized, getLoadStatus } from '@fe/others/extension'
import type { languages } from 'monaco-editor'

export default {
  name: 'ai-copilot',
  register: ctx => {
    ctx.editor.whenEditorReady().then(({ monaco }) => {
      const extensionId = '@yank-note/extension-ai-copilot'
      const actionId = 'install-ai-copilot-extension'
      const checkExtensionLoaded = () => !!getLoadStatus(extensionId).version

      monaco.languages.registerCodeActionProvider('*', {
        provideCodeActions (): languages.CodeActionList {
          const actionTitle = ctx.i18n.t('edit-or-generate-text-using-ai')

          const enabled = ctx.setting.getSetting('editor.enable-ai-copilot-action', true)
          if (!getInitialized() || checkExtensionLoaded() || !enabled) {
            return { dispose: () => 0, actions: [] }
          }

          const actions: languages.CodeAction[] = [{
            title: actionTitle,
            command: { id: actionId, title: actionTitle },
            kind: 'refactor',
            diagnostics: [],
            isPreferred: true,
          }]

          return {
            dispose: () => 0,
            actions
          }
        },

        async resolveCodeAction (codeAction: languages.CodeAction): Promise<languages.CodeAction | undefined> {
          if (codeAction.command?.id === actionId) {
            ctx.showExtensionManager(extensionId)
          }

          codeAction.command = undefined
          return codeAction
        }
      })
    })
  }
} as Plugin
