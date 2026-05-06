# Container Blocks Test

This document tests all container block types supported by Yank Note.

## Tip Container

::: tip
This is a tip container. Use it for helpful advice.
:::

::: tip Custom Tip Title
This tip has a custom title.
:::

## Warning Container

::: warning
This is a warning container. Use it for important notices.
:::

::: warning Caution
Be careful with this operation!
:::

## Danger Container

::: danger
This is a danger container. Use it for critical warnings.
:::

::: danger STOP
Do not proceed without backup!
:::

## Details (Collapsible) Container

::: details Click to expand
This content is hidden by default and can be revealed by clicking.

- Item 1
- Item 2
- Item 3
:::

::: details Show Code Example
```javascript
function example() {
  return "Hidden code";
}
```
:::

## Code Group Container

::: code-group
```javascript
// JavaScript
function hello() {
  console.log("Hello!");
}
```

```python
# Python
def hello():
    print("Hello!")
```

```go
// Go
package main

import "fmt"

func main() {
    fmt.Println("Hello!")
}
```
:::

## Group Container

::: group
::: group-item Tab 1
Content for tab 1.
:::

::: group-item Tab 2
Content for tab 2.
:::

::: group-item Tab 3
Content for tab 3.
:::
:::

## Row and Column Layout

::: row
::: col
**Column 1**

This is the first column content.
:::

::: col
**Column 2**

This is the second column content.
:::

::: col
**Column 3**

This is the third column content.
:::
:::

## Section Container

::: section
This is a section container. It groups content together.

### Section Heading

Section content with various elements.
:::

## Div Container

::: div {style="background: #f0f0f0; padding: 1em; border-radius: 8px;"}
This is a div container with custom styling.
:::

## Nested Containers

::: tip Nested Example
This tip contains a details block:

::: details Nested Details
This is nested inside a tip container.

::: warning Deep Nesting
This is a warning inside details inside a tip!
:::
:::
:::
