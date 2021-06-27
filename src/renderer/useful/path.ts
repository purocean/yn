import Path from 'path-browserify'

export const {
  basename,
  extname,
  dirname,
  relative,
  join,
} = Path

export function isBelongTo (path: string, sub: string) {
  return sub.startsWith(path.replace(/\/$/, '') + '/')
}
