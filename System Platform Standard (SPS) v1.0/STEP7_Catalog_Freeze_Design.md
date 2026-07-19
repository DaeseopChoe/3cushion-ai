# STEP7_Catalog_Freeze_Design.md

```text
Document  : STEP7_Catalog_Freeze_Design.md
Version   : v0.8
Status    : Design Draft — IU-2-04B Complete · Not Frozen
Date      : 2026-07-19
STEP      : STEP7 / Phase P2 Catalog
Session   : S7-P2-IU-2-04B
IU        : IU-2-04B
WP        : WP-2-04
Milestone : M2.2
Owner     : System Standardization / Catalog Ops
Type      : Catalog Freeze Design (Coverage Formulas / Policy)
Baseline  : CL-001 Locked · NS-U1-001 Option (C) Locked · Framework schemaComplete RO ·
            STEP6 Final Freeze v1.0
Rule      : Coverage policy only · No schemaComplete meaning change · No CL-001 / NS edit ·
            No Framework / Appendix C edit · No Catalog/Register JSON · No Pin ·
            No Freeze Candidate · No Register Freeze Link · No Runtime / Pipeline /
            System JSON mutation
Next IU   : IU-2-05A
```

---

## 0. Session Attestation

| Item | Value |
|------|-------|
| **Session ID** | `S7-P2-IU-2-04B` |
| **Mode** | **Decision Record** (§12.3 Coverage Formulas) |
| **Coverage Decision** | **Locked** (§12.3 · **CV-001**) |
| **Classification CL-001** | **Unmodified** |
| **Namespace NS-U1-001** | **Unmodified** |
| **schemaComplete meaning** | **Framework RO — unchanged** |
| **Register Freeze Link** | **Not in this IU** |
| **Freeze Candidate / JSON / Pin** | **None** |
| **Runtime / Pipeline** | Unmodified · Consume |

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
| Namespace Decision Framework (§12.1) | IU-2-03A | **Complete** (lock = IU-2-03B) |

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
├── 12. Decision Hooks
│     ├── 12.1 Namespace (U1)    ← filled framework (IU-2-03A) · lock = IU-2-03B
│     ├── Classification         ← TBD (IU-2-04*)
│     └── Coverage formulas      ← TBD (IU-2-04*)
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
| §11 Pin Field Table (U12) | Filled (IU-2-02B) |
| §12.1 Namespace Decision Framework | **Filled (IU-2-03A)** · lock pending IU-2-03B |
| §12.2–12.3 Classification / Coverage | Reserved / TBD |
| §§13–14 | Reserved / TBD |
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
| **R-06** | Namespace decision recorded outside Framework edit | **IU-2-03A PASS** (framework) · IU-2-03B (lock) |
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

> Decision Hooks record **how** Catalog Freeze decisions are made.  
> They **SHALL NOT** edit Framework / Pipeline / Appendix C. Outcomes are Catalog Decision records (later IUs).

### 12.1 Namespace (U1) — Decision Framework + Record

> **IU-2-03A:** Decision Framework (§12.1.1–12.1.7).  
> **IU-2-03B:** Decision Record (§12.1.8) — **Option (C) Locked**.

#### 12.1.1 Purpose

Rule Namespace는 Catalog Rule ID의 **prefix / identity space**이다 (Framework: Rule Namespace ≠ Finding `VAL-*`).

본 Hook의 목적:

| SHALL | SHALL NOT |
|-------|-----------|
| U1 결정을 Catalog Freeze 전에 **절차화** | Framework Appendix C를 편집하여 “해결” |
| STEP5 `SCH-R-*` Trace와 STEP6 실행 Rule ID의 관계 명확화 | Finding namespace(`VAL-*`)와 Rule Namespace 혼동 |
| Freeze body / Pin 전에 선택 기준 제공 | 본 Session에서 Namespace **최종 lock** |

KI-04 cite: Namespace lock remains Pending until Decision Session completes — this IU prepares the decision, does not close it.

#### 12.1.2 결정 대상 (Decision Object)

| Object | In scope for U1 Decision | Out of scope |
|--------|--------------------------|--------------|
| Catalog **Rule ID namespace** prefix / mapping policy | Yes | — |
| Relationship to STEP5 `SCH-R-*` (RO Trace) | Yes | Rewriting STEP5 Catalog |
| Finding IDs `VAL-*` | No (Framework-owned Finding namespace) | — |
| Pipeline Stage names | No | — |
| System JSON `systemId` / package paths | No | — |

#### 12.1.3 Decision Criteria

| ID | Criterion | Lean |
|----|-----------|------|
| **NC-1** | Does not redefine Framework Layer / Severity / `schemaComplete` | Mandatory |
| **NC-2** | Preserves STEP5 `SCH-R-*` as **RO Trace** when needed (no Audit ownership takeover) | Mandatory |
| **NC-3** | Finding namespace remains `VAL-*` only (STEP6-4 CP6) | Mandatory |
| **NC-4** | Compatible with Seed → Freeze promotion (§9) without silent Framework edit | Mandatory |
| **NC-5** | Minimizes Engine/Register rename churn for Official Pins | Prefer |
| **NC-6** | Clear Operator readability (Rule ID ≠ Finding ID) | Prefer |

#### 12.1.4 Allowed Namespace 후보 (Framework U1 — Consume)

Candidates are **cited from** Framework Appendix C **U1** (not edited there):

| Option | Summary (Framework cite) |
|--------|--------------------------|
| **(A)** | Execute under `SCH-R-*` IDs directly |
| **(B)** | New `SV-R-*` / `VAL-R-*` mapped to SCH-R |
| **(C)** | Dual catalogs: STEP5 SCH-R RO + STEP6 Catalog |

| Note | Statement |
|------|-----------|
| Option labels | **A / B / C only** — no additional invented namespaces in this IU |
| Option (B) wording | Framework text mentions `VAL-R-*` as a **Rule** namespace candidate; this **SHALL NOT** be read as Finding `VAL-*` |
| Selection | **Locked in §12.1.8 — Option (C)** |

#### 12.1.5 Consume 대상

| Document | Use |
|----------|-----|
| Framework Appendix C **U1** | Candidate set (RO) |
| STEP6-3 Analysis · STEP6-4 Catalog Design | Domain≠Family · CP6 Finding≠Rule · U1 Pending cite |
| STEP6-5 Register Suite | Rule ID / Catalog Pin cite patterns |
| STEP5 Rule Catalog (Frozen) | `SCH-R-*` Trace source (RO) |
| STEP6 Final Freeze · KI-04 | Namespace lock backlog cite |
| This Design §§8–11 | Pin / path constraints on decision packaging |

#### 12.1.6 결정 절차 (Procedure)

```text
1. Confirm Consume list (§12.1.5)
2. Score Options A/B/C against NC-1…NC-6 (worksheet · no lock yet)
3. Record recommendation + rationale in IU-2-03B Decision Record
4. Explicitly state: Framework Appendix C remains RO (decision lives in Catalog Decision SSOT)
5. Only after IU-2-03B lock → allow Catalog body ID scheme (IU-2-06*) to follow chosen option
```

| Gate | Rule |
|------|------|
| **Before IU-2-03B** | No Namespace lock claim · no Catalog JSON Rule IDs final |
| **Framework edit** | **Forbidden** — ADR / Framework Review only if normative Framework text must change |
| **This IU PASS** | Framework + criteria + candidates + procedure present · **choice absent** |

#### 12.1.7 IU-2-03A PASS (Namespace Decision Framework)

- [x] Purpose · Decision Object · Criteria stated  
- [x] Allowed candidates A/B/C cited from Framework U1  
- [x] Consume list · Procedure stated  
- [x] **No final Namespace decision** (at IU-2-03A close)  
- [x] No Framework / Appendix C / Classification / Coverage / JSON / Pin / Freeze  

#### 12.1.8 Namespace Decision Record (IU-2-03B)

| Item | Value |
|------|-------|
| **Decision ID** | **NS-U1-001** |
| **Session** | `S7-P2-IU-2-03B` |
| **Selected Option** | **(C) Dual catalogs: STEP5 `SCH-R-*` RO + STEP6 Catalog** |
| **Status** | **Locked** (Catalog Decision SSOT in this document) |
| **Framework Appendix C** | **Unmodified** — U1 remains historical Pending cite; operative choice is **this Record** |

##### Selected Option — (C)

**Choice:** Dual catalogs.

| Track | Role |
|-------|------|
| **STEP5 `SCH-R-*`** | **RO Trace only** — Architecture Audit Rule identity · not STEP6 execution ownership |
| **STEP6 Catalog Rule IDs** | **Separate Catalog-owned Rule Namespace** for Schema Validation execution Rules |

**STEP6 Catalog Rule Namespace lean (binding for body authoring):** use a dedicated Rule prefix in the **`SV-R-*` family** (Schema Validation Rule).  
**Forbidden for Rule IDs:** `VAL-*` and `VAL-R-*` — reserved collision risk with Finding namespace `VAL-*` (NC-3 / CP6).

##### Selection rationale (NC scoring)

| Criterion | Option (C) |
|-----------|------------|
| **NC-1** | PASS — no Framework semantics rewrite |
| **NC-2** | PASS — `SCH-R-*` stays RO Trace; no Audit takeover |
| **NC-3** | PASS — Findings remain `VAL-*` only; Rules ≠ Findings |
| **NC-4** | PASS — Seed→Freeze can mint STEP6 Catalog IDs without editing Framework |
| **NC-5** | PASS — Engine binds to Catalog Pin + STEP6 Rule IDs; SCH-R optional Trace |
| **NC-6** | PASS — Operator-visible separation: Audit Trace vs Validation Rule vs Finding |

##### Rejected options

| Option | Reject reason |
|--------|---------------|
| **(A)** Execute under `SCH-R-*` directly | Violates **NC-2**: conflates STEP5 Audit ownership with STEP6 execution Rules (STEP6-3 D-STEP6-3-06 / Trace-only policy). |
| **(B)** New `SV-R-*` / `VAL-R-*` mapped to SCH-R | Partially overlaps (C) on `SV-R-*`, but Framework pairing with **`VAL-R-*`** risks **NC-3** / CP6 (Finding `VAL-*` confusion). Dual-catalog framing in (C) is clearer for SCH-R RO Trace. |

##### STEP5 `SCH-R-*` Trace 처리 원칙

| Rule | Statement |
|------|-----------|
| **T-1** | `SCH-R-*` **SHALL** remain STEP5 Frozen Suite identities |
| **T-2** | STEP6 Catalog **MAY** cite `SCH-R-*` as **RO Trace / mapping**, never as sole execution ownership under Option (C) |
| **T-3** | Trace citations **SHALL NOT** rewrite STEP5 Rule Catalog texts |
| **T-4** | Absence of a Trace mapping **SHALL NOT** block STEP6 Rule execution if Catalog Rule is Active under Pin |

##### Rule Namespace vs Finding Namespace 분리 원칙

| Namespace | Owner | Use |
|-----------|-------|-----|
| **STEP6 Catalog Rule IDs** (`SV-R-*` lean) | Schema Rule Catalog (STEP7 Freeze track) | Rule execution / Catalog body |
| **Finding IDs** (`VAL-*`) | Validation Finding Register | Findings only |
| **STEP5 `SCH-R-*`** | STEP5 Audit (Frozen) | RO Trace only |

| Separation rule | Statement |
|-----------------|-----------|
| **S-1** | Rule ID ≠ Finding ID — always |
| **S-2** | No Rule SHALL be allocated an ID in `VAL-*` / `VAL-R-*` |
| **S-3** | Registers cite Rule IDs and Finding IDs on separate fields |

##### Binding for Catalog JSON (IU-2-06*)

| Rule | Statement |
|------|-----------|
| **B-1** | Catalog JSON body authoring (**IU-2-06***) **SHALL** follow **NS-U1-001 Option (C)** |
| **B-2** | New execution Rule records **SHALL** use STEP6 Catalog Rule Namespace (`SV-R-*` lean), not `SCH-R-*` as primary ID |
| **B-3** | Optional `schRTrace` / equivalent Trace field **MAY** reference STEP5 `SCH-R-*` |
| **B-4** | This Decision does **not** author Catalog JSON and does **not** declare Freeze Candidate |

##### IU-2-03B PASS

- [x] Option **(C)** selected with rationale  
- [x] Rejected **(A)** / **(B)** with reasons  
- [x] SCH-R Trace principles · Rule vs Finding separation stated  
- [x] IU-2-06* binding stated  
- [x] No Framework / Appendix C / Classification / Coverage / JSON / Pin / Freeze  

### 12.2 Classification Decision (IU-2-04A)

| Item | Value |
|------|-------|
| **Decision ID** | **CL-001** |
| **Session** | `S7-P2-IU-2-04A` |
| **Status** | **Locked** (Catalog Decision SSOT) |
| **Depends on** | **NS-U1-001 Option (C)** — STEP6 Catalog Rules use Catalog-owned IDs (`SV-R-*` lean); `SCH-R-*` RO Trace only |
| **Does not include** | Coverage formulas / `schemaComplete` numeric policy (**IU-2-04B**) |

#### 12.2.1 Purpose

Classification은 Catalog Rule을 **구조·결과 중력·cascade 거동**으로 태깅하는 축 집합이다.

| SHALL | SHALL NOT |
|-------|-----------|
| Bind each STEP6 Catalog Rule to Domain · Family · Type · Layer (+ severity/blocking defaults) | Redefine Framework Severity / Layer / `schemaComplete` **meanings** |
| Keep Finding classification separate from Rule classification | Allocate Finding codes as Rule IDs (NS-U1-001 / CP6) |
| Guide Catalog JSON RuleRecord fields (IU-2-06*) | Author Coverage percentage formulas (IU-2-04B) |
| Lock axes for Freeze body authoring | Edit Framework Appendix C |

#### 12.2.2 Classification 계층 (분류 체계)

```text
Rule Identity (NS-U1-001)
  ruleId ∈ STEP6 Catalog Namespace (SV-R-* lean)
  optional schRTrace → STEP5 SCH-R-* (RO)
        ↓
Structural Classification (required on every Catalog Rule)
  Domain (WHAT) × Family (HOW) × Rule Type × primaryLayer (L1–L7)
        ↓
Outcome Classification (defaults on Rule; Framework meanings RO)
  Severity default ∈ {BLOCKER, ERROR, WARNING, INFO}
  Blocking default ∈ {blocks-deeper, does-not, inherit}
        ↓
Deferral / Warning tags (Rule-side policy tags — not Finding records)
  deferredCandidate · warningHandlingLean
        ↓
CoverageClass field presence (Required|Optional|Deferred)
  — field allowed on RuleRecord
  — numeric / completeness formulas → IU-2-04B only
```

| Tier | Axes | Lock in CL-001? |
|------|------|-----------------|
| **Identity** | `ruleId` namespace per NS-U1-001 | Yes (cite NS-U1-001) |
| **Structural** | Domain · Family · Type · `primaryLayer` | **Yes — required** |
| **Outcome** | Severity default · Blocking default | **Yes — required defaults** |
| **Policy tags** | deferredCandidate · warningHandlingLean | **Yes — optional fields, allowed values locked** |
| **CoverageClass** | Required \| Optional \| Deferred | **Field allowed**; formula/impact = **IU-2-04B** |

#### 12.2.3 Classification 기준

| ID | Criterion | Statement |
|----|-----------|-----------|
| **CC-1** | Domain ≠ Family | Domain = WHAT · Family = HOW — independent axes (STEP6-3/4 Consume) |
| **CC-2** | Layer bind | Rules bind to Framework **Layers L1–L7**, not Pipeline Stage names |
| **CC-3** | Type bind | Rule Type ∈ Framework Rule Type set (cite-only) |
| **CC-4** | Severity meanings RO | BLOCKER/ERROR/WARNING/INFO meanings stay Framework-owned |
| **CC-5** | Blocking ≠ Deferred | Blocking drives cascade skip; Deferred is item/coverage posture — do not conflate |
| **CC-6** | Option C consistency | Structural axes apply to **STEP6 Catalog Rules** only; SCH-R Trace is not re-classified as execution Rule |
| **CC-7** | No Finding bleed | Classification fields on Rules are not Finding Severity records |

#### 12.2.4 Classification Lock 규칙

| Rule | Statement |
|------|-----------|
| **CL-L1** | After CL-001, Catalog body authoring **SHALL** populate Structural + Outcome defaults on every RuleRecord |
| **CL-L2** | New axis invention after CL-001 requires Design Version bump + Review — not silent add in JSON |
| **CL-L3** | Removing a required Structural axis after Official Pin exists is **forbidden** without new Catalog Version + new Pin |
| **CL-L4** | Framework Severity/Layer **semantics** remain RO even when Catalog locks **which default** a Rule carries |
| **CL-L5** | Coverage formulas remain unlocked until **IU-2-04B** |

#### 12.2.5 Rule Classification vs Finding Classification 분리

| | Rule Classification | Finding Classification |
|--|---------------------|------------------------|
| **Object** | Catalog Rule (`SV-R-*`) | Finding (`VAL-*`) |
| **Owner** | Schema Rule Catalog | Finding Register |
| **Typical fields** | Domain · Family · Type · Layer · Severity **default** · Blocking | Severity **observed** · VAL identity · evidence |
| **Namespace** | NS-U1-001 Option (C) | `VAL-*` only |

| Separation rule | Statement |
|-----------------|-----------|
| **RC-1** | Rule Severity default ≠ automatic Finding emission |
| **RC-2** | Finding Severity is assigned at Finding creation policy (Registers) — not by rewriting Rule Domain/Family |
| **RC-3** | WARNING-class Rule tags may **lean** VAL emission (U5/U9 cite) but do not allocate Finding IDs |

#### 12.2.6 Binding for Catalog JSON (IU-2-06*)

| Rule | Statement |
|------|-----------|
| **CB-1** | Each RuleRecord **SHALL** include: `ruleId` (NS-U1-001) · `domain` · `family` · `type` · `primaryLayer` · `severityDefault` · `blockingDefault` |
| **CB-2** | Optional: `schRTrace` · `deferredCandidate` · `warningHandlingLean` · `coverageClass` (field only) |
| **CB-3** | **SHALL NOT** embed Coverage percentage / `schemaComplete` formula constants in Classification fields — those belong to **IU-2-04B** / Coverage policy |
| **CB-4** | This Decision does **not** author Catalog JSON |

#### 12.2.7 Classification 변경 정책 (Freeze 이후)

| Event | Policy |
|-------|--------|
| Pre-Freeze Candidate body draft | May adjust Rule defaults under Review; bump Catalog Revision |
| After Freeze Candidate / Official Pin | Structural axis change → **new Catalog Version** + **new Pin** (§8 immutability) |
| Severity/Blocking default change on Active Rule | Version/Revision + Pin bump; no in-place silent edit |
| Framework Severity meaning change | **ADR / Framework Review only** — out of Catalog silent edit |
| Coverage formula change | **IU-2-04B / later Coverage revision** — not Classification reopen by default |

#### 12.2.8 IU-2-04A PASS

- [x] Purpose · hierarchy · criteria · lock rules stated  
- [x] Rule vs Finding Classification separation stated  
- [x] IU-2-06* binding stated · post-Freeze change policy stated  
- [x] Namespace Decision untouched · Coverage formulas not authored  
- [x] No Framework / JSON / Pin / Freeze  

### 12.3 Coverage Formulas (IU-2-04B)

| Item | Value |
|------|-------|
| **Decision ID** | **CV-001** |
| **Session** | `S7-P2-IU-2-04B` |
| **Status** | **Locked** (Catalog Coverage policy SSOT) |
| **Depends on** | **CL-001** (Classification) · **NS-U1-001** Option (C) |
| **schemaComplete** | **Consume Framework §10 meanings only** — STEP7 does **not** redefine |

#### 12.3.1 Coverage 목적

Coverage는 Catalog Rule이 Official Run에서 **어느 범위로 참여하는지**, 그리고 그 결과가 Framework `schemaComplete` rollup에 **어떻게 기여하는지**를 Catalog 측에서 표현한다.

| SHALL | SHALL NOT |
|-------|-----------|
| Assign `CoverageClass` + completeness-impact lean per Rule | Change Framework `schemaComplete` YES/NO/NOT_RUN/UNDECIDED **definitions** |
| Align Required / Optional / Deferred with CL-001 fields | Own `schemaComplete` (STEP6 Framework Owner) |
| Guide Catalog JSON RuleCoverage fields (IU-2-06*) | Invent percentage thresholds that override Framework Severity→completeness rules |
| Separate CoverageClass from Finding emission | Conflate Blocking cascade with Deferred coverage |

#### 12.3.2 Coverage 계층

```text
Target Set (Run scope — Pipeline / U2 cite)
        ↓
RuleCoverage (per Catalog Rule · this Decision)
  coverageClass: Required | Optional | Deferred
  completenessImpact: Affects schemaComplete | Does not
  inRunDefault: In-Run | Deferred | NOT_RUN   (mode-sensitive lean)
        ↓
Rule Execution Outcomes (Engine — Framework Severity RO)
        ↓
schemaComplete rollup (Framework §10 Owner — Consume only)
```

| Layer | Owner | This IU |
|-------|-------|---------|
| Target Set | Pipeline / Run options | Cite only |
| RuleCoverage fields | Catalog (CV-001) | **Lock policy** |
| Outcome Severity meanings | Framework | RO |
| `schemaComplete` state machine | Framework §10 | RO Consume |

#### 12.3.3 Coverage 계산 원칙 (Formulas — Catalog lean)

> “Formula” here = **deterministic Catalog mapping rules**, not a redefinition of Framework completeness.

| ID | Formula / Mapping | Statement |
|----|-------------------|-----------|
| **CF-1** | `InScopeRequired(R)` | Rule R is In-Scope Required iff `coverageClass=Required` ∧ selected by Target Set ∧ `inRunDefault≠Deferred` for Official mode |
| **CF-2** | `RequiredFail(R)` | True iff In-Scope Required R ends with Severity ∈ {BLOCKER, ERROR} (Framework meanings RO) |
| **CF-3** | `RequiredCoverageMet(unit)` | True iff every In-Scope Required Rule for unit has Execution Status allowing completeness (not FAILED with RequiredFail; not improperly NOT_RUN when required In-Run) — **evaluate under Framework §10** |
| **CF-4** | `OptionalFail` | Optional Rule FAIL **SHALL NOT** alone force `schemaComplete=NO` (completenessImpact = Does not, lean) |
| **CF-5** | `DeferredNonForce` | Deferred Rules contribute Deferred Items; they **SHALL NOT** alone force YES; they also **SHALL NOT** be treated as RequiredFail |
| **CF-6** | Catalog claim | Catalog **SHALL NOT** assert `schemaComplete` values; Engine/Summary **SHALL** compute using Framework §10 + these membership mappings |

**Explicit non-override:** Numeric “% of rules passed” thresholds are **not** introduced as a substitute for Framework Severity→completeness policy (STEP6-4 §7.4 cite; U5/U7 remain Framework Pending leans — Catalog follows Framework default lean until ADR).

#### 12.3.4 schemaComplete와의 관계 (의미 변경 금지)

| Rule | Statement |
|------|-----------|
| **SC-1** | `schemaComplete` **Owner = STEP6 Framework** |
| **SC-2** | STEP7 / Catalog Coverage **SHALL NOT** rewrite YES / NO / NOT_RUN / UNDECIDED meanings |
| **SC-3** | Catalog supplies **which Rules are Required/Optional/Deferred** and whether they **Affect** completeness |
| **SC-4** | Production STEP6-10 example (ERROR → NO) remains consistent with Framework lean — Catalog Required Domain-check FAIL → contributes to NO via Framework, not via a new Catalog formula |
| **SC-5** | `packageComplete` remains STEP5-owned — not interchangeable |

#### 12.3.5 Required / Optional / Deferred Coverage 정책

| CoverageClass | In Official Run (lean) | completenessImpact | Notes |
|---------------|------------------------|--------------------|-------|
| **Required** | In-Run (must execute when Target selects Rule) | **Affects schemaComplete** | Package→Reference + core Cross-file lean (STEP6-4 §7.3) |
| **Optional** | In-Run allowed; soft | **Does not** (alone) | Soft domain-check / style lean |
| **Deferred** | Deferred Item; not forced In-Run | **Does not** force YES/NO by absence alone | Semantic L7 lean (U3) until promoted |

| Policy ID | Statement |
|-----------|-----------|
| **CP-R1** | Every Catalog Rule **SHALL** carry exactly one `coverageClass` |
| **CP-R2** | Required + Blocking BLOCKER cascade remains Framework cascade — Coverage does not redefine SKIPPED semantics |
| **CP-R3** | Promoting Deferred → Required/Optional is a Catalog Revision event (see §12.3.6) |
| **CP-R4** | `CoverageClass` ≠ Classification Domain/Family (CL-001); both required on RuleRecord |

#### 12.3.6 Coverage 변경 정책

| Event | Policy |
|-------|--------|
| Pre-Freeze Candidate | Adjust `coverageClass` / impact under Review; bump Catalog Revision |
| After Official Pin | Change to Required membership or completenessImpact → **new Catalog Version** + **new Pin** |
| Deferred promotion (e.g. L7) | Explicit Catalog Revision + Decision note; may need Re-validation |
| Framework `schemaComplete` wording change | **ADR / Framework Review only** — Catalog does not patch meanings |
| CL-001 structural change | Separate Classification track — does not silently alter CoverageClass |

#### 12.3.7 Binding for Catalog JSON (IU-2-06*)

| Rule | Statement |
|------|-----------|
| **CJ-1** | Each RuleRecord **SHALL** include `coverageClass` ∈ {Required, Optional, Deferred} |
| **CJ-2** | Each RuleRecord **SHALL** include `completenessImpact` ∈ {Affects schemaComplete, Does not} consistent with §12.3.5 |
| **CJ-3** | Optional: `inRunDefault` for Design vs Official mode lean |
| **CJ-4** | **SHALL NOT** embed alternate `schemaComplete` state enums or percentage gates that contradict Framework §10 |
| **CJ-5** | Rule IDs remain NS-U1-001; Classification fields remain CL-001 — Coverage fields are additive |
| **CJ-6** | This Decision does **not** author Catalog JSON |

#### 12.3.8 IU-2-04B PASS

- [x] Purpose · hierarchy · calculation principles stated  
- [x] schemaComplete relationship = Consume-only (no meaning change)  
- [x] Required / Optional / Deferred policy locked  
- [x] Change policy · IU-2-06* binding stated  
- [x] NS / CL-001 / Framework / JSON / Pin / Freeze / Register Link untouched  

---

## 13. Register Freeze Link

> **IU-2-05A:** Link structure only.  
> Does **not** author Register JSON · does **not** mint Pins · does **not** declare Freeze Candidate.

### 13.1 Purpose

Register Freeze Link는 **Catalog Freeze Design** (본 문서)과 **Register Freeze** (STEP6-5 Suite → IU-2-07* body) 사이의 **책임·참조·연결 지점**을 고정한다.

| SHALL | SHALL NOT |
|-------|-----------|
| Define Catalog ↔ Register ownership and cite edges | Redefine Register field shapes (STEP6-5 Consume) |
| Name connection points for IU-2-07 Register JSON | Author Catalog JSON (IU-2-06*) or Register JSON (IU-2-07*) now |
| Preserve NS-U1-001 · CL-001 · CV-001 · U12 Pin layout as cite inputs | Issue `catalogPinId` / declare Freeze Candidate |
| Keep Runtime Registry distinct from Validation Registers | Edit Framework / Pipeline / System JSON |

### 13.2 Consume

| Source | Role in Link |
|--------|--------------|
| `STEP6-5_Validation_Register_Suite.md` v0.2 | Register inventory · Pin-first · Header cite-only · State≠Execution |
| `STEP6_FINAL_FREEZE.md` v1.0 | Baseline · KI-02 Register/Catalog body gap cite |
| This Design §§8–12 | Pin/Provenance · Paths · U12 · NS/CL/CV Decisions |
| Framework / Pipeline | Locked RO — Register does not redefine semantics |

### 13.3 Responsibility split

| Concern | Catalog Freeze (this Design → IU-2-06*) | Register Freeze (IU-2-07*) |
|---------|------------------------------------------|----------------------------|
| Rule statements · Domain/Family/Type/Layer | **Owner** | Cite `ruleId` + Catalog Version/Revision |
| NS-U1-001 · CL-001 · CV-001 | **Owner** | Consume on RuleRecord cites |
| Catalog Header Metadata meanings | **Owner** (STEP6-4 cite) | **Cite-only** on Pin / RuleRecord (STEP6-5 RP2) |
| Catalog Pin Manifest fields (U12) | Layout owner (§11) | Persist Pin citations in Catalog Pin Register |
| Run / Execution / Result / Finding / Deferred / Summary | Out | **Owner** |
| `schemaComplete` **meaning** | Out (Framework) | Summary cites rollup — no meaning rewrite |
| Runtime `getSystemContract` Registry | Out | Out (different Registry) |

### 13.4 Reference graph (Link structure)

```text
Catalog Freeze Design (THIS)
  NS-U1-001 · CL-001 · CV-001 · §10 paths · §11 U12
        ↓ author (later)
Catalog Body JSON (IU-2-06*)
        ↓ Header + ruleId set
        ↓ pin cite (later packaging IU-2-08*)
Catalog Pin Register  ←── Register Freeze body (IU-2-07*)
        ↓
Rule Register · Dependency Index
        ↓
Validation Run Register
  ├── Rule Execution Register
  ├── Validation Result Register
  ├── Finding Register (VAL-*)
  ├── Deferred Item Register
  └── Summary Register (schemaComplete cite)
```

Direction: **Catalog norms → Pin cite → Register evidence**. Registers **SHALL NOT** invent alternate Catalog Version semantics (STEP6-5).

### 13.5 Connection points for IU-2-07 (Register JSON)

| Link ID | Catalog side | Register side | Contract |
|---------|--------------|---------------|----------|
| **RL-1** | `catalogVersion` · `catalogRevision` | Catalog Pin Register · RuleRecord catalog refs | Required cite on Official evidence |
| **RL-2** | U12 `catalogPinId` field (layout only until issued) | Catalog Pin Register primary key | Issued at packaging — **not this IU** |
| **RL-3** | Catalog `ruleId` (NS-U1-001 / `SV-R-*` lean) | Rule Register · Execution · Dependency | Rule ID equality |
| **RL-4** | Optional `schRTrace` → `SCH-R-*` | Trace fields only (RO) | No Audit ownership transfer |
| **RL-5** | §10 `catalogBodyPath` / `registerBodyPath` | PinManifest path fields | Repo-relative paths |
| **RL-6** | CV-001 CoverageClass / completenessImpact | Execution/Deferred/Summary consumption | Membership mapping; no schemaComplete redefine |
| **RL-7** | Finding namespace `VAL-*` (not Rule) | Finding Register | CP6 / NS separation |
| **RL-8** | Register State lifecycle (Draft…Archived) | Rule Register State | State ≠ Execution Status (STEP6-5) |

### 13.6 Dual Freeze sequence (policy)

```text
IU-2-06*  Catalog JSON body
    ↓
IU-2-07*  Register JSON body (consumes Catalog Version/Revision + ruleId set + U12 layout)
    ↓
IU-2-08*  Freeze Candidate + Pin packaging (issues catalogPinId; binds paths)
```

| Rule | Statement |
|------|-----------|
| **RF-1** | Register Freeze body **SHALL** cite an existing Catalog Version/Revision intent (even if Pin not yet issued) |
| **RF-2** | Register Freeze **SHALL NOT** proceed as Official Pin-active without Catalog body path policy (§10) |
| **RF-3** | This Link does **not** create either JSON artifact |

### 13.7 Explicit non-outputs (this IU)

| Forbidden | Status |
|-----------|--------|
| Register JSON / Catalog JSON | **None** |
| Pin ID issuance | **None** |
| Freeze Candidate declaration | **None** |
| NS / CL / CV edits | **None** |

### 13.8 IU-2-05A PASS

- [x] Catalog ↔ Register responsibility split defined  
- [x] Reference graph · RL-1…RL-8 connection points defined  
- [x] IU-2-07 link targets named · no JSON / Pin / Freeze  

---

## 14. Freeze Candidate Gate

**TBD — IU-2-08* · Not declared in IU-2-01A**

---

## 15. Catalog JSON Body Structure (IU-2-06A Skeleton → IU-2-06B Structure)

> **Documentation only.** Expands Catalog JSON **structure**.  
> Does **not** create an on-disk `.json` file · does **not** add Rule instances · does **not** issue Rule IDs or `catalogPinId` · does **not** declare Freeze Candidate.  
> §14 Freeze Candidate Gate — **unmodified**.

### 15.0 Session note

| IU | Contribution |
|----|----------------|
| **IU-2-06A** | Initial Skeleton hierarchy |
| **IU-2-06B** | Concrete field requiredness · RuleRecord / Header / Metadata / indexes structure |

### 15.1 Purpose (IU-2-06B)

| SHALL | SHALL NOT |
|-------|-----------|
| Lock RuleRecord **required vs optional** fields | Populate `rules[]` with real Rules |
| Concrete Header · Metadata · indexes shapes | Issue `SV-R-*` / any Rule ID values |
| Bind Rule ID **policy** to NS-U1-001 Option (C) | Create Catalog/Register JSON files |
| Keep Finding `VAL-*` off RuleRecord | Modify §14 or NS/CL/CV decision texts |

### 15.2 Top-level hierarchy (locked shape)

```text
CatalogDocument
├── header
├── decisions
├── coveragePolicy
├── indexes
├── rules[]
└── metadata
```

### 15.3 Header structure (concrete)

| Field | Req | Type | Notes |
|-------|-----|------|-------|
| `catalogVersion` | **Required** | string | TODO value at file authoring |
| `catalogRevision` | **Required** | string | TODO |
| `compatibleSpsVersion` | **Required** | string | Lean `"SPS v1.0"` |
| `compatibleFrameworkVersion` | **Required** | string | TODO Framework Consume identity |
| `compatiblePipelineVersion` | **Required** | string | TODO Pipeline Consume identity |
| `generatedFrom` | **Required** | string \| string[] | Seed + Design cites |
| `lastUpdated` | **Required** | date | ISO-8601 TODO |
| `status` | **Required** | enum | Shape: Draft \| FreezeCandidate \| Frozen — **intent remains Draft; FreezeCandidate not declared** |
| `catalogPinId` | Optional until packaging | string \| null | **null / not issued** (IU-2-08*) |
| `catalogBodyPath` | Required when file exists | string \| null | §10 · **null until file** |
| `registerBodyPath` | Optional | string \| null | §13 RL-5 |

```text
header: {
  catalogVersion: "<TODO>"
  catalogRevision: "<TODO>"
  compatibleSpsVersion: "SPS v1.0"
  compatibleFrameworkVersion: "<TODO>"
  compatiblePipelineVersion: "<TODO>"
  generatedFrom: [ "STEP6-4_Rule_Catalog_Design.md", "STEP7_Catalog_Freeze_Design.md", "Seed FULL_CATALOG cite" ]
  lastUpdated: "<TODO>"
  status: "Draft"
  catalogPinId: null
  catalogBodyPath: null
  registerBodyPath: null
}
```

### 15.4 RuleRecord structure (concrete — no instances)

#### 15.4.1 Rule ID policy (NS-U1-001 Option C)

| Rule | Statement |
|------|-----------|
| **RID-1** | Catalog execution Rules **SHALL** use STEP6 Catalog Rule Namespace lean **`SV-R-*`** |
| **RID-2** | Primary `ruleId` **SHALL NOT** be STEP5 `SCH-R-*` (optional Trace only) |
| **RID-3** | `ruleId` **SHALL NOT** use `VAL-*` / `VAL-R-*` |
| **RID-4** | **This Session issues zero Rule IDs** |

#### 15.4.2 Required fields (when a RuleRecord is later authored)

| Field | Type | Source |
|-------|------|--------|
| `ruleId` | string (`SV-R-*`) | NS-U1-001 |
| `domain` | string | CL-001 |
| `family` | string | CL-001 |
| `type` | string | CL-001 |
| `primaryLayer` | L1…L7 | CL-001 |
| `severityDefault` | BLOCKER \| ERROR \| WARNING \| INFO | CL-001 · Framework RO |
| `blockingDefault` | blocks-deeper \| does-not \| inherit | CL-001 |
| `coverageClass` | Required \| Optional \| Deferred | CV-001 |
| `completenessImpact` | Affects schemaComplete \| Does not | CV-001 |
| `statement` | string | Body text — empty until content Session |

#### 15.4.3 Optional fields

| Field | Type | Notes |
|-------|------|-------|
| `schRTrace` | string \| null | STEP5 `SCH-R-*` RO Trace |
| `deferredCandidate` | boolean \| tag | CL-001 |
| `warningHandlingLean` | string \| enum lean | CL-001 |
| `inRunDefault` | In-Run \| Deferred \| NOT_RUN | CV-001 |
| `fileAffinity` | string \| null | optional |
| `ruleVersion` / `ruleRevision` | string | optional |
| `notes` | string | non-normative |

#### 15.4.4 Forbidden on RuleRecord

| Forbidden | Reason |
|-----------|--------|
| Finding / `valId` fields | Finding Register only |
| Pipeline Stage as Layer | Layer ≠ Stage |
| `schemaComplete` override enums | Framework Owner |
| Live Rule instances in IU-2-06B | Later Sessions |

```text
rules: []
```

### 15.5 indexes structure (concrete)

| Index | Entry shape | Purpose |
|-------|-------------|---------|
| `domainIndex` | `{ domainId, ruleIds: [] }` | Domain → rules |
| `familyIndex` | `{ familyId, ruleIds: [] }` | Family → rules |
| `typeLayerIndex` | `{ type, primaryLayer, ruleIds: [] }` | Type×Layer → rules |
| `coverageIndex` | `{ coverageClass, ruleIds: [] }` | CoverageClass → rules |
| `deferredSet` | `ruleIds: []` | Deferred convenience |
| `layerIndex` | `{ primaryLayer, ruleIds: [] }` | L1–L7 → rules |

```text
indexes: {
  domainIndex: []
  familyIndex: []
  typeLayerIndex: []
  coverageIndex: []
  deferredSet: []
  layerIndex: []
}
```

### 15.6 decisions + coveragePolicy

```text
decisions: {
  namespace:       { id: "NS-U1-001", option: "C" }
  classification: { id: "CL-001" }
  coverage:       { id: "CV-001" }
}

coveragePolicy: {
  decisionId: "CV-001"
  classes: ["Required", "Optional", "Deferred"]
  completenessImpactValues: ["Affects schemaComplete", "Does not"]
  schemaCompleteOwner: "Framework §10 (RO)"
}
```

### 15.7 Metadata structure (concrete)

| Field | Req | Notes |
|-------|-----|-------|
| `documentKind` | Required | `"CatalogBody"` |
| `skeletonSession` | Required | `"S7-P2-IU-2-06A"` |
| `structureSession` | Required | `"S7-P2-IU-2-06B"` |
| `decisions` | Required | NS/CL/CV cite |
| `registerFreezeLink` | Required | §13 RL-1…RL-8 |
| `seedProvenance` | Required | KI-02 |
| `rulesPopulated` | Required | `false` |
| `catalogJsonFile` | Required | `"NOT_CREATED"` |
| `registerJson` | Required | `"NOT_IN_THIS_IU"` |
| `freezeCandidate` | Required | `"NOT_DECLARED"` |
| `todos` | Required | checklist |

```text
metadata: {
  documentKind: "CatalogBody"
  skeletonSession: "S7-P2-IU-2-06A"
  structureSession: "S7-P2-IU-2-06B"
  decisions: { namespace: "NS-U1-001 Option (C)", classification: "CL-001", coverage: "CV-001" }
  registerFreezeLink: "STEP7_Catalog_Freeze_Design.md §13 RL-1…RL-8"
  seedProvenance: "STEP6 Full Run Design Seed (KI-02)"
  rulesPopulated: false
  catalogJsonFile: "NOT_CREATED"
  registerJson: "NOT_IN_THIS_IU"
  freezeCandidate: "NOT_DECLARED"
  todos: [
    "Create on-disk Catalog JSON under §10 (later)",
    "Populate rules[] (later)",
    "Build indexes from rules[]",
    "Assign catalogVersion/Revision",
    "Issue catalogPinId only at IU-2-08*"
  ]
}
```

### 15.8 Explicit non-outputs (IU-2-06B)

| Forbidden | Status |
|-----------|--------|
| On-disk Catalog `.json` | **Not created** |
| Rule list / content / ID issuance | **None** |
| `catalogPinId` issuance | **None** |
| Register JSON | **None** |
| Freeze Candidate | **Not declared** |
| §14 modification | **None** |

### 15.9 IU-2-06B PASS

- [x] RuleRecord required/optional fields locked  
- [x] Header · Metadata · indexes concretized  
- [x] Rule ID policy = NS-U1-001 Option (C) cite only  
- [x] `rules: []` · no file · no Freeze · §14 untouched  

---

## 16. Document Control

| Item | Value |
|------|-------|
| Version | **v0.11** |
| Status | Design Draft · **Not Frozen** |
| Session | **S7-P2-IU-2-06B** |
| IU-2-06B | **PASS** (§15 Catalog JSON Body Structure) |
| Next Session | **S7-P2-IU-2-07A** |
| Location | `System Platform Standard (SPS) v1.0/STEP7_Catalog_Freeze_Design.md` |

### Revision History

| Version | Date | Change |
|---------|------|--------|
| v0.1 | 2026-07-19 | Skeleton created (S7-P2-IU-2-01A) |
| v0.2 | 2026-07-19 | S7-P2-IU-2-01B — §8 Pin & Provenance · §9 Seed → Freeze Path |
| v0.3 | 2026-07-19 | S7-P2-IU-2-02A — §10 Artifact Paths & Naming |
| v0.4 | 2026-07-19 | S7-P2-IU-2-02B — §11 Pin Field Table (U12) |
| v0.5 | 2026-07-19 | S7-P2-IU-2-03A — §12.1 Namespace Decision Framework |
| v0.6 | 2026-07-19 | S7-P2-IU-2-03B — §12.1.8 Namespace Decision Record · Option (C) |
| v0.7 | 2026-07-19 | S7-P2-IU-2-04A — §12.2 Classification Decision · CL-001 |
| v0.8 | 2026-07-19 | S7-P2-IU-2-04B — §12.3 Coverage Formulas · CV-001 |
| v0.9 | 2026-07-19 | S7-P2-IU-2-05A — §13 Register Freeze Link |
| v0.10 | 2026-07-19 | S7-P2-IU-2-06A — §15 Catalog JSON Body Skeleton |
| **v0.11** | 2026-07-19 | **S7-P2-IU-2-06B** — §15 Catalog JSON Body Structure |

---

*End of STEP7_Catalog_Freeze_Design.md v0.11*