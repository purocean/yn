<template>
  <XMask :mask-closeable="false" :style="{paddingTop: '7vh'}" :show="!!currentDoc" @close="hide">
    <div class="history-wrapper" v-if="currentDoc" @click.stop>
      <h3>{{$t('doc-history.title')}}</h3>
      <div class="history">
        <div class="versions" v-if="versions && versions.length">
          <div
            v-for="(version, i) in versions"
            :key="version.value"
            :class="{item: true, selected: version.value === currentVersion?.value}"
            :title="version.title"
            @click="choose(version)">
            <span class="seq">{{i.toString().padStart(4, '0')}}</span>
            <span>{{version.label}}</span>
            <svg-icon class="delete" name="trash-solid" @click="deleteVersion(version)" />
          </div>
        </div>
        <div class="content" v-if="content">
          <GroupTabs :tabs="getDisplayTypes()" v-model="displayType" />
          <div class="diff-tips" v-if="displayType === 'diff'">
            <div>{{$t('doc-history.history')}}</div>
            <div>{{$t('doc-history.current')}}</div>
          </div>
          <div class="display" ref="refEditor"></div>
        </div>
        <div class="content" v-else>{{$t('doc-history.no-history')}}</div>
      </div>

      <div class="doc-name">{{currentVersion?.label}} {{currentVersion?.title}} {{currentDoc.name}}</div>

      <div class="action">
        <button class="btn" @click="hide">{{$t('close')}}</button>
        <button v-if="content" class="btn primary" @click="apply">{{$t('doc-history.apply-version')}}</button>
      </div>
    </div>
  </XMask>
</template>

<script lang="ts" setup>
import dayjs from 'dayjs'
import type * as Monaco from 'monaco-editor'
import { useStore } from 'vuex'
import { ref, onMounted, onUnmounted, watch, toRef } from 'vue'
import { removeAction, registerAction } from '@fe/core/action'
import { registerHook, removeHook } from '@fe/core/hook'
import { Alt } from '@fe/core/command'
import { deleteHistoryVersion, fetchHistoryContent, fetchHistoryList } from '@fe/support/api'
import { getDefaultOptions, getMonaco, setValue } from '@fe/services/editor'
import { isEncrypted, isSameFile } from '@fe/services/document'
import { inputPassword } from '@fe/services/base'
import { useI18n } from '@fe/services/i18n'
import type { AppState } from '@fe/support/store'
import { getLogger } from '@fe/utils'
import type { Doc } from '@fe/types'
import { decrypt } from '@fe/utils/crypto'
import SvgIcon from '@fe/components/SvgIcon.vue'
import XMask from './Mask.vue'
import GroupTabs from './GroupTabs.vue'
import { useModal } from '@fe/support/ui/modal'

type Version = {value: string, label: string, title: string, encrypted: boolean}

const logger = getLogger('doc-history-component')

const { t } = useI18n()

const store = useStore()

const getDisplayTypes = () => [
  { label: t('doc-history.content'), value: 'content' },
  { label: t('doc-history.diff'), value: 'diff' },
]

const currentDoc = ref<Doc | null>(null)
const currentVersion = ref<Version>()
const versions = ref<Version[]>([])
const content = ref('')
const displayType = ref<'content' | 'diff'>('content')
const refEditor = ref<HTMLElement | null>(null)

const currentContent = toRef<AppState, 'currentContent'>(store.state, 'currentContent')
const currentFile = toRef<AppState, 'currentFile'>(store.state, 'currentFile')

function show (doc?: Doc) {
  doc ??= currentFile.value!
  currentDoc.value = doc
}

function hide () {
  currentDoc.value = null
}

async function fetchVersions () {
  versions.value = (currentDoc.value ? await fetchHistoryList(currentDoc.value) : []).map(value => {
    const arr = value.split('.')
    const name = arr[0]
    const encrypted = isEncrypted({ path: value })
    const tmp = name.split(' ')
    tmp[1] = tmp[1].replaceAll('-', ':')
    const time = tmp.join(' ')
    const title = dayjs().to(time)

    return { value, label: time, title, encrypted }
  })
}

async function deleteVersion (version: Version) {
  if (await useModal().confirm({
    title: t('doc-history.delete-dialog.title'),
    content: t('doc-history.delete-dialog.content', version.label)
  })) {
    await deleteHistoryVersion(currentDoc.value!, version.value)
    await fetchVersions()
  }
}

function choose (version: Version) {
  currentVersion.value = version
}

function apply () {
  if (content.value && currentFile.value && currentDoc.value && isSameFile(currentDoc.value, currentFile.value)) {
    setValue(content.value)
    hide()
  }
}

let editor: Monaco.editor.IStandaloneCodeEditor | Monaco.editor.IStandaloneDiffEditor | null = null

function layoutEditor () {
  if (editor) {
    editor.layout()
  }
}

function cleanEditor () {
  logger.debug('cleanEditor')
  if (editor) {
    editor.dispose()
    editor = null
  }
}

function updateEditor () {
  logger.debug('updateEditor', !!refEditor.value, !!displayType.value, !!content.value)

  if (!refEditor.value || !displayType.value || !content.value) {
    cleanEditor()
    return
  }

  const monaco = getMonaco()

  const setModel = (isDiffEditor: boolean) => {
    if (editor) {
      if (isDiffEditor) {
        const originalModel = monaco.editor.createModel(content.value, 'markdown')
        const modifiedModel = monaco.editor.createModel(currentContent.value, 'markdown')

        const _editor = editor as Monaco.editor.IStandaloneDiffEditor

        _editor.getModel()?.original?.dispose()
        _editor.getModel()?.modified?.dispose()
        _editor.setModel({ original: originalModel, modified: modifiedModel })
      } else {
        const _editor = editor as Monaco.editor.IStandaloneCodeEditor
        _editor.getModel()?.dispose()
        _editor.setModel(monaco.editor.createModel(content.value, 'markdown'))
      }
    }
  }

  if (editor) {
    const isDiffEditorA = !!(editor as any).onDidUpdateDiff
    const isDiffEditorB = displayType.value === 'diff'
    if (isDiffEditorA !== isDiffEditorB) {
      cleanEditor()
      updateEditor()
    } else {
      setModel(isDiffEditorA)
    }
  } else {
    const isDiffEditor = displayType.value === 'diff'

    const options = {
      ...getDefaultOptions(),
      readOnly: true,
      scrollbar: undefined,
    }

    if (isDiffEditor) {
      editor = monaco.editor.createDiffEditor(refEditor.value, options)
    } else {
      editor = monaco.editor.create(refEditor.value, options)
    }

    setModel(isDiffEditor)
  }
}

watch(currentDoc, fetchVersions)

watch(versions, async val => {
  currentVersion.value = (val && val.length) ? val[0] : undefined
})

watch(currentVersion, async val => {
  if (val && currentDoc.value) {
    let data = await fetchHistoryContent(currentDoc.value, val.value)

    if (val.encrypted) {
      try {
        const password = await inputPassword(t('document.password-open'), 'History Version', true)
        const decrypted = decrypt(data, password)
        data = decrypted.content
      } catch {
        data = t('document.wrong-password')
      }
    }

    content.value = data
  } else {
    content.value = ''
  }
})

watch([content, displayType, refEditor], updateEditor)

onMounted(() => {
  registerAction({ name: 'doc.show-history', handler: show, keys: [Alt, 'h'] })
  registerAction({ name: 'doc.hide-history', handler: hide })

  registerHook('GLOBAL_RESIZE', layoutEditor)
})

onUnmounted(() => {
  cleanEditor()
  removeAction('doc.show-history')
  removeAction('doc.hide-history')
  removeHook('GLOBAL_RESIZE', layoutEditor)
})
</script>

<style lang="scss" scoped>
.history-wrapper {
  width: 90vw;
  background: var(--g-color-95);
  margin: auto;
  padding: 10px;
  color: var(--g-color-5);
  box-shadow: rgba(0, 0, 0 , 0.3) 2px 2px 10px;
  border-radius: var(--g-border-radius);
  position: relative;

  h3 {
    margin-top: 0;
    margin-bottom: 10px;
  }
}

.history {
  display: flex;
  height: 65vh;
}

.versions {
  overflow-y: auto;
  height: 100%;
  width: 276px;
  box-sizing: border-box;
  flex: none;
  font-family: monospace;
  font-size: 16px;
  background-color: var(--g-color-88);
  padding: 6px;

  .item {
    padding-left: 4px;
    padding-right: 4px;
    line-height: 1.5em;
    cursor: pointer;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    border-radius: var(--g-border-radius);

    .delete {
      color: var(--g-color-50);
      width: 12px;
      margin-left: 4px;
      vertical-align: sub;
      transition: color 0.1s;
      display: none;

      &:hover {
        color: var(--g-color-20);
      }
    }

    &:hover {
      background-color: var(--g-color-82);

      .delete {
        display: inline-block;
      }
    }

    &.selected {
      background-color: var(--g-color-74);
    }
  }

  .seq {
    display: inline-block;
    text-align: right;
    min-width: 2em;
    margin-right: 6px;
    color: var(--g-color-50)
  }
}

.doc-name {
  padding-right: 240px;
  font-size: 14px;
  font-weight: normal;
  margin-left: 6px;
  position: absolute;
  bottom: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  box-sizing: border-box;
  color: var(--g-color-30);
  pointer-events: none;
}

.content {
  width: 100%;
  text-align: center;
  position: relative;

  &>.diff-tips {
    width: 100%;
    display: flex;
    justify-content: space-around;
    position: absolute;
    top: -20px;
    font-size: 12px;
    color: var(--g-color-40);
  }

  &>.tabs {
    display: inline-flex;
    position: absolute;
    top: -30px;
    margin-left: -80px;
    z-index: 1;

    ::v-deep(.tab) {
      line-height: 1.5;
      font-size: 14px;
    }
  }

  &>.display {
    text-align: left;
    height: 100%;
  }
}

.action {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
}
</style>
