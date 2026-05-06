import * as crypto from 'crypto'
import * as fs from 'fs-extra'
import * as os from 'os'
import * as path from 'path'
import AdmZip from 'adm-zip'
import { ROOT_REPO_NAME_PREFIX } from '../../../share/misc'

const mocks = vi.hoisted(() => {
  const nodeOs = require('node:os')
  const nodePath = require('node:path')
  const { EventEmitter } = require('node:events')

  return {
    app: new EventEmitter(),
    configGet: vi.fn(),
    fork: vi.fn(),
    historyDir: nodePath.join(nodeOs.tmpdir(), `yn-file-history-${process.pid}-${Date.now()}`),
    repoPath: '',
    repos: {} as Record<string, string | null>,
    trashItem: vi.fn()
  }
})

vi.mock('electron', () => ({
  app: mocks.app,
  shell: {
    trashItem: (...args: any[]) => mocks.trashItem(...args)
  }
}))

vi.mock('child_process', () => ({
  __esModule: true,
  default: {
    fork: (...args: any[]) => mocks.fork(...args)
  },
  fork: (...args: any[]) => mocks.fork(...args)
}))

vi.mock('yargs', () => ({
  argv: {}
}))

vi.mock('../../config', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mocks.configGet(...args)
  }
}))

vi.mock('../../constant', () => ({
  get HISTORY_DIR () {
    return mocks.historyDir
  }
}))

vi.mock('../repository', () => ({
  __esModule: true,
  default: {
    getPath: (repo: string) => repo === 'main' ? mocks.repoPath : mocks.repos[repo] || null
  }
}))

vi.mock('../watch-worker', () => ({}))

import * as file from '../file'

const md5 = (content: crypto.BinaryLike) => crypto.createHash('md5').update(content).digest('hex')

function createStoredHistory (filePath: string, versions: Record<string, string>) {
  const zip = new AdmZip()
  for (const [name, content] of Object.entries(versions)) {
    zip.addFile(name, Buffer.from(content))
  }

  const compressed = new AdmZip()
  compressed.addFile('versions.zip', zip.toBuffer())

  const historyFileName = path.basename(filePath) + '.' + md5(filePath) + '.zip'
  compressed.writeZip(path.join(mocks.historyDir, historyFileName))
}

describe('server file module', () => {
  let tempRoot: string

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.useRealTimers()
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'yn-file-test-'))
    mocks.repoPath = path.join(tempRoot, 'repo')
    mocks.repos = {}
    mocks.configGet.mockImplementation((key: string, defaultValue: any) => defaultValue)
    await fs.ensureDir(mocks.repoPath)
    await fs.emptyDir(mocks.historyDir)
  })

  afterEach(async () => {
    vi.useRealTimers()
    await fs.remove(tempRoot)
    await fs.remove(mocks.historyDir)
  })

  test('reads and writes files inside the resolved repository and rejects traversal outside it', async () => {
    const hash = await file.write('main', '/notes/a.txt', 'hello')

    await expect(file.read('main', 'notes/a.txt')).resolves.toEqual(Buffer.from('hello'))
    expect(hash).toBe(md5('hello'))
    expect(() => file.read('main', '../outside.md')).toThrow('Path error.')
    expect(() => file.write('missing', '/a.md', 'x')).toThrow('repo missing not exists.')
  })

  test('supports root repository reads without consulting configured repositories', async () => {
    const rootRepo = path.join(tempRoot, 'root-repo/')
    await fs.outputFile(path.join(rootRepo, 'direct.md'), 'root content')

    await expect(file.read(ROOT_REPO_NAME_PREFIX + rootRepo, '/direct.md')).resolves.toEqual(Buffer.from('root content'))
  })

  test('hash and checkHash compare current file content', async () => {
    await fs.outputFile(path.join(mocks.repoPath, 'a.md'), 'current')

    const currentHash = md5('current')

    await expect(file.hash('main', '/a.md')).resolves.toBe(currentHash)
    await expect(file.checkHash('main', '/a.md', currentHash)).resolves.toBe(true)
    await expect(file.checkHash('main', '/a.md', md5('old'))).resolves.toBe(false)
  })

  test('handles upload conflict strategies for error, skip, overwrite, and rename', async () => {
    await fs.outputFile(path.join(mocks.repoPath, 'asset.txt'), 'old')

    await expect(file.upload('main', Buffer.from('new'), '/asset.txt', 'error')).rejects.toThrow('File exists')

    await expect(file.upload('main', Buffer.from('new'), '/asset.txt', 'skip')).resolves.toEqual({
      path: '/asset.txt',
      hash: md5('old')
    })
    expect(await fs.readFile(path.join(mocks.repoPath, 'asset.txt'), 'utf-8')).toBe('old')

    await expect(file.upload('main', Buffer.from('new'), '/asset.txt', 'overwrite')).resolves.toEqual({
      path: '/asset.txt',
      hash: md5(Buffer.from('new'))
    })
    expect(await fs.readFile(path.join(mocks.repoPath, 'asset.txt'), 'utf-8')).toBe('new')

    await expect(file.upload('main', Buffer.from('renamed'), '/asset.txt', 'rename')).resolves.toEqual({
      path: '/asset-2.txt',
      hash: md5(Buffer.from('renamed'))
    })
    expect(await fs.readFile(path.join(mocks.repoPath, 'asset-2.txt'), 'utf-8')).toBe('renamed')
  })

  test('builds sorted trees while applying exclude, include, and no-empty-directory filters', async () => {
    mocks.configGet.mockImplementation((key: string, defaultValue: any) => {
      if (key === 'tree.exclude') return '^skip\\.md$|^empty/$|^node_modules/$'
      return defaultValue
    })

    await fs.outputFile(path.join(mocks.repoPath, '10.md'), '10')
    await fs.outputFile(path.join(mocks.repoPath, '2.md'), '2')
    await fs.outputFile(path.join(mocks.repoPath, 'skip.md'), 'skip')
    await fs.outputFile(path.join(mocks.repoPath, 'alpha.txt'), 'alpha')
    await fs.outputFile(path.join(mocks.repoPath, 'docs', '1.md'), '1')
    await fs.outputFile(path.join(mocks.repoPath, 'docs', 'note.txt'), 'note')
    await fs.ensureDir(path.join(mocks.repoPath, 'empty'))
    await fs.ensureDir(path.join(mocks.repoPath, 'node_modules'))

    const result = await file.tree('main', { by: 'serial', order: 'asc' }, '^docs/$|\\.md$', true)
    const root = result[0]

    expect(root.children?.map(x => x.name)).toEqual(['docs', '2.md', '10.md'])
    expect(root.children?.find(x => x.name === 'docs')).toMatchObject({
      type: 'dir',
      path: '/docs',
      level: 2,
      children: [
        expect.objectContaining({ name: '1.md', path: '/docs/1.md', type: 'file', level: 3 })
      ]
    })
  })

  test('returns an empty tree for root repositories', async () => {
    await expect(file.tree(ROOT_REPO_NAME_PREFIX + tempRoot, { by: 'name', order: 'asc' })).resolves.toEqual([])
  })

  test('lists and reads stored history versions', async () => {
    const filePath = path.join(mocks.repoPath, 'note.md')
    await fs.outputFile(filePath, 'current')
    createStoredHistory(filePath, {
      '2026-05-01 10-00-00.md': 'older',
      '2026-05-02 10-00-00.md': 'newer'
    })

    await expect(file.historyList('main', '/note.md')).resolves.toMatchObject({
      list: [
        { name: '2026-05-02 10-00-00.md', comment: '' },
        { name: '2026-05-01 10-00-00.md', comment: '' }
      ]
    })
    await expect(file.historyContent('main', '/note.md', '2026-05-02 10-00-00.md')).resolves.toBe('newer')
    await expect(file.historyContent('main', '/note.md', 'missing.md')).resolves.toBe('')
    await expect(file.historyList('main', '/absent.md')).resolves.toEqual({ list: [], size: 0 })
  })

  test('comments and deletes history versions', async () => {
    const filePath = path.join(mocks.repoPath, 'note.md')
    await fs.outputFile(filePath, 'current')
    createStoredHistory(filePath, {
      '2026-05-01 10-00-00.md': 'older',
      '2026-05-02 10-00-00.md': 'newer'
    })

    await file.commentHistoryVersion('main', '/note.md', '2026-05-01 10-00-00.md', 'keep this')
    await expect(file.historyList('main', '/note.md')).resolves.toMatchObject({
      list: expect.arrayContaining([
        { name: '2026-05-01 10-00-00.md', comment: 'keep this' }
      ])
    })

    await file.deleteHistoryVersion('main', '/note.md', '2026-05-02 10-00-00.md')
    await expect(file.historyList('main', '/note.md')).resolves.toMatchObject({
      list: [{ name: '2026-05-01 10-00-00.md', comment: 'keep this' }]
    })

    await file.deleteHistoryVersion('main', '/note.md', '--all--')
    await expect(file.historyList('main', '/note.md')).resolves.toMatchObject({
      list: [{ name: '2026-05-01 10-00-00.md', comment: 'keep this' }]
    })
  })

  test('returns file stats, writeability, read streams, directories, copies, and removals', async () => {
    await fs.outputFile(path.join(mocks.repoPath, 'docs', 'a.md'), 'hello')

    const stat = await file.stat('main', '/docs/a.md')
    const realStat = await fs.stat(path.join(mocks.repoPath, 'docs', 'a.md'))
    expect(stat).toEqual({
      birthtime: realStat.birthtimeMs,
      mtime: realStat.mtimeMs,
      size: 5
    })

    await expect(file.checkWriteable('main', '/docs/a.md')).resolves.toBe(true)
    await expect(file.checkWriteable('main', '/missing.md')).resolves.toBe(false)

    const stream = await file.createReadStream('main', '/docs/a.md', { start: 1, end: 3 })
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(chunk)
    }
    expect(Buffer.concat(chunks).toString()).toBe('ell')

    await expect(file.write('main', '/new-dir/', '')).resolves.toBe('')
    await expect(fs.pathExists(path.join(mocks.repoPath, 'new-dir'))).resolves.toBe(true)

    await file.cp('main', '/docs/a.md', '/docs/copy.md')
    await expect(fs.readFile(path.join(mocks.repoPath, 'docs', 'copy.md'), 'utf-8')).resolves.toBe('hello')

    await file.rm('main', '/docs/copy.md', false)
    await expect(fs.pathExists(path.join(mocks.repoPath, 'docs', 'copy.md'))).resolves.toBe(false)

    await file.rm('main', '/docs/a.md')
    expect(mocks.trashItem).toHaveBeenCalledWith(path.join(mocks.repoPath, 'docs', 'a.md'))
  })

  test('writes markdown history and moves it with markdown files', async () => {
    await file.write('main', '/note.md', 'first version')
    await new Promise(resolve => setTimeout(resolve, 20))

    await expect(file.historyList('main', '/note.md')).resolves.toMatchObject({
      list: [expect.objectContaining({ name: expect.stringMatching(/\.md$/) })]
    })

    await file.mv('main', '/note.md', '/renamed.md')
    await new Promise(resolve => setTimeout(resolve, 20))

    await expect(file.historyList('main', '/note.md')).resolves.toEqual({ list: [], size: 0 })
    await expect(file.historyList('main', '/renamed.md')).resolves.toMatchObject({
      list: [expect.objectContaining({ name: expect.stringMatching(/\.md$/) })]
    })
    await expect(fs.readFile(path.join(mocks.repoPath, 'renamed.md'), 'utf-8')).resolves.toBe('first version')
  })

  test('searches markdown files while trimming input and respecting excludes', async () => {
    mocks.configGet.mockImplementation((key: string, defaultValue: any) => {
      if (key === 'tree.exclude') return '^skip\\.md$|^node_modules/$'
      return defaultValue
    })

    await fs.outputFile(path.join(mocks.repoPath, 'hit.md'), 'Target text')
    await fs.outputFile(path.join(mocks.repoPath, 'miss.md'), 'nothing')
    await fs.outputFile(path.join(mocks.repoPath, 'secret.c.md'), 'Target text')
    await fs.outputFile(path.join(mocks.repoPath, 'skip.md'), 'Target text')
    await fs.outputFile(path.join(mocks.repoPath, 'docs', 'nested.markdown'), 'another target')
    await fs.outputFile(path.join(mocks.repoPath, 'docs', 'script.txt'), 'Target text')
    await fs.outputFile(path.join(mocks.repoPath, 'node_modules', 'pkg', 'ignored.md'), 'Target text')

    await expect(file.search('main', '   ')).resolves.toEqual([])
    await expect(file.search('main', ' target ')).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'hit.md', path: '/hit.md', level: 1 }),
      expect.objectContaining({ name: 'nested.markdown', path: '/docs/nested.markdown', level: 2 })
    ]))
    await expect(file.search('main', 'target')).resolves.not.toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'secret.c.md' }),
      expect.objectContaining({ name: 'skip.md' }),
      expect.objectContaining({ name: 'script.txt' }),
      expect.objectContaining({ path: '/node_modules/pkg/ignored.md' })
    ]))
  })

  test('falls back to the default exclude regex when configured regex is invalid', async () => {
    mocks.configGet.mockImplementation((key: string, defaultValue: any) => {
      if (key === 'tree.exclude') return '('
      return defaultValue
    })

    await fs.outputFile(path.join(mocks.repoPath, 'visible.md'), 'visible')

    await expect(file.tree('main', { by: 'name', order: 'asc' })).resolves.toMatchObject([
      {
        children: [expect.objectContaining({ name: 'visible.md' })]
      }
    ])
  })

  test('starts one watch worker process and stops matching watch streams', async () => {
    const worker = new (require('node:events').EventEmitter)()
    worker.send = vi.fn()
    mocks.fork.mockReturnValue(worker)

    const response = await file.watchFile('main', ['/a.md', '/b.md'], { recursive: true } as any)
    const initMessage = worker.send.mock.calls[0][0]

    expect(mocks.fork).toHaveBeenCalledWith(expect.stringContaining('watch-worker.js'), {
      env: { ELECTRON_RUN_AS_NODE: '1' }
    })
    expect(initMessage).toEqual({
      id: expect.any(Number),
      type: 'init',
      payload: {
        filePath: [
          path.join(mocks.repoPath, '/a.md'),
          path.join(mocks.repoPath, '/b.md')
        ],
        options: { recursive: true }
      }
    })

    const dataPromise = new Promise<string>((resolve) => {
      response.once('data', chunk => resolve(chunk.toString()))
      response.resume()
    })
    worker.emit('message', { id: initMessage.id + 1, type: 'enqueue', payload: { type: 'message', data: 'ignored' } })
    worker.emit('message', { id: initMessage.id, type: 'enqueue', payload: { type: 'message', data: 'changed' } })

    await expect(dataPromise).resolves.toContain('"payload":"changed"')

    response.emit('close')
    expect(worker.send).toHaveBeenLastCalledWith({ id: initMessage.id, type: 'stop' })

    const response2 = await file.watchFile('main', '/c.md', { recursive: false } as any)
    const secondInitMessage = worker.send.mock.calls.at(-1)[0]
    worker.emit('error', new Error('worker error'))
    expect(worker.send).toHaveBeenLastCalledWith({ id: secondInitMessage.id, type: 'stop' })
    response2.destroy()
  })

  test('surfaces corrupted history archives and skips history when the configured limit is below one', async () => {
    const filePath = path.join(mocks.repoPath, 'bad.md')
    await fs.outputFile(filePath, 'current')

    const compressed = new AdmZip()
    compressed.addFile('unexpected.zip', Buffer.from('bad'))
    compressed.writeZip(path.join(mocks.historyDir, path.basename(filePath) + '.' + md5(filePath) + '.zip'))

    await expect(file.historyList('main', '/bad.md')).rejects.toThrow('history zip file error')

    mocks.configGet.mockImplementation((key: string, defaultValue: any) => {
      if (key === 'doc-history.number-limit') return 0
      return defaultValue
    })

    await file.write('main', '/skip-history.md', 'no history')
    await new Promise(resolve => setTimeout(resolve, 20))

    await expect(file.historyList('main', '/skip-history.md')).resolves.toEqual({ list: [], size: 0 })
  })

  test('cleans watch streams on app quit, worker exit, and response errors', async () => {
    const worker = new (require('node:events').EventEmitter)()
    worker.send = vi.fn()
    mocks.fork.mockReturnValue(worker)

    const response = await file.watchFile('main', '/quit.md', { recursive: false } as any)
    const initMessage = worker.send.mock.calls[0][0]
    mocks.app.emit('quit')
    expect(worker.send).toHaveBeenLastCalledWith({ id: initMessage.id, type: 'stop' })
    response.removeAllListeners()
    response.destroy()

    const response2 = await file.watchFile('main', '/exit.md', { recursive: false } as any)
    worker.emit('exit', 9)
    expect(mocks.fork).toHaveBeenCalledTimes(1)
    expect(response2).toBeDefined()

    const response3 = await file.watchFile('main', '/error.md', { recursive: false } as any)
    const thirdInitMessage = worker.send.mock.calls.at(-1)[0]
    response3.emit('error', new Error('stream failed'))
    expect(worker.send).toHaveBeenLastCalledWith({ id: thirdInitMessage.id, type: 'stop' })
  })
})
