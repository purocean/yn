import * as fs from 'fs-extra'
import * as path from 'path'
import { convertAppPath } from '../helper'

const isChildPath = (root: string, target: string) => {
  const relative = path.relative(root, target)
  return relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)
}

export async function resolveHelpPath (helpDir: string, input: unknown): Promise<string | null> {
  // Help URLs use POSIX separators and may start with a help-root-relative '/'.
  // Reject Windows drive, UNC, device and alternate-stream paths on every OS.
  if (typeof input !== 'string' || !input || /[\\:\0]/.test(input) || input.startsWith('//')) {
    return null
  }

  // Help files are unpacked by electron-builder; inspect the actual filesystem
  // so Electron's virtual ASAR realpath cannot hide an escaping symlink.
  const root = path.resolve(convertAppPath(helpDir))
  const target = path.resolve(root, input.replace(/^\//, ''))
  if (!isChildPath(root, target)) {
    return null
  }

  try {
    const realRoot = await fs.realpath(root)
    const realTarget = await fs.realpath(target)
    return isChildPath(realRoot, realTarget) ? realTarget : null
  } catch (_) {
    return null
  }
}
