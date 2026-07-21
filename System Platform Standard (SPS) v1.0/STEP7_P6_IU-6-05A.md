# STEP7 P6 Apply Decision

## IU-6-05A
Apply Decision Outcome Definition

## 0. Baseline

본 IU 작성 시점의 Baseline은 다음과 같다.

- STEP7 P5 Complete (IU-5-01A ~ IU-5-05A PASS)
- WG-AI-001 PASS (Freeze Candidate)
- STEP7_P6_IU-6-01A Complete (Apply Decision Scope 정의)
- STEP7_P6_IU-6-02A Complete (Apply Candidate 정의)
- STEP7_P6_IU-6-03A Complete (Decision Criteria 정의)
- STEP7_P6_IU-6-04A Complete (Apply Readiness Review 정의)
- Runtime Baseline unchanged
- Architecture Workflow PASS

본 IU는 STEP7_P6_IU-6-01A ~ IU-6-04A를 그대로 Consume하며,
기존 IU의 Scope를 재정의하지 않는다.

## 1. Apply Decision Definition

Apply Decision은 Apply Readiness를 통과한 입력에 대해
어떤 판단 결과(Decision Outcome)를 표현할 것인가를 정의하는 개념이다.

Apply Decision은 Apply를 수행하는 개념이 아니다.

Apply Decision은 Apply Readiness Review에서 Ready로 확인된 입력
(Apply Candidate · Decision Criteria)에 대해,
표현 가능한 판단 결과(Decision Outcome)와 상태(Decision State)를
정의하는 Design 개념이다.

Apply Decision은 다음을 만족하는 판단 결과 정의이다.

- Apply Readiness가 Ready인 입력을 대상으로 한다.
- Decision Criteria를 기준으로 도출되는 결과 유형을 정의한다.
- Decision Outcome과 Decision State를 명시한다.

Apply Decision은 판단 결과(Outcome)와 상태(State)만 정의하며,
판단 절차(Apply Decision Algorithm)나 Apply 실행(Apply Execution)을 포함하지 않는다.

본 IU는 Design-only 범위이며, 실제 Apply를 수행하지 않는다.

## 2. Apply Decision Role

Apply Decision의 역할은 다음과 같다.

- Apply Readiness를 통과한 입력에 대한 판단 결과를 표현한다.
- Decision Outcome(결과 유형)을 정의한다.
- Decision State(상태)를 정의한다.
- Apply Decision 결과가 후속 단계(Verification)로 전달되는 기준을 정의한다.

Apply Decision은 판단 결과를 표현하는 단계이며,
Apply Decision Algorithm(판단 절차), Apply Procedure, Apply Execution을 포함하지 않는다.

Apply Decision은 WG-AI-001의 Impact / Risk / Review Level 판정 결과와
Decision Criteria를 Consume하며, 해당 규칙과 기준을 재정의하지 않는다.

Decision Outcome은 판단 결과의 표현이며,
실제 변경 적용(Apply Execution)과 혼동하지 않는다.

## 3. Decision Input

Apply Decision은 아래 입력을 대상으로 사용한다.

### 3.1 Apply Candidate

- STEP7_P6_IU-6-02A에서 정의된 Apply Candidate이다.
- Decision Outcome이 대상으로 삼는 판단 단위이다.
- 본 IU는 Apply Candidate를 재정의하거나 수정하지 않는다.

### 3.2 Decision Criteria

- STEP7_P6_IU-6-03A에서 정의된 Decision Criteria이다.
- Decision Outcome을 표현하기 위한 판단 기준으로 사용한다.
- 본 IU는 Decision Criteria를 재정의하거나 수정하지 않는다.

### 3.3 Apply Readiness

- STEP7_P6_IU-6-04A에서 정의된 Apply Readiness이다.
- Apply Decision은 Ready 상태의 입력만 대상으로 한다.
- Not Ready 상태의 입력은 Apply Decision 대상이 아니다.
- 본 IU는 Apply Readiness를 재정의하거나 수정하지 않는다.

### 3.4 Supporting Reference

- WG-AI-001 (Impact / Risk / Review Level 판정 규칙 Source)
- P5-IU-5-05A (Architecture Review 결과)

위 항목은 참조로 사용하며, 수정하지 않는다.

## 4. Decision Outcome Definition

Apply Decision은 아래 Decision Outcome(결과 유형)을 사용한다.

- Apply Approved
  - Apply Candidate가 Apply 대상으로 승인 가능함을 표현하는 결과.

- Apply Conditional
  - 조건을 만족해야 Apply 대상이 될 수 있음을 표현하는 결과.

- Apply Deferred
  - Apply 판단을 후속 단계로 보류함을 표현하는 결과.

- Apply Rejected
  - Apply 대상으로 승인되지 않음을 표현하는 결과.

각 Decision Outcome은 판단 결과의 표현이며,
Apply 실행(Apply Execution)을 의미하지 않는다.

본 IU는 Decision Outcome의 의미(정의)만 기술하며,
Outcome을 도출하는 판단 절차(Algorithm)는 정의하지 않는다.

## 5. Decision State Definition

Apply Decision은 판단 결과의 표현 상태(Decision State)를 다음과 같이 정의한다.

```text
Pending
  ↓
Decided
  ↓
Recorded
```

- Pending
  - Apply Decision 대상 입력이 확인되었으나 Decision Outcome이 표현되지 않은 상태.

- Decided
  - Decision Outcome(Apply Approved / Conditional / Deferred / Rejected)이
    표현된 상태.

- Recorded
  - Decision Outcome이 후속 단계로 전달 가능한 형태로 정리된 상태.

Decision State는 판단 결과의 표현 상태만 나타내며,
Apply 실행 상태(Apply Execution Status)를 의미하지 않는다.

본 IU는 Decision State 정의만 수행하며,
실제 상태 전이(Transition)나 Apply Decision 판정을 수행하지 않는다.

## 6. Decision Completeness

Decision Completeness는 Apply Decision 결과의 완전성 상태를 표현한다.

Apply Decision은 아래 조건을 모두 만족할 때 완전(Complete)한 것으로 본다.

- Decision Input(Apply Candidate · Decision Criteria · Apply Readiness)이 모두 존재한다.
- 대상 입력의 Apply Readiness가 Ready 상태이다.
- Decision Outcome이 정의된 유형 중 하나로 표현 가능하다.
- Decision State가 Decided 이상으로 표현 가능하다.
- Decision Outcome에 대한 Decision Reason이 기록 가능한 형태이다.

위 조건이 충족되지 않으면 Apply Decision은 불완전(Incomplete)한 것으로 본다.

Decision Completeness는 판단 결과의 완전성만 표현하며,
Apply 실행이나 Verification 수행을 의미하지 않는다.

본 IU는 Completeness 기준만 정의하며,
실제 Apply Decision 판정을 수행하지 않는다.

## 7. Workflow Position

Design → Apply → Verify Workflow에서 Apply Decision의 위치는 다음과 같다.

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
Apply Readiness Review (P6-IU-6-04A)
        ↓
Apply Decision (P6-IU-6-05A · 본 IU)
        ↓
Verification (후속 · 본 IU 범위 아님)
```

- Change Package → Impact Analysis → Architecture Review 단계는 P5에서 완료되었다.
- Apply Candidate → Decision Criteria → Apply Readiness Review 단계는
  P6-IU-6-02A ~ IU-6-04A에서 정의되었다.
- Apply Decision은 Ready 상태의 입력에 대해 판단 결과(Decision Outcome)를
  표현하는 P6의 정의 단계이다.
- Verification은 Apply Decision 이후 단계이며, 본 IU의 범위에 포함되지 않는다.

본 IU는 Workflow에서 Apply Decision의 위치를 정의할 뿐,
Apply Execution과 Verification을 수행하지 않는다.

## 8. Deliverables to Next IU (IU-6-06A)

본 IU가 다음 Implementation Unit으로 전달하는 산출물은 다음과 같다.

- Apply Decision Definition
- Apply Decision Role
- Decision Input (Apply Candidate · Decision Criteria · Apply Readiness)
- Decision Outcome Definition (Apply Approved / Conditional / Deferred / Rejected)
- Decision State Definition (Pending / Decided / Recorded)
- Decision Completeness 기준
- Apply Decision의 Workflow 위치

Next IU

Session ID
S7-P6-IU-6-06A

Objective

본 IU에서 정의한 Apply Decision(Decision Outcome · Decision State)을 기준으로,
Apply Decision Record 구조(Apply Decision 결과의 기록 필드 및 관계)를
후속 IU에서 정의한다.

Next IU는

- WG-AI-001
- STEP7_P6_IU-6-01A (Apply Decision Scope)
- STEP7_P6_IU-6-02A (Apply Candidate)
- STEP7_P6_IU-6-03A (Decision Criteria)
- STEP7_P6_IU-6-04A (Apply Readiness)
- 본 IU(IU-6-05A)에서 정의한 Apply Decision Outcome

을 Consume한다.

Next IU는 새로운 판정 Rule을 정의하지 않으며,
Apply Decision Algorithm, Apply Procedure, Apply Execution, Verification은
별도 후속 단계에서 수행한다.
