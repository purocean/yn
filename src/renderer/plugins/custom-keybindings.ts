import type { Plugin } from '@fe/context'

export default {
  name: 'custom-keybindings',
  register: (ctx) => {
    ctx.command.tapCommand(command => {
      const keybindings = ctx.lib.lodash.keyBy(
        ctx.setting.getSetting('keybindings', []).filter(x => x.type === 'workbench'),
        'command'
      )

      if (keybindings[command.id]) {
        command.keys = keybindings[command.id].keys?.split('+') || []
      }
    })

    ctx.registerHook('SETTING_CHANGED', ({ changedKeys }) => {
      if (changedKeys.includes('keybindings')) {
        ctx.triggerHook('COMMAND_KEYBINDING_CHANGED')
      }
    })
  }
} as Plugin
