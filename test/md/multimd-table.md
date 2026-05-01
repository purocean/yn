# Multi-Markdown Table Test

This document tests advanced table features provided by markdown-it-multimd-table.

## Basic Table

| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| A1       | A2       | A3       |
| B1       | B2       | B3       |

## Multiline Cells

Enable with `multimd-multiline: true` in render settings.

| Feature | Description |
|---------|-------------|
| Multiline | This cell spans \
multiple lines using \
the backslash continuation |
| Single | This is a single line cell |

## Column Span

| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| A1       | A2       | A3       |
| Merged Cell ||        | B3       |
| C1       | Merged Cell ||

## Row Span

Enable with `multimd-rowspan: true` in render settings.

| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| A1       | A2       | A3       |
| ^^       | B2       | B3       |
| C1       | C2       | ^^       |

The `^^` indicates the cell above spans into this row.

## Headerless Table

Enable with `multimd-headerless: true` in render settings.

|          |          |          |
|----------|----------|----------|
| A1       | A2       | A3       |
| B1       | B2       | B3       |

## Multi-body Table

Enable with `multimd-multibody: true` in render settings.

| Header 1 | Header 2 |
|----------|----------|
| Body 1 A | Body 1 B |
| Body 1 C | Body 1 D |
|----------|----------|
| Body 2 A | Body 2 B |
| Body 2 C | Body 2 D |

## Complex Table

| Project | Status | Priority | Notes |
|---------|--------|----------|-------|
| Feature A | ✅ Done | High | Merged Cell ||
| Feature B | 🔄 In Progress || Medium | Needs review |
| Feature C | ❌ Blocked | Low | Waiting for \
dependency resolution |

## Table with Alignment and Formatting

| Left | Center | Right |
|:-----|:------:|------:|
| **Bold** | *Italic* | `Code` |
| [Link](#) | ~~Strike~~ | ==Mark== |
| Normal | $E=mc^2$ | :smile: |

## Notes

- `multimd-multiline`: Enable multi-line cells using `\` continuation
- `multimd-rowspan`: Enable row spanning using `^^` marker
- `multimd-headerless`: Allow tables without header rows
- `multimd-multibody`: Allow multiple table bodies separated by horizontal rules
- Column spanning uses empty cells (`||`)
