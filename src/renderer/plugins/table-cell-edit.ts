import { useModal } from '@fe/support/ui/modal'
import { Plugin } from '@fe/context'
import { hasCtrlCmd } from '@fe/core/command'
import { getActionHandler } from '@fe/core/action'
import { useToast } from '@fe/support/ui/toast'
import { getLineContent, replaceLine } from '@fe/services/editor'

function reset (input: HTMLTextAreaElement) {
  input.parentElement!.style.position = ''
  input.onblur = () => undefined
  input.remove()
}

const editTableCell = async (start: number, end: number, cellIndex: number, input: HTMLTextAreaElement | null) => {
  const toast = useToast()
  const modal = useModal()

  if (end - start !== 1) {
    toast.show('warning', '暂只支持编辑单行文本')
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
    throw new Error('编辑错误')
  }

  let value = cellText
  if (input) {
    input.value = cellText
    value = await (new Promise((resolve) => {
      const cancel = () => {
        reset(input)
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
      title: '编辑单元格',
      type: 'textarea',
      value: cellText,
      modalWidth: '600px',
      hint: '单元格内容',
    })

    if (typeof inputVal !== 'string') {
      toast.show('warning', '取消编辑')
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

export default {
  name: 'table-cell-edit',
  register: (ctx) => {
    const handleClick = async (e: MouseEvent, modal: boolean) => {
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
          input.placeholder = 'ESC 取消'
          setTimeout(() => {
            input.focus()
          }, 0)

          target.appendChild(input)
        }

        editTableCell(start, end, cellIndex, input).catch((e: Error) => {
          useToast().show('warning', e.message)
          input && reset(input)
        })

        return preventEvent()
      }

      return false
    }

    ctx.registerHook('ON_VIEW_ELEMENT_DBCLICK', e => handleClick(e, false))
    ctx.registerHook('ON_VIEW_ELEMENT_CLICK', e => handleClick(e, true))
    ctx.registerHook('ON_VIEW_RENDERED', ({ getViewDom }) => {
      const view: HTMLElement = getViewDom()!
      view.querySelectorAll('.yank-table-cell').forEach(td => {
        (td as HTMLElement).title = '双击编辑'
      })
    })
  }
} as Plugin
