import CryptoJS from 'crypto-js'

const getCryptKey = () => {
  const password = window.prompt('请输入密码：')

  if (!password) {
    throw new Error('未输入密码')
  }

  return CryptoJS.MD5(password).toString().substr(0, 16)
}

const encrypt = content => {
  let key = getCryptKey()
  let iv = key

  key = CryptoJS.enc.Utf8.parse(key)
  iv = CryptoJS.enc.Utf8.parse(iv)

  const encrypted = CryptoJS.AES.encrypt(content, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })

  return encrypted.toString()
}

const decrypt = content => {
  let key = getCryptKey()
  let iv = key

  key = CryptoJS.enc.Utf8.parse(key)
  iv = CryptoJS.enc.Utf8.parse(iv)

  const decrypted = CryptoJS.AES.decrypt(content.trim(), key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })

  const result = CryptoJS.enc.Utf8.stringify(decrypted)
  if (!result) {
    throw new Error('解密失败！！！')
  }

  return result
}

export default {
  read: (repo, path, call, ecall) => {
    fetch(`/api/file?path=${encodeURIComponent(path)}&repo=${repo}`).then(response => {
      response.json().then(result => {
        if (result.status === 'ok') {
          try {
            let content = result.data.content
            if (path.endsWith('.c.md')) {
              content = decrypt(content)
            }

            call(content, result.data.hash)
          } catch (e) {
            if (ecall) {
              ecall(e)
            } else {
              throw e
            }
          }
        } else {
          alert(result.message)
        }
      })
    })
  },
  write: (repo, path, content, oldHash, call, ecall) => {
    try {
      if (path.endsWith('.c.md')) {
        content = encrypt(content)
      }
    } catch (e) {
      if (ecall) {
        ecall(e)
      } else {
        throw e
      }
    }

    fetch('/api/file', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({repo, path, content, old_hash: oldHash})
    }).then(response => {
      response.json().then(result => {
        if (result.status === 'ok') {
          call(result)
        } else {
          alert(result.message)
        }
      })
    })
  },
  move: (repo, oldPath, newPath, call) => {
    fetch('/api/file', {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({repo, oldPath, newPath})
    }).then(response => {
      response.json().then(result => {
        if (result.status === 'ok') {
          call(result)
        } else {
          alert(result.message)
        }
      })
    })
  },
  tree: (repo, call) => {
    fetch(`/api/tree?repo=${repo}`).then(response => {
      response.json().then(result => {
        if (result.status === 'ok') {
          call(result.data)
        } else {
          alert(result.message)
        }
      })
    })
  },
  delete: (repo, path, call) => {
    fetch(`/api/file?path=${encodeURIComponent(path)}&repo=${repo}`, {method: 'DELETE'}).then(response => {
      response.json().then(result => {
        if (result.status === 'ok') {
          call(result)
        } else {
          alert(result.message)
        }
      })
    })
  },
  upload: (repo, belongPath, file, call, name = null) => {
    belongPath = belongPath.replace(/\\/g, '/')

    const fr = new FileReader()
    fr.readAsBinaryString(file)
    fr.onloadend = () => {
      const filename = name || CryptoJS.MD5(CryptoJS.enc.Latin1.parse(fr.result)).toString().substr(0, 8) +
        file.name.substr(file.name.lastIndexOf('.'))

      const formData = new FormData()
      const path = belongPath.replace(/\/([^/]*)$/, '/FILES/$1/' + filename)
      formData.append('repo', repo)
      formData.append('path', path)
      formData.append('attachment', file)

      fetch('/api/attachment', {
        method: 'POST',
        body: formData
      }).then(response => {
        response.json().then(result => {
          if (result.status === 'ok') {
            call({
              repo: repo,
              path: path,
              relativePath: path.replace(belongPath.substr(0, belongPath.lastIndexOf('/')), '.')
            })
          } else {
            alert(result.message)
          }
        })
      })
    }
  },
  search: (repo, text, call) => {
    fetch(`/api/search?repo=${repo}&search=${encodeURI(text)}`).then(response => {
      response.json().then(result => {
        if (result.status === 'ok') {
          call(result.data)
        } else {
          alert(result.message)
        }
      })
    })
  },
  fetchRepositories: call => {
    fetch('/api/repositories').then(response => {
      response.json().then(result => {
        if (result.status === 'ok') {
          call(result.data)
        } else {
          alert(result.message)
        }
      })
    })
  },
  openInOS (repo, path) {
    fetch(`/api/open?repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}`)
  }
}
