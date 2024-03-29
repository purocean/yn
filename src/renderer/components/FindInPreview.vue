<template>
  <div :class="{'find-in-preview': true, visible}">
    <div class="input">
      <input
        class="search-input search-pattern"
        ref="patternInputRef"
        v-model="pattern"
        type="text"
        rows="1"
        v-up-down-history
        @keydown.enter="handleKeydown"
        v-placeholder="{
          blur: $t('search-panel.placeholder-search'),
          focus: $t('search-panel.placeholder-search') + ' ' + $t('search-panel.for-history')
        }"
        v-auto-resize="{ maxRows: 6, minRows: 1 }"
        @keydown.escape="close"
      />
      <div class="option-btns">
        <div
          :class="{'option-btn': true, active: option.isCaseSensitive}"
          :title="$t('search-panel.match-case')"
          @click="toggleOption('isCaseSensitive')
        ">
          <svg-icon name="codicon-case-sensitive" width="16px" />
        </div>
        <div
          :class="{'option-btn': true, active: option.isRegExp}"
          :title="$t('search-panel.use-regex')"
          @click="toggleOption('isRegExp')"
        >
          <svg-icon name="codicon-regex" width="16px" />
        </div>
      </div>
    </div>
    <div class="result" v-if="matches">
      {{ $t('find-in-preview.results', matches.count + (matches.exceed ? '+' : '')) }}
    </div>
    <div class="action" @dblclick.capture.stop.prevent>
      <div :class="{'action-btn': true, disabled: !(matches && matches.count > 0)}" :title="$t('find-in-preview.action-tips.prev')">
        <svg-icon name="arrow-left-solid" width="14px" style="transform: rotate(90deg)" @click="search(true)" />
      </div>
      <div :class="{'action-btn': true, disabled: !(matches && matches.count > 0)}" :title="$t('find-in-preview.action-tips.next')" @click="search(false)">
        <svg-icon name="arrow-left-solid" width="14px" style="transform: rotate(-90deg)" />
      </div>
      <div class="action-btn" :title="$t('find-in-preview.action-tips.close')" @click="close">
        <svg-icon name="times" width="14px" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, reactive, ref } from 'vue'
import { useI18n } from '@fe/services/i18n'
import { getLogger, sleep } from '@fe/utils'
import { registerAction, removeAction } from '@fe/core/action'
import { registerHook, removeHook } from '@fe/core/hook'
import { CtrlCmd } from '@fe/core/keybinding'
import { getRenderIframe } from '@fe/services/view'
import { getEditor } from '@fe/services/editor'
import { BrowserFindInPreview } from '@fe/others/find-in-preview'
import store from '@fe/support/store'

import SvgIcon from '@fe/components/SvgIcon.vue'

const highlightClassName = 'find-in-preview-highlight'
const logger = getLogger('components:find-in-preview')
const { $t, t } = useI18n()

let findInPreview: BrowserFindInPreview | null = null

const patternInputRef = ref<HTMLInputElement>()
const pattern = ref('')
const visible = ref(false)
const matches = ref<(ReturnType<BrowserFindInPreview['getStats']> & { ended: boolean }) | null>(null)
const option = reactive({
  isCaseSensitive: false,
  isRegExp: false
})

let cacheKey: string | null = null
function cleanCache () {
  logger.debug('cleanCache')
  matches.value = null
  cacheKey = null
}

async function removeHighlight () {
  logger.debug('removeHighlight')
  const iframe = await getRenderIframe()
  const win = iframe.contentWindow!
  win.document.body.classList.remove('find-in-preview-highlight')
}

async function highlight () {
  const iframe = await getRenderIframe()
  const win = iframe.contentWindow!

  if (!visible.value) {
    await removeHighlight()
    return
  }

  win.document.body.classList.add(highlightClassName)
  await sleep(0)
  win.document.body.classList.add(highlightClassName)
  win.document.addEventListener('selectionchange', removeHighlight, true)
}

function updateStats (ended: boolean) {
  if (findInPreview) {
    matches.value = {
      ...findInPreview.getStats(),
      ended,
    }
  } else {
    matches.value = null
  }

  highlight()
}

function search (backward: boolean) {
  logger.debug('search', pattern.value, option)

  if (!pattern.value) {
    matches.value = null
    return
  }

  try {
    const key = JSON.stringify({ pattern: pattern.value, option })
    if (key !== cacheKey) {
      logger.debug('search: miss cache')
      findInPreview?.exec(pattern.value, { caseSensitive: option.isCaseSensitive, regex: option.isRegExp })
      cacheKey = key
    }

    const result = backward ? findInPreview?.prev() : findInPreview?.next()
    updateStats(!result)

    patternInputRef.value?.focus()
  } catch (error) {
    logger.error('search: error', error)
    matches.value = null
  }
}

function show () {
  getRenderIframe().then(iframe => {
    // fill selected text
    const selection = iframe.contentWindow!.getSelection()
    if (selection?.toString()) {
      pattern.value = selection.toString()
    }

    // init findInPreview
    if (!findInPreview) {
      findInPreview = new BrowserFindInPreview(
        iframe.contentWindow!,
        {
          maxMatchCount: 1000,
          maxMatchTime: 3000,
          wrapAround: true,
        }
      )
    }

    visible.value = true

    setTimeout(() => {
      patternInputRef.value?.focus()
      patternInputRef.value?.select()
    }, 0)
  })
}

async function close () {
  visible.value = false
  patternInputRef.value?.blur()
  await sleep(0)
  removeHighlight()
}

function toggleOption (key: keyof typeof option) {
  option[key] = !option[key]
  search(false)
}

function handleKeydown (e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.isComposing) {
    search(e.shiftKey)
  }
}

registerAction({
  name: 'view.show-find-in-preview',
  description: t('command-desc.view_show-find-in-preview-widget'),
  keys: [CtrlCmd, 'f'],
  handler: show,
  forUser: true,
  when: () => {
    return !(getEditor()?.hasTextFocus()) && store.state.showView
  }
})

registerHook('VIEW_RENDERED', cleanCache)

onBeforeUnmount(() => {
  removeAction('view.show-find-in-preview')
  removeHook('VIEW_RENDERED', cleanCache)
  removeHighlight()
})
</script>

<style lang="scss" scoped>
.find-in-preview {
  position: fixed;
  right: 5em;
  top: 0.5em;
  background: rgba(var(--g-color-90-rgb), 0.8);
  backdrop-filter: var(--g-backdrop-filter);
  color: var(--g-color-10);
  font-size: 14px;
  transition: transform .2s ease-in-out, box-shadow .1s ease-in-out;
  z-index: 500;
  border-radius: var(--g-border-radius);
  margin-top: 1em;
  display: flex;
  align-items: center;
  transform: translateY(-200px);
  overflow: hidden;
  box-shadow: rgba(0, 0, 0, 0.25) 2px 2px 4px;

  &:focus-within {
    background: rgba(var(--g-color-86-rgb), 0.9);
  }

  &.visible {
    transform: translateY(0);
  }

  .input {
    position: relative;
  }

  .search-input {
    font-size: 14px;
    padding: 7px;
    border-radius: 2px;
    background: transparent;
    resize: none;
    outline: 1px solid var(--g-color-80);
    border-radius: 0;
    width: 250px;

    &.search-pattern {
      padding-right: 64px;

      &::-webkit-scrollbar {
        width: 4px;
      }
    }

    &:focus {
      background: transparent;
    }
  }

  .option-btns {
    position: absolute;
    right: 0;
    top: 4px;
    display: flex;
    align-items: center;
    .option-btn {
      width: 26px;
      height: 26px;
      display: flex;
      justify-content: center;
      align-items: center;
      color: var(--g-color-30);
      margin-right: 4px;
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

  .action {
    display: flex;
    align-items: center;
    padding: 0 4px;

    .action-btn {
      flex: none;
      width: 22px;
      height: 22px;
      margin: 0 1px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--g-color-30);

      &.disabled {
        color: var(--g-color-70);
      }

      &:not(.disabled):hover {
        color: var(--g-color-0);
        background-color: var(--g-color-75);
        border-radius: 50%;
      }
    }
  }

  .result {
    padding-left: 8px;
  }
}
</style>
