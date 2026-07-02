# Chapter05_App_jsx_Dissecton.md

# 3Cushion AI Application Architecture SSOT v2.0

# Part II. Migration Reality
# Chapter 05. App.jsx Dissection

Version: v2.0  
Status: Draft SSOT  
Owner: 3Cushion AI Architecture  
Scope: `frontend/src/App.jsx` responsibility dissection, migration inventory, system-specific residue classification  
Depends on:
- Architecture_Constitution.md
- Chapter01_App_Authority.md
- Chapter02_Layer_Architecture.md
- Chapter03_Dependency_Rule.md
- Chapter04_Application_Runtime_Model_Specification.md

Source:
- `frontend/src/App.jsx`

Observed App.jsx Lines: 9079

---

# 0. Chapter Purpose

본 문서는 `App.jsx`를 Runtime Architecture로 이전하기 위한 **현실 기반 해부 문서**이다.

Chapter01~04가 Architecture 원칙과 Runtime 모델을 정의했다면, Chapter05는 현재 `App.jsx`가 실제로 어떤 책임을 가지고 있는지 분석하고, 각 책임을 어느 Layer와 Module로 이동해야 하는지 정의한다.

본 Chapter의 목적은 파일을 단순히 쪼개는 것이 아니다.

본 Chapter의 목적은 다음이다.

> **App.jsx 내부에 혼재된 책임을 식별하고, 각 책임의 공식 귀속지를 결정한다.**

---

# 1. Executive Summary

현재 `App.jsx`는 약 9,079 lines 규모의 대형 파일이다.

이는 단순히 큰 React 컴포넌트가 아니라 다음 책임이 하나의 파일 안에 결합된 상태이다.

```text
App.jsx
├─ Presentation
├─ USER Mode
├─ ADMIN Mode
├─ Overlay
├─ Search / Recall
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

그러나 실제 분석 결과, `App.jsx` 전체가 특정 시스템에 강하게 종속된 것은 아니다.

현재 구조는 다음과 같이 평가한다.

```text
약 85~90% : 공통 Application 구조
약 10~15% : 5_half_system 중심의 system-specific residue
```

따라서 향후 작업의 핵심은 `App.jsx`를 새로 작성하는 것이 아니라, 남아 있는 책임을 올바른 Layer로 귀속시키는 것이다.

---

# 2. Quantitative Assessment

| Signal | Count |
|---|---:|
| Total lines | 9,079 |
| import statements | 50 |
| `5_half_system` | 30 |
| `5_HALF` | 11 |
| `useSn` | 18 |
| `needsC3r` | 2 |
| `SYS_SYSTEM_CONFIG` | 3 |
| `mergeBaselineDraftInputDeltaForCommit` | 8 |
| `/samples/5_half_system` | 1 |
| `C4_f` | 22 |
| `C5_f` | 3 |
| `C6_f` | 3 |
| `localStorage` | 12 |
| `positions_dataset` | 7 |
| Search/search | 145 |
| Recall/recall | 111 |
| Trajectory/trajectory | 100 |
| Overlay/overlay | 166 |
| History/history | 24 |
| Dataset/dataset | 104 |

---

# 3. Import Dependency Dissection

현재 `App.jsx`는 Presentation 파일이지만 여러 Layer를 직접 참조한다.

이는 Migration의 주요 대상이다.


## 3.1. Presentation / Components

- `./components/user/UserAiPanel`
- `./components/table/SystemValueLabels`
- `./components/WorkspaceHistoryModal`
- `./components/common/ModalShell`
- `./components/user/UserAiPanel.jsx`
- `./components/user/UserHptPanel.jsx`
- `./components/common/UserToast.jsx`
- `./components/table/ImpactLines`
- `./components/table/SystemGrid`
- `./components/table/CoachingOverlay`
- `./components/user/UserTrajectoryInfoCard`

## 3.2. Hooks

- `./hooks/useShotSlots`
- `./hooks/useTrajectoryState`
- `./hooks/useCoachingController`
- `./hooks/useSystemController`
- `./hooks/useDisplayController`
- `./hooks/useUserToast`

## 3.3. Domain

- `./domain/angleSpinCorrectionTarget`
- `./domain/englishCorrectionSign`
- `./domain/userHptViewModel`
- `./domain/railEngine`
- `./domain/userTrajectoryCardViewModel`
- `./domain/adminSaveEngine`
- `./domain/canonicalPersistAudit`
- `./domain/evaluateStrategy`
- `./domain/strategySignature`
- `./domain/systemEngine`
- `./domain/anchorLookupEngine`
- `./domain/buildBaselineDraftApplyDelta`
- `./domain/search/positionKDIndex`
- `./domain/recall/recallEngine`
- `./domain/publishedDatasetStore`
- `./domain/publishedLeafResolve`
- `./domain/search/signatureKey`
- `./domain/positionSearchEngine`
- `./domain/fileService`

## 3.4. Utils

- `./utils/systemCalculator`
- `./utils/tipClockConverter`
- `./utils/cushionDisplayLabel`
- `./utils/trajectory/curveTrajectory`
- `./utils/physics`

## 3.5. Data / System

- `./data/systems`
- `./data/system/calculator`
- `./config/tableConfig`
- `./data/autoCaptureEngine`
- `./data/systems/anchorsRegistry`

## 3.6. Admin

- `./admin/hpt/useHptController`

## 3.7. External

- `react`
- `@dnd-kit/utilities`

---

# 4. Responsibility Inventory

`App.jsx` 내부 책임은 다음과 같이 분류한다.

| Responsibility | Current Location | Target Layer | Target Module |
|---|---|---|---|
| Application Boot | App.jsx | Presentation | App.jsx |
| Global State Coordination | App.jsx | Presentation / Application | App.jsx + Runtime Context |
| Event Dispatch | App.jsx handlers | Application Runtime | Dispatcher |
| USER Search | App.jsx | Application + Domain | UserSearchFlow + Search Domain |
| ADMIN Search | App.jsx | Application + Domain | AdminSearchFlow + Search Domain |
| Position Recall | App.jsx | Application + Domain | RecallFlow + Recall Domain |
| Trajectory Apply | App.jsx | Application + Domain | TrajectoryFlow + Trajectory Domain |
| Overlay Routing | App.jsx | Application | OverlayFlow + OverlayCoordinator |
| Slot Management | App.jsx | Application | SlotFlow |
| Dataset Load / Save | App.jsx | Dataset / Infrastructure | Dataset Domain + Storage Adapter |
| Published Dataset Access | App.jsx/domain direct | Dataset / Infrastructure | PublishedDatasetClient |
| History Merge | App.jsx | Domain | History Domain |
| Baseline Merge | App.jsx | Domain | Baseline Domain |
| Caption Preparation | App.jsx | Domain | Caption Domain |
| AI / Lesson ViewModel | App.jsx | Domain | AI / Lesson Domain |
| System-specific UI Config | App.jsx | System | profile.json / system_meta.json |
| System-specific Logic | App.jsx | System / Domain | logic.json + Domain Calculation |

---

# 5. Positive Findings

## 5.1 Profile 기반 구조가 이미 존재한다

현재 `App.jsx`는 이미 다음 구조를 상당 부분 사용한다.

```ts
const profile = SYSTEM_PROFILES[systemId];
```

그리고 계산과 표시에도 다음 개념이 사용된다.

```ts
profile.formula.expr
```

이는 향후 System Layer와 Calculation Domain으로 이전하기 매우 좋은 기반이다.

## 5.2 완전 재작성 대상이 아니다

현재 `App.jsx`는 무질서하게 실패한 파일이 아니다.

기능이 증가하면서 여러 책임이 한곳에 모인 상태이다.

따라서 목표는 재작성(rewrite)이 아니라 책임 재귀속(reassignment)이다.

## 5.3 System Agnostic 구조가 상당 부분 존재한다

`systemId` 기반으로 profile을 조회하는 구조가 이미 있으므로, 남은 작업은 `5_half_system` 잔여 의존을 System SSOT로 이전하는 것이다.

---

# 6. System-specific Residue Inventory

아래 항목은 `App.jsx`에서 제거되어야 하는 system-specific residue이다.

| Current Signal | Meaning | Target |
|---|---|---|
| `5_half_system` | 특정 시스템 직접 참조 | System Loader / Alias Resolver |
| `5_HALF` | legacy alias | system_meta.json aliases |
| `SYS_SYSTEM_CONFIG` | 시스템별 UI/overlay 설정 | profile.json / system_meta.json |
| `useSn` | Sn 사용 여부 | logic.json |
| `needsC3r` | C3_r 필요 여부 | Formula Analyzer / Domain Calculation |
| `C4_f`, `C5_f`, `C6_f` | 5½ sync residue | logic.json sync rule |
| `mergeBaselineDraftInputDeltaForCommit` | 5½ baseline merge | domain/baseline |
| `/samples/5_half_system` | sample path 고정 | system_meta.json samplePath |
| display branch | 시스템별 표시 정책 | profile.json display rule |

## 6.1 Rule

System-specific rule은 `App.jsx`에 존재해서는 안 된다.

System-specific rule은 다음 중 하나로 이동한다.

```text
profile.json
logic.json
anchors.json
system_meta.json
domain/calculation
domain/baseline
domain/system
```

---

# 7. Major Functional Blocks

분석 기준으로 확인되는 주요 기능 블록은 다음과 같다.


## 7.1 Candidate Function / Constant Names

- `ingestBaselineP043Debug`
- `postRecallTraceLog`
- `traceSlotPresence`
- `slot`
- `traceSearchRuntimeSnapshot`
- `emitAdminRecallTrace`
- `buildAdminRecallTraceSnapshot`
- `mergeSysOverlayPayloadToNumericInputs`
- `fromSystemValues`
- `buildSlotSysSnapshotFromStrategyEntry`
- `systemId`
- `shotTypeForSysOverlayFromSignature`
- `slotMeta`
- `slotPayload`
- `userSearchNoMatchAlertMessage`
- `adminSysFromRecallStrategyEntry`
- `SYS_SYSTEM_CONFIG`
- `canonicalSystemIdForConfig`
- `getSysSystemMode`
- `isFiveHalfSystemId`
- `sysOverlayInputFinite`
- `fmtSysOverlayInputDisplay`
- `buildSysOverlayInitialInputs`
- `saved`
- `buildSysOverlayNumericPayload`
- `buildSlotEffectiveRenderSysValues`
- `systemMode`
- `SysOverlay`
- `SYSTEM_OPTIONS`
- `useSnForSystem`
- `handleSave`
- `systemValuesBase`
- `saveData`
- `AnchorEditOverlay`
- `HptOverlay`
- `StrOverlay`
- `AiOverlay`
- `trajectory`
- `debugSlotSysSnapshotPrevRef`
- `lastSlotNavButtonRef`
- `adminRecallTraceCtxRef`
- `userSearchInFlightRef`
- `applySlotRuntimeTargetBall`
- `syncSlotRuntimeAdminAndTrajectory`
- `hydrateSlotRuntime`
- `slotExtracted`
- `resolvedSlotSys`
- `slotRenderSys`
- `slotId`
- `resolvedSlotSysValues`
- `slotRenderSysNoCorrections`
- `resolvedSlotBaseSysValues`
- `mergeSlotSysValues`
- `EMPTY_BASELINE_DRAFT`
- `baselineCoHandleRgRef`
- `baselineC1HandleRgRef`
- `baselineLabelSlotSnapshotRef`
- `baselineLabelSsotRef`
- `clearAppliedBaselineDraftMark`
- `autoSave`
- `getAdminSearchTargetBall`
- `getAdminRecallQueryTargetBall`
- `isAdminRecallTargetBallMismatch`
- `rejectAdminRecallHydrateForMismatch`
- `resetUserSearchTargetSelection`
- `logAdminSearchTargetState`
- `canUseSystemControls`
- `saveOnePointLibrary`
- `saveDraftAsNewLesson`
- `handleImportDataset`
- `importedDataset`
- `openOverlay`
- `mergeBaselineDraftInputDeltaForCommit`
- `coSlot`
- `c1Slot`
- `onBaselineDraftApplyClick`
- `handleBaselineDraftDoubleClick`
- `activeSlot`
- `slotSys`
- `slotMerged`

## 7.2 Functional Block Categories

| Block | Description | Target |
|---|---|---|
| Search Block | USER/ADMIN 검색 흐름 | Application Flow + Search Domain |
| Recall Block | Position Recall 및 matching | RecallFlow + Recall Domain |
| Trajectory Block | 궤적 생성 및 적용 | TrajectoryFlow + Trajectory Domain |
| Overlay Block | Overlay open/close/data routing | OverlayFlow + OverlayCoordinator |
| Dataset Block | dataset load/export/import | Dataset Domain + Infrastructure |
| History Block | workspace history | History Domain + Storage Adapter |
| Slot Block | shot slot 상태 | SlotFlow + Runtime Session |
| Baseline Block | baseline merge/correction | Baseline Domain |
| Caption Block | label/caption/system mark | Caption Domain |
| System Block | profile/logic/meta/anchors | System Loader |
| Sample Block | sample path/load | System Meta + Loader |

---

# 8. App.jsx Allowed vs Prohibited Responsibilities

## 8.1 Allowed

`App.jsx`는 다음 책임만 유지한다.

```text
- Application Boot
- Context Provider 연결
- 현재 mode/system/slot 선택 상태 전달
- Runtime dispatch 연결
- 화면 조립
- Render order coordination
```

## 8.2 Prohibited

`App.jsx`에서 제거해야 할 책임이다.

```text
- Formula calculation
- Correction calculation
- Search scoring
- Recall matching
- Trajectory geometry
- Caption placement
- Dataset merge
- History merge
- Baseline merge
- System-specific branch
- localStorage direct access
- fetch direct access
```

---

# 9. Migration Target Directory Map

향후 Runtime Architecture 적용 시 권장 디렉터리는 다음과 같다.

```text
frontend/src/application/
├─ runtime/
├─ dispatcher/
├─ coordinator/
├─ flow/
│  ├─ userSearchFlow.ts
│  ├─ adminSearchFlow.ts
│  ├─ adminRecallFlow.ts
│  ├─ trajectoryFlow.ts
│  ├─ overlayFlow.ts
│  ├─ historyFlow.ts
│  ├─ saveFlow.ts
│  └─ slotFlow.ts
└─ loader/
   └─ systemLoader.ts

frontend/src/domain/
├─ calculation/
├─ trajectory/
├─ search/
├─ recall/
├─ dataset/
├─ caption/
├─ baseline/
├─ history/
├─ ai/
└─ lesson/

frontend/src/infrastructure/
├─ storage/
├─ network/
├─ file/
└─ system/
```

---

# 10. Migration Priority

## Phase 1. Inventory and Boundary Marking

목표:

```text
기능 변경 없이 App.jsx 내부 책임을 태그로 표시
```

산출물:

```text
docs/architecture/App_Authority_Inventory.md
```

## Phase 2. System-specific Residue Isolation

우선 제거 대상:

```text
5_half_system
5_HALF
useSn
needsC3r
SYS_SYSTEM_CONFIG
samples/5_half_system
mergeBaselineDraftInputDeltaForCommit
```

## Phase 3. Application Flow Facade

대상:

```text
userSearchFlow
adminSearchFlow
adminRecallFlow
overlayFlow
trajectoryFlow
historyFlow
slotFlow
saveFlow
```

이 단계에서는 기존 로직을 완전히 옮기지 않고 Facade로 감싼다.

## Phase 4. Domain Extraction

우선순위:

1. baseline
2. dataset transform
3. search / recall
4. trajectory
5. caption
6. AI / lesson

## Phase 5. Infrastructure Adapter

대상:

```text
localStorage
fetch
file save
published dataset client
system registry
```

## Phase 6. App.jsx Slimming

목표:

```text
Current : 약 9,000 lines
Target  : 800~1,500 lines
```

줄 수 자체가 목적이 아니라 책임 경계 회복이 목적이다.

---

# 11. Cursor Work Order Seed

Cursor가 복귀한 후 첫 작업은 반드시 Ask Mode로 시작한다.

```text
[Cursor Mode: Ask]

목표:
Chapter05_App_jsx_Dissecton.md와 Chapter04_Application_Runtime_Model_Specification.md를 기준으로 App.jsx의 책임 분해 계획을 수립한다.

작업:
1. frontend/src/App.jsx의 import graph를 분석한다.
2. 함수/상태/렌더 블록을 책임별로 분류한다.
3. system-specific residue를 모두 찾는다.
4. Search/Recall/Trajectory/Dataset/Overlay/History 관련 대형 handler를 식별한다.
5. 각 책임의 이동 대상 Layer를 제안한다.
6. 결과를 docs/architecture/App_Authority_Inventory.md에 작성한다.

금지:
- 코드 수정 금지
- import 변경 금지
- formatting 변경 금지
- 기능 변경 금지

출력:
- 영향 범위
- 권한 위반 목록
- 이동 대상 Layer
- 위험도
- 다음 Agent 작업 제안
```

---

# 12. Success Criteria

Chapter05의 성공 기준은 다음이다.

1. `App.jsx`의 현재 책임이 모두 분류된다.
2. system-specific residue가 명확히 식별된다.
3. 각 책임의 Target Layer가 결정된다.
4. Cursor가 바로 App Authority Inventory를 작성할 수 있다.
5. 이후 Chapter06 Refactoring Phase의 입력 자료가 된다.

---

# 13. Final Assessment

현재 `App.jsx`는 3Cushion AI의 성장 과정에서 자연스럽게 비대해진 중심 파일이다.

그러나 구조적 기반은 이미 존재한다.

특히 profile 기반 계산 구조는 Runtime Architecture로 이전하기 위한 가장 중요한 장점이다.

따라서 Chapter05의 결론은 다음이다.

```text
App.jsx는 실패한 구조가 아니라,
Runtime Architecture로 이전할 준비가 된 과도기 구조이다.
```

향후 작업은 이 파일을 작게 자르는 것이 아니라, 각 책임을 올바른 Layer로 귀속시키는 것이다.

---

# Revision History

## v2.0

- Initial App.jsx Dissection
- Actual App.jsx quantitative signals reflected
- System-specific residue inventory defined
- Migration target map established
