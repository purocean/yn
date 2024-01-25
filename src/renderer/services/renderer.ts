import type { VNode } from 'vue'
import { registerHook } from '@fe/core/hook'
import type { RenderEnv, Renderer } from '@fe/types'
import * as ioc from '@fe/core/ioc'

const renderCache: Map<string, Map<string, any>> = new Map()

registerHook('VIEW_BEFORE_REFRESH', () => {
  renderCache.clear()
})

/**
 * Get render cache
 * @param domain
 * @param key
 * @returns
 */
export function getRenderCache (domain: string): Map<string, any>
export function getRenderCache<T> (domain: string, key: string, fallback?: T | (() => T)): T
export function getRenderCache (domain: string, key?: string, fallback?: any) {
  if (!domain) {
    throw new Error('Domain is required')
  }

  if (!renderCache.has(domain)) {
    renderCache.set(domain, new Map())
  }

  const cache = renderCache.get(domain)!

  if (!key) {
    return cache
  }

  const value = cache.get(key)
  if (value) {
    return value
  }

  const newValue = typeof fallback === 'function' ? fallback() : fallback
  cache.set(key, newValue)
  return newValue
}

export function render (src: string, env: RenderEnv): VNode | VNode[] | string {
  // build render cache
  if (env.file) {
    const cacheKey = `__file_${env.file.repo}:${env.file.path}`
    if (!renderCache.has(cacheKey)) {
      renderCache.clear()
      renderCache.set(cacheKey, new Map())
    }
  } else {
    renderCache.clear()
  }

  const renderer = ioc.get('RENDERERS').find(x => x.when(env))

  if (!renderer) {
    throw new Error('No renderer found')
  }

  return renderer.render(src, env)
}

export function registerRenderer (renderer: Renderer) {
  ioc.register('RENDERERS', renderer)

  // sort renderers by order
  ioc.getRaw('RENDERERS')?.sort((a, b) => (a.order || 0) - (b.order || 0))
}

export function removeRenderer (name: string) {
  ioc.removeWhen('RENDERERS', item => item.name === name)
}
