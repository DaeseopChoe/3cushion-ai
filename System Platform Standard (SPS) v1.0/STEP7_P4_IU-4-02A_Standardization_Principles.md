# STEP7_P4_IU-4-02A_Standardization_Principles.md

```text
Document  : STEP7_P4_IU-4-02A_Standardization_Principles.md
Version   : v1.0
Status    : Complete · Official
Date      : 2026-07-20
STEP      : STEP7 / Phase P4 Standardization Plan
Session   : S7-P4-IU-4-02A
IU        : IU-4-02A
Owner     : System Standardization / Planning
Type      : Standardization Principles
Depends on: IU-4-01A Scope Specification (PASS)
Rule      : Planning principles · No Scope change · No Resolution / Change Design ·
            No Runtime / System JSON / Register / Analysis mutation
VG-P4     : PASS (Cross Review)
```

---

## 1. Planning Principles

| ID | Principle |
|----|-----------|
| **PP-01** | P4는 **Planning only**이다. Standardization 실행·JSON 패치·Runtime 변경은 P4에서 하지 않는다. |
| **PP-02** | Plan은 P3 산출물(D-GAP-A / D-GAP-R)과 P2 Catalog Design을 **Consume**한다. 재분석하지 않는다. |
| **PP-03** | 계획 단위는 **Gap → Disposition path → later IU/Phase** 로만 연결한다. 본문 설계(Change Design)는 Plan 밖이다. |
| **PP-04** | Candidate Severity는 **계획 우선순위 힌트**로만 사용한다. Severity Lock은 Plan Principles에서 수행하지 않는다. |
| **PP-05** | 한 Session / 한 IU는 **단일 책임**만 가진다. Principles IU는 Principles만 산출한다. |
| **PP-06** | IU-4-01A Scope (PASS)를 **상위 경계**로 준수한다. Scope 재정의·확장 금지. |

---

## 2. Standardization Principles

| ID | Principle |
|----|-----------|
| **SP-01** | Standardization의 목표는 System Package를 **Canonical / Contract / Schema 정합** 상태로 수렴시키는 것이다. |
| **SP-02** | Gap은 **Register row (`DGR-NNN`)** 로만 추적한다. 비공식 backlog·중복 Gap 발명 금지. |
| **SP-03** | `resolutionClass`는 **처분 분류(taxonomy)** 이다. Change Design·패치 본문이 아니다. |
| **SP-04** | Catalog Freeze Design(v0.15)의 Locked 결정(NS/CL/CV)은 Standardization 전제이며 **silent reopen 금지**. |
| **SP-05** | Framework / Pipeline / STEP6 Freeze는 **Consume-only**. Standardization이 Validation semantics를 재정의하지 않는다. |
| **SP-06** | Runtime Contract / Registry / Loader 경로는 Standardization의 **보호 대상**이다. silent mutation 금지. |
| **SP-07** | System JSON 변경은 **scoped Change Design + 승인된 Apply IU** 이후에만 허용된다 (Pilot+). Plan 단계에서는 금지. |
| **SP-08** | High Candidate Gap(DGR-001 / 007 / 008)은 Plan에서 **우선 가시성**을 유지한다. 단, 본 IU에서 Resolution하지 않는다. |

---

## 3. Planning Constraints

| ID | Constraint |
|----|------------|
| **PC-01** | IU-4-01A Scope PASS 경계 준수 — In/Out 변경 금지. |
| **PC-02** | Runtime Baseline `ec71ef9` 유지 — Plan으로 인한 code/runtime diff 금지. |
| **PC-03** | System JSON / data/systems RO — Plan 문서만 허용. |
| **PC-04** | D-GAP-A / D-GAP-R RO — 재분석·row rewrite·신규 Gap 금지. |
| **PC-05** | Severity Lock Deferred 유지. |
| **PC-06** | Resolution Design / Change Design 작성 금지 (후속 IU/Phase). |
| **PC-07** | Catalog/Register on-disk JSON · Pin mint · Freeze Candidate live declaration 금지. |
| **PC-08** | Framework / Pipeline / STEP4·STEP5 Frozen / STEP6 Freeze surface informal edit 금지. |
| **PC-09** | NS-U1-001 / CL-001 / CV-001 reopen 금지. |
| **PC-10** | 다른 IU(`IU-4-03A` 이후) 내용 설계·대체 금지. |

---

## 4. Planning Assumptions

| ID | Assumption |
|----|------------|
| **PA-01** | P3 Gap Analysis는 **Complete**이며 VG-P3 **PASS**이다. |
| **PA-02** | D-GAP-A (13 clusters) ↔ D-GAP-R (13 `DGR-NNN`) **1:1**이 Plan 입력의 SSOT이다. |
| **PA-03** | High undocumented Gap = **0** (VG-P3). Plan은 이 전제 위에서 우선순위를 잡는다. |
| **PA-04** | Severity는 **Candidate only**이며, Plan은 Lock 없이도 진행 가능하다. |
| **PA-05** | P2 Catalog Freeze Design v0.15는 Design Complete이며, Freeze Candidate는 **아직 선언되지 않았다**. |
| **PA-06** | Architecture / Runtime은 Locked / RO이며, Standardization Apply는 별도 Change Design이 선행된다. |
| **PA-07** | KI-01…04는 DGR-001…004와 **대응**하며, disposition은 P4 Plan 이후 경로에서 다룬다. |
| **PA-08** | IU-4-01A Scope Specification (PASS)은 P4 Plan의 **유효 Scope SSOT**이다. |

---

## 5. Planning Rules

| ID | Rule |
|----|------|
| **PR-01** | Plan 문서는 **원칙·경계·우선순위 힌트**만 담는다. 패치·스키마 본문·실행 절차 상세는 담지 않는다. |
| **PR-02** | Gap 인용은 **`DGR-NNN` (+ optional `D-GAP-A-NNN`)** 만 사용한다. |
| **PR-03** | Plan이 Gap을 “해결했다”고 선언하지 않는다. 해결은 Resolution / Apply / Verification 경로에서만 선언한다. |
| **PR-04** | `resolutionClass` 후보값을 **참고 분류**로만 언급할 수 있다. enum Lock·row population은 하지 않는다. |
| **PR-05** | Pilot / Fleet / Re-validation 작업은 Plan에서 **위상만** 가리킨다. 배치·JSON·검증 실행은 해당 Phase IU에서 한다. |
| **PR-06** | Principles 변경이 필요하면 **새 Session**으로 개정한다. silent rewrite 금지. |
| **PR-07** | Scope(IU-4-01A)와 Principles(IU-4-02A)가 충돌하면 **Scope가 우선**한다. |
| **PR-08** | 본 IU 산출물은 Principles **단일**이다. D-PLAN 본문·Disposition 표·Change Design을 포함하지 않는다. |

---

## 6. Success Criteria

| # | Criterion |
|---|-----------|
| 1 | Planning Principles(PP)가 P4 = Planning only를 명확히 한다. |
| 2 | Standardization Principles(SP)가 Consume · Gap 추적 · Contract 보호 · Apply 선행조건을 포함한다. |
| 3 | Planning Constraints(PC)가 IU-4-01A Scope 및 Forbidden과 충돌하지 않는다. |
| 4 | Planning Assumptions(PA)가 P3 Complete / VG-P3 PASS / D-GAP SSOT / Candidate Severity를 전제로 한다. |
| 5 | Planning Rules(PR)가 Resolution / Change Design / Severity Lock / Register rewrite를 배제한다. |
| 6 | 산출물이 Principles **한 개**뿐이며, 다른 IU·Scope·D-PLAN 본문을 대체하지 않는다. |
| 7 | Runtime / System JSON / Register / Analysis에 대한 변경 지시가 없다. |

```text
IU-4-02A = Standardization Principles only
Status = Complete · Official · VG-P4 PASS
Scope authority = IU-4-01A (PASS)
```

---

*End of STEP7_P4_IU-4-02A_Standardization_Principles.md v1.0*
