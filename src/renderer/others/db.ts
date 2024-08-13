import { IndexItem } from '@fe/types'
import { getLogger } from '@fe/utils/pure'
import Dexie, { EntityTable } from 'dexie'

const logger = getLogger('db')

export interface DocumentEntity extends IndexItem {
  id: number
}

const db = new Dexie('yank-note') as Dexie & {
  documents: EntityTable<DocumentEntity, 'id'>;
}

db.version(1).stores({
  documents: '++id, repo, [repo+path]',
})

export async function getDocument (repo: string, path: string) {
  return db.documents.where({ repo, path }).first()
}

export async function updateOrInsertDocument (entity: Omit<DocumentEntity, 'id'> & { id?: number }) {
  logger.debug('updateOrInsertDocument', entity.id, entity.path)
  await db.documents.put(entity)
}

export async function cleanRepoDocument (repo: string) {
  logger.debug('cleanRepoDocument', repo)
  await db.documents.where({ repo }).delete()
}

export async function cleanExceptRepoDocument (repos: string[]) {
  logger.debug('cleanExceptRepoDocument', repos)
  await db.documents.where('repo').noneOf(repos).delete()
}
