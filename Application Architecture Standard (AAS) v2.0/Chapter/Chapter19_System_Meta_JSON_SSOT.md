# Chapter19_System_Meta_JSON_SSOT.md

# 3Cushion AI Application Architecture SSOT v2.0

# Part V. System Layer
# Chapter 19. system_meta.json SSOT Specification

Version: v2.0
Status: Draft SSOT
Owner: 3Cushion AI Architecture

Depends on:

- Architecture_Constitution.md
- Chapter08_System_Loader_Specification.md
- Chapter16_Profile_JSON_SSOT.md
- Chapter17_Logic_JSON_SSOT.md
- Chapter18_Anchors_JSON_SSOT.md

---

# 1. Purpose

본 Chapter는 `system_meta.json`의 공식 역할과 구조를 정의한다.

`system_meta.json`은 시스템 자체를 설명하는 메타데이터와 Runtime 등록 정보를 저장하는
SSOT(Single Source of Truth)이다.

핵심 원칙은 다음과 같다.

> system_meta.json은 시스템을 설명하지만,
> 계산하거나 좌표를 정의하지 않는다.

---

# 2. Responsibilities

system_meta.json의 책임

- System Registry
- Alias 관리
- Version 정보
- Dataset Path
- Sample Path
- Lesson Metadata
- Difficulty
- Category
- Feature Flag
- Compatibility 정보

수행하지 않는 작업

- Formula 정의
- Calculation Rule
- Anchor 정의
- Runtime 상태 관리
- UI Rendering

---

# 3. Position

```text
Application Runtime
        │
        ▼
System Loader
        │
        ▼
system_meta.json
        │
        ▼
ResolvedSystemDefinition
```

System Loader는 profile, logic, anchors와 함께 system_meta를 통합한다.

---

# 4. Standard Structure

```text
system_meta.json

meta
identity
aliases
registry
dataset
sample
lesson
difficulty
features
compatibility
```

각 섹션은 독립적으로 관리한다.

---

# 5. Identity

Identity 정보

- systemId
- displayName
- shortName
- category
- description

`systemId`는 Runtime에서 사용하는 유일한 식별자이다.

---

# 6. Alias

Alias는 Legacy 이름과 사용자 입력을 공식 systemId로 변환한다.

예시

```text
5_HALF
5half
FiveHalf

        │

Alias Resolver

        │

5_half_system
```

Alias 해석은 System Loader가 수행한다.

---

# 7. Dataset & Sample

관리 대상

- datasetPath
- samplePath
- defaultDataset
- publishedDataset
- sampleVersion

Application은 경로를 직접 하드코딩하지 않는다.

---

# 8. Lesson & Difficulty

포함 가능 항목

- difficulty
- recommendedLevel
- lessonGroup
- tags
- learningOrder

이는 AI & Lesson Domain에서 활용할 수 있는 메타데이터이다.

---

# 9. Feature Flags

Feature Flag 예시

- supportsRecall
- supportsBaseline
- supportsTrajectory
- supportsOverlay
- supportsLesson
- supportsPublishedDataset

기능 활성화 여부는 데이터로 관리한다.

---

# 10. Compatibility & Version

포함 항목

- schemaVersion
- profileVersion
- logicVersion
- anchorsVersion
- minimumRuntimeVersion

System Loader는 호환성을 검증해야 한다.

---

# 11. Dependency Rule

system_meta.json 사용 가능

- System Loader
- Application Layer
- AI & Lesson Domain

직접 참조 금지

- App.jsx
- React Component
- Domain Calculation

항상 Loader를 통해 접근한다.

---

# 12. Validation

필수 검증

- Schema
- Unique systemId
- Alias 중복
- Dataset Path
- Sample Path
- Version Compatibility

Validation 실패 시 Loader는 Runtime Error를 반환한다.

---

# 13. Success Criteria

system_meta.json은 다음을 만족해야 한다.

- 시스템 설명만 포함한다.
- 계산 규칙을 포함하지 않는다.
- Registry 역할을 수행한다.
- Loader를 통해 접근한다.
- 모든 시스템이 동일 Schema를 사용한다.

---

# 14. Future Extension

향후 확장

- Marketplace Metadata
- License Information
- Author Profile
- Online Repository
- Update Channel
- Localization Pack

기존 Schema를 변경하지 않고 확장 가능해야 한다.

---

# 15. Final Assessment

system_meta.json은 3Cushion AI의 시스템 등록부(System Registry)이다.

profile.json이 계산 대상을 정의하고,
logic.json이 계산 정책을 정의하며,
anchors.json이 공간 기준을 정의한다.

system_meta.json은 시스템의 식별, 등록, 버전, 데이터셋 및 학습 정보를 통합 관리한다.

이를 통해 Runtime은 모든 시스템을 동일한 방식으로 탐색·등록·로드할 수 있다.

---

# Revision History

## v2.0

- Initial system_meta.json SSOT Specification
- Registry, Alias, Version and Feature Flag architecture standardized
