---
headingNumber: true
enableMacro: true
define:
  --APP_NAME--: Yank Note
  --APP_VERSION--: 3.x
tags:
  - test
  - front-matter
  - yank-note
mdOptions:
  html: true
  breaks: true
  linkify: true
  typographer: false
katex: {}
render:
  md-html: true
  md-breaks: true
  md-linkify: true
  md-typographer: false
  md-sup: true
  md-sub: true
  md-wiki-links: true
  md-hash-tags: true
  multimd-multiline: true
  multimd-rowspan: true
  multimd-headerless: false
  multimd-multibody: false
  list-collapsible: true
  wrap-code: false
---

# Front Matter Test

This document tests the YAML front matter configuration supported by Yank Note.

## Front Matter Options Explained

The front matter above configures the following:

### `headingNumber`

Enables automatic heading numbering (CSS counter based). Headings h2-h6 will be numbered.

### `enableMacro`

Enables macro replacement with `[= expression =]` syntax.

### `define`

Defines text replacement variables:
- `--APP_NAME--` will be replaced with "Yank Note"
- `--APP_VERSION--` will be replaced with "3.x"

Example: --APP_NAME-- version --APP_VERSION--

### `tags`

Document tags for organization and search.

### `mdOptions`

Markdown-it configuration options:
- `html: true` — Allow raw HTML tags
- `breaks: true` — Convert newlines to `<br>` tags
- `linkify: true` — Auto-detect and link URLs
- `typographer: false` — Disable smart quotes and typographic replacements

### `katex`

KaTeX rendering options (empty object uses defaults).

### `render`

Fine-grained control over rendering features:
- `md-html` — HTML rendering
- `md-breaks` — Line break handling
- `md-linkify` — URL auto-linking
- `md-typographer` — Typography processing
- `md-sup` — Superscript support
- `md-sub` — Subscript support
- `md-wiki-links` — Wiki-style linking
- `md-hash-tags` — Hashtag support
- `multimd-multiline` — Multi-line table cells
- `multimd-rowspan` — Table row spanning
- `list-collapsible` — Collapsible list items
- `wrap-code` — Code block word wrapping

## Verify Front Matter Effects

### Heading Numbering

All headings in this document should be automatically numbered.

#### Sub-heading Example

##### Deeper Heading

### Variable Replacement

The app name is --APP_NAME-- and the version is --APP_VERSION--.
