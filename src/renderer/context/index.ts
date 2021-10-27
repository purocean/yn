import * as storage from '@fe/utils/storage'
import * as utils from '@fe/utils/index'
import * as plugin from '@fe/core/plugin'
import * as action from '@fe/core/action'
import * as shortcut from '@fe/core/shortcut'
import { useBus } from '@fe/core/bus'
import { useToast } from '@fe/support/ui/toast'
import { useModal } from '@fe/support/ui/modal'
import * as env from '@fe/support/env'
import store from '@fe/support/store'
import * as base from '@fe/services/base'
import * as api from '@fe/support/api'
import * as embed from '@fe/support/embed'
import * as args from '@fe/support/args'
import * as doc from '@fe/services/document'
import * as view from '@fe/services/view'
import * as tree from '@fe/services/tree'
import * as markdown from '@fe/services/markdown'
import * as statusBar from '@fe/services/status-bar'
import * as layout from '@fe/services/layout'
import * as editor from '@fe/services/editor'
import * as theme from '@fe/services/theme'
import * as setting from '@fe/services/setting'
import * as lib from './lib'

const ctx = {
  base,
  api,
  args,
  store,
  action,
  doc,
  shortcut,
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
  bus: useBus(),
  ui: { useToast, useModal },
  registerHook: plugin.registerHook,
  removeHook: plugin.removeHook,
  triggerHook: plugin.triggerHook,
  registerPlugin: plugin.register,
}

window.ctx = ctx

export type Ctx = typeof ctx
export type Plugin = plugin.Plugin<Ctx>

export default ctx
