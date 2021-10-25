import type { Ref } from 'vue'
import type { Components } from '@fe/support/types'
import store from '@fe/support/store'
import { registerAction } from './action'

export type ActionName = 'tree.refresh'
export type HookType = 'ON_TREE_NODE_SELECT'
export type MenuItem = Components.ContextMenu.Item
export type VueCtx = { localMarked: Ref<boolean | null> }
export type BuildContextMenu = (items: MenuItem[], node: Components.Tree.Node, vueCtx: VueCtx) => void

const contextMenuFunList: BuildContextMenu[] = []

export const tapContextMenus = (fun: BuildContextMenu) => {
  contextMenuFunList.push(fun)
}

export const getContextMenuItems = (node: Components.Tree.Node, vueCtx: VueCtx) => {
  const items: MenuItem[] = []

  contextMenuFunList.forEach((fun) => {
    fun(items, node, vueCtx)
  })

  return items
}

export function refreshTree () {
  store.dispatch('fetchTree')
}

export function refreshRepo () {
  refreshTree()
  store.dispatch('fetchRepositories')
}

registerAction({ name: 'tree.refresh', handler: refreshTree })
