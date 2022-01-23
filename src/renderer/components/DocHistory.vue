<template>
  <XMask :style="{paddingTop: '7vh'}" :show="!!currentDoc" @close="hide">
    <div class="history-wrapper" v-if="currentDoc" @click.stop>
      <h3>{{$t('doc-history.title')}}</h3>
      <div class="history">
        <div class="versions" v-if="versions && versions.length">
          <div
            v-for="(version, i) in versions"
            :key="version"
            :class="{item: true, selected: version === currentVersion}"
            @click="choose(version)">
            <span class="seq">{{i.toString().padStart(4, '0')}}</span>
            <span>{{versionStr(version)}}</span>
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

      <div class="doc-name">{{currentDoc.name}}</div>

      <div class="action">
        <button class="btn" @click="hide">{{$t('close')}}</button>
        <button v-if="content" class="btn primary" @click="apply">{{$t('doc-history.apply-version')}}</button>
      </div>
    </div>
  </XMask>
</template>

<script lang="ts" setup>
import type * as Monaco from 'monaco-editor'
import { useStore } from 'vuex'
import { ref, onMounted, onUnmounted, watch, toRef } from 'vue'
import { removeAction, registerAction } from '@fe/core/action'
import { registerHook, removeHook } from '@fe/core/hook'
import { fetchHistoryContent, fetchHistoryList } from '@fe/support/api'
import { getDefaultOptions, getMonaco, setValue } from '@fe/services/editor'
import { isSameFile } from '@fe/services/document'
import { useI18n } from '@fe/services/i18n'
import { getLogger } from '@fe/utils'
import type { Doc } from '@fe/types'
import type { AppState } from '@fe/support/store'
import XMask from './Mask.vue'
import GroupTabs from './GroupTabs.vue'

const logger = getLogger('doc-history-component')

const { t } = useI18n()

const store = useStore()

const getDisplayTypes = () => [
  { label: t('doc-history.content'), value: 'content' },
  { label: t('doc-history.diff'), value: 'diff' },
]

const currentDoc = ref<Doc | null>(null)
const currentVersion = ref('')
const versions = ref<string[]>([])
const content = ref('')
const displayType = ref<'content' | 'diff'>('content')
const refEditor = ref<HTMLElement | null>(null)

const currentContent = toRef<AppState, 'currentContent'>(store.state, 'currentContent')
const currentFile = toRef<AppState, 'currentFile'>(store.state, 'currentFile')

function show (doc: Doc) {
  currentDoc.value = doc
}

function hide () {
  currentDoc.value = null
}

function versionStr (version: string) {
  const tmp = version.replace(/\.md$/i, '').split(' ')
  tmp[1] = tmp[1].replaceAll('-', ':')
  return tmp.join(' ')
}

function choose (version: string) {
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

watch(currentDoc, async val => {
  versions.value = val ? await fetchHistoryList(val) : []
})

watch(versions, async val => {
  currentVersion.value = (val && val.length) ? val[0] : ''
})

watch(currentVersion, async val => {
  content.value = (val && currentDoc.value) ? await fetchHistoryContent(currentDoc.value, val) : ''
})

watch([content, displayType, refEditor], updateEditor)

onMounted(() => {
  registerAction({ name: 'doc.show-history', handler: show })
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
  width: 265px;
  box-sizing: border-box;
  flex: none;
  font-family: monospace;
  font-size: 16px;
  background-color: var(--g-color-88);
  padding: 6px;

  .item {
    padding-left: 4px;
    padding-right: 10px;
    line-height: 1.5em;
    cursor: pointer;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    border-radius: var(--g-border-radius);

    &:hover {
      background-color: var(--g-color-82);
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
  font-size: 14px;
  font-weight: normal;
  margin-left: 6px;
  position: absolute;
  bottom: 16px;
  color: var(--g-color-30);
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
