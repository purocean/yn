import type { BuildInIOCTypes } from '@fe/types'

export const container: Record<string, any[]> = {}

export function get<T extends keyof BuildInIOCTypes> (type: T): BuildInIOCTypes[T][] {
  return container[type] || []
}

export function register<T extends keyof BuildInIOCTypes> (type: T, item: BuildInIOCTypes[T]) {
  if (!container[type]) {
    container[type] = []
  }

  container[type].push(item)
}

export function remove<T extends keyof BuildInIOCTypes> (type: T, item: BuildInIOCTypes[T]) {
  if (container[type]) {
    const idx = container[type].indexOf(item)
    if (idx > -1) {
      container[type].splice(idx, 1)
    }
  }
}

export function removeWhen <T extends keyof BuildInIOCTypes> (type: T, when: (item: BuildInIOCTypes[T]) => boolean) {
  if (container[type]) {
    const items = container[type]
    for (let i = items.length - 1; i >= 0; i--) {
      if (when(items[i])) {
        items.splice(i, 1)
      }
    }
  }
}

export function removeAll<T extends keyof BuildInIOCTypes> (type: T) {
  container[type] = []
}
