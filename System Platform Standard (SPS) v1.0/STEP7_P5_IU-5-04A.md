# STEP7 P5 Change Design

## IU-5-04A

Architecture Impact Analysis

## 1. Purpose

본 IU는 Architecture Impact 규칙이나 판정 알고리즘을 새로 정의하지 않는다.

본 IU는 **WG-AI-001** (`Architecture Impact Working Guideline`)을 **Consume**하여,
Change Package(CP)에 대한 Architecture Impact Analysis **절차**를 정의한다.

분석 결과는 이후 Review 및 Apply Decision의 입력으로 사용된다.

본 IU는 Design-only 범위이며,
Runtime 변경, Change Apply, Verification은 수행하지 않는다.

## 2. Objectives

본 IU의 Objectives는 다음과 같다.

- WG-AI-001을 공식 Consume한다.
- Change Package 단위로 Architecture Impact Analysis를 수행하는 절차를 정의한다.
- Impact, Risk, Review Level, Decision Reason을 기록하는 절차를 정의한다.
- 분석 결과를 P6 Apply Decision의 입력으로 제공한다.
- P5 범위를 벗어나는 작업은 포함하지 않는다.

## 3. Inputs

본 IU는 아래 산출물을 입력(Inputs)으로 사용한다.

- **WG-AI-001 Architecture Impact Working Guideline** — **Primary Consume Source**
- STEP7_P5_IU-5-03A (Change Package Design)
- STEP7_P5_IU-5-02A (Resolution Mapping)
- STEP7_P5_IU-5-01A (Change Design Scope)
- P4 Approved Planning Documents
- STEP6 Final Freeze Documents

WG-AI-001은 Architecture Impact 판정 규칙의 **Primary Consume Source**이며,
본 IU는 해당 Guideline을 재정의하거나 복사하지 않는다.

본 IU는 위 산출물을 Consume 대상으로만 사용하며,
입력 산출물의 내용은 수정하지 않는다.

## 4. Consumed Artifacts

### Primary Consume

- WG-AI-001_Architecture_Impact_Working_Guideline.md

### Secondary Consume

- STEP7_P5_IU-5-03A (Change Package Design)
- STEP7_P5_IU-5-02A (Resolution Mapping)
- STEP7_P5_IU-5-01A (Change Design Scope)
- STEP6 Final Freeze
- P4 Approved Planning Documents

### Consume Principles

- 모든 Architecture Impact Rule은 WG-AI-001을 따른다.
- 본 IU는 Rule을 유지·재정의하지 않고 Consume만 수행한다.

## 5. Scope

본 IU의 Scope는 다음과 같다.

- Change Package(CP)를 평가 대상으로 사용한다.
- WG-AI-001을 Consume하여 Architecture Impact Analysis를 수행한다.
- Impact Dimension을 평가한다.
- Overall Impact Level을 산출한다.
- Overall Risk를 산출한다.
- Review Level을 결정한다.
- Decision Reason을 기록한다.
- Impact Analysis Record(IMP)의 작성 절차를 정의한다.
- 분석 결과를 P6 Apply Decision 입력으로 제공한다.

## 6. Out of Scope

본 IU에서는 다음을 수행하지 않는다.

- WG-AI-001 Rule 수정
- 새로운 Architecture Rule 정의
- Runtime 변경
- Registry 변경
- Loader 변경
- Dataset 변경
- Contract 변경
- 실제 Apply 수행
- Verification 수행
- Git Commit
- Git Push

본 IU는 Design-only Analysis IU이다.

## 7. Architecture Impact Analysis Procedure

Architecture Impact Analysis Procedure는 아래 순서를 따른다.

Step 1

Change Package(CP)를 선택한다.

Step 2

WG-AI-001을 Consume하여
Impact Dimension을 평가한다.

Step 3

WG-AI-001의 Impact Level Decision Algorithm을 사용하여

Overall Impact Level을 산출한다.

Step 4

WG-AI-001의 Risk Decision Algorithm을 사용하여

Overall Risk를 산출한다.

Step 5

WG-AI-001의 Review Level Decision Matrix를 사용하여

Review Level을 결정한다.

Step 6

Impact Analysis Record(IMP)에

- Dimension Result
- Overall Impact Level
- Overall Risk
- Review Level
- Decision Reason

을 기록한다.

Step 7

Architecture Impact Analysis 결과를

P6 Apply Decision의 입력으로 전달한다.

본 IU에서는

Rule을 변경하거나

Apply를 수행하지 않는다.

## 8. Deliverables

본 IU의 산출물은 다음과 같다.

- Completed Architecture Impact Analysis
- Impact Analysis Record (IMP)
- Overall Impact Level
- Overall Risk Level
- Review Level
- Decision Reason
- P6 Apply Decision Input

WG-AI-001은 Deliverable이 아니라
Consume 대상이다.

## 9. Acceptance Criteria

본 IU는 아래 조건을 모두 만족하면 완료(PASS)로 본다.

- WG-AI-001을 공식 Consume하였다.
- Change Package가 분석되었다.
- Impact Dimension 평가가 완료되었다.
- Overall Impact Level이 결정되었다.
- Overall Risk가 결정되었다.
- Review Level이 결정되었다.
- Decision Reason이 기록되었다.
- Impact Analysis Record가 작성되었다.
- P6 Apply Decision 입력이 준비되었다.

Architecture Rule의 변경이 없어야 한다.

Design-only Constraints를 위반하지 않아야 한다.

## 10. Dependencies

### Primary Dependency

- WG-AI-001_Architecture_Impact_Working_Guideline.md

### Design Dependencies

- STEP7_P5_IU-5-03A (Change Package Design)
- STEP7_P5_IU-5-02A (Resolution Mapping)
- STEP7_P5_IU-5-01A (Change Design Scope)

### Project Dependencies

- STEP6 Final Freeze
- P4 Approved Planning Documents

### Dependency Principles

- Architecture Impact Analysis는 WG-AI-001을 Consume한다.
- WG-AI-001이 변경되면 본 IU는 Rule을 수정하지 않고 최신 WG를 Consume한다.
- 본 IU는 Rule의 소유자가 아니다.

## 11. Constraints

본 IU는 다음 제약을 반드시 준수한다.

- Design-only 단계에서만 수행한다.
- WG-AI-001 Rule을 수정하지 않는다.
- 새로운 Architecture Rule을 정의하지 않는다.
- Runtime을 변경하지 않는다.
- Registry를 변경하지 않는다.
- Loader를 변경하지 않는다.
- Dataset을 변경하지 않는다.
- Contract를 변경하지 않는다.
- Verification을 수행하지 않는다.
- Apply를 수행하지 않는다.
- STEP6 Final Freeze를 위반하지 않는다.
- P2~P5 SSOT와 충돌하지 않는다.

## 12. Next IU

Next IU

STEP7_P5_IU-5-05A

Architecture Review

Role

P5-IU-5-04A에서 생성한

- Impact Analysis Record
- Overall Impact Level
- Overall Risk
- Review Level
- Decision Reason

을 Consume하여

Architecture Review를 수행한다.

P5-IU-5-05A는

Architecture Impact Rule을 정의하지 않는다.

WG-AI-001을 계속 Consume한다.
