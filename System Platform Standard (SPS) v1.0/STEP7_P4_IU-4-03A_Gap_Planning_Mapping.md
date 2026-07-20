# STEP7_P4_IU-4-03A_Gap_Planning_Mapping.md

```text
Document  : STEP7_P4_IU-4-03A_Gap_Planning_Mapping.md
Version   : v1.0
Status    : Complete · Official
Date      : 2026-07-20
STEP      : STEP7 / Phase P4 Standardization Plan
Session   : S7-P4-IU-4-03A
IU        : IU-4-03A
Owner     : System Standardization / Planning
Type      : Gap → Planning Mapping
Depends on: IU-4-01A Scope (PASS) · IU-4-02A Principles (PASS)
Rule      : Define how Gaps link to Planning targets ·
            No Disposition content · No Resolution / Change Design ·
            No D-GAP-A/R mutation · No Runtime / System JSON mutation
VG-P4     : PASS (Cross Review)
```

---

## 1. Mapping Objective

Gap → Planning Mapping의 목적은  
**D-GAP-R의 각 Gap(`DGR-NNN`)을 P4 Planning 대상 슬롯에 연결하는 규칙**을 정의하는 것이다.

본 IU는 다음만 답한다.

> “Gap을 Planning 대상으로 **어떻게** 연결할 것인가?”

본 IU는 다음을 하지 않는다.

- Gap을 해결하는 방법 설계 (Resolution / Change Design)
- Disposition 내용 작성
- Severity Lock
- Apply / Pilot / Fleet 실행 절차 정의

Mapping은 **Planning 관점의 연결 규약**이다.  
실행·설계 본문이 아니다.

---

## 2. Mapping Inputs

| Input | Role | Mode |
|-------|------|------|
| IU-4-01A Scope Specification (PASS) | Planning 경계 | RO · Authority |
| IU-4-02A Standardization Principles (PASS) | Planning / Standardization 원칙 | RO · Authority |
| D-GAP-A (P3 Complete Draft) | Analysis cluster (`D-GAP-A-NNN`) | RO · Cite only |
| D-GAP-R (Complete Draft · 13 rows) | Gap SSOT (`DGR-NNN`) | RO · Cite only |
| D-GAP-R Field Schema Rev.1 | ID · field meaning (`resolutionClass` = taxonomy only) | RO · Cite only |
| Candidate Severity (unlocked) | Planning priority **hint only** | RO · Non-binding |

**Primary mapping key:** `gapId` = `DGR-NNN`  
**Trace key (optional cite):** `dGapAId` = `D-GAP-A-NNN` (1:1)

---

## 3. Mapping Rules

| ID | Rule |
|----|------|
| **MR-01** | Mapping 단위는 **정확히 1개의 `DGR-NNN`** 이다. |
| **MR-02** | 모든 Planning 대상 Gap은 D-GAP-R에 **이미 존재하는** row만 사용한다. 신규 Gap 발명 금지. |
| **MR-03** | `DGR-NNN` ↔ `D-GAP-A-NNN` 1:1 trace를 유지한다. Mapping이 이 관계를 깨지 않는다. |
| **MR-04** | Mapping은 Gap을 **Planning Slot**에 연결한다. Resolution/Apply 산출물에 직접 연결하지 않는다. |
| **MR-05** | Candidate Severity는 **우선순위 힌트**로만 참조한다. Lock하거나 Mapping 결과로 승격하지 않는다. |
| **MR-06** | `resolutionClass` 후보는 Mapping에서 **분류 힌트 cite**만 허용한다. 값을 확정·기록·Lock하지 않는다. |
| **MR-07** | 하나의 `DGR-NNN`은 동일 Planning 계층에서 **하나의 Primary Planning Slot**을 가진다. (보조 cite는 가능, Primary 중복 금지) |
| **MR-08** | Mapping 결과는 “계획 대상임 / 대상 아님 / 후속 Phase로 이관” 중 하나의 **Planning disposition state**만 표현한다. 해결(Resolved) 상태를 만들지 않는다. |
| **MR-09** | High Candidate Gap(DGR-001 / 007 / 008)은 Mapping에서 **누락 금지** (가시성 유지). 내용은 설계하지 않는다. |
| **MR-10** | Mapping 문서에 Change Design ID · 패치 · JSON path · Runtime 변경 지시를 넣지 않는다. |

### Allowed Planning disposition states (taxonomy only · not content)

| State | Meaning |
|-------|---------|
| `Plan-Include` | P4 Plan 범위에 Planning 대상으로 포함한다 |
| `Plan-Defer` | P4 Plan에서 후속 Phase/IU로 이관 표기만 한다 |
| `Plan-Out` | P4 Plan 대상이 아님 (Scope/Principles상 제외) |

> 위 State는 **Planning 연결 상태**이다. Register `status` / Severity / Resolution 결과가 아니다.

---

## 4. Mapping Output Structure

본 IU가 정의하는 산출물 구조(스키마)는 다음과 같다.  
**row 값을 채우지 않는다.** 구조만 고정한다.

### 4.1 Mapping Record (logical)

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `gapId` | `DGR-NNN` | M | Gap primary key |
| `dGapAId` | `D-GAP-A-NNN` | M | Analysis trace |
| `planningState` | `Plan-Include` \| `Plan-Defer` \| `Plan-Out` | M | Planning 연결 상태 |
| `planningSlot` | string | Cond. M if Include/Defer | Planning 대상 슬롯 ID/이름 |
| `priorityHint` | Candidate Severity cite | O | Non-binding hint only |
| `taxonomyHint` | `resolutionClass` candidate cite | O | Taxonomy hint only · not design |
| `notes` | string | O | Planning 연결 메모 only (해결 방법 금지) |

### 4.2 Mapping Table (aggregate)

```text
D-GAP-R (13 × DGR-NNN)
        ↓  MR-* rules
Gap → Planning Mapping Table
  - one row per DGR-NNN
  - planningState + planningSlot (+ optional hints)
        ↓
Later population / Design IUs (not this IU)
```

### 4.3 Non-Outputs (explicit)

| Not produced here |
|-------------------|
| Filled Disposition content |
| Resolution Design |
| Change Design |
| Severity Lock |
| Register field updates |
| Apply / verification procedures |

---

## 5. Mapping Constraints

| ID | Constraint |
|----|------------|
| **MC-01** | IU-4-01A Scope 변경 금지. |
| **MC-02** | IU-4-02A Principles 변경 금지. |
| **MC-03** | D-GAP-A 내용 변경 금지. |
| **MC-04** | D-GAP-R Row 변경 금지 (status / severity / resolution* 포함). |
| **MC-05** | Resolution Design 금지. |
| **MC-06** | Change Design 금지. |
| **MC-07** | Disposition **내용** 설계 금지 (State/Slot 연결 규칙만 허용). |
| **MC-08** | Severity Lock 금지. |
| **MC-09** | Register 수정 금지. |
| **MC-10** | Runtime / System JSON / Analysis 변경 금지. |
| **MC-11** | 다른 IU 검토·대체 정의 금지. |
| **MC-12** | Mapping을 “Gap 해결 완료”로 해석·선언 금지. |

---

## 6. Mapping Success Criteria

| # | Criterion |
|---|-----------|
| 1 | Mapping Objective가 Planning 연결만 다루고 Resolution/Apply를 배제한다. |
| 2 | Mapping Inputs가 D-GAP-R(`DGR-NNN`)을 primary key로 선언한다. |
| 3 | Mapping Rules가 1 Gap → 1 Primary Planning Slot · 신규 Gap 금지 · Severity/resolutionClass non-lock을 포함한다. |
| 4 | Mapping Output Structure가 Record/Table 스키마를 정의하고, **값 population을 본 IU 밖으로** 둔다. |
| 5 | `Plan-Include` / `Plan-Defer` / `Plan-Out` 상태가 Planning-only로 정의된다. |
| 6 | Mapping Constraints가 Scope/Principles/D-GAP RO 및 Resolution·Change Design 금지를 명시한다. |
| 7 | 산출물이 Mapping **한 개**뿐이며, Disposition 내용·Register 갱신·실행 절차를 포함하지 않는다. |

```text
IU-4-03A = Gap → Planning Mapping (rules + structure) only
Primary key = DGR-NNN
Planning states = Plan-Include | Plan-Defer | Plan-Out
Status = Complete · Official · VG-P4 PASS
```

---

*End of STEP7_P4_IU-4-03A_Gap_Planning_Mapping.md v1.0*
