const Koa = require('koa')

const file = require('./file')
const bodyParser = require('koa-bodyparser')

const result = (status = 'ok', message = '操作成功', data = null) => {
    return { status, message, data }
}

const fileContent = ctx => {
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
    }
}

const app = new Koa()

app.use(bodyParser())
app.use(async ctx => fileContent(ctx))

app.listen(3000)
