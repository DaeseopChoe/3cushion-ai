# AAS_Release_Normalization_Guide.md

# 3Cushion AI Application Architecture Standard (AAS) v2.0  
## Release Normalization Guide

Version: v1.0  
Status: Working Rulebook  
Date: 2026-06-29  
Owner: 3Cushion AI Architecture  
Purpose: Chapter01~20 Release Edition normalization, Specification/Cursor separation, terminology unification, duplication control

---

# 0. How to Use This Guide

This guide is the working rulebook for converting the current AAS Chapter files into Release Edition documents.

Cursor must apply this guide before editing any Chapter file.

The goal is not to rewrite the architecture.
The goal is to normalize the existing SSOT into two separate document families:

```text
Architecture Standard Documents
Cursor Work Order Documents
```

Architecture Standard Documents define **what the architecture is**.  
Cursor Work Order Documents define **how to implement or migrate it**.

---

# 1. Release Normalization Goal

The Release Edition must convert the current Chapter01~20 files into a clean AAS v2.0 structure.

Final structure:

```text
Application Architecture Standard (AAS) v2.0/

├── Architecture_Constitution.md
├── Architecture_Dictionary.md
├── Release_Notes.md
│
├── Chapter/
│   ├── Chapter01_App_Authority.md
│   ├── Chapter02_Layer_Architecture.md
│   ├── ...
│   └── Chapter20_Regression_Release_Rule.md
│
└── Cursor/
    ├── Cursor_Chapter01_App_Authority.md
    ├── Cursor_Chapter02_Layer_Architecture.md
    ├── ...
    └── Cursor_Chapter20_Regression_Release_Rule.md
```

The Release Edition must satisfy the following:

1. Each Chapter is a Specification.
2. Each Cursor file is a Work Order.
3. Specification and Cursor content must not be mixed.
4. Architecture terms must follow `Architecture_Dictionary.md`.
5. Architecture rules must not conflict with `Architecture_Constitution.md`.
6. Specifications must not become larger by adding new explanations.
7. The original SSOT information must be preserved unless it belongs in Cursor documents.
8. Repeated content must be reduced or referenced.
9. Current implementation must not be contradicted.
10. The finished documents must be usable by Cursor without further interpretation.

---

# 2. Source of Truth Priority

When documents conflict, apply the following priority order.

```text
1. Architecture_Constitution.md
2. Architecture_Dictionary.md
3. frontend/src/App.jsx
4. PROJECT_MASTER_INDEX.md
5. Current Chapter01~20 source files
6. Existing Cursor drafts or previous generated outputs
```

## 2.1 Architecture_Constitution.md

Use as the highest architecture rule source.

It defines:

- App.jsx as Orchestrator
- Layer responsibility
- Dependency direction
- System SSOT structure
- Dataset SSOT rule
- Cursor Mode rule
- Architecture violation definitions
- Regression requirement

Do not repeat long Constitution explanations in Chapter documents.
Reference them instead.

## 2.2 Architecture_Dictionary.md

Use as the official terminology source.

If a Chapter uses non-standard terms, replace them with official terms.

Examples:

| Do Not Use | Use |
|---|---|
| Logic Layer | Domain Layer |
| Engine Layer | Domain Layer |
| Business Layer | Application Layer |
| System Config | System Definition |
| Data Layer | Dataset Layer |
| Calculation Engine | Calculation Domain |
| Search Engine | Search Domain |
| Trajectory Engine | Trajectory Domain |
| View Data | ViewModel |

## 2.3 App.jsx

Use as the current implementation reference.

Specification must not claim that a function is already moved or fully implemented if App.jsx still contains it.

When architecture target and current implementation differ, write:

```text
Requirement:
...

Current implementation may still contain transitional direct calls.
Such calls are migration targets and must not be treated as final architecture.
```

Do not falsely describe target state as current state.

## 2.4 PROJECT_MASTER_INDEX.md

Use for current project status, feature state, Dataset Architecture state, USER UX state, and known issues.

Do not preserve outdated Chapter statements that contradict current PROJECT_MASTER_INDEX state.

Examples:

- USER System Lesson is currently held / hidden if PROJECT_MASTER_INDEX says so.
- Published Dataset is Production Corpus SSOT.
- USER core UX is AI / HP-T / Trajectory centered if current state says so.

---

# 3. Release Philosophy

AAS is an Architecture Standard.

Therefore:

```text
AAS Chapter = What
Cursor document = How
```

## 3.1 AAS Chapter

A Chapter answers:

- What is defined?
- What is in scope?
- What is the rule?
- What is allowed?
- What is prohibited?
- What is the structure?
- What is the success condition?
- What documents does it depend on?

## 3.2 Cursor Work Order

A Cursor document answers:

- How should Cursor inspect it?
- What files should be touched?
- What phases should be executed?
- What migration steps should be followed?
- What should be checked?
- What regression must pass?
- What is the completion condition?

## 3.3 Do Not Create a New Architecture

Do not invent architecture during normalization.

Allowed:

- Reorganize existing content.
- Move implementation content to Cursor file.
- Normalize terminology.
- Remove duplication.
- Add concise references.
- Correct outdated statements using current SSOT.

Not allowed:

- Add new architecture concepts not found in SSOT.
- Add long teaching explanations.
- Expand Chapters beyond source intent.
- Add implementation details to Specification.
- Add design opinions not present in source.
- Change current system behavior.

---

# 4. Global Normalization Rules

Apply these rules to every Chapter.

## Rule 01. Preserve SSOT Intent

Do not rewrite the meaning of the source Chapter.

The output should be a cleaned Specification, not a new document.

## Rule 02. Separate Specification and Cursor

Move all implementation, migration, checklist, build, commit, and Cursor instructions out of Specification and into Cursor document.

## Rule 03. Remove Cursor Content from Specification

Specification must not contain:

```text
Ask Mode
Agent Mode
Cursor Work Order
Execution Plan
Migration Plan
Phase implementation steps
Checklist
Commit message
Build command
Regression procedure
Git status
Risk assessment for editing
```

## Rule 04. Keep Architecture Rules in Specification

Specification may contain:

```text
Purpose
Scope
Principles
Definitions
Rules
Allowed responsibilities
Prohibited responsibilities
Structure
Boundary
Success Criteria
References
```

## Rule 05. Do Not Expand the Source

Do not make the Chapter longer by adding explanatory material.

The normal result should usually be shorter than the original because Cursor material is removed.

## Rule 06. Do Not Repeat the Constitution

If a rule is already fully defined in `Architecture_Constitution.md`, summarize it in one line and reference the Constitution.

Example:

Instead of repeating all App.jsx Orchestrator rules, write:

```text
App.jsx follows the Orchestrator authority defined in Architecture_Constitution.md.
```

## Rule 07. Do Not Repeat Dictionary Definitions

If a term is already defined in `Architecture_Dictionary.md`, use the term without redefining it unless the Chapter needs a Chapter-specific boundary.

## Rule 08. Keep Chapter-Specific Rules

Only keep rules that are specific to that Chapter.

Example:

- Chapter01 keeps App.jsx authority rules.
- Chapter02 keeps Layer responsibility rules.
- Chapter12 keeps Dataset Domain rules.

## Rule 09. Convert Examples Carefully

Keep examples only when they are needed to define a boundary.

Remove examples that are tutorial-style or implementation-style.

## Rule 10. Use Official Terms

Apply Dictionary terms consistently.

Examples:

- Application Runtime
- Application Layer
- Domain Layer
- System Layer
- Dataset Layer
- Infrastructure
- Runtime Context
- Runtime State
- Runtime Flow
- Runtime Dispatcher
- Runtime Coordinator
- Runtime Loader
- Runtime Service
- Calculation Domain
- Trajectory Domain
- Search Domain
- History Domain
- Profile Definition
- Logic Definition
- Anchor Definition
- System Definition
- Canonical Dataset
- ViewModel

## Rule 11. Standardize App.jsx Description

Use:

```text
App.jsx is the Application Runtime Orchestrator.
```

Do not use inconsistent alternatives such as:

```text
Main app
Application engine
Root logic file
Runtime manager
UI engine
```

## Rule 12. Standardize System Files

Use:

```text
Profile Definition
Logic Definition
Anchor Definition
System Meta Definition
System Definition
```

For actual filenames, preserve:

```text
profile.json
logic.json
anchors.json
system_meta.json
```

## Rule 13. Standardize Dataset Terms

Use:

```text
Working Dataset
Workspace History
Published Dataset
Published Corpus SSOT
Canonical Dataset
```

Do not use vague terms such as:

```text
data
DB
local DB
saved data
search data
```

unless quoting current UI label.

## Rule 14. Preserve Current UI Terms Only Where Needed

If UI labels are part of current product behavior, preserve them as labels.

Example:

```text
ADMIN 로컬DB
USER Search
동선
두께/타점
AI
```

But do not use UI labels as architecture terms.

## Rule 15. Avoid Future Promises in Specification

Do not write:

```text
will be implemented
Cursor will create
future phase will migrate
```

Instead write:

```text
Requirement:
...
```

Implementation steps belong in Cursor files.

## Rule 16. Mark Transitional State Accurately

If the current code has not yet reached the architecture target, write:

```text
This is a target architecture rule.
Current transitional direct calls are migration targets.
```

Do not claim the migration is complete unless current App.jsx confirms it.

## Rule 17. Do Not Change Behavior

Normalization is documentation editing.

It must not imply changes to:

- calculation result
- Dataset path
- Published Dataset fetch
- Search profile
- Trajectory display
- Overlay behavior
- USER UX
- ADMIN UX

## Rule 18. No Hidden Architecture Change

If a statement changes architecture meaning, it must not be introduced silently.

Only normalize existing meaning or correct it against higher SSOT.

## Rule 19. Use Compact Tables

Use tables only when they clarify boundaries.

Avoid large tables if a concise bullet list is enough.

## Rule 20. References Are Required

Every Specification must end with `References`.

References should include only relevant documents, not all project files.

## Rule 21. Cursor Documents Must Start with Cursor Mode

Every Cursor document must begin with:

```text
[Cursor Mode: Ask]
```

Actual modification steps must be under:

```text
[Cursor Mode: Agent]
```

## Rule 22. Cursor Run / Accept Rule

If Cursor asks whether to Run or Accept, answer only:

```text
Run
```

or

```text
Accept
```

unless there is risk of:

- data loss
- large structural change
- SSOT violation
- unintended modification

## Rule 23. Small Unit Rule

Cursor must perform small changes.

Do not request a single large refactor across all Chapters unless the task is documentation-only and well-scoped.

## Rule 24. Build and Regression Rule

Cursor Work Orders must include regression checks when code or structure changes.

If the task is documentation-only, specify that runtime behavior must not change.

## Rule 25. File Naming Must Be Stable

Specification:

```text
ChapterXX_Original_Name.md
```

Cursor:

```text
Cursor_ChapterXX_Original_Name.md
```

Use original Chapter filename after `ChapterXX_`.

Do not rename Chapter meaning.

## Rule 26. Chapter04 Split Rule

Chapter04 is large.

If file output size becomes too large, split only the Specification into:

```text
Chapter04_Application_Runtime_Model_Specification_Part1.md
Chapter04_Application_Runtime_Model_Specification_Part2.md
Chapter04_Application_Runtime_Model_Specification_Part3.md
```

Cursor file remains one file unless it also exceeds practical editing size.

## Rule 27. Release Notes Are Not Chapter Content

Do not put release history or change log into Chapter Specifications unless it is part of normative revision history.

## Rule 28. Revision History Must Be Minimal

Use a short revision table.

Do not include full migration history.

## Rule 29. Avoid Markdown Noise

Do not overuse horizontal lines, emoji, decorative markers, or repeated headings.

## Rule 30. Korean/English Consistency

Use English for official architecture terms.
Use Korean for explanatory sentences if the source is Korean.

Example:

```text
Application Layer는 Runtime Flow를 조정한다.
```

---

# 5. Specification Document Standard

Each Specification should use this structure unless the source Chapter requires a minor variation.

```text
# ChapterXX_Title

Version: v2.0
Status: Release Edition
Parent: Architecture_Constitution.md
Depends on: ...
Scope: ...

## 1. Purpose
## 2. Scope
## 3. Principles
## 4. Definitions
## 5. Rules
## 6. Structure
## 7. Prohibited Responsibilities / Violations
## 8. Success Criteria
## 9. References
## Revision History
```

## 5.1 Required Sections

### Purpose

State what the Chapter defines.

Keep it short.

### Scope

List what is included.

Do not include migration steps.

### Principles

List normative rules.

### Definitions

Define only Chapter-specific terms.

Use Dictionary terms without redefining if already defined.

### Rules

This is the main part.

Use:

```text
Requirement:
Allowed:
Prohibited:
```

where useful.

### Structure

Show file or layer structure only if it is part of architecture definition.

### Prohibited Responsibilities / Violations

List what must not happen.

### Success Criteria

Write architecture compliance criteria.

Not runtime test steps.

### References

List direct source documents.

### Revision History

Minimal table.

---

# 6. Cursor Document Standard

Each Cursor document should use this structure.

```text
[Cursor Mode: Ask]

# Cursor_ChapterXX_Title

## 1. Purpose
## 2. Ask Mode
## 3. Analysis Targets
## 4. Required Output
## 5. Restrictions

[Cursor Mode: Agent]

## 6. Agent Phase 1
## 7. Agent Phase 2
## 8. Deliverables
## 9. Regression
## 10. Completion Criteria
```

## 6.1 Cursor Document Must Include

- Ask Mode
- Agent Mode
- Phase
- Migration
- Refactoring Order
- Checklist
- Deliverables
- Regression
- Completion Criteria

## 6.2 Cursor Document Must Not Include

- Architecture definitions
- Long theory
- Repeated Constitution content
- New architecture decision
- Tutorial explanation

## 6.3 Cursor Ask Mode Must Be Used For

- impact analysis
- file identification
- design review
- Git status
- refactoring plan
- dependency audit

## 6.4 Cursor Agent Mode Must Be Used For

- code edit
- file creation
- document generation
- test execution
- commit
- push

## 6.5 Cursor Restrictions Format

Every Cursor task should include a restriction block.

Example:

```text
Forbidden:
- Do not change runtime behavior.
- Do not change calculation output.
- Do not change Dataset path.
- Do not change Search profile.
- Do not change UI layout unless explicitly requested.
```

---

# 7. Chapter Responsibility Matrix

Use this matrix to prevent duplication.

| Chapter | Responsibility | Must Define | Must Not Define |
|---|---|---|---|
| Chapter01 App Authority | App.jsx authority | App.jsx allowed/prohibited responsibility | Full Layer model, full migration plan |
| Chapter02 Layer Architecture | Layer boundaries | Presentation/Application/Domain/System/Dataset/Infrastructure boundaries | App.jsx detailed authority already in Chapter01 |
| Chapter03 Dependency Rule | Dependency direction | allowed/forbidden dependency | Full Layer description already in Chapter02 |
| Chapter04 Application Runtime Model | Runtime model | Runtime Context/State/Flow/Dispatcher/Coordinator/Loader/Service | Cursor migration details in Specification |
| Chapter05 App.jsx Dissection | App.jsx responsibility inventory | current App responsibility categories | Layer theory repeated from Chapter02 |
| Chapter06 Runtime Refactoring Phase | refactoring phase standard | phase sequence, phase boundary | architecture theory |
| Chapter07 Application Layer Specification | Application Layer rules | Runtime Flow and coordination | Domain calculation logic |
| Chapter08 System Loader Specification | System loading rules | System Definition loading, registry | System file schemas in Chapter16~19 |
| Chapter09 Domain Architecture | Domain Layer structure | Domain boundaries and subdomains | Layer overview repeated from Chapter02 |
| Chapter10 Calculation Domain | Calculation Domain | formula/calculation boundary | Trajectory/Search/Dataset rules |
| Chapter11 Trajectory Domain | Trajectory Domain | trajectory generation/display boundary | calculation formula rules |
| Chapter12 Dataset Domain | Dataset Domain | Working/History/Published Dataset rules | Search algorithm details |
| Chapter13 Search Domain | Search Domain | Search/Recall boundary and profile use | Dataset storage schema except as reference |
| Chapter14 History Domain | History Domain | Workspace History rules | Dataset export architecture beyond reference |
| Chapter15 AI Lesson Domain | AI/Lesson Domain | ViewModel, AI/Lesson boundary | current UI implementation details |
| Chapter16 Profile JSON SSOT | Profile Definition | profile.json role/schema principles | logic/anchor/meta details |
| Chapter17 Logic JSON SSOT | Logic Definition | logic.json role/schema principles | profile/anchor/meta details |
| Chapter18 Anchors JSON SSOT | Anchor Definition | anchors.json role/schema principles | calculation formula implementation |
| Chapter19 System Meta JSON SSOT | System Meta Definition | system_meta.json role/schema principles | profile/logic/anchor details |
| Chapter20 Regression Release Rule | Release regression | compliance, build, regression, release criteria | Chapter-specific architecture rules repeated in full |

---

# 8. Chapter-by-Chapter Normalization Notes

## 8.1 Chapter01 App Authority

Keep:

- App.jsx as Orchestrator
- What / How separation
- System-Agnostic rule
- allowed/prohibited responsibilities
- dependency boundary

Move to Cursor:

- App responsibility inventory tasks
- boundary marking steps
- facade creation plan
- commit rules
- regression checklist

Remove or shorten:

- long examples already covered by Constitution
- repeated Layer summary better handled in Chapter02

## 8.2 Chapter02 Layer Architecture

Keep:

- Layer structure
- Layer responsibility
- dependency direction
- boundary rule
- violation examples

Move to Cursor:

- folder skeleton creation
- classification report creation
- audit report creation
- implementation steps

Avoid duplication:

- Do not re-explain all App.jsx authority from Chapter01.
- Do not re-explain all dependency details from Chapter03.

## 8.3 Chapter03 Dependency Rule

Keep:

- allowed dependency direction
- forbidden dependency direction
- import boundary
- direct dependency violation

Move to Cursor:

- dependency audit commands
- file movement plan
- import rewrite phases

Avoid duplication:

- Do not repeat Layer definitions from Chapter02.

## 8.4 Chapter04 Application Runtime Model

Keep:

- Runtime Context
- Runtime State
- Runtime Flow
- Runtime Dispatcher
- Runtime Coordinator
- Runtime Loader
- Runtime Service
- Runtime model relationship

Move to Cursor:

- extraction phases
- hook movement
- implementation checklist
- build and regression steps

Split if needed into Part1~Part3.

## 8.5 Chapter05 App.jsx Dissection

Keep:

- responsibility categories
- current App.jsx decomposition principles
- authority violation categories
- target dissection model

Move to Cursor:

- line-by-line inventory process
- marking tasks
- refactor phase tasks

Avoid duplication:

- Do not repeat Chapter01 authority rules except by reference.

## 8.6 Chapter06 Runtime Refactoring Phase

Keep:

- phase definition
- phase boundaries
- release sequencing rule
- small-unit rule

Move to Cursor:

- exact commands
- branch/commit workflow
- per-phase edit list

## 8.7 Chapter07 Application Layer Specification

Keep:

- Application Layer definition
- Runtime Flow responsibilities
- coordination contract
- non-calculation rule

Move to Cursor:

- flow file creation
- App handler wrapping steps
- migration order

## 8.8 Chapter08 System Loader Specification

Keep:

- System Loader role
- System Definition loading rule
- registry rule
- no manual import rule

Move to Cursor:

- file creation steps
- loader implementation phases
- tests

## 8.9 Chapter09 Domain Architecture

Keep:

- Domain Layer purpose
- subdomain boundaries
- pure logic rule
- React independence rule

Move to Cursor:

- folder migration
- utils-to-domain movement plan

## 8.10 Chapter10 Calculation Domain

Keep:

- Calculation Domain responsibility
- formula evaluation boundary
- system value rule
- correction boundary

Move to Cursor:

- file extraction steps
- calculation regression cases

## 8.11 Chapter11 Trajectory Domain

Keep:

- Trajectory Domain responsibility
- path/node/impact/reflection/display cap boundary
- separation from Presentation

Move to Cursor:

- migration tasks
- smoke tests
- regression checklist

## 8.12 Chapter12 Dataset Domain

Keep:

- Working Dataset
- Workspace History
- Published Dataset
- Published Corpus SSOT
- dataset/ must not be ignored
- Production delivery rule

Move to Cursor:

- loader refactor
- export validation
- path checks

## 8.13 Chapter13 Search Domain

Keep:

- Search Domain responsibility
- Search/Recall boundary
- profile contract
- corpus boundary

Move to Cursor:

- search profile audit
- recall comparison tests
- threshold verification

## 8.14 Chapter14 History Domain

Keep:

- Workspace History definition
- history snapshot rule
- load/delete/export boundary

Move to Cursor:

- storage adapter migration
- UI wiring steps

## 8.15 Chapter15 AI Lesson Domain

Keep:

- AI ViewModel boundary
- Lesson ViewModel boundary
- USER read-only model rule
- System Lesson current state if applicable

Move to Cursor:

- UI cleanup
- ViewModel extraction tasks
- regression

## 8.16 Chapter16 Profile JSON SSOT

Keep:

- profile.json purpose
- allowed content
- prohibited content
- schema responsibility

Move to Cursor:

- schema validation task
- profile audit task

## 8.17 Chapter17 Logic JSON SSOT

Keep:

- logic.json purpose
- correction and branch rule
- system-specific rule location

Move to Cursor:

- logic audit
- system-specific extraction task

## 8.18 Chapter18 Anchors JSON SSOT

Keep:

- anchors.json purpose
- coordinate/anchor responsibility
- interpolation/display anchor boundary

Move to Cursor:

- anchor validation
- symmetry checks if source includes them

## 8.19 Chapter19 System Meta JSON SSOT

Keep:

- system_meta.json purpose
- identity/display/support metadata
- no calculation rule

Move to Cursor:

- metadata audit
- completeness check

## 8.20 Chapter20 Regression Release Rule

Keep:

- release criteria
- regression categories
- compliance checklist
- no-regression rule

Move to Cursor:

- exact command steps
- test execution order
- commit/push instructions

---

# 9. Duplication Resolution Rules

When the same content appears in multiple places, use these rules.

## 9.1 Constitution vs Chapter

If Constitution defines the rule generally, Chapter should only state the Chapter-specific application.

Example:

Constitution:

```text
App.jsx is Orchestrator.
```

Chapter01:

```text
Chapter01 applies the Orchestrator rule to App.jsx authority boundaries.
```

## 9.2 Dictionary vs Chapter

If Dictionary defines a term, do not redefine it.

Chapter may define only a Chapter-specific scope.

Example:

```text
Application Layer is used as defined in Architecture_Dictionary.md.
In this Chapter, the term refers specifically to user/admin Runtime Flow coordination.
```

## 9.3 Chapter vs Chapter

Keep each topic in its responsible Chapter.

Example:

- Dependency direction belongs to Chapter03.
- Layer responsibility belongs to Chapter02.
- App.jsx authority belongs to Chapter01.
- Regression belongs to Chapter20.

If another Chapter needs it, add a reference.

## 9.4 Specification vs Cursor

If a paragraph says what the architecture requires, keep in Specification.

If it says how Cursor should change files, move to Cursor.

## 9.5 Current State vs Target State

If source mixes current state and target state:

- Specification keeps target rule.
- Cursor document handles migration from current to target.
- If current implementation is important, write it as transitional note.

---

# 10. Terminology Normalization Rules

Apply these replacements consistently.

| Replace | With |
|---|---|
| App | App.jsx or Application Runtime depending on context |
| Application | Application Runtime when referring to whole runtime |
| Business Layer | Application Layer |
| Logic Layer | Domain Layer |
| Engine Layer | Domain Layer |
| Data Layer | Dataset Layer |
| System Config | System Definition |
| Profile | Profile Definition when architectural |
| Logic | Logic Definition when architectural |
| Anchor | Anchor Definition when architectural |
| Data | Dataset when referring to stored corpus |
| View Data | ViewModel |
| Calculation Engine | Calculation Domain |
| Search Engine | Search Domain |
| Trajectory Engine | Trajectory Domain |
| History Manager | History Domain or Runtime Coordinator depending on context |

## 10.1 Preserve Code Identifiers

Do not rename actual code identifiers unless the task explicitly includes code migration.

Examples to preserve:

```text
profile.json
logic.json
anchors.json
system_meta.json
positions_dataset
workspace_history
dataset/{공략}/{시스템}/positions.json
userStrict
adminStrict
adminSearch
```

## 10.2 Preserve UI Labels

UI labels may stay as product labels:

```text
Search
Reset
AI
두께/타점
동선
ADMIN 로컬DB
```

But do not treat them as architecture terms.

---

# 11. App.jsx Consistency Rules

Specification must align with current App.jsx and target architecture.

## 11.1 App.jsx Authority

App.jsx may:

- boot the Application Runtime
- coordinate Runtime State
- dispatch events
- compose screens
- route overlays
- pass results to Presentation components

App.jsx must not:

- calculate formulas
- implement System-specific rules
- generate Trajectory
- calculate Caption
- merge Dataset
- implement Search scoring
- generate AI/Lesson text

## 11.2 Transitional Direct Calls

If App.jsx currently imports Domain modules directly, do not describe that as compliant final state.

Write:

```text
Direct Domain calls from App.jsx are transitional and must be routed through Application Layer over time.
```

## 11.3 System-Agnostic Rule

Do not allow new App.jsx code such as:

```ts
if (systemId === "5_half_system") {}
switch (systemId) {}
```

Existing cases are migration targets.

---

# 12. Dataset and Production Search Rules

Dataset Architecture must be normalized with current SSOT.

## 12.1 Published Dataset Rule

Keep this rule wherever Dataset Architecture is defined:

```text
dataset/ is the Published Corpus SSOT.
It must not be included in .gitignore.
Production Search fetches dataset/{shotType}/{systemName}/positions.json as a static asset.
```

## 12.2 Dataset Types

Use exactly:

```text
Working Dataset
Workspace History
Published Dataset
```

## 12.3 Search Corpus Boundary

Use current corpus boundary:

```text
USER Search uses Published Dataset.
ADMIN Search uses Published Dataset.
ADMIN 로컬DB uses Working Dataset.
```

## 12.4 Do Not Change Dataset Path

Cursor Work Orders must forbid changing:

```text
dataset/{공략}/{시스템}/positions.json
```

---

# 13. USER UX Current-State Rules

When a Chapter mentions USER UX, apply current SSOT.

Current USER UX is centered on:

```text
AI
두께/타점
동선
```

System Lesson may exist in preserved code, but is not necessarily active as a USER menu if current PROJECT_MASTER_INDEX says it is hidden/held.

System Value display is controlled through Trajectory card toggle if current state says so.

Do not restore deprecated USER buttons in Specification or Cursor work unless the user explicitly requests it.

---

# 14. File Output Rules

Cursor should produce or modify files in place.

If generating new normalized files:

Specification output path:

```text
Application Architecture Standard (AAS) v2.0/Chapter/ChapterXX_Original_Name.md
```

Cursor output path:

```text
Application Architecture Standard (AAS) v2.0/Cursor/Cursor_ChapterXX_Original_Name.md
```

Do not overwrite source files unless explicitly instructed.

Recommended safe workflow:

```text
1. Create normalized output files in new Chapter/ and Cursor/ folders.
2. Compare with source.
3. User reviews.
4. Replace or archive old source.
```

---

# 15. Cursor Master Work Order Template

Use this when asking Cursor to normalize one Chapter.

```text
[Cursor Mode: Ask]

Task:
Normalize ChapterXX according to AAS_Release_Normalization_Guide.md.

References:
- AAS_Release_Normalization_Guide.md
- Architecture_Constitution.md
- Architecture_Dictionary.md
- PROJECT_MASTER_INDEX.md
- frontend/src/App.jsx
- Source ChapterXX file

Ask Mode Requirements:
1. Inspect the source Chapter.
2. Separate Specification content from Cursor Work Order content.
3. Identify duplicated content from Constitution, Dictionary, and other Chapters.
4. Identify terminology that violates Architecture_Dictionary.md.
5. Identify outdated statements that conflict with PROJECT_MASTER_INDEX.md or App.jsx.
6. Propose the normalized Specification file.
7. Propose the Cursor Work Order file.
8. Do not edit files yet.

Output:
- Summary of retained Specification content
- Summary of moved Cursor content
- Terminology changes
- Duplication removals
- Risk or ambiguity list
```

Then after review:

```text
[Cursor Mode: Agent]

Task:
Create normalized ChapterXX Specification and Cursor Work Order files according to AAS_Release_Normalization_Guide.md.

Required Outputs:
- Chapter/ChapterXX_Original_Name.md
- Cursor/Cursor_ChapterXX_Original_Name.md

Rules:
- Do not change source code.
- Do not change runtime behavior.
- Do not change Dataset path.
- Do not change System Definition files.
- Preserve source meaning.
- Remove implementation content from Specification.
- Move implementation content into Cursor document.
- Use Architecture_Dictionary.md terms.
- Reference Architecture_Constitution.md instead of repeating it.

Validation:
- Confirm both files exist.
- Confirm Specification contains no Cursor Mode, Migration Plan, Commit, or Regression steps.
- Confirm Cursor document starts with [Cursor Mode: Ask].
- Confirm official terminology is used.
```

---

# 16. Whole-Project Cursor Work Order Template

Use this only after one or two Chapters are successfully normalized.

```text
[Cursor Mode: Ask]

Task:
Plan whole-project normalization for AAS Chapter01~20 using AAS_Release_Normalization_Guide.md.

Requirements:
1. Inspect all Chapter01~20 files.
2. Build a duplication map.
3. Build a terminology correction map.
4. Build a Specification/Cursor separation plan.
5. Identify Chapter04 split requirements.
6. Identify conflicts with Architecture_Constitution.md.
7. Identify conflicts with Architecture_Dictionary.md.
8. Identify conflicts with PROJECT_MASTER_INDEX.md.
9. Do not edit files.

Output:
- Chapter responsibility map
- Duplication map
- Terminology map
- Proposed processing order
- Risk list
- Recommended Agent batches
```

After review:

```text
[Cursor Mode: Agent]

Task:
Normalize AAS Chapter01~20 in small batches according to the approved Ask plan.

Batch Rule:
- Process at most 2 Chapters per Agent run.
- Chapter04 must be processed separately.
- Do not modify source code.
- Generate normalized files under Chapter/ and Cursor/.
```

---

# 17. Verification Checklist for Each Chapter

Cursor must verify:

## Specification

```text
□ File exists in Chapter/
□ File name follows ChapterXX_Original_Name.md
□ Contains Purpose
□ Contains Scope
□ Contains Principles or Rules
□ Contains Success Criteria
□ Contains References
□ Does not contain [Cursor Mode]
□ Does not contain Agent Mode
□ Does not contain Migration Plan
□ Does not contain Commit instruction
□ Does not contain build command unless it is normative release requirement in Chapter20
□ Uses Dictionary official terms
□ Does not duplicate long Constitution content
□ Does not contradict PROJECT_MASTER_INDEX.md
□ Does not falsely claim target state is already implemented
```

## Cursor Work Order

```text
□ File exists in Cursor/
□ File name follows Cursor_ChapterXX_Original_Name.md
□ Starts with [Cursor Mode: Ask]
□ Contains Agent Mode section
□ Contains restrictions
□ Contains deliverables
□ Contains regression or validation section
□ Does not redefine architecture theory
□ Does not introduce new architecture
□ Does not conflict with Specification
```

---

# 18. Final Release Completion Criteria

AAS Release Normalization is complete when:

1. `Architecture_Constitution.md` is present.
2. `Architecture_Dictionary.md` is present.
3. `Release_Notes.md` is present.
4. Chapter01~20 Specifications exist under `Chapter/`.
5. Cursor_Chapter01~20 Work Orders exist under `Cursor/`.
6. Chapter04 split files are either merged or clearly ordered.
7. No Specification contains Cursor execution content.
8. No Cursor document contains new Architecture definitions.
9. All official terms follow `Architecture_Dictionary.md`.
10. App.jsx authority is consistent with Chapter01.
11. Layer responsibility is consistent with Chapter02.
12. Dependency rules are consistent with Chapter03.
13. Runtime model is consistent with Chapter04.
14. Dataset rules preserve Published Corpus SSOT.
15. USER UX state does not contradict PROJECT_MASTER_INDEX.md.
16. Cursor Run/Accept rule is preserved.
17. Regression rule is centralized in Chapter20 and referenced elsewhere.
18. No source code behavior is changed by documentation normalization.

---

# 19. Common Mistakes to Avoid

## Mistake 1. Rewriting Chapters as New Essays

Do not write a new explanatory essay.
Normalize the source.

## Mistake 2. Leaving Cursor Content in Specification

Remove:

```text
[Cursor Mode: Ask]
npm run build
Commit Message
Migration Step
Regression Checklist
```

unless the Chapter is Chapter20 and the content is normative release rule rather than Cursor instruction.

## Mistake 3. Duplicating Constitution

Do not copy large Constitution sections into every Chapter.

## Mistake 4. Using Non-Official Terms

Do not use:

```text
Business Layer
Logic Layer
Engine Layer
Data Layer
System Config
```

## Mistake 5. Treating Current Transitional Code as Final

Do not say App.jsx already fully satisfies architecture if it does not.

## Mistake 6. Changing Product UX Accidentally

Do not restore old USER menu items or deprecated UX while editing documentation.

## Mistake 7. Changing Dataset Path

Never change:

```text
dataset/{공략}/{시스템}/positions.json
```

## Mistake 8. Combining Specification and Cursor Again

The whole purpose of Release Edition is separation.

---

# 20. Final Rule

The final rule for this guide is:

> AAS Specification defines the architecture.  
> Cursor Work Order executes the architecture.  
> The two must never be mixed.

End of Guide.
