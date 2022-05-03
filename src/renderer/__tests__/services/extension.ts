import * as extension from '@fe/others/extension'

jest.mock('@fe/support/api', () => ({}))
jest.mock('@fe/services/theme', () => ({}))
jest.mock('js-untar', () => ({}))

jest.mock('@fe/utils', () => ({
  getLogger: console.log
}))

jest.mock('@fe/services/i18n', () => ({
  getCurrentLanguage: () => 'zh-CN'
}))

jest.mock('@fe/core/action', () => ({
  getActionHandler: () => () => 0
}))

;(global as any).__APP_VERSION__ = '3.29.0'

test('readInfoFromJson', () => {
  expect(extension.readInfoFromJson(undefined)).toBeNull()
  expect(extension.readInfoFromJson({})).toBeNull()
  expect(extension.readInfoFromJson({ name: 'test' })).toBeNull()

  expect(extension.readInfoFromJson({ name: 'test', version: '1.1.2' })).toStrictEqual({
    id: 'test',
    author: { name: '' },
    displayName: 'test',
    main: undefined,
    description: '',
    version: '1.1.2',
    themes: [],
    origin: 'unknown',
    dist: { tarball: '', unpackedSize: 0 },
    icon: '',
    homepage: '',
    license: '',
    compatible: {
      reason: 'Not yank note extension.',
      value: false,
    },
  })

  expect(extension.readInfoFromJson({
    name: 'test',
    version: '1.1.2',
    license: 'MIT',
    engines: {
      'yank-note': '>=3.29.0',
    },
  })).toStrictEqual({
    id: 'test',
    author: { name: '' },
    displayName: 'test',
    main: undefined,
    description: '',
    version: '1.1.2',
    themes: [],
    origin: 'unknown',
    dist: { tarball: '', unpackedSize: 0 },
    icon: '',
    homepage: '',
    license: 'MIT',
    compatible: {
      reason: 'Compatible',
      value: true,
    },
  })

  expect(extension.readInfoFromJson({
    name: 'test',
    version: '1.1.2',
    engines: {
      'yank-note': '>=3.30.0',
    },
  })).toStrictEqual({
    id: 'test',
    author: { name: '' },
    displayName: 'test',
    main: undefined,
    description: '',
    version: '1.1.2',
    themes: [],
    origin: 'unknown',
    dist: { tarball: '', unpackedSize: 0 },
    icon: '',
    homepage: '',
    license: '',
    compatible: {
      reason: 'Need Yank Note [>=3.30.0].',
      value: false,
    },
  })

  expect(extension.readInfoFromJson({
    name: 'test',
    author: 'test <test@t.t>',
    version: '1.1.2',
    description: 'HELLO!',
    displayName: 'HELLO',
  })).toStrictEqual({
    id: 'test',
    author: { name: 'test', email: 'test@t.t' },
    main: undefined,
    displayName: 'HELLO',
    description: 'HELLO!',
    version: '1.1.2',
    themes: [],
    origin: 'unknown',
    dist: { tarball: '', unpackedSize: 0 },
    icon: '',
    homepage: '',
    license: '',
    compatible: {
      reason: 'Not yank note extension.',
      value: false,
    },
  })

  expect(extension.readInfoFromJson({
    name: 'test',
    version: '1.1.2',
    author: { name: 'hello', email: 'xxx@email.com' },
    description: 'HELLO!',
    displayName: 'HELLO',
    'description_ZH-CN': '你好！',
    'displayName_ZH-CN': '你好',
    themes: [
      { name: 'a', css: './a.css' },
      { name: 'b', css: './b.css' },
    ],
  })).toStrictEqual({
    id: 'test',
    author: { name: 'hello', email: 'xxx@email.com' },
    main: undefined,
    displayName: '你好',
    description: '你好！',
    version: '1.1.2',
    themes: [
      { name: 'a', css: './a.css' },
      { name: 'b', css: './b.css' },
    ],
    origin: 'unknown',
    dist: { tarball: '', unpackedSize: 0 },
    icon: '',
    homepage: '',
    license: '',
    compatible: {
      reason: 'Not yank note extension.',
      value: false,
    },
  })
})
