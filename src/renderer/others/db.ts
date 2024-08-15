import { difference } from 'lodash-es'
import Dexie, { EntityTable } from 'dexie'
import { getLogger } from '@fe/utils/pure'
import type { IndexItem } from '@fe/types'

const logger = getLogger('db')

export interface DocumentEntity extends IndexItem {
  id: number
}

const dbPrefix = 'yank-note-'

const dbName = dbPrefix + __APP_VERSION__

const db = new Dexie(dbName) as Dexie & {
  documents: EntityTable<DocumentEntity, 'id'>;
}

db.version(1).stores({
  documents: '++id, repo, [repo+path]',
})

export const documents = {
  findByRepoAndPath (repo: string, path: string): Promise<DocumentEntity | undefined> {
    logger.debug('getByRepoAndPath', repo, path)
    return db.documents.where({ repo, path }).first()
  },
  async findAllMtimeMsByRepo (repo: string): Promise<Map<string, { id: number, mtimeMs: number }>> {
    logger.debug('findAllMtimeMsByRepo', repo)
    const map = new Map<string, { id: number, mtimeMs: number }>()
    await db.documents.where({ repo }).each(doc => {
      map.set(doc.path, { id: doc.id, mtimeMs: doc.mtimeMs })
    })
    return map
  },
  put (entity: Omit<DocumentEntity, 'id'> & { id?: number }): Promise<number> {
    logger.debug('updateOrInsert', entity)
    return db.documents.put(entity)
  },
  bulkPut (items: (Omit<DocumentEntity, 'id'> & { id?: number })[]): Promise<number[]> {
    logger.debug('blukPut', items.length)
    return db.documents.bulkPut(items, { allKeys: true })
  },
  async deleteByRepo (repo: string): Promise<number> {
    logger.debug('deleteByRepo', repo)
    const deleted = await db.documents.where({ repo }).delete()
    logger.debug('deleteByRepo deleted', deleted)
    return deleted
  },
  async deleteUnusedRepo (usedRepos: string[]): Promise<number> {
    logger.debug('deleteUnusedRepo', usedRepos)
    const deleted = await db.documents.where('repo').noneOf(usedRepos).delete()
    logger.debug('deleteUnusedRepo deleted', deleted)
    return deleted
  },
  async deleteUnusedInRepo (repo: string, usedIds: number[]): Promise<number> {
    logger.debug('deleteUnusedInRepo', repo, usedIds.length)
    const allIds = await db.documents.where({ repo }).primaryKeys()
    const toDeleteIds = difference(allIds, usedIds)
    await db.documents.bulkDelete(toDeleteIds)
    logger.debug('deleteUnusedInRepo deleted', toDeleteIds.length)
    return toDeleteIds.length
  },
  async deletedByRepoAndPath (repo: string, path: string): Promise<number> {
    logger.debug('deletedByRepoAndPath', repo, path)
    const deleted = await db.documents.where({ repo, path }).delete()
    logger.debug('deletedByRepoAndPath deleted', deleted)
    return deleted
  }
}

export async function removeOldDatabases () {
  const databases = await Dexie.getDatabaseNames()
  const oldDatabases = databases.filter(name => name.startsWith(dbPrefix) && name !== dbName)
  logger.debug('remove old databases', oldDatabases)
  oldDatabases.forEach(name => Dexie.delete(name))
}
