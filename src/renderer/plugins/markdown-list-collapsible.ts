import type { Plugin } from '@fe/context'
import type Token from 'markdown-it/lib/token'

// Constants
const ICON_AREA_WIDTH = 20 // Width of the clickable icon area in pixels

// Chevron down SVG icon as data URI for both light and dark themes
const CHEVRON_ICON_LIGHT = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpolyline points="6 9 12 15 18 9"%3E%3C/polyline%3E%3C/svg%3E'
const CHEVRON_ICON_DARK = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpolyline points="6 9 12 15 18 9"%3E%3C/polyline%3E%3C/svg%3E'

export default {
  name: 'markdown-list-collapsible',
  register: (ctx) => {
    // Add styles for collapsible lists
    ctx.view.addStyles(`
      /* List collapsible styles */
      .markdown-view .markdown-body ul.list-collapsible,
      .markdown-view .markdown-body ol.list-collapsible {
        list-style-position: outside;
      }

      .markdown-view .markdown-body ul.list-collapsible > li,
      .markdown-view .markdown-body ol.list-collapsible > li {
        position: relative;
      }

      /* Hide nested lists when parent is collapsed */
      .markdown-view .markdown-body ul.list-collapsible > li[data-collapsed="true"] > ul,
      .markdown-view .markdown-body ul.list-collapsible > li[data-collapsed="true"] > ol,
      .markdown-view .markdown-body ol.list-collapsible > li[data-collapsed="true"] > ul,
      .markdown-view .markdown-body ol.list-collapsible > li[data-collapsed="true"] > ol {
        display: none;
      }

      /* Chevron icon container */
      .markdown-view .markdown-body ul.list-collapsible > li.has-children::before,
      .markdown-view .markdown-body ol.list-collapsible > li.has-children::before {
        content: '';
        position: absolute;
        left: -${ICON_AREA_WIDTH}px;
        top: 0.3em;
        width: 16px;
        height: 16px;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s;
        background-image: url('${CHEVRON_ICON_LIGHT}');
        background-repeat: no-repeat;
        background-position: center;
        background-size: contain;
      }

      /* Dark theme icon */
      @media (prefers-color-scheme: dark) {
        .markdown-view .markdown-body ul.list-collapsible > li.has-children::before,
        .markdown-view .markdown-body ol.list-collapsible > li.has-children::before {
          background-image: url('${CHEVRON_ICON_DARK}');
        }
      }

      /* Show icon on hover or when collapsed */
      .markdown-view .markdown-body ul.list-collapsible > li.has-children:hover::before,
      .markdown-view .markdown-body ol.list-collapsible > li.has-children:hover::before,
      .markdown-view .markdown-body ul.list-collapsible > li.has-children[data-collapsed="true"]::before,
      .markdown-view .markdown-body ol.list-collapsible > li.has-children[data-collapsed="true"]::before {
        opacity: 1;
      }

      /* Rotate icon when collapsed */
      .markdown-view .markdown-body ul.list-collapsible > li.has-children[data-collapsed="true"]::before,
      .markdown-view .markdown-body ol.list-collapsible > li.has-children[data-collapsed="true"]::before {
        transform: rotate(-90deg);
      }
    `)

    // Register markdown-it plugin
    ctx.markdown.registerPlugin(md => {
      // Store original rules
      const bulletListOpen = md.renderer.rules.bullet_list_open || ((tokens, idx, options, env, slf) => slf.renderToken(tokens, idx, options))
      const orderedListOpen = md.renderer.rules.ordered_list_open || ((tokens, idx, options, env, slf) => slf.renderToken(tokens, idx, options))
      const listItemOpen = md.renderer.rules.list_item_open || ((tokens, idx, options, env, slf) => slf.renderToken(tokens, idx, options))

      // Override bullet_list_open
      md.renderer.rules.bullet_list_open = (tokens, idx, options, env, slf) => {
        if (!ctx.setting.getSetting('render.list-collapsible')) {
          return bulletListOpen.call(slf, tokens, idx, options, env, slf)
        }

        const token = tokens[idx]
        // Add class to enable collapsible functionality
        token.attrJoin('class', 'list-collapsible')
        return bulletListOpen.call(slf, tokens, idx, options, env, slf)
      }

      // Override ordered_list_open
      md.renderer.rules.ordered_list_open = (tokens, idx, options, env, slf) => {
        if (!ctx.setting.getSetting('render.list-collapsible')) {
          return orderedListOpen.call(slf, tokens, idx, options, env, slf)
        }

        const token = tokens[idx]
        // Add class to enable collapsible functionality
        token.attrJoin('class', 'list-collapsible')
        return orderedListOpen.call(slf, tokens, idx, options, env, slf)
      }

      // Override list_item_open to add data attributes and onclick handler
      md.renderer.rules.list_item_open = (tokens, idx, options, env, slf) => {
        if (!ctx.setting.getSetting('render.list-collapsible')) {
          return listItemOpen.call(slf, tokens, idx, options, env, slf)
        }

        const token = tokens[idx]
        
        // Check if this list item has nested lists
        let hasNestedList = false
        for (let i = idx + 1; i < tokens.length; i++) {
          const t = tokens[i]
          
          // If we hit the closing tag for this list item, stop searching
          if (t.type === 'list_item_close' && t.level === token.level) {
            break
          }
          
          // Check if there's a nested list (ul or ol)
          if ((t.type === 'bullet_list_open' || t.type === 'ordered_list_open') && t.level === token.level + 1) {
            hasNestedList = true
            break
          }
        }

        if (hasNestedList) {
          // Add class to indicate this item has children
          token.attrJoin('class', 'has-children')
          
          // Add data attribute to track collapsed state (default: expanded)
          token.attrSet('data-collapsed', 'false')
          
          // Add inline onclick handler for toggle functionality
          // This ensures exported HTML also works without additional JS
          // Only toggle when clicking on the pseudo-element (icon) area or directly on the li element
          const onclickHandler = `(function(e) {
  var li = this;
  var rect = li.getBoundingClientRect();
  var iconArea = e.clientX < rect.left + ${ICON_AREA_WIDTH};
  if (iconArea || e.target === this) {
    var collapsed = li.getAttribute('data-collapsed') === 'true';
    li.setAttribute('data-collapsed', collapsed ? 'false' : 'true');
    e.stopPropagation();
  }
}).call(this, event)`
          
          token.attrSet('onclick', onclickHandler)
        }

        return listItemOpen.call(slf, tokens, idx, options, env, slf)
      }
    })

    // Add setting for enabling/disabling list collapsible
    ctx.setting.changeSchema(schema => {
      schema.properties['render.list-collapsible'] = {
        defaultValue: true,
        title: 'T_setting-panel.schema.render.list-collapsible',
        type: 'boolean',
        format: 'checkbox',
        group: 'render',
        required: true,
      }
    })
  }
} as Plugin
