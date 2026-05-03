# Week 15 Architecture Diagrams

These Mermaid drafts are intended to help students visualize how Weeks 10-14 become one integrated capstone system in Week 15.

## 1. Global System Architecture

```mermaid
flowchart TB
    A[User Input and Menu Commands] --> B[Controller Methods]
    B --> C[Validation and Decision Logic]
    C --> D[Domain Classes]
    D --> E[List<T> Collection Store]
    E --> F[Reports and Output]
    E --> G[Optional Save or Load Layer]

    H[Week 10 Methods] --> B
    I[Week 11 Return Values] --> C
    J[Week 12 Custom Classes] --> D
    K[Week 13 Lists and Collections] --> E
    L[Week 14 Encapsulation and Constructors] --> D
```

## 2. Class and Responsibility Map

```mermaid
classDiagram
    class ProgramController {
        +RunMenu()
        +AddRecord()
        +SearchRecord()
        +PrintReport()
    }

    class DomainEntity {
        -string _name
        -int _quantity
        +string Name
        +int Quantity
        +GetSummary() string
    }

    class ListStore {
        +List~DomainEntity~ Items
        +Add(DomainEntity item)
        +FindByName(string name) DomainEntity
        +Remove(string name) bool
    }

    ProgramController --> ListStore : uses
    ProgramController --> DomainEntity : creates and updates
    ListStore --> DomainEntity : stores many
```

## 3. Add-Record Sequence Flow

```mermaid
sequenceDiagram
    actor Operator
    participant Menu as ProgramController
    participant Validator as Input Validation
    participant Entity as DomainEntity
    participant Store as List<T>
    participant Report as Console Output

    Operator->>Menu: Select Add Record
    Menu->>Validator: Read and validate raw input
    Validator-->>Menu: Clean values or reject input
    Menu->>Entity: Construct object with validated data
    Entity-->>Menu: Accept object or throw validation error
    Menu->>Store: Add object to list
    Store-->>Menu: Updated collection state
    Menu->>Report: Print confirmation and current count
    Report-->>Operator: Visible success message
```

## 4. Verification and Failure-Boundary Map

```mermaid
flowchart LR
    A[Start Test Case] --> B{Valid Input?}
    B -- No --> C[Reject Input and Print Guidance]
    B -- Yes --> D{Entity State Legal?}
    D -- No --> E[Constructor or Property Guard Blocks Change]
    D -- Yes --> F{Collection Operation Succeeds?}
    F -- No --> G[Print Not Found or Empty Collection Path]
    F -- Yes --> H[Print Labeled Success Output]

    C --> I[System Continues Running]
    E --> I
    G --> I
    H --> I
```

## Suggested Use

- Use Diagram 1 in the Week 15 overview or slide deck.
- Use Diagram 2 while explaining class boundaries and list ownership.
- Use Diagram 3 when demonstrating one full operator workflow live.
- Use Diagram 4 as the testing and grading checklist visual.