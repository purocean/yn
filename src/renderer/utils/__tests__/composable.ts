import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useLazyRef } from '../composable'

afterEach(() => {
  vi.useRealTimers()
})

describe('useLazyRef', () => {
  it('keeps the initial ref value and applies delayed updates', async () => {
    vi.useFakeTimers()
    const source = ref('a')
    const value = useLazyRef(source, 100)

    expect(value.value).toBe('a')

    source.value = 'b'
    await nextTick()
    expect(value.value).toBe('a')

    vi.advanceTimersByTime(99)
    expect(value.value).toBe('a')

    vi.advanceTimersByTime(1)
    expect(value.value).toBe('b')
  })

  it('cancels pending updates when source changes again', async () => {
    vi.useFakeTimers()
    const source = ref(1)
    const value = useLazyRef(source, 50)

    source.value = 2
    await nextTick()
    vi.advanceTimersByTime(25)

    source.value = 3
    await nextTick()
    vi.advanceTimersByTime(49)
    expect(value.value).toBe(1)

    vi.advanceTimersByTime(1)
    expect(value.value).toBe(3)
  })

  it('supports getter sources, dynamic delay and immediate updates', async () => {
    vi.useFakeTimers()
    const source = ref(2)
    const value = useLazyRef(() => source.value * 2, val => val > 10 ? -1 : 20)

    expect(value.value).toBe(4)

    source.value = 3
    await nextTick()
    vi.advanceTimersByTime(20)
    expect(value.value).toBe(6)

    source.value = 6
    await nextTick()
    expect(value.value).toBe(12)
  })
})
