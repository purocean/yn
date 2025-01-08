import { Plugin } from '@fe/context'
import type { BuildInActions, Doc } from '@fe/types'

export default {
  name: 'text-comparator',
  register: ctx => {
    const extensionId = '@yank-note/extension-text-comparator'
    const editorDocType = '__comparator' as const
    const compareTextActionId: keyof BuildInActions = 'plugin.text-comparator.open-text-comparator'

    const TextComparator = ctx.lib.vue.defineComponent({
      setup () {
        const { h } = ctx.lib.vue
        const extensionInitialized = ctx.lib.vue.ref(ctx.getExtensionInitialized())

        if (!extensionInitialized.value) {
          ctx.whenExtensionInitialized().then(() => {
            extensionInitialized.value = true
          })
        }

        return () => extensionInitialized.value ? h(
          'div',
          { style: 'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;' },
          [
            h('a', {
              href: 'javascript:void(0)',
              onClick: () => {
                ctx.showExtensionManager(extensionId)
              },
            }, ctx.i18n.t('install-extension-tips', extensionId))
          ]
        ) : null
      }
    })

    ctx.editor.registerCustomEditor({
      name: 'text-comparator',
      displayName: 'Text Comparator',
      supportNonNormalFile: true,
      component: TextComparator,
      hiddenPreview: true,
      when: ({ doc }) => {
        return doc?.type === editorDocType
      }
    })

    ctx.action.registerAction({
      name: compareTextActionId,
      description: ctx.i18n.t('status-bar.tool.open-text-comparator'),
      forUser: true,
      handler: (original?: Doc | null, modified?: Doc | null) => {
        type Extra = {
          original?: Doc | null
          modified?: Doc | null
        }

        const currentFile = ctx.store.state.currentFile
        if (typeof original === 'undefined' && currentFile?.type === 'file' && currentFile.plain) {
          original = ctx.doc.cloneDoc(currentFile)
        }

        if (typeof modified !== 'undefined') {
          modified = ctx.doc.cloneDoc(modified)
        }

        if (original && (original.type !== 'file' || !original.plain)) {
          throw new Error('Original doc is not a text file')
        }

        if (modified && (modified.type !== 'file' || !modified.plain)) {
          throw new Error('Modified doc is not a text file')
        }

        ctx.doc.switchDoc({
          type: editorDocType,
          name: 'Text Comparator',
          path: '',
          repo: ctx.store.state.currentRepo?.name || '',
          extra: currentFile ? { original, modified } satisfies Extra : null,
        })
      },
    })

    ctx.statusBar.tapMenus(menus => {
      menus['status-bar-tool']?.list?.push(
        {
          id: compareTextActionId,
          type: 'normal',
          title: ctx.i18n.t('status-bar.tool.open-text-comparator'),
          subTitle: ctx.keybinding.getKeysLabel(compareTextActionId),
          onClick: () => {
            ctx.action.getActionHandler(compareTextActionId)()
          },
          order: 100,
        },
      )
    })
  }
} as Plugin
