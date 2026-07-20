# STEP7_P4_IU-4-06A_Implementation_Unit_Planning.md

```text
Document  : STEP7_P4_IU-4-06A_Implementation_Unit_Planning.md
Version   : v1.0
Status    : Complete · Official
Date      : 2026-07-20
STEP      : STEP7 / Phase P4 Standardization Plan
Session   : S7-P4-IU-4-06A
IU        : IU-4-06A
Owner     : System Standardization / Planning
Type      : Implementation Unit Planning
Depends on: IU-4-01A … IU-4-05A (PASS)
Rule      : Define how Planning Packages decompose into later IUs ·
            No IU body content · No Change Design / Resolution / Apply detail ·
            No prior IU / D-GAP / Runtime / System JSON mutation
VG-P4     : PASS (Cross Review)
```

---

## 1. IU Planning Objective

Implementation Unit Planning의 목적은  
Planning Package를 후속 작업에서 수행할 **Implementation Unit(IU)으로 분해하는 기준**만 정의하는 것이다.

답하는 질문:

> “Planning Package를 **어떤 규칙으로 IU 단위로 나눌 것인가?**”

답하지 않는 질문:

- 각 IU에 **무엇을** 설계·구현할 것인가 (내용)
- Change Design / Resolution / Apply / Verification **본문**
- 코드·System JSON·Runtime **변경 계획**

본 IU = **분해·의존성 규약**.  
후속 IU 목록의 확정 본문·설계 본문 ≠ 본 IU.

---

## 2. IU Planning Scope

### In Scope

| # | Item |
|---|------|
| 1 | Planning Package → 후속 IU 분해 목적 정의 |
| 2 | IU Decomposition Rules (쪼개는 기준) |
| 3 | IU Dependency Rules (순서·선행 관계) |
| 4 | IU Constraints (분해 시 금지사항) |
| 5 | Success Criteria |

### Out of Scope

| # | Item |
|---|------|
| 1 | IU-4-01A … IU-4-05A 변경 |
| 2 | D-GAP-A / D-GAP-R 변경 |
| 3 | 후속 IU ID·제목·본문 **실제 작성** |
| 4 | Resolution Design · Change Design 내용 |
| 5 | Implementation / Apply / Verification 절차 본문 |
| 6 | Runtime / System JSON / Register / Analysis 변경 |
| 7 | Severity Lock |
| 8 | WBS/Scope Phase·WP·IU 번호 신설·변경 (Approved WBS 준수) |

### Relation (cite only)

| Artifact | Role in IU Planning |
|----------|---------------------|
| Planning Package (IU-4-05A W1) | 분해 **입력 단위** |
| `planningState` / `planningSlot` (IU-4-03A) | 대상 여부·슬롯 cite |
| `dispositionCategory` (IU-4-04A) | 분류 cite (내용 아님) |
| Workflow W2…W5 (IU-4-05A) | 후속 IU가 속할 **경로 구간** cite |
| Approved WBS / Decomposition SSOT | IU ID·Queue **권위** (본 IU가 새 IU를 발명하지 않음) |

---

## 3. IU Decomposition Rules

| ID | Rule |
|----|------|
| **DR-01** | 분해 입력은 **Planning Package 1건** (primary key = `DGR-NNN`) 이다. |
| **DR-02** | `planningState` ≠ `Plan-Include` 인 Gap은 후속 IU로 분해하지 않는다 (`Plan-Defer`/`Plan-Out` 제외). |
| **DR-03** | 기본 분해 단위는 **1 Gap (`DGR-NNN`) → 1 Primary Change-Design IU path** 이다. |
| **DR-04** | 동일 `dispositionCategory`만으로 여러 Gap을 **강제 병합하지 않는다**. 병합은 별도 승인된 Planning 결정이 있을 때만. |
| **DR-05** | IU 분해는 **Workflow Stage 역할**을 따른다. 한 IU가 W2+W3+W4+W5(또는 Design+Apply+Verify)를 한꺼번에 먹지 않는다. |
| **DR-06** | Design IU와 Apply IU는 **분리**한다. Design 미통과 Apply IU 생성 금지. |
| **DR-07** | Review Gate(W4) 성격 IU는 Design 산출물 존재를 전제로 한다. Design과 Review를 무검토 병합 금지. |
| **DR-08** | Handoff(W5) 성격 IU는 Apply 절차 본문을 포함하지 않는다. Apply는 별도 IU/Phase. |
| **DR-09** | IU 분해 결과는 **기준·슬롯·의존성**만 남긴다. 설계 문장·패치·JSON path를 넣지 않는다. |
| **DR-10** | 새 IU ID를 본 문서에서 **발명하지 않는다**. Approved WBS / Session Queue에 없는 ID 생성 금지. |
| **DR-11** | 1 IU = 1 primary responsibility (단일 책임). mega-IU 금지. |
| **DR-12** | Catalog/Freeze delivery·Audit execution 등 **횡단 Package**가 필요해도, Gap Design IU와 횡단 Delivery IU를 한 덩어리로 섞지 않는다 (의존성으로만 연결). |

### Decomposition shape (pattern only · no IU bodies)

```text
Planning Package (DGR-NNN, Plan-Include)
        ↓  DR-*
Candidate IU slots (role-based):
  - Change Design Entry / Authoring slot   (≈ W2–W3)
  - Change Design Review slot              (≈ W4)
  - Apply-Ready Handoff slot               (≈ W5)
  - (later) Apply / Verification slots     — out of this document’s content
```

---

## 4. IU Dependency Rules

| ID | Rule |
|----|------|
| **DP-01** | 의존성 방향은 **단방향**: Planning → Design → Review → Handoff → (later Apply/Verify). |
| **DP-02** | Design IU는 해당 Gap의 Planning Package **Ready(W1)** 및 Entry Gate 조건을 선행으로 한다. |
| **DP-03** | Review IU는 동일 Gap의 Design IU **완료(존재)** 에 의존한다. |
| **DP-04** | Handoff IU는 Review **PASS**에 의존한다. FAIL 시 Apply 방향 IU 생성·진행 금지. |
| **DP-05** | Apply/Verification IU(후속 Phase)는 Handoff 완료 cite에 의존한다. 본 문서가 그 내용을 정의하지 않는다. |
| **DP-06** | Gap 간 의존성은 `DGR-NNN` cite로만 표현한다. 암묵 병합·암묵 순서 금지. |
| **DP-07** | Cross-cutting Delivery IU가 있을 경우, 개별 Gap Design IU는 그것을 **선행/병행 cite**로만 참조한다. 내용 결합 금지. |
| **DP-08** | Dependency cycle 금지 (A→B→A). |
| **DP-09** | Upstream FAIL이면 Downstream IU는 **착수하지 않는다** (skip 금지 · 재시도는 동일 역할 IU). |
| **DP-10** | P4 Plan IU(4-01A…4-07A+)는 후속 Design IU의 **공통 선행**이다. Plan PASS 없이 Design IU 착수 금지. |

### Dependency sketch (rules only)

```text
P4 Plan PASS
        ↓
Planning Package Ready (per DGR-NNN)
        ↓
Design-role IU  ──depends on──► Package + Entry Gate
        ↓
Review-role IU  ──depends on──► Design-role complete
        ↓
Handoff-role IU ──depends on──► Review PASS
        ↓
Later Apply / Verify IUs (defined elsewhere)
```

---

## 5. IU Constraints

| ID | Constraint |
|----|------------|
| **IC-01** | IU-4-01A … IU-4-05A 변경 금지. |
| **IC-02** | D-GAP-A / D-GAP-R 변경 금지. |
| **IC-03** | Resolution Design 금지. |
| **IC-04** | Change Design 내용 작성 금지. |
| **IC-05** | Implementation 내용 작성 금지. |
| **IC-06** | Apply / Verification 절차 작성 금지. |
| **IC-07** | Runtime / System JSON / Register / Analysis 변경 금지. |
| **IC-08** | 후속 IU의 실제 ID·본문·파일 목록을 본 문서에 기입하지 않는다. |
| **IC-09** | Approved WBS 밖 IU 신설 금지. |
| **IC-10** | 분해 기준이 Scope/Principles/Mapping/Taxonomy/Workflow와 충돌하면 **선행 PASS 문서가 우선**. |
| **IC-11** | 산출물은 Implementation Unit Planning **단일**만 허용. |

---

## 6. Success Criteria

| # | Criterion |
|---|-----------|
| 1 | IU Planning Objective가 **분해 기준**만 다루고 IU 본문·구현 계획을 배제한다. |
| 2 | IU Planning Scope가 Planning Package를 입력으로, WBS 밖 ID 신설을 Out으로 둔다. |
| 3 | Decomposition Rules가 1 Gap / 단일 책임 / Design·Apply 분리 / Stage 역할 분리를 포함한다. |
| 4 | Dependency Rules가 Planning→Design→Review→Handoff 단방향·FAIL 시 중단·cycle 금지를 포함한다. |
| 5 | IU Constraints가 선행 IU/D-GAP RO 및 Resolution·Change Design·Apply/Verify 내용 금지를 포함한다. |
| 6 | 실제 후속 IU 목록·설계·코드 변경이 문서에 없다. |
| 7 | 산출물이 Implementation Unit Planning **한 개**뿐이다. |

```text
IU-4-06A = Implementation Unit Planning (decomposition + dependency rules) only
Status = Complete · Official · VG-P4 PASS
```

---

*End of STEP7_P4_IU-4-06A_Implementation_Unit_Planning.md v1.0*
