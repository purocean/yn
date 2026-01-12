// Set up mocks before importing
import * as wsl from '../wsl'

const mockRelease = jest.fn().mockReturnValue('5.4.0-generic')
const mockReadFileSync = jest.fn().mockReturnValue('Linux version 5.4.0')
const mockExecFileSync = jest.fn()

jest.mock('os', () => ({
  release: () => mockRelease(),
  platform: () => 'linux'
}))

jest.mock('fs', () => ({
  readFileSync: (...args: any[]) => mockReadFileSync(...args)
}))

jest.mock('child_process', () => ({
  execFileSync: (...args: any[]) => mockExecFileSync(...args)
}))

// Set platform before importing wsl
Object.defineProperty(process, 'platform', { value: 'linux', writable: true, configurable: true })

describe('wsl module', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getIsWsl', () => {
    test('should return false on non-linux platform', () => {
      Object.defineProperty(process, 'platform', { value: 'win32', writable: true })

      // Need to call it directly since isWsl is already set at module load
      expect(wsl.getIsWsl()).toBe(false)
    })

    test('should return true when os.release contains microsoft', () => {
      Object.defineProperty(process, 'platform', { value: 'linux', writable: true })
      mockRelease.mockReturnValue('4.4.0-19041-Microsoft')

      expect(wsl.getIsWsl()).toBe(true)
    })

    test('should return true when /proc/version contains microsoft', () => {
      Object.defineProperty(process, 'platform', { value: 'linux', writable: true })
      mockRelease.mockReturnValue('5.4.0-generic')
      mockReadFileSync.mockReturnValue('Linux version 4.4.0-19041-Microsoft')

      expect(wsl.getIsWsl()).toBe(true)
    })

    test('should return false when /proc/version cannot be read', () => {
      Object.defineProperty(process, 'platform', { value: 'linux', writable: true })
      mockRelease.mockReturnValue('5.4.0-generic')
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found')
      })

      expect(wsl.getIsWsl()).toBe(false)
    })

    test('should be case insensitive for microsoft check', () => {
      Object.defineProperty(process, 'platform', { value: 'linux', writable: true })
      mockRelease.mockReturnValue('4.4.0-19041-MICROSOFT')

      expect(wsl.getIsWsl()).toBe(true)
    })
  })

  describe('toWslPath', () => {
    test('should convert Windows path to WSL path', () => {
      mockExecFileSync.mockReturnValue(Buffer.from('/mnt/c/Users/test\n'))

      const result = wsl.toWslPath('C:\\Users\\test')

      expect(result).toBe('/mnt/c/Users/test')
      expect(mockExecFileSync).toHaveBeenCalledWith('wsl.exe', ['--', 'wslpath', '-u', 'C:/Users/test'])
    })

    test('should handle backslashes in path', () => {
      mockExecFileSync.mockReturnValue(Buffer.from('/mnt/c/path/to/file\n'))

      wsl.toWslPath('C:\\path\\to\\file')

      expect(mockExecFileSync).toHaveBeenCalledWith('wsl.exe', ['--', 'wslpath', '-u', 'C:/path/to/file'])
    })

    test('should trim whitespace from result', () => {
      mockExecFileSync.mockReturnValue(Buffer.from('  /mnt/c/test  \n'))

      const result = wsl.toWslPath('C:\\test')

      expect(result).toBe('/mnt/c/test')
    })
  })

  describe('toWinPath', () => {
    test('should convert WSL path to Windows path', () => {
      mockExecFileSync.mockReturnValue(Buffer.from('C:\\Users\\test\n'))

      const result = wsl.toWinPath('/mnt/c/Users/test')

      expect(result).toBe('C:\\Users\\test')
      expect(mockExecFileSync).toHaveBeenCalledWith('wsl.exe', ['--', 'wslpath', '-w', '/mnt/c/Users/test'])
    })

    test('should trim whitespace from result', () => {
      mockExecFileSync.mockReturnValue(Buffer.from('  C:\\test  \n'))

      const result = wsl.toWinPath('/mnt/c/test')

      expect(result).toBe('C:\\test')
    })
  })

  describe('getWinTempPath', () => {
    test('should get Windows temp path', () => {
      mockExecFileSync.mockReturnValue(Buffer.from('C:\\Users\\test\\AppData\\Local\\Temp\n'))

      const result = wsl.getWinTempPath()

      expect(result).toBe('C:\\Users\\test\\AppData\\Local\\Temp')
      expect(mockExecFileSync).toHaveBeenCalledWith('cmd.exe', ['/c', 'echo %temp%'])
    })

    test('should trim whitespace from result', () => {
      mockExecFileSync.mockReturnValue(Buffer.from('  C:\\Temp  \n'))

      const result = wsl.getWinTempPath()

      expect(result).toBe('C:\\Temp')
    })
  })

  describe('getWinHomePath', () => {
    test('should get Windows home path', () => {
      mockExecFileSync.mockReturnValue(Buffer.from('C:\\Users\\testuser\n'))

      const result = wsl.getWinHomePath()

      expect(result).toBe('C:\\Users\\testuser')
      expect(mockExecFileSync).toHaveBeenCalledWith('cmd.exe', ['/c', 'echo %HOMEDRIVE%%HOMEPATH%'])
    })

    test('should trim whitespace from result', () => {
      mockExecFileSync.mockReturnValue(Buffer.from('  C:\\Users\\test  \n'))

      const result = wsl.getWinHomePath()

      expect(result).toBe('C:\\Users\\test')
    })
  })
})
