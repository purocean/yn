import { useBus } from '@/useful/bus'
import { useModal } from '@/useful/modal'
import { Plugin, Ctx } from '@/useful/plugin'
import { hasCtrlCmd } from '@/useful/shortcut'
import { useToast } from '@/useful/toast'

const editTableCell = async (start: number, end: number, cellIndex: number) => {
  const toast = useToast()
  const modal = useModal()
  const bus = useBus()

  if (end - start !== 1) {
    toast.show('warning', '暂只支持编辑单行文本')
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

  let text = ''
  bus.emit('editor-get-line', { line: start, callback: (val: string) => { text = val.trim() } })

  const columns = escapedSplit(text)
  const cellText = columns[cellIndex]

  if (typeof cellText !== 'string') {
    toast.show('warning', '编辑错误')
    return
  }

  let value = await modal.input({
    title: '编辑单元格',
    type: 'textarea',
    value: cellText,
    modalWidth: '600px',
    hint: '单元格内容',
  })
  if (typeof value !== 'string') {
    toast.show('warning', '取消编辑')
    return
  }

  if (!value.startsWith(' ') && cellIndex > 0) value = ' ' + value
  if (!value.endsWith(' ') && cellIndex < columns.length - 1) value += ' '
  columns[cellIndex] = value.replace(/\|/g, '\\|').replace(/\n/g, ' ')

  let content = columns.join('|').trim()
  if (text.startsWith('|')) content = '| ' + content
  if (text.endsWith('|')) content += ' |'

  bus.emit('editor-replace-line', { line: start, value: content })
}

export default {
  name: 'table-cell-edit',
  register: (ctx: Ctx) => {
    ctx.registerHook('ON_VIEW_ELEMENT_CLICK', async (e: MouseEvent) => {
      const target = e.target as HTMLElement

      const preventEvent = () => {
        e.preventDefault()
        e.stopPropagation()
        return true
      }

      if (target.tagName === 'TD' && target.classList.contains('yank-td') && hasCtrlCmd(e)) {
        const start = parseInt(target.dataset.sourceLine || '0')
        const end = parseInt(target.dataset.sourceLineEnd || '0')
        const td = target as HTMLTableDataCellElement
        const cellIndex = [...td.parentElement!.children as any]
          .slice(0, td.cellIndex)
          .reduce((prev, current) => prev + current.colSpan, 0)

        editTableCell(start, end, cellIndex)

        return preventEvent()
      }

      return false
    })
  }
} as Plugin
