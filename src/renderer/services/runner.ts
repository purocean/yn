import { triggerHook } from '@fe/core/hook'
import * as ioc from '@fe/core/ioc'
import type { CodeRunner } from '@fe/types'

/**
 * Register a runner.
 * @param runner
 */
export function registerRunner (runner: CodeRunner) {
  ioc.register('CODE_RUNNER', runner)
  triggerHook('CODE_RUNNER_CHANGE', { type: 'register' })
}

/**
 * Remove a runner.
 * @param name runner name
 */
export function removeRunner (name: string) {
  ioc.removeWhen('CODE_RUNNER', item => item.name === name)
  triggerHook('CODE_RUNNER_CHANGE', { type: 'remove' })
}

/**
 * Get all runners.
 * @returns runners
 */
export function getAllRunners () {
  return ioc.get('CODE_RUNNER').sort((a, b) => (a.order || 0) - (b.order || 0))
}
