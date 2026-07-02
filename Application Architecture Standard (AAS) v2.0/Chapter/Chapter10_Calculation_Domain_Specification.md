# Chapter10_Calculation_Domain_Specification.md

# 3Cushion AI Application Architecture SSOT v2.0

# Part IV. Domain Layer
# Chapter 10. Calculation Domain Specification

Version: v2.0
Status: Draft SSOT
Owner: 3Cushion AI Architecture

Depends on:

- Architecture_Constitution.md
- Chapter04_Application_Runtime_Model_Specification.md
- Chapter09_Domain_Architecture.md

---

# 1. Purpose

본 Chapter는 Calculation Domain의 공식 역할과 구조를 정의한다.

Calculation Domain은 3Cushion AI의 핵심 계산 엔진이며,
모든 시스템 계산은 이 Domain을 통해 수행한다.

핵심 원칙은 다음과 같다.

> Calculation Domain은 순수 계산만 수행하며,
> UI, Runtime, Storage를 알지 않는다.

---

# 2. Responsibilities

Calculation Domain의 책임

- Formula 실행
- Correction 적용
- Branch Rule 적용
- Sync Rule 적용
- Validation
- Result 생성

금지 사항

- React 참조
- Runtime Context 관리
- 화면 Rendering
- JSON Loader 구현
- localStorage 접근

---

# 3. Position

```text
Application Flow
        │
        ▼
Calculation Domain
        │
        ▼
System Definition
        │
        ▼
Calculation Result
```

Calculation Domain은 System SSOT를 소비(consumption)만 한다.

---

# 4. Standard Structure

```text
domain/calculation/

calculator/
formula/
correction/
validation/
sync/
branch/
exception/
shared/
```

각 모듈은 하나의 계산 책임만 가진다.

---

# 5. Formula Engine

Formula Engine은 profile.json의 formula 정의를 실행한다.

입력

- Formula Definition
- Input Parameters

출력

- System Value

Formula는 App.jsx에서 직접 실행하지 않는다.

---

# 6. Correction Engine

Correction Engine은 logic.json의 보정 규칙을 적용한다.

예시

- Delta
- Offset
- Angle Correction
- Cushion Rule

Correction은 Formula 이후에 수행한다.

---

# 7. Branch Rule

Branch Rule은 시스템별 분기 규칙을 적용한다.

예시

- useSn
- needsC3r
- Sync Group
- Exception Rule

Branch Rule은 logic.json으로부터 제공된다.

---

# 8. Validation

Calculation 입력 검증

- Required Input
- Range
- Formula Parameter
- System Compatibility

Validation 실패 시 Domain Error를 반환한다.

---

# 9. Result Model

표준 결과

```ts
type CalculationResult = {

    systemValues

    corrections

    warnings

    metadata

}
```

CalculationResult는 ViewModel이 아니다.

---

# 10. Dependency Rule

Calculation Domain은 참조 가능

- System Definition
- Shared Math
- Shared Geometry

참조 금지

- React
- Runtime
- Flow
- Dispatcher
- Loader
- UI

---

# 11. Testing Rule

모든 Formula는 단위 테스트가 가능해야 한다.

입력

- System Definition
- Parameters

출력

- CalculationResult

외부 환경이 없어도 테스트 가능해야 한다.

---

# 12. Success Criteria

Calculation Domain은 다음을 만족한다.

- 순수 계산만 수행한다.
- Formula와 Correction이 분리된다.
- Branch Rule이 독립된다.
- UI와 Runtime을 참조하지 않는다.
- 새로운 System 추가 시 재사용된다.

---

# 13. Final Assessment

Calculation Domain은 3Cushion AI의 핵심 계산 엔진이다.

모든 Formula와 보정은 이 Domain에서 수행되며,
Application Layer는 계산 절차만 제어한다.

---

# Revision History

## v2.0

- Initial Calculation Domain Specification
- Formula / Correction / Validation architecture defined
