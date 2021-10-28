import { debounce } from 'lodash-es'
import { getActionHandler } from '../core/action'

export type MenuItem = {
  id: string;
  type: 'normal';
  title: string;
  tips?: string;
  subTitle?: string;
  disabled?: boolean;
  onClick?: (item: MenuItem) => void;
}

export interface Menu {
  id: string;
  title?: string;
  tips?: string;
  icon?: string;
  hidden?: boolean;
  position: 'left' | 'right';
  onClick?: (menu: Menu) => void;
  list?: MenuItem[];
}

export type Menus = { [id: string]: Menu }

export type MenuTapper = (menus: Menus) => void

const menuTappers: MenuTapper[] = []

const _refreshMenu = debounce(() => {
  getActionHandler('status-bar.refresh-menu')()
}, 10)

/**
 * 刷新菜单
 */
export function refreshMenu () {
  _refreshMenu()
}

/**
 * 注册一个菜单处理器
 * @param tapper 处理器
 */
export function tapMenus (tapper: MenuTapper) {
  menuTappers.push(tapper)
  refreshMenu()
}

/**
 * 获取菜单
 * @param position 位置
 * @returns 菜单
 */
export function getMenus (position: string) {
  const menus: Menus = {}
  menuTappers.forEach(tap => tap(menus))
  return Object.values(menus).filter(x => x.position === position)
}
