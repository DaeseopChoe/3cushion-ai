# STEP7 P6 Fleet

## STEP7_P6_FLEET_BATCH1_01C
Fleet Batch 1 — Change Design Entry (Design-only)

```text
Document   : STEP7_P6_FLEET_BATCH1_01C.md
Version    : v0.1 (Draft)
Status     : Draft · Design-only · Change Design Entry
Date       : 2026-07-21
STEP       : STEP7 / Phase P6 Fleet
Session    : S7-P6-FLEET-BATCH1-01C
             (Decomposition §3 batch naming equivalent: S7-P6-IU-6-1-01C · batch N=1)
Batch      : Fleet Batch 1
Owner      : System Standardization / Fleet Execution
Type       : Change Design Entry — Scope · Workflow · Target · Design Readiness (定義 only)
Depends on : STEP7_P6_FLEET_BATCH1_01A (Complete) · STEP7_P6_FLEET_BATCH1_01B (Complete) ·
             STEP7 P5 Suite (IU-5-01A…05A) · STEP7 P6 Apply Decision Suite (IU-6-01A…06A) ·
             WG-AI-001 (PASS) · P4 IU-4-05A Change Design Workflow · D-GAP-R (DGR-010)
Rule       : Consume Only · No new Rule · No WG-AI-001 redefinition ·
             No Framework / Pipeline change · No Runtime / Registry / Loader / Contract change ·
             No System JSON change · No Change Package creation · No Apply · No Verification · No Git
Next       : STEP7_P6_FLEET_BATCH1_01D (Batch 1 Change Design Authoring — subsequent session)
```

---

## 0. Baseline

본 세션 작성 시점의 Baseline은 다음과 같으며, 본 문서는 이를 그대로 Consume하고 변경하지 않는다.

- **STEP7_P6_FLEET_BATCH1_01A Complete** (Fleet Entry · Batch 구조 · Entry Gate)
- **STEP7_P6_FLEET_BATCH1_01B Complete** (Apply Candidate Design · AC-B1-01 · Draft / Not Ready)
- STEP7 P5 Change Design Complete (IU-5-01A ~ IU-5-05A PASS)
- STEP7 P6 Apply Decision Complete · Design-only (IU-6-01A ~ IU-6-06A)
- WG-AI-001 PASS (Freeze Candidate · Consume)
- Runtime Baseline `ec71ef9` **unchanged** · Architecture Locked · Design-only 유지

본 문서는 STEP7 P6 Fleet **Batch 1의 세 번째 세션**이며,
Batch 1 Apply Candidate(AC-B1-01)를 **실제 변경이 가능한 Change Design 단계로 연결**하기 위한 Entry 문서이다.
본 문서는 Change Design의 **범위·절차·착수 조건**을 정의하며, 실제 변경(Apply)은 수행하지 않는다.

---

## 1. Document Purpose

본 문서의 목적은 Batch 1 Apply Candidate를 Change Design 단계로 연결하기 위한
**Change Design Entry**를 정의하는 것이다.

본 문서가 답하는 질문:

> "Batch 1 Change Design은 어떤 범위·Workflow·착수 조건으로 진입하는가?"

본 문서가 답하지 않는 질문:

- Candidate를 **무엇으로 어떻게 변경**할 것인가 (Change Design 본문 · W3 Authoring)
- 어떤 System JSON / directory를 **어떻게 수정**할 것인가 (System JSON 변경)
- Apply를 **언제·어떤 절차로** 수행할 것인가 (Apply Execution)

본 문서는 Change Design **Entry(진입 단계)** 만 정의한다.
Change Design Workflow(W0…W5)와 Entry Gate는 P4 IU-4-05A를 Consume하며 재정의하지 않는다.

---

## 2. Change Design Scope

본 세션 Change Design Entry가 다루는 범위를 경계 수준으로 정의한다.
실제 변경 내용(패치·JSON path·리네임 절차)은 본 문서에 기입하지 않는다. (IU-4-05A WC-04)

### 2.1 대상 (Target)

| 항목 | 값 |
|------|-----|
| Candidate | **AC-B1-01** (STEP7_P6_FLEET_BATCH1_01B) |
| Gap | **DGR-010** (Directory naming casing · `Plus_5_system`) |
| Target System | SYS-011 (`Plus_5_system` directory) |
| Disposition Category (hint only) | PD-08 `NamingNormalize` (IU-4-04A) |

### 2.2 변경 범위 (In-Design Boundary)

| # | 범위 (경계 수준) |
|---|------------------|
| 1 | SYS-011 directory naming convention 정합 (casing) 경계 |
| 2 | naming 변경에 수반되는 참조 정합성의 **영향 식별 대상**(자동 등록·`systemId` canonical 경로 등)을 Change Design/Impact Analysis에서 다룰 범위로 표기 |

> §2.2는 **다룰 범위(경계)** 만 표기한다. 실제 리네임 방식·대상 파일 목록·패치는 W3 Change Design Authoring에서 작성한다.

### 2.3 변경 제외 범위 (Out-of-Design Boundary)

| # | 제외 범위 |
|---|-----------|
| 1 | `profile.json` / `anchors.json` / `logic.json` / `system_meta.json` **내용** 변경 |
| 2 | Runtime 실행 로직 · 계산/궤적 엔진 변경 |
| 3 | Registry / Loader / Contract **구조** 변경 |
| 4 | Framework / Pipeline / STEP6 Freeze surface 변경 |
| 5 | 타 Gap(DGR-001/002/003/004/005/006/007/008/009/011/012/013) 처리 |
| 6 | Severity Lock · D-GAP-R row 변경 |

**참조 메모 (cite only · 결정 아님):** DGR-010은 directory naming이 자동 등록 경로(`import.meta.glob`) 및 `systemId` canonical 경로와 연동될 수 있어(01B CSC-03), Runtime Dimension 평가 결과에 따라 Review Level이 상향될 수 있다. 본 문서는 이를 참조로만 기록하며, Impact 재계산·Review·Apply를 수행하지 않는다.

---

## 3. Change Design Workflow

Batch 1 Change Design의 Workflow는 다음과 같으며, IU-4-05A(W0…W5)를 Consume한다.

```text
Candidate
   ↓
Change Design
   ↓
Review
   ↓
Package
   ↓
Apply        ← 이번 문서에서 수행하지 않음
```

| Stage | 이름 | 의미 (경로 정의만) | Source (Consume) |
|-------|------|--------------------|------------------|
| **Candidate** | Apply Candidate | AC-B1-01 (DGR-010) 입력 단위 | 01B · IU-6-02A |
| **Change Design** | Change Design Authored | Change Design 산출물이 작성되는 단계 (본문 = W3 · 본 문서 밖) | IU-4-05A W3 |
| **Review** | Change Design Review Gate | Change Design Review PASS/FAIL 판정 | IU-4-05A W4 |
| **Package** | Change Package | Apply/Rollback/Validation Scope를 갖는 실행 단위 구성 | IU-5-03A |
| **Apply** | Apply | Ready 판정 후 실제 적용 (본 문서 범위 아님) | IU-6-03A/04A/05A |

**Workflow 원칙 (Consume · cite only):**
- Stage skip 금지 (Candidate→Package, Candidate→Apply 등 우회 금지). (IU-4-05A TR-10)
- Review Gate FAIL 시 Apply 금지 · Change Design 재작성(W3)만 허용. (IU-4-05A TR-08)
- 전이 단위는 `DGR-NNN` 단건 Primary path. (IU-4-05A TR-12 · IU-4-06A DR-03)
- 본 Workflow PASS가 Change Design PASS / Apply PASS를 의미하지 않는다. (IU-4-05A WC-12)

---

## 4. 대상 (Design Target)

본 세션의 설계 대상은 Batch 1 Candidate 단건이며, 대상 정의만 수행한다.

| 항목 | 값 |
|------|-----|
| Design Target | **AC-B1-01 (DGR-010)** |
| Target System | SYS-011 (`Plus_5_system`) |
| Candidate Lifecycle (현재) | **Draft** (01B 기준 · 구성 요소 pending) |
| Change Design 진입 형태 | 단건 `DGR-NNN` Primary path (IU-4-05A TR-12) |

> 본 문서는 대상 정의만 수행하며, Change Design 본문 작성 · Change Package 생성 · Apply를 수행하지 않는다.

---

## 5. Design Readiness

Change Design 착수(W2 Entry Gate 통과) 조건을 검토 항목 수준으로 정의한다.
본 문서는 IU-4-05A의 Entry Conditions(E-01…E-09) 및 Entry Gate checklist(G1…G5)를 Consume하며, **판정을 실행하지 않는다.**

### 5.1 Entry Condition 검토 항목 (IU-4-05A E-01…E-09 Consume)

| ID | 조건 | 현재 (검토 항목) |
|----|------|:---:|
| E-01…E-04 | P4 Scope / Principles / Mapping / Taxonomy = PASS | ✅ 충족 |
| E-05 | Target Gap이 D-GAP-R에 존재 (`DGR-010`) | ✅ 충족 |
| E-06 | `planningState = Plan-Include` (Defer/Out 아님) | ⏳ 확인 필요 (Mapping population 후속) |
| E-07 | `dispositionCategory` Primary 지정 가능 (PD-08 hint) | ⏳ 확인 필요 |
| E-08 | Runtime / System JSON / Register / Analysis 선행 무단 변경 없음 | ✅ 충족 |
| E-09 | Severity Lock 요구하지 않음 (Candidate hint로 진입 가능) | ✅ 충족 |

### 5.2 Entry Gate Checklist (IU-4-05A W2 · G1…G5 Consume)

| Check | PASS 조건 | 현재 |
|-------|-----------|:---:|
| G1 | `planningState = Plan-Include` | ⏳ pending |
| G2 | `dispositionCategory ∈ PD-01…PD-14` | ⏳ pending (PD-08 hint) |
| G3 | Planning Package items present as cites | ⏳ pending |
| G4 | 이 Gate에서 Resolution/Change Design 본문 불요 | ✅ 충족 |
| G5 | Plan 단독으로 Runtime/System JSON mutation 요구 없음 | ✅ 충족 |

### 5.3 현재 Design Readiness 상태

- **AC-B1-01 Change Design Entry = 검토 단계** (E-01…05/08/09 충족 · E-06/07 및 G1…G3은 후속 Planning Package/Candidate 조립 후 확정)
- Change Design Authoring(W3) 착수는 W2 Entry Gate PASS 이후에만 가능하다.
- 본 문서는 착수 조건을 **검토 항목으로 정리**할 뿐, Entry Gate 판정·Change Design 본문 작성을 수행하지 않는다.

---

## 6. Decision Log

| Decision | Statement |
|----------|-----------|
| **D-STEP7-P6-FLEET-B1-01C-01** | Batch 1 Change Design **Entry 정의** 수행 · Change Design 본문/Apply 미실행 · Design-only |
| **D-STEP7-P6-FLEET-B1-01C-02** | Change Design Scope = 대상 AC-B1-01(DGR-010) · 변경 범위(naming 경계) · 제외 범위 정의 |
| **D-STEP7-P6-FLEET-B1-01C-03** | Change Design Workflow = Candidate → Change Design → Review → Package → Apply (IU-4-05A Consume · Apply 미수행) |
| **D-STEP7-P6-FLEET-B1-01C-04** | Design Target = AC-B1-01 단건 `DGR-NNN` Primary path · Candidate Lifecycle Draft |
| **D-STEP7-P6-FLEET-B1-01C-05** | Design Readiness = E-01…09 / G1…G5 검토 항목 정리 · 판정 미실행 (E-06/07·G1…G3 pending) |
| **D-STEP7-P6-FLEET-B1-01C-06** | 01A · 01B · P5 · P6 · WG-AI-001 · D-GAP-R **Consume Only** · 새 Rule / WG / Framework / Pipeline 변경 없음 |

---

## 7. Summary

Fleet Batch 1의 Change Design Entry 세션으로서, Batch 1 Apply Candidate(AC-B1-01 · DGR-010)를
Change Design 단계로 연결하기 위한 진입 문서를 작성하였다.
Change Design Scope(대상 · 변경 범위(naming 경계) · 변경 제외 범위)를 정의하고,
Change Design Workflow(Candidate → Change Design → Review → Package → Apply · IU-4-05A Consume)를 정리하였으며,
Design Target(AC-B1-01 단건 path)과 Design Readiness(Entry Condition E-01…09 · Entry Gate G1…G5 검토 항목)를 정의하였다.

본 문서는 Design-only 범위이며, System JSON / Runtime / Registry / Loader / Framework / Pipeline 변경,
Change Package 생성, Apply, Verification, Git Commit / Push를 수행하지 않았다.
모든 선행 산출물(01A · 01B · P5 / P6 Suite · WG-AI-001 · D-GAP-R)은 Consume Only로 사용하였으며,
새로운 Rule을 정의하거나 기존 규칙을 재정의하지 않았다.

---

## 8. Deliverables

| # | Deliverable | Form | 상태 |
|---|-------------|------|------|
| 1 | Change Design Entry 정의 | 본 문서 §1 | **정의 완료** |
| 2 | Change Design Scope (대상 · 범위 · 제외) | 본 문서 §2 | **정의 완료** |
| 3 | Change Design Workflow | 본 문서 §3 | **정리 완료** |
| 4 | Design Target (AC-B1-01) | 본 문서 §4 | **정의 완료** |
| 5 | Design Readiness (검토 항목) | 본 문서 §5 | **정리 완료** (판정 미실행) |
| 6 | **STEP7_P6_FLEET_BATCH1_01C.md** | 본 문서 | **생성 (Draft)** |

> MASTER / LOG / HANDOFF 실제 반영은 본 세션에서 수행하지 않는다.

---

## 9. Explicit Non-Outputs

| Item | Status |
|------|--------|
| Runtime 변경 | **없음** (unchanged) |
| System JSON 변경 | **없음** |
| Registry / Loader / Contract 변경 | **없음** |
| Framework / Pipeline 변경 | **없음** |
| Change Design 본문 작성 (W3) | **없음** (Entry만) |
| Change Package 생성 | **없음** |
| Resolution / Impact Record 인스턴스 생성 | **없음** |
| Apply Candidate 전이 (Assembled/Ready) · Apply 수행 | **없음** (Draft 유지) |
| Entry Gate 판정 · Review · Apply Decision | **없음** (검토 항목만) |
| Verification / Validation 수행 | **없음** (P7 범위) |
| Severity Lock | **없음** (Deferred 유지) |
| D-GAP-R row 변경 | **없음** (RO) |
| WG-AI-001 / P5 / P6 / 01A / 01B 문서 수정 | **없음** (Consume Only) |
| MASTER / LOG / HANDOFF 실제 반영 | **없음** |
| Git Commit / Push | **없음** |

---

## 10. Next Session

**STEP7_P6_FLEET_BATCH1_01D** — Batch 1 Change Design Authoring (W3)

Objective

본 문서에서 정의한 Change Design Scope · Workflow · Design Readiness를 기준으로,
Entry Gate(W2) PASS 조건 충족 시 Change Design 산출물(Change Package / Resolution / Impact Analysis Record)을
작성(W3)한다.

Next Session은

- WG-AI-001
- STEP7 P5 Suite (IU-5-01A…05A)
- STEP7 P6 Suite (IU-6-01A…06A)
- STEP7_P6_FLEET_BATCH1_01A · 01B · 01C (본 문서)
- D-GAP-R (DGR-010)

를 Consume하며, 새로운 Rule을 정의하지 않는다.
실제 Apply · Verification · System JSON 변경 · Git은 별도 후속 단계에서 수행한다.

---

*End of STEP7_P6_FLEET_BATCH1_01C.md v0.1 (Draft) — Change Design Entry · Design-only*
