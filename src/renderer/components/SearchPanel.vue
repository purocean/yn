<template>
  <transition name="search-panel-wrapper">
    <div v-show="visible" class="search-panel-wrapper" @keydown.esc="close" @click.self="close">
      <transition name="search-panel">
        <div v-if="visible" class="search-panel">
          <div class="title">{{$t('search-panel.search-files')}}</div>
          <div class="close-btn" @click="close" :title="$t('close')">
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
                @keydown.enter.prevent="onKeydownEnter"
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
            <div class="search-input-label">{{$t('search-panel.files-to-include')}}</div>
            <input
              class="search-input"
              type="text"
              v-model="include"
              @keydown.enter.prevent="onKeydownEnter"
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
              @keydown.enter.prevent="onKeydownEnter"
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
            <a v-if="loadingVisible" class="action-btn" href="javascript:void(0)" @click="stop">{{$t('cancel')}}</a>
            <a
              v-else-if="result.length > 1"
              class="action-btn"
              href="javascript:void(0)"
              @click="toggleExpandAll"
            >{{ $t(allResultCollapsed ? 'search-panel.expand-all' : 'search-panel.collapse-all') }}</a>
          </div>
          <div class="results" v-if="result.length > 0">
            <details
              class="item"
              v-for="item in result"
              :key="item.path"
              :open="item.open"
              @toggle="(e: any) => item.open = e.target.open"
            >
              <summary :title="item.path">
                <div class="item-info">
                  <span class="item-name">{{basename(item.path)}}</span>
                  <span class="item-dir">{{dirname(item.path)}}</span>
                </div>
                <div class="item-count">{{item.numMatches}}</div>
              </summary>
              <div class="matches">
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
import { computed, Fragment, h, nextTick, onBeforeUnmount, reactive, ref, shallowRef, Text, watch, watchEffect } from 'vue'
import type { ISearchRange, ISerializedFileMatch, ISerializedSearchSuccess, ITextQuery, ITextSearchMatch } from 'ripgrep-wrapper'
import { getLogger, sleep } from '@fe/utils'
import { basename, dirname, join, relative } from '@fe/utils/path'
import { registerAction, removeAction } from '@fe/core/action'
import { CtrlCmd, Shift } from '@fe/core/command'
import { useLazyRef } from '@fe/utils/composable'
import * as api from '@fe/support/api'
import store from '@fe/support/store'
import { useToast } from '@fe/support/ui/toast'
import { switchDoc } from '@fe/services/document'
import { getIsDefault, highlightLine } from '@fe/services/editor'
import { useI18n } from '@fe/services/i18n'
import { getSetting, showSettingPanel } from '@fe/services/setting'
import { toggleSide } from '@fe/services/layout'
import type { FindInRepositoryQuery } from '@fe/types'
import SvgIcon from './SvgIcon.vue'

const MAX_RESULTS = 1000
const SEARCH_LIMIT_SETTING_KEY = 'search.number-limit'

const logger = getLogger('search-panel')
const toast = useToast()
useI18n()

const patternInputRef = ref<HTMLInputElement>()
const pattern = ref('')
const include = ref('')
const exclude = ref('')
const option = reactive({
  isRegExp: false,
  isWordMatch: false,
  isCaseSensitive: false,
})

const loading = ref(false)
const loadingVisible = useLazyRef(loading, val => val ? 200 : -1)
const result = ref<(ISerializedFileMatch & { open: boolean })[]>([])
const success = shallowRef<ISerializedSearchSuccess | null>(null)
const errorMessage = shallowRef('')
const currentItemKey = ref('')
const visible = ref(false)

const message = computed(() => {
  if (errorMessage.value) {
    return errorMessage.value
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

watchEffect(async () => {
  if (visible.value) {
    await nextTick()
    patternInputRef.value?.focus()
    patternInputRef.value?.select()
  }
})

watch(() => store.state.currentRepo, () => {
  stop()
  result.value = []
})

let controller: AbortController | null = null

async function stop () {
  logger.debug('stop')
  success.value = null
  loading.value = false

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
    maxResults: Math.min(MAX_RESULTS, getSetting(SEARCH_LIMIT_SETTING_KEY, 300)),
  }

  try {
    loading.value = true
    result.value = []
    errorMessage.value = ''
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
          errorMessage.value = data.message.replace(/^~{10,}$/gm, '~~~~~~~~~~~~~~~~~~')
        }
      },
    )
  } finally {
    loading.value = false
  }
}

function toggleOption (key: keyof typeof option) {
  option[key] = !option[key]
  search()
}

function close () {
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
  if (getIsDefault()) {
    await sleep(100)
    highlightLine(lines, true, 1000)
  }
}

function onKeydownEnter (e: KeyboardEvent) {
  if (e.isComposing) {
    return
  }

  const target = e.target as HTMLInputElement

  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
    const start = target.selectionStart
    const end = target.selectionEnd
    const content = target.value

    if (start !== null && end !== null) {
      target.value = content.slice(0, start) + '\n' + content.slice(end)
      target.dispatchEvent(new Event('input'))
      target.setSelectionRange(start + 1, start + 1)
    }
  } else {
    search()
  }
}

function toggleExpandAll () {
  result.value = result.value.map(r => ({
    ...r,
    open: allResultCollapsed.value,
  }))
}

function markText (text: string, ranges: ISearchRange[]) {
  const lines = text.split('\n')
  const result: {type: 'span' | 'mark' | 'br', value?: string }[] = []

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
      const lastTail = lines[lastLine].slice(lastColumn)
      lastTail && result.push({ type: 'span', value: lastTail })
      result.push({ type: 'br' })

      const prevLines = lines.slice(lastLine + 1, start)
      prevLines.forEach((line) => {
        line && result.push({ type: 'span', value: line })
        result.push({ type: 'br' })
      })
    }

    // process current range lines
    const currentStartLine = lines[start]
    const currentStartLinePrefix = currentStartLine.slice(0, startOffset)
    currentStartLinePrefix && result.push({ type: 'span', value: currentStartLine.slice(0, startOffset) })

    if (start === end) {
      const startLineMarked = currentStartLine.slice(startOffset, endOffset)
      startLineMarked && result.push({ type: 'mark', value: startLineMarked })
    } else {
      const startLineMarked = currentStartLine.slice(startOffset)
      startLineMarked && result.push({ type: 'mark', value: startLineMarked })
      result.push({ type: 'br' })

      const currentMiddleLines = lines.slice(start + 1, end)
      currentMiddleLines.forEach((line) => {
        line && result.push({ type: 'mark', value: line })
        result.push({ type: 'br' })
      })

      const currentEndLine = lines[end]
      const endLineMarked = currentEndLine.slice(0, endOffset)
      endLineMarked && result.push({ type: 'mark', value: endLineMarked })
    }

    lastLine = end
    lastColumn = endOffset
  }

  if (lastLine < lines.length - 1) {
    const lastTail = lines[lastLine].slice(lastColumn)
    lastTail && result.push({ type: 'span', value: lastTail })
    result.push({ type: 'br' })

    const restLines = lines.slice(lastLine + 1)
    restLines.forEach((line) => {
      line && result.push({ type: 'span', value: line })
      result.push({ type: 'br' })
    })
  }

  // remove end br
  while (result[result.length - 1]?.type === 'br') {
    result.pop()
  }

  return result
}

registerAction({
  name: 'base.find-in-repository',
  keys: [CtrlCmd, Shift, 'f'],
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
  },
})

onBeforeUnmount(() => {
  removeAction('base.find-in-repository')
})
</script>

<style lang="scss" scoped>
@import '@fe/styles/mixins.scss';

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

  .close-btn {
    position: absolute;
    right: 5px;
    top: 5px;
    width: 20px;
    height: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--g-color-30);

    &:hover {
      color: var(--g-color-0);
      background-color: var(--g-color-86);
      border-radius: 50%;
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
    text-decoration: none;
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

      .item-count {
        flex: none;
        background-color: var(--g-color-90);
        line-height: 16px;
        font-size: 12px;
        box-sizing: border-box;
        min-width: 16px;
        text-align: center;
        padding: 0 4px;
        margin-left: 6px;
        border-radius: 8px;
      }
    }

    &[open] > summary::before {
      transform: rotate(0);
    }

    .matches {
      font-size: 16px;

      .match {
        border-top: 4px solid transparent;
        border-bottom: 4px solid transparent;
        box-sizing: border-box;
        padding-left: 20px;
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

mark {
  background: #fff8c5 !important;
}

@include dark-theme {
  .search-panel-wrapper {
    background-color: rgba(255, 255, 255, 0.07);
  }

  mark {
    background: #746900 !important;
    color: #ebebeb;
  }
}
</style>
