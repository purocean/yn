import { Language, translate } from './i18n'

export const MARKDOWN_FILE_EXT = '.md'
export const ENCRYPTED_MARKDOWN_FILE_EXT = '.c.md'

export const DOC_HISTORY_MAX_CONTENT_LENGTH = 102400

export const ROOT_REPO_NAME_PREFIX = '__root__'

export const DEFAULT_EXCLUDE_REGEX = '^node_modules/$|^\\.git/$|^\\.DS_Store$|^\\.'

export const PREMIUM_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqkiGs7j0xH+RJEHvqZ33
+7nt+tmj5eod4BYbwVWLfoIfAM9dTCUwZkEDEWI2V9W0cYV6eAu4JwKMJqn76jRn
0S87wtT9H6W2zbbvjK2aia/oCkRilNNOMgV9V6P+ZD0VyDVUSBHWJQk3tOSHf/nS
GW2hnKqao+loVyuHQQiYp6Iq3ti4Eu+t88LfpxvVZ5uuKmMLo6LbnOMuTFa9mGUE
R1VuHglANFSi45+45PRHkGlpwjwnlFCTmj137h/djQ//NinJ73CeI3xHD6+Spppy
259/Ksv+uI/zV39VZWsCrhJkc1pRSUXApKxqXbrMUD2z60Wqz3ps+arn9YeHPR/k
DQIDAQAB
-----END PUBLIC KEY-----`

export const API_BASE_URL = 'https://yank-note.com'
export const HOMEPAGE_URL = 'https://yank-note.com'

export function isMarkdownFile (path: string) {
  return path.endsWith(MARKDOWN_FILE_EXT)
}

export function isEncryptedMarkdownFile (path: string) {
  return path.endsWith(ENCRYPTED_MARKDOWN_FILE_EXT)
}

export function getDefaultApplicationAccelerators (platform: NodeJS.Platform, lang: Language = 'en') {
  return [
    {
      command: 'show-main-window',
      accelerator: platform === 'darwin' ? 'Shift+Alt+M' : 'Meta+Alt+N',
      description: translate(lang, 'app.tray.open-main-window')
    },
    {
      command: 'hide-main-window',
      accelerator: null,
      description: translate(lang, 'app.hide-main-window'),
    },
    {
      command: 'open-in-browser',
      accelerator: 'Meta+Shift+B',
      description: translate(lang, 'app.tray.open-in-browser')
    }
  ] as {command: 'show-main-window' | 'hide-main-window' | 'open-in-browser', accelerator: string | null, description: string}[]
}
