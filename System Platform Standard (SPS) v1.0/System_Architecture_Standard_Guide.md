# System_Architecture_Standard_Guide.md

Version : v1.0
Status : Official SSOT
Type : System Platform Constitution
Author : 3Cushion AI
Last Updated : 2026-07-01

---

# 1. Purpose

This document defines the official architecture standard for every System supported by the 3Cushion AI platform.

The purpose of this document is to establish a permanent System Architecture Standard (SAS) that guarantees every billiard system follows the same structural, runtime, and integration rules.

This document defines only the architecture of a System.

It does not describe implementation procedures.

Implementation instructions belong to Cursor Work Orders.

---

# 2. Scope

This document applies to every System contained under:

```text
frontend/src/data/systems/
```

including existing systems and all future systems.

Examples include:

```text
5_half_system
35half
3tip_across
reverse_system
plus_system
peruvian_system
tokyo_system
...
```

Every System shall conform to this standard regardless of complexity.

---

# 3. Objectives

The objectives of this standard are:

• Standardize every System structure.

• Remove Runtime dependency on individual systems.

• Allow App.jsx to remain an Application Runtime Orchestrator.

• Enable new systems to be added without modifying Runtime.

• Establish a Canonical System definition.

• Guarantee compatibility across all Runtime components.

• Support automated validation.

• Support automated migration.

• Maintain long-term Source of Truth (SSOT).

---

# 4. Philosophy

A System is not application logic.

A System is a structured definition that Runtime consumes.

Therefore,

Runtime must understand the System contract.

The System must never depend on Runtime implementation.

The dependency direction is always:

```text
System

↓

Runtime

↓

Renderer
```

Never:

```text
Runtime

↓

System-specific implementation

↓

App.jsx
```

---

# 5. Architecture Principles

## Principle 1

A System shall describe

"What the System is."

A System shall never describe

"How Runtime works."

---

## Principle 2

Every System shall expose the same architecture.

No System may introduce its own structure.

---

## Principle 3

Every Runtime module shall communicate only through the official System Contract.

No Runtime module shall depend on internal JSON layouts beyond the contract.

---

## Principle 4

A System shall be completely self-contained.

Adding a new System shall require no modification to App.jsx.

---

## Principle 5

Every System shall be independently loadable.

Loading one System shall never require another System.

---

## Principle 6

Every System shall be validated before Runtime usage.

Invalid Systems shall never participate in Runtime execution.

---

## Principle 7

System behavior shall be represented as declarative data whenever possible.

Imperative logic shall remain inside Domain modules.

---

# 6. Architectural Position

Within the complete application architecture:

```text
Application

│

├── Runtime

├── Domain

├── Renderer

├── Overlay

├── Search

└── Systems
```

Systems represent an independent Architecture Layer.

Systems are neither:

• UI

• Renderer

• Domain implementation

• Application Flow

Systems define Runtime knowledge.

---

# 7. System Architecture Layer

The System Layer contains:

```text
System Definition

↓

System Registry

↓

System Loader

↓

System Contract

↓

Domain Consumption

↓

Renderer Consumption
```

Every Runtime component consumes Systems through the official contract.

Direct JSON dependency is prohibited.

---

# 8. System Responsibilities

A System is responsible for describing:

• Formula definition

• Coordinate definition

• Anchor definition

• Correction definition

• Runtime capability

• Metadata

• Display capability

• Validation capability

• Canonical identity

A System is not responsible for:

• Rendering

• UI

• Search implementation

• Dataset management

• Runtime orchestration

• React components

• Event handling

• Network communication

---

# 9. Canonical Architecture

Every System shall conform to the following architecture.

```text
System

├── Definition
│
├── Runtime Contract
│
├── Formula Definition
│
├── Coordinate Definition
│
├── Capability Definition
│
├── Metadata
│
└── Validation
```

This architecture shall remain identical for every System.

---

# 10. System Package Standard

Every System directory shall contain:

```text
system_name/

profile.json

logic.json

anchors.json

system_meta.json
```

No additional Runtime definition files shall exist inside a System unless officially approved.

---

# 11. System Package Responsibilities

The package is divided into four independent responsibilities.

```text
profile.json

↓

Defines
"What exists."
```

---

```text
logic.json

↓

Defines
"How the System behaves."
```

---

```text
anchors.json

↓

Defines
"Where System coordinates exist."
```

---

```text
system_meta.json

↓

Defines
"System identity and capability."
```

No responsibility overlap is permitted.

---

# 12. Runtime Integration Model

Runtime shall consume a System only through the official Runtime interfaces.

The Runtime shall never depend on directory layouts or file names beyond the approved Registry.

The Runtime integration flow is defined as:

```text
System Directory

↓

System Registry

↓

Runtime Contract

↓

Application Runtime

↓

Domain

↓

Renderer

↓

Presentation
```

Direct access from Presentation or UI to System JSON files is prohibited.

All Runtime communication shall pass through the official System Registry and Runtime Contract.

This guarantees that future Runtime refactoring does not require changes to individual Systems.

---

# 13. System Runtime Contract

## 13.1 Purpose

The Runtime Contract defines the official interface between the Runtime and every System.

The Runtime Contract exists to isolate Runtime implementation from individual System implementations.

Runtime shall never understand the internal structure of a System.

Runtime shall only understand the official contract.

---

## 13.2 Contract Principles

Every Runtime component shall communicate through the same contract.

The contract shall remain stable even if the internal implementation of a System changes.

No Runtime component may directly interpret System-specific JSON structures.

The Runtime Contract shall be versioned independently from individual Systems.

---

## 13.3 Runtime Consumption

Runtime may consume only officially exposed System information.

Examples include:

• System Profile

• Runtime Logic Definition

• Anchor Definitions

• Metadata

No Runtime component shall traverse arbitrary JSON fields.

---

## 13.4 Runtime Independence

The Runtime shall not require knowledge of:

• individual System names

• System directory layouts

• System-specific conditional branches

• hard-coded Runtime exceptions

The Runtime shall consume only the registered System Contract.

---

# 14. Registry Architecture

## 14.1 Registry Purpose

The Registry provides the official entry point into every System.

No Runtime module shall access System files directly.

Every System shall be registered through the Registry.

---

## 14.2 Registry Responsibilities

The Registry is responsible for:

• System discovery

• System registration

• Runtime lookup

• Contract exposure

• Validation entry

The Registry is not responsible for:

• Formula calculation

• Runtime orchestration

• Search

• Rendering

• Dataset management

---

## 14.3 Registry Independence

The Registry shall remain independent from:

• App.jsx

• UI

• React Components

• Renderer

• Overlay

The Registry belongs to the System Layer.

---

# 15. Loader Architecture

## 15.1 Loader Purpose

The Loader transforms System packages into Runtime-ready objects.

The Loader is the only approved mechanism for loading System Definitions.

---

## 15.2 Loader Responsibilities

The Loader shall:

• locate a System

• load required definitions

• validate package integrity

• expose Runtime Contract

• report loading failures

The Loader shall never calculate System values.

---

## 15.3 Loader Independence

The Loader shall never depend upon:

• Renderer

• Search

• Overlay

• Dataset

• Application Flow

---

# 16. Dependency Rules

The official dependency direction is:

```text
System

↓

Registry

↓

Loader

↓

Runtime Contract

↓

Application

↓

Domain

↓

Renderer

↓

Presentation
```

Reverse dependencies are prohibited.

Presentation shall never depend directly upon System files.

Renderer shall never interpret System Definitions.

Application shall never interpret anchor coordinates.

Domain shall never modify System Definitions.

---

# 17. Runtime Independence

Runtime components shall remain independent from every individual System.

Therefore,

adding a new System shall require:

```text
Create System Directory

↓

Register System

↓

Validation

↓

Available to Runtime
```

No Runtime module shall require modification.

---

# 18. JSON Responsibility Model

Every JSON file has one and only one responsibility.

Responsibility overlap is prohibited.

---

## 18.1 profile.json

profile.json defines

"What the System is."

Typical responsibilities include:

• Formula definition

• Input definition

• Output definition

• Supported calculation model

• Display capability

• Runtime capability

profile.json shall not contain executable Runtime logic.

---

## 18.2 logic.json

logic.json defines

"How the System behaves."

Typical responsibilities include:

• Correction rules

• Synchronization rules

• Runtime decision rules

• System-specific behavior

• Formula adjustments

logic.json shall never define UI behavior.

---

## 18.3 anchors.json

anchors.json defines

"Where System reference positions exist."

Typical responsibilities include:

• Coordinate anchors

• Frame references

• Rail references

• Canonical anchor positions

• Symmetry references

anchors.json shall never define Runtime logic.

---

## 18.4 system_meta.json

system_meta.json defines

"Who the System is."

Typical responsibilities include:

• System identity

• Display name

• Category

• Aliases

• Version

• Supported Runtime features

• Documentation references

system_meta.json shall never contain calculation logic.

---

# 19. Runtime Visibility

Runtime visibility shall be limited.

Each Runtime component shall receive only the information required for its responsibility.

Examples:

Application Runtime

↓

receives Runtime Contract

Domain

↓

receives validated System Definition

Renderer

↓

receives ViewModels

Presentation

↓

receives Render Models

Presentation shall never access System JSON directly.

---

# 20. System Identity

Every System shall possess a unique identity.

The identity shall remain stable throughout the lifetime of the project.

Changing a System identity is considered a breaking architectural change.

Identity shall never depend upon:

• Display Name

• Language

• Folder ordering

• Runtime implementation

Identity shall remain immutable.

---

# 21. Canonical Naming Rules

Every System shall follow identical naming conventions.

Directory names shall uniquely identify a System.

JSON filenames shall remain constant.

Approved filenames are:

```text
profile.json

logic.json

anchors.json

system_meta.json
```

Alternative filenames are prohibited unless approved by the Architecture Standard.

---

# 22. Runtime Compatibility

Every System shall maintain Runtime compatibility.

Backward compatibility shall be preserved whenever possible.

Breaking Runtime changes require:

• Architecture review

• Schema review

• Validation update

• Migration documentation

---

# 23. Versioning Principles

Each System shall maintain version compatibility with the Runtime Contract.

System versioning shall not affect Runtime architecture.

Changes to Runtime Contracts require official architecture approval.

---

# 24. Architectural Stability

System Architecture shall remain stable over time.

Individual Systems may evolve.

Runtime implementation may evolve.

Renderer implementation may evolve.

Application implementation may evolve.

The System Architecture Standard shall remain stable unless an official architectural revision is approved.

---

# 25. Canonical System Concept

## 25.1 Purpose

The 3Cushion AI platform shall define one Canonical System.

The Canonical System serves as the architectural reference for every existing and future System.

It is not a special Runtime implementation.

It is the official reference architecture.

---

## 25.2 Canonical Reference

The current Canonical Reference is:

```text
5_half_system
```

This System has been selected because it currently represents the most complete implementation of the System Architecture.

Future Canonical revisions shall preserve architectural compatibility.

---

## 25.3 Canonical Responsibilities

The Canonical System defines:

• directory organization

• package composition

• Runtime integration

• JSON responsibilities

• naming conventions

• validation rules

• migration reference

Every other System shall be compared against the Canonical System during Architecture Audit.

---

## 25.4 Canonical Independence

The Canonical System is an architectural template.

It shall never receive Runtime exceptions.

It shall never be treated as a privileged implementation.

Every Runtime component shall treat the Canonical System exactly like any other System.

---

# 26. Extension Principles

## 26.1 Purpose

The platform shall support unlimited future Systems.

The addition of a new System shall require no Runtime redesign.

---

## 26.2 New System Procedure

A new System shall be introduced through the following sequence:

```text
Create System Directory

↓

Create profile.json

↓

Create logic.json

↓

Create anchors.json

↓

Create system_meta.json

↓

Register System

↓

Validate

↓

Release
```

No Runtime modification shall be required.

---

## 26.3 Extension Rules

Extensions shall never introduce:

• Runtime exceptions

• App.jsx conditions

• Renderer exceptions

• Search exceptions

• Overlay exceptions

Extensions belong exclusively inside the System Definition.

---

# 27. Validation Principles

Every System shall successfully pass validation before Runtime execution.

Validation shall verify:

• directory structure

• required files

• schema compliance

• identity uniqueness

• Runtime compatibility

• canonical consistency

Validation failure shall prevent Runtime loading.

---

# 28. Migration Principles

Legacy Systems shall migrate toward the Canonical Architecture.

Migration shall preserve Runtime behavior.

Migration shall not change:

• calculation results

• trajectory behavior

• Runtime contract

• published datasets

Migration shall be incremental.

Large-scale replacement is prohibited.

---

# 29. Architecture Compliance

Every System shall satisfy all Architecture requirements.

Compliance shall be evaluated through:

• Architecture Audit

• Schema Validation

• Runtime Validation

• Canonical Comparison

• Regression Verification

Non-compliant Systems shall be marked for migration.

---

# 30. Runtime Evolution

Runtime implementation may evolve.

Renderer implementation may evolve.

Search implementation may evolve.

Application Flow may evolve.

However,

System Definitions shall remain architecture-stable.

Runtime evolution shall never invalidate officially compliant Systems.

---

# 31. Non-Negotiable Rules

The following rules are mandatory.

1.

Every System shall contain:

```text
profile.json

logic.json

anchors.json

system_meta.json
```

2.

Every System shall expose the official Runtime Contract.

3.

Every System shall pass Schema Validation.

4.

No Runtime module shall access System JSON directly.

5.

App.jsx shall never contain System-specific implementation.

6.

System-specific Runtime behavior belongs inside System Definitions or Domain modules.

7.

No Renderer component shall interpret System Definitions.

8.

No Presentation component shall load System files.

9.

Every System shall remain independently loadable.

10.

Every System shall remain independently testable.

11.

Every System shall remain independently replaceable.

12.

Canonical Architecture shall remain the permanent reference.

---

# 32. Success Criteria

The System Architecture Standard is considered complete only when all of the following conditions are satisfied.

Architecture

✓ Every System follows the official directory structure.

✓ Every System implements the same Runtime Contract.

✓ Every System conforms to the Canonical Architecture.

Runtime

✓ App.jsx contains no System-specific logic.

✓ Runtime accesses Systems only through the Registry and Runtime Contract.

✓ New Systems require no Runtime modification.

Validation

✓ Every System passes Schema Validation.

✓ Every System passes Runtime Validation.

✓ Every System passes Architecture Audit.

Migration

✓ Legacy Systems can migrate incrementally.

✓ Migration does not change Runtime behavior.

✓ Migration maintains backward compatibility.

Platform

✓ Every System is independently maintainable.

✓ Every System is independently testable.

✓ Every System is independently replaceable.

✓ Every System is independently extensible.

---

# 33. References

This document shall be interpreted together with the following official standards.

Application Architecture

```text
Architecture_Constitution.md

Architecture_Dictionary.md

Chapter01~20
```

Runtime Architecture

```text
AAS_Release_Normalization_Guide.md

App.jsx_Responsibility_Analysis_Guide.md
```

System Platform

```text
System_Runtime_Contract.md

Canonical_System_Template.md

System_Schema_Definition.md

System_Audit_Guide.md

System_Standardization_Guide.md
```

These documents collectively constitute the official System Platform Standard.

---

# 34. Final Statement

The objective of this standard is not merely to standardize existing Systems.

Its objective is to establish a permanent architecture that allows every present and future System to participate in the 3Cushion AI platform through a single, stable, and verifiable contract.

System implementations may evolve.

Runtime implementations may evolve.

Renderer implementations may evolve.

Application implementations may evolve.

The System Architecture Standard shall remain the permanent Source of Truth governing all System definitions.

---

End of Document