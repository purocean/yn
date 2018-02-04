import CryptoJS from 'crypto-js'

const getCryptKey = () => {
  const password = window.prompt('请输入密码：')

  if (!password) {
    return null
  }

  return CryptoJS.MD5(password).toString().substr(0, 16)
}

const encrypt = content => {
  let key = getCryptKey()
  let iv = key

  if (!key) {
    return '请输入密码！！！'
  }

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

  if (!key) {
    return '请输入密码！！！'
  }

  key = CryptoJS.enc.Utf8.parse(key)
  iv = CryptoJS.enc.Utf8.parse(iv)

  const decrypted = CryptoJS.AES.decrypt(content.trim(), key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })

  const result = CryptoJS.enc.Utf8.stringify(decrypted)
  if (!result) {
    return '解密失败！！！'
  }

  return result
}

export default {
  read: (path, call) => {
    fetch(`/api/file?path=${encodeURIComponent(path)}`).then(response => {
      response.json().then(result => {
        if (result.status === 'ok') {
          let content = result.data
          if (path.endsWith('.c.md')) {
            content = decrypt(content)
          }

          call(content)
        }
      })
    })
  },
  write: (path, content, call) => {
    if (path.endsWith('.c.md')) {
      content = encrypt(content)
    }

    fetch('/api/file', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({path, content})
    }).then(response => {
      response.json().then(result => {
        if (result.status === 'ok') {
          call(result)
        }
      })
    })
  },
  move: (oldPath, newPath, call) => {
    fetch('/api/file', {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({oldPath, newPath})
    }).then(response => {
      response.json().then(result => {
        if (result.status === 'ok') {
          call(result)
        }
      })
    })
  },
  tree: call => {
    fetch('/api/tree').then(response => {
      response.json().then(result => {
        if (result.status === 'ok') {
          call(result.data)
        }
      })
    })
  },
  delete: (path, call) => {
    fetch(`/api/file?path=${encodeURIComponent(path)}`, {method: 'DELETE'}).then(response => {
      response.json().then(result => {
        if (result.status === 'ok') {
          call(result)
        }
      })
    })
  }
}
