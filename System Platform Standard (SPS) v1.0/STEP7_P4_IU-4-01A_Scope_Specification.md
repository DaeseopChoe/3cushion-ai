# STEP7_P4_IU-4-01A_Scope_Specification.md

```text
Document  : STEP7_P4_IU-4-01A_Scope_Specification.md
Version   : v1.0
Status    : Complete · Official
Date      : 2026-07-20
STEP      : STEP7 / Phase P4 Standardization Plan
Session   : S7-P4-IU-4-01A
IU        : IU-4-01A
Deliverable: D-P4-SCOPE-01
Owner     : System Standardization / Planning
Type      : IU-4-01A Scope Specification
Baseline  : P3 Complete · VG-P3 PASS · D-GAP-A/R Consume
Rule      : Planning boundary definition · No Change Design · No Resolution Design ·
            No Runtime / Framework / Pipeline / System JSON mutation
VG-P4     : PASS (Cross Review)
Next      : IU-4-02A Principles (Complete)
```

---

## 1. Objective

IU-4-01A의 목적은 **P4 Standardization Plan의 작업 경계(Scope)** 를 확정하는 것이다.

P3 Gap Analysis 결과(D-GAP-A / D-GAP-R)를 **Consume** 하여,  
P4에서 무엇을 계획하고 / 무엇을 계획하지 않는지를  
**In / Out / Done / Deliverable** 단위로 고정한다.

본 IU는 Standardization **실행·설계 본문**을 작성하지 않는다.  
Plan의 **Scope Specification**만 산출한다.

---

## 2. In Scope

| # | Item |
|---|------|
| 1 | P4 Standardization Plan의 목적·위상 정의 (Planning only) |
| 2 | IU-4-01A In Scope / Out of Scope 경계 확정 |
| 3 | Consume 입력 선언 (P3·P2·STEP6 Freeze 산출물) |
| 4 | IU-4-01A Deliverables 목록 확정 |
| 5 | IU-4-01A Done Criteria / Exit Criteria 확정 |
| 6 | 후속 P4 IU로 넘길 항목의 **경계 표기만** (내용 작성 금지) |

---

## 3. Out of Scope

| # | Item |
|---|------|
| 1 | D-GAP-A / D-GAP-R 재분석 · 신규 Gap 발명 |
| 2 | Severity Lock |
| 3 | Resolution Design · Change Design 본문 |
| 4 | Disposition Taxonomy enum Lock |
| 5 | D-PLAN 본문 전량 작성 (본 IU는 Scope만) |
| 6 | Catalog / Register JSON body · `catalogPinId` · Freeze Candidate 선언 |
| 7 | Runtime / Registry / Loader / Contract 변경 |
| 8 | System JSON 변경 |
| 9 | Framework / Pipeline / STEP6 Freeze surface 수정 |
| 10 | NS-U1-001 / CL-001 / CV-001 reopen |
| 11 | 다른 IU (`IU-4-02A` 이후) 내용 설계·검토 |

---

## 4. Input (Consume)

| Input | Role | Mode |
|-------|------|------|
| `PROJECT_MASTER_INDEX.md` | 현재 Stage · P4 Entry SSOT | RO |
| `HISTORY/PROJECT_LOG_2026-07.md` | P3 Complete · Carry Decisions | RO |
| `CURSOR_SESSION_HANDOFF.md` | Session Card · Forbidden · Pending | RO |
| D-GAP-A (P3 Complete Draft) | Gap Analysis input | RO · Consume |
| D-GAP-R (Complete Draft · 13 rows) | Gap Register input | RO · Consume |
| D-GAP-R Field Schema Rev.1 | `DGR-NNN` · `resolutionClass` taxonomy-only | RO · Consume |
| `STEP7_Catalog_Freeze_Design.md` v0.15 | P2 Catalog Design | RO · Consume |
| STEP6 Final Freeze / Framework / Pipeline | Locked baseline | RO · Consume |
| `STEP7_IMPLEMENTATION_DECOMPOSITION.md` v1.0 | Session Execution SSOT | RO · Consume |

**Carry Decisions (변경 금지):**

- `DGR-NNN`
- `resolutionClass` = taxonomy only
- Severity = Candidate only · Lock Deferred
- Resolution Design = P4+ (본 IU에서 설계하지 않음)

---

## 5. Deliverables

| ID | Deliverable | Form |
|----|-------------|------|
| **D-P4-SCOPE-01** | **IU-4-01A Scope Specification** | 본 문서 |

**Non-Deliverables (명시):**

- D-PLAN 본문
- Change Design
- Resolution Design
- Register row updates
- Catalog/Register JSON
- Code / System JSON / Runtime artifacts

---

## 6. Done Criteria

| # | Criterion |
|---|-----------|
| 1 | Objective가 P4 Planning / Scope-only로 명시됨 |
| 2 | In Scope / Out of Scope가 상호 배타적으로 나열됨 |
| 3 | Consume Input이 P3/P2/STEP6 산출물로 식별됨 |
| 4 | Deliverable이 `D-P4-SCOPE-01` 단일로 확정됨 |
| 5 | Done / Exit Criteria가 검증 가능한 문장으로 존재함 |
| 6 | Out of Scope에 Resolution / Change Design / Severity Lock / Runtime·JSON·Register·Analysis 재작업이 포함됨 |
| 7 | 다른 IU 내용이 Scope 본문에 포함되지 않음 |

---

## 7. Exit Criteria

| # | Criterion | Result if Met |
|---|-----------|---------------|
| 1 | Done Criteria 1–7 전부 충족 | IU-4-01A Scope **Reviewable** |
| 2 | Runtime / System JSON / Register / Analysis diff = 없음 | Planning-only 유지 |
| 3 | Forbidden 위반 없음 | Session Exit 가능 |
| 4 | Scope Spec에 대한 Review PASS | **IU-4-01A PASS** → 다음 P4 IU |

```text
IU-4-01A = P4 Standardization Plan · Scope Specification only
Deliverable = D-P4-SCOPE-01
Status = Complete · Official · VG-P4 PASS
```

---

*End of STEP7_P4_IU-4-01A_Scope_Specification.md v1.0*
