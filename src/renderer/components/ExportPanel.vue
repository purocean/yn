<template>
  <XMask :show="showExport" @close="close" :maskCloseable="false">
    <div class="wrapper" @click.stop>
      <h3>{{$t('export-panel.export')}}</h3>
      <form @submit.prevent>
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
                    <input v-model.number="convert.pdfOptions.scaleFactor" type="number" max="200" min="10" step="1" style="display: inline-block;width: 4em">
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
              <template v-if="localHtml">
                <div style="margin: 10px 0">
                  <label style="display: block; margin-bottom: 10px;"><input v-model="convert.localHtmlOptions.highlightCode" type="checkbox" /> {{$t('copy-content.highlight-code')}} </label>
                  <label style="display: block; margin-bottom: 10px;"><input v-model="convert.localHtmlOptions.uploadLocalImage" type="checkbox" /> {{$t('copy-content.upload-image')}} </label>
                  <label style="display: block; margin-bottom: 10px;"><input v-model="convert.localHtmlOptions.inlineLocalImage" type="checkbox" /> {{$t('copy-content.inline-image')}} </label>
                  <label style="display: block; margin-bottom: 10px;"><input v-model="convert.localHtmlOptions.includeStyle" type="checkbox" /> {{$t('copy-content.include-style')}} </label>
                  <label style="display: block; margin-bottom: 10px;"><input v-model="convert.localHtmlOptions.inlineStyle" type="checkbox" /> {{$t('copy-content.inline-style')}} </label>
                </div>
              </template>
            </template>
          </div>
        </div>
        <div class="action">
          <button class="btn tr" @click.stop.prevent="close">{{$t('cancel')}}</button>
          <button class="btn primary tr" @click.stop.prevent="ok">{{$t('ok')}}</button>
        </div>
      </form>
    </div>
  </XMask>
</template>

<script lang="ts">
import { computed, defineComponent, reactive, watch } from 'vue'
import { MARKDOWN_FILE_EXT } from '@share/misc'
import type { ExportType } from '@fe/types'
import store from '@fe/support/store'
import { isElectron } from '@fe/support/env'
import { FLAG_DEMO } from '@fe/support/args'
import { useToast } from '@fe/support/ui/toast'
import { useI18n } from '@fe/services/i18n'
import { convertCurrentDocument, printCurrentDocument, printCurrentDocumentToPDF, toggleExportPanel } from '@fe/services/export'
import { downloadContent, sleep } from '@fe/utils'
import { basename } from '@fe/utils/path'
import XMask from './Mask.vue'

export default defineComponent({
  name: 'export-panel',
  components: { XMask },
  setup () {
    const { t } = useI18n()

    const showExport = computed(() => store.state.showExport)
    const currentFile = computed(() => store.state.currentFile)
    const fileName = computed(() => basename(currentFile.value?.name || 'export.md', MARKDOWN_FILE_EXT))

    const toast = useToast()
    const convert = reactive({
      toType: 'pdf' as ExportType,
      fromType: 'html',
      localHtmlOptions: {
        inlineLocalImage: true,
        uploadLocalImage: false,
        inlineStyle: false,
        includeStyle: true,
        highlightCode: true,
      },
      pdfOptions: {
        landscape: '',
        pageSize: 'A4' as 'A4' | 'A3' | 'A5' | 'Legal' | 'Letter' | 'Tabloid',
        scaleFactor: 100,
        printBackground: true,
      }
    })

    watch(() => ({ ...convert.localHtmlOptions }), (val, prev) => {
      if (val.uploadLocalImage && val.inlineLocalImage) {
        if (!prev.uploadLocalImage) {
          convert.localHtmlOptions.inlineLocalImage = false
        } else {
          convert.localHtmlOptions.uploadLocalImage = false
        }
      }

      if (val.includeStyle && val.inlineStyle) {
        if (!prev.includeStyle) {
          convert.localHtmlOptions.inlineStyle = false
        } else {
          convert.localHtmlOptions.includeStyle = false
        }
      }
    })

    const localHtml = computed(() => convert.toType === 'html' && convert.fromType === 'html')

    function close () {
      toggleExportPanel(false)
    }

    async function exportPdf (name: string) {
      await sleep(300)
      if (!isElectron) {
        // in browser, use print api
        await printCurrentDocument()
      } else {
        const { landscape, pageSize, scaleFactor, printBackground } = convert.pdfOptions
        convert.pdfOptions.scaleFactor = Math.min(200, Math.max(10, convert.pdfOptions.scaleFactor))


        const buffer = await printCurrentDocumentToPDF({
          pageSize,
          printBackground,
          landscape: Boolean(landscape),
          scale: scaleFactor / 100,
        })

        downloadContent(name + '.pdf', buffer, 'application/pdf')
      }
    }

    async function ok () {
      try {
        if (!currentFile.value || !currentFile.value.content) {
          return
        }

        close()

        if (convert.toType === 'pdf') {
          exportPdf(fileName.value)
          return
        }

        if (FLAG_DEMO) {
          toast.show('warning', t('demo-tips'))
          return
        }

        toast.show('info', t('export-panel.loading'), 5000)

        const blob = await convertCurrentDocument({
          fromType: convert.fromType as any,
          toType: convert.toType as any,
          fromHtmlOptions: convert.localHtmlOptions,
        })

        downloadContent(fileName.value + '.' + convert.toType, blob)
        toast.hide()
      } catch (error: any) {
        toast.show('warning', error.message)
        throw error
      }
    }

    return { localHtml, ok, close, convert, isElectron, showExport }
  },
})
</script>

<style lang="scss" scoped>
.wrapper {
  width: 400px;
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
