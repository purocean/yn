<template>
  <div class="editor-wrapper" @click.stop>
    <h3>{{$t('setting-panel.setting')}}</h3>
    <group-tabs :tabs="tabs" v-model="tab" />
    <div v-show="isReady" ref="refEditor" class="editor" @click="onClick" />
    <div class="action">
      <button class="btn" @click="cancel">{{$t('cancel')}}</button>
      <button class="btn primary" @click="ok">{{$t('ok')}}</button>
    </div>
  </div>
</template>

<script lang="ts">
import { useStore } from 'vuex'
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { JSONEditor } from '@json-editor/json-editor'
import * as api from '@fe/support/api'
import { useToast } from '@fe/support/ui/toast'
import { getThemeName, setTheme } from '@fe/services/theme'
import { useI18n } from '@fe/services/i18n'
import { fetchSettings, getSchema, writeSettings } from '@fe/services/setting'
import { registerHook, removeHook, triggerHook } from '@fe/core/hook'
import { basename } from '@fe/utils/path'
import { getPurchased, showPremium } from '@fe/others/premium'
import GroupTabs from '@fe/components/GroupTabs.vue'
import { BuildInSettings, SettingGroup } from '@fe/types'

JSONEditor.defaults.language = 'en'

export default defineComponent({
  name: 'x-filter',
  components: { GroupTabs },
  setup (_, { emit }) {
    const store = useStore()
    const { t } = useI18n()
    const toast = useToast()
    const refEditor = ref<HTMLElement>()
    const tab = ref<SettingGroup>('repos')
    const isReady = ref(false)
    const tabs = ref<{label: string, value: SettingGroup}[]>([])

    const show = computed(() => store.state.showSetting)

    let editor: any = null

    function setLanguage () {
      JSONEditor.defaults.languages.en.button_move_down_title = '⬇'
      JSONEditor.defaults.languages.en.button_move_up_title = '⬆'
      JSONEditor.defaults.languages.en.button_delete_row_title_short = '✖'
      JSONEditor.defaults.languages.en.button_add_row_title = t('setting-panel.add', '{{0}}')
      JSONEditor.defaults.languages.en.button_delete_node_warning = t('setting-panel.delete-warning')
    }

    onMounted(async () => {
      await triggerHook('SETTING_PANEL_BEFORE_SHOW', {}, { breakable: true })

      const schema: any = getSchema()
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
        schema,
      })
      // end: hack to use DOMPurify
      delete (window as any).DOMPurify

      editor.watch('root.theme', () => {
        const theme = editor.getEditor('root.theme').getValue()
        if (getThemeName() !== theme) {
          if (getPurchased()) {
            setTheme(theme)
          } else {
            cancel()
            toast.show('warning', t('premium.need-purchase', 'Theme'))
            showPremium()
          }
        }
      })

      const data = await fetchSettings()

      if (data.repos.length < 1) {
        data.repos = [{ name: '', path: '' }]
      }

      const value: any = {}

      Object.keys(schema.properties).forEach((key) => {
        value[key] = (data as any)[key]
      })

      editor.setValue(value)
      updateTab()
      isReady.value = true
    })

    setLanguage()
    registerHook('I18N_CHANGE_LANGUAGE', setLanguage)
    onBeforeUnmount(() => {
      removeHook('I18N_CHANGE_LANGUAGE', setLanguage)
    })

    const cancel = () => {
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
      emit('close')
    }

    const onClick = async (e: Event) => {
      const target = e.target as HTMLInputElement
      if (target.name && target.name.endsWith('[path]')) {
        const jsonPath = target.name.replace(/\]/g, '').replace(/\[/g, '.')
        const field = editor.getEditor(jsonPath)
        const { canceled, filePaths } = await api.choosePath({
          properties: ['openDirectory', 'createDirectory'],
        })

        if (!canceled && filePaths[0]) {
          field.setValue(filePaths[0])
        }
      }
    }

    function updateTab () {
      const schema = getSchema()

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

    watch(tab, updateTab)

    return { isReady, tab, tabs, show, refEditor, cancel, ok, onClick }
  },
})
</script>

<style lang="scss" scoped>
.editor-wrapper {
  width: 600px;
  background: var(--g-color-95);
  margin: auto;
  padding: 10px;
  color: var(--g-color-5);
  box-shadow: rgba(0, 0, 0 , 0.3) 2px 2px 10px;
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

  ::v-deep(.je-form-input-label) {
    width: 100px;
    display: inline-flex;
    align-items: center;
    flex: none;
    padding-right: 14px;
  }

  ::v-deep(.je-form-input-label + input) {
    max-width: calc(100% - 120px);
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

    tr > td:last-child {
      width: 120px;
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
    color: #4c93e2;
  }
}

.action {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
}
</style>
