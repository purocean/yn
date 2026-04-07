---
defaultPreviewer: 'Reveal.js'
revealJsOpts:
  theme: moon
  progress: true
  controls: true
  slideNumber: true
---

# Reveal.js Presentation Test

This document tests Reveal.js presentation rendering in Yank Note.

> **Note**: Requires the `@yank-note/extension-reveal-js` extension.

::: section

## Slide 1: Introduction

Welcome to the Yank Note Presentation!

- Feature-rich markdown editor
- Extensible with plugins
- Cross-platform support

:::

::: section

## Slide 2: Markdown Support

Yank Note supports rich markdown features:

| Feature | Status |
|---------|--------|
| Headings | ✅ |
| Tables | ✅ |
| Code | ✅ |
| Math | ✅ |
| Diagrams | ✅ |

:::

::: section

## Slide 3: Code Highlighting

```javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
```

:::

::: section

## Slide 4: Math Formulas

The Euler's identity:

$$e^{i\pi} + 1 = 0$$

The quadratic formula:

$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

:::

::: section

## Slide 5: Thank You!

:tada: Thanks for watching!

- GitHub: [purocean/yn](https://github.com/purocean/yn)
- Extensions: [yank-note-extension](https://github.com/purocean/yank-note-extension)

:::

---

## Configuration Notes

To create a Reveal.js presentation:

1. Set `defaultPreviewer: 'Reveal.js'` in front matter
2. Configure options via `revealJsOpts`
3. Use `::: section` containers to separate slides
4. Available themes: `moon`, `black`, `white`, `league`, `beige`, `sky`, `night`, `serif`, `simple`, `solarized`
