import { useBus } from '@fe/support/bus'
import { useToast } from '@fe/support/toast'
import { useModal } from '@fe/support/modal'
import store from '@fe/support/store'
import storage from '@fe/utils/storage'
import * as api from '@fe/support/api'
import * as action from './action'
import * as doc from './document'
import * as shortcut from './shortcut'
import * as view from './view'
import * as tree from './tree'
import * as markdown from './markdown'
import * as statusBar from './status-bar'
import * as layout from './layout'
import * as editor from './editor'
import * as theme from './theme'
import * as embed from './embed'

export type CtxHookType = view.HookType | tree.HookType

const bus = useBus()

const ctx = {
  api,
  bus,
  store,
  action,
  doc,
  shortcut,
  ui: { useToast, useModal },
  tree,
  markdown,
  statusBar,
  layout,
  editor,
  view,
  theme,
  storage,
  embed
}

window.ctx = ctx

export default ctx
