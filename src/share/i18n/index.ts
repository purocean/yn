import get from 'lodash/get'
import merge from 'lodash/merge'
import en, { BaseLanguage } from './languages/en'
import zhCN from './languages/zh-CN'

const languages = {
  en,
  'zh-CN': zhCN
}

export type Flat<T extends Record<string, any>, P extends string = ''> =(
  {
    [K in keyof T as (
      T[K] extends string
      ? (K extends string ? (P extends '' ? K : `${P}.${K}`) : never)
      : (K extends string ? keyof Flat<T[K], P extends '' ? K : `${P}.${K}`> : never)
    )]: never
  }
)

export type Language = keyof typeof languages
export type MsgPath = keyof Flat<BaseLanguage>

export function getText (data: Record<string, any>, path: MsgPath, ...args: string[]): string {
  const text: string = get(data, path, get(en, path, ''))
  if (args.length < 1) {
    return text
  }

  let idx = -1
  return text.replace(/%s/g, () => {
    idx++
    return args[idx] || ''
  })
}

export function translate (lang: Language, path: MsgPath, ...args: string[]) {
  const language = languages[lang] || en

  return getText(language, path, ...args)
}

export function mergeLanguage (lang: Language, nls: Record<string, any>) {
  languages[lang] = merge(languages[lang], nls)
}
