# Chapter01_App_Authority.md

# 3Cushion AI Application Architecture SSOT v2.0
## Chapter 01. App.jsx Authority Definition

Version: v2.0  
Status: Draft SSOT  
Owner: 3Cushion AI Architecture  
Scope: `frontend/src/App.jsx` authority, responsibility boundary, migration direction, regression rule  
Parent Document: `Architecture_Constitution.md`

---

## 0. Chapter Purpose

본 문서는 `App.jsx`의 권한과 책임을 정의하는 공식 규격서이다.

3Cushion AI는 더 이상 `5_half_system` 중심의 단일 시스템 앱이 아니라, 40개 이상의 시스템을 동일한 Application Engine 위에서 실행해야 하는 데이터 드리븐 분석 플랫폼이다.

따라서 `App.jsx`는 특정 시스템의 계산, 보정, 궤적, 검색, Dataset, Caption, AI 문장 생성 로직을 직접 구현해서는 안 된다.

`App.jsx`의 역할은 다음 한 문장으로 정의한다.

> **App.jsx는 애플리케이션을 구현하는 파일이 아니라, 애플리케이션을 조립하고 흐름을 지휘하는 Orchestrator이다.**

---

# Part A. Architecture SSOT

---

## A1. Core Principle

### A1.1 What / How Separation

`App.jsx`는 **무엇을 할 것인가(What)** 만 결정한다.  
`App.jsx`는 **어떻게 수행할 것인가(How)** 를 구현하지 않는다.

예시:

| 사용자 행위 | App.jsx 권한 | App.jsx 금지 |
|---|---|---|
| USER Search 클릭 | Search Flow 요청 | Search 알고리즘 실행 |
| ADMIN Recall 클릭 | Recall Flow 요청 | Recall matching 계산 |
| SYS 적용 | Application Flow 호출 | Formula 계산 |
| 동선 표시 | 렌더 상태 전달 | Trajectory 생성 |
| AI 패널 열기 | Overlay 상태 변경 | AI 문장 생성 |
| Dataset Export | Export Flow 요청 | Dataset 변환·저장 규칙 구현 |

---

### A1.2 App.jsx is an Orchestrator

`App.jsx`는 다음을 수행한다.

- 애플리케이션 시작
- 모드 선택
- 현재 선택 상태 관리
- Application Layer 호출
- 화면 구성
- Overlay 연결
- 렌더링 순서 조정

`App.jsx`는 다음이 아니다.

- Calculator
- System Engine
- Trajectory Engine
- Caption Engine
- Dataset Manager
- Search Engine
- Recall Engine
- AI Comment Engine
- System Lesson Engine

---

### A1.3 App.jsx Must Be System-Agnostic

`App.jsx`는 특정 시스템을 특별 취급하지 않는다.

금지 예시:

```ts
if (systemId === "5_half_system") { ... }
switch (systemId) { ... }
const useSn = systemId === "5_half_system";
```

허용 예시:

```ts
const appSystem = systemApplication.loadSystem(selectedSystemId);
const result = applicationFlow.applySystem(appSystem, input);
```

즉, `App.jsx`는 `systemId`를 전달할 수는 있지만, 그 시스템이 어떤 공식·보정·궤적·표시 규칙을 갖는지는 알면 안 된다.

---

## A2. App.jsx Authorized Responsibilities

`App.jsx`는 아래 권한만 가진다.

---

### A2.1 Application Boot

허용 책임:

- React App 진입점으로서 초기 렌더 구성
- Context Provider 연결
- 초기 Layout 상태 연결
- 시스템 목록 로드 요청
- 기본 모드/초기 선택값 세팅

금지 책임:

- 시스템별 초기값 계산
- 특정 시스템 기본 공식을 직접 설정
- Dataset 구조를 직접 해석
- Published Dataset URL을 직접 조립

---

### A2.2 Global Application State Coordination

`App.jsx`는 애플리케이션 수준의 상태만 관리한다.

허용 상태 예시:

```ts
mode
selectedSystemId
selectedShotType
selectedSlotId
overlayContent
adminOverlayState
userOverlayState
layoutState
trajectoryViewMode
userSessionState
adminSessionState
```

주의:

- `App.jsx`가 임시 UI 상태를 가질 수는 있다.
- 하지만 계산 결과의 생성 규칙을 App 내부 상태로 만들면 안 된다.
- 계산 결과는 Application/Domain에서 만들어진 결과를 App가 받아 렌더링에 전달하는 구조여야 한다.

---

### A2.3 Event Dispatch

`App.jsx`는 사용자 이벤트를 Application Layer에 전달한다.

예시:

```ts
handleUserSearchClick()
  -> userSearchFlow.run(...)

handleAdminRecallClick()
  -> adminRecallFlow.run(...)

handleTrajectoryToggle()
  -> trajectoryViewFlow.update(...)

handleOverlayOpen()
  -> overlayFlow.open(...)
```

금지:

- 이벤트 핸들러 내부에서 직접 Search/Recall/Formula/Trajectory 알고리즘을 구현
- 이벤트 핸들러 내부에서 시스템별 분기 수행
- 이벤트 핸들러 내부에서 Dataset merge/diff/export 구현

---

### A2.4 Screen Composition

`App.jsx`는 화면을 조립한다.

허용:

- `Stage`
- ADMIN Panel
- USER Panel
- Overlay Panel
- History Modal
- AI Panel
- HPT Panel
- Trajectory Card
- Toolbar
- Button Group

금지:

- Panel 내부 ViewModel 생성 규칙을 직접 구현
- Overlay별 데이터 생성 로직을 직접 구현
- 시스템별 UI 문구·계산표를 직접 구성

---

### A2.5 Render Coordination

`App.jsx`는 렌더 순서를 조정할 수 있다.

허용 예시:

```text
Stage
→ Trajectory Path
→ System Axis Values
→ Current Result Labels
→ Balls
→ Overlay
```

금지:

- 궤적 path 생성
- path cap 계산
- caption 위치 계산
- 시스템 축 기준값 생성
- label placement 알고리즘 구현

---

### A2.6 Context Provider

`App.jsx`는 필요한 Context Provider를 연결할 수 있다.

허용:

- Layout Context
- Admin Session Context
- User Session Context
- Theme/Layout Provider

금지:

- Context 내부에서 수행해야 할 계산을 App가 대신 수행
- Context가 Domain 로직을 우회하도록 App에서 직접 patch

---

## A3. App.jsx Prohibited Responsibilities

아래 책임은 `App.jsx`에서 제거되어야 한다.

---

### A3.1 System Rule Prohibition

`App.jsx`는 시스템 규칙을 구현하지 않는다.

금지 대상:

- `5_half_system` 전용 분기
- `Sn` 계산 여부 판단
- C4/C5/C6 sync rule
- 4쿠션/5쿠션/6쿠션 표시 여부 판단
- 시스템별 입력 필드 강제
- 시스템별 caption rule
- 시스템별 trajectory depth
- 시스템별 lesson rule

위 내용은 `System Layer`와 `Domain Layer`의 책임이다.

---

### A3.2 Formula / Calculation Prohibition

금지 대상:

```text
C1 계산
C3 계산
C4 계산
C5 계산
C6 계산
CO 보정
Sn 계산
출발값 보정
3쿠션 보정
공식 파싱
formula.expr 실행
```

계산 책임은 `Domain Calculation` 또는 `System Calculation Engine`에 있어야 한다.

---

### A3.3 Correction / Logic Prohibition

금지 대상:

```text
slide
draw
curve_ratio
spin
departure
system-specific branch
special correction
baseline merge correction
```

보정은 `logic.json` 및 `Domain Correction Engine`이 담당한다.

---

### A3.4 Trajectory Prohibition

금지 대상:

```text
trajectory node 생성
impact point 계산
rail detection
path cap 계산
same rail cap
second ball cap
chain break cap
Hermite curve 생성
baseline/corrected path 생성
```

Trajectory는 `Domain Trajectory`가 담당한다.

---

### A3.5 Caption / System Axis Label Prohibition

금지 대상:

```text
caption placement
axis bucket calculation
labelScale decision
SystemValueLabels source generation
caption exception
track별 caption 분기
```

Caption과 시스템 축 표시 규칙은 `Domain Caption` 및 Renderer 전용 컴포넌트가 담당한다.

---

### A3.6 Dataset Prohibition

금지 대상:

```text
positions_dataset merge
workspace_history commit
dataset export envelope 생성
published leaf path 조립
published loader cache 처리
dataset diff
canonical save 변환
```

Dataset은 `Dataset Layer`와 `Application Dataset Flow`가 담당한다.

---

### A3.7 Search / Recall Prohibition

금지 대상:

```text
distance calculation
coarse pass
permutation
totalL1Cap
profile selection logic
match scoring
fallback search
adminSearch/userStrict/adminStrict 비교
```

Search/Recall은 `Domain Search/Recall`과 `Application Search Flow`가 담당한다.

---

### A3.8 AI / Lesson Prohibition

금지 대상:

```text
AI 문장 생성
onePointLessons 병합 규칙
System Lesson ViewModel 생성
Trajectory Card ViewModel 생성
HPT ViewModel 생성
```

AI와 Lesson은 각각의 Domain/ViewModel Builder가 담당한다.

---

## A4. Allowed Dependencies

`App.jsx`는 원칙적으로 다음 계층에만 의존한다.

```text
Presentation Layer
Application Layer
```

허용:

```ts
import Stage from "./components/Stage";
import UserAiPanel from "./components/user/UserAiPanel";
import { runUserSearchFlow } from "./application/userSearchFlow";
import { openOverlay } from "./application/overlayFlow";
```

제한적 허용:

- 기존 마이그레이션 기간에는 일부 Domain import가 임시 허용될 수 있다.
- 단, 모든 임시 Domain direct import는 `TODO_ARCH_V2_DIRECT_DOMAIN_IMPORT` 주석으로 표시하고 제거 대상 목록에 등록한다.

금지:

```ts
import { calculateSystem } from "./utils/systemCalculator";
import { buildTrajectory } from "./utils/trajectory/...";
import { fetchPublishedLeaf } from "./domain/datasetLoader";
import profile from "./data/systems/5_half_system/profile.json";
```

---

## A5. System-Agnostic Rule

새로운 시스템을 추가하기 위해 `App.jsx`를 수정해야 한다면 Architecture 위반이다.

새 시스템 추가는 다음 파일만으로 가능해야 한다.

```text
frontend/src/data/systems/<systemId>/profile.json
frontend/src/data/systems/<systemId>/logic.json
frontend/src/data/systems/<systemId>/anchors.json
frontend/src/data/systems/<systemId>/system_meta.json
```

App는 다음만 수행한다.

```ts
applicationSystemLoader.load(systemId);
```

---

## A6. Target State

현재 목표:

```text
Current App.jsx: 약 9,000+ lines
Target App.jsx: 800 ~ 1,200 lines
```

단, 줄 수 감소 자체가 목적은 아니다.

진짜 목표는 다음이다.

```text
App.jsx = Orchestrator
Application Layer = 업무 흐름
Domain Layer = 계산/검색/궤적/데이터 순수 로직
System Layer = 시스템별 SSOT
Dataset Layer = Published/Working/History 데이터
Presentation Layer = UI 표시
```

---

## A7. Non-Goals

Chapter 01에서 수행하지 않는 것:

- UI 디자인 변경
- Overlay 크기 조정
- Caption 배치 개선
- Search threshold 변경
- Trajectory 엔진 변경
- Dataset 구조 변경
- 40개 시스템 파일 정리
- 시스템별 공식 재검증

이 Chapter의 목적은 오직 `App.jsx`의 권한 경계를 정의하고, 이후 리팩터링의 기준을 세우는 것이다.

---

# Part B. Execution Plan

---

## B1. Execution Strategy

Chapter 01 구현은 한 번에 전체 App를 줄이는 작업이 아니다.

목표는 다음이다.

1. `App.jsx` 내부 책임을 분류한다.
2. Application Layer로 이동 가능한 흐름을 식별한다.
3. Domain 직접 구현 코드를 표시한다.
4. System-specific 코드를 추적한다.
5. 실제 이동은 안전한 Phase 단위로 수행한다.

---

## B2. Phase 1 — App Responsibility Inventory

Cursor는 먼저 수정하지 않고 분석한다.

작업:

- `App.jsx` 내 모든 주요 함수 목록 작성
- 각 함수의 책임 분류
- 다음 카테고리로 태깅

```text
APP_ALLOWED
APPLICATION_FLOW
DOMAIN_LOGIC
SYSTEM_SPECIFIC
DATASET_LOGIC
SEARCH_RECALL_LOGIC
TRAJECTORY_LOGIC
CAPTION_LOGIC
AI_LESSON_LOGIC
PRESENTATION_ONLY
UNKNOWN
```

산출물:

```text
docs/architecture/App_Authority_Inventory.md
```

필수 포함:

- 함수명
- 위치
- 현재 역할
- 권한 위반 여부
- 이동 대상 Layer
- 위험도
- 우선순위

---

## B3. Phase 2 — Boundary Marking

코드 이동 전, App 내부에 책임 경계 주석을 추가한다.

예:

```ts
// ARCH_V2: APPLICATION_FLOW candidate
// ARCH_V2: DOMAIN_TRAJECTORY candidate
// ARCH_V2: SYSTEM_SPECIFIC violation
```

목적:

- 무리한 리팩터링 방지
- 이후 단계별 이동의 기준 제공
- Regression 발생 시 원인 추적 가능

주의:

- 기능 변경 금지
- 함수 동작 변경 금지
- import 변경 최소화

---

## B4. Phase 3 — Application Facade 생성

`App.jsx`가 직접 Domain을 호출하지 않도록 Application Facade를 만든다.

후보 경로:

```text
frontend/src/application/
  appSystemFacade.ts
  userSearchFlow.ts
  adminRecallFlow.ts
  trajectoryViewFlow.ts
  overlayFlow.ts
  datasetFlow.ts
  historyFlow.ts
  slotFlow.ts
```

이 Phase에서는 기존 로직을 완전히 옮기기보다, 우선 facade 함수로 감싼다.

예:

```ts
// Before
const result = runRecallEngine(...);

// After
const result = adminRecallFlow.run(...);
```

---

## B5. Phase 4 — System-specific 코드 격리

`App.jsx`에서 발견되는 다음 코드를 격리한다.

- `5_half_system`
- `5_HALF`
- `useSn`
- `needsC3r`
- `C4_f`, `C5_f`, `C6_f` system-specific sync
- `/samples/5_half_system`
- 5½ 전용 baseline merge
- 5½ 전용 lesson/view model 조건

이 Phase의 목표:

```text
App.jsx 안에 system-specific branch가 새로 추가되지 않도록 봉쇄한다.
```

단, 실제 System SSOT 재정리는 Chapter 14~16에서 수행한다.

---

## B6. Phase 5 — App Event Handler 축소

대형 event handler를 Application Flow 호출로 축소한다.

대상 예시:

```text
handleUserSearchStrategies
handlePositionRecall
runAdminPositionRecall
handleExportSnapshots
handleOpenUserOverlay
handleApplySysResult
handleSave
handleHistoryLoad
```

목표 형태:

```ts
const handleUserSearch = async () => {
  const nextState = await userSearchFlow.run(context);
  applyAppState(nextState);
};
```

---

## B7. Phase 6 — App Render Composition 정리

App의 JSX 영역은 화면 조립만 남긴다.

원칙:

- ViewModel 생성은 App 외부
- 계산 결과 조립은 App 외부
- props 전달은 명확하게
- overlay routing은 application/overlayFlow 또는 presentation router로 분리

---

## B8. Phase 7 — App Size Reduction

단계별 목표:

```text
Step 1: 9000 → 7500 lines
Step 2: 7500 → 5500 lines
Step 3: 5500 → 3500 lines
Step 4: 3500 → 2000 lines
Step 5: 2000 → 800~1200 lines
```

주의:

- 줄 수는 결과 지표일 뿐이다.
- 줄 수를 줄이기 위해 책임 경계를 흐리면 안 된다.

---

# Part C. Cursor Work Order

---

## C1. Cursor Mode

```text
[Cursor Mode: Ask]
```

Chapter 01의 첫 작업은 반드시 Ask 모드로 시작한다.

이유:

- 영향 범위 분석 필요
- 수정 파일 식별 필요
- Git 상태 확인 필요
- App.jsx 대형 리팩터링 위험 존재

---

## C2. Initial Ask Request

아래 요청서를 Cursor에 전달한다.

```text
[Cursor Mode: Ask]

목표:
Architecture_Constitution.md 및 Chapter01_App_Authority.md를 기준으로 App.jsx의 책임 범위를 분석한다.

작업:
1. frontend/src/App.jsx 전체를 함수/상태/렌더 블록 단위로 분석한다.
2. 각 함수와 상태를 다음 카테고리로 분류한다.
   - APP_ALLOWED
   - APPLICATION_FLOW
   - DOMAIN_LOGIC
   - SYSTEM_SPECIFIC
   - DATASET_LOGIC
   - SEARCH_RECALL_LOGIC
   - TRAJECTORY_LOGIC
   - CAPTION_LOGIC
   - AI_LESSON_LOGIC
   - PRESENTATION_ONLY
   - UNKNOWN
3. App.jsx 내부의 system-specific 코드를 모두 찾는다.
   특히 다음 키워드를 검색한다.
   - 5_half_system
   - 5_HALF
   - useSn
   - needsC3r
   - C4_f
   - C5_f
   - C6_f
   - samples/5_half_system
4. App.jsx가 직접 Domain/Dataset/System에 접근하는 import를 모두 찾는다.
5. 결과를 docs/architecture/App_Authority_Inventory.md로 작성한다.

금지:
- 코드 수정 금지
- import 변경 금지
- 기능 변경 금지
- formatting 변경 금지

출력:
- 영향 범위 요약
- 권한 위반 목록
- 이동 대상 Layer 제안
- 위험도
- 다음 Agent 작업 제안
```

---

## C3. First Agent Request

Ask 결과 검토 후 아래 요청서를 사용한다.

```text
[Cursor Mode: Agent]

목표:
Chapter01_App_Authority.md 기준으로 App.jsx의 책임 경계를 표시한다.
이번 단계에서는 기능을 옮기지 않고, 리팩터링 준비용 주석과 문서만 추가한다.

작업:
1. App.jsx 내 주요 함수 상단에 ARCH_V2 책임 태그 주석을 추가한다.
2. system-specific 코드에는 ARCH_V2_SYSTEM_SPECIFIC 주석을 추가한다.
3. Domain 직접 호출에는 ARCH_V2_DIRECT_DOMAIN_IMPORT 또는 ARCH_V2_DOMAIN_CALL 주석을 추가한다.
4. Dataset 직접 처리 코드에는 ARCH_V2_DATASET_LOGIC 주석을 추가한다.
5. Search/Recall 직접 처리 코드에는 ARCH_V2_SEARCH_RECALL_LOGIC 주석을 추가한다.
6. Trajectory 직접 처리 코드에는 ARCH_V2_TRAJECTORY_LOGIC 주석을 추가한다.
7. 변경 결과를 docs/architecture/App_Authority_Inventory.md에 반영한다.

금지:
- 동작 변경 금지
- 함수 이동 금지
- 로직 수정 금지
- UI 변경 금지
- 계산 결과 변경 금지

검증:
- npm run build
- 기존 주요 화면 수동 확인
- git diff에서 로직 변경이 없는지 확인
```

---

## C4. Second Agent Request

Boundary marking 완료 후 진행한다.

```text
[Cursor Mode: Agent]

목표:
App.jsx가 직접 호출하는 일부 흐름을 Application Facade로 감싼다.
이번 단계는 facade 생성이 목적이며, 실제 로직 대규모 이동은 하지 않는다.

작업:
1. frontend/src/application/ 디렉터리를 생성한다.
2. 다음 facade 후보 파일을 생성한다.
   - appSystemFacade.ts
   - overlayFlow.ts
   - trajectoryViewFlow.ts
   - userSearchFlow.ts
   - adminRecallFlow.ts
3. App.jsx에서 가장 위험도가 낮은 handler 1~2개만 facade 호출 구조로 변경한다.
4. 기존 동작과 반환값을 유지한다.
5. App.jsx line count 변화를 기록한다.

금지:
- Search threshold 변경 금지
- Recall profile 변경 금지
- Trajectory 결과 변경 금지
- Dataset path 변경 금지
- UI 변경 금지

검증:
- npm run build
- USER Search smoke test
- ADMIN Search/Recall smoke test
- Overlay open/close smoke test
```

---

## C5. Commit Rule

각 단계는 별도 commit으로 관리한다.

권장 commit:

```text
docs(architecture): add app authority inventory
chore(app): mark architecture v2 responsibility boundaries
refactor(app): introduce application facade without behavior change
```

---

# Part D. Regression Checklist

---

## D1. Build Regression

필수:

```text
npm run build
```

통과해야 한다.

---

## D2. App Boot Regression

확인:

- 앱이 정상 실행된다.
- 첫 화면이 기존과 동일하다.
- ADMIN/USER 모드 전환이 정상이다.
- 콘솔에 신규 error가 없다.

---

## D3. System Regression

확인:

- `5_half_system` 기존 동작 유지
- 기존 SYS 입력 정상
- 기존 계산 결과 동일
- C1/C3/CO/C4/C5/C6 표시 변경 없음
- baseline/corrected 전환 정상

---

## D4. USER Search Regression

확인:

- USER Search 버튼 동작
- Published Dataset fetch 정상
- Search 성공 시 공략 버튼 활성
- Search 실패 시 기존 no-match 동작 유지
- Reset 동작 유지

---

## D5. ADMIN Regression

확인:

- ADMIN Search 정상
- ADMIN 로컬DB 정상
- Recall 동작 정상
- SYS Overlay 정상
- HP/T Overlay 정상
- STR Overlay 정상
- AI Overlay 정상
- SAVE 정상

---

## D6. Dataset Regression

확인:

- `dataset/` 경로 변경 없음
- Published Dataset URL 변경 없음
- `dataset/{공략}/{시스템}/positions.json` fetch 유지
- `dataset/`이 `.gitignore` 대상이 아님
- Export 구조 변경 없음

---

## D7. Trajectory Regression

확인:

- 기존 궤적 표시 유지
- ImpactLines 표시 유지
- Trajectory Display Cap 유지
- baseline/corrected path 분리 유지
- same rail cap rule 유지

---

## D8. Overlay Regression

확인:

- AI 패널 열림/닫힘 정상
- 두께/타점 패널 정상
- 동선 카드 정상
- History 정상
- Overlay backdrop 동작 정상

주의:

- Chapter 01에서는 Overlay 크기/디자인 수정 금지
- UI 개선은 별도 Chapter 또는 후속 UI 작업에서 수행

---

## D9. System-Agnostic Regression

확인:

- App.jsx에 새로운 `if(systemId === "...")` 분기가 추가되지 않았는가
- `5_half_system` 전용 로직이 새로 증가하지 않았는가
- 새 시스템 추가 시 App 수정이 필요한 구조가 늘어나지 않았는가

---

## D10. Git Diff Regression

확인:

- 의도하지 않은 대규모 formatting 변경 없음
- 기능 변경 없는 단계에서는 logic diff 없음
- 삭제 파일 확인
- Dataset 삭제/변경이 의도된 것인지 확인

---

# Revision History

| Version | Date | Description |
|---|---|---|
| v2.0 | 2026-06 | Initial Chapter 01 App Authority Definition |

---

# Chapter 01 Final Rule

> **App.jsx는 시스템을 구현하지 않는다. App.jsx는 시스템을 실행할 Application Flow를 호출할 뿐이다.**

> **새 시스템 추가를 위해 App.jsx를 수정해야 한다면, 그것은 Architecture 위반이다.**
