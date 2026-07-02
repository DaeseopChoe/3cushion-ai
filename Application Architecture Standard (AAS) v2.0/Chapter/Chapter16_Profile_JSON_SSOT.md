# Chapter16_Profile_JSON_SSOT.md

# 3Cushion AI Application Architecture SSOT v2.0

# Part V. System Layer
# Chapter 16. profile.json SSOT Specification

Version: v2.0
Status: Draft SSOT
Owner: 3Cushion AI Architecture

Depends on:

- Architecture_Constitution.md
- Chapter08_System_Loader_Specification.md
- Chapter10_Calculation_Domain_Specification.md

---

# 1. Purpose

본 Chapter는 `profile.json`의 공식 역할과 구조를 정의한다.

`profile.json`은 각 3쿠션 시스템의 **정적 정의(Static Definition)** 를 보관하는 SSOT(Single Source of Truth)이다.

핵심 원칙은 다음과 같다.

> profile.json은 "무엇을 계산하고 어떻게 표현할 것인가"를 정의하지만,
> 계산 로직이나 보정 규칙은 포함하지 않는다.

---

# 2. Responsibilities

profile.json의 책임

- System 기본 정보
- Formula 정의
- 입력 항목 정의
- 출력 항목 정의
- Display 규칙
- Overlay 정의
- UI Metadata
- Search Metadata
- Lesson Metadata

수행하지 않는 작업

- 계산 수행
- 보정(Correction)
- Branch Rule
- Sync Rule
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
profile.json
        │
        ▼
Calculation Domain
```

Calculation Domain은 profile.json을 소비만 한다.

---

# 4. Standard Structure

```text
profile.json

meta
system
formula
input
output
display
overlay
search
lesson
ui
```

각 섹션은 독립적으로 관리한다.

---

# 5. Formula Definition

Formula는 계산식의 정의를 제공한다.

예시

```json
{
  "formula": {
    "expr": "1C_f = CO_f + 2C_r"
  }
}
```

Formula는 선언(Definition)만 포함한다.

실행은 Calculation Domain이 담당한다.

---

# 6. Display Definition

Display는 표시 정책을 정의한다.

예시

- Label Format
- Caption Style
- Overlay Type
- Mark Visibility
- Color Group

Display는 계산 결과를 변경하지 않는다.

---

# 7. Input / Output Definition

Input

- Required Parameter
- Optional Parameter
- Coordinate Type
- System Value

Output

- Result Value
- Mark
- Display Hint

입출력 정의는 UI가 아니라 System 정의이다.

---

# 8. Metadata

Metadata 예시

- System Name
- Alias
- Version
- Author
- Difficulty
- Description

Metadata는 system_meta.json과 함께 사용되지만,
계산에 필요한 기본 정보는 profile.json에 포함될 수 있다.

---

# 9. Dependency Rule

profile.json은 참조 가능

- System Loader
- Calculation Domain
- Search Domain
- Lesson Domain

직접 참조 금지

- App.jsx
- React Component
- Runtime Flow

항상 System Loader를 통해 접근한다.

---

# 10. Versioning

모든 profile.json은 버전을 가진다.

예시

```json
{
  "meta": {
    "version": "2.0"
  }
}
```

버전은 Loader가 관리한다.

---

# 11. Validation Rule

필수 검증

- Schema
- Formula 존재
- Input 정의
- Output 정의
- Version

Validation 실패 시 System Loader는 오류를 반환한다.

---

# 12. Success Criteria

profile.json은 다음을 만족해야 한다.

- System 정의만 포함한다.
- 계산 로직을 포함하지 않는다.
- Runtime과 독립적이다.
- Loader를 통해 제공된다.
- 모든 시스템에서 동일 Schema를 사용한다.

---

# 13. Future Extension

향후 추가 가능 항목

- Localization
- Theme
- Accessibility Metadata
- Visualization Preference
- Feature Flag

기존 구조를 변경하지 않고 확장 가능해야 한다.

---

# 14. Final Assessment

profile.json은 3Cushion AI의 시스템 정의서이다.

Calculation Domain은 profile.json을 통해
무엇을 계산해야 하는지를 이해하고,

Application Layer는 System Loader를 통해
이를 일관된 방식으로 사용할 수 있다.

---

# Revision History

## v2.0

- Initial profile.json SSOT Specification
- Formula / Display / Metadata structure standardized
