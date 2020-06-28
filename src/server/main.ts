import * as fs from 'fs'
import * as path from 'path'
import * as Koa from 'koa'
import * as bodyParser from 'koa-body'
import * as xStatic from 'koa-static'
import * as mime from 'mime'
import * as request from 'request'
import * as pty from 'node-pty'
import { STATIC_DIR, HOME_DIR, HELP_DIR } from './constant'
import init from './init'
import file from './file'
import dataRepository from './repository'
import run from './run'
import convert from './convert'
import plantuml from './plantuml'
import shell from './shell'
import mark from './mark'

const result = (status: 'ok' | 'error' = 'ok', message = '操作成功', data: any = null) => {
  return { status, message, data }
}

const fileContent = async (ctx: any, next: any) => {
  if (ctx.path === '/api/file') {
    if (ctx.method === 'GET') {
      ctx.body = result('ok', '获取成功', {
        content: file.read(ctx.query.repo, ctx.query.path).toString(),
        hash: file.hash(ctx.query.repo, ctx.query.path)
      })
    } else if (ctx.method === 'POST') {
      const oldHash = ctx.request.body.old_hash

      if (!oldHash) {
        throw new Error('未传递文件hash')
      } else if (oldHash === 'new' && file.exists(ctx.request.body.repo, ctx.request.body.path)) {
        throw new Error('文件已经存在')
      } else if (oldHash !== 'new' && !file.checkHash(ctx.request.body.repo, ctx.request.body.path, oldHash)) {
        throw new Error('磁盘文件已经更新，请刷新文件')
      }

      const hash = file.write(ctx.request.body.repo, ctx.request.body.path, ctx.request.body.content)
      ctx.body = result('ok', '保存成功', hash)
    } else if (ctx.method === 'DELETE') {
      file.rm(ctx.query.repo, ctx.query.path)
      ctx.body = result()
    } else if (ctx.method === 'PATCH') {
      if (file.exists(ctx.request.body.repo, ctx.request.body.newPath)) {
        throw new Error('文件已经存在')
      }

      file.mv(ctx.request.body.repo, ctx.request.body.oldPath, ctx.request.body.newPath)
      ctx.body = result()
    }
  } else if (ctx.path === '/api/tree') {
    ctx.body = result('ok', '获取成功', file.tree(ctx.query.repo))
  } else {
    await next()
  }
}

const attachment = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/attachment')) {
    if (ctx.method === 'POST') {
      const path = ctx.request.body.fields.path
      const repo = ctx.request.body.fields.repo
      file.upload(repo, ctx.request.body.files.attachment, path)
      ctx.body = result('ok', '上传成功', path)
    } else if (ctx.method === 'GET') {
      ctx.type = mime.getType(ctx.query.path)
      ctx.body = file.read(ctx.query.repo, ctx.query.path)
    }
  } else {
    await next()
  }
}

const open = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/open')) {
    if (ctx.method === 'GET') {
      file.open(ctx.query.repo, ctx.query.path)
      ctx.body = result()
    }
  } else {
    await next()
  }
}

const markFile = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/mark')) {
    if (ctx.method === 'GET') {
      ctx.body = result('ok', '获取成功', mark.list())
    } else if (ctx.method === 'POST') {
      mark.add({repo: ctx.query.repo, path: ctx.query.path})
      ctx.body = result()
    } else if (ctx.method === 'DELETE') {
      mark.remove({repo: ctx.query.repo, path: ctx.query.path})
      ctx.body = result()
    }
  } else {
    await next()
  }
}

const searchFile = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/search')) {
    const search = ctx.query.search
    const repo = ctx.query.repo

    ctx.body = result('ok', '操作成功', file.search(repo, search))
  } else {
    await next()
  }
}

const repository = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/repositories')) {
    ctx.body = result('ok', '获取成功', dataRepository.list())
  } else {
    await next()
  }
}

const plantumlGen = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/plantuml/png')) {
    ctx.set('cache-control', 'max-age=86400') // 一天过期
    ctx.type = 'image/png'
    ctx.body = plantuml.generate(ctx.query.data)
  } else {
    await next()
  }
}

const runCode = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/run')) {
    const rst = run.runCode(ctx.request.body.language, ctx.request.body.code)
    ctx.body = result('ok', '运行成功', rst)
  } else {
    await next()
  }
}

const convertFile = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/convert/')) {
    const html = ctx.request.body.html
    const type = ctx.request.body.type

    ctx.type = mime.getType(`file.${type}`)
    ctx.body = await convert(html, type)
  } else {
    await next()
  }
}

const proxy = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/proxy')) {
    const url = ctx.query.url
    const headers = ctx.query.headers ? JSON.parse(ctx.query.headers) : undefined
    ctx.body = request(url, {headers})
  } else {
    await next()
  }
}

const readme = async (ctx: any, next: any) => {
  if (ctx.path.startsWith('/api/help')) {
    if (ctx.query.path) {
      ctx.type = mime.getType(ctx.query.path)
      ctx.body = fs.readFileSync(path.join(HELP_DIR, ctx.query.path.replace('../', '')))
    } else {
      ctx.body = result('ok', '获取成功', {
        content: fs.readFileSync(path.join(HELP_DIR, ctx.query.doc.replace('../', ''))).toString()
      })
    }
  } else {
    await next()
  }
}

const wrapper = async (ctx: any, next: any, fun: any) => {
  try {
    await fun(ctx, next)
  } catch (error) {
    ctx.body = result('error', error.message)
  }
}

const server = (port = 3000) => {
  init()

  const app = new Koa()

  app.use(bodyParser({
    multipart: true,
    formLimit: '20mb',
    jsonLimit: '20mb',
    textLimit: '20mb'
  }))

  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, fileContent))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, attachment))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, open))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, plantumlGen))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, runCode))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, convertFile))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, searchFile))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, repository))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, proxy))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, readme))
  app.use(async (ctx: any, next: any) => await wrapper(ctx, next, markFile))

  app.use(async (ctx: any, next: any) => {
    if (ctx.path.startsWith('/static')) {
      ctx.response.redirect(ctx.path.replace(/^\/static/, ''))
    } else {
      await next()
    }
  })

  app.use(xStatic(STATIC_DIR))
  app.use(async (ctx: any, next: any) => {
    ctx.url = '/index.html'
    await next()
  })
  app.use(xStatic(STATIC_DIR))


  const server = require('http').createServer(app.callback())
  const io = require('socket.io')(server, {path: '/ws'})

  io.on('connection', (socket: any) => {
    const ptyProcess = pty.spawn(shell.getShell(), [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: HOME_DIR,
      env: process.env
    })
    ptyProcess.on('data', (data: any) => socket.emit('output', data))
    ptyProcess.on('exit', () => socket.disconnect())
    socket.on('input', (data: any) => {
      if (data.startsWith(shell.CD_COMMAND_PREFIX)) {
        ptyProcess.write(shell.transformCdCommand(data.toString()))
      } else {
        ptyProcess.write(data)
      }
    })
    socket.on('resize', (size: any) => ptyProcess.resize(size[0], size[1]))
    socket.on('disconnect', () => ptyProcess.kill())
  })

  server.listen(port, 'localhost')

  console.log(`访问地址：http://localhost:${port}`)
}

if (require.main === module) {
  const args = process.argv.slice(2)
  server(Number(args[0]) || 3000)
}

export default server
