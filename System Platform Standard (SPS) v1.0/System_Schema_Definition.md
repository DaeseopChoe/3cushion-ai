# System_Schema_Definition.md

Version : v1.0
Status : Official SSOT
Type : System Schema Standard
Author : 3Cushion AI
Last Updated : 2026-07-02

---

# 1. Purpose

This document defines the official Schema Standard for every System supported by the 3Cushion AI platform.

The purpose of this document is to establish a single, authoritative schema specification governing the structure, integrity, consistency, and validation of all System Definition packages.

This document defines the schema requirements only.

Implementation details belong to Runtime and Domain modules.

---

# 2. Scope

This standard applies to every System contained under:

```text
frontend/src/data/systems/
```

including:

• Existing Systems

• Future Systems

• Canonical System

• Runtime-generated System Packages

• Migrated Systems

This standard governs only System Definition packages.

It does not govern Runtime implementation.

---

# 3. Objectives

The Schema Standard exists to achieve the following objectives.

• Standardize every System Definition.

• Eliminate structural ambiguity.

• Support automatic validation.

• Support Runtime compatibility.

• Support Architecture Audit.

• Support Canonical comparison.

• Support automated migration.

• Maintain long-term structural stability.

---

# 4. Schema Philosophy

A Schema defines structure.

A Schema never defines behavior.

Behavior belongs to Runtime.

Calculation belongs to Domain.

Rendering belongs to Renderer.

Application Flow belongs to Application.

The Schema exists solely to describe the official structure of a System.

---

# 5. Architectural Position

Within the System Platform Standard:

```text
System Architecture

↓

Canonical Template

↓

Schema Definition

↓

Validation

↓

Runtime Contract

↓

Runtime
```

Schema Definition is the structural foundation upon which Runtime validation is performed.

---

# 6. Schema Architecture

Every System Package shall conform to one common Schema.

The official package consists of:

```text
profile.json

logic.json

anchors.json

system_meta.json
```

Each file has an independent Schema.

Package validation consists of:

```text
Package Validation

↓

Individual Schema Validation

↓

Cross-file Validation

↓

Canonical Validation

↓

Runtime Validation
```

---

# 7. Schema Design Principles

Every Schema shall satisfy the following principles.

Deterministic

The same System shall always produce the same validation result.

---

Declarative

Schemas describe structure only.

---

Independent

Each package file shall have an independent Schema.

---

Composable

Package validation is constructed from individual Schemas.

---

Stable

Schema revisions shall preserve compatibility whenever possible.

---

Auditable

Every validation failure shall be explainable.

---

Versioned

Schema revisions shall be version controlled.

---

# 8. Common Package Rules

Every System Package shall satisfy the following requirements.

Exactly one package directory.

Exactly four Runtime definition files.

Unique System Identity.

Canonical naming.

No duplicate responsibilities.

No missing required definitions.

No Runtime implementation inside package files.

No executable code.

No Renderer implementation.

No UI implementation.

No Application implementation.

---

# 9. Common Validation Model

Validation shall proceed in five stages.

Stage 1

Directory Validation

↓

Stage 2

File Validation

↓

Stage 3

Schema Validation

↓

Stage 4

Cross-file Validation

↓

Stage 5

Canonical Validation

A System shall pass every stage before Runtime registration.

---

# 10. profile.json Schema Definition

Purpose

profile.json defines the structural identity of a System.

It answers:

"What does this System provide?"

---

Required Responsibilities

profile.json shall define:

• Runtime Profile

• Formula Definitions

• Input Definitions

• Output Definitions

• Supported Runtime Features

• Display Capabilities

• Calculation Configuration

---

Forbidden Responsibilities

profile.json shall never define:

• Runtime logic

• executable algorithms

• UI behavior

• Renderer behavior

• Search implementation

• Dataset implementation

• Application Flow

---

Validation Rules

Validation shall verify:

• required properties

• property types

• property uniqueness

• structural consistency

• Runtime compatibility

• Canonical compatibility

---

# 11. profile.json Design Constraints

profile.json shall satisfy the following constraints.

Declarative only.

Runtime independent.

Platform independent.

Statically verifiable.

Schema compliant.

Backward compatible whenever possible.

Every Runtime shall interpret profile.json through the Runtime Contract.

No Runtime component shall directly depend upon implementation-specific fields.

---

# 12. logic.json Schema Definition

Purpose

logic.json defines declarative System behavior.

It answers:

"How does this System behave?"

---

Required Responsibilities

logic.json shall define:

• correction rules

• synchronization rules

• Runtime behavior definitions

• conditional policies

• special calculation definitions

• System-specific behavior definitions

---

Forbidden Responsibilities

logic.json shall never contain:

• executable code

• Renderer implementation

• Search implementation

• UI behavior

• Dataset implementation

• Application Flow

---

Validation Rules

Validation shall verify:

• logical consistency

• declarative structure

• schema compliance

• Runtime compatibility

• Canonical compatibility

Logic definitions shall remain independent from Runtime implementation.

---

# 13. logic.json Design Constraints

logic.json shall satisfy the following principles.

Declarative.

Deterministic.

Versioned.

Schema-valid.

Runtime independent.

Implementation independent.

Behavior definitions shall remain stable across Runtime revisions.

---

# 14. Schema Versioning

Every Schema shall expose an official version.

Schema versions shall remain independent from:

• Runtime version

• System version

• Application version

Breaking Schema revisions require:

• Architecture Review

• Canonical Update

• Migration Documentation

• Validation Update

---

# 15. Part 1 Summary

This section establishes the architectural foundation of the System Schema Standard.

Subsequent sections define:

• anchors.json Schema

• system_meta.json Schema

• Cross-file Validation

• Runtime Contract Mapping

• Validation Process

• Error Classification

These sections collectively define the complete Schema Standard governing every System within the 3Cushion AI platform.

---

# 16. anchors.json Schema Definition

## Purpose

anchors.json defines the canonical coordinate model of a System.

It answers:

"Where are the official System reference positions?"

The anchor definition shall remain independent from Runtime implementation.

---

## Required Responsibilities

anchors.json shall define:

• Anchor Definitions

• Coordinate Definitions

• Rail Definitions

• Frame Definitions

• Canonical Reference Points

• Symmetry Definitions

• Interpolation References

---

## Forbidden Responsibilities

anchors.json shall never define:

• Formula Definitions

• Runtime Logic

• Calculation Rules

• Search Logic

• Renderer Behavior

• UI Information

• Metadata

---

## Validation Rules

Validation shall verify:

• coordinate integrity

• anchor uniqueness

• coordinate type consistency

• symmetry consistency

• canonical compliance

• Runtime compatibility

---

# 17. anchors.json Design Constraints

anchors.json shall satisfy the following principles.

Coordinate definitions shall be deterministic.

Coordinate definitions shall remain Runtime independent.

Coordinate definitions shall remain Renderer independent.

Anchor identifiers shall be unique.

Coordinate references shall remain immutable unless an official architectural revision is approved.

---

# 18. system_meta.json Schema Definition

## Purpose

system_meta.json defines the identity and capability metadata of a System.

It answers:

"Who is this System?"

Metadata exists only for identification and descriptive purposes.

Metadata shall never affect Runtime behavior.

---

## Required Responsibilities

system_meta.json shall define:

• System Identifier

• Display Name

• Version

• Category

• Aliases

• Description

• Supported Features

• Documentation References

• Release Information

---

## Forbidden Responsibilities

system_meta.json shall never contain:

• formulas

• correction rules

• Runtime behavior

• coordinates

• executable logic

• Renderer information

• UI implementation

---

## Validation Rules

Validation shall verify:

• unique System Identifier

• alias uniqueness

• metadata completeness

• version validity

• canonical naming

• schema compliance

---

# 19. system_meta.json Design Constraints

Metadata shall remain descriptive.

Metadata shall never become executable.

Identity shall remain immutable.

Metadata revisions shall preserve backward compatibility whenever possible.

The Runtime shall never derive calculation behavior from metadata.

---

# 20. Cross-file Validation

Every System Package shall pass Cross-file Validation.

Cross-file Validation verifies that all package files collectively describe one coherent System.

Validation shall verify:

• identity consistency

• package completeness

• version consistency

• Runtime compatibility

• Canonical consistency

• dependency consistency

---

# 21. Identity Rules

Every System shall possess one official identity.

Identity shall be defined in system_meta.json.

All package files shall reference the same identity.

Identity shall never depend upon:

• folder ordering

• display language

• Runtime implementation

• Renderer implementation

Duplicate identities are prohibited.

---

# 22. Dependency Rules

The dependency direction shall always remain:

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

Each package shall contribute only its own responsibility.

Package files shall never depend directly upon one another.

Cross-file interpretation belongs exclusively to the Runtime Contract.

---

# 23. Runtime Contract Mapping

Schema validation shall verify that every package contributes correctly to the Runtime Contract.

Official mapping:

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

No Runtime component shall define alternative mappings.

---

# 24. Canonical Consistency Rules

Every System shall maintain Canonical consistency.

Validation shall compare:

• package organization

• schema structure

• identity model

• Runtime Contract mapping

• dependency direction

Behavior may differ.

Architecture shall remain identical.

---

# 25. Package Completeness Rules

Every Runtime System Package shall contain:

```text
profile.json

logic.json

anchors.json

system_meta.json
```

Missing files are validation failures.

Duplicate Runtime definition files are prohibited.

Additional Runtime definition files require Architecture approval.

---

# 26. Version Compatibility Rules

Schema validation shall verify:

• Schema Version

• Runtime Contract Version

• Canonical Version

• Package Version

Version incompatibility shall generate validation errors.

Version compatibility shall be evaluated before Runtime registration.

---

# 27. Schema Integrity Rules

Schema integrity requires:

• valid structure

• valid property types

• valid required fields

• valid identities

• valid relationships

Integrity violations shall prevent Runtime loading.

---

# 28. Runtime Visibility Rules

Schema validation shall verify Runtime visibility.

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

Presentation components shall never access package definitions.

---

# 29. Schema Compatibility Principles

Schema compatibility shall preserve:

• Runtime compatibility

• Canonical compatibility

• Validation compatibility

• Migration compatibility

Breaking Schema revisions require:

• Architecture approval

• Schema revision

• Migration guide

• Validation update

---

# 30. Part 2 Summary

This section defines:

• anchors.json Schema

• system_meta.json Schema

• Cross-file Validation

• Runtime Contract Mapping

• Dependency Rules

• Version Compatibility

These rules establish the structural consistency required for every System Package before Runtime execution.

---

# 31. Schema Validation Process

Every System Package shall pass the official Schema Validation Process before Runtime registration.

Validation shall proceed in the following order.

```text
Directory Validation

↓

Package Validation

↓

Schema Validation

↓

Cross-file Validation

↓

Canonical Validation

↓

Runtime Contract Validation

↓

Runtime Registration
```

Validation shall stop immediately upon the first critical failure.

No invalid System shall be registered.

---

# 32. Directory Validation

Directory Validation verifies the physical organization of a System.

Validation shall confirm:

• valid System directory

• approved directory name

• required Runtime package files

• duplicate package detection

• illegal Runtime definition files

Directory Validation is the first validation stage.

---

# 33. Package Validation

Package Validation verifies the integrity of individual package files.

Validation shall verify:

• profile.json

• logic.json

• anchors.json

• system_meta.json

Each package shall be:

• readable

• structurally complete

• schema-valid

• independently valid

---

# 34. Canonical Compliance Validation

Every System shall be compared with the Canonical System Template.

Validation shall verify:

Architecture

✓ directory structure

✓ package organization

✓ Runtime Contract mapping

Responsibilities

✓ profile responsibility

✓ logic responsibility

✓ anchors responsibility

✓ metadata responsibility

Dependency

✓ dependency direction

✓ Runtime visibility

✓ package isolation

Behavioral differences are permitted.

Architectural differences are not.

---

# 35. Runtime Contract Validation

Schema Validation shall verify Runtime Contract completeness.

Validation shall confirm that the package exposes:

```text
Runtime Profile

Runtime Logic

Runtime Anchors

Runtime Metadata
```

Every Runtime Contract shall satisfy the official Runtime Contract Standard.

---

# 36. Error Classification

Validation errors shall be classified.

Level A

Critical

Runtime registration prohibited.

Examples:

• missing package

• duplicate identity

• invalid schema

• invalid Runtime Contract

---

Level B

Major

Migration required before Release.

Examples:

• Canonical deviation

• dependency violation

• incomplete metadata

---

Level C

Minor

Architecture improvement recommended.

Examples:

• deprecated property

• optional field omission

• documentation inconsistency

---

Level D

Information

No Runtime impact.

Examples:

• formatting

• ordering

• comments

---

# 37. Migration Validation

Legacy Systems shall pass Migration Validation before becoming Canonical compliant.

Migration Validation shall verify:

• Schema compatibility

• Runtime compatibility

• Architecture compatibility

• Canonical compatibility

• Regression compatibility

Migration shall preserve Runtime behavior.

---

# 38. Release Validation

A System may be released only after passing:

✓ Directory Validation

✓ Package Validation

✓ Schema Validation

✓ Cross-file Validation

✓ Canonical Validation

✓ Runtime Contract Validation

✓ Runtime Validation

Release readiness shall be documented.

---

# 39. Schema Audit

Every Schema shall be auditable.

Schema Audit shall verify:

• package completeness

• property consistency

• identity consistency

• Runtime Contract mapping

• Canonical conformity

Audit findings shall be documented.

---

# 40. Schema Evolution

Schema evolution shall preserve architectural stability.

The following may evolve:

• optional properties

• metadata extensions

• additional capabilities

The following require Architecture approval:

• required properties

• Runtime Contract structure

• package responsibilities

• dependency direction

---

# 41. Schema Migration Policy

Schema migration shall be incremental.

Migration shall never require:

• Runtime redesign

• App.jsx redesign

• Renderer redesign

Migration shall preserve:

• Runtime behavior

• Contract compatibility

• Canonical compatibility

---

# 42. Non-Negotiable Rules

The following rules are mandatory.

1.

Every System shall satisfy the official Schema.

2.

Every Runtime package shall contain:

```text
profile.json

logic.json

anchors.json

system_meta.json
```

3.

Each package shall own exactly one responsibility.

4.

Package responsibilities shall never overlap.

5.

Schema shall remain declarative.

6.

Schema shall never contain executable code.

7.

Schema Validation shall precede Runtime registration.

8.

Every Runtime Contract shall be Schema compliant.

9.

Canonical compliance is mandatory.

10.

Breaking Schema revisions require Architecture approval.

11.

Every Schema shall remain independently versioned.

12.

Every Schema shall remain independently auditable.

---

# 43. Success Criteria

The System Schema Standard is considered complete only when all of the following conditions are satisfied.

Architecture

✓ Every System Package follows the official Schema.

✓ Package responsibilities remain separated.

✓ Runtime Contract mapping is complete.

Validation

✓ Every System passes Schema Validation.

✓ Every System passes Cross-file Validation.

✓ Every System passes Canonical Validation.

✓ Every System passes Runtime Contract Validation.

Migration

✓ Legacy Systems migrate incrementally.

✓ Runtime behavior remains unchanged.

✓ Canonical compatibility is preserved.

Platform

✓ Schema supports automatic validation.

✓ Schema supports automatic auditing.

✓ Schema supports Runtime evolution.

✓ Schema supports future Systems without modification.

---

# 44. References

This document shall be interpreted together with the following official standards.

System Platform Standard

```text
System_Architecture_Standard_Guide.md

System_Runtime_Contract.md

Canonical_System_Template.md

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

These documents collectively define the official Schema Standard governing all Systems within the 3Cushion AI platform.

---

# 45. Final Statement

The purpose of the System Schema Standard is not merely to validate JSON structures.

Its purpose is to establish a permanent structural contract that guarantees every System can participate in the 3Cushion AI platform through a consistent, verifiable, and architecture-compliant definition.

Individual Systems may evolve.

Runtime implementations may evolve.

Renderer implementations may evolve.

Application implementations may evolve.

The Schema Standard shall remain the permanent Source of Truth governing the structural integrity, validation, migration, and long-term evolution of every System supported by the 3Cushion AI platform.

---

End of Document