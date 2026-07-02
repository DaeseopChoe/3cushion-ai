# 3Cushion AI Application Architecture SSOT v2.0  
# Chapter 02. Layer Architecture Specification

Version: v2.0  
Status: Draft for Architecture SSOT  
Owner: 3Cushion AI  
Scope: Application-wide layer structure, dependency direction, ownership boundary, and migration standard  
Depends on: `Architecture_Constitution.md`, `Chapter01_App_Authority.md`

---

## 0. Chapter Purpose

본 문서는 3Cushion AI의 전체 애플리케이션을 **계층 구조(Layer Architecture)** 로 정의한다.

Chapter 01이 `App.jsx`의 권한과 금지 책임을 정의했다면, Chapter 02는 그 권한 분리를 실제 코드 구조로 구현하기 위한 **Layer 기준**을 정의한다.

이 문서의 목적은 다음과 같다.

1. `App.jsx`를 Orchestrator로 유지하기 위한 하위 계층 구조를 정의한다.
2. Presentation / Application / Domain / System / Dataset / Infrastructure Layer의 책임을 명확히 구분한다.
3. 각 Layer가 무엇을 알 수 있고, 무엇을 몰라야 하는지 정의한다.
4. 계층 간 의존 방향을 고정한다.
5. Cursor가 향후 리팩터링 시 파일을 어느 Layer로 이동해야 하는지 판단할 수 있는 기준을 제공한다.

---

# Part A. Architecture SSOT

---

## A1. Core Layer Principle

3Cushion AI는 다음 Layer 구조를 따른다.

```text
Presentation Layer
        ↓
Application Layer
        ↓
Domain Layer
        ↓
System Layer
        ↓
Dataset Layer
        ↓
Infrastructure Layer
```

의존성은 **항상 위에서 아래로만 흐른다.**

아래 Layer는 위 Layer를 알면 안 된다.

예:

```text
허용:
App.jsx → application/userSearchFlow → domain/recall → dataset

금지:
domain/recall → App.jsx
domain/trajectory → React component
system profile → App state
dataset loader → overlay state
```

---

## A2. Layer Overview

| Layer | 핵심 역할 | 대표 책임 | 대표 파일/폴더 |
|---|---|---|---|
| Presentation | 화면 조립과 사용자 입력 전달 | React components, Stage, Overlay UI | `App.jsx`, `components/*` |
| Application | 업무 흐름 제어 | Search Flow, Recall Flow, Overlay Flow, Slot Flow | `application/*` |
| Domain | 순수 로직 | Calculation, Trajectory, Recall, Caption, AI, History | `domain/*`, `utils/*` 중 순수 로직 |
| System | 시스템 정의 데이터 | profile, logic, anchors, meta | `data/systems/<systemId>/*` |
| Dataset | 운영/작업 데이터 | working dataset, published dataset, history | `dataset/*`, dataset domain |
| Infrastructure | 외부 환경 접근 | localStorage, fetch, file save, browser API | adapters, loaders |

---

## A3. Presentation Layer

### A3.1 Definition

Presentation Layer는 사용자가 보는 화면을 구성하고, 사용자 이벤트를 Application Layer에 전달하는 계층이다.

Presentation Layer는 **표시와 입력**을 담당한다.

Presentation Layer는 계산하거나 판단하지 않는다.

---

### A3.2 Allowed Responsibilities

Presentation Layer는 다음 책임을 가질 수 있다.

```text
- React component 렌더링
- UI state 중 시각적 상태 관리
- 버튼 클릭 이벤트 수신
- Overlay 표시 여부 반영
- Stage / Panel / Modal 조립
- Application Layer 호출
- ViewModel 결과 표시
```

---

### A3.3 Forbidden Responsibilities

Presentation Layer는 다음 책임을 가지면 안 된다.

```text
- 시스템 공식 계산
- trajectory 생성
- recall/search matching
- dataset merge/export/import 규칙 구현
- system-specific branch
- 5_half_system 전용 로직
- caption placement 계산
- AI 문장 생성
- published dataset fetch 경로 직접 조립
```

---

### A3.4 App.jsx Position

`App.jsx`는 Presentation Layer에 속하지만, 단순 component가 아니라 **Presentation Orchestrator**이다.

App.jsx는 다음만 수행한다.

```text
- 현재 mode 선택
- 현재 shot/system/slot 선택 상태 유지
- Application Flow 호출
- 화면 조립
- Overlay 라우팅
```

App.jsx는 직접 Domain Layer를 호출하지 않는다.

---

## A4. Application Layer

### A4.1 Definition

Application Layer는 사용자의 행동을 실제 업무 흐름으로 변환하는 계층이다.

Application Layer는 **Process / Flow / Use Case**를 담당한다.

예:

```text
USER Search 버튼 클릭
    ↓
published dataset load
    ↓
recall search
    ↓
matched record hydrate
    ↓
slot update
    ↓
trajectory request
    ↓
UI state return
```

이 전체 흐름은 App.jsx가 아니라 Application Layer가 담당한다.

---

### A4.2 Application Layer Responsibilities

Application Layer는 다음 책임을 가진다.

```text
- User Search Flow
- Admin Search Flow
- Admin LocalDB Flow
- Recall Flow
- Save Flow
- History Flow
- Overlay Flow
- Slot Flow
- Trajectory Apply Flow
- System Load Flow
- Reset Flow
```

---

### A4.3 Application Layer가 알 수 있는 것

Application Layer는 다음을 알 수 있다.

```text
- current mode
- selected systemId
- selected shotType
- selected slotId
- current app session
- domain function contracts
- system loader result
```

---

### A4.4 Application Layer가 몰라야 하는 것

Application Layer는 다음을 직접 구현하면 안 된다.

```text
- C1/C3/C4 계산식
- Sn 계산
- trajectory geometry
- caption placement
- recall similarity formula
- dataset file write details
- React component layout
```

Application Layer는 Domain Layer에 요청하고 결과를 조립한다.

---

### A4.5 Recommended Application Modules

```text
frontend/src/application/
├─ appSessionController.ts
├─ systemLoader.ts
├─ userSearchFlow.ts
├─ adminSearchFlow.ts
├─ adminLocalDbFlow.ts
├─ recallFlow.ts
├─ slotFlow.ts
├─ trajectoryFlow.ts
├─ overlayFlow.ts
├─ resetFlow.ts
├─ historyFlow.ts
└─ saveFlow.ts
```

파일명은 구현 과정에서 조정할 수 있으나, 책임 분리는 유지해야 한다.

---

## A5. Domain Layer

### A5.1 Definition

Domain Layer는 3Cushion AI의 순수 비즈니스 로직을 담당한다.

Domain Layer는 React를 알지 않는다.

Domain Layer는 UI를 알지 않는다.

Domain Layer는 입력을 받아 결과를 반환하는 순수 함수 중심이어야 한다.

---

### A5.2 Domain Responsibilities

Domain Layer는 다음 책임을 가진다.

```text
- System calculation
- Correction calculation
- Trajectory generation
- Impact / reflection logic
- Caption placement
- Recall / Search compare
- Dataset merge / canonicalization
- AI comment view model
- User trajectory card view model
- User HP/T view model
- System lesson view model
- History record normalization
```

---

### A5.3 Domain Module Candidates

```text
frontend/src/domain/
├─ calculation/
├─ trajectory/
├─ recall/
├─ dataset/
├─ caption/
├─ ai/
├─ lesson/
├─ hpt/
├─ history/
├─ slot/
├─ strategy/
└─ system/
```

기존 `utils/*`에 있는 순수 로직은 점진적으로 `domain/*`으로 이동할 수 있다.

---

### A5.4 Domain Layer Rules

Domain Layer는 다음 규칙을 지킨다.

```text
- React import 금지
- DOM 접근 금지
- localStorage 직접 접근 금지
- fetch 직접 호출 금지
- App state 직접 참조 금지
- systemId별 hardcoding 금지
- 입력과 출력 contract 명확화
```

---

## A6. System Layer

### A6.1 Definition

System Layer는 각 3쿠션 시스템의 고유 정의를 저장하는 계층이다.

System Layer는 코드가 아니라 **데이터 SSOT**이다.

각 시스템은 원칙적으로 다음 4개 파일을 가진다.

```text
frontend/src/data/systems/<systemId>/
├─ profile.json
├─ logic.json
├─ anchors.json
└─ system_meta.json
```

---

### A6.2 Four-File Responsibility

| 파일 | 책임 | 설명 |
|---|---|---|
| `profile.json` | What to calculate | 공식, 입력값, 출력값, value domain, display 대상 |
| `logic.json` | How to calculate | 보정, 분기, sync rule, system-specific rule |
| `anchors.json` | Where to render | 좌표 기준점, trajectory anchor, system mark |
| `system_meta.json` | How to describe | 이름, alias, sample path, lesson availability, category |

---

### A6.3 System Layer Rules

System Layer는 다음 규칙을 지킨다.

```text
- 시스템 고유 규칙은 App.jsx에 두지 않는다.
- 시스템 고유 규칙은 logic/profile/meta/anchors 중 하나에 둔다.
- systemId 추가 때문에 App.jsx가 수정되면 Architecture 위반이다.
- 5_half_system은 특별한 코드 분기가 아니라 하나의 system profile이다.
```

---

## A7. Dataset Layer

### A7.1 Definition

Dataset Layer는 저장된 포지션 데이터와 Published Corpus를 관리한다.

Dataset Layer는 System Layer와 다르다.

System Layer는 시스템 정의이고, Dataset Layer는 실제 포지션 corpus이다.

---

### A7.2 Dataset Types

| Type | SSOT | 용도 |
|---|---|---|
| Working Dataset | `positions_dataset` localStorage | ADMIN 작업 데이터 |
| Workspace History | `workspace_history` localStorage | 작업 이력 |
| Published Dataset | `dataset/{공략}/{시스템}/positions.json` | USER Search / ADMIN Published Search |

---

### A7.3 Published Dataset Rule

```text
dataset/
```

은 Published Corpus SSOT이다.

Production Search는 다음 파일을 직접 fetch한다.

```text
dataset/{공략}/{시스템}/positions.json
```

따라서 `dataset/`은 절대 `.gitignore` 대상이 되면 안 된다.

---

## A8. Infrastructure Layer

### A8.1 Definition

Infrastructure Layer는 외부 환경과의 접점을 담당한다.

예:

```text
- fetch
- localStorage
- file save
- browser API
- Vercel static delivery
- import.meta.glob
```

Domain Layer는 Infrastructure를 직접 알면 안 된다.

Application Layer 또는 Infrastructure Adapter를 통해 접근한다.

---

### A8.2 Recommended Infrastructure Modules

```text
frontend/src/infrastructure/
├─ storage/
│  ├─ localStorageAdapter.ts
│  └─ workspaceHistoryStorage.ts
├─ network/
│  └─ publishedDatasetClient.ts
├─ file/
│  └─ datasetExportFileWriter.ts
└─ system/
   └─ viteSystemProfileRegistry.ts
```

---

## A9. Dependency Direction

### A9.1 Allowed Direction

```text
Presentation
    ↓
Application
    ↓
Domain
    ↓
System
    ↓
Dataset
    ↓
Infrastructure
```

단, 실제 구현에서는 Infrastructure 접근이 Application을 통해 주입될 수 있다.

---

### A9.2 Forbidden Direction

```text
Domain → Presentation
System → App.jsx
Dataset → React
Infrastructure → Domain decision
Component → system-specific calculation
App.jsx → profile internals 직접 해석
```

---

## A10. Layer Boundary Rule

Layer 간 이동 시 다음 기준을 적용한다.

| 현재 코드 성격 | 이동 대상 |
|---|---|
| 버튼 클릭 후 여러 domain 호출 조합 | Application Layer |
| 계산식/보정/순수 로직 | Domain Layer |
| 시스템별 상수/규칙 | System Layer |
| positions.json fetch/save | Dataset/Infrastructure Layer |
| 화면 표시 component | Presentation Layer |
| ViewModel 조립 | Domain 또는 Application, React 비의존이면 Domain |
| Overlay 열기/닫기 흐름 | Application Layer |
| Overlay UI | Presentation Layer |

---

## A11. Layer Violation Examples

다음은 Architecture 위반이다.

```jsx
// App.jsx 내부
if (systemId === "5_half_system") {
  // Sn 계산
}
```

```jsx
// Component 내부
const match = runRecallSearch(records, balls);
```

```ts
// Domain 내부
document.querySelector(...)
```

```ts
// Domain 내부
localStorage.getItem("positions_dataset")
```

```json
// profile.json 내부에 UI component 이름 직접 저장
{
  "component": "UserTrajectoryInfoCard"
}
```

---

## A12. Success Criteria

Chapter 02의 성공 기준은 다음과 같다.

1. 모든 코드가 Layer 책임에 따라 분류된다.
2. App.jsx는 Application Layer만 호출한다.
3. Domain Layer는 React/DOM/localStorage/fetch를 직접 알지 않는다.
4. System-specific rule은 System Layer에 위치한다.
5. Dataset delivery rule은 Dataset/Infrastructure Layer에 위치한다.
6. 새로운 시스템 추가 시 App.jsx 수정이 필요 없다.
7. Layer 위반 사례가 문서화되고 점진적으로 제거된다.

---

# Part B. Execution Plan

---

## B1. Execution Goal

Chapter 02 구현의 목표는 기존 기능을 변경하지 않고, 현재 코드베이스를 Layer Architecture에 맞게 점진적으로 정렬하는 것이다.

이 Phase의 핵심은 **파일 이동 자체가 아니라 책임 분리 기준을 코드베이스에 적용할 수 있는 구조를 만드는 것**이다.

---

## B2. Execution Strategy

Chapter 02는 한 번에 전체 이동을 수행하지 않는다.

다음 순서로 진행한다.

```text
Step 1. 현재 파일 분류
Step 2. Layer 폴더 생성
Step 3. 기존 domain/utils 파일 mapping
Step 4. Application Layer skeleton 생성
Step 5. Infrastructure adapter 후보 생성
Step 6. App.jsx 직접 의존 목록 기록
Step 7. 실제 코드 이동은 후속 Chapter에서 수행
```

---

## B3. Step 1 — Current File Classification

Cursor는 현재 파일을 다음 기준으로 분류한다.

```text
Presentation:
- React component
- JSX
- CSS class dependent
- user interaction component

Application:
- 여러 domain 함수를 조합하는 flow
- Search/Recall/Save/Reset 같은 use case

Domain:
- 순수 계산
- trajectory
- recall
- caption
- dataset normalization
- AI view model

System:
- data/systems/*

Dataset:
- dataset/*
- dataset path / loader / export domain

Infrastructure:
- localStorage
- fetch
- browser file picker
- import.meta.glob
```

결과는 문서로 남긴다.

권장 출력:

```text
docs/architecture/LAYER_CLASSIFICATION_REPORT.md
```

---

## B4. Step 2 — Layer Folder Skeleton

다음 폴더를 생성한다.

```text
frontend/src/application/
frontend/src/domain/
frontend/src/infrastructure/
```

이미 존재하는 폴더와 충돌하지 않도록 한다.

기존 `domain/`이 존재하면 새 구조를 덮어쓰지 말고 하위 폴더 기준으로 정렬한다.

---

## B5. Step 3 — Existing Module Mapping

기존 주요 파일을 Layer별로 mapping한다.

예상 mapping:

```text
App.jsx
→ Presentation Orchestrator

components/*
→ Presentation

hooks/useShotSlots.ts
→ 현재: Hook/Application 혼합
→ 목표: slotFlow + presentation hook 분리

hooks/useTrajectoryState.ts
→ 현재: Hook/Application 혼합
→ 목표: trajectoryFlow + presentation hook 분리

domain/recall/*
→ Domain

domain/dataset*
→ Domain/Dataset

domain/publishedDatasetStore.ts
→ Application 또는 Infrastructure 경계 검토

domain/datasetLoader.ts
→ Dataset/Infrastructure 경계 검토

domain/userTrajectoryCardViewModel.ts
→ Domain

domain/userSystemLessonViewModel.ts
→ Domain

utils/systemCalculator.ts
→ Domain Calculation

utils/trajectory/*
→ Domain Trajectory

data/systems/*
→ System
```

---

## B6. Step 4 — Application Layer Skeleton

우선 skeleton만 생성한다.

```text
frontend/src/application/systemLoader.ts
frontend/src/application/userSearchFlow.ts
frontend/src/application/adminSearchFlow.ts
frontend/src/application/recallFlow.ts
frontend/src/application/trajectoryFlow.ts
frontend/src/application/overlayFlow.ts
frontend/src/application/resetFlow.ts
frontend/src/application/slotFlow.ts
frontend/src/application/historyFlow.ts
frontend/src/application/saveFlow.ts
```

초기 구현은 re-export 또는 wrapper 수준으로 제한한다.

기능 변경 금지.

---

## B7. Step 5 — Infrastructure Candidate Adapters

다음 후보를 만든다.

```text
frontend/src/infrastructure/storage/localStorageAdapter.ts
frontend/src/infrastructure/network/publishedDatasetClient.ts
frontend/src/infrastructure/system/systemRegistry.ts
```

단, 이 단계에서는 기존 호출부를 대규모 변경하지 않는다.

---

## B8. Step 6 — App.jsx Direct Dependency Audit

Cursor는 App.jsx에서 다음 직접 의존을 조사한다.

```text
- domain direct import
- utils direct import
- data/systems direct import
- dataset direct function
- localStorage direct call
- fetch direct call
- 5_half_system string
- system-specific condition
```

결과를 다음 문서에 기록한다.

```text
docs/architecture/APP_DIRECT_DEPENDENCY_AUDIT.md
```

---

## B9. Step 7 — No Functional Migration Yet

Chapter 02의 구현은 **기반 정렬**이다.

대규모 함수 이동은 Chapter 03 이후에 수행한다.

이 단계에서 금지되는 작업:

```text
- 계산 결과 변경
- UI 변경
- Search profile 변경
- Dataset schema 변경
- System profile 변경
- App.jsx 대규모 축소
```

---

# Part C. Cursor Work Order

---

```text
[Cursor Mode: Ask]

Task:
Implement the planning/audit phase for Chapter02_Layer_Architecture.md.

Objective:
Do not refactor application behavior yet.
Create the layer architecture skeleton and produce audit documents that classify the current codebase according to the Architecture SSOT v2.0 Layer Architecture.

Reference Documents:
- Architecture_Constitution.md
- Chapter01_App_Authority.md
- Chapter02_Layer_Architecture.md
- PROJECT_MASTER_INDEX.md
- PROJECT_LOG_2026-06.md

Required Actions:

1. Inspect current project structure.
2. Identify existing Presentation, Application-like, Domain, System, Dataset, and Infrastructure responsibilities.
3. Create a layer classification report:
   docs/architecture/LAYER_CLASSIFICATION_REPORT.md

4. Audit App.jsx direct dependencies:
   docs/architecture/APP_DIRECT_DEPENDENCY_AUDIT.md

5. Propose folder skeleton for:
   frontend/src/application/
   frontend/src/infrastructure/
   frontend/src/domain/ subfolders if needed

6. Do not modify runtime behavior.
7. Do not move large functions yet.
8. Do not change UI.
9. Do not change calculation output.
10. Do not change dataset schema.
11. Do not change published dataset path.
12. Do not change system profile format.

Deliverables:
- LAYER_CLASSIFICATION_REPORT.md
- APP_DIRECT_DEPENDENCY_AUDIT.md
- Proposed folder skeleton list
- Risk assessment
- Recommended next Chapter implementation order

Important:
This is Ask mode.
Do not edit source code unless explicitly approved in the next Agent request.
```

---

## Optional Agent Work Order After Approval

```text
[Cursor Mode: Agent]

Task:
Create non-invasive folder skeletons for Chapter02 Layer Architecture.

Allowed Changes:
1. Create empty or index-only folders/files:
   - frontend/src/application/
   - frontend/src/infrastructure/
   - frontend/src/infrastructure/storage/
   - frontend/src/infrastructure/network/
   - frontend/src/infrastructure/system/

2. Add README.md files explaining each layer responsibility.

3. Add docs/architecture/LAYER_CLASSIFICATION_REPORT.md
4. Add docs/architecture/APP_DIRECT_DEPENDENCY_AUDIT.md

Forbidden:
- No behavior changes
- No import rewrites
- No App.jsx modification
- No system profile modification
- No dataset modification
- No UI/CSS changes
- No calculation changes

Commit Message:
docs: add layer architecture audit and skeleton
```

---

# Part D. Regression Checklist

---

## D1. Build Regression

```text
□ npm install not required unless package changed
□ npm run build passes
□ No TypeScript/JSX import errors
□ No Vite path resolution errors
```

---

## D2. Runtime Regression

```text
□ App starts normally
□ ADMIN mode opens
□ USER mode opens
□ Stage renders
□ Existing overlays still open
□ No blank screen
□ No console fatal error
```

---

## D3. Functional Regression

```text
□ USER Search behavior unchanged
□ ADMIN Search behavior unchanged
□ ADMIN LocalDB behavior unchanged
□ Dataset loading behavior unchanged
□ Published dataset URL unchanged
□ Trajectory display unchanged
□ System labels unchanged
□ AI panel unchanged
□ HP/T panel unchanged
□ History panel unchanged
```

---

## D4. Architecture Regression

```text
□ No new system-specific logic added to App.jsx
□ No new calculation logic added to App.jsx
□ No new dataset merge logic added to App.jsx
□ No new direct localStorage usage added to Domain
□ No React import added to Domain
□ No UI component imported into Domain
□ No dataset path hardcoding added outside Dataset/Infrastructure layer
```

---

## D5. Documentation Regression

```text
□ LAYER_CLASSIFICATION_REPORT.md exists
□ APP_DIRECT_DEPENDENCY_AUDIT.md exists
□ Any created folder has README or index note
□ No undocumented architecture decision introduced
```

---

# Revision History

| Version | Date | Description |
|---|---|---|
| v2.0 | 2026-06 | Initial Chapter 02 Layer Architecture Specification |

---

# End of Chapter 02
