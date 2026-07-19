# STEP7_Catalog_Freeze_Design.md

```text
Document  : STEP7_Catalog_Freeze_Design.md
Version   : v0.4
Status    : Design Draft — IU-2-02B Complete · Not Frozen
Date      : 2026-07-19
STEP      : STEP7 / Phase P2 Catalog
Session   : S7-P2-IU-2-02B
IU        : IU-2-02B
WP        : WP-2-02
Milestone : M2.2
Owner     : System Standardization / Catalog Ops
Type      : Catalog Freeze Design (Pin Field Table U12)
Baseline  : STEP7_SCOPE Approved · STEP7_WORK_BREAKDOWN Approved ·
            STEP7_IMPLEMENTATION_DECOMPOSITION v1.0 Approved ·
            STEP6 Final Freeze v1.0 · Framework/Pipeline Locked (Consume)
Rule      : U12 field layout only · No Pin ID mint · No catalogPinId issue ·
            No Catalog/Register JSON · No Freeze Candidate · No Namespace /
            Classification / Coverage lock · No Runtime / Framework / Pipeline /
            System JSON mutation
Next IU   : IU-2-03A (Namespace Decision)
```

---

## 0. Session Attestation

| Item | Value |
|------|-------|
| **Session ID** | `S7-P2-IU-2-02B` |
| **Mode** | **Design Policy** (§11 Pin Field Table U12) |
| **Prior IUs** | IU-2-01A…IU-2-02A — retained |
| **Freeze Candidate** | **Not declared** |
| **catalogPinId values** | **Not issued** (field defined · values later) |
| **Catalog / Register JSON** | **Not authored** |
| **Framework / Pipeline / Runtime** | Unmodified · Consume |

---

## 1. Purpose

### 1.1 Why this document exists

본 문서는 STEP7 Phase 2(Catalog)에서 **Catalog Freeze**를 수행하기 위한 **Design SSOT**의 골격이다.

STEP6에서 Catalog Design(v0.2)과 Design Seed Snapshot으로 Official/Production Run을 수행했으나, **Frozen Catalog SSOT JSON body**는 아직 in-repo에 없다 (KI-02).

본 Design의 목적은:

| SHALL | SHALL NOT |
|-------|-----------|
| Catalog Freeze의 Design 구조·경계·산출물 자리를 고정 | Framework / Pipeline semantics 재정의 |
| Seed → Freeze 경로의 Design 자리 확보 (세부 규칙 = IU-2-01B+) | Freeze Candidate 선언 (본 IU) |
| Official Re-validation이 Pin 가능한 Catalog 기준을 준비 | Catalog JSON body 작성 (본 IU) |
| STEP6 Catalog Design / Register Suite를 Consume | Runtime / System JSON 변경 |

### 1.2 Position

```text
STEP6 Framework (Locked) · Pipeline (Locked)
        ↓ consume
STEP6-4 Catalog Design · STEP6-5 Register Suite · STEP6 Final Freeze
        ↓ consume
STEP7_Catalog_Freeze_Design (THIS · Skeleton → later fill)
        ↓ later Sessions
Frozen Catalog / Register JSON · Pin · Freeze Candidate
        ↓
Official Re-validation (Phase 7)
```

---

## 2. Scope

### 2.1 In Scope (Design document — full Phase 2 track)

| In | Notes |
|----|-------|
| Catalog Freeze Design structure | This document (skeleton now) |
| Pin / provenance / Seed→Freeze rules | IU-2-01B |
| Path / naming / Pin field table | IU-2-02* |
| Namespace / Classification / Coverage decisions | IU-2-03* · IU-2-04* (cite U1/U12) |
| Register Freeze Design | IU-2-05A |
| Frozen Catalog / Register JSON bodies | IU-2-06* · IU-2-07* |
| Freeze Candidate declaration | IU-2-08* |

### 2.2 Out of Scope (this IU / this document stage)

| Out | Reason |
|-----|--------|
| Catalog JSON body authoring | IU-2-06* |
| Register JSON body authoring | IU-2-07* |
| Freeze Candidate declaration | IU-2-08* |
| Namespace final lock text in Framework Appendix | Framework RO · decide in Catalog Decision SSOT |
| Gap Analysis / Standardization Plan / Pilot | Phase 3–5 |
| Framework / Pipeline redesign | Locked |
| Runtime / System JSON mutation | Forbidden |

### 2.3 IU-2-02A boundary (this Session only)

```text
THIS SESSION (IU-2-02A)
  = §10 Artifact Paths & Naming policy
  ≠ Path finalize / lock declaration
  ≠ Artifact files created
  ≠ Catalog / Register JSON authored
  ≠ U12 Pin Field Table
  ≠ Pin ID minted
  ≠ Namespace / Classification / Coverage locked
  ≠ Freeze Candidate declared
```

---

## 3. Consume

| Document | Role |
|----------|------|
| `STEP7_SCOPE.md` (Approved) | STEP7 In/Out · KI-02/KI-04 · D-CAT |
| `STEP7_WORK_BREAKDOWN.md` (Approved) | WP-2-01 · IU-2-01A Done |
| `STEP7_IMPLEMENTATION_DECOMPOSITION.md` v1.0 | Session Template · Queue |
| `STEP6_FINAL_FREEZE.md` v1.0 | Baseline pin · KI cite |
| `STEP6-4_Rule_Catalog_Design.md` v0.2 | Catalog structure · Seed cite |
| `STEP6-5_Validation_Register_Suite.md` v0.2 | Register shape cite |
| `STEP6_Schema_Validation_Framework.md` | Locked · Consume (U1/U12 cite) |
| `STEP6_Validation_Pipeline.md` | Locked · Consume |
| `DEVELOPMENT_WORKFLOW.md` v0.3 | §12 · Freeze Respect |

---

## 4. Output

### 4.1 Completed IU Outputs (cumulative)

| Output | IU | Status |
|--------|-----|--------|
| Catalog Freeze Design Skeleton | IU-2-01A | **Complete** |
| Pin & Provenance policy (§8) | IU-2-01B | **Complete** |
| Seed → Freeze Path procedure (§9) | IU-2-01B | **Complete** |
| Artifact Paths & Naming policy (§10) | IU-2-02A | **Complete** |
| Pin Field Table U12 (§11) | IU-2-02B | **Complete** |

### 4.2 Phase 2 eventual Outputs (not this IU)

| Deliverable | IU / Milestone |
|-------------|----------------|
| Pin / provenance / Seed→Freeze rules | IU-2-01B |
| Path + Pin field SSOT | IU-2-02A/B |
| Namespace / Classification / Coverage Decision | IU-2-03* / IU-2-04* → D-NS |
| Register Freeze Design | IU-2-05A |
| Frozen Catalog JSON | IU-2-06* → D-CAT |
| Frozen Register JSON | IU-2-07* |
| Freeze Candidate declaration | IU-2-08* · M2.3 |

---

## 5. Freeze Concept

> **Concept only.** Binding rules and declaration = later IUs.

### 5.1 Intent

Catalog Freeze는 Official/Production-class Run이 **재현 가능한 Rule set**을 Pin할 수 있도록, Catalog(및 연계 Register) 본문을 **버전된 Freeze surface**로 고정하는 것이다.

### 5.2 Classes (placeholder)

| Class | Meaning (to be refined) |
|-------|-------------------------|
| **Design Seed** | STEP6 Full Run에 사용된 Seed Snapshot 계열 (cite only) |
| **Freeze Candidate** | Review 후 Official Pin 가능 상태 (not this IU) |
| **Frozen Catalog Body** | In-repo JSON/SSOT body under Pin (not this IU) |

### 5.3 Non-goals (this IU)

- Freeze Candidate **선언하지 않음**
- Framework Appendix C U-items를 Framework 본문에서 **편집하지 않음**
- `schemaComplete` **의미 변경 없음**

---

## 6. Design Structure

> Section titles locked. §§8–9 filled (IU-2-01B). Remaining bodies TBD.

```text
STEP7_Catalog_Freeze_Design.md
├── 0. Session / Design Status
├── 1. Purpose
├── 2. Scope
├── 3. Consume
├── 4. Output
├── 5. Freeze Concept
├── 6. Design Structure
├── 7. Review Items
├── 8. Pin & Provenance          ← filled (IU-2-01B)
├── 9. Seed → Freeze Path        ← filled (IU-2-01B)
├── 10. Artifact Paths & Naming  ← filled (IU-2-02A)
├── 11. Pin Field Table (U12)    ← filled (IU-2-02B)
├── 12. Decision Hooks           ← TBD (cite IU-2-03/04 outputs)
│     ├── Namespace (U1)
│     ├── Classification
│     └── Coverage formulas
├── 13. Register Freeze Link     ← TBD (IU-2-05A cite)
├── 14. Freeze Candidate Gate    ← TBD (IU-2-08*)
└── 15. Document Control
```

### 6.1 Completeness (through IU-2-01B)

| Section | Status |
|---------|--------|
| Purpose · Scope · Consume · Output | Filled (lean) |
| Freeze Concept | Intent only (§5) |
| Design Structure outline | Present |
| §8 Pin & Provenance | Filled (IU-2-01B) |
| §9 Seed → Freeze Path | Filled (IU-2-01B) |
| §10 Artifact Paths & Naming | Filled (IU-2-02A) |
| §11 Pin Field Table (U12) | **Filled (IU-2-02B)** |
| §§12–14 | Reserved / TBD |
| Freeze declaration | **Absent by design** |

---

## 7. Review Items

| ID | Item | Owner Session |
|----|------|---------------|
| **R-01** | Skeleton sections cover Purpose→Review | IU-2-01A (this) |
| **R-02** | No Freeze Candidate language as declared | IU-2-01A |
| **R-03** | No Catalog/Register JSON in this doc | IU-2-01A |
| **R-04** | Pin / provenance / Seed→Freeze rules | **IU-2-01B PASS** |
| **R-05** | Path · naming · Pin fields (U12) | IU-2-02A PASS · **IU-2-02B PASS** |
| **R-06** | Namespace decision recorded outside Framework edit | IU-2-03* |
| **R-07** | Classification / Coverage lock | IU-2-04* |
| **R-08** | Register Freeze Design linked | IU-2-05A |
| **R-09** | Frozen bodies + Freeze Candidate | IU-2-06*…IU-2-08* |

---

## 8. Pin & Provenance

> **Design policy only.** No `catalogPinId` mint · no JSON body · no Freeze Candidate declaration in this section.

### 8.1 Purpose of a Pin

A **Catalog Pin** is the immutable citation unit that an Official / Production-class Validation Run records so the Run can be reproduced against the same Catalog Header + Rule set membership.

| Pin SHALL | Pin SHALL NOT |
|-----------|---------------|
| Cite Catalog Version · Revision (Header) | Redefine Framework Layer / Severity / `schemaComplete` meanings |
| Cite compatible Framework · Pipeline · SPS baselines (RO) | Rewrite STEP6 Framework / Pipeline documents |
| Provide a stable reference for Registers / Report / Engine | Be Finding namespace (`VAL-*` remains Finding-only) |
| Remain immutable for a Run once recorded (STEP6-5 RP5 / §6.3 cite) | Be silently mutated after Official evidence is written |

Cross-cite: STEP6-4 Header Metadata · STEP6-5 Catalog Pin Register role · Framework Rule Pin concept.

### 8.2 Provenance model

Provenance answers: **what was pinned, from what lineage, under which baselines**.

| Provenance axis | Intent | This IU |
|-----------------|--------|---------|
| **Catalog Version / Revision** | Logical Catalog SSOT identity | Policy: required on Pin · values not assigned here |
| **Generated From** | Upstream Design / Seed citation | Policy: required when promoting Seed → body |
| **Compatible Framework Version** | Locked Framework cite | Consume only |
| **Compatible Pipeline Version** | Locked Pipeline cite | Consume only |
| **Compatible SPS / STEP6 Freeze** | `STEP6_FINAL_FREEZE` cite | Consume only |
| **Pin identity (`catalogPinId`)** | Run-recordable Pin key | **Not minted here** (layout = IU-2-02B / U12) |
| **Artifact path** | In-repo body location | **Policy defined (§10)** · binding selection at body/Freeze packaging |

### 8.3 Pin lifecycle (policy)

```text
Design Seed (STEP6 Full Run provenance)
        ↓  promote under §9
Catalog Body (authored later · IU-2-06*)
        ↓  Review
Freeze Candidate (declared later · IU-2-08*)
        ↓  Official activation
Active Pin citation on Runs
```

| State (conceptual) | Meaning | Declared in this IU? |
|--------------------|---------|----------------------|
| **Seed-cited** | Run used Design Seed Snapshot (KI-02) | Historical cite only |
| **Body-draft** | In-repo body under Design (not Pin-active) | Later |
| **Freeze Candidate** | Review-passed · Official Pin eligible | **No** |
| **Pinned / Active** | Official Runs cite immutable Pin | Later |

### 8.4 Immutability & change rules

| Event | Policy |
|-------|--------|
| Official Run records a Pin | That Pin’s Header citation **SHALL NOT** change for that Run’s evidence |
| Catalog Rule text / membership change | Requires **new** Catalog Version/Revision and **new** Pin (mint later) — not silent edit |
| Framework/Pipeline bump without Rule text change | New Pin **MAY** cite new compatible baselines; Rule bodies may stay (STEP6-5 lean) |
| Namespace / Classification / Coverage decisions | Recorded in Decision SSOT (IU-2-03/04) **before** Freeze Candidate — not by editing Framework Appendix C |

### 8.5 What is deferred (explicit)

| Deferred item | Owner IU |
|---------------|----------|
| Exact Pin field table (U12) | IU-2-02B |
| Artifact paths & naming **policy** | **IU-2-02A PASS** (binding path selection at body/Freeze packaging) |
| Concrete `catalogPinId` values | IU-2-06* / IU-2-08* packaging |
| Freeze Candidate declaration | IU-2-08* |
| Register Pin packaging | IU-2-07* · IU-2-05A link |

### 8.6 IU-2-01B PASS (Pin & Provenance)

- [x] Pin purpose · SHALL/SHALL NOT defined  
- [x] Provenance axes listed without minting IDs  
- [x] Lifecycle states defined without Freeze declaration  
- [x] Immutability / change rules stated  
- [x] Deferred items mapped to later IUs  

---

## 9. Seed → Freeze Path

> **Procedure policy only.** Does not author JSON · does not declare Freeze Candidate · does not lock Namespace/Classification/Coverage.

### 9.1 Starting point (Seed)

STEP6 Production Full Validation used a **Design Seed Snapshot** (`FULL_CATALOG` / `FULL_REGISTER` from STEP6-4 §5.3 cite) because a formal frozen Catalog SSOT JSON body was not yet in-repo (**KI-02**).

| Seed property | Policy |
|---------------|--------|
| Role | Provenance input for STEP7 Catalog Freeze |
| Authority | Design / historical Run cite — **not** Official Frozen body |
| Mutation | Seed text is **not** silently rewritten; promotion creates a **new** body artifact later |
| Framework/Pipeline | Remain Locked · Consume |

### 9.2 Target point (Freeze)

| Target | Meaning | This IU |
|--------|---------|---------|
| **Frozen Catalog Body** | In-repo Catalog SSOT JSON under Pin | Later (IU-2-06*) |
| **Frozen Register Body** | In-repo Register SSOT JSON under Pin | Later (IU-2-07*) |
| **Freeze Candidate** | Declared gate for Official Pins | Later (IU-2-08*) · **not now** |

### 9.3 Ordered path (normative sequence)

```text
1. Design Skeleton + Pin/Provenance + Seed→Freeze rules     ← IU-2-01A/B (done through this Session)
2. Artifact Paths & Naming                                  ← IU-2-02A
3. Pin Field Table (U12 lean)                               ← IU-2-02B
4. Namespace Decision (U1) — outside Framework edit         ← IU-2-03*
5. Classification / Coverage Decision                       ← IU-2-04*
6. Register Freeze Design link                              ← IU-2-05A
7. Author Frozen Catalog JSON body (from Seed promotion)    ← IU-2-06*
8. Author Frozen Register JSON body                         ← IU-2-07*
9. Freeze Candidate declaration + Pin packaging             ← IU-2-08* · M2.3
10. Official Re-validation consumes Pin                     ← Phase 7 (D-VAL)
```

**Skip ban:** Body authoring (step 7–8) **SHALL NOT** precede path/Pin-field/Decision gates (steps 2–5) without explicit Plan exception (none in this Design).

### 9.4 Promotion rules (Seed → Body)

| Rule ID | Statement |
|---------|-----------|
| **SF-1** | Promotion **copies/derives** Seed content into a new Catalog body artifact; it does not redefine Framework semantics |
| **SF-2** | Promotion **SHALL** record provenance: Seed citation · Catalog Version/Revision intent · compatible baselines |
| **SF-3** | Promotion **SHALL NOT** mint Official Pin IDs until Freeze Candidate packaging (IU-2-08*) |
| **SF-4** | Promotion **SHALL NOT** lock Namespace / Classification / Coverage by silent edit — Decision Sessions first |
| **SF-5** | Behavior of Runtime / System packages is **out of path**; Standardization Changes are separate Phases |
| **SF-6** | If Seed and Decision SSOT conflict, **Decision SSOT wins** for Freeze body; conflict is logged in Gap/Review — not Framework rewrite |

### 9.5 Gate before Freeze Candidate (preview)

Freeze Candidate (IU-2-08*) **MAY** proceed only when:

| Gate | Source |
|------|--------|
| Paths & naming defined | IU-2-02A |
| Pin field layout defined (U12 lean) | IU-2-02B |
| Namespace disposition recorded | IU-2-03* |
| Classification / Coverage disposition recorded | IU-2-04* |
| Catalog + Register bodies authored | IU-2-06* · IU-2-07* |
| Review PASS on bodies | WP-2-08 |

This section **does not** declare that gate passed.

### 9.6 IU-2-01B PASS (Seed → Freeze Path)

- [x] Seed starting point cited (KI-02 / STEP6-4)  
- [x] Ordered path 1–10 defined  
- [x] Promotion rules SF-1…SF-6 stated  
- [x] Freeze Candidate gate previewed without declaration  
- [x] No JSON / Pin ID / path finalize / axis locks in this IU  

---

## 10. Artifact Paths & Naming

> **Design policy only.** Defines *how* artifacts SHALL be placed and named.  
> Does **not** create files · does **not** declare a finalized/locked path set · examples are illustrative.

### 10.1 Artifact kinds

| Kind | Role | Typical form (later) |
|------|------|----------------------|
| **Design Seed cite** | Historical Seed used by STEP6 Full Run (KI-02) | Code/module snapshot cite or Design appendix — not Official Frozen body |
| **Catalog Body** | Rule Catalog SSOT JSON (promoted from Seed) | `.json` body under validation catalog tree |
| **Register Body** | Validation Register SSOT JSON | `.json` body under validation register tree |
| **Pin Manifest** | Pin packaging metadata (Version/Revision/baselines) | Manifest / pin record — field layout = IU-2-02B |
| **Design SSOT (this doc)** | Freeze Design narrative | Markdown under SPS v1.0 |

Catalog body ≠ Register body ≠ Pin manifest ≠ Design markdown.

### 10.2 Repository placement principles

| Principle | Statement |
|-----------|-----------|
| **AP-1 Validation home** | Catalog / Register **bodies** live under the Validation domain tree (`frontend/src/validation/…`), not under Runtime Contract / `data/systems` |
| **AP-2 SPS docs home** | STEP7 Catalog Freeze **Design** markdown remains under `System Platform Standard (SPS) v1.0/` |
| **AP-3 No Runtime mix** | Validation artifacts **SHALL NOT** be placed under `frontend/src/runtime/` |
| **AP-4 No System package mix** | Validation Catalog/Register **SHALL NOT** be embedded inside `frontend/src/data/systems/<id>/` |
| **AP-5 Separate Catalog vs Register** | Catalog and Register use **sibling** directories (or clearly separated subtrees) — never one file for both |
| **AP-6 Seed vs Frozen separation** | Design Seed provenance and Frozen body artifacts **SHALL** be distinguishable by path segment and/or filename token |

### 10.3 Directory structure principles

```text
frontend/src/validation/
  catalog/          ← Catalog bodies (+ optional seed/ reference subtree)
  register/         ← Register bodies (+ optional seed/ reference subtree)
  …                 ← Engine / pilot / full (existing STEP6) unchanged by this policy
```

| Rule | Statement |
|------|-----------|
| **D-1** | Prefer stable top-level `catalog/` · `register/` under `validation/` |
| **D-2** | Optional `seed/` or `frozen/` (or filename tokens) to separate Seed cite material vs Frozen bodies |
| **D-3** | Do not relocate STEP6 Engine paths in this Design Session |
| **D-4** | Exact leaf directory names may be refined at body authoring — **policy binds the tree, not a freeze lock** |

### 10.4 Relative path policy

| Rule | Statement |
|------|-----------|
| **RP-1** | Pins, Registers, Reports, and Engine config **SHALL** cite artifacts with **repo-relative** paths from repository root (or module-relative paths resolved consistently by Engine) |
| **RP-2** | Absolute machine paths (`D:\…`, `/Users/…`) are **forbidden** in Pin / Official evidence |
| **RP-3** | Path strings in Pins are part of provenance; changing them requires a **new** Pin (see §8.4 · §10.9) |
| **RP-4** | Forward slashes `/` in stored path strings (portable cite) |

### 10.5 Naming Convention

| Element | Convention |
|---------|------------|
| **Case** | `kebab-case` or `snake_case` — pick one family per subtree and stay consistent (lean: `kebab-case` filenames) |
| **Catalog body** | Include token `catalog` · avoid bare `rules.json` without qualifier |
| **Register body** | Include token `register` · never reuse Catalog filename |
| **Seed-related** | Include token `seed` when storing Seed-derived reference material |
| **Frozen-related** | Include token `frozen` (or versioned frozen name) for Official body candidates |
| **No Pin ID in filename required** | Pin identity lives in Pin fields (U12) — filename **MAY** include version, **SHALL NOT** invent Pin IDs here |
| **No spaces** | Spaces forbidden in artifact filenames |

### 10.6 Version expression rules

| Rule | Statement |
|------|-----------|
| **V-1** | Logical Catalog Version/Revision is **Header/Pin authority** (STEP6-4/5 cite) — not Framework version |
| **V-2** | Filename **MAY** embed version (`…-v1.0.0…`) for human browsing; Pin **SHALL** still carry Version/Revision fields |
| **V-3** | Filename version and Header version **SHOULD** match when both present; conflict → Header/Pin wins |
| **V-4** | Do not encode Namespace / Classification decisions into filenames as a substitute for Decision SSOT |

### 10.7 Catalog / Register artifact distinction

| Catalog | Register |
|---------|----------|
| Rule set / Catalog Header / Rule membership | Evidence shapes · Pin cite · Run/Result/Finding persistence shapes |
| Path under `validation/catalog/` | Path under `validation/register/` |
| Promotion from Catalog Seed | Promotion from Register Seed |
| Owned by Catalog Freeze track | Owned by Register Freeze track (IU-2-05/07) linked from §13 later |

### 10.8 Design Seed / Frozen Body distinction

| | Design Seed | Frozen Body |
|--|-------------|-------------|
| **Authority** | Historical / Design provenance (KI-02) | Official Pin-eligible body (after Freeze Candidate) |
| **Path/name** | `seed` token or seed subtree | `frozen` token or frozen subtree / versioned frozen name |
| **Mutation** | Not silently rewritten (§9) | Immutable under Pin once Official (§8 · §10.10) |
| **This Session** | Cite only | Not authored |

### 10.9 Path change policy

| Event | Policy |
|-------|--------|
| Policy refinement before any body exists | Allowed in Design doc revision (this track) |
| Body already authored, path change | Treat as **new artifact** + provenance update; old path retained as cite if Runs exist |
| Official Pin already recorded | Path change **requires new Pin** — no silent rewrite of cited path |
| Move for cleanup only | Forbidden without Version/Pin bump once Pinned |

### 10.10 Artifact immutability principles

| Rule | Statement |
|------|-----------|
| **IM-1** | Frozen body bytes cited by an Official Pin **SHALL NOT** be overwritten in place |
| **IM-2** | Corrections ship as **new Version/Revision** (+ new Pin when Official) |
| **IM-3** | Design markdown (this file) may evolve by Version bump; it is not a Catalog Pin surface |
| **IM-4** | Engine baseline paths remain Consume — this policy does not relocate Engine code |

### 10.11 Path examples (illustrative only — not created · not finalized)

```text
# Illustrative — DO NOT treat as Freeze lock or as files created by this Session

frontend/src/validation/catalog/seed/catalog-seed-step6-full.json
frontend/src/validation/catalog/frozen/catalog-frozen-v1.0.0.json
frontend/src/validation/register/seed/register-seed-step6-full.json
frontend/src/validation/register/frozen/register-frozen-v1.0.0.json

System Platform Standard (SPS) v1.0/STEP7_Catalog_Freeze_Design.md
```

### 10.12 IU-2-02A PASS (Artifact Paths & Naming)

- [x] Artifact kinds defined  
- [x] Repository · directory · relative path principles stated  
- [x] Naming · version expression rules stated  
- [x] Catalog vs Register · Seed vs Frozen distinction stated  
- [x] Path change · immutability principles stated  
- [x] Examples marked illustrative only  
- [x] No artifact creation · no path finalize declaration · no JSON/Pin/U12/Freeze  

---

## 11. Pin Field Table (U12)

> **U12 Field Structure Design only.**  
> Defines Pin Manifest **layout**. Does **not** mint Pin IDs · does **not** issue `catalogPinId` values · does **not** author JSON · does **not** declare Freeze Candidate.

### 11.1 Purpose

Framework Appendix C **U12** defers exact Catalog / Validator Pin table detail.  
This section supplies the STEP7 **Pin Manifest field layout** so later packaging (IU-2-08*) and Official Runs can record a deterministic Pin citation (STEP6-5 RP5 · §6.3).

| SHALL | SHALL NOT |
|-------|-----------|
| Define field name · purpose · requiredness · type · source | Issue concrete `catalogPinId` strings |
| Align with STEP6-4 §9.5 Header Metadata (cite-only meanings) | Redefine Header / Framework / Pipeline semantics |
| Support Catalog Pin + optional Register body cite | Create Catalog / Register JSON bodies |
| Leave value assignment to Freeze packaging / Runs | Declare Freeze Candidate |

### 11.2 Pin Manifest field layout (U12)

| Field Name | Purpose | Req / Opt | Type | Source | Notes |
|------------|---------|-------------|------|--------|-------|
| `catalogPinId` | Stable Pin identity for Official Run evidence | **Required** (at Official Pin packaging) | `string` | Pin packaging (IU-2-08*) | **Field defined · values NOT issued in this IU** |
| `catalogVersion` | Catalog SSOT logical version | **Required** | `string` | Catalog Header (STEP6-4 §9.5) | Cite-only meaning |
| `catalogRevision` | Revision within Version | **Required** | `string` | Catalog Header | Cite-only meaning |
| `compatibleSpsVersion` | Compatible SPS plate | **Required** | `string` | Catalog Header | e.g. SPS v1.0 cite |
| `compatibleFrameworkVersion` | Compatible Framework plate | **Required** | `string` | Catalog Header | Locked Framework Consume identity |
| `compatiblePipelineVersion` | Compatible Pipeline plate | **Required** | `string` | Catalog Header | Locked Pipeline Consume identity |
| `generatedFrom` | Provenance of Catalog body / Seed lineage | **Required** | `string` \| `string[]` | Catalog Header · §9 Seed path | Seed cite + Design doc ids |
| `lastUpdated` | Header / snapshot timestamp | **Required** | `date` (ISO-8601 date preferred) | Catalog Header | Audit |
| `catalogBodyPath` | Repo-relative path to Catalog body artifact | **Required** (when body exists) | `string` (path) | §10 path policy | Absolute paths forbidden (§10.4) |
| `registerBodyPath` | Repo-relative path to Register body artifact | **Optional** | `string` (path) | §10 · Register Freeze | May be omitted until IU-2-07* |
| `registerPinId` | Optional Register-side pin key | **Optional** | `string` | Register packaging | **Not issued here**; layout only |
| `pinStatus` | Manifest lifecycle label | **Optional** | enum lean: `Draft` \| `FreezeCandidate` \| `Frozen` | Packaging | **Values not set** in this IU; enum shape only |
| `compatibleStep6Freeze` | STEP6 Final Freeze cite | **Optional** | `string` | `STEP6_FINAL_FREEZE` | Provenance convenience |
| `notes` | Free-form packaging note | **Optional** | `string` | Operator / Review | Non-normative |

### 11.3 Requiredness rules (lean)

| Context | Minimum Required fields |
|---------|-------------------------|
| **Design / dry-run Pin sketch** | `catalogVersion` · `catalogRevision` · `compatibleFrameworkVersion` · `compatiblePipelineVersion` · `generatedFrom` |
| **Official Pin packaging** | All **Required** rows above including `catalogPinId` · `catalogBodyPath` · Header compatibility set |
| **This IU** | Layout only — **no row values populated** |

### 11.4 Type & cite rules

| Rule | Statement |
|------|-----------|
| **U12-1** | Field meanings for Header-derived columns **SHALL** match STEP6-4 §9.5 / STEP6-5 RP2 (cite-only) |
| **U12-2** | `catalogPinId` is an **opaque string** identity; format scheme deferred to IU-2-08* (no mint now) |
| **U12-3** | Path fields **SHALL** obey §10 relative-path policy |
| **U12-4** | `pinStatus` enum is a **shape**; assigning `FreezeCandidate` / `Frozen` is **not** a Freeze declaration by this Design Session |
| **U12-5** | Adding columns later requires Design Version bump; removing Required columns after Official Pins exist is forbidden without migration |

### 11.5 Shape sketch (non-normative · not a JSON artifact)

```text
PinManifest {
  catalogPinId: string                 // REQUIRED at Official packaging — NOT issued now
  catalogVersion: string
  catalogRevision: string
  compatibleSpsVersion: string
  compatibleFrameworkVersion: string
  compatiblePipelineVersion: string
  generatedFrom: string | string[]
  lastUpdated: date
  catalogBodyPath: string              // repo-relative
  registerBodyPath?: string
  registerPinId?: string               // NOT issued now
  pinStatus?: Draft | FreezeCandidate | Frozen
  compatibleStep6Freeze?: string
  notes?: string
}
```

### 11.6 Explicit non-outputs (this IU)

| Forbidden output | Status |
|------------------|--------|
| Concrete `catalogPinId` / Pin ID list | **None** |
| Catalog JSON / Register JSON | **None** |
| Freeze Candidate declaration | **None** |
| Namespace / Classification / Coverage lock | **None** |

### 11.7 IU-2-02B PASS (Pin Field Table U12)

- [x] U12 Pin Manifest field table defined  
- [x] Required / Optional · Type · Source · Notes stated  
- [x] No Pin ID / `catalogPinId` values issued  
- [x] No JSON · no Freeze declaration · no axis locks  

---

## 12. Decision Hooks

**TBD — IU-2-03 / IU-2-04 outputs (cite only; no Framework rewrite)**

---

## 13. Register Freeze Link

**TBD — IU-2-05A**

---

## 14. Freeze Candidate Gate

**TBD — IU-2-08* · Not declared in IU-2-01A**

---

## 15. Document Control

| Item | Value |
|------|-------|
| Version | **v0.4** |
| Status | Design Draft · **Not Frozen** |
| Session | **S7-P2-IU-2-02B** |
| IU-2-02B | **PASS** (§11 complete) |
| Next | **S7-P2-IU-2-03A** — Namespace Decision |
| Location | `System Platform Standard (SPS) v1.0/STEP7_Catalog_Freeze_Design.md` |

### Revision History

| Version | Date | Change |
|---------|------|--------|
| v0.1 | 2026-07-19 | Skeleton created (S7-P2-IU-2-01A) |
| v0.2 | 2026-07-19 | S7-P2-IU-2-01B — §8 Pin & Provenance · §9 Seed → Freeze Path |
| v0.3 | 2026-07-19 | S7-P2-IU-2-02A — §10 Artifact Paths & Naming |
| **v0.4** | 2026-07-19 | **S7-P2-IU-2-02B** — §11 Pin Field Table (U12) · IU-2-02B PASS |

---

*End of STEP7_Catalog_Freeze_Design.md v0.4*
