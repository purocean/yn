import Path from 'path-browserify'

export const {
  basename,
  extname,
  dirname,
  join,
  resolve,
} = Path

export function relative (from: string, to: string) {
  return Path.relative(
    from.startsWith('/') ? from : ('/' + from),
    to.startsWith('/') ? to : ('/' + to)
  )
}

export function isBelongTo (path: string, sub: string) {
  return sub.startsWith(path.replace(/\/$/, '') + '/')
}
