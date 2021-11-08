import { debounce } from 'lodash-es'
import { defineComponent, h, IframeHTMLAttributes, nextTick, onBeforeMount, onBeforeUnmount, PropType, ref, watch } from 'vue'
import { useBus } from '@fe/core/bus'
import { md5 } from '@fe/utils'
import { registerHook, removeHook } from '@fe/core/hook'

/**
 * 构建一个嵌入页面的 src 路径
 * @param html 页面代码
 * @param title 页面标题
 * @param globalStyle 是否包含全局样式
 * @returns src 路径
 */
export function buildSrc (html: string, title = '', globalStyle = false) {
  return `/embed/?_=${md5(html)}#title=${encodeURIComponent(title)}&with-global-style=${globalStyle}&html=${encodeURIComponent(html)}`
}

/**
 * Iframe 组件
 */
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
        url.value = buildSrc(props.html, '嵌入页面', props.globalStyle)
      }
    }

    onBeforeMount(update)
    watch(props, debounce(update, props.debounce))

    const changeTheme = (name?: string) => {
      if (name) {
        iframe.value?.contentDocument?.documentElement.setAttribute('app-theme', name)
      }
    }

    const refresh = () => {
      url.value = ''
      nextTick(update)
    }

    const bus = useBus()
    bus.on('theme.change', changeTheme)

    registerHook('ON_VIEW_REFRESH', refresh)
    registerHook('ON_VIEW_FILE_CHANGE', refresh)

    onBeforeUnmount(() => {
      bus.off('theme.change', changeTheme)
      removeHook('ON_VIEW_REFRESH', refresh)
      removeHook('ON_VIEW_FILE_CHANGE', refresh)
    })

    const onLoad = function () {
      const frame = iframe.value!
      const resize = () => {
        frame.height = frame.contentDocument!.documentElement.scrollHeight + 'px'
        bus.emit('global.resize')
      }

      const win = frame.contentWindow as any

      // 注入变量
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
          throw new Error('检查关闭状态失败')
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
