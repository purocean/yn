const cp = require('child_process');

exports.toWslPath = path => {
    return cp.execFileSync('wslpath', ['-u', `${path.replace(/\\/g, '/')}`]).toString().trim()
}

exports.toWinPath = path => {
    return cp.execFileSync('wslpath', ['-w', path]).toString().trim()
}
