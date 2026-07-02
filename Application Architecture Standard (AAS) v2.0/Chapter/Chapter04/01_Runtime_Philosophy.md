# 01_Runtime_Philosophy.md

# 3Cushion AI Application Architecture SSOT v2.0

# Chapter 04-01

# Runtime Philosophy

Version: v2.0 Status: Draft SSOT Owner: 3Cushion AI Architecture

Parent Documents: - Architecture_Constitution.md -
Chapter01_App_Authority.md - Chapter02_Layer_Architecture.md -
Chapter03_Dependency_Rule.md - Chapter04/README.md

------------------------------------------------------------------------

# 1. Purpose

본 문서는 3Cushion AI Application Runtime의 철학과 존재 목적을 정의하는
공식 Specification이다.

Runtime Philosophy는 이후 Runtime Object Model, Lifecycle, Flow,
Coordinator, Dispatcher, Loader의 설계 기준이 된다.

------------------------------------------------------------------------

# 2. Core Philosophy

Application Runtime은 **업무 흐름을 실행하는 환경(Runtime Environment)**
이다.

Runtime은 Presentation도 아니고 Domain도 아니다.

Runtime은 사용자의 요청을 하나의 실행 흐름으로 조정하는 계층이다.

------------------------------------------------------------------------

# 3. Runtime Mission

Application Runtime의 역할은 다음과 같다.

-   App.jsx로부터 Command를 수신한다.
-   적절한 Application Flow를 선택한다.
-   필요한 Domain 서비스를 호출한다.
-   System 정의를 로드한다.
-   결과를 Presentation으로 전달한다.

Runtime은 계산 공식을 구현하지 않는다.

------------------------------------------------------------------------

# 4. What / How Separation

App.jsx는 **What**을 결정한다.

Application Runtime은 **Flow**를 결정한다.

Domain은 **How**를 수행한다.

``` text
User Action
    │
    ▼
App.jsx
(What)
    │
    ▼
Application Runtime
(Flow)
    │
    ▼
Domain
(How)
```

------------------------------------------------------------------------

# 5. Runtime Principles

Application Runtime은 다음 원칙을 반드시 따른다.

1.  Generic Framework이어야 한다.
2.  특정 System을 알지 않는다.
3.  System-specific 분기를 구현하지 않는다.
4.  Domain 계산을 대체하지 않는다.
5.  Layer Dependency를 위반하지 않는다.
6.  Application Flow만 조정한다.
7.  Regression 없이 점진적으로 도입한다.

------------------------------------------------------------------------

# 6. Forbidden Responsibilities

Runtime은 다음 책임을 가지지 않는다.

-   C1\~C6 계산
-   Sn 계산
-   Trajectory Geometry 생성
-   Caption 계산
-   Search Similarity 계산
-   Dataset Merge
-   React UI Rendering

------------------------------------------------------------------------

# 7. Runtime Relationship

``` text
Presentation
      │
      ▼
Application Runtime
      │
      ▼
Application Layer
      │
      ▼
Domain
      │
      ▼
System
      │
      ▼
Dataset
      │
      ▼
Infrastructure
```

Runtime은 Layer를 연결하지만 어느 Layer의 책임도 침범하지 않는다.

------------------------------------------------------------------------

# 8. Extension Rule

새로운 기능은 Runtime에 직접 구현하지 않는다.

-   새로운 업무 → 새로운 Flow
-   새로운 계산 → Domain
-   새로운 시스템 규칙 → System Layer
-   새로운 저장 방식 → Infrastructure

Runtime은 새로운 객체를 조합할 뿐이다.

------------------------------------------------------------------------

# 9. Success Criteria

Runtime Philosophy가 만족되면 다음이 가능해야 한다.

-   App.jsx는 Orchestrator만 담당한다.
-   새로운 System 추가 시 App.jsx 수정이 필요 없다.
-   Flow 추가가 기존 Flow에 영향을 최소화한다.
-   Domain은 UI와 독립적으로 테스트 가능하다.

------------------------------------------------------------------------

# Revision History

## v2.0

-   Initial Runtime Philosophy Specification
-   Defined Runtime mission and architectural principles
