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

    if (delay < 0) {
      value.value = val
      return
    }

    timer = setTimeout(() => {
      value.value = val
    }, typeof delay === 'function' ? delay(val) : delay)
  })

  return value
}
