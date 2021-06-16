const path = require('path')
const fs = require('fs-extra')

const dirs = [ 'assets', 'resources' ]

dirs.forEach(dir => {
  const origin = path.join(__dirname, 'src/' + dir)
  const dist = path.join(__dirname, 'dist/' + dir)
  if(fs.existsSync(dist)) {
    fs.removeSync(dist)
  }
  fs.copySync(origin, dist)
})

// 复制 markdown，处理相对路径
const readme = path.join(__dirname, 'README.md')
const md = fs.readFileSync(readme).toString('UTF-8').replace(/\]\(\.\/help\//ig, '](./').replace(/src="\.\/help\//ig, 'src="./')
fs.writeFileSync(path.join(__dirname, './help/README.md'), md)
