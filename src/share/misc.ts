export const MARKDOWN_FILE_EXT = '.md'
export const ENCRYPTED_MARKDOWN_FILE_EXT = '.c.md'

export const DEFAULT_EXCLUDE_REGEX = '^node_modules/$|^.git/$|^\\.'

export function isMarkdownFile (path: string) {
  return path.endsWith(MARKDOWN_FILE_EXT)
}

export function isEncryptedMarkdownFile (path: string) {
  return path.endsWith(ENCRYPTED_MARKDOWN_FILE_EXT)
}
