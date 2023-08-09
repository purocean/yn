import type { BuildInIOCTypes } from '@fe/types'

const container: Record<string, any[]> = {}

function updateVersion (items: any) {
  items._version = (items._version || 0) + 1
}

export function get<T extends keyof BuildInIOCTypes> (type: T): BuildInIOCTypes[T][] {
  return [...(container[type] || [])]
}

export function getRaw<T extends keyof BuildInIOCTypes> (type: T): (BuildInIOCTypes[T][] & { _version: number }) | undefined {
  return container[type] as (BuildInIOCTypes[T][] & { _version: number })
}

export function register<T extends keyof BuildInIOCTypes> (type: T, item: BuildInIOCTypes[T]) {
  if (!container[type]) {
    container[type] = []
  }

  updateVersion(container[type])

  container[type].push(item)
}

export function remove<T extends keyof BuildInIOCTypes> (type: T, item: BuildInIOCTypes[T]) {
  if (container[type]) {
    const idx = container[type].indexOf(item)
    if (idx > -1) {
      container[type].splice(idx, 1)
    }
    updateVersion(container[type])
  }
}

export function removeWhen <T extends keyof BuildInIOCTypes> (type: T, when: (item: BuildInIOCTypes[T]) => boolean) {
  if (container[type]) {
    const items = container[type]
    for (let i = items.length - 1; i >= 0; i--) {
      if (when(items[i])) {
        items.splice(i, 1)
        updateVersion(container[type])
      }
    }
  }
}

export function removeAll<T extends keyof BuildInIOCTypes> (type: T) {
  if (container[type]) {
    container[type].length = 0
    updateVersion(container[type])
  }
}
