# STEP7 P6 Apply Decision

## IU-6-03A
Apply Decision Criteria Definition

## 0. Baseline

본 IU 작성 시점의 Baseline은 다음과 같다.

- STEP7 P5 Complete (IU-5-01A ~ IU-5-05A PASS)
- WG-AI-001 PASS (Freeze Candidate)
- STEP7_P6_IU-6-01A Complete (Apply Decision Scope 정의)
- STEP7_P6_IU-6-02A Complete (Apply Candidate 정의)
- Runtime Baseline unchanged
- Architecture Workflow PASS

본 IU는 STEP7_P6_IU-6-01A의 Apply Decision Scope와
STEP7_P6_IU-6-02A의 Apply Candidate를 그대로 Consume하며,
두 산출물을 재정의하지 않는다.

## 1. Decision Criteria Definition

Decision Criteria는 Apply Decision이 Apply Candidate를 평가할 때 사용하는
판단 기준(Criteria)이다.

Decision Criteria는 새로운 Decision Rule을 정의하는 것이 아니다.

Decision Criteria는 Apply Candidate를
"어떤 기준으로 평가할 것인가"를 정의하는 Design 개념이다.

Decision Criteria는 다음을 만족하는 판단 기준 집합이다.

- WG-AI-001의 Impact / Risk / Review Level 판정 결과를 기준으로 사용한다.
- Apply Candidate의 구성 요소(CP · IMP · Review Result)를 평가 대상으로 사용한다.
- Apply Decision이 참조할 판단 기준을 명시적으로 정의한다.
- 판단 기준의 완전성(Completeness)을 표현한다.

Decision Criteria는 판단 기준(Criteria)만 정의하며,
판단 절차(Apply Decision Algorithm)나 Apply Procedure는 포함하지 않는다.

본 IU는 Design-only 범위이며, 실제 Apply를 수행하지 않는다.

## 2. Decision Criteria Role

Decision Criteria의 역할은 다음과 같다.

- Apply Decision의 판단 기준으로 사용된다.
- Apply Candidate의 평가 기준으로 사용된다.
- Apply Decision이 어떤 항목을 근거로 판단하는지를 명시한다.
- 판단 기준 간 관계와 완전성을 유지한다.

Decision Criteria는 Apply Decision 판단의 기준이며,
Apply Decision Algorithm(판단 절차)이나 Apply 실행을 포함하지 않는다.

Decision Criteria는 WG-AI-001의 판정 규칙을 Consume하며,
해당 규칙을 재정의하지 않는다.

## 3. Decision Criteria Source

Decision Criteria는 아래 산출물을 Source로 사용한다.

### 3.1 WG-AI-001

- Impact / Risk / Review Level 판정 규칙의 Primary Rule Source이다.
- Decision Criteria는 WG-AI-001의 판정 결과를 기준으로 사용한다.
- 본 IU는 WG-AI-001을 재정의하거나 수정하지 않는다.

### 3.2 Impact Analysis

- P5-IU-5-04A(Architecture Impact Analysis)의 결과를 Source로 사용한다.
- Overall Impact Level과 Overall Risk를 판단 기준의 근거로 사용한다.
- 본 IU는 Impact를 재계산하지 않는다.

### 3.3 Architecture Review

- P5-IU-5-05A(Architecture Review)의 결과를 Source로 사용한다.
- Review Decision, Review Status를 판단 기준의 근거로 사용한다.
- 본 IU는 Review를 재수행하지 않는다.

### 3.4 Apply Candidate

- STEP7_P6_IU-6-02A에서 정의된 Apply Candidate를 평가 대상으로 사용한다.
- Apply Candidate의 구성 요소(CP · IMP · Review Result · Related Resolution)를
  판단 기준의 입력으로 사용한다.
- 본 IU는 Apply Candidate를 재정의하지 않는다.

## 4. Required Criteria

Apply Decision 판단을 위해 반드시 존재해야 하는 판단 기준은 다음과 같다.

- Overall Impact Level (WG-AI-001 · Impact Analysis 기준)
- Overall Risk (WG-AI-001 · Impact Analysis 기준)
- Review Level (WG-AI-001 · Architecture Review 기준)
- Review Decision (Architecture Review 기준)
- Review Status (Architecture Review 기준)
- Apply Candidate 구성 완전성 (Required Input 충족 여부)

위 판단 기준은 Apply Decision의 필수 Criteria이며,
하나라도 부재하면 Decision Criteria는 완전하지 않은 것으로 본다.

## 5. Optional Criteria

Apply Decision 판단에 조건부로 사용되는 판단 기준은 다음과 같다.

- Review Comment (Review 결과에 코멘트가 존재하는 경우)
- Related D-GAP 참조 (D-GAP-A / D-GAP-R 항목이 존재하는 경우)
- Related Resolution 부가 정보 (Resolution Mapping에 추가 맥락이 있는 경우)

위 판단 기준은 존재하는 경우 참조하며,
부재하더라도 Decision Criteria의 완전성에는 영향을 주지 않는다.

## 6. Criteria Completeness

Criteria Completeness는 Apply Decision 판단 기준의 완전성 상태를 표현한다.

Decision Criteria는 아래 조건을 모두 만족할 때 완전(Complete)한 것으로 본다.

- Required Criteria가 모두 존재한다.
- 각 Required Criteria가 유효한 Source(WG-AI-001 · Impact Analysis ·
  Architecture Review · Apply Candidate)에서 유래한다.
- Apply Candidate가 Required Input을 충족한다.
- Criteria와 Apply Candidate 구성 요소 간 연결 관계가 유지된다.

위 조건이 충족되지 않으면 Decision Criteria는 불완전(Incomplete)한 것으로 보며,
Apply Decision 입력으로 사용할 수 없다.

Criteria Completeness는 판단 기준의 완전성만 표현하며,
판단 결과(Apply Decision Result)나 Apply 실행 상태를 의미하지 않는다.

본 IU는 Completeness 기준만 정의하며,
실제 판단(Apply Decision)을 수행하지 않는다.

## 7. Workflow Position

Design → Apply → Verify Workflow에서 Decision Criteria의 위치는 다음과 같다.

```text
Change Package (P5-IU-5-03A)
        ↓
Impact Analysis (P5-IU-5-04A)
        ↓
Architecture Review (P5-IU-5-05A)
        ↓
Apply Candidate (P6-IU-6-02A)
        ↓
Decision Criteria (P6-IU-6-03A · 본 IU)
        ↓
Apply Decision (후속 · 본 IU 범위 아님)
        ↓
Verification (후속 · 본 IU 범위 아님)
```

- Change Package → Impact Analysis → Architecture Review 단계는 P5에서 완료되었다.
- Apply Candidate는 P6-IU-6-02A에서 정의되었다.
- Decision Criteria는 Apply Candidate를 어떤 기준으로 평가할지를 정의하는
  P6의 정의 단계이다.
- Apply Decision은 Decision Criteria를 사용하는 후속 단계이다.
- Verification은 Apply Decision 이후 단계이며, 본 IU의 범위에 포함되지 않는다.

본 IU는 Workflow에서 Decision Criteria의 위치를 정의할 뿐,
Apply Decision과 Verification을 수행하지 않는다.

## 8. Deliverables to Next IU (IU-6-04A)

본 IU가 다음 Implementation Unit으로 전달하는 산출물은 다음과 같다.

- Decision Criteria Definition
- Decision Criteria Role
- Decision Criteria Source (WG-AI-001 · Impact Analysis · Architecture Review ·
  Apply Candidate)
- Required Criteria / Optional Criteria 기준
- Criteria Completeness 기준
- Decision Criteria의 Workflow 위치

Next IU

Session ID
S7-P6-IU-6-04A

Objective

본 IU에서 정의한 Decision Criteria를 기준으로,
Apply Decision 판단 절차(Apply Decision Algorithm) 또는
Apply Decision 판단 구조의 설계를 후속 IU에서 수행한다.

Next IU는

- WG-AI-001
- STEP7_P6_IU-6-01A (Apply Decision Scope)
- STEP7_P6_IU-6-02A (Apply Candidate)
- 본 IU(IU-6-03A)에서 정의한 Decision Criteria

를 Consume한다.

Next IU는 새로운 판정 Rule을 정의하지 않으며,
Apply Procedure, Apply Execution, Verification은
별도 후속 단계에서 수행한다.
