import { Components } from '@fe/types'

export type HookType = 'ON_TREE_NODE_SELECT'

type MenuItem = Components.ContextMenu.Item

type BuildContextMenu = (items: MenuItem[], node: any) => MenuItem[]

const contextMenuFunList: BuildContextMenu[] = []

export const registerContextMenu = (fun: BuildContextMenu) => {
  contextMenuFunList.push(fun)
}

export const getContextMenuItems = (node: any) => {
  return contextMenuFunList.reduce((items, fun) => fun(items, node), [] as MenuItem[])
}

export const ctx = {
  registerContextMenu
}
