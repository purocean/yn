const path = require('path')
const Koa = require('koa')
const bodyParser = require('koa-body')
const static = require('koa-static')
const mime = require('mime')

const file = require('./file')

const result = (status = 'ok', message = '操作成功', data = null) => {
    return { status, message, data }
}

const fileContent = (ctx, next) => {
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
        next()
    }
}

const attachment = (ctx, next) => {
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
        next()
    }
}

const app = new Koa()

app.use(static(
    path.join(__dirname,  '../static')
))

app.use(bodyParser({multipart: true}))
app.use(async (ctx, next) => fileContent(ctx, next))
app.use(async (ctx, next) => attachment(ctx, next))

app.listen(3000)
