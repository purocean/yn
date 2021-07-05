import { useToast } from '@fe/support/toast'

export function copyText (text?: string) {
  if (text === undefined) {
    return
  }

  const toast = useToast()

  const input = document.createElement('input')
  input.style.position = 'absolute'
  input.style.background = 'red'
  input.style.left = '-999999px'
  input.style.top = '-999999px'
  input.style.zIndex = '-1000'
  input.style.opacity = '0'
  input.value = text
  document.body.appendChild(input)
  input.select()
  document.execCommand('copy')
  document.body.removeChild(input)
  toast.show('info', '已复制')
}
