# Chapter08_System_Loader_Specification.md

# 3Cushion AI Application Architecture SSOT v2.0

# Part III. Application Layer
# Chapter 08. System Loader Specification

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

---

# 1. Purpose

본 Chapter는 Runtime이 시스템 정의를 로드하는 공식 절차를 정의한다.

System Loader는 Application과 System SSOT 사이의 유일한 진입점이다.

Application은 개별 JSON 파일을 직접 읽지 않는다.

---

# 2. Design Goal

System Loader는 다음 목표를 가진다.

- System SSOT 통합 로딩
- Alias 해석
- Version 관리
- Cache 관리
- Runtime에 단일 객체 제공

핵심 원칙

> Runtime은 System Loader만 알고, profile.json·logic.json·anchors.json·system_meta.json은 직접 참조하지 않는다.

---

# 3. Standard Flow

```text
systemId
    │
    ▼
System Loader
    │
    ├── Alias Resolver
    ├── Profile Loader
    ├── Logic Loader
    ├── Anchors Loader
    ├── Meta Loader
    └── Cache
    │
    ▼
ResolvedSystemDefinition
```

---

# 4. Loader Responsibilities

System Loader는 다음을 수행한다.

- systemId 검증
- alias 변환
- profile.json 로드
- logic.json 로드
- anchors.json 로드
- system_meta.json 로드
- 버전 확인
- Cache 관리
- Runtime에 통합 객체 반환

수행하지 않는 작업

- 계산
- Formula 실행
- Correction 적용
- Dataset Merge
- UI Rendering

---

# 5. ResolvedSystemDefinition

Runtime이 사용하는 표준 객체

```ts
type ResolvedSystemDefinition = {

    profile: ProfileDefinition;

    logic: LogicDefinition;

    anchors: AnchorDefinition;

    systemMeta: SystemMetaDefinition;

}
```

Runtime은 항상 이 객체만 사용한다.

---

# 6. Alias Resolution

예시

```text
5_HALF
        │
        ▼
Alias Resolver
        │
        ▼
5_half_system
```

Alias 정보는 system_meta.json이 관리한다.

App.jsx는 Alias를 알 필요가 없다.

---

# 7. Loader Components

```text
application/

loader/

├── systemLoader.ts
├── profileLoader.ts
├── logicLoader.ts
├── anchorLoader.ts
├── metaLoader.ts
├── aliasResolver.ts
├── versionResolver.ts
└── loaderCache.ts
```

각 Loader는 하나의 책임만 가진다.

---

# 8. Cache Rule

동일한 System은 반복 로드하지 않는다.

Cache Key

```text
systemId
version
```

Cache는 Runtime 종료 시 폐기 가능하다.

---

# 9. Dependency Rule

System Loader는 참조 가능

- System Layer
- Dataset Loader
- Infrastructure

System Loader는 참조 금지

- Presentation
- React Component
- Domain Calculation

---

# 10. Error Handling

표준 오류

- Unknown System
- Missing profile.json
- Missing logic.json
- Missing anchors.json
- Missing system_meta.json
- Version mismatch
- Invalid Alias

Runtime은 Loader 오류를 Application Error로 변환한다.

---

# 11. Future Extension

새로운 시스템 추가 절차

1. profile.json 추가
2. logic.json 추가
3. anchors.json 추가
4. system_meta.json 추가
5. Registry 등록

App.jsx 수정은 필요하지 않다.

---

# 12. Success Criteria

다음을 만족해야 한다.

- Runtime은 Loader만 호출한다.
- App.jsx는 JSON 파일을 직접 읽지 않는다.
- 모든 System은 동일 Loader를 사용한다.
- 새로운 System은 SSOT만 추가하면 동작한다.
- Loader는 Generic Framework를 유지한다.

---

# 13. Final Assessment

System Loader는 Application Runtime과 System SSOT를 연결하는 공식 Gateway이다.

Loader를 중심으로 profile, logic, anchors, system_meta가 하나의 ResolvedSystemDefinition으로 통합되며, Runtime은 시스템의 내부 저장 구조를 알 필요가 없다.

---

# Revision History

## v2.0

- Initial System Loader Specification
- ResolvedSystemDefinition contract defined
- Alias/Cache/Version management standardized
