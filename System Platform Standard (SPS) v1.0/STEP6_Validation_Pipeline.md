# STEP6_Validation_Pipeline.md

## 1. Document Header

| Field | Value |
|-------|-------|
| **Document** | `STEP6_Validation_Pipeline.md` |
| **Version** | v0.6 |
| **Status** | Draft (Freeze Candidate) |
| **Date** | 2026-07-15 |
| **STEP** | STEP6-2 |
| **Owner** | Schema Validation |
| **SPS Version** | System Platform Standard (SPS) v1.0 |
| **Type** | Validation Pipeline SSOT |
| **Purpose** | Define Pipeline Stage · Flow · Binding · Orchestration · Rollup procedure as a separate SSOT consuming the Framework |
| **Baseline** | `STEP6_Schema_Validation_Framework.md` v1.0 **Freeze Candidate** (Locked · Consume only) |
| **Dependencies** | Framework §15 Pipeline Boundary · Interface I1–I6 · Framework Appendix C Pending Decisions (RO) |
| **Revision** | STEP6-2I — Validation Pipeline Freeze Candidate Package |

**Normative Header declaration**

This document is the **STEP6 Validation Pipeline SSOT**.

It **SHALL** consume `STEP6_Schema_Validation_Framework.md` as higher SSOT.

It **SHALL NOT** redefine Framework semantics (Objects · Layers · Status · Severity · `schemaComplete` · VAL policy).

It **SHALL NOT** modify STEP4 · STEP5 · Runtime · System JSON.

### 1.1 Freeze Candidate Declaration

```text
STEP6 Validation Pipeline
Status              : Draft (Freeze Candidate)
Architecture        : Locked (Consume-only)
Owner               : Schema Validation
Baseline Framework  : STEP6_Schema_Validation_Framework.md v1.0 Freeze Candidate
```

| Check | Status |
|-------|--------|
| Pipeline Draft (Core · Policy · Governance) complete | **YES** |
| Pipeline Review (STEP6-2G) PASS WITH MINOR | **YES** |
| Pipeline QA Patch (STEP6-2H) complete | **YES** |
| Freeze Candidate declared (STEP6-2I) | **YES** |
| Architecture Locked | **YES** |
| Consume-only for downstream SSOT | **YES** |
| Post-change path | **ADR / Pipeline Review only** (after Final Freeze: Version bump required) |

**Hierarchy (Owner / Baseline — Locked)**

```text
Framework
    ↓
Pipeline          ← this document (Freeze Candidate)
    ↓
Catalog
    ↓
Registers
    ↓
Report
    ↓
Freeze (STEP6 program)
    ↓
STEP7
```

### 1.2 Immutable surfaces (Freeze Candidate)

Pipeline **SHALL NOT** modify:

| Surface | Policy |
|---------|--------|
| Framework | **SHALL NOT** |
| STEP4 Frozen Assets | **SHALL NOT** |
| STEP5 Frozen Suite | **SHALL NOT** |
| `packageComplete` | **SHALL NOT** |
| Runtime | **SHALL NOT** |
| Registry | **SHALL NOT** |
| Loader | **SHALL NOT** |
| Contract | **SHALL NOT** |
| System JSON | **SHALL NOT** |
| Catalog Rule text | **SHALL NOT** |
| Register Shape | **SHALL NOT** |

Pipeline owns only **Flow · Binding · Orchestration · Rollup procedure** (meanings remain Framework for Objects · Layers · Status · Severity · `schemaComplete`).

### 1.3 Allowed work after Pipeline Freeze Candidate

Downstream documents **MAY** be authored while **consuming** this Pipeline Freeze Candidate. They **SHALL NOT** redefine Pipeline Core · Policy · Governance norms.

| Next STEP (illustrative) | Document / work | Relation to Pipeline |
|--------------------------|-----------------|----------------------|
| **STEP6-3** | Schema Rule Analysis | Consumes Framework + Pipeline |
| **STEP6-4** | Schema Rule Catalog | Consumes Pipeline Interface; binds Rules to Framework Layers |
| **STEP6-5** | Validation Registers | Persists evidence produced under Pipeline procedure |
| **STEP6-6** | Validation Report | Aggregates Pipeline evidence; does not redefine Flow |

**Out of scope until separate design decisions:** Stage name lock · Coverage formulas · Pin Layout · Rule Namespace · JSON Shape · Algorithms · Engine implementation.  
These remain Appendix Pending (Framework U1–U12 / Pipeline Appendix) — **not resolved** by this Freeze Candidate.

**Final Freeze** of the Pipeline SSOT remains a later declaration step. Freeze Candidate **SHALL NOT** alone authorize Official Validation Exit (ACTIVE Handoff + Framework E\* path still required for Official Mode).

---

## 2. Purpose

### 2.1 Existence purpose

The Validation Pipeline exists to apply Framework Schema Validation norms as a **deterministic execution order**.

It answers:

```text
In what order, under which pins, and through which orchestration steps
are Framework Objects judged and recorded for a Target Set?
```

It **SHALL NOT** answer what Layers, Severity, or `schemaComplete` **mean**. Those answers belong to the Framework.

### 2.2 Relation to Framework

```text
Framework (Freeze Candidate · Locked)
        ↓  consume (RO semantics)
Validation Pipeline (this document)
        ↓  applies
Catalog · Schema · Registers · Report
```

| Concern | Owner |
|---------|-------|
| **Semantics** (Objects · Layers · Status · Severity · `schemaComplete` · VAL policy) | Framework |
| **Sequence** (Flow · Binding · Orchestration · Rollup **procedure**) | Pipeline |

Cross-ref: Framework §15 · §16.

### 2.3 Pipeline role

Pipeline **SHALL** provide:

- **Flow** — how the Target Set proceeds through orchestration steps  
- **Binding** — how Catalog Rules attach to Framework Layers / Targets (Interface **I1**)  
- **Execution / Orchestration** — how Layers are evaluated under pins and options  
- **Rollup procedure** — how Path→File→Package→System→Run aggregation is **executed** (meaning RO from Framework §10)  
- **Evidence path** — how Rule Executions · Results · VAL · Summary · Deferred are produced (Interface **I2–I5**)

### 2.4 Problem solved

Without a Pipeline SSOT, validation risks:

- reinventing Framework meanings inside ad-hoc scripts  
- non-deterministic ordering  
- mutating System JSON or STEP4/STEP5 while “validating”  
- conflating Validation Layers with operational steps  
- claiming official `schemaComplete` without ACTIVE Handoff discipline  

The Pipeline removes those gaps by fixing **procedure**, not **semantics**.

---

## 3. Normative Language

When used in this Pipeline document and in conforming Pipeline designs:

| Term | Meaning |
|------|---------|
| **SHALL** | Absolute requirement. Non-conformance is a Pipeline SSOT violation. |
| **SHALL NOT** | Absolute prohibition. |
| **SHOULD** | Strong recommendation. Deviation requires documented justification. |
| **MAY** | Optional permission. Declining a MAY action is not a violation. |

**Binding**

- Normative terms **SHALL** have the same interpretation as Framework §3.  
- Descriptive text without these terms is explanatory only.  
- While Status remains Draft, unfinished Pipeline Policy / Governance items **MAY** remain as Placeholder; after Pipeline Freeze, informal structural change **SHALL NOT** occur without version bump.

---

## 4. Pipeline Mission

### 4.1 Mission

The Pipeline Mission is to provide a conforming **execution path** for Framework Interface obligations **I1–I6**:

| ID | Interface obligation (consume) |
|----|--------------------------------|
| **I1** | Bind Rules to Validation Layers without inventing alternate Layer meanings |
| **I2** | Produce Rule Executions · Validation Results · VAL Findings · Validation Summary |
| **I3** | Honor Severity cascade · Determinism · Non-Mutation |
| **I4** | Emit `schemaComplete` consistent with Framework §10 |
| **I5** | Preserve Traceability Forward / Reverse |
| **I6** | Accept pinned baselines (including ACTIVE Handoff for Official Validation) |

### 4.2 Success philosophy

Success means:

- Interface I1–I6 are satisfiable by the Pipeline design  
- Determinism and Non-Mutation are preserved  
- Traceable, reproducible evidence can be produced for Official Runs  

Success **SHALL NOT** be defined here as a numeric Exit Gate list.  
Numeric Exit criteria remain **Pending** (Pipeline §32 · Framework Appendix C routing).  
Exit **meanings** remain Framework §17 (E\*) and Pipeline §13 / §15.

### 4.3 Non-goals

Pipeline **SHALL NOT**:

- Define Layer · Status · Severity · `schemaComplete` · VAL **meanings**  
- Author Rule bodies or finalize Rule Namespace  
- Define Register or Report shapes  
- Modify the Framework  
- Perform Auto Fix / Auto Migration / Auto Rewrite of System Definition packages  
- Re-judge STEP5 Architecture Audit  

### 4.4 Framework Consume principle

Pipeline **SHALL** treat the Framework Freeze Candidate as **Locked higher SSOT**.  
Any change that alters Framework meaning **SHALL** require ADR / Framework Review — not a Pipeline-only edit.

---

## 5. Pipeline Core Principles

| ID | Principle |
|----|-----------|
| **P1** | Pipeline **SHALL** consume the Framework Freeze Candidate as higher SSOT. |
| **P2** | Pipeline **SHALL NOT** redefine Framework semantics (Objects · Layers · Status · Severity · `schemaComplete` · VAL policy). |
| **P3** | Pipeline **SHALL** own execution order: Flow · Binding · Orchestration · Rollup **procedure**. |
| **P4** | Pipeline **SHALL** honor Framework Determinism (Framework §13) and **SHALL NOT** invent competing Determinism axioms. |
| **P5** | Pipeline **SHALL** obey Non-Mutation: **READ → JUDGE → RECORD** only. |
| **P6** | Pipeline **SHALL** cause Validation Evidence to be produced for Framework Objects (Rule Execution · Result · VAL · Summary · Deferred). |
| **P7** | Pipeline **SHALL** preserve Forward / Reverse Traceability (Framework §12). |
| **P8** | Under identical pins, Pipeline **SHALL** yield identical evidence paths and Outcomes (reproducibility via Framework Determinism). |
| **P9** | Pipeline **SHALL NOT** modify Framework · STEP4 · STEP5 · Runtime · System JSON · Catalog rule text · Register shapes. |
| **P10** | Pipeline **SHOULD** keep Pipeline-native concepts minimal and free of Framework Object aliases. |
| **P11** | Pipeline **MAY** support Design Dry-run under pending policy (Framework Appendix C **U8**) with official `schemaComplete` remaining **NOT_RUN**. |
| **P12** | Structural change requiring Framework meaning change **SHALL** go through ADR / Framework Review — not Pipeline alone. |

Cross-ref: Framework §11–§14 · §20.

---

## 6. Pipeline Responsibility

### 6.1 Pipeline Owns (In)

| Area | Responsibility |
|------|----------------|
| **Flow** | How the Target Set proceeds through orchestration steps |
| **Binding** | How Catalog Rules attach to Framework Layers / Targets (**I1**) |
| **Execution / Orchestration** | How Validator invocations and Layer evaluation are sequenced under pins |
| **Rollup procedure** | How Path→File→Package→System→Run aggregation is **executed** (`schemaComplete` **meaning** RO from Framework §10) |
| **Evidence path** | How Rule Executions · Results · VAL · Summary · Deferred are produced (**I2–I5**) |
| **Mode application** | How Design vs Official entry pins/options are applied (without redefining Exit meanings) |

### 6.2 Pipeline Does NOT Own (Out)

| Area | Owner |
|------|-------|
| Layer · Status · Severity · `schemaComplete` **meaning** | **Framework** |
| Rule **content** · Rule Namespace | **Schema Rule Catalog** |
| Register **Shape** | **Validation Registers** |
| Report **definition** / OFFICIAL narrative model | **Validation Report** |
| Framework **modification** | **ADR / Framework Review** |
| Standardization / migration | **STEP7** |

### 6.3 Owner Boundary summary

```text
Framework  = Semantics + Framework audit/completeness norms + Dual Exit meanings (E*)
Pipeline   = Sequence + Binding + Orchestration + Rollup procedure
Catalog    = Rule statements + pins content
Registers  = Persistence shapes for evidence
Report     = Aggregate OFFICIAL / DRAFT claims
STEP7      = Standardization consumer
```

(Note: “Framework audit/completeness norms” **SHALL NOT** be read as Pipeline Policy §14–§23.)
---

## 7. Pipeline Object Model

### 7.1 Philosophy

Pipeline **SHALL NOT** clone or redefine Framework Objects:

`Validation Run` · `Validation Target` · `Rule Execution` · `Validation Result` · `Validation Finding` · `Validation Summary` · `Deferred Validation Item` · `schemaComplete`

Cross-ref: Framework §7.

Pins, mode, and handoff attestation **SHOULD** attach as **Execution Context** on the Framework `Validation Run`, not as a second competing “Pipeline Run” identity.

### 7.2 Pipeline-native objects (role only)

| Object | Role |
|--------|------|
| **Execution Context** | Pins · options · Design/Official mode · ACTIVE Handoff proof bound to a `Validation Run` |
| **Execution Stage** | Ordered orchestration unit. **Not** a Validation Layer. |
| **Stage Result** | Stage completion / coverage meta. **Not** a substitute for `Validation Result`. |
| **Pipeline Metadata** | Pipeline SSOT version · interface-conformance identity |

**Forbidden philosophy:** no `Pipeline Decision` object that competes with `schemaComplete` or STEP5 Architecture Decisions.

### 7.3 Relation to Framework Objects

```text
Validation Run  (+ Execution Context)
  ├── Validation Target[]
  ├── Rule Execution[] → Validation Result → VAL-*
  ├── Deferred[]
  ├── Validation Summary → schemaComplete
  └── Execution Stage[] → Stage Result[]   (Pipeline-native)
```

Field shapes, JSON, cardinality, and ID allocation rules are **out of scope** for this Core Body (Registers / later Policy).

---

## 8. Pipeline Stage Philosophy

### 8.1 Layer ≠ Stage

| Concept | Meaning |
|---------|---------|
| **Validation Layer (L1–L7)** | Framework concern depth (Package → … → Semantic) |
| **Execution Stage** | Pipeline orchestration step |

Pipeline **SHALL NOT** treat a Validation Layer as a Stage identity.  
Cross-ref: Framework §8.

### 8.2 Stage separation principles

A Stage **SHOULD** be split only when at least one differs:

- inputs required  
- Interface obligation advanced (**I1–I6**)  
- deterministic ordering needs  

Stages **SHALL NOT** be multiplied solely to rename Layers.

### 8.3 Execution Loop

Rule / Layer evaluation **SHOULD** occur as a loop **inside** an Execution-oriented Stage:

- evaluate Layers in Framework order **L1 → L7**  
- on **BLOCKER**, deeper Layers for that Target **SHALL** be **SKIPPED** (Framework §8 cascade)  
- other Targets in the same Run **MAY** continue  

This Core Body **SHALL NOT** lock Stage names or publish algorithms / flowcharts.

### 8.4 Aggregation · VAL · Rollup · Report Emit (philosophy)

| Concern | Philosophy |
|---------|------------|
| **Aggregation** | Assemble Framework `Validation Result` from Rule Executions without changing Status/Severity meanings |
| **VAL assignment** | Allocate / record `VAL-*` under Framework §11; **MAY** be a distinct orchestration step from Aggregation |
| **Rollup** | Execute Path→…→Run `schemaComplete` procedure; meaning remains Framework §10 |
| **Report Emit** | Prepare Report **input** / trigger only; Report narrative ownership stays with Report SSOT |

### 8.5 Stage responsibility template

Each Stage, when named in a later design step, **SHALL** be describable as:

| Field | Content |
|-------|---------|
| **Consumes** | Inputs for that step |
| **Produces evidence** | Evidence contributed |
| **Advances Interface** | Which of **I1–I6** progresses |

**Stage name list: NOT confirmed in this Core Body.**

Non-normative reminder only (unconfirmed):

```text
Discovery → Binding → Execution → Aggregation → VAL → Rollup → Report Emit
```

---

## 9. Pipeline Input / Output

### 9.1 Input Philosophy

Pipeline **SHALL** consume (read-only where mandated):

| Input | Role |
|-------|------|
| **Framework** | Semantics · Interface **I1–I6** |
| **Schema Rule Catalog** (+ **Catalog Pin**) | Executable rules under pin |
| **Target Set** | Units under validation (grain TBD · Framework Appendix C **U2**) |
| **Validator Version Pin** · **Runtime Baseline** | Determinism pins (Framework §13) |
| **Execution Options** | Scope / deferral / mode (related pending: **U3** · **U8** · **U11**) |
| **ACTIVE Handoff** (+ Manifest) | **Required** for Official Validation Entry (Framework §6 · **I6**) |
| **Validation Schema** | **MAY** be consumed when Catalog / tooling require it |

Pipeline **SHALL NOT** invent alternate semantics for these inputs.

### 9.2 Output Philosophy (Evidence generation)

Pipeline **SHALL** cause production of Framework-aligned outputs:

| Output | Normative anchor |
|--------|------------------|
| Rule Execution outcomes · `Validation Result` | Framework §7 · §9 |
| `VAL-*` · Deferred Validation Item | Framework §11 |
| Validation Summary · `schemaComplete` | Framework §10 |
| Stage Result (meta) | Pipeline-native only |
| Report Input package | Consumed by Report SSOT |

### 9.3 Consume vs Evidence principles

- **Consume:** read pins, norms, catalog, targets — no mutation of sources.  
- **Evidence:** record validation-layer outcomes only.  
- **Shape** of inputs/outputs/registers is **not** defined in this Core Body.

---

## 10. Pipeline Dependency

### 10.1 Dependency direction

```text
Framework
    ↓
Pipeline
    ↓
Catalog → Schema (optional)
    ↓
Registers
    ↓
Report
    ↓
Final Freeze → STEP7 Handoff
```

Cross-ref: Framework §16.

### 10.2 Dependency principles

| Principle | Statement |
|-----------|-----------|
| **Downward only** | Lower artifacts **SHALL NOT** redefine higher SSOT norms. |
| **No reverse runtime dependency** | Pipeline **SHALL NOT** depend on Report or Final Freeze to define Flow or Binding. |
| **Catalog binds to Layers** | Catalog Rules **SHALL** bind to Framework **Layers**, not hardcode mutable Stage names. |
| **Pipeline reads Catalog** | Pipeline binds and executes; **SHALL NOT** edit Catalog rule text. |
| **Registers store** | Registers persist evidence; **SHALL NOT** invent parallel Finding namespaces. |
| **Report consumes** | Report aggregates recorded evidence; **SHALL NOT** redefine Pipeline flow. |

---

## 11. Pipeline Determinism

Core scope: Determinism **meaning** and procedure **limits** (consume Framework §13).  
Operational Determinism Policy (Ordering · Binding · Emit Sequence): see **§19**.

### 11.1 Consume Framework §13

Pipeline **SHALL** apply Framework Determinism.  
Pipeline **SHALL NOT** invent competing Determinism axioms, hashes, or algorithms in this Core Body.

Given identical:

| Pin | Role |
|-----|------|
| Input package | Target System Definition contents (RO) |
| Rule Catalog Version | Catalog Pin |
| Validator Version | Validator Pin |
| Runtime Baseline | Platform freeze reference |
| Execution options | Scope / deferral / mode pins |
| Target Set (+ ordering) | Framework §13.3 ordering principle |

Then Pipeline procedure **SHALL** produce identical:

`Validation Result` set · `VAL-*` set (under allocation rules then in force) · `schemaComplete` · reportable claims for the same Report Class.

### 11.2 What Pipeline decides (procedure only)

Pipeline **SHALL** determine only:

| Procedure concern | Meaning |
|-------------------|---------|
| **Execution Order** | Stage / loop ordering consistent with Framework Layer cascade |
| **Binding** | How Rules attach to Layers / Targets for the Run |
| **Emit Sequence** | When Results · VAL · Summary · Report inputs are emitted |

Pin field layouts remain pending (Framework Appendix C **U12**) for Catalog / Registers.  
Operational detail: **§19**.

---

## 12. Pipeline Non-Mutation

Core scope: Non-Mutation **meaning** and forbidden surfaces (consume Framework §14).  
Operational Non-Mutation Policy: see **§20**.

### 12.1 Behavior

```text
READ   → baselines · targets · norms · catalog · pins
JUDGE  → Framework Status / Severity / Layers
RECORD → Validation-layer evidence only
```

Cross-ref: Framework §14 · Principles **P5** · **P9** · Policy **§20**.

### 12.2 Forbidden mutation surfaces

Pipeline **SHALL NOT** modify:

| Surface | Policy |
|---------|--------|
| Framework | **SHALL NOT** |
| STEP4 Frozen Assets | **SHALL NOT** |
| STEP5 Frozen Suite / OFFICIAL Audit Report / `packageComplete` | **SHALL NOT** |
| Runtime / Registry / Loader / Contract | **SHALL NOT** |
| System JSON (System Definition packages) | **SHALL NOT** |
| Catalog rule text | **SHALL NOT** |
| Register shapes (as normative definitions) | **SHALL NOT** rewrite shapes via Pipeline |

### 12.3 Auto-change prohibition

As part of Pipeline execution, the following **SHALL NOT** occur:

| Action | Policy |
|--------|--------|
| **Auto Fix** | **SHALL NOT** |
| **Auto Rewrite** | **SHALL NOT** |
| **Auto Migration** | **SHALL NOT** |
| **Framework modification** | **SHALL NOT** |
| **Runtime modification** | **SHALL NOT** |

Correction and Standardization belong to controlled later processes (STEP7+), not Pipeline judgment.

---

## 13. Pipeline Exit Philosophy

### 13.1 Exit separation

| Exit | Philosophy |
|------|------------|
| **Framework Design Exit** | Enables Pipeline **design**. **SHALL NOT** authorize Official `schemaComplete`. |
| **Pipeline Design Exit** | Closes Pipeline SSOT **design** readiness for Catalog alignment / later Freeze path. Numeric criteria **not** listed here (see §32). |
| **Pipeline Official Exit** | Closes an Official **orchestration run** evidence path under pins. Numeric criteria **not** listed here (see §32). |
| **Official Validation Exit (Framework E\*)** | Program-level Official completion (Framework §17). Pipeline **contributes evidence** and **SHALL NOT** redefine E\* meanings. |

Cross-ref: Framework §17 · Pipeline §15 · §32 · Framework Appendix C **U7** (cascade completeness Pending).

### 13.2 Design Dry-run

Design Dry-run **MAY** be supported under pending policy (Framework Appendix C **U8**).

Dry-run **SHALL NOT** be treated as Official Validation Exit.  
Official claims of `schemaComplete` remain **NOT_RUN** unless Official Validation Entry (ACTIVE Handoff) applies.

Exit gate **numeric** criteria lists, coverage formulas, and thresholds **SHALL NOT** be defined in Core Body. See Governance §32 Pending · Framework E\* meanings.

---

## 14. Policy Overview

### 14.1 Purpose of Policy

This Policy Part defines **operational rules** for executing and operating the Validation Pipeline.

It **SHALL NOT** redefine Core Body meanings (Pipeline §2–§13) or Framework semantics.

### 14.2 Core vs Policy

| Layer | Role |
|-------|------|
| **Core Body (§2–§13)** | What Pipeline is · owns · consumes · forbids |
| **Policy (§14–§23)** | How Pipeline **SHALL** operate under those meanings |
| **Governance (§24–§33)** | Lifecycle · Freeze · Review · Ownership · Artifact/Boundary control · Pending routing (§32) |

Numeric Exit Gate lists remain Pending (§32); Governance **SHALL NOT** be read as having finalized those lists.

### 14.3 Relation to Framework

Policy **SHALL** consume Framework Freeze Candidate as Locked higher SSOT.  
Policy **SHALL NOT** invent alternate meanings for Layers · Status · Severity · `schemaComplete` · `VAL-*`.

Cross-ref: Framework §9 · §10 · §11 · §13 · §14 · §15 Interface I1–I6 · Pipeline §5 Principles P1–P12.

---

## 15. Execution Policy

### 15.1 Execution Mode

| Mode | Meaning | Official `schemaComplete` claim |
|------|---------|----------------------------------|
| **Design** | Design-time / Dry-run oriented execution for Pipeline/Catalog design feedback | **SHALL NOT** claim Active Official values; remains **NOT_RUN** for official reliance |
| **Official** | Official Validation execution under Official Validation Entry | **MAY** emit Active `YES` / `NO` / `UNDECIDED` per Framework §10 |

Pipeline **SHALL** record Execution Mode in Execution Context for every `Validation Run`.

### 15.2 Pipeline Entry Policy

| Mode | Entry rule |
|------|------------|
| **Design** | **SHALL** be allowed when Framework is at least **Freeze Candidate (Locked)** and Framework Design Exit path permits Pipeline design (Framework §17 Design Exit). ACTIVE Handoff **SHALL NOT** be required. Pipeline Draft / Freeze Candidate authorship uses this Entry. |
| **Official** | Official Validation Entry **SHALL** require **ACTIVE Handoff** (+ Manifest) and pinned Catalog / Validator / Runtime / Options / Target Set (Framework §6 · Interface **I6**). |

**Relation (normative reading):**

```text
Framework Design Exit
        → permits Pipeline design
Framework Freeze Candidate (Locked)
        → Pipeline Draft / Pipeline Freeze Candidate baseline
Pipeline Draft (this document)
        → Design Mode execution MAY (schemaComplete official claim = NOT_RUN)
Official Mode
        → requires ACTIVE Handoff (separate from Framework/Pipeline Freeze Candidate)
```

Pipeline **SHALL NOT** start Official Mode without ACTIVE Handoff.  
Pipeline **SHALL NOT** require Framework **Final Freeze** solely to author or Design-Mode-run against a Framework Freeze Candidate baseline.

### 15.3 Pipeline Exit Policy

| Exit class | Policy |
|------------|--------|
| **Pipeline Design Exit** | Closes Pipeline **design** readiness. Numeric criteria lists → **§32 Pending** (not fixed in Policy). |
| **Pipeline Official Exit** | Closes an Official Mode orchestration evidence path. Numeric criteria lists → **§32 Pending**. |
| **Official Validation Exit (Framework E\*)** | Program Exit meanings remain Framework §17. Pipeline **SHALL** contribute evidence and **SHALL NOT** redefine E\*. BLOCKER-cascade completeness (Strict NO vs UNDECIDED) remains Framework Appendix C **U7**. |

Exit **philosophy** remains Pipeline §13. This section adds only **mode-linked operational rules**, not numeric gates.

### 15.4 Stage Progress Policy

For any Execution Stage used by a conforming design:

| Rule | Statement |
|------|-----------|
| Progress | A Stage **SHALL NOT** be marked complete unless its declared Consumes are available or explicitly Deferred |
| Skipping | A Stage **MAY** be **SKIPPED** only under recorded policy (e.g., prior BLOCKER cascade consequences or explicit Design option) |
| Recording | Stage completion / skip reasons **SHALL** be recorded on `Stage Result` meta |
| Layer ≠ Stage | Stage progress **SHALL NOT** rename or replace Validation Layer identities |

**Stage names and ordered Stage lists remain unconfirmed** (§23 Reserved).

### 15.5 Rollup Policy

| Rule | Statement |
|------|-----------|
| Meaning | Rollup **SHALL** apply Framework §10 `schemaComplete` meanings without redefinition |
| Procedure | Pipeline **SHALL** execute Path → File → Package → System → Run aggregation procedure |
| Official Mode | Rollup **SHALL** be attempted before Pipeline Official Exit evidence close |
| Design Mode | Official Active `schemaComplete` **SHALL** remain **NOT_RUN** even if provisional diagnostics are recorded |
| Strict vs UNDECIDED after BLOCKER cascade | **Not decided here** — see Framework Appendix C **U7** / Pipeline Appendix C |

**Coverage formulas and algorithms are forbidden in Policy.**

---

## 16. Stage Operation Policy

### 16.1 Stage performance principles

| Rule | Statement |
|------|-----------|
| Separability | Stages **SHOULD** be split only per Pipeline §8.2 |
| Interface advance | Each performed Stage **SHALL** advance one or more of Interface **I1–I6** or record why not |
| No Layer aliasing | Stage operation **SHALL NOT** treat L1–L7 as Stage IDs |

### 16.2 Layer consumption principles

| Rule | Statement |
|------|-----------|
| Order | When evaluating Layers, Pipeline **SHALL** consume Framework order **L1 → L7** |
| Binding | Rules **SHALL** bind to Framework Layers (Interface **I1**), not to provisional Stage names |
| Cascade | Framework §8 BLOCKER cascade **SHALL** be honored |

### 16.3 Severity operation policies

Severity meanings remain Framework §9. Pipeline operational rules:

| Severity | Operational policy |
|----------|-------------------|
| **BLOCKER** | Deeper Layers for the same Target **SHALL** be **SKIPPED**. Target contributes to non-YES `schemaComplete` under Framework §10 / pending **U7**. Other Targets **MAY** continue. |
| **ERROR** | Evaluation of other Rules/Layers **MAY** continue where meaningful. Required Rule ERROR **SHALL** force Target `schemaComplete` = **NO** in Official Mode when coverage rules say the Rule is required. |
| **WARNING** | Non-blocking. Target `schemaComplete` **MAY** remain **YES** if no required BLOCKER/ERROR exists (Framework lean). VAL generation detail → pending **U9**. |
| **INFO** | Trace/observation only. **SHALL NOT** alone force `schemaComplete` = **NO**. |

Severity override / remapping → Framework Appendix C **U10** (not finalized here).

---

## 17. Evidence Policy

Evidence Object **meanings** remain Framework §7 · §9 · §11. Policy governs **when** evidence **SHALL** be produced.

| Evidence | Policy |
|----------|--------|
| **Rule Execution** | Official Mode **SHALL** record a Rule Execution for each bound Rule evaluation attempted (including **SKIPPED** / **BLOCKED** / **NOT_RUN** distinctions per Framework §9). Design Mode **SHOULD** record the same where practical. |
| **Validation Result** | Pipeline **SHALL** aggregate Rule Executions into `Validation Result` without altering Severity/Status meanings. |
| **VAL-\*** | On **FAILED** required Outcomes, Official Mode **SHALL** create `VAL-*` per Framework §11 Permanent ID principles. Allocation detailing → Registers / **U6** · **U9**. `VAL-*` **SHALL NOT** replace `FND-*`. |
| **Deferred** | When work is explicitly deferred (e.g., L7 out of scope · Design option), Pipeline **SHALL** record `Deferred Validation Item` rather than silently omitting coverage. |
| **Summary** | At Run close (Official Mode), Pipeline **SHALL** produce `Validation Summary` including Run-level `schemaComplete` state appropriate to Mode. |

Pipeline **SHALL NOT** invent Findings outside `VAL-*`.

---

## 18. schemaComplete Policy

### 18.1 Consume Framework §10

| Rule | Statement |
|------|-----------|
| Owner | `schemaComplete` Owner remains **STEP6 Schema Validation** (Framework) |
| Meaning | Pipeline **SHALL NOT** redefine YES · NO · UNDECIDED · NOT_RUN |
| Distinction | Pipeline **SHALL NOT** equate `schemaComplete` with STEP5 `packageComplete` |

### 18.2 Pipeline procedure only

Pipeline **SHALL** own only the **procedure** that computes/emits `schemaComplete` rollup states from Outcomes.

Pipeline **SHALL NOT** invent a parallel completeness property.

### 18.3 Mode binding

| Mode | `schemaComplete` operational rule |
|------|-----------------------------------|
| **Design** | Official Active claim **SHALL** be **NOT_RUN** |
| **Official** | **SHALL** emit Active state per Framework §10 after required procedure; residual unfinished coverage → **UNDECIDED** until resolved or Exit HOLD (Governance) |

### 18.4 Pending (unchanged)

BLOCKER cascade → Strict **NO** vs **UNDECIDED**: Framework Appendix C **U7** — **not decided in this Policy**.

---

## 19. Determinism Policy

Core Determinism scope: **§11**. This section states **operational** Ordering · Binding · Emit rules only.

### 19.1 Consume Framework §13

Pipeline Determinism Policy **SHALL** apply Framework §13 without redefinition.

Identical pins ⇒ identical Results · VAL set (under allocation rules) · `schemaComplete` · reportable claims.

### 19.2 Procedure scope (Ordering · Binding · Emit)

| Concern | Policy |
|---------|--------|
| **Ordering** | Pipeline **SHALL** apply a deterministic order consistent with Framework §13.3 (Target → Artifact → Path → Rule → Severity → VAL) |
| **Binding** | Binding of Rules to Layers/Targets **SHALL** be deterministic under the Catalog Pin |
| **Emit Sequence** | Emit order for Result · VAL · Summary · Report Input **SHALL** be deterministic for Official Mode |

Pin table field layouts → **U12** (Catalog / Registers).  
Hashes / algorithms **SHALL NOT** be introduced here.

---

## 20. Non-Mutation Policy

Core Non-Mutation scope: **§12**. This section restates **operational** READ · JUDGE · RECORD prohibitions only (no new surfaces).

### 20.1 Allowed behavior

Pipeline **SHALL** only:

```text
READ   → baselines · targets · norms · catalog · pins
JUDGE  → Framework Status / Severity / Layers
RECORD → Validation-layer evidence only
```

### 20.2 Prohibitions

Pipeline **SHALL NOT**:

| Action / surface | Policy |
|------------------|--------|
| **Auto Fix** | **SHALL NOT** |
| **Rewrite** (System JSON / packages) | **SHALL NOT** |
| **Migration** as validation side-effect | **SHALL NOT** |
| **Framework modification** | **SHALL NOT** |
| **Runtime / Registry / Loader / Contract modification** | **SHALL NOT** |
| **Register Shape change** via Pipeline | **SHALL NOT** |
| **Catalog text modification** | **SHALL NOT** |
| STEP4 / STEP5 / `packageComplete` mutation | **SHALL NOT** |

Cross-ref: Framework §14 · Pipeline §12 · Principles **P5** · **P9**.

---

## 21. Design Dry-run Policy

| Rule | Statement |
|------|-----------|
| Nature | Design Dry-run **SHALL NOT** be treated as Official Validation |
| Entry | **MAY** run without ACTIVE Handoff |
| `schemaComplete` | Official Active claim **SHALL** remain **NOT_RUN** |
| Evidence | Diagnostic Results / provisional notes **MAY** be recorded; they **SHALL NOT** be treated as OFFICIAL Report inputs |
| Exit | Dry-run **SHALL NOT** satisfy Official Validation Exit (Framework E\*) |
| Pending | Operational variants remain under Framework Appendix C **U8** |

---

## 22. Traceability Policy

### 22.1 Forward Trace

Official Mode evidence **SHALL** remain reconstructible as:

```text
Validation Target
  → Rule Execution
  → Validation Result
  → VAL-*
  → schemaComplete
  → Validation Summary / Report Input
```

### 22.2 Reverse Trace

Reportable claims **SHALL** reverse to:

```text
Summary / schemaComplete / VAL-*
  → Validation Result
  → Rule (+ Layer · Severity · Execution Status)
  → Target · Artifact · Path
  → pinned Catalog / Framework norms
```

### 22.3 Trace maintenance principles

| Rule | Statement |
|------|-----------|
| Pointers | Evidence **SHOULD** carry Rule · Target · Artifact · Path · Layer · Severity · Execution Status · Run identity |
| STEP4/STEP5 | Trace **MAY** include RO pointers; **SHALL NOT** rewrite pointed artifacts |
| Design Mode | Trace **SHOULD** still be kept where practical; Official Mode **SHALL** keep full Trace |

Cross-ref: Framework §12 · Pipeline Principle **P7**.

---

## 23. Reserved Policy

The following **SHALL NOT** be finalized in this Policy Part. They remain Appendix / Governance / later SSOT:

| Reserved item | Destination |
|---------------|-------------|
| Stage names | Appendix D / later Stage lock |
| Stage order / Execution Flow | Appendix D / later design |
| Algorithms | Appendix D / Engine |
| Object Shape / Register Shape / JSON Schema | Registers · Schema SSOT |
| Rule Namespace / Catalog Rule bodies | Schema Rule Catalog |
| Engine implementation | Engine / Implementation |
| Coverage calculation formulas | Governance / Catalog |
| Exit Gate numeric criteria (D\*/E\* lists for Pipeline) | **Governance** |
| U7 Strict vs UNDECIDED decision | Framework Appendix C **U7** |

---

## 24. Governance Overview

### 24.1 Purpose of Governance

This Governance Part defines **operating, management, and control rules** for the Validation Pipeline SSOT:

Lifecycle · Ownership · Version · Review · Freeze · Artifact control · Boundary control · Pending routing · Future Extension direction.

Governance **SHALL NOT** redefine Core Body meanings (§2–§13) or Policy operational rules (§14–§23), except to cite them as authoritative.

### 24.2 Policy vs Governance

| Layer | Role |
|-------|------|
| **Core Body** | What Pipeline is |
| **Policy** | How Pipeline operates (modes · evidence · non-mutation · dry-run · trace) |
| **Governance** | How Pipeline SSOT is **managed** (lifecycle · freeze · review · ownership · artifacts) |

### 24.3 Pipeline operating responsibility

| Responsibility | Owner |
|----------------|-------|
| Pipeline SSOT authorship / maintenance | Schema Validation |
| Framework Lock conformance | Schema Validation (consume-only) |
| Catalog / Register / Report alignment | Respective Owners under Boundary Governance (§31) |
| Official Validation program Exit (Framework E\*) | Framework Governance meanings; Pipeline contributes evidence only |

---

## 25. Lifecycle Governance

Lifecycle stages are **meanings only**. Detailed procedures remain for Review / ops practice.

| Stage | Meaning |
|-------|---------|
| **Draft** | Pipeline SSOT content is under active authorship (Skeleton → Core → Policy → Governance) |
| **Review** | Structured review against Framework Lock · Core/Policy consistency · Boundary (STEP6-2G) |
| **QA** | Quality Patch against Review Findings without redesign (parallel to Framework STEP6-1D pattern) |
| **Freeze Candidate** | Review/QA complete enough for Consume-by-Catalog/Registers design; still Draft until Final Freeze |
| **Final Freeze** | Declared Frozen Pipeline SSOT; informal structural change forbidden without Version bump / ADR |

Pipeline **SHALL NOT** treat Lifecycle stage names as Validation Execution Modes (Design / Official remain Policy §15).

---

## 26. Ownership Governance

| Artifact / concern | Owner | Responsibility scope |
|--------------------|-------|----------------------|
| **Framework** | Schema Validation | Semantics · Layers · Status · Severity · `schemaComplete` meaning · VAL policy · Dual Exit E\* meanings |
| **Pipeline** | Schema Validation | Flow · Binding · Orchestration · Rollup **procedure** · Pipeline Policy/Governance |
| **Catalog** | Schema Validation | Rule bodies · Rule Namespace decision · Catalog Pin content |
| **Register** | Schema Validation | Persistence shapes for Run/Result/VAL/Deferred |
| **Report** | Schema Validation | DRAFT/OFFICIAL Validation Report model |
| **STEP7** | Standardization | Consumes Validation outcomes; does not own Pipeline |

Owner **change procedures** are not defined in this document.

---

## 27. Version Governance

| Rule | Statement |
|------|-----------|
| **Identity** | Document identity remains `STEP6_Validation_Pipeline.md` |
| **Versioning** | Meaningful normative change **SHALL** bump Version (e.g. v0.4 → v0.5 / v1.0) and append Revision History |
| **Revision History** | **SHALL** record STEP label · Status · scope of change |
| **After Final Freeze** | Informal structural edits **SHALL NOT** occur; change requires Version bump under ADR / Review |
| **ADR principle** | Changes that alter Framework meaning or Pipeline Boundary **SHALL** require ADR / Framework or Pipeline Review — not silent edits |
| **Numbering** | Existing Version numbering scheme **SHALL** be retained (v0.x Draft → v1.0 Freeze as declared later) |

---

## 28. Review Governance

### 28.1 Review classes

| Review | Purpose |
|--------|---------|
| **Framework Review** | Confirms Framework Lock / Freeze Candidate integrity (already PASS WITH MINOR → QA for Framework) |
| **Pipeline Review** | Confirms Pipeline Core · Policy · Governance consistency and Framework Consume-only conformance |
| **QA Patch** | Resolves Review Findings without architecture redesign |

### 28.2 Finding and result principles

| Item | Principle |
|------|-----------|
| **Review Finding** | Recorded with ID · Severity · Location · Recommendation · Action owner |
| **Severity** | BLOCKER · MAJOR · MINOR · INFO (same discipline as Framework Review) |
| **Result handling** | BLOCKER **SHALL** block Freeze Candidate; MAJOR **SHOULD** be resolved before Final Freeze; MINOR **MAY** proceed with tracked debt |
| **Procedure depth** | High-level only here; detailed checklists in Review session (STEP6-2G) |

Review **SHALL NOT** be used to silently rewrite Framework or reopen STEP4/STEP5 Facts.

---

## 29. Freeze Governance

| Concept | Meaning |
|---------|---------|
| **Freeze Candidate** | Pipeline is review-ready for downstream Catalog/Register design consumption while Status may still be Draft |
| **Final Freeze** | Explicit declaration that Pipeline SSOT structure/norms are Frozen |
| **Lock** | Post-Freeze: Pipeline is **Consume-only** for Engine/Catalog/Report authors regarding Pipeline meanings |
| **Consume-only** | Downstream **SHALL** read Pipeline; **SHALL NOT** redefine Core/Policy/Governance norms |
| **ADR exception** | Only ADR + Version bump may reopen Frozen Pipeline structure |
| **Framework Lock** | Pipeline Freeze **SHALL** continue to treat Framework Freeze Candidate / Final Freeze as higher Locked SSOT |

Pipeline Lock **SHALL NOT** authorize Official Validation Exit by itself. Official Exit remains Framework E\* + ACTIVE Handoff path.

---

## 30. Artifact Governance

### 30.1 Artifacts Pipeline consumes

| Artifact | Mutability |
|----------|------------|
| Framework SSOT | RO |
| Schema Rule Catalog (+ Pin) | RO at execution |
| Target Set / System packages | RO |
| ACTIVE Handoff / Manifest (Official) | RO |
| Runtime Baseline · Validator Pin | RO |
| Validation Schema (optional) | RO |

### 30.2 Artifacts Pipeline generates (evidence path)

| Artifact | Notes |
|----------|-------|
| Rule Execution · Validation Result · VAL-* · Deferred · Summary · `schemaComplete` emit | Framework Object meanings |
| Stage Result / Execution Context meta | Pipeline-native |
| Report Input package | For Report SSOT |

### 30.3 Artifacts Pipeline SHALL NOT modify

Framework · STEP4 · STEP5 · `packageComplete` · Runtime/Registry/Loader/Contract · System JSON · Catalog rule text · Register **Shapes** · OFFICIAL Audit Report.

### 30.4 Ownership and dependency

Ownership follows §26. Dependency direction remains Framework → Pipeline → Catalog → Schema → Registers → Report → Final Freeze → STEP7 (Framework §16 · Pipeline §10).

---

## 31. Boundary Governance

| Neighbor | Boundary principle |
|----------|-------------------|
| **Framework** | Pipeline consumes; does not redefine semantics |
| **Catalog** | Supplies Rules; binds to Framework Layers; Pipeline does not edit Catalog |
| **Schema** | Optional machine constraints; does not own Flow |
| **Register** | Stores evidence; does not invent Finding namespaces |
| **Report** | Aggregates claims; does not define Binding/Flow |
| **STEP7** | Consumes Validation outcomes; does not rewrite Pipeline SSOT |

**Responsibility transfer prohibition:** A downstream artifact **SHALL NOT** absorb Pipeline Core/Policy ownership by renaming or forking norms.

---

## 32. Governance Pending Decisions

Governance **SHALL NOT** finalize the following. They remain Pending / Appendix-linked:

| Item | Link |
|------|------|
| Rule Namespace | Framework Appendix C **U1** |
| Stage Name / Stage Flow | Pipeline §23 · Appendix D · Framework **U2** related |
| Coverage calculation formulas | Catalog / later Governance ops · not fixed here |
| Pin Layout | Framework Appendix C **U12** |
| Object Shape / Register Shape / JSON Schema | Registers · Schema SSOT |
| schemaComplete Strict vs UNDECIDED after BLOCKER | Framework Appendix C **U7** |
| Design Dry-run variants | Framework Appendix C **U8** |
| WARNING→VAL / Override | Framework Appendix C **U9** · **U10** |
| L6 partial / L7 scope | Framework Appendix C **U11** · **U3** |
| Exit Gate **numeric** criteria lists | Deferred to Review/Freeze declaration practice; meanings stay Framework §17 / Pipeline §13 · §15 |

Governance **SHALL** keep Appendix C as the routing index — **SHALL NOT** redefine the U1–U12 option tables.

---

## 33. Future Extension

Direction only — **not designs**:

| Extension | Direction |
|-----------|-----------|
| **Pipeline Engine** | Automate binding · orchestration · emit under pins |
| **Validator** | Tooling implementing Catalog Rules under Determinism pins |
| **Validation Schema** | Machine schema artifacts aligned to SPS Schema Definition |
| **Registers** | Field shapes · VAL allocation persistence |
| **Official Report** | OFFICIAL aggregates consuming Pipeline evidence |
| **STEP7** | Standardization consuming `schemaComplete` · VAL · Deferred |

Extensions **SHALL** consume Frozen Framework + (when declared) Frozen Pipeline and **SHALL NOT** silently contradict Core · Policy · Governance.

---

## 34. Pipeline Appendix

Appendix holds **indexes and pointers only**. Normative Future Extension narrative remains **§33**. Pending decision **options** remain in Framework Appendix C (not redefined here).

### Appendix A — Glossary

| Term | Meaning |
|------|---------|
| **Execution Context** | Pins · mode · handoff proof bound to a Framework `Validation Run` |
| **Execution Stage** | Pipeline orchestration unit (**not** a Validation Layer) |
| **Stage Result** | Stage completion / coverage meta (**not** a `Validation Result`) |
| **Pipeline Metadata** | Pipeline SSOT version · interface-conformance identity |
| **Validation Layer (L1–L7)** | Framework concern depth — see Framework Appendix A / Framework §8 |
| **Execution Mode** | **Design** \| **Official** — Pipeline §15 |
| **Interface I1–I6** | Framework §15.5 obligations consumed by Pipeline |
| **Lifecycle stage** | Draft · Review · QA · Freeze Candidate · Final Freeze — Pipeline §25 |

Further shared terms: Framework Appendix A (Glossary) — **SHALL** be treated as RO reference.

### Appendix B — Reserved Items

Reserved / not Active in Pipeline Freeze Candidate:

- Locked Stage **names** / Stage **order** / Execution Flow algorithms  
- Engine · Validator implementation profiles  
- Object / Register field shapes · JSON Schema bodies  
- Coverage calculation formulas · Exit Gate **numeric** lists  

Align with Pipeline §23 Reserved Policy · §32 Pending.

### Appendix C — Pending Decisions (index)

Pipeline **SHALL NOT** redefine Framework Appendix C option tables. Cite only:

| ID | Pipeline relevance |
|----|-------------------|
| **U1** | Rule Namespace (Catalog) |
| **U2** | Target grain (affects Flow later) |
| **U3** · **U11** | L7 scope · L6 partial |
| **U7** | BLOCKER cascade → `schemaComplete` Strict NO vs UNDECIDED |
| **U8** | Design Dry-run variants |
| **U9** · **U10** | WARNING→VAL · Rule Override |
| **U12** | Catalog / Validator Pin field layout |

Governance index: **§32**.

### Appendix D — Future Extension (pointers only)

Narrative direction: **§33**.  
This Appendix entry **SHALL** only point ahead — no duplicate design body:

- Stage name lock · Flow · Algorithms → later design  
- Engine · Validator · Implementation → tooling  
- Register write protocol · Report emit contract → Registers · Report SSOT  

---

## Revision History

| Version | Status | Content |
|---------|--------|---------|
| **v0.1** | **Skeleton** | STEP6-2C — Section structure · Core Concepts placement · Placeholders |
| **v0.2** | **Draft (Core Body)** | STEP6-2D — §2–§13 Core Body |
| **v0.3** | **Draft (Policy)** | STEP6-2E — Policy §14–§23 |
| **v0.4** | **Draft (Governance)** | STEP6-2F — Governance §24–§33; Appendix §34 |
| **v0.5** | **Draft (Freeze Candidate)** | STEP6-2H — QA Patch RV-001~009 · RV-012; Appendix filled as index/pointers; Entry aligned to Framework Freeze Candidate |
| **v0.6** | **Draft (Freeze Candidate)** | STEP6-2I — Freeze Candidate Package; Architecture Locked; Consume-only; Immutable surfaces; post-Candidate allowed STEPs; Pending U1–U12 unchanged |

---

*End of STEP6_Validation_Pipeline.md v0.6 Draft (Freeze Candidate)*  
*Architecture Locked · Consume-only · Baseline: Framework v1.0 Freeze Candidate (Locked)*
