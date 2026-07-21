# STEP7 P5 Architecture Review

## IU-5-05A

Architecture Review Implementation Unit

## 1. Purpose

본 IU는 Architecture Review Rule을 정의하지 않는다.

본 IU는 **WG-AI-001** (`Architecture Impact Working Guideline`)을 **Consume**하여,
Architecture Review를 수행하는 절차를 정의한다.

STEP7_P5_IU-5-04A에서 생성된 Architecture Impact Analysis 결과를
Review 대상으로 사용한다.

Review 결과는 P6 Apply Decision의 승인 입력으로 사용된다.

본 IU는 Design-only 범위이며,
Apply와 Verification은 수행하지 않는다.

## 2. Objectives

본 IU의 Objectives는 다음과 같다.

- WG-AI-001을 공식 Consume한다.
- STEP7_P5_IU-5-04A의 Impact Analysis 결과를 Review한다.
- Overall Impact Level과 Overall Risk의 적절성을 검토한다.
- Review Level의 적절성을 확인한다.
- Review Decision과 Review Comment를 기록하는 절차를 정의한다.
- Review 결과를 P6 Apply Decision의 입력으로 제공한다.
- P5 범위를 벗어나는 작업은 포함하지 않는다.

## 3. Inputs

본 IU는 아래 산출물을 입력(Inputs)으로 사용한다.

### Primary Consume

- WG-AI-001_Architecture_Impact_Working_Guideline.md

### Analysis Inputs

- STEP7_P5_IU-5-04A (Architecture Impact Analysis)
- Impact Analysis Record (IMP)

### Supporting Inputs

- STEP7_P5_IU-5-03A (Change Package Design)
- STEP7_P5_IU-5-02A (Resolution Mapping)
- STEP7_P5_IU-5-01A (Change Design Scope)
- STEP6 Final Freeze
- P4 Approved Planning Documents

WG-AI-001은 Architecture Impact 판정 규칙의 **Primary Rule Source**이며,
본 IU는 해당 Guideline을 재정의하거나 복사하지 않는다.

본 IU는 위 산출물을 Consume 대상으로만 사용하며,
입력 산출물의 내용은 수정하지 않는다.

## 4. Consumed Artifacts

### Primary Consume

- WG-AI-001_Architecture_Impact_Working_Guideline.md

### Review Inputs

- STEP7_P5_IU-5-04A (Architecture Impact Analysis)
- Impact Analysis Record (IMP)

### Supporting Consume

- STEP7_P5_IU-5-03A (Change Package Design)
- STEP7_P5_IU-5-02A (Resolution Mapping)
- STEP7_P5_IU-5-01A (Change Design Scope)
- STEP6 Final Freeze
- P4 Approved Planning Documents

### Consume Principles

- 모든 Review Rule은 WG-AI-001을 따른다.
- 본 IU는 Rule을 유지하지 않고 Consume만 수행한다.
- Review는 Analysis 결과를 검토하는 절차이다.

## 5. Scope

본 IU의 Scope는 다음과 같다.

- Architecture Impact Analysis 결과를 Review 대상으로 사용한다.
- Impact Analysis Record(IMP)를 검토한다.
- Overall Impact Level의 적절성을 확인한다.
- Overall Risk의 적절성을 확인한다.
- Review Level의 적절성을 확인한다.
- Review Decision을 기록한다.
- Review Comment를 기록한다.
- Review 결과를 P6 Apply Decision 입력으로 제공한다.

## 6. Out of Scope

본 IU에서는 다음을 수행하지 않는다.

- WG-AI-001 Rule 수정
- 새로운 Architecture Rule 정의
- 새로운 Review Rule 정의
- Architecture Impact 재계산
- Runtime 변경
- Registry 변경
- Loader 변경
- Dataset 변경
- Contract 변경
- Apply 수행
- Verification 수행
- Git Commit
- Git Push

본 IU는 Design-only Review IU이다.

## 7. Architecture Review Procedure

Architecture Review Procedure는 아래 순서를 따른다.

Step 1

Architecture Impact Analysis 결과를 준비한다.

입력은

- Impact Analysis Record (IMP)
- Overall Impact Level
- Overall Risk
- Review Level
- Decision Reason

이다.

Step 2

WG-AI-001을 Consume하여

Architecture Impact 평가 결과가
Working Guideline을 준수하는지 검토한다.

Step 3

Overall Impact Level의 적절성을 검토한다.

Step 4

Overall Risk의 적절성을 검토한다.

Step 5

Review Level의 적절성을 검토한다.

Step 6

Review Decision을 결정한다.

예)

- Approved
- Revision Required
- Rejected

Step 7

Review Comment를 기록한다.

Step 8

Review 결과를

P6 Apply Decision의 입력으로 전달한다.

본 IU에서는

Rule 변경,

Impact 재평가,

Apply,

Verification은 수행하지 않는다.

## 8. Deliverables

본 IU의 산출물은 다음과 같다.

- Completed Architecture Review
- Review Decision
- Review Comment
- Reviewed Impact Analysis Record
- Review Status
- P6 Apply Decision Input

WG-AI-001은 Deliverable이 아니라
Primary Consume Source이다.

## 9. Acceptance Criteria

본 IU는 아래 조건을 모두 만족하면 완료(PASS)로 본다.

- WG-AI-001을 공식 Consume하였다.
- Architecture Impact Analysis 결과를 Review하였다.
- Overall Impact Level을 검토하였다.
- Overall Risk를 검토하였다.
- Review Level을 검토하였다.
- Review Decision이 기록되었다.
- Review Comment가 기록되었다.
- Review 결과가 P6 Apply Decision 입력으로 준비되었다.

Architecture Rule을 변경하지 않아야 한다.

Design-only Constraints를 위반하지 않아야 한다.

## 10. Dependencies

### Primary Dependency

- WG-AI-001_Architecture_Impact_Working_Guideline.md

### Review Dependencies

- STEP7_P5_IU-5-04A (Architecture Impact Analysis)
- Impact Analysis Record (IMP)

### Supporting Dependencies

- STEP7_P5_IU-5-03A (Change Package Design)
- STEP7_P5_IU-5-02A (Resolution Mapping)
- STEP7_P5_IU-5-01A (Change Design Scope)
- STEP6 Final Freeze
- P4 Approved Planning Documents

### Dependency Principles

- Architecture Review는 WG-AI-001을 Consume한다.
- WG-AI-001이 변경되면 최신 WG를 Consume한다.
- 본 IU는 Rule의 소유자가 아니다.
- Review 대상은 STEP7_P5_IU-5-04A의 분석 결과이다.

## 11. Constraints

본 IU는 다음 제약을 반드시 준수한다.

- Design-only 단계에서만 수행한다.
- WG-AI-001 Rule을 수정하지 않는다.
- 새로운 Architecture Rule을 정의하지 않는다.
- 새로운 Review Rule을 정의하지 않는다.
- Architecture Impact를 재평가하지 않는다.
- Runtime을 변경하지 않는다.
- Registry를 변경하지 않는다.
- Loader를 변경하지 않는다.
- Dataset를 변경하지 않는다.
- Contract를 변경하지 않는다.
- Apply를 수행하지 않는다.
- Verification을 수행하지 않는다.
- STEP6 Final Freeze를 위반하지 않는다.
- P2~P5 SSOT와 충돌하지 않는다.

## 12. Next IU

Next IU

STEP7_P6_IU-6-01A

Apply Decision

Role

P5-IU-5-05A에서 생성한

- Review Decision
- Review Comment
- Review Status
- Reviewed Impact Analysis Record

를 Consume하여

P6 Apply Decision을 수행한다.

P6-IU-6-01A는

WG-AI-001과

P5-IU-5-05A 결과를 Consume한다.

새로운 Review Rule은 정의하지 않는다.
