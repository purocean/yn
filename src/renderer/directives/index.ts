import { App } from 'vue'
import * as autoFocus from './auto-focus'
import * as autoResize from './auto-resize'
import * as placeholder from './placeholder'
import * as upDownHistory from './up-down-history'
import * as fixedFloat from './fixed-float'

export default function (app: App) {
  autoFocus.install(app)
  autoResize.install(app)
  placeholder.install(app)
  upDownHistory.install(app)
  fixedFloat.install(app)
}
