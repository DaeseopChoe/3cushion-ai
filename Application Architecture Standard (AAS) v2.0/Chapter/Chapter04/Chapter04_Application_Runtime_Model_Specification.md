# Chapter04_Application_Runtime_Model_Specification.md

# 3Cushion AI Application Architecture SSOT v2.0

# Chapter 04

# Application Runtime Model Specification

Version: v2.0\
Status: Release Edition\
Owner: 3Cushion AI Architecture\
Scope: Application Runtime, App.jsx Orchestrator Model, Runtime
Migration, Flow/Coordinator/Dispatcher/Loader Contracts\
Source Specifications:

-   Chapter04/README.md
-   Chapter04/01_Runtime_Philosophy.md
-   Chapter04/02_Runtime_Object_Model.md
-   Chapter04/03_Runtime_Lifecycle.md
-   Chapter04/04_Flow_Specification.md
-   Chapter04/05_Coordinator_Specification.md
-   Chapter04/06_Dispatcher_Specification.md
-   Chapter04/07_Loader_Specification.md
-   Chapter04/08_Interface_Contract.md
-   Chapter04/09_Extension_Rule.md
-   Chapter04/10_Execution_Plan.md
-   Chapter04/11_Cursor_Work_Order.md
-   Chapter04/12_Regression_Checklist.md
-   Chapter04/13_Architect_Review.md

Reference Documents:

-   Architecture_Constitution.md
-   Chapter01_App_Authority.md
-   Chapter02_Layer_Architecture.md
-   Chapter03_Dependency_Rule.md
-   App_Authority_Reality_Assessment.md

------------------------------------------------------------------------

# 0. Release Note

본 문서는 Chapter04 폴더의 13개 Specification을 교차 검토하고, 중복
제거, 용어 통일, 번호 체계 정리, 실제 `App.jsx` Reality Assessment를
반영하여 작성한 공식 Release Edition이다.

본 문서는 단순 병합 문서가 아니다.

본 문서는 3Cushion AI의 현재 `App.jsx`를 Application Orchestrator로
축소하고, Application Runtime을 도입하기 위한 공식 SSOT이다.

------------------------------------------------------------------------

# 1. Purpose

Chapter04의 목적은 다음 질문에 대한 공식 답변을 제공하는 것이다.

> 3Cushion AI Application은 Runtime에서 어떻게 실행되는가?

Chapter01은 `App.jsx`의 권한을 정의하였다.\
Chapter02는 Layer Architecture를 정의하였다.\
Chapter03은 Dependency Rule을 정의하였다.

Chapter04는 위 원칙을 실제 Runtime 실행 모델로 구체화한다.

본 문서는 다음을 정의한다.

-   Application Runtime의 철학
-   Runtime Object Model
-   Runtime Lifecycle
-   Flow / Coordinator / Dispatcher / Loader의 책임
-   Interface Contract
-   Extension Rule
-   Execution Plan
-   Cursor Work Order
-   Regression Checklist
-   실제 `App.jsx` 기반 Migration 기준

------------------------------------------------------------------------

# 2. Current App.jsx Reality Assessment

## 2.1 Current State

현재 `App.jsx`는 약 9,000 lines 규모의 거대한 파일이다.

이는 단순히 "큰 React 컴포넌트"가 아니라, 여러 Layer의 책임이 하나의
파일 안에 결합된 상태이다.

현재 `App.jsx`는 대략 다음 책임을 포함한다.

``` text
App.jsx
├─ Presentation
├─ USER Mode
├─ ADMIN Mode
├─ Overlay
├─ Search
├─ Recall
├─ SYS Calculation Trigger
├─ Trajectory
├─ Strategy
├─ Slot Management
├─ Dataset
├─ History
├─ Caption
├─ Baseline
├─ Position Recall
└─ Sample Loader
```

## 2.2 First Assessment

중요한 점은, 현재 `App.jsx`가 완전히 특정 시스템에 종속된 구조는
아니라는 점이다.

실제 구조는 다음에 가깝다.

``` text
약 85~90% : 공통 Application 구조
약 10~15% : 5_half_system 중심의 system-specific residue
```

따라서 목표는 전체 애플리케이션을 새로 작성하는 것이 아니다.

목표는 다음이다.

``` text
현재 App.jsx 내부 책임
        ↓
Application / Domain / System / Dataset / Infrastructure
해당 Layer로 귀속
```

## 2.3 Positive Findings

현재 `App.jsx`에는 이미 Architecture v2.0으로 이전하기 좋은 기반이
존재한다.

대표적으로:

``` ts
const profile = SYSTEM_PROFILES[systemId];
```

그리고

``` ts
profile.formula.expr
```

기반 계산 구조가 이미 존재한다.

이는 계산 구조가 이미 `profile` 중심으로 상당 부분 일반화되어 있음을
의미한다.

즉, 현재 작업은 구조를 완전히 새로 만드는 것이 아니라, 남아 있는 직접
책임과 system-specific residue를 올바른 위치로 이동하는 작업이다.

------------------------------------------------------------------------

# 3. Core Runtime Principle

Application Runtime의 핵심 원칙은 다음 한 문장으로 정의한다.

> App.jsx는 Orchestrator만 수행하고, 나머지 모든 책임은 해당 Layer와
> Runtime Object로 귀속시킨다.

## 3.1 What / Flow / How Separation

``` text
User Action
    │
    ▼
App.jsx
(What)
    │
    ▼
Application Runtime
(Flow)
    │
    ▼
Domain
(How)
```

-   App.jsx는 무엇을 실행할지 결정한다.
-   Runtime은 어떤 Flow로 실행할지 결정한다.
-   Domain은 실제 계산과 비즈니스 규칙을 수행한다.

## 3.2 Runtime is Not a Layer

Application Runtime은 Layer 자체가 아니다.

Runtime은 Application Layer를 실행하는 실행 환경이다.

``` text
Presentation Layer
        │
        ▼
Application Runtime
        │
        ▼
Application Layer
        │
        ▼
Domain Layer
        │
        ▼
System Layer
        │
        ▼
Dataset Layer
        │
        ▼
Infrastructure Layer
```

Runtime은 각 Layer를 연결하지만, 어느 Layer의 책임도 침범하지 않는다.

------------------------------------------------------------------------

# 4. Target App.jsx Model

## 4.1 Current Model

현재 모델은 다음과 같다.

``` text
App.jsx
├─ UI
├─ State
├─ Search Logic
├─ Recall Logic
├─ Dataset Logic
├─ Trajectory Control
├─ Overlay Logic
├─ History Logic
├─ Storage Access
├─ System-specific Branch
└─ Rendering
```

## 4.2 Target Model

목표 모델은 다음과 같다.

``` text
App.jsx
├─ Application Boot
├─ Global State Coordination
├─ Event Dispatch
├─ Screen Composition
├─ Render Coordination
└─ Context Provider
```

## 4.3 Target Shape

최종적으로 `App.jsx`는 다음 형태에 가까워야 한다.

``` tsx
function App() {
  const runtime = useApplicationRuntime();

  return (
    <ApplicationProvider runtime={runtime}>
      <MainLayout
        onSearch={(payload) =>
          runtime.dispatch({ type: "USER_SEARCH_REQUESTED", payload })
        }
        onRecall={(payload) =>
          runtime.dispatch({ type: "ADMIN_RECALL_REQUESTED", payload })
        }
        onSystemChange={(payload) =>
          runtime.dispatch({ type: "SYSTEM_CHANGED", payload })
        }
      />
    </ApplicationProvider>
  );
}
```

이 예시는 구현 코드가 아니라 목표 구조를 설명하기 위한 Reference
Shape이다.

------------------------------------------------------------------------

# 5. Runtime Object Model

Application Runtime은 다음 객체로 구성된다.

``` text
ApplicationRuntime
 ├─ ApplicationContext
 ├─ ApplicationSession
 ├─ ApplicationDispatcher
 ├─ ApplicationCoordinator
 ├─ ApplicationFlow
 ├─ ApplicationLoader
 ├─ ApplicationCommand
 ├─ ApplicationResult
 ├─ ApplicationState
 └─ ApplicationError
```

## 5.1 ApplicationRuntime

ApplicationRuntime은 Runtime 전체를 관리하는 최상위 실행 환경이다.

책임:

-   Runtime Boot
-   Lifecycle 관리
-   Dispatcher 연결
-   Coordinator 생성
-   Flow 실행 요청
-   Result 반환

금지:

-   Domain 계산
-   System-specific rule 구현
-   React Rendering

## 5.2 ApplicationContext

ApplicationContext는 현재 실행에 필요한 공통 Context를 제공한다.

포함:

-   mode
-   systemId
-   shotType
-   selectedSlotId
-   session
-   runtimeState

## 5.3 ApplicationSession

ApplicationSession은 사용자 Session 및 Runtime Session을 관리한다.

책임:

-   현재 선택 상태 유지
-   Slot 상태 유지
-   Session 동기화
-   Flow 간 공유 상태 관리

## 5.4 ApplicationDispatcher

Dispatcher는 Runtime Command의 공식 진입점이다.

책임:

-   Command 수신
-   Command 검증
-   Flow 또는 Coordinator 선택
-   Runtime Context 전달

Dispatcher는 Domain을 직접 호출하지 않는다.

## 5.5 ApplicationCoordinator

Coordinator는 여러 Flow를 조합하여 하나의 업무 결과를 만든다.

예:

-   SearchCoordinator
-   RecallCoordinator
-   TrajectoryCoordinator
-   OverlayCoordinator
-   HistoryCoordinator
-   DatasetCoordinator

Coordinator는 계산하지 않는다.

## 5.6 ApplicationFlow

Flow는 하나의 Use Case를 실행한다.

예:

-   UserSearchFlow
-   AdminSearchFlow
-   AdminRecallFlow
-   OverlayFlow
-   TrajectoryFlow
-   HistoryFlow
-   SaveFlow
-   ResetFlow

Flow는 Domain을 호출하고 결과를 조합한다.

## 5.7 ApplicationLoader

Loader는 Runtime이 필요한 정의와 리소스를 준비한다.

예:

-   SystemLoader
-   DatasetLoader
-   ConfigurationLoader
-   RuntimeLoader

Loader는 계산하지 않는다.

------------------------------------------------------------------------

# 6. Runtime Lifecycle

Application Runtime은 상태 기반으로 동작한다.

``` text
BOOT
  │
  ▼
SYSTEM_READY
  │
  ▼
SESSION_READY
  │
  ▼
IDLE
  │
  ▼
COMMAND_RECEIVED
  │
  ▼
FLOW_RUNNING
  │
  ▼
DOMAIN_EXECUTING
  │
  ▼
RESULT_READY
  │
  ▼
RENDER_SYNC
  │
  ▼
IDLE
```

## 6.1 Lifecycle Rules

1.  모든 Command는 IDLE 상태에서 시작한다.
2.  Flow 없이 Domain을 직접 호출하지 않는다.
3.  RESULT_READY 이전에는 Render Sync를 수행하지 않는다.
4.  ERROR는 반드시 Recovery 또는 Reset으로 종료한다.
5.  Runtime은 항상 IDLE로 복귀 가능해야 한다.

## 6.2 Error Lifecycle

``` text
FLOW_RUNNING
      │
      ▼
ERROR
      │
      ▼
RECOVERY
      │
      ├─────────────┐
      ▼             │
IDLE          RESET_REQUIRED
```

------------------------------------------------------------------------

# 7. Flow Specification

Flow는 하나의 사용자 요구 또는 업무 절차를 실행하는 Runtime 객체이다.

## 7.1 Standard Flow Structure

``` text
Command
   │
   ▼
Flow
   │
   ├── Validate
   ├── Load Context
   ├── Invoke Domain
   ├── Assemble Result
   └── Return Result
```

## 7.2 Standard Contract

Input:

-   ApplicationCommand
-   ApplicationContext

Output:

-   ApplicationResult

## 7.3 Flow Responsibilities

Flow는 다음을 수행할 수 있다.

-   Domain 호출
-   Context 확인
-   Loader 요청
-   Coordinator 호출
-   Runtime Result 생성

Flow는 다음을 수행하면 안 된다.

-   React Rendering
-   System Formula 계산
-   Trajectory Geometry 계산
-   Dataset Storage 직접 접근
-   System-specific Rule 구현

------------------------------------------------------------------------

# 8. Coordinator Specification

Coordinator는 여러 Flow 또는 UseCase를 묶어 하나의 Application 결과를
만드는 Runtime 객체이다.

## 8.1 Standard Responsibilities

-   Flow 선택
-   Flow 실행 순서 제어
-   Runtime Context 공유
-   결과 통합
-   오류 전파
-   Recovery Flow 호출

## 8.2 Coordinator Rule

Coordinator는 Domain 계산을 직접 수행하지 않는다.

Coordinator는 systemId 기반 분기를 포함해서는 안 된다.

------------------------------------------------------------------------

# 9. Dispatcher Specification

Dispatcher는 Presentation에서 Runtime으로 들어오는 모든 Command의 공식
진입점이다.

## 9.1 Standard Command Examples

-   USER_SEARCH_REQUESTED
-   ADMIN_SEARCH_REQUESTED
-   ADMIN_RECALL_REQUESTED
-   SYSTEM_CHANGED
-   OVERLAY_OPEN_REQUESTED
-   SLOT_CHANGED
-   SAVE_REQUESTED
-   RESET_REQUESTED
-   HISTORY_LOAD_REQUESTED

## 9.2 Dispatcher Rule

Dispatcher는 Routing만 수행한다.

Dispatcher는 Domain 계산을 수행하지 않는다.

Dispatcher는 System-specific branch를 포함하지 않는다.

------------------------------------------------------------------------

# 10. Loader Specification

Loader는 Runtime이 필요한 정의와 리소스를 준비한다.

## 10.1 System Loader Contract

Input:

-   systemId

Output:

-   ResolvedSystemDefinition

ResolvedSystemDefinition은 다음을 포함한다.

-   profile
-   logic
-   anchors
-   systemMeta

App.jsx는 profile.json, logic.json, anchors.json, system_meta.json을
직접 읽지 않는다.

## 10.2 Loader Rule

Loader는 준비만 한다.

Loader는 계산하지 않는다.

Loader는 판단하지 않는다.

Loader는 실행하지 않는다.

------------------------------------------------------------------------

# 11. Interface Contract

Runtime 내부 객체는 표준 Interface Contract를 통해서만 상호작용한다.

## 11.1 ApplicationCommand

``` ts
type ApplicationCommand = {
  commandType: string;
  payload: unknown;
  timestamp?: number;
  requestId?: string;
};
```

## 11.2 ApplicationContext

``` ts
type ApplicationContext = {
  mode: "USER" | "ADMIN";
  systemId: string;
  shotType?: string;
  selectedSlotId?: string;
  session: ApplicationSession;
  runtimeState: ApplicationState;
};
```

## 11.3 ApplicationResult

``` ts
type ApplicationResult = {
  nextState?: Partial<ApplicationState>;
  viewModel?: unknown;
  renderRequest?: unknown;
  errors?: ApplicationError[];
};
```

## 11.4 ApplicationError

``` ts
type ApplicationError = {
  code: string;
  message: string;
  severity: "info" | "warning" | "error" | "fatal";
  recoverable: boolean;
};
```

## 11.5 ResolvedSystemDefinition

``` ts
type ResolvedSystemDefinition = {
  profile: unknown;
  logic: unknown;
  anchors: unknown;
  systemMeta: unknown;
};
```

------------------------------------------------------------------------

# 12. System-specific Residue Reassignment

현재 `App.jsx`에 남아 있는 system-specific residue는 다음 위치로
이전한다.

  -----------------------------------------------------------------------------------------
  Current Signal                            Current Meaning         Target Location
  ----------------------------------------- ----------------------- -----------------------
  `5_half_system`                           특정 시스템 직접 참조   System Loader / Alias
                                                                    Resolver

  `5_HALF`                                  legacy alias            system_meta.json

  `SYS_SYSTEM_CONFIG`                       시스템 UI/overlay 설정  profile.json /
                                                                    system_meta.json

  `useSn`                                   Sn 사용 여부            logic.json

  `needsC3r`                                C3_r 입력 필요 여부     Formula Analyzer /
                                                                    Domain

  `C4_f`, `C5_f`, `C6_f`                    system-specific sync    logic.json

  `mergeBaselineDraftInputDeltaForCommit`   5½ baseline merge       domain/baseline

  `/samples/5_half_system`                  sample path             system_meta.json

  display branch                            표시 정책               profile.json display
                                                                    rule
  -----------------------------------------------------------------------------------------

## 12.1 Reassignment Principle

System-specific rule은 App.jsx에 존재해서는 안 된다.

모든 System-specific rule은 다음 중 하나로 이동한다.

``` text
profile.json
logic.json
anchors.json
system_meta.json
domain/system
domain/calculation
domain/baseline
```

------------------------------------------------------------------------

# 13. Domain Reassignment

## 13.1 Calculation

Target:

``` text
frontend/src/domain/calculation/
```

Responsibilities:

-   formula.expr evaluation
-   system value calculation
-   correction application
-   sync rule application

## 13.2 Search / Recall

Target:

``` text
frontend/src/domain/search/
frontend/src/domain/recall/
```

Responsibilities:

-   matching
-   scoring
-   recall profile
-   permutation
-   fallback rule

## 13.3 Trajectory

Target:

``` text
frontend/src/domain/trajectory/
```

Responsibilities:

-   trajectory node generation
-   impact points
-   rail detection
-   reflection logic
-   cap policy
-   corrected/baseline path

## 13.4 Caption

Target:

``` text
frontend/src/domain/caption/
```

Responsibilities:

-   caption placement
-   label placement
-   axis bucket
-   display cap

## 13.5 Dataset

Target:

``` text
frontend/src/domain/dataset/
```

Responsibilities:

-   dataset normalization
-   merge
-   canonicalization
-   export envelope
-   diff

## 13.6 Baseline

Target:

``` text
frontend/src/domain/baseline/
```

Responsibilities:

-   baseline draft merge
-   baseline input delta
-   baseline correction rule

## 13.7 AI / Lesson

Target:

``` text
frontend/src/domain/ai/
frontend/src/domain/lesson/
```

Responsibilities:

-   AI comment view model
-   one point lesson view model
-   system lesson view model

------------------------------------------------------------------------

# 14. Application Runtime Migration Plan

## Phase 1. Runtime Scaffold

Create:

``` text
frontend/src/application/
frontend/src/application/runtime/
frontend/src/application/flow/
frontend/src/application/coordinator/
frontend/src/application/dispatcher/
frontend/src/application/loader/
```

No behavior change.

## Phase 2. App.jsx Responsibility Inventory

Create:

``` text
docs/architecture/App_Authority_Inventory.md
```

Classify all App.jsx functions:

``` text
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

## Phase 3. System-specific Residue Isolation

Find and classify:

``` text
5_half_system
5_HALF
useSn
needsC3r
C4_f
C5_f
C6_f
SYS_SYSTEM_CONFIG
samples/5_half_system
mergeBaselineDraftInputDeltaForCommit
```

## Phase 4. Application Flow Facade

Create wrapper-level flows first.

``` text
userSearchFlow.ts
adminSearchFlow.ts
adminRecallFlow.ts
overlayFlow.ts
trajectoryFlow.ts
historyFlow.ts
saveFlow.ts
slotFlow.ts
```

At this phase, do not move large logic.\
Wrap existing behavior.

## Phase 5. Domain Extraction

Move pure logic into Domain modules.

Priority:

1.  baseline
2.  dataset transform
3.  search / recall
4.  trajectory
5.  caption
6.  AI / lesson

## Phase 6. Infrastructure Adapter

Move external environment access.

``` text
localStorageAdapter.ts
publishedDatasetClient.ts
fileSaveAdapter.ts
systemRegistry.ts
```

## Phase 7. App.jsx Slimming

Target:

``` text
Current App.jsx : 약 9,000 lines
Target App.jsx  : 800~1,500 lines
```

Line count is not the primary objective.\
Responsibility separation is the objective.

------------------------------------------------------------------------

# 15. Cursor Work Order

## 15.1 Initial Ask Work Order

``` text
[Cursor Mode: Ask]

목표:
Chapter04_Application_Runtime_Model_Specification.md를 기준으로 현재 App.jsx의 Runtime Migration 영향 범위를 분석한다.

작업:
1. frontend/src/App.jsx 전체 import graph를 분석한다.
2. App.jsx의 함수/상태/렌더 블록을 책임별로 분류한다.
3. system-specific residue를 모두 찾는다.
4. localStorage/fetch/dataset 직접 접근을 찾는다.
5. Search/Recall/Trajectory/Dataset/Overlay/History 관련 대형 handler를 식별한다.
6. 결과를 docs/architecture/App_Authority_Inventory.md에 작성한다.

금지:
- 코드 수정 금지
- import 변경 금지
- formatting 변경 금지
- 기능 변경 금지

출력:
- 영향 범위
- 위반 목록
- 이동 대상 Layer
- 위험도
- 다음 Agent 작업 제안
```

## 15.2 Boundary Marking Agent Work Order

``` text
[Cursor Mode: Agent]

목표:
App.jsx 내부 책임 경계를 표시한다.
이번 단계에서는 기능을 이동하지 않는다.

작업:
1. 주요 함수 상단에 ARCH_V2 책임 태그를 추가한다.
2. system-specific residue에 ARCH_V2_SYSTEM_SPECIFIC 주석을 추가한다.
3. Domain 직접 호출에 ARCH_V2_DOMAIN_CALL 주석을 추가한다.
4. Dataset 직접 처리에 ARCH_V2_DATASET_LOGIC 주석을 추가한다.
5. Search/Recall 직접 처리에 ARCH_V2_SEARCH_RECALL_LOGIC 주석을 추가한다.
6. Trajectory 직접 처리에 ARCH_V2_TRAJECTORY_LOGIC 주석을 추가한다.

금지:
- 동작 변경 금지
- 함수 이동 금지
- 로직 수정 금지
- UI 변경 금지

검증:
- npm run build
- git diff에서 로직 변경이 없는지 확인
```

## 15.3 Runtime Scaffold Agent Work Order

``` text
[Cursor Mode: Agent]

목표:
Application Runtime scaffold를 생성한다.

작업:
1. frontend/src/application/runtime/ 생성
2. frontend/src/application/flow/ 생성
3. frontend/src/application/coordinator/ 생성
4. frontend/src/application/dispatcher/ 생성
5. frontend/src/application/loader/ 생성
6. 기본 interface/type 파일 생성
7. 기존 동작 변경 없음

금지:
- App.jsx 대규모 수정 금지
- Domain 로직 이동 금지
- Search threshold 변경 금지
- Dataset path 변경 금지

검증:
- npm run build
```

------------------------------------------------------------------------

# 16. Regression Checklist

Runtime Architecture 적용 후 다음 항목을 반드시 검증한다.

## 16.1 Build

-   npm run build 성공
-   console fatal error 없음
-   circular dependency 없음

## 16.2 USER

-   USER Search 정상
-   USER Trajectory 정상
-   USER Overlay 정상
-   USER Lesson 정상

## 16.3 ADMIN

-   ADMIN Search 정상
-   ADMIN Recall 정상
-   ADMIN Save 정상
-   ADMIN Local DB 정상

## 16.4 System

-   systemId 변경 정상
-   profile.json 로드 정상
-   logic.json 로드 정상
-   anchors.json 로드 정상
-   system_meta.json 로드 정상
-   5_half_system 기존 결과 동일

## 16.5 Dataset

-   Published Dataset Loader 정상
-   dataset URL 정상
-   localStorage 데이터 유지
-   export/import 영향 없음

## 16.6 Architecture

-   App.jsx는 Orchestrator 유지
-   App.jsx system-specific branch 감소
-   App.jsx direct domain import 감소
-   App.jsx direct dataset access 감소
-   Runtime 우회 없음

------------------------------------------------------------------------

# 17. Success Criteria

Chapter04 Runtime Architecture가 성공적으로 적용되면 다음이 가능해야
한다.

1.  새 시스템 추가 시 App.jsx 수정이 필요 없다.
2.  App.jsx는 Application Orchestrator 역할만 수행한다.
3.  Search/Recall/Trajectory/Dataset/Overlay/History는 각각 Flow 또는
    Domain으로 귀속된다.
4.  System-specific rule은 System SSOT 또는 Domain으로 귀속된다.
5.  Runtime은 Generic Framework를 유지한다.
6.  기존 기능의 결과가 유지된다.
7.  App.jsx는 약 800\~1,500 lines 수준까지 축소 가능하다.

------------------------------------------------------------------------

# 18. Final Architecture Decision

Application Runtime Architecture v2.0은 3Cushion AI의 공식 Runtime
Architecture SSOT로 승인한다.

본 문서는 다음을 공식 결정한다.

``` text
App.jsx = Orchestrator
Application Runtime = Flow Execution Environment
Application Layer = Business Flow
Domain Layer = Pure Logic
System Layer = System SSOT
Dataset Layer = Corpus / Data
Infrastructure Layer = External Environment
```

모든 Cursor 작업은 본 문서를 기준으로 수행한다.

------------------------------------------------------------------------

# 19. Revision History

## v2.0 Release Edition

-   13개 Chapter04 Specification 통합
-   중복 제거 및 용어 통일
-   Runtime Object Model 정리
-   실제 App.jsx Reality Assessment 반영
-   System-specific residue migration rule 추가
-   Cursor Work Order 강화
-   Regression Checklist 통합
