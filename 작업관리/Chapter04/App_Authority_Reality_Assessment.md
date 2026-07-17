# App_Authority_Reality_Assessment.md

# 3Cushion AI Application Architecture SSOT v2.0

# Chapter04 Release Preparation

# App.jsx Reality Assessment

Version: v2.0\
Status: Release Preparation\
Owner: 3Cushion AI Architecture\
Source File: frontend/src/App.jsx\
Observed Lines: 9079

------------------------------------------------------------------------

# 1. Purpose

본 문서는 Chapter04 `Application Runtime Model Specification` Release
Edition을 작성하기 전에, 실제 `App.jsx`의 현재 상태를 기준으로
Architecture Migration 방향을 검증하기 위한 Reality Assessment 문서이다.

본 문서는 기존 13개 Specification을 대체하지 않는다.\
본 문서는 Chapter04 Release Edition에 반영될 현실 기반 분석 자료이다.

------------------------------------------------------------------------

# 2. First Conclusion

현재 `App.jsx`는 단순히 큰 React 파일이 아니다.

현재 `App.jsx`는 다음 책임이 하나의 파일에 결합된 상태이다.

``` text
App.jsx
├─ Presentation
├─ Application Flow
├─ Runtime-like Event Routing
├─ Search / Recall Control
├─ Trajectory Control
├─ Dataset / Published Dataset Access
├─ Local Storage Access
├─ Overlay Routing
├─ Slot Management
├─ Baseline Merge Logic
├─ System Overlay Logic
├─ Caption / Display Preparation
└─ System-specific Residue
```

그러나 중요한 점은, `App.jsx` 전체가 `5_half_system`에 강하게 묶여
있지는 않다는 것이다.

현재 구조는 다음과 같이 평가한다.

``` text
약 85~90% : 이미 공통화된 구조
약 10~15% : 아직 System-specific 잔여 코드
```

따라서 목표는 전체 구조 재작성보다, **남은 System-specific 책임과
Application/Domain 책임을 올바른 Layer로 귀속시키는 것**이다.

------------------------------------------------------------------------

# 3. Quantitative Findings

  Item                                        Count
  ----------------------------------------- -------
  Total lines                                  9079
  import statements                              50
  `5_half_system`                                30
  `5_HALF`                                       11
  `useSn`                                        18
  `needsC3r`                                      2
  `C4_f`                                         22
  `C5_f`                                          3
  `C6_f`                                          3
  `localStorage`                                 12
  `positions_dataset`                             7
  `SYS_SYSTEM_CONFIG`                             3
  `mergeBaselineDraftInputDeltaForCommit`         8
  `/samples/5_half_system`                        1
  Search/search                                 145
  Recall/recall                                 111
  Trajectory/trajectory                         100

------------------------------------------------------------------------

# 4. Direct Dependency Assessment

`App.jsx`는 현재 Presentation Layer 파일이지만, 실제로는 여러 하위
Layer를 직접 참조한다.

## 4.1 Import Group Summary

### Presentation / Components

-   `./components/user/UserAiPanel`
-   `./components/table/SystemValueLabels`
-   `./components/WorkspaceHistoryModal`
-   `./components/common/ModalShell`
-   `./components/user/UserAiPanel.jsx`
-   `./components/user/UserHptPanel.jsx`
-   `./components/common/UserToast.jsx`
-   `./components/table/ImpactLines`
-   `./components/table/SystemGrid`
-   `./components/table/CoachingOverlay`
-   `./components/user/UserTrajectoryInfoCard`

### Hooks

-   `./hooks/useShotSlots`
-   `./hooks/useTrajectoryState`
-   `./hooks/useCoachingController`
-   `./hooks/useSystemController`
-   `./hooks/useDisplayController`
-   `./hooks/useUserToast`

### Domain

-   `./domain/angleSpinCorrectionTarget`
-   `./domain/englishCorrectionSign`
-   `./domain/userHptViewModel`
-   `./domain/railEngine`
-   `./domain/userTrajectoryCardViewModel`
-   `./domain/adminSaveEngine`
-   `./domain/canonicalPersistAudit`
-   `./domain/evaluateStrategy`
-   `./domain/strategySignature`
-   `./domain/systemEngine`
-   `./domain/anchorLookupEngine`
-   `./domain/buildBaselineDraftApplyDelta`
-   `./domain/search/positionKDIndex`
-   `./domain/recall/recallEngine`
-   `./domain/publishedDatasetStore`
-   `./domain/publishedLeafResolve`
-   `./domain/search/signatureKey`
-   `./domain/positionSearchEngine`
-   `./domain/fileService`

### Utils

-   `./utils/systemCalculator`
-   `./utils/tipClockConverter`
-   `./utils/cushionDisplayLabel`
-   `./utils/trajectory/curveTrajectory`
-   `./utils/physics`

### Data / System

-   `./data/systems`
-   `./data/system/calculator`
-   `./config/tableConfig`
-   `./data/autoCaptureEngine`
-   `./data/systems/anchorsRegistry`

### Admin

-   `./admin/hpt/useHptController`

### External

-   `react`
-   `@dnd-kit/utilities`

------------------------------------------------------------------------

# 5. Positive Findings

현재 `App.jsx`에는 이미 좋은 구조가 다수 존재한다.

## 5.1 Profile 기반 계산 구조

`SYSTEM_PROFILES[systemId]`와 `profile.formula.expr` 기반 구조가 이미
사용되고 있다.

이는 향후 System Layer와 Domain Calculation으로 이전하기 좋은 기반이다.

## 5.2 Formula 직접 하드코딩 비중이 낮음

`App.jsx`가 대부분의 계산식을 직접 하드코딩하고 있지 않다는 점은 매우
중요하다.

이는 Architecture v2.0의 목표인

``` text
App.jsx → Application Runtime → Domain Calculation → System Profile
```

구조로 전환하기에 유리한 상태이다.

## 5.3 리팩터링 방향은 재작성보다 귀속 정리

현재 필요한 작업은 앱을 새로 만드는 것이 아니다.

필요한 작업은 다음이다.

``` text
현재 App.jsx 내부 책임
        ↓
Application / Domain / System / Dataset / Infrastructure
각 책임 Layer로 이전
```

------------------------------------------------------------------------

# 6. System-specific Residue

아래 항목은 `App.jsx`에서 제거되어야 하는 System-specific 잔여 책임이다.

  -----------------------------------------------------------------------------------------
  Current Responsibility  Current Signal                            Target Location
  ----------------------- ----------------------------------------- -----------------------
  기본 시스템 ID          `5_HALF → 5_half_system`                  System Loader / System
  normalization                                                     Alias Resolver

  System Overlay 설정     `SYS_SYSTEM_CONFIG`                       `profile.json` /
                                                                    `system_meta.json`

  Sn 사용 여부            `useSn`                                   `logic.json`

  C3_r 필요 여부          `needsC3r`                                Formula Analyzer /
                                                                    Domain Calculation

  C4/C5/C6 동기화         `C4_f`, `C5_f`, `C6_f`                    `logic.json` sync rule

  5½ baseline merge       `mergeBaselineDraftInputDeltaForCommit`   `domain/baseline`

  Sample path             `/samples/5_half_system`                  `system_meta.json`

  Display rule            System-specific render branches           `profile.json` display
                                                                    section
  -----------------------------------------------------------------------------------------

------------------------------------------------------------------------

# 7. Responsibility Reassignment

## 7.1 App.jsx Target Responsibility

`App.jsx`는 다음만 수행한다.

``` text
- Application Boot
- Global State Coordination
- Event Dispatch
- Screen Composition
- Render Coordination
- Context Provider
```

## 7.2 Application Runtime Responsibility

``` text
- Dispatcher
- Coordinator
- Flow
- Loader
- Runtime Context
- Runtime Lifecycle
```

## 7.3 Domain Responsibility

``` text
- Calculation
- Search
- Recall
- Trajectory
- Caption
- Baseline
- Dataset Transform
- History Normalization
- AI / Lesson ViewModel
```

## 7.4 System Responsibility

``` text
profile.json      : 무엇을 계산하고 표시할 것인가
logic.json        : 어떻게 계산하고 보정할 것인가
anchors.json      : 좌표와 기준점
system_meta.json  : alias, dataset path, sample path, lesson metadata
```

## 7.5 Infrastructure Responsibility

``` text
- localStorage
- fetch
- file save
- static dataset delivery
```

------------------------------------------------------------------------

# 8. Migration Priority

## Phase 1. System-specific Residue 제거

대상

-   `5_half_system`
-   `5_HALF`
-   `useSn`
-   `needsC3r`
-   `SYS_SYSTEM_CONFIG`
-   `/samples/5_half_system`
-   `mergeBaselineDraftInputDeltaForCommit`

목표

``` text
새 시스템 추가를 위해 App.jsx를 수정하지 않는 상태
```

## Phase 2. Application Flow 분리

대상

-   Search
-   Recall
-   Overlay
-   Slot
-   History
-   Save

목표

``` text
App.jsx Event Handler → Application Flow 호출
```

## Phase 3. Domain 책임 분리

대상

-   Trajectory
-   Caption
-   Baseline
-   Dataset Transform
-   AI / Lesson ViewModel

목표

``` text
Presentation에서 Domain 직접 구현 제거
```

## Phase 4. Infrastructure Adapter 도입

대상

-   localStorage
-   fetch
-   fileService
-   published dataset loader

목표

``` text
Domain은 외부 환경을 직접 알지 않는다
```

## Phase 5. App.jsx Slimming

목표

``` text
Current : 약 9,000 lines
Target  : 약 800~1,500 lines
```

줄 수 자체가 목표는 아니다.\
진짜 목표는 책임 경계의 회복이다.

------------------------------------------------------------------------

# 9. Release Edition Reflection Rule

Chapter04 Release Edition에는 본 분석 결과를 다음 형태로 반영한다.

1.  Current App.jsx Reality Assessment
2.  System-specific Residue Table
3.  Runtime Migration Priority
4.  Application Flow Extraction Strategy
5.  System SSOT Reassignment Rule
6.  Cursor Work Order 강화
7.  Regression Checklist 강화

------------------------------------------------------------------------

# 10. Final Assessment

현재 `App.jsx`는 비대하지만, 무질서하게 실패한 구조는 아니다.

오히려 다음 기반이 이미 존재한다.

-   profile 기반 계산
-   systemId 기반 profile lookup
-   Domain import 후보
-   Search / Recall / Trajectory 기능 분리 가능성
-   System SSOT로 이전 가능한 잔여 system-specific 코드

따라서 Chapter04 Release Edition은 다음 방향으로 작성한다.

``` text
App.jsx를 새로 만드는 문서가 아니라,
App.jsx를 Orchestrator로 되돌리는 Runtime Migration SSOT
```

------------------------------------------------------------------------

# Revision History

## v2.0

-   Initial App.jsx Reality Assessment
-   Actual App.jsx line count and dependency signals reflected
-   Chapter04 Release Edition preparation completed
