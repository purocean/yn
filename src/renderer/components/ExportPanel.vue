<template>
  <XMask :show="showExport" @close="close" :maskCloseable="false">
    <div class="wrapper" @click.stop>
      <h3>导出</h3>
      <iframe width="0" height="0" hidden id="export-download" name="export-download" @loadedmetadata="close" />
      <form ref="refExportForm" :action="`/api/convert/${convert.fileName}`" method="post" target="export-download">
        <input type="hidden" name="source" :value="convert.source">
        <div style="padding: 20px">
          <label>
            格式：
            <select name="toType" v-model="convert.toType">
              <option value="pdf">PDF</option>
              <option value="docx">Word (docx)</option>
              <option value="html">HTML</option>
              <option value="rst">reStructuredText</option>
              <option value="adoc">AsciiDoc</option>
            </select>
          </label>
          <div style="margin-top: 20px">
            <hr>
            <template v-if="convert.toType === 'pdf'">
              <div v-if="isElectron">
                <div style="margin: 10px 0"><label>方向：<select v-model="convert.pdfOptions.landscape">
                  <option value="">纵向</option>
                  <option value="true">横向</option>
                </select></label></div>
                <div style="margin: 10px 0"><label>页面：<select v-model="convert.pdfOptions.pageSize">
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
            </template>
            <template v-else>
              <div style="margin: 10px 0">
                <label><input name="fromType" :value="convert.fromType" type="radio" :checked="convert.fromType === 'html'" @change="() => convert.fromType = 'html'"> 使用渲染后的 HTML 转换 </label>
                <label><input name="fromType" :value="convert.fromType" type="radio" :checked="convert.fromType === 'markdown'" @change="() => convert.fromType = 'markdown'"> 使用 Markdown 转换 </label>
              </div>
            </template>
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
import { isElectron, nodeRequire } from '@fe/support/env'
import { getContentHtml } from '@fe/services/view'
import { FLAG_DEMO } from '@fe/support/args'
import { triggerHook } from '@fe/core/hook'
import { useToast } from '@fe/support/ui/toast'
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
      source: '',
      toType: 'pdf',
      fromType: 'html',
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
      if (!currentFile.value || !currentFile.value.content) {
        return
      }

      triggerHook('DOC_BEFORE_EXPORT')

      if (convert.toType === 'pdf') {
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

      const source = convert.fromType === 'markdown'
        ? currentFile.value.content
        : getContentHtml().replace(/src="api/g, `src="${baseUrl}api`)

      convert.fileName = `${fileName.value}.${convert.toType}`
      convert.source = filterHtml(source)

      await sleep(300)
      refExportForm.value!.submit()
    }

    async function ok () {
      try {
        await exportDoc()
      } catch (error: any) {
        toast.show('warning', error.message)
        throw error
      }
    }

    return { showExport, refExportForm, ok, close, convert, isElectron }
  },
})
</script>

<style lang="scss" scoped>
.wrapper {
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

.action {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
}
</style>
