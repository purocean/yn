<template>
  <div class="editor-wrapper" @click.stop>
    <h3>配置项</h3>
    <div ref="refEditor" class="editor" @click="onClick" />
    <div class="action">
      <button @click="cancel">取消</button>
      <button class="primary" @click="ok">确定</button>
    </div>
  </div>
</template>

<script lang="ts">
import { useStore } from 'vuex'
import { computed, defineComponent, onMounted, ref } from 'vue'
import { JSONEditor } from '@json-editor/json-editor'
import file from '../useful/file'

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
          name: { type: 'string', title: '仓库名' },
          path: { type: 'string', title: '路径', readonly: true }
        }
      },
    },
    shell: {
      title: '终端 Shell',
      type: 'string',
    },
  }
}

export default defineComponent({
  name: 'x-filter',
  components: {},
  setup (_, { emit }) {
    const store = useStore()
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

      const data = await file.fetchSettings()
      data.repos = Object.keys(data.repositories).map(name => ({
        name,
        path: data.repositories[name]
      }))

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
      emit('close')
      const value = editor && editor.getValue()
      if (value) {
        const repositories: any = {}
        value.repos.forEach(({ name, path }: any) => {
          name = name.trim()
          path = path.trim()
          if (name && path) {
            repositories[name] = path
          }
        })

        const data = { repositories, shell: value.shell }

        await file.writeSettings(data)
        store.dispatch('fetchRepositories')
      }
    }

    const onClick = async (e: Event) => {
      const target = e.target as HTMLInputElement
      if (target.name && target.name.endsWith('[path]')) {
        const jsonPath = target.name.replace(/\]/g, '').replace(/\[/g, '.')
        const field = editor.getEditor(jsonPath)
        const { canceled, filePaths } = await file.choosePath({
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
  background: #383a39;
  margin: auto;
  padding: 10px;
  color: #eee;

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

  ::v-deep(input),
  ::v-deep(select),
  ::v-deep(textarea) {
    border: 0;
    font-size: 18px;
    line-height: 1.4em;
    padding: 3px 6px;
    box-sizing: border-box;
    background: #545454;
    width: 100%;
    color: #ddd;
    transition: all .1s ease-in-out;
    display: block;
  }
}

.action {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
}

.editor ::v-deep(button),
button {
  background: #4c4c4c;
  border: 0;
  padding: 5px 10px;
  color: #ccc;
  cursor: pointer;
  border-radius: 2px;
  transition: all .1s ease-in-out;
  margin-right: 3px;

  &.primary {
    background: #71706e;
  }

  &:hover {
    background: #807d7d;
  }
}
</style>
