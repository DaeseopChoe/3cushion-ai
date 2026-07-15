# STEP6_Schema_Validation_Framework.md

## 1. Document Header

| Field | Value |
|-------|-------|
| **Document** | `STEP6_Schema_Validation_Framework.md` |
| **Version** | v1.0 |
| **Status** | Draft (Freeze Candidate) |
| **Date** | 2026-07-15 |
| **STEP** | STEP6-1 |
| **Owner** | Schema Validation |
| **SPS Version** | System Platform Standard (SPS) v1.0 |
| **Type** | Schema Validation Framework SSOT |
| **Purpose** | Normative Framework SSOT for STEP6 Schema Validation (Core §1–§10 · Policy §11–§14 · Governance §15–§20 · Appendix A–D) |
| **Baseline** | Runtime `ec71ef9` · STEP4 Inventory Final v1.0 (RO) · STEP5 Final Freeze v1.0 (RO) |
| **Dependencies** | `STEP5_FINAL_FREEZE.md` · `STEP5_STEP6_Handoff.md` · `System_Inventory.md` (RO) · `System_Schema_Definition.md` (RO) |
| **Rule** | Framework is higher SSOT than Pipeline · Rule Catalog · Registers · Schema artifacts · Validation Engine. This document does not contain Pipeline / Catalog / Register / Engine design. |

**Normative Header declaration**

This document is the **STEP6 Schema Validation Framework SSOT**.

It **SHALL** govern Schema Validation concepts, boundaries, layers, status models, and `schemaComplete`.

It **SHALL NOT** redefine STEP5 Architecture Audit.

It **SHALL NOT** clone the STEP5 Framework pipeline.

It **SHALL NOT** contain Pipeline Stage design, Rule Catalog contents, Register field shapes, JSON Schema bodies, or Validation Engine implementation.

---

## 2. Purpose

### 2.1 STEP6 Purpose

STEP6 exists to operate the **Schema Validation Layer** of the SPS Standardization workflow.

STEP6 **SHALL**:

- Determine whether System Definition packages conform to SPS Schema norms
- Produce Validation Results and Validation Findings (`VAL-*`)
- Compute and own the completeness property **`schemaComplete`**
- Provide a deterministic, non-mutating validation baseline for STEP7 Standardization

STEP6 **SHALL NOT**:

- Re-execute or rewrite Architecture Audit judgments
- Modify STEP4 Facts or STEP5 Frozen artifacts
- Implement System Standardization (STEP7)
- Modify Runtime or System JSON as part of validation

### 2.2 Schema Validation Layer

The **Schema Validation Layer** is the SPS layer responsible for evaluating System Definition packages against Schema norms and recording validation outcomes.

It sits after Architecture Audit and before Standardization:

```text
STEP4 Fact (Inventory)
        ↓
STEP5 Architecture Audit
        ↓
STEP6 Schema Validation Layer   ← this Framework
        ↓
STEP7 Standardization
```

A **Validation Layer** (L1–L7, §8) is a depth of schema-related concern inside this Layer.  
Validation Layers are conceptual evaluation depths. They are **not** Pipeline Stages and **not** Standardization actions.

### 2.3 Difference from STEP5 Architecture Audit

| Concern | STEP5 Architecture Audit | STEP6 Schema Validation |
|---------|--------------------------|-------------------------|
| Owner | Architecture Audit | Schema Validation |
| Question answered | Is architecture / inventory interpretation audit-complete? | Does the package satisfy Schema norms? |
| Finding namespace | `FND-*` | `VAL-*` |
| Active completeness | `packageComplete` | `schemaComplete` |
| Primary artifacts | Audit Registers · Architecture Audit Report | Validation Results · Validation Report |
| Mutation of prior STEP | STEP4 RO | STEP4 RO · STEP5 RO |

STEP6 **SHALL** consume STEP5 outputs as read-only context.  
STEP6 **SHALL NOT** re-judge or amend STEP5 Findings, Violations, Recommendations, Decisions, or Reports.

### 2.4 Boundary with STEP7 Standardization

| STEP6 | STEP7 |
|-------|-------|
| Validates schema conformance | Standardizes / migrates Systems |
| Produces `schemaComplete` · `VAL-*` · Validation Report | Consumes Validation outcomes |
| Does not rewrite packages to “fix” schema | **MAY** perform approved Standardization work under STEP7 rules |

Schema Validation success **SHALL NOT** be treated as Standardization completion.

### 2.5 Scope of this Framework

This Framework defines:

- Purpose · Scope · Owner Boundary · Input Baseline
- Validation Object Model
- Validation Layers (L1–L7)
- Validation Status Model (Execution Status · Severity)
- `schemaComplete` meaning and conceptual rollup
- (Later sections) Traceability · Determinism · Non-Mutation · Pipeline boundary · Exit Gates · SCH-R relation · STEP7 boundary

This Framework does **not** define implementation, algorithms, Rule lists, Pipeline Stages, Validator internals, or JSON Schema documents.

---

## 3. Normative Language

The following terms apply to this Framework and to downstream STEP6 normative documents that cite it.

| Term | Normative interpretation |
|------|--------------------------|
| **SHALL** | Absolute requirement. Non-conformance is a Framework violation. |
| **SHALL NOT** | Absolute prohibition. Performance of the forbidden action is a Framework violation. |
| **SHOULD** | Strong recommendation. Deviation is allowed only with documented justification. |
| **MAY** | Optional permission. Declining a MAY action is not a violation. |

**Interpretation rules**

- Normative terms apply to Framework obligations, not to Runtime UI copy or informal notes.
- Descriptive text without these terms is explanatory and is not by itself a compliance requirement.
- When Draft status applies, unfrozen design choices **MAY** remain recorded in Appendix C until decided; after Framework Freeze, informal structural change **SHALL NOT** occur without version bump under project freeze policy. See Appendix C: Pending Decisions. Also see §20 Revision History.

---

## 4. Scope

### 4.1 In Scope

This Framework is **In Scope** for:

- Schema Validation Framework norms and Core Concepts
- Validation Object Model
- Validation Layers L1–L7
- Execution Status and Severity models
- `schemaComplete` definition and conceptual rollup
- `VAL-*` principles (Policy Body)
- Determinism · Non-Mutation · Traceability (Policy Body)
- Pipeline **interface** boundary only (not Pipeline design)
- Output Artifact inventory (names/roles)
- Dual Exit Gate distinction (Design vs Official Validation)
- Read-only relation to STEP5 SCH-R

### 4.2 Out of Scope

This Framework is **Out of Scope** for:

- STEP5 Architecture Audit re-run or STEP5 Register / Report rewrite
- STEP4 Inventory / Observation Fact mutation or Fact reinterpretation as new SSOT
- Runtime / Registry / Loader / Contract modification
- System JSON mutation or auto-fix during Validation
- STEP7 Standardization procedures and migration design
- Validation Engine / Validator implementation
- Rule Catalog rule bodies and Rule Namespace finalization
- Register field schemas and Report section algorithms
- JSON Schema document authoring

### 4.3 Design Phase vs Official Validation Phase

| Phase | Meaning | Entry |
|-------|---------|-------|
| **Design Phase** | Authoring STEP6 normative design documents (Framework, later Pipeline/Catalog/Register/Report **templates**). No official `schemaComplete` claim. | **Design Entry** — STEP5 Final Freeze declared |
| **Official Validation Phase** | Executing official Validation Runs that produce Results · `VAL-*` · Active `schemaComplete` · OFFICIAL Validation Report. | **Official Validation Entry** — requires **ACTIVE Handoff** (§6) |

**ACTIVE Handoff**

- **IS** the condition for the official Validation **input package** and Official Validation Phase.
- **IS NOT** a condition for starting Framework design (Design Phase / Design Entry).

See Appendix C (U8).

---

## 5. Owner Boundary

| STEP | Owner | Responsibility | STEP6 treatment |
|------|-------|----------------|-----------------|
| **STEP4** | System Inventory | Fact SSOT: Inventory · Observation · Matrices · Assets | **Fact Read-only**. STEP6 **SHALL NOT** modify or replace Facts. |
| **STEP5** | Architecture Audit | Architecture Audit Suite · `FND-*` · Registers · OFFICIAL Audit Report · **`packageComplete` Owner** | **Register / Suite Read-only**. STEP6 **SHALL NOT** rewrite STEP5 artifacts or `packageComplete`. |
| **STEP6** | Schema Validation | Schema Validation Layer · `VAL-*` · Validation Results · Validation Report · **`schemaComplete` Owner** | Active owner of Validation outcomes. |
| **STEP7** | Standardization | System Standardization / migration | **Validation consumer**. Consumes STEP6 outcomes; does not own `schemaComplete` definition. |

```text
STEP4 Fact (RO)
        ↓
STEP5 Architecture Audit  →  packageComplete (STEP5 Owner)
        ↓
STEP6 Schema Validation   →  schemaComplete (STEP6 Owner)
        ↓
STEP7 Standardization     →  consumes Validation outcomes
```

**Completeness ownership (normative)**

| Property | Owner | Meaning class |
|----------|-------|---------------|
| `packageComplete` | **STEP5** | Architecture Decision completeness (package file/audit scope) |
| `schemaComplete` | **STEP6** | Schema Validation completeness |

These properties **SHALL NOT** be treated as interchangeable.

---

## 6. Input Baseline

This section defines inputs the Framework **consumes**. It does not define Pipeline loading mechanics.

### 6.1 Design Entry Baseline

| Element | Role |
|---------|------|
| STEP5 Final Freeze declared | Enables Design Phase |
| This Framework (Draft→Frozen) | Design SSOT under construction / freeze |
| STEP4 Frozen Assets (RO) | Fact reference for design alignment |
| STEP5 Frozen Suite (RO) | Audit context · SCH-R reference |
| Runtime Baseline pin | Architecture/runtime freeze reference (`ec71ef9`) — not a Validation Target rewrite license |

Design Entry **SHALL NOT** require ACTIVE Handoff.

### 6.2 Official Validation Baseline

| Element | Role |
|---------|------|
| **ACTIVE Handoff** | Official validation input package gate (Exit PASS · OFFICIAL Audit Report · Manifest) |
| **STEP5 Frozen Suite** | RO audit context · SCH-R pins · Deferred pointers |
| **STEP4 Frozen Assets** | RO Fact reference |
| **Runtime Baseline** | RO pin for platform freeze identity |
| Target System Definition packages | Subjects of Validation (read for evaluation only) |
| **Catalog Pin** | Pinned Schema Rule Catalog Version for the Run |
| **Validator Version Pin** | Pinned Validator Version for the Run |

See Appendix C (U12).

### 6.3 ACTIVE Handoff

ACTIVE Handoff is defined by `STEP5_STEP6_Handoff.md`.

| Statement | Norm |
|-----------|------|
| Purpose | Deliver the official STEP5→STEP6 validation input package |
| Required for | Official Validation Phase |
| Not required for | Framework Design Phase / Design Entry |
| Mutation | Handoff **SHALL NOT** authorize edit of STEP5 Registers or STEP4 Facts |

### 6.4 Frozen suite and assets (RO)

| Baseline | Contents (conceptual) | Mutability |
|----------|----------------------|------------|
| **STEP5 Frozen Suite** | STEP5 Framework · Plan · Rule Catalog · Registers · Audit Report · Handoff · Final Freeze | Read-only |
| **STEP4 Frozen Assets** | Inventory · Observation · Matrices · Assets | Read-only |
| **Runtime Baseline** | Batch6 Final Freeze commit identity | Read-only reference |

---

## 7. Validation Object Model

Field-level shapes are **out of scope** for this Framework. Registers own field detail later.

### 7.1 Objects

#### Validation Run

| Aspect | Definition |
|--------|------------|
| **Purpose** | One deterministic Validation execution unit with pinned baselines, options, and target set. |
| **Owner** | STEP6 Schema Validation |
| **Lifecycle** | Created at Run start → executes Rule Executions → closed with Validation Summary |

#### Validation Target

| Aspect | Definition |
|--------|------------|
| **Purpose** | The unit under validation. Primary target is a System Package identified with Inventory `SYS-*`. |
| **Owner** | Referenced from STEP4 identity; evaluated by STEP6 |
| **Lifecycle** | Selected into a Run → evaluated across Layers → contributes Results / Findings |

#### Rule Execution

| Aspect | Definition |
|--------|------------|
| **Purpose** | Single evaluation of one Rule against one Target (or path within a Target). |
| **Owner** | STEP6 Schema Validation |
| **Lifecycle** | Bound → executed → yields Execution Status and optional Severity |

#### Validation Result

| Aspect | Definition |
|--------|------------|
| **Purpose** | Aggregated outcome for a Target, file, or path set within a Run. |
| **Owner** | STEP6 Schema Validation |
| **Lifecycle** | Accumulates Rule Executions → feeds Summary and `schemaComplete` rollup |

#### Validation Finding

| Aspect | Definition |
|--------|------------|
| **Purpose** | Persistent Validation issue record in the `VAL-*` namespace. |
| **Owner** | STEP6 Schema Validation |
| **Lifecycle** | Allocated under VAL policy → immutable ID · updatable only by non-mutating status history rules defined later |

#### Validation Summary

| Aspect | Definition |
|--------|------------|
| **Purpose** | Run-level rollup of coverage, counts, Deferred items, and Run `schemaComplete`. |
| **Owner** | STEP6 Schema Validation |
| **Lifecycle** | Produced at Run close · consumed by Validation Report |

#### Deferred Validation Item

| Aspect | Definition |
|--------|------------|
| **Purpose** | Explicit record of validation work deferred or not executed in this Run (policy, scope, or L7 deferral). |
| **Owner** | STEP6 Schema Validation |
| **Lifecycle** | Opened when deferral decided → carried in Summary / Report · not a STEP5 Deferred rewrite |

#### schemaComplete

| Aspect | Definition |
|--------|------------|
| **Purpose** | Completeness property stating whether Schema Validation required coverage succeeded (§10). |
| **Owner** | STEP6 Schema Validation |
| **Lifecycle** | `NOT_RUN` before official Run → `UNDECIDED` during incomplete coverage → `YES` / `NO` at Target/Run rollup close |

### 7.2 Object relations

```text
Validation Run
  ├── Validation Target[]
  │      └── Rule Execution[] ──► Validation Result
  │                                └── Validation Finding (VAL-*)[]
  ├── Deferred Validation Item[]
  └── Validation Summary
         └── schemaComplete (Run rollup)
```

See Appendix D — Future Extension (Validation Registers). Field shapes are out of Framework scope.

---

## 8. Validation Layers

Validation Layers define **concern depth** for Schema Validation.

They **SHALL NOT** be interpreted as Pipeline Stages.  
**Result Rollup** and **Validation Report** are **not** Validation Layers.

**Cascade:** A **BLOCKER** Severity on a Target at L1 or L2 **SHALL** cause deeper Layers for that Target to be **SKIPPED**. Other Targets in the same Run **MAY** continue.

### 8.1 L1 — Package Integrity

| Aspect | Definition |
|--------|------------|
| **Purpose** | Establish that the Validation Target package and its required file set are identifiable for validation. |
| **Validation Target** | System Package (`SYS-*` / package directory) |
| **Input** | Target identity · expected package file set norms · path resolution facts (RO) |
| **Output** | Package integrity **PASS** / **FAILED** · cascade **SKIPPED** for deeper Layers on BLOCKER |
| **Dependency** | None (first Layer). Depends only on Target selection into the Run. |

### 8.2 L2 — Syntax Integrity

| Aspect | Definition |
|--------|------------|
| **Purpose** | Establish that package files are syntactically processable (e.g., valid JSON text). |
| **Validation Target** | Individual package files |
| **Input** | File content from package resolved at L1 |
| **Output** | Syntax **PASS** / **FAILED** per file · deeper Layers **SKIPPED** for unparsable files on BLOCKER |
| **Dependency** | **SHALL** follow L1 **PASS** (or policy-allowed partial package continuation) for the file set |

### 8.3 L3 — Structure Integrity

| Aspect | Definition |
|--------|------------|
| **Purpose** | Establish that document structure conforms to SPS Schema structure norms. |
| **Validation Target** | Parsed document root / structural nodes per file |
| **Input** | Parse-successful document (L2) · structure norms (Schema standard RO) |
| **Output** | Structure **PASS** / **FAILED** / Warning outcomes |
| **Dependency** | **SHALL** require L2 **PASS** for the same file |

### 8.4 L4 — Field Constraints

| Aspect | Definition |
|--------|------------|
| **Purpose** | Evaluate required fields, types, and value domains. |
| **Validation Target** | Fields / JSON paths within a file |
| **Input** | Structured document (L3) · field constraint norms |
| **Output** | Field-level **PASS** / **FAILED** / Warning outcomes |
| **Dependency** | **SHALL** require L3 success sufficient to address the constrained paths |

### 8.5 L5 — Reference Integrity

| Aspect | Definition |
|--------|------------|
| **Purpose** | Establish that internal references resolve to existing targets. |
| **Validation Target** | Reference-bearing paths within package files |
| **Input** | Constrained/typed values (L4 as applicable) · reference targets in scope |
| **Output** | Reference **PASS** / **FAILED** / Warning outcomes |
| **Dependency** | **SHOULD** require L4 where type/domain of the reference token matters; **SHALL** require parseable structure (L2/L3) |

### 8.6 L6 — Cross-file Integrity

| Aspect | Definition |
|--------|------------|
| **Purpose** | Establish consistency across package files (`profile` · `logic` · `anchors` · `system_meta`). |
| **Validation Target** | System Package as a multi-file set |
| **Input** | Per-file outcomes and values from L1–L5 as available |
| **Output** | Cross-file **PASS** / **FAILED** / Warning outcomes |
| **Dependency** | **SHALL** require L1; **SHOULD** require relevant files past L2; partial execution policy is deferred |

See Appendix C (U11).

### 8.7 L7 — Semantic Consistency

| Aspect | Definition |
|--------|------------|
| **Purpose** | Evaluate meaning-level consistency beyond structural schema constraints. |
| **Validation Target** | Package / conceptual groupings |
| **Input** | Structural and referential outcomes from L1–L6 · semantic norms (if in scope) |
| **Output** | Semantic **PASS** / **FAILED** / Warning · or Deferred / **SKIPPED** when out of Run scope |
| **Dependency** | **MAY** be deferred by Design / Catalog / Run policy. Default treatment **MAY** be Deferred until Catalog decides In Scope. |

See Appendix C (U3).

---

## 9. Validation Status Model

The Validation Status Model has two independent axes:

1. **Execution Status** — whether/how an evaluation occurred  
2. **Severity** — gravity of a Rule Outcome when applicable  

**Severity is a Rule Outcome property. Severity is not a Layer attribute.**

**`schemaComplete` is a separate Completeness model (§10). It is not an Execution Status and not a Severity.**

### 9.1 Execution Status

| Status | Meaning |
|--------|---------|
| **PASS** | Evaluation completed and satisfied the Rule / Layer expectation. |
| **FAILED** | Evaluation completed and did not satisfy the Rule / Layer expectation. |
| **SKIPPED** | Evaluation was not performed because of prior BLOCKER cascade or explicit skip policy. |
| **BLOCKED** | Evaluation could not start or continue due to missing pin, gate, or infrastructure blockage. |
| **NOT_RUN** | Outside the Run scope; never started (distinct from **SKIPPED**). |

### 9.2 Severity

| Severity | Meaning |
|----------|---------|
| **BLOCKER** | Hard Rule Outcome. Deeper Layers for the same Target **SHALL** be **SKIPPED**. Contributes to non-YES `schemaComplete` under §10 policy. |
| **ERROR** | Norm violation. Evaluation of other Rules/Layers **MAY** continue where meaningful. Target `schemaComplete` **SHALL** be **NO** when the Rule is required. |
| **WARNING** | Non-blocking concern. Target `schemaComplete` **MAY** remain **YES** if no required BLOCKER/ERROR exists. |
| **INFO** | Observational / trace outcome. **SHALL NOT** alone force `schemaComplete` = NO. |

See Appendix C (U10).  
See Appendix C (U9).  
See Appendix C (U7).

### 9.3 Relation between Execution Status and Severity

```text
Rule Execution
  ├── Execution Status ∈ { PASS, FAILED, SKIPPED, BLOCKED, NOT_RUN }
  └── Severity ∈ { BLOCKER, ERROR, WARNING, INFO }   # when an outcome carries severity
            ↓
      Validation Result
            ↓
      VAL-* (per VAL policy — Policy Body)
            ↓
      schemaComplete (separate model — §10)
```

| Execution Status | Severity expectation |
|------------------|----------------------|
| **PASS** | Severity ordinarily absent; INFO **MAY** appear for traces |
| **FAILED** | Severity **SHALL** be present (`BLOCKER` \| `ERROR` \| `WARNING` per Rule) |
| **SKIPPED** | Severity ordinarily absent (cascade reason recorded on Result) |
| **BLOCKED** | Severity ordinarily absent (block reason recorded) |
| **NOT_RUN** | No Severity |

Severity **SHALL NOT** be assigned as a property of a Validation Layer itself. Layers host Rules; Rules produce Severity.

---

## 10. schemaComplete

### 10.1 Purpose

`schemaComplete` states whether Schema Validation has established that a unit satisfies required Schema Validation coverage.

It answers:

```text
Is schema-complete established for Standardization reliance on this unit?
```

consistent with STEP5 SCH-R intent (reference only; execution owned by STEP6).

### 10.2 Owner

| Property | Owner |
|----------|-------|
| `schemaComplete` | **STEP6 Schema Validation** |
| `packageComplete` | **STEP5 Architecture Audit** |

STEP6 **SHALL NOT** write `schemaComplete` into STEP5 Decision Registers.  
STEP5 Audit-time `schemaComplete: Reserved` is not an Active STEP6 result.

### 10.3 Difference from `packageComplete`

| Aspect | `packageComplete` (STEP5) | `schemaComplete` (STEP6) |
|--------|---------------------------|--------------------------|
| Owner | Architecture Audit | Schema Validation |
| Typical basis | Package file / audit Decision completeness | Schema norm Validation outcomes |
| Finding namespace | Uses Audit chain (`FND-*` etc.) | Uses `VAL-*` |
| When Active | After Audit Exit path for that SYS | After Official Validation coverage for that unit |
| Interchangeable? | **No** | **No** |

### 10.4 States

| State | Meaning |
|-------|---------|
| **YES** | Required Schema Validation coverage is complete and no required Rule Outcome has BLOCKER or ERROR. WARNING/INFO alone **MAY** remain with YES. |
| **NO** | One or more required Rule Outcomes have BLOCKER or ERROR, or Strict policy treats blocking cascade as NO. |
| **UNDECIDED** | Official Run started but required coverage is incomplete, or Run still open. |
| **NOT_RUN** | No Official Validation Run has been performed for the unit / Run. Design Phase and non-official activity remain NOT_RUN for official claims. |

### 10.5 Rollup (conceptual only)

Rollup is conceptual aggregation. Detailed algorithms are **out of scope** for this Framework.

```text
Path outcomes
        ↓
File schemaComplete
        ↓
Package schemaComplete
        ↓
System (SYS-*) schemaComplete
        ↓
Validation Run schemaComplete (Validation Summary)
```

**Conceptual rules (non-algorithmic)**

- A higher level **SHALL NOT** be YES if a required lower level is NO.
- A higher level is UNDECIDED while required lower coverage is incomplete.
- Run-level NOT_RUN applies when Official Validation Entry was not used.

See Appendix C (U7).  
See Appendix D — Future Extension (Validation Registers · Validation Report).

---

## 11. VAL-* Namespace

This section defines the **Validation Finding Namespace policy**.  
It is Framework Constitution for Findings. It does **not** define Rule Namespace, Register shapes, or ID allocation algorithms.

### 11.1 Purpose

`VAL-*` is the exclusive namespace for **Validation Findings** produced by STEP6 Schema Validation.

`VAL-*` **SHALL**:

- Identify Validation issues discovered during Schema Validation
- Provide permanent, citable Finding identities for Results · Reports · STEP7 consumption
- Preserve separation between Architecture Audit judgment and Schema Validation judgment

`VAL-*` **SHALL NOT**:

- Serve as Architecture Audit Finding IDs
- Encode Rule Catalog namespaces
- Authorize mutation of STEP5 or STEP4 artifacts

### 11.2 Owner

| Namespace | Owner | Layer |
|-----------|-------|-------|
| `VAL-*` | **STEP6 Schema Validation** | Schema Validation |
| `FND-*` | STEP5 Architecture Audit | Architecture Audit |

Owner of every `VAL-*` Finding **SHALL** be STEP6.

### 11.3 Separation from `FND-*`

```text
VAL-*  ≠  FND-*
```

| Policy | Norm |
|--------|------|
| Separation | Namespaces are disjoint. No shared ID space. |
| Replace | `VAL-*` **SHALL NOT** replace `FND-*` |
| Mutate | `VAL-*` **SHALL NOT** mutate `FND-*` records |
| Promote | `VAL-*` **SHALL NOT** be promoted into `FND-*`, and `FND-*` **SHALL NOT** be promoted into `VAL-*` |
| Pointer | `VAL-*` **MAY** hold **read-only pointers** to `FND-*` / other STEP5 IDs |

STEP5 Findings remain Architecture Audit history. STEP6 Findings remain Schema Validation history.

### 11.4 Permanent ID principles

| Principle | Norm |
|-----------|------|
| **Permanent** | Once allocated in an Official Validation context, a VAL ID **SHALL** remain permanently meaningful |
| **Delete forbidden** | Deleting a VAL ID to erase history **SHALL NOT** occur |
| **Reuse forbidden** | Reassigning a retired or prior VAL ID to a different Finding **SHALL NOT** occur |
| **Promote forbidden** | Converting VAL ↔ FND identity **SHALL NOT** occur |

Illustrative form only (not an allocation policy):

```text
VAL-001
VAL-002
…
```

See Appendix D — Future Extension (Validation Registers).  
See Appendix C (U9).

### 11.5 Rule Namespace (explicit non-decision)

| Topic | Framework status |
|-------|------------------|
| **Rule Namespace** (e.g. whether Validation Rules use `SCH-R-*`, `SV-R-*`, or another prefix) | **Not decided in this Framework** |
| Decision authority | **Schema Rule Catalog** stage |

This Framework **SHALL NOT** finalize Rule Namespace.  
`VAL-*` is a **Finding** namespace only. It is not a Rule ID namespace.

### 11.6 Trace Pointer policy

A VAL Finding **MAY** include read-only Trace Pointers to:

| Pointer class | Examples (conceptual) |
|---------------|------------------------|
| System | `SYS-*` |
| Artifact | package file identity |
| Path | JSON / structure path |
| Rule | Rule ID (Catalog-pinned) |
| Layer | L1–L7 |
| Severity | BLOCKER · ERROR · WARNING · INFO |
| STEP5 context | `FND-*` · `DEC-*` · `SCH-R-*` (pointer only) |
| STEP4 context | Inventory identity pointers (RO) |

Trace Pointers **SHALL** be references only.  
Trace Pointers **SHALL NOT** rewrite the pointed-to artifact.

### 11.7 Relation to Validation Result · schemaComplete · Report

| Relation | Policy |
|----------|--------|
| **Validation Result → VAL** | Results aggregate Rule Executions. VAL Findings **SHALL** be derivable from failing / policy-selected Outcomes recorded in Results. **PASS**-only Results **MAY** have zero VAL. |
| **VAL → schemaComplete** | VAL records explain non-YES conditions. `schemaComplete` is **not** a VAL ID and is **not** assigned per Finding. Completeness remains the §10 property computed from required Outcomes. |
| **VAL → Validation Report** | Report **SHALL** be able to index and cite VAL IDs. Report **SHALL NOT** invent Findings outside the VAL namespace. |
| **Absence of VAL** | Absence of VAL does not alone prove `schemaComplete=YES`; coverage and required Outcomes still govern §10. |

```text
Rule Execution (FAILED / selected Warn …)
        ↓
Validation Result
        ↓
VAL-* Finding
        ↓
cited by Validation Summary / Report
        ↓
informs (does not replace) schemaComplete
```

---

## 12. Traceability

This section defines **trace direction and Framework-level Trace Pointer classes**.  
It does **not** define Register field schemas.

### 12.1 Purpose

Traceability **SHALL** ensure every Validation claim can be followed forward to Report output and backward to Target · Rule · Path without mutating prior SPS artifacts.

### 12.2 Forward Trace

```text
Validation Target
        ↓
Rule Execution
        ↓
Validation Result
        ↓
VAL-*
        ↓
schemaComplete
        ↓
Validation Report
```

Forward Trace **SHALL** remain reconstructible from Run artifacts under pinned baselines (§6 · §13).

### 12.3 Reverse Trace

```text
Validation Report
        ↓
schemaComplete
        ↓
VAL-*
        ↓
Validation Result
        ↓
Rule
        ↓
Validation Target
```

Reverse Trace **SHALL** recover Rule · Layer · Severity · Artifact · Path context associated with a Report claim or VAL citation.

### 12.4 STEP4 / STEP5 in Trace

| Asset class | Trace role | Mutation |
|-------------|------------|----------|
| STEP4 Frozen Assets | Optional RO Fact pointers | **SHALL NOT** rewrite |
| STEP5 Frozen Suite · Registers · OFFICIAL Report · `packageComplete` | Optional RO Audit / SCH-R pointers | **SHALL NOT** rewrite |

Trace **SHALL** read. Trace **SHALL NOT** rewrite.

### 12.5 Trace Pointer set (Framework level)

At Framework level, Trace **SHALL** be expressible using at least the following pointer classes:

| Pointer | Role |
|---------|------|
| **Rule ID** | Which Rule was evaluated |
| **Target** | Which Validation Target (`SYS-*` / package) |
| **Artifact** | Which package file / artifact |
| **Path** | Which structural / JSON path |
| **Layer** | Which Validation Layer (L1–L7) |
| **Severity** | Rule Outcome severity when applicable |
| **Execution Status** | **PASS** · **FAILED** · **SKIPPED** · **BLOCKED** · **NOT_RUN** |
| **VAL ID** | Finding identity when allocated |
| **schemaComplete** | Completeness state for the rolled-up unit |
| **Run identity** | Which Validation Run produced the chain |

Register Shape / storage columns for these pointers are **out of scope** here.

See Appendix D — Future Extension (Validation Registers · Validation Report).

### 12.6 Deterministic Trace

Identical pinned inputs and options **SHALL** produce identical Forward and Reverse Trace graphs, including ordering. See §13.

---

## 13. Determinism

### 13.1 Purpose

Schema Validation **SHALL** be deterministic: the same pinned inputs and options produce the same Validation Outcomes.

Determinism is a Framework Constitution requirement. This section defines **identity of results**, not hashes, algorithms, or engine implementation.

### 13.2 Determinism contract

Given identical:

| Input pin | Meaning |
|-----------|---------|
| **Input package** | Target System Definition contents under evaluation (read-only) |
| **Rule Catalog Version** | Pinned Catalog |
| **Validator Version** | Pinned Validator identity |
| **Runtime Baseline** | Platform freeze reference pin |
| **Execution options** | Layer scope · required-rule set · deferral options · severity policy pins |
| **Target Set** | Ordered/selected Validation Targets for the Run |

Then Validation **SHALL** produce identical:

| Output | Meaning |
|--------|---------|
| **Validation Results** | Same Outcomes for the same Target · Artifact · Path · Rule |
| **VAL set** | Same Finding identities under the allocation rules then in force |
| **schemaComplete** | Same Completeness states at each rollup level in scope |
| **Validation Report content** | Same reportable claims for the same Report Class |

```text
Identical Input
+ Identical Rule Catalog
+ Identical Validator Version
+ Identical Runtime Baseline
+ Identical Execution Options
+ Identical Target Set
        ↓
Identical Results
        ↓
Identical VAL
        ↓
Identical schemaComplete
        ↓
Identical Report
```

### 13.3 Ordering principle (Framework level)

For stable assignment and comparison, evaluation and reporting order **SHALL** follow this conceptual order:

```text
Target
  ↓
Artifact
  ↓
Path
  ↓
Rule
  ↓
Severity
  ↓
VAL
```

This ordering principle is normative at Framework level.  
Concrete sort keys, collation, and allocation functions are **out of scope** (Pipeline / Register / Engine stages).

See Appendix C (U12).  
See Appendix D — Future Extension (Validation Pipeline · Validation Registers).

### 13.4 Non-determinism forbidden sources

The following **SHALL NOT** be allowed to change Official Validation Outcomes when pins are held constant:

- Reviewer identity
- Wall-clock time as a decision input
- Unsorted iteration over unordered collections
- Environment-specific path canonicalization that is not pinned

See Appendix C (U8).

---

## 14. Non-Mutation

### 14.1 Purpose

Validation **SHALL** observe inputs, judge conformance, and record Validation-layer outputs only.  
Validation **SHALL NOT** modify governed SPS, Runtime, or System Definition artifacts.

### 14.2 Forbidden mutation surfaces

STEP6 Schema Validation **SHALL NOT** modify:

| Surface | Policy |
|---------|--------|
| **STEP4 Frozen Assets** | Forbidden |
| **STEP5 Frozen Suite** | Forbidden |
| **STEP5 OFFICIAL Report** | Forbidden |
| **`packageComplete`** | Forbidden |
| **Runtime** | Forbidden |
| **Registry** | Forbidden |
| **Loader** | Forbidden |
| **Contract** | Forbidden |
| **System JSON** (package definition files) | Forbidden |

### 14.3 Allowed Validation behavior

Validation **SHALL** only:

```text
READ   →  baselines · targets · norms
JUDGE  →  Rule Executions · Severity · schemaComplete
RECORD →  Validation-layer artifacts
```

### 14.4 Auto-change prohibition

The following **SHALL NOT** occur as part of Schema Validation:

| Action | Policy |
|--------|--------|
| **Auto Fix** | Forbidden |
| **Auto Migration** | Forbidden |
| **Auto Rewrite** | Forbidden |

Correction and Standardization belong to later controlled processes (STEP7+), not to Validation execution.

### 14.5 Allowed outputs only

Official Validation **MAY** create or update only Validation-layer records, including:

| Output | Role |
|--------|------|
| **Validation Result** | Outcome aggregation |
| **VAL-*** | Validation Findings |
| **Deferred Validation Item** | Explicit deferrals |
| **Validation Summary** | Run rollup (includes `schemaComplete`) |
| **Validation Report** | Aggregate report artifact |

Creating these outputs is recording, not mutation of STEP4/STEP5/Runtime/System JSON.

See Appendix C (U10).

---

## 15. Pipeline Boundary

### 15.1 Purpose

This section defines the **responsibility boundary** between this Framework and the Validation Pipeline.

The Framework is the higher SSOT. The Pipeline is a separate SSOT that **consumes** this Framework and **SHALL NOT** modify it.

### 15.2 Separation norms

| Norm | Statement |
|------|-----------|
| No Pipeline inside Framework | This Framework **SHALL NOT** define the Validation Pipeline body. |
| Interface only | This Framework **SHALL** define only the **Pipeline Interface** obligations below. |
| Separate SSOT | Validation Pipeline **SHALL** be authored as a separate STEP6 document. |
| Consume | Pipeline **SHALL** consume Framework Objects · Layers · Status · Policy · Governance. |
| Non-mutation of Framework | Pipeline **SHALL NOT** rewrite Framework norms. Structural change to Framework requires Framework revision policy (§20). |

```text
STEP6 Framework SSOT (this document)
        ↓  consumed by
Validation Pipeline SSOT (separate)
        ↓  applies
Rule Catalog · Registers · Report · Engine (later)
```

### 15.3 What the Pipeline defines

The Validation Pipeline document **SHALL** own:

| Concern | Meaning |
|---------|---------|
| **Stage** | Ordered Pipeline Stages |
| **Execution Flow** | How Targets move through Stages |
| **Rollup Procedure** | How Path→File→Package→System→Run aggregation is executed |
| **Rule Binding** | How Catalog Rules bind to Layers / Targets for a Run |
| **Validator Orchestration** | How Validator invocations are sequenced and pinned |

### 15.4 What the Framework defines

This Framework **SHALL** own:

| Concern | Sections |
|---------|----------|
| **Validation Object** | §7 |
| **Validation Layer** | §8 |
| **Status Model** | §9 |
| **Policy** | §11–§14 |
| **Governance** | §15–§20 · Appendix |

### 15.5 Pipeline Interface (obligations)

A conforming Pipeline **SHALL**:

| # | Interface obligation |
|---|----------------------|
| I1 | Bind Rules to Validation Layers (§8) without inventing alternate Layer meanings |
| I2 | Produce Rule Executions · Validation Results · VAL Findings · Validation Summary |
| I3 | Honor Severity cascade · Determinism (§13) · Non-Mutation (§14) |
| I4 | Emit `schemaComplete` consistent with §10 |
| I5 | Preserve Traceability Forward / Reverse (§12) |
| I6 | Accept pinned baselines from §6 (including ACTIVE Handoff for Official Validation) |

Pipeline stage names, algorithms, and orchestration internals are **out of scope** for this Framework.

---

## 16. Output Artifacts

### 16.1 Purpose

This section defines the **STEP6 artifact hierarchy and dependency**.  
It does **not** define repository paths or file-system layout.

### 16.2 Artifact hierarchy

```text
STEP6 Framework
        ↓
Validation Pipeline
        ↓
Schema Rule Catalog
        ↓
Validation Schema
        ↓
Validation Registers
        ↓
Validation Report
        ↓
STEP6 Final Freeze
        ↓
STEP6 → STEP7 Handoff
```

### 16.3 Artifact Dependency Matrix

| Artifact | Purpose | Depends On | Produces | Owner |
|----------|---------|------------|----------|-------|
| **STEP6 Framework** | Normative Validation Constitution (Objects · Layers · Status · Policy · Governance) | STEP5 Final Freeze · STEP4 RO · Schema Definition (RO) | Design authority for all STEP6 design docs | Schema Validation |
| **Validation Pipeline** | Stage · flow · rollup procedure · rule binding · validator orchestration | Framework | Executable sequencing contract for Runs | Schema Validation |
| **Schema Rule Catalog** | Executable / normative Validation Rules · Layer/Type/Severity defaults | Framework · Pipeline interface · STEP5 SCH-R (RO reference) | Rule IDs · statements · pins for Runs | Schema Validation |
| **Validation Schema** | Machine-checkable schema artifact(s) supporting Catalog/Engine (if used) | Framework · Catalog · System_Schema_Definition (RO) | Schema constraints usable by validation tooling | Schema Validation |
| **Validation Registers** | Persistent Run · Result · Finding (`VAL-*`) · Deferred records | Framework · Pipeline · Catalog · (optional) Validation Schema | Traceable Run evidence set | Schema Validation |
| **Validation Report** | Aggregate DRAFT / OFFICIAL Validation claims | Registers · Summary · `schemaComplete` | Report Class artifact for Exit / Handoff | Schema Validation |
| **STEP6 Final Freeze** | Declares STEP6 design/ops closure for the Validation program slice | Framework Frozen · Pipeline · Catalog · Official Exit evidence as applicable | Freeze declaration · next-session authority | Schema Validation |
| **STEP6 → STEP7 Handoff** | Transfer package to Standardization | Final Freeze · OFFICIAL Report · `schemaComplete` rollup · Deferred extract | STEP7 input manifest | Schema Validation → STEP7 consumer |

### 16.4 Dependency rules

- Lower artifacts in §16.2 **SHALL NOT** redefine higher Framework norms.
- Official Validation Report **SHALL** cite Registers / VAL / `schemaComplete`, not invent parallel Finding spaces.
- STEP7 Handoff **SHALL** consume Freeze + OFFICIAL outcomes; it **SHALL NOT** reopen Framework design informally.

Exact filenames remain a project packaging concern outside this Governance section’s dependency model.

---

## 17. Dual Exit Gate

### 17.1 Purpose

STEP6 maintains **two distinct Exit Gates**:

1. **Design Exit** — Framework (and readiness for downstream design) is closed enough to proceed  
2. **Official Validation Exit** — Official Validation execution is complete  

These Gates **SHALL NOT** be conflated.

| Result | Meaning |
|--------|---------|
| **HOLD** | Gate criteria incomplete |
| **PASS** | Gate criteria met |

### 17.2 Design Exit

**Design Exit** closes Framework design authority for proceeding to Pipeline / Catalog design and eventual Framework Freeze.

```text
Framework (this document) complete as Draft/Frozen design
        ↓
Validation Pipeline design permitted
        ↓
Schema Rule Catalog design permitted
        ↓
Framework Freeze permitted (when project declares Framework Frozen)
```

| Gate | Criterion |
|------|-----------|
| **D1** | Core Body §1–§10 present and internally consistent |
| **D2** | Policy Body §11–§14 present (VAL · Trace · Determinism · Non-Mutation) |
| **D3** | Governance Body §15–§20 present (this body) |
| **D4** | Appendix A–D present; Pending Decisions confined to Appendix C |
| **D5** | Design Entry baseline recognized (§4 · §6); ACTIVE Handoff **not** required |

Design Exit **PASS** **SHALL NOT** authorize Official `schemaComplete` claims.

### 17.3 Official Validation Exit

**Official Validation Exit** closes an Official Validation program run (or declared official scope).

```text
Official Validation Complete
        ↓
Validation Report OFFICIAL
        ↓
schemaComplete Rollup complete
        ↓
STEP6 Final Freeze (as applicable)
        ↓
STEP6 → STEP7 Handoff
```

| Gate | Criterion |
|------|-----------|
| **E1** | Official Validation Entry satisfied — **ACTIVE Handoff** required (§4 · §6) |
| **E2** | Target Set Validation complete per Pipeline / Catalog pins |
| **E3** | Required Rule Coverage complete |
| **E4** | `schemaComplete` Rollup complete for declared scope (`NOT_RUN` / residual `UNDECIDED` ⇒ HOLD) |
| **E5** | VAL Register complete per VAL policy for in-scope Outcomes |
| **E6** | Validation Report Class = **OFFICIAL** |
| **E7** | Deferred items extracted and separated for Handoff |

### 17.4 ACTIVE Handoff relationship

| Gate | ACTIVE Handoff |
|------|----------------|
| **Design Exit** | **Not required** |
| **Official Validation Exit** | **Required** (Official Validation Entry) |

ACTIVE Handoff supplies the official STEP5→STEP6 input package.  
It does **not** replace Design Exit, and Design Exit does **not** replace ACTIVE Handoff.

---

## 18. Relation to STEP5 SCH-R

### 18.1 Purpose

This section defines how STEP6 relates to STEP5 **SCH-R** Schema Rules without mutating STEP5.

### 18.2 Norms

| Item | Norm |
|------|------|
| **Reference** | STEP5 `SCH-R-*` **SHALL** be treated as **reference** norms / intent pins for Schema Validation |
| **Non-mutation** | STEP6 **SHALL NOT** modify STEP5 `SCH-R-*` statements or the STEP5 Rule Catalog |
| **STEP5 Catalog** | STEP5 Audit Rule Catalog is **Read-only** to STEP6 |
| **Execution rules** | STEP6 **SHALL** define executable Validation Rules in the **STEP6 Schema Rule Catalog** |
| **Execution Owner** | Schema Validation execution Owner remains **STEP6** |
| **Finding namespace** | Validation Findings remain `VAL-*` (not `FND-*`) |

### 18.3 Rule Pin

A **Rule Pin** is a versioned reference that freezes which Rule texts apply to a Validation Run.

| Pin | Role |
|-----|------|
| **STEP5 SCH-R Pin** | Optional/required-as-cited reference to STEP5 Catalog Version + `SCH-R-*` IDs for intent traceback |
| **STEP6 Catalog Pin** | Mandatory for Official Runs — STEP6 Schema Rule Catalog Version used for execution |

Official Runs **SHALL** record the STEP6 Catalog Pin.  
When SCH-R intent is cited, Runs **SHOULD** also record the STEP5 Catalog / SCH-R Pin for Traceability (§12).

### 18.4 Rule Namespace

This Framework **SHALL NOT** finalize the STEP6 Rule Namespace.  
Rule Namespace selection is owned by the **Schema Rule Catalog** stage.  
Candidates and trade-offs reside in **Appendix C (Pending Decisions)**.

Confirmed Framework policy: Finding namespace is `VAL-*`; Rule Namespace is separate and Catalog-owned.

---

## 19. STEP7 Boundary

### 19.1 Purpose

STEP6 and STEP7 have distinct Owners and outputs.  
STEP7 **SHALL** consume Validation outcomes and **SHALL NOT** modify STEP6 Framework or Official Validation artifacts informally.

### 19.2 Responsibility split

| STEP6 Schema Validation | STEP7 Standardization |
|-------------------------|------------------------|
| Validation execution | Standardization |
| Validation Result | Resolution of Standardization work items |
| `VAL-*` Findings | Improvement / remediation planning |
| `schemaComplete` | Migration / conformance elevation under STEP7 rules |
| Validation Report | Uses Report as input context |

```text
STEP6 Validation outcomes (RO to STEP7)
        ↓  consume
STEP7 Standardization
```

### 19.3 Non-mutation toward STEP6

STEP7 **SHALL NOT**:

- Rewrite this Framework
- Rewrite OFFICIAL Validation Report claims
- Reassign or delete `VAL-*` identities
- Redefine `schemaComplete` meaning
- Treat Validation success as automatic Standardization completion

STEP7 **MAY** create Standardization artifacts that **cite** STEP6 Results · VAL · `schemaComplete` · Deferred items via Handoff.

---

## 20. Revision History

### 20.1 Revision policy

| Rule | Statement |
|------|-----------|
| Identity | Document identity remains `STEP6_Schema_Validation_Framework.md` |
| Versioning | Structural or normative change after Framework Freeze **SHALL** bump Version (e.g. v1.1+) under project freeze/ADR practice |
| Draft evolution | While Status = Draft, incremental STEP6-1B authorship **MAY** append rows below without changing Section numbers |
| Scope of change | Revisions **SHALL NOT** silently rewrite STEP4/STEP5 artifacts |
| Pending Decisions | New unresolved design choices **SHALL** be recorded in Appendix C until decided; decided items leave Appendix C via explicit revision note |

### 20.2 History

| Version | Status | Content |
|---------|--------|---------|
| **v1.0** | **Draft** | STEP6-1B-1 Framework Skeleton — §1–§20 structure · placeholders |
| **v1.0** | **Draft** | STEP6-1B-2A Core Body — §1–§10 |
| **v1.0** | **Draft** | STEP6-1B-2B Policy Body — §11–§14 |
| **v1.0** | **Draft** | STEP6-1B-2C Governance Body — §15–§20 · Appendix A–D · Framework Draft complete |
| **v1.0** | **Draft (Freeze Candidate)** | STEP6-1D QA Patch — RV-001~RV-005 resolved; RV-006 / U1–U12 unchanged |

---

# Appendix

## Appendix A — Glossary

| Term | Meaning |
|------|---------|
| **Validation Run** | One deterministic Schema Validation execution unit with pinned baselines and Target Set |
| **Validation Target** | Unit under validation; primary form is System Package / `SYS-*` |
| **Rule Execution** | Evaluation of one Rule against one Target or path |
| **Validation Result** | Aggregated Outcomes for a Target / file / path set |
| **Validation Finding** | Persistent Finding in `VAL-*` namespace |
| **Validation Summary** | Run-level rollup including coverage and `schemaComplete` |
| **Deferred Validation Item** | Explicitly deferred or not-executed validation work item for a Run |
| **schemaComplete** | STEP6 Completeness property for Schema Validation coverage success |
| **packageComplete** | STEP5 Completeness property owned by Architecture Audit (not interchangeable with `schemaComplete`) |
| **Schema Validation Layer** | The SPS workflow layer for Schema Validation (STEP6), between Architecture Audit and Standardization |
| **Validation Layer (L1–L7)** | Concern depth inside Schema Validation (Package → … → Semantic); not a Pipeline Stage |
| **Framework Validation Layer** | Synonym in Framework text for the STEP6 Schema Validation Layer as governed by this SSOT (not an L1–L7 depth) |
| **Validation Layer** | Concern depth L1–L7; not a Pipeline Stage |
| **Rule Category** | Catalog organizational axis (e.g. PKG · SYN · SCH …) |
| **Rule Type** | Kind of check (Package · Syntax · Structure · Required · Type · Domain · Reference · Cross-file · Semantic) |
| **Rule Namespace** | Rule ID prefix space (Catalog-owned; not finalized by this Framework) |
| **Execution Status** | **PASS** · **FAILED** · **SKIPPED** · **BLOCKED** · **NOT_RUN** |
| **Severity** | BLOCKER · ERROR · WARNING · INFO — Rule Outcome property |
| **Trace Pointer** | Read-only reference used for Forward/Reverse Trace |
| **Rule Pin** | Versioned freeze of which Rule texts apply to a Run |
| **Design Entry** | Permission to author STEP6 design docs after STEP5 Final Freeze |
| **ACTIVE Handoff** | Official STEP5→STEP6 validation input package gate |
| **Official Validation Entry** | Permission to run Official Validation (requires ACTIVE Handoff) |
| **Design Exit** | Gate closing Framework design readiness for Pipeline/Catalog/Freeze path |
| **Official Validation Exit** | Gate closing Official Validation execution and OFFICIAL Report path |

## Appendix B — Reserved Terms

Terms reserved for later STEP6 / SPS documents. Not assigned Active meaning beyond reservation in this Framework:

| Reserved term | Intended future use |
|---------------|---------------------|
| `runtimeComplete` | Later completeness property (not STEP6 Active) |
| `contractComplete` | Later completeness property (not STEP6 Active) |
| Report Class `DRAFT` / `OFFICIAL` | Validation Report classification (Report stage) |
| Handoff Class `TEMPLATE` / `ACTIVE` | Borrowed STEP5 handoff pattern for STEP6→STEP7 (Handoff stage) |
| Validator Profile | Named Validator configuration pin (Engine/Pipeline stage) |
| Coverage Class | Required vs optional Rule coverage banding (Catalog stage) |
| Finding Occurrence | Count / multi-location packing inside one VAL (Register stage) |

## Appendix C — Pending Decisions

Unresolved choices. **Not normative until decided.** Decision Owner is noted.

| ID | Topic | Options (summary) | Decide in |
|----|-------|-------------------|-----------|
| **U1** | STEP6 Rule Namespace | (A) Execute under `SCH-R-*` IDs directly (B) New `SV-R-*` / `VAL-R-*` mapped to SCH-R (C) Dual catalogs: STEP5 SCH-R RO + STEP6 Catalog | Schema Rule Catalog |
| **U2** | Primary Validation Target grain | Package/SYS-first vs File-first addressing | Pipeline · Catalog |
| **U3** | L7 Semantic Consistency scope | In first Official Run vs Deferred default | Catalog · Pipeline options |
| **U4** | Where Active `schemaComplete` is stored | Summary/Registers only vs additional Validation Decision object (never STEP5 DEC rewrite) | Registers · Report |
| **U5** | WARNING-only Targets | Remain `schemaComplete=YES` (Framework default lean) vs Strict NO | Catalog severity policy |
| **U6** | Cross-run VAL identity | New VAL IDs every Official Run vs stable fingerprint policy | Finding Register |
| **U7** | BLOCKER cascade vs Completeness | Strict `NO` when required Layers Skipped vs `UNDECIDED` until re-run | Catalog · Report Exit policy |
| **U8** | Design Dry-run | Allowed with `schemaComplete=NOT_RUN` vs forbidden outside Official Entry | Pipeline · Governance ops |
| **U9** | WARNING → VAL | VAL required vs recommended | Finding Register · Catalog |
| **U10** | Rule Override | BLOCKER override forbidden (lean) · other severity remaps version-bumped only | Catalog |
| **U11** | L6 partial execution | Allow when some files Failed earlier vs require all relevant files past L2 | Pipeline · Catalog |
| **U12** | Catalog / Validator Pin table detail | Exact pin fields and display form | Pipeline · Catalog · Run Register |

## Appendix D — Future Extension

This Framework intentionally stops at Constitution. Later STEP6 documents extend:

| Extension | Future document / stage |
|-----------|-------------------------|
| **Validation Pipeline** | Stages · flow · rollup procedure · binding · orchestration |
| **Schema Rule Catalog** | Rule Namespace · Rule bodies · Category/Type/Severity defaults · Pins |
| **Validation Schema** | Machine schema artifacts aligned to `System_Schema_Definition.md` |
| **Validation Registers** | Field shapes · VAL allocation · Deferred records |
| **Validation Report** | Section model · OFFICIAL aggregates · Exit attestation |
| **Validation Engine** | Tooling / automation implementing Pipeline + Catalog |
| **Implementation** | Code · CI · repository packaging |
| **STEP6 Final Freeze · STEP7 Handoff** | Closure and transfer suites |

Extensions **SHALL** consume this Framework and **SHALL NOT** silently contradict Core · Policy · Governance norms.

---

*End of STEP6_Schema_Validation_Framework.md v1.0 Draft (Freeze Candidate)*  
*(Core §1–§10 · Policy §11–§14 · Governance §15–§20 · Appendix A–D)*
