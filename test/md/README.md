# Yank Note Markdown Feature Tests

This directory contains test documents for all markdown features and extensions supported by Yank Note.

## Core Markdown Syntax

| Document | Description |
|----------|-------------|
| [basic-syntax.md](./basic-syntax.md) | Headings, paragraphs, emphasis, links, images, blockquotes, lists, horizontal rules, inline code, code blocks, escape characters, line breaks |
| [extended-syntax.md](./extended-syntax.md) | Tables, task lists, definition lists, fenced code blocks with languages |

## Yank Note Built-in Features

| Document | Description |
|----------|-------------|
| [front-matter.md](./front-matter.md) | YAML front matter configuration: headingNumber, enableMacro, define, tags, mdOptions, render settings |
| [toc.md](./toc.md) | Table of Contents generation with `[toc]{type, level}` syntax |
| [macro.md](./macro.md) | Macro replacement with `[= expression =]` syntax, `$doc`, `$seq`, `$export`, `$include` |
| [wiki-links.md](./wiki-links.md) | Wiki links `[[file#anchor\|text]]`, image wiki links `![[image]]` |
| [hashtags.md](./hashtags.md) | Hashtag/tag syntax `#TagName` |
| [footnotes.md](./footnotes.md) | Footnotes with `[^id]` syntax |
| [heading-number.md](./heading-number.md) | Automatic heading numbering via `headingNumber: true` |
| [list-collapsible.md](./list-collapsible.md) | Collapsible nested lists |

## Markdown-it Plugin Features

| Document | Description |
|----------|-------------|
| [superscript-subscript.md](./superscript-subscript.md) | Superscript `^text^` and subscript `~text~` |
| [mark.md](./mark.md) | Text highlighting with `==text==` |
| [abbreviations.md](./abbreviations.md) | Abbreviation definitions `*[ABBR]: Full Text` |
| [emoji.md](./emoji.md) | Emoji shortcodes `:smile:` and emoticons `:)` |
| [attributes.md](./attributes.md) | Element attributes `{.class style="..." id="..."}` |
| [multimd-table.md](./multimd-table.md) | Advanced tables: multiline cells, row/column span, headerless, multi-body |
| [github-alerts.md](./github-alerts.md) | GitHub-style alerts: `[!NOTE]`, `[!TIP]`, `[!WARNING]`, `[!IMPORTANT]`, `[!CAUTION]` |
| [containers.md](./containers.md) | Container blocks: tip, warning, danger, details, code-group, group, row/col, section, div |

## Code Features

| Document | Description |
|----------|-------------|
| [code-features.md](./code-features.md) | Syntax highlighting, code execution (`--run--`), copy button, line numbers, wrapping |
| [code-line-highlighting.md](./code-line-highlighting.md) | Line highlighting with `{.h:lines}` syntax (extension) |

## Math & Science

| Document | Description |
|----------|-------------|
| [math-katex.md](./math-katex.md) | KaTeX math: inline `$...$`, block `$$...$$`, matrices, aligned equations, mhchem chemistry |

## Image & Media

| Document | Description |
|----------|-------------|
| [image-enhancements.md](./image-enhancements.md) | Image sizing `=WxH`, inline display `?.inline`, white background `?.bgw` |
| [html.md](./html.md) | Raw HTML support: tags, styled containers, details/summary, mixed HTML/markdown |

## Diagrams & Visualization

| Document | Description |
|----------|-------------|
| [mermaid.md](./mermaid.md) | Mermaid diagrams: flowchart, sequence, class, state, gantt, pie, ER, journey (extension) |
| [plantuml.md](./plantuml.md) | PlantUML diagrams: sequence, use case, class, activity, component, state |
| [mindmap.md](./mindmap.md) | Mind map with `{.mindmap}` on list items (kityminder-core) |
| [echarts.md](./echarts.md) | ECharts: line, bar, pie, scatter, radar charts (extension) |
| [drawio.md](./drawio.md) | Draw.io diagrams: link and inline XML syntax (extension) |
| [kroki.md](./kroki.md) | Kroki diagrams: WaveDrom, GraphViz, Ditaa, BlockDiag, SeqDiag, ERD, SVGBob, C4 (extension) |
| [markmap.md](./markmap.md) | Markmap interactive mind maps with `{.markmap}` or code blocks (extension) |

## Interactive & Presentation

| Document | Description |
|----------|-------------|
| [applet.md](./applet.md) | HTML applets with `<!-- --applet-- -->` marker |
| [reveal-js.md](./reveal-js.md) | Reveal.js presentations with `::: section` containers (extension) |
| [luckysheet.md](./luckysheet.md) | Luckysheet spreadsheet embedding (extension) |

## Extension Requirements

Some features require optional extensions from [@yank-note/extension](https://github.com/purocean/yank-note-extension):

| Extension | Features |
|-----------|----------|
| `@yank-note/extension-mermaid` | Mermaid diagrams |
| `@yank-note/extension-echarts` | ECharts visualizations |
| `@yank-note/extension-drawio` | Draw.io diagrams |
| `@yank-note/extension-kroki` | Kroki multi-format diagrams |
| `@yank-note/extension-markmap` | Markmap mind maps |
| `@yank-note/extension-reveal-js` | Reveal.js presentations |
| `@yank-note/extension-code-line-highlighting` | Code line highlighting |
| `@yank-note/extension-repl` | Vue REPL applets |
| `@yank-note/extension-cloze` | Cloze/flashcard mode |
