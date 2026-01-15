import type { Plugin } from '@fe/context'
import type { Doc } from '@fe/types'
import { whenEditorReady } from '@fe/services/editor'
import type { IMarkdownString } from 'monaco-editor'

export default {
  name: 'external-file-readonly',
  register: (ctx) => {
    const idEnableEdit = 'plugin.external-file-readonly.enable-edit'
    const settingKey = 'editor.external-file-readonly' as const

    // Delay to ensure custom message shows after default handler
    const MESSAGE_DELAY_MS = 10

    // Track files that were set to readonly by this plugin
    // Store original writeable state to restore when needed
    const pluginSetReadonly = ctx.lib.vue.shallowReactive<Record<string, boolean>>({})

    // Add setting for external file readonly
    ctx.setting.changeSchema((schema): void => {
      schema.properties[settingKey] = {
        defaultValue: true,
        title: 'T_setting-panel.schema.editor.external-file-readonly',
        type: 'boolean',
        format: 'checkbox',
        group: 'editor',
        required: true,
      }
    })

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
      const uri = ctx.doc.toUri(doc)

      // If it's an external file and setting is enabled
      if (isExternal && settingEnabled) {
        // Only set readonly if original writeable is not explicitly false (system readonly)
        if (doc.writeable !== false) {
          // Track original state and set readonly
          pluginSetReadonly[uri] = true
          updateDocWriteable(doc, false)
        }
      } else {
        // Not external or setting disabled - remove from tracking
        if (uri in pluginSetReadonly) {
          delete pluginSetReadonly[uri]
        }
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
            const uri = ctx.doc.toUri(currentFile)
            // Remove from tracking when user manually enables editing
            if (uri in pluginSetReadonly) {
              delete pluginSetReadonly[uri]
            }
            updateDocWriteable(currentFile, true)
          }
        }
      })
    })

    // EDITOR_ATTEMPT_READONLY_EDIT hook: show custom message for external files
    ctx.registerHook('EDITOR_ATTEMPT_READONLY_EDIT', async ({ doc, readonlyType }) => {
      // Only handle file-not-writable type for external files
      if (readonlyType !== 'file-not-writable') return

      const settingEnabled = ctx.setting.getSetting(settingKey, true)
      if (!doc || !settingEnabled) return

      const isExternal = ctx.doc.isOutOfRepo(doc)
      const uri = ctx.doc.toUri(doc)
      const wasSetByPlugin = uri in pluginSetReadonly

      // Only show custom message if this is an external file that was set readonly by our plugin
      if (!isExternal || !wasSetByPlugin) return

      // Delay slightly to ensure this runs after the default handler
      setTimeout(async () => {
        const { editor } = await whenEditorReady()
        const messageContribution: any = editor.getContribution('editor.contrib.messageController')

        const cmdEnableEdit = `command:vs.editor.ICodeEditor:1:${idEnableEdit}`
        const cmdOpenSetting = 'command:vs.editor.ICodeEditor:1:plugin.external-file-readonly.open-setting'

        // Close any existing message first
        messageContribution.closeMessage()

        const message = {
          value: ctx.i18n.t('external-file-readonly.readonly-desc', cmdEnableEdit, cmdOpenSetting),
          isTrusted: true,
        } as IMarkdownString

        messageContribution.showMessage(message, editor.getPosition())
      }, MESSAGE_DELAY_MS)
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
        const uri = ctx.doc.toUri(currentFile)

        // Update writeable status based on new setting
        if (settingEnabled && currentFile.writeable !== false) {
          // Setting is now enabled, set as readonly and track it
          pluginSetReadonly[uri] = true
          updateDocWriteable(currentFile, false)
        } else if (!settingEnabled && uri in pluginSetReadonly) {
          // Setting is now disabled, set as writeable only if it was set by our plugin
          delete pluginSetReadonly[uri]
          updateDocWriteable(currentFile, true)
        }
      }
    })

    // Clean up state for closed files - watch tabs changes
    ctx.lib.vue.watch(() => ctx.store.state.tabs, () => {
      const uris = ctx.store.state.tabs.map((x: any) => x.key)

      // Clean state for files that are no longer in tabs
      for (const uri of Object.keys(pluginSetReadonly)) {
        if (!uris.includes(uri)) {
          delete pluginSetReadonly[uri]
        }
      }
    })
  }
} as Plugin
