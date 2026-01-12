import {
  getText,
  translate,
  mergeLanguage,
  type Language,
} from '../i18n'

describe('i18n utilities', () => {
  describe('getText', () => {
    test('should get text from data object using path', () => {
      const data = {
        app: {
          name: 'Test App',
          version: '1.0.0'
        }
      }
      expect(getText(data, 'app.name' as any)).toBe('Test App')
      expect(getText(data, 'app.version' as any)).toBe('1.0.0')
    })

    test('should return default text for non-existent path', () => {
      const data = {}
      const result = getText(data, 'app.name' as any)
      expect(typeof result).toBe('string')
    })

    test('should replace %s placeholders with arguments', () => {
      const data = {
        message: 'Hello %s, you have %s messages'
      }
      expect(getText(data, 'message' as any, 'John', '5')).toBe('Hello John, you have 5 messages')
    })

    test('should replace multiple %s placeholders in order', () => {
      const data = {
        template: '%s + %s = %s'
      }
      expect(getText(data, 'template' as any, '1', '2', '3')).toBe('1 + 2 = 3')
    })

    test('should handle extra arguments gracefully', () => {
      const data = {
        message: 'Hello %s'
      }
      expect(getText(data, 'message' as any, 'World', 'Extra')).toBe('Hello World')
    })

    test('should handle missing arguments with empty string', () => {
      const data = {
        message: 'Hello %s and %s'
      }
      expect(getText(data, 'message' as any, 'World')).toBe('Hello World and ')
    })

    test('should return text as-is when no arguments provided', () => {
      const data = {
        message: 'Simple message'
      }
      expect(getText(data, 'message' as any)).toBe('Simple message')
    })
  })

  describe('translate', () => {
    test('should translate using English language', () => {
      const result = translate('en', 'app.quit' as any)
      expect(typeof result).toBe('string')
      expect(result).toBeTruthy()
    })

    test('should translate using Chinese language', () => {
      const result = translate('zh-CN', 'app.quit' as any)
      expect(typeof result).toBe('string')
      expect(result).toBeTruthy()
    })

    test('should translate using Traditional Chinese language', () => {
      const result = translate('zh-TW', 'app.quit' as any)
      expect(typeof result).toBe('string')
      expect(result).toBeTruthy()
    })

    test('should translate using Russian language', () => {
      const result = translate('ru', 'app.quit' as any)
      expect(typeof result).toBe('string')
      expect(result).toBeTruthy()
    })

    test('should handle invalid language by defaulting to English', () => {
      const result = translate('invalid' as Language, 'app.quit' as any)
      expect(typeof result).toBe('string')
      expect(result).toBeTruthy()
    })

    test('should support string replacement in translation', () => {
      const result = translate('en', 'premium.need-purchase' as any, 'Feature')
      expect(typeof result).toBe('string')
      expect(result).toBeTruthy()
    })
  })

  describe('mergeLanguage', () => {
    test('should merge custom language data into existing language', () => {
      const customData = {
        custom: {
          greeting: 'Custom Hello'
        }
      }

      mergeLanguage('en', customData)
      const result = translate('en', 'custom.greeting' as any)
      expect(result).toBe('Custom Hello')
    })

    test('should override existing translations', () => {
      const originalText = translate('en', 'app.quit' as any)
      const customData = {
        app: {
          quit: 'Custom Quit Text'
        }
      }

      mergeLanguage('en', customData)
      const newText = translate('en', 'app.quit' as any)
      expect(newText).toBe('Custom Quit Text')

      // Restore original - merge with empty object won't restore, but this shows the override worked
      expect(newText).not.toBe(originalText)
    })

    test('should merge deeply nested objects', () => {
      const customData = {
        deeply: {
          nested: {
            value: 'Deep Value'
          }
        }
      }

      mergeLanguage('en', customData)
      const result = translate('en', 'deeply.nested.value' as any)
      expect(result).toBe('Deep Value')
    })

    test('should work with different languages', () => {
      const customDataCN = {
        custom: {
          message: '自定义消息'
        }
      }

      mergeLanguage('zh-CN', customDataCN)
      const result = translate('zh-CN', 'custom.message' as any)
      expect(result).toBe('自定义消息')
    })
  })
})
