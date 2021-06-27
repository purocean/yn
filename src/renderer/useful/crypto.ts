import CryptoJS from 'crypto-js'

const getCryptKey = (password: string) => {
  if (!password) {
    throw new Error('未输入密码')
  }

  return CryptoJS.MD5(password).toString().substr(0, 16)
}

const encrypt = (content: any, password: string) => {
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

const decrypt = (content: any, password: string) => {
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

const md5 = (content: any) => {
  return CryptoJS.MD5(content).toString()
}

const binMd5 = (data: any) => {
  return md5(CryptoJS.enc.Latin1.parse(data))
}

export const strToBase64 = (str: string) => {
  return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(str))
}

export default {
  encrypt,
  decrypt,
  md5,
  binMd5,
  strToBase64,
}
