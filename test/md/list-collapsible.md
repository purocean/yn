# Collapsible Lists Test

This document tests the collapsible list feature in Yank Note.

> **Note**: Enable collapsible lists by setting `render.list-collapsible: true` in front matter or settings.

## Basic Collapsible List

- Parent item 1
  - Child item 1.1
  - Child item 1.2
    - Grandchild 1.2.1
    - Grandchild 1.2.2
  - Child item 1.3
- Parent item 2
  - Child item 2.1
  - Child item 2.2
- Parent item 3 (no children, not collapsible)

## Deeply Nested List

- Level 1
  - Level 2
    - Level 3
      - Level 4
        - Level 5
          - Level 6

## Mixed List Types

1. Ordered parent 1
   - Unordered child A
   - Unordered child B
     1. Ordered grandchild I
     2. Ordered grandchild II
2. Ordered parent 2
   - Unordered child C

## Collapsible with Content

- **Project Structure**
  - `src/` - Source code
    - `main/` - Main application
    - `renderer/` - UI renderer
    - `share/` - Shared utilities
  - `test/` - Test files
  - `build/` - Build configuration
  - `scripts/` - Build scripts

## Usage Notes

- Click the chevron icon to collapse/expand nested lists
- The chevron appears on hover for items with children
- Leaf items (no children) are not collapsible
- Configure via `render.list-collapsible` setting
