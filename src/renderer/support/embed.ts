import { debounce } from 'lodash-es'
import { defineComponent, h, IframeHTMLAttributes, nextTick, onBeforeMount, onBeforeUnmount, PropType, ref, watch } from 'vue'
import { md5 } from '@fe/utils'
import { registerHook, removeHook } from '@fe/core/hook'
import { emitResize } from '@fe/services/layout'
import type { ThemeName } from '@fe/types'
import { FLAG_DEBUG } from './args'

type BuildSrcOpts = {
  globalStyle?: boolean,
  triggerParentKeyBoardEvent?: boolean
}

/**
 * Build embedded page uri.
 * @param html
 * @param title
 * @param globalStyle/opts
 * @returns src
 */
export function buildSrc (html: string, title?: string, opts?: boolean): string
export function buildSrc (html: string, title?: string, opts?: BuildSrcOpts): string
export function buildSrc (html: string, title?: string, opts?: boolean | BuildSrcOpts) {
  const globalStyle = typeof opts === 'object' ? opts.globalStyle : !!opts

  opts = (typeof opts === 'object' ? opts : { globalStyle }) as BuildSrcOpts

  const query = new URLSearchParams({
    title: title || '',
    globalStyle: String(globalStyle),
    debug: String(FLAG_DEBUG),
    'with-global-style': String(!!opts.globalStyle),
    'trigger-parent-keyboard-event': String(!!opts?.triggerParentKeyBoardEvent),
    html,
  })

  return `/embed/?_=${md5(html)}#${query.toString()}`
}

export const IFrame = defineComponent({
  name: 'embed-iframe',
  props: {
    debounce: {
      type: Number,
      default: 500
    },
    globalStyle: {
      type: Boolean,
      default: false
    },
    triggerParentKeyBoardEvent: {
      type: Boolean,
      default: false,
    },
    html: String,
    iframeProps: Object as PropType<IframeHTMLAttributes>,
    onLoad: Function as PropType<(iframe: HTMLIFrameElement) => void>
  },
  setup (props, { expose }) {
    const url = ref('')
    const iframe = ref<HTMLIFrameElement>()

    const update = () => {
      if (props.html) {
        url.value = buildSrc(props.html, 'Embedded Page', {
          globalStyle: props.globalStyle,
          triggerParentKeyBoardEvent: props.triggerParentKeyBoardEvent
        })
      }
    }

    const debounceUpdate = debounce(update, props.debounce)

    onBeforeMount(update)
    watch(props, () => {
      if (url.value) {
        debounceUpdate()
      } else {
        nextTick(update)
      }
    })

    const changeTheme = ({ name }: { name: ThemeName }) => {
      if (name) {
        iframe.value?.contentDocument?.documentElement.setAttribute('app-theme', name)
      }
    }

    const clean = () => {
      url.value = ''
    }

    const forceRefresh = () => {
      if (url.value) {
        const _url = url.value
        clean()
        setTimeout(() => {
          url.value = _url
        }, 0)
      }
    }

    registerHook('THEME_CHANGE', changeTheme)

    onBeforeUnmount(() => {
      removeHook('THEME_CHANGE', changeTheme)
    })

    const onLoad = function () {
      const frame = iframe.value!
      const resize = () => {
        const height = frame.contentDocument!.documentElement.scrollHeight
        frame.height = (height + 1) + 'px'
        emitResize()
      }

      const win = frame.contentWindow as any

      // inject vars.
      win.resize = resize
      win.ctx = window.ctx
      props.onLoad?.(frame)
    }

    expose({
      forceRefresh,
      getIframe: () => iframe.value,
      reload: () => {
        iframe.value?.contentWindow?.location.reload()
      },
      close: () => {
        const flag = iframe.value?.contentWindow?.onbeforeunload?.(null as any)
        if (flag !== undefined && flag !== null) {
          throw new Error('Check close failed.')
        }
        iframe.value?.contentWindow?.close()
      }
    })

    return () => url.value ? h('iframe', {
      ref: iframe,
      src: url.value || undefined,
      frameBorder: '0',
      width: '100%',
      height: '100px',
      onLoad,
      ...props.iframeProps,
    }) : null
  }
})
