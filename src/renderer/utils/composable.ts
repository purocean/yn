import { Ref, ref, watch } from 'vue'

export function useLazyRef<T> (fun: Ref<T> | (() => T), delay: ((val: T) => number) | number) {
  const value = ref<T>()

  let timer:any = 0

  watch(fun, (val) => {
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
