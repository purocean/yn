# Kroki Diagrams Test

This document tests Kroki diagram rendering in Yank Note.

> **Note**: Requires the `@yank-note/extension-kroki` extension.

## WaveDrom (Digital Timing Diagram)

```js
// --kroki-- wavedrom
{
  signal: [
    { name: "clk",  wave: "p.....|..." },
    { name: "data", wave: "x.345x|=.x", data: ["head", "body", "tail", "data"] },
    { name: "req",  wave: "0.1..0|1.0" },
    {},
    { name: "ack",  wave: "1.....|01." }
  ]
}
```

## GraphViz (DOT)

```js
// --kroki-- graphviz
digraph G {
    rankdir=LR;
    node [shape=box, style=filled, fillcolor=lightblue];

    A [label="Input"];
    B [label="Process"];
    C [label="Output"];
    D [label="Log"];

    A -> B;
    B -> C;
    B -> D [style=dashed];
}
```

## Ditaa (ASCII Art Diagrams)

```js
// --kroki-- ditaa
+--------+   +-------+    +-------+
|        +---+ ditaa |    |       |
|  Text  |   +-------+    |diagram|
|Document|   |!magic!|    |       |
|     {d}|   |       |    |       |
+---+----+   +-------+    +-------+
    :                         ^
    |       Lots of work      |
    +-------------------------+
```

## BlockDiag

```js
// --kroki-- blockdiag
blockdiag {
    A -> B -> C -> D;
    A -> E -> F -> G;

    group {
        label = "Group 1";
        color = "#FF9900";
        A; B; C;
    }

    group {
        label = "Group 2";
        color = "#3399FF";
        E; F;
    }
}
```

## SeqDiag (Sequence Diagram)

```js
// --kroki-- seqdiag
seqdiag {
    browser  -> webserver [label = "GET /index.html"];
    browser <-- webserver;
    browser  -> webserver [label = "POST /form"];
    browser <-- webserver;
    browser  -> webserver [label = "GET /image.png"];
    browser <-- webserver;
}
```

## ActDiag (Activity Diagram)

```js
// --kroki-- actdiag
actdiag {
    write -> convert -> review

    lane user {
        label = "User"
        write [label = "Write document"];
        review [label = "Review result"];
    }

    lane engine {
        label = "Engine"
        convert [label = "Convert to HTML"];
    }
}
```

## ERD (Entity Relationship Diagram)

```js
// --kroki-- erd
[Person]
*name
height
weight

[Pet]
*name
breed

Person *--* Pet
```

## SVGBob (ASCII Art to SVG)

```js
// --kroki-- svgbob
       .---.
      /-o-/--
   .-/ / /->
  ( *  \/
   '-.  \
      \ /
       '
```

## C4 Diagram (PlantUML)

```js
// --kroki-- c4plantuml
@startuml
!include C4_Context.puml

Person(user, "User", "A user of Yank Note")
System(yn, "Yank Note", "Markdown editor")
System_Ext(ext, "Extensions", "Plugin system")

Rel(user, yn, "Uses")
Rel(yn, ext, "Loads")
@enduml
```

## Notes

- Kroki supports many diagram types through a unified API
- Use `// --kroki-- [diagram-type]` marker in JS code blocks
- Supported types include: wavedrom, graphviz, ditaa, blockdiag, seqdiag, actdiag, nwdiag, erd, svgbob, c4plantuml, and more
- Diagrams are rendered server-side via the Kroki API
