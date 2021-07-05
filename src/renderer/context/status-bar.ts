import { getAction } from './action'

export type ActionName = 'status-bar.show-setting' | 'status-bar.refresh-menu'

export type MenuItem = {
  id: string;
  type: 'normal';
  title: string;
  tips?: string;
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

const menus: { [key: string]: Menu } = {}

export const getMenus = (position: string) =>
  Object.values(menus).filter(x => x.position === position)

export function refreshMenu () {
  getAction('status-bar.refresh-menu')()
}

export function updateMenu (menu: Menu) {
  menus[menu.id] = menu
  refreshMenu()
}

export function tapMenu (id: string, fn: (menu: Menu) => Menu) {
  updateMenu(fn(menus[id]))
}

export function removeMenu (id: string) {
  delete menus[id]
  refreshMenu()
}
