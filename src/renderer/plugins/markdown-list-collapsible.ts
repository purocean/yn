import type { Plugin } from '@fe/context'

// Chevron down SVG icon as data URI with middle gray color for theme compatibility
const CHEVRON_ICON = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%23888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpolyline points="6 9 12 15 18 9"%3E%3C/polyline%3E%3C/svg%3E'

export default {
  name: 'markdown-list-collapsible',
  register: (ctx) => {
    // Add styles for collapsible lists
    ctx.view.addStyles(`
      /* Hide nested lists when parent is collapsed */
      .markdown-view .markdown-body li[data-collapsed="true"] > ul,
      .markdown-view .markdown-body li[data-collapsed="true"] > ol {
        display: none;
      }

      /* Collapse icon */
      .markdown-view .markdown-body li:has(> ul, > ol) > .list-collapse-icon {
        display: inline-block;
        width: 1em;
        height: 1em;
        position: absolute;
        margin-left: -2em;
        margin-top: 0.26em;
        user-select: none;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s, transform 0.2s;
        background-image: url('${CHEVRON_ICON}');
        background-repeat: no-repeat;
        background-position: center;
        background-size: contain;
      }

      /* Show icon on hover or when collapsed */
      .markdown-view .markdown-body li:has(> ul, > ol):hover > .list-collapse-icon,
      .markdown-view .markdown-body li[data-collapsed="true"] > .list-collapse-icon {
        opacity: 1;
      }

      /* Rotate icon when collapsed */
      .markdown-view .markdown-body li[data-collapsed="true"] > .list-collapse-icon {
        transform: rotate(-90deg);
      }
    `)

    // Register markdown-it plugin
    ctx.markdown.registerPlugin(md => {
      const listItemOpen = md.renderer.rules.list_item_open || ((tokens, idx, options, env, slf) => slf.renderToken(tokens, idx, options))

      // Override list_item_open to add icon and data attribute
      md.renderer.rules.list_item_open = (tokens, idx, options, env, slf) => {
        if (!ctx.setting.getSetting('render.list-collapsible')) {
          return listItemOpen.call(slf, tokens, idx, options, env, slf)
        }

        const token = tokens[idx]
        
        // Add data attribute to track collapsed state (default: expanded)
        token.attrSet('data-collapsed', 'false')
        
        const openTag = listItemOpen.call(slf, tokens, idx, options, env, slf)

        ;(openTag.children as any).push(ctx.lib.vue.h('span', {
          class: 'list-collapse-icon',
          onclick: 'this.parentElement.getAttribute("data-collapsed") === "true" ? this.parentElement.setAttribute("data-collapsed", "false") : this.parentElement.setAttribute("data-collapsed", "true"); event.stopPropagation();'
        }))

        return openTag
      }
    })

    // Add setting for enabling/disabling list collapsible
    ctx.setting.changeSchema((schema): void => {
      schema.properties['render.list-collapsible'] = {
        defaultValue: false,
        title: 'T_setting-panel.schema.render.list-collapsible',
        type: 'boolean',
        format: 'checkbox',
        group: 'render',
        required: true,
      }
    })
  }
} as Plugin
