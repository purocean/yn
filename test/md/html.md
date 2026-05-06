# HTML Support Test

This document tests raw HTML rendering in Yank Note.

> **Note**: HTML support requires `html: true` in mdOptions (enabled by default).

## Basic HTML Tags

<p>This is a paragraph in HTML.</p>

<strong>Bold text</strong> and <em>italic text</em>

<u>Underlined text</u>

<mark>Highlighted text via HTML</mark>

## Div and Span

<div style="background: #f0f0f0; padding: 1em; border-radius: 8px; margin: 1em 0;">
  <p style="color: #333;">This is a styled div container.</p>
  <p>With <span style="color: red;">colored</span> <span style="color: blue;">span</span> elements.</p>
</div>

## HTML Table

<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
  <thead>
    <tr style="background: #e0e0e0;">
      <th>Name</th>
      <th>Type</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Feature A</td>
      <td>Enhancement</td>
      <td style="color: green;">✅ Done</td>
    </tr>
    <tr>
      <td>Feature B</td>
      <td>Bug Fix</td>
      <td style="color: orange;">🔄 In Progress</td>
    </tr>
  </tbody>
</table>

## Details and Summary

<details>
  <summary>Click to expand</summary>
  <p>This is hidden content revealed by clicking the summary.</p>
  <ul>
    <li>Item 1</li>
    <li>Item 2</li>
    <li>Item 3</li>
  </ul>
</details>

<details open>
  <summary>This is open by default</summary>
  <p>Content visible from the start.</p>
</details>

## Keyboard Input

Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to copy.

Press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> to open command palette.

## Abbreviation and Definition

<abbr title="Yank Note">YN</abbr> is a great markdown editor.

<dl>
  <dt>Markdown</dt>
  <dd>A lightweight markup language</dd>
  <dt>Yank Note</dt>
  <dd>A feature-rich markdown editor</dd>
</dl>

## Figure and Figcaption

<figure style="text-align: center;">
  <img src="https://via.placeholder.com/200x150" alt="Placeholder">
  <figcaption>Figure 1: A placeholder image</figcaption>
</figure>

## Colored Text

<span style="color: red;">Red text</span>
<span style="color: green;">Green text</span>
<span style="color: blue;">Blue text</span>
<span style="color: purple;">Purple text</span>

## Progress Bar

<progress value="75" max="100" style="width: 200px;"></progress> 75%

## Mixed HTML and Markdown

<div style="border: 2px solid #ccc; padding: 1em; border-radius: 8px;">

**This is markdown** inside an HTML div.

- List item 1
- List item 2

`Code` works here too.

</div>

## Notes

- HTML rendering is controlled by `mdOptions.html` (default: `true`)
- In safe mode, certain tags and attributes are filtered
- Script tags are prevented for security
- HTML can be freely mixed with markdown content
