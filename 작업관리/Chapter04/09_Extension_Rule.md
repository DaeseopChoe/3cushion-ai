# 09_Extension_Rule.md

# 3Cushion AI Application Architecture SSOT v2.0

# Chapter 04-09

# Extension Rule

Version: v2.0 Status: Draft SSOT Owner: 3Cushion AI Architecture

Parent Documents: - Architecture_Constitution.md -
Chapter01_App_Authority.md - Chapter02_Layer_Architecture.md -
Chapter03_Dependency_Rule.md - Chapter04/README.md -
Chapter04/01_Runtime_Philosophy.md -
Chapter04/02_Runtime_Object_Model.md -
Chapter04/03_Runtime_Lifecycle.md - Chapter04/04_Flow_Specification.md -
Chapter04/05_Coordinator_Specification.md -
Chapter04/06_Dispatcher_Specification.md -
Chapter04/07_Loader_Specification.md -
Chapter04/08_Interface_Contract.md

------------------------------------------------------------------------

# 1. Purpose

본 문서는 3Cushion AI Application Runtime의 확장(Extension) 규칙을
정의하는 공식 Specification이다.

Application Runtime은 새로운 기능과 새로운 시스템이 지속적으로 추가되는
것을 전제로 설계되며, 기존 구조를 훼손하지 않는 확장 방식을 제공해야
한다.

------------------------------------------------------------------------

# 2. Core Principle

확장은 **수정(Modification)** 보다 **추가(Addition)** 를 우선한다.

새로운 요구사항 때문에 기존 Runtime 핵심 객체를 변경하는 것은
최소화한다.

------------------------------------------------------------------------

# 3. Open / Closed Principle

Application Runtime은 다음 원칙을 따른다.

-   기존 Runtime은 가능한 한 수정하지 않는다.
-   새로운 기능은 새로운 객체를 추가하여 구현한다.
-   기존 Interface Contract는 유지한다.
-   기존 Flow의 동작을 변경하지 않는다.

------------------------------------------------------------------------

# 4. Runtime Extension Targets

확장이 허용되는 대상

-   ApplicationFlow
-   ApplicationCoordinator
-   ApplicationLoader
-   ApplicationCommand
-   Runtime Configuration
-   Infrastructure Adapter

확장이 아닌 변경 대상

-   Layer Architecture
-   Dependency Rule
-   Runtime Core Contract

------------------------------------------------------------------------

# 5. System Extension Rule

새로운 시스템 추가 절차

1.  systemId 등록
2.  profile.json 작성
3.  logic.json 작성
4.  anchors.json 작성
5.  system_meta.json 작성

금지 사항

-   App.jsx 수정
-   Dispatcher 수정
-   Coordinator 수정
-   Flow 내부 systemId 분기 추가

새 시스템 추가를 위해 App.jsx를 수정해야 한다면 Architecture 위반이다.

------------------------------------------------------------------------

# 6. Feature Extension Rule

새로운 기능은 다음 순서를 따른다.

``` text
User Requirement
      │
      ▼
New Application Flow
      │
      ▼
New Domain Service
      │
      ▼
Optional Infrastructure Adapter
```

기존 Flow에 unrelated 기능을 추가하지 않는다.

------------------------------------------------------------------------

# 7. Interface Compatibility

새로운 객체는 기존 Interface Contract를 준수한다.

허용

-   선택 필드 추가
-   새로운 Command 추가
-   새로운 Flow 추가

금지

-   기존 필수 필드 삭제
-   계약 없는 반환 형식 변경
-   Runtime 객체 간 순환 의존

------------------------------------------------------------------------

# 8. Dependency Rule

확장 후에도 다음 방향을 유지한다.

Presentation ↓ Application ↓ Domain ↓ System ↓ Dataset ↓ Infrastructure

역방향 의존은 허용되지 않는다.

------------------------------------------------------------------------

# 9. Regression Rule

확장 후 반드시 유지되어야 하는 항목

-   USER Search
-   ADMIN Search / Recall
-   System Calculation
-   Trajectory
-   Overlay
-   Published Dataset Loader
-   Build 성공

기능 추가는 기존 동작을 변경해서는 안 된다.

------------------------------------------------------------------------

# 10. Cursor Implementation Rule

Cursor는 다음 절차를 따른다.

1.  Ask Mode로 영향 분석
2.  Architecture 검토
3.  Agent Mode로 구현
4.  Regression Test 수행
5.  Commit

------------------------------------------------------------------------

# 11. Success Criteria

-   Runtime Core 변경 없이 기능 확장이 가능하다.
-   새로운 시스템 추가 시 App.jsx 수정이 필요 없다.
-   Layer Architecture가 유지된다.
-   Interface Contract가 유지된다.
-   Generic Framework 특성이 유지된다.

------------------------------------------------------------------------

# Revision History

## v2.0

-   Initial Extension Rule
-   Generic Runtime extension policy defined
-   System and Feature extension rules established
