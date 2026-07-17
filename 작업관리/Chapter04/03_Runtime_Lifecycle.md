# 03_Runtime_Lifecycle.md

# 3Cushion AI Application Architecture SSOT v2.0

# Chapter 04-03

# Runtime Lifecycle

Version: v2.0 Status: Draft SSOT Owner: 3Cushion AI Architecture

Parent Documents: - Architecture_Constitution.md -
Chapter01_App_Authority.md - Chapter02_Layer_Architecture.md -
Chapter03_Dependency_Rule.md - Chapter04/01_Runtime_Philosophy.md -
Chapter04/02_Runtime_Object_Model.md

------------------------------------------------------------------------

# 1. Purpose

본 문서는 Application Runtime의 상태(State)와 실행 생명주기(Lifecycle)를
정의하는 공식 Specification이다.

Runtime은 항상 정의된 상태 전이를 따라야 하며, 임의의 상태 변경이나
Layer 우회는 허용되지 않는다.

------------------------------------------------------------------------

# 2. Lifecycle Principle

Application Runtime은 상태 기반(State-driven)으로 동작한다.

모든 사용자 요청은 Runtime State Machine을 통해 처리된다.

Runtime은 다음을 보장한다.

-   상태의 명확성
-   실행 순서의 일관성
-   Recovery 가능성
-   Regression 최소화

------------------------------------------------------------------------

# 3. Standard Lifecycle

``` text
BOOT
  │
  ▼
SYSTEM_READY
  │
  ▼
SESSION_READY
  │
  ▼
IDLE
  │
  ▼
COMMAND_RECEIVED
  │
  ▼
FLOW_RUNNING
  │
  ▼
DOMAIN_EXECUTING
  │
  ▼
RESULT_READY
  │
  ▼
RENDER_SYNC
  │
  ▼
IDLE
```

------------------------------------------------------------------------

# 4. State Definition

## BOOT

Application Runtime 초기 생성.

허용: - Runtime 생성 - Context 초기화

금지: - Domain 계산 - Dataset 접근

------------------------------------------------------------------------

## SYSTEM_READY

System Loader가 System Definition을 준비한 상태.

허용: - profile - logic - anchors - system_meta

------------------------------------------------------------------------

## SESSION_READY

현재 Session과 Application Context가 준비된 상태.

------------------------------------------------------------------------

## IDLE

Runtime 대기 상태.

새 Command를 받을 수 있다.

------------------------------------------------------------------------

## COMMAND_RECEIVED

Presentation에서 전달된 Command를 검증한다.

예:

-   USER_SEARCH_REQUESTED
-   ADMIN_RECALL_REQUESTED
-   OVERLAY_OPEN_REQUESTED
-   SYSTEM_CHANGED

------------------------------------------------------------------------

## FLOW_RUNNING

적절한 Application Flow를 선택하여 실행한다.

Runtime은 여러 Flow를 조정할 수 있지만 계산은 수행하지 않는다.

------------------------------------------------------------------------

## DOMAIN_EXECUTING

Flow가 Domain 서비스를 호출한 상태.

Runtime은 결과를 기다리며 Domain 내부 계산에는 관여하지 않는다.

------------------------------------------------------------------------

## RESULT_READY

Domain 결과가 Runtime으로 반환된 상태.

Runtime은 결과를 Application Result로 정리한다.

------------------------------------------------------------------------

## RENDER_SYNC

Presentation이 사용할 수 있는 형태로 결과를 동기화한다.

이후 Runtime은 다시 IDLE 상태로 복귀한다.

------------------------------------------------------------------------

# 5. Error Lifecycle

``` text
FLOW_RUNNING
      │
      ▼
ERROR
      │
      ▼
RECOVERY
      │
      ├─────────────┐
      ▼             │
IDLE          RESET_REQUIRED
```

Recovery가 가능하면 IDLE로 복귀한다.

복구가 불가능하면 Reset Flow를 수행한다.

------------------------------------------------------------------------

# 6. Lifecycle Rules

Runtime은 다음 규칙을 따른다.

1.  모든 Command는 IDLE에서 시작한다.
2.  Flow 없이 Domain을 직접 호출하지 않는다.
3.  RESULT_READY 이전에는 Render하지 않는다.
4.  ERROR는 반드시 Recovery 또는 Reset으로 종료한다.
5.  순환 상태를 만들지 않는다.

------------------------------------------------------------------------

# 7. Forbidden Lifecycle

금지되는 흐름

``` text
App.jsx
   │
   ├──► Domain 직접 호출
   ├──► Dataset 직접 접근
   └──► System Rule 직접 실행
```

또는

``` text
FLOW_RUNNING
      │
      ▼
RENDER_SYNC
```

Domain 실행 없이 Rendering하는 것은 허용되지 않는다.

------------------------------------------------------------------------

# 8. Success Criteria

-   Runtime State가 항상 추적 가능하다.
-   모든 Flow는 동일한 Lifecycle을 따른다.
-   Error Recovery가 정의되어 있다.
-   Layer Dependency를 위반하지 않는다.
-   Runtime은 언제든 IDLE 상태로 복귀할 수 있다.

------------------------------------------------------------------------

# Revision History

## v2.0

-   Initial Runtime Lifecycle Specification
-   Runtime State Machine 정의
-   Error / Recovery Lifecycle 추가
