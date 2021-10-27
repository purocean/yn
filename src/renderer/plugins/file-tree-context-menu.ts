import { Plugin, Ctx } from '@fe/context'
import { FLAG_DISABLE_XTERM } from '@fe/support/args'

export default {
  name: 'markdown-link',
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
      }

      const isMarkdown = node.type === 'file' && node.path.toLowerCase().endsWith('.md')

      items.push(...[
        ...(isMarkdown ? [
          { id: 'mark', label: node.marked ? '取消标记' : '标记文件', onClick: () => toggleMark() },
        ] : []),
        ...(isMarkdown && !ctx.doc.isEncrypted(node) ? [
          { id: 'duplicate', label: '重复文件', onClick: () => ctx.doc.duplicateDoc(node) },
        ] : []),
        ...(node.type === 'dir' ? [
          { id: 'create', label: '创建新文件', onClick: () => ctx.doc.createDoc({ repo: node.repo }, node) }
        ] : []),
        ...(node.path !== '/' ? [
          { id: 'rename', label: '重命名 / 移动', onClick: () => ctx.doc.moveDoc(node) },
          { id: 'delete', label: '删除', onClick: () => ctx.doc.deleteDoc(node) },
        ] : []),
        { type: 'separator' },
        { id: 'openInOS', label: '在系统中打开', onClick: () => ctx.doc.openInOS(node) },
        { id: 'refreshTree', label: '刷新目录树', onClick: () => ctx.tree.refreshTree() },
        ...(node.type === 'dir' && !FLAG_DISABLE_XTERM ? [
          { id: 'openInTerminal', label: '在终端中打开', onClick: revealInXterminal }
        ] : []),
        ...(isMarkdown ? [
          { id: 'create', label: '当前目录创建新文件', onClick: () => ctx.doc.createDoc({ repo: node.repo }, node) }
        ] : []),
        { id: 'copy-name', label: '复制名称', onClick: () => ctx.utils.copyText(node.name) },
        { id: 'copy-name', label: '复制路径', onClick: () => ctx.utils.copyText(node.path) }
      ] as typeof items)
    })
  }
} as Plugin
