import { app } from 'electron'
import { Language, MsgPath, translate } from '../share/i18n'
import { getAction, registerAction } from './action'
import config from './config'

export type LanguageName = 'system' | Language

let lang: LanguageName = config.get('language', 'system')

export function $t (path: MsgPath, ...args: string[]) {
  return translate(lang === 'system' ? app.getLocale() as any : lang, path, ...args)
}

export function setLanguage (language?: LanguageName) {
  lang = language || 'system'
  getAction('refresh-menus')()
}

registerAction('i18n.change-language', setLanguage)
