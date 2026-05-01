# Basic Markdown Syntax Test

This document tests all basic markdown syntax features supported by Yank Note.

## Headings

# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

## Paragraphs

This is a paragraph. It contains multiple sentences.
This sentence is on a new line but in the same paragraph (with `breaks: true`, it renders as a line break).

This is another paragraph separated by a blank line.

## Emphasis

*italic text* and _also italic_

**bold text** and __also bold__

***bold and italic*** and ___also bold and italic___

~~strikethrough text~~

## Links

[Inline link](https://example.com)

[Link with title](https://example.com "Example Site")

[Reference link][ref1]

[ref1]: https://example.com "Reference Link"

Auto-linked URL: https://example.com (with `linkify: true`)

## Images

![Alt text](https://via.placeholder.com/150 "Image Title")

![Reference image][img1]

[img1]: https://via.placeholder.com/100 "Reference Image"

## Blockquotes

> This is a blockquote.
>
> It can span multiple paragraphs.

> Nested blockquotes:
>
> > This is a nested blockquote.
> >
> > > And even deeper.

## Lists

### Unordered List

- Item 1
- Item 2
  - Sub-item 2.1
  - Sub-item 2.2
    - Sub-sub-item 2.2.1
- Item 3

* Alternative bullet style
* Item B

+ Another bullet style
+ Item C

### Ordered List

1. First item
2. Second item
   1. Sub-item 2.1
   2. Sub-item 2.2
3. Third item

### Mixed List

1. Ordered item
   - Unordered sub-item
   - Another sub-item
2. Another ordered item

## Horizontal Rules

---

***

___

## Inline Code

Use `console.log()` to print output.

Inline code with backticks: ``code with ` inside``.

## Code Blocks

Indented code block:

    function hello() {
        console.log("Hello, World!");
    }

Fenced code block:

```javascript
function greet(name) {
    return `Hello, ${name}!`;
}
```

```python
def greet(name):
    return f"Hello, {name}!"
```

```
Plain code block without language
```

## Escape Characters

\*Not italic\*

\# Not a heading

\[Not a link\]

\`Not inline code\`

## Line Breaks

First line with two trailing spaces  
Second line (hard break)

First line with backslash\
Second line (hard break)
