<script>
import { h, defineComponent, nextTick } from '@vue/runtime-core'

export default defineComponent({
  name: 'render',
  props: {
    content: [Object, String],
  },
  setup (props, { emit }) {
    return () => {
      emit('render')
      nextTick(() => emit('rendered'))

      const { content } = props

      if (typeof content === 'string') {
        return h('div', { innerHTML: content })
      }

      return content
    }
  },
})
</script>
