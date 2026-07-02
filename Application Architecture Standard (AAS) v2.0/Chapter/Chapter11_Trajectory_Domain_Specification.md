# Chapter11_Trajectory_Domain_Specification.md

# 3Cushion AI Application Architecture SSOT v2.0

# Part IV. Domain Layer
# Chapter 11. Trajectory Domain Specification

Version: v2.0
Status: Draft SSOT
Owner: 3Cushion AI Architecture

Depends on:

- Architecture_Constitution.md
- Chapter04_Application_Runtime_Model_Specification.md
- Chapter09_Domain_Architecture.md
- Chapter10_Calculation_Domain_Specification.md

---

# 1. Purpose

본 Chapter는 Trajectory Domain의 공식 역할과 구조를 정의한다.

Trajectory Domain은 Calculation Domain에서 생성된 시스템 계산 결과를 기반으로
공의 이동 경로와 쿠션 반사, 기준 좌표, 표시용 궤적 정보를 생성하는 순수 Domain이다.

핵심 원칙은 다음과 같다.

> Trajectory Domain은 "어떻게 이동하는가"를 계산하며,
> Rendering은 수행하지 않는다.

---

# 2. Responsibilities

Trajectory Domain의 책임

- Trajectory 생성
- Rail Reflection 계산
- Impact Point 계산
- Geometry 계산
- Physics Rule 적용
- Mark 생성
- Caption 위치 계산을 위한 기준 제공

수행하지 않는 작업

- Canvas Rendering
- React Component 제어
- Overlay 표시
- Runtime Flow 제어
- Dataset 저장

---

# 3. Position

```text
Application Flow
        │
        ▼
Trajectory Domain
        │
        ▼
Calculation Result
        │
        ▼
Trajectory Result
```

Trajectory Domain은 Calculation Domain의 결과를 소비한다.

---

# 4. Standard Structure

```text
domain/trajectory/

generator/
geometry/
physics/
reflection/
mark/
guide/
caption/
validation/
shared/
```

각 모듈은 하나의 책임만 가진다.

---

# 5. Trajectory Pipeline

표준 실행 순서

```text
Calculation Result
        │
        ▼
Input Validation
        │
        ▼
Geometry
        │
        ▼
Reflection
        │
        ▼
Physics Rule
        │
        ▼
Trajectory Generation
        │
        ▼
Mark Generation
        │
        ▼
Trajectory Result
```

---

# 6. Geometry Engine

Geometry Engine의 책임

- 좌표 계산
- 방향 벡터 계산
- Rail 교차 계산
- 기준 좌표 생성

Geometry는 Rendering 좌표가 아닌 Domain 좌표를 생성한다.

---

# 7. Reflection Engine

Reflection Engine은 쿠션 반사 규칙을 적용한다.

예시

- Rail Reflection
- Reflection Direction
- Cushion Count
- Reflection Validation

Reflection Rule은 System SSOT에서 제공되는 규칙을 따른다.

---

# 8. Physics Rule

Physics Rule은 물리 모델을 적용한다.

포함 가능 항목

- 진행 방향
- 반사 방향
- 보정값
- 시스템별 물리 규칙

Physics Rule은 계산 결과를 수정하지 않고 Trajectory를 생성하기 위한 규칙으로만 사용한다.

---

# 9. Mark Model

Trajectory Domain은 표시 기준이 되는 Mark를 생성한다.

표준 개념

```text
Trajectory Result

├─ Path
├─ Rail Points
├─ Impact Points
├─ Marks
├─ Caption Anchors
└─ Metadata
```

Rendering Layer는 Mark를 소비만 한다.

---

# 10. Dependency Rule

Trajectory Domain은 참조 가능

- Calculation Domain
- Shared Geometry
- Shared Math
- System Definition

참조 금지

- React
- Runtime
- Flow
- Dispatcher
- Loader
- Canvas Rendering

---

# 11. Testing Rule

Trajectory Domain은 순수 함수 형태로 테스트 가능해야 한다.

입력

- CalculationResult
- System Definition

출력

- TrajectoryResult

동일 입력은 항상 동일 Trajectory를 생성해야 한다.

---

# 12. Success Criteria

Trajectory Domain은 다음을 만족해야 한다.

- Rendering과 분리된다.
- 순수 Geometry와 Reflection을 담당한다.
- Physics Rule이 독립적이다.
- Mark 생성이 표준화된다.
- 모든 시스템에서 재사용 가능하다.

---

# 13. Final Assessment

Trajectory Domain은 3Cushion AI의 공통 궤적 엔진이다.

Calculation Domain이 "무엇을 계산할 것인가"를 결정한다면,
Trajectory Domain은 "그 결과를 공간상에서 어떻게 표현할 것인가"를 계산한다.

이를 통해 UI와 계산을 분리하고, 모든 시스템에서 동일한 Trajectory Framework를 사용할 수 있다.

---

# Revision History

## v2.0

- Initial Trajectory Domain Specification
- Geometry, Reflection, Physics, Mark architecture defined
