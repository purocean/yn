import type { Plugin } from '@fe/context'
import GetStarted from './GetStarted.vue'

export default {
  name: 'get-started',
  register: (ctx) => {
    ctx.editor.registerCustomEditor({
      name: 'get-started',
      displayName: 'Get Started',
      hiddenPreview: true,
      when ({ doc }) {
        return doc === null && ctx.args.MODE === 'normal'
      },
      component: GetStarted,
    })
  }
} as Plugin
