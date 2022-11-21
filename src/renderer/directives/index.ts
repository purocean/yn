import { App } from 'vue'
import * as autoResize from './auto-resize'
import * as placeholder from './placeholder'
import * as upDownHistory from './up-down-history'

export default function (app: App) {
  autoResize.install(app)
  placeholder.install(app)
  upDownHistory.install(app)
}
