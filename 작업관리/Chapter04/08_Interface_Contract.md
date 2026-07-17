# 08_Interface_Contract.md

# 3Cushion AI Application Architecture SSOT v2.0

# Chapter 04-08

# Interface Contract

Version: v2.0 Status: Draft SSOT Owner: 3Cushion AI Architecture

Parent Documents: - Architecture_Constitution.md -
Chapter01_App_Authority.md - Chapter02_Layer_Architecture.md -
Chapter03_Dependency_Rule.md - Chapter04/01_Runtime_Philosophy.md -
Chapter04/02_Runtime_Object_Model.md -
Chapter04/03_Runtime_Lifecycle.md - Chapter04/04_Flow_Specification.md -
Chapter04/05_Coordinator_Specification.md -
Chapter04/06_Dispatcher_Specification.md -
Chapter04/07_Loader_Specification.md

------------------------------------------------------------------------

# 1. Purpose

본 문서는 Application Runtime 내부 객체들이 서로 통신하기 위해 사용하는
표준 Interface Contract를 정의하는 공식 Specification이다.

모든 Runtime 구성 요소는 본 문서의 계약(Contract)을 준수해야 하며,
구현은 변경될 수 있어도 계약은 안정적으로 유지되어야 한다.

------------------------------------------------------------------------

# 2. Design Principles

Interface Contract는 다음 원칙을 따른다.

-   구현보다 계약을 우선한다.
-   객체는 계약을 통해서만 상호작용한다.
-   내부 구현은 외부에 노출하지 않는다.
-   Layer Dependency Rule을 위반하지 않는다.

------------------------------------------------------------------------

# 3. Standard Runtime Contracts

## 3.1 ApplicationCommand

Purpose

-   Runtime 요청의 표준 입력

Contains

-   commandType
-   payload
-   timestamp
-   requestId

------------------------------------------------------------------------

## 3.2 ApplicationContext

Purpose

-   Runtime 실행 Context 제공

Contains

-   mode
-   systemId
-   shotType
-   session
-   runtimeState

------------------------------------------------------------------------

## 3.3 ApplicationResult

Purpose

-   Runtime 표준 출력

Contains

-   nextState
-   viewModel
-   renderRequest
-   errors

------------------------------------------------------------------------

## 3.4 ApplicationError

Purpose

-   Runtime 오류 표현

Contains

-   code
-   message
-   severity
-   recoverable

------------------------------------------------------------------------

## 3.5 ResolvedSystemDefinition

Purpose

-   System Loader가 반환하는 표준 객체

Contains

-   profile
-   logic
-   anchors
-   systemMeta

App.jsx는 내부 파일을 직접 참조하지 않는다.

------------------------------------------------------------------------

## 3.6 FlowResult

Purpose

-   Flow 실행 결과

Contains

-   status
-   result
-   error

------------------------------------------------------------------------

## 3.7 CoordinatorResult

Purpose

-   Coordinator 실행 결과

Contains

-   mergedResult
-   executionSummary
-   errors

------------------------------------------------------------------------

# 4. Interface Relationships

``` text
ApplicationCommand
        │
        ▼
ApplicationDispatcher
        │
        ▼
ApplicationFlow
        │
        ▼
Coordinator
        │
        ▼
ApplicationResult
```

------------------------------------------------------------------------

# 5. Compatibility Rules

모든 Runtime 객체는 Interface를 유지해야 한다.

허용

-   내부 구현 변경
-   성능 개선
-   캐시 추가

금지

-   계약 없이 반환 객체 변경
-   필수 필드 제거
-   Layer 우회

------------------------------------------------------------------------

# 6. Versioning Policy

Interface 변경은 다음 중 하나를 따른다.

-   Patch : 내부 구현 변경
-   Minor : 선택 필드 추가
-   Major : 계약 변경

Major 변경 시 Runtime 전체 검토가 필요하다.

------------------------------------------------------------------------

# 7. Extension Rules

새로운 기능은 기존 Contract를 깨지 않고 확장한다.

새로운 Runtime 객체는 기존 Interface를 상속하거나 동일한 계약 구조를
따라야 한다.

------------------------------------------------------------------------

# 8. Success Criteria

-   Runtime 객체는 Interface만 의존한다.
-   구현 교체가 가능하다.
-   App.jsx는 구현 세부사항을 알지 않는다.
-   Runtime은 Generic Framework를 유지한다.

------------------------------------------------------------------------

# Revision History

## v2.0

-   Initial Interface Contract
-   Runtime object contracts standardized
