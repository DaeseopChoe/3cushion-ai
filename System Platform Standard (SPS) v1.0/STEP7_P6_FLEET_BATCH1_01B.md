# STEP7 P6 Fleet

## STEP7_P6_FLEET_BATCH1_01B
Fleet Batch 1 — Apply Candidate Design (Design-only)

```text
Document   : STEP7_P6_FLEET_BATCH1_01B.md
Version    : v0.1 (Draft)
Status     : Draft · Design-only · Apply Candidate Design
Date       : 2026-07-21
STEP       : STEP7 / Phase P6 Fleet
Session    : S7-P6-FLEET-BATCH1-01B
             (Decomposition §3 batch naming equivalent: S7-P6-IU-6-1-01B · batch N=1)
Batch      : Fleet Batch 1
Owner      : System Standardization / Fleet Execution
Type       : Apply Candidate Design — Selection Criteria · Candidate List · Exclusions · Readiness (定義 only)
Depends on : STEP7_P6_FLEET_BATCH1_01A (Complete) · STEP7 P5 Suite (IU-5-01A…05A) ·
             STEP7 P6 Apply Decision Suite (IU-6-01A…06A) · WG-AI-001 (PASS) · D-GAP-R (13 rows)
Rule       : Consume Only · No new Rule · No WG-AI-001 redefinition ·
             No Framework / Pipeline change · No Runtime / Registry / Loader / Contract change ·
             No System JSON change · No Apply · No Verification · No Git Commit / Push
Next       : STEP7_P6_FLEET_BATCH1_01C (Batch 1 Change Design Entry — subsequent session)
```

---

## 0. Baseline

본 세션 작성 시점의 Baseline은 다음과 같으며, 본 문서는 이를 그대로 Consume하고 변경하지 않는다.

- **STEP7_P6_FLEET_BATCH1_01A Complete** (Fleet Entry · Batch 구조 · Entry Gate 확정)
- STEP7 P5 Change Design Complete (IU-5-01A ~ IU-5-05A PASS)
- STEP7 P6 Apply Decision Complete · Design-only (IU-6-01A ~ IU-6-06A)
- WG-AI-001 PASS (Freeze Candidate · Consume)
- Runtime Baseline `ec71ef9` **unchanged** · Architecture Locked
- Fleet Entry 확정 · Design-only 유지

본 문서는 STEP7 P6 Fleet **Batch 1의 두 번째 세션**이며,
Batch 1에서 다룰 **Apply Candidate를 설계(정의)** 하는 단계이다.
본 문서는 Design-only 범위이며, Apply / Verification / Runtime / System JSON 변경을 수행하지 않는다.

---

## 1. Document Purpose

본 문서의 목적은 Fleet Batch 1에서 실제 Apply를 수행하지 않고,
Batch 1에서 다룰 **Apply Candidate를 정의**하는 것이다.

본 문서가 답하는 질문:

> "Batch 1은 어떤 Gap을 Apply Candidate로 삼으며, 그 선정 기준·제외 기준·Readiness 조건은 무엇인가?"

본 문서가 답하지 않는 질문:

- Candidate를 **어떻게 해결**할 것인가 (Change Design 본문 · Resolution 설계)
- 어떤 System JSON을 **어떻게 수정**할 것인가 (System JSON 변경)
- Apply를 **언제·어떤 순서로** 수행할 것인가 (Apply Execution / Ordering)

본 문서는 Apply Candidate의 **선정 기준 · 목록 · 제외 대상 · Readiness 조건 정의**만 수행한다.
Apply Candidate 개념·구성·Lifecycle은 P6 IU-6-02A를 Consume하며 재정의하지 않는다.

---

## 2. Candidate 선정 기준 (Selection Criteria)

Apply Candidate 선정 기준은 사용자 요청 4개 축을 기준으로 정의하며,
01A의 Target 선정 원칙(TSP-01…05) 및 WG-AI-001 Impact Dimension을 Consume한다.
본 문서는 기준을 **정의**할 뿐, 각 Gap에 대한 Impact 재계산·Review·Lock을 수행하지 않는다.

| ID | 기준 | 의미 | Source (Consume) |
|----|------|------|------------------|
| **CSC-01** | 영향 범위 (Scope) | 대상 System / 파일 경계가 좁고 명확할수록 우선 | 01A TSP-01/04 · D-GAP-R `downstreamImpact` |
| **CSC-02** | Rollback 가능성 | Rollback 경로가 명확·검증 가능할수록 우선 | WG-AI-001 §3 Risk(Rollback) · IU-5-03A Rollback Strategy |
| **CSC-03** | Runtime 영향 | Runtime 실행 흐름 변경이 없을수록 우선 (있으면 Review Level 상향) | WG-AI-001 §1 Runtime Dimension · §2 Level Algorithm |
| **CSC-04** | 독립 적용 가능 여부 | 다른 Gap/Package 의존 없이 단독 Apply 가능할수록 우선 | IU-5-03A §3 (독립 Apply/Rollback) · IU-4-06A DP-06 |

**선정 판정 원칙 (cite only):**
- 4개 기준은 **선정 우선순위 힌트**로 사용하며, Overall Impact / Risk / Review Level의 최종 판정은 WG-AI-001 알고리즘을 통해 후속 단계(Change Design / Impact Analysis)에서 산출한다.
- Candidate Severity는 우선순위 힌트로만 사용하고 **Severity Lock을 수행하지 않는다.** (01A TSP-05 · IU-4-03A MR-05)

---

## 3. Batch 1 Candidate 목록

본 문서는 Batch 1 Candidate만 정리한다. 실제 Apply 결정은 하지 않는다.

### 3.1 우선 후보

| 항목 | 값 |
|------|-----|
| Candidate ID (design ref) | **AC-B1-01** |
| Recommended Gap | **DGR-010** |
| Title | Directory naming casing (`Plus_5_system`) |
| Target System | SYS-011 (`Plus_5_system` directory) |
| Severity Candidate | LowMedium (hint only) |
| Disposition Category (hint only) | PD-08 `NamingNormalize` (IU-4-04A) |
| Related Resolution | (pending — Change Design path에서 생성) |
| Lifecycle State (IU-6-02A) | **Draft** (구성 요소 미조립) |

### 3.2 선정 기준 대비 후보 이유 (기록 · Apply 결정 아님)

| 기준 | DGR-010 평가 (기록) |
|------|---------------------|
| CSC-01 영향 범위 | **단일 System(SYS-011)** · directory naming 경계로 국한 → 좁음 |
| CSC-02 Rollback | directory 리네임 되돌리기 명확 → 높음 |
| CSC-03 Runtime 영향 | naming이나 자동 등록 경로(`import.meta.glob`) · `systemId` canonical 경로와 연동 가능 → **후속 Impact Analysis에서 확인 필요** (참조 메모) |
| CSC-04 독립 적용 | 타 Gap 의존 없이 단독 Apply 후보 → 높음 |

**참조 메모 (cite only · 결정 아님):** CSC-03 사유로 DGR-010은 Impact Dimension(Runtime) 평가 결과에 따라 Review Level이 상향될 수 있다.
본 문서는 이를 참조로만 기록하며, Impact 재계산·Review·Apply 판단을 수행하지 않는다.

### 3.3 Candidate 구성 요소 (IU-6-02A Consume · 현재 상태)

Apply Candidate 성립을 위해 필요한 Required Input과 현재 상태를 기록한다.
(구성 요소의 실제 생성은 후속 Change Design 경로에서 수행한다.)

| 구성 요소 | Source | 현재 상태 |
|-----------|--------|-----------|
| Change Package (CP) | P5 IU-5-03A | **미생성** (pending) |
| Impact Analysis Record (IMP) | P5 IU-5-04A · WG-AI-001 | **미생성** (pending) |
| Review Result | P5 IU-5-05A | **미생성** (pending) |
| Related Resolution | P5 IU-5-02A | **미생성** (pending) |
| Related D-GAP | D-GAP-R (DGR-010) | ✅ 존재 (RO cite) |

> Candidate `AC-B1-01`은 현재 Lifecycle **Draft** 상태이다. Required Input(CP · IMP · Review · Resolution)이 모두 연결되면 **Assembled → Ready**로 전이 가능하다. (IU-6-02A Lifecycle · 본 문서는 전이를 수행하지 않음)

---

## 4. Candidate 제외 대상 (Exclusions)

이번 Batch(Batch 1)에서 제외하는 Gap과 사유를 기록한다. 제외는 "해결 불필요"가 아니라 **후속 Batch/트랙 이관**을 의미한다.

| Gap | Severity(후보) | 제외 사유 | 제외 유형 |
|-----|:---:|-----------|-----------|
| DGR-008 | High | anchors.json 부재 · 4개 System · Runtime 렌더 영향 → 영향 범위 큼 (CSC-01/03) | 후속 Batch |
| DGR-009 | MedHigh | identity/registration key 정합 · Runtime 등록 경로 영향 → 독립성 낮음 (CSC-03/04) | 후속 Batch |
| DGR-011 | Med | Loader eager anchors 제외 · **Runtime 경계** 직접 관여 (CSC-03) | 후속 Batch (Runtime 검토 필요) |
| DGR-012 | MedHigh | metadata shape 비균일 · **38개 전체** → 광범위 (CSC-01) | 후속 Batch (대규모) |
| DGR-013 | Med | non-canonical 37/38 · **광범위 정렬** (CSC-01) | 후속 Batch (대규모) |
| DGR-001 | High | family enum mismatch · Validation/schema 연동 → 단독 naming 아님 (CSC-04) | 후속 Batch |
| DGR-002 | MedHigh | Frozen Catalog/Register JSON delivery · **횡단 Delivery** (DR-12) | 별도 Delivery 트랙 |
| DGR-004 | Med | NS/CL/CV Freeze delivery 잔여 · **횡단 Delivery** (DR-12) | 별도 Delivery 트랙 |
| DGR-007 | High | STEP5 Audit 실행 패키지 부재 · **횡단 (STEP5)** (DR-12) | 별도 Audit 트랙 |
| DGR-005 | LowMed | Full Validation Target Set 확장 · **P7 검증 연동** | P7 연동 |
| DGR-003 | Med | L7 Semantic Deferred · **Policy 승격** (PD-04) | Policy 트랙 |
| DGR-006 | Low | Report Export SSOT · **Ops** (PD-12) | Ops 트랙 |

**제외 원칙 (cite only):** 제외 Gap은 D-GAP-R에 그대로 유지되며(RO), 본 문서는 어떤 Gap의 status/severity/resolution도 변경하지 않는다. 후속 Batch/트랙 배정은 별도 세션에서 확정한다.

---

## 5. Apply Readiness (조건 정리 only · 실행 없음)

후속 단계(Apply Decision)에서 Candidate가 **Ready**로 판정되기 위해 필요한 조건만 정리한다.
본 문서는 IU-6-04A(Apply Readiness)를 Consume하며, Readiness 판정을 **실행하지 않는다.**

### 5.1 Readiness Check Item (IU-6-04A Consume)

| # | Check Item | AC-B1-01 현재 |
|---|------------|:---:|
| 1 | Apply Candidate가 Required Input(CP · IMP · Review · Resolution)을 충족하는가 | ❌ (pending) |
| 2 | Apply Candidate Lifecycle이 Ready 상태인가 | ❌ (Draft) |
| 3 | Decision Criteria의 Required Criteria가 모두 존재하는가 (IU-6-03A) | ❌ (pending) |
| 4 | Architecture Review 결과(Review Decision · Status)가 존재하는가 | ❌ (pending) |
| 5 | Candidate ↔ Criteria 연결 관계가 유지되는가 | ❌ (pending) |

### 5.2 현재 Readiness 상태

- **AC-B1-01 현재 상태 = Not Ready** (Required Input 미충족 · Lifecycle Draft)
- Ready 전이는 CP · IMP · Review · Resolution 인스턴스가 후속 Change Design 경로에서 생성된 이후에만 가능하다.
- 본 문서는 상태 전이(Transition)나 Ready/Not Ready 판정을 **수행하지 않는다.** (조건 정리만)

---

## 6. Decision Log

| Decision | Statement |
|----------|-----------|
| **D-STEP7-P6-FLEET-B1-01B-01** | Batch 1 Apply Candidate **설계(정의)** 수행 · Apply 미실행 · Design-only |
| **D-STEP7-P6-FLEET-B1-01B-02** | Candidate 선정 기준 = CSC-01…04 (영향 범위 · Rollback · Runtime 영향 · 독립 적용) |
| **D-STEP7-P6-FLEET-B1-01B-03** | Batch 1 우선 후보 = **AC-B1-01 (DGR-010)** · Lifecycle Draft · Apply 결정 없음 |
| **D-STEP7-P6-FLEET-B1-01B-04** | 제외 Gap = DGR-001/002/003/004/005/006/007/008/009/011/012/013 · 후속 Batch/트랙 이관 (D-GAP-R 미변경) |
| **D-STEP7-P6-FLEET-B1-01B-05** | AC-B1-01 현재 **Not Ready** · Readiness 조건만 정리 · 판정 미실행 |
| **D-STEP7-P6-FLEET-B1-01B-06** | 01A · P5 · P6 · WG-AI-001 · D-GAP-R **Consume Only** · 새 Rule / WG / Framework / Pipeline 변경 없음 |

---

## 7. Summary

Fleet Batch 1의 Apply Candidate 설계 세션으로서, Batch 1에서 다룰 Apply Candidate를 정의하였다.
Candidate 선정 기준(CSC-01…04)을 정의하고, Batch 1 우선 후보를 **AC-B1-01 (DGR-010 · `Plus_5_system` naming)** 로 기록하였으며,
선정 기준 대비 후보 이유와 구성 요소(CP · IMP · Review · Resolution) 현재 상태(모두 pending · Lifecycle Draft)를 정리하였다.
Batch 1에서 제외하는 12개 Gap과 사유(후속 Batch / 횡단 Delivery / Audit / Policy / Ops / P7 연동)를 기록하였고,
Apply Readiness Check Item과 현재 상태(**Not Ready**)를 조건 수준으로만 정리하였다.

본 문서는 Design-only 범위이며, System JSON / Runtime / Registry / Loader / Framework / Pipeline 변경,
Apply, Verification, Git Commit / Push를 수행하지 않았다.
모든 선행 산출물(01A · P5 / P6 Suite · WG-AI-001 · D-GAP-R)은 Consume Only로 사용하였으며,
새로운 Rule을 정의하거나 기존 규칙을 재정의하지 않았다.

---

## 8. Deliverables

| # | Deliverable | Form | 상태 |
|---|-------------|------|------|
| 1 | Candidate 선정 기준 (CSC-01…04) | 본 문서 §2 | **정의 완료** |
| 2 | Batch 1 Candidate 정의 (AC-B1-01) | 본 문서 §3 | **정의 완료** |
| 3 | Batch 1 Candidate 목록 · 제외 대상 | 본 문서 §3 / §4 | **정리 완료** |
| 4 | Apply Readiness 조건 (IU-6-04A Consume) | 본 문서 §5 | **조건 정리** (판정 미실행) |
| 5 | **STEP7_P6_FLEET_BATCH1_01B.md** | 본 문서 | **생성 (Draft)** |

> MASTER / LOG / HANDOFF 실제 반영은 본 세션에서 수행하지 않는다.

---

## 9. Explicit Non-Outputs

| Item | Status |
|------|--------|
| Runtime 변경 | **없음** (unchanged) |
| System JSON 변경 | **없음** |
| Registry / Loader / Contract 변경 | **없음** |
| Framework / Pipeline 변경 | **없음** |
| Change Design / Resolution / Change Package / Impact Record 인스턴스 생성 | **없음** |
| Apply Candidate 실제 조립(Assembled/Ready 전이) · Apply 수행 | **없음** (Draft 유지) |
| Apply Readiness 판정 · Apply Decision | **없음** (조건 정리만) |
| Verification / Validation 수행 | **없음** (P7 범위) |
| Severity Lock | **없음** (Deferred 유지) |
| D-GAP-R row 변경 (status / severity / resolution) | **없음** (RO) |
| WG-AI-001 / P5 / P6 / 01A 문서 수정 | **없음** (Consume Only) |
| MASTER / LOG / HANDOFF 실제 반영 | **없음** |
| Git Commit / Push | **없음** |

---

## 10. Next Session

**STEP7_P6_FLEET_BATCH1_01C** — Batch 1 Change Design Entry

Objective

본 문서에서 정의한 Batch 1 Candidate(AC-B1-01 · DGR-010)를 기준으로,
Change Design Entry Gate(IU-4-05A W2) 통과 여부를 검토하고,
Change Package / Resolution / Impact Analysis Record 조립 경로를 개시한다.

Next Session은

- WG-AI-001
- STEP7 P5 Suite (IU-5-01A…05A)
- STEP7 P6 Suite (IU-6-01A…06A)
- STEP7_P6_FLEET_BATCH1_01A · 01B (본 문서)
- D-GAP-R (DGR-010)

를 Consume하며, 새로운 Rule을 정의하지 않는다.
실제 Apply · Verification · System JSON 변경 · Git은 별도 후속 단계에서 수행한다.

---

*End of STEP7_P6_FLEET_BATCH1_01B.md v0.1 (Draft) — Apply Candidate Design · Design-only*
