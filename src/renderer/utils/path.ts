import Path from 'path-browserify'

export const {
  basename,
  extname,
  dirname,
  join,
} = Path

export function resolve (...args: string[]) {
  return Path.resolve('/', ...args)
}

export function relative (from: string, to: string) {
  return Path.relative(
    from.startsWith('/') ? from : ('/' + from),
    to.startsWith('/') ? to : ('/' + to)
  )
}

export function isBelongTo (path: string, sub: string) {
  return sub.startsWith(path.replace(/\/$/, '') + '/')
}
