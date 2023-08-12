import { escapeRegExp } from 'lodash-es'

interface Opts {
  caseSensitive?: boolean;
  regex?: boolean;
}

export interface IFindInContent {
  exec(pattern: string, opts: Opts): void;
  getStats(): { count: number, current: number }
  next(): boolean;
  prev(): boolean;
}

export class BrowserFindInContent implements IFindInContent {
  private _matchCount = 0;
  private _win: Window;
  private _maxMatchCount: number;
  private _maxMatchTime: number;
  private _wrapAround = false
  private _matches: string[] = []
  private _currentMatchIndex = 0
  private _opts: Opts = {}
  private _pattern = ''
  private _exceed = false

  constructor (win: Window, opts?: { maxMatchCount?: number, maxMatchTime?: number, wrapAround?: boolean }) {
    this._win = win
    this._maxMatchCount = opts?.maxMatchCount || 3000
    this._maxMatchTime = opts?.maxMatchTime || 3000
    this._wrapAround = !!opts?.wrapAround
  }

  exec (pattern: string, opts: Opts) {
    this._opts = opts
    this._pattern = pattern
    this._matchCount = 0
    this._currentMatchIndex = 0
    this._matches = []
    this._exceed = false

    if (!pattern) {
      return
    }

    const { caseSensitive, regex } = opts
    const flags = caseSensitive ? 'g' : 'gi'
    const re = regex ? new RegExp(pattern, flags) : new RegExp(escapeRegExp(pattern), flags)
    // innerText will not return the text of hidden elements, and strip out tags while preserving newlines.
    const content = this._win.document.body.innerText

    const startTime = Date.now()
    let match
    while ((match = re.exec(content))) {
      if (Date.now() - startTime > this._maxMatchTime) {
        console.warn(`BrowserFindInContent: Reached maximum match time of ${this._maxMatchTime}ms.`)
        this._exceed = true
        break
      }

      if (this._matchCount >= this._maxMatchCount) {
        console.warn(`BrowserFindInContent: Reached maximum match count of ${this._maxMatchCount}.`)
        this._exceed = true
        break
      }

      this._matchCount++
      if (regex) {
        this._matches.push(match[0])
      }
    }
  }

  getStats () {
    return {
      count: this._matchCount,
      current: this._currentMatchIndex,
      exceed: this._exceed,
    }
  }

  next (): boolean {
    return this._search(false)
  }

  prev (): boolean {
    return this._search(true)
  }

  private _search (backward: boolean): boolean {
    this._win.document.body.focus()
    let pattern = this._pattern

    let index = this._currentMatchIndex + (backward ? -1 : 1)
    if (index < 0) {
      index = 0
    }

    if (this._opts.regex) {
      pattern = this._matches[index % this._matches.length]
    }

    console.log('BrowserFindInContent: Searching for pattern', pattern, 'index', index)

    if (!pattern) {
      return true
    }

    const found = (this._win as any).find(
      pattern,
      !!(this._opts.caseSensitive),
      backward,
      !!this._wrapAround
    )

    if (found || this._opts.regex) {
      this._currentMatchIndex = index
    }

    return found
  }
}
