import { decrypt, encrypt } from '@fe/utils/crypto'

describe('crypto utilities', () => {
  test('encrypts and decrypts content with a stable password hash', () => {
    const encrypted = encrypt('private note', 'correct horse battery staple')

    expect(encrypted.content).not.toBe('private note')
    expect(encrypted.passwordHash).toMatch(/^[a-f0-9]{32}$/)

    const decrypted = decrypt(encrypted.content, 'correct horse battery staple')
    expect(decrypted).toStrictEqual({
      content: 'private note',
      passwordHash: encrypted.passwordHash,
    })
  })

  test('produces deterministic output for the same content and password', () => {
    expect(encrypt('same text', 'pw')).toStrictEqual(encrypt('same text', 'pw'))
  })

  test('trims encrypted content before decrypting', () => {
    const encrypted = encrypt('trim me', 'pw')

    expect(decrypt(`\n${encrypted.content}\n`, 'pw').content).toBe('trim me')
  })

  test('throws for missing password', () => {
    expect(() => encrypt('content', '')).toThrow('No password.')
    expect(() => decrypt('content', '')).toThrow('No password.')
  })

  test('throws when content cannot be decrypted with the password', () => {
    const encrypted = encrypt('secret', 'right-password')

    expect(() => decrypt(encrypted.content, 'wrong-password')).toThrow('Decrypt failed.')
  })
})
