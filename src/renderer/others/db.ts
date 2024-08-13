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

export async function updateOrInsertDocument (entity: Omit<DocumentEntity, 'id'>) {
  const oldRecord = await db.documents.where({ repo: entity.repo, path: entity.path }).first()
  if (!oldRecord) {
    logger.debug('insert', entity.path)
    await db.documents.add(entity)
  } else if (oldRecord.mtimeMs !== entity.mtimeMs) {
    logger.debug('update', entity.path)
    await db.documents.update(oldRecord.id, entity)
  } else {
    logger.debug('skip', entity.path)
  }
}

export async function cleanRepoDocument (repo: string) {
  logger.debug('cleanRepoDocument', repo)
  await db.documents.where({ repo }).delete()
}

export async function cleanExceptRepoDocument (repos: string[]) {
  logger.debug('cleanExceptRepoDocument', repos)
  await db.documents.where('repo').noneOf(repos).delete()
}
