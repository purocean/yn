import * as ioc from '@fe/core/ioc'
import * as statusBar from '@fe/services/status-bar'

jest.mock('lodash-es', () => ({
  debounce: (fn: any) => () => fn()
}))

jest.mock('@fe/core/action', () => ({
  getActionHandler: (name: string) => () => {
    if (name !== 'status-bar.refresh-menu') {
      throw Error('action name error')
    }
  }
}))

afterEach(() => {
  ioc.removeAll('STATUS_BAR_MENU_TAPPERS')
})

test('refresh menu', () => {
  statusBar.refreshMenu()
})

test('menu', () => {
  statusBar.tapMenus(menus => {
    menus.test1 = { id: 'test1', position: 'left' } as statusBar.Menu
  })

  statusBar.tapMenus(menus => {
    menus.test2 = { id: 'test2', position: 'right' } as statusBar.Menu
  })

  statusBar.tapMenus(menus => {
    menus.test3 = { id: 'test3', position: 'right' } as statusBar.Menu
  })

  const menus = statusBar.getMenus('right')
  expect(menus).toStrictEqual([
    { id: 'test2', position: 'right' },
    { id: 'test3', position: 'right' },
  ])
})
