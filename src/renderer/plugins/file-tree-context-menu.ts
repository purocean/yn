import { Plugin, Ctx } from '@fe/context'
import { FLAG_DISABLE_XTERM } from '@fe/support/args'
import type { Components, Doc } from '@fe/types'

export default {
  name: 'file-tree-context-menu',
  register: (ctx: Ctx) => {
    function revealInXterminal (node: Doc) {
      const { currentRepo } = ctx.store.state
      const path = currentRepo ? ctx.utils.path.join(currentRepo.path, node.path) : ''
      if (path) {
        ctx.action.getActionHandler('xterm.run')(`--yank-note-run-command-cd-- ${path}`)
      }
    }

    function addItem (node: Doc) {
      const input = window.document.createElement('input')
      input.type = 'file'
      input.multiple = true
      input.onchange = async () => {
        for (let i = 0; i < input.files!.length; i++) {
          const file = input.files![i]
          const fileBase64Url = await ctx.utils.fileToBase64URL(file)
          const filePath = ctx.utils.path.resolve(node.path, file.name)
          await ctx.api.upload(node.repo, fileBase64Url, filePath)
        }

        ctx.tree.refreshTree()
      }
      input.click()
    }

    function getItems (node: Doc, position: 'tabs' | 'tree'): Components.ContextMenu.Item[] {
      const t = ctx.i18n.t
      const isMarkdown = ctx.doc.isMarkdownFile(node)

      const disableItems = ctx.args.FLAG_READONLY
        ? ['add-item', 'duplicate', 'duplicate', 'create-dir', 'create-doc', 'create-in-cd', 'rename', 'delete', 'open-in-terminal']
        : []

      if (position === 'tabs') {
        disableItems.push('refresh')
      }

      return [
        ...(!ctx.doc.isEncrypted(node) ? [
          { id: 'duplicate', label: t('tree.context-menu.duplicate'), onClick: () => ctx.doc.duplicateDoc(node), ellipsis: true },
        ] : []),
        ...(node.type === 'dir' ? [
          { id: 'create-doc', label: t('tree.context-menu.create-doc'), onClick: () => ctx.doc.createDoc({ repo: node.repo }, node), ellipsis: true },
          { id: 'create-dir', label: t('tree.context-menu.create-dir'), onClick: () => ctx.doc.createDir({ repo: node.repo }, node), ellipsis: true },
          { id: 'add-item', label: t('tree.context-menu.add-item'), onClick: () => addItem(node), ellipsis: true },
        ] : []),
        ...(node.path !== '/' ? [
          { id: 'rename', label: t('tree.context-menu.rename'), onClick: () => ctx.doc.moveDoc(node), ellipsis: true },
          { id: 'delete', label: t('tree.context-menu.delete'), onClick: () => ctx.doc.deleteDoc(node) },
        ] : []),
        { type: 'separator' },
        { id: 'open-in-os', label: t('tree.context-menu.open-in-os'), onClick: () => ctx.doc.openInOS(node) },
        ...(node.type === 'file' ? [
          { id: 'reveal-in-os', label: t('tree.context-menu.reveal-in-os'), onClick: () => ctx.doc.openInOS(node, true) }
        ] : []),
        { id: 'refresh', label: t('tree.context-menu.refresh'), onClick: () => ctx.tree.refreshTree() },
        ...(node.type === 'dir' ? [
          { id: 'find-in-folder', label: t('tree.context-menu.find-in-folder'), onClick: () => ctx.base.findInRepository({ include: node.path.replace(/^\//, '') + '/**/*.md' }), ellipsis: true },
        ] : []),
        ...(node.type === 'dir' && !FLAG_DISABLE_XTERM ? [
          { id: 'open-in-terminal', label: t('tree.context-menu.open-in-terminal'), onClick: () => revealInXterminal(node) },
        ] : []),
        ...(isMarkdown ? [
          { id: 'create-in-cd', label: t('tree.context-menu.create-in-cd'), onClick: () => ctx.doc.createDoc({ repo: node.repo }, node), ellipsis: true }
        ] : []),
        { type: 'separator' },
        { id: 'copy-name', label: t('tree.context-menu.copy-name'), onClick: () => ctx.utils.copyText(node.name) },
        { id: 'copy-path', label: t('tree.context-menu.copy-path'), onClick: () => ctx.utils.copyText(node.path) }
      ].filter((x: any) => (!x.id || !disableItems.includes(x.id))) as Components.ContextMenu.Item[]
    }

    ctx.tree.tapContextMenus((items, node, vueCtx) => {
      async function toggleMark () {
        if ((node as any).marked) {
          vueCtx.localMarked.value = false
          await ctx.doc.unmarkDoc(node)
        } else {
          vueCtx.localMarked.value = true
          await ctx.doc.markDoc(node)
        }

        node.marked = vueCtx.localMarked.value
      }

      const t = ctx.i18n.t

      items.push(...[
        ...(ctx.doc.supported(node) ? [
          {
            id: 'mark',
            label: node.marked ? t('tree.context-menu.unmark') : t('tree.context-menu.mark'),
            onClick: () => toggleMark()
          },
        ] : []),
        ...getItems(node, 'tree')
      ])
    })

    ctx.workbench.FileTabs.tapTabContextMenus((items, tab) => {
      const doc: Doc | null = tab.payload.file

      if (!doc || doc.repo.startsWith('__')) {
        return
      }

      items.push(...getItems(doc, 'tabs'))
    })
  }
} as Plugin
