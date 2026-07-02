# App.jsx_Responsibility_Analysis_Guide.md

# 3Cushion AI Application Runtime Refactoring  
## App.jsx Responsibility Analysis Guide

Version: v1.0  
Status: Project Core SSOT  
Date: 2026-06-29  
Owner: 3Cushion AI Architecture  
Purpose: App.jsx responsibility inventory, system-specific extraction, profile/logic migration planning, Orchestrator target design

---

# 0. Purpose

This document defines how Cursor must analyze and refactor `frontend/src/App.jsx` so that App.jsx becomes a pure Application Runtime Orchestrator.

This guide is not a coding request by itself.

It is the mandatory analysis and migration blueprint that must be applied before modifying App.jsx.

The goal is to identify:

1. Which parts of App.jsx are common Application Runtime responsibilities.
2. Which parts are `5_half_system` or system-specific responsibilities.
3. Which parts can move to `profile.json`.
4. Which parts can move to `logic.json`.
5. Which parts can move to Domain modules.
6. Which parts can move to calculator modules.
7. Which parts can move to renderer modules.
8. Which parts can move to overlay modules.
9. Which parts can move to search modules.
10. Which parts must remain in App.jsx as Orchestrator responsibilities.

The final target is:

```text
App.jsx = Application Runtime Orchestrator only
```

---

# 1. Required Reference Documents

Cursor must read these documents before any App.jsx analysis or refactoring.

Priority order:

```text
1. Architecture_Constitution.md
2. Architecture_Dictionary.md
3. AAS_Release_Normalization_Guide.md
4. PROJECT_MASTER_INDEX.md
5. Chapter01_App_Authority.md
6. Chapter02_Layer_Architecture.md
7. Chapter03_Dependency_Rule.md
8. frontend/src/App.jsx
9. frontend/src/data/systems/<systemId>/*
```

If there is a conflict:

```text
Architecture_Constitution.md wins over all architecture decisions.
Architecture_Dictionary.md wins over terminology.
PROJECT_MASTER_INDEX.md wins over current feature state.
App.jsx wins over current implementation state.
```

---

# 2. Final Target Architecture

## 2.1 Final App.jsx Responsibility

App.jsx must retain only the following responsibilities:

```text
Application Boot
Runtime Context wiring
Runtime State coordination
Mode selection
Event dispatch
Screen composition
Application Flow invocation
Presentation component assembly
Overlay entry routing
Provider connection
```

App.jsx must not implement the details of calculation, search, Dataset, rendering policy, trajectory generation, AI/Lesson generation, or system-specific rules.

## 2.2 Final Target Structure

Target structure:

```text
frontend/src/

App.jsx
application/
  runtime/
  flows/
  coordinators/
  dispatchers/

domain/
  calculator/
  trajectory/
  search/
  dataset/
  history/
  ai/
  lesson/
  hpt/
  slot/
  system/

renderer/
  trajectory/
  caption/
  labels/
  table/
  overlay/

overlay/
  router/
  state/
  models/

search/
  recall/
  profiles/
  matching/
  corpus/

data/systems/<systemId>/
  profile.json
  logic.json
  anchors.json
  system_meta.json
```

Actual folder names may be adjusted to match the existing codebase, but responsibilities must remain separated.

---

# 3. App.jsx Responsibility Classification

Cursor must classify every meaningful App.jsx block.

Classification must be done at the following levels:

```text
Import
Constant
State
Memo
Callback
Effect
Handler
Helper function
Inline component
JSX section
Data transformation
Domain call
System-specific branch
Dataset operation
Search/Recall operation
Trajectory operation
Overlay operation
Renderer operation
```

Every item must receive exactly one primary tag and may receive secondary tags.

---

# 4. Classification Tags

Use these exact tags.

## 4.1 App-retained Tags

### APP_BOOT

Application startup, provider connection, initial runtime setup.

May remain in App.jsx.

### APP_RUNTIME_STATE

Top-level mode, selected system, selected shot type, selected slot, overlay state, and runtime coordination state.

May remain in App.jsx if it is not derived Domain state.

### APP_EVENT_DISPATCH

Thin event handler that delegates to Application Flow.

May remain in App.jsx if it only dispatches.

### APP_SCREEN_COMPOSITION

JSX composition of top-level screen areas.

May remain in App.jsx.

### APP_PROVIDER_WIRING

Context Provider and root-level wiring.

May remain in App.jsx.

## 4.2 Application Layer Tags

### APPLICATION_FLOW

A multi-step user or admin use case.

Move to `application/`.

Examples:

```text
USER Search flow
ADMIN Search flow
ADMIN LocalDB flow
Reset flow
Save flow
History load flow
Slot apply flow
Trajectory apply flow
Overlay open/close flow
System load flow
```

### APPLICATION_COORDINATION

Code that sequences multiple Domain calls and returns Runtime State changes.

Move to `application/coordinators/` or `application/flows/`.

### APPLICATION_DISPATCHER

Command routing logic.

Move to `application/dispatchers/`.

## 4.3 Domain Tags

### DOMAIN_CALCULATION

System value calculation, formula evaluation, correction computation.

Move to `domain/calculator/` or existing Calculation Domain.

### DOMAIN_TRAJECTORY

Trajectory node generation, impact calculation, reflection, rail detection, display cap computation.

Move to `domain/trajectory/`.

### DOMAIN_SEARCH

Search, Recall, matching, scoring, profile selection, corpus filtering.

Move to `domain/search/` or `search/`.

### DOMAIN_DATASET

Dataset normalization, canonicalization, merge, export envelope creation, dataset path logic.

Move to `domain/dataset/`.

### DOMAIN_HISTORY

Workspace History normalization, history record transformation.

Move to `domain/history/`.

### DOMAIN_VIEWMODEL

ViewModel building for USER AI, HP/T, trajectory card, system lesson, labels.

Move to appropriate Domain module.

### DOMAIN_AI_LESSON

AI comment generation, one-point lesson merge, System Lesson ViewModel.

Move to `domain/ai/` or `domain/lesson/`.

## 4.4 Renderer Tags

### RENDERER_TRAJECTORY

Display preparation for path, impact lines, visible label keys, display caps.

Move to `renderer/trajectory/` unless it is pure Domain trajectory.

### RENDERER_CAPTION

Caption placement, axis bucket, label placement, labelScale decision.

Move to `renderer/caption/` or existing caption domain if pure.

### RENDERER_LABELS

System value label rendering source, label grouping, rail/frame axis value display.

Move to `renderer/labels/` or `components/table/` with pure calculation extracted.

### RENDERER_TABLE

Table drawing, display-only table composition, visual policy.

Move to `renderer/table/` or Presentation components.

## 4.5 Overlay Tags

### OVERLAY_ROUTING

Which overlay opens for which UI action.

Move to `overlay/router/` or Application Overlay Flow.

### OVERLAY_STATE

Overlay state transitions and lifecycle.

Move to `overlay/state/` or Application Flow.

### OVERLAY_VIEWMODEL

Overlay-specific display model.

Move to `overlay/models/` or Domain ViewModel depending on purity.

### OVERLAY_PRESENTATION

Actual React overlay components.

Keep in `components/` or move to `overlay/` only if project convention allows.

## 4.6 System-Specific Tags

### SYSTEM_SPECIFIC_5_HALF

Any direct 5½ system branch.

Examples:

```text
systemId === "5_half_system"
5_HALF
useSn
needsC3r
C4_f/C5_f/C6_f synchronization
5½ lesson condition
5½ baseline merge
samples/5_half_system
```

Move to `profile.json`, `logic.json`, System Domain, or System Definition loader.

### SYSTEM_SPECIFIC_GENERAL

Any system-specific logic not limited to 5½.

Move to System Layer.

## 4.7 Dataset Tags

### DATASET_WORKING

Working Dataset localStorage `positions_dataset`.

Move to Dataset/Application/Infrastructure boundary.

### DATASET_HISTORY

Workspace History localStorage `workspace_history`.

Move to History Domain or Infrastructure adapter.

### DATASET_PUBLISHED

Published Dataset load/cache/fetch/path.

Move to Dataset Domain / Infrastructure.

### DATASET_EXPORT

Export envelope, file path, save operation.

Move to Dataset Domain / Infrastructure.

## 4.8 Search Tags

### SEARCH_USER

USER Search flow and result handling.

Move to Application Flow and Search Domain.

### SEARCH_ADMIN_PUBLISHED

ADMIN Search using Published Dataset.

Move to Application Flow and Search Domain.

### SEARCH_ADMIN_LOCALDB

ADMIN 로컬DB / Working Dataset search.

Move to Application Flow and Search Domain.

### SEARCH_PROFILE

Recall profile selection or profile-specific logic.

Move to Search Domain.

## 4.9 Risk Tags

### RISK_HIGH

Changes may affect calculation, search, Dataset, or trajectory results.

### RISK_MEDIUM

Changes may affect flow or UI state.

### RISK_LOW

Presentation-only or wrapper-only refactor.

---

# 5. Final App.jsx Keep / Move Rules

## 5.1 Must Remain in App.jsx

Only these may remain:

```text
Root component definition
Top-level provider composition
Application Runtime state holder
Thin event dispatchers
Top-level JSX composition
Passing props to Presentation components
Calling Application Flow functions
```

## 5.2 Must Move Out of App.jsx

These must move out:

```text
Formula calculation
Correction calculation
Sn calculation
C1/C3/C4/C5/C6 computation
Trajectory node generation
Rail detection
Caption placement
System axis value generation
Dataset path creation
Dataset merge/export
Search score calculation
Recall matching
AI comment generation
Lesson ViewModel generation
HP/T ViewModel generation
System-specific branch
```

## 5.3 Must Not Be Added to App.jsx

Never add:

```ts
if (systemId === "5_half_system") {}
switch (systemId) {}
localStorage.getItem("positions_dataset")
fetch("/dataset/...")
calculateSystem(...)
runRecallEngine(...)
buildTrajectory(...)
buildCaption(...)
composeAiComment(...)
```

Existing cases are migration targets.

---

# 6. System-Specific Extraction Rules

## 6.1 What Is System-Specific

A code block is system-specific if it depends on:

```text
systemId
systemName
5_half_system
5_HALF
system-specific formula
system-specific correction
system-specific label rule
system-specific trajectory depth
system-specific lesson availability
system-specific input requirement
system-specific anchor handling
```

## 6.2 5_half_system Extraction

Cursor must search App.jsx for:

```text
5_half_system
5_HALF
useSn
Sn
needsC3r
C4_f
C5_f
C6_f
C4
C5
C6
samples/5_half_system
five
half
```

For each match, classify destination:

| Current Code | Destination |
|---|---|
| default input values | profile.json |
| supported output marks | profile.json |
| UI display capability | profile.json or system_meta.json |
| formula expression | profile.json |
| correction rule | logic.json |
| branch/sync rule | logic.json |
| C4/C5/C6 sync | logic.json or Calculation Domain |
| Sn calculation | logic.json or Calculation Domain |
| trajectory policy | logic.json or Trajectory Domain |
| lesson availability | system_meta.json |
| lesson content rule | Logic Definition or Lesson Domain |
| sample path | system_meta.json |
| anchor coordinate | anchors.json |

## 6.3 Profile Definition Candidates

Move to `profile.json` if the item defines **what exists**.

Examples:

```text
input fields
output fields
formula expression
value domains
display marks
supported correction types
default UI display capability
baseline/corrected availability
system value label visibility capability
```

## 6.4 Logic Definition Candidates

Move to `logic.json` if the item defines **how a system behaves**.

Examples:

```text
correction rule
conditional branch
sync rule
Sn rule
C4/C5/C6 relationship
trajectory depth policy
system-specific fallback
formula adjustment
special display condition based on system logic
```

## 6.5 Anchor Definition Candidates

Move to `anchors.json` if the item defines coordinates or anchor mapping.

Examples:

```text
CO coordinate anchor
C1/C3/C4/C5/C6 coordinate anchor
rail/frame mark anchor
trajectory sample anchor
interpolation anchor
symmetry anchor
```

## 6.6 System Meta Definition Candidates

Move to `system_meta.json` if the item defines identity or capability metadata.

Examples:

```text
display name
aliases
system category
supported shot types
lesson support flag
sample path
description
UI grouping
```

---

# 7. Domain / Calculator / Renderer / Overlay / Search Destination Rules

## 7.1 domain/calculator/

Move calculation logic here.

Destination examples:

```text
domain/calculator/formulaEvaluator.ts
domain/calculator/systemValueCalculator.ts
domain/calculator/correctionCalculator.ts
domain/calculator/fiveHalfCalculator.ts
domain/calculator/calculationPipeline.ts
```

Move out of App.jsx:

```text
formula.expr evaluation
C1/C3/CO/C4/C5/C6 calculation
Sn calculation
baseline/corrected calculation
system value derivation
correction application
```

## 7.2 domain/trajectory/

Move trajectory generation here.

Destination examples:

```text
domain/trajectory/trajectoryBuilder.ts
domain/trajectory/impactBuilder.ts
domain/trajectory/reflectionPolicy.ts
domain/trajectory/displayCapPolicy.ts
```

Move out of App.jsx:

```text
trajectory nodes
impact points
rail detection
same rail cap
second ball cap
chain break cap
baseline/corrected path construction
```

## 7.3 renderer/

Move display preparation here.

Destination examples:

```text
renderer/trajectory/trajectoryRenderModel.ts
renderer/caption/captionPlacement.ts
renderer/labels/systemAxisLabelModel.ts
renderer/table/tableRenderPolicy.ts
```

Move out of App.jsx:

```text
label placement
caption bucket
axis number display source
display-only filtering
visibleKeysForLabels construction
render path selection
```

Do not move React UI components unless the project explicitly adopts `renderer/` as component location.

## 7.4 overlay/

Move overlay routing and overlay state policy here.

Destination examples:

```text
overlay/router/userOverlayRouter.ts
overlay/router/adminOverlayRouter.ts
overlay/state/overlayStateMachine.ts
overlay/models/overlayViewModels.ts
```

Move out of App.jsx:

```text
overlayContent decision logic
overlay open/close transitions
overlay child routing
USER overlay routing
ADMIN overlay routing
overlay reset behavior
```

Presentation components can remain under `components/`.

## 7.5 search/

Move search and recall logic here.

Destination examples:

```text
search/recall/userSearch.ts
search/recall/adminSearch.ts
search/recall/localDbSearch.ts
search/matching/positionMatcher.ts
search/profiles/recallProfiles.ts
search/corpus/publishedCorpusLoader.ts
```

Move out of App.jsx:

```text
similarity calculation
coarse filter
permutation
match scoring
profile selection
Published Dataset corpus search
Working Dataset corpus search
Search result ranking
```

If existing project already has `domain/recall/`, do not duplicate logic. Use existing module and create Application wrapper if needed.

## 7.6 application/

Move multi-step flows here.

Destination examples:

```text
application/flows/userSearchFlow.ts
application/flows/adminSearchFlow.ts
application/flows/adminLocalDbFlow.ts
application/flows/resetFlow.ts
application/flows/saveFlow.ts
application/flows/historyFlow.ts
application/flows/trajectoryFlow.ts
application/flows/overlayFlow.ts
application/coordinators/runtimeCoordinator.ts
```

Move out of App.jsx:

```text
Search click -> load corpus -> match -> hydrate slot -> update runtime
Reset click -> clear session -> preserve balls -> close overlays
Save click -> canonicalize -> commit -> history update
Overlay click -> route -> build ViewModel -> open
```

---

# 8. Required Analysis Deliverables

Before any refactor, Cursor must generate these documents.

## 8.1 App_Authority_Inventory.md

Purpose:

Full inventory of App.jsx responsibilities.

Required columns:

```text
ID
Line Range
Name
Code Type
Current Responsibility
Primary Tag
Secondary Tags
Common or System-Specific
System ID if applicable
Current Dependencies
Risk
Keep or Move
Target Destination
Notes
```

Example:

| ID | Line Range | Name | Current Responsibility | Tag | Keep/Move | Target |
|---|---|---|---|---|---|---|
| APP-001 | 120-145 | selectedSystemId state | selected system runtime state | APP_RUNTIME_STATE | Keep | App.jsx |
| APP-042 | 2200-2350 | handleUserSearchStrategies | USER Search flow | APPLICATION_FLOW, SEARCH_USER | Move | application/flows/userSearchFlow.ts |
| APP-088 | 4100-4150 | useSn condition | 5½ specific branch | SYSTEM_SPECIFIC_5_HALF | Move | logic.json / calculator |

## 8.2 App_Migration_Map.md

Purpose:

Map each movable App.jsx item to destination file and migration phase.

Required columns:

```text
Inventory ID
Current Location
Current Function/Block
Target Layer
Target File
Migration Phase
Required Dependency
Behavior Risk
Test Required
Can Move Now?
Blocker
```

Migration phase options:

```text
P0_DOCUMENT_ONLY
P1_WRAPPER_ONLY
P2_EXTRACT_PURE_FUNCTION
P3_APPLICATION_FLOW
P4_SYSTEM_SPECIFIC_EXTRACTION
P5_RENDERER_EXTRACTION
P6_APP_CLEANUP
```

## 8.3 System_Specific_Extraction_Report.md

Purpose:

Identify all system-specific App.jsx logic.

Required sections:

```text
1. 5_half_system direct branches
2. System ID conditional branches
3. System-specific formula logic
4. System-specific correction logic
5. System-specific trajectory policy
6. System-specific rendering policy
7. System-specific lesson/AI policy
8. Destination recommendation
```

Each item must say:

```text
profile.json / logic.json / anchors.json / system_meta.json / Domain / keep transitional
```

## 8.4 Profile_Logic_Extraction_Report.md

Purpose:

Define what can move into System Definition files.

Required tables:

### profile.json candidates

```text
Item
Current App.jsx location
Definition type
Proposed profile path
Reason
Risk
```

### logic.json candidates

```text
Item
Current App.jsx location
Rule type
Proposed logic path
Reason
Risk
```

### anchors.json candidates

```text
Item
Current App.jsx location
Anchor type
Proposed anchors path
Reason
Risk
```

### system_meta.json candidates

```text
Item
Current App.jsx location
Meta type
Proposed meta path
Reason
Risk
```

## 8.5 App_Final_Target_Structure.md

Purpose:

Define what App.jsx should look like after migration.

Required sections:

```text
1. Final App.jsx responsibilities
2. Final import groups
3. Final state groups
4. Final event dispatchers
5. Final JSX composition
6. Removed responsibilities
7. Target line count
8. Remaining transitional items, if any
```

---

# 9. Migration Phases

Refactor must be done in small phases.

## P0_DOCUMENT_ONLY

Generate analysis reports only.

No source code change.

Required output:

```text
App_Authority_Inventory.md
App_Migration_Map.md
System_Specific_Extraction_Report.md
Profile_Logic_Extraction_Report.md
App_Final_Target_Structure.md
```

## P1_WRAPPER_ONLY

Create wrappers around existing logic without behavior change.

Allowed:

```text
application wrapper
facade function
re-export
thin adapter
```

Forbidden:

```text
logic rewrite
calculation change
search threshold change
dataset path change
UI change
```

## P2_EXTRACT_PURE_FUNCTION

Move pure helper functions out of App.jsx.

Allowed only when:

```text
function has explicit inputs
function has explicit outputs
function does not access React state directly
function does not mutate external state
```

## P3_APPLICATION_FLOW

Move multi-step flows to Application Layer.

Examples:

```text
USER Search flow
ADMIN Search flow
Reset flow
Save flow
History flow
Overlay flow
Slot apply flow
```

## P4_SYSTEM_SPECIFIC_EXTRACTION

Move system-specific rules into System Definition or Domain.

This phase is high risk.

Must be preceded by reports and test cases.

## P5_RENDERER_EXTRACTION

Move display preparation, caption, label, trajectory render model logic.

Must not change visual output unless explicitly requested.

## P6_APP_CLEANUP

Remove dead code, reduce imports, simplify handlers.

Allowed only after regression passes.

---

# 10. Cursor Master Ask Work Order

Use this first.

```text
[Cursor Mode: Ask]

Task:
Analyze frontend/src/App.jsx according to App.jsx_Responsibility_Analysis_Guide.md.

References:
- App.jsx_Responsibility_Analysis_Guide.md
- AAS_Release_Normalization_Guide.md
- Architecture_Constitution.md
- Architecture_Dictionary.md
- PROJECT_MASTER_INDEX.md
- Chapter01_App_Authority.md
- Chapter02_Layer_Architecture.md
- frontend/src/App.jsx

Objective:
Create a complete responsibility and migration blueprint for slimming App.jsx into an Application Runtime Orchestrator.

Required Analysis:
1. Inspect all imports.
2. Inspect all top-level constants.
3. Inspect all useState/useMemo/useCallback/useEffect hooks.
4. Inspect all event handlers.
5. Inspect all helper functions.
6. Inspect all inline components.
7. Inspect all JSX sections.
8. Identify common runtime responsibilities.
9. Identify 5_half_system-specific responsibilities.
10. Identify profile.json candidates.
11. Identify logic.json candidates.
12. Identify anchors.json candidates.
13. Identify system_meta.json candidates.
14. Identify domain/calculator candidates.
15. Identify domain/trajectory candidates.
16. Identify renderer candidates.
17. Identify overlay candidates.
18. Identify search candidates.
19. Identify application flow candidates.
20. Identify responsibilities that must remain in App.jsx.

Required Deliverables:
- docs/architecture/App_Authority_Inventory.md
- docs/architecture/App_Migration_Map.md
- docs/architecture/System_Specific_Extraction_Report.md
- docs/architecture/Profile_Logic_Extraction_Report.md
- docs/architecture/App_Final_Target_Structure.md

Restrictions:
- Do not edit App.jsx.
- Do not edit source code.
- Do not move files.
- Do not change imports.
- Do not change runtime behavior.
- Do not change Dataset path.
- Do not change System Definition files.
- Do not change UI/CSS.

Output:
- Summary of App.jsx current responsibility distribution.
- List of high-risk areas.
- Proposed safe migration phases.
- Files that should be created in later Agent phases.
```

---

# 11. Cursor Agent Work Order — P0 Document Generation

Use only after Ask result is accepted.

```text
[Cursor Mode: Agent]

Task:
Generate App.jsx responsibility analysis documents only.

References:
- App.jsx_Responsibility_Analysis_Guide.md
- Ask Mode analysis result

Required Outputs:
1. docs/architecture/App_Authority_Inventory.md
2. docs/architecture/App_Migration_Map.md
3. docs/architecture/System_Specific_Extraction_Report.md
4. docs/architecture/Profile_Logic_Extraction_Report.md
5. docs/architecture/App_Final_Target_Structure.md

Forbidden:
- Do not edit App.jsx.
- Do not edit runtime source.
- Do not move functions.
- Do not rewrite imports.
- Do not change UI.
- Do not change calculation.
- Do not change Search/Recall.
- Do not change Dataset.
- Do not change System Definition files.

Validation:
- Confirm all five documents exist.
- Confirm every major App.jsx handler is covered.
- Confirm every direct 5_half_system reference is listed.
- Confirm every localStorage/fetch usage is listed.
- Confirm every search/recall flow is listed.
```

---

# 12. Cursor Agent Work Order — P1 Wrapper Only

Use only after P0 documents are reviewed.

```text
[Cursor Mode: Agent]

Task:
Create wrapper-only Application Flow layer for lowest-risk App.jsx responsibilities.

Allowed:
- Create frontend/src/application/ wrappers.
- Wrap existing App.jsx logic without changing behavior.
- Replace only low-risk handler internals with wrapper calls if contract is identical.
- Preserve all inputs and outputs.

Forbidden:
- Do not change calculation.
- Do not change Search/Recall scoring.
- Do not change Dataset path.
- Do not change System Definition.
- Do not change UI/CSS.
- Do not modify 5_half_system logic in this phase.

Validation:
- npm run build
- USER Search smoke test
- ADMIN Search smoke test
- ADMIN LocalDB smoke test
- Overlay smoke test
- Trajectory smoke test
```

---

# 13. Cursor Agent Work Order — P2 Pure Function Extraction

```text
[Cursor Mode: Agent]

Task:
Extract approved pure helper functions from App.jsx.

Precondition:
- Functions must be listed in App_Migration_Map.md as P2_EXTRACT_PURE_FUNCTION.
- Functions must have explicit input/output.
- Functions must not depend on React state except through parameters.

Forbidden:
- Do not extract stateful handlers.
- Do not extract system-specific rules unless listed as low-risk.
- Do not change behavior.
- Do not reformat unrelated code.

Validation:
- npm run build
- Compare before/after outputs for affected functions if test data exists.
- Manual smoke test affected UI.
```

---

# 14. Cursor Agent Work Order — P3 Application Flow Extraction

```text
[Cursor Mode: Agent]

Task:
Extract approved Application Flows from App.jsx.

Targets may include:
- userSearchFlow
- adminSearchFlow
- adminLocalDbFlow
- resetFlow
- saveFlow
- historyFlow
- overlayFlow
- slotFlow
- trajectoryFlow

Precondition:
- Target must be listed in App_Migration_Map.md as P3_APPLICATION_FLOW.
- Input/output contract must be documented.
- Regression path must be known.

Forbidden:
- Do not change Search result.
- Do not change slot hydration result.
- Do not change Reset semantics.
- Do not change Dataset path.
- Do not change trajectory calculation.
- Do not change UI labels.

Validation:
- npm run build
- USER Search
- Reset
- ADMIN Search
- ADMIN LocalDB
- SAVE
- History
- Overlay
- Trajectory
```

---

# 15. Cursor Agent Work Order — P4 System-Specific Extraction

```text
[Cursor Mode: Agent]

Task:
Extract approved system-specific logic from App.jsx into System Definition or Domain.

Precondition:
- Item must appear in System_Specific_Extraction_Report.md.
- Destination must be approved:
  - profile.json
  - logic.json
  - anchors.json
  - system_meta.json
  - Domain module
- Regression case must exist.

Forbidden:
- Do not change 5_half_system output.
- Do not change C1/C3/CO/C4/C5/C6 values.
- Do not change baseline/corrected output.
- Do not change trajectory display.
- Do not change USER Search result.
- Do not change Dataset schema.

Validation:
- npm run build
- 5_half_system calculation regression
- C4/C5/C6 sync regression
- Sn regression
- USER Search regression
- ADMIN Search regression
- Trajectory regression
```

---

# 16. Cursor Agent Work Order — P5 Renderer Extraction

```text
[Cursor Mode: Agent]

Task:
Extract approved renderer/display preparation logic from App.jsx.

Targets:
- caption placement preparation
- system axis label model
- trajectory render model
- visible label key selection
- overlay display model

Forbidden:
- Do not change visual output unless explicitly approved.
- Do not change labelScale.
- Do not change Caption Engine rules.
- Do not change Trajectory Display Cap.
- Do not change SystemValueLabels behavior.

Validation:
- npm run build
- USER 동선 card visual check
- 시스템값 표시 toggle check
- baseline/corrected toggle check
- Caption placement check
- mobile landscape check if applicable
```

---

# 17. Cursor Agent Work Order — P6 App Cleanup

```text
[Cursor Mode: Agent]

Task:
Clean up App.jsx after approved extractions.

Allowed:
- Remove dead imports.
- Remove unused helper functions.
- Reduce redundant state if replaced by Application Runtime state.
- Simplify dispatch handlers.
- Update comments.

Forbidden:
- Do not change runtime behavior.
- Do not remove transitional code unless replacement is verified.
- Do not change UI.
- Do not change Dataset.
- Do not change System Definition.

Validation:
- npm run build
- Full smoke test
- Git diff review
- App.jsx line count report
```

---

# 18. Regression Requirements

Every Agent phase that changes source code must pass:

```text
npm run build
```

Must also check:

```text
USER Search
USER Reset
USER AI
USER 두께/타점
USER 동선
USER 시스템값 표시 if present
ADMIN Search
ADMIN 로컬DB
ADMIN SYS
ADMIN HP/T
ADMIN STR
ADMIN AI
SAVE
History
Trajectory baseline/corrected
Published Dataset fetch
```

Dataset rules:

```text
dataset/ path unchanged
dataset/{공략}/{시스템}/positions.json unchanged
dataset/ not added to .gitignore
Published Dataset loader unchanged unless explicitly targeted
```

System rules:

```text
No new if(systemId === "...") in App.jsx
No new 5_half_system branch in App.jsx
No new calculation logic in App.jsx
No new Search logic in App.jsx
No new Dataset logic in App.jsx
```

---

# 19. Completion Criteria

App.jsx responsibility refactoring is complete only when:

1. App_Authority_Inventory.md is complete.
2. App_Migration_Map.md is complete.
3. System_Specific_Extraction_Report.md is complete.
4. Profile_Logic_Extraction_Report.md is complete.
5. App_Final_Target_Structure.md is complete.
6. App.jsx contains only Orchestrator responsibilities.
7. App.jsx has no direct system-specific branch.
8. App.jsx has no Formula Calculation.
9. App.jsx has no Search/Recall algorithm.
10. App.jsx has no Trajectory generation.
11. App.jsx has no Caption calculation.
12. App.jsx has no Dataset merge/export/path logic.
13. App.jsx calls Application Flows instead of Domain internals.
14. System-specific behavior is represented in System Definition and Domain.
15. Build passes.
16. Regression passes.
17. New system addition does not require App.jsx modification.

---

# 20. Final Non-Negotiable Rules

1. Do not start by editing App.jsx.
2. Analyze first.
3. Produce the five required reports first.
4. Move only low-risk items first.
5. Never change behavior while moving responsibility.
6. Never change Dataset path.
7. Never add new system-specific code to App.jsx.
8. Never treat 5_half_system as a permanent App.jsx exception.
9. Keep App.jsx as Orchestrator.
10. Stop and ask if a move may alter calculation, search, trajectory, or Dataset behavior.

---

# 21. Final Rule

> App.jsx must not know how a system works.  
> App.jsx must only know which Application Flow to call.

End of Guide.
