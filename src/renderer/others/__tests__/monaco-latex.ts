import registerLatex from '../monaco-latex'

test('registers latex language and monarch tokenizer', () => {
  const monaco = {
    languages: {
      register: vi.fn(),
      setMonarchTokensProvider: vi.fn(),
    },
  }

  registerLatex(monaco)

  expect(monaco.languages.register).toHaveBeenCalledWith({ id: 'latex' })
  expect(monaco.languages.setMonarchTokensProvider).toHaveBeenCalledWith('latex', expect.objectContaining({
    displayName: 'Latex',
    name: 'latex',
    mimeTypes: ['text/latex', 'text/tex'],
    fileExtensions: ['tex', 'sty', 'cls'],
    lineComment: '% ',
    builtin: expect.arrayContaining(['documentclass', 'usepackage']),
    tokenizer: expect.objectContaining({
      root: expect.any(Array),
      whitespace: expect.any(Array),
    }),
  }))
})
