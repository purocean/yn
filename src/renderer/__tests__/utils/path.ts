import * as path from '@fe/utils/path'

describe('path utilities', () => {
  describe('normalizeSep', () => {
    test('should replace backslashes with forward slashes', () => {
      expect(path.normalizeSep('C:\\Users\\test\\file.txt')).toBe('C:/Users/test/file.txt')
      expect(path.normalizeSep('path\\to\\file')).toBe('path/to/file')
    })

    test('should handle paths with only forward slashes', () => {
      expect(path.normalizeSep('/path/to/file')).toBe('/path/to/file')
    })

    test('should handle mixed separators', () => {
      expect(path.normalizeSep('path\\to/file\\test')).toBe('path/to/file/test')
    })

    test('should handle empty string', () => {
      expect(path.normalizeSep('')).toBe('')
    })
  })

  describe('dirname', () => {
    test('should get directory name from path', () => {
      expect(path.dirname('/path/to/file.txt')).toBe('/path/to')
      expect(path.dirname('/path/to/folder/')).toBe('/path/to')
    })

    test('should handle Windows-style paths', () => {
      expect(path.dirname('C:\\Users\\test\\file.txt')).toBe('C:/Users/test')
    })

    test('should handle root path', () => {
      expect(path.dirname('/file.txt')).toBe('/')
    })

    test('should handle relative paths', () => {
      expect(path.dirname('folder/file.txt')).toBe('folder')
    })
  })

  describe('basename', () => {
    test('should get base name from path', () => {
      expect(path.basename('/path/to/file.txt')).toBe('file.txt')
      expect(path.basename('/path/to/folder/')).toBe('folder')
    })

    test('should handle Windows-style paths', () => {
      expect(path.basename('C:\\Users\\test\\file.txt')).toBe('file.txt')
    })

    test('should remove extension when provided', () => {
      expect(path.basename('/path/to/file.txt', '.txt')).toBe('file')
      expect(path.basename('/path/to/file.md', '.md')).toBe('file')
    })

    test('should handle paths without extension', () => {
      expect(path.basename('/path/to/folder')).toBe('folder')
    })

    test('should handle root path', () => {
      expect(path.basename('/')).toBe('')
    })
  })

  describe('extname', () => {
    test('should get file extension', () => {
      expect(path.extname('file.txt')).toBe('.txt')
      expect(path.extname('file.md')).toBe('.md')
      expect(path.extname('archive.tar.gz')).toBe('.gz')
    })

    test('should return empty string for files without extension', () => {
      expect(path.extname('file')).toBe('')
      expect(path.extname('folder/')).toBe('')
    })

    test('should handle hidden files', () => {
      expect(path.extname('.gitignore')).toBe('')
      expect(path.extname('.config.json')).toBe('.json')
    })
  })

  describe('join', () => {
    test('should join path segments', () => {
      expect(path.join('path', 'to', 'file')).toBe('path/to/file')
      expect(path.join('/path', 'to', 'file.txt')).toBe('/path/to/file.txt')
    })

    test('should handle empty segments', () => {
      expect(path.join('path', '', 'file')).toBe('path/file')
    })

    test('should normalize the result', () => {
      expect(path.join('path', '..', 'file')).toBe('file')
      expect(path.join('path', '.', 'file')).toBe('path/file')
    })
  })

  describe('resolve', () => {
    test('should resolve path segments to absolute path', () => {
      expect(path.resolve('path', 'to', 'file')).toBe('/path/to/file')
      expect(path.resolve('/path', 'to', 'file')).toBe('/path/to/file')
    })

    test('should handle relative paths', () => {
      expect(path.resolve('folder')).toBe('/folder')
      expect(path.resolve('folder/file')).toBe('/folder/file')
    })

    test('should handle empty arguments', () => {
      expect(path.resolve()).toBe('/')
    })
  })

  describe('relative', () => {
    test('should compute relative path between two paths', () => {
      expect(path.relative('/path/to', '/path/to/file')).toBe('file')
      expect(path.relative('/path/to', '/path/from/file')).toBe('../from/file')
    })

    test('should handle Windows-style paths', () => {
      expect(path.relative('C:\\path\\to', 'C:\\path\\to\\file')).toBe('file')
    })

    test('should handle paths without leading slash', () => {
      expect(path.relative('path/to', 'path/to/file')).toBe('file')
      expect(path.relative('path/to', 'path/from/file')).toBe('../from/file')
    })

    test('should handle same paths', () => {
      expect(path.relative('/path/to', '/path/to')).toBe('')
    })

    test('should handle going up directories', () => {
      expect(path.relative('/path/to/deep', '/path/to')).toBe('..')
      expect(path.relative('/path/to/deep/nested', '/path/to')).toBe('../..')
    })
  })

  describe('isBelongTo', () => {
    test('should return true when sub is under path', () => {
      expect(path.isBelongTo('/path/to', '/path/to/file.txt')).toBe(true)
      expect(path.isBelongTo('/path/to', '/path/to/folder/file.txt')).toBe(true)
    })

    test('should return false when sub is not under path', () => {
      expect(path.isBelongTo('/path/to', '/path/from/file.txt')).toBe(false)
      expect(path.isBelongTo('/path/to', '/other/path')).toBe(false)
    })

    test('should handle path with trailing slash', () => {
      expect(path.isBelongTo('/path/to/', '/path/to/file.txt')).toBe(true)
    })

    test('should return false for exact same path', () => {
      expect(path.isBelongTo('/path/to', '/path/to')).toBe(false)
    })

    test('should handle partial path matches correctly', () => {
      // /path/to2 should not be considered under /path/to
      expect(path.isBelongTo('/path/to', '/path/to2/file.txt')).toBe(false)
    })
  })
})
