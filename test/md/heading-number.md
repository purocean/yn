---
headingNumber: true
---

# Heading Numbering Test

This document tests automatic heading numbering in Yank Note.

> **Note**: Enable heading numbering by setting `headingNumber: true` in front matter.

## First Section

Content of the first section.

### Sub-section A

Content of sub-section A.

### Sub-section B

Content of sub-section B.

#### Detail B.1

Detail content.

#### Detail B.2

Detail content.

##### Deep Detail B.2.1

Deep content.

## Second Section

Content of the second section.

### Sub-section A

Content.

### Sub-section B

Content.

### Sub-section C

Content.

#### Detail C.1

Content.

## Third Section

Content of the third section.

### Sub-section A

Content.

#### Detail A.1

Content.

#### Detail A.2

Content.

##### Deep Detail A.2.1

Content.

###### Deepest Detail A.2.1.1

Content.

## Numbering Notes

- Heading numbering uses CSS counters for h2 through h6
- h1 is not numbered (used as document title)
- Numbering resets appropriately for each level
- The format is: `2.`, `2.1.`, `2.1.1.`, etc.
