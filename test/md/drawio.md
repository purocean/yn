# Draw.io Test

This document tests Draw.io diagram integration in Yank Note.

> **Note**: Requires the `@yank-note/extension-drawio` extension.

## Link Syntax

Use a link with `link-type="drawio"` attribute to embed a Draw.io file:

[Architecture Diagram](./example.drawio){link-type="drawio"}

### With Page Selection

[Page 1](./example.drawio){link-type="drawio" page="0"}

[Page 2](./example.drawio){link-type="drawio" page="1"}

## Inline XML Syntax

Draw.io diagrams can also be embedded as inline XML in a code block:

```xml
<!-- --drawio-- -->
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="Start" style="rounded=1;whiteSpace=wrap;" vertex="1" parent="1">
      <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
    </mxCell>
    <mxCell id="3" value="Process" style="whiteSpace=wrap;" vertex="1" parent="1">
      <mxGeometry x="100" y="200" width="120" height="60" as="geometry"/>
    </mxCell>
    <mxCell id="4" value="" style="endArrow=classic;" edge="1" parent="1" source="2" target="3">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>
```

## Notes

- Draw.io files (`.drawio`) are XML-based diagram files
- Supports multi-page diagrams via the `page` attribute
- Diagrams can be edited inline in the Yank Note editor
- Both file reference and inline XML approaches are supported
