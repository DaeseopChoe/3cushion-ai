# Chapter07_Application_Layer_Specification.md

# 3Cushion AI Application Architecture SSOT v2.0

# Part III. Application Layer
# Chapter 07. Application Layer Specification

Version: v2.0
Status: Draft SSOT
Owner: 3Cushion AI Architecture

Depends on:

- Architecture_Constitution.md
- Chapter01_App_Authority.md
- Chapter02_Layer_Architecture.md
- Chapter03_Dependency_Rule.md
- Chapter04_Application_Runtime_Model_Specification.md
- Chapter05_App_jsx_Dissecton.md
- Chapter06_Runtime_Refactoring_Phase.md

---

# 1. Purpose

본 Chapter는 Application Layer의 공식 역할과 책임을 정의한다.

Application Layer는 UI도 아니고 Domain도 아니다.

Application Layer는 **업무 흐름(Business Flow)** 을 관리하는 계층이다.

핵심 원칙은 다음과 같다.

> Presentation은 요청을 전달하고, Domain은 계산을 수행하며,
> Application Layer는 전체 업무 흐름을 조정한다.

---

# 2. Layer Position

```text
Presentation
    │
    ▼
Application Layer
    │
    ▼
Domain Layer
    │
    ▼
System Layer
    │
    ▼
Dataset Layer
    │
    ▼
Infrastructure
```

Application Layer는 Presentation과 Domain 사이의 유일한 조정 계층이다.

---

# 3. Responsibilities

Application Layer의 책임

- Runtime Context 관리
- Event Routing
- Flow 실행
- Coordinator 호출
- Loader 호출
- Domain 호출 순서 제어
- 결과 조립(ViewModel)
- Runtime State 갱신

Application Layer의 금지 사항

- 계산 수행
- System Rule 구현
- Dataset 저장 형식 정의
- React UI Rendering

---

# 4. Core Components

```text
application/

runtime/
dispatcher/
coordinator/
flow/
loader/
context/
types/
```

각 컴포넌트는 단일 책임 원칙(SRP)을 따른다.

---

# 5. Flow Model

표준 실행 흐름

```text
User Event
    │
    ▼
Dispatcher
    │
    ▼
Flow
    │
    ▼
Coordinator
    │
    ▼
Domain
    │
    ▼
Application Result
    │
    ▼
Presentation Render
```

---

# 6. Runtime Context

Runtime Context는 모든 Flow가 공유하는 실행 정보이다.

포함 예시

- mode
- systemId
- shotType
- selectedSlot
- session
- runtimeState

Runtime Context는 Domain 계산 결과를 저장하지 않는다.

---

# 7. Command Contract

Application Layer는 Command 기반으로 동작한다.

예시

```text
USER_SEARCH_REQUESTED
ADMIN_SEARCH_REQUESTED
ADMIN_RECALL_REQUESTED
SYSTEM_CHANGED
OVERLAY_OPEN_REQUESTED
SAVE_REQUESTED
RESET_REQUESTED
```

모든 Command는 Dispatcher를 통해 진입한다.

---

# 8. ViewModel Rule

Application Layer는 Domain 결과를 UI 친화적인 ViewModel로 변환할 수 있다.

허용

- ViewModel 생성
- 표시 순서 조정
- 화면 상태 구성

금지

- 계산 변경
- System 값 수정

---

# 9. Dependency Rule

Application Layer는 다음 계층만 참조할 수 있다.

```text
Presentation ← 호출됨

Domain

System Loader

Infrastructure Adapter
```

Application Layer끼리만 서로 참조할 수 있으며, Presentation이 Domain을 직접 호출해서는 안 된다.

---

# 10. Directory Standard

권장 구조

```text
frontend/src/application/

runtime/
dispatcher/
coordinator/
flow/
loader/
context/
types/
hooks/
```

대표 Flow

- UserSearchFlow
- AdminSearchFlow
- RecallFlow
- TrajectoryFlow
- OverlayFlow
- HistoryFlow
- SaveFlow
- SlotFlow

---

# 11. App.jsx Relationship

App.jsx는 Application Layer의 진입점이다.

역할

- Runtime 생성
- Dispatch 연결
- Layout 구성
- Context Provider 연결

App.jsx는 Domain 계산을 수행하지 않는다.

---

# 12. Success Criteria

Application Layer는 다음을 만족해야 한다.

- 업무 흐름을 담당한다.
- Domain 계산을 직접 수행하지 않는다.
- UI와 계산을 분리한다.
- 새로운 System 추가 시 수정되지 않는다.
- Runtime의 Generic Framework를 유지한다.

---

# 13. Final Assessment

Application Layer는 3Cushion AI Runtime Architecture의 핵심 조정 계층이다.

이 계층을 통해 App.jsx는 Orchestrator로 단순화되고, Domain은 순수 계산 계층으로 유지된다.

---

# Revision History

## v2.0

- Initial Application Layer Specification
- Runtime-oriented Application Layer defined
