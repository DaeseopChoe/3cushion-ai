# System_Runtime_Contract.md

Version : v1.0
Status : Official SSOT
Type : Runtime Contract Standard
Author : 3Cushion AI
Last Updated : 2026-07-02

---

# 1. Purpose

This document defines the official Runtime Contract between the 3Cushion AI Runtime and every supported System.

The Runtime Contract establishes a stable interface that isolates Runtime implementation from System implementation.

Every Runtime component shall communicate with a System only through this contract.

No Runtime component shall depend on internal implementation details of individual Systems.

This document is the authoritative specification governing Runtime-System interaction.

---

# 2. Scope

This contract applies to:

```text
frontend/src/data/systems/*
```

including every existing and future System.

This contract also applies to every Runtime component that consumes System information.

Examples include:

```text
Application Runtime

System Registry

System Loader

Calculation Domain

Trajectory Domain

Renderer

Search

Overlay

AI

Lesson

History

Dataset
```

Presentation Components are outside the scope of this document.

---

# 3. Objectives

The Runtime Contract exists to achieve the following objectives.

• Separate Runtime from System implementations.

• Eliminate System-specific Runtime dependencies.

• Enable Runtime refactoring without changing Systems.

• Enable System evolution without changing Runtime.

• Standardize Runtime communication.

• Define a single official System interface.

• Support automated validation.

• Support backward compatibility.

• Guarantee long-term architectural stability.

---

# 4. Contract Philosophy

The Runtime shall never understand how a System is internally implemented.

The Runtime shall understand only the Runtime Contract.

Likewise,

a System shall never understand Runtime implementation.

The dependency direction is always:

```text
System

↓

Runtime Contract

↓

Runtime

↓

Renderer

↓

Presentation
```

No reverse dependency is permitted.

---

# 5. Architectural Position

Within the overall platform architecture:

```text
Application

│

├── Runtime

│

├── Runtime Contract

│

├── Registry

│

├── Loader

│

└── Systems
```

The Runtime Contract belongs to the Runtime Layer.

It is neither:

• Application Flow

• Domain Logic

• Renderer

• UI

nor

• System Definition

It is the communication boundary between Runtime and Systems.

---

# 6. Runtime Contract Principles

## Principle 1

Every System shall expose one Runtime Contract.

---

## Principle 2

Every Runtime component shall consume the same Contract.

---

## Principle 3

Runtime shall never inspect internal JSON layouts.

---

## Principle 4

Contract stability is more important than Runtime implementation.

---

## Principle 5

Contract compatibility shall be preserved whenever possible.

---

## Principle 6

System evolution shall not require Runtime redesign.

---

## Principle 7

Runtime evolution shall not require System redesign.

---

# 7. Runtime Communication Model

Official communication path:

```text
System

↓

Registry

↓

Loader

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

Only the Runtime Contract is visible outside the System Layer.

---

# 8. Runtime Responsibilities

The Runtime Contract is responsible for exposing:

• System identity

• Runtime Profile

• Runtime Logic

• Runtime Anchors

• Runtime Metadata

• Runtime Capabilities

• Validation State

• Version Information

The Runtime Contract shall never expose implementation details.

---

# 9. Runtime Visibility Rules

The Runtime Contract defines visibility boundaries.

Each Runtime component shall receive only the information required for its responsibility.

Application Runtime

↓

Runtime Contract only

Domain

↓

Validated Runtime Definition

Renderer

↓

Render Models

Presentation

↓

View Models

No Presentation component shall receive raw System Definitions.

---

# 10. Runtime Independence

Runtime shall remain independent from:

• individual System names

• folder structures

• JSON implementation

• coordinate implementation

• formula implementation

• correction implementation

• trajectory implementation

The Runtime shall consume only officially defined Runtime interfaces.

---

# 11. Runtime Layer

The Runtime Layer consists of:

```text
Runtime Contract

↓

Registry

↓

Loader

↓

Runtime Services

↓

Application Runtime
```

Each layer has one responsibility.

Responsibility overlap is prohibited.

---

# 12. Runtime Services

Runtime Services may consume the Runtime Contract.

Examples include:

```text
Calculation Service

Trajectory Service

Anchor Service

Validation Service

Search Service

History Service

Overlay Service

Lesson Service

AI Service
```

Runtime Services shall never access System files directly.

All Runtime Services communicate through the Runtime Contract.

---

# 13. Contract Stability

The Runtime Contract shall remain stable across Runtime revisions.

Internal Runtime implementation may change.

System implementation may change.

The Runtime Contract shall remain compatible.

Breaking changes require:

• Architecture review

• Schema review

• Migration documentation

• Compatibility verification

---

# 14. Contract Ownership

The Runtime Contract is owned by the System Platform Standard (SPS).

Individual Systems shall not redefine the Contract.

Application Runtime shall not redefine the Contract.

Renderer shall not redefine the Contract.

The Runtime Contract exists as the single authoritative interface shared by every Runtime component.

---

# 15. Registry Contract

## 15.1 Purpose

The Registry is the official Runtime entry point for every System.

No Runtime component shall access System packages directly.

Every Runtime request shall begin with the Registry.

---

## 15.2 Registry Responsibilities

The Registry is responsible for:

• discovering available Systems

• registering System packages

• exposing Runtime Contracts

• validating registration

• providing Runtime lookup

The Registry shall not:

• calculate System values

• evaluate formulas

• generate trajectories

• render UI

• manage Runtime state

---

## 15.3 Registry Visibility

Only the Registry may know:

• System directory

• package location

• registration status

These implementation details shall never be visible to Runtime Services.

---

# 16. Loader Contract

## 16.1 Purpose

The Loader transforms System packages into Runtime-ready Contract objects.

The Loader is the only approved mechanism for loading System Definitions.

---

## 16.2 Loader Responsibilities

The Loader shall:

• locate a System

• load required package files

• verify package integrity

• create Runtime Contract

• report loading failures

The Loader shall never:

• calculate System values

• modify System Definitions

• render Runtime output

---

## 16.3 Loader Lifecycle

The loading sequence is:

```text
Locate System

↓

Read Package

↓

Validate Structure

↓

Build Runtime Contract

↓

Register Runtime Object

↓

Ready for Runtime
```

Every Runtime component shall consume the registered object only.

---

# 17. Runtime Contract Interface

Every Runtime Contract shall expose a consistent interface regardless of System type.

Conceptually the Contract contains:

```text
Identity

Profile

Logic

Anchors

Metadata

Capabilities

Validation

Version
```

Internal storage format is implementation detail.

Runtime consumers shall rely only on the Contract.

---

# 18. Contract Composition

The Runtime Contract is assembled from the official System package.

```text
profile.json

↓

logic.json

↓

anchors.json

↓

system_meta.json

↓

Runtime Contract
```

No Runtime component shall assemble Contracts independently.

---

# 19. Contract Consumers

Approved Runtime consumers include:

```text
Application Runtime

Calculation Domain

Trajectory Domain

Search Domain

History Domain

Overlay Domain

Lesson Domain

AI Domain

Renderer
```

Consumers shall not modify Contract contents.

The Contract is read-only.

---

# 20. Runtime Flow

The official Runtime flow is:

```text
System Package

↓

Registry

↓

Loader

↓

Runtime Contract

↓

Application Runtime

↓

Domain Services

↓

Renderer

↓

Presentation
```

No shortcut path is permitted.

---

# 21. Contract Lifetime

A Runtime Contract exists only while Runtime requires it.

Creation:

```text
System Registration
```

Activation:

```text
Runtime Load
```

Usage:

```text
Runtime Services
```

Release:

```text
Runtime Disposal
```

No Runtime component shall retain obsolete Contract instances.

---

# 22. Runtime Isolation

Each Runtime Contract shall remain isolated.

Loading one System shall not modify another System.

Each Contract instance shall behave independently.

Cross-System mutation is prohibited.

---

# 23. Compatibility Rules

Runtime compatibility shall be preserved across:

• Runtime upgrades

• Renderer upgrades

• Search upgrades

• Domain upgrades

A Runtime upgrade shall not require rewriting compliant System packages.

---

# 24. Error Handling

Runtime Contract loading failures shall be reported through standardized validation.

Typical failures include:

• missing package

• invalid schema

• duplicate identity

• incompatible version

• Registry failure

Runtime components shall never silently ignore Contract failures.

---

# 25. Runtime Validation

Before becoming available, every Runtime Contract shall pass validation.

Validation includes:

• package integrity

• schema validation

• identity validation

• Contract completeness

• compatibility verification

Only validated Contracts may enter Runtime.

---

# 26. Runtime Versioning

The Runtime Contract shall support explicit versioning.

Version information shall be exposed through the Contract.

Runtime shall use Contract versions to determine compatibility.

System package version and Runtime Contract version are independent concepts.

---

# 27. Runtime Events

Typical Runtime events include:

```text
System Registered

↓

Contract Created

↓

Contract Validated

↓

Runtime Ready

↓

Contract Released
```

These events represent Runtime lifecycle only.

They are not UI events.

---

# 28. Contract Immutability

A Runtime Contract is immutable.

Runtime consumers shall never modify:

• Profile

• Logic

• Anchors

• Metadata

If updates are required,

a new Runtime Contract shall be created.

---

# 29. Runtime Security

Runtime consumers shall receive only the information necessary for execution.

Internal package implementation shall remain hidden.

System Definitions shall not expose unnecessary internal details.

The Runtime Contract represents the only approved public interface.

---

# 30. Runtime Contract Compliance

Every Runtime Contract shall satisfy all requirements defined by the System Platform Standard.

Compliance shall be evaluated through:

• Architecture Compliance

• Schema Compliance

• Runtime Validation

• Canonical Comparison

• Regression Verification

Only compliant Runtime Contracts may participate in Runtime execution.

---

# 31. Runtime Contract Evolution

The Runtime Contract is designed to evolve while preserving architectural stability.

The following changes are permitted:

• internal Runtime implementation

• internal Domain implementation

• Renderer implementation

• Search implementation

• Application Flow implementation

The following changes require formal architecture review:

• Runtime Contract structure

• Contract semantics

• Contract lifecycle

• Validation rules

• Registry interface

• Loader interface

---

# 32. Runtime Contract Extension

Future Runtime capabilities shall be introduced through Contract extension.

Extensions shall satisfy the following principles:

• backward compatible

• non-breaking

• independently testable

• independently versioned

• Architecture reviewed

Extensions shall never invalidate compliant System packages.

---

# 33. Runtime Contract Validation

Every Runtime Contract shall be validated before Runtime execution.

Validation shall verify:

Package

• required files exist

• directory integrity

Schema

• profile schema

• logic schema

• anchors schema

• system_meta schema

Identity

• unique systemId

• canonical identity

• alias consistency

Compatibility

• Runtime Contract version

• Runtime compatibility

• Canonical compatibility

A Contract that fails validation shall not be registered.

---

# 34. Runtime Compatibility Policy

Runtime shall preserve compatibility whenever possible.

Compatibility shall be evaluated in four dimensions.

Architecture

The Runtime Contract structure remains unchanged.

Runtime

The Runtime can consume existing Contracts.

System

Existing Systems remain functional.

Migration

Legacy Systems can migrate incrementally.

Breaking compatibility requires an official SPS revision.

---

# 35. Runtime Contract Migration

When the Runtime Contract evolves:

Step 1

Define the new Contract.

↓

Step 2

Publish updated Schema.

↓

Step 3

Update Canonical System.

↓

Step 4

Validate all Systems.

↓

Step 5

Generate Migration Report.

↓

Step 6

Release Runtime.

Large-scale replacement is prohibited.

Incremental migration is mandatory.

---

# 36. Runtime Contract Audit

Every Runtime Contract shall be auditable.

Audit shall verify:

• Contract completeness

• Registry consistency

• Loader consistency

• Schema compliance

• Runtime compatibility

• Canonical conformity

Audit results shall be documented.

---

# 37. Runtime Contract and Canonical System

The Runtime Contract is validated against the Canonical System.

The Canonical System defines:

• official Contract structure

• official package organization

• official Runtime exposure

Every System shall expose an equivalent Runtime Contract.

The Canonical System is the architectural reference.

It is not a privileged Runtime implementation.

---

# 38. Runtime Contract and Registry

The Registry owns Runtime discovery.

The Runtime Contract owns Runtime communication.

Responsibilities shall never overlap.

Registry responsibilities:

• discover

• register

• locate

• expose

Runtime Contract responsibilities:

• define

• standardize

• isolate

• communicate

---

# 39. Runtime Contract and Application Runtime

Application Runtime shall consume Runtime Contracts only.

Application Runtime shall never:

• inspect JSON files

• parse package structures

• evaluate System definitions

• access package directories

Application Runtime communicates only with Runtime Services and officially exposed Contracts.

---

# 40. Runtime Contract and Domain

Domain modules consume validated Runtime Contracts.

Domain modules shall never:

• modify Contracts

• load System packages

• discover Systems

• interpret Registry implementation

Domain modules remain independent from package organization.

---

# 41. Runtime Contract and Renderer

Renderer shall never consume System Definitions directly.

Renderer receives only Render Models.

Renderer shall not:

• evaluate formulas

• inspect anchors.json

• interpret profile.json

• inspect logic.json

Renderer is completely isolated from System packages.

---

# 42. Runtime Contract and App.jsx

App.jsx shall never interpret System packages.

App.jsx shall never contain:

• System-specific branches

• package loading

• Registry implementation

• Contract creation

• formula evaluation

• anchor lookup

• System normalization

App.jsx shall act solely as the Application Runtime Orchestrator.

---

# 43. Non-Negotiable Rules

The following rules are mandatory.

1.

Every Runtime consumer shall use the Runtime Contract.

2.

No Runtime consumer shall access System JSON directly.

3.

The Registry is the only Runtime discovery mechanism.

4.

The Loader is the only Runtime loading mechanism.

5.

The Runtime Contract is immutable.

6.

Every Contract shall pass validation.

7.

Every Contract shall remain independently testable.

8.

Every Contract shall remain independently replaceable.

9.

Breaking Contract changes require Architecture approval.

10.

The Runtime Contract shall remain the single authoritative interface between Runtime and Systems.

---

# 44. Success Criteria

The Runtime Contract Standard is considered complete only when all of the following conditions are satisfied.

Architecture

✓ Runtime is isolated from System implementation.

✓ Registry and Loader responsibilities are separated.

✓ Contract responsibilities are clearly defined.

Runtime

✓ Every Runtime component consumes the same Contract.

✓ App.jsx contains no System-specific Runtime implementation.

✓ Runtime remains independent from package organization.

Validation

✓ Every Runtime Contract passes validation.

✓ Every Runtime Contract passes Schema verification.

✓ Every Runtime Contract passes Architecture Audit.

Platform

✓ New Systems require no Runtime redesign.

✓ Runtime evolution preserves Contract compatibility.

✓ Runtime supports incremental migration.

✓ Runtime remains extensible.

---

# 45. References

This document shall be interpreted together with the following official standards.

System Platform Standard

```text
System_Architecture_Standard_Guide.md

Canonical_System_Template.md

System_Schema_Definition.md

System_Audit_Guide.md

System_Standardization_Guide.md
```

Application Architecture Standard

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

Together these documents define the official Runtime-System architecture of the 3Cushion AI platform.

---

# 46. Final Statement

The Runtime Contract exists to permanently separate Runtime implementation from System implementation.

Systems may evolve.

Runtime may evolve.

Application may evolve.

Renderer may evolve.

Domain modules may evolve.

However, every Runtime component shall continue to communicate through one stable, versioned, validated, and architecture-governed Runtime Contract.

The Runtime Contract is the permanent communication boundary between the Runtime and every System within the 3Cushion AI platform.

---

End of Document