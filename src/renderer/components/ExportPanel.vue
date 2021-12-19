<template>
  <XMask :show="showExport" @close="close" :maskCloseable="false">
    <div class="wrapper" @click.stop>
      <h3>{{$t('export-panel.export')}}</h3>
      <iframe width="0" height="0" hidden id="export-download" name="export-download" @loadedmetadata="close" />
      <form ref="refExportForm" :action="`/api/convert/${convert.fileName}`" method="post" target="export-download">
        <input type="hidden" name="source" :value="convert.source">
        <div style="padding: 20px">
          <label class="row-label">
            {{$t('export-panel.format')}}
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
                <div style="margin: 20px 0 10px">
                  <label class="row-label">
                    {{$t('export-panel.pdf.orientation')}}
                    <select v-model="convert.pdfOptions.landscape">
                      <option value="">{{$t('export-panel.pdf.portrait')}}</option>
                      <option value="true">{{$t('export-panel.pdf.landscape')}}</option>
                    </select>
                  </label>
                </div>
                <div style="margin: 10px 0">
                  <label class="row-label">
                    {{$t('export-panel.pdf.size')}}
                    <select v-model="convert.pdfOptions.pageSize">
                      <option value="A3">A3</option>
                      <option value="A4">A4</option>
                      <option value="A5">A5</option>
                      <option value="Legal">Legal</option>
                      <option value="Letter">Letter</option>
                      <option value="Tabloid">Tabloid</option>
                    </select>
                  </label>
                </div>
                <div style="margin: 10px 0">
                  <label class="row-label">
                    {{$t('export-panel.pdf.zoom')}}
                    <input v-model="convert.pdfOptions.scaleFactor" type="number" max="100" min="10" setp="1" style="display: inline-block;width: 4em">
                  </label>
                </div>
                <div style="margin: 10px 0"><label><input type="checkbox" v-model="convert.pdfOptions.printBackground"> {{$t('export-panel.pdf.include-bg')}}</label></div>
              </div>
              <div v-else> {{$t('export-panel.pdf.use-browser')}} </div>
            </template>
            <template v-else>
              <div style="margin: 20px 0 10px">
                <label><input name="fromType" :value="convert.fromType" type="radio" :checked="convert.fromType === 'html'" @change="() => convert.fromType = 'html'"> {{$t('export-panel.use-html')}} </label>
              </div>
              <div style="margin: 10px 0">
                <label><input name="fromType" :value="convert.fromType" type="radio" :checked="convert.fromType === 'markdown'" @change="() => convert.fromType = 'markdown'"> {{$t('export-panel.use-markdown')}} </label>
              </div>
            </template>
          </div>
        </div>
        <div class="action">
          <button class="btn" @click.stop.prevent="close">{{$t('cancel')}}</button>
          <button class="btn primary" @click.stop.prevent="ok">{{$t('ok')}}</button>
        </div>
      </form>
    </div>
  </XMask>
</template>

<script lang="ts">
import { useStore } from 'vuex'
import { computed, defineComponent, reactive, ref, toRefs } from 'vue'
import { getElectronRemote, isElectron } from '@fe/support/env'
import { getContentHtml } from '@fe/services/view'
import { FLAG_DEMO } from '@fe/support/args'
import { triggerHook } from '@fe/core/hook'
import { useToast } from '@fe/support/ui/toast'
import { useI18n } from '@fe/services/i18n'
import { sleep } from '@fe/utils'
import type { ExportTypes } from '@fe/types'
import XMask from './Mask.vue'

export default defineComponent({
  name: 'export-panel',
  components: { XMask },
  setup () {
    const { t } = useI18n()

    const store = useStore()
    const toast = useToast()
    const refExportForm = ref<HTMLFormElement | null>(null)
    const { showExport, currentFile } = toRefs(store.state)
    const fileName = computed(() => currentFile.value?.name || 'export.md')
    const convert = reactive({
      fileName: '',
      source: '',
      toType: 'pdf' as ExportTypes,
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
        toast.show('info', t('export-panel.loading'))
        await sleep(300)

        const content = getElectronRemote().getCurrentWebContents()

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

      await triggerHook('DOC_BEFORE_EXPORT', { type: convert.toType }, { breakable: true })

      if (convert.toType === 'pdf') {
        exportPdf(fileName.value)
        return
      }

      if (FLAG_DEMO) {
        toast.show('warning', t('demo-tips'))
        return
      }

      // close when download complete
      window.addEventListener('blur', close, { once: true })

      toast.show('info', t('export-panel.loading'), 5000)

      let baseUrl = location.origin + location.pathname.substring(0, location.pathname.lastIndexOf('/')) + '/'

      // replace localhost to ip, somtimes resolve localhost take too much time on windows.
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
  width: 400px;
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

.row-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
