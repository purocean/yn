import type { Plugin } from '@fe/context'
import { useModal } from '@fe/support/ui/modal'
import { hasCtrlCmd } from '@fe/core/command'
import { getActionHandler } from '@fe/core/action'
import { useToast } from '@fe/support/ui/toast'
import { disableSyncScrollAwhile } from '@fe/services/view'
import * as editor from '@fe/services/editor'
import { t } from '@fe/services/i18n'
import type Token from 'markdown-it/lib/token'
import type Renderer from 'markdown-it/lib/renderer'

const cellClassName = 'yank-table-cell'

function editWrapper<T extends Array<any>, U> (fn: (...args: T) => U) {
  return function (...args: T) {
    disableSyncScrollAwhile(() => {
      fn(...args)
    })
  }
}

const getLineContent = editor.getLineContent
const deleteLine = editWrapper(editor.deleteLine)
const replaceLine = editWrapper(editor.replaceLine)

function injectClass (tokens: Token[], idx: number, options: any, env: any, slf: Renderer) {
  const token = tokens[idx]
  token.attrJoin('class', cellClassName)
  return slf.renderToken(tokens, idx, options)
}

function resetInput (input: HTMLTextAreaElement) {
  input.parentElement!.style.position = ''
  input.onblur = () => undefined
  input.remove()
}

function escapedSplit (str: string) {
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

function checkLineNumber (start: number, end: number) {
  if (start >= 0 && end >= 0 && end - start === 1) {
    return true
  }

  useToast().show('warning', t('table-cell-edit.limit-single-line'))
  return false
}

function columnsToStr (columns: string[], refText: string) {
  // if (!value.startsWith(' ') && idx > 0) value = ' ' + value
  // if (!value.endsWith(' ') && idx < columns.length - 1) value += ' '

  let content = columns.map(value => {
    return value.replace(/\|/g, '\\|').replace(/\n/g, ' ')
  }).join('|')

  refText = refText.trim()

  if (refText.startsWith('|')) content = '| ' + content.replace(/^ /, '')
  if (refText.endsWith('|')) content = content.replace(/ $/, '') + ' |'

  return content
}

function getCellIndex (td: HTMLTableCellElement) {
  return [...td.parentElement!.children as any]
    .slice(0, td.cellIndex)
    .reduce((prev, current) => prev + current.colSpan, 0)
}

function getRows (td: HTMLTableCellElement) {
  const tbody = td.parentElement?.parentElement
  if (!tbody) {
    return []
  }

  const rows = [...tbody.children].map(tr => {
    const td = tr.children[0] as HTMLElement | undefined

    const start = parseInt(td?.dataset?.sourceLine || '0')
    const end = parseInt(td?.dataset?.sourceLineEnd || '0')

    return { start, end }
  })

  const firstRow = rows[0]

  // add head
  rows.unshift(
    { start: firstRow.start - 2, end: firstRow.start - 1 },
    { start: firstRow.start - 1, end: firstRow.start },
  )

  return rows
}

async function editTableCell (start: number, end: number, cellIndex: number, input: HTMLTextAreaElement | null) {
  const toast = useToast()
  const modal = useModal()

  if (!checkLineNumber(start, end)) {
    input && input.remove()
    return
  }

  const text = getLineContent(start)

  const columns = escapedSplit(text)
  const cellText = columns[cellIndex]?.replace(/^ | $/g, '')

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

  columns[cellIndex] = value

  replaceLine(start, columnsToStr(columns, text))
}

async function handleClick (e: MouseEvent, modal: boolean) {
  const target = e.target as HTMLElement

  const preventEvent = () => {
    e.preventDefault()
    e.stopPropagation()
    return true
  }

  if (['TD', 'TH'].includes(target.tagName) && target.classList.contains(cellClassName)) {
    if ((hasCtrlCmd(e) && !modal) || (!hasCtrlCmd(e) && e.type !== 'contextmenu' && modal)) {
      return false
    }

    const start = parseInt(target.dataset.sourceLine || '0')
    const end = parseInt(target.dataset.sourceLineEnd || '0')
    const td = target as HTMLTableCellElement
    const cellIndex = getCellIndex(td)
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

function addRow (td: HTMLTableCellElement, offset: -1 | 1) {
  const rows = getRows(td)
  if (rows.length < 2) {
    return
  }

  const start = parseInt(td.dataset.sourceLine || '0')
  const end = parseInt(td.dataset.sourceLineEnd || '0')

  if (!checkLineNumber(start, end)) {
    return
  }

  const refText = getLineContent(rows[0].start)
  const cols = escapedSplit(refText)
  const columns = cols.map((_, idx) => {
    if (idx === 0) {
      return '-- '
    }

    if (idx === cols.length - 1) {
      return ' --'
    }

    return ' -- '
  })

  const str = columnsToStr(columns, refText)
  const content = getLineContent(start)
  const text = offset > 0 ? `${content}\n${str}` : `${str}\n${content}`

  replaceLine(start, text)
}

function removeRow (td: HTMLTableCellElement) {
  const start = parseInt(td.dataset.sourceLine || '0')
  const end = parseInt(td.dataset.sourceLineEnd || '0')

  if (!checkLineNumber(start, end)) {
    return
  }

  deleteLine(start)
}

function processColumns (td: HTMLTableCellElement, process: (columns: string[], idx: number) => void) {
  const rows = getRows(td)
  if (rows.length < 2) {
    return
  }

  const firstRow = rows[0]
  const refText = getLineContent(firstRow.start)

  rows.forEach(({ start, end }, idx) => {
    if (!checkLineNumber(start, end)) {
      return
    }

    const content = getLineContent(start)
    const columns = escapedSplit(content)

    process(columns, idx)

    replaceLine(start, columnsToStr(columns, refText))
  })
}

function alignCol (td: HTMLTableCellElement, type: 'left' | 'center' | 'right' | 'normal') {
  const rows = getRows(td)
  if (rows.length < 2) {
    return
  }

  const refText = getLineContent(rows[0].start)
  const content = getLineContent(rows[1].start)
  const columns = escapedSplit(content)
  const cellIndex = getCellIndex(td)

  let val = (columns[cellIndex] || '').replace(/^\s*:*|:*\s*$/g, '')

  switch (type) {
    case 'left':
      val = ':' + val
      break
    case 'center':
      val = ':' + val + ':'
      break
    case 'right':
      val = val + ':'
      break
  }

  if ((cellIndex === 0)) {
    val = val + ' '
  } else if (cellIndex === columns.length - 1) {
    val = ' ' + val
  } else {
    val = ` ${val} `
  }

  columns[cellIndex] = val
  replaceLine(rows[1].start, columnsToStr(columns, refText))
}

function addCol (td: HTMLTableCellElement, offset: 0 | 1) {
  const cellIndex = getCellIndex(td)
  processColumns(td, (columns, idx) => {
    if (cellIndex > columns.length - 1 || cellIndex < 0) {
      return
    }

    let val = idx === 1 ? ' -- ' : ' -- '

    if ((offset === 0 && cellIndex === 0)) {
      val = '-- '
    }

    if (offset === 1 && cellIndex === columns.length - 1) {
      val = ' --'
    }

    if (cellIndex === columns.length - 1) {
      if (!columns[cellIndex].endsWith(' ')) {
        columns[cellIndex] += ' '
      }
    } else if (cellIndex === 0) {
      if (!columns[cellIndex].startsWith(' ')) {
        columns[cellIndex] = ' ' + columns[cellIndex]
      }
    }

    columns.splice(cellIndex + offset, 0, val)
  })
}

function removeCol (td: HTMLTableCellElement) {
  const cellIndex = getCellIndex(td)
  processColumns(td, columns => {
    columns.splice(cellIndex, 1)
  })
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

        .markdown-view .markdown-body .table-wrapper > table td:hover,
        .markdown-view .markdown-body .table-wrapper > table th:hover {
          background: var(--g-color-85);
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

      md.renderer.rules.td_open = injectClass
      md.renderer.rules.th_open = injectClass
    })

    ctx.registerHook('VIEW_ELEMENT_DBCLICK', ({ e }) => handleClick(e, false))
    ctx.registerHook('VIEW_ELEMENT_CLICK', ({ e }) => handleClick(e, true))
    ctx.registerHook('VIEW_RENDERED', () => {
      const view = ctx.view.getViewDom()
      view?.querySelectorAll('.yank-table-cell').forEach(td => {
        (td as HTMLElement).title = t('table-cell-edit.db-click-edit')
      })
    })

    ctx.view.tapContextMenus((menus, e) => {
      const target = e.target as HTMLTableCellElement
      const tagName = target.tagName
      if ((tagName === 'TD' || tagName === 'TH') && target.classList.contains(cellClassName)) {
        const editMenu = [
          {
            id: 'plugin.table.cell-edit.quick-edit',
            type: 'normal' as any,
            label: '快速编辑',
            onClick: () => {
              handleClick(e, false)
            }
          },
          {
            id: 'plugin.table.cell-edit.edit',
            type: 'normal' as any,
            label: '编辑',
            onClick: () => {
              handleClick(e, true)
            }
          },
        ]

        if (tagName === 'TH') {
          menus.push(...editMenu)
          return
        }

        const rows = getRows(target)
        const columns = escapedSplit(ctx.editor.getLineContent(rows[1].start))
        const cellIndex = getCellIndex(target)
        const styleText = columns[cellIndex].trim()

        menus.push(
          ...editMenu,
          { type: 'separator' },
          {
            id: 'plugin.table.cell-edit.align-left',
            type: 'normal',
            label: '左对齐',
            hidden: /^:[^:]*$/.test(styleText),
            onClick: () => alignCol(target, 'left'),
          },
          {
            id: 'plugin.table.cell-edit.align-center',
            type: 'normal',
            label: '居中',
            hidden: /^:[^:]*:$/.test(styleText),
            onClick: () => alignCol(target, 'center'),
          },
          {
            id: 'plugin.table.cell-edit.align-right',
            type: 'normal',
            label: '右对齐',
            hidden: /^[^:]*:$/.test(styleText),
            onClick: () => alignCol(target, 'right'),
          },
          {
            id: 'plugin.table.cell-edit.align-normal',
            type: 'normal',
            label: '取消对齐',
            hidden: /^[^:]*$/.test(styleText),
            onClick: () => alignCol(target, 'normal'),
          },
          { type: 'separator' },
          {
            id: 'plugin.table.cell-edit.insert-row-above',
            type: 'normal',
            label: '在上面添加行',
            onClick: () => addRow(target, -1),
          },
          {
            id: 'plugin.table.cell-edit.insert-row-below',
            type: 'normal',
            label: '在下面添加行',
            onClick: () => addRow(target, 1)
          },
          {
            id: 'plugin.table.cell-edit.delete-row',
            type: 'normal',
            label: '删除行',
            hidden: rows.length < 4,
            onClick: () => removeRow(target)
          },
          { type: 'separator' },
          {
            id: 'plugin.table.cell-edit.insert-col-left',
            type: 'normal',
            label: '在左侧添加列',
            onClick: () => addCol(target, 0)
          },
          {
            id: 'plugin.table.cell-edit.insert-col-right',
            type: 'normal',
            label: '在右侧添加列',
            onClick: () => addCol(target, 1)
          },
          {
            id: 'plugin.table.cell-edit.delete-col',
            type: 'normal',
            label: '删除列',
            hidden: columns.length < 2,
            onClick: () => removeCol(target)
          },
        )
      }
    })
  }
} as Plugin
