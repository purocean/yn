import { useBus } from '@fe/support/bus'
import { useToast } from '@fe/support/toast'
import store from '@fe/support/store'
import storage from '@fe/utils/storage'
import * as api from '@fe/support/api'
import * as action from './action'
import * as shortcut from './shortcut'
import * as view from './view'
import * as tree from './tree'
import * as markdown from './markdown'
import * as statusBar from './status-bar'
import * as layout from './layout'
import * as editor from './editor'
import * as theme from './theme'

export type CtxHookType = view.HookType | tree.HookType

const bus = useBus()

const ctx = {
  api,
  bus,
  store,
  action,
  shortcut,
  ui: { useToast },
  tree,
  markdown,
  statusBar,
  layout,
  editor,
  theme,
  storage
}

window.ctx = ctx

export default ctx
