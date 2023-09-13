import { nextTick, reactive } from 'vue'
import Sortable from 'sortablejs'
import { orderBy } from 'lodash-es'
import type { Plugin } from '@fe/context'
import { useModal } from '@fe/support/ui/modal'
import { hasCtrlCmd } from '@fe/core/keybinding'
import { DOM_ATTR_NAME, FLAG_READONLY } from '@fe/support/args'
import { useToast } from '@fe/support/ui/toast'
import { disableSyncScrollAwhile, renderImmediately } from '@fe/services/view'
import * as editor from '@fe/services/editor'
import { t } from '@fe/services/i18n'
import { getLogger } from '@fe/utils'
import type Token from 'markdown-it/lib/token'
import type Renderer from 'markdown-it/lib/renderer'
import type { Components } from '@fe/types'

const tableSortMode = 'sort-mode'
const cellClassName = 'yn-table-cell'
const logger = getLogger('markdown-table')

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
  let content = columns.map(value => {
    if (!value.startsWith(' ')) {
      value = ' ' + value
    }

    if (!value.endsWith(' ')) {
      value += ' '
    }

    return value.replace(/\|/g, '\\|').replace(/\n/g, ' ')
  }).join('|').trim()

  refText = refText.trim()

  if (refText.startsWith('|')) content = '| ' + content
  if (refText.endsWith('|')) content = content + ' |'

  return content
}

function getCellIndex (td: HTMLTableCellElement) {
  return [...td.parentElement!.children as any]
    .slice(0, td.cellIndex)
    .reduce((prev, current) => prev + current.colSpan, 0)
}

type Row = { type: 'head' | 'hr' | 'body', start: number, end: number }
function getRows (td: HTMLTableCellElement): Row[] {
  let tbody
  let thead
  if (td.tagName === 'TD') {
    tbody = td.parentElement?.parentElement
    thead = tbody?.previousElementSibling
  } else if (td.tagName === 'TH') {
    thead = td.parentElement?.parentElement
    tbody = thead?.nextElementSibling
  } else {
    return []
  }

  if (!tbody || !thead) {
    return []
  }

  const headRows: Row[] = [...thead.children].map(th => {
    const td = th.children[0] as HTMLElement | undefined

    const start = parseInt(td?.dataset?.sourceLine || '0')
    const end = parseInt(td?.dataset?.sourceLineEnd || '0')

    return { type: 'head', start, end }
  })

  if (headRows.length < 1) {
    return []
  }

  const bodyRows: Row[] = [...tbody.children].map(tr => {
    const td = tr.children[0] as HTMLElement | undefined

    const start = parseInt(td?.dataset?.sourceLine || '0')
    const end = parseInt(td?.dataset?.sourceLineEnd || '0')

    return { type: 'body', start, end }
  })

  const lastHeadRows = headRows[headRows.length - 1]
  return headRows.concat([
    { type: 'hr', start: lastHeadRows.start + 1, end: lastHeadRows.end + 1 }
  ]).concat(bodyRows)
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
  let inComposition = false
  let nextAction: 'edit-next-cell' | 'edit-prev-cell' | undefined
  let isCancel = false

  if (input) {
    input.value = cellText
    input.select()
    value = await (new Promise((resolve) => {
      const cancel = () => {
        resetInput(input)
        resolve('')
        isCancel = true
      }

      const ok = () => {
        if (input.value !== cellText) {
          resolve(input.value)
          resetInput(input)
        } else {
          cancel()
        }
      }

      input.onblur = ok

      input.onkeydown = e => {
        if (inComposition) {
          return
        }

        if (e.key === 'Escape') {
          cancel()
        }

        if (e.key === 'Tab') {
          nextAction = e.shiftKey ? 'edit-prev-cell' : 'edit-next-cell'
          ok()

          e.preventDefault()
          e.stopPropagation()
        }

        if (e.key === 'Enter') {
          // insert br
          if (e.shiftKey || hasCtrlCmd(e)) {
            const startPos = input.selectionStart
            const endPos = input.selectionEnd
            input.value = input.value.substring(0, startPos) + '\n' + input.value.substring(endPos)
          } else {
            ok()
          }

          e.preventDefault()
          e.stopPropagation()
        }
      }

      input.addEventListener('compositionstart', () => {
        inComposition = true
      })

      input.addEventListener('compositionend', () => {
        inComposition = false
      })
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
      isCancel = true
    }

    value = inputVal || ''
  }

  if (!isCancel) {
    if (!value.startsWith(' ') && cellIndex > 0) value = ' ' + value
    if (!value.endsWith(' ') && cellIndex < columns.length - 1) value += ' '

    columns[cellIndex] = value

    replaceLine(start, columnsToStr(columns, text))
  }

  return nextAction
}

async function handleClick (e: MouseEvent, modal: boolean) {
  if (FLAG_READONLY) {
    return
  }

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

    const handleEditTableCell = (td: HTMLTableCellElement) => {
      const start = parseInt(td.dataset.sourceLine || '0')
      const end = parseInt(td.dataset.sourceLineEnd || '0')
      const cellIndex = getCellIndex(td)
      const input = modal ? null : document.createElement('textarea')

      if (input) {
        td.style.position = 'relative'
        input.style.left = '0'
        input.style.top = '0'
        input.style.height = '100%'
        input.style.width = '100%'
        input.style.boxSizing = 'border-box'
        input.style.color = 'var(--g-color-0)'
        input.style.border = '1px #93e632 solid'
        input.style.backgroundColor = 'var(--g-color-96)'
        input.style.fontSize = '13px'
        input.style.position = 'absolute'
        input.style.display = 'block'
        input.style.padding = '3px'
        input.style.lineHeight = '1.2'
        ;(input as any).autofocus = true
        input.placeholder = t('table-cell-edit.esc-to-cancel')
        setTimeout(() => {
          input.focus()
        }, 0)

        td.appendChild(input)
      }

      editTableCell(start, end, cellIndex, input).catch((e: Error) => {
        useToast().show('warning', e.message)
        input && resetInput(input)
      }).then(nextAction => {
        if (nextAction) {
          setTimeout(() => {
            if (nextAction === 'edit-next-cell' && td.nextElementSibling) {
              handleEditTableCell(td.nextElementSibling as HTMLTableCellElement)
            } else if (nextAction === 'edit-prev-cell' && td.previousElementSibling) {
              handleEditTableCell(td.previousElementSibling as HTMLTableCellElement)
            }
          }, 0)
        }
      })
    }

    handleEditTableCell(target as HTMLTableCellElement)

    return preventEvent()
  }

  return false
}

function addRow (td: HTMLTableCellElement, num: number) {
  const start = parseInt(td.dataset.sourceLine || '0')
  const end = parseInt(td.dataset.sourceLineEnd || '0')

  if (!checkLineNumber(start, end)) {
    return
  }

  const rows = getRows(td)
  const hr = rows.find(x => x.type === 'hr')
  if (!hr) {
    return
  }

  const refText = getLineContent(hr.start)
  const cols = escapedSplit(refText)
  const columns = cols.map(() => ' -- ')

  const str = columnsToStr(columns, refText)

  const strs = Array.from({ length: Math.abs(num) }, () => str).join('\n')

  const content = getLineContent(start)
  const text = num > 0 ? `${content}\n${strs}` : `${strs}\n${content}`

  replaceLine(start, text)
}

function deleteRow (td: HTMLTableCellElement) {
  const start = parseInt(td.dataset.sourceLine || '0')
  const end = parseInt(td.dataset.sourceLineEnd || '0')

  if (!checkLineNumber(start, end)) {
    return
  }

  deleteLine(start)
}

function processColumns (td: HTMLTableCellElement, process: (columns: string[]) => void) {
  const rows = getRows(td)
  if (rows.some(({ start, end }) => !checkLineNumber(start, end))) {
    return
  }

  const hr = rows.find(x => x.type === 'hr')
  if (!hr) {
    return
  }

  const refText = getLineContent(hr.start)

  rows.forEach((row) => {
    const { start } = row

    const content = getLineContent(start)
    const columns = escapedSplit(content)

    process(columns)

    replaceLine(start, columnsToStr(columns, refText))
  })
}

function alignCol (td: HTMLTableCellElement, type: 'left' | 'center' | 'right' | 'normal') {
  const rows = getRows(td)
  const hr = rows.find(x => x.type === 'hr')
  if (!hr) {
    return
  }

  const content = getLineContent(hr.start)
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

  columns[cellIndex] = ` ${val} `
  replaceLine(hr.start, columnsToStr(columns, content))
}

function addCol (td: HTMLTableCellElement, num: number) {
  const offset = num > 0 ? 1 : 0
  const cellIndex = getCellIndex(td)
  const arr = Array.from({ length: Math.abs(num) }, () => ' -- ')

  processColumns(td, columns => {
    if (cellIndex > columns.length - 1 || cellIndex < 0) {
      return
    }

    columns.splice(cellIndex + offset, 0, ...arr)
  })
}

function deleteCol (td: HTMLTableCellElement) {
  const cellIndex = getCellIndex(td)
  processColumns(td, columns => {
    columns.splice(cellIndex, 1)
  })
}

function sortCol (td: HTMLTableCellElement, oldIndex: number, newIndex: number) {
  processColumns(td, columns => {
    if (columns.length - 1 < Math.max(oldIndex, newIndex)) {
      return
    }

    const text = columns[oldIndex]
    columns.splice(oldIndex, 1)
    columns.splice(newIndex, 0, text)
  })
}

function sortRow (td: HTMLTableCellElement, oldIndex: number, newIndex: number) {
  const rows = orderBy(getRows(td).filter(x => x.type === 'body'), x => x.start)
  if (rows.length - 1 < Math.max(oldIndex, newIndex)) {
    return
  }

  if (rows.some(({ start, end }) => !checkLineNumber(start, end))) {
    return
  }

  const oldLine = rows[oldIndex].start
  const newLine = rows[newIndex].start

  const content = getLineContent(oldLine)
  deleteLine(oldLine)
  const prevContent = getLineContent(newLine)
  replaceLine(newLine, `${content}\n${prevContent}`)
}

function toggleSortMode (td: HTMLTableCellElement, flag: boolean) {
  const table: (HTMLElement & { colSortable?: Sortable, rowSortable?: Sortable }) | null | undefined = td.parentElement?.parentElement?.parentElement
  if (!table || table.tagName !== 'TABLE') {
    return
  }

  logger.debug('toggleSortMode', flag)

  const theadFirstTr = table.querySelector<HTMLElement>('thead > tr')
  const tbody = table.querySelector<HTMLElement>('tbody')

  const clean = () => {
    logger.debug('toggleSortMode', 'clean')
    table.onblur = null
    table.onkeydown = null
    table.removeAttribute(tableSortMode)
    table.colSortable?.destroy()
    delete table.colSortable
    table.rowSortable?.destroy()
    table.blur()
    delete table.rowSortable
  }

  if (flag && theadFirstTr && tbody) {
    clean()

    // restore origin order for vue vnode
    const restoreOrder = (sortable: Sortable, oldIndex: number, newIndex: number) => {
      const arr = sortable.toArray()
      const id = arr[newIndex]
      arr.splice(newIndex, 1)
      arr.splice(oldIndex, 0, id)
      sortable.sort(arr)
    }

    table.colSortable = Sortable.create(theadFirstTr, {
      animation: 200,
      direction: 'horizontal',
      dataIdAttr: DOM_ATTR_NAME.TOKEN_IDX,
      onEnd: ({ oldIndex, newIndex }) => {
        if (typeof oldIndex === 'number' && typeof newIndex === 'number' && oldIndex !== newIndex) {
          restoreOrder(table.colSortable!, oldIndex, newIndex)
          sortCol(td, oldIndex, newIndex)
          renderImmediately()
          nextTick(() => toggleSortMode(td, true))
        }
      }
    })

    table.rowSortable = Sortable.create(tbody, {
      animation: 200,
      direction: 'vertical',
      handle: 'td:first-of-type',
      dataIdAttr: DOM_ATTR_NAME.TOKEN_IDX,
      onEnd: ({ oldIndex, newIndex }) => {
        if (typeof oldIndex === 'number' && typeof newIndex === 'number' && oldIndex !== newIndex) {
          restoreOrder(table.rowSortable!, oldIndex, newIndex)
          sortRow(td, oldIndex, newIndex)
          renderImmediately()
          nextTick(() => toggleSortMode(td, true))
        }
      }
    })

    table.tabIndex = -1

    table.onblur = () => {
      toggleSortMode(td, false)
    }

    table.onkeydown = (e) => {
      if (e.key === 'Escape') {
        toggleSortMode(td, false)
      }
    }

    table.setAttribute(tableSortMode, 'true')
    table.focus()
  } else {
    clean()
  }
}

function sortRows (td: HTMLTableCellElement, order: 'asc' | 'desc') {
  const rows = getRows(td).filter(x => x.type === 'body')
  const cellIndex = getCellIndex(td)
  const contents = rows.map(row => {
    const text = getLineContent(row.start)
    return {
      sortBy: escapedSplit(text)[cellIndex],
      text,
    }
  })

  orderBy(contents, x => {
    const number = parseFloat(x.sortBy)
    if (!isNaN(number) && isFinite(number)) {
      return number.toFixed(12).padStart(20) + x.sortBy
    }

    return x.sortBy
  }, order).forEach(({ text }, i) => {
    replaceLine(rows[i].start, text)
  })
}

const insertNums = reactive({
  colLeft: 1,
  colRight: 1,
  rowTop: 1,
  rowBottom: 1,
})

export default {
  name: 'markdown-table',
  register: (ctx) => {
    ctx.view.addStyles(`
      .markdown-view .markdown-body table.small td,
      .markdown-view .markdown-body table.small th {
        padding: 3px 6px;
        font-size: 14px;
        line-height: 1.3;
      }

      @media screen {
        .markdown-view .markdown-body .table-wrapper {
          overflow-x: auto;
          margin-bottom: 16px;
        }

        .markdown-view .markdown-body .table-wrapper > table {
          margin-bottom: 6px;
        }

        .markdown-view .markdown-body .table-wrapper > table tr {
          scroll-margin: 2px;
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

        .markdown-view .markdown-body .table-wrapper > table[sort-mode],
        .markdown-view .markdown-body .table-wrapper > table[sort-mode] tr {
          outline: none;
        }

        .markdown-view .markdown-body .table-wrapper > table[sort-mode] td:hover,
        .markdown-view .markdown-body .table-wrapper > table[sort-mode] th:hover {
          background: initial;
        }

        .markdown-view .markdown-body .table-wrapper > table[sort-mode] thead tr:first-of-type th {
          background: var(--g-color-86);
          cursor: ew-resize;
        }

        .markdown-view .markdown-body .table-wrapper > table[sort-mode] tbody tr td:first-of-type {
          background: var(--g-color-86);
          cursor: ns-resize;
        }

        .markdown-view .markdown-body .table-wrapper > table[sort-mode] .sortable-ghost {
          opacity: 0.5;
        }
      }
    `)

    ctx.theme.addStyles(`
      .plugin-table-cell-edit-insert-nums {
        display: flex;
        align-items: center;
      }

      .plugin-table-cell-edit-insert-nums > input {
        margin-left: 10px !important;
        font-size: 12px !important;
        padding: 0 2px !important;
        width: 3em !important;
        text-align: center !important;
        background: rgba(var(--g-color-0-rgb), 0.1) !important;
        margin-top: -4px !important;
        margin-bottom: -4px !important;
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
      if (ctx.args.FLAG_READONLY) {
        return
      }

      const view = ctx.view.getViewDom()
      view?.querySelectorAll('.yank-table-cell').forEach(td => {
        (td as HTMLElement).title = t('table-cell-edit.db-click-edit')
      })
    })

    ctx.registerHook('VIEW_ON_GET_HTML_FILTER_NODE', ({ node }) => {
      // remove table style: width, height
      if (node.tagName === 'TABLE') {
        node.style.width = ''
        node.style.height = ''
      }
    })

    ctx.view.tapContextMenus((menus, e) => {
      if (ctx.args.FLAG_READONLY) {
        return
      }

      const target = e.target as HTMLTableCellElement
      const tagName = target.tagName
      if ((tagName === 'TD' || tagName === 'TH') && target.classList.contains(cellClassName)) {
        const rows = getRows(target)
        const hr = rows.find(x => x.type === 'hr')
        if (!hr) {
          return
        }

        const columns = escapedSplit(ctx.editor.getLineContent(hr.start))
        const cellIndex = getCellIndex(target)
        const styleText = (columns[cellIndex] || '').trim()

        if (!styleText) {
          const msg = 'Incorrect table format'
          ctx.ui.useToast().show('warning', msg)
          throw new Error(msg)
        }

        const buildInput = (key: keyof typeof insertNums) => ctx.lib.vue.h('input', {
          value: insertNums[key],
          type: 'number',
          min: 1,
          max: 99,
          step: 1,
          onInput: (e: any) => { insertNums[key] = e.target.value },
          onClick: (e: any) => { e.stopPropagation() },
          onKeyup: (e: any) => { if (e.keyCode === 13) { e.target.parentNode.click(); e.stopPropagation() } }
        })

        const editRowMenu: Components.ContextMenu.Item[] = tagName === 'TD' ? [
          { type: 'separator' },
          {
            id: 'plugin.table.cell-edit.add-row-above',
            type: 'normal',
            label: ctx.lib.vue.h('span', { class: 'plugin-table-cell-edit-insert-nums' }, [
              ctx.i18n.t('table-cell-edit.context-menu.add-row-above'),
              buildInput('rowTop')
            ]),
            onClick: () => addRow(target, -(insertNums.rowTop || 1)),
          },
          {
            id: 'plugin.table.cell-edit.add-row-below',
            type: 'normal',
            label: ctx.lib.vue.h('span', { class: 'plugin-table-cell-edit-insert-nums' }, [
              ctx.i18n.t('table-cell-edit.context-menu.add-row-below'),
              buildInput('rowBottom')
            ]),
            onClick: () => addRow(target, insertNums.rowBottom || 1),
          },
          {
            id: 'plugin.table.cell-edit.delete-row',
            type: 'normal',
            label: ctx.i18n.t('table-cell-edit.context-menu.delete-row'),
            hidden: rows.length < 4,
            onClick: () => deleteRow(target)
          },
        ] : []

        menus.push(
          {
            id: 'plugin.table.cell-edit.quick-edit',
            type: 'normal' as any,
            label: ctx.i18n.t('table-cell-edit.context-menu.quick-edit'),
            onClick: () => {
              handleClick(e, false)
            }
          },
          {
            id: 'plugin.table.cell-edit.edit',
            type: 'normal' as any,
            label: ctx.i18n.t('table-cell-edit.context-menu.edit'),
            onClick: () => {
              handleClick(e, true)
            }
          },
          { type: 'separator' },
          {
            id: 'plugin.table.cell-edit.sort-mode',
            type: 'normal',
            label: ctx.i18n.t('table-cell-edit.context-menu.sort-mode'),
            onClick: () => {
              toggleSortMode(target, true)
            }
          },
          {
            id: 'plugin.table.cell-edit.sort-asc',
            type: 'normal',
            label: ctx.i18n.t('table-cell-edit.context-menu.sort-asc'),
            onClick: () => {
              sortRows(target, 'asc')
            }
          },
          {
            id: 'plugin.table.cell-edit.sort-desc',
            type: 'normal',
            label: ctx.i18n.t('table-cell-edit.context-menu.sort-desc'),
            onClick: () => {
              sortRows(target, 'desc')
            }
          },
          { type: 'separator' },
          {
            id: 'plugin.table.cell-edit.align-left',
            type: 'normal',
            label: ctx.i18n.t('table-cell-edit.context-menu.align-left'),
            hidden: /^:[^:]*$/.test(styleText),
            onClick: () => alignCol(target, 'left'),
          },
          {
            id: 'plugin.table.cell-edit.align-center',
            type: 'normal',
            label: ctx.i18n.t('table-cell-edit.context-menu.align-center'),
            hidden: /^:[^:]*:$/.test(styleText),
            onClick: () => alignCol(target, 'center'),
          },
          {
            id: 'plugin.table.cell-edit.align-right',
            type: 'normal',
            label: ctx.i18n.t('table-cell-edit.context-menu.align-right'),
            hidden: /^[^:]*:$/.test(styleText),
            onClick: () => alignCol(target, 'right'),
          },
          {
            id: 'plugin.table.cell-edit.align-normal',
            type: 'normal',
            label: ctx.i18n.t('table-cell-edit.context-menu.align-normal'),
            hidden: /^[^:]*$/.test(styleText),
            onClick: () => alignCol(target, 'normal'),
          },
          ...editRowMenu,
          { type: 'separator' },
          {
            id: 'plugin.table.cell-edit.add-col-left',
            type: 'normal',
            label: ctx.lib.vue.h('span', { class: 'plugin-table-cell-edit-insert-nums' }, [
              ctx.i18n.t('table-cell-edit.context-menu.add-col-left'),
              buildInput('colLeft')
            ]),
            onClick: () => addCol(target, -(insertNums.colLeft || 1))
          },
          {
            id: 'plugin.table.cell-edit.add-col-right',
            type: 'normal',
            label: ctx.lib.vue.h('span', { class: 'plugin-table-cell-edit-insert-nums' }, [
              ctx.i18n.t('table-cell-edit.context-menu.add-col-right'),
              buildInput('colRight')
            ]),
            onClick: () => addCol(target, insertNums.colRight || 1)
          },
          {
            id: 'plugin.table.cell-edit.delete-col',
            type: 'normal',
            label: ctx.i18n.t('table-cell-edit.context-menu.delete-col'),
            hidden: columns.length < 2,
            onClick: () => deleteCol(target)
          },
        )
      }
    })
  }
} as Plugin
