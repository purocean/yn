import lightFontUrl from '@fe/assets/FontWithASyntaxHighlighterLightOwl-Regular.woff2'
import nightFontUrl from '@fe/assets/FontWithASyntaxHighlighterNightOwl-Regular.woff2'
import type { Ctx, Plugin } from '@fe/context'

const WINDOWS_11_BUILD = 22000

function getWindowsBuildNumber (ctx: Ctx) {
  if (!ctx.env.nodeRequire) {
    return null
  }

  try {
    const release = String(ctx.env.nodeRequire('os').release())
    const build = Number(release.split('.')[2])

    return Number.isFinite(build) ? build : null
  } catch {
    return null
  }
}

function shouldLoadFont (ctx: Ctx) {
  if (!ctx.env.isWindows) {
    return true
  }

  const build = getWindowsBuildNumber(ctx)

  return typeof build === 'number' && build >= WINDOWS_11_BUILD
}

export default {
  name: 'code-syntax-highlight-font',
  register: (ctx: Ctx) => {
    ctx.registerHook('STARTUP', () => {
      if (!shouldLoadFont(ctx)) {
        return
      }

      const className = ctx.args.DOM_CLASS_NAME.CODE_SYNTAX_HIGHLIGHT_FONT

      ctx.theme.addStyles(`
@font-face {
  font-family: 'FontWithASyntaxHighlighterLightOwl-Regular';
  src: url('${lightFontUrl}') format('woff2');
  font-display: swap;
}

@font-face {
  font-family: 'FontWithASyntaxHighlighterNightOwl-Regular';
  src: url('${nightFontUrl}') format('woff2');
  font-display: swap;
}

.${className} {
  font-family: 'FontWithASyntaxHighlighterLightOwl-Regular', monospace;
}

@media screen {
  html[app-theme=dark] .${className} {
    font-family: 'FontWithASyntaxHighlighterNightOwl-Regular', monospace;
  }
}

@media (prefers-color-scheme: dark) {
  html[app-theme=system] .${className} {
    font-family: 'FontWithASyntaxHighlighterNightOwl-Regular', monospace;
  }
}
      `)
    })
  }
} as Plugin
