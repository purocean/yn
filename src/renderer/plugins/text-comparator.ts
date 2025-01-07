import { Plugin } from '@fe/context'
import type { BuildInActions } from '@fe/types'

export default {
  name: 'text-comparator',
  register: ctx => {
    const extensionId = '@yank-note/extension-text-comparator'
    const editorDocType = '__comparator' as const
    const compareTextActionId: keyof BuildInActions = 'plugin.text-comparator.open-text-comparator'

    const TextComparator = ctx.lib.vue.defineComponent({
      setup () {
        const { h } = ctx.lib.vue
        return () => h(
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
        )
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
      handler: () => {
        ctx.doc.switchDoc({
          type: editorDocType,
          name: 'Text Comparator',
          path: '',
          repo: ctx.store.state.currentRepo?.name || ''
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
