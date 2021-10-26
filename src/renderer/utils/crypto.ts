import CryptoJS from 'crypto-js'

function getCryptKey (password: string) {
  if (!password) {
    throw new Error('未输入密码')
  }

  return CryptoJS.MD5(password).toString().substr(0, 16)
}

export function encrypt (content: any, password: string) {
  let key: any = getCryptKey(password)
  let iv: any = key
  const passwordHash = CryptoJS.MD5(key).toString()

  key = CryptoJS.enc.Utf8.parse(key)
  iv = CryptoJS.enc.Utf8.parse(iv)

  const encrypted = CryptoJS.AES.encrypt(content, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })

  return { content: encrypted.toString(), passwordHash }
}

export function decrypt (content: any, password: string) {
  let key: any = getCryptKey(password)
  let iv: any = key
  const passwordHash = CryptoJS.MD5(key).toString()

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

  return { content: result, passwordHash }
}
