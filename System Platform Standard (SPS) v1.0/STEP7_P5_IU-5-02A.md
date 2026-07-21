# STEP7 P5 Change Design

## IU-5-02A

Resolution Mapping

---

## 1. Purpose

본 문서는 STEP7 P5(Change Design)의 두 번째 Implementation Unit(IU)로서,
STEP7 P3에서 식별된 D-GAP-A 및 D-GAP-R을 해결 가능한 Resolution으로
체계적으로 연결(Mapping)하기 위한 기준을 정의하는 것을 목적으로 한다.

본 IU는 Resolution Mapping 규칙과 분류 체계를 정의하며,
후속 IU에서 수행할 Change Package Design의 입력 기준을 제공한다.

본 IU에서는 Runtime 변경, System JSON 수정, Change Apply 및 Verification은 수행하지 않는다.

## 2. Objectives

본 IU의 Objectives는 다음과 같다.

- D-GAP-A와 D-GAP-R을 Resolution 단위로 연결하는 Mapping 기준을 정의한다.
- Resolution의 식별 및 분류 원칙을 정의한다.
- Resolution Mapping의 Traceability를 확보한다.
- 후속 Change Package Design의 입력 기준을 마련한다.
- P5 Change Design 단계의 일관성을 유지하기 위한 Mapping 규칙을 정의한다.
- Runtime 변경 및 실제 구현은 수행하지 않는다.

## 3. Inputs

본 IU는 아래 산출물을 입력(Inputs)으로 사용한다.

- STEP6 Final Freeze v1.0
- STEP7 P2 Catalog Design v0.15
- STEP7 P3 D-GAP-A
- STEP7 P3 D-GAP-R
- STEP7 P4 Standardization Plan Suite
- STEP7_P5_IU-5-01A
- STEP7 Implementation Decomposition
- PROJECT_MASTER_INDEX.md
- PROJECT_LOG_2026-07.md
- CURSOR_SESSION_HANDOFF.md
- OPS_AI_MODEL_GUIDE.md

본 IU는 위 산출물을 Consume 대상으로만 사용하며,
입력 산출물의 내용은 수정하지 않는다.

## 4. Mapping Principles

Resolution Mapping은 STEP7 P3에서 식별된 D-GAP을 Change Design 단계의 Resolution으로 연결하기 위한 기준이다.

Mapping은 아래 원칙을 따른다.

- 모든 D-GAP은 하나 이상의 Resolution과 연결되어야 한다.
- 모든 Resolution은 하나 이상의 D-GAP을 해결 대상으로 가져야 한다.
- Mapping은 추적 가능(Traceable)해야 한다.
- 하나의 Resolution은 여러 D-GAP을 동시에 해결할 수 있다.
- Mapping은 Change Design 단계에서만 정의하며 실제 구현은 포함하지 않는다.
- Resolution ID는 중복되지 않는다.
- Mapping 결과는 후속 Change Package Design의 입력으로 사용한다.

## 5. Resolution Mapping Table

Resolution Mapping은 아래 형식을 따른다.

| D-GAP ID | Resolution ID | Category | Priority | Status | Notes |
|----------|---------------|----------|----------|--------|-------|
| D-GAP-A-XX | RES-XXX | TBD | TBD | Planned | TBD |
| D-GAP-R-XX | RES-XXX | TBD | TBD | Planned | TBD |

본 IU에서는 Mapping 형식만 정의하며, 실제 Mapping 데이터는 후속 IU에서 작성한다.

## 6. Resolution Classification

Resolution은 아래 분류 체계를 사용한다.

- Architecture
- Runtime
- Registry
- Loader
- Dataset
- Contract
- Validation
- Documentation

각 Resolution은 하나의 Primary Category를 가지며, 필요 시 관련 Category를 추가로 참조할 수 있다.

본 분류는 Change Package Design 및 Architecture Impact Analysis의 기준으로 사용한다.

## 7. Deliverables

본 IU의 산출물은 다음과 같다.

- Resolution Mapping Principles
- Resolution Mapping Table Template
- Resolution Classification
- Resolution ID Naming Rule

Resolution ID는 아래 규칙을 사용한다.

RES-001
RES-002
RES-003
...

규칙은 다음과 같다.

- Resolution ID는 "RES-" 접두어와 3자리 번호를 사용한다.
- Resolution ID는 프로젝트 전체에서 유일해야 한다.
- Resolution ID는 Change Package Design 및 이후 단계에서도 동일한 ID를 유지한다.
- Resolution ID는 변경하지 않으며 Traceability의 기준으로 사용한다.

## 8. Acceptance Criteria

본 IU는 아래 조건을 모두 만족하면 완료된 것으로 판단한다.

- Mapping Principles가 정의되어 있다.
- Resolution Mapping Table 형식이 정의되어 있다.
- Resolution Classification이 정의되어 있다.
- Resolution ID Naming Rule이 정의되어 있다.
- 후속 IU에서 사용할 Mapping 기준이 확정되어 있다.

## 9. Constraints

본 IU에서는 다음 작업을 수행하지 않는다.

- 실제 Resolution 데이터 작성
- Runtime 변경
- Registry 변경
- Loader 변경
- Contract 변경
- Dataset 변경
- System JSON 수정
- D-GAP 수정
- Change Package Design
- Architecture Impact Analysis
- Change Apply
- Verification
- Git Commit
- Git Push

본 IU는 Resolution Mapping의 기준만 정의하며, 실제 Resolution 작성은 후속 IU에서 수행한다.

## 10. Next IU

다음 Implementation Unit은 아래와 같다.

Session ID

S7-P5-IU-5-03A

Title

Change Package Design

Objective

Resolution Mapping에서 정의된 Resolution을
Change Package 단위로 구성하고,
적용 대상(Runtime, Registry, Loader, Dataset, Contract 등)을
설계하여 구현 가능한 Change Package를 정의한다.
