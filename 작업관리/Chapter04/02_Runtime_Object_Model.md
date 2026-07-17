# 02_Runtime_Object_Model.md

# 3Cushion AI Application Architecture SSOT v2.0

# Chapter 04-02

# Runtime Object Model

Version: v2.0 Status: Draft SSOT Owner: 3Cushion AI Architecture

Parent Documents: - Architecture_Constitution.md -
Chapter01_App_Authority.md - Chapter02_Layer_Architecture.md -
Chapter03_Dependency_Rule.md - Chapter04/README.md -
Chapter04/01_Runtime_Philosophy.md

------------------------------------------------------------------------

# 1. Purpose

본 문서는 Application Runtime을 구성하는 핵심 Runtime Object와 그 책임을
정의하는 공식 Specification이다.

Runtime은 객체(Object)의 조합으로 구성되며, 각 객체는 단일 책임(Single
Responsibility)을 가진다.

------------------------------------------------------------------------

# 2. Runtime Object Overview

``` text
ApplicationRuntime
 ├─ ApplicationContext
 ├─ ApplicationSession
 ├─ ApplicationDispatcher
 ├─ ApplicationCoordinator
 ├─ ApplicationFlow
 ├─ ApplicationLoader
 ├─ ApplicationCommand
 ├─ ApplicationResult
 ├─ ApplicationState
 └─ ApplicationError
```

모든 Runtime 객체는 Layer Dependency Rule을 준수해야 한다.

------------------------------------------------------------------------

# 3. Object Definitions

## 3.1 ApplicationRuntime

Purpose - Runtime 전체를 관리하는 최상위 실행 환경

Responsibilities - Runtime Boot - Flow 실행 - Lifecycle 관리 -
Coordinator 생성

Forbidden - Domain 계산 - System Rule 구현

------------------------------------------------------------------------

## 3.2 ApplicationContext

Purpose - 현재 실행에 필요한 공통 Context 제공

Contains - mode - systemId - shotType - session - runtimeState

------------------------------------------------------------------------

## 3.3 ApplicationSession

Purpose - 사용자 Session과 Runtime Session 관리

Responsibilities - 현재 선택 상태 유지 - Session 동기화

------------------------------------------------------------------------

## 3.4 ApplicationDispatcher

Purpose - Command를 적절한 Flow로 전달

Responsibilities - Command Routing - Validation - Dispatch

Dispatcher는 Domain을 직접 호출하지 않는다.

------------------------------------------------------------------------

## 3.5 ApplicationCoordinator

Purpose - 여러 Flow를 하나의 업무 결과로 조정

Examples - SearchCoordinator - OverlayCoordinator - HistoryCoordinator

Coordinator는 계산을 수행하지 않는다.

------------------------------------------------------------------------

## 3.6 ApplicationFlow

Purpose - 하나의 Use Case를 실행

Examples - UserSearchFlow - AdminRecallFlow - OverlayOpenFlow -
HistoryLoadFlow

Flow는 Domain을 호출하고 결과를 조합한다.

------------------------------------------------------------------------

## 3.7 ApplicationLoader

Purpose - Runtime에 필요한 정의를 준비

Loads - System Definition - Dataset Metadata - Runtime Configuration

Loader는 System Loader를 통해 System을 조회한다.

------------------------------------------------------------------------

## 3.8 ApplicationCommand

Purpose - Runtime이 처리하는 입력 명령

Examples

-   USER_SEARCH_REQUESTED
-   ADMIN_RECALL_REQUESTED
-   SYSTEM_CHANGED
-   SAVE_REQUESTED
-   RESET_REQUESTED

------------------------------------------------------------------------

## 3.9 ApplicationResult

Purpose - Runtime의 표준 출력 객체

Contains - nextState - viewModel - renderRequest - errors

------------------------------------------------------------------------

## 3.10 ApplicationState

Purpose - Runtime Lifecycle 상태 표현

Examples - BOOT - IDLE - FLOW_RUNNING - RESULT_READY

------------------------------------------------------------------------

## 3.11 ApplicationError

Purpose - Runtime Error를 표준 형식으로 표현

Contains - code - message - severity - recoverable

------------------------------------------------------------------------

# 4. Object Relationship

``` text
App.jsx
   │
   ▼
ApplicationRuntime
   │
   ├── Dispatcher
   ├── Coordinator
   ├── Loader
   ├── Flow
   │
   ▼
Domain
```

------------------------------------------------------------------------

# 5. Dependency Rules

Allowed

-   Runtime → Flow
-   Flow → Domain
-   Loader → System
-   Coordinator → Flow

Forbidden

-   Flow → React
-   Domain → Runtime
-   Loader → UI
-   Runtime → System-specific calculation

------------------------------------------------------------------------

# 6. Extension Rules

새로운 기능은 기존 Object를 수정하기보다 새로운 Flow 또는 Coordinator를
추가한다.

새로운 System 추가를 위해 Runtime Object를 수정해서는 안 된다.

------------------------------------------------------------------------

# 7. Success Criteria

-   Runtime Object 책임이 명확하다.
-   객체 간 순환 참조가 없다.
-   App.jsx는 Runtime만 호출한다.
-   Runtime은 Generic Framework를 유지한다.

------------------------------------------------------------------------

# Revision History

## v2.0

-   Initial Runtime Object Model
-   Runtime object responsibilities defined
