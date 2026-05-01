# Extended Markdown Syntax Test

This document tests extended markdown syntax features supported by Yank Note.

## Tables

### Basic Table

| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
| Cell 7   | Cell 8   | Cell 9   |

### Alignment

| Left Aligned | Center Aligned | Right Aligned |
|:------------|:-------------:|-------------:|
| Left        | Center        | Right        |
| Data 1      | Data 2        | Data 3       |

### Table with Inline Formatting

| Feature     | Syntax            | Result         |
|------------|-------------------|----------------|
| Bold       | `**bold**`        | **bold**       |
| Italic     | `*italic*`        | *italic*       |
| Code       | `` `code` ``      | `code`         |
| Link       | `[link](url)`     | [link](#)      |
| Strikethrough | `~~text~~`     | ~~text~~       |

## Task Lists

- [ ] Unchecked task
- [x] Checked task
- [X] Also checked task (uppercase X)
- [ ] Another unchecked task
  - [ ] Nested unchecked
  - [x] Nested checked

## Definition Lists

Term 1
: Definition for term 1

Term 2
: Definition A for term 2
: Definition B for term 2

## Fenced Code Blocks with Language

```json
{
  "name": "yank-note",
  "version": "3.0.0",
  "description": "A markdown editor"
}
```

```yaml
name: Yank Note
features:
  - markdown
  - diagrams
  - macros
```

```sql
SELECT * FROM users
WHERE active = true
ORDER BY created_at DESC;
```

```css
.container {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

```bash
#!/bin/bash
echo "Hello, World!"
for i in {1..5}; do
  echo "Count: $i"
done
```

```diff
- old line
+ new line
  unchanged line
```
