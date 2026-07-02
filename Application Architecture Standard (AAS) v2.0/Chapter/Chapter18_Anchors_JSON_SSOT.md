# Chapter18_Anchors_JSON_SSOT.md

# 3Cushion AI Application Architecture SSOT v2.0

# Part V. System Layer
# Chapter 18. anchors.json SSOT Specification

Version: v2.0
Status: Draft SSOT
Owner: 3Cushion AI Architecture

Depends on:

- Architecture_Constitution.md
- Chapter10_Calculation_Domain_Specification.md
- Chapter11_Trajectory_Domain_Specification.md
- Chapter16_Profile_JSON_SSOT.md
- Chapter17_Logic_JSON_SSOT.md

---

# 1. Purpose

본 Chapter는 `anchors.json`의 공식 역할과 구조를 정의한다.

`anchors.json`은 시스템의 기준 좌표, Anchor, Canonical Trajectory 및 표시 기준점을 저장하는
SSOT(Single Source of Truth)이다.

핵심 원칙은 다음과 같다.

> anchors.json은 "어디를 기준으로 계산하고 표시할 것인가"를 정의하며,
> 계산 로직은 포함하지 않는다.

---

# 2. Responsibilities

anchors.json의 책임

- Anchor 정의
- Canonical Trajectory 정의
- Trajectory Symmetry
- Mark 기준점
- Reference Point
- Grid Metadata
- Coordinate Mapping

수행하지 않는 작업

- Formula 계산
- Correction
- Branch Rule
- Runtime 상태 관리
- Rendering

---

# 3. Position

```text
Application Runtime
        │
        ▼
System Loader
        │
        ▼
anchors.json
        │
        ▼
Trajectory Domain
```

Trajectory Domain은 anchors.json을 소비하여 공간 기준을 생성한다.

---

# 4. Standard Structure

```text
anchors.json

meta
anchors
trajectories
marks
reference
grid
mappings
symmetry
```

---

# 5. Anchor Definition

Anchor는 시스템의 기준점을 정의한다.

포함 항목

- id
- label
- coordinate
- systemValue
- axis
- rail
- space

Anchor는 계산 결과가 아닌 기준 데이터이다.

---

# 6. Canonical Trajectory

모든 시스템은 하나의 Canonical Trajectory를 가진다.

기본 권장

```text
B2T_L
```

파생

- B2T_R
- T2B_L
- T2B_R

대칭 생성 규칙은 Trajectory Symmetry를 따른다.

---

# 7. Trajectory Symmetry

지원 연산

```text
H   : Horizontal
V   : Vertical
RPI : 180° Rotation
```

규칙

- System Value 유지
- 좌표만 변환
- Canonical을 기준으로 생성

---

# 8. Mark Definition

Mark는 표시 기준점이다.

표준 모델

```json
{
  "space":"Fg|Rg",
  "rail":"TOP|BOTTOM|LEFT|RIGHT",
  "axis":"long|short",
  "value":0
}
```

Mark는 Rendering Layer가 소비한다.

---

# 9. Coordinate System

지원 공간

- Frame Grid (Fg)
- Rail Grid (Rg)

규칙

- offset_fg2rg = 2.25
- Fg 확장 허용
- Ball 좌표는 물리 좌표 사용
- Mapping은 외삽 금지

---

# 10. Mapping Rule

Mapping은 라벨에 좌표가 없는 경우에만 사용한다.

원칙

- 선형 보간
- Clamp
- No Extrapolation

System Value와 좌표는 독립적으로 관리한다.

---

# 11. Dependency Rule

anchors.json 사용 가능

- System Loader
- Trajectory Domain
- Caption Domain

직접 참조 금지

- App.jsx
- React
- Runtime Flow

항상 Loader를 통해 접근한다.

---

# 12. Validation

필수 검증

- Schema
- Anchor ID 중복
- Canonical Trajectory 존재
- Symmetry 무결성
- Coordinate 범위
- Mark Schema

---

# 13. Success Criteria

anchors.json은 다음을 만족해야 한다.

- 공간 기준만 정의한다.
- 계산 로직을 포함하지 않는다.
- Canonical Trajectory를 유지한다.
- Symmetry를 지원한다.
- 모든 시스템에서 동일 Schema를 사용한다.

---

# 14. Future Extension

향후 확장

- Multi Table Size
- Dynamic Grid
- Precision Anchor
- Visualization Hint
- 3D Coordinate Support

기존 구조 변경 없이 확장 가능해야 한다.

---

# 15. Final Assessment

anchors.json은 3Cushion AI의 공간 기준 정의서이다.

Trajectory Domain은 anchors.json을 통해 기준 좌표와 Trajectory를 구성하며,
Calculation Domain과 독립적으로 공간 정보를 관리한다.

이를 통해 계산, 공간, 표시의 책임을 명확히 분리할 수 있다.

---

# Revision History

## v2.0

- Initial anchors.json SSOT Specification
- Anchor / Canonical Trajectory / Symmetry standardized
- Coordinate and Mark model defined
