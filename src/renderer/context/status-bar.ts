import { debounce } from 'lodash-es'
import { getActionHandler } from './action'

export type ActionName = 'status-bar.show-setting' | 'status-bar.refresh-menu'

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

export const refreshMenu = debounce(() => {
  getActionHandler('status-bar.refresh-menu')()
}, 10)

export function tapMenus (tapper: MenuTapper) {
  menuTappers.push(tapper)
  refreshMenu()
}

export function getMenus (position: string) {
  const menus: Menus = {}
  menuTappers.forEach(tap => tap(menus))
  return Object.values(menus).filter(x => x.position === position)
}
