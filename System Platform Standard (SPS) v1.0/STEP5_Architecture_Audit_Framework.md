# STEP5_Architecture_Audit_Framework.md

```
Document  : STEP5_Architecture_Audit_Framework.md
Version   : v1.0 (STEP5-1 Final)
Status    : Final · Frozen · Architecture Audit Framework SSOT
Date      : 2026-07-14
Basis     : STEP5-1 Architecture Review (v1 · v2 · v3) · System_Audit_Guide.md · System_Inventory.md v1.0 Final
SPS       : System Platform Standard (SPS) v1.0
Rule      : Framework structure Frozen · ADR-level changes only via v1.1+
Baseline  : Batch6 Final Freeze (ec71ef9) · STEP4 Inventory Final (v1.0) maintained Read-only
```

---

## 1. Overview

본 문서는 SPS Standardization workflow의 **STEP5 Architecture Audit Framework SSOT**이다.

STEP4 Frozen Assets를 입력으로 하여 Architecture Audit를 수행하는 **구조·규칙·계층·게이트**를 정의한다.

### 1.1 STEP5-1 역할

```text
Architecture Review
        ↓
Framework Design (v1 → v2 → v3)
        ↓
Framework Final Freeze (v1.0)
        ↓
STEP5-2+ Application (Plan · Rules · Registers · Report)
```

본 문서는 **Framework만** 확정한다.  
Audit Plan · Rule Catalog · Register · Finding · Report 실체는 후속 STEP에서 작성한다.

### 1.2 Document status

```text
Document status: Final (STEP5-1 Final v1.0)
Framework: Frozen
```

### 1.3 Freeze 이후 원칙

| 허용 | 금지 |
|------|------|
| STEP5-2~6에서 Framework **적용** (Plan · Rules · Registers · Report) | Framework 구조 변경 |
| ADR 수준의 구조 변경 → **v1.1+** | Pipeline · Evidence · Decision · Exit Gate · Rule Catalog 구조 · Register Shape의 Informal 변경 |
| Ruleset 내용 추가 (STEP5-3) · Register 레코드 작성 | STEP4 Inventory / Observation 수정 |

---

## 2. SSOT Separation

| Layer | Owner | 역할 |
|-------|-------|------|
| **STEP4 Fact SSOT** | `System_Inventory.md` | Inventory · Observation · Matrices · Assets |
| **STEP5 Audit Framework SSOT** | 본 문서 | Pipeline · Evidence · Decision · Gates · Handoff |
| **STEP5 Rule SSOT** | STEP5-3 Rule Catalog (후속) | Audit Rule IDs · Statements |
| **STEP5 Audit Registers** | STEP5-4 / STEP5-5 (후속) | Mapping · Evidence · Finding · Violation · Recommendation · Decision |
| **STEP5 Report** | STEP5-6 (후속) | Audit Report · STEP6 Handoff |

### 2.1 Separation Rules

- Fact와 Audit를 혼합하지 않는다.
- Inventory와 Architecture를 분리한다.
- Rule과 Fact를 분리한다.
- Evidence는 Fact를 대체하지 않는다 (Reasoning Artifact).
- Observation / Inventory ID / Observation Code는 STEP5에서 변경하지 않는다.
- STEP4 문서는 Read-only Input이다.

---

## 3. STEP5 Workflow (Official)

```text
STEP5-1  Architecture Audit Framework (Frozen)     ← 본 문서
        ↓
STEP5-2  Architecture Audit Plan
        ↓
STEP5-3  Audit Rule Catalog
        ↓
STEP5-4  Observation Mapping Register
         + Evidence Register
        ↓
STEP5-5  Finding Register
         Violation Register
         Recommendation Register
         Architecture Decision Register
        ↓
STEP5-6  Architecture Audit Report
         + STEP6 Handoff
```

STEP5-1 이후에는 Framework를 **변경하지 않고 적용**한다.

---

## 4. Audit Pipeline (Frozen)

```text
STEP4 Frozen Assets (Read-only)
        │
        ▼
Architecture Audit Plan                         (STEP5-2)
        │
        ▼
Audit Rule Catalog                              (STEP5-3)
        │
        ▼
Architecture Observation Mapping                (STEP5-4)
        │
        ▼
Evidence                                        (STEP5-4)
        │
        ▼
Finding                                         (STEP5-5)
      ├──► Recommendation (Finding-based)       (REC-F)
      │
      └──► Violation
             └──► Recommendation (Violation-based) (REC-V)
                        │
                        ▼
              Architecture Decision             (STEP5-5)
                · decisionStatus
                · classification
                · completeness.*
                        │
                        ▼
                   STEP5 Exit Gate
                        │
                        ▼
              Architecture Audit Report
              + STEP6 Handoff                     (STEP5-6)
```

### 4.1 Stage Responsibilities

| Stage | 책임 | 금지 |
|-------|------|------|
| Frozen Assets | Fact SSOT 제공 | Audit 해석 |
| Audit Plan | 범위·순서·Coverage·Gate·Strategy | Finding / Decision |
| Rule Catalog | Audit Rule SSOT | Observation / Inventory 변경 |
| Observation Mapping | OBS ↔ SYS ↔ Category 연결 | Rule 적용 판정 |
| Evidence | Fact Anchor + Rule Anchor 근거 고정 | Finding / Violation / REC / DEC |
| Finding | Architecture 편차 서술 | Evidence 없는 Finding · OBS 수정 |
| Violation | 규칙 위반 확정 | Inventory rewrite |
| Recommendation | Migration Guidance only | 코드 / JSON 구현 |
| Architecture Decision | Status · Classification · completeness | Standardization 실행 (STEP7) |
| Exit Gate | STEP5 종료 · STEP6 Ready | Schema Validation 실행 |
| Report / Handoff | 종합 · 이관 | 신규 Finding 생성 |

---

## 5. Evidence Layer (Frozen)

### 5.1 Role

Evidence는 Observation 복사본이 아니다.  
**Fact Anchor + Rule Anchor**를 결합한 **Reasoning Artifact**이다.

| Observation (STEP4) | Evidence (STEP5) | Finding (STEP5) |
|---------------------|------------------|-----------------|
| Frozen Fact | Audit 근거 스냅샷 | Architecture 편차 판단 |
| `OBS-*` | `EVD-*` | `FND-*` |
| 수정 금지 | STEP5에서만 생성 | Evidence ≥ 1 필수 |

### 5.2 Generation Rules (E1–E10)

| ID | Rule |
|----|------|
| E1 | Observation만으로 Evidence 생성 금지 |
| E2 | Evidence = Fact Anchor(s) + Rule Anchor(s) + Summary |
| E3 | Audit에 실제 사용한 근거만 기록 |
| E4 | Evidence는 Finding **이전**에 생성 |
| E5 | Evidence는 STEP5 Audit Layer 전용 |
| E6 | Observation / Inventory를 수정·대체하지 않음 (참조만) |
| E7 | 신규 Observation Code 생성 금지 |
| E8 | OBS 없는 Evidence 허용: Inventory / Shape / Reg Fact + Rule |
| E9 | Evidence Summary에 Violation / Recommendation / Decision 용어 금지 |
| E10 | 동일 Plan · Ruleset · Frozen Input → 동일 Evidence 집합 |

### 5.3 Evidence Record Shape (Frozen)

| Field | Required | Description |
|-------|----------|-------------|
| EVD-ID | Yes | `EVD-NNN` |
| SYS-ID | Yes | `SYS-NNN` |
| OBS-ID[] | Optional | 0..n Frozen OBS references |
| Fact Anchors | Yes | Inventory / Shape / Registration 등 |
| Rule Anchors | Yes | Rule Catalog IDs (`*-R-*`) |
| Evidence Type | Yes | PACKAGE · IDENTITY · METADATA · REGISTRATION · RUNTIME · CANONICAL · COMPOSITE … |
| Evidence Summary | Yes | Fact+Rule 결합 서술 (판정어 금지) |
| Source References | Yes | RO document / section / matrix pointers |
| Mapping Ref | Optional | Mapping record ID |
| Plan Ref | Optional | Audit Plan item ID |
| Ruleset Version | Optional | Determinism |

**Forbidden fields on Evidence:** severity · classification · violationFlag · recommendation · packageComplete

### 5.4 Finding ↔ Evidence

- Finding **Must** reference Evidence ≥ 1
- Evidence 없는 Finding **금지**
- 1 Finding → 여러 Evidence 허용
- Evidence는 Architecture 판단이 아니다

---

## 6. Recommendation Dual Path (Frozen)

```text
Finding
  ├──► Recommendation (Finding-based)     REC-F   — optional
  │
  └──► Violation
         └──► Recommendation (Violation-based)  REC-V   — required if Violation exists
```

| Kind | ID prefix | Meaning |
|------|-----------|---------|
| Finding-based | `REC-F-*` | 위반 확정 전·또는 위반 없음에서의 Architecture 개선안 |
| Violation-based | `REC-V-*` | 규칙 위반 해소에 필요한 최소 Migration Guidance |

**Rules:**

1. Finding → REC-F 가능 (optional)
2. Finding → Violation이면 Violation → REC-V **필수**
3. Recommendation = Guidance only (코드·JSON·Runtime 변경 금지)
4. Dual-axis classification of each REC:

### 6.1 Migration Category (M0–M4) — `System_Audit_Guide` §32

| Cat | Meaning |
|-----|---------|
| M0 | No migration required |
| M1 | Minor architectural improvement · No Runtime impact |
| M2 | Schema / Package modification · behavior preserved |
| M3 | Canonical migration required |
| M4 | Major redesign required |

M0–M4는 **Migration Category 전용**이다. Priority로 재정의하지 않는다.

### 6.2 Recommendation Priority (RP-0..RP-4)

| Priority | Meaning |
|----------|---------|
| RP-0 Mandatory | Blocking · Release / Runtime 참여 전 해소 |
| RP-1 Strongly Recommended | Release 전 권장 · CONDITIONAL 가능 |
| RP-2 Recommended | 정렬 권장 · 즉시 blocking 아님 |
| RP-3 Optional | 품질·일관성 개선 |
| RP-4 Deferred | STEP6 / STEP7 / 후속 세션으로 명시 연기 |

Heuristic: REC-V → mainly RP-0..RP-2 · REC-F → mainly RP-2..RP-4

---

## 7. Rule Catalog Layer (Frozen Structure)

### 7.1 Role

Audit Rule Catalog (STEP5-3)는 Architecture Audit에 사용하는 **Audit Rule SSOT**이다.

- Observation이 아니다
- Inventory와 독립 관리
- Evidence의 **Rule Anchor** 출처

### 7.2 Rule Categories (Structure Frozen · IDs authored in STEP5-3)

| Prefix | Category | STEP5 use |
|--------|----------|-----------|
| `PKG-R-` | Package Rule | Active |
| `META-R-` | Metadata Rule | Active |
| `REG-R-` | Registration Rule | Active |
| `RT-R-` | Runtime Rule | Active |
| `CAN-R-` | Canonical Rule | Active |
| `CON-R-` | Contract Rule | Active |
| `SCH-R-` | Schema Rule | Reference in Audit · Validation execution = STEP6 |
| `API-R-` | Public API Rule | Active |

### 7.3 Rule ↔ Evidence

```text
Fact Anchor (OBS / Inventory / Shape / Reg Fact)
        +
Rule Anchor (Rule Catalog ID)
        ↓
Evidence
        ↓
Finding
```

Catalog에 없는 Rule ID는 Evidence Rule Anchor로 사용 금지.

---

## 8. Architecture Decision Object (Frozen)

### 8.1 Decision Input

```text
Decision = f(Audit Rules, Findings, Violations, Recommendations)
```

| Input | Role |
|-------|------|
| Audit Rules | 규범 기준 (Rule Catalog) |
| Finding | 편차·증거·Severity |
| Violation | 위반 집합 (0..n) |
| Recommendation | REC-F ∪ REC-V (M + RP) |

### 8.2 Decision Object Shape

```text
Architecture Decision
├── decisionId                 DEC-NNN
├── systemId                   SYS-NNN
├── decisionStatus             (§8.3)
├── classification             (§8.4 · System_Audit_Guide §25)
├── completeness               (§9)
│     ├── packageComplete      YES | NO | UNDECIDED
│     ├── schemaComplete       Reserved (STEP6)
│     ├── runtimeComplete      Reserved
│     └── contractComplete     Reserved
├── recommendationRefs[]
├── findingRefs[] / violationRefs[]
└── deferredTo[]               STEP6 | STEP7 | …
```

**Rule:** System (`SYS-*`)당 Architecture Decision **1건**.

### 8.3 Decision Status

| Status | Meaning |
|--------|---------|
| COMPLIANT | Blocking VIO 없음 · packageComplete=YES · 필수 REC 없음/불필요 |
| CONDITIONAL | RP-0 없음 · 조건부 REC 잔존 가능 |
| NON_COMPLIANT | Blocking VIO 또는 packageComplete=NO 또는 RP-0 미해소 |
| DEFERRED | 핵심 이슈를 STEP6/7로 명시 이관 |

Decision Status ≠ Classification을 자동 동일시하지 않는다. **둘 다 기록**한다.

### 8.4 Classification (`System_Audit_Guide` §25)

| Classification | Meaning |
|----------------|---------|
| COMPLIANT | SPS 완전 충족 |
| MINOR DEVIATION | 호환 · 개선 권장 · Migration 연기 가능 |
| MAJOR DEVIATION | Canonical과 차이 · Release 전 Migration 필요 |
| NON-COMPLIANT | SPS 위반 · 교정 전 Runtime 참여 금지 |

### 8.5 Decision Generation Rules

1. Plan · Mapping 완료 후에만 Decision 작성
2. Rules-first — Decision은 Audit Rule 조항을 인용
3. Violation이 있으면 관련 REC-V를 명시 인용
4. 출력에 OBS/Inventory 변경 · 코드/JSON 변경을 포함하지 않음

---

## 9. Completeness Property Model (Frozen)

`packageComplete`는 Pipeline 말단 객체가 아니라  
**Architecture Decision의 Completeness Property**이다.

| Property | Owner STEP | Status in STEP5 |
|----------|------------|-----------------|
| packageComplete | STEP5 | **Active** |
| schemaComplete | STEP6 | Reserved |
| runtimeComplete | Extension | Reserved |
| contractComplete | Extension | Reserved |

### 9.1 packageComplete Rules

- **YES / NO** only after: Plan · Mapping · Evidence · Finding · Violation · Recommendation · Decision chain for that SYS
- Intermediate → `UNDECIDED` (계산 금지)
- Default evaluation basis: Package Completeness Rules (`profile` · `logic` · `anchors` · `system_meta` presence Facts from Inventory)
- Default scope: **file-package completeness only**; Identity / Contract violations affect Classification / Status, not necessarily packageComplete (unless Decision explicitly binds them)
- STEP4에서는 packageComplete를 **계산하지 않는다** (Fact ≠ Decision)

---

## 10. Traceability (Frozen)

```text
OBS / Inventory / Shape / Reg Fact   (STEP4 Frozen · RO)
        ↓
Observation Mapping
        ↓
EVD-*  (Fact + Rule)
        ↓
FND-*
        ├── REC-F
        └── VIO-* → REC-V
                ↓
             DEC-*
```

역추적 가능해야 한다: `DEC → REC → VIO → FND → EVD → OBS/SYS/Rule`.

---

## 11. Deterministic Audit (Frozen)

| Principle | Meaning |
|-----------|---------|
| Same Frozen Input | Same OBS · Inventory · Matrices |
| Same Audit Plan | Same scope · sequence · coverage |
| Same Rule Catalog version | Same Rule Anchors |
| ⇒ Same Evidence | Same Fact+Rule bindings |
| ⇒ Same Finding / Violation / Recommendation / Decision | Same evaluation |

Audit는 reviewer · OS · Runtime 구현에 의존하지 않는다 (`System_Audit_Guide` §28).

---

## 12. Exit Gate (Frozen)

| Gate | Criterion |
|------|-----------|
| G1 | Audit Plan 적용 완료 (scope closed) |
| G2 | Observation Mapping 완료 |
| **G2.5** | Evidence 등록 완료 (Finding 후보 EVD 선행) |
| G3 | Finding 등록 완료 (각 FND → EVD ≥ 1) |
| G4 | Violation 확정 완료 (0건도 “확정”) |
| G5 | Recommendation 정리 완료 (VIO→REC-V 필수) |
| G6 | Architecture Decision 완료 (SYS당 DEC 1) |
| G7 | packageComplete ∈ {YES, NO} for all target SYS |

| Result | Meaning |
|--------|---------|
| **HOLD** | G1–G7 (incl. G2.5) incomplete → STEP6 entry 금지 |
| **PASS** | All gates met → STEP6 Handoff Ready |

Exit Gate = Audit Layer 종료. Standardization 시작이 아니다.

---

## 13. STEP6 Handoff Model (Frozen)

### 13.1 Handoff Inputs

| Item | Role |
|------|------|
| Rule Catalog (version pinned) | Especially SCH-R references |
| Evidence Register | Validation traceability |
| Finding / Violation / Recommendation Registers | Issue · Migration context |
| Decision Register | Status · Classification · Deferred · completeness |
| packageComplete (Decision property) | Package verdict (STEP6 does not rewrite) |
| Deferred Items | Schema Validation targets |
| Architecture Audit Report | Aggregate context |
| STEP4 Frozen Assets | Fact RO reference as needed |

### 13.2 Handoff Principles

- STEP6 Owner = **Schema Validation** (+ schemaComplete 등)
- STEP5 Registers are **immutable** after Exit Gate PASS
- STEP6 must not rewrite STEP5 Audit results
- Discrepancies found in STEP6 are recorded as STEP6 Validation results — not by editing STEP5 Registers
- Inventory / Observation remain Read-only

---

## 14. Register Shape Index (Frozen · Contents later)

| STEP | Register | Shape Owner |
|------|----------|-------------|
| STEP5-4 | Observation Mapping Register | Framework §4 · Mapping fields |
| STEP5-4 | Evidence Register | Framework §5.3 |
| STEP5-5 | Finding Register | FND-ID · SYS · EVD[] · Severity · Classification hint |
| STEP5-5 | Violation Register | VIO-ID · FND · Violated Rule(s) · Severity |
| STEP5-5 | Recommendation Register | REC-ID · Kind (F/V) · M · RP · refs |
| STEP5-5 | Architecture Decision Register | Framework §8.2 |

Register **내용 작성**은 STEP5-4/5. Shape 변경은 Framework v1.1+ (ADR)만.

---

## 15. Audit Report (STEP5-6 — Structure Frozen)

Architecture Audit Report **종합만** 하며 신규 Finding을 생성하지 않는다.

Recommended sections:

- Audit Summary
- Coverage
- Decision Summary
- packageComplete Summary
- Deferred Items
- STEP6 Input
- Severity / M / RP Summary (recommended)
- Traceability Index (recommended)

---

## 16. STEP4 Input Assets (Read-only)

Official inputs from `System_Inventory.md` §19.4 / §20:

- Inventory Rule
- Observation SSOT
- System Inventory Table
- Observation Catalog
- Metadata Observation Catalog
- Metadata Shape Matrix
- Registration Matrix
- Registration Fact Matrix
- Inventory Assets

STEP5 **does not modify** these assets.

---

## 17. Freeze Declaration

```text
STEP5-1 Architecture Audit Framework
Version : v1.0 Final
Status  : Frozen

Frozen:
  · Audit Pipeline
  · Evidence Layer
  · Recommendation Dual Path
  · Rule Catalog Layer (structure)
  · Decision Object
  · Completeness Property Model
  · Traceability
  · Deterministic Audit
  · Exit Gate (G1–G7 + G2.5)
  · STEP6 Handoff Model
  · Register Shapes
  · Report section model
  · Workflow STEP5-1 … STEP5-6

Next Application Step: STEP5-2 Architecture Audit Plan

Structural change policy: ADR → document version v1.1+
```

---

## 18. Revision History

| Version | Status | Content |
|---------|--------|---------|
| v0.1–v0.3 | Design Review | Pipeline · Dual REC · Evidence · Decision · Exit Gate (Ask-mode Reviews) |
| **v1.0** | **Final · Frozen** | **STEP5-1 Architecture Audit Framework Final** |

---

*End of STEP5_Architecture_Audit_Framework.md v1.0 (STEP5-1 Final · Frozen)*
