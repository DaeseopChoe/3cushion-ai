# Chapter14_History_Domain_Specification.md

# 3Cushion AI Application Architecture SSOT v2.0

# Part IV. Domain Layer
# Chapter 14. History Domain Specification

Version: v2.0
Status: Draft SSOT
Owner: 3Cushion AI Architecture

Depends on:

- Architecture_Constitution.md
- Chapter09_Domain_Architecture.md
- Chapter12_Dataset_Domain_Specification.md
- Chapter13_Search_Domain_Specification.md

---

# 1. Purpose

본 Chapter는 History Domain의 공식 역할과 구조를 정의한다.

History Domain은 사용자 작업 이력과 Workspace 상태의 변경을 추적하고,
복원 가능한 형태로 관리하는 순수 Domain이다.

핵심 원칙은 다음과 같다.

> History Domain은 "무엇이 변경되었는가"를 관리하며,
> 저장 방식과 UI는 알지 않는다.

---

# 2. Responsibilities

History Domain의 책임

- History Entry 생성
- Workspace Snapshot 관리
- Timeline 구성
- Undo / Redo 모델 관리
- Change Set 생성
- Session History 관리
- Version 비교
- HistoryResult 생성

수행하지 않는 작업

- localStorage 접근
- 파일 저장
- React Rendering
- Runtime Flow 제어
- Event 처리

---

# 3. Position

```text
Application Flow
        │
        ▼
History Domain
        │
        ▼
History Model
        │
        ▼
Infrastructure Adapter
```

History Domain은 저장(Storage)을 직접 수행하지 않는다.

---

# 4. Standard Structure

```text
domain/history/

model/
entry/
timeline/
snapshot/
undo/
redo/
changeset/
validation/
version/
shared/
```

각 모듈은 단일 책임 원칙(SRP)을 따른다.

---

# 5. History Model

History는 Entry의 집합으로 구성된다.

```text
History
 ├─ Entry
 ├─ Timestamp
 ├─ Session
 ├─ Snapshot
 ├─ ChangeSet
 └─ Metadata
```

Entry는 Domain 표준 모델을 사용한다.

---

# 6. Timeline

Timeline의 책임

- 시간순 정렬
- Entry 연결
- Session 구분
- 현재 상태 추적

Timeline은 UI 표시 순서를 의미하지 않는다.

---

# 7. Snapshot

Snapshot은 특정 시점의 Workspace 상태를 나타낸다.

포함 가능 항목

- Selected System
- Selected Dataset
- Search Condition
- Search Result
- Overlay State
- Runtime Metadata

Snapshot은 화면(Component)을 저장하지 않는다.

---

# 8. Undo / Redo

Undo Engine

- 이전 Snapshot 복원
- ChangeSet 역적용

Redo Engine

- 이후 Snapshot 복원
- ChangeSet 재적용

Undo/Redo는 순수 Domain 규칙으로 구현한다.

---

# 9. ChangeSet

ChangeSet은 상태 변화만 저장한다.

예시

- Dataset 변경
- Search 조건 변경
- Slot 변경
- Overlay 변경
- History Merge

전체 Workspace를 반복 저장하지 않는다.

---

# 10. Dependency Rule

History Domain은 참조 가능

- Dataset Domain
- Shared Domain
- System Definition

참조 금지

- React
- Runtime
- Flow
- Dispatcher
- localStorage
- fetch

---

# 11. Testing Rule

입력

- Current Snapshot
- Previous Snapshot

출력

- History Entry
- ChangeSet
- Undo Result
- Redo Result

동일 입력은 항상 동일 결과를 생성해야 한다.

---

# 12. Success Criteria

History Domain은 다음을 만족해야 한다.

- History와 Storage를 분리한다.
- Snapshot과 ChangeSet이 표준화된다.
- Undo/Redo가 독립적이다.
- UI와 Runtime에 의존하지 않는다.
- Session 단위 관리가 가능하다.

---

# 13. Future Extension

향후 확장 대상

- Multi-user History
- Cloud Workspace
- Collaborative Timeline
- Automatic Checkpoint
- History Compression

기존 Domain 구조를 변경하지 않고 확장 가능해야 한다.

---

# 14. Final Assessment

History Domain은 3Cushion AI의 작업 이력 관리 엔진이다.

Application Layer는 History 생성을 요청하고,
History Domain은 상태 변화를 모델링하며,
Infrastructure는 실제 저장을 담당한다.

이를 통해 작업 이력과 저장 방식을 완전히 분리할 수 있다.

---

# Revision History

## v2.0

- Initial History Domain Specification
- Timeline / Snapshot / ChangeSet architecture defined
- Undo / Redo model standardized
