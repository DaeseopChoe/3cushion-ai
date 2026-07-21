# STEP7 P5 Change Design

## IU-5-03A

Change Package Design

## 1. Purpose

본 문서는 STEP7 P5(Change Design)의 세 번째 Implementation Unit(IU)로서,
Resolution Mapping에서 정의된 Resolution을 실제 적용 가능한
Change Package로 구성하기 위한 설계 기준을 정의한다.

본 IU는 Change Package의 구성 원칙, 분류 체계, Package Manifest를 정의하며,
P6 Apply 단계에서 직접 사용할 실행 단위의 기준을 제공한다.

## 2. Change Package Definition

Change Package는 하나 이상의 Resolution을 구현하기 위해
동일한 적용 대상(Runtime, Registry, Loader, Dataset, Contract,
Validation, Documentation 등)별로 구성한 변경 단위이며,
P6 Apply 단계에서 독립적으로 적용 및 검증 가능한 최소 실행 단위이다.

## 3. Design Principles

Change Package는 아래 원칙을 따른다.

- 하나의 Change Package는 하나의 Primary Component만 담당한다.
- 모든 Change Package는 하나 이상의 Resolution과 연결된다.
- 모든 Change Package는 독립적으로 Apply 및 Rollback이 가능해야 한다.
- 모든 Change Package는 독립적인 Validation Scope를 가진다.
- Package ID는 프로젝트 전체에서 변경하지 않는다.
- Package 간 의존성은 최소화한다.
- 하나의 Package는 자신의 Component Boundary를 넘지 않는다.

## 4. Change Package Classification

Change Package는 아래 분류 체계를 사용한다.

- Runtime Package
- Registry Package
- Loader Package
- Dataset Package
- Contract Package
- Validation Package
- Documentation Package

각 Package는 하나의 Primary Component를 가지며,
필요 시 관련 Component를 참조할 수 있다.

## 5. Package ID Rule

Package ID는 아래 규칙을 사용한다.

CP-001
CP-002
CP-003
...

규칙은 다음과 같다.

- "CP-" 접두어와 3자리 번호를 사용한다.
- Package ID는 프로젝트 전체에서 유일해야 한다.
- Package ID는 P5, P6, P7 전체에서 동일하게 유지한다.
- Package ID는 Traceability의 기준으로 사용한다.

## 6. Package Manifest

모든 Change Package는 아래 정보를 반드시 포함한다.

- Package ID
- Package Name
- Primary Component
- Related Resolution ID
- Affected Files
- Apply Order
- Rollback Strategy
- Validation Scope
- Current Status

Package Manifest는 P6 Apply와 P7 Verification의 기준 문서로 사용한다.

## 7. Deliverables

본 IU의 산출물은 다음과 같다.

- Change Package Definition
- Change Package Design Principles
- Change Package Classification
- Package ID Rule
- Package Manifest Specification

## 8. Acceptance Criteria

본 IU는 아래 조건을 모두 만족하면 완료된 것으로 판단한다.

- Change Package 정의가 완료되어 있다.
- Design Principles가 정의되어 있다.
- Classification이 정의되어 있다.
- Package ID Rule이 정의되어 있다.
- Package Manifest가 정의되어 있다.

## 9. Constraints

본 IU에서는 다음 작업을 수행하지 않는다.

- Runtime 변경
- Registry 변경
- Loader 변경
- Dataset 변경
- Contract 변경
- Resolution 변경
- System JSON 수정
- Change Apply
- Verification
- Git Commit
- Git Push

## 10. Next IU

Session ID

S7-P5-IU-5-04A

Title

Architecture Impact Analysis

Objective

각 Change Package가 Runtime, Registry, Loader, Dataset,
Contract 및 전체 SPS Architecture에 미치는 영향을 분석하고,
적용 순서와 영향 범위를 정의한다.
