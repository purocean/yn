<template>
  <transition name="search-panel-wrapper">
    <div v-show="visible" class="search-panel-wrapper" tabindex="-1" @keydown.esc="close" @click.self="close">
      <transition name="search-panel">
        <div v-if="visible" :class="{'search-panel': true, 'replace-visible': isReplaceVisible, replacing}">
          <div class="title">{{$t(isReplaceVisible ? 'search-panel.replace-files' : 'search-panel.search-files')}}</div>
          <div class="circle-btn replace-btn" :class="{ active: isReplaceVisible }" @click="isReplaceVisible = !isReplaceVisible" :title="$t('search-panel.placeholder-replace')">
            <svg-icon class="replace-btn-icon" name="pen-solid" width="10px" />
          </div>
          <div class="circle-btn close-btn" @click="close" :title="$t('close')">
            <svg-icon class="close-btn-icon" name="times" width="8px" />
          </div>
          <div class="search">
            <div class="search-row">
              <textarea
                class="search-input search-pattern"
                ref="patternInputRef"
                v-model="pattern"
                type="text"
                rows="1"
                v-up-down-history
                v-placeholder="{
                  blur: $t('search-panel.placeholder-search'),
                  focus: $t('search-panel.placeholder-search') + ' ' + $t('search-panel.for-history')
                }"
                v-auto-resize="{ maxRows: 6, minRows: 1 }"
                v-textarea-on-enter="search"
              />
              <div class="option-btns">
                <div
                  :class="{'option-btn': true, active: option.isCaseSensitive}"
                  :title="$t('search-panel.match-case')"
                  @click="toggleOption('isCaseSensitive')
                ">
                  <svg-icon name="codicon-case-sensitive" width="15px" />
                </div>
                <div
                  :class="{'option-btn': true, active: option.isWordMatch}"
                  :title="$t('search-panel.match-whole-word')"
                  @click="toggleOption('isWordMatch')"
                >
                  <svg-icon name="codicon-whole-word" width="15px" />
                </div>
                <div
                  :class="{'option-btn': true, active: option.isRegExp}"
                  :title="$t('search-panel.use-regex')"
                  @click="toggleOption('isRegExp')"
                >
                  <svg-icon name="codicon-regex" width="15px" />
                </div>
              </div>
            </div>
            <div v-if="isReplaceVisible" class="search-row replace-row">
              <textarea
                class="search-input search-replace"
                v-model="replaceText"
                type="text"
                rows="1"
                v-up-down-history
                v-placeholder="{
                  blur: $t('search-panel.placeholder-replace'),
                  focus: $t('search-panel.placeholder-replace') + ' ' + $t('search-panel.for-history')
                }"
                v-auto-resize="{ maxRows: 6, minRows: 1 }"
                v-textarea-on-enter="search"
              />
              <div class="option-btns">
                <div class="option-btn" :title="$t('search-panel.replace-all')" @click="replaceAll">
                  <svg-icon name="codicon-search-replace-all" width="15px" />
                </div>
              </div>
            </div>
            <div class="search-input-label">{{$t('search-panel.files-to-include')}}</div>
            <input
              class="search-input"
              type="text"
              v-model="include"
              v-textarea-on-enter="search"
              v-up-down-history
              v-placeholder="{
                blur: '',
                focus: 'e.g. a.md,foo/**/include ' + $t('search-panel.for-history')
              }"
            />
            <div class="search-input-label">{{$t('search-panel.files-to-exclude')}}</div>
            <input
              class="search-input"
              type="text"
              v-model="exclude"
              v-textarea-on-enter="search"
              v-up-down-history
              v-placeholder="{
                blur: '',
                focus: 'e.g. b.md,bar/**/exclude ' + $t('search-panel.for-history')
              }"
            />
          </div>
          <div class="message-wrapper">
            <div v-if="typeof message === 'string'" class="message">{{message}}</div>
            <div v-else class="message"><component :is="message" /></div>
            <a v-if="loadingVisible || replacing" class="action-btn" href="javascript:void(0)" @click="stop">{{$t('cancel')}}</a>
            <a
              v-else-if="result.length > 1"
              class="action-btn"
              href="javascript:void(0)"
              @click="toggleExpandAll()"
            >{{ $t(allResultCollapsed ? 'search-panel.expand-all' : 'search-panel.collapse-all') }}</a>
          </div>
          <div class="results" ref="resultsRef" v-if="result.length > 0">
            <details
              class="item"
              v-for="item in result"
              :key="item.path"
              :open="item.open"
              @toggle="(e: any) => item.open = e.target.open"
            >
              <summary :title="item.path" :data-status="replaceResult[item.path]?.status">
                <div class="item-info">
                  <span class="item-name">{{basename(item.path)}}</span>
                  <span class="item-dir">{{dirname(item.path)}}</span>
                </div>
                <div class="item-badge">{{item.numMatches}}</div>
                <div v-if="replaceResult[item.path]" class="item-badge replace-status" :title="replaceResult[item.path].msg">
                  <svg-icon v-if="replaceResult[item.path].status === 'doing'" name="sync-alt-solid" width="8px" height="8px" />
                  <svg-icon v-else-if="replaceResult[item.path].status === 'done'" name="check-solid" width="8px" height="8px" />
                  <svg-icon v-else name="triangle-exclamation-solid" width="8px" height="10px" />
                </div>
              </summary>
              <div v-if="item.open" class="matches">
                <div
                  :class="{match: true, active: currentItemKey === match.key}"
                  v-for="match of (item.results as any)"
                  :key="match.key"
                  @click="chooseMatch(item as any, match, 0)"
                >
                <component
                  v-for="(fragment, i) in markText(match.preview.text, match.preview.matches)"
                  :key="i"
                  :is="fragment.type">{{fragment.value}}</component>
                </div>
              </div>
            </details>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script lang="ts" setup>
/* eslint-disable no-labels */
import { escapeRegExp, throttle } from 'lodash-es'
import { computed, Fragment, h, nextTick, onBeforeUnmount, reactive, ref, shallowRef, Text, watch } from 'vue'
import type { ISearchRange, ISerializedFileMatch, ISerializedSearchSuccess, ITextQuery, ITextSearchMatch } from 'ripgrep-wrapper'
import { getLogger, sleep } from '@fe/utils'
import { basename, dirname, join, relative } from '@fe/utils/path'
import { registerAction, removeAction } from '@fe/core/action'
import { CtrlCmd, Shift } from '@fe/core/keybinding'
import { useLazyRef } from '@fe/utils/composable'
import * as api from '@fe/support/api'
import store from '@fe/support/store'
import { isEncryptedMarkdownFile, isMarkdownFile } from '@share/misc'
import { useToast } from '@fe/support/ui/toast'
import { useModal } from '@fe/support/ui/modal'
import { switchDoc } from '@fe/services/document'
import * as editor from '@fe/services/editor'
import * as view from '@fe/services/view'
import { useI18n } from '@fe/services/i18n'
import { getSetting, showSettingPanel } from '@fe/services/setting'
import { toggleSide } from '@fe/services/layout'
import type { FindInRepositoryQuery, PathItem } from '@fe/types'
import SvgIcon from './SvgIcon.vue'

const MAX_RESULTS = 2000
const SEARCH_LIMIT_SETTING_KEY = 'search.number-limit'

const logger = getLogger('search-panel')
const toast = useToast()
const { t } = useI18n()

const patternInputRef = ref<HTMLInputElement>()
const pattern = ref('')
const include = ref('')
const exclude = ref('')
const option = reactive({
  isRegExp: false,
  isWordMatch: false,
  isCaseSensitive: false,
})

const resultsRef = ref<HTMLElement>()
const loading = ref(false)
const loadingVisible = useLazyRef(loading, val => val ? 200 : -1)
const result = ref<(ISerializedFileMatch & { open: boolean })[]>([])
const success = shallowRef<ISerializedSearchSuccess | null>(null)
const outputMessage = shallowRef('')
const currentItemKey = ref('')
const visible = ref(false)
const isReplaceVisible = ref(false)
const replaceText = ref('')
const replaceSearchRegex = shallowRef<RegExp | boolean>(false)
const replacing = ref(false)
const replaceResult = ref<Record<string, { msg: string, status: 'doing' | 'error' | 'done' }>>({})

const message = computed(() => {
  if ((replacing.value || Object.keys(replaceResult.value).length > 0) && result.value.length) {
    let done = 0
    let error = 0
    let doing = 0
    const total = result.value.length

    for (const key in replaceResult.value) {
      const status = replaceResult.value[key].status
      if (status === 'done') {
        done++
      } else if (status === 'doing') {
        doing++
      } else if (status === 'error') {
        error++
      }
    }

    if (replacing.value) {
      return `Replacing ${done + error + doing} / ${total} files`
    } else if (error > 0) {
      return `Replaced ${done + error} / ${total} files, ${error} files failed`
    } else {
      return `Replaced ${done} files`
    }
  }

  if (outputMessage.value) {
    return outputMessage.value
  }

  if (result.value.length === 0) {
    return success.value ? 'No results found' : (loadingVisible.value ? 'Searching...' : '')
  }

  const results = result.value.reduce((acc, cur) => acc + (cur.numMatches || 0), 0)

  if (success?.value?.limitHit) {
    return h(Fragment, [
      h(Text, `${results} results in ${result.value.length} files - `),
      h('a', { href: 'javascript:void(0)', onClick: () => showSettingPanel(SEARCH_LIMIT_SETTING_KEY) }, 'limited'),
    ])
  } else {
    return `${results} results in ${result.value.length} files`
  }
})

const allResultCollapsed = computed(() => {
  return result.value.every(item => !item.open)
})

watch(() => store.state.currentRepo, () => {
  stop()
  result.value = []
  cleanReplaceResult()
})

watch(isReplaceVisible, (val) => {
  buildReplaceRegex()

  if (!val) {
    cleanReplaceResult()
  }
})

let controller: AbortController | null = null

async function stop () {
  logger.debug('stop')
  success.value = null
  loading.value = false
  replacing.value = false

  if (controller) {
    controller.abort()
    sleep(100)
    controller = null
  }
}

async function search () {
  const folder = store.state.currentRepo?.path
  const repo = store.state.currentRepo?.name
  if (!folder || !repo) {
    toast.show('warning', 'Please choose a repository first')
    return
  }

  buildReplaceRegex()
  cleanReplaceResult()

  await stop()

  if (!pattern.value) {
    loading.value = false
    result.value = []
    return
  }

  const buildGlobObject = (str: string) => {
    const expandGlobalGlob = (pattern: string) => {
      const patterns = [
        `**/${pattern}/**`,
        `**/${pattern}`
      ]

      return patterns.map(p => p.replace(/\*\*\/\*\*/g, '**'))
    }

    const normalizeGlobPattern = (pattern: string) => {
      return pattern.trim()
        .replace(/\\/g, '/')
        .replace(/^\.\//, '')
        .replace(/\/+$/g, '')
        .replace(/^\/|\/$/, '')
    }

    const obj: Record<string, boolean> = {}
    str.split(',')
      .map(normalizeGlobPattern)
      .filter(Boolean)
      .forEach(s => {
        const patterns = expandGlobalGlob(s)
        patterns.forEach(p => { obj[p] = true })
      })

    return obj
  }

  const isMultiline = (pattern: string, isRegExp: boolean) => {
    const isMultilineRegexSource = (searchString: string) => {
      if (!searchString || searchString.length === 0) {
        return false
      }

      for (let i = 0, len = searchString.length; i < len; i++) {
        const chCode = searchString.charCodeAt(i)

        if (chCode === 10 /* \n */) {
          return true
        }

        if (chCode === 92 /* \ */) {
          // move to next char
          i++

          if (i >= len) {
            // string ends with a \
            break
          }

          const nextChCode = searchString.charCodeAt(i)
          if (
            nextChCode === 110 || // \n
            nextChCode === 114 || // \r
            nextChCode === 87 // \W
          ) {
            return true
          }
        }
      }

      return false
    }

    if (isRegExp && isMultilineRegexSource(pattern)) {
      return true
    }

    if (pattern.indexOf('\n') >= 0) {
      return true
    }

    return false
  }

  controller = new AbortController()
  const query: ITextQuery = {
    contentPattern: {
      pattern: option.isRegExp ? pattern.value.replace(/\r?\n/g, '\\n') : pattern.value,
      isRegExp: option.isRegExp,
      isWordMatch: option.isWordMatch,
      isCaseSensitive: option.isCaseSensitive,
      isMultiline: isMultiline(pattern.value, option.isRegExp)
    },
    folderQueries: [
      {
        folder,
        includePattern: buildGlobObject(include.value || '*.md'),
        excludePattern: buildGlobObject(exclude.value),
      },
    ],
    maxResults: Math.min(MAX_RESULTS, getSetting(SEARCH_LIMIT_SETTING_KEY, 700)),
  }

  try {
    loading.value = true
    result.value = []
    outputMessage.value = ''
    const receiveResult = await api.search(controller, query)
    success.value = await receiveResult(
      (data) => {
        result.value = [
          ...result.value,
          ...data.map((item) => ({
            repo,
            open: true,
            numMatches: item.numMatches,
            results: (item.results!).map((match: any, i) => ({
              ...match,
              key: `${item.path}:${i}`,
            })),
            path: join('/', relative(folder, item.path)),
          })),
        ]
      },
      (data) => {
        logger.debug('onMessage', data)
        if (data.message && data.message.includes('regex engine error')) {
          outputMessage.value = data.message.replace(/^~{10,}$/gm, '~~~~~~~~~~~~~~~~~~')
        }
      },
    )
  } catch {
    // ignore error
  } finally {
    loading.value = false
  }
}

async function buildReplaceRegex () {
  if (!isReplaceVisible.value) {
    replaceSearchRegex.value = false
    return
  }

  const { isRegExp, isWordMatch, isCaseSensitive } = option

  if (isReplaceVisible.value) {
    let searchPattern = pattern.value

    // If a simple replacement can be done, avoid using regular expressions.
    if (!isRegExp && !isWordMatch && isCaseSensitive) {
      replaceSearchRegex.value = true
      return
    }

    if (!isRegExp) {
      searchPattern = escapeRegExp(searchPattern)
    }

    if (isWordMatch) {
      searchPattern = `\\b${searchPattern}\\b`
    }

    try {
      replaceSearchRegex.value = new RegExp(searchPattern, isCaseSensitive ? undefined : 'i')
    } catch {
      replaceSearchRegex.value = false
    }
  } else {
    replaceSearchRegex.value = false
  }
}

function toggleOption (key: keyof typeof option) {
  option[key] = !option[key]
  patternInputRef.value?.focus()
  search()
}

function cleanReplaceResult () {
  replaceResult.value = {}
  replacing.value = false
}

function close () {
  if (replacing.value) {
    return
  }

  cleanReplaceResult()

  visible.value = false
  stop()
}

async function chooseMatch (result: ISerializedFileMatch & { repo: string }, match: ITextSearchMatch & { key: string }, idx: number) {
  const { path, repo } = result
  const range = (match.ranges as ISearchRange[])[idx]

  if (!range) {
    return
  }

  currentItemKey.value = match.key
  const lines: [number, number] = [
    range.startLineNumber + 1,
    range.endLineNumber + 1,
  ]

  logger.debug('chooseMatch', path, lines)

  await switchDoc({ type: 'file', path, repo, name: basename(path) })
  await sleep(100)

  if (editor.isDefault()) {
    editor.highlightLine(lines, true, 1000)
    editor.getEditor().setSelection({
      startLineNumber: range.startLineNumber + 1,
      startColumn: range.startColumn + 1,
      endLineNumber: range.endLineNumber + 1,
      endColumn: range.endColumn + 1,
    })
    editor.getEditor().focus()
  }

  await view.highlightLine(lines[0], true, 1000)
}

function toggleExpandAll (val?: boolean) {
  const open = typeof val === 'boolean' ? val : allResultCollapsed.value
  result.value = result.value.map(r => ({ ...r, open }))
}

const scrollReplacingItem = throttle(() => {
  const isElementInViewport = (el: HTMLElement, container: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    return (
      rect.top >= containerRect.top &&
        rect.left >= containerRect.left &&
        rect.bottom <= containerRect.bottom &&
        rect.right <= containerRect.right
    )
  }

  const currentEl = resultsRef.value?.querySelector('summary[data-status="doing"]') as HTMLElement
  if (currentEl) {
    if (!isElementInViewport(currentEl, resultsRef.value!)) {
      currentEl.scrollIntoView({ block: 'start', behavior: 'instant' })
    }
  }
}, 100, { leading: false, trailing: true })

async function replaceAll () {
  if (loading.value) return // searching

  await search() // do search first to get all the files

  if (!controller) return // search aborted

  const repo = store.state.currentRepo?.name
  if (!repo) return

  const files = result.value.map(item => item.path)

  if (files.length === 0) {
    useToast().show('warning', 'No files to replace')
    return
  }

  if (!(await useModal().confirm({
    title: t('search-panel.replace-confirm-title'),
    content: t('search-panel.replace-confirm-content', String(files.length)),
  }))) {
    return
  }

  cleanReplaceResult()

  if (replaceSearchRegex.value === false) return

  const searchPattern = replaceSearchRegex.value === true
    ? pattern.value
    : new RegExp(replaceSearchRegex.value.source, replaceSearchRegex.value.flags + 'g')

  toggleExpandAll(false)
  replacing.value = true
  for (const file of files) {
    if (!replacing.value) break

    try {
      if (!isMarkdownFile(file) || isEncryptedMarkdownFile(file)) {
        throw new Error('Do not support replace in this file, markdown only')
      }

      replaceResult.value[file] = { msg: 'Replacing...', status: 'doing' }
      scrollReplacingItem()

      const doc: PathItem = { path: file, repo }
      const res = await api.readFile(doc)
      if (!res.writeable) throw new Error('File is not writeable')
      if (!replacing.value) throw new Error('Replace canceled')

      const content = res.content.replaceAll(searchPattern, replaceText.value)
      await api.writeFile({
        path: doc.path,
        repo: doc.repo,
        contentHash: res.hash,
      }, content)

      replaceResult.value[file] = { msg: 'Replaced', status: 'done' }
    } catch (error) {
      logger.error('replaceAll', error)
      replaceResult.value[file] = { msg: String(error), status: 'error' }
    }
  }

  replacing.value = false
}

function markText (text: string, ranges: ISearchRange[]) {
  const lines = text.split('\n')
  const result: {type: 'span' | 'mark' | 'del' | 'ins' | 'br', value?: string }[] = []

  const previousChars = 20
  const maxPreviewLength = 300
  let contentLength = 0
  let hasMarked = false

  const pushResult = (type: Exclude<typeof result[number]['type'], 'del' | 'ins'>, value?: string): boolean => {
    // exceed max preview length and we have marked text, stop build the result
    if (hasMarked && contentLength >= maxPreviewLength) {
      return false
    }

    // exceed max preview length and we have no marked text, process the unmarked text to keep the last span 20 chars
    if (!hasMarked && contentLength > previousChars) {
      let length = 0
      for (let i = result.length - 1; i >= 0; i--) {
        const item = result[i]
        if (item.type === 'span') {
          length += item.value!.length
        } else if (item.type === 'br') {
          length += 1
        }

        if (length >= previousChars) {
          if (item.type === 'br') {
            result.splice(0, i + 1) // remove items before the br
            contentLength -= length
            break
          } else if (item.type === 'span') {
            const lastSpanLength = item.value!.length
            const keepChars = previousChars - (length - lastSpanLength)
            item.value = '...' + item.value!.slice(-keepChars)
            contentLength -= lastSpanLength - keepChars
            break
          }
        }
      }
    }

    if (type === 'br') {
      contentLength++
      result.push({ type })
      return true
    }

    if (type === 'mark') {
      hasMarked = true
    }

    if (!value) {
      return true
    }

    const pushText = (type: Exclude<typeof result[number]['type'], 'br'>, text: string) => {
      const value = (text.length + contentLength > maxPreviewLength)
        ? (type === 'span' && !hasMarked)
            ? '...' + text.slice(-maxPreviewLength + contentLength)
            : text.slice(0, maxPreviewLength - contentLength) + '...'
        : text
      result.push({ type, value })
      contentLength += value.length
    }

    if (type === 'mark') {
      const replaceRegex = replaceSearchRegex.value
      if (replaceRegex) {
        pushText('del', value)

        const replacedVal = replaceRegex === true
          ? replaceText.value
          : value.replace(replaceRegex, replaceText.value)

        if (replacedVal) {
          result.push({
            type: 'ins',
            value: replacedVal.length > 200 ? replacedVal.slice(0, 200) + '...' : replacedVal,
          })
        }
      } else {
        pushText('mark', value)
      }
    } else {
      pushText(type, value)
    }

    return true
  }

  let lastLine = 0
  let lastColumn = 0

  for (const range of ranges) {
    const start = range.startLineNumber
    const end = range.endLineNumber
    const startOffset = range.startColumn
    const endOffset = range.endColumn

    if (start < lastLine) {
      continue
    }

    if (start === lastLine && startOffset < lastColumn) {
      continue
    }

    // process previous lines
    if (start > lastLine) {
      const prevLines = lines.slice(lastLine, start)
      if (!pushResult('span', prevLines.join('\n'))) break
    }

    // process current range lines
    const currentStartLine = lines[start]
    const currentLineStart = start === lastLine ? lastColumn : 0
    const currentStartLinePrefix = currentStartLine.slice(currentLineStart, startOffset)
    if (!pushResult('span', currentStartLinePrefix)) break

    // process marked text
    if (start === end) {
      const startLineMarked = currentStartLine.slice(startOffset, endOffset)
      if (!pushResult('mark', startLineMarked)) break
    } else {
      const markedText: string[] = []

      for (let i = start; i <= end; i++) {
        const line = lines[i]
        if (i === start) {
          markedText.push(line.slice(startOffset))
        } else if (i === end) {
          markedText.push(line.slice(0, endOffset))
        } else {
          markedText.push(line)
        }
      }

      if (!pushResult('mark', markedText.join('\n'))) break
    }

    lastLine = end
    lastColumn = endOffset
  }

  if (lastLine < lines.length) {
    const lastTail = lines[lastLine].slice(lastColumn)
    if (pushResult('span', lastTail)) {
      result.push({ type: 'br' })

      const restLines = lines.slice(lastLine + 1)
      pushResult('span', restLines.join('\n'))
    }
  }

  // remove end br
  while (result.length > 0 && result[result.length - 1].type === 'br') {
    result.pop()
  }

  return result
}

registerAction({
  name: 'base.find-in-repository',
  keys: [CtrlCmd, Shift, 'f'],
  description: t('command-desc.base_find-in-repository'),
  forUser: true,
  handler: (query?: FindInRepositoryQuery) => {
    visible.value = true

    toggleSide(true)

    if (query) {
      function notEmpty <T> (val: T | null | undefined): val is T {
        return val !== undefined && val !== null
      }

      notEmpty(query.include) && (include.value = query.include)
      notEmpty(query.exclude) && (exclude.value = query.exclude)
      notEmpty(query.caseSensitive) && (option.isCaseSensitive = query.caseSensitive)
      notEmpty(query.wholeWord) && (option.isWordMatch = query.wholeWord)
      notEmpty(query.regExp) && (option.isRegExp = query.regExp)

      if (notEmpty(query.pattern)) {
        pattern.value = query.pattern
        nextTick(() => {
          search()
        })
      }
    }

    nextTick(() => {
      patternInputRef.value?.focus()
      patternInputRef.value?.select()
    })
  },
})

onBeforeUnmount(() => {
  removeAction('base.find-in-repository')
})
</script>

<style lang="scss" scoped>
@use '@fe/styles/mixins.scss' as *;

.search-panel-wrapper {
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(1.5px);
  z-index: 10;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  opacity: 1;
  transition: opacity 0.2s cubic-bezier(1, 0.29, 0.63, 0.94);
  outline: none;
  contain: strict;
}

.search-panel {
  margin-top: 36px;
  background: var(--g-background-color);
  height: calc(100% - 36px);
  width: 100%;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s cubic-bezier(1, 0.38, 0.58, 0.97);

  .title {
    text-align: center;
    line-height: 30px;
    font-size: 14px;
    color: var(--g-color-20);
    flex: none;
    user-select: none;
  }

  .circle-btn {
    position: absolute;
    top: 5px;
    width: 20px;
    height: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--g-color-30);
    border-radius: 50%;

    &:hover {
      color: var(--g-color-0);
      background-color: var(--g-color-86);
    }
  }

  .close-btn {
    right: 5px;
  }

  .replace-btn {
    left: 5px;
    &.active {
      color: var(--g-color-0);
      background-color: var(--g-color-86);
    }
  }

  .search {
    padding: 6px;
    flex: none;

    .search-input {
      font-size: 13px;
      padding: 4px;
      border-radius: 2px;
      background: var(--g-color-94);
      resize: none;
      outline: 1px solid var(--g-color-80);

      &.search-pattern {
        padding-right: 68px;

        &::-webkit-scrollbar {
          width: 4px;
        }
      }

      &:focus {
        background: var(--g-color-90);
      }
    }

    .search-input-label {
      font-size: 12px;
      color: var(--g-color-30);
      margin-top: 6px;
      margin-bottom: 2px;
      user-select: none;
    }
  }

  &.replace-visible {
    textarea.search-pattern {
      border-bottom-left-radius: 0 !important;
    }

    .results details.item  .matches .match {
      max-height: unset;
      -webkit-line-clamp: unset;
      webkit-box-orient: unset;
    }
  }

  &.replacing {
    & > .search,
    & > .circle-btn {
      display: none;
    }
  }
}

.search-row {
  position: relative;

  .option-btns {
    position: absolute;
    right: 0;
    top: 3px;
    display: flex;
    align-items: center;
    .option-btn {
      width: 20px;
      height: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      color: var(--g-color-30);
      margin-right: 2px;
      border-radius: var(--g-border-radius);

      &:hover {
        background-color: var(--g-color-80);
      }

      &.active {
        color: var(--g-color-10);
        background-color: var(--g-color-80);
        outline: 1px solid var(--g-color-70);
        outline-offset: -1px;
      }
    }
  }
}

.replace-row {
  margin-top: 1px;
  textarea.search-input {
    width: calc(100% - 28px);
    border-top-left-radius: 0 !important;
    border-top-right-radius: 0 !important;
  }

  .option-btn {
    cursor: pointer;
  }
}

.message-wrapper {
  flex: none;
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 0 6px;
  user-select: none;
  align-items: flex-end;

  .message {
    color: var(--g-color-30);
    overflow-wrap: break-word;
    width: 100%;
    overflow: hidden;
    padding: 4px 0 ;
    white-space: pre-wrap;
  }

  .action-btn {
    flex: none;
    margin-left: 6px;
    font-size: 12px;
    padding-bottom: 4px;
  }
}

.results {
  overflow-y: auto;
  height: calc(100% - 40px);
  margin-top: 2px;
  padding-top: 6px;
  padding-bottom: 1em;
  border-top: 1px solid var(--g-color-90);

  &::-webkit-scrollbar {
    width: 5px;
  }

  details.item {
    cursor: pointer;

    & > summary {
      padding: 4px 0;
      display: flex;
      align-items: center;
      font-size: 14px;
      user-select: none;
      padding: 6px;
      gap: 4px;

      &::-webkit-details-marker,
      &::marker {
        content: '';
        display: none;
      }

      &::before {
        display: inline-block;
        width: 10px;
        content: url(data:image/svg+xml;base64,PHN2ZyBhcmlhLWhpZGRlbj0idHJ1ZSIgZm9jdXNhYmxlPSJmYWxzZSIgZGF0YS1wcmVmaXg9ImZhciIgZGF0YS1pY29uPSJjaGV2cm9uLWRvd24iIHJvbGU9ImltZyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgNDQ4IDUxMiIgPjxwYXRoIGZpbGw9IiM3YzdmODIiIGQ9Ik00NDEuOSAxNjcuM2wtMTkuOC0xOS44Yy00LjctNC43LTEyLjMtNC43LTE3IDBMMjI0IDMyOC4yIDQyLjkgMTQ3LjVjLTQuNy00LjctMTIuMy00LjctMTcgMEw2LjEgMTY3LjNjLTQuNyA0LjctNC43IDEyLjMgMCAxN2wyMDkuNCAyMDkuNGM0LjcgNC43IDEyLjMgNC43IDE3IDBsMjA5LjQtMjA5LjRjNC43LTQuNyA0LjctMTIuMyAwLTE3eiIgY2xhc3M9IiI+PC9wYXRoPjwvc3ZnPg==);
        margin-right: 4px;
        transform: rotate(-90deg);
        transition: transform 0.1s;
        flex: none;
      }

      &:hover {
        background-color: var(--g-color-95);
      }

      .item-info {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;

        .item-name {
          font-weight: 500;
        }

        .item-dir {
          color: var(--g-color-50);
          font-size: 12px;
          margin-left: 10px;
        }
      }

      .item-badge {
        flex: none;
        background-color: var(--g-color-90);
        line-height: 16px;
        font-size: 12px;
        box-sizing: border-box;
        min-width: 16px;
        text-align: center;
        padding: 0 4px;
        border-radius: 8px;

        &.replace-status {
          margin-left: auto;
          color: #fff;
        }
      }
    }

    &[open] > summary::before {
      transform: rotate(0);
    }

    .matches {
      font-size: 16px;

      .match {
        border-bottom: 1px dashed var(--g-color-92);
        box-sizing: border-box;
        padding-left: 20px;
        padding-top: 4px;
        padding-bottom: 4px;
        user-select: none;
        overflow-wrap: break-word;
        line-height: 17px;
        font-size: 13px;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
        max-height: 58px;
        color: var(--g-color-15);

        &:hover {
          background-color: var(--g-color-95);
          color: var(--g-color-0);
        }

        &.active {
          background-color: var(--g-color-90);
          color: var(--g-color-0);
        }

        span {
          white-space: pre-wrap;
        }

        mark {
          background: #fff8c5 !important;
          white-space: pre-wrap;
        }

        del {
          background: #f8c5c5;
          white-space: pre-wrap;
        }

        ins {
          background: #c5f8c5;
          font-weight: 500;
          white-space: pre-wrap;
          text-decoration: none;
        }
      }
    }

    & > summary[data-status='doing'] {
      outline: 1px dashed #007acc;

      .item-badge.replace-status {
        background-color: #007acc;
        .svg-icon {
          animation: rotate 1s linear infinite;

          @keyframes rotate {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        }
      }
    }

    & > summary[data-status='done'] {
      .item-badge.replace-status {
        background-color: #00a86b;
      }
    }

    & > summary[data-status='error'] {
      .item-badge.replace-status {
        background-color: #e74c3c;
      }
    }
  }
}
.search-panel-wrapper-leave-to,
.search-panel-wrapper-enter-from {
  opacity: 0;
}

.search-panel-leave-to,
.search-panel-enter-from {
  transform: translateY(70vh);
}

@include dark-theme {
  .search-panel-wrapper {
    background-color: rgba(255, 255, 255, 0.07);
  }

  .results .matches .match {
    mark {
      background: #746900 !important;
      color: #ebebeb;
    }

    del {
      background: #8f0000;
      color: #ebebeb;
    }

    ins {
      background: #008f00;
      color: #ebebeb;
    }
  }
}
</style>
