# 3Cushion AI Application Architecture SSOT v2.1

# Architecture Constitution

Version: 2.1  
Status: Active SSOT  
Scope: Application Architecture · App.jsx Authority · Application Layer · Application Flow Layer · Domain Runtime · ViewModel · System SSOT · Dataset SSOT · Cursor Execution Rule · Migration Debt Governance  
Revision: Post Batch 4 Runtime Migration (2026-07-07) — Baseline `540a275`

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

**Calculation Runtime SSOT (Batch 4 확정):**  
SYS Render·Recall·Overlay 계산의 공식 SSOT는 `frontend/src/domain/calculator/systemValueCalculator.ts`이다.  
자세한 규칙은 **§10 Calculation Runtime SSOT** 참조.

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

**Application Flow Rule (Batch 3 도입 · Batch 4 확정):**  
구체적 Flow 구현은 `frontend/src/application/flows/`에 둔다.  
Flow는 orchestration·hydrate·sequencing·context assembly만 수행한다.  
계산·Runtime 생성·ViewModel 생성은 금지한다.  
자세한 규칙은 **§2.6 Application Flow Layer** 참조.

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
→ Application Flow
→ Domain Runtime
→ System
→ Dataset
```

역방향 의존은 금지한다.

금지 예:

```text
Domain → React Component
Domain → Application Flow (역참조)
System → App.jsx
Dataset → Presentation
```

**Runtime Ownership (Batch 4 확정):**  
각 Layer는 자신의 책임 범위만 소유한다.  
공식 Layer Rule과 SSOT File Map은 **§12 Runtime Ownership**, **§13 Runtime SSOT File Map** 참조.

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
- Flow Context 생성 및 Flow 호출 (`App.jsx` → `application/flows/`)

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

### 2.6 Application Flow Layer

**경로 SSOT:** `frontend/src/application/flows/`

**역할 (Batch 3 도입 · Batch 4 확정):**

`application/flows/`는 업무 흐름만 담당한다.

**허용:**

- orchestration
- hydrate
- sequencing
- context assembly
- Domain Runtime / ViewModel **호출** (직접 구현 금지)

**금지:**

- 계산 (formula, correction, Sn, SYS snapshot calc 등)
- Runtime 생성 (Calculation Runtime inline 구현)
- ViewModel 생성 (`resolveSlotSys` 등 ViewModel inline 구성)

**대표 Flow (현재 구현):**

| Flow | 역할 |
|------|------|
| `recallHydrateFlow.ts` | Recall hydrate · Domain `buildSlotSysSnapshot()` 호출 |
| `saveFlow.ts` | Strategy save orchestration |
| `adminSearchFlow.ts` | ADMIN Published Search |
| `userSearchFlow.ts` | USER Published Search |
| `resetFlow.ts` | USER Search reset |
| `adminLocalDbFlow.ts` | ADMIN LocalDB Recall |
| `historyFlow.ts` | Canonical save history |
| `ballDragFlow.ts` | Ball drag end orchestration |

Flow Layer는 React Hook을 사용하지 않는다.  
Flow는 Named Export Only를 따른다.

---

### 2.3 Domain Layer

역할:

- 순수 로직
- 계산 (Calculation Runtime)
- Search/Recall
- Dataset transform
- Trajectory
- Caption
- AI/Lesson ViewModel
- Render ViewModel (Rendering용 데이터 구성)

Domain은 React에 의존하지 않는다.

**Calculation Runtime SSOT:** `domain/calculator/systemValueCalculator.ts` (§10)  
**Render ViewModel SSOT:** `domain/system/slotSysViewModel.ts` (§11)

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

### 3.1 App = Orchestrator (Constitution 1 구체화)

`App.jsx`는 Application Orchestrator이다.  
계산기, 검색 엔진, 시스템 엔진, Dataset Manager, Trajectory Builder가 아니다.

**허용:**

- React State
- React Hook
- Flow 호출 (`application/flows/`)
- Rendering
- View 연결 (Domain Runtime / ViewModel 결과를 Presentation에 전달)
- in-flight guard 등 Orchestrator 전용 ref (AD-B3-02)

**금지:**

- Runtime 계산 (SYS effective values, overlay calc, recall snapshot calc 등)
- ViewModel 생성 (`resolveSlotSys` inline 구현)
- Search Algorithm (similarity, scoring, coarse filter)
- Trajectory 생성 (node, segment, cap, reflection)
- Formula 계산 (`calculateByProfileExpr` 직접 호출)

App가 보유할 수 있는 책임:

```text
Application Boot
Global State
Event Dispatch
Screen Composition
Render Coordination
Context Provider
Flow Context Assembly
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
Calculation Runtime
Render ViewModel Assembly
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
11. `application/flows/`에서 Calculation Runtime inline 구현 (§2.6, §10)
12. `App.jsx`에서 ViewModel inline 생성 — `resolveSlotSys` 등 (§3.1, §11)
13. Calculation Runtime SSOT (`systemValueCalculator.ts`) bypass — `calculateByProfileExpr` 직접 호출 (§10, D-008)
14. Domain → Application Flow 역방향 import (§12)

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

---

## 10. Calculation Runtime SSOT

**Batch 4 확정 (2026-07-07)**

`frontend/src/domain/calculator/systemValueCalculator.ts`는 본 프로젝트의 **Calculation Runtime SSOT**이다.

모든 SYS Render·Recall·Overlay Runtime 계산은 Domain Runtime에서 수행한다.  
`App.jsx`, `application/flows/`, Presentation Layer에서 inline 계산을 구현하지 않는다.

### 대표 Runtime API

| API | Migration ID | 역할 |
|-----|-------------|------|
| `buildEffectiveRenderSysValues()` | CAL-002 | effective sys / Sn / C4–C6 Render 값 |
| `computeSysOverlayValues()` | CAL-005 | SysOverlay 실시간 SYS 계산 |
| `evaluateSysOverlayHasAllInputs()` | CAL-005 | SysOverlay 입력 완전성 판정 |
| `buildSlotSysSnapshot()` | CAL-003 | Recall → sys snapshot |

### 보조 SSOT

| 파일 | 역할 |
|------|------|
| `domain/calculator/sysOverlayCalcHelpers.ts` | 순수 calc helper (AD-B4-01 Option A) |
| `domain/calculator/formulaExpr.ts` | formula expr parsing (Batch 1) |
| `domain/calculator/fiveHalfCalculator.ts` | 5½ 2-of-3 (Batch 1) |

### 규칙

1. `calculateByProfileExpr` 직접 호출은 Calculation Runtime SSOT를 통해서만 허용한다.
2. Flow Layer는 Calculation Runtime을 **호출**할 수 있으나 **구현**할 수 없다.
3. Presentation Layer는 Domain Runtime 결과를 prop으로 **수신**한다 (AD-B2-01).

---

## 11. Render ViewModel SSOT

**Batch 4 확정 (2026-07-07)**

`frontend/src/domain/system/slotSysViewModel.ts`는 본 프로젝트의 **Render ViewModel SSOT**이다.

ViewModel은 Rendering을 위한 데이터 구성만 수행한다.  
ViewModel은 계산을 수행하지 않는다.

### 대표 API

| API | Migration ID | 역할 |
|-----|-------------|------|
| `resolveSlotSys()` | MISC-004 | slot draft/applied → resolvedSlotSys ViewModel |

### 규칙

1. ViewModel은 Calculation Runtime 결과를 조합·정규화하여 Render에 전달한다.
2. ViewModel은 `calculateByProfileExpr`, Sn/C4–C6 formula 등 **계산을 수행하지 않는다**.
3. `App.jsx`는 `resolveSlotSys()`를 호출하고 결과를 Presentation에 연결한다.

---

## 12. Runtime Ownership

**Batch 4 확정 — 공식 Layer Rule**

```text
Presentation
    ↓
Application          (App.jsx Orchestrator)
    ↓
Application Flow     (application/flows/)
    ↓
Domain Runtime       (Calculation · Search · Trajectory · Caption · AI)
    ↓
System               (data/systems/* · domain/system/*)
    ↓
Dataset              (domain/dataset/* · published dataset/)
```

### Layer 소유권

| Layer | 소유 | 금지 |
|-------|------|------|
| **Presentation** | UI 표시 · 사용자 입력 · Overlay 렌더 | 계산 · Flow · Search · Dataset merge |
| **Application** | State · Event · Flow 호출 · Render 조립 | Runtime 계산 · ViewModel 생성 · Search Algorithm |
| **Application Flow** | orchestration · hydrate · sequencing | 계산 · Runtime/ViewModel inline 생성 |
| **Domain Runtime** | 순수 계산 · Search/Recall · Transform | React 의존 · Presentation 참조 |
| **System** | profile/logic/anchors/meta · systemIdentity | App.jsx 의존 |
| **Dataset** | Published/Working corpus · loader/cache | Presentation 직접 merge |

의존 방향은 위에서 아래로만 허용한다 (Constitution 17).

---

## 13. Runtime SSOT File Map

**Batch 4 확정 — 코드 구조와 1:1 대응**

| Layer | SSOT Path | 역할 |
|-------|-----------|------|
| **Calculation Runtime** | `frontend/src/domain/calculator/systemValueCalculator.ts` | SYS Render·Recall·Overlay 계산 SSOT |
| **Render ViewModel** | `frontend/src/domain/system/slotSysViewModel.ts` | resolvedSlotSys 등 Render ViewModel SSOT |
| **Application Flow** | `frontend/src/application/flows/` | 업무 흐름 orchestration (8 files) |
| **Presentation** | `frontend/src/components/` · `App.jsx` | UI 표시 · Orchestrator |
| **System** | `frontend/src/data/systems/*` · `frontend/src/domain/system/` | System SSOT · identity |
| **Dataset** | `frontend/src/domain/dataset/` · `dataset/` (Published) | Working/Published corpus |

> **주의:** Trajectory Runtime SSOT는 Batch 5 대상이다. 본 Constitution v2.1에서는 선반영하지 않는다.

---

## 14. Migration Debt Governance

**Batch 운영 규칙 (Batch 3~4 확정)**

Migration Debt는 **Batch 단위**로 관리한다.

### Batch 종료 시 필수

각 Batch Closure 시 **Debt Report**를 작성한다.

| 항목 | 필수 내용 |
|------|----------|
| Debt ID | D-xxx |
| 상태 | Closed / Open |
| 해소 Batch | Batch 목표와 연결 |
| 발생 위치 | 파일·Layer |
| 신규 Debt | Batch 중 추가 생성 여부 |

### 현재 Debt Ledger (Batch 4 Closure 기준)

| ID | 항목 | 상태 | 해소 Batch |
|----|------|------|-----------|
| D-006 | `SYSTEM_PROFILES` 직접 접근 | Open | Batch 6 |
| D-007 | `getAnchorsForSystem` 직접 접근 | Open | Batch 6 |
| D-008 | `calculateByProfileExpr` Flow/App bypass | **Closed** | Batch 4 |

신규 Architecture Debt 없음 (Batch 4 Closure 확인).

---

## Appendix A. Batch 4 Architecture Achievement

**Baseline:** Batch 4 Code `02dd47f` · Closure `540a275` (2026-07-07)

| Migration ID | Achievement |
|-------------|-------------|
| **CAL-002** | `buildEffectiveRenderSysValues()` → Domain Runtime 이전 |
| **CAL-005** | `computeSysOverlayValues()` · `evaluateSysOverlayHasAllInputs()` → Domain Runtime 이전 · SysOverlay inline calc 제거 |
| **CAL-003** | `buildSlotSysSnapshot()` → Domain Runtime 이전 · `recallHydrateFlow` 계산 제거 |
| **MISC-004** | `resolveSlotSys()` → Render ViewModel SSOT 이전 |
| **D-008** | Closed — Flow/App `calculateByProfileExpr` bypass 해소 |
| **SSOT** | Calculation Runtime SSOT (`systemValueCalculator.ts`) 구축 |

### Architecture Decision

| ID | 결정 |
|----|------|
| AD-B4-01 | Option A — calc helper Domain co-location (`sysOverlayCalcHelpers.ts`) |

### App.jsx 변화

```
Batch 3: 5,807 lines
Batch 4: 5,640 lines (−167)
```

---

## Revision History

| Version | Date | Summary |
|---------|------|---------|
| **2.0** | 2026-07-03 | Architecture Constitution 초판 — Layer Rule · App.jsx Authority · System/Dataset SSOT |
| **2.1** | 2026-07-07 | Post Batch 4 Runtime Migration 동기화 — Calculation Runtime SSOT · Render ViewModel SSOT · Application Flow Rule · Runtime Ownership · SSOT File Map · Migration Debt Governance · Batch 4 Achievement Appendix |

### v2.1 변경 요약

- §2.6 Application Flow Layer 신규
- §3.1 App.jsx Orchestrator 허용/금지 구체화
- §10 Calculation Runtime SSOT 신규
- §11 Render ViewModel SSOT 신규
- §12 Runtime Ownership 신규
- §13 Runtime SSOT File Map 신규
- §14 Migration Debt Governance 신규
- Appendix A Batch 4 Architecture Achievement 신규
- Constitution 5/6/17 보강 (기존 Rule 유지 · 참조 추가)
