# STEP7 P6 Apply Decision

## IU-6-02A
Apply Candidate Definition

## 0. Baseline

본 IU 작성 시점의 Baseline은 다음과 같다.

- STEP7 P5 Complete (IU-5-01A ~ IU-5-05A PASS)
- WG-AI-001 PASS (Freeze Candidate)
- STEP7_P6_IU-6-01A Complete (Apply Decision Scope 정의)
- Runtime Baseline unchanged
- Architecture Workflow PASS

본 IU는 STEP7_P6_IU-6-01A에서 정의한 Apply Decision Scope를 그대로 Consume하며,
해당 Scope를 재정의하지 않는다.

## 1. Apply Candidate Definition

Apply Candidate는 STEP7 P6 Apply Decision의 공식 입력(Input Object)이다.

Apply Candidate는 P5에서 완료된 Change Design 산출물
(Change Package, Impact Analysis Record, Review Result)을
Apply Decision 관점에서 하나의 판단 단위로 묶은 Design 개념이다.

Apply Candidate는 다음을 만족하는 대상 개념이다.

- 하나의 Change Package(CP)를 중심으로 구성된다.
- 해당 CP의 Impact Analysis Record(IMP)를 포함한다.
- 해당 CP의 Architecture Review 결과를 포함한다.
- Apply Decision이 판단 대상으로 사용할 수 있는 형태로 정리된다.

Apply Candidate는 Apply를 수행하는 객체가 아니다.

Apply Candidate는 Apply Decision이 "무엇을 판단 대상으로 삼는가"를 정의하는
입력(Input Object)이며, Apply 실행·순서·절차는 포함하지 않는다.

본 IU는 Apply Candidate의 개념, 구성, 관계, 생명주기(Lifecycle)만 정의하며,
실제 Apply를 수행하지 않는다.

## 2. Apply Candidate Role

Apply Candidate의 역할은 다음과 같다.

- Apply Decision의 입력(Input Object)으로 사용된다.
- Change Package, Impact Analysis Record, Review Result를
  하나의 판단 단위로 연결한다.
- Apply Decision이 참조할 산출물 간 관계를 유지한다.
- Apply 판단에 필요한 입력의 완전성(Completeness)을 표현한다.

Apply Candidate는 Apply Decision 판단의 대상이며,
Apply Decision Algorithm이나 Apply Procedure를 포함하지 않는다.

Apply Candidate는 WG-AI-001의 Impact / Risk / Review Level 판정 결과를 Consume하며,
해당 판정 규칙을 재정의하지 않는다.

## 3. Apply Candidate Components

Apply Candidate는 다음 구성 요소로 이루어진다.

### 3.1 Change Package (CP)

- P5-IU-5-03A(Change Package Design)에서 정의된 Change Package이다.
- Apply Candidate의 중심 단위(Anchor)이다.
- 본 IU는 CP를 생성하거나 수정하지 않는다.

### 3.2 Impact Analysis Record (IMP)

- P5-IU-5-04A(Architecture Impact Analysis)에서 정의된 Impact Analysis Record이다.
- Overall Impact Level과 Overall Risk를 제공한다.
- CP와 IMP는 기본적으로 1:1 관계를 가진다.
- 본 IU는 Impact를 재계산하지 않는다.

### 3.3 Review Result

- P5-IU-5-05A(Architecture Review)에서 생성된 Review 결과이다.
- Review Decision, Review Comment, Review Status,
  Reviewed Impact Analysis Record를 포함한다.
- Apply Candidate의 승인 상태를 나타내는 구성 요소이다.
- 본 IU는 Review를 재수행하지 않는다.

### 3.4 Related Resolution

- P5-IU-5-02A(Resolution Mapping)에서 정의된 Resolution이다.
- CP가 어떤 Resolution에서 유래했는지를 나타낸다.
- 본 IU는 Resolution을 새로 정의하거나 수정하지 않는다.

### 3.5 Related D-GAP (있는 경우)

- P3 D-GAP-A / D-GAP-R에서 정의된 Gap 항목이다.
- Resolution이 대응하는 D-GAP이 존재하는 경우 참조로 포함한다.
- 존재하지 않는 경우 생략할 수 있다.
- 본 IU는 D-GAP-A / D-GAP-R을 수정하지 않는다.

## 4. Required Input

Apply Candidate가 성립하기 위해 반드시 존재해야 하는 입력은 다음과 같다.

- Change Package (CP)
- Impact Analysis Record (IMP)
- Review Result (Review Decision · Review Status 포함)
- Related Resolution

위 항목은 Apply Candidate의 필수 구성 요소이며,
하나라도 부재하면 Apply Candidate는 성립하지 않는다.

## 5. Optional Input

Apply Candidate에 조건부로 포함되는 입력은 다음과 같다.

- Related D-GAP (D-GAP-A / D-GAP-R 항목이 존재하는 경우)
- Review Comment (Review 결과에 코멘트가 존재하는 경우)

위 항목은 존재하는 경우 포함하며,
부재하더라도 Apply Candidate의 성립에는 영향을 주지 않는다.

## 6. Apply Candidate Formation Conditions

Apply Candidate는 다음 조건을 모두 만족할 때 생성된다.

- 대상 Change Package(CP)가 P5-IU-5-03A에 정의되어 있다.
- 해당 CP에 대응하는 Impact Analysis Record(IMP)가 P5-IU-5-04A에 존재한다.
- 해당 CP에 대한 Architecture Review 결과가 P5-IU-5-05A에 존재한다.
- 해당 CP가 유래한 Related Resolution이 P5-IU-5-02A에 정의되어 있다.
- 위 구성 요소 간 연결 관계(CP ↔ IMP ↔ Review ↔ Resolution)가 유지된다.

위 조건이 충족되지 않으면 해당 CP는 Apply Candidate로 성립하지 않는다.

본 IU는 생성 조건(Formation Conditions)만 정의하며,
실제 Apply Candidate 인스턴스를 생성하지 않는다.

## 7. Apply Candidate Lifecycle

Apply Candidate Lifecycle은 다음 상태를 사용한다.

```text
Draft
  ↓
Assembled
  ↓
Ready
  ↓
Consumed
```

- Draft
  - Apply Candidate 구성 요소가 식별되었으나 연결이 완료되지 않은 상태.

- Assembled
  - Required Input(CP · IMP · Review Result · Related Resolution)이 모두 연결된 상태.

- Ready
  - Required Input이 완전하고 Apply Decision 입력으로 사용할 수 있는 상태.

- Consumed
  - Apply Decision(후속 IU)이 해당 Apply Candidate를 입력으로 사용한 상태.

Lifecycle은 Apply Candidate의 입력 완전성(Completeness) 상태를 표현하며,
Apply 실행 상태(Apply Execution Status)를 의미하지 않는다.

본 IU는 Lifecycle 상태 정의만 수행하며,
상태 전이(Transition)를 실제로 수행하지 않는다.

## 8. Workflow Position

Design → Apply → Verify Workflow에서 Apply Candidate의 위치는 다음과 같다.

```text
Change Package (P5-IU-5-03A)
        ↓
Impact Analysis (P5-IU-5-04A)
        ↓
Architecture Review (P5-IU-5-05A)
        ↓
Apply Candidate (P6-IU-6-02A · 본 IU)
        ↓
Apply Decision (후속 · 본 IU 범위 아님)
        ↓
Verification (후속 · 본 IU 범위 아님)
```

- Change Package → Impact Analysis → Architecture Review 단계는 P5에서 완료되었다.
- Apply Candidate는 위 세 단계의 결과를 하나의 입력 단위로 묶는 P6의 정의 단계이다.
- Apply Decision은 Apply Candidate를 입력으로 사용하는 후속 단계이다.
- Verification은 Apply Decision 이후 단계이며, 본 IU의 범위에 포함되지 않는다.

본 IU는 Workflow에서 Apply Candidate의 위치를 정의할 뿐,
Apply Decision과 Verification을 수행하지 않는다.

## 9. Deliverables to Next IU (IU-6-03A)

본 IU가 다음 Implementation Unit으로 전달하는 산출물은 다음과 같다.

- Apply Candidate Definition
- Apply Candidate Components (CP · IMP · Review Result · Related Resolution · Related D-GAP)
- Required Input / Optional Input 기준
- Apply Candidate Formation Conditions
- Apply Candidate Lifecycle
- Apply Candidate의 Workflow 위치

Next IU

Session ID
S7-P6-IU-6-03A

Objective

본 IU에서 정의한 Apply Candidate(Input Object)를 기준으로,
Apply Decision 판단 기준(Apply Decision Criteria)의 연결 구조를
후속 IU에서 정의한다.

Next IU는

- WG-AI-001
- STEP7_P6_IU-6-01A (Apply Decision Scope)
- 본 IU(IU-6-02A)에서 정의한 Apply Candidate

를 Consume한다.

Next IU는 새로운 Rule을 정의하지 않으며,
Apply Decision Algorithm, Apply Procedure, Verification은
별도 후속 단계에서 수행한다.
