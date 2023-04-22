import { Ref, ref, watch } from 'vue'

export function useLazyRef<T> (source: Ref<T> | (() => T), delay: ((val: T) => number) | number) {
  const initValue = typeof source === 'function' ? source() : source.value
  const value = ref<T>(initValue) as Ref<T>

  let timer: any = 0

  watch(source, (val) => {
    if (timer) {
      clearTimeout(timer)
      timer = 0
    }

    const _delay = typeof delay === 'function' ? delay(val) : delay

    if (_delay < 0) {
      value.value = val
      return
    }

    timer = setTimeout(() => {
      value.value = val
    }, _delay)
  })

  return value
}
