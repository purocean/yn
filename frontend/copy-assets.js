const glob = require('glob')
const path = require('path')
const fs = require('fs-extra')

const basePath = path.join(__dirname, '..')
try {
  fs.unlinkSync(path.join(basePath, 'app/dist/static'))
} catch (error) {
  // console.log(error)
}
fs.copySync(path.join(__dirname, 'dist'), path.join(basePath, 'app/dist/static'))
fs.mkdirpSync(path.join(basePath, 'app/dist/static/help'))

glob(path.join(basePath, './*.*'), (err, files) => {
  if (!err) {
    files.forEach(p => {
      // console.log(p, path.join(basePath, 'app/dist/static/help', path.basename(p)))
      fs.copyFileSync(p, path.join(basePath, 'app/dist/static/help', path.basename(p)))
    })
  }
})
