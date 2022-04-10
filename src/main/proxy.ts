import { app, session } from 'electron'
import { registerAction } from './action'
import config from './config'

const keyEnabled = 'proxy.enabled'
const keyServer = 'proxy.server'
const keyPacUrl = 'proxy.pac-url'
const keyBypassList = 'proxy.bypass-list'

export function initProxy () {
  const proxyEnabled = config.get(keyEnabled, false)
  console.log('use proxy:', proxyEnabled)

  const proxyServer = config.get(keyServer, '')
  if (proxyEnabled && proxyServer && proxyServer.includes(':')) {
    const proxyPacUrl = config.get(keyPacUrl, '')
    const proxyBypassList = config.get(keyBypassList, '<local>')

    console.log('proxy server:', proxyServer)
    console.log('proxy pac-url:', proxyPacUrl)
    console.log('proxy bypass-list:', proxyBypassList)

    app.commandLine.appendSwitch('proxy-server', proxyServer)
    proxyPacUrl && app.commandLine.appendSwitch('proxy-pac-url', proxyPacUrl)
    proxyBypassList && app.commandLine.appendSwitch('proxy-bypass-list', proxyBypassList)
  }
}

function reloadProxy (config: any) {
  console.log('reload proxy', config[keyEnabled])

  if (config[keyEnabled]) {
    session.defaultSession.setProxy({
      proxyRules: config[keyServer],
      proxyBypassRules: config[keyBypassList],
      pacScript: config[keyPacUrl]
    })
  } else {
    session.defaultSession.setProxy({ mode: 'system' })
  }
}

registerAction('proxy.reload', reloadProxy)
