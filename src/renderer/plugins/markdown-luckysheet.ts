import { defineComponent, h, ref, watch } from 'vue'

import Markdown from 'markdown-it'
import { Plugin } from '@fe/context/plugin'
import { getLogger } from '@fe/utils'
import { Doc } from '@fe/support/types'
import { useModal } from '@fe/support/modal'
import { useToast } from '@fe/support/toast'
import { dirname, join } from '@fe/utils/path'
import env from '@fe/utils/env'
import store from '@fe/support/store'
import * as api from '@fe/support/api'
import { refreshTree } from '@fe/context/tree'
import { buildSrc, IFrame } from '@fe/context/embed'

const logger = getLogger('plugin-markdown-luckysheet')

const fileExt = '.luckysheet'

function buildSrcdoc (repo: string, path: string, full: boolean) {
  const options = { container: 'lucky-sheet', lang: 'zh', showtoolbarConfig: { print: false } }
  let onload = ''

  if (full) {
    onload = `
      const btn = document.createElement('button');
      btn.style = 'border: 0; background: #666; cursor: pointer; margin-left: 10px; color: #fff; padding: 4px 8px;';
      btn.innerText = '保存'
      btn.onclick = save
      document.querySelector('.luckysheet_info_detail .sheet-name').after(btn)
      document.querySelector('.luckysheet_info_detail .luckysheet_info_detail_update').innerText = '${path}'
      document.querySelector('.luckysheet_info_detail .luckysheet_info_detail_save').innerText = '未保存'

      const saved = () => document.querySelector('.luckysheet_info_detail .luckysheet_info_detail_save').innerText.startsWith('保存于')

      ${env.isElectron
        ? `
        let closeWindow = false
        const remote = window.nodeRequire('electron').remote
        window.onbeforeunload = evt => {
          if (saved() || closeWindow) return null

          evt.returnValue = true

          setTimeout(() => {
            let result = remote.dialog.showMessageBoxSync({
              type: 'question',
              cancelId: 1,
              message: '文档未保存，确定要关闭吗？',
              buttons: ['关闭', '取消']
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
      showstatisticBar: false,
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
    <link rel='stylesheet' href='/luckysheet/plugins/css/pluginsCss.css' />
    <link rel='stylesheet' href='/luckysheet/plugins/plugins.css' />
    <link rel='stylesheet' href='/luckysheet/css/luckysheet.css' />
    <link rel='stylesheet' href='/luckysheet/assets/iconfont/iconfont.css' />
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
    <script defer src="/luckysheet/plugins/js/plugin.js"></script>
    <script defer src="/luckysheet/luckysheet.umd.js"></script>
    <script>
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
          document.querySelector('.luckysheet_info_detail .luckysheet_info_detail_save').innerText = '保存中……'
          await writeFile(repo, path, JSON.stringify(window.luckysheet.getAllSheets()))
          document.querySelector('.luckysheet_info_detail .luckysheet_info_detail_save').innerText = '保存于：' + (new Date()).toLocaleString()
          await readFile(repo, path)
        } catch (error) {
          document.querySelector('.luckysheet_info_detail .luckysheet_info_detail_save').innerText = '保存失败：' + error.message
        }
      }

      async function init () {
        const options = ${JSON.stringify(options)}
        options.hook = {
          workbookCreateAfter,
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
    const srcdoc = ref('')

    const update = () => {
      srcdoc.value = buildSrcdoc(props.repo!, props.path!, false)
    }

    watch(props, update, { immediate: true })

    const button = (text: string, onClick: any) => h('button', {
      style: 'margin-left: 5px;font-size: 14px;background: #cacaca; border: 0; padding: 0 6px; color: #2c2b2b; cursor: pointer; border-radius: 2px; transition: all .1s ease-in-out; line-height: 24px;',
      onClick
    }, text)

    return () => h('div', { class: 'lucky-sheet-wrapper reduce-brightness', style: 'position: relative' }, [
      h(
        'div',
        {
          class: 'no-print',
          style: 'position: absolute; right: 15px; top: 3px; z-index: 1;'
        },
        [
          // button('全屏查看', () => 0),
          button('新窗口编辑', () => {
            const html = buildSrcdoc(props.repo!, props.path!, true)
            env.openWindow(buildSrc(html, '编辑表格', false, false), '_blank', { alwaysOnTop: false })
          }),
        ]
      ),
      h(IFrame, {
        html: srcdoc.value,
        debounce: 1000,
        iframeProps: {
          class: 'lucky-sheet',
          height: '500px'
        }
      })
    ])
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
    title: '创建 Luckysheet 文件',
    hint: '文件路径',
    content: '当前路径：' + currentPath,
    value: 'new-sheet' + fileExt,
    select: true
  })

  if (!filename) {
    return
  }

  if (!filename.endsWith(fileExt)) {
    filename = filename.replace(/\/$/, '') + fileExt
  }

  const path = join(currentPath, filename).replace(/^\//, '')

  if (!path) {
    throw new Error('需要传入文件路径')
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
  } catch (error) {
    useToast().show('warning', error.message)
    console.error(error)
  }
}

export default {
  name: 'markdown-luckysheet',
  register: ctx => {
    ctx.markdown.registerPlugin(MarkdownItPlugin)
    ctx.registerHook('ON_TREE_NODE_SELECT', async (item: Doc) => {
      if (item.path.toLowerCase().endsWith(fileExt)) {
        const srcdoc = buildSrcdoc(item.repo, item.path, true)
        env.openWindow(buildSrc(srcdoc, '编辑表格', false, false), '_blank', { alwaysOnTop: false })

        return true
      }

      return false
    })

    ctx.tree.registerContextMenu((items, node) => {
      if (node.type === 'dir') {
        items.push(
          { type: 'separator' },
          {
            id: 'create-luckysheet',
            type: 'normal',
            label: '创建 Luckysheet 文件',
            onClick: () => createLuckysheet(node)
          }
        )
      }

      return items
    })
  }
} as Plugin
