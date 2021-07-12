import { useBus } from '@fe/support/bus'
import { debounce } from 'lodash-es'
import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export function buildSrc (html: string, title = '') {
  return `/embed/?_t=${Date.now()}&title=${encodeURIComponent(title)}&html=${encodeURIComponent(html)}`
}

export const IFrame = defineComponent({
  name: 'embed-iframe',
  props: {
    debounce: {
      type: Number,
      default: 500
    },
    html: String,
    iframeProps: Object
  },
  setup (props) {
    const url = ref('')
    const iframe = ref<HTMLIFrameElement>()

    const update = () => {
      if (props.html) {
        url.value = buildSrc(props.html)
      }
    }

    onMounted(update)
    watch(props, debounce(update, props.debounce))

    const changeTheme = (name?: string) => {
      if (name) {
        iframe.value?.contentDocument?.documentElement.setAttribute('app-theme', name)
      }
    }

    const bus = useBus()
    bus.on('theme.change', changeTheme)

    onBeforeUnmount(() => {
      bus.off('theme.change', changeTheme)
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
      props.iframeProps?.onLoad?.call(frame)
    }

    return () => url.value ? h('iframe', {
      ref: iframe,
      src: url.value || undefined,
      frameBorder: '0',
      width: '100%',
      height: '100px',
      ...props.iframeProps,
      onLoad,
    }) : null
  }
})
