import * as extension from '@fe/others/extension'

jest.mock('@fe/support/api', () => ({}))
jest.mock('@fe/services/theme', () => ({}))
jest.mock('js-untar', () => ({}))
jest.mock('@fe/support/args', () => ({
  FLAG_DEMO: false,
}))

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
    main: '',
    style: '',
    description: '',
    version: '1.1.2',
    themes: [],
    origin: 'unknown',
    dist: { tarball: '', unpackedSize: 0 },
    icon: '',
    homepage: '',
    license: '',
    readmeUrl: '',
    changelogUrl: '',
    compatible: {
      reason: 'Not yank note extension.',
      value: false,
    },
    requirements: {},
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
    main: '',
    style: '',
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
    readmeUrl: '',
    changelogUrl: '',
    requirements: {},
  })

  expect(extension.readInfoFromJson({
    name: 'test',
    version: '1.1.2',
    engines: {
      'yank-note': '>=3.30.0',
    },
    requirements: { premium: true, terminal: false }
  })).toStrictEqual({
    id: 'test',
    author: { name: '' },
    displayName: 'test',
    main: '',
    style: '',
    description: '',
    version: '1.1.2',
    themes: [],
    origin: 'unknown',
    dist: { tarball: '', unpackedSize: 0 },
    icon: '',
    homepage: '',
    license: '',
    requirements: { premium: true, terminal: false },
    compatible: {
      reason: 'Need Yank Note [>=3.30.0].',
      value: false,
    },
    readmeUrl: '',
    changelogUrl: '',
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
    main: '',
    style: '',
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
    readmeUrl: '',
    changelogUrl: '',
    requirements: {},
  })

  expect(extension.readInfoFromJson({
    name: 'test',
    version: '1.1.2',
    author: { name: 'hello', email: 'xxx@email.com' },
    description: 'HELLO!',
    displayName: 'HELLO',
    'description_ZH-CN': '你好！',
    'displayName_ZH-CN': '你好',
    main: 'test.js',
    style: 'test.css',
    themes: [
      { name: 'a', css: './a.css' },
      { name: 'b', css: './b.css' },
    ],
    readmeUrl: 'readmeUrl',
    changelogUrl: 'changelogUrl',
    origin: 'official',
  })).toStrictEqual({
    id: 'test',
    author: { name: 'hello', email: 'xxx@email.com' },
    main: 'test.js',
    style: 'test.css',
    displayName: '你好',
    description: '你好！',
    version: '1.1.2',
    themes: [
      { name: 'a', css: './a.css' },
      { name: 'b', css: './b.css' },
    ],
    origin: 'official',
    dist: { tarball: '', unpackedSize: 0 },
    icon: '',
    homepage: '',
    license: '',
    compatible: {
      reason: 'Not yank note extension.',
      value: false,
    },
    readmeUrl: 'readmeUrl',
    changelogUrl: 'changelogUrl',
    requirements: {},
  })
})
