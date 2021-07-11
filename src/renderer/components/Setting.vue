<template>
  <div class="editor-wrapper" @click.stop>
    <h3>配置项</h3>
    <div ref="refEditor" class="editor" @click="onClick" />
    <div class="action">
      <button class="btn" @click="cancel">取消</button>
      <button class="btn primary" @click="ok">确定</button>
    </div>
  </div>
</template>

<script lang="ts">
import { useStore } from 'vuex'
import { computed, defineComponent, onMounted, ref } from 'vue'
import { JSONEditor } from '@json-editor/json-editor'
import * as api from '@fe/support/api'
import { FLAG_DISABLE_XTERM } from '@fe/support/global-args'
import { useToast } from '@fe/support/toast'
import { getThemeName, setTheme } from '@fe/context/theme'

JSONEditor.defaults.language = 'zh'
JSONEditor.defaults.languages.zh = { ...JSONEditor.defaults.languages.en }
JSONEditor.defaults.languages.zh.button_move_down_title = '⬇'
JSONEditor.defaults.languages.zh.button_move_up_title = '⬆'
JSONEditor.defaults.languages.zh.button_delete_row_title_short = '✖'
JSONEditor.defaults.languages.zh.button_add_row_title = '添加{{0}}'
JSONEditor.defaults.languages.zh.button_delete_node_warning = '确定删除吗'

const schema = {
  type: 'object',
  title: '配置项',
  properties: {
    repos: {
      type: 'array',
      title: '仓库',
      format: 'table',
      items: {
        type: 'object',
        title: '仓库',
        properties: {
          name: {
            type: 'string',
            title: '仓库名',
            maxLength: 10,
            options: {
              inputAttributes: { placeholder: '请输入' }
            },
          },
          path: {
            type: 'string',
            title: '路径',
            readonly: true,
            options: {
              inputAttributes: { placeholder: '请选择储存位置', style: 'cursor: pointer' }
            },
          }
        }
      },
    },
    shell: {
      title: '终端 Shell',
      type: 'string',
    } as any,
    theme: {
      title: '主题',
      type: 'string',
      enum: ['system', 'dark', 'light']
    }
  },
  required: ['theme']
}

if (FLAG_DISABLE_XTERM) {
  delete schema.properties.shell
}

export default defineComponent({
  name: 'x-filter',
  components: {},
  setup (_, { emit }) {
    const store = useStore()
    const toast = useToast()
    const refEditor = ref(null)

    const show = computed(() => store.state.showSetting)

    let editor: any = null

    onMounted(async () => {
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

      editor.watch('root.theme', () => {
        const theme = editor.getEditor('root.theme').getValue()
        if (getThemeName() !== theme) {
          setTheme(theme)
        }
      })

      const data = await api.fetchSettings()
      data.repos = Object.keys(data.repositories).map(name => ({
        name,
        path: data.repositories[name]
      }))

      if (data.repos.length < 1) {
        data.repos = [{ name: '', path: '' }]
      }

      data.theme = getThemeName()

      const value: any = {}

      Object.keys(schema.properties).forEach(key => {
        value[key] = data[key]
      })

      editor.setValue(value)
    })

    const cancel = () => {
      emit('close')
    }

    const ok = async () => {
      const value = editor && editor.getValue()
      if (value) {
        const repositories: any = {}
        value.repos.forEach(({ name, path }: any) => {
          name = name.trim()
          path = path.trim()
          if (name && path) {
            repositories[name] = path
          } else if (name) {
            toast.show('warning', '请选择储存位置')
            throw new Error('请选择储存位置')
          }
        })

        const data = { repositories, shell: value.shell }

        await api.writeSettings(data)
        store.dispatch('fetchRepositories')
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

    return { show, refEditor, cancel, ok, onClick }
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

  h3 {
    margin-top: 0;
  }
}

.editor {
  max-height: 50vh;
  overflow: auto;

  &> ::v-deep(div > .je-header),
  ::v-deep(.je-object__controls){
    display: none;
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
    align-content: center;
  }

  ::v-deep(.je-form-input-label) {
    width: 90px;
    // text-align: right;
    display: inline-block;
    flex: none;
    padding-right: 14px;
    line-height: 30px;
    height: 30px;
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
}

.action {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
}
</style>
