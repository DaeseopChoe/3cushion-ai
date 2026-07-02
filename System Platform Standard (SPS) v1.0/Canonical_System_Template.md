# Canonical_System_Template.md

Version : v1.0
Status : Official SSOT
Type : Canonical System Definition
Author : 3Cushion AI
Last Updated : 2026-07-02

---

# 1. Purpose

This document defines the official Canonical System Template for the 3Cushion AI platform.

The Canonical System Template establishes the standard structure, responsibilities, and architectural contract that every System shall follow.

It serves as the single architectural reference for:

• Existing Systems

• Future Systems

• Runtime Integration

• Schema Validation

• Architecture Audit

• Migration

The Canonical Template is the official blueprint from which every System shall be derived.

---

# 2. Scope

This document applies to every System contained under:

```text
frontend/src/data/systems/
```

including all current Systems and every System introduced in the future.

This document is independent of:

• Runtime implementation

• Renderer implementation

• UI implementation

• Search implementation

• Dataset implementation

It defines only the canonical architecture of a System.

---

# 3. Canonical Philosophy

Every System shall share one common architecture.

Differences between Systems shall exist only in System Definitions.

Architecture shall never vary.

A System is considered valid because it conforms to the Canonical Template.

The Runtime shall recognize Systems through architectural consistency rather than individual implementation.

---

# 4. Canonical Reference System

The current Canonical Reference is:

```text
5_half_system
```

The Canonical Reference has been selected because it currently provides the most complete implementation of the System Architecture.

It is the architectural reference.

It is not a privileged Runtime implementation.

Future improvements to the Canonical Reference shall preserve architectural compatibility.

---

# 5. Canonical Objectives

The Canonical Template exists to achieve the following objectives.

• Standardize all Systems.

• Eliminate structural variation.

• Simplify Runtime integration.

• Support automatic validation.

• Support automatic migration.

• Enable automated tooling.

• Provide a permanent architectural reference.

• Reduce implementation ambiguity.

---

# 6. Canonical Architecture

Every System shall implement the following architecture.

```text
System

├── Definition

├── Runtime Contract

├── Validation

├── Metadata

└── Integration
```

Each architectural component has one responsibility.

Responsibility overlap is prohibited.

---

# 7. Canonical Directory Structure

Every System shall follow the same directory structure.

```text
system_name/

profile.json

logic.json

anchors.json

system_meta.json
```

No additional Runtime definition files shall exist inside a System unless officially approved.

Supporting documentation may exist outside the Runtime package.

---

# 8. Canonical Package Model

Every System Package consists of four independent definitions.

```text
profile.json

↓

System Definition
```

```text
logic.json

↓

Behavior Definition
```

```text
anchors.json

↓

Coordinate Definition
```

```text
system_meta.json

↓

Identity Definition
```

Together these four files represent one complete System Package.

---

# 9. Package Independence

Each package file has one responsibility.

Each package file shall remain independently maintainable.

Each package file shall remain independently testable.

Each package file shall remain independently replaceable.

Cross-file responsibility duplication is prohibited.

---

# 10. profile.json Standard

profile.json defines

"What the System is."

Typical contents include:

• Formula Definitions

• Input Definitions

• Output Definitions

• Runtime Capabilities

• Display Capabilities

• Supported Calculation Model

• Runtime Exposure

profile.json shall never contain:

• Runtime implementation

• Search logic

• UI definitions

• Rendering logic

• Application Flow

• React implementation

profile.json is declarative.

---

# 11. profile.json Design Principles

profile.json shall be:

• deterministic

• declarative

• versionable

• independently testable

• Runtime independent

Every Runtime shall interpret profile.json through the Runtime Contract.

No Runtime module shall directly interpret implementation-specific fields.

---

# 12. logic.json Standard

logic.json defines

"How the System behaves."

Typical responsibilities include:

• Correction Rules

• Synchronization Rules

• Runtime Decision Rules

• Formula Adjustments

• Conditional Behavior

• Special Calculation Policies

logic.json describes behavior.

It does not execute behavior.

---

# 13. logic.json Design Principles

logic.json shall remain declarative.

Runtime execution belongs to Domain modules.

logic.json shall never contain:

• executable code

• UI behavior

• Renderer behavior

• Search implementation

• Dataset implementation

• Application Flow

Logic Definitions shall remain independent from Runtime implementation.

---

# 14. Canonical Separation Principle

The Canonical Template separates a System into four independent dimensions.

Identity

↓

system_meta.json

Definition

↓

profile.json

Behavior

↓

logic.json

Coordinates

↓

anchors.json

No file shall assume the responsibility of another.

This separation is permanent.

---

# 15. Canonical Consistency

Every System shall expose identical architectural boundaries.

Regardless of internal formulas or coordinate models,

every System shall appear identical to the Runtime.

Architectural consistency is mandatory.

Behavioral diversity is permitted.

---

# 16. anchors.json Standard

anchors.json defines

"Where the System exists."

It is the official coordinate definition of the System.

Typical responsibilities include:

• Coordinate Anchors

• Rail Anchors

• Frame Anchors

• Canonical Positions

• Symmetry Definitions

• Reference Coordinates

anchors.json shall never contain:

• Runtime logic

• Formula definitions

• Correction rules

• Renderer logic

• Search implementation

• UI information

Coordinate definitions shall remain declarative.

---

# 17. anchors.json Design Principles

anchors.json shall satisfy the following principles.

Coordinate Stability

Anchor coordinates shall remain stable across Runtime revisions.

Canonical Consistency

Equivalent anchor concepts shall use equivalent structures.

Runtime Independence

Anchor definitions shall not depend upon Runtime implementation.

Symmetry Preservation

Symmetry definitions shall remain independent from Runtime algorithms.

Validation

Every anchor definition shall be schema-valid.

---

# 18. system_meta.json Standard

system_meta.json defines

"Who the System is."

It provides identity and capability metadata.

Typical responsibilities include:

• System Identifier

• Display Name

• Category

• Aliases

• Version

• Description

• Supported Runtime Features

• Documentation References

• Release Information

system_meta.json shall never contain:

• formulas

• calculations

• Runtime behavior

• correction logic

• coordinates

• UI implementation

---

# 19. system_meta.json Design Principles

Metadata shall be descriptive.

Metadata shall not influence Runtime calculation.

Metadata shall remain stable throughout the System lifecycle.

Identity shall never depend upon:

• display language

• folder ordering

• Runtime implementation

• Renderer implementation

Identity shall remain immutable.

---

# 20. Runtime Integration

Every Canonical System shall integrate with Runtime through the official Runtime Contract.

The integration flow is:

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

Domain

↓

Renderer

↓

Presentation
```

No System shall bypass the Runtime Contract.

---

# 21. Registry Integration

Every Canonical System shall be registered through the official Registry.

The Registry shall be responsible for:

• System Discovery

• Registration

• Lookup

• Runtime Exposure

• Validation Entry

The Registry shall never interpret System behavior.

---

# 22. Loader Integration

The Loader shall transform the Canonical System into a Runtime Contract.

Loader responsibilities include:

• locating the System

• loading package definitions

• validating package integrity

• constructing Runtime Contract

• exposing Runtime-ready objects

The Loader shall never calculate System values.

---

# 23. Runtime Contract Mapping

The Runtime Contract is constructed from the Canonical Package.

The mapping is defined as:

```text
profile.json

↓

Runtime Profile
```

```text
logic.json

↓

Runtime Logic
```

```text
anchors.json

↓

Runtime Anchor Model
```

```text
system_meta.json

↓

Runtime Metadata
```

These four Runtime models together form one Runtime Contract.

No Runtime consumer shall construct Runtime Contracts independently.

---

# 24. Dependency Rules

The dependency direction shall always remain:

```text
Canonical System

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

Reverse dependency is prohibited.

The following are forbidden:

• Renderer reading JSON files

• UI reading System packages

• Domain loading package files

• Application parsing coordinates

• Runtime interpreting package structures

---

# 25. Package Isolation

Every package shall remain isolated.

Changes to one package shall not require modifications to another package unless the Runtime Contract changes.

Package responsibilities shall remain independent.

Package implementation shall remain replaceable.

---

# 26. Canonical Runtime Visibility

Visibility shall be strictly controlled.

Application Runtime

↓

Runtime Contract

Domain

↓

Validated Runtime Models

Renderer

↓

Render Models

Presentation

↓

View Models

Presentation Components shall never access System Definitions.

---

# 27. Canonical Runtime Independence

The Runtime shall never depend upon:

• individual System names

• package ordering

• folder hierarchy

• formula implementation

• coordinate implementation

• correction implementation

The Runtime shall depend only upon the Runtime Contract.

---

# 28. Canonical Versioning

Every Canonical System shall support version management.

Version information shall be maintained independently from Runtime implementation.

Canonical revisions shall preserve architectural compatibility.

Breaking architectural changes require:

• Architecture Review

• Schema Update

• Validation Update

• Migration Documentation

---

# 29. Canonical Compatibility

Every Canonical System shall remain compatible with:

• Runtime Contract

• Registry

• Loader

• Schema Definition

• Architecture Standard

Compatibility shall be verified before Runtime usage.

---

# 30. Canonical Lifecycle

Every Canonical System follows the same lifecycle.

```text
Design

↓

Package Creation

↓

Schema Validation

↓

Registry Registration

↓

Runtime Contract Generation

↓

Runtime Validation

↓

Release

↓

Maintenance

↓

Migration
```

The lifecycle shall remain identical for every System.

---

# 31. New System Creation Workflow

Every new System shall be created from the Canonical System Template.

The approved workflow is:

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

Schema Validation

↓

Registry Registration

↓

Runtime Contract Generation

↓

Runtime Validation

↓

Release
```

No Runtime source code shall require modification during this process.

---

# 32. Canonical Validation

Every Canonical System shall pass validation before Runtime registration.

Validation shall verify:

Package Validation

• directory structure

• required files

• package integrity

Schema Validation

• profile schema

• logic schema

• anchors schema

• system_meta schema

Architecture Validation

• Runtime Contract compliance

• Canonical Architecture compliance

• Dependency compliance

Identity Validation

• unique System ID

• alias consistency

• version consistency

Only validated Systems may participate in Runtime execution.

---

# 33. Canonical Audit

Every System shall be audited against the Canonical Template.

Audit objectives include:

• Architecture compliance

• Package completeness

• Schema compliance

• Runtime compatibility

• Naming consistency

• Dependency verification

• Contract verification

Audit results shall classify Systems as:

```text
COMPLIANT

MINOR DEVIATION

MAJOR DEVIATION

NON-COMPLIANT
```

Audit findings shall be documented before migration.

---

# 34. Canonical Migration

Existing Systems shall migrate toward the Canonical Template.

Migration shall preserve:

• Runtime behavior

• calculation results

• trajectory generation

• Search compatibility

• Dataset compatibility

• Runtime Contract

Migration shall never introduce Runtime exceptions.

Migration shall be incremental.

Large-scale replacement is prohibited.

---

# 35. Extension Rules

Future extensions shall comply with the Canonical Architecture.

Extensions may introduce:

• additional metadata

• additional Runtime capabilities

• additional validation information

Extensions shall never alter:

• package responsibilities

• Runtime Contract

• dependency direction

• architectural boundaries

Architectural stability shall always take precedence over implementation convenience.

---

# 36. Architecture Compliance

Every System shall satisfy the following requirements.

Architecture

✓ Canonical directory structure

✓ Canonical package model

✓ Canonical Runtime Contract

✓ Canonical dependency rules

Package

✓ profile responsibility

✓ logic responsibility

✓ anchors responsibility

✓ metadata responsibility

Runtime

✓ Registry compatibility

✓ Loader compatibility

✓ Runtime Contract compatibility

Validation

✓ Schema compliant

✓ Architecture compliant

✓ Runtime validated

Only compliant Systems shall be released.

---

# 37. Non-Negotiable Rules

The following rules are mandatory.

1.

Every System shall contain exactly four Runtime definition files.

```text
profile.json

logic.json

anchors.json

system_meta.json
```

2.

Each file shall have one responsibility.

3.

Runtime shall communicate only through the Runtime Contract.

4.

No Runtime module shall inspect internal package implementation.

5.

No Application component shall directly load System packages.

6.

No Renderer component shall interpret System Definitions.

7.

No Presentation component shall access System JSON.

8.

No System shall require App.jsx modification.

9.

No System shall introduce Runtime exceptions.

10.

Every System shall pass Schema Validation.

11.

Every System shall pass Architecture Audit.

12.

Every System shall remain independently maintainable.

13.

Every System shall remain independently testable.

14.

Every System shall remain independently replaceable.

15.

The Canonical Template shall remain the permanent architectural reference.

---

# 38. Success Criteria

The Canonical System Template is considered complete only when all of the following conditions are satisfied.

Architecture

✓ Every System follows the Canonical Architecture.

✓ Every System exposes the same Runtime Contract.

✓ Every System follows identical package responsibilities.

Runtime

✓ New Systems require no Runtime redesign.

✓ App.jsx remains an Application Runtime Orchestrator.

✓ Runtime contains no System-specific implementation.

Validation

✓ Every System passes Schema Validation.

✓ Every System passes Runtime Validation.

✓ Every System passes Architecture Audit.

Migration

✓ Legacy Systems migrate incrementally.

✓ Runtime behavior remains unchanged.

✓ Canonical compatibility is preserved.

Platform

✓ New Systems can be created from this template.

✓ New Systems integrate without Runtime modification.

✓ Canonical Architecture remains stable.

---

# 39. References

This document shall be interpreted together with the following official standards.

System Platform Standard

```text
System_Architecture_Standard_Guide.md

System_Runtime_Contract.md

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

Together these documents define the official Canonical System Platform of the 3Cushion AI project.

---

# 40. Final Statement

The Canonical System Template is the permanent architectural blueprint for every System within the 3Cushion AI platform.

Its purpose is not to define a particular billiard System.

Its purpose is to define the common architectural foundation shared by all Systems.

Individual formulas may differ.

Individual coordinate models may differ.

Individual behaviors may differ.

However, every System shall remain structurally identical, architecturally compliant, Runtime-compatible, and fully interchangeable through one unified Runtime Contract.

The Canonical System Template is the permanent Source of Truth governing the creation, validation, migration, and long-term evolution of every System supported by the 3Cushion AI platform.

---

End of Document