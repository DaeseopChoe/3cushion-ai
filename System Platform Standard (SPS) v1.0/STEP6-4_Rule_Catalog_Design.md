# STEP6-4_Rule_Catalog_Design.md

```text
Document  : STEP6-4_Rule_Catalog_Design.md
Version   : v0.2
Status    : Design Draft (Catalog Structure Only · Not Frozen)
Date      : 2026-07-17
STEP      : STEP6-4
Owner     : Schema Validation
Type      : Schema Rule Catalog Design (Design Only)
Baseline  : Framework v1.0 Freeze Candidate (Locked · Consume)
            Pipeline v0.6 Freeze Candidate (Locked · Consume)
            STEP6-3_Schema_Rule_Analysis.md v1.1 (Completed · Consume)
Rule      : Design structure only · No Rule IDs · No Namespace lock · No Register/Engine/JSON/Runtime
Revision  : v0.2 — Catalog Header Metadata reinforcement (Register/Engine reference)
```

---

## 0. Design Status

| Item | Status |
|------|--------|
| **Mode** | **Design Only** |
| **Design doc version** | **v0.2** (Header Metadata reinforced) |
| **Framework / Pipeline** | Locked · **Consume Only** — unmodified |
| **STEP6-3 Analysis** | v1.1 Completed · **Consume** |
| **Catalog bodies / Rule statements** | **Not authored in this STEP** |
| **Rule ID / Namespace** | **Not finalized** (U1 Pending) |
| **Classification Axis** | **Candidates organized** · **Not locked** |
| **Catalog Header Metadata** | **Defined (§9.5)** · field layout for Registers TBD |
| **Register / Engine / Schema JSON / Runtime** | **Out of scope** |

---

## 1. Catalog Purpose

### 1.1 Why the Catalog exists

Schema Rule Catalog는 STEP6 Schema Validation의 **실행 가능한 Rule 규범 집합**의 Design/SSOT 자리이다.

| Catalog SHALL | Catalog SHALL NOT |
|---------------|-------------------|
| Bind Rules to Framework **Layers** (Pipeline I1) | Redefine Layer · Status · Severity · `schemaComplete` meanings |
| Carry Domain (WHAT) · Family (HOW) · Type · Coverage · Dependency metadata | Mutate STEP4 Facts · STEP5 Suite · System JSON · Runtime |
| Provide pin-able Rule set for Official / Design Runs | Be Finding namespace (`VAL-*` remains Finding-only) |
| Trace optionally to STEP5 `SCH-R-*` (RO) | Execute under STEP5 Audit ownership |

### 1.2 Position in STEP6 hierarchy

```text
Framework (Locked)          ← semantics
        ↓ consume
Pipeline (Locked)           ← flow · binding · orchestration
        ↓ consume
STEP6-3 Analysis v1.1       ← Domain≠Family · Dependency · candidates
        ↓ consume
STEP6-4 Catalog Design      ← THIS DOCUMENT (structure)
        ↓ later
Catalog bodies / Pins       ← statements · IDs (later Design revision)
        ↓
Registers · Report · Engine
```

### 1.3 Questions the Catalog answers

```text
Which Rules apply to a Target?
At which Layer / Domain / Family?
What is required vs optional vs deferred?
What must pass before a successor may run?
What may emit VAL / affect schemaComplete?
```

---

## 2. Catalog Composition Principles

| ID | Principle | Statement |
|----|-----------|-----------|
| **CP1** | **Consume higher SSOT** | Framework · Pipeline · Analysis v1.1 meanings are not redefined. |
| **CP2** | **Domain ≠ Family** | Domain = WHAT · Family = HOW · independent axes (Analysis C1). |
| **CP3** | **Layer binding** | Every executable Rule binds to exactly one primary Layer. **No Stage-name binding.** |
| **CP4** | **Type as Framework anchor** | Rule Type ∈ Framework Glossary 9 kinds; aligns primarily to Layer matrix. |
| **CP5** | **One Rule, one primary Layer** | Secondary Layer links require Catalog justification. |
| **CP6** | **Finding ≠ Rule namespace** | Findings = `VAL-*` only; Rule IDs Catalog-owned (U1 Pending). |
| **CP7** | **Non-mutation** | Rules JUDGE packages: READ → JUDGE → RECORD only. |
| **CP8** | **SCH-R Trace optional** | STEP5 SCH-R is RO intent pointer — not automatic execution ID. |
| **CP9** | **Candidates until Freeze** | Severity defaults · Blocking · Coverage banding · Namespace remain designable until Catalog Freeze. |
| **CP10** | **Dependency expressible** | Catalog records must be able to express prereq / skip / cascade / defer (shape TBD for Registers). |

---

## 3. Domain Design (WHAT)

### 3.1 Definition

**Domain** = Validation **대상 영역** — *무엇을* 검증하는가.

### 3.2 Domain set (from Analysis v1.1)

| Domain ID | Domain | Question | Primary Layer |
|-----------|--------|----------|---------------|
| **D-PACKAGE** | Package | 패키지·파일 세트 식별·구성? | L1 |
| **D-SYNTAX** | Syntax | 파일 구문 처리 가능? | L2 |
| **D-STRUCTURE** | Structure | 문서 구조 shape 적합? | L3 |
| **D-FIELD** | Field | 필드 존재·형·값공간? | L4 |
| **D-REFERENCE** | Reference | 참조 해석·해소? | L5 |
| **D-CROSSFILE** | Cross-file | 파일 간 모순 없음? | L6 |
| **D-SEMANTIC** | Semantic | 구조 너머 의미 일관? | L7 |

### 3.3 Domain design rules

| Rule | Statement |
|------|-----------|
| Exhaustive for Schema Validation | Package file Domains above cover Canonical Four carriers |
| Not a file name | `profile.json` is a **carrier**, not a Domain |
| Not a Family | Presence/Typing/… are HOW, not Domains |
| Stable IDs | Domain IDs above are **design labels** for Catalog indexing — not Rule Namespace |

### 3.4 Carriers (not Domains)

| Carrier | Typical Domains applied |
|---------|-------------------------|
| `profile.json` | Structure · Field · Reference · Semantic |
| `logic.json` | Structure · Field · Reference · Cross-file |
| `anchors.json` | Structure · Field · Reference · Semantic |
| `system_meta.json` | Structure · Field · Package identity surfaces |

---

## 4. Family Design (HOW)

### 4.1 Definition

**Family** = Validation Rule의 **검증 방식·성격** — *어떻게* 검증하는가.

### 4.2 Family set (from Analysis v1.1)

| Family ID | Family | Meaning |
|-----------|--------|---------|
| **F-PRESENCE** | Presence | 존재·구성·필수 유무 |
| **F-PARSE** | Parseability | 구문 처리 가능 |
| **F-SHAPE** | Shape | 구조 shape / schema-shape |
| **F-TYPING** | Typing | 자료형 적합 |
| **F-DOMAINCHK** | Domain-check | 값 공간·범위·열거 (**≠** Domain axis name) |
| **F-RESOLUTION** | Resolution | 참조 해소 |
| **F-CONSISTENCY** | Consistency | 일관성 (intra / meaning) |
| **F-CROSSFILE** | Cross-file | 파일 간 합의·불일치 검출 |

### 4.3 Family design rules

| Rule | Statement |
|------|-----------|
| Independent of Domain | Same Family may apply to multiple Domains |
| Not Layer | Family does not replace L1–L7 |
| Not Severity | Blocking/WARNING are Classification candidates (§9) |
| Naming caution | **Domain-check** Family must not be confused with **Field Domain** |

### 4.4 Optional file affinity tags (not Family)

| Tag | Files |
|-----|-------|
| `T-PROFILE` | profile.json |
| `T-LOGIC` | logic.json |
| `T-ANCHORS` | anchors.json |
| `T-META` | system_meta.json |
| `T-PACKAGE` | multi-file |

> Tag prefix `T-` used in Design to avoid collision with Family `F-*` / Domain `D-*`.

---

## 5. Domain × Family Matrix

### 5.1 Independence matrix (Catalog index)

| Family \ Domain | Package | Syntax | Structure | Field | Reference | Cross-file | Semantic |
|-----------------|---------|--------|-----------|-------|-----------|------------|----------|
| Presence | ● | | ○ | ● | | ○ | |
| Parseability | | ● | | | | | |
| Shape | | | ● | | | | |
| Typing | | | | ● | | | |
| Domain-check | | | | ● | | | |
| Resolution | | | | | ● | | |
| Consistency | ○ | | ○ | ○ | ○ | ○ | ● |
| Cross-file | ○ | | | | ○ | ● | ○ |

● = common Catalog cell · ○ = allowed with justification · blank = atypical

### 5.2 Catalog organization implication

Catalog **SHALL** be indexable by:

1. Domain  
2. Family  
3. Layer (via Type binding)  
4. (optional) File affinity tag  

Catalog **SHALL NOT** force one Family per Domain.

### 5.3 Seed cell priorities (Design guidance — not Rule bodies)

| Priority | Domain × Family | Rationale |
|----------|-----------------|-----------|
| P0 | Package × Presence | L1 package integrity |
| P0 | Syntax × Parseability | L2 cascade substrate |
| P0 | Structure × Shape | L3 |
| P0 | Field × Presence → Typing → Domain-check | L4 chain |
| P0 | Reference × Resolution | L5 |
| P0 | Cross-file × Cross-file / Consistency | L6 |
| P1 | Semantic × Consistency | L7 often Deferred (U3) |

---

## 6. Layer × Rule Type Relationship

### 6.1 Framework Rule Types (Consume)

Package · Syntax · Structure · Required · Type · Domain · Reference · Cross-file · Semantic

### 6.2 Primary binding matrix (Analysis §5.2 Consume)

| Type \ Layer | L1 | L2 | L3 | L4 | L5 | L6 | L7 |
|--------------|----|----|----|----|----|----|-----|
| Package | ● | | | | | ○ | |
| Syntax | | ● | | | | | |
| Structure | | | ● | | | | |
| Required | | | ○ | ● | | | |
| Type | | | | ● | | | |
| Domain | | | | ● | | | |
| Reference | | | | ○ | ● | ○ | |
| Cross-file | | | | | ○ | ● | |
| Semantic | | | | | | ○ | ● |

### 6.3 Type ↔ Domain ↔ Family alignment (Design map)

| Rule Type | Primary Domain | Typical Family |
|-----------|----------------|----------------|
| Package | Package | Presence |
| Syntax | Syntax | Parseability |
| Structure | Structure | Shape |
| Required | Field | Presence |
| Type | Field | Typing |
| Domain | Field | Domain-check |
| Reference | Reference | Resolution |
| Cross-file | Cross-file | Cross-file / Consistency |
| Semantic | Semantic | Consistency |

> Alignment is **default Design guidance**, not a hard 1:1 lock. Catalog may justify exceptions.

### 6.4 Layer design rules

| Rule | Statement |
|------|-----------|
| Primary Layer mandatory | Every Rule record includes `primaryLayer ∈ {L1…L7}` |
| Stage forbidden | Do not store Pipeline Stage names as binding keys |
| Cascade owned by Framework | Catalog designates Blocking candidates; cascade semantics remain Framework §8/§9 |

---

## 7. Coverage Expression Design

### 7.1 Purpose

Coverage states whether a Rule participates in Official completeness (`schemaComplete`) and Run scope.

### 7.2 Expression axes (Design — not numeric formulas)

| Axis | Candidate values | Notes |
|------|------------------|-------|
| **CoverageClass** | `Required` · `Optional` · `Deferred` | Catalog field candidate |
| **InRunDefault** | `In-Run` · `Deferred` · `NOT_RUN` | May vary by Official vs Design mode |
| **CompletenessImpact** | `Affects schemaComplete` · `Does not` | Align Framework §10 lean defaults |
| **Selectivity** | `ALL_SYS` · subset · single | Target Set / U2 |

### 7.3 Lean banding proposal (input — not Freeze)

| CoverageClass | Typical Domains | First Official Run lean |
|---------------|-----------------|-------------------------|
| Required | Package → Reference + core Cross-file | In Scope |
| Optional | Soft Field Domain-check / style | In Scope; non-forcing |
| Deferred | Semantic | Deferred Item (U3 lean) |

### 7.4 Explicit non-decisions

| Not decided here |
|------------------|
| Coverage percentages / thresholds |
| Exact Exit Gate numeric lists |
| WARNING-only → YES/NO Strict policy (U5) |
| SKIPPED-required-layer → NO vs UNDECIDED (U7) |

### 7.5 Expression sketch (shape-free)

```text
RuleCoverage {
  coverageClass: Required | Optional | Deferred
  completenessImpact: boolean | enum   // design later
  deferralPolicy: ref?                 // L7 / options
}
```

Field layout (U12) = Registers / Catalog Freeze later — **not fixed here**.

---

## 8. Dependency (Cascade) Expression Design

### 8.1 Vocabulary (Analysis §9 Consume)

| Term | Catalog use |
|------|-------------|
| Prerequisite | Prior Layer / Family / Domain outcome required |
| Successor | Rules eligible after prerequisite |
| Skip condition | When Execution Status = SKIPPED |
| Cascade | BLOCKER propagation to deeper Layers |
| Blocking | Rule designated to trigger cascade (candidate) |
| Deferred | Not executed; Deferred Validation Item |

### 8.2 Layer cascade (Framework — Catalog must respect)

```text
L1 BLOCKER → L2..L7 SKIPPED (Target)
L2 BLOCKER → L3..L7 SKIPPED (file)
L3 → L4 prerequisite (structure sufficient)
L4 → L5 soft prerequisite (typing for refs)
L1 (+ L2 SHOULD) → L6 (U11 partial Pending)
L1..L6 → L7 In Scope OR Deferred
```

### 8.3 Intra-L4 Family chain (Catalog ordering guidance)

```text
Field×Presence FAIL
  → Field×Typing SKIPPED
  → Field×Domain-check SKIPPED
  → Reference×Resolution SKIPPED (path-local)
  → Semantic DEFERRED or SKIPPED
```

### 8.4 Expression options (Design candidates — pick in Catalog Freeze)

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. Implicit by Layer+Family** | Engine infers from Layer order + L4 Family order | Simple | Less explicit per Rule |
| **B. Explicit prereq list** | Each Rule lists prerequisite Rule groups / Layers | Precise | Heavier authoring |
| **C. Hybrid (recommended lean)** | Default = Layer cascade + L4 Family chain; overrides only when needed | Balanced | Needs clear defaults doc |

**Design lean recommendation:** **Option C** — not locked.

### 8.5 Expression sketch (shape-free)

```text
RuleDependency {
  primaryLayer: L1..L7
  inheritsLayerCascade: true | false
  prerequisites: [ Layer | Domain×Family | RuleGroupRef ]  // optional overrides
  skipWhen: [ AbsenceOfPath | PriorBlocker | PolicyDefer | ... ]
  blockingCandidate: yes | no | inherit   // Classification candidate
  deferredCandidate: yes | no | policy    // Classification candidate
}
```

Engine scheduling algorithms are **out of scope** (STEP6-6+).

---

## 9. Rule Metadata Design

### 9.1 Metadata groups

| Group | Purpose | Finalized? |
|-------|---------|------------|
| **Identity** | Rule ID · Namespace · Catalog Version | **No** (U1) |
| **Statement** | Normative Rule text | Later Catalog body STEP |
| **Classification** | Domain · Family · Type · Layer | Structure **yes** · values per Rule later |
| **Coverage** | CoverageClass · CompletenessImpact | Structure **yes** · policy Pending |
| **Dependency** | Prereq · Skip · Blocking/Deferred candidates | Structure **yes** |
| **Trace** | SCH-R pointer · SYS scope · path hints | Optional |
| **Pin** | Membership in Catalog Pin set | U12 Pending layout |

### 9.2 Classification Axis candidates (from STEP6-3 Pending)

Catalog 관점 정리. **최종 확정 금지.**

| Candidate Axis | Candidate values | Catalog role (draft) | Lock? |
|----------------|------------------|----------------------|-------|
| **Severity** | BLOCKER · ERROR · WARNING · INFO | Default outcome gravity (Framework meanings RO) | **No** |
| **Blocking** | Blocks deeper eval · Does not · Inherit | Cascade trigger designation | **No** |
| **Warning** | WARNING-class handling / VAL emission lean | Links U5 · U9 | **No** |
| **Optional** | Coverage Optional band | Non-required In-Run | **No** |
| **Deferred** | Deferred this Run | L7 / policy deferral | **No** |
| **ExecutionAxis** | (unnamed eligibility / order metadata) | Reserved for Catalog Freeze | **No** |

### 9.3 Relationship among candidates (conceptual)

```text
CoverageClass(Required|Optional|Deferred)
        ×
Severity default (BLOCKER|ERROR|WARNING|INFO)
        ×
Blocking candidate (cascade?)
        →
schemaComplete impact (Framework §10 + Pending U5/U7)
```

Catalog Design records these as **fields that will exist**; default tables are **not frozen** in v0.1 of this Design.

### 9.4 Recommended Rule record skeleton (shape-free)

```text
RuleRecord {
  // Identity — Pending U1
  ruleId?: string
  namespace?: pending

  // Normative — later body authoring
  statement?: string

  // Structural axes — required in Catalog
  domain: D-*
  family: F-*
  type: Framework Rule Type
  primaryLayer: L1..L7

  // Optional tags
  fileAffinity?: T-*

  // Coverage — structure now; policy later
  coverageClass?: Required | Optional | Deferred
  completenessImpact?: candidate

  // Classification candidates — not locked
  severityDefault?: BLOCKER | ERROR | WARNING | INFO
  blockingCandidate?: yes | no | inherit
  deferredCandidate?: yes | no | policy

  // Dependency — structure now
  dependency?: RuleDependency

  // Trace
  schRTrace?: SCH-R-* (RO)
  notes?: string
}
```

### 9.5 Catalog Header Metadata (Design)

Catalog Header는 **Rule 설계와 독립**으로 관리되는 **Catalog Metadata** 영역이다.

목적:

| Purpose | Statement |
|---------|-----------|
| **Catalog versioning** | Catalog 자체의 Version / Revision 추적 |
| **Compatibility** | Framework · Pipeline · SPS와의 호환 범위 명시 |
| **Reference baseline** | Register · Engine이 어떤 Catalog 스냅샷을 인용했는지 고정 |

#### 9.5.1 Required Header fields

| Field | Meaning | Notes |
|-------|---------|-------|
| **Catalog Version** | Catalog SSOT 논리 버전 (예: `1.0`) | Pin / Official Run 인용 단위의 주 키 후보 |
| **Catalog Revision** | 동일 Version 내 개정 식별 (예: `r3` · date · hash) | 본문·메타만 바뀐 경우 Version과 분리 가능 |
| **Compatible SPS Version** | 호환 SPS 판 (예: `SPS v1.0`) | Inventory / Schema norms 계열 |
| **Compatible Framework Version** | 호환 Schema Validation Framework 판 | Locked Framework Consume identity |
| **Compatible Validation Pipeline Version** | 호환 Pipeline 판 | Locked Pipeline Consume identity |
| **Generated From** | 본 Catalog가 파생·설계된 입력 근거 | 예: STEP6-3 Analysis v1.1 · Design doc id |
| **Last Updated** | Header 또는 Catalog 스냅샷 최종 갱신 시각/일자 | ISO date 권장 |

#### 9.5.2 Independence rule

| Catalog Header Metadata | Rule Records / Domain / Family / … |
|-------------------------|-------------------------------------|
| Version · compatibility · provenance | Domain · Family · Matrix · Coverage · Dependency · Classification · Statements |
| 독립 갱신 가능 (메타만 수정) | Rule 의미 변경 시 Catalog Version/Revision 정책에 따름 |
| Register / Engine **참조 기준** | Register / Engine **평가 내용** |

Header Metadata **SHALL NOT** redefine Framework Layers, Pipeline Stages, or Rule Domain/Family axes.

#### 9.5.3 Header sketch (shape-free)

```text
CatalogHeader {
  catalogVersion: string              // Catalog Version
  catalogRevision: string             // Catalog Revision
  compatibleSpsVersion: string        // Compatible SPS Version
  compatibleFrameworkVersion: string  // Compatible Framework Version
  compatiblePipelineVersion: string   // Compatible Validation Pipeline Version
  generatedFrom: string | string[]    // Generated From
  lastUpdated: date                   // Last Updated

  // existing Design placeholders (unchanged roles)
  status?: Draft | FreezeCandidate | Frozen
  catalogPinId?: pending              // U12 / Run Pin — not finalized here
}
```

Exact field layout for Registers remains **STEP6-5** (U12). This Design only mandates the **metadata set**.

### 9.6 Catalog document skeleton (Design)

```text
STEP6 Schema Rule Catalog (future SSOT)
├── Header                          ← §9.5 Catalog Header Metadata
│     Catalog Version
│     Catalog Revision
│     Compatible SPS Version
│     Compatible Framework Version
│     Compatible Validation Pipeline Version
│     Generated From
│     Last Updated
│     (+ Status / Pin placeholders)
├── Domain Index
├── Family Index
├── Type × Layer Binding Index
├── Domain × Family Matrix
├── Coverage Policy (draft → Freeze later)
├── Dependency Defaults (Layer cascade · L4 chain · Option C)
├── Classification Candidates Appendix (Severity/Blocking/…)
├── Rule Records[]          ← bodies in later revision
└── Appendix: U1–U12 citations · Deferred Semantic set · SCH-R Trace policy
```

---

## 10. Catalog Extension Strategy

### 10.1 Versioning lean

| Change class | Handling |
|--------------|----------|
| Add Rule body under existing Domain×Family×Layer | Catalog minor / patch (policy TBD at Freeze) |
| New Domain or Family | Major Design Review — avoid casually |
| Change Layer cascade semantics | **Forbidden here** — Framework ADR |
| Namespace decision (U1) | Catalog Freeze gate item |
| Pin layout (U12) | Align Registers |

### 10.2 Extension order (recommended)

```text
1. Freeze Catalog structure (this Design → Review)
2. Decide Namespace path (U1) or explicit deferral schedule
3. Author P0 Rule statements (Package→Cross-file Required cells)
4. Author Deferred Semantic set (explicit list)
5. Pin Official Catalog Version
6. Registers persist evidence under Pipeline
7. Engine consumes Catalog Pin + Pipeline
```

### 10.3 What must not extend into Catalog

| Forbidden merge | Owner |
|-----------------|-------|
| STEP5 Audit Rule Catalog rewrite | STEP5 Frozen |
| Runtime Contract tests as Schema Rules | Runtime / AAS |
| UI / Orchestrator checks | Application |
| Auto-fix / migration actions | STEP7 |

### 10.4 Gap absorption (from Analysis)

Catalog Design absorbs Analysis gaps as **future Rule cells**, not as Framework edits:

- valueSpace Fg/Rg → Field Domain-check and/or Semantic Consistency  
- formula.expr vs inputs → Field Presence/Typing + Semantic  
- anchors ↔ profile identity → Cross-file Consistency  
- L6 partial eligibility → Dependency + U11 policy note  

---

## 11. Pending & Explicit Non-Decisions

| Item | Status |
|------|--------|
| Rule ID format | **Not decided** |
| Rule Namespace (U1) | **Pending** |
| Classification Axis lock | **Candidates only** |
| Coverage numeric formulas | **Pending** |
| Dependency Option A/B/C final | **Lean C recommended · not locked** |
| Register field shapes | STEP6-5 |
| Engine algorithms | STEP6-6+ |
| Schema JSON artifacts | Later |
| Runtime implementation | Out of STEP6 Catalog Design |
| Stage names | Pipeline Pending |

U2–U12 remain Framework Appendix Pending citations.

---

## 12. Downstream Inputs

### 12.1 STEP6-5 (Validation Registers) — inputs from this Design

| Input | Use |
|-------|-----|
| RuleRecord structural fields | Evidence must cite Domain · Family · Type · Layer |
| CoverageClass / Deferred | Deferred Validation Item linkage |
| Dependency skip/cascade vocabulary | Result / Stage meta correlation (not Engine) |
| Classification candidates | Optional Result annotations — **not locked enums** |
| **Catalog Header Metadata (§9.5)** | Run / evidence **SHALL** be able to cite Catalog Version · Revision · Compatible Framework/Pipeline/SPS |
| Catalog Pin concept | Run Register must record Catalog Version Pin (aligned with Header Version/Revision) |
| VAL-* separation | Findings remain VAL; Rules remain Catalog IDs |

Registers **SHALL NOT** invent parallel Rule namespaces or redefine Layers.  
Registers **SHALL NOT** redefine Header field meanings; they **persist/cite** Header Metadata.

### 12.2 STEP6-6 (Validation Engine) — inputs from this Design

| Input | Use |
|-------|-----|
| Layer order L1→L7 + Framework cascade | Evaluation loop |
| Domain×Family matrix | Rule selection / indexing |
| Type×Layer matrix | Binding validation |
| L4 Presence→Typing→Domain-check chain | Intra-layer skip |
| Dependency Option C defaults | Scheduler defaults until overrides exist |
| CoverageClass + Deferred | What to run vs Deferred Item |
| Blocking/Deferred candidates | When finalized at Catalog Freeze |
| **Catalog Header Metadata (§9.5)** | Load/verify **compatible** Framework · Pipeline · SPS before Rule execution; reject mismatched pins |

Engine **SHALL NOT** be designed in this STEP.  
Engine **SHALL** later Consume Catalog Pin + Header compatibility fields + Pipeline + Framework semantics.

### 12.3 Next Catalog body authoring (still STEP6-4 track or follow-on)

| Next Design work | Constraint |
|------------------|------------|
| Catalog SSOT with Rule statements | After structure Review |
| Namespace decision path | U1 |
| Default Severity/Blocking tables | Still candidates until Freeze |

---

## 13. Design Conclusions

| ID | Statement |
|----|-----------|
| **D1** | Catalog purpose = pin-able executable Schema Rules bound to Layers. |
| **D2** | Domain (7) and Family (8) are independent Catalog indices. |
| **D3** | Type×Layer matrix from Framework/Analysis is the binding spine. |
| **D4** | Coverage expressed as CoverageClass + CompletenessImpact — no formulas yet. |
| **D5** | Dependency expressed via Layer cascade + L4 Family chain + optional overrides (lean Option C). |
| **D6** | Severity / Blocking / Warning / Optional / Deferred remain **Classification candidates**. |
| **D7** | Identity/Namespace/Register/Engine/JSON/Runtime intentionally undecided. |
| **D8** | Catalog Header Metadata (Version · Revision · Compatible SPS/Framework/Pipeline · Generated From · Last Updated) is independent of Rule Domain/Family design and is the Register/Engine citation baseline. |

---

## 14. Document Control

| Item | Value |
|------|-------|
| Status | **Design Draft v0.2** |
| Next | Catalog Design Review → Catalog body authoring / Freeze path |
| Forbidden in this file | Rule IDs · Namespace lock · Register shapes · Engine · Schema JSON · Runtime edits |
| Unmodified | Framework · Pipeline · Architecture · Runtime · System JSON |
| v0.2 scope | **Catalog Header Metadata only** — Domain/Family/Matrix/Coverage/Dependency/Classification unchanged |

### Consume baselines

- `STEP6_Schema_Validation_Framework.md` (Locked)  
- `STEP6_Validation_Pipeline.md` v0.6 (Locked)  
- `STEP6-3_Schema_Rule_Analysis.md` v1.1 (Completed)  

### Revision History

| Version | Date | Change |
|---------|------|--------|
| **v0.1** | 2026-07-17 | Initial Catalog Design (structure · Domain×Family · Dependency · Classification candidates) |
| **v0.2** | 2026-07-17 | Add **§9.5 Catalog Header Metadata** · Register/Engine citation baseline |

---

*End of STEP6-4_Rule_Catalog_Design.md v0.2*
