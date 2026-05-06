# Markmap Test

This document tests Markmap (interactive mind map) rendering in Yank Note.

> **Note**: Requires the `@yank-note/extension-markmap` extension.

## Using `{.markmap}` Class on List

+ Yank Note{.markmap}
    + **Editing**
        + Markdown syntax
        + Code highlighting
        + Auto-completion
    + **Preview**
        + Real-time rendering
        + Diagrams
        + Math formulas
    + **Organization**
        + Wiki links
        + Tags
        + TOC
    + **Extensions**
        + Mermaid
        + ECharts
        + Draw.io

## Software Architecture Markmap

+ Application Architecture{.markmap}
    + **Frontend**
        + Vue.js
        + TypeScript
        + CSS/SCSS
    + **Backend**
        + Electron
        + Node.js
        + File System API
    + **Plugins**
        + markdown-it
        + KaTeX
        + PrismJS
    + **Build**
        + Vite
        + electron-builder

## Using Markmap Code Block

```markmap
# Learning Path

## Frontend
### HTML
### CSS
### JavaScript
#### React
#### Vue
#### Angular

## Backend
### Node.js
### Python
### Go

## DevOps
### Docker
### Kubernetes
### CI/CD
```

## Full Document Markmap

To render the entire document as a markmap, add this to the front matter:

```yaml
---
defaultPreviewer: 'Markmap'
---
```

## Notes

- Add `{.markmap}` class to a list root item for inline markmap
- Use `markmap` code block for standalone markmaps
- Set `defaultPreviewer: 'Markmap'` to render entire document as markmap
- Markmaps are interactive: zoom, pan, expand/collapse nodes
