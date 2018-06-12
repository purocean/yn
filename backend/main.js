const path = require('path')
const Koa = require('koa')
const bodyParser = require('koa-body')
const static = require('koa-static')
const mime = require('mime')
const plantuml = require('node-plantuml')

const file = require('./file')
const run = require('./run')
const convert = require('./convert')

const result = (status = 'ok', message = '操作成功', data = null) => {
    return { status, message, data }
}

const fileContent = async (ctx, next) => {
    if (ctx.path === '/api/file') {
        if (ctx.method === 'GET') {
            ctx.body = result('ok', '获取成功', file.read(ctx.query.path).toString())
        } else if (ctx.method === 'POST') {
            file.write(ctx.request.body.path, ctx.request.body.content)
            ctx.body = result()
        } else if (ctx.method === 'DELETE') {
            file.rm(ctx.query.path)
            ctx.body = result()
        } else if (ctx.method === 'PATCH') {
            file.mv(ctx.request.body.oldPath, ctx.request.body.newPath)
            ctx.body = result()
        }
    } else if (ctx.path === '/api/tree') {
        ctx.body = result('ok', '获取成功', file.tree())
    } else {
        await next()
    }
}

const attachment = async (ctx, next) => {
    if (ctx.path.startsWith('/api/attachment')) {
        if (ctx.method === 'POST') {
            const path = ctx.request.body.fields.path
            file.upload(ctx.request.body.files.attachment, path)
            ctx.body = result('ok', '上传成功', path)
        } else if (ctx.method === 'GET') {
            ctx.type = mime.getType(ctx.query.path)
            ctx.body = file.read(ctx.query.path)
        }
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
app.use(async (ctx, next) => await fileContent(ctx, next))
app.use(async (ctx, next) => await attachment(ctx, next))
app.use(async (ctx, next) => await plantumlGen(ctx, next))
app.use(async (ctx, next) => await runCode(ctx, next))
app.use(async (ctx, next) => await convertFile(ctx, next))

const port = 3000
app.listen(port)

console.log(`访问地址：http://localhost:${port}`)
