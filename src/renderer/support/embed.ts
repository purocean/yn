import { debounce } from 'lodash-es'
import { defineComponent, h, IframeHTMLAttributes, nextTick, onBeforeMount, onBeforeUnmount, PropType, ref, watch } from 'vue'
import { md5 } from '@fe/utils'
import { registerHook, removeHook, triggerHook } from '@fe/core/hook'
import type { ThemeName } from '@fe/types'

/**
 * Build embedded page uri.
 * @param html
 * @param title
 * @param globalStyle
 * @returns src
 */
export function buildSrc (html: string, title = '', globalStyle = false) {
  return `/embed/?_=${md5(html)}#title=${encodeURIComponent(title)}&with-global-style=${globalStyle}&html=${encodeURIComponent(html)}`
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
    html: String,
    iframeProps: Object as PropType<IframeHTMLAttributes>,
    onLoad: Function as PropType<(iframe: HTMLIFrameElement) => void>
  },
  setup (props, { expose }) {
    const url = ref('')
    const iframe = ref<HTMLIFrameElement>()

    const update = () => {
      if (props.html) {
        url.value = buildSrc(props.html, 'Embedded Page', props.globalStyle)
      }
    }

    onBeforeMount(update)
    watch(props, debounce(update, props.debounce))

    const changeTheme = ({ name }: { name: ThemeName }) => {
      if (name) {
        iframe.value?.contentDocument?.documentElement.setAttribute('app-theme', name)
      }
    }

    const refresh = () => {
      url.value = ''
      nextTick(update)
    }

    registerHook('THEME_CHANGE', changeTheme)
    registerHook('VIEW_AFTER_REFRESH', refresh)
    registerHook('VIEW_FILE_CHANGE', refresh)

    onBeforeUnmount(() => {
      removeHook('THEME_CHANGE', changeTheme)
      removeHook('VIEW_AFTER_REFRESH', refresh)
      removeHook('VIEW_FILE_CHANGE', refresh)
    })

    const onLoad = function () {
      const frame = iframe.value!
      const resize = () => {
        frame.height = frame.contentDocument!.documentElement.scrollHeight + 'px'
        triggerHook('GLOBAL_RESIZE')
      }

      const win = frame.contentWindow as any

      // inject vars.
      win.resize = resize
      win.ctx = window.ctx
      props.onLoad?.(frame)
    }

    expose({
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
