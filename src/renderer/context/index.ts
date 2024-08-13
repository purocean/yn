import * as storage from '@fe/utils/storage'
import * as utils from '@fe/utils/index'
import { getPurchased, showPremium } from '@fe/others/premium'
import * as extension from '@fe/others/extension'
import * as ioc from '@fe/core/ioc'
import * as plugin from '@fe/core/plugin'
import * as hook from '@fe/core/hook'
import * as action from '@fe/core/action'
import * as keybinding from '@fe/core/keybinding'
import { useToast } from '@fe/support/ui/toast'
import { useModal } from '@fe/support/ui/modal'
import { useQuickFilter } from '@fe/support/ui/quick-filter'
import { useContextMenu } from '@fe/support/ui/context-menu'
import * as env from '@fe/support/env'
import store from '@fe/support/store'
import * as base from '@fe/services/base'
import * as workbench from '@fe/services/workbench'
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
import * as i18n from '@fe/services/i18n'
import * as runner from '@fe/services/runner'
import * as renderer from '@fe/services/renderer'
import * as exportDoc from '@fe/services/export'
import * as routines from '@fe/services/routines'
import * as directives from '@fe/directives/index'
import * as indexer from '@fe/services/indexer'
import * as lib from './lib'
import * as components from './components'

const ctx = Object.freeze({
  lib,
  components,
  directives,
  ioc,
  base,
  api,
  args,
  store,
  action,
  doc,
  keybinding,
  tree,
  workbench,
  markdown,
  statusBar,
  runner,
  renderer,
  layout,
  editor,
  view,
  theme,
  storage,
  embed,
  setting,
  i18n,
  env,
  utils,
  routines,
  indexer,
  export: exportDoc,
  ui: { useToast, useModal, useQuickFilter, useContextMenu },
  registerHook: hook.registerHook,
  removeHook: hook.removeHook,
  triggerHook: hook.triggerHook,
  showPremium,
  getPremium: () => getPurchased(),
  showExtensionManager: extension.showManager,
  getExtensionLoadStatus: extension.getLoadStatus,
  getExtensionInitialized: extension.getInitialized,
  getPluginApi: plugin.getApi,
  version: __APP_VERSION__,
})

Object.defineProperty(window, 'ctx', {
  configurable: false,
  writable: false,
  value: ctx,
})

export type Ctx = typeof ctx
export type Plugin = plugin.Plugin<Ctx>

export default ctx
