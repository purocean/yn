/**
 * Get all params from url.
 * @returns params
 */
export function $args () {
  const win = window.opener || window.parent || window
  return new URLSearchParams(win.location.search)
}

export const URL_GITHUB = 'https://github.com/purocean/yn'
export const URL_MAS = 'https://apps.apple.com/cn/app/yank-note/id1551528618'
export const URL_MAS_LIMITATION = 'https://github.com/purocean/yn/issues/65#issuecomment-1065799677'

export const JWT_TOKEN = $args().get('token') || ''
export const MODE: 'normal' | 'share-preview' = $args().get('mode') || 'normal' as any

export const FLAG_DISABLE_SHORTCUTS = MODE !== 'normal'
export const FLAG_DISABLE_XTERM = false
export const FLAG_MAS = false
export const FLAG_DEMO = import.meta.env.MODE === 'demo'
export const FLAG_READONLY = $args().get('readonly') === 'true' || MODE !== 'normal'
export const FLAG_DEBUG = import.meta.env.MODE === 'development' || $args().get('debug') === 'true'

export const DOM_ATTR_NAME = {
  SOURCE_LINE_START: 'data-source-line',
  SOURCE_LINE_END: 'data-source-line-end',
  ORIGIN_SRC: 'origin-src',
  ORIGIN_HREF: 'origin-href',
  LOCAL_IMAGE: 'local-image',
  ONLY_CHILD: 'only-child',
  TOKEN_IDX: 'data-token-idx',
}

export const DOM_CLASS_NAME = {
  PREVIEW_HIGHLIGHT: 'preview-highlight',
  PREVIEW_MARKDOWN_BODY: 'markdown-body',
  MARK_OPEN: 'open',
  SKIP_EXPORT: 'skip-export',
  SKIP_PRINT: 'skip-print',
  REDUCE_BRIGHTNESS: 'reduce-brightness',
  INLINE: 'inline',
  BLOCK: 'block',
  BGW: 'bgw',
  COPY_INNER_TEXT: 'copy-inner-text',
  WRAP_CODE: 'wrap-code',
  WITH_BORDER: 'with-border',
  TEXT_LEFT: 'text-left',
  TEXT_CENTER: 'text-center',
  TEXT_RIGHT: 'text-right',
  TASK_LIST_ITEM_CHECKBOX: 'task-list-item-checkbox',
  NEW_PAGE: 'new-page',
  AVOID_PAGE_BREAK: 'avoid-page-break',
}
