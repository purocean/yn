import { isEqual } from 'lodash-es'
import { isNormalRepoName } from '@share/misc'
import store from '@fe/support/store'
import type { Repo } from '@fe/types'
import { getSetting, writeSettings } from './setting'

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

/**
 * enable or disable repo indexing
 */
export async function toggleRepoIndexing (name: string, enable: boolean) {
  const repos = getAllRepos().map(x => x.name === name ? { ...x, enableIndexing: enable } : x)
  await writeSettings({ repos })
  if (store.state.currentRepo?.name === name) { // update current repo
    setCurrentRepo(name)
  }
}

/**
 * Check if the repo is normal
 * @param name
 * @returns
 */
export function isNormalRepo (nameOrRepo: string | Repo) {
  if (typeof nameOrRepo === 'string') {
    return isNormalRepoName(nameOrRepo)
  }

  return isNormalRepoName(nameOrRepo.name)
}
