# STEP5_Audit_Plan.md

```
Document  : STEP5_Audit_Plan.md
Version   : v1.0
Status    : Active · Architecture Audit Plan (Execution Plan)
Date      : 2026-07-15
STEP      : STEP5-2
Basis     : STEP5_Architecture_Audit_Framework.md v1.0 Frozen
SPS       : System Platform Standard (SPS) v1.0
Input     : System_Inventory.md v1.0 Final (Read-only) · Framework v1.0 Frozen
Rule      : Execution Plan only · No Finding / Violation / Recommendation / Decision / packageComplete
Baseline  : Batch6 Final Freeze (ec71ef9) maintained · STEP4 Assets Read-only
```

---

## 1. Overview

본 문서는 SPS STEP5 Architecture Audit의 **공식 실행 계획(Execution Plan)** 이다.

Framework(`STEP5_Architecture_Audit_Framework.md` v1.0 Frozen)를 **적용**하기 위한
Scope · Target · Category · Sequence · Coverage · Gate · Evidence Strategy · Rule Category 범위를 정의한다.

### 1.1 Document Role

| 본 문서가 하는 일 | 본 문서가 하지 않는 일 |
|-------------------|------------------------|
| Audit 범위·순서·Coverage·Gate·Strategy 정의 | Finding / Violation / Recommendation / Decision 생성 |
| STEP5-3~5 Register의 **상위 계획** 제공 | packageComplete 계산 |
| Rule **Category** 적용 범위 정의 | Rule ID / Rule Catalog 본문 작성 |
| Evidence **전략** 정의 | Evidence / Mapping Register 레코드 작성 |

### 1.2 Position in Workflow

```text
STEP5-1  Architecture Audit Framework (Frozen)
        ↓
STEP5-2  Architecture Audit Plan          ← 본 문서
        ↓
STEP5-3  Audit Rule Catalog
        ↓
STEP5-4  Observation Mapping + Evidence Registers
        ↓
STEP5-5  Finding · Violation · Recommendation · Decision Registers
        ↓
STEP5-6  Architecture Audit Report + STEP6 Handoff
```

### 1.3 Non-Contents (Explicit)

본 문서에는 다음을 **포함하지 않는다.**

- Finding · Violation · Recommendation · Decision
- packageComplete 값
- Rule Catalog 본문 · Rule ID
- Register 레코드
- 신규 Observation · 신규 Inventory
- Schema Validation 실행 · Runtime / JSON / 코드 변경

---

## 2. Audit Scope

### 2.1 Purpose

STEP4 Frozen Assets를 입력으로, 각 System Package가 SPS Architecture /
Canonical Template / Runtime Contract / Package Completeness 규범에
얼마나 부합하는지 **Architecture Audit**를 수행할 계획을 고정한다.

Audit는 아키텍처를 평가한다. Audit는 System을 수정하지 않는다.

### 2.2 In Scope

| Item | Scope |
|------|-------|
| **Packages** | `frontend/src/data/systems/<directory>/` 하위 inventoried packages |
| **Systems** | Inventory ID `SYS-001` … `SYS-038` (전수) |
| **Fact Input** | System_Inventory.md Frozen Assets (§19 / §20) — Read-only |
| **Categories** | Package · Identity · Metadata · Registration · Runtime · Canonical · Contract · Public API |
| **Rule Categories (for STEP5-3)** | PKG-R · META-R · REG-R · RT-R · CAN-R · CON-R · SCH-R (reference) · API-R |
| **Artifacts (later STEPs)** | Mapping · Evidence · Finding · Violation · Recommendation · Decision · Report |

### 2.3 Out of Scope (This Plan / STEP5 Audit Layer)

| Excluded | Reason |
|----------|--------|
| STEP4 Inventory / Observation 수정 | Fact SSOT Frozen |
| 신규 OBS / SYS ID | Freeze Constraints |
| Schema Validation **실행** | STEP6 Owner |
| Standardization / Migration **구현** | STEP7 Owner |
| Runtime / Registry / Loader / Contract **코드 변경** | Audit ≠ Implementation |
| System JSON 변경 | Audit ≠ Implementation |
| Application feature bugs (OPEN-01 등) | Separate P0 track · not STEP5 Plan |
| Non-inventoried paths | `schema/` · `index.ts` · `anchorsRegistry.ts` (STEP4 Discovery Summary) |

### 2.4 Canonical Reference

| Item | Value |
|------|-------|
| Canonical System | `SYS-008` / `5_half_system` |
| Role | Architectural reference only · No special Runtime privilege |
| Template | `Canonical_System_Template.md` |

---

## 3. Audit Target

### 3.1 System Targets

| Target | Value |
|--------|-------|
| Inventory IDs | **SYS-001 … SYS-038** |
| Count | **38** |
| Exceptions | **None** — all inventoried systems are in scope |

### 3.2 Package Targets

각 Target은 Inventory Table의 `directory`에 대응하는 package이다.

| Field (Inventory) | Audit use |
|-------------------|-----------|
| Inventory ID | Primary audit key |
| directory | Package path under `data/systems/` |
| systemId | Identity / Registration comparison (Fact) |
| profile / anchors / logic / system_meta | Package presence Facts |
| observations | OBS linkage for Mapping / Evidence |

### 3.3 Canonical Target

| Inventory ID | directory | Note |
|--------------|-----------|------|
| SYS-008 | `5_half_system` | Canonical = YES · comparison baseline for Canonical Category |

### 3.4 Independent Audit Rule

Every System shall be audited **independently** (`System_Audit_Guide` Principle 3).  
Coverage is complete only when all 38 SYS have closed their Plan-scoped categories.

---

## 4. Audit Categories

공식 Audit Category (본 Plan):

| # | Category | Purpose (Plan level) | Primary Frozen Inputs | Primary Rule Category (STEP5-3) |
|---|----------|----------------------|----------------------|--------------------------------|
| 1 | **Package** | Package file composition · presence Facts | Inventory Table · OBS-PKG-* | PKG-R |
| 2 | **Identity** | directory ↔ systemId · naming identity Facts | Inventory Table · OBS-ID-* · OBS-NAME-* | PKG-R / META-R (as applicable) · ID-related rules under META/CAN as authored |
| 3 | **Metadata** | Metadata shape · semantic key Facts | Metadata Shape Matrix · OBS-META-* | META-R |
| 4 | **Registration** | Registration path · key · chain Facts | Registration Matrix · Fact Matrix · OBS-RT-* (registration-related) | REG-R |
| 5 | **Runtime** | Runtime observation · loader/registry facts vs norms | OBS-RT-* · Registration Inventory | RT-R |
| 6 | **Canonical** | Alignment to Canonical Template | OBS-CAN-* · Canonical Template · SYS-008 baseline | CAN-R |
| 7 | **Contract** | Runtime Contract exposure norms | System_Runtime_Contract · Batch6 Public API boundary (reference) | CON-R |
| 8 | **Public API** | Public API surface norms | Runtime Public API closure Facts (reference) | API-R |

### 4.1 Category Notes

- **Schema**는 독립 Audit Category로 본 Plan Sequence에 **실행 단계로 넣지 않는다.**  
  Schema Rule(`SCH-R`)은 Rule Catalog에 둘 수 있으나, Validation 실행은 STEP6이다.
- Identity와 Naming Observation은 Identity Category 계획 하에 Mapping한다.
- Category는 Finding을 미리 만들지 않는다. Category는 **감사 축**이다.

---

## 5. Audit Sequence

공식 수행 순서 (Category order):

```text
1. Package
        ↓
2. Identity
        ↓
3. Metadata
        ↓
4. Registration
        ↓
5. Runtime
        ↓
6. Canonical
        ↓
7. Contract
        ↓
8. Public API
```

### 5.1 Sequence Rationale

| Order | Why |
|-------|-----|
| Package first | Presence / composition Facts는 이후 Category의 Fact Anchor 기반 |
| Identity next | Package 존재 확인 후 identity / naming 정합 계획 |
| Metadata | Shape Matrix 기반 · Identity 이후 |
| Registration | Package identity 이후 registration key / chain |
| Runtime | Registration · Package 관찰과 Runtime 규범 연결 |
| Canonical | Structure Facts 이후 Template 정렬 비교 |
| Contract | Runtime/Package 맥락 위 Contract 규범 |
| Public API last | Contract · Runtime 경계 확정 후 API surface |

### 5.2 Per-System Sequence

각 `SYS-NNN`에 대해 위 Category 순서를 적용한다.  
Cross-system 작업(예: Matrix 전수 Mapping)은 Category 단위로 묶을 수 있으나,  
최종 Coverage는 SYS × Category 기준으로 닫는다.

### 5.3 Pipeline Order (per Finding path — Framework)

Category 작업 내부에서도 Framework Pipeline 순서를 위반하지 않는다:

```text
Mapping → Evidence → Finding → (REC-F | Violation → REC-V) → Decision
```

본 Plan은 Mapping/Evidence **전략과 순서**만 정의한다. Register 작성은 STEP5-4/5.

---

## 6. Audit Coverage

Coverage는 Exit Gate와 Deterministic Audit의 입력이다.  
아래 기준을 **모두** 만족해야 Plan-scoped Coverage가 닫힌 것으로 본다.

### 6.1 SYS Coverage

| Criterion | Target |
|-----------|--------|
| Systems planned | SYS-001 … SYS-038 |
| Completion | 38 / 38 SYS have Plan-scoped Category work closed (via later Registers) |
| Exceptions | None |

### 6.2 OBS Coverage

| Criterion | Target |
|-----------|--------|
| Base Observation Catalog | All OBS codes listed in Inventory Observation Catalogs that attach to in-scope SYS |
| Metadata Observation Catalog | All OBS-META-* linked to in-scope SYS |
| Registration / Runtime Catalog | All OBS-RT-* (and related) linked to in-scope SYS |
| Completion | Every in-scope OBS attachment appears in Observation Mapping (STEP5-4) |
| No orphan requirement | Inventory may have SYS with zero OBS — Mapping records “no OBS” explicitly; do not invent OBS |

### 6.3 Category Coverage

| Criterion | Target |
|-----------|--------|
| Categories | Package · Identity · Metadata · Registration · Runtime · Canonical · Contract · Public API |
| Completion | Each Category applied to each in-scope SYS per Sequence |
| Schema execution | Not required for STEP5 Category Coverage (STEP6) |

### 6.4 Rule Coverage

| Criterion | Target |
|-----------|--------|
| Rule Categories in Plan | §8 Rule 적용 범위 전 Category |
| Completion (later) | Every Evidence Rule Anchor resolves to STEP5-3 Catalog ID |
| This Plan | Defines **categories only** — not individual Rule IDs |

### 6.5 Evidence Coverage

| Criterion | Target |
|-----------|--------|
| Minimum | Every Finding (STEP5-5) shall reference Evidence ≥ 1 |
| Plan strategy | Every planned Mapping item that will feed Finding work shall have Evidence generation strategy (§7) |
| Gate link | Exit Gate **G2.5** |

### 6.6 Coverage Tracking (later STEPs)

Coverage tracking artifacts belong to Mapping / Evidence / Report — **not** this Plan document body as filled matrices.

---

## 7. Audit Gate (Plan View)

Framework Exit Gate를 Plan 관점에서 연결한다.  
Gate **판정·Register 채움**은 후속 STEP. Plan은 **무엇을 닫아야 하는지**만 고정한다.

| Gate | Plan meaning | Closed when (later) |
|------|--------------|---------------------|
| **G1** | Plan scope closed | This Plan approved · applied as scope SSOT for STEP5-3+ |
| **G2** | Mapping planned for all OBS/SYS attachments | Observation Mapping Register complete |
| **G2.5** | Evidence Strategy applied | Evidence Register complete for planned Finding candidates |
| **G3** | Finding path prepared (Evidence-first) | Finding Register complete · each FND → EVD ≥ 1 |
| **G4** | Violation disposition in scope | Violation Register complete (zero allowed if explicit) |
| **G5** | Recommendation dual-path in scope | Recommendation Register complete · VIO→REC-V satisfied |
| **G6** | Decision object in scope | Decision Register · 1 DEC per SYS |
| **G7** | Completeness property in Decision scope | packageComplete ∈ {YES, NO} for all target SYS |

| Plan-level Plan Gate | Status for STEP5-2 |
|----------------------|--------------------|
| G1 prerequisite | **This document defines Plan scope** → G1 closable after Plan acceptance |

**HOLD / PASS** semantics remain Framework-owned. This Plan does not record PASS/HOLD results.

---

## 8. Evidence Strategy

### 8.1 Principles

1. Evidence is a **Reasoning Artifact**, not a Fact copy.
2. Evidence = **Fact Anchor(s) + Rule Anchor(s) + Summary**.
3. Observation alone is not Evidence.
4. Rule alone is not Evidence.
5. Evidence is created **before** Finding.
6. Only grounds **actually used** in Audit are recorded.
7. No new Observation Codes.
8. Evidence does not replace Observation / Inventory.

### 8.2 Fact Anchor Strategy

| Fact Anchor type | Source (Read-only) | Typical Categories |
|------------------|--------------------|--------------------|
| Observation | OBS Catalogs | All with OBS links |
| Inventory Record | System Inventory Table | Package · Identity |
| Metadata Shape | Metadata Shape Matrix | Metadata |
| Registration Fact | Registration Matrix / Fact Matrix | Registration · Runtime |

**OBS-absent path (Framework E8):**  
Inventory / Shape / Reg Fact + Rule may form Evidence without OBS.  
Used when Plan Category requires evaluation and no OBS exists — **without inventing OBS**.

### 8.3 Rule Anchor Strategy

| Rule Anchor | Source | When |
|-------------|--------|------|
| `*-R-*` IDs | STEP5-3 Rule Catalog | Evidence creation (STEP5-4) |
| Category filter | §8 of this Plan | Only Categories listed may be authored in Catalog for this Audit |

Evidence Rule Anchors **must** resolve to Catalog IDs. Ad-hoc rules outside Catalog are forbidden.

### 8.4 Evidence Types (Plan)

Allowed Evidence Type values (Framework):

- `PACKAGE`
- `IDENTITY`
- `METADATA`
- `REGISTRATION`
- `RUNTIME`
- `CANONICAL`
- `COMPOSITE`

Type selection follows the Category that triggered Evidence assembly.  
`COMPOSITE` when multiple Categories’ Fact/Rule anchors are intentionally combined.

### 8.5 Minimum Creation Conditions

Evidence may be created only if:

```text
( ≥ 1 Fact Anchor ) ∧ ( ≥ 1 Rule Anchor ) ∧ ( Evidence Summary without judgment terms )
```

Finding may be created only if:

```text
Evidence references ≥ 1
```

(Enforced in STEP5-4/5 — stated here as Plan Strategy.)

### 8.6 Patterns (Allowed)

```text
OBS + Rule
OBS + Inventory Fact + Rule
Inventory presence Fact + Package Rule          (no OBS)
OBS-META + Shape row + Metadata Rule
OBS-RT + Registration Fact + Runtime / Reg Rule
```

### 8.7 Patterns (Forbidden)

```text
OBS only
Rule only
Subjective notes without Fact/Rule anchors
Finding first, Evidence reverse-attached
```

---

## 9. Rule 적용 범위

STEP5-3 Audit Rule Catalog에 **작성할 Category만** 정의한다.  
**Rule ID · Rule Statement는 작성하지 않는다.**

| Prefix | Category | In this Audit | Note |
|--------|----------|---------------|------|
| `PKG-R-` | Package Rule | **Yes** | Package Completeness · composition norms |
| `META-R-` | Metadata Rule | **Yes** | Shape / semantic key norms |
| `REG-R-` | Registration Rule | **Yes** | Registration key · chain · discovery norms |
| `RT-R-` | Runtime Rule | **Yes** | Runtime observation norms |
| `CAN-R-` | Canonical Rule | **Yes** | Canonical Template alignment norms |
| `CON-R-` | Contract Rule | **Yes** | Runtime Contract norms |
| `SCH-R-` | Schema Rule | **Yes (Reference)** | May be cataloged for Evidence/Deferred · **Validation execution = STEP6** |
| `API-R-` | Public API Rule | **Yes** | Public API surface norms |

### 9.1 Rule Catalog Constraints (Plan → STEP5-3)

- Categories outside this table shall not be introduced without Plan revision.
- SCH-R does not authorize STEP5 Schema Validation execution.
- Rule Catalog remains independent of Observation Catalog (Rule ≠ Fact).

---

## 10. Inputs (Read-only)

| Input | Document / Location |
|-------|---------------------|
| Framework | `STEP5_Architecture_Audit_Framework.md` v1.0 Frozen |
| Inventory SSOT | `System_Inventory.md` v1.0 Final |
| Frozen Assets | Inventory §19 / §20 |
| Audit Guide | `System_Audit_Guide.md` (procedure alignment) |
| Canonical Template | `Canonical_System_Template.md` |
| Runtime Contract | `System_Runtime_Contract.md` |

STEP4 / Framework 문서는 본 Plan 작성으로 **수정하지 않는다.**

---

## 11. Downstream Consumers

| Next STEP | Consumes from this Plan |
|-----------|-------------------------|
| STEP5-3 Rule Catalog | §9 Rule Categories · §4 Categories |
| STEP5-4 Mapping · Evidence | §3 Targets · §5 Sequence · §6 Coverage · §8 Evidence Strategy |
| STEP5-5 Registers | Sequence · Coverage · Gate linkage (no pre-written Findings) |
| STEP5-6 Report | Coverage criteria · Gate list |

---

## 12. Acceptance (STEP5-2 Complete Condition)

본 Plan이 다음을 모두 만족하면 STEP5-2는 완료로 본다.

- [x] Audit Scope defined (in / out)
- [x] Audit Target = SYS-001…038 · exceptions none
- [x] Audit Categories defined (8)
- [x] Audit Sequence defined
- [x] Coverage criteria defined (SYS · OBS · Category · Rule · Evidence)
- [x] Exit Gates mapped from Plan view
- [x] Evidence Strategy defined
- [x] Rule Category scope defined (no Rule IDs)
- [x] No Finding / Violation / Recommendation / Decision / packageComplete content

**Next:** STEP5-3 Audit Rule Catalog (Rule IDs · Statements within §9 Categories)

---

## 13. Revision History

| Version | Status | Content |
|---------|--------|---------|
| **v1.0** | **Active** | **STEP5-2 Architecture Audit Plan — Execution Plan** |

---

*End of STEP5_Audit_Plan.md v1.0 (STEP5-2)*
