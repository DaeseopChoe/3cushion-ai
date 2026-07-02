# 3Cushion AI Application Architecture SSOT v2.0

# Architecture Constitution

Version: 2.0  
Status: Draft SSOT  
Scope: Application Architecture · App.jsx Authority · Application Layer · Domain Layer · System SSOT · Dataset SSOT · Cursor Execution Rule

---

## 0. 문서 목적

본 문서는 3Cushion AI의 최상위 아키텍처 헌법이다.

3Cushion AI는 더 이상 단일 `5_half_system` 중심 애플리케이션이 아니다.  
본 프로젝트는 40개 이상의 3쿠션 시스템을 동일한 Application Engine 위에서 실행하기 위한 데이터 기반 Framework이다.

따라서 모든 구현, 리팩터링, 신규 시스템 추가, Cursor 작업 요청은 본 Constitution을 우선 기준으로 한다.

---

## 1. 최상위 원칙

### Constitution 1. App.jsx는 Orchestrator이다.

`App.jsx`는 애플리케이션을 조립하고 흐름을 지휘한다.

`App.jsx`는 계산기, 검색 엔진, 시스템 엔진, Dataset Manager, Trajectory Builder가 아니다.

---

### Constitution 2. App.jsx는 What만 결정한다.

`App.jsx`는 사용자의 의도와 현재 상태를 기반으로 “무엇을 할 것인가”만 결정한다.

예:

- Search 요청
- Recall 요청
- Overlay 열기/닫기
- Trajectory 표시 요청
- Slot 전환 요청

`App.jsx`는 “어떻게 계산할 것인가”를 구현하지 않는다.

---

### Constitution 3. App.jsx는 특정 시스템을 알지 않는다.

`App.jsx`는 `systemId`만 알 수 있다.

금지:

```ts
if (systemId === "5_half_system") {}
switch (systemId) {}
```

새로운 시스템을 추가하기 위해 `App.jsx`를 수정해야 한다면 그것은 Architecture 위반이다.

---

### Constitution 4. 모든 시스템은 동일한 System SSOT 구조를 따른다.

각 시스템은 다음 4개 파일을 기준으로 정의한다.

```text
profile.json
logic.json
anchors.json
system_meta.json
```

역할:

- `profile.json`: 무엇을 계산하고 표시할 것인가
- `logic.json`: 어떻게 계산하고 보정할 것인가
- `anchors.json`: 시스템값과 좌표 기준점
- `system_meta.json`: 시스템 식별, 설명, 지원 기능, 경로

---

### Constitution 5. 계산은 Domain Layer가 담당한다.

수식 계산, 보정 계산, C1/C3/C4/C5/C6 계산, Sn 계산, trajectory 계산은 `App.jsx`에서 수행하지 않는다.

모든 계산은 Domain Layer에서 수행한다.

---

### Constitution 6. 업무 흐름은 Application Layer가 담당한다.

Search 버튼 클릭 후 다음 동작들:

```text
Dataset load
→ match
→ slot hydrate
→ trajectory apply
→ overlay/session update
```

이 흐름은 UI도 아니고 순수 계산도 아니다.  
따라서 Application Layer가 담당한다.

---

### Constitution 7. Presentation Layer는 표시만 담당한다.

React component, overlay, table, card, label, button은 표시와 사용자 입력만 담당한다.

Presentation Layer는 계산, 검색, 저장, Dataset merge를 수행하지 않는다.

---

### Constitution 8. Dataset은 Published Corpus SSOT와 Working Dataset을 분리한다.

- Working Dataset: `positions_dataset` localStorage
- Workspace History: `workspace_history` localStorage
- Published Dataset: `dataset/{공략}/{시스템}/positions.json`

Published Dataset은 Production Search가 직접 사용하는 Corpus SSOT이다.

`dataset/`은 절대 `.gitignore` 대상이 되어서는 안 된다.

---

### Constitution 9. USER Search와 ADMIN Search의 Corpus 경계를 유지한다.

USER Search는 Published Dataset만 사용한다.

ADMIN Search 역시 Published Dataset 또는 명시된 profile에 따른 corpus만 사용한다.

Working Dataset과 Published Dataset은 역할을 혼합하지 않는다.

---

### Constitution 10. UI 수정은 계산 엔진을 변경하지 않는다.

Overlay 크기, 카드 배치, 버튼 라벨, 모바일 UX 수정은 계산 엔진, Search Engine, Dataset 구조, System Logic을 변경하지 않는다.

UI 문제는 Presentation/Application 경계에서 해결한다.

---

### Constitution 11. 시스템별 예외는 System Layer에 둔다.

시스템별 특수 규칙은 `logic.json` 또는 System Domain에 둔다.

예:

- 5½ 시스템의 Sn
- C4/C5/C6 동기화
- 시스템별 보정식
- 시스템별 trajectory policy
- 시스템별 caption/display rule

이 규칙들은 `App.jsx`에 존재해서는 안 된다.

---

### Constitution 12. App.jsx는 Dataset 구조를 알지 않는다.

`App.jsx`는 `positions.json` 내부 schema, merge rule, export envelope, similarity rule을 알지 않는다.

Dataset 관련 처리는 Dataset Domain 또는 Application Flow가 담당한다.

---

### Constitution 13. App.jsx는 Search 알고리즘을 알지 않는다.

`App.jsx`는 Search를 요청할 수 있으나, 다음을 구현하지 않는다.

- similarity 계산
- coarse filter
- permutation
- recall profile
- match scoring
- fallback rule

---

### Constitution 14. App.jsx는 Trajectory를 생성하지 않는다.

`App.jsx`는 trajectory 결과를 렌더링에 전달할 수 있으나, trajectory node, segment, cap, reflection, rail detection을 계산하지 않는다.

Trajectory는 Domain Layer에서 생성하고, Presentation Layer는 표시한다.

---

### Constitution 15. App.jsx는 Caption을 계산하지 않는다.

Caption placement, axis label, system value label, display cap은 Caption/Display Domain에서 처리한다.

`App.jsx`는 caption 결과를 표시 컴포넌트에 전달만 한다.

---

### Constitution 16. AI와 Lesson은 독립 Domain이다.

AI 자동 문장, 원 포인트 레슨, 시스템 레슨, USER 교육 패널은 `App.jsx` 내부에서 생성하지 않는다.

`App.jsx`는 AI/Lesson ViewModel을 호출하고 결과를 표시한다.

---

### Constitution 17. Layer 의존 방향은 단방향이다.

허용 의존 방향:

```text
Presentation
→ Application
→ Domain
→ System
→ Dataset
```

역방향 의존은 금지한다.

금지 예:

```text
Domain → React Component
System → App.jsx
Dataset → Presentation
```

---

### Constitution 18. Cursor는 Architecture SSOT를 구현한다.

Cursor는 설계자가 아니다.  
Cursor는 본 Architecture SSOT를 기준으로 파일 생성, 코드 이동, 리팩터링, 테스트, 커밋을 수행한다.

Cursor 작업 요청서는 항상 다음 중 하나의 Mode로 시작한다.

```text
[Cursor Mode: Ask]
[Cursor Mode: Agent]
```

---

### Constitution 19. 변경은 Phase 단위로 수행한다.

대규모 리팩터링은 한 번에 수행하지 않는다.

기본 절차:

```text
Architecture Chapter 확인
→ Execution Plan 확인
→ Cursor Work Order 실행
→ Regression Checklist 통과
→ Commit
→ 다음 Chapter 진행
```

---

### Constitution 20. Regression 없는 리팩터링은 금지한다.

책임 분리 후 다음 항목은 반드시 유지되어야 한다.

- 기존 USER Search 동작
- 기존 ADMIN Search/Recall 동작
- 기존 5_half_system 계산 결과
- 기존 trajectory 표시
- 기존 Dataset load/fetch
- 기존 overlay 기본 동작
- build 성공

---

## 2. Layer Constitution

### 2.1 Presentation Layer

역할:

- 화면 조립
- Component 표시
- 사용자 입력 수집
- Overlay 표시
- Stage 렌더링

금지:

- 계산
- Search
- Dataset merge
- system-specific rule
- trajectory 생성

대표:

```text
App.jsx
components/*
Stage.jsx
Overlay components
```

---

### 2.2 Application Layer

역할:

- 업무 흐름 제어
- 사용자 Event 처리
- Domain 호출 순서 관리
- Session update
- Flow orchestration

예:

```text
userSearchFlow
adminRecallFlow
trajectoryFlow
overlayFlow
historyFlow
systemLoader
slotFlow
```

---

### 2.3 Domain Layer

역할:

- 순수 로직
- 계산
- Search/Recall
- Dataset transform
- Trajectory
- Caption
- AI/Lesson ViewModel

Domain은 React에 의존하지 않는다.

---

### 2.4 System Layer

역할:

- 시스템별 공식
- 보정 규칙
- 좌표 앵커
- 표시 규칙
- 메타 정보

System Layer는 4파일 SSOT를 따른다.

---

### 2.5 Dataset Layer

역할:

- Published Dataset
- Working Dataset
- Workspace History
- static positions.json
- loader/cache/fetch

Published Dataset은 Git → Vercel → Production으로 배포된다.

---

## 3. App.jsx Constitution

`App.jsx`의 최종 목표는 800~1200 lines 수준의 Orchestrator이다.

App가 보유할 수 있는 책임:

```text
Application Boot
Global State
Event Dispatch
Screen Composition
Render Coordination
Context Provider
```

App에서 제거할 책임:

```text
System Rule
Formula
Correction
Trajectory
Caption
Dataset
Search
AI
Lesson
History Merge
```

---

## 4. System Constitution

모든 시스템은 동일한 구조를 가진다.

```text
frontend/src/data/systems/<systemId>/
  profile.json
  logic.json
  anchors.json
  system_meta.json
```

새 시스템 추가 시 App.jsx를 수정하지 않는다.

App 변경이 필요하다면 System SSOT 설계가 불완전한 것이다.

---

## 5. Dataset Constitution

`dataset/`은 Published Corpus SSOT이다.

Production Search는 다음 URL을 직접 fetch한다.

```text
/dataset/{shotType}/{systemName}/positions.json
```

Production Search 장애 발생 시 우선 확인 순서:

1. dataset 파일 존재 여부
2. GitHub 반영 여부
3. Vercel 배포 여부
4. positions.json 직접 URL 확인
5. published loader cache 확인

---

## 6. Cursor Constitution

Cursor는 다음 규칙을 따른다.

### Ask Mode

사용:

- 영향 범위 분석
- 수정 대상 식별
- 설계 검토
- Git 상태 확인
- 리팩터링 계획 수립

### Agent Mode

사용:

- 코드 수정
- 파일 생성
- 문서 생성
- 테스트 실행
- Commit/Push

### Run / Accept

특별한 위험이 없으면 응답은 다음 중 하나만 사용한다.

```text
Run
Accept
```

예외:

- 데이터 손실 가능성
- SSOT 위반 가능성
- 대규모 구조 변경
- 의도와 다른 수정 가능성

---

## 7. Architecture Violation Definition

다음은 Architecture 위반이다.

1. 새 시스템 추가를 위해 App.jsx 수정
2. App.jsx에서 `if(systemId === "...")` 사용
3. App.jsx에서 수식 계산
4. App.jsx에서 Search score 계산
5. App.jsx에서 Dataset merge
6. Presentation Layer에서 Domain rule 구현
7. Domain Layer에서 React component 참조
8. System Layer가 App.jsx에 의존
9. Published Dataset을 `.gitignore`에 포함
10. Regression 없이 리팩터링 commit

---

## 8. Architecture Completion Criteria

Architecture SSOT v2.0이 완료되었다고 판단하는 기준:

1. Constitution 완료
2. Chapter 1~19 완료
3. 각 Chapter가 다음 4개 Part를 포함
   - Part A. Architecture SSOT
   - Part B. Execution Plan
   - Part C. Cursor Work Order
   - Part D. Regression Checklist
4. System 4-File SSOT 정의 완료
5. App.jsx 분리 계획 완료
6. Cursor Phase Plan 완료
7. Regression Checklist 완료

---

## 9. Final Constitutional Rule

본 프로젝트의 최상위 불변 원칙은 다음과 같다.

> **3Cushion AI는 App.jsx 중심 애플리케이션이 아니라 System/Data/Application Layer 중심 Framework이다.**

따라서 App.jsx는 시스템을 구현하지 않는다.  
App.jsx는 시스템을 실행하는 Application Orchestrator일 뿐이다.
