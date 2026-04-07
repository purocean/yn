# Footnotes Test

This document tests footnote syntax supported by Yank Note.

## Basic Footnotes

This is a sentence with a footnote[^1].

Another sentence with a different footnote[^2].

[^1]: This is the first footnote content.
[^2]: This is the second footnote content.

## Named Footnotes

Yank Note supports named footnotes[^note1] as well as numeric ones[^note2].

[^note1]: Named footnotes use descriptive identifiers.
[^note2]: They work the same way as numeric footnotes.

## Multi-line Footnotes

This references a longer footnote[^long].

[^long]: This is a longer footnote that spans
    multiple lines. Each continuation line must be
    indented with at least 4 spaces or 1 tab.

    It can even contain multiple paragraphs.

## Footnotes with Formatting

Check this footnote with formatting[^formatted].

[^formatted]: This footnote contains **bold**, *italic*, and `code` formatting.

## Multiple References

The same footnote can be referenced multiple times in the text[^shared]. See the previous reference[^shared] again.

[^shared]: This footnote is referenced multiple times in the document.

## Footnotes in Lists

- Item with footnote[^list1]
- Another item[^list2]

[^list1]: Footnote from a list item.
[^list2]: Another footnote from a list item.

## Inline Footnote

This sentence has an inline footnote^[This is an inline footnote that doesn't need a separate definition.].
