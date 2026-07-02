# Chapter20_Regression_Release_Rule.md

# 3Cushion AI Application Architecture SSOT v2.0

# Part VI. Governance
# Chapter 20. Regression & Release Rule

Version: v2.0
Status: Draft SSOT
Owner: 3Cushion AI Architecture

Depends on:

- Architecture_Constitution.md
- Chapter01 ~ Chapter19

---

# 1. Purpose

본 Chapter는 3Cushion AI Runtime Architecture의 공식 검증, 회귀(Regression), Release 절차를 정의한다.

모든 변경은 기능 구현보다 **Architecture SSOT 준수 여부**를 우선적으로 검증해야 한다.

핵심 원칙은 다음과 같다.

> 모든 Release는 "Build 성공"이 아니라
> "Architecture가 유지되었는가"를 기준으로 승인한다.

---

# 2. Governance Principles

Architecture Governance의 원칙

- SSOT 우선
- Runtime 우선
- 데이터 우선(Data-driven)
- Layer 독립성 유지
- 점진적 리팩터링
- 회귀 없는 변경

금지 사항

- App.jsx에 Domain Logic 추가
- System별 Hard Coding
- Layer 역참조
- SSOT 우회

---

# 3. Release Pipeline

```text
Design
    │
    ▼
Architecture Review
    │
    ▼
Implementation
    │
    ▼
Build
    │
    ▼
Regression
    │
    ▼
Architecture Validation
    │
    ▼
Release
```

---

# 4. Regression Categories

필수 Regression

- Build Regression
- Runtime Regression
- Calculation Regression
- Trajectory Regression
- Dataset Regression
- Search Regression
- History Regression
- AI / Lesson Regression
- UI Regression
- Performance Regression

모든 Release는 해당 범위의 회귀 검증을 수행한다.

---

# 5. Architecture Compliance Checklist

Release 전 반드시 확인한다.

## App.jsx

- Orchestrator 역할만 수행하는가
- Domain Logic이 존재하지 않는가
- System Hard Coding이 없는가

## Application Layer

- Flow만 관리하는가
- 계산을 수행하지 않는가

## Domain Layer

- React 의존성이 없는가
- Runtime 의존성이 없는가

## System Layer

- profile / logic / anchors / system_meta만 사용하는가

## Infrastructure

- 외부 저장과 네트워크만 담당하는가

---

# 6. SSOT Validation

다음 항목을 검증한다.

- profile.json Schema
- logic.json Schema
- anchors.json Schema
- system_meta.json Schema

그리고

- Version Compatibility
- Alias Integrity
- Canonical Trajectory
- Mark Schema
- Dataset Schema

---

# 7. Build Gate

Release 조건

- Build Success
- Lint Success
- Type Check Success
- Schema Validation Success

Build 성공만으로 Release를 승인하지 않는다.

---

# 8. Runtime Regression

필수 기능

- USER Search
- ADMIN Search
- Recall
- Overlay
- Dataset
- History
- Lesson
- Runtime Loading

기존 결과와 동일한 동작을 유지해야 한다.

---

# 9. Cursor Working Rule

Architecture 변경 전

```text
[Cursor Mode: Ask]
```

필수 작업

- 영향 범위 분석
- Layer 위반 확인
- SSOT 영향 분석
- 수정 대상 식별

코드 수정 시

```text
[Cursor Mode: Agent]
```

작은 단위로 구현하고 Build 및 Regression을 수행한다.

---

# 10. Release Checklist

Release 승인 전

- Constitution 변경 여부 확인
- Chapter 영향 분석
- SSOT 동기화
- Schema 검증
- Regression 통과
- Version 갱신
- Release Note 작성

---

# 11. Documentation Rule

Architecture 변경 시

반드시 갱신

- Constitution
- 관련 Chapter
- PROJECT_MASTER_INDEX
- PROJECT_LOG
- Release Note

문서와 구현은 항상 동기화한다.

---

# 12. Success Criteria

Release는 다음을 만족해야 한다.

- 모든 Regression 통과
- Architecture 위반 없음
- SSOT 최신 상태 유지
- Runtime 구조 유지
- 새로운 System 추가 시 App.jsx 수정 불필요

---

# 13. Final Assessment

Chapter20은 Application Architecture SSOT의 최종 Governance 문서이다.

이 문서는 Runtime, Domain, System, Dataset, Infrastructure를 포함한 전체 Architecture의 변경 절차와 Release 기준을 정의한다.

향후 모든 기능 추가와 리팩터링은 본 Chapter를 최종 승인 기준으로 사용한다.

---

# Revision History

## v2.0

- Initial Regression & Release Rule
- Architecture Governance established
- Release Pipeline standardized
