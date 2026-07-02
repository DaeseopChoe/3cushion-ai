# Chapter17_Logic_JSON_SSOT.md

# 3Cushion AI Application Architecture SSOT v2.0

# Part V. System Layer
# Chapter 17. logic.json SSOT Specification

Version: v2.0
Status: Draft SSOT
Owner: 3Cushion AI Architecture

Depends on:

- Architecture_Constitution.md
- Chapter10_Calculation_Domain_Specification.md
- Chapter16_Profile_JSON_SSOT.md

---

# 1. Purpose

본 Chapter는 `logic.json`의 공식 역할과 구조를 정의한다.

`logic.json`은 각 시스템의 **동적 계산 규칙(Dynamic Logic)** 을 정의하는 SSOT이다.

핵심 원칙은 다음과 같다.

> profile.json이 "무엇을 계산하는가"를 정의한다면,
> logic.json은 "어떻게 계산하는가"를 정의한다.

---

# 2. Responsibilities

logic.json의 책임

- Branch Rule
- Correction Rule
- Sync Rule
- Validation Rule
- Exception Rule
- Input Requirement
- Runtime-independent Calculation Policy

수행하지 않는 작업

- Formula 정의
- UI 정의
- Overlay 정의
- Dataset 저장
- Runtime 상태 관리

---

# 3. Position

```text
Application Runtime
        │
        ▼
System Loader
        │
        ▼
logic.json
        │
        ▼
Calculation Domain
```

Calculation Domain은 logic.json을 소비하여 계산 정책을 적용한다.

---

# 4. Standard Structure

```text
logic.json

meta
branch
correction
sync
validation
exception
baseline
merge
limits
```

각 섹션은 독립적으로 관리한다.

---

# 5. Branch Rule

Branch Rule은 시스템별 계산 분기를 정의한다.

예시

- useSn
- needsC3r
- optionalInput
- alternateFormula

Branch Rule은 App.jsx가 아니라 Calculation Domain에서 해석한다.

---

# 6. Correction Rule

Correction Rule은 계산 보정을 정의한다.

예시

- delta
- angleCorrection
- offsetCorrection
- cushionCorrection

보정은 Formula 실행 이후 적용한다.

---

# 7. Sync Rule

Sync Rule은 계산 항목 간의 동기화를 정의한다.

예시

- C4_f
- C5_f
- C6_f
- derivedValue

Sync Rule은 계산 순서를 명시할 수 있다.

---

# 8. Validation & Exception

Validation

- Required Input
- Value Range
- Coordinate Range
- Compatible System

Exception

- Invalid Combination
- Unsupported Case
- Fallback Rule
- Default Rule

Validation 실패 시 Domain Error를 반환한다.

---

# 9. Baseline & Merge

Baseline 규칙

- baseline correction
- baseline draft merge
- baseline delta

Merge 규칙

- merge priority
- conflict handling
- overwrite policy

Baseline과 Merge는 Domain에서 실행하며 정의만 logic.json에 존재한다.

---

# 10. Dependency Rule

logic.json은 다음에서 사용된다.

허용

- System Loader
- Calculation Domain
- Search Domain (필요 시)

직접 참조 금지

- App.jsx
- React Component
- Runtime Flow

항상 System Loader를 통해 접근한다.

---

# 11. Version & Validation

모든 logic.json은 다음을 포함해야 한다.

- schemaVersion
- logicVersion
- compatibleProfileVersion

필수 검증

- Schema
- Rule Consistency
- Branch Integrity
- Sync Dependency

---

# 12. Success Criteria

logic.json은 다음을 만족해야 한다.

- 계산 정책만 정의한다.
- Formula를 포함하지 않는다.
- Runtime과 독립적이다.
- Calculation Domain에서 재사용된다.
- 모든 시스템이 동일 Schema를 사용한다.

---

# 13. Future Extension

향후 추가 가능 항목

- Adaptive Rule
- AI-assisted Correction
- Dynamic Threshold
- Rule Pack
- Feature Toggle

기존 구조를 변경하지 않고 확장 가능해야 한다.

---

# 14. Final Assessment

logic.json은 3Cushion AI의 계산 정책 정의서이다.

Calculation Domain은 profile.json으로 계산 대상을 이해하고,
logic.json으로 계산 절차와 보정 규칙을 적용한다.

이를 통해 시스템별 차이를 코드가 아닌 데이터로 관리할 수 있다.

---

# Revision History

## v2.0

- Initial logic.json SSOT Specification
- Branch / Correction / Sync / Validation architecture standardized
