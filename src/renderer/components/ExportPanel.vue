<template>
  <XMask :show="showExport" @close="close" :maskCloseable="false">
    <div class="editor-wrapper" @click.stop>
      <h3>导出</h3>
      <iframe width="0" height="0" hidden id="export-download" name="export-download" @loadedmetadata="close" />
      <form ref="refExportForm" :action="`/api/convert/${convert.fileName}`" method="post" target="export-download">
        <input type="hidden" name="html" :value="convert.html">
        <div style="padding: 20px">
          <label>
            格式：
            <select name="type" v-model="convert.type">
              <option value="pdf">PDF</option>
              <option value="docx">Word (docx)</option>
              <option value="html">HTML</option>
              <option value="rst">reStructuredText</option>
              <option value="adoc">AsciiDoc</option>
            </select>
          </label>
          <div v-if="convert.type === 'pdf'" style="margin-top: 20px">
            <hr>
            <div v-if="isElectron">
              <div style="margin: 10px 0"><label>方向：<select name="type" v-model="convert.pdfOptions.landscape">
                <option value="">纵向</option>
                <option value="true">横向</option>
              </select></label></div>
              <div style="margin: 10px 0"><label>页面：<select name="type" v-model="convert.pdfOptions.pageSize">
                <option value="A3">A3</option>
                <option value="A4">A4</option>
                <option value="A5">A5</option>
                <option value="Legal">Legal</option>
                <option value="Letter">Letter</option>
                <option value="Tabloid">Tabloid</option>
              </select></label></div>
              <div style="margin: 10px 0"><label>缩放：<input v-model="convert.pdfOptions.scaleFactor" type="number" max="100" min="10" setp="1" style="display: inline-block;width: 4em"></label></div>
              <div style="margin: 10px 0"><label><input type="checkbox" v-model="convert.pdfOptions.printBackground"> 包含背景</label></div>
            </div>
            <div v-else>
              将使用浏览器打印功能
            </div>
          </div>
        </div>
        <div class="action">
          <button class="btn" @click.stop.prevent="close">取消</button>
          <button class="btn primary" @click.stop.prevent="ok">确定</button>
        </div>
      </form>
    </div>
  </XMask>
</template>

<script lang="ts">
import { useStore } from 'vuex'
import { computed, defineComponent, reactive, ref, toRefs } from 'vue'
import { isElectron, nodeRequire } from '@fe/utils/env'
import { getActionHandler } from '@fe/context/action'
import { FLAG_DEMO } from '@fe/support/global-args'
import { triggerHook } from '@fe/context/plugin'
import { useToast } from '@fe/support/toast'
import { sleep } from '@fe/utils'
import XMask from './Mask.vue'

export default defineComponent({
  name: 'export-panel',
  components: { XMask },
  setup () {
    const store = useStore()
    const toast = useToast()
    const refExportForm = ref<HTMLFormElement | null>(null)
    const { showExport, currentFile } = toRefs(store.state)
    const fileName = computed(() => currentFile.value?.name || 'export.md')
    const convert = reactive({
      fileName: '',
      html: '',
      type: 'pdf',
      pdfOptions: {
        landscape: '',
        pageSize: 'A4',
        scaleFactor: '100',
        printBackground: true,
      }
    })

    const close = () => store.commit('setShowExport', false)

    function filterHtml (html: string) {
      const div = document.createElement('div')
      div.innerHTML = html

      const filter = (node: HTMLElement) => {
        if (node.classList.contains('no-print')) {
          node.remove()
          return
        }

        if (node.dataset) {
          Object.keys(node.dataset).forEach(key => {
            delete node.dataset[key]
          })
        }

        node.classList.remove('source-line')
        node.removeAttribute('title')

        const len = node.children.length
        for (let i = len - 1; i >= 0; i--) {
          const ele = node.children[i]
          filter(ele as HTMLElement)
        }
      }

      filter(div)
      return div.innerHTML
    }

    async function exportPdf (name: string) {
      if (!isElectron) {
        close()
        await sleep(300)
        window.print()
      } else {
        close()
        toast.show('info', '转换中，请稍候……')
        await sleep(300)

        const content = nodeRequire('electron').remote.getCurrentWebContents()

        const { landscape, pageSize, scaleFactor, printBackground } = convert.pdfOptions
        const buffer: Buffer = await content.printToPDF({
          pageSize,
          printBackground,
          landscape: Boolean(landscape),
          scaleFactor: Number(scaleFactor)
        })

        const blob = new Blob([buffer], { type: 'application/pdf' })
        const link = document.createElement('a')
        link.href = window.URL.createObjectURL(blob)
        link.download = name + '.pdf'
        link.click()
      }
    }

    async function exportDoc () {
      triggerHook('ON_DOC_BEFORE_EXPORT')

      if (convert.type === 'pdf') {
        exportPdf(fileName.value)
        return
      }

      if (FLAG_DEMO) {
        toast.show('warning', 'DEMO 模式下该功能不可用')
        return
      }

      // 下载文件后关闭面板
      window.addEventListener('blur', close, { once: true })

      toast.show('info', '转换中，请稍候……', 5000)

      let baseUrl = location.origin + location.pathname.substring(0, location.pathname.lastIndexOf('/')) + '/'

      // Windows 下偶尔解析 localhost 很耗时，这里直接用 ip 代替
      if (/^(http|https):\/\/localhost/i.test(baseUrl)) {
        baseUrl = baseUrl.replace(/localhost/i, '127.0.0.1')
      }

      const html = getActionHandler('view.get-content-html')().replace(/src="api/g, `src="${baseUrl}api`);

      convert.fileName = `${fileName.value}.${convert.type}`
      convert.html = filterHtml(html)

      await sleep(300)
      refExportForm.value!.submit()
    }

    async function ok () {
      try {
        await exportDoc()
      } catch (error) {
        toast.show('warning', error.message)
        throw error
      }
    }

    return { showExport, refExportForm, ok, close, convert, isElectron }
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
