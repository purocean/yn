import Markdown from 'markdown-it'
import { defineComponent, h, onBeforeUnmount, ref, watch } from 'vue'
import { Plugin } from '@fe/context'
import { buildSrc, IFrame } from '@fe/support/embed'
import * as api from '@fe/support/api'
import { isElectron, openWindow } from '@fe/support/env'
import { useModal } from '@fe/support/ui/modal'
import { useToast } from '@fe/support/ui/toast'
import { FLAG_DEMO } from '@fe/support/args'
import { t, useI18n } from '@fe/services/i18n'
import { emitResize } from '@fe/services/layout'
import { refreshTree } from '@fe/services/tree'
import { join } from '@fe/utils/path'
import type { Doc } from '@fe/types'
import Mask from '@fe/components/Mask.vue'

const Drawio = defineComponent({
  name: 'drawio',
  props: {
    repo: String,
    path: String,
    content: String
  },
  setup (props) {
    const { t } = useI18n()
    const srcdoc = ref('')
    const refIFrame = ref<any>()
    const refFullIFrame = ref<any>()
    const fullScreen = ref(false)

    const init = async () => {
      srcdoc.value = await buildSrcdoc({ repo: props.repo, path: props.path, content: props.content || '' })
    }

    watch(props, init, { immediate: true })

    const resize = () => {
      const iframe = refIFrame.value.getIframe()
      if (iframe && iframe.contentDocument.body) {
        iframe.contentDocument.body.style.height = 'auto'
        iframe.contentDocument.documentElement.style.height = 'auto'
        iframe.height = iframe.contentDocument.documentElement.offsetHeight + 'px'
        iframe.contentDocument.body.style.height = iframe.contentDocument.body.clientHeight + 'px'
        iframe.contentDocument.documentElement.style.height = '100%'
        emitResize()
      }
    }

    const reload = async () => {
      const oldSrc = srcdoc.value
      await init()
      if (oldSrc === srcdoc.value) {
        refIFrame.value.reload()
      }
    }

    let timer: any

    onBeforeUnmount(() => {
      timer && clearTimeout(timer)
    })

    const button = (text: string, onClick: any) => h('button', {
      class: 'small',
      onClick
    }, text)

    if (FLAG_DEMO) {
      watch([refFullIFrame, refIFrame], () => {
        document.querySelectorAll('iframe.drawio-editor').forEach(x => {
          (x as any).contentWindow.fetch = window.fetch
        })
      })
    }

    return () => {
      let drawioFile: Doc | undefined
      if (props.repo && props.path) {
        drawioFile = { name: 'diagram.drawio', type: 'file', repo: props.repo, path: props.path }
      }

      const topOffset = isElectron ? '30px' : '0px'

      return [
        fullScreen.value && drawioFile && h(Mask, {
          show: true,
          maskCloseable: false,
          escCloseable: false,
          style: { paddingTop: topOffset }
        }, [
          h(IFrame, {
            html: buildEditorSrcdoc(drawioFile),
            ref: refFullIFrame,
            onLoad: (iframe) => {
              iframe.contentWindow!.close = () => {
                fullScreen.value = false
                reload()
              }
            },
            iframeProps: {
              class: 'drawio-editor no-print',
              style: { background: 'rgba(255, 255, 255, 0.5)', position: 'absolute', zIndex: 1, margin: 0, display: 'block', height: `calc(100vh - ${topOffset})` },
              width: '100%'
            },
          }),
        ]),

        h('div', { class: 'drawio-wrapper reduce-brightness', style: 'position: relative' }, [
          h(
            'div',
            {
              class: 'no-print',
              style: 'position: absolute; right: 15px; top: 3px; z-index: 1;'
            },
            [
              button(t('drawio.fit-height'), resize),
              button(t('reload'), reload),
              ...(drawioFile ? [
                button(t('edit'), () => { fullScreen.value = true }),
                button(t('open-in-new-window'), () => {
                  openWindow(buildSrc(buildEditorSrcdoc(drawioFile!), t('drawio.edit-diagram')), '_blank', { alwaysOnTop: false })
                }),
              ] : [
                button(t('open-in-new-window'), () => openWindow(buildSrc(srcdoc.value, t('view-figure')))),
              ]),
            ]
          ),
          h(IFrame, {
            html: srcdoc.value,
            ref: refIFrame,
            onLoad: () => {
              resize()
              timer = setTimeout(resize, 1000)
            },
            iframeProps: {
              class: 'drawio',
              height: '300px',
            },
          })
        ])
      ]
    }
  }
})

const MarkdownItPlugin = (md: Markdown) => {
  const render = ({ url, content }: any) => {
    if (url) {
      const params = new URLSearchParams(url.replace(/^.*\?/, ''))
      const repo = params.get('repo') || (FLAG_DEMO ? 'help' : '')
      const path = params.get('path') || ''
      return h(Drawio, { repo, path, content })
    }

    h(Drawio, { url, content })
  }

  const linkTemp = md.renderer.rules.link_open!.bind(md.renderer.rules)
  md.renderer.rules.link_open = (tokens, idx, options, env, slf) => {
    const token = tokens[idx]

    if (token.attrGet('link-type') !== 'drawio') {
      return linkTemp(tokens, idx, options, env, slf)
    }

    const url = token.attrGet('href')
    const nextToken = tokens[idx + 1]
    if (nextToken && nextToken.type === 'text') {
      nextToken.content = ''
    }

    return render({ url }) as any
  }

  const fenceTemp = md.renderer.rules.fence!.bind(md.renderer.rules)
  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx]

    const code = token.content.trim()
    const firstLine = code.split(/\n/)[0].trim()
    if (token.info !== 'xml' || !firstLine.includes('--drawio--')) {
      return fenceTemp(tokens, idx, options, env, slf)
    }

    return render({ content: code }) as any
  }
}

type F = { repo?: string; path?: string; url?: string; content: string }

async function buildSrcdoc ({ repo, path, content }: F) {
  if (!content && repo && path) {
    content = (await api.readFile({ repo, path })).content
  }

  content = content.replace(/<!--.*?-->/gs, '').trim()

  const div = document.createElement('div')
  div.className = 'mxgraph'
  div.dataset.mxgraph = JSON.stringify({
    highlight: '#00afff',
    lightbox: false,
    nav: true,
    resize: true,
    toolbar: 'pages zoom layers',
    page: 1,
    xml: content,
  })

  return `
    <style>
      ::selection {
        background: #d3d3d3;
      }

      ::-webkit-scrollbar {
        width: 7px;
        height: 7px;
      }

      ::-webkit-scrollbar-track {
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.08);
        box-shadow: inset 0 0 5px rgba(255, 255, 255, 0.1);
      }

      ::-webkit-scrollbar-thumb {
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.09);
        box-shadow: inset 0 0 6px rgba(255, 255, 255, 0.1);
      }

      ::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.15);
      }

      .mxgraph {
        max-width: 100%;
      }

      .geDiagramContainer {
        max-width: 100%;
        max-height: 100%;
      }

      body {
        background: #fff;
      }
    </style>
    ${div.outerHTML}
    <script src="${location.origin}/drawio/js/viewer.min.js"></script>
  `
}

function buildEditorSrcdoc (file: Doc) {
  if (FLAG_DEMO) {
    file.repo = 'help'
  }

  return `
    <style>
      html, body {
        height: 100%;
        padding: 0;
        margin: 0;
      }
    </style>
    <script>
      function init (doc) {
        const DRAW_IFRAME_URL = '/drawio/index.html?embed=1&proto=json';

        const iframe = document.createElement('iframe')
        iframe.style.boxSizing = 'border-box'
        iframe.style.width = '100vw'
        iframe.style.height = '100vh'
        iframe.style.border = 'none'
        iframe.setAttribute('frameborder', '0')

        ${isElectron ? `
          window.onbeforeunload = evt => {
            iframe.contentWindow.postMessage(JSON.stringify({ action: 'exit' }), '*');
          }
        ` : ''}

        const asPng = doc.path.endsWith('.png')

        const receive = async function (evt) {
          try {
            if (evt.data.length < 1) {
              return
            }

            const msg = JSON.parse(evt.data)
            const { event } = msg

            if (event === 'init') {
              let { content, hash } = await window.embedCtx.api.readFile(doc, asPng)
              doc.contentHash = hash

              if (asPng) {
                content = 'data:image/png;base64,' + content
              }

              const payload ={ action: 'load', autosave: 0 }

              if (asPng) {
                payload.xmlpng = content
              } else {
                payload.xml = content
              }

              iframe.contentWindow.postMessage(JSON.stringify(payload), '*')
            } else if (event === 'export') {
              console.log('export', msg.format)
              if (asPng && msg.format === 'xmlpng') {
                const { hash } = await window.embedCtx.api.writeFile(doc, msg.data, true)
                doc.contentHash = hash
                iframe.contentWindow.postMessage(JSON.stringify({ action: 'status', modified: false }), '*');
              }
            } else if (event === 'save') {
              console.log('save', asPng)

              if (asPng) {
                iframe.contentWindow.postMessage(JSON.stringify({
                  xml: msg.xml,
                  action: 'export',
                  format: 'xmlpng',
                  spin: 'Updating page',
                }), '*');
              } else {
                const { hash } = await window.embedCtx.api.writeFile(doc, msg.xml)
                doc.contentHash = hash
              }
            } else if (event === 'exit') {
              console.log('exit')
              window.close()
            }
          } catch (error) {
            alert(error.message)
            throw error
          }
        }

        window.addEventListener('message', receive)
        iframe.setAttribute('src', DRAW_IFRAME_URL)
        document.body.appendChild(iframe)
      }

      window.addEventListener('load', () => init(${JSON.stringify(file)}))
    </script>
  `
}

async function createDrawioFile (node: Doc, fileExt: '.drawio' | '.drawio.png') {
  const currentPath = node.path

  let filename = await useModal().input({
    title: t('drawio.create-drawio-file', fileExt),
    hint: t('document.create-dialog.hint'),
    content: t('document.current-path', currentPath),
    value: 'new-diagram' + fileExt,
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
  let isBase64: boolean
  let content: string

  if (fileExt === '.drawio.png') {
    isBase64 = true
    content = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHkAAAA9CAYAAACJM8YzAAAAAXNSR0IArs4c6QAAA0B0RVh0bXhmaWxlACUzQ214ZmlsZSUyMGhvc3QlM0QlMjJlbWJlZC5kaWFncmFtcy5uZXQlMjIlMjBtb2RpZmllZCUzRCUyMjIwMjItMDEtMTFUMDglM0EyNCUzQTEyLjA2NFolMjIlMjBhZ2VudCUzRCUyMjUuMCUyMChNYWNpbnRvc2glM0IlMjBJbnRlbCUyME1hYyUyME9TJTIwWCUyMDEwXzE1XzcpJTIwQXBwbGVXZWJLaXQlMkY1MzcuMzYlMjAoS0hUTUwlMkMlMjBsaWtlJTIwR2Vja28pJTIwQ2hyb21lJTJGOTcuMC40NjkyLjcxJTIwU2FmYXJpJTJGNTM3LjM2JTIyJTIwZXRhZyUzRCUyMlZielhWTkZVWXg4d1B1S1M2dGdRJTIyJTIwdmVyc2lvbiUzRCUyMjE2LjIuNCUyMiUyMHR5cGUlM0QlMjJlbWJlZCUyMiUzRSUzQ2RpYWdyYW0lMjBpZCUzRCUyMmluTVBjall2bm12bXh6aERLTFBOJTIyJTIwbmFtZSUzRCUyMlBhZ2UtMSUyMiUzRWpaSk5iNFFnRUlaJTJGRFhlVjFOMWVhJTJCM3VZWnNlUFBSTVpDb2tJSWJGVmZ2cmkyWHdJNlpKTDJibW1SbDU1d1ZDQ3oxZUxPdkV1JTJCR2dTSmJ3a2RCWGttVTVQZnZ2REtZQXpna05vTEdTQjVTdW9KTGZnREJCMmtzTzkxMmpNMFk1MmUxaGJkb1dhcmRqekZvejdOdSUyQmpOcWYyckVHRHFDcW1UclNUOG1kd0MyeTA4cXZJQnNSVDA3ejUxRFJMRGJqSm5mQnVCazJpSmFFRnRZWUZ5STlGcUJtNzZJdlllN3RqJTJCb2l6RUxyJTJGak9RaFlFSFV6M3VkaTF2dHc4VTU2YTRzVFY5eTJFZVNnaDlHWVIwVUhXc25xdUR2MkxQaE5QS1o2a1BqeUpRMXdPc2czR0RVTlFGakFabko5JTJCQzFjVWdmQ0hwRSUyQmJENm5jYWU4VEc2eHdad3l0dWxsJTJCdkx2Z0FqWWpwYXZodmJmTnFhZmtEJTNDJTJGZGlhZ3JhbSUzRSUzQyUyRm14ZmlsZSUzRTVX5JYAAAOnSURBVHhe7do9KLVhGAfw/4kkIhkoRfmaFEWUJIswyGxQFrEYLCgiBhHKUQZlowxSFgYZGJAM7IqEwccgH4uPeLvuXqfzvIec+015rnP/7zKd6xzX/f+d67mfp04AwDu4YjqBgCC/v9M5VpUDgQCIHKu6f/dF5BgHlu0RmcgOJODAFjnJRHYgAQe2yEkmsgMJOLBFTjKRHUjAgS1ykonsQAIObJGTTGQHEnBgi5xkIjuQgANb5CQT2YEEHNgiJ5nIDiTgwBY5yUR2IAEHtshJjhL57e0Np6enSExMRFZWVpTv8keZGuT8/Hz09vaivb09lNzBwQHKyspwc3OD5ORkJCUlfZrq0tISSktLUVBQgJOTE+Tm5nrqFhYW0NfXh/Pz84j3y+/Rx8bGMDo6ioeHB/N6SkoKJiYm0NHR4Q/Fb7pQhdzT0+MJ9gP5+vraIMvfysoKSkpKPNvOyMjA5eWlQT4+PkZeXp7n9fn5eXR3d+Pq6ioiroGBAUxPT2NxcRH19fWQiV5eXkZLSwumpqbQ1dXle+iYQ97f30d5eXlE8IJri3x7e4v09HTMzc2hra3N85mDg4MIBoO4u7szv2v281KFXFRUhKqqqlCeFxcXmJmZQfgkDw8Po7CwMFQjG2xubjYTbIu8t7eHyspKnJ2dITs72+O4vb2N6upqM/1ypfDzUoUcHx8POZs/lkyaQIQjy6U4LS0tVBMXFweZ7v9BXltbQ2NjI+7v7805HL52d3fNF+6zM95v4KqQozmTf/JyfXh4aG7YNjY2UFtb67EbHx83N4JPT09ISEjwm6unHyID+OrG6/Hx0Uyw3JQJaviqq6vDy8sLNjc3fQ0szcUcsjwOFRcXe4KX51q5QZIzeXV11XO+ZmZmYn19HZ2dnZBzNnzJ0TA5OYmhoSHI5zY1NeH19RWzs7Po7+/H1tYWampqiPxTCUjgX12uv3tOlpuzhoYGg/zvkudf+RK0trZGvLazs4OKigqMjIwY6I8lN1qCLtOsYamZ5N8O8/n5GUdHR0hNTUVOTs5vt2P1/4lsFZfOYiLrdLPqmshWceksJrJON6uuiWwVl85iIut0s+qayFZx6Swmsk43q66JbBWXzmIi63Sz6prIVnHpLCayTjerrolsFZfOYiLrdLPqmshWceksJrJON6uuiWwVl85iIut0s+qayFZx6Swmsk43q66JbBWXzmIi63Sz6prIVnHpLCayTjerrolsFZfO4hCyzvbZdbQJ/AFkdDUfctJpxQAAAABJRU5ErkJggg=='
  } else {
    isBase64 = false
    content = '<mxfile host="embed.diagrams.net" modified="2022-01-11T08:20:21.828Z" agent="5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36" etag="EEjUkbc3rjhjUWmDhpO0" version="16.2.4" type="embed"><diagram id="inMPcjYvnmvmxzhDKLPN" name="Page-1">jZJNb4QgEIZ/DXeV1N1ea+3uYZsePPRMZCokIIbFVfvri2XwI6ZJL2bmmRl55wVCCz1eLOvEu+GgSJbwkdBXkmU5PfvvDKYAzgkNoLGSB5SuoJLfgDBB2ksO912jM0Y52e1hbdoWardjzFoz7Nu+jNqf2rEGDqCqmTrST8mdwC2y08qvIBsRT07z51DRLDbjJnfBuBk2iJaEFtYYFyI9FqBm76IvYe7tj+oizELr/jOQhYEHUz3udi1vtw8U56a4sTV9y2EeSgh9GYR0UHWsnquDv2LPhNPKZ6kPjyJQ1wOsg3GDUNQFjAZnJ9+C1cUgfCHpE+bD6ncae8TG6xwZwytull+vLvgAjYjpavhvbfNqafkD</diagram></mxfile>'
  }

  try {
    await api.writeFile(file, content, isBase64)
    const srcdoc = buildEditorSrcdoc(file)
    openWindow(buildSrc(srcdoc, t('drawio.edit-diagram')), '_blank', { alwaysOnTop: false })
    refreshTree()
  } catch (error: any) {
    useToast().show('warning', error.message)
    console.error(error)
  }
}

export default {
  name: 'markdown-drawio',
  register: ctx => {
    ctx.markdown.registerPlugin(MarkdownItPlugin)

    ctx.registerHook('TREE_NODE_SELECT', async ({ node }) => {
      if (node.path.toLowerCase().includes('.drawio')) {
        const { repo, path, name, type } = node
        const srcdoc = buildEditorSrcdoc({ repo, path, name, type })
        openWindow(buildSrc(srcdoc, ctx.i18n.t('drawio.edit-diagram')), '_blank', { alwaysOnTop: false })

        return true
      }

      return false
    })

    ctx.tree.tapContextMenus((items, node) => {
      if (node.type === 'dir') {
        items.push(
          { type: 'separator' },
          {
            id: 'create-drawio-drawio',
            type: 'normal',
            label: ctx.i18n.t('drawio.create-drawio-file', '.drawio'),
            onClick: () => createDrawioFile(node, '.drawio')
          },
          {
            id: 'create-drawio-png',
            type: 'normal',
            label: ctx.i18n.t('drawio.create-drawio-file', '.png'),
            onClick: () => createDrawioFile(node, '.drawio.png')
          },
        )
      }
    })
  }
} as Plugin
