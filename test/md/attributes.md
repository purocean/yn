# Element Attributes Test

This document tests the element attributes syntax supported by Yank Note via markdown-it-attributes.

## Basic Attributes

### Class Attribute

This paragraph has a custom class.{.custom-class}

**Bold text with class**{.highlight}

### Style Attribute

**Red colored text**{style="color: red;"}

*Blue italic text*{style="color: blue; font-size: 1.2em;"}

### ID Attribute

#### Section with ID {#my-section}

You can link to this section using `#my-section`.

### Multiple Attributes

**Styled text**{.custom-class style="color: green; font-weight: bold;" id="styled-element"}

## Built-in CSS Classes

### Inline Display

![Inline image](https://via.placeholder.com/50){.inline}

### White Background

![White background image](https://via.placeholder.com/100){.bgw}

### Text Alignment

This is centered text.{.text-center}

This is right-aligned text.{.text-right}

This is left-aligned text.{.text-left}

### Border

![Image with border](https://via.placeholder.com/100){.with-border}

### Print Control

This content will not appear in print/PDF.{.skip-print}

This content will not appear in HTML export.{.skip-export}

Start a new page before this in print.{.new-page}

Avoid breaking this across pages.{.avoid-page-break}

### Brightness

This image has reduced brightness in dark mode.{.reduce-brightness}

### Copy Text

Click to copy this text.{.copy-inner-text}

## Attributes on Different Elements

### On Headings

#### Custom Heading {.text-center style="color: purple;"}

### On Links

[Styled link](https://example.com){style="color: orange; text-decoration: none;"}

### On Images

![Sized image](https://via.placeholder.com/200){style="width: 100px; border-radius: 8px;"}

### On Code

`highlighted code`{style="background: yellow; color: black;"}

### On Blockquotes

> This blockquote has a custom style.
{style="border-left-color: green;"}

### On Lists

- Item 1
- Item 2
- Item 3
{.custom-list}
