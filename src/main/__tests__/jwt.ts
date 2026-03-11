// Mock config before importing
import * as jwt from '../jwt'

const mockGetImpl = jest.fn()

jest.mock('../config', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mockGetImpl(...args),
    set: jest.fn(),
    getAll: jest.fn(),
    setAll: jest.fn()
  }
}))

describe('jwt module', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock a fixed JWT secret for consistent tests
    mockGetImpl.mockReturnValue('test-secret-key-1234567890abcdef')
  })

  describe('getToken', () => {
    test('should generate a token for admin role', () => {
      const token = jwt.getToken({ role: 'admin' }, '1h')

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    test('should generate a token for guest role', () => {
      const token = jwt.getToken({ role: 'guest' }, '1h')

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    test('should generate different tokens for different roles', () => {
      const adminToken = jwt.getToken({ role: 'admin' }, '1h')
      const guestToken = jwt.getToken({ role: 'guest' }, '1h')

      expect(adminToken).not.toBe(guestToken)
    })

    test('should generate token with expiration', () => {
      const token = jwt.getToken({ role: 'admin' }, '1h')

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
    })

    test('should generate token with numeric expiration', () => {
      const token = jwt.getToken({ role: 'admin' }, 3600)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
    })

    test('should use JWT secret from config', () => {
      jwt.getToken({ role: 'admin' }, '1h')

      expect(mockGetImpl).toHaveBeenCalledWith('server.jwt-secret', expect.any(String))
    })
  })

  describe('verify', () => {
    test('should verify a valid admin token', () => {
      const token = jwt.getToken({ role: 'admin' }, '1h')
      const payload = jwt.verify(token)

      expect(payload.role).toBe('admin')
    })

    test('should verify a valid guest token', () => {
      const token = jwt.getToken({ role: 'guest' }, '1h')
      const payload = jwt.verify(token)

      expect(payload.role).toBe('guest')
    })

    test('should throw error for invalid token', () => {
      expect(() => {
        jwt.verify('invalid-token-string')
      }).toThrow()
    })

    test('should throw error for token with wrong secret', () => {
      const token = jwt.getToken({ role: 'admin' }, '1h')

      // Change the secret
      mockGetImpl.mockReturnValue('different-secret-key')

      expect(() => {
        jwt.verify(token)
      }).toThrow()
    })

    test('should return correct role from verified token', () => {
      const adminToken = jwt.getToken({ role: 'admin' }, '1h')
      const guestToken = jwt.getToken({ role: 'guest' }, '1h')

      expect(jwt.verify(adminToken).role).toBe('admin')
      expect(jwt.verify(guestToken).role).toBe('guest')
    })
  })

  describe('token lifecycle', () => {
    test('should create and verify token successfully', () => {
      const payload = { role: 'admin' as const }
      const token = jwt.getToken(payload, '1h')
      const verified = jwt.verify(token)

      expect(verified.role).toBe(payload.role)
    })

    test('should handle tokens with expiration', () => {
      const token = jwt.getToken({ role: 'admin' }, '10s')
      const verified = jwt.verify(token)

      expect(verified.role).toBe('admin')
    })
  })
})
