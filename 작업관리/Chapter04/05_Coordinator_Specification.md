# 05_Coordinator_Specification.md

# 3Cushion AI Application Architecture SSOT v2.0

# Chapter 04-05

# Coordinator Specification

Version: v2.0 Status: Draft SSOT Owner: 3Cushion AI Architecture

Parent Documents: - Architecture_Constitution.md -
Chapter01_App_Authority.md - Chapter02_Layer_Architecture.md -
Chapter03_Dependency_Rule.md - Chapter04/01_Runtime_Philosophy.md -
Chapter04/02_Runtime_Object_Model.md -
Chapter04/03_Runtime_Lifecycle.md - Chapter04/04_Flow_Specification.md

------------------------------------------------------------------------

# 1. Purpose

본 문서는 Application Runtime의 Coordinator 역할과 책임을 정의하는 공식
Specification이다.

Coordinator는 여러 Flow를 조합하여 하나의 업무 결과를 만드는 Runtime
구성 요소이며, 계산이나 UI를 담당하지 않는다.

------------------------------------------------------------------------

# 2. Definition

Coordinator는 Runtime 내부의 오케스트레이션 계층이다.

주요 역할은 다음과 같다.

-   여러 Flow 실행 순서 관리
-   Flow 간 데이터 전달
-   공통 Runtime Context 유지
-   최종 ApplicationResult 조합

------------------------------------------------------------------------

# 3. Coordinator Position

``` text
ApplicationRuntime
        │
        ▼
 ApplicationCoordinator
   ├── Flow A
   ├── Flow B
   ├── Flow C
        │
        ▼
      Domain
```

Coordinator는 Flow를 관리하지만 Domain 내부 구현에는 관여하지 않는다.

------------------------------------------------------------------------

# 4. Standard Responsibilities

Coordinator는 다음 책임을 가진다.

-   Flow 선택
-   Flow 실행 순서 제어
-   Runtime Context 공유
-   결과 통합
-   오류 전파
-   Recovery Flow 호출

------------------------------------------------------------------------

# 5. Recommended Coordinators

Core Coordinator

-   SearchCoordinator
-   RecallCoordinator
-   TrajectoryCoordinator
-   OverlayCoordinator
-   HistoryCoordinator
-   SessionCoordinator
-   SaveCoordinator

필요 시 새로운 Coordinator를 추가할 수 있다.

------------------------------------------------------------------------

# 6. Standard Contract

Input

-   Runtime Context
-   ApplicationCommand

Output

-   ApplicationResult

Coordinator는 React Component를 반환하지 않는다.

------------------------------------------------------------------------

# 7. Allowed Dependencies

허용

-   Coordinator → Flow
-   Coordinator → Loader
-   Coordinator → Runtime Context

금지

-   Coordinator → React
-   Coordinator → App.jsx
-   Coordinator → System Rule
-   Coordinator → Domain Calculation 구현
-   Coordinator → Dataset Storage 직접 접근

------------------------------------------------------------------------

# 8. Coordination Rules

Coordinator는

1.  하나 이상의 Flow를 실행할 수 있다.
2.  동일 Flow를 반복 호출할 수 있다.
3.  Flow 실패 시 Recovery를 결정한다.
4.  Domain 계산을 직접 수행하지 않는다.
5.  새로운 System 때문에 수정되어서는 안 된다.

------------------------------------------------------------------------

# 9. Error Handling

Coordinator는 오류를 숨기지 않는다.

오류 발생 시

-   ApplicationError 생성
-   Runtime 반환
-   Recovery 가능 여부 표시
-   필요 시 Reset Flow 호출

------------------------------------------------------------------------

# 10. Extension Rule

새로운 업무 절차는

-   기존 Coordinator 수정보다
-   새로운 Coordinator 추가를 우선한다.

Coordinator 내부에 systemId 기반 분기를 추가하는 것은 Architecture
위반이다.

------------------------------------------------------------------------

# 11. Success Criteria

-   Coordinator는 Flow만 조정한다.
-   Domain 계산을 포함하지 않는다.
-   Layer Dependency를 위반하지 않는다.
-   Runtime 확장이 Coordinator 추가만으로 가능하다.
-   App.jsx는 Coordinator를 직접 구현하지 않는다.

------------------------------------------------------------------------

# Revision History

## v2.0

-   Initial Coordinator Specification
-   Coordinator responsibility and contract defined
