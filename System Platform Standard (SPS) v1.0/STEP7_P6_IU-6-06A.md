# STEP7 P6 Apply Decision

## IU-6-06A
Verification Entry Definition

## 0. Baseline

본 IU 작성 시점의 Baseline은 다음과 같다.

- STEP7 P5 Complete (IU-5-01A ~ IU-5-05A PASS)
- WG-AI-001 PASS (Freeze Candidate)
- STEP7_P6_IU-6-01A Complete (Apply Decision Scope 정의)
- STEP7_P6_IU-6-02A Complete (Apply Candidate 정의)
- STEP7_P6_IU-6-03A Complete (Decision Criteria 정의)
- STEP7_P6_IU-6-04A Complete (Apply Readiness Review 정의)
- STEP7_P6_IU-6-05A Complete (Apply Decision Outcome 정의)
- Runtime Baseline unchanged
- Architecture Workflow PASS

본 IU는 STEP7_P6_IU-6-01A ~ IU-6-05A를 그대로 Consume하며,
기존 IU의 Scope를 재정의하지 않는다.

## 1. Verification Entry Definition

Verification Entry는 P6 Apply Decision의 최종 산출물을
Verification 단계(P7)로 전달하기 위한 진입 정의(Entry)이다.

Verification Entry는 Verification을 수행하는 개념이 아니다.

Verification Entry는 P6에서 정의된 모든 결과
(Apply Candidate · Decision Criteria · Apply Readiness · Apply Decision Outcome)를
P7 Verification이 사용할 수 있도록 인계(Handoff)하는 Design 개념이다.

Verification Entry는 다음을 만족하는 인계 정의이다.

- P6 산출물이 Verification 입력으로 사용 가능하도록 정리된다.
- Verification Package의 구성을 정의한다.
- P6 → P7 인계의 완전성(Completeness)을 표현한다.

Verification Entry는 인계(Handoff)만 정의하며,
Validation Rule, Validation Procedure, Validation Execution은 포함하지 않는다.

본 IU는 Design-only 범위이며, Verification을 수행하지 않는다.

## 2. Verification Entry Role

Verification Entry의 역할은 다음과 같다.

- P6 Apply Decision의 최종 산출물을 Verification 입력으로 정리한다.
- P6 → P7 인계 대상을 명시한다.
- Verification Package의 구성을 정의한다.
- P6 Completion Criteria와 종료 조건을 정의한다.

Verification Entry는 인계 단계이며,
Validation 자체(Rule · Procedure · Execution)를 포함하지 않는다.

Verification Entry는 WG-AI-001의 판정 결과와 P6 IU 산출물을 Consume하며,
해당 규칙과 산출물을 재정의하지 않는다.

Validation은 P7의 범위이며, 본 IU에서는 수행하지 않는다.

## 3. Verification Input

Verification Entry는 아래 P6 산출물을 인계 입력으로 사용한다.

### 3.1 Apply Candidate

- STEP7_P6_IU-6-02A에서 정의된 Apply Candidate이다.
- Verification 대상 단위로 인계된다.
- 본 IU는 Apply Candidate를 재정의하거나 수정하지 않는다.

### 3.2 Decision Criteria

- STEP7_P6_IU-6-03A에서 정의된 Decision Criteria이다.
- 판단 기준으로 인계된다.
- 본 IU는 Decision Criteria를 재정의하거나 수정하지 않는다.

### 3.3 Apply Readiness

- STEP7_P6_IU-6-04A에서 정의된 Apply Readiness이다.
- 입력 준비 상태(Ready / Not Ready)로 인계된다.
- 본 IU는 Apply Readiness를 재정의하거나 수정하지 않는다.

### 3.4 Apply Decision Outcome

- STEP7_P6_IU-6-05A에서 정의된 Apply Decision Outcome이다.
- 판단 결과(Apply Approved / Conditional / Deferred / Rejected)와
  Decision State(Pending / Decided / Recorded)로 인계된다.
- 본 IU는 Apply Decision Outcome을 재정의하거나 수정하지 않는다.

### 3.5 Supporting Reference

- WG-AI-001 (Impact / Risk / Review Level 판정 규칙 Source)
- P5-IU-5-05A (Architecture Review 결과)

위 항목은 참조로 인계하며, 수정하지 않는다.

## 4. Verification Package Definition

Verification Package는 P6 → P7 인계를 위해 정리되는 산출물 묶음이다.

Verification Package는 아래 구성 요소를 포함한다.

- Apply Candidate (IU-6-02A)
- Decision Criteria (IU-6-03A)
- Apply Readiness (IU-6-04A)
- Apply Decision Outcome (IU-6-05A)
- Apply Decision Scope (IU-6-01A) 참조
- WG-AI-001 판정 결과 참조
- P5-IU-5-05A Architecture Review 결과 참조

Verification Package는 P7 Validation이 사용할 수 있는 입력 묶음으로 정의되며,
Package 내 산출물의 내용과 상태는 변경하지 않는다.

본 IU는 Verification Package의 구성만 정의하며,
Package를 사용하는 Validation은 수행하지 않는다.

## 5. Verification Entry Completeness

Verification Entry Completeness는 P6 → P7 인계의 완전성 상태를 표현한다.

Verification Entry는 아래 조건을 모두 만족할 때 완전(Complete)한 것으로 본다.

- Verification Input(Apply Candidate · Decision Criteria · Apply Readiness ·
  Apply Decision Outcome)이 모두 존재한다.
- Apply Readiness가 Ready 상태로 인계 가능하다.
- Apply Decision Outcome이 Decided 이상(Decided / Recorded)으로 인계 가능하다.
- Verification Package 구성 요소 간 연결 관계가 유지된다.
- P6 산출물이 Verification 입력으로 사용 가능한 형태로 정리된다.

위 조건이 충족되지 않으면 Verification Entry는 불완전(Incomplete)한 것으로 본다.

Verification Entry Completeness는 인계의 완전성만 표현하며,
Validation 수행이나 결과를 의미하지 않는다.

본 IU는 Completeness 기준만 정의하며,
실제 인계 실행이나 Validation을 수행하지 않는다.

## 6. P6 Completion Criteria

P6 Apply Decision은 아래 조건을 모두 만족할 때 완료(Complete)된 것으로 본다.

- STEP7_P6_IU-6-01A (Apply Decision Scope)가 정의되어 있다.
- STEP7_P6_IU-6-02A (Apply Candidate)가 정의되어 있다.
- STEP7_P6_IU-6-03A (Decision Criteria)가 정의되어 있다.
- STEP7_P6_IU-6-04A (Apply Readiness Review)가 정의되어 있다.
- STEP7_P6_IU-6-05A (Apply Decision Outcome)가 정의되어 있다.
- STEP7_P6_IU-6-06A (Verification Entry)가 정의되어 있다.
- Verification Entry Completeness가 충족되어 있다.
- P6 전 구간에서 WG-AI-001 Consume 원칙이 유지되어 있다.
- P6 전 구간에서 Runtime / System JSON / WG / P5 미변경이 유지되어 있다.

위 조건이 충족되면 P6는 Design-only 완료 상태로 판단한다.

## 7. Workflow Position

Design → Apply → Verify Workflow에서 Verification Entry의 위치는 다음과 같다.

```text
Change Package (P5-IU-5-03A)
        ↓
Impact Analysis (P5-IU-5-04A)
        ↓
Architecture Review (P5-IU-5-05A)
        ↓
Apply Candidate (P6-IU-6-02A)
        ↓
Decision Criteria (P6-IU-6-03A)
        ↓
Apply Readiness (P6-IU-6-04A)
        ↓
Apply Decision (P6-IU-6-05A)
        ↓
Verification Entry (P6-IU-6-06A · 본 IU)
        ↓
P7 Validation (후속 · 본 IU 범위 아님)
```

- Change Package → Impact Analysis → Architecture Review 단계는 P5에서 완료되었다.
- Apply Candidate → Decision Criteria → Apply Readiness → Apply Decision 단계는
  P6-IU-6-02A ~ IU-6-05A에서 정의되었다.
- Verification Entry는 P6 산출물을 P7 Validation으로 인계하는
  P6의 마지막 정의 단계이다.
- P7 Validation은 Verification Entry 이후 단계이며,
  본 IU의 범위에 포함되지 않는다.

본 IU는 Workflow에서 Verification Entry의 위치를 정의할 뿐,
Validation을 수행하지 않는다.

## 8. Deliverables to P7 (Validation)

본 IU가 P7 Validation으로 전달하는 산출물은 다음과 같다.

- Verification Entry Definition
- Verification Entry Role
- Verification Input (Apply Candidate · Decision Criteria · Apply Readiness ·
  Apply Decision Outcome)
- Verification Package Definition
- Verification Entry Completeness 기준
- P6 Completion Criteria
- Verification Entry의 Workflow 위치

Next Stage

STEP7 P7 Validation

Objective

본 IU에서 인계한 Verification Package를 기준으로,
P7에서 Validation Rule · Validation Procedure · Validation Execution을
정의 및 수행한다.

P7은

- WG-AI-001
- STEP7_P6_IU-6-01A ~ IU-6-06A (P6 Apply Decision Suite)
- Verification Package

를 Consume한다.

P7은 P6 산출물을 재정의하지 않으며,
Validation Rule / Procedure / Execution은 P7의 범위에서 수행한다.
Fleet Apply, Runtime 변경, System JSON 변경은 본 IU 및 P6 범위가 아니다.
