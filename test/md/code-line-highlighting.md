# Code Line Highlighting Test

This document tests code line highlighting in Yank Note.

> **Note**: Requires the `@yank-note/extension-code-line-highlighting` extension.

## Highlight Specific Lines

```js {.h:1,4-6,11}
// Line 1 - highlighted
const express = require('express');
const app = express();
// Line 4 - highlighted
// Line 5 - highlighted
// Line 6 - highlighted
const PORT = 3000;

app.get('/', (req, res) => {
  res.send('Hello World!');
  // Line 11 - highlighted
});

app.listen(PORT);
```

## Highlight with Data Attribute

```python {data-line-numbers="2,5-7"}
# Line 1
import os  # Line 2 - highlighted
import sys

def main():  # Line 5 - highlighted
    print("Hello")  # Line 6 - highlighted
    return 0  # Line 7 - highlighted

if __name__ == "__main__":
    main()
```

## Highlight a Range

```typescript {.h:3-8}
class App {
  private name: string;
  // Lines 3-8 highlighted
  constructor(name: string) {
    this.name = name;
  }
  getName(): string {
    return this.name;
  }
  // Not highlighted
  run(): void {
    console.log(this.getName());
  }
}
```

## Highlight Single Line

```rust {.h:3}
fn main() {
    let x = 5;
    let y = x * 2; // This line is highlighted
    println!("y = {}", y);
}
```

## Notes

- Use `{.h:line-numbers}` syntax after the language identifier
- Alternatively use `{data-line-numbers="..."}` format
- Supports single lines (`1`), ranges (`4-6`), and combinations (`1,4-6,11`)
- Highlighted lines have a distinct background color
