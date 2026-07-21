# STEP7 P5 Change Design

## IU-5-01A
Change Design Scope Specification

## 1. Purpose

본 문서는 STEP7 P5(Change Design)의 첫 번째 Implementation Unit(IU)로서,
P4 Standardization Plan에서 정의된 계획을 Change Design 단계로 연결하기 위한
Scope를 공식적으로 정의하는 것을 목적으로 한다.

본 IU는 Change Design의 범위와 목적을 정의하는 단계이며,
개별 Resolution 설계, Runtime 변경, System JSON 수정,
Change Apply 및 Verification은 포함하지 않는다.

또한 STEP6 Final Freeze, STEP7 P2 Catalog Design,
P3 D-GAP-A / D-GAP-R, P4 Plan Suite를 Consume 대상으로 사용하며,
후속 IU에서 수행될 Resolution Mapping과 Change Package Design의
기준 문서 역할을 한다.

## 2. Objectives

본 IU의 Objectives는 다음과 같다.

- P5 Change Design의 공식 Scope를 정의한다.
- P4 Standardization Plan에서 승인된 Planning 결과를 Change Design 단계로 연결한다.
- P5에서 Consume할 기준 산출물과 참조 범위를 명확히 정의한다.
- P5 이후 Implementation Unit이 동일한 Scope와 Constraints를 적용할 수 있는 기준을 마련한다.
- Resolution Mapping, Change Package Design, Validation Design을 위한 상위 기준을 제공한다.
- Runtime, Registry, Loader, Contract, System JSON 및 D-GAP에는 변경을 수행하지 않음을 명확히 한다.

## 3. Inputs

본 IU는 아래 산출물을 입력(Inputs)으로 사용한다.

- STEP6 Final Freeze v1.0
- STEP7 P2 Catalog Design v0.15
- STEP7 P3 D-GAP-A
- STEP7 P3 D-GAP-R
- STEP7 P4 Standardization Plan Suite (IU-4-01A ~ IU-4-08A)
- STEP7 Implementation Decomposition
- PROJECT_MASTER_INDEX.md
- PROJECT_LOG_2026-07.md
- OPS_AI_MODEL_GUIDE.md
- CURSOR_SESSION_HANDOFF.md

본 IU는 위 산출물을 Consume 대상으로만 사용하며, 입력 산출물의 내용은 수정하지 않는다.

## 4. Consumed Artifacts

본 IU는 아래 산출물을 Consume 대상으로 사용한다.

- STEP6 Final Freeze v1.0
- STEP7 P2 Catalog Design v0.15
- STEP7 P3 D-GAP-A
- STEP7 P3 D-GAP-R
- STEP7 P4 Standardization Plan Suite (IU-4-01A ~ IU-4-08A)
- STEP7 Implementation Decomposition
- PROJECT_MASTER_INDEX.md
- PROJECT_LOG_2026-07.md
- OPS_AI_MODEL_GUIDE.md
- CURSOR_SESSION_HANDOFF.md

Consume의 의미는 기존 승인 산출물을 참조하여 Change Design Scope를 정의하는 것이며, 해당 산출물의 내용이나 상태를 변경하지 않는다.

본 IU에서는 Consume 대상 문서를 재해석하거나 수정하지 않으며, 모든 승인 상태(VG-P3 PASS, VG-P4 PASS, STEP6 Final Freeze)는 그대로 유지한다.

## 5. Scope

본 IU의 Scope는 STEP7 P5 Change Design의 적용 범위를 공식적으로 정의하는 것이다.

본 IU에서 수행하는 작업은 다음과 같다.

- P5 Change Design의 목적과 적용 범위를 정의한다.
- P5에서 Consume할 기준 산출물을 확정한다.
- 후속 Implementation Unit이 공통으로 따라야 할 Change Design Scope를 정의한다.
- Change Design 단계에서 수행할 대상과 수행하지 않을 대상을 명확히 구분한다.
- P5 전체에서 공통으로 사용할 Scope 기준을 수립한다.

본 IU는 Scope 정의만 수행하며, 개별 Resolution 설계, Runtime 변경 및 실제 적용 작업은 포함하지 않는다.

## 6. Out of Scope

본 IU의 범위에 포함되지 않는 작업은 다음과 같다.

- Resolution Design 작성
- Runtime 변경
- Registry 변경
- Loader 변경
- Contract 변경
- Framework 변경
- Pipeline 변경
- System JSON 수정
- D-GAP-A 및 D-GAP-R 변경
- Catalog Freeze 선언
- Catalog/Register JSON 생성
- catalogPinId 발급
- Severity Lock
- Change Apply
- Verification 수행
- Git Commit
- Git Push

위 작업은 후속 Implementation Unit 또는 별도 Session에서 수행하며, 본 IU에서는 수행하지 않는다.

## 7. Deliverables

본 IU의 산출물은 다음과 같다.

- P5 Change Design Scope 정의
- P5 적용 범위(Scope) 정의
- Out of Scope 정의
- Consume 대상 산출물 정의
- P5 후속 Implementation Unit의 기준 문서

## 8. Acceptance Criteria

본 IU는 아래 조건을 모두 만족하면 완료된 것으로 판단한다.

- Purpose가 정의되어 있다.
- Objectives가 정의되어 있다.
- Inputs가 정의되어 있다.
- Consumed Artifacts가 정의되어 있다.
- Scope와 Out of Scope가 정의되어 있다.
- 본 IU의 Deliverables가 정의되어 있다.
- Entry Criteria와 Exit Criteria가 정의되어 있다.
- Dependencies와 Constraints가 정의되어 있다.
- Next IU가 지정되어 있다.

## 9. Entry Criteria

본 IU의 시작 조건은 다음과 같다.

- STEP6 Final Freeze가 승인되어 있다.
- STEP7 P2 Catalog Design이 완료되어 있다.
- STEP7 P3 Gap Analysis(VG-P3 PASS)가 완료되어 있다.
- STEP7 P4 Standardization Plan(VG-P4 PASS)이 완료되어 있다.
- P5 Entry Ready 상태가 확인되어 있다.

## 10. Exit Criteria

본 IU의 종료 조건은 다음과 같다.

- P5 Change Design Scope가 공식 정의되어 있다.
- 후속 IU가 참조할 Scope 기준이 확정되어 있다.
- P5-IU-5-02A 수행 준비가 완료되어 있다.

## 11. Dependencies

본 IU는 아래 산출물에 의존한다.

- STEP6 Final Freeze
- STEP7 P2 Catalog Design
- STEP7 P3 D-GAP-A
- STEP7 P3 D-GAP-R
- STEP7 P4 Standardization Plan Suite
- STEP7 Implementation Decomposition
- PROJECT_MASTER_INDEX
- PROJECT_LOG
- OPS_AI_MODEL_GUIDE.md
- CURSOR_SESSION_HANDOFF

## 12. Constraints

본 IU에서는 다음 사항을 수행하지 않는다.

- Runtime 변경
- Registry 변경
- Loader 변경
- Contract 변경
- Framework 변경
- Pipeline 변경
- System JSON 수정
- D-GAP 수정
- Resolution Design
- Change Apply
- Verification
- Git Commit
- Git Push

## 13. Next IU

다음 Implementation Unit은 아래와 같다.

Session ID
S7-P5-IU-5-02A

Title
Resolution Mapping

Objective

P3 D-GAP-A와 D-GAP-R을 Resolution 단위로 연결하는 Mapping을 정의하고,
후속 Change Package Design의 입력 기준을 수립한다.
