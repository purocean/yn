import { markRaw, nextTick, Ref } from 'vue'
import type { Components } from '@fe/types'
import { getActionHandler, registerAction } from '@fe/core/action'
import * as ioc from '@fe/core/ioc'
import store from '@fe/support/store'
import { useToast } from '@fe/support/ui/toast'
import * as api from '@fe/support/api'
import { t } from './i18n'

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
 * Add a node action buttons processor.
 * @param fun
 */
export function tapNodeActionButtons (fun: (
  btns: Components.Tree.NodeActionBtn[],
  currentNode: Components.Tree.Node,
) => void) {
  ioc.register('TREE_NODE_ACTION_BTN_TAPPERS', fun)
}

/**
 * Get node action buttons.
 */
export function getNodeActionButtons (currentNode: Components.Tree.Node) {
  const btns: Components.Tree.NodeActionBtn[] = []

  const tappers = ioc.get('TREE_NODE_ACTION_BTN_TAPPERS')
  tappers.forEach((tapper) => {
    tapper(btns, currentNode)
  })

  return btns
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

    if (tree.length > 0 && tree[0].name === '/') {
      tree[0].name = repo.name
    }

    store.state.tree = markRaw(tree)
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

store.watch(() => store.state.treeSort, async () => {
  await refreshTree()
  await nextTick()
  revealCurrentNode()
})
registerAction({
  name: 'tree.refresh',
  description: t('command-desc.tree_refresh'),
  forUser: true,
  handler: refreshTree,
})
