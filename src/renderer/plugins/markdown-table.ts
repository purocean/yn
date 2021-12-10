import type { Plugin } from '@fe/context'
import { useModal } from '@fe/support/ui/modal'
import { hasCtrlCmd } from '@fe/core/command'
import { getActionHandler } from '@fe/core/action'
import { useToast } from '@fe/support/ui/toast'
import { getLineContent, replaceLine } from '@fe/services/editor'
import { t } from '@fe/services/i18n'

function resetInput (input: HTMLTextAreaElement) {
  input.parentElement!.style.position = ''
  input.onblur = () => undefined
  input.remove()
}

async function editTableCell (start: number, end: number, cellIndex: number, input: HTMLTextAreaElement | null) {
  const toast = useToast()
  const modal = useModal()

  if (end - start !== 1) {
    toast.show('warning', t('table-cell-edit.limit-single-line'))
    input && input.remove()
    return
  }

  const escapedSplit = (str: string) => {
    const result = []
    const max = str.length
    let pos = 0
    let ch = str.charCodeAt(pos)
    let isEscaped = false
    let lastPos = 0
    let current = ''

    while (pos < max) {
      if (ch === 0x7c/* | */) {
        if (!isEscaped) {
          // pipe separating cells, '|'
          result.push(current + str.substring(lastPos, pos))
          current = ''
          lastPos = pos + 1
        } else {
          // escaped pipe, '\|'
          current += str.substring(lastPos, pos - 1)
          lastPos = pos
        }
      }

      isEscaped = (ch === 0x5c/* \ */)
      pos++

      ch = str.charCodeAt(pos)
    }

    result.push(current + str.substring(lastPos))

    if (result.length && result[0] === '') result.shift()
    if (result.length && result[result.length - 1] === '') result.pop()

    return result
  }

  const text = getLineContent(start).trim()

  const columns = escapedSplit(text)
  const cellText = columns[cellIndex]?.trim()

  if (typeof cellText !== 'string') {
    throw new Error(t('table-cell-edit.edit-error'))
  }

  let value = cellText
  if (input) {
    input.value = cellText
    value = await (new Promise((resolve) => {
      const cancel = () => {
        resetInput(input)
      }

      const ok = () => {
        if (input.value !== cellText) {
          resolve(input.value)
          getActionHandler('view.refresh')()
        }

        cancel()
      }

      input.onblur = ok

      input.onkeydown = e => {
        if (e.key === 'Escape') {
          cancel()
        }

        if (e.key === 'Enter' && hasCtrlCmd(e)) {
          ok()
        }
      }
    }))
  } else {
    const inputVal = await modal.input({
      title: t('table-cell-edit.edit-title'),
      type: 'textarea',
      value: cellText,
      modalWidth: '600px',
      hint: t('table-cell-edit.edit-hint'),
    })

    if (typeof inputVal !== 'string') {
      toast.show('warning', t('table-cell-edit.canceled'))
      return
    }

    value = inputVal
  }

  if (!value.startsWith(' ') && cellIndex > 0) value = ' ' + value
  if (!value.endsWith(' ') && cellIndex < columns.length - 1) value += ' '
  columns[cellIndex] = value.replace(/\|/g, '\\|').replace(/\n/g, ' ')

  let content = columns.join('|').trim()
  if (text.startsWith('|')) content = '| ' + content
  if (text.endsWith('|')) content += ' |'

  replaceLine(start, content)
}

async function handleClick (e: MouseEvent, modal: boolean) {
  const target = e.target as HTMLElement

  const preventEvent = () => {
    e.preventDefault()
    e.stopPropagation()
    return true
  }

  if (['TD', 'TH'].includes(target.tagName) && target.classList.contains('yank-table-cell')) {
    if ((hasCtrlCmd(e) && !modal) || (!hasCtrlCmd(e) && modal)) {
      return false
    }

    const start = parseInt(target.dataset.sourceLine || '0')
    const end = parseInt(target.dataset.sourceLineEnd || '0')
    const td = target as HTMLTableDataCellElement
    const cellIndex = [...td.parentElement!.children as any]
      .slice(0, td.cellIndex)
      .reduce((prev, current) => prev + current.colSpan, 0)

    const input = modal ? null : document.createElement('textarea')

    if (input) {
      target.style.position = 'relative'
      input.style.left = '0'
      input.style.top = '0'
      input.style.height = '100%'
      input.style.width = '100%'
      input.style.boxSizing = 'border-box'
      input.style.color = 'var(--g-color-0)'
      input.style.border = '1px #93e632 solid'
      input.style.backgroundColor = 'var(--g-color-96)'
      input.style.fontSize = '14px'
      input.style.position = 'absolute'
      input.style.display = 'block'
      input.style.padding = '4px'
      ;(input as any).autofocus = true
      input.placeholder = t('table-cell-edit.esc-to-cancel')
      setTimeout(() => {
        input.focus()
      }, 0)

      target.appendChild(input)
    }

    editTableCell(start, end, cellIndex, input).catch((e: Error) => {
      useToast().show('warning', e.message)
      input && resetInput(input)
    })

    return preventEvent()
  }

  return false
}

export default {
  name: 'markdown-table',
  register: (ctx) => {
    ctx.theme.addStyles(`
      @media screen {
        .markdown-view .markdown-body .table-wrapper {
          overflow-x: auto;
          margin-bottom: 16px;
        }

        .markdown-view .markdown-body .table-wrapper > table {
          margin-bottom: 6px;
        }

        .markdown-view .markdown-body .table-wrapper > table th {
          white-space: nowrap;
        }

        .markdown-view .markdown-body .table-wrapper > table tr:hover {
          outline: 2px #b3833b dashed;
          outline-offset: -2px;
        }

        .markdown-view .markdown-body .table-wrapper > table tbody {
          counter-reset: tr-number;
        }

        .markdown-view .markdown-body .table-wrapper > table tbody:hover td:first-child:before {
          counter-increment: tr-number;
          content: counter(tr-number);
          position: absolute;
          right: 100%;
          padding-right: 5px;
          color: #999;
          font-family: monospace;
        }
      }
    `)

    ctx.markdown.registerPlugin(md => {
      md.renderer.rules.table_open = (tokens, idx, options, _, slf) => {
        const table = slf.renderToken(tokens, idx, options)
        return {
          node: ctx.lib.vue.h('div', {
            class: 'table-wrapper'
          }, table),
          parent: table
        } as any
      }
    })

    ctx.registerHook('VIEW_ELEMENT_DBCLICK', ({ e }) => handleClick(e, false))
    ctx.registerHook('VIEW_ELEMENT_CLICK', ({ e }) => handleClick(e, true))
    ctx.registerHook('VIEW_RENDERED', () => {
      const view = ctx.view.getViewDom()
      view?.querySelectorAll('.yank-table-cell').forEach(td => {
        (td as HTMLElement).title = t('table-cell-edit.db-click-edit')
      })
    })
  }
} as Plugin
