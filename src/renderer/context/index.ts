import { useBus } from '@fe/support/bus'
import { useToast } from '@fe/support/toast'
import { useModal } from '@fe/support/modal'
import store from '@fe/support/store'
import storage from '@fe/utils/storage'
import * as utils from '@fe/utils/index'
import * as env from '@fe/utils/env'
import * as api from '@fe/support/api'
import * as lib from './lib'
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
import * as setting from './setting'

export type CtxHookType = view.HookType | tree.HookType | doc.HookType

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
  embed,
  setting,
  lib,
  env,
  utils,
}

window.ctx = ctx

export default ctx
