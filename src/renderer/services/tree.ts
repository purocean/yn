import { nextTick, Ref } from 'vue'
import type { Components } from '@fe/types'
import { getActionHandler, registerAction } from '@fe/core/action'
import store from '@fe/support/store'
import { useToast } from '@fe/support/ui/toast'
import * as api from '@fe/support/api'

export type MenuItem = Components.ContextMenu.Item
export type VueCtx = { localMarked: Ref<boolean | null> }
export type BuildContextMenu = (items: MenuItem[], node: Components.Tree.Node, vueCtx: VueCtx) => void

const contextMenuFunList: BuildContextMenu[] = []

/**
 * Add a context menu processor.
 * @param fun
 */
export function tapContextMenus (fun: BuildContextMenu) {
  contextMenuFunList.push(fun)
}

/**
 * Get context menus
 * @param node
 * @param vueCtx
 * @returns
 */
export function getContextMenuItems (node: Components.Tree.Node, vueCtx: VueCtx) {
  const items: MenuItem[] = []

  contextMenuFunList.forEach((fun) => {
    fun(items, node, vueCtx)
  })

  return items
}

/**
 * Refresh file tree.
 */
export async function refreshTree () {
  const repo = store.state.currentRepo
  if (!repo) {
    console.warn('No repo')
    return
  }

  try {
    const tree = await api.fetchTree(repo.name, store.state.treeSort || { by: 'serial', order: 'asc' })
    store.commit('setTree', tree)
  } catch (error: any) {
    useToast().show('warning', error.message)
  }
}

/**
 * Reveal current node.
 */
export function revealCurrentNode () {
  getActionHandler('tree.reveal-current-node')()
}

store.watch(state => state.treeSort, async () => {
  await refreshTree()
  await nextTick()
  revealCurrentNode()
})
registerAction({ name: 'tree.refresh', handler: refreshTree })
