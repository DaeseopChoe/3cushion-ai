# STEP7 P6 Fleet

## STEP7_P6_FLEET_BATCH1_01A
Fleet Batch 1 Entry / Scope Definition (Design-only)

```text
Document   : STEP7_P6_FLEET_BATCH1_01A.md
Version    : v0.1 (Draft)
Status     : Draft · Design-only · Fleet Entry
Date       : 2026-07-21
STEP       : STEP7 / Phase P6 Fleet
Session    : S7-P6-FLEET-BATCH1-01A
             (Decomposition §3 batch naming equivalent: S7-P6-IU-6-1-01A · batch N=1)
Batch      : Fleet Batch 1
Owner      : System Standardization / Fleet Execution
Type       : Fleet Entry (Session Opening) — Scope · Entry Gate · Batch Structure
Depends on : STEP7 P5 Suite (IU-5-01A…05A) · STEP7 P6 Apply Decision Suite (IU-6-01A…06A) ·
             WG-AI-001 (PASS) · P4 Standardization Plan Suite (IU-4-01A…08A) ·
             D-GAP-R (13 rows) · STEP7 Implementation Decomposition v1.0 · STEP6 Final Freeze v1.0
Rule       : Consume Only · No new Rule · No WG-AI-001 redefinition ·
             No Framework / Pipeline change · No Runtime / Registry / Loader / Contract change ·
             No System JSON change · No Apply · No Verification · No Git Commit / Push
Next       : STEP7_P6_FLEET_BATCH1_01B (Batch 1 Apply Candidate assembly plan — subsequent session)
```

---

## 0. Baseline

본 세션 작성 시점의 Baseline은 다음과 같으며, 본 문서는 이를 그대로 Consume하고 변경하지 않는다.

- STEP7 P5 Change Design **Complete** (IU-5-01A ~ IU-5-05A PASS)
- STEP7 P6 Apply Decision **Complete · Design-only** (IU-6-01A ~ IU-6-06A)
- WG-AI-001 **PASS** (Freeze Candidate · Consume)
- Architecture Workflow PASS · Architecture Locked
- Runtime Baseline `ec71ef9` **unchanged**
- Next Stage = **STEP7 P6 Fleet**

본 문서는 STEP7 P6 Fleet의 **첫 공식 세션**이며, Fleet 실행을 위한 Entry(Session Opening) 문서이다.
본 문서는 Design-only 범위이며, Apply / Verification / Runtime / System JSON 변경을 수행하지 않는다.

---

## 1. Document Purpose

본 문서는 STEP7 P6 Fleet의 진입(Entry)을 공식화하는 것을 목적으로 한다.

본 문서가 답하는 질문:

> "Fleet는 어떤 목적·위치·구조로 실행되며, Batch는 어떤 Entry Gate와 흐름으로 진행되는가?"

본 문서가 답하지 않는 질문:

- 각 Change Package를 **무엇으로** 설계·적용할 것인가 (Change Design / Apply 본문)
- 어떤 System JSON을 **어떻게** 수정할 것인가 (System JSON 변경)
- Verification을 **어떻게** 수행할 것인가 (Validation Rule / Procedure / Execution)

본 문서는 Fleet의 **Entry · Scope · Entry Gate · Batch 구조 · Target 선정 원칙**만 정의한다.
본 문서는 새로운 Rule을 정의하지 않으며, P4/P5/P6/WG-AI-001에서 확정된 규칙을 Consume·cite한다.

---

## 2. Fleet Entry

### 2.1 Fleet 목적 정의

Fleet는 STEP7 System Standardization을 **전체 System 모집단(38 systems)** 에 대해
표준 규칙에 따라 **실제로 적용(Apply)** 해 나가는 실행 단계이다.

Fleet는 P2~P6에서 정의된 설계·규칙·판정 프레임(Design-only)을
**Batch 단위의 실행 경로**로 인스턴스화하는 단계이며,
P6 Apply Decision Suite(IU-6-01A…06A)의 Apply Candidate → Decision → Verification Entry 흐름을
실제 대상 Gap/System에 대해 순차적으로 소비한다.

### 2.2 Fleet 위치

```text
STEP7 Scope / WBS / Implementation Decomposition (Approved)
        ↓
P2 Catalog Design (Complete)
        ↓
P3 Gap Analysis (Complete · VG-P3 PASS)
        ↓
P4 Standardization Plan (Complete · VG-P4 PASS)
        ↓
P5 Change Design (Complete · IU-5-01A…05A PASS)
        ↓
P6 Apply Decision (Complete · IU-6-01A…06A · Design-only)
        ↓
P6 Fleet  ← 본 문서 (STEP7_P6_FLEET_BATCH1_01A · Entry)
        ↓
P7 Validation
        ↓
P8 Freeze
```

### 2.3 Fleet 이후 Workflow

Fleet의 실행 흐름은 다음과 같다.

```text
P6 Fleet
   ↓
Batch
   ↓
Apply
   ↓
Verification
   ↓
P7
```

- **P6 Fleet** — Fleet Entry 및 Batch 실행 관리 단계 (본 문서가 Entry를 개시)
- **Batch** — Fleet를 나누어 실행하는 단위 (본 문서 §5 구조 정의)
- **Apply** — Batch의 Change Package를 실제 적용하는 단계 (본 문서 범위 아님 · 후속 세션)
- **Verification** — Apply 결과 검증 (본 문서 범위 아님 · P7 범위)
- **P7** — Validation Phase (Fleet 산출물 Consume)

---

## 3. Fleet Scope

### 3.1 이번 Batch(본 문서)에서 수행하는 것

| # | Item |
|---|------|
| 1 | Fleet Entry (목적 · 위치 · 이후 Workflow) 정의 |
| 2 | Fleet Scope (수행 / 미수행 경계) 정의 |
| 3 | Fleet Batch 구조 (Entry → Candidate → Package → Apply → Verification) 정의 |
| 4 | Fleet Entry Gate (Fleet 시작 조건) 정의 |
| 5 | Batch 1 Target 선정 원칙 정의 (DGR-010 추천 기록 수준) |
| 6 | Deliverables 및 MASTER / LOG / HANDOFF 반영 문안 (실제 반영은 하지 않음) |

### 3.2 이번 Batch(본 문서)에서 수행하지 않는 것

| # | Not performed |
|---|---------------|
| 1 | System JSON 수정 |
| 2 | Runtime 수정 |
| 3 | Registry 수정 |
| 4 | Loader 수정 |
| 5 | Contract / Framework / Pipeline 수정 |
| 6 | Change Design 본문 작성 |
| 7 | Resolution / Change Package / Impact Record / Apply Candidate 인스턴스 생성 |
| 8 | Apply 수행 · Apply 순서 결정 |
| 9 | Verification 수행 · Validation Rule / Procedure 작성 |
| 10 | Severity Lock |
| 11 | Git Commit / Push |

---

## 4. Fleet Entry Gate

Fleet가 시작(Entry)되기 위한 조건은 다음과 같다.
본 Gate는 새로운 판정 규칙을 정의하는 것이 아니라, 선행 산출물의 확정 상태를 Fleet 진입 조건으로 cite한다.

| ID | Entry Condition | 현재 상태 |
|----|-----------------|-----------|
| **FEG-01** | STEP7 P5 Change Design Complete (IU-5-01A…05A PASS) | ✅ 충족 |
| **FEG-02** | STEP7 P6 Apply Decision Complete (IU-6-01A…06A · Design-only) | ✅ 충족 |
| **FEG-03** | WG-AI-001 PASS (Impact / Risk / Review Level Source · Consume) | ✅ 충족 |
| **FEG-04** | Runtime Baseline unchanged (`ec71ef9`) | ✅ 충족 |
| **FEG-05** | P4 Standardization Plan Complete (VG-P4 PASS) · Planning 규칙 Consume 가능 | ✅ 충족 |
| **FEG-06** | D-GAP-R (13 rows) Consume 가능 (Gap SSOT · RO) | ✅ 충족 |
| **FEG-07** | Fleet Target 확정 (Batch 1 대상 · 본 문서 §6에서 원칙 정의, 확정은 후속) | ⏳ 원칙 정의 (확정은 후속 세션) |

**Gate 판정:** FEG-01 ~ FEG-06 충족. FEG-07은 본 문서에서 **선정 원칙**을 정의하고, Batch 1 Target의 실제 확정 및 Apply Candidate 조립은 후속 세션(BATCH1_01B 이후)에서 수행한다.

---

## 5. Fleet Batch 구조

Fleet는 Batch 단위로 진행한다. 각 Batch는 다음 흐름을 갖는다.

```text
Entry
   ↓
Candidate
   ↓
Package
   ↓
Apply
   ↓
Verification
```

| Stage | 이름 | 의미 (경로 정의만) | Source (Consume) |
|-------|------|--------------------|------------------|
| **Entry** | Batch Entry | Batch 대상·진입 조건 확인 (Fleet Entry Gate 충족 하에 Batch 개시) | 본 문서 §4 · Decomposition §2 Session Model |
| **Candidate** | Apply Candidate | 대상 Gap의 CP · IMP · Review Result · Resolution을 하나의 판단 단위로 조립 | P6 IU-6-02A (Apply Candidate) |
| **Package** | Change Package | Apply/Rollback/Validation Scope를 갖는 최소 실행 단위 | P5 IU-5-03A (Change Package) |
| **Apply** | Apply | Ready 판정된 Candidate에 대한 Apply Decision Outcome 및 실제 적용 | P6 IU-6-03A/04A/05A · (실행은 후속) |
| **Verification** | Verification | Apply 결과 검증 및 P7 인계 | P6 IU-6-06A (Verification Entry) → P7 |

**Batch 구조 원칙 (Consume · cite only):**

- 기본 분해 단위는 **1 Gap(`DGR-NNN`) → 1 Primary Change-Design path** 이다. (P4 IU-4-06A DR-03)
- **Design 단계와 Apply 단계는 분리**한다. Design 미통과 Apply 금지. (DR-06 · IU-4-05A TR-04/TR-07)
- **1 Batch / 1 primary responsibility** 원칙을 따른다. mega-Batch 금지. (DR-11)
- 횡단 Delivery(Catalog Freeze · Audit execution 등)는 Gap Design Batch와 **혼합하지 않고 cite로만 연결**한다. (DR-12 · DP-07)
- 각 Change Package는 **독립 Apply / Rollback / Validation Scope**를 갖는다. (IU-5-03A §3)
- 상태·전이 개념은 P6 정의를 Consume한다: Apply Candidate Lifecycle(Draft→Assembled→Ready→Consumed · IU-6-02A), Apply Readiness(Ready / Not Ready · IU-6-04A), Decision Outcome(Approved / Conditional / Deferred / Rejected · IU-6-05A).

---

## 6. Batch 1 Target 선정 원칙

본 문서에서는 실제 Apply 대상을 **확정하지 않으며**, 선정 원칙과 추천 대상 기록만 수행한다.

### 6.1 선정 원칙

| ID | 원칙 |
|----|------|
| **TSP-01** | Batch 1은 **저위험 · 단일 경계 · 명확한 Rollback**을 우선한다. |
| **TSP-02** | 대상은 D-GAP-R에 **이미 존재하는** `DGR-NNN` row만 사용한다. 신규 Gap 발명 금지. (IU-4-03A MR-02) |
| **TSP-03** | 대상은 `planningState = Plan-Include` 후보에 한정한다. Defer / Out은 Batch 대상 아님. (IU-4-05A E-06) |
| **TSP-04** | 대상은 System JSON / Package 경계에 국한되는 Gap을 우선한다. 횡단 Delivery Gap은 별도 트랙. (DR-12) |
| **TSP-05** | Candidate Severity는 **우선순위 힌트**로만 사용한다. Severity Lock을 수행하지 않는다. (IU-4-03A MR-05) |

### 6.2 추천 대상 기록 (Apply 결정 아님)

위 원칙에 따라 Batch 1의 **추천 대상**은 다음과 같이 기록한다.

| 항목 | 값 |
|------|-----|
| Recommended Gap | **DGR-010** |
| Title | Directory naming casing (`Plus_5_system`) |
| Severity Candidate | LowMedium |
| Scope | 단일 System (SYS-011) · Naming Convention |
| 추천 사유 | 단일 시스템 · 순수 naming · 명확한 Rollback (TSP-01 부합) |
| Disposition Category (hint only) | PD-08 `NamingNormalize` (IU-4-04A) |

**주의 (cite only · 결정 아님):** DGR-010은 디렉토리명 변경이 자동 등록 경로(`import.meta.glob`) 및 `systemId` canonical 경로와 연동될 수 있으므로,
실제 Apply Candidate 조립 시 WG-AI-001 Impact Dimension(특히 Runtime) 평가 결과에 따라 Review Level이 상향될 수 있다.
본 문서는 이를 **참조 메모로만** 기록하며, Impact 재계산·Apply 판단·Review는 수행하지 않는다.

**Apply 결정 상태:** **미결정 (Not decided).** 실제 Target 확정 및 Apply Candidate 조립은 후속 세션에서 수행한다.

---

## 7. Decision Log

| Decision | Statement |
|----------|-----------|
| **D-STEP7-P6-FLEET-01** | STEP7 P6 Fleet **Entry 개시** · 본 문서 = Fleet 첫 공식 세션 (Session Opening) |
| **D-STEP7-P6-FLEET-02** | 본 세션 = **Design-only** · System JSON / Runtime / Registry / Loader / Framework / Pipeline 변경 없음 |
| **D-STEP7-P6-FLEET-03** | Fleet는 **Batch 단위**로 진행 · Batch 흐름 = Entry → Candidate → Package → Apply → Verification |
| **D-STEP7-P6-FLEET-04** | Fleet Entry Gate = FEG-01…07 · FEG-01~06 충족 · FEG-07(Target 확정)은 원칙 정의 후 후속 확정 |
| **D-STEP7-P6-FLEET-05** | Batch 1 추천 대상 = **DGR-010** (기록 수준) · 실제 Apply 결정은 수행하지 않음 |
| **D-STEP7-P6-FLEET-06** | 본 문서는 P4/P5/P6/WG-AI-001을 **Consume Only** · 새로운 Rule 정의 없음 · WG / Framework / Pipeline 재정의 없음 |

---

## 8. Summary

STEP7 P6 Fleet의 첫 공식 세션으로서 Fleet Entry(Session Opening) 문서를 작성하였다.
본 문서는 Fleet의 목적 · 위치 · 이후 Workflow(P6 Fleet → Batch → Apply → Verification → P7)를 정의하고,
Fleet Scope(수행 / 미수행), Fleet Entry Gate(FEG-01…07), Fleet Batch 구조(Entry → Candidate → Package → Apply → Verification),
그리고 Batch 1 Target 선정 원칙(TSP-01…05 · 추천 대상 DGR-010 기록)을 정의하였다.

본 문서는 Design-only 범위이며, System JSON / Runtime / Registry / Loader / Framework / Pipeline 변경,
Apply, Verification, Git Commit / Push를 수행하지 않았다.
모든 선행 산출물(P4 / P5 / P6 Suite · WG-AI-001 · D-GAP-R)은 Consume Only로 사용하였으며,
새로운 Rule을 정의하거나 기존 규칙을 재정의하지 않았다.

---

## 9. Deliverables

| # | Deliverable | Form | 상태 |
|---|-------------|------|------|
| 1 | **STEP7_P6_FLEET_BATCH1_01A.md** (Fleet Entry 문서) | 본 문서 | **생성 (Draft)** |
| 2 | MASTER / LOG / HANDOFF 반영 문안 | §9.1 (아래) | **문안만 · 실제 반영 안 함** |

### 9.1 MASTER / LOG / HANDOFF 반영 문안 (실제 반영은 하지 않는다)

> 아래는 후속 SSOT 반영 세션에서 사용할 **제안 문안**이며, 본 세션에서는 어떤 운영 문서도 수정하지 않는다.

**PROJECT_MASTER_INDEX.md (제안 문안):**
- Current Stage: `STEP7 P6 Fleet — Batch 1 Entry (Design-only)`
- Next Session: `STEP7_P6_FLEET_BATCH1_01B` (Batch 1 Apply Candidate assembly plan)
- Note: `Fleet Entry 정의 완료 · Batch 구조/Entry Gate 확정 · Batch 1 추천 대상 = DGR-010 (Apply 미결정)`

**PROJECT_LOG_2026-07.md (제안 문안):**
- 항목 제목: `D-STEP7-P6-FLEET-01 — STEP7 P6 Fleet Entry · Batch 1 Scope Definition (Design-only)`
- Decision Log: 본 문서 §7 (D-STEP7-P6-FLEET-01…06)
- Status: `STEP7 P6 Fleet Entry Complete (Design-only) · Runtime unchanged · Batch 1 Target 원칙 정의`
- Next Session: `STEP7_P6_FLEET_BATCH1_01B`

**CURSOR_SESSION_HANDOFF.md (제안 문안):**
- Current Stage: `STEP7 P6 Fleet — Batch 1 Entry (Design-only)`
- Next Session: `STEP7_P6_FLEET_BATCH1_01B`
- Consume: `WG-AI-001 · P5 Suite · P6 Suite · P4 Suite · D-GAP-R (all RO)`
- Pending (carried): `Git Commit / Push` · `Batch 1 Target 확정` · `Fleet Entry(IU-5-06A 상당) 게이트 정합 확인`

---

## 10. Explicit Non-Outputs

본 세션에서 수행하지 않은 항목을 명시한다.

| Item | Status |
|------|--------|
| Runtime 변경 | **없음** (unchanged) |
| System JSON 변경 | **없음** |
| Registry / Loader / Contract 변경 | **없음** |
| Framework / Pipeline 변경 | **없음** |
| Change Design / Resolution / Change Package / Impact Record 인스턴스 생성 | **없음** |
| Apply Candidate 인스턴스 생성 · Apply 수행 | **없음** |
| Verification / Validation 수행 | **없음** (P7 범위) |
| Severity Lock | **없음** (Deferred 유지) |
| WG-AI-001 / P5 / P6 문서 수정 | **없음** (Consume Only) |
| MASTER / LOG / HANDOFF 실제 반영 | **없음** (문안만 제안) |
| Git Commit / Push | **없음** |

---

## 11. Next Session

**STEP7_P6_FLEET_BATCH1_01B** — Batch 1 Apply Candidate Assembly Plan

Objective

본 문서에서 정의한 Fleet Entry · Batch 구조 · Target 선정 원칙을 기준으로,
Batch 1 대상(추천: DGR-010)에 대한 Apply Candidate 조립 계획
(CP · IMP · Review Result · Resolution 인스턴스 생성 순서 · Ready 판정 기준)을 정의한다.

Next Session은

- WG-AI-001
- STEP7 P5 Suite (IU-5-01A…05A)
- STEP7 P6 Suite (IU-6-01A…06A)
- 본 문서 (STEP7_P6_FLEET_BATCH1_01A)
- D-GAP-R (DGR-010)

를 Consume하며, 새로운 Rule을 정의하지 않는다.
실제 Apply · Verification · System JSON 변경 · Git은 별도 후속 단계에서 수행한다.

---

*End of STEP7_P6_FLEET_BATCH1_01A.md v0.1 (Draft) — Fleet Entry · Design-only*
