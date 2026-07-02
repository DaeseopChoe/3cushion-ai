# Chapter09_Domain_Architecture.md

# 3Cushion AI Application Architecture SSOT v2.0

# Part IV. Domain Layer
# Chapter 09. Domain Architecture

Version: v2.0
Status: Draft SSOT
Owner: 3Cushion AI Architecture

Depends on:

- Architecture_Constitution.md
- Chapter01_App_Authority.md
- Chapter02_Layer_Architecture.md
- Chapter03_Dependency_Rule.md
- Chapter04_Application_Runtime_Model_Specification.md
- Chapter07_Application_Layer_Specification.md
- Chapter08_System_Loader_Specification.md

---

# 1. Purpose

본 Chapter는 Domain Layer의 공식 Architecture를 정의한다.

Domain Layer는 3Cushion AI의 핵심 비즈니스 로직을 담당하는 계층이며,
Application Layer와 System Layer 사이에서 순수한 계산과 규칙을 수행한다.

핵심 원칙은 다음과 같다.

> Domain은 '어떻게 계산할 것인가'를 책임지고,
> Application은 '어떤 순서로 실행할 것인가'를 책임진다.

---

# 2. Position in Architecture

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

Domain은 UI와 System SSOT를 분리하는 핵심 계층이다.

---

# 3. Domain Principles

Domain Layer는 다음 원칙을 따른다.

- 순수 비즈니스 로직만 포함한다.
- React를 참조하지 않는다.
- 화면(Rendering)을 알지 않는다.
- Runtime을 알지 않는다.
- System 파일을 직접 로드하지 않는다.
- 외부 환경(localStorage, fetch)을 직접 접근하지 않는다.

---

# 4. Domain Responsibilities

Domain의 책임

- Calculation
- Trajectory
- Search
- Recall
- Caption
- Dataset Transform
- Baseline
- History
- AI / Lesson
- Validation

Domain의 금지 사항

- Event Routing
- Flow 관리
- UI 상태 관리
- JSON Loader 구현
- 파일 저장

---

# 5. Standard Domain Structure

```text
frontend/src/domain/

calculation/
trajectory/
search/
recall/
caption/
dataset/
baseline/
history/
ai/
lesson/
validation/
shared/
```

각 Domain은 독립적으로 테스트 가능해야 한다.

---

# 6. Communication Rule

Domain은 다음 계층만 참조할 수 있다.

허용

- shared Domain
- System Definition
- Dataset Model

금지

- Presentation
- React
- Runtime
- Flow
- Dispatcher
- Coordinator

---

# 7. Domain Interaction

```text
Application Flow
        │
        ▼
Domain Service
        │
        ▼
System Definition
        │
        ▼
Calculation Result
```

Domain끼리는 필요한 경우 명시적인 Interface를 통해 협력한다.

---

# 8. Domain Categories

## Calculation Domain

책임

- Formula 실행
- Correction
- Sync Rule
- Validation

## Trajectory Domain

책임

- Trajectory 생성
- Rail Reflection
- Geometry
- Physics Rule

## Search Domain

책임

- Matching
- Candidate 생성
- Ranking
- Threshold

## Recall Domain

책임

- Position Recall
- Similarity
- Recall Result

## Dataset Domain

책임

- Dataset Merge
- Canonicalization
- Export
- Import
- Diff

## History Domain

책임

- History Merge
- Timeline
- Undo / Redo

## AI / Lesson Domain

책임

- Lesson ViewModel
- Strategy
- Recommendation
- AI Comment

---

# 9. Shared Domain

공통 기능은 shared Domain으로 분리한다.

예시

```text
domain/shared/

math/
geometry/
validation/
utility/
```

중복 계산은 허용하지 않는다.

---

# 10. Dependency Rule

Domain은 다음 방향으로만 의존한다.

```text
Application

↓

Domain

↓

System

↓

Dataset
```

역방향 참조는 허용하지 않는다.

---

# 11. Testing Rule

모든 Domain은 단위 테스트가 가능해야 한다.

입력

- Command Model
- System Definition
- Dataset

출력

- Pure Result

React Context 없이 테스트 가능해야 한다.

---

# 12. Success Criteria

Domain Layer는 다음을 만족해야 한다.

- 순수 계산 계층이다.
- UI와 완전히 분리된다.
- Runtime과 분리된다.
- System SSOT를 소비만 한다.
- 테스트 가능하다.
- 재사용 가능하다.

---

# 13. Final Assessment

Domain Layer는 3Cushion AI의 계산 엔진이다.

Application Layer가 업무 흐름을 제어하고,
Domain Layer는 실제 계산과 규칙을 수행한다.

이 구조를 통해 새로운 System이 추가되더라도
Domain은 공통 엔진으로 재사용될 수 있다.

---

# Revision History

## v2.0

- Initial Domain Architecture
- Domain principles and responsibilities defined
- Standard domain structure established
