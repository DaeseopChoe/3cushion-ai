# 06_Dispatcher_Specification.md

# 3Cushion AI Application Architecture SSOT v2.0

# Chapter 04-06

# Dispatcher Specification

Version: v2.0 Status: Draft SSOT Owner: 3Cushion AI Architecture

Parent Documents: - Architecture_Constitution.md -
Chapter01_App_Authority.md - Chapter02_Layer_Architecture.md -
Chapter03_Dependency_Rule.md - Chapter04/01_Runtime_Philosophy.md -
Chapter04/02_Runtime_Object_Model.md -
Chapter04/03_Runtime_Lifecycle.md - Chapter04/04_Flow_Specification.md -
Chapter04/05_Coordinator_Specification.md

------------------------------------------------------------------------

# 1. Purpose

본 문서는 Application Runtime의 Dispatcher를 정의하는 공식
Specification이다.

Dispatcher는 Presentation에서 전달되는 모든 Runtime Command의 공식
진입점(Entry Point)이다.

Dispatcher는 계산을 수행하지 않으며, 적절한 Flow 또는 Coordinator로
Command를 전달하는 역할만 수행한다.

------------------------------------------------------------------------

# 2. Definition

Dispatcher는 Runtime의 Command Router이다.

주요 책임은 다음과 같다.

-   Command 수신
-   Command 검증
-   Runtime Context 확인
-   대상 Flow 또는 Coordinator 선택
-   Runtime으로 실행 요청 전달

------------------------------------------------------------------------

# 3. Dispatcher Position

``` text
Presentation
      │
      ▼
App.jsx
      │
      ▼
ApplicationDispatcher
      │
      ├── Flow
      └── Coordinator
              │
              ▼
            Domain
```

Dispatcher는 Presentation과 Runtime 사이의 유일한 Command 진입점이다.

------------------------------------------------------------------------

# 4. Standard Responsibilities

Dispatcher는 다음을 수행한다.

-   Command Routing
-   Command Validation
-   Runtime Context 전달
-   Flow 선택
-   Coordinator 호출
-   Runtime Error 전달

Dispatcher는 Domain 계산을 직접 호출하지 않는다.

------------------------------------------------------------------------

# 5. Standard Command Examples

-   USER_SEARCH_REQUESTED
-   ADMIN_SEARCH_REQUESTED
-   ADMIN_RECALL_REQUESTED
-   SYSTEM_CHANGED
-   OVERLAY_OPEN_REQUESTED
-   SLOT_CHANGED
-   SAVE_REQUESTED
-   RESET_REQUESTED
-   HISTORY_LOAD_REQUESTED

모든 Command는 Dispatcher를 통해 처리한다.

------------------------------------------------------------------------

# 6. Command Processing Flow

``` text
Command
   │
   ▼
Validation
   │
   ▼
Dispatch Decision
   │
   ▼
Flow / Coordinator
   │
   ▼
ApplicationResult
```

------------------------------------------------------------------------

# 7. Dependency Rules

Allowed

-   Dispatcher → Runtime Context
-   Dispatcher → Flow
-   Dispatcher → Coordinator

Forbidden

-   Dispatcher → React Component
-   Dispatcher → Domain Calculation
-   Dispatcher → System Rule
-   Dispatcher → Dataset Storage
-   Dispatcher → App.jsx Business Logic

------------------------------------------------------------------------

# 8. Error Handling

Dispatcher는 예외를 직접 처리하지 않는다.

오류 발생 시

-   ApplicationError 생성
-   Runtime 반환
-   Recovery 가능 여부 전달

------------------------------------------------------------------------

# 9. Extension Rule

새로운 기능은 새로운 Command를 추가하여 확장한다.

Dispatcher 내부에 systemId 기반 분기를 추가해서는 안 된다.

새로운 시스템 추가 때문에 Dispatcher를 수정하는 것은 Architecture
위반이다.

------------------------------------------------------------------------

# 10. Success Criteria

-   모든 Runtime 요청은 Dispatcher를 통과한다.
-   Dispatcher는 Routing만 수행한다.
-   Dispatcher는 Domain 계산을 수행하지 않는다.
-   Dispatcher는 Generic Framework를 유지한다.
-   새로운 Command 추가만으로 Runtime 확장이 가능하다.

------------------------------------------------------------------------

# Revision History

## v2.0

-   Initial Dispatcher Specification
-   Runtime Command Dispatch Architecture defined
