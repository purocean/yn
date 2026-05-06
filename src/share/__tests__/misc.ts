import {
  isMarkdownFile,
  isEncryptedMarkdownFile,
  getDefaultApplicationAccelerators,
  isNormalRepoName,
  MARKDOWN_FILE_EXT,
  ENCRYPTED_MARKDOWN_FILE_EXT,
  ROOT_REPO_NAME_PREFIX,
  DEFAULT_EXCLUDE_REGEX,
  DOC_HISTORY_MAX_CONTENT_LENGTH,
} from '../misc'

describe('misc utilities', () => {
  describe('constants', () => {
    test('MARKDOWN_FILE_EXT should be .md', () => {
      expect(MARKDOWN_FILE_EXT).toBe('.md')
    })

    test('ENCRYPTED_MARKDOWN_FILE_EXT should be .c.md', () => {
      expect(ENCRYPTED_MARKDOWN_FILE_EXT).toBe('.c.md')
    })

    test('ROOT_REPO_NAME_PREFIX should be __root__', () => {
      expect(ROOT_REPO_NAME_PREFIX).toBe('__root__')
    })

    test('DEFAULT_EXCLUDE_REGEX should be defined', () => {
      expect(DEFAULT_EXCLUDE_REGEX).toBe('^node_modules/$|^\\.git/$|^\\.DS_Store$')
    })

    test('DOC_HISTORY_MAX_CONTENT_LENGTH should be 102400', () => {
      expect(DOC_HISTORY_MAX_CONTENT_LENGTH).toBe(102400)
    })
  })

  describe('isMarkdownFile', () => {
    test('should return true for .md files', () => {
      expect(isMarkdownFile('test.md')).toBe(true)
      expect(isMarkdownFile('test.mdx')).toBe(true)
      expect(isMarkdownFile('test.markdown')).toBe(true)
      expect(isMarkdownFile('/path/to/file.md')).toBe(true)
      expect(isMarkdownFile('/path/to/file.mdx')).toBe(true)
      expect(isMarkdownFile('/path/to/file.markdown')).toBe(true)
      expect(isMarkdownFile('nested/folder/document.md')).toBe(true)
      expect(isMarkdownFile('nested/folder/document.mdx')).toBe(true)
      expect(isMarkdownFile('nested/folder/document.markdown')).toBe(true)
    })

    test('should return false for non-.md files', () => {
      expect(isMarkdownFile('test.txt')).toBe(false)
      expect(isMarkdownFile('test')).toBe(false)
      expect(isMarkdownFile('test.md.txt')).toBe(false)
    })

    test('should return true for .c.md files (encrypted markdown)', () => {
      expect(isMarkdownFile('test.c.md')).toBe(true)
    })
  })

  describe('isEncryptedMarkdownFile', () => {
    test('should return true for .c.md files', () => {
      expect(isEncryptedMarkdownFile('test.c.md')).toBe(true)
      expect(isEncryptedMarkdownFile('/path/to/file.c.md')).toBe(true)
      expect(isEncryptedMarkdownFile('nested/folder/document.c.md')).toBe(true)
    })

    test('should return false for non-.c.md files', () => {
      expect(isEncryptedMarkdownFile('test.md')).toBe(false)
      expect(isEncryptedMarkdownFile('test.txt')).toBe(false)
      expect(isEncryptedMarkdownFile('test.c')).toBe(false)
      expect(isEncryptedMarkdownFile('test')).toBe(false)
      expect(isEncryptedMarkdownFile('test.c.md.txt')).toBe(false)
    })
  })

  describe('getDefaultApplicationAccelerators', () => {
    test('should return accelerators for darwin platform with English', () => {
      const accelerators = getDefaultApplicationAccelerators('darwin', 'en')
      expect(accelerators).toHaveLength(3)
      expect(accelerators[0].command).toBe('show-main-window')
      expect(accelerators[0].accelerator).toBe('Shift+Alt+M')
      expect(accelerators[1].command).toBe('hide-main-window')
      expect(accelerators[1].accelerator).toBe(null)
      expect(accelerators[2].command).toBe('open-in-browser')
      expect(accelerators[2].accelerator).toBe('Meta+Shift+B')
    })

    test('should return accelerators for non-darwin platform', () => {
      const accelerators = getDefaultApplicationAccelerators('linux', 'en')
      expect(accelerators).toHaveLength(3)
      expect(accelerators[0].command).toBe('show-main-window')
      expect(accelerators[0].accelerator).toBe('Meta+Alt+N')
      expect(accelerators[2].command).toBe('open-in-browser')
      expect(accelerators[2].accelerator).toBe('Meta+Shift+B')
    })

    test('should return accelerators for win32 platform', () => {
      const accelerators = getDefaultApplicationAccelerators('win32', 'en')
      expect(accelerators).toHaveLength(3)
      expect(accelerators[0].accelerator).toBe('Meta+Alt+N')
    })

    test('should work with different languages', () => {
      const acceleratorsEn = getDefaultApplicationAccelerators('darwin', 'en')
      const acceleratorsZh = getDefaultApplicationAccelerators('darwin', 'zh-CN')
      expect(acceleratorsEn[0].command).toBe(acceleratorsZh[0].command)
      expect(acceleratorsEn[0].accelerator).toBe(acceleratorsZh[0].accelerator)
    })

    test('should default to English when language not provided', () => {
      const accelerators = getDefaultApplicationAccelerators('darwin')
      expect(accelerators).toHaveLength(3)
      expect(accelerators[0].description).toBeDefined()
    })
  })

  describe('isNormalRepoName', () => {
    test('should return true for normal repo names', () => {
      expect(isNormalRepoName('my-repo')).toBe(true)
      expect(isNormalRepoName('repo123')).toBe(true)
      expect(isNormalRepoName('_repo')).toBe(true)
      expect(isNormalRepoName('repo_name')).toBe(true)
      expect(isNormalRepoName('normal')).toBe(true)
    })

    test('should return false for repo names starting with __', () => {
      expect(isNormalRepoName('__root__')).toBe(false)
      expect(isNormalRepoName('__special')).toBe(false)
      expect(isNormalRepoName('__test__')).toBe(false)
      expect(isNormalRepoName('__')).toBe(false)
    })
  })
})
