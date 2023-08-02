<template>
  <XMask :mask-closeable="false" :style="{paddingTop: '7vh'}" :show="!!currentDoc" @close="hide">
    <div class="history-wrapper" v-if="currentDoc" @click.stop>
      <div class="history">
        <div class="versions-wrapper" v-if="versions && versions.length">
          <div v-if="listType === 'all'" class="clear" @click="clearVersions">{{$t('doc-history.clear')}}({{sizeText}})</div>
          <GroupTabs class="tabs" :tabs="getListTypes()" v-model="listType" />
          <div class="versions" v-if="xVersions && xVersions.length">
            <div
              v-for="(version, i) in xVersions"
              :key="version.value"
              :class="{item: true, selected: version.value === currentVersion?.value}"
              :title="version.title"
              @click="choose(version)">
              <div class="title">
                <span class="seq">{{i.toString().padStart(4, '0')}}</span>
                <span>{{version.label}}</span>
                <svg-icon v-if="version.comment" class="action-icon" style="width: 15px" name="star-solid" @click.stop />
                <div class="actions" @click.stop>
                  <svg-icon class="action-icon" :title="$t('doc-history.delete')" width="12px" name="trash-solid" @click="deleteVersion(version)" />
                  <svg-icon v-if="version.comment" :title="$t('doc-history.unmark')" class="action-icon" width="15px" name="star-solid" @click="unmarkVersion(version)" />
                  <svg-icon v-else class="action-icon" :title="$t('doc-history.mark')" width="15px" name="star-regular" @click="markVersion(version)" />
                </div>
              </div>
              <div v-if="version.comment" class="comment">
                <span v-if="version.comment !== MARKED">{{version.comment}}</span>
                <i v-else>No Message</i>
                <svg-icon width="12px" class="action-icon" name="pen-solid" :title="$t('doc-history.edit-message')" @click.stop="editVersionComment(version)" />
              </div>
            </div>
          </div>
        </div>
        <div class="content" v-if="content">
          <GroupTabs class="tabs" :tabs="getDisplayTypes()" v-model="displayType" />
          <div class="diff-tips" v-if="displayType === 'diff'">
            <div>{{$t('doc-history.history')}}</div>
            <div>{{$t('doc-history.current')}}</div>
          </div>
          <div class="display" ref="refEditor"></div>
        </div>
        <div class="content no-history" v-if="versions === null">{{$t('loading')}}</div>
        <div class="content no-history" v-else-if="versions.length === 0">{{$t('doc-history.no-history')}}</div>
      </div>

      <div class="doc-name">{{currentVersion?.label}} {{currentVersion?.title}} {{currentDoc.name}}</div>

      <div class="action">
        <button class="btn tr" @click="hide">{{$t('close')}}</button>
        <button v-if="content" class="btn primary tr" @click="apply">{{$t('doc-history.apply-version')}}</button>
      </div>
    </div>
  </XMask>
</template>

<script lang="ts" setup>
import dayjs from 'dayjs'
import type * as Monaco from 'monaco-editor'
import { useStore } from 'vuex'
import { ref, onMounted, onUnmounted, watch, toRef, computed, nextTick } from 'vue'
import { DOC_HISTORY_MAX_CONTENT_LENGTH } from '@share/misc'
import { removeAction, registerAction } from '@fe/core/action'
import { registerHook, removeHook } from '@fe/core/hook'
import { Alt } from '@fe/core/command'
import { commentHistoryVersion, deleteHistoryVersion, fetchHistoryContent, fetchHistoryList } from '@fe/support/api'
import { getDefaultOptions, getMonaco, setValue, whenEditorReady } from '@fe/services/editor'
import { isEncrypted, isSameFile } from '@fe/services/document'
import { inputPassword } from '@fe/services/base'
import { useI18n } from '@fe/services/i18n'
import { useModal } from '@fe/support/ui/modal'
import { useToast } from '@fe/support/ui/toast'
import type { AppState } from '@fe/support/store'
import { getLogger } from '@fe/utils'
import type { Doc } from '@fe/types'
import { decrypt } from '@fe/utils/crypto'
import { getPurchased, showPremium } from '@fe/others/premium'
import SvgIcon from '@fe/components/SvgIcon.vue'
import XMask from './Mask.vue'
import GroupTabs from './GroupTabs.vue'

type Version = {value: string, label: string, title: string, encrypted: boolean, comment: string}

const MARKED = '--marked--'

const logger = getLogger('doc-history-component')

const { t } = useI18n()

const store = useStore()

const getDisplayTypes = () => [
  { label: t('doc-history.content'), value: 'content' },
  { label: t('doc-history.diff'), value: 'diff' },
]

const getListTypes = () => [
  { label: t('doc-history.all'), value: 'all' },
  { label: t('doc-history.marked'), value: 'marked' },
]

const currentDoc = ref<Doc | null>(null)
const currentVersion = ref<Version>()
const versions = ref<Version[] | null>([])
const size = ref(0)
const content = ref('')
const displayType = ref<'content' | 'diff'>('content')
const listType = ref<'all' | 'marked'>('all')
const refEditor = ref<HTMLElement | null>(null)

const currentContent = toRef<AppState, 'currentContent'>(store.state, 'currentContent')
const currentFile = toRef<AppState, 'currentFile'>(store.state, 'currentFile')

const xVersions = computed(() => {
  if (listType.value === 'marked') {
    return (versions.value || []).filter(x => x.comment)
  }

  return versions.value
})

const sizeText = computed(() => {
  const val = Math.round(size.value / 1024)
  return val > 1024 ? `${Math.round(val / 1024)}M` : `${val}K`
})

function show (doc?: Doc) {
  doc ??= currentFile.value!
  currentDoc.value = doc

  if (currentContent.value && currentContent.value.length > DOC_HISTORY_MAX_CONTENT_LENGTH) {
    nextTick(() => {
      useModal().alert({
        title: t('doc-history.content-too-long-alert.title'),
        content: t('doc-history.content-too-long-alert.content', String(DOC_HISTORY_MAX_CONTENT_LENGTH), String(currentContent.value.length)),
      })
    })
  }
}

function hide () {
  currentDoc.value = null
  versions.value = null
  size.value = 0
}

async function fetchVersions () {
  try {
    versions.value = null
    size.value = 0

    let list: any[] = []
    if (currentDoc.value) {
      const data = await fetchHistoryList(currentDoc.value!)
      list = data.list
      size.value = data.size
    }

    versions.value = list.map(({ name: value, comment }) => {
      const arr = value.split('.')
      const name = arr[0]
      const encrypted = isEncrypted({ type: 'file', path: value })
      const tmp = name.split(' ')
      tmp[1] = tmp[1].replaceAll('-', ':')
      const time = tmp.join(' ')
      const title = dayjs().to(time)

      return { value, label: time, title, encrypted, comment }
    })
  } catch (error) {
    versions.value = []
    console.error(error)
  }
}

async function changeVersionComment (version: Version, msg: string) {
  await commentHistoryVersion(currentDoc.value!, version.value, msg)
  versions.value = (versions.value || []).map(x => {
    if (x.value === version.value) {
      x.comment = msg
    }

    return x
  })
}

async function markVersion (version: Version) {
  if (!getPurchased()) {
    useToast().show('warning', t('premium.need-purchase', 'Mark'))
    showPremium()
    return
  }

  const msg = await useModal().input({
    title: t('doc-history.mark-dialog.title', version.label),
    hint: t('doc-history.mark-dialog.hint')
  })

  if (typeof msg === 'string') {
    await changeVersionComment(version, msg || MARKED)
  }
}

async function unmarkVersion (version: Version) {
  await changeVersionComment(version, '')
}

async function editVersionComment (version: Version) {
  let msg: string | null = version.comment === MARKED ? '' : version.comment

  msg = await useModal().input({
    title: t('doc-history.mark-dialog.title', version.label),
    hint: t('doc-history.mark-dialog.hint'),
    value: msg,
  })

  if (typeof msg === 'string') {
    await changeVersionComment(version, msg || MARKED)
  }
}

async function deleteVersion (version: Version) {
  if (await useModal().confirm({
    title: t('doc-history.delete-dialog.title'),
    content: t('doc-history.delete-dialog.content', version.label)
  })) {
    await deleteHistoryVersion(currentDoc.value!, version.value)
    versions.value = (versions.value || []).filter(x => x.value !== version.value)
  }
}

async function clearVersions () {
  if (await useModal().confirm({
    title: t('doc-history.clear-dialog.title'),
    content: t('doc-history.clear-dialog.content')
  })) {
    await deleteHistoryVersion(currentDoc.value!, '--all--')
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

async function updateEditor () {
  logger.debug('updateEditor', !!refEditor.value, !!displayType.value, !!content.value)

  await whenEditorReady()

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
      theme: undefined,
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
  if (!val) {
    currentVersion.value = undefined
    return
  }

  if (val.find(x => x.value === currentVersion.value?.value)) {
    return
  }

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
  registerAction({
    name: 'doc.show-history',
    handler: show,
    keys: [Alt, 'h'],
    description: t('command-desc.doc_show-history'),
  })
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
  background: var(--g-color-backdrop);
  backdrop-filter: var(--g-backdrop-filter);
  margin: auto;
  padding: 10px;
  color: var(--g-color-5);
  box-shadow: rgba(0, 0, 0, 0.3) 2px 2px 10px;
  border-radius: var(--g-border-radius);
  position: relative;

  h3 {
    margin-top: 0;
    margin-bottom: 10px;
  }
}

.history {
  display: flex;
  height: 75vh;
}

.versions-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 278px;
  flex: none;
}

.versions {
  overflow-y: auto;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  font-family: monospace;
  font-size: 16px;
  background-color: var(--g-color-88);
  padding: 6px;

  .item {
    padding-left: 4px;
    padding-right: 4px;
    line-height: 1.5em;
    cursor: pointer;
    position: relative;
    background-color: var(--g-color-88);
    border-bottom: 1px var(--g-color-80) solid;
    color: var(--g-color-30);

    .title {
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      line-height: 2;
    }

    .comment {
      overflow-wrap: break-word;
      .action-icon {
        display: none;
      }

      i {
        display: none;
        color: var(--g-color-40);
      }
    }

    .action-icon {
      color: var(--g-color-50);
      margin-left: 6px;
      vertical-align: sub;
      transition: color 0.1s;

      &:hover {
        color: var(--g-color-20);
      }
    }

    &:hover {
      background-color: var(--g-color-82);
      border-radius: var(--g-border-radius);

      .actions {
        display: inline-block;
      }

      .comment {
        i {
          display: inline;
        }

        .action-icon {
          display: inline-block;
        }
      }
    }

    &.selected {
      background-color: var(--g-color-78);
      border-radius: var(--g-border-radius);
      color: var(--g-color-0);

      .actions {
        background: var(--g-color-78);
      }
    }
  }

  .seq {
    display: inline-block;
    text-align: right;
    min-width: 2em;
    margin-right: 6px;
    color: var(--g-color-50)
  }

  .actions {
    position: absolute;
    display: none;
    right: 0;
    background-color: var(--g-color-82);
    padding-right: 6px;
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

.tabs {
  display: inline-flex;
  margin-bottom: 8px;
  z-index: 1;
  flex: none;

  ::v-deep(.tab) {
    line-height: 1.5;
    font-size: 14px;
  }
}

.content {
  width: 100%;
  text-align: center;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;

  &>.diff-tips {
    width: 100%;
    display: flex;
    justify-content: space-around;
    position: absolute;
    top: 10px;
    font-size: 12px;
    color: var(--g-color-40);
  }

  &>.display {
    text-align: left;
    height: 100%;
    width: 100%;
  }
}

.action {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
}

.clear {
  position: absolute;
  left: 20px;
  top: 20px;
  font-size: 12px;
  cursor: pointer;
  color: var(--g-color-40);

  &:hover {
    color: var(--g-color-10);
  }
}

.no-history {
  padding-top: 100px;
  position: absolute;
  left: 0;
}
</style>
