import { Components, Doc } from '@fe/support/types'
import store from '@fe/support/store'
import { registerAction } from './action'

export type ActionName = 'tree.refresh'
export type HookType = 'ON_TREE_NODE_SELECT'
export type MenuItem = Components.ContextMenu.Item
export type BuildContextMenu = (items: MenuItem[], node: Doc) => MenuItem[]

const contextMenuFunList: BuildContextMenu[] = []

export const registerContextMenu = (fun: BuildContextMenu) => {
  contextMenuFunList.push(fun)
}

export const getContextMenuItems = (node: any) => {
  return contextMenuFunList.reduce((items, fun) => fun(items, node), [] as MenuItem[])
}

export function refreshTree () {
  store.dispatch('fetchTree')
}

export function refreshRepo () {
  refreshTree()
  store.dispatch('fetchRepositories')
}

registerAction('tree.refresh', refreshTree)
