import type { Ref } from 'vue'
import type { Components } from '@fe/types'
import store from '@fe/support/store'
import { registerAction } from '../core/action'

export type MenuItem = Components.ContextMenu.Item
export type VueCtx = { localMarked: Ref<boolean | null> }
export type BuildContextMenu = (items: MenuItem[], node: Components.Tree.Node, vueCtx: VueCtx) => void

const contextMenuFunList: BuildContextMenu[] = []

/**
 * 添加一个上下文菜单处理方法
 * @param fun 处理方法
 */
export function tapContextMenus (fun: BuildContextMenu) {
  contextMenuFunList.push(fun)
}

/**
 * 获取上下文菜单
 * @param node 节点
 * @param vueCtx Vue 上下文
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
 * 刷新目录树
 */
export function refreshTree () {
  store.dispatch('fetchTree')
}

/**
 * 刷新仓库
 */
export function refreshRepo () {
  refreshTree()
  store.dispatch('fetchRepositories')
}

registerAction({ name: 'tree.refresh', handler: refreshTree })
