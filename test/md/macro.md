---
enableMacro: true
define:
  --February--: February
  --�ÿ月--: 二月
---

# Macro Replacement Test

This document tests the macro replacement feature (`[= expression =]`) of Yank Note.

> **Note**: Macros require `enableMacro: true` in front matter to work.

## Basic Expressions

Simple math: [= 1 + 2 =]

String operation: [= 'Hello' + ' ' + 'World' =]

Ternary: [= true ? 'Yes' : 'No' =]

## Built-in Variables

### Document Information (`$doc`)

Document basename: [= $doc.basename =]

Document name: [= $doc.name =]

## Sequence Numbering (`$seq`)

Figure [= $seq('figure') =]: First diagram

Figure [= $seq('figure') =]: Second diagram

Figure [= $seq('figure') =]: Third diagram

Table [= $seq('table') =]: First table

Table [= $seq('table') =]: Second table

## Variable Export (`$export`)

[= $export('greeting', 'Hello from Yank Note') =]

The exported value is: [= greeting =]

[= $export('count', 42) =]

The count is: [= count =]

## Date and Time

Current timestamp: [= new Date().toISOString() =]

Year: [= new Date().getFullYear() =]

## Conditional Content

[= 1 > 0 ? '✅ Condition is true' : '❌ Condition is false' =]

## Text Define Replacement

The month is: --FEBRUARY--

中文月份: --二月--

## Complex Expressions

Array operation: [= [1,2,3,4,5].reduce((a,b) => a+b, 0) =]

String repeat: [= '⭐'.repeat(5) =]

## Include Other Documents

<!-- Uncomment the following line and create a fragment file to test includes -->
<!-- [= $include('./fragment.md') =] -->

## After Macro Hook

[= $afterMacro(() => { /* post-processing logic */ }) =]
