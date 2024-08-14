import store from '@fe/support/store'
import { getSetting } from './setting'
import { isEqual } from 'lodash-es'

/**
 * Get all repositories
 * @returns
 */
export function getAllRepos () {
  return getSetting('repos', [])
}

/**
 * get repo by name
 * @param name
 * @returns
 */
export function getRepo (name: string) {
  return getAllRepos().find(x => x.name === name)
}

/**
 * Set current repository
 * @param name
 */
export function setCurrentRepo (name?: string) {
  if (name) {
    const repo = getRepo(name)
    if (!repo) {
      throw new Error(`Repository ${name} not found.`)
    }

    if (!isEqual(store.state.currentRepo, repo)) {
      store.state.currentRepo = { ...repo }
    }
  } else {
    store.state.currentRepo = undefined
  }
}
