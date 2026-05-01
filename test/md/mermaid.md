# Mermaid Diagrams Test

This document tests Mermaid diagram rendering in Yank Note.

> **Note**: Requires the `@yank-note/extension-mermaid` extension.

## Flowchart

```mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[End]
```

## Flowchart (Left to Right)

```mermaid
graph LR
    A[Hard Edge] -->|Link text| B(Round Edge)
    B --> C{Decision}
    C -->|One| D[Result 1]
    C -->|Two| E[Result 2]
    C -->|Three| F[Result 3]
```

## Sequence Diagram

```mermaid
sequenceDiagram
    participant Alice
    participant Bob
    participant Charlie
    Alice->>Bob: Hello Bob, how are you?
    Bob-->>Alice: I'm good, thanks!
    Alice->>Charlie: Hi Charlie!
    Charlie-->>Alice: Hey Alice!
    Bob->>Charlie: Hi there!
    Note over Alice,Charlie: A group conversation
```

## Class Diagram

```mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +fetch()
    }
    class Cat {
        +String color
        +purr()
    }
    Animal <|-- Dog
    Animal <|-- Cat
```

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Processing : Start
    Processing --> Success : Complete
    Processing --> Error : Fail
    Error --> Idle : Retry
    Success --> [*]
```

## Gantt Chart

```mermaid
gantt
    title Project Timeline
    dateFormat  YYYY-MM-DD
    section Planning
    Requirements    :a1, 2024-01-01, 10d
    Design          :a2, after a1, 15d
    section Development
    Backend         :b1, after a2, 20d
    Frontend        :b2, after a2, 25d
    section Testing
    Integration     :c1, after b1, 10d
    UAT             :c2, after c1, 5d
```

## Pie Chart

```mermaid
pie title Language Distribution
    "JavaScript" : 40
    "TypeScript" : 30
    "Python" : 15
    "Go" : 10
    "Other" : 5
```

## Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    PRODUCT ||--o{ LINE-ITEM : "is in"
    USER {
        int id
        string name
        string email
    }
    ORDER {
        int id
        date created
        string status
    }
    PRODUCT {
        int id
        string name
        float price
    }
```

## Journey Map

```mermaid
journey
    title My Working Day
    section Go to Work
      Wake up: 1: Me
      Get dressed: 2: Me
      Commute: 3: Me, Bus
    section At Work
      Code: 5: Me
      Meeting: 2: Me, Boss
      Lunch: 4: Me, Colleagues
    section Go Home
      Commute: 3: Me, Bus
      Relax: 5: Me
```
