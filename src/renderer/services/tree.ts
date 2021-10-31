import type { Ref } from 'vue'
import type { Components } from '@fe/types'
import { registerAction } from '@fe/core/action'
import store from '@fe/support/store'
import { useToast } from '@fe/support/ui/toast'
import * as api from '@fe/support/api'

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
export async function refreshTree () {
  const repo = store.state.currentRepo
  if (!repo) {
    console.warn('未选择仓库')
    return
  }

  try {
    const tree = await api.fetchTree(repo.name)
    store.commit('setTree', tree)
  } catch (error: any) {
    useToast().show('warning', error.message)
  }
}

/**
 * 刷新仓库
 */
export async function refreshRepo () {
  refreshTree()

  try {
    const repos = await api.fetchRepositories()
    store.commit('setRepositories', repos)
  } catch (error: any) {
    useToast().show('warning', error.message)
  }
}

registerAction({ name: 'tree.refresh', handler: refreshTree })
