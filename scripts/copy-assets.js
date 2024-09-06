const path = require('path')
const fs = require('fs-extra')

// copy main
const dirs = [ 'assets', 'resources' ]
dirs.forEach(dir => {
  const origin = path.join(__dirname, '../src/main', dir)
  const dist = path.join(__dirname, '../dist/main', dir)
  if(fs.existsSync(dist)) {
    fs.removeSync(dist)
  }
  fs.copySync(origin, dist)
})

// copy README.md
let readme = path.join(__dirname, '..', 'README.md')
let md = fs.readFileSync(readme).toString('UTF-8').replace(/\]\(\.\/help\//ig, '](./').replace(/src="\.\/help\//ig, 'src="./')
fs.writeFileSync(path.join(__dirname, '..', './help/README.md'), md)

// copy README_ZH-CN.md
readme = path.join(__dirname, '..', 'README_ZH-CN.md')
md = fs.readFileSync(readme).toString('UTF-8').replace(/\]\(\.\/help\//ig, '](./').replace(/src="\.\/help\//ig, 'src="./')
fs.writeFileSync(path.join(__dirname, '..', './help/README_ZH-CN.md'), md)

// copy README_RU.md
readme = path.join(__dirname, '..', 'README_RU.md')
md = fs.readFileSync(readme).toString('UTF-8').replace(/\]\(\.\/help\//ig, '](./').replace(/src="\.\/help\//ig, 'src="./')
fs.writeFileSync(path.join(__dirname, '..', './help/README_RU.md'), md)
