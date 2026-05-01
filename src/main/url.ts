import * as yargs from 'yargs'
import { APP_NAME } from './constant'

export type UrlMode = 'scheme' | 'dev' | 'prod'

type BuildUrlOptions = {
  mode: UrlMode,
  backendPort: number,
  devFrontendPort: number,
  includeArgParams?: boolean,
  extraSearchParams?: Record<string, string | number | boolean | undefined>,
}

export function buildAppUrl (options: BuildUrlOptions) {
  const args = options.includeArgParams === false
    ? []
    : Object.entries(yargs.argv).filter(x => [
      'readonly',
      'show-status-bar',
      'init-repo',
      'init-file',
    ].includes(x[0]))

  const searchParams = new URLSearchParams(args as any)

  if (options.mode === 'scheme') {
    searchParams.set('port', options.backendPort.toString())
  }

  for (const [key, value] of Object.entries(options.extraSearchParams || {})) {
    if (typeof value !== 'undefined') {
      searchParams.set(key, String(value))
    }
  }

  const query = searchParams.toString()
  const proto = options.mode === 'scheme' ? APP_NAME : 'http'
  const port = proto === 'http' ? (options.mode === 'dev' ? options.devFrontendPort : options.backendPort) : ''

  return `${proto}://localhost:${port}` + (query ? `?${query}` : '')
}
