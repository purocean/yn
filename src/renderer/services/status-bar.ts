import { debounce } from 'lodash-es'
import * as ioc from '@fe/core/ioc'
import { getActionHandler } from '@fe/core/action'

export type MenuItem = {
  id: string;
  type: 'normal';
  title: string;
  tips?: string;
  subTitle?: string;
  disabled?: boolean;
  hidden?: boolean;
  onClick?: (item: MenuItem) => void;
} | { type: 'separator' }

export interface Menu {
  id: string;
  title?: string;
  tips?: string;
  icon?: string;
  hidden?: boolean;
  position: 'left' | 'right';
  onClick?: (menu: Menu) => void;
  onMousedown?: (menu: Menu) => void;
  list?: MenuItem[];
}

export type Menus = { [id: string]: Menu }

export type MenuTapper = (menus: Menus) => void

const _refreshMenu = debounce(() => {
  getActionHandler('status-bar.refresh-menu')()
}, 10)

/**
 * Refresh status bar menus.
 */
export function refreshMenu () {
  _refreshMenu()
}

/**
 * Add a menu processor.
 * @param tapper
 */
export function tapMenus (tapper: MenuTapper) {
  ioc.register('STATUS_BAR_MENU_TAPPERS', tapper)
  refreshMenu()
}

/**
 * Get status bar menus by position.
 * @param position
 * @returns
 */
export function getMenus (position: string) {
  const menus: Menus = {}
  const tappers: MenuTapper[] = ioc.get('STATUS_BAR_MENU_TAPPERS')
  tappers.forEach(tap => tap(menus))
  return Object.values(menus).filter(x => x.position === position)
}
