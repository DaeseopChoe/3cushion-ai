# 07_Loader_Specification.md

# 3Cushion AI Application Architecture SSOT v2.0

# Chapter 04-07

# Loader Specification

Version: v2.0 Status: Draft SSOT Owner: 3Cushion AI Architecture

Parent Documents: - Architecture_Constitution.md -
Chapter01_App_Authority.md - Chapter02_Layer_Architecture.md -
Chapter03_Dependency_Rule.md - Chapter04/01_Runtime_Philosophy.md -
Chapter04/02_Runtime_Object_Model.md -
Chapter04/03_Runtime_Lifecycle.md - Chapter04/04_Flow_Specification.md -
Chapter04/05_Coordinator_Specification.md -
Chapter04/06_Dispatcher_Specification.md

------------------------------------------------------------------------

# 1. Purpose

본 문서는 Application Runtime의 Loader 구조와 책임을 정의하는 공식
Specification이다.

Loader는 Runtime이 필요로 하는 정의(Definition)와 메타데이터를 준비하는
구성 요소이며, 업무 흐름이나 계산을 수행하지 않는다.

------------------------------------------------------------------------

# 2. Philosophy

Loader의 목적은 **무엇을 사용할 것인지 준비(Prepare)** 하는 것이다.

Loader는 계산하지 않고, 판단하지 않으며, 실행하지 않는다.

------------------------------------------------------------------------

# 3. Loader Responsibilities

Loader는 다음 역할만 수행한다.

-   Runtime Configuration 로드
-   System Definition 로드
-   Dataset Metadata 준비
-   Runtime Context 초기화 지원
-   Resource Cache 관리(선택)

------------------------------------------------------------------------

# 4. Loader Architecture

``` text
ApplicationRuntime
        │
        ▼
ApplicationLoader
        │
        ├── Runtime Loader
        ├── System Loader
        ├── Dataset Loader
        └── Configuration Loader
```

각 Loader는 단일 책임을 가진다.

------------------------------------------------------------------------

# 5. System Loader

System Loader는 Runtime이 사용할 시스템 정의를 제공한다.

입력

-   systemId

출력

-   profile.json
-   logic.json
-   anchors.json
-   system_meta.json

최종 반환 객체

-   ResolvedSystemDefinition

App.jsx는 위 파일을 직접 읽지 않는다.

------------------------------------------------------------------------

# 6. Recommended Loader Modules

-   RuntimeLoader
-   SystemLoader
-   DatasetLoader
-   ConfigurationLoader
-   ResourceLoader

필요 시 Loader를 추가할 수 있으나 기존 Loader의 책임을 침범해서는 안
된다.

------------------------------------------------------------------------

# 7. Dependency Rules

Allowed

-   Loader → System Layer
-   Loader → Dataset Layer
-   Loader → Infrastructure

Forbidden

-   Loader → React
-   Loader → Presentation
-   Loader → Domain Calculation
-   Loader → Business Flow
-   Loader → System-specific Branch

------------------------------------------------------------------------

# 8. Loading Sequence

``` text
BOOT
  │
  ▼
Runtime Loader
  │
  ▼
System Loader
  │
  ▼
Dataset Loader
  │
  ▼
Configuration Ready
  │
  ▼
Runtime Ready
```

모든 Loader는 정의를 준비한 후 Runtime에 반환한다.

------------------------------------------------------------------------

# 9. Extension Rules

새로운 시스템 추가 시

-   Loader Interface는 변경하지 않는다.
-   새로운 systemId만 추가한다.
-   System Loader는 동일한 계약(Contract)을 유지한다.

새로운 저장 방식은 Infrastructure Adapter를 추가하여 지원한다.

------------------------------------------------------------------------

# 10. Success Criteria

-   App.jsx는 Loader만 호출한다.
-   App.jsx는 profile.json을 직접 읽지 않는다.
-   Loader는 계산을 수행하지 않는다.
-   Loader는 Generic Framework를 유지한다.
-   새로운 시스템 추가 시 Loader 수정이 최소화된다.

------------------------------------------------------------------------

# Revision History

## v2.0

-   Initial Loader Specification
-   System Loader contract defined
-   Runtime loading sequence established
