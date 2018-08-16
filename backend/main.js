const path = require('path')
const Koa = require('koa')
const bodyParser = require('koa-body')
const static = require('koa-static')
const mime = require('mime')
const plantuml = require('node-plantuml')

const file = require('./file')
const dataRepository = require('./repository')
const run = require('./run')
const convert = require('./convert')
const request = require('request')

const result = (status = 'ok', message = '操作成功', data = null) => {
    return { status, message, data }
}

const fileContent = async (ctx, next) => {
    if (ctx.path === '/api/file') {
        if (ctx.method === 'GET') {
            ctx.body = result('ok', '获取成功', file.read(ctx.query.repo, ctx.query.path).toString())
        } else if (ctx.method === 'POST') {
            if (ctx.request.body.is_new && file.exists(ctx.request.body.repo, ctx.request.body.path)) {
                throw new Error('文件已经存在')
            }

            file.write(ctx.request.body.repo, ctx.request.body.path, ctx.request.body.content)
            ctx.body = result()
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

const attachment = async (ctx, next) => {
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

const open = async (ctx, next) => {
    if (ctx.path.startsWith('/api/open')) {
        if (ctx.method === 'GET') {
            file.open(ctx.query.repo, ctx.query.path)
            ctx.body = result()
        }
    } else {
        await next()
    }
}

const searchFile = async (ctx, next) => {
    if (ctx.path.startsWith('/api/search')) {
        const search = ctx.query.search
        const repo = ctx.query.repo

        ctx.body = result('ok', '操作成功', file.search(repo, search))
    } else {
        await next()
    }
}

const repository = async (ctx, next) => {
    if (ctx.path.startsWith('/api/repositories')) {
        ctx.body = result('ok', '获取成功', dataRepository.list())
    } else {
        await next()
    }
}

const plantumlGen = async (ctx, next) => {
    if (ctx.path.startsWith('/api/plantuml/svg')) {
        const gen = plantuml.generate(ctx.query.data, {format: 'svg'});

        ctx.type = 'image/svg+xml'
        ctx.body = gen.out
    } else if (ctx.path.startsWith('/api/plantuml/png')) {
        const gen = plantuml.generate(ctx.query.data, {format: 'png'});

        ctx.type = 'image/png'
        ctx.body = gen.out
    } else {
        await next()
    }
}

const runCode = async (ctx, next) => {
    if (ctx.path.startsWith('/api/run')) {
        const rst = run.runCode(ctx.request.body.language, ctx.request.body.code)
        ctx.body = result('ok', '运行成功', rst)
    } else {
        await next()
    }
}

const convertFile = async (ctx, next) => {
    if (ctx.path.startsWith('/api/convert/')) {
        const html = ctx.request.body.html
        const type = ctx.request.body.type

        ctx.type = mime.getType(`file.${type}`)
        ctx.body = await convert(html, type)
    } else {
        await next()
    }
}

const proxy = async (ctx, next) => {
    if (ctx.path.startsWith('/api/proxy')) {
        const url = ctx.query.url
        ctx.body = request(url)
    } else {
        await next()
    }
}

const app = new Koa()

app.use(static(
    path.join(__dirname,  '../static')
))

app.use(bodyParser({
    multipart: true,
    formLimit: '20mb',
    jsonLimit: '20mb',
    textLimit: '20mb'
}))

const wrapper = async (ctx, next, fun) => {
    try {
        await fun(ctx, next)
    } catch (error) {
        ctx.body = result('error', error.message)
    }
}

app.use(async (ctx, next) => await wrapper(ctx, next, fileContent))
app.use(async (ctx, next) => await wrapper(ctx, next, attachment))
app.use(async (ctx, next) => await wrapper(ctx, next, open))
app.use(async (ctx, next) => await wrapper(ctx, next, plantumlGen))
app.use(async (ctx, next) => await wrapper(ctx, next, runCode))
app.use(async (ctx, next) => await wrapper(ctx, next, convertFile))
app.use(async (ctx, next) => await wrapper(ctx, next, searchFile))
app.use(async (ctx, next) => await wrapper(ctx, next, repository))
app.use(async (ctx, next) => await wrapper(ctx, next, proxy))

const port = 3000
app.listen(port)

console.log(`访问地址：http://localhost:${port}`)
