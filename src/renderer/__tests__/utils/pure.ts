jest.mock('@fe/support/args', () => ({
  FLAG_DEMO: false,
  FLAG_DEBUG: false,
}))

import {
  quote,
  encodeMarkdownLink,
  escapeMd,
  removeQuery,
  dataURLtoBlob,
  fileToBase64URL,
  sleep,
  objectInsertAfterKey,
  waitCondition,
} from '@fe/utils/pure'

describe('pure utilities', () => {
  describe('quote', () => {
    test('should wrap string with default backticks', () => {
      expect(quote('test')).toBe('`test`')
      expect(quote('hello world')).toBe('`hello world`')
    })

    test('should wrap string with custom quote character', () => {
      expect(quote('test', '"')).toBe('"test"')
      expect(quote('test', "'")).toBe("'test'")
    })

    test('should escape backslashes', () => {
      expect(quote('path\\to\\file')).toBe('`path\\\\to\\\\file`')
    })

    test('should escape the quote character', () => {
      expect(quote('it`s', '`')).toBe('`it\\`s`')
      expect(quote('say "hello"', '"')).toBe('"say \\"hello\\""')
    })

    test('should handle empty string', () => {
      expect(quote('')).toBe('``')
      expect(quote('', '"')).toBe('""')
    })
  })

  describe('encodeMarkdownLink', () => {
    test('should encode parentheses', () => {
      expect(encodeMarkdownLink('file(1).md')).toBe('file%281%29.md')
      expect(encodeMarkdownLink('test(test)')).toBe('test%28test%29')
    })

    test('should encode spaces', () => {
      expect(encodeMarkdownLink('my file.md')).toBe('my%20file.md')
      expect(encodeMarkdownLink('file with spaces')).toBe('file%20with%20spaces')
    })

    test('should encode both parentheses and spaces', () => {
      expect(encodeMarkdownLink('my file (1).md')).toBe('my%20file%20%281%29.md')
    })

    test('should handle strings without special characters', () => {
      expect(encodeMarkdownLink('normal-file.md')).toBe('normal-file.md')
    })

    test('should handle empty string', () => {
      expect(encodeMarkdownLink('')).toBe('')
    })
  })

  describe('escapeMd', () => {
    test('should escape markdown special characters', () => {
      expect(escapeMd('*bold*')).toBe('\\*bold\\*')
      expect(escapeMd('#heading')).toBe('\\#heading')
      expect(escapeMd('_italic_')).toBe('\\_italic\\_')
      expect(escapeMd('`code`')).toBe('\\`code\\`')
    })

    test('should escape multiple special characters', () => {
      expect(escapeMd('*#/()[]_`')).toBe('\\*\\#\\/\\(\\)\\[\\]\\_\\`')
    })

    test('should handle strings without special characters', () => {
      expect(escapeMd('plain text')).toBe('plain text')
    })

    test('should handle empty string', () => {
      expect(escapeMd('')).toBe('')
    })
  })

  describe('removeQuery', () => {
    test('should remove query string', () => {
      expect(removeQuery('http://example.com?param=value')).toBe('http://example.com')
      expect(removeQuery('/path/to/file?query=test')).toBe('/path/to/file')
    })

    test('should remove hash', () => {
      expect(removeQuery('http://example.com#section')).toBe('http://example.com')
      expect(removeQuery('/path/to/file#anchor')).toBe('/path/to/file')
    })

    test('should remove both query and hash, keeping the earlier one', () => {
      expect(removeQuery('http://example.com?query=test#section')).toBe('http://example.com')
      expect(removeQuery('http://example.com#section?query=test')).toBe('http://example.com')
    })

    test('should handle URL without query or hash', () => {
      expect(removeQuery('http://example.com')).toBe('http://example.com')
      expect(removeQuery('/path/to/file')).toBe('/path/to/file')
    })

    test('should handle empty string', () => {
      expect(removeQuery('')).toBe('')
    })
  })

  describe('dataURLtoBlob', () => {
    test('should convert data URL to Blob', () => {
      const dataURL = 'data:text/plain;base64,SGVsbG8gV29ybGQ='
      const blob = dataURLtoBlob(dataURL)
      
      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('text/plain')
    })

    test('should handle image data URL', () => {
      // 1x1 transparent PNG
      const dataURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      const blob = dataURLtoBlob(dataURL)
      
      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('image/png')
      expect(blob.size).toBeGreaterThan(0)
    })
  })

  describe('fileToBase64URL', () => {
    test.skip('should convert File to base64 URL', async () => {
      // Skipped: requires browser FileReader API
      const file = new File(['Hello World'], 'test.txt', { type: 'text/plain' })
      const base64URL = await fileToBase64URL(file)
      
      expect(base64URL).toContain('data:text/plain;base64,')
      expect(base64URL).toContain('SGVsbG8gV29ybGQ=')
    })

    test.skip('should convert Blob to base64 URL', async () => {
      // Skipped: requires browser FileReader API
      const blob = new Blob(['Test content'], { type: 'text/plain' })
      const base64URL = await fileToBase64URL(blob)
      
      expect(base64URL).toContain('data:text/plain;base64,')
      expect(base64URL).toContain('VGVzdCBjb250ZW50')
    })

    test.skip('should handle empty file', async () => {
      // Skipped: requires browser FileReader API
      const file = new File([], 'empty.txt', { type: 'text/plain' })
      const base64URL = await fileToBase64URL(file)
      
      expect(base64URL).toContain('data:text/plain;base64,')
    })
  })

  describe('sleep', () => {
    test('should resolve after specified milliseconds', async () => {
      const start = Date.now()
      await sleep(100)
      const end = Date.now()
      
      expect(end - start).toBeGreaterThanOrEqual(95) // Allow small variance
    })

    test('should resolve immediately for 0ms', async () => {
      const start = Date.now()
      await sleep(0)
      const end = Date.now()
      
      expect(end - start).toBeLessThan(50)
    })
  })

  describe('objectInsertAfterKey', () => {
    test('should insert content after specified key', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const result = objectInsertAfterKey(obj, 'b', { x: 10, y: 20 })
      
      expect(Object.keys(result)).toEqual(['a', 'b', 'x', 'y', 'c'])
      expect(result).toEqual({ a: 1, b: 2, x: 10, y: 20, c: 3 })
    })

    test('should not modify object if key not found', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const result = objectInsertAfterKey(obj, 'z', { x: 10 })
      
      expect(Object.keys(result)).toEqual(['a', 'b', 'c'])
      expect(result).toEqual({ a: 1, b: 2, c: 3 })
    })

    test('should insert after first key', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const result = objectInsertAfterKey(obj, 'a', { x: 10 })
      
      expect(Object.keys(result)).toEqual(['a', 'x', 'b', 'c'])
    })

    test('should insert after last key', () => {
      const obj = { a: 1, b: 2, c: 3 }
      const result = objectInsertAfterKey(obj, 'c', { x: 10 })
      
      expect(Object.keys(result)).toEqual(['a', 'b', 'c', 'x'])
    })

    test('should handle empty content object', () => {
      const obj = { a: 1, b: 2 }
      const result = objectInsertAfterKey(obj, 'a', {})
      
      expect(result).toEqual({ a: 1, b: 2 })
    })
  })

  describe('waitCondition', () => {
    test('should resolve when condition becomes true', async () => {
      let flag = false
      setTimeout(() => { flag = true }, 50)
      
      await waitCondition(() => flag, 10, 1000)
      expect(flag).toBe(true)
    })

    test('should resolve immediately if condition is already true', async () => {
      const start = Date.now()
      await waitCondition(() => true, 10, 1000)
      const end = Date.now()
      
      expect(end - start).toBeLessThan(50)
    })

    test('should timeout if condition never becomes true', async () => {
      await expect(
        waitCondition(() => false, 10, 100)
      ).rejects.toThrow('waitCondition timeout')
    })

    test('should be cancellable', async () => {
      const promise: any = waitCondition(() => false, 10, 10000)
      
      setTimeout(() => promise.cancel(), 50)
      
      await expect(promise).rejects.toThrow('waitCondition canceled')
    })

    test('should work with async condition function', async () => {
      let flag = false
      setTimeout(() => { flag = true }, 50)
      
      await waitCondition(async () => Promise.resolve(flag), 10, 1000)
      expect(flag).toBe(true)
    })

    test('should check condition multiple times', async () => {
      let counter = 0
      
      await waitCondition(() => {
        counter++
        return counter >= 3
      }, 10, 1000)
      
      expect(counter).toBeGreaterThanOrEqual(3)
    })
  })
})
