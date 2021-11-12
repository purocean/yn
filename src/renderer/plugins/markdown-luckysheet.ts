import { defineComponent, h, ref, watch } from 'vue'
import Markdown from 'markdown-it'
import { Plugin } from '@fe/context'
import { getLogger } from '@fe/utils'
import type { Doc } from '@fe/types'
import { useModal } from '@fe/support/ui/modal'
import { useToast } from '@fe/support/ui/toast'
import { dirname, join } from '@fe/utils/path'
import { isElectron, openWindow } from '@fe/support/env'
import store from '@fe/support/store'
import * as api from '@fe/support/api'
import { refreshTree } from '@fe/services/tree'
import { buildSrc, IFrame } from '@fe/support/embed'
import { getCurrentLanguage, t, useI18n } from '@fe/services/i18n'
import { FLAG_DEMO } from '@fe/support/args'
import Mask from '@fe/components/Mask.vue'

const logger = getLogger('plugin-markdown-luckysheet')

const fileExt = '.luckysheet'

function buildSrcdoc (repo: string, path: string, full: boolean) {
  const lang = getCurrentLanguage() === 'zh-CN' ? 'zh' : 'en'
  const options = { container: 'lucky-sheet', lang, plugins: ['chart'], showtoolbarConfig: { print: false } }
  let onload = ''

  if (full) {
    onload = `
      const btn = document.createElement('button');
      btn.style = 'border: 0; background: #666; cursor: pointer; margin-left: 10px; color: #fff; padding: 4px 8px;';
      btn.innerText = '${t('save')}'
      btn.onclick = save
      document.querySelector('.luckysheet_info_detail .sheet-name').after(btn)
      document.querySelector('.luckysheet_info_detail .luckysheet_info_detail_update').innerText = '${path}'
      setStatus('${t('file-status.loaded')}')

      ${isElectron
        ? `
        let closeWindow = false
        const remote = window.nodeRequire && window.nodeRequire('electron').remote
        window.onbeforeunload = evt => {
          if (saved() || closeWindow) return null

          if (!remote) {
            return true
          }

          evt.returnValue = true

          setTimeout(() => {
            let result = remote.dialog.showMessageBoxSync({
              type: 'question',
              cancelId: 1,
              message: '${t('quit-check-dialog.desc')}',
              buttons: ['${t('quit-check-dialog.buttons.discard')}', '${t('quit-check-dialog.buttons.cancel')}']
            })

            if (result === 0) {
              closeWindow = true
              remote.getCurrentWindow().close()
            }
          })
        }` : 'window.onbeforeunload = () => saved() ? null : true'
      }

      window.addEventListener('keydown', e => {
        const isMacOS = /macintosh|mac os x/i.test(navigator.userAgent)
        const ctrl = isMacOS ? e.metaKey : e.ctrlKey
        if (ctrl && e.code === 'KeyS') {
          save()
          e.stopPropagation()
          e.preventDefault()
        }
      })
    `
    Object.assign(options, {})
  } else {
    Object.assign(options, {
      showtoolbar: false,
      showinfobar: false,
      allowEdit: false,
      showsheetbarConfig: {
        add: false,
        menu: false,
        sheet: true
      },
      sheetRightClickConfig: {
        delete: false,
        copy: false,
        rename: false,
        color: false,
        hide: false,
        move: false,
      },
    })
  }

  return `
    <link rel="stylesheet" href="/embed/plugins/css/pluginsCss.css" />
    <link rel="stylesheet" href="/embed/plugins/plugins.css" />
    <link rel="stylesheet" href="/embed/css/luckysheet.css" />
    <link rel="stylesheet" href="/embed/assets/iconfont/iconfont.css" />
    <link rel="stylesheet" href="/embed/expendPlugins/chart/chartmix.css" />
    <style>
      html, body {
        height: 100%;
        padding: 0;
        margin: 0;
      }

      .luckysheet_info_detail_back ,
      .luckysheet_info_detail .sheet-name {
        display: none;
      }

      .luckysheet_info_detail .luckysheet_info_detail_update {
        font-size: 18px;
        color: #222;
      }
    </style>
    <div id="lucky-sheet" style="height: 100%"></div>
    <script src="/embed/plugins/js/plugin.js"></script>
    <script src="/embed/luckysheet.umd.js"></script>
    <script>
      window.getStatus = () => document.querySelector('.luckysheet_info_detail .luckysheet_info_detail_save').innerText
      window.setStatus = str => document.querySelector('.luckysheet_info_detail .luckysheet_info_detail_save').innerText = str
      window.saved = () => getStatus().startsWith('${t('lucky-sheet.saved-at')}') || getStatus() === '${t('file-status.loaded')}'

      async function fetchHttp (input, init) {
        const response = await fetch(input, init)
        const result = await response.json()
        if (result.status !== 'ok') {
          throw new Error(result.message)
        }

        return result
      }

      async function readFile (repo, path) {
        try {
          const result = await fetchHttp(\`/api/file?path=\${encodeURIComponent(path)}&repo=\${encodeURIComponent(repo)}\`)
          const hash = result.data.hash
          const content = result.data.content

          window.hash = hash

          return content
        } catch (error) {
          document.getElementById('lucky-sheet').innerHTML = error.message
        }
      }

      async function writeFile (repo, path, content) {
        try {
          const result = await fetchHttp('/api/file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repo, path, content, old_hash: window.hash })
          })

          return { hash: result.data }
        } catch (error) {
          alert(error.message)
          throw error
        }
      }

      function workbookCreateAfter () {
        ${onload}
      }

      const path = '${path}'
      const repo = '${repo}'

      async function save () {
        try {
          setStatus('${t('file-status.saving')}...')
          await writeFile(repo, path, JSON.stringify(window.luckysheet.getAllSheets()))
          setStatus('${t('lucky-sheet.saved-at')}: ' + (new Date()).toLocaleString())
          await readFile(repo, path)
        } catch (error) {
          setStatus('${t('file-status.save-failed')}: ' + error.message)
        }
      }

      async function init () {
        const options = ${JSON.stringify(options)}
        options.hook = {
          workbookCreateAfter,
          updated () {
            setStatus('${t('file-status.unsaved')}')
          }
        }

        const content = await readFile(repo, path)

        options.data = JSON.parse(content)
        window.luckysheet.create(options)
      }

      init()
    </script>
  `
}

const LuckyComponent = defineComponent({
  name: 'lucky-sheet',
  props: {
    repo: String,
    path: String
  },
  setup (props) {
    logger.debug('setup', props)

    useI18n()

    const srcdoc = ref('')
    const refIFrame = ref<any>()
    const refFullIFrame = ref<any>()
    const fullScreen = ref(false)

    const update = () => {
      srcdoc.value = buildSrcdoc(props.repo!, props.path!, false)
    }

    const reload = () => {
      refIFrame.value.reload()
    }

    const open = () => {
      fullScreen.value = true
    }

    const close = async () => {
      try {
        refFullIFrame.value.close()
        fullScreen.value = false
      } catch {
        if (await useModal().confirm({ title: t('quit-check-dialog.title'), content: t('quit-check-dialog.desc') })) {
          fullScreen.value = false
        }
      }
    }

    watch(props, update, { immediate: true })

    if (FLAG_DEMO) {
      watch([refFullIFrame, refIFrame], () => {
        if (refIFrame.value) {
          refIFrame.value.reload = () => {
            useToast().show('warning', t('demo-tips'))
          }
        }

        document.querySelectorAll('iframe.lucky-sheet').forEach(x => {
          (x as any).contentWindow.fetch = window.fetch
        })
      })
    }

    const button = (text: string, onClick: any) => h('button', {
      style: 'margin-left: 5px;font-size: 14px;background: #cacaca; border: 0; padding: 0 6px; color: #2c2b2b; cursor: pointer; border-radius: 4px; transition: all .1s ease-in-out; line-height: 24px;',
      onClick
    }, text)

    const topOffset = isElectron ? '30px' : '0px'

    const buildIFrame = (full: boolean) => h(IFrame, {
      ref: full ? refFullIFrame : refIFrame,
      html: buildSrcdoc(props.repo!, props.path!, full),
      debounce: 1000,
      iframeProps: {
        class: 'lucky-sheet',
        style: 'margin: 0;display:block;height: ' + (full ? `calc(100vh - ${topOffset})` : '500px'),
        width: '100%'
      }
    })

    return () => [
      fullScreen.value && h(Mask, {
        show: true,
        maskCloseable: false,
        escCloseable: false,
        style: { paddingTop: topOffset }
      }, [
        h(
          'div',
          {
            class: 'no-print',
            style: 'position: absolute; right: 15px; margin-top: 15px; z-index: 1;'
          },
          button(t('close'), close),
        ),
        buildIFrame(true),
      ]),

      h('div', { class: 'lucky-sheet-wrapper reduce-brightness', style: 'position: relative' }, [
        h(
          'div',
          {
            class: 'no-print',
            style: 'position: absolute; right: 15px; top: 3px; z-index: 1;'
          },
          [
            button(t('edit'), open),
            button(t('reload'), reload),
            button(t('open-in-new-window'), () => {
              const html = buildSrcdoc(props.repo!, props.path!, true)
              openWindow(buildSrc(html, t('lucky-sheet.edit-sheet'), false), '_blank', { alwaysOnTop: false })
            }),
          ]
        ),
        buildIFrame(false)
      ])
    ]
  }
})

const MarkdownItPlugin = (md: Markdown) => {
  const linkTemp = md.renderer.rules.link_open!.bind(md.renderer.rules)
  md.renderer.rules.link_open = (tokens, idx, options, env, slf) => {
    const token = tokens[idx]

    if (token.attrGet('link-type') !== 'luckysheet') {
      return linkTemp(tokens, idx, options, env, slf)
    }

    const { currentFile } = store.state
    if (!currentFile) {
      return linkTemp(tokens, idx, options, env, slf)
    }

    const url = token.attrGet('origin-href')
    if (!url || url.includes(':')) {
      return linkTemp(tokens, idx, options, env, slf)
    }

    const path = join(dirname(currentFile.path), url)

    const nextToken = tokens[idx + 1]
    if (nextToken && nextToken.type === 'text') {
      nextToken.content = ''
    }

    return h(LuckyComponent, { repo: currentFile.repo, path }) as any
  }
}

async function createLuckysheet (node: Doc) {
  const currentPath = node.path

  let filename = await useModal().input({
    title: t('lucky-sheet.create-dialog-title'),
    hint: t('document.create-dialog.hint'),
    content: t('document.current-path', currentPath),
    value: 'new-sheet' + fileExt,
    select: true
  })

  if (!filename) {
    return
  }

  if (!filename.endsWith(fileExt)) {
    filename = filename.replace(/\/$/, '') + fileExt
  }

  const path = join(currentPath, filename)

  if (!path) {
    throw new Error('Need Path')
  }

  const file: Doc = { repo: node.repo, path: path, type: 'file', name: '', contentHash: 'new' }

  if (typeof file.content !== 'string') {
    file.content = JSON.stringify([{
      name: 'Sheet1',
      color: '',
      status: 1,
      order: 0,
      data: Array(20).fill(Array(14).fill(null)),
      config: {
        merge: {},
        rowlen: {},
        rowhidden: {}
      },
      index: 0,
      jfgird_select_save: [],
      luckysheet_select_save: [{
        row: [0, 0],
        column: [0, 0],
        row_focus: 0,
        column_focus: 0,
        left: 0,
        width: 73,
        top: 0,
        height: 19,
        left_move: 0,
        width_move: 73,
        top_move: 0,
        height_move: 19
      }],
      visibledatarow: [],
      visibledatacolumn: [],
      ch_width: 4560,
      rh_height: 1760,
      luckysheet_selection_range: [],
      zoomRatio: 1,
      scrollLeft: 0,
      scrollTop: 0,
      calcChain: [],
      filter_select: null,
      filter: null,
      luckysheet_conditionformat_save: [],
      luckysheet_alternateformat_save: [],
      dataVerification: {},
      hyperlink: {},
      celldata: []
    }])
  }

  try {
    await api.writeFile(file, file.content)
    refreshTree()
  } catch (error: any) {
    useToast().show('warning', error.message)
    console.error(error)
  }
}

export default {
  name: 'markdown-luckysheet',
  register: ctx => {
    ctx.markdown.registerPlugin(MarkdownItPlugin)
    ctx.registerHook('TREE_NODE_SELECT', async ({ node }) => {
      if (node.path.toLowerCase().endsWith(fileExt)) {
        const srcdoc = buildSrcdoc(node.repo, node.path, true)
        openWindow(buildSrc(srcdoc, t('lucky-sheet.edit-sheet'), false), '_blank', { alwaysOnTop: false })

        return true
      }

      return false
    })

    ctx.tree.tapContextMenus((items, node) => {
      if (node.type === 'dir') {
        items.push(
          { type: 'separator' },
          {
            id: 'create-luckysheet',
            type: 'normal',
            label: t('lucky-sheet.create-dialog-title'),
            onClick: () => createLuckysheet(node)
          }
        )
      }
    })
  }
} as Plugin
