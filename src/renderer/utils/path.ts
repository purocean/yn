import Path from 'path-browserify'

export const { extname, join, } = Path

export function normalizeSep (p: string) {
  return p.replaceAll('\\', '/')
}

export function dirname (p: string) {
  return Path.dirname(normalizeSep(p))
}

export function basename (p: string, ext?: string) {
  return Path.basename(normalizeSep(p), ext)
}

export function resolve (...args: string[]) {
  return Path.resolve('/', ...args)
}

export function relative (from: string, to: string) {
  from = normalizeSep(from)
  to = normalizeSep(to)

  return Path.relative(
    from.startsWith('/') ? from : ('/' + from),
    to.startsWith('/') ? to : ('/' + to)
  )
}

export function isBelongTo (path: string, sub: string) {
  return sub.startsWith(path.replace(/\/$/, '') + '/')
}
