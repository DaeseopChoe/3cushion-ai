# STEP7 P6 Apply Decision

## IU-6-04A
Apply Readiness Review Definition

## 0. Baseline

본 IU 작성 시점의 Baseline은 다음과 같다.

- STEP7 P5 Complete (IU-5-01A ~ IU-5-05A PASS)
- WG-AI-001 PASS (Freeze Candidate)
- STEP7_P6_IU-6-01A Complete (Apply Decision Scope 정의)
- STEP7_P6_IU-6-02A Complete (Apply Candidate 정의)
- STEP7_P6_IU-6-03A Complete (Decision Criteria 정의)
- Runtime Baseline unchanged
- Architecture Workflow PASS

본 IU는 STEP7_P6_IU-6-01A ~ IU-6-03A를 그대로 Consume하며,
기존 IU의 Scope를 재정의하지 않는다.

## 1. Apply Readiness Definition

Apply Readiness는 Apply Decision을 수행하기 전에,
Apply Decision 입력이 준비되었는지를 판단하는 상태(State)이다.

Apply Readiness는 Apply를 수행하는 개념이 아니다.

Apply Readiness는 Apply Decision의 입력
(Apply Candidate · Decision Criteria)이
완전하고 사용 가능한 상태인지를 검토하는 Design 개념이다.

Apply Readiness는 다음을 만족하는 상태 판단이다.

- Apply Candidate가 Apply Decision 입력으로 사용 가능하다.
- Decision Criteria가 완전(Complete)하다.
- Apply Decision을 수행하기 위한 입력 준비가 충족되었다.

Apply Readiness는 입력 준비 상태(Readiness)만 정의하며,
Apply Decision 판정 결과(Result)나 Apply 실행을 포함하지 않는다.

본 IU는 Design-only 범위이며, 실제 Apply Decision을 수행하지 않는다.

## 2. Apply Readiness Role

Apply Readiness의 역할은 다음과 같다.

- Apply Decision 수행 이전 단계에서 입력 준비 상태를 검토한다.
- Apply Candidate와 Decision Criteria의 완전성을 확인한다.
- Apply Decision이 유효한 입력 위에서 수행되도록 보장하는 선행 검토를 정의한다.
- Ready / Not Ready 상태 판단의 기준을 명시한다.

Apply Readiness Review는 입력 준비 상태를 검토하는 단계이며,
Apply Decision Algorithm, Apply Decision Result, Apply 실행을 포함하지 않는다.

Apply Readiness는 WG-AI-001의 Impact / Risk / Review Level 판정 결과와
P5-IU-5-05A의 Review 결과를 Consume하며,
해당 규칙과 결과를 재정의하지 않는다.

## 3. Readiness Review Input

Apply Readiness Review는 아래 입력을 검토 대상으로 사용한다.

### 3.1 Apply Candidate

- STEP7_P6_IU-6-02A에서 정의된 Apply Candidate이다.
- Apply Candidate의 구성 요소(CP · IMP · Review Result · Related Resolution)와
  Required Input 충족 여부를 검토 대상으로 사용한다.
- 본 IU는 Apply Candidate를 재정의하거나 수정하지 않는다.

### 3.2 Decision Criteria

- STEP7_P6_IU-6-03A에서 정의된 Decision Criteria이다.
- Required Criteria의 존재와 Criteria Completeness를 검토 대상으로 사용한다.
- 본 IU는 Decision Criteria를 재정의하거나 수정하지 않는다.

### 3.3 Supporting Reference

- WG-AI-001 (Impact / Risk / Review Level 판정 규칙 Source)
- P5-IU-5-05A (Architecture Review 결과)

위 항목은 Readiness 판단의 참조로 사용하며, 수정하지 않는다.

## 4. Readiness Check Item

Apply Readiness Review는 아래 Check Item을 검토한다.

- Apply Candidate가 Required Input(CP · IMP · Review Result · Related Resolution)을
  모두 충족하는가.
- Apply Candidate Lifecycle이 Ready 상태에 도달했는가.
- Decision Criteria의 Required Criteria가 모두 존재하는가.
- Decision Criteria가 Criteria Completeness 조건을 충족하는가.
- Architecture Review 결과(Review Decision · Review Status)가 존재하는가.
- Apply Candidate와 Decision Criteria 간 연결 관계가 유지되는가.

위 Check Item은 입력 준비 상태를 판단하기 위한 검토 항목이며,
Apply Decision 판정 자체를 수행하지 않는다.

본 IU는 Check Item 정의만 수행하며,
실제 Readiness 판정을 실행하지 않는다.

## 5. Ready / Not Ready State

Apply Readiness는 다음 두 상태를 사용한다.

### 5.1 Ready

아래 조건을 모두 만족하면 Ready로 판단한다.

- Apply Candidate가 Required Input을 모두 충족한다.
- Apply Candidate Lifecycle이 Ready 상태이다.
- Decision Criteria가 Complete 상태이다.
- Architecture Review 결과가 존재한다.
- Apply Candidate와 Decision Criteria 간 연결 관계가 유지된다.

Ready 상태는 Apply Decision 입력으로 사용할 수 있음을 의미한다.

### 5.2 Not Ready

아래 조건 중 하나(ANY)라도 해당하면 Not Ready로 판단한다.

- Apply Candidate가 Required Input을 충족하지 못한다.
- Apply Candidate Lifecycle이 Ready 상태에 도달하지 못했다.
- Decision Criteria가 Incomplete 상태이다.
- Architecture Review 결과가 부재하다.
- Apply Candidate와 Decision Criteria 간 연결 관계가 유지되지 않는다.

Not Ready 상태는 Apply Decision 입력으로 사용할 수 없음을 의미한다.

Ready / Not Ready 상태는 입력 준비 상태만 표현하며,
Apply Decision 결과(Approved / Rejected 등)나 Apply 실행 상태를 의미하지 않는다.

## 6. Review Completeness

Review Completeness는 Apply Readiness Review의 완전성 상태를 표현한다.

Apply Readiness Review는 아래 조건을 모두 만족할 때
완전(Complete)한 것으로 본다.

- Readiness Review Input(Apply Candidate · Decision Criteria)이 모두 존재한다.
- 모든 Readiness Check Item이 검토 대상으로 확인된다.
- Ready / Not Ready 상태가 판단 가능한 형태로 정의된다.
- 검토 결과가 Apply Decision(후속 IU) 입력으로 전달 가능하다.

위 조건이 충족되지 않으면 Apply Readiness Review는
불완전(Incomplete)한 것으로 본다.

Review Completeness는 Readiness Review의 완전성만 표현하며,
Apply Decision 판정 수행이나 Apply 실행을 의미하지 않는다.

본 IU는 Completeness 기준만 정의하며,
실제 Readiness Review 판정을 수행하지 않는다.

## 7. Workflow Position

Design → Apply → Verify Workflow에서 Apply Readiness Review의 위치는 다음과 같다.

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
Apply Readiness Review (P6-IU-6-04A · 본 IU)
        ↓
Apply Decision (후속 · 본 IU 범위 아님)
        ↓
Verification (후속 · 본 IU 범위 아님)
```

- Change Package → Impact Analysis → Architecture Review 단계는 P5에서 완료되었다.
- Apply Candidate(IU-6-02A)와 Decision Criteria(IU-6-03A)는 P6에서 정의되었다.
- Apply Readiness Review는 Apply Decision 이전에 입력 준비 상태를 검토하는
  P6의 선행 검토 단계이다.
- Apply Decision은 Ready 상태의 입력을 사용하는 후속 단계이다.
- Verification은 Apply Decision 이후 단계이며, 본 IU의 범위에 포함되지 않는다.

본 IU는 Workflow에서 Apply Readiness Review의 위치를 정의할 뿐,
Apply Decision과 Verification을 수행하지 않는다.

## 8. Deliverables to Next IU (IU-6-05A)

본 IU가 다음 Implementation Unit으로 전달하는 산출물은 다음과 같다.

- Apply Readiness Definition
- Apply Readiness Role
- Readiness Review Input (Apply Candidate · Decision Criteria)
- Readiness Check Item
- Ready / Not Ready State 기준
- Review Completeness 기준
- Apply Readiness Review의 Workflow 위치

Next IU

Session ID
S7-P6-IU-6-05A

Objective

본 IU에서 정의한 Apply Readiness(Ready 상태 입력)를 기준으로,
Apply Decision 판단 구조(Apply Decision Model / Apply Decision Outcome)의
설계를 후속 IU에서 수행한다.

Next IU는

- WG-AI-001
- STEP7_P6_IU-6-01A (Apply Decision Scope)
- STEP7_P6_IU-6-02A (Apply Candidate)
- STEP7_P6_IU-6-03A (Decision Criteria)
- 본 IU(IU-6-04A)에서 정의한 Apply Readiness

를 Consume한다.

Next IU는 새로운 판정 Rule을 정의하지 않으며,
Apply Procedure, Apply Execution, Verification은
별도 후속 단계에서 수행한다.
