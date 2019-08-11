const nodeProcess = window && (window.process || window.nodeProcess)
const nodeModule = window && (window.module || window.nodeModule)
const nodeRequire = window && (window.require || window.nodeRequire)

const isElectron = !!(nodeProcess && nodeProcess.versions && nodeProcess.versions['electron'])

export default {
  process: nodeProcess,
  module: nodeModule,
  require: nodeRequire,
  isElectron
}
