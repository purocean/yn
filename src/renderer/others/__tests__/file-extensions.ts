import fileExtensions from '../file-extensions'

describe('file extensions support list', () => {
  test('accepts supported code, markdown, diagram, and config extensions case-insensitively', () => {
    expect(fileExtensions.supported('/notes/TODO.MD')).toBe(true)
    expect(fileExtensions.supported('/src/App.TSX')).toBe(true)
    expect(fileExtensions.supported('/diagrams/flow.puml')).toBe(true)
    expect(fileExtensions.supported('/music/song.lrc')).toBe(true)
  })

  test('falls back to dotfile names when no extension can be derived', () => {
    expect(fileExtensions.supported('.gitignore')).toBe(true)
    expect(fileExtensions.supported('.babelrc')).toBe(true)
    expect(fileExtensions.supported('.unknownrc')).toBe(false)
  })

  test('rejects names without a supported extension', () => {
    expect(fileExtensions.supported('README')).toBe(false)
    expect(fileExtensions.supported('/repo/.gitignore')).toBe(false)
    expect(fileExtensions.supported('/tmp/archive.zip')).toBe(false)
    expect(fileExtensions.supported('/tmp/image.png')).toBe(false)
  })
})
