# PlantUML Test

This document tests PlantUML diagram rendering in Yank Note.

## Sequence Diagram

@startuml
Alice -> Bob: Authentication Request
Bob --> Alice: Authentication Response

Alice -> Bob: Another authentication Request
Alice <-- Bob: Another authentication Response
@enduml

## Use Case Diagram

@startuml
left to right direction
actor User
actor Admin

rectangle "Yank Note" {
    User --> (Edit Document)
    User --> (View Preview)
    User --> (Export PDF)
    Admin --> (Manage Extensions)
    Admin --> (Configure Settings)
    (Edit Document) --> (Save Document)
}
@enduml

## Class Diagram

@startuml
class Document {
    -title: String
    -content: String
    -tags: List<String>
    +render(): HTML
    +save(): void
    +export(format: String): File
}

class Editor {
    -document: Document
    -plugins: List<Plugin>
    +open(path: String): void
    +close(): void
}

class Plugin {
    -name: String
    -version: String
    +activate(): void
    +deactivate(): void
}

Editor "1" --> "1" Document : edits
Editor "1" --> "*" Plugin : uses
@enduml

## Activity Diagram

@startuml
start
:Open Document;
if (Document exists?) then (yes)
    :Load Content;
    :Render Preview;
else (no)
    :Create New Document;
    :Initialize Template;
endif
:Edit Content;
:Save Document;
stop
@enduml

## Component Diagram

@startuml
package "Yank Note" {
    [Editor] --> [Markdown Engine]
    [Markdown Engine] --> [Plugins]
    [Editor] --> [File System]
    [Plugins] --> [KaTeX]
    [Plugins] --> [Mermaid]
    [Plugins] --> [PlantUML]
}
@enduml

## State Diagram

@startuml
[*] --> Draft
Draft --> Editing : open
Editing --> Saved : save
Saved --> Editing : edit
Editing --> Preview : toggle
Preview --> Editing : toggle
Saved --> [*] : close
@enduml

## Notes

- PlantUML requires Java and Graphviz for local rendering
- Can be configured to use an online API endpoint
- Diagrams are enclosed between `@startuml` and `@enduml` markers
