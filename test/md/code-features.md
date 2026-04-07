# Code Features Test

This document tests code-related features in Yank Note: highlighting, running, copying, and wrapping.

## Syntax Highlighting

### JavaScript

```javascript
class Calculator {
  constructor() {
    this.result = 0;
  }

  add(value) {
    this.result += value;
    return this;
  }

  multiply(value) {
    this.result *= value;
    return this;
  }

  getResult() {
    return this.result;
  }
}

const calc = new Calculator();
console.log(calc.add(5).multiply(3).getResult()); // 15
```

### TypeScript

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

function greetUser(user: User): string {
  return `Hello, ${user.name}! You have ${user.roles.length} roles.`;
}

const user: User = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  roles: ["admin", "editor"],
};
```

### HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Test Page</title>
  <style>
    body { font-family: sans-serif; }
  </style>
</head>
<body>
  <h1>Hello World</h1>
  <p>This is a test page.</p>
</body>
</html>
```

### Rust

```rust
fn fibonacci(n: u32) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

fn main() {
    for i in 0..10 {
        println!("fib({}) = {}", i, fibonacci(i));
    }
}
```

## Code Execution (`--run--`)

### JavaScript Execution

```js
// --run--
const items = ['apple', 'banana', 'cherry'];
items.forEach((item, index) => {
  console.log(`${index + 1}. ${item}`);
});
```

### JavaScript with HTML Output

```js
// --run-- --output-html--
const colors = ['red', 'green', 'blue'];
const html = colors.map(c =>
  `<span style="color: ${c}; font-weight: bold;">${c}</span>`
).join(' | ');
output = html;
```

### Node.js Execution

```js
// --run-- node
const os = require('os');
console.log('Platform:', os.platform());
console.log('Architecture:', os.arch());
console.log('CPUs:', os.cpus().length);
```

### Python Execution

```python
# --run--
import math

for i in range(1, 6):
    print(f"sqrt({i}) = {math.sqrt(i):.4f}")
```

### Shell Execution

```bash
# --run--
echo "Current date: $(date)"
echo "Current directory: $(pwd)"
echo "User: $(whoami)"
```

### Custom Compile Command (C)

```c
// --run-- gcc $tmpFile.c -o $tmpFile.out && $tmpFile.out
#include <stdio.h>

int main() {
    printf("Hello from C!\n");
    for (int i = 1; i <= 5; i++) {
        printf("Count: %d\n", i);
    }
    return 0;
}
```

## Code Copy

All code blocks support a copy button on hover. The language label is displayed in the top-right corner.

Inline code also supports `Ctrl/Cmd + Click` to copy: `npm install yank-note`

## Code Wrapping

Code wrapping can be enabled with `wrap-code: true` in front matter or render settings.

```text
This is a very long line that should demonstrate code wrapping behavior when the wrap-code option is enabled. Without wrapping, this line will overflow and require horizontal scrolling. With wrapping enabled, it should break into multiple lines.
```

## Line Numbers

Code blocks automatically display line numbers with a sticky left panel:

```javascript
// Line 1
// Line 2
// Line 3
// Line 4
// Line 5
// Line 6
// Line 7
// Line 8
// Line 9
// Line 10
// Line 11
// Line 12
// Line 13
// Line 14
// Line 15
```
