# Chapter06_Runtime_Refactoring_Phase.md

# 3Cushion AI Application Architecture SSOT v2.0

# Part II. Migration Reality
# Chapter 06. Runtime Refactoring Phase

Version: v2.0
Status: Draft SSOT
Owner: 3Cushion AI Architecture

Depends on:

- Architecture_Constitution.md
- Chapter01_App_Authority.md
- Chapter02_Layer_Architecture.md
- Chapter03_Dependency_Rule.md
- Chapter04_Application_Runtime_Model_Specification.md
- Chapter05_App_jsx_Dissecton.md

---

# 1. Purpose

본 Chapter는 Runtime Architecture를 실제 프로젝트에 적용하기 위한 공식 Migration 절차를 정의한다.

목표는 기능을 다시 만드는 것이 아니라 **App.jsx의 책임을 단계적으로 Runtime, Domain, System, Dataset, Infrastructure로 이전**하는 것이다.

핵심 원칙은 다음과 같다.

> 작은 단계로 이동하고, 매 단계마다 Build와 Regression을 통과한다.

---

# 2. Migration Principles

## 2.1 Rewrite 금지

전체를 새로 작성하지 않는다.

기존 코드를 유지하면서 책임만 이동한다.

## 2.2 One Responsibility at a Time

한 번의 작업은 하나의 책임만 이동한다.

예)

- Search
- Recall
- Overlay
- Dataset

를 동시에 이동하지 않는다.

## 2.3 Regression First

모든 단계는 Build와 Regression을 통과해야 다음 단계로 진행한다.

---

# 3. Phase Overview

```text
Phase 0  Architecture Freeze
Phase 1  Runtime Scaffold
Phase 2  Responsibility Marking
Phase 3  System-specific Isolation
Phase 4  Flow Extraction
Phase 5  Domain Extraction
Phase 6  Infrastructure Extraction
Phase 7  App.jsx Slimming
Phase 8  Final Regression
```

---

# 4. Phase 0 — Architecture Freeze

완료 기준

- Constitution 확정
- Chapter01~06 확정
- Runtime 철학 변경 금지

---

# 5. Phase 1 — Runtime Scaffold

생성 대상

```text
frontend/src/application/

runtime/
dispatcher/
coordinator/
flow/
loader/
```

규칙

- 기능 변경 없음
- 기존 App.jsx 유지

---

# 6. Phase 2 — Responsibility Marking

App.jsx의 모든 함수와 상태를 다음으로 분류한다.

```text
APP_ALLOWED
APPLICATION_FLOW
DOMAIN_LOGIC
SYSTEM_SPECIFIC
DATASET_LOGIC
INFRASTRUCTURE
```

이 단계에서는 이동하지 않는다.

---

# 7. Phase 3 — System-specific Isolation

우선 제거 대상

- 5_half_system
- 5_HALF
- useSn
- needsC3r
- SYS_SYSTEM_CONFIG
- sample path
- baseline merge

이전 대상

```text
profile.json
logic.json
system_meta.json
domain/baseline
```

---

# 8. Phase 4 — Flow Extraction

생성 대상

```text
UserSearchFlow
AdminSearchFlow
RecallFlow
TrajectoryFlow
OverlayFlow
HistoryFlow
SaveFlow
SlotFlow
```

초기에는 기존 코드를 호출하는 Facade만 만든다.

---

# 9. Phase 5 — Domain Extraction

우선순위

1. Baseline
2. Dataset
3. Search
4. Recall
5. Trajectory
6. Caption
7. AI / Lesson

Domain은 UI와 React를 알면 안 된다.

---

# 10. Phase 6 — Infrastructure Extraction

분리 대상

- localStorage
- fetch
- file save
- published dataset access

Infrastructure Adapter를 통해 접근한다.

---

# 11. Phase 7 — App.jsx Slimming

최종 목표

```text
Current : 약 9,000 lines

↓

Target : 800 ~ 1,500 lines
```

App.jsx는 다음만 수행한다.

- Boot
- Context Provider
- Runtime Dispatch
- Layout
- Render

---

# 12. Phase 8 — Final Regression

필수 검증

- Build 성공
- USER Search 정상
- ADMIN Search 정상
- Recall 정상
- Overlay 정상
- Dataset 정상
- History 정상
- 기존 결과 동일

---

# 13. Cursor Execution Strategy

모든 구현은 다음 순서를 따른다.

1. Ask Mode
2. 영향 범위 분석
3. Agent Mode
4. 작은 단위 수정
5. Build
6. Regression
7. Commit

대규모 수정은 금지한다.

---

# 14. Success Criteria

Migration 완료 시 다음을 만족해야 한다.

- App.jsx는 Orchestrator만 수행한다.
- Runtime이 Flow를 제어한다.
- Domain은 계산만 수행한다.
- System은 SSOT만 제공한다.
- Dataset은 데이터만 관리한다.
- Infrastructure는 외부 환경만 담당한다.
- App.jsx 수정 없이 새로운 System 추가가 가능하다.

---

# 15. Final Assessment

Chapter06은 Runtime Migration의 실행 계획이다.

이 문서는 Cursor가 단계적으로 리팩터링을 수행하기 위한 공식 절차이며, 각 Phase는 독립적으로 완료·검증될 수 있어야 한다.

---

# Revision History

## v2.0

- Initial Runtime Refactoring Phase
- Incremental migration strategy defined
