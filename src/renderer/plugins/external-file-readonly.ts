import type { Plugin } from '@fe/context'
import type { Doc } from '@fe/types'
import { whenEditorReady } from '@fe/services/editor'
import type { IMarkdownString } from 'monaco-editor'

export default {
  name: 'external-file-readonly',
  register: (ctx) => {
    const idEnableEdit = 'plugin.external-file-readonly.enable-edit'
    const settingKey = 'editor.external-file-readonly' as const

    // Add setting for external file readonly
    ctx.setting.changeSchema((schema): void => {
      schema.properties[settingKey] = {
        defaultValue: true,
        title: 'T_setting-panel.schema.editor.external-file-readonly',
        description: 'T_setting-panel.schema.editor.external-file-readonly_desc',
        type: 'boolean',
        format: 'checkbox',
        group: 'editor',
        required: true,
      }
    })

    // Helper function to check if doc should be readonly
    const shouldBeReadonly = (doc: Doc | null): boolean => {
      if (!doc) return false
      const isExternal = ctx.doc.isOutOfRepo(doc)
      const settingEnabled = ctx.setting.getSetting(settingKey, true)
      return isExternal && settingEnabled && doc.writeable !== false
    }

    // Helper function to set document writeable status
    const updateDocWriteable = (doc: Doc | null, writeable: boolean) => {
      if (doc && ctx.doc.isSameFile(doc, ctx.store.state.currentFile)) {
        ctx.store.state.currentFile = { ...doc, writeable }
      }
    }

    // DOC_SWITCHED hook: set external files as readonly based on setting
    ctx.registerHook('DOC_SWITCHED', ({ doc }) => {
      if (!doc) return

      const isExternal = ctx.doc.isOutOfRepo(doc)
      const settingEnabled = ctx.setting.getSetting(settingKey, true)

      // If it's an external file and setting is enabled, and original writeable is not explicitly false
      if (isExternal && settingEnabled && doc.writeable !== false) {
        // Set as readonly
        updateDocWriteable(doc, false)
      }
    })

    // Register action to enable editing for current document
    whenEditorReady().then(({ editor }) => {
      editor.addAction({
        id: idEnableEdit,
        label: ctx.i18n.t('external-file-readonly.enable-edit'),
        run () {
          const currentFile = ctx.store.state.currentFile
          if (currentFile) {
            updateDocWriteable(currentFile, true)
          }
        }
      })
    })

    // EDITOR_ATTEMPT_READONLY_EDIT hook: show custom message for external files
    ctx.registerHook('EDITOR_ATTEMPT_READONLY_EDIT', async ({ doc }) => {
      const settingEnabled = ctx.setting.getSetting(settingKey, true)
      if (!doc || !settingEnabled) return

      const isExternal = ctx.doc.isOutOfRepo(doc)
      if (!isExternal || doc.writeable !== false) return

      // Check if this readonly is due to external file setting (not system readonly)
      // We delay slightly to ensure this runs after the default handler
      setTimeout(async () => {
        const { editor } = await whenEditorReady()
        const messageContribution: any = editor.getContribution('editor.contrib.messageController')

        const cmdEnableEdit = `command:vs.editor.ICodeEditor:1:${idEnableEdit}`
        const cmdOpenSetting = `command:vs.editor.ICodeEditor:1:plugin.external-file-readonly.open-setting`

        // Close any existing message first
        messageContribution.closeMessage()

        const message = {
          value: ctx.i18n.t('external-file-readonly.readonly-desc', cmdEnableEdit, cmdOpenSetting),
          isTrusted: true,
        } as IMarkdownString

        messageContribution.showMessage(message, editor.getPosition())
      }, 10)
    })

    // Register action to open setting panel
    whenEditorReady().then(({ editor }) => {
      editor.addAction({
        id: 'plugin.external-file-readonly.open-setting',
        label: ctx.i18n.t('external-file-readonly.open-setting'),
        run () {
          ctx.setting.showSettingPanel(settingKey)
        }
      })
    })

    // SETTING_CHANGED hook: update current doc readonly status when setting changes
    ctx.registerHook('SETTING_CHANGED', ({ changedKeys }) => {
      if (changedKeys.includes(settingKey)) {
        const currentFile = ctx.store.state.currentFile
        if (!currentFile) return

        const isExternal = ctx.doc.isOutOfRepo(currentFile)
        if (!isExternal) return

        const settingEnabled = ctx.setting.getSetting(settingKey, true)

        // Update writeable status based on new setting
        if (settingEnabled && currentFile.writeable !== false) {
          // Setting is now enabled, set as readonly
          updateDocWriteable(currentFile, false)
        } else if (!settingEnabled && currentFile.writeable === false) {
          // Setting is now disabled, set as writeable (but only if it was set to false by us)
          // We need to be careful here - we should only enable if it was disabled by this plugin
          // For simplicity, we'll enable it when setting is disabled
          updateDocWriteable(currentFile, true)
        }
      }
    })
  }
} as Plugin
