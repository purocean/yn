import { getAction } from './action'

export type ActionName = 'editor.get-editor'
  | 'editor.insert-value'
  | 'editor.replace-value'
  | 'editor.get-line'
  | 'editor.replace-line'
  | 'editor.toggle-wrap'

export const getEditor = () => getAction('editor.get-editor')()
export const insertValue = (str: string) => getAction('editor.insert-value')(str)
export const replaceValue = (search: string, replace: string) => getAction('editor.replace-value')(search, replace)
export const getLine = (line: number) => getAction('editor.get-line')(line) as string
export const replaceLine = (line: number, str: string) => getAction('editor.replace-line')(line, str)
export const toggleWrap = () => getAction('editor.toggle-wrap')()
