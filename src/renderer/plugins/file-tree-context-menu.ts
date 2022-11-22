import { Plugin, Ctx } from '@fe/context'
import { FLAG_DISABLE_XTERM } from '@fe/support/args'

export default {
  name: 'file-tree-context-menu',
  register: (ctx: Ctx) => {
    ctx.tree.tapContextMenus((items, node, vueCtx) => {
      function revealInXterminal () {
        const { currentRepo } = ctx.store.state
        const path = currentRepo ? ctx.utils.path.join(currentRepo.path, node.path) : ''
        if (path) {
          ctx.action.getActionHandler('xterm.run')(`--yank-note-run-command-cd-- ${path}`)
        }
      }

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

      const isMarkdown = ctx.doc.isMarkdownFile(node)

      const disableItems = ctx.args.FLAG_READONLY
        ? ['duplicate', 'duplicate', 'create-dir', 'create-doc', 'create-in-cd', 'rename', 'delete', 'open-in-terminal']
        : []

      const t = ctx.i18n.t

      items.push(...[
        ...(isMarkdown ? [
          { id: 'mark', label: node.marked ? t('tree.context-menu.unmark') : t('tree.context-menu.mark'), onClick: () => toggleMark() },
        ] : []),
        ...(isMarkdown && !ctx.doc.isEncrypted(node) ? [
          { id: 'duplicate', label: t('tree.context-menu.duplicate'), onClick: () => ctx.doc.duplicateDoc(node) },
        ] : []),
        ...(node.type === 'dir' ? [
          { id: 'create-doc', label: t('tree.context-menu.create-doc'), onClick: () => ctx.doc.createDoc({ repo: node.repo }, node) },
          { id: 'create-dir', label: t('tree.context-menu.create-dir'), onClick: () => ctx.doc.createDir({ repo: node.repo }, node) }
        ] : []),
        ...(node.path !== '/' ? [
          { id: 'rename', label: t('tree.context-menu.rename'), onClick: () => ctx.doc.moveDoc(node) },
          { id: 'delete', label: t('tree.context-menu.delete'), onClick: () => ctx.doc.deleteDoc(node) },
        ] : []),
        { type: 'separator' },
        { id: 'open-in-os', label: t('tree.context-menu.open-in-os'), onClick: () => ctx.doc.openInOS(node) },
        ...(node.type === 'file' ? [
          { id: 'reveal-in-os', label: t('tree.context-menu.reveal-in-os'), onClick: () => ctx.doc.openInOS(node, true) }
        ] : []),
        { id: 'refresh', label: t('tree.context-menu.refresh'), onClick: () => ctx.tree.refreshTree() },
        ...(node.type === 'dir' ? [
          { id: 'find-in-folder', label: t('tree.context-menu.find-in-folder'), onClick: () => ctx.base.findInRepository({ include: node.path.replace(/^\//, '') + '/**/*.md' }) },
        ] : []),
        ...(node.type === 'dir' && !FLAG_DISABLE_XTERM ? [
          { id: 'open-in-terminal', label: t('tree.context-menu.open-in-terminal'), onClick: revealInXterminal },
        ] : []),
        ...(isMarkdown ? [
          { id: 'create-in-cd', label: t('tree.context-menu.create-in-cd'), onClick: () => ctx.doc.createDoc({ repo: node.repo }, node) }
        ] : []),
        { type: 'separator' },
        { id: 'copy-name', label: t('tree.context-menu.copy-name'), onClick: () => ctx.utils.copyText(node.name) },
        { id: 'copy-path', label: t('tree.context-menu.copy-path'), onClick: () => ctx.utils.copyText(node.path) }
      ].filter(x => (!x.id || !disableItems.includes(x.id))) as typeof items)
    })
  }
} as Plugin
