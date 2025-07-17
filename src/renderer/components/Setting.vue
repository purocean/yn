<template>
  <div class="editor-wrapper" @click.stop>
    <h3>{{$t('setting-panel.setting')}}</h3>
    <group-tabs :tabs="tabs" v-model="tab" />
    <div v-show="isReady" ref="refEditor" class="editor" @click="onClick" />
    <div class="action">
      <a href="javascript:void(0)" @click="showKeyboardShortcuts">{{ $t('setting-panel.change-keyboard-shortcuts') }}</a>
      <button class="btn tr" @click="close">{{$t('cancel')}}</button>
      <button class="btn primary tr" @click="ok">{{$t('ok')}}</button>
    </div>
  </div>
</template>

<script lang="ts">
import { debounce } from 'lodash-es'
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { JSONEditor } from '@json-editor/json-editor'
import * as api from '@fe/support/api'
import { useToast } from '@fe/support/ui/toast'
import { useI18n } from '@fe/services/i18n'
import { fetchSettings, getSchema, writeSettings } from '@fe/services/setting'
import { registerHook, removeHook, triggerHook } from '@fe/core/hook'
import { basename } from '@fe/utils/path'
import { getActionHandler } from '@fe/core/action'
import { useModal } from '@fe/support/ui/modal'
import store from '@fe/support/store'
import GroupTabs from '@fe/components/GroupTabs.vue'
import type { BuildInSettings, Repo, SettingGroup, SettingSchema } from '@fe/types'

JSONEditor.defaults.language = 'en'

export default defineComponent({
  name: 'x-filter',
  components: { GroupTabs },
  setup (_, { emit }) {
    const { t } = useI18n()
    const toast = useToast()
    const refEditor = ref<HTMLElement>()
    const tab = ref<SettingGroup>('repos')
    const isReady = ref(false)
    const tabs = ref<{label: string, value: SettingGroup}[]>([])

    const show = computed(() => store.state.showSetting)

    let editor: any = null
    let schemaCache: SettingSchema | null = null

    function setLanguage () {
      JSONEditor.defaults.languages.en.button_move_down_title = '⬇'
      JSONEditor.defaults.languages.en.button_move_up_title = '⬆'
      JSONEditor.defaults.languages.en.button_delete_row_title_short = '✖'
      JSONEditor.defaults.languages.en.button_add_row_title = t('setting-panel.add', '{{0}}')
      JSONEditor.defaults.languages.en.button_delete_node_warning = t('setting-panel.delete-warning')
    }

    function getSchemaWithCache () {
      if (!schemaCache) {
        schemaCache = getSchema()
      }

      return schemaCache
    }

    function initResetButtons () {
      // remove all reset buttons
      refEditor.value?.querySelectorAll('.reset-button').forEach(el => el.remove())

      const types = ['string', 'number', 'boolean']

      const selectors = types
        .map(type => `.row > div[data-schematype="${type}"]`)
        .join(',')

      refEditor.value?.querySelectorAll<HTMLElement>(selectors).forEach(el => {
        const type = el.getAttribute('data-schematype')

        const label = type !== 'boolean' ? el.querySelector('.je-form-input-label') : el.querySelector('.form-control')
        if (!label) return

        const editorSchemaPath = el.getAttribute('data-schemapath') || ''
        const schemaPath = editorSchemaPath.replace('root.', '')

        const schema = getSchemaWithCache()
        const schemaItem = schema.properties[schemaPath as keyof BuildInSettings]
        const value = editor.getEditor(editorSchemaPath).getValue()

        if (
          types.includes(typeof schemaItem?.defaultValue) &&
          schemaItem?.defaultValue !== value
        ) {
          const resetBtn = document.createElement('div')
          resetBtn.innerHTML = '<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="sync-alt"  role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M370.72 133.28C339.458 104.008 298.888 87.962 255.848 88c-77.458.068-144.328 53.178-162.791 126.85-1.344 5.363-6.122 9.15-11.651 9.15H24.103c-7.498 0-13.194-6.807-11.807-14.176C33.933 94.924 134.813 8 256 8c66.448 0 126.791 26.136 171.315 68.685L463.03 40.97C478.149 25.851 504 36.559 504 57.941V192c0 13.255-10.745 24-24 24H345.941c-21.382 0-32.09-25.851-16.971-40.971l41.75-41.749zM32 296h134.059c21.382 0 32.09 25.851 16.971 40.971l-41.75 41.75c31.262 29.273 71.835 45.319 114.876 45.28 77.418-.07 144.315-53.144 162.787-126.849 1.344-5.363 6.122-9.15 11.651-9.15h57.304c7.498 0 13.194 6.807 11.807 14.176C478.067 417.076 377.187 504 256 504c-66.448 0-126.791-26.136-171.315-68.685L48.97 471.03C33.851 486.149 8 475.441 8 454.059V320c0-13.255 10.745-24 24-24z"></path></svg>'
          resetBtn.title = t('setting-panel.reset-title', String(schemaItem.defaultValue))
          resetBtn.className = 'reset-button'
          resetBtn.onclick = () => {
            useModal().confirm({
              title: t('setting-panel.reset-confirm-title'),
              content: t('setting-panel.reset-confirm-desc', String(schemaItem.defaultValue)),
            }).then(ok => {
              if (ok) {
                editor.getEditor(editorSchemaPath).setValue(schemaItem.defaultValue)
              }
            })
          }

          label.prepend(resetBtn)
        }
      })
    }

    const initResetButtonsDebounced = debounce(initResetButtons, 100)

    onMounted(async () => {
      await triggerHook('SETTING_PANEL_BEFORE_SHOW', {}, { breakable: true })

      const schema = getSchemaWithCache()

      tabs.value = schema.groups

      // begin: hack to use DOMPurify, support html
      ;(window as any).DOMPurify = { sanitize: (val: string) => val }
      editor = new JSONEditor(refEditor.value, {
        theme: 'html',
        disable_collapse: true,
        disable_edit_json: true,
        disable_properties: true,
        disable_array_delete_last_row: true,
        disable_array_delete_all_rows: true,
        remove_button_labels: true,
        schema: schemaCache,
        custom_validators: [(schema: any, value: any, path: any) => {
          if (schema.validator && typeof schema.validator === 'function') {
            return schema.validator(schema, value, path)
          }

          return []
        }],
      })
      // end: hack to use DOMPurify
      delete (window as any).DOMPurify

      editor.on('change', initResetButtonsDebounced)

      const reposEditor = editor.getEditor('root.repos')

      reposEditor.addRow = function (val: any) {
        val ??= { name: '', path: '', enableIndexing: false } satisfies Repo
        this.constructor.prototype.addRow.call(this, val)
      }

      const data = await fetchSettings()

      if (data.repos.length < 1) {
        data.repos = [{ name: '', path: '', enableIndexing: false }] satisfies Repo[]
      }

      const value: any = {}

      Object.keys(schema.properties).forEach((key) => {
        value[key] = (data as any)[key]
      })

      editor.setValue(value)
      updateTab()
      initResetButtonsDebounced()
      isReady.value = true

      triggerHook('SETTING_PANEL_AFTER_SHOW', { editor })
    })

    setLanguage()
    registerHook('I18N_CHANGE_LANGUAGE', setLanguage)
    onBeforeUnmount(() => {
      editor?.destroy()
      removeHook('I18N_CHANGE_LANGUAGE', setLanguage)
    })

    const close = async () => {
      await triggerHook('SETTING_PANEL_BEFORE_CLOSE', { editor }, { breakable: true })
      emit('close')
    }

    const ok = async () => {
      const value = editor && editor.getValue()
      if (value) {
        value.repos.forEach((repo: any) => {
          let { name, path } = repo
          name = name.trim()
          path = path.trim()

          if (!name && path) {
            // default name
            repo.name = basename(path).substring(0, 10)
          } else if (name && !path) {
            const msg = t('setting-panel.error-choose-repo-path')
            toast.show('warning', msg)
            throw new Error(msg)
          }
        })

        const errors = editor.validate()
        if (errors.length) {
          console.log('json-editor', errors)
          errors.forEach((error: any) => {
            toast.show('warning', error.message)
            throw new Error(error.message)
          })
        }

        await writeSettings({ ...value })
      }
      close()
    }

    const onClick = async (e: Event) => {
      
      const target = e.target as HTMLInputElement
      if (target.tagName === 'INPUT' && target.name) {
        const jsonPath = target.name.replace(/\]/g, '').replace(/\[/g, '.')
        const field = editor.getEditor(jsonPath)

        if (field && field.schema.openDialogOptions) {
          const { canceled, filePaths } = await api.choosePath(field.schema.openDialogOptions)

          if (!canceled && filePaths[0]) {
            field.setValue(filePaths[0])
          }
        }
      }
    }

    function updateTab () {
      const schema = getSchemaWithCache()

      const getPaths = (group: SettingGroup) => Object.keys(schema.properties as any)
        .filter(key => {
          const item = schema.properties[key as keyof BuildInSettings]

          return group === 'other'
            ? (item.group === 'other' || !item.group)
            : (item.group === group)
        }) as (keyof BuildInSettings)[]

      const groups = Object.fromEntries(schema.groups.map(group => [group.value, getPaths(group.value)]))

      refEditor.value?.querySelectorAll<HTMLElement>('.row').forEach(row => {
        const schemaPath = (row.firstElementChild?.getAttribute('data-schemapath') || '').replace('root.', '')

        if (groups[tab.value].includes(schemaPath as any)) {
          row.hidden = false
        } else {
          row.hidden = true
        }
      })
    }

    function showKeyboardShortcuts () {
      close()
      getActionHandler('keyboard-shortcuts.show-manager')()
    }

    watch(tab, updateTab)

    return { isReady, tab, tabs, show, refEditor, close, ok, onClick, showKeyboardShortcuts }
  },
})
</script>

<style lang="scss" scoped>
.editor-wrapper {
  width: 920px;
  background: var(--g-color-backdrop);
  backdrop-filter: var(--g-backdrop-filter);
  margin: auto;
  padding: 10px;
  color: var(--g-color-5);
  box-shadow: rgba(0, 0, 0, 0.3) 2px 2px 10px;
  border-radius: var(--g-border-radius);

  h3 {
    margin-top: 0;
  }
}

.editor {
  max-height: 50vh;
  overflow: auto;

  ::v-deep(div[data-schematype="array"] > .je-header),
  &> ::v-deep(div > .je-header),
  ::v-deep(.je-object__controls){
    display: none;
  }

  ::v-deep(div[data-schematype="array"] > .je-indented-panel) {
    padding: 0;
    margin: 0;
  }

  ::v-deep(.je-header) {
    margin: 0;
  }

  ::v-deep(.row) {
    margin-bottom: 10px;
  }

  ::v-deep(.je-indented-panel) {
    border: none;
    margin-right: 0;
  }

  ::v-deep(.form-control) {
    display: flex;
    flex-wrap: wrap;
    align-content: center;
    position: relative;
  }

  ::v-deep(.row > div > .form-control) {
    padding-left: 20px;
  }

  ::v-deep(.je-form-input-label) {
    width: 140px;
    display: inline-flex;
    align-items: center;
    flex: none;
    padding-right: 14px;
    font-size: 15px;
  }

  ::v-deep(.je-form-input-label + input) {
    max-width: calc(100% - 180px);
  }

  ::v-deep(.reset-button) {
    width: 20px;
    height: 20px;
    box-sizing: border-box;
    position: absolute;
    left: -5px;
    opacity: 0.6;
    transition: opacity 0.1s;
    z-index: 1;
    border-radius: 50%;
    padding: 5px;
    color: var(--g-color-30);

    svg {
      display: block;
    }

    &:hover {
      background: var(--g-color-80);
      color: var(--g-color-10);
    }
  }

  ::v-deep(.je-form-input-label:hover > .reset-button) {
    opacity: 1;
  }

  ::v-deep(.je-form-input-label ~ .je-form-input-label) {
    font-size: 12px;
    width: 100%;
    box-sizing: border-box;
    color: var(--g-color-50);
    margin-top: 4px;
    text-align: right;
    display: block;
  }

  ::v-deep(.je-form-input-label + input[type=number]) {
    max-width: 130px;
  }

  ::v-deep(input[type=number] ~ .je-form-input-label) {
    width: auto;
    display: flex;
    align-items: center;
    margin-left: 8px;
  }

  ::v-deep(.form-control .errmsg) {
    font-size: 12px;
    text-align: right;
    display: block;
    width: 100%;
    // right: 0;
    // bottom: -20px;
    // position: absolute;
  }

  ::v-deep(.je-table) {
    width: 100%;
    padding-bottom: 6px;
    margin-bottom: 6px;

    tr > td:first-child {
      width: 100px;
    }

    tr > th:nth-child(3),
    tr > td:nth-child(3) {
      width: 55px;
      font-size: 12px;
      text-align: center;

      & > .form-control {
        display: inline-block;

        & > input[type=checkbox] {
          margin-right: 0;
        }
      }
    }

    tr > td:last-child {
      width: 120px;
      text-align: left !important;
    }
  }

  ::v-deep(.je-checkbox) {
    margin-right: 10px;
  }

  ::v-deep(input[type=range]) {
    vertical-align: bottom;
    margin-right: 10px;
    float: left;
  }

  ::v-deep(a) {
    color: var(-g-color-anchor);
  }
}

.action {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;

  a {
    font-size: 14px;
    margin-right: auto;
    align-self: center;
  }
}
</style>
