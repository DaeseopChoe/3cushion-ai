# PROJECT_LOG_2026-08

Version : v1.69
Period : 2026-08
Status : Active Project Log

---

# 2026-08-29 (Search Normalization, History-Corpus Separation, Regression Test Foundation & CI Automation)

## Mode

**Agent** · History Workspace / Searchable Corpus Separation · ADMIN Target NONE Contract · USER Search 2-Way Role Permutation & Winning Mapping Preservation · End-to-End Lifecycle Contract · Standard Regression Foundation (R01~R24) · Full Vitest Legacy Remediation · GitHub Actions Regression CI Workflow

---

### Milestone 1: History Workspace / Searchable Corpus Separation & ADMIN Target Selection Contract

#### Background & Problem
1. **History Load 후 검색 코퍼스 오염:** `handleLoadWorkspaceSnapshot` 실행 시 스냅샷에 포함된 데이터셋으로 `positions_dataset` 영속화 및 React `dataset` 상태를 덮어씀으로써, 과거 스냅샷을 불러오면 전체 검색 풀(Corpus)이 과거 시점의 축소된 데이터로 오염되는 문제가 발생함.
2. **ADMIN Target Ball 자동 지정 문제:** 앱 진입 또는 Reset 시 노란공이 Target으로 자동 지정되어, Target 미선택 상태에서의 자유 검색 및 더블클릭을 통한 명시적 재지정이 제한됨.

#### Root Cause
- `useSettings.js`의 `handleLoadWorkspaceSnapshot`에서 UI/편집 상태 복원과 전역 검색용 코퍼스 관리가 단일 스토리지 키(`positions_dataset`)와 상태(`dataset`)로 강결합되어 있었음.
- `App.jsx`의 초기화 이펙트 및 reset 핸들러가 slot 메타데이터에서 Target을 자동 유추하여 설정하고 있었음.

#### Final Resolution & Implementation
- **저장소 및 상태 분리:** `useSettings.js`의 `handleLoadWorkspaceSnapshot`에서 `persistPositionsDatasetWithGeneration` 및 `setDataset` 호출을 제거함. 스냅샷 데이터는 UI/슬롯 편집 컨텍스트 복원에만 사용되고, 전역 검색 코퍼스는 영구 보존됨.
- **ADMIN Target 초기화 & 명시적 재지정:** `App.jsx` 및 `adminEditSessionContract.ts`에서 초기 Target을 `null`(NONE)로 설정. Target 미지정 시에도 전체 코퍼스를 대상으로 검색하며, 공 더블클릭을 통해서만 명시적 Target 재지정이 가능하도록 전환.

#### Verification & Protection
- `frontend/src/application/flows/historySearchCorpusSeparation.contract.test.ts` (6 tests PASS)
- `frontend/src/application/flows/adminTargetBallRules.contract.test.ts` (9 tests PASS)
- `frontend/src/domain/system/adminEditSessionContract.test.ts` (13 tests PASS)

---

### Milestone 2: USER Search Normalization — Published Leaf Dynamic Resolution, 2-Way Role Permutation & Winning Mapping Preservation

#### Background & Problem
1. **Published Leaf 단일 Lock:** USER Search 진입 시 이전 History/Admin의 stale `shotType` 힌트에 갇혀 특정 leaf 파일만 검색하던 문제.
2. **물리 색상과 논리 역할 결합에 따른 매칭 실패:** ADMIN에서 `Red=Target / Yellow=Second`로 저장된 데이터를 USER Search(기본 `Yellow=Target / Red=Second`)에서 검색 시 역할 불일치로 탈락하는 현상.
3. **검색 성공 후 물리공 시각적 스왑 및 Trajectory 왜곡:** 승리한 역할 순열 정보가 UI로 전달되지 않아 `targetColor`만 "red"로 바뀌면서 화면 상의 빨간공과 노란공이 서로 뒤바뀌어 렌더링되고 궤적이 엉뚱한 공을 향해 조준됨.

#### Root Cause
- `userSearchFlow.ts`가 stale 힌트를 참조하여 단일 leaf만 resolve하고 있었음.
- USER 모드에서는 사용자가 Target을 직접 지정하지 않음에도 1가지 고정된 역할 매핑만 검사함.
- `runUserSearch`가 `record`만 반환하여 어떤 순열이 매칭되었는지(`matchedBalls`) UI에 전달하지 못함.

#### Final Resolution & Implementation
- **Stale Lock 해제 & 배포 자동화:** `userSearchFlow.ts`에서 `shotType: null`을 전달하여 모든 canonical leaf를 동적 탐색. `vite.config.js`의 `publishedDatasetStatic` 훅을 통해 `dataset/` 디렉터리가 `dist/dataset/`으로 자동 패키징되도록 보장하고 Export 후 캐시를 무효화함.
- **2-Way Role Permutation:** Target=NONE 상태에서 `candidateBallQueries`로 `[Yellow=Target, Red=Second]`와 `[Red=Target, Yellow=Second]`를 모두 생성하여 검색 평가.
- **Winning Role Mapping 보존:** `UserSearchResult = { record, matchedBalls }` 타입을 도입하여 승리한 `matchedBalls`를 UI `ballsState`와 완벽 동기화. 화면 상의 물리공 좌표 불변 및 Trajectory 엔진으로의 정확한 1적구 물리 좌표 전달 보장.

#### Verification & Protection
- `frontend/src/application/flows/publishedSearchLeafResolution.contract.test.ts` (13 tests PASS)
- `frontend/src/application/flows/userSearchRolePermutation.contract.test.ts` (11 tests PASS)
- `frontend/src/domain/ballRole.ssot.test.ts` (3 tests PASS)

---

### Milestone 3: Full Lifecycle End-to-End Integration Contract

#### Scope
Authored Save $\to$ `positions_dataset` $\to$ Derived Approval $\to$ Cartesian Product (`Track × Cue × C3+`) $\to$ Export $\to$ Published Leaf (`dist/dataset`) $\to$ USER Search $\to$ 2-way Role Permutation $\to$ Winning Mapping $\to$ UI State $\to$ Trajectory Target의 전 수명주기 무결성 검증.

#### Verification & Protection
- `frontend/src/application/flows/endToEndDataPipeline.contract.test.ts` (7 tests PASS)
  - T1: Authored Save 및 Ball3 역할 보존
  - T2: Derived Product 승인 및 searchable 코퍼스 반영
  - T3 & T4: Export 및 Published Leaf Envelope 검증
  - T5 & T6 & T7: USER Search Case A(Yellow Target) & Case B(Red Target) 역할 순열 매칭
  - T8 & T9: 화면 물리공 불변 및 Trajectory 1적구 라우팅 검증
  - T10 & T11: R24 Schema Regression Guard (PositionRecord 및 Published Payload fail-closed)

---

### Milestone 4: Standard Regression Foundation (R01~R24) & Full Vitest Remediation

#### Standard Regression Scripts
- `npm run test:fast`: 핵심 Flow 및 SSOT 초고속 검증 (16 files / 156 tests)
- `npm run test:contract`: End-to-End 수명주기 및 불변 계약 검증 (17 files / 182 tests)
- `npm test`: 전체 Vitest Suite (98 files / 964 tests)
- `npm run build`: Production Build & dataset packaging
- `npm run test:regression`: FAST $\to$ CONTRACT $\to$ FULL $\to$ BUILD 단일 명령 전체 검증

#### Legacy Full Vitest 6개 실패 100% 정규화 (Production 변경 0건)
- **F1~F5 (Test Runner 호환성):** `canonicalPersistAudit`, `canonicalStrategy`, `englishCorrectionSign`, `positionRecallEngine`, `strategyHydrate`의 레거시 단독 스크립트들을 기존 assertion/fixture 100% 보존하며 Vitest `describe()` / `it()` 블록으로 래핑.
- **F6 (Expectation Drift):** `systemAxisCaption.test.ts`의 폐기된 `alignC4SideCaptionsToCo` 기대값을 2026-06-20 확정된 OPEN-04 독립 기하 배치 SSOT(`c4.y = 162`, `co.y = 257`)로 동기화.
- **결과:** 98개 파일 / 964개 테스트 전수 **100% GREEN** 달성.

---

### Milestone 5: GitHub Actions Regression CI Workflow Implementation

#### Implementation (`.github/workflows/regression.yml`)
- **Triggers:** `push: [main]`, `pull_request: [main]`, `workflow_dispatch`
- **Environment:** `ubuntu-latest`, `Node.js 20` (LTS), `npm ci`, `cache: npm`
- **Security:** `permissions: contents: read` (최소 권한, Secret 요구 0건, 외부 네트워크 의존 0건)
- **Pipeline:** FAST $\to$ CONTRACT $\to$ FULL $\to$ BUILD 4단계 Fail-Fast 구조 적용.

---

### Milestone 6: ADMIN Recall → Reset Edit Activation & Physical Color Preservation Regression Fix

#### Background & Root Cause
1. **문제 현상:**
   - ADMIN에서 Local DB Search 후 PositionRecord가 정상 Recall(View-Only)된 상태에서 Reset을 누르면, Edit Controls(SYS/HP/T/STR/AI/SAVE)가 계속 비활성화되어 있고 화면 상의 Red/Yellow 공이 시각적으로 뒤바뀌어 렌더링됨.
2. **근본 원인 (Root Cause):**
   - `handleAdminWorkReset`에서 `setTargetColor(null)` 및 `setIsTargetSelected(false)`를 무조건 실행하여 Recall된 Target physical identity 메타데이터를 유실시킴.
   - 이로 인해 `isAdminTargetReady()`가 `false`가 되어 `canUseSystemControls = false`(컨트롤 비활성화)가 발생함.
   - 동시에 `targetColor === null` 상태에서 `paintHexForTargetRole(null)` fallback(`PROVISIONAL_TARGET_COLOR`="yellow")이 작동하여 실제 좌표(`balls.target`/`balls.second`)는 불변임에도 화면에 렌더링되는 색상만 반전(Render-only Swap)됨.

#### Core Invariants & State Contracts
- **Search Preparation:** Target=NONE 허용 (검색 전 자유 상태).
- **Recall:** View-Only (기존 레이어 표시, 세션 비활성).
- **Reset:** Recall $\to$ Edit 전환 (Recall된 검색 결과의 Target physical identity를 보존/복원하여 즉시 편집 세션 개방).
- **Ball Role SSOT:** `Cue = Cue Role`, `Target / Second = Logical Role`, `Red / Yellow = Physical Color` ($Logical\ Role \neq Physical\ Color$).

#### Implementation
- `frontend/src/domain/system/adminEditSessionContract.ts`:
  - `resolveAdminResetTargetMeta`: slotTargetBall 또는 targetColor로부터 Target 메타데이터를 보존/복원 (Target=NONE일 때만 null 반환).
  - `applyAdminWorkResetSession`: 보존된 Target 메타데이터를 기반으로 `isTargetSelected: true`, `targetColor`, `canUseSystemControls: true` 반환.
- `frontend/src/App.jsx`:
  - `handleAdminWorkReset`: active slot 및 targetColor로부터 `resolveAdminResetTargetMeta`를 호출하여 유효한 Target 메타데이터가 존재하면 `setIsTargetSelected(true)`, `setTargetColor(readyTarget)`, `patchSlotRuntimeMeta`로 보존 및 복원.
- `frontend/src/domain/system/adminEditSessionContract.test.ts` & `adminTargetBallRules.contract.test.ts`:
  - Reset 후 controls 비활성화를 기대하던 잘못된 테스트 assertion을 정상 수명주기 계약으로 수정.
  - TEST A(Red Target), TEST B(Yellow Target), TEST C(Target NONE Search), TEST D(Coordinate Invariant), TEST E(View-Only Invariant) 수명주기 회귀 테스트 추가.

#### Verification & Protection
- `npm run test:fast`: PASS
- `npm run test:contract`: PASS
- `npm test`: 98 test files / 968 tests PASS
- `npm run build`: PASS
- `npm run test:regression`: PASS

---

### Milestone 7: ADMIN Recall → Reset → Edit → SAVE Lifecycle & Family Identity Preservation Regression Fix

#### Background & Root Cause
1. **문제 현상:**
   - ADMIN에서 Local DB Recall 후 Reset을 눌러 편집 모드로 진입하고 데이터를 수정한 뒤 SAVE 버튼을 클릭하면, 아무런 피드백이나 에러 없이 저장이 수행되지 않는 Silent No-Op 현상 발생.
2. **근본 원인 (Root Cause):**
   - **Slot runtime patch의 applied stub 오염:** Recall 직후 `slot.applied === null` 상태에서, Reset 핸들러의 `patchSlotRuntimeMeta`가 `targetBall` 메타데이터만 포함된 불완전한 `targetOnlyStub`(`{ targetBall: "red" | "yellow" }`)을 `slot.applied`에 생성함.
   - **Family Identity 소실:** `saveFlow.ts`의 `explicitFamilyIdentityFromSlot`이 단순 `applied ?? draft`를 사용하여, 완전한 Family Identity(`familyId`, `memberId`, `memberOrigin`)를 보유한 `draft`를 무시하고 불완전한 `applied` stub을 선택함.
   - **Save Intent 오판 및 4-Track 충돌:** `familyId`와 `memberId`가 누락되면서 `resolveFamilySaveIntent`가 기존 레코드 업데이트(`UPDATE`)가 아닌 신규 생성(`CREATE`)으로 오판하여, 이미 점유된 슬롯에 대해 `writeFourTrackFamilyMembers`가 `SLOT_CAPACITY` 또는 `CROSS_FAMILY_COLLISION` 에러를 반환함.
   - **Silent No-Op:** `historyFlow.ts`의 `runCanonicalSave`가 `!r?.ok` 실패에 대해 사용자 피드백을 제공하지 않고 조용히 리턴함.

#### Core Invariants & State Contracts
- **Slot Runtime Patch Invariant:** `slot.applied`가 null인 상태에서 runtime metadata patch는 결코 `applied`에 불완전한 stub(`targetOnlyStub`)을 생성하지 않는다 (`slot.applied === null` 유지).
- **Defensive Identity Resolution Invariant:** `explicitFamilyIdentityFromSlot`은 불완전한 `applied` 객체 하나 때문에 완전한 `draft` Family Identity를 버리지 않고 field-level fallback(`applied?.familyId ?? draft?.familyId`)을 수행한다.
- **SAVE User Feedback Invariant:** SAVE 실패 시 결코 Silent No-Op으로 종료되지 않으며, 사용자에게 명시적인 피드백(`alert`)을 제공한다.
- **SSOT Preservation:** Ball Role SSOT (`Cue / Target / Second`), Physical Color Invariance (`Red / Yellow`), History Workspace $\neq$ Searchable Corpus 원칙을 완벽히 유지한다.

#### Implementation
- `frontend/src/hooks/useShotSlots.ts`:
  - `patchSlotRuntimeMeta`: `slot.applied`가 null일 때 `applied`를 null로 유지하여 불완전한 `targetOnlyStub` 생성을 원천 차단.
- `frontend/src/application/flows/saveFlow.ts`:
  - `explicitFamilyIdentityFromSlot`: `familyId`, `memberId`, `memberOrigin`, `generatedFromMemberId`, `symmetryOp`에 대해 `applied?.field ?? draft?.field` field-level fallback을 적용하여 방어적 복원 보장.
  - `appliedForSave`: `draft`와 `applied`의 스프레드 병합으로 슬롯 메타데이터 보존.
- `frontend/src/application/flows/historyFlow.ts`:
  - `runCanonicalSave`: `!r?.ok` 실패 시 실패 사유를 포함한 명시적 `alert` 피드백 추가.
- `frontend/src/application/flows/adminRecallResetSaveLifecycle.contract.test.ts`:
  - 신규 End-to-End 수명주기 계약 테스트 추가:
    - TEST A: Red Target Recall $\to$ Reset $\to$ Edit $\to$ SAVE 성공
    - TEST B: Yellow Target Recall $\to$ Reset $\to$ Edit $\to$ SAVE 성공
    - TEST C: Target=NONE 검색 준비 $\to$ 매칭 레코드 Recall $\to$ Reset $\to$ SAVE 성공
    - TEST D: `patchSlotRuntimeMeta`의 `applied=null` 보존 및 stub 생성 차단 검증
    - TEST E: 방어적 Family Identity Resolver fallback 검증
    - TEST F: SAVE failure feedback 명시적 제공 검증

#### Verification & Protection
- `frontend/src/application/flows/adminRecallResetSaveLifecycle.contract.test.ts` (6 tests PASS)
- `npm run test:fast`: 16 files / 156 tests PASS
- `npm run test:contract`: 18 files / 188 tests PASS
- `npm test`: 99 files / 974 tests PASS
- `npm run build`: PASS

---

### Milestone 4: ADMIN Derived SAVE Persistence & Marginal Search Coverage

#### Background & Problem
1. **`workspace_history` Silent Persistence Failure / False Success:**
   - `saveWorkspaceHistory()` 내부에서 `localStorage.setItem` 실패 시 `console.warn`만 발생시키고 `void`를 반환하여 호출부(`commitWorkspaceHistoryWithStrategyDataset`)가 성공으로 오인.
   - 용량 초과(`QuotaExceededError`) 등 저장 실패 시에도 `workspaceHistoryVersion`이 증가하고 "스냅샷 저장: ..." alert가 표시되나 실제로는 History에 스냅샷이 누락됨.
2. **Derived Family 1D Marginal Search Records 누락:**
   - Unified Derived Approval 시 `Base Cue × Base Second`(4개)와 `Cue Derived × C3+`(252개)만 생성되어, `Cue Derived × Base Second`와 `Base Cue × C3+`의 1D 한계(Marginal) 검색 레코드가 누락되어 Local DB Search에서 매칭 실패.

#### Root Cause
- `workspaceHistory.ts`의 `saveWorkspaceHistory`가 반환값 없이 에러를 삼키고 호출부에 실패 상태를 전달하지 않는 불완전한 함수 시그니처.
- `buildCueC3ProductMembers.ts`가 Cue 축 파생점($C_i$)과 C3+ 파생점($S_j$)의 곱집합($C_i \times S_j$)만 생성하고, 각 축의 Base($C_0$, $S_0$)와 결합된 한계 레코드($C_i \times S_0$, $C_0 \times S_j$)를 생성하지 않음.

#### Final Resolution & Implementation
1. **`workspace_history` 저장 성공/실패 계약 명시화 (Fix A):**
   - `frontend/src/domain/workspaceHistory.ts`: `saveWorkspaceHistory`의 반환 타입을 `SaveWorkspaceHistoryResult` (`{ ok: true } | { ok: false, reason: string }`)로 전환하고 에러를 명시적으로 반환.
   - `frontend/src/hooks/useSettings.js`: `commitWorkspaceHistoryWithStrategyDataset`에서 `saveWorkspaceHistory` 결과를 검사하여 실패 시 버전 증가 차단, 실패 alert 표시(`스냅샷 저장 실패: ...`), 실패 결과 반환.
2. **Derived Marginal Coverage 생성 및 검증 (Fix C):**
   - `frontend/src/domain/family/buildCueC3ProductMembers.ts`:
     - $C_i \times S_0$ (Cue Marginal, `DERIVED_CUE_IMPACT`, `CUE_IMPACT_DERIVED_RULE`): Cue Derived $\times$ Base Second 생성.
     - $C_0 \times S_j$ (C3+ Marginal, `DERIVED_C3_PLUS`, `C3_PLUS_DERIVED_RULE`): Base Cue $\times$ C3+ Scoring 생성.
     - $C_i \times S_j$ (Cross Product, `DERIVED_CUE_C3_PRODUCT`): Cue Derived $\times$ C3+ Scoring 생성.
     - Track당 레코드 수: $N_c + N_3 + N_c \times N_3$ (4개 트랙 총 $4 \times (N_c + N_3 + N_c \times N_3)$).
   - `frontend/src/domain/family/unifiedDerivedReview.ts`:
     - `existingProductLineage` 필터에 `CUE_IMPACT_MEMBER_ORIGIN`과 `C3_PLUS_MEMBER_ORIGIN`을 포함하여 한계 레코드 계통 보존.
3. **Core Invariants 보존:**
   - 4-Track Invariant (`B2T_L`, `B2T_R`, `T2B_L`, `T2B_R`) 유지.
   - Ball Role SSOT (`Cue / Target / Second`) 및 물리 색상(`Red / Yellow`) 불변 유지.
   - Search 엔진 알고리즘/임계값 일체 불변.

#### Verification & Protection
- `frontend/src/application/flows/adminDerivedPersistenceMarginalSearchLifecycle.contract.test.ts` (6 tests PASS):
  - TEST A~E: Base, Cue Marginal, C3+ Marginal, Cross Product, Outside Corpus 검색 검증.
  - TEST F & G: Red Target / Yellow Target 물리 색상 반전 패리티 검증.
  - TEST H: History 저장 성공 및 내구성 로드 검증.
  - TEST I: `QuotaExceededError` 시 버전 미증가 및 실패 alert 검증.
  - TEST J: Full User Lifecycle (Recall $\to$ Reset $\to$ Edit Cue $\to$ SAVE $\to$ Derived Review $\to$ Approve $\to$ History Check $\to$ Marginal Search) E2E 검증.
  - TEST K & L: Family Record Count ($4 \times (N_c + N_3 + N_c \times N_3)$) 및 Corpus 유일성 검증.
- `npm run test:fast`: 17 files / 162 tests PASS
- `npm run test:contract`: 19 files / 194 tests PASS
- `npm test`: 100 files / 980 tests PASS
- `npm run build`: PASS
- `git diff --check`: PASS

---

## Final Status & Verification Summary

| Suite / Check | Result |
|---|---|
| `npm run test:fast` | **17 files / 162 tests PASS** (~1.5s) |
| `npm run test:contract` | **19 files / 194 tests PASS** (~1.4s) |
| `npm test` (Full Vitest) | **100 files / 980 tests PASS** (~36s) |
| `npm run build` | **PASS** (Vite 번들링 + `dist/dataset` 패키징 성공) |
| `git diff --check` | **PASS** (0 whitespace / formatting issue) |
| Production Business Logic | **불변식 완벽 보존 (최소 회귀 수정만 적용)** |

---

# 2026-08-28 (Precision Editing — Guide Live Coordinate Preview & Real-Time Coordinate Display Finalization)

## Mode

**Agent** · Precision Editing Guide Live Coordinate Preview · App.jsx Coordinate Renderer Wiring · Regression Testing · Visual Verification Approved · Release Finalization

## Background & Problem

Precision Editing의 Ball Guide 사용 중 다음과 같은 UX 불편이 존재했음:
1. **Guide Drag 중 좌표 텍스트 미갱신:** Joystick이나 Ball 직접 드래그 시에는 `ballsState`가 실시간 갱신되어 좌표 텍스트가 즉시 변하지만, Vertical/Horizontal Guide 드래그 중에는 Guide 선만 이동하고 좌표 텍스트는 공의 기존 위치(`ballsState[ballId]`)를 계속 표시함.
2. **반복 수정 발생:** 사용자가 원하는 Guide 교차점에 맞추기 위해 실시간 좌표를 확인하지 못하고, 일단 Snap 버튼을 눌러 공을 이동시킨 뒤에야 좌표를 확인할 수 있었음.

## Root Cause Analysis

- `useBallGuide.ts` 및 pointerMove 핸들러는 드래그 중 `guideState.verticalX` / `guideState.horizontalY`를 이미 실시간으로 정상 갱신하고 있었음.
- 그러나 `App.jsx`의 Joystick 좌표 텍스트 렌더러(`<text data-ball-coordinate="1">`)가 `bp = balls[dragState.ballId]`만 단일 소스로 읽도록 하드코딩되어 있었음.
- 이로 인해 Guide 드래그 중 갱신되는 `guideState`가 좌표 텍스트 렌더링에 연결되지 않았음.

## Implementation (Presentation-Only Source Extension)

`frontend/src/App.jsx`의 좌표 renderer에 presentation-only derived value `displayCoord`를 추가:

```jsx
const bp = balls[dragState.ballId];
const isGuideActiveForBall =
  guideState.active &&
  guideState.ballId === dragState.ballId &&
  Number.isFinite(guideState.verticalX) &&
  Number.isFinite(guideState.horizontalY);
const displayCoord =
  guideDragState.active && isGuideActiveForBall
    ? {
        x: guideState.verticalX,
        y: guideState.horizontalY,
      }
    : bp;
```

렌더링 문자열 소스를 `bp.x / bp.y`에서 `displayCoord.x / displayCoord.y`로 전환:
- 포맷: 기존 `toFixed(1)` 그대로 유지 `({displayCoord.x.toFixed(1)}, {displayCoord.y.toFixed(1)})`
- 위치(`cx`, `cy`), 폰트, 오프셋, data-attribute(`data-ball-coordinate="1"`), visibility 조건 일체 불변.

## Preserved Invariants & Safety

1. **Vertical Guide Drag:**
   - X 좌표 실시간 변경, Y 좌표는 현재 Horizontal Guide 위치 고정 유지.
   - Ball 실제 위치(`ballsState`)는 이동하지 않음.
2. **Horizontal Guide Drag:**
   - Y 좌표 실시간 변경, X 좌표는 현재 Vertical Guide 위치 고정 유지.
   - Ball 실제 위치(`ballsState`)는 이동하지 않음.
3. **Preview vs Committed State Invariant:**
   - Guide Drag = Coordinate Preview (`guideState` → `displayCoord` → `<text>`)
   - Snap = Ball Position Commit (`snapBallToGuideIntersection` 실행 시에만 `ballsState` 변경)
4. **Joystick / Ball Drag Regression Guard:**
   - `guideDragState.active`가 `false`일 때 `displayCoord = bp`로 즉시 fallback되어 기존 실시간 좌표 표시 100% 보존.
5. **Geometry & Coordinate SSOT Protection:**
   - Fg/Rg 변환, `toPx`, `toRg`, `pointerToRg`, `clampBallGuideAxis`, 당구대 치수(80×40), SCALE, PADDING 일체 불변.
6. **Snap Pipeline Protection:**
   - `getBallGuideSnapAction`, `resolveBallGuideSnapActionHit`, `snapBallToGuideIntersection` 일체 불변.

## Verification

| Suite / Check | Result |
|---|---|
| 사용자 실검증 (Guide Drag 실시간 좌표 확인) | **PASS** (Visual review approved) |
| `src/hooks/useBallGuide.test.ts` | **22 PASS** (Vertical/Horizontal Guide 분리 갱신 및 공 불변성 회귀 테스트 포함) |
| `npm run build` | **PASS** (`vite build` production bundle 정상 생성) |
| `git diff --check` | **PASS** (formatting / whitespace 이상 없음) |

## Release checkpoint

| Item | Result |
|------|--------|
| Commit | `0105e472bd55697c6b188cd34c12c997952ee984` · `feat(precision): show live coordinates during guide drag` |
| Push | **PASS** · `origin/main` matches local `HEAD` |
| Vercel | **PASS** · existing GitHub → Vercel Git integration · Production deployment `6139357202` |
| Deployed SHA | `0105e472bd55697c6b188cd34c12c997952ee984` |
| Deployment URL | `https://3cushion-hifcbhjzd-3cushionai.vercel.app` |
| Production URL | `https://3cushion-ai.vercel.app` |
| HTTP / visual smoke test | **PASS** · Guide live coordinate display, Ball immutability, Snap, Joystick, table frame/scales/geometry visible and responsive |

---

# 2026-08-28 (ADMIN Workspace History Overlay UX — Selection, Range, Sizing, Density & Unified Delete)

## Mode

**Agent** · ADMIN Workspace History Overlay UX Refactoring · Selection & Delete Pipeline Integration · Density & Sizing Polish · Docs Sync

## Background & Initial Problems

ADMIN 화면의 Workspace History Overlay에서 스냅샷 관리 및 조회 시 다음 문제점들이 확인됨:
1. **All 버튼 무반응/오작동:** 상단의 `All` 버튼이 "전체 선택" 액션이 아닌 `tab === "all"` 전환 버튼으로 바인딩되어 있어, 기본 로컬데이터 화면에서 클릭해도 아무 반응이 없음.
2. **로컬데이터 탭 체크박스 비활성화:** `<input type="checkbox" disabled={tab !== "unexported"} />`로 하드코딩되어 있어, 기본 로컬 화면에서 체크박스 선택이 불가.
3. **작은 모달 크기로 인한 공간 낭비:** 폭 540px, 높이 540px 수준의 소형 모달로 당구대 내부 세로 공간을 거의 활용하지 못함.
4. **체크박스 조작성 부족 및 오조작 위험:** 체크박스 visual 크기(18px)가 작아, 체크박스 클릭 시도 중 부모 Row를 클릭하여 의도치 않게 Workspace Load(데이터 복원)가 실행될 위험 존재.
5. **분산된 삭제 UX:** 각 행 우측의 `❌ 삭제` 버튼 및 하단의 임의 Bulk 삭제(`Delete 30개`)로 인해 삭제 진입점이 분산되어 관리 효율 저하.

## Root Cause Analysis

- **All 역할 혼재:** 전체 선택 Action과 목록 Filter View의 개념이 탭 버튼 하나에 혼재되어 있었음.
- **체크박스 disabled 조건:** Unexported 탭에서만 체크박스를 활성화하는 과거 제약이 남아 있었음.
- **모달 사이징 정책:** 일반 소형 다이얼로그 스타일(`modal-panel--history`)을 답습하여 데이터 관리용 대형 패널 역할을 수행하기에 세로 공간이 부족했음.
- **Hit-Area 부재:** 체크박스 클릭 영역이 input 엘리먼트 자체에 한정되어 Row 본문 클릭과의 경계가 협소했음.

## Fix & Implemented Solutions

1. **상단 컨트롤 UX 구조 개편:**
   - `[ 전체선택 / 전체선택 해제 ]`: Action 토글 버튼 (`currentList` 전체 선택/해제).
   - `[ 로컬데이터 ]`: 전체 Workspace History 표시 View 필터 (`tab === "all"`).
   - `[ Unexported ]`: 미Export Workspace(`exported !== true`) 표시 View 필터.
2. **View 전환 시 Selection Reset:**
   - 로컬데이터 ↔ Unexported 탭 전환 시 `selectedIds = []` 및 Shift 범위 인덱스 자동 초기화 → 타 뷰 데이터 오삭제 원천 방지.
3. **개별 Checkbox 활성화 & Shift 범위 선택:**
   - `disabled` 제약 제거로 양쪽 뷰 모두 체크박스 동작.
   - `lastCheckedIndexRef`를 활용한 `Shift + Checkbox` 범위 일괄 선택/해제 지원.
4. **Row Click vs Checkbox Click 완전 분리 (Regression Guard):**
   - Checkbox / Hit-Area: `e.stopPropagation()` 처리로 부모 Row로의 버블링 완전 차단.
   - Row 본문 클릭: 기존 `onLoad(snap.id)` → Admin Workspace 복원 기능 100% 보존.
5. **단일 Delete 파이프라인 통합:**
   - 행별 `❌ 삭제` 및 `Delete 30개` 버튼 제거.
   - 하단 `Delete (n)` 단일 버튼 통합 (0개 시 disabled, 1개 이상 시 enabled).
   - `window.confirm("선택한 Workspace n개를 삭제하시겠습니까?")` 확인 후 `deleteSnapshotsByIds(ids)` 호출 → localStorage 일괄 갱신 및 목록 즉시 리프레시.
6. **Export 파이프라인 보존:**
   - Unexported 탭에서 선택 후 `Export` 클릭 시 기존 `handleExportSnapshots` 정상 연동.
7. **모달 세로 높이 ~1.5배 확장 & 독립 스크롤:**
   - `width: min(880px, 94vw); max-width: 960px;` (기존 안정 폭 유지).
   - `height: min(820px, 90vh); max-height: min(860px, 92vh); min-height: min(680px, 85vh);` 적용하여 당구대 내부 세로 공간 극대화.
   - Header, Controls, Footer 고정 + List Body(`flex: 1, minHeight: 0, overflowY: "auto"`) 독립 세로 스크롤.
8. **Row 고밀도화 & 체크박스 Hit-Area 확대:**
   - Row: 상하 패딩 `14px` → `7px`, 마진 `10px` → `6px` (Row 높이 ~44px로 한 화면 노출량 2배 증가).
   - Checkbox: Visual `24px × 24px`, 전용 Hit-Area `36px × 36px` 래퍼 구성으로 클릭 편의성 극대화.

## Files Modified (Minimal 4 files)

1. `frontend/src/components/WorkspaceHistoryModal.jsx`: 상단 컨트롤, 체크박스, Shift 선택, Delete 파이프라인, 고밀도 행, Hit-Area 래퍼
2. `frontend/src/index.css`: `.modal-panel--history` 세로 높이 확장 및 flex 레이아웃
3. `frontend/src/domain/workspaceHistory.ts`: `deleteSnapshotsByIds(ids: string[])` 일괄 삭제 도메인 함수 추가
4. `frontend/src/hooks/useSettings.js`: `handleDeleteWorkspaceSnapshot` 다중 ID 수용 처리

## Preserved SSOT & Boundaries (Zero Regression)

- USER Overlay Centering SSOT (`UserOverlayShell.jsx`, `overlayLayoutTokens.ts`) **일체 미변경**
- SYS 계산 엔진, Trajectory 엔진, DisplayModel, Projection **일체 미변경**
- Admin Workspace 복원(`handleLoadWorkspaceSnapshot`), Export 파일 생성(`saveDatasetExportToFile`) 로직 **일체 미변경**

## Verification

| Suite / Check | Result |
|---|---|
| 브라우저 실검증 (전체선택/로컬/Unexported/체크박스/Shift선택/Row복원/Delete/Export/스크롤) | **PASS** |
| `npm run build` | **PASS** (`vite build` 6.87s) |
| Vitest (Workspace History & Settings contract tests, 3 files) | **32 PASS** (3 files) |
| ESLint (수정 4개 파일 대상) | **0 errors**, 2 warnings (기존 hook deps) |
| Git 상태 | **Commit / Push 미실시 (대기)** |

---

# 2026-08-28 (OPEN-02 — Published Search Leaf Resolution, USER Candidate Multi-Resolution & Export Cache Invalidation)

## Mode

**Agent** · OPEN-02 Root Cause Fix · ADMIN + USER runtime leaf resolution · minimal code + test + docs

## Background & Root Cause

History Export로 저장된 데이터(`dataset/옆돌리기/파이브앤하프/positions.json`)가 ADMIN Published Search / USER Search에서 NO MATCH 되는 원인 조사(Audit) 결과 확정:
1. **ADMIN Published Search leaf resolution divergence:** `adminSearchFlow.ts`에서 `resolvePublishedLeafHints`를 호출하지 않고 `userPublishedSearchContext?.shotType`만 참조하여, `null`일 때 `resolvePublishedLeafKey`가 무조건 `"뒤돌리기"`로 fallback → `dataset/뒤돌리기/...` 404/empty corpus fetch → NO MATCH.
2. **USER Published Search runtime initial context wiring:** USER UI 초기 진입 시 `shotType` context가 `null`(선택 UI 없음)일 때, 기존 `resolvePublishedLeafKey`가 임의의 단일 fallback(`"뒤돌리기"`)을 적용하여 `dataset/뒤돌리기/...` 404/empty corpus fetch → NO MATCH.
3. **Export Cache Invalidation omission:** `useSettings.js` `handleExportSnapshots` 성공 후 `publishedDatasetStore`의 in-memory `leafCache`(`shotType::systemId`)를 무효화하지 않아, export 이전의 404/empty 캐시가 지속 유지됨.
4. **Local vs Production separation:** History Export는 브라우저의 로컬 파일 시스템 쓰기이며, Production Published Search(`www.3cushionai.com`) 반영에는 Git commit/push/Vercel 배포 파이프라인이 필수.

## Fix Applied (Minimal)

1. `frontend/src/domain/publishedLeafResolve.ts`:
   - `listCanonicalShotTypes()`: `frontend/src/data/meta/admin/shot_types.json` SSOT로부터 활성 공략 라벨 목록 추출.
   - `resolveCandidatePublishedLeaves()`: `shotType`이 명시된 경우 단일 leaf 반환; USER 모드에서 `shotType`이 `null`인 경우 canonical active shot types 기반 candidate leaves (`SYSTEMID_TO_SHOTTYPE_CARDINALITY: 1:N`) 생성.
2. `frontend/src/application/flows/userSearchFlow.ts`:
   - `resolveCandidatePublishedLeaves` 연동하여 candidate leaves 순차 조회 및 Euclidean spatial recall 수행.
   - 매칭 성공 시 실제 매칭된 leaf(`shotType`, `systemId`)를 `userPublishedSearchContext`로 확정 저장.
   - 단일 leaf/다중 leaf 오류 처리 및 distance 기반 최적 candidate 선택.
3. `frontend/src/application/flows/adminSearchFlow.ts`:
   - `resolvePublishedLeafHints` 연동: `adminState.sys`, `slots`, `activeSlot`에서 canonical `shotType`/`systemId` 추출.
   - `resolvePublishedLeafKey`에 canonical `runtimeHints` 우선 전달.
4. `frontend/src/hooks/useSettings.js`:
   - `handleExportSnapshots` 내 export 성공 snapshot 루프에서 `refreshPublishedDataset(shotType, systemId)` 호출 추가. Export 실패 시에는 refresh 미실행.
5. `frontend/src/domain/publishedLeafResolve.test.ts`:
   - `listCanonicalShotTypes`, `resolveCandidatePublishedLeaves`, `resolvePublishedLeafKey` 단위 테스트 추가.
6. `frontend/src/application/flows/publishedSearchLeafResolution.contract.test.ts` (신규 10 tests):
   - CASE A: ADMIN Published Search canonical shotType/systemId leaf resolution.
   - CASE B: Non-default shotType(빗겨치기 등) 보존.
   - CASE C: History Export 성공 후 published cache invalidation.
   - CASE D: Export 실패 시 cache 유지.
   - CASE E: Representative exact Ball3 match (d=0).
   - CASE F: Role SSOT protection (target/second swap no-match).
   - USER Search canonical leaf match regression.
   - USER Search 초기 상태 (`shotType: null`, `adminState.sys.shotType: ""`)에서 candidate resolution → `옆돌리기` MATCH.
   - USER Search 비기본 shotType (`비켜치기`) 동적 candidate resolution MATCH (하드코딩 부재 검증).
   - Cache regression: fallback empty cache 존재 시에도 canonical resolution 및 ready cache 갱신.

## Preserved SSOT & Boundaries (Zero Regression)

- Search matcher / Euclidean distance / 2Rg threshold 변경 **없음**
- Ball3 Role SSOT (`cue ↔ cue`, `target ↔ target`, `second ↔ second`) 변경 **없음**
- target/second permutation 금지 원칙 유지
- Trajectory / Coverage candidate 정책 유지
- POLICY A (Recall view-only, Reset canonical edit 전환) 유지
- Dataset records / Migration / Schema 변경 **없음**

## Verification

| Suite | Result |
|-------|--------|
| `publishedSearchLeafResolution.contract.test.ts` | **10 PASS** |
| `publishedLeafResolve.test.ts` | **10 PASS** |
| Targeted Core / Role / Search / Parity suite (10 files) | **88 PASS** |
| Family / Extension / Derived Review suite (11 files) | **183 PASS** |
| `npm run build` | **PASS** (`vite build` 6.51s) |

---

# 2026-08-27 (Table Redesign Finalization — Frame, Scale, and Identifier Clarity)

## Mode

**Agent** · Table Redesign presentation finalization · documentation and release checkpoint

## Scope

Table presentation and label readability were finalized without changing calculation, geometry, interaction, persistence, or dataset contracts.

### Table presentation

- Natural Oak / Light Walnut frame gradient retained
- subtle inner separator retained
- dark brown diamonds retained
- navy outer background retained
- existing cushion/cloth geometry and colors retained

### Frame/rail scale readability

- External TOP / BOTTOM / LEFT / RIGHT raw scale values use `#FFFFFF`
- External raw scale labels use a subtle dark espresso halo: `#33251B`
- CO/C1 raw/value text uses `#FFFFFF`
- Raw label coordinates, values, anchors, font geometry, and placement are unchanged

### System scale identifiers

- Restored source-driven group identifiers such as `CO`, `C1`, `C3`, `C4`, `C5`, and `C6`
- Source remains `trackAnchorItems` anchor ID mark/value data
- Pipeline remains:

```text
trackAnchorItems
  → buildSystemAxisLabelModel
  → captionBuckets
  → group placement
  → SystemValueLabels
```

- ADMIN caption gate uses the existing `showSystemGrid` state
- C2 is not synthesized when the active anchor source does not contain C2
- CO/C1 identifiers use `#FFFFFF` while retaining the existing dark espresso halo

### Architecture and semantic guards

- SYS formula, Fg/Rg calculation, mappings, trajectory, Impact, Draft/Apply, Ball Guide, CO/C1 editing, SAVE, History/Recall, dataset/schema, and WRITE SSOT are unchanged
- `SYSTEM_ARCHITECTURE.md` and `CALCULATION_RULES.md` were reviewed; no calculation or architecture contract change requires an update
- Semantic C3/C4/C5/C6, trajectory, baseline, Guide, Impact, Ball, cloth, and editing colors remain unchanged

## Verification

- User visual review: **APPROVED**
- Production build: **PASS**
- `git diff --check` (CRLF-aware): **PASS**
- `userDisplayFlags.test.ts`: **7/7 PASS**
- `systemAxisCaption.test.ts`: **15/16 PASS**
- Existing baseline failure remains at `systemAxisCaption.test.ts:168`; no new failure attributed to Table Redesign
- Existing user dataset and working-tree changes remain preserved

## Release checkpoint

| Item | Result |
|------|--------|
| Commit | `b764d5ac5424bc4e46b5603ff61af7de2241d81f` · `feat(table): finalize frame redesign and label clarity` |
| Push | **PASS** · `origin/main` matches local `HEAD` |
| Vercel | **PASS** · existing GitHub → Vercel Git integration · Production deployment `6124708577` |
| Deployed SHA | `b764d5ac5424bc4e46b5603ff61af7de2241d81f` |
| Deployment URL | `https://3cushion-o5u3zrrab-3cushionai.vercel.app` |
| Production URL | `https://3cushion-ai.vercel.app` |
| HTTP / visual smoke test | **PASS** · Natural Oak frame, white raw scales, dark espresso halo, CO/C1 white identifiers/values, semantic C3/C4 colors, geometry and trajectory visible |

---

# 2026-08-27 (Precision Editing B1~B5 — Completion Documentation)

## Mode

**Agent** · documentation update only · implementation already complete · **no Commit / Push / Deploy**

## Canonical owners

| Topic | Canonical | Documentation role |
|-------|-----------|--------------------|
| Project current status | `작업관리/PROJECT_MASTER_INDEX.md` | B1~B5 location/status pointer |
| Precision Editing completion detail | **this LOG entry** | implementation, interaction, verification history |
| Ball Guide runtime state | `frontend/src/hooks/useBallGuide.ts` | runtime-only state owner |
| Ball Guide interaction | `frontend/src/interaction/ballGuideInteractionPolicy.ts` | H/V axis, hit-test, step, priority |
| CO/C1 Mark axis | `frontend/src/domain/trajectory/baselineMarkAxisSnap.ts` | canonical Fg/Rg axis/domain descriptor |
| CO/C1 Draft state | `frontend/src/overlay/state/baselineDraftState.ts` | Draft lifecycle and coordinate update |
| CO/C1 Apply | `frontend/src/application/flows/baselineDraftApplyFlow.ts` | Draft → Apply → SYS commit sequence |
| Impact precision geometry | `frontend/src/domain/trajectory/baselineImpactSnap.ts` | pure adapter and line/axis candidate |

## Scope and completion

Precision Editing B1~B5 is recorded as **COMPLETE**. The feature family consists of:

- **B1** Ball Guide runtime session and static H/V render
- **B2-1** Guide endpoint handle drag
- **B2-2** Guide fine nudge arrows
- **B2-3** Guide Alt+drag precision
- **B3-1** Same-Ball click snap — **not adopted** because it conflicts with the existing Ball double-click contract
- **B3-2** Dedicated Guide intersection Snap action — adopted replacement
- **B3-3** Ball editing presentation simplification and shared Guide-session lifetime
- **B4-1** CO/C1 canonical-axis fine nudge arrows
- **B5-1** Active Impact source and pure line-to-Mark-axis geometry
- **B5-2** CO/C1 native double-click Impact snap through the existing Apply path

## Ball Guide

| Contract | Result |
|----------|--------|
| Ball selection | Selected Ball center becomes the origin for Horizontal and Vertical Guides |
| Different Ball selection | Existing Guide is replaced by the newly selected Ball's Guide |
| Outside/session dismissal | Outside selection and related session termination remove the Guide |
| State | Runtime-only; not durable application data |
| Coordinates | Guide values remain Rg physical coordinates |
| Persistence | Guide state is not written to SAVE, History, dataset, or schema |

## Guide editing

- Horizontal Guide moves only `horizontalY`.
- Vertical Guide moves only `verticalX`.
- Both Guide endpoints have drag handles.
- Fine arrows are axis-directional:
  - Horizontal: `↑ / ↓`
  - Vertical: `← / →`
- Fine step is exactly **0.1 Rg**.
- Desktop Guide Alt+drag uses `normal delta × 0.1`; the factor is fixed at pointer-down.
- Guide handle/arrow hit-tests take priority over adjacent Ball interaction.
- Existing Ball drag, Joystick, and Ball double-click contracts remain separate.

## Guide Snap and Ball editing presentation

The originally considered same-Ball click → intersection snap was not adopted. Browser click sequencing would allow the snap to run before the existing Ball double-click handlers for Target Role and Second projection. The adopted B3-2 action is a dedicated Snap action near the Guide intersection:

```text
intersection = { x: verticalX, y: horizontalY }
selected Ball center → intersection
```

The action reuses the existing Ball update, bounds, dirty, and state-update path. The visual hit area is separated from the visual offset and edge-clamped.

The former Ball Fine directional arrows were removed. The Ball movement handle remains, and its live coordinate text remains part of the same Ball editing presentation. Guide, movement handle, and coordinate text are dismissed together when the editing session ends.

## CO/C1 Fine Adjustment

- Freedom is taken from the actual canonical Mark axis:
  - Horizontal axis → `← / →`
  - Vertical axis → `↑ / ↓`
- Fine step is exactly **0.1 Rg**.
- Corner axis ambiguity fails closed; no arbitrary horizontal/vertical choice is made.
- Existing path is reused:

```text
Draft coordinate
  → runBaselineDraftApply
  → resolveBaselineDragSysCommit
  → commitDraftSys
```

- No new SYS formula or coordinate-to-SYS path was introduced.
- Fg/Rg domains and Mark constants remain owned by the existing axis contract.

## CO/C1 Alt+drag decision

CO/C1 Alt+drag precision is explicitly **not implemented**. The product decision is that the existing 0.1 Rg fine arrows are sufficient. Ball Guide Alt+drag remains implemented and unchanged.

## B5-1 Impact source and geometry

### Active Impact source

Production source inspection established:

- **CONTACT visible Impact:** `useCoachingController` uses `calcImpactBall(cue, target, T)`.
- **FREE visible Impact:** `balls.impact` is preferred, with `calcImpactBall(cue, target, T)` as fallback.
- **Trajectory `impact.raw`:** `calculateImpact(...)` physics result; it is a distinct meaning and is not silently used as the visible Impact source.
- **Trajectory `impact.contactRg`:** `balls.impact ?? calcImpactBall(...)`; it may be supplied only as an equivalent-source consistency check.

Precision policy is therefore:

```text
visible Impact Ball center = authoritative
optional equivalent trajectory contact source = consistency check only
mismatch / invalid source = fail closed
```

The adapter returns an Rg point and never averages, interpolates, or substitutes a trajectory raw result.

### Mark axis and candidate

`baselineImpactSnap.ts` uses the existing `MarkAxisLock` descriptor from `baselineMarkAxisSnap.ts`. The candidate is calculated with a vector/parametric line:

```text
P(t) = fixed + t * (Impact - fixed)
```

The allowed Mark axis supplies the constant coordinate and its existing domain. Candidate acceptance requires:

- finite fixed and Impact coordinates
- non-zero fixed → Impact vector
- non-parallel line/axis
- candidate inside the real Fg/Rg Mark domain
- `movingCandidate → Impact → fixed` collinear/between ordering

No clamp or nearest-point fallback is applied. Invalid, parallel, coincident, out-of-domain, opposite-extrapolation, and source-mismatch cases return failure.

## B5-2 CO/C1 Impact Snap

Native SVG `dblclick` handling is connected at the table interaction boundary and hit-tests only CO/C1 baseline endpoints. Other Marks, C2, Extension, Guide, Ball, and Impact-ball double-click paths are excluded.

| Double-click target | Moving Mark | Fixed Mark |
|---------------------|-------------|------------|
| CO | CO | C1 |
| C1 | C1 | CO |

The selected corner axis is reused from the existing baseline axis session. If no selected corner axis exists, the operation fails closed; pointer position is not used to invent a new corner axis.

Successful flow:

```text
CO/C1 native double-click
  → moving/fixed resolution
  → resolveActiveImpactForPrecision
  → resolveBaselineImpactSnapCandidate
  → existing Baseline Draft coordinate
  → runBaselineDraftApply
  → resolveBaselineDragSysCommit
  → commitDraftSys
```

The second double-click pointer phase does not start a second baseline drag/apply session. On Apply/SYS failure, the pre-snap Draft snapshot is restored. Ball coordinates and Ball Guide state are not modified.

## Architecture invariants

The following contracts were not changed by Precision Editing:

- SYS formula and `calculateByProfileExpr`
- Fg/Rg calculation contract
- trajectory calculation and `trajectoryBuilder` geometry
- Impact physics and Cue→Impact generators
- C3+ generator and 4-track consistency
- Derived Review
- Family writer
- History/Recall schema
- dataset schema and WRITE SSOT
- `trajectoryExtensions` contract

Ball Guide is a runtime presentation/editing aid, not SYS or trajectory-input SSOT. CO/C1 Impact Snap changes baseline coordinates only through the existing Draft → Apply → SYS commit path.

## Verification

### User app verification report

The following manual app checks were reported complete:

- Guide H/V movement
- Guide Snap moving the Ball center exactly to the Guide intersection
- live Ball coordinate updates
- CO/C1 0.1 Rg fine arrows
- CO double-click → visible Impact center snap
- C1 double-click → visible Impact center snap

### Automated verification

- B1~B5 targeted regression: **PASS**
- Production build: **PASS**
- Full Vitest: the existing baseline failure set remains; no B5-related new failure was observed.
- Existing full-suite failures are the known `No test suite found` files and the existing `systemAxisCaption` assertion. They are not attributed to Precision Editing.

### Git and persistence guard

- Existing B1~B4/B3-3 changes remain uncommitted and preserved.
- Existing user dataset deletion status remains preserved.
- Existing `FAMILY_DATA_ARCHITECTURE_DRAFT.md` modification remains preserved.
- No dataset/schema/history/write-path changes were made for this documentation update.
- Commit, Push, and deploy were not performed.

---

# 2026-08-26 (Docs — POLICY A SSOT + Issue B CLOSED)

## Mode

**Agent** · documentation only · **no code / dataset / migration / Commit / Push**

## Canonical owners

| Topic | Canonical | Others |
|-------|-----------|--------|
| Recall → Edit (POLICY A) | `TRAJECTORY_EXTENSION_SSOT.md` §7 | MASTER status pointer |
| LocalDB Search metrics / NO MATCH | `PROJECT_MASTER_INDEX.md` LocalDB table | TRAJECTORY §7.1.1 short clarify |
| Issue B investigation + close | **this LOG entry** | MASTER status = CLOSED |

## POLICY A — UI verified + documented

App verification:

- LocalDB/History Recall → controls disabled (view-only)
- Target double-click while recalled → does **not** open edit-session
- Reset → unlock + Ready + session → SYS / HP/T / STR / AI / SAVE usable

Contract (canonical text in TRAJECTORY §7):

```text
Recall = view-only (session=false)
Target dblclick ≠ edit-session API while view-only
Reset = ONLY canonical Recall→Edit transition
Second dblclick Projection unchanged
```

Code owners (impl, uncommitted): `App.jsx` · `application/flows/adminLocalDbFlow.ts` · `domain/system/adminEditSessionContract.ts` · `hooks/useSettings.js`

## Issue B — CLOSED / NO ADDITIONAL SEARCH/DATASET CHANGE

### Observed

Some History snapshots appeared to LocalDB-match differently when moving Second along the on-screen trajectory (v001/v002 vs v003/v004 user report).

### Prior hypothesis (REJECTED / superseded)

Early audit hypothesized **“v001/v002 sparse authored-only vs v003/v004 dense Product”** as the Search difference.

**Later DevTools `workspace_history` counts (옆돌리기 / 5_half_system):**

| Snapshot | records | AUTHORED | SYMMETRY | DERIVED_CUE_C3_PRODUCT |
|----------|--------:|---------:|---------:|-----------------------:|
| v001 | 4 | 1 | 3 | 0 |
| v002 | 256 | 1 | 3 | 252 |
| v003 | 256 | 1 | 3 | 252 |
| v004 | 256 | 1 | 3 | 252 |

→ **v002 is not sparse**; density-only explanation of v002 vs v003/v004 **discarded**.
Exact `balls.second` / `positionId` content identity across v002–v004 remains **unverified** (no byte-level snapshot file in repo at close).

### Investigation (code)

- LocalDB: `handleAdminSearch` → `runAdminLocalDbRecall` → `runSpatialRecall(adminSearch)`
- Query Ball3 from `normalizeBallsToBall3(ballsState)` · Role-direct · Euclidean · **2.0 Rg / ball** coarse
- Corpus = React `dataset` after History `setDataset(normalize(snapshot.state.dataset))` — no LocalDB family rematerialize swap
- Same dataset + same query → **deterministic** result
- Trajectory / Coverage visualization **does not** expand Search candidates
- No Search non-determinism / permutation regression evidence
- No confirmed Search code defect or dataset defect requiring change

### Decision

| Action | |
|--------|--|
| Search code change | **NONE** |
| 2Rg / Role SSOT change | **NONE** |
| Dataset / migration | **NONE** |
| Issue status | **CLOSED — NO ADDITIONAL SEARCH/DATASET CHANGE** |

### Reopen condition

Reopen Issue B only if: same History snapshot + same Ball3 query yields divergent LocalDB results, **or** a persisted candidate is within per-Role 2Rg of the query yet coarse still returns no-match (reproducible).

### Expected NO MATCH

Ball on a drawn trajectory line **≠** Recall guarantee. Outside persisted Ball3 sample coarse gate → `"해당 데이터 없음"` is **expected behavior**.

---

# 2026-08-26 (POLICY A — Recall view-only · Reset = only Recall→Edit)

## Mode

**Agent** · Issue A only · no Search/2Rg/Product/C3+/dataset · no Commit/Push

## Contract

```text
Recall (LocalDB / History) = view-only → session=false
Reset = only canonical Recall→Edit transition
Target dblclick does not resume edit session while recalled Target/view-only
Second dblclick Projection unchanged
Role-based Ball3 SSOT unchanged
```

## Root cause (fixed)

Recall hydrate set Target Lock when meta present, but did not clear stale lock when meta absent.
Unlocked Target dblclick could call `beginAdminInputSession` after Recall → non-deterministic “sometimes works”.

## AFTER

- Explicit Lock hydrate (meta → lock; no meta → unlock)
- View-only guard: layers on + session off → block Target dblclick edit-session path
- Reset contract retained (unlock + Ready + session true)

## Explicitly NOT done (at Issue A code time)

Issue B (later **CLOSED** in docs entry above) · Search · Euclidean 2Rg · Product · C3+ · dataset · Commit/Push

---

# 2026-08-26 (Role-based Ball3 Clean Cut — Phase 7C · Search permutation cleanup)

## Mode

**Agent** · Search/Recall only · no App/geometry/dataset · no Commit/Push

## Contract

```text
SEARCH BALL3 = ROLE-BASED DIRECT MATCH
Target/Second permutation = removed
color metadata does not determine Role
FIELD NAME == PHYSICAL ROLE
```

## DELETED

- `swapTargetSecondBalls`
- `minL1WithTargetSecondPermutation` · `minAggregateWithTargetSecondPermutation`
- `passesCoarseWithPermutation`
- `allowTargetSecondPermutation` (profile API)
- `usedPermutation` (result meta / ranked row)
- `rankRecordsForRecall.allowPermutation` branch

## AFTER

`rankRecordsForRecall` → `passesCoarseStrictRoles` + `ball3AggregateDistance` only

## Explicitly NOT done

threshold/weight changes · dataset · migration · Commit/Push

## Verification

- vitest Phase 1–7C related suites: **143 PASS** (14 files)
- `npm run build`: **PASS**
- permutation helper refs in `frontend/src`: **0**
- Commit/Push: none

---

# 2026-08-25 (Role-based Ball3 Clean Cut — Phase 7B · App UI color-slot consumers)

## Mode

**Agent** · App.jsx Role field identity only · Search untouched · no Commit/Push

## App BEFORE → AFTER

- `resolveImpactTargetBall` → `uiTargetRoleCoords` (`balls.target`)
- Frozen review coaching color-slot (`targetBall===red ? second : target`) → `balls.target`
- `isConfirmedTargetBall` → `ballId === "target"`
- `isSecondRoleSlot` → `roleId === "second"`

## DELETED (dead after App migration)

`resolveImpactTargetBall` · `isConfirmedTargetBall` · `isSecondRoleSlot` · `resolveRoleForSlotId` · `slotIdForColor` · `colorForSlotId` · `YELLOW_SLOT_ID` · `RED_SLOT_ID` · `getYellowBallCoords` · `getRedBallCoords`

## KEPT

paint / oppositeColor / `uiTargetRoleCoords` / `lockTargetRoleFromClickedBall` / `getBallCoordsBySlotId`

## Explicitly NOT done

Search permutation (`swapTargetSecondBalls` etc.) → **Phase 7C**

## Verification

- vitest Phase 1–7B related suites: **128 PASS** (12 files)
- `npm run build`: **PASS**
- App.jsx / ballRole.ts: deleted helper production refs = **0**
- Search/recallCompare: **untouched**
- Commit/Push: none

---

# 2026-08-25 (Role-based Ball3 Clean Cut — Phase 7A · dead helper cleanup)

## Mode

**Agent** · DELETE NOW only (production consumer = 0) · no behavior change · no Commit/Push

## DELETED

- `placePhysicalSecondSampleOnBall3` · `ball3FieldFor*` · `readPhysical*`
- `toColorSlotBallsForLegacyTrajectory`
- `resolveTargetSlotId` · `resolveSecondSlotId` · `resolveSecondRole`
- `getBallByRole` · `getTargetBall` · `getSecondBall` · `isTargetRoleSlot`

## DEFERRED (live production consumer)

- App: `resolveImpactTargetBall` · `isConfirmedTargetBall` · `isSecondRoleSlot` (+ slotId/colorForSlotId chain)
- Search: `swapTargetSecondBalls` / permutation helpers (gated by `allowPermutation` API — shape kept)

## Verification

- vitest Phase 1–6 related suites: **127 PASS** (12 files; obsolete color-slot tests removed)
- `npm run build`: **PASS**
- deleted helper names: definition/production/test refs in `frontend/src` = **0**
- Commit/Push: none

---

# 2026-08-25 (Role-based Ball3 Clean Cut — Phase 6 · C3+ / Product / Coverage)

## Mode

**Agent** · Phase 6 C3+/Product/Coverage only · no helper mass-delete · no Commit/Push

## Contract

```text
C3+ PHYSICAL SECOND = balls.second
PRODUCT SCORING SAMPLE P = balls.second
COVERAGE PHYSICAL SECOND = balls.second
Target color red/yellow does not change Ball3 field identity
```

## Changes

- `resolveC3PlusSecondBall` → always `balls.second`
- Product: `placePhysicalSecondSampleOnRoleBall3` (P → second; Target preserved)
- Coverage: read `balls.second` directly
- Tests: CASE A/B Role Product + Coverage fixtures + `c3ProductCoverage.roleSemantics.test.ts`

## Explicitly NOT done

deferred helper DELETE · dataset · migration · geometry formula changes

## Verification

- vitest Phase 1–6 related suites: **130 PASS**
- `npm run build`: **PASS**
- Commit/Push: none

---

# 2026-08-25 (Role-based Ball3 Clean Cut — Phase 5 · trajectory + Cue-derived)

## Mode

**Agent** · Phase 5 trajectoryBuilder + Cue-derived only · no C3+/Product/Coverage · no Commit/Push

## Contract

```text
TRAJECTORY BALL3 = ROLE-BASED
balls.target = physical Target
balls.second = physical Second
targetColor ≠ Role selector

Cue-derived:
  only balls.cue may move
  balls.target / balls.second preserve physical roles

H/V/RPI: coordinates transform; Role identity does not
```

## Changes

- `trajectoryBuilder`: Role-native Target/Second readers; App color-slot bridge removed
- `resolvePhysicalTarget` → always `balls.target`
- Tests: `trajectoryBuilder.roleSemantics.test.ts` · Cue CASE A/B Role fixtures

## Explicitly NOT done

C3+ · Product · Coverage · `placePhysicalSecondSampleOnBall3` deletion · dataset · migration

---

# 2026-08-25 (Role-based Ball3 Clean Cut — Phase 4 · Search / Recall)

## Mode

**Agent** · Phase 4 Search/Recall only · no Product/C3+/trajectory · no Commit/Push

## Contract

```text
SEARCH BALL3 = ROLE-BASED
query.target ↔ candidate.target
query.second ↔ candidate.second
allowTargetSecondPermutation = false (all profiles)
targetColor / targetBall = metadata only (filter/rank; never field swap)
```

## Changes

- `recallProfiles`: userStrict / userRelaxed / passiveHint → permutation OFF
- `recallCompare` swap helpers marked `@deprecated` (kept; unused by canonical profiles)
- `applyPositionRecall`: documented Role balls untouched
- Tests: `recall.roleSemantics.test.ts` (A–J) · parity wrong-role update

## Explicitly NOT done

trajectoryBuilder · Cue/C3+/Product/Coverage · helper deletion · dataset · migration

---

# 2026-08-25 (Role-based Ball3 Clean Cut — Phase 3 · SAVE + History)

## Mode

**Agent** · Phase 3 SAVE/History only · no Search/Product/C3+/trajectory · no Commit/Push

## Contract

```text
SAVE/HISTORY BALL3 = ROLE-BASED
balls.target = physical Target
balls.second = physical Second
targetBall / targetColor = Target color metadata only
```

## Changes

- `normalizeBallsToBall3` — Role-preserving SSOT (no color swap; no `target_center` emit)
- History snapshot write — `canonicalizeBallsStateForHistorySnapshot`
- History restore — Role hydrate (`balls.target` ← snapshot.target)
- Tests: `slotAutoRecommend.saveHistory.test.ts` (A–F)

## Explicitly NOT done

Search/Recall · trajectoryBuilder · Cue/C3+/Product/Coverage · dataset · migration

## Boundary impact (deferred Phase 4+)

Newly saved Role records + Role UI queries; Search still has `swapTargetSecond` / color-slot Product consumers may disagree until those Phases.

---

# 2026-08-25 (Role-based Ball3 Clean Cut — Phase 2 · UI Role semantics)

## Mode

**Agent** · Phase 2 UI only · no SAVE/Search/History/Product/C3+ semantic cut · no Commit/Push

## Contract (unchanged from Phase 1)

```text
balls.cue    = physical Cue (white)
balls.target = physical Target
balls.second = physical Second
FIELD NAME == PHYSICAL ROLE
targetColor = Target color metadata only
```

## UI changes

- INITIAL / paint / drag / joystick / Target Lock → Role fields
- paint: target=`targetColor`, second=`opposite(targetColor)`
- Lock: swap Role coordinates when Second is selected as Target
- `hydrateBallsStateForUi` → emits `balls.target` (not `target_center`)
- `toColorSlotBallsForLegacyTrajectory` bridge for trajectoryBuilder (geometry untouched)

## Explicitly NOT done

SAVE semantic · Search · History restore logic · Product/C3+/Coverage · dataset · migration

## Boundary impacts (deferred)

- SAVE via `normalizeBallsToBall3` will persist Role coords into Ball3 while Product/Search may still assume color-slots
- trajectoryBuilder remains color-slot native (App bridge only)

## Tests

`ballRole.ssot.test.ts` · `ballRole.uiSemantics.test.ts` · `slotAutoRecommend.test.ts` · related hydrate tests

---

# 2026-08-25 (Role-based Ball3 Clean Cut — Phase 1 · domain SSOT)

## Mode

**Agent** · Phase 1 only · domain foundation · no consumer migration · no Commit/Push

## Contract (canonical)

```text
balls.cue    = physical Cue (white)
balls.target = physical Target (red|yellow)
balls.second = physical Second (other object ball)
FIELD NAME == PHYSICAL ROLE
targetBall / targetColor = color metadata of physical Target only
Color ≠ Role — no color→field decoder in Ball3 SSOT
```

## Scope

- `ballRole.ts` — SSOT rewrite + canonical readers
- Color-slot / 3A-360C helpers kept as `@deprecated` DEFERRED DELETE (App / Product / Coverage still import)
- Unit: `ballRole.ssot.test.ts`
- Docs: TRAJECTORY_EXTENSION_SSOT §6.1 · MASTER · this LOG

## Explicitly NOT done

UI · SAVE · Search · History · trajectoryBuilder · Cue/C3+/Product/Coverage consumer role migration

## Note

3A-360C Product color-slot write remains in consumers until Phase 4. Canonical API: `placePhysicalSecondSampleOnRoleBall3` / `physicalSecondFromBall3`.

---

# 2026-08-25 (Phase 3A-360C — C3+ Product P → physical-second color-slot)

## Mode

**Agent** · Minimal Product write fix · color-slot Ball3 preserved · no dataset migration · no Commit/Push

## Hypothesis (confirmed by tests)

C3+ scoring sample P was always written to `balls.second` (red color-slot).
When `targetBall=red`, physical second is yellow → must write P to `balls.target`.
CASE B (`targetBall=yellow`) already matched the old write.

## Contract

```text
physical role → color-slot → Ball3 field
  targetBall=red    → physical second = yellow → balls.target = P ; balls.second = base red
  targetBall=yellow → physical second = red    → balls.second = P ; balls.target = base yellow
  targetBall missing → legacy: balls.second = P
```

Helpers: `placePhysicalSecondSampleOnBall3` / `readPhysicalSecondFromBall3` (`ballRole.ts`)
Coverage: `productCoverageFromDataset` reads physical second via `targetBall` (not raw `balls.second`).

## Tests

`ballRole.productSlot.test.ts` · `buildCueC3ProductMembers.test.ts` (CASE A/B + Search) · `productCoverageFromDataset.test.ts` · `unifiedDerivedReview.test.ts` — PASS

## Files

- `frontend/src/domain/ballRole.ts`
- `frontend/src/domain/ballRole.productSlot.test.ts`
- `frontend/src/domain/family/buildCueC3ProductMembers.ts` (+ test)
- `frontend/src/domain/family/productCoverageFromDataset.ts` (+ test)
- `작업관리/PROJECT_MASTER_INDEX.md` · this LOG

## Note

Existing LocalDB Products written before this fix still have CASE A collision until Re-Approve regenerates Product members. User datasets not auto-migrated.

---

# 2026-08-25 (Phase 3A-360A — APPROVED / History Product Coverage Display SSOT)

## Mode

**Agent** · Option B · Display only · Search / Product generator / datasets untouched · no Push

## Contract

```text
APPROVED / History Product Coverage Display
  = persisted Product member balls
  = LocalDB searchable Product coverage

cue coverage    ← unique Product.balls.cue   (active family + track)
second coverage ← unique Product.balls.second (active family + track)

NOT live buildTrajectory(current balls)
NOT re-scored C3+ polyline from current cue
```

Cue move after History does **not** move Product coverage markers.

## Cardinality

`ProductCount = T × Nc × N3` (dynamic). Fixture example 4×3×21=252 is not a global invariant (real export may be 4×4×18=288).

## Status

| Item | Result |
|------|--------|
| **PHASE** | **PASS** (auto tests) |
| Manual UI | Deferred → **3A-360B** |
| Search 2Rg | Unchanged (`9a5144a`) |
| Generator | Unchanged |

## Files

- `productCoverageFromDataset.ts` (+ tests)
- `App.jsx` · `DerivedCandidatePreviewLayer.jsx`
- MASTER · LOG · HANDOFF

## Next

3A-360B manual validation (History → coverage → Search)

---

# 2026-08-25 (Phase 3A-360 — LocalDB ADMIN Search Euclidean 2Rg Nearest-Ball3)

## Mode

**Agent** · SEARCH MATCHING ONLY · Product/generators/datasets untouched · no Push

## BEFORE → AFTER (`adminSearch`)

| | BEFORE | AFTER |
|--|--------|-------|
| Per-ball metric | Manhattan `\|dx\|+\|dy\|` | **Euclidean** `hypot(dx,dy)` |
| Per-ball cutoff | 5 | **2.0 Rg** |
| Aggregate ranking | L1 sum of 3 balls | **Σ Euclidean** of 3 balls |
| Aggregate cap | totalL1Cap 15 | **null** (per-ball gate only) |
| Soft UI warn | HARD_THRESHOLD_L1 14 | **ADMIN_SEARCH_SOFT_DISTANCE_WARN 4.0** |

## Contract

```text
candidate ⇔ dCue≤2 ∧ dTarget≤2 ∧ dSecond≤2  (Euclidean Rg)
winner    ⇔ min(dCue+dTarget+dSecond)
tie-break ⇔ targetBallMatch → positionId.localeCompare
```

Manual expectation: Cue/C3 sample spacing ≤3 Rg → midpoint ≤~1.5 → should match nearest sample when other balls also ≤2.

## Status

| Item | Result |
|------|--------|
| **PHASE** | **PASS** |
| Product 3A-360 | Unchanged |
| Tests | `adminSearchEuclidean2rg.test.ts` + recall parity + family regressions green |

## Files

- `recallCompare.ts` · `recallProfiles.ts` · `recallEngine.ts`
- `adminLocalDbFlow.ts` · `positionRecallTrace.ts`
- tests · MASTER · LOG · HANDOFF

## Next

Manual Admin LocalDB Search validation between derived markers

---

# 2026-08-25 (Phase 3A-360 — Cue × C3+ Cartesian Product Derived Data)

## Mode

**Agent** · Product durable orchestration · generators unchanged · no Push · datasets protected

## Product semantics (locked)

```text
balls.cue    = Cue→Impact sample coordinate
balls.second = C3+ scoring-line sample coordinate  (Review C3 candidate parks this on balls.cue)
balls.target = AUTHORED/SYMMETRY base target
trajectoryExtensions = base COPY
generatedFrom = AUTHORED/SYMMETRY base (no Cue→C3 chaining)
```

## Cardinality

`ProductCount = T × Nc × N3` · example fixture **4 × 3 × 21 = 252** (tests locked)

Review UI remains Cue∪C3 markers (e.g. 12+84=96 sample set). Durable Approve writes **Product-only** (not 96 union, not 348).

## Status

| Item | Result |
|------|--------|
| **PHASE 3A-360** | **PASS** |
| Exact packing | Unique Exact Ball3 per Product → new PositionRecord · 252 write **PASS** |
| Identity | `DERIVED_CUE_C3_PRODUCT` · `CUE_C3_CARTESIAN_PRODUCT_V1` · composite derivedStep |
| Approve | Product set ×1 write · commit ×1 (App unchanged path) |
| ALL NO_SB | Product 0 · Cue Review kept · Approve no-op write |
| 4-track | Cue/C3 count mismatch · fail-closed |
| Cue/C3 generators | Unchanged |

## Tests

`buildCueC3ProductMembers.test.ts` · `unifiedDerivedReview.test.ts` · family regressions — green

## Files

- `buildCueC3ProductMembers.ts` (+ test)
- `unifiedDerivedReview.ts` (+ test)
- `familyIdentity.ts` · `positionSearchEngine.ts` · `index.ts`
- MASTER · LOG · HANDOFF · FAMILY DRAFT

## Next

Manual Admin UI: SAVE → Unified Review markers → Approve → Product durable T×Nc×N3 · History/Recall

---

# 2026-08-24 (Phase 3A-359M — Derived Data Completion Documentation / SSOT Update)

## Mode

**Agent** · docs only · no production code · no dataset · no schema/SYS/generator · no Push

## Final product contract

**DERIVED DATA IMPLEMENTATION: COMPLETE**

| Lineage | Role | Status |
|---------|------|--------|
| **A. Cue→Impact** | 0.10 / 0.20 / 0.30 sampling · interactive white markers · Inspect | **COMPLETE** |
| **B. C3+ scoring-line** | Hybrid sampling · display-only markers · variable system Origin | **COMPLETE** |
| **Unified Derived Review** | One screen Cue ∪ C3+ · Cue interactive only · one Approve write/commit | **COMPLETE** |
| **Atomic 4-track consistency** | Semantic parity across AUTHOR/SYMMETRY · no partial C3+ | **COMPLETE** |
| **History / Recall / LocalDB** | Existing family writer / approval path · rematerialize | **PASS** (manual UI 2026-08-24) |

Generators remain **independent** (no merge · no Cue member as C3+ source · no Cue `0.30` on C3+ Hybrid). Presentation may combine markers. No new WRITE SSOT / SYS / unnecessary schema.

## Final user flow

```text
SAVE
  → 원본 AUTHOR/SYMMETRY 4-track 확정
  → Cue→Impact derived generation + C3+ derived generation
  → Unified Derived Review (same PreviewLayer: Cue markers ∪ C3+ markers)
  → Approve | Cancel

Approve: Cue∪C3+ approved members → writeFamilyMembers → commitDerivedApprovalDataset ×1
Cancel: discard pending review only · original SAVE kept · dataset unchanged
```

## Cue→Impact (unchanged contract)

- Sampling 0.10 / 0.20 / 0.30 · white interactive markers · virtual cue coords · Inspect · trajectory replay
- Marker meaning: Cue Ball progressing toward Impact

## C3+ scoring-line contract

- Scoring line = from after C3 through **first SB-hit segment endpoint** (not SB center cut)
- Endpoint ∈ { system cushion/node · Extension1 · Extension2 handle } — no auto-extend past E2 to projected C8
- Origin = last valid system node (not C6-fixed); variable tail C3→C4…C6 + optional E1/E2
- Hybrid sampling: preserve vertices / system nodes / E1 / E2-as-endpoint · adaptive interior · spacing ≤ 3 Rg · min samples ≥ 3 · **no** Cue `VALID_FRACTION=0.30`
- SB closest-point mandatory sample: **OPTIONAL / 미강제**
- Markers: **DISPLAY-ONLY** (no hit-test · no Inspect · no cue move · no Cue→marker trajectory / dashed line)

## Unified Review

`createUnifiedDerivedReview` → Cue create + C3+ create · markers Cue∪C3+ · interaction Cue only · Approve one write/commit

## 4-track consistency

Four tracks = one family under symmetry — semantic results must match (SB presence, system tail, EXT1/2, scoring endpoint kind, scoring-line meaning). One-track mismatch → **`FOUR_TRACK_INCONSISTENT`**: no C3+ session / partial members / writer. **ALL NO_SB** → C3+ skip (not error); Cue→Impact Review continues.

## Persistence

Reuse existing family writer / approval / History. Durable: sampled members, balls, strategy, trajectoryExtensions, lineage, derivedRule/Step, sourceSlot, etc. Runtime/recomputed: candidate path, corrected pathNodes, scoring line, SB hit segment, endpoint judgment. No new WRITE SSOT.

## Manual UI verification (2026-08-24) — PASS

1–11: SAVE · Derived Review · Cue 0.10/0.20/0.30 · C3+ markers · same-screen union · Cue Inspect · C3+ display-only · Approve · persist · History/Recall · 4-track — **end-to-end PASS**

## Phase 3A-359 series rollup

| Phase | Summary |
|-------|---------|
| **3A-359E** | Variable-End C3+ scoring-line / sampling contract audit |
| **3A-359F** | C3+ scoring derived member generator |
| **3A-359G** | Review/Approval integration audit |
| **3A-359H** | C3+ Review/Approval + atomic 4-track consistency |
| **3A-359I** | C3+ Review/Inspect display audit |
| **3A-359J** | C3+ Review display implementation |
| **3A-359K** | Unified Cue→Impact + C3+ Review audit |
| **3A-359L** | Unified Review implementation (`ba4d56c`) |
| **3A-359M** | Completion documentation / SSOT (this entry) |

## Final status

```text
PHASE 3A-359 DERIVED DATA: COMPLETE
```

Further derived-data feature work is **not required**. Next work starts as a **new independent Phase**.

## Docs touched

- `PROJECT_MASTER_INDEX.md` · `HISTORY/PROJECT_LOG_2026-08.md` · `CURSOR_SESSION_HANDOFF.md` · `FAMILY_DATA_ARCHITECTURE_DRAFT.md` (status pointers)

## Code / dataset

**No** production code · dataset · schema · SYS · generator changes in 359M.

---

# 2026-08-24 (Phase 3A-359L — Unified Cue→Impact + C3+ Derived Review)

## Mode

**Agent** · presentation orchestration + atomic approval · generators separate · no Push · datasets protected

## Status

| Item | Result |
|------|--------|
| **PHASE 3A-359L** | **PASS** |
| SAVE flow | Cue create + C3+ create → one Unified Review |
| Markers | Both sets; Cue interactive; C3+ display-only |
| Hit-test | `getUnifiedInteractiveMembers` = Cue only |
| Approve | `writeFamilyMembers(cue∪c3)` + `commitDerivedApprovalDataset` ×1 |
| Cancel | pending discard; original SAVE kept |
| NO_SB | Cue-only Review + toast |
| INCONSISTENT | Cue-only + alert; no C3+ members/write |
| Case D (Cue fail) | fail-closed; no C3+-only Review |

## Tests

`unifiedDerivedReview.test.ts` + regressions — suite green

## Files

- `unifiedDerivedReview.ts` (+ test)
- `App.jsx` · Overlay title `Derived Review`
- MASTER INDEX · PROJECT_LOG

## Next

Manual Admin verification of unified markers / display-only C3+

---

# 2026-08-24 (Phase 3A-359J — C3+ Review / Inspect Display Integration)

## Mode

**Agent** · App open feedback + pathNodes capture + Inspect extension draft clear · no generator change · no Push · datasets protected

## Status

| Item | Result |
|------|--------|
| **PHASE 3A-359J** | **PASS** |
| Marker | Existing `DerivedCandidatePreviewLayer` + `balls.cue` (no new renderer) |
| HUD | `C3+ Scoring Review` · `data-derived-review-kind=C3_PLUS` |
| Open feedback | `classifyC3PlusReviewOpen` — NO_SB toast vs consistency/pathNodes alert |
| pathNodes | Capture at Cue open + refresh before C3+ open |
| Inspect draft | Sync/clear `trajectoryExtensionDraft` from candidate payload |
| Generator / 4-track / 0.30 | Unchanged |

## Tests

`c3PlusDerivedReview.test.ts` (+359J display contracts) · Cue/derived regressions — **138 PASS** in suite run

## Files

- `App.jsx` · `DerivedReviewOverlay.jsx`
- `c3PlusDerivedReview.ts` (`classifyC3PlusReviewOpen`) · test
- MASTER INDEX · PROJECT_LOG

## Next

Manual Admin UI verification · optional scoring-line overlay polish

---

# 2026-08-24 (Phase 3A-359H — C3+ App Review/Approval + 4-Track Atomic Consistency)

## Mode

**Agent** · App wiring + atomic 4-track validation · no new WRITE SSOT · no Push · datasets protected

## Status

| Item | Result |
|------|--------|
| **PHASE 3A-359H** | **PASS** |
| App trigger | After Cue→Impact Approve/Cancel → `createC3PlusDerivedReview` (separate create) |
| Atomic rule | Partial track success **forbidden**; mixed NO_SB / EXT mismatch → `FOUR_TRACK_INCONSISTENT` |
| All NO_SB | Family skip (no session) |
| Four-track extensions | SYMMETRY gets **transformed** `trajectoryExtensions` (no DROP) |
| Writer | `familyWriteCandidateFromEntry` preserves extensions / reflectionOverride |
| HUD | `C3+ Scoring Review` vs Cue→Impact title |
| Cue→Impact | Unchanged generator / 0.30; no mix into Cue create |

## Tests

`c3PlusDerivedReview.test.ts` — **14 PASS** (A–M coverage)
Regression suite (family + Cue review + derived approval + 359C/F): **178 PASS**

## Files (new/updated)

- `c3PlusFourTrackConsistency.ts` · `c3PlusDerivedReview.ts` (+ test)
- `generateFourTrackMembers` · `trackSymmetry` (transform helpers)
- `familyAwareWriter` (candidate ← entry extensions)
- `App.jsx` · `DerivedReviewOverlay.jsx`
- `cueImpactDerivedReview` (kind + C3+ marker labels)
- docs: MASTER INDEX · PROJECT_LOG

## Next

Optional scoring-line highlight in Inspect · product UX polish

---

# 2026-08-24 (Phase 3A-359F — C3+ Scoring Derived Generator)

## Mode

**Agent** · generator + focused tests · no UI · no schema rewrite · no Push · datasets protected

## Status

| Item | Result |
|------|--------|
| **PHASE 3A-359F** | **PASS** |
| Scoring path | Variable: C3 → system Origin tail → EXT1? → EXT2? |
| Origin | Not forced to C6 (`min(chain, sameRail)`) |
| SB rule | First hit segment; full segment to endpoint; no cut at SB center |
| E2 end | Handle endpoint when SB on E1→E2 (no projected C8) |
| No SB | `NO_SB_HIT` fail-closed |
| Sampling | Hybrid · spacing≤3 · min≥3 · **no** VALID_FRACTION 0.30 |
| SB closest sample | **Not** mandatory |
| derivedRule | `C3_PLUS_SCORING_LINE_v1` (not 2Rg) |
| trajectoryExtensions | **COPY** on derived members |
| Cue clamp | Family ball-center inset when sample on rail |

## Tests

`generateC3PlusScoringDerivedMembers.test.ts` — **17 PASS**
Regressions: Cue→Impact 31 · familyIdentity 31 · familyAwareWriter 16 · 359C cushions 13 — **all green** (108 total in suite run)

## Files (new/updated)

- `frontend/src/domain/family/c3PlusScoringPath.ts`
- `frontend/src/domain/family/sampleC3PlusScoringLine.ts`
- `frontend/src/domain/family/generateC3PlusScoringDerivedMembers.ts` (+ test)
- `frontend/src/domain/trajectory/hitToleranceRg.ts`
- `familyAwareWriter` · `familyIdentity` · `positionSearchEngine` · `family/index` (minimal)

## Next

C3+ review/approval UI wiring (optional) · App pathNodes DI into generator · sampling product polish

---

# 2026-08-24 (Phase 3A-359C — Manual Extension C7/C8 Geometry Helper)

## Mode

**Agent** · read-only geometry helper + focused tests · no C3+ generator · no UI · no schema change · no Push

## Status

| Item | Result |
|------|--------|
| **PHASE 3A-359C** | **PASS** |
| Helper | `deriveManualExtensionCushions` |
| C7 | E1 rail-normalized (fail-closed if not recoverable rail) |
| C8 | Manual direction C7→E2 → first next cushion (`findNextCushionHit` policy) |
| SYS scalars C7/C8 | **NOT** created |
| Auto reflection / reverse-spin | **NOT** implemented |
| Durable storage of C7/C8 | **NOT** — derived only |
| trajectoryExtensions schema | **unchanged** |
| Protected user datasets | **untouched** |

## Product rules locked

- SYS ends at C6
- E1 → C7 (physical Rg cushion)
- E2 → post-C7 manual direction → derived C8
- C6→C7 kept for future scoring even if cue would stop earlier (energy not modeled here)
- No mirror / spin / SYS extrapolation

## Tests

`frontend/src/domain/trajectoryExtension/deriveManualExtensionCushions.test.ts` — **13 PASS**
Regression smoke: `trajectoryPathDisplayPolicy.test.ts` — **22 PASS**

## Files

- `frontend/src/domain/trajectoryExtension/deriveManualExtensionCushions.ts` (new)
- `frontend/src/domain/trajectoryExtension/deriveManualExtensionCushions.test.ts` (new)
- `frontend/src/domain/trajectoryExtension/index.ts` (export)

## Next

C3+ scoring trajectory derived generator may consume this helper read-only (Ask/Agent follow-on). UI C7/C8 markers deferred.

---

# 2026-08-23 (Phase 3A-358 — FINAL DERIVED CUE-IMPACT E2E VERIFICATION)

## Mode

**Ask / Agent (doc-only)** · verification record · production/dataset/localStorage **unchanged**

## Final status

| Item | Result |
|------|--------|
| **PHASE 3A-358** | **PASS** |
| **Q7 LOCALDB HIT IDENTITY** | **VERIFIED** |
| Production code modified | **NO** |
| Dataset modified by verification | **NO** |

## Verification flow

1. Authored dataset SAVE → History **v001**
2. Cue→Impact derived approval
3. 10% / 20% / 30% derived records → approved corpus → History **v002**
4. User DevTools: v001 records = **112** · v002 = **124** · delta = **+12**
5. +12 = **4 source × {0.1, 0.2, 0.3}** derived steps
6. LocalDB recall near ~30% Cue position
7. `[RECALL_RESULT]` winner metadata confirmed directly

## Final LocalDB winner evidence

| Field | Value |
|-------|--------|
| positionId | `203174220360700390` |
| slot | S1 |
| memberOrigin | `DERIVED_CUE_IMPACT` |
| derivedRule | `CUE_IMPACT_FIRST_30PCT` |
| derivedStep | `cue_impact:t:0.300000` |
| cue (Exact) | ≈ (20.321164872848954, 17.36227996072103) |
| LocalDB query cue | ≈ (20.3, 17.5) |
| distance (Ball3 L1) | ≈ 0.18121729433007516 |

## Judgment

LocalDB trajectory was not merely “similar to authored.” The selected winner itself is the **DERIVED_CUE_IMPACT / 30%** record, proven via `[RECALL_RESULT]` metadata. Prior 3A-358 Q7 **PARTIAL / NOT PROVEN** is closed as **VERIFIED**.

## E2E verified chain

authored SAVE → v001 History → derived approval → 10/20/30 Cue→Impact generation → approved corpus / v002 History → LocalDB working-corpus search → exact 30% derived winner recall

## Next

**PHASE 3A-359** — C3 이후 파생 데이터 생성/저장 설계 및 구현 검토

---

# 2026-08-22 (Phase 3A-349 — Controlled Normalized READ Flag Enable)

## 제목

**Production default: FAMILY_NORMALIZED_STORAGE_ENABLED false → true (gated READ only)**

## Mode

**Agent** · minimal production change · Commit/Push 없음

## Status

**PASS** · CONTROLLED FLAG ENABLE IMPLEMENTED = **YES**

## Change

| Item | Before | After |
|------|--------|--------|
| `FAMILY_NORMALIZED_STORAGE_ENABLED` | `false` | **`true`** |
| Eligibility gate | flag ∧ fresh ∧ rematerialize | **unchanged** |
| WRITE SSOT | `positions_dataset` | **unchanged** |
| Flag OFF rollback | legacy | **preserved** (test override + reason `flag_off`) |

## Architecture

| Invariant | Result |
|-----------|--------|
| WRITE SSOT | positions_dataset |
| Generation authority | positions_dataset_meta |
| family_* | shadow |
| SearchIndex | not required |
| Full H3 | deferred |
| F12 residual | generation-aligned content drift theoretically possible (not addressed) |

## Files

**Production:** `familyNormalizedFlag.ts` (+ comment drift fixes in schema/sync/migrate/freshness/index/loadProductionCompatibleDataset)

**Tests:** isolation for default ON · explicit OFF rollback · parity A0 default-ON path · related flag assertions

**Docs:** INDEX · LOG · DRAFT

## Tests

**23 files / 312 PASS / 0 FAIL** (baseline 311 + 1 default-ON parity case)

## Next

Ask-only: Post-enable final audit before Commit/Push.

---

# 2026-08-22 (Phase 3A-348 — Final Controlled Flag-Enable Re-Audit)

## Mode

**Ask** · audit only · no code/flag change

## Status

**PASS** · CONTROLLED FLAG ENABLE = **GO** · Choice **A**

## Evidence

G1–G20 ALL PASS · live regression 23/311 PASS · ROLLBACK TRUE→FALSE SAFE = YES

## Next

Agent: Phase 3A-349 Controlled Flag Enable (implemented below).

---

# 2026-08-22 (Phase 3A-347 — Production Parity Regression Completion)

## 제목

**Close 3A-346 CONDITIONAL gaps with production-path parity regressions (test-only)**

## Mode

**Agent** · TEST-ONLY · production algorithm **unchanged** · Commit/Push 없음 · flag enable **NOT** performed

## Status

**PASS** · PRODUCTION PARITY REGRESSION COMPLETION = **PASS** · Choice **A** (ready for final controlled flag-enable re-audit)

## Gaps closed (were 3A-346 PARTIAL / NOT PROVEN)

| Gap | Result |
|-----|--------|
| ADMIN LocalDB actual path (`runAdminLocalDbRecall` + `applyPositionRecall`) S2 | **PROVEN** |
| ADMIN LocalDB activeSlot S3 | **PROVEN** |
| preferredAuthoredSlot S3 → sourceSlot → rematerialize | **PROVEN** |
| Recall S2 → edit → SAVE → reload | **PROVEN** (sibling S1 preserved) |
| Recall S3 → edit → SAVE → reload | **PROVEN** (S1/S2 preserved) |
| Approval → reload → rematerialize | **PROVEN** |
| Import → reload → rematerialize | **PROVEN** |
| Reload determinism (+ member order permutation) | **PROVEN** |
| Meta regeneration on SAVE (placeholder not durable) | **PROVEN** |
| Fail-closed + flag-off rollback | **PROVEN** |

## Files

**New:** `frontend/src/application/flows/productionParity.347.contract.test.ts`

**Production code:** **none** changed in this phase

## Tests

- Parity file: **1 / 12 PASS**
- Related suite: **23 files / 311 PASS / 0 FAIL** (family + persist/dual-write/Approval/saveFlow/H3/preserve + 347)

## Invariants preserved

| Item | Value |
|------|--------|
| WRITE SSOT | `positions_dataset` |
| Generation authority | `positions_dataset_meta` |
| family_* | shadow |
| Flag default | **false** |
| Flag enabled | **NO** |
| SearchIndex | not required |
| Full H3 | deferred |

## Next

Ask-only: Controlled Flag-Enable **Final Re-Audit**. Do **not** flip `FAMILY_NORMALIZED_STORAGE_ENABLED` default in that audit unless explicitly approved.

---

# 2026-08-22 (Phase 3A-346 — Production Semantic Parity Re-Audit)

## Mode

**Ask** · audit only

## Status

**CONDITIONAL** — packing / identity / fail-closed PASS; ADMIN LocalDB E2E · S2/S3 recall→edit→SAVE · preferred S3 · Approval/Import reload · determinism/meta **PARTIAL or NOT PROVEN** → closed by **3A-347**.

---

# 2026-08-22 (Phase 3A-345 — PositionRecord Rematerialization + sourceSlot)

## 제목

**Exact-ball packing restored via FamilyMember.sourceSlot (schema v2)**

## Mode

**Agent** · IMPLEMENTED (uncommitted) · Commit/Push 없음 · flag enable **NOT** performed

## Status

**COMPLETE**. Phase 3A-343/344 STOP-B addressed for projection invertibility.

## Contract

| Item | Value |
|------|--------|
| `FamilyMember.sourceSlot` | required `S1\|S2\|S3` packing provenance |
| Schema | **v1 → v2** |
| Old schema / missing sourceSlot | freshness/eligibility fail → legacy READ |
| Rematerialize | Exact balls → one PositionRecord · `strategies[sourceSlot]` |
| Slot collision | fail-closed (no overwrite / no fan-out) |
| WRITE SSOT | still `positions_dataset` |
| Flag default | **false** · controlled enable **NOT** performed |

## Files

**New:** `rematerializeFamilyPartsToPositionRecords.ts` · `rematerializeFamilyParts.contract.test.ts`

**Modified:** `familyNormalizedSchema.ts` · `familyHydrate.ts` · `familyNormalizedStore.ts` · `loadFamilyCompatibleDataset.ts` · related fixtures/tests · INDEX / LOG / DRAFT

## Tests

**22 files / 299 PASS** (family + persist/dual-write/Approval/saveFlow/H3/preserve + rematerialize A–J).

## Next

Ask-only: Production Semantic Parity & Controlled Flag-Enable **Re-Audit**. Do not flip flag default.

---

# 2026-08-22 (Phase 3A-342 — Gated Normalized READ Implementation)

## 제목

**Production READ gate: flag ∧ freshness ∧ hydration → else positions_dataset**

## Mode

**Agent** · IMPLEMENTED (uncommitted) · Commit/Push 없음

## Status

**COMPLETE**. Phase 3A-341 contract implemented on production READ boundary.

## Contract

| Case | Source |
|------|--------|
| flag OFF (default) | `positions_dataset` (legacy) |
| flag ON + fresh + hydrate OK | normalized PositionRecord-compatible projection |
| flag ON + stale / missing / partial / invalid / schema / hydrate fail / exception | legacy fallback |
| READ failure | **no** corpus / generation / family mutation · **no** auto rebuild |

## Eligibility

```
normalizedReadEligible =
  isFamilyNormalizedStorageEnabled()
  AND evaluateNormalizedCorpusFreshness().fresh
  AND loadFamilyCompatibleDataset().ok
```

## Result

- App startup uses `loadProductionCompatibleDataset().dataset`
- WRITE SSOT remains `positions_dataset` + meta
- `family_*` remains synchronized shadow
- flag default **false**
- SearchIndex **not** required · Full H3 **DEFERRED**
- preserve_dataset / transitional H3 / 3A-335 persist unchanged

## Files

**New:** `loadProductionCompatibleDataset.ts` · `loadProductionCompatibleDataset.contract.test.ts`

**Modified:** `App.jsx` (startup READ) · `familyNormalizedFlag.ts` (test override) · `familyNormalizedStore.ts` (stale comment) · `family/index.ts` · INDEX / this LOG / DRAFT

## Tests

**11 files / 132 PASS** (gated READ contract 20 + related regressions) · `saveFlow.sysIdentity` also green.

## Architecture

- production corpus SSOT = `positions_dataset`
- optional READ projection ≠ durable authority
- READY FOR CONTROLLED FLAG-ENABLE AUDIT (Ask) — not auto-enable

## Next

Ask-only: controlled flag-enable audit. Not Full H3. Do not set flag default true.

---

# 2026-08-22 (Phase 3A-339 — Cleanup / preserve_dataset Policy Implementation)

## 제목

**preserve_dataset keeps positions + generation meta; deletes family shadow**

## Mode

**Agent** · IMPLEMENTED (uncommitted) · Commit/Push 없음

## Status

**COMPLETE**. Phase 3A-338 policy implemented.

## Contract

| Key | preserve_dataset |
|-----|------------------|
| `positions_dataset` | **KEEP** |
| `positions_dataset_meta` | **KEEP** |
| `family_masters` / `family_members` | **DELETE** |
| `workspace_history` | DELETE (unchanged) |
| `ONE_POINT_LESSON_LIBRARY_V1` | KEEP (unchanged) |

## Reason

`positions_dataset_meta` is generation **authority** paired with production corpus. Deleting it on preserve caused N→missing→1 reset and `LEGACY_MARKER_MISSING`. Family remains disposable normalized shadow while READ is legacy.

## Result

- generation N survives cleanup
- cleanup freshness = `NORMALIZED_MISSING` (not `LEGACY_MARKER_MISSING`)
- next SAVE/Approval/Import → N+1 + dual-write rebuild → fresh=true
- clear_all / ADMIN·USER Reset / History delete / transitional H3 unchanged
- lesson category preserve pair **DEFERRED**

## Files

**New:** `frontend/src/hooks/workspaceCleanup.preserveDataset.contract.test.ts`

**Modified:** `useSettings.js` (preserve list) · `normalizedDualWrite.test.ts` (call production cleanup) · INDEX / this LOG / DRAFT

## Tests

**10 files / 112 PASS** (prior 101 + 11 new cleanup contract).

## Architecture

- production SSOT = `positions_dataset`
- normalized READ **OFF** · flag **false** · SearchIndex untouched · Full H3 **DEFERRED**

## Next

Ask-only: next prerequisite audit (gated READ / SearchIndex later). Not Full H3.

---

# 2026-08-22 (Phase 3A-338 — Cleanup / preserve_dataset Family Shadow Policy Audit)

## 제목

**Ask-only: what must preserve_dataset keep for generation/freshness + H3?**

## Mode

**Ask** · AUDIT ONLY · no implementation

## Verdict

| Item | Result |
|------|--------|
| CLEANUP POLICY CHANGE REQUIRED | **YES** |
| CURRENT preserve_dataset | **SAFE-BUT-INCOMPLETE** (meta DELETE) |
| FAMILY_* PRESERVE POLICY | **DELETE** |
| POSITIONS_DATASET_META PRESERVE | **YES** |
| Ready for implementation | **YES** → 3A-339 |

## Next

Agent: Phase 3A-339 implement preserve list + regressions.

---

# 2026-08-22 (Phase 3A-337 — Transitional History H3 Contract Hardening)

## 제목

**Lock transitional History contract: restore ≠ Member DB rollback**

## Mode

**Agent** · IMPLEMENTED (uncommitted) · Commit/Push 없음

## Status

**TRANSITIONAL H3 HARDENING COMPLETE**. **FULL H3 DEFERRED** (workspace/corpus storage split not introduced).

## Purpose

Regression-fix the 3A-336 transitional contract without implementing Full H3:

- History = workspace snapshot ≠ Member DB
- restore leaves `family_*` untouched
- restore advances legacy `corpusGeneration` → freshness false
- restore → SAVE / Approval may resync shadow → freshness true
- Approval History **+1 KEEP**
- 3A-335 false-fresh safety unchanged

## Files

**New:** `frontend/src/application/flows/historyTransitionalH3.contract.test.ts`

**Modified (minimal):** `useSettings.js` (transitional H3 comment) · INDEX / this LOG / DRAFT pointers

## Production behavior

No intentional runtime contract change — behavior already matched 3A-336; tests lock it.

## Tests

Related suite: **9 files / 101 PASS** (incl. new H3 contract + 3A-335 persist + freshness + dual-write + Approval + SAVE family + load/migrate).

## Explicitly deferred (Full H3)

`workspace_dataset` / active `workspace_current` persistence · workspaceGeneration · positions SSOT demotion · normalized READ · flag ON · SearchIndex

## Next

Ask-only: cleanup / `preserve_dataset` `family_*` policy audit. **Not** Full H3 · **not** gated READ.

---

# 2026-08-22 (Phase 3A-336 — History H3 Full Contract Audit)

## 제목

**Ask-only: is Full H3 required now, or is transitional Member protection enough?**

## Mode

**Ask** · AUDIT ONLY · no implementation

## Verdict

| Item | Result |
|------|--------|
| H3 CONTRACT REQUIRED | **YES** (eventually) |
| Transitional Member protection | **SAFE** (restore does not overwrite `family_*`) |
| Partial / transitional hardening | **READY** → done in 3A-337 |
| Full H3 | **DEFERRED** — needs workspace vs durable corpus storage split |
| Production SSOT | remains `positions_dataset` |

## Central contradiction (documented, not fixed in 337)

`positions_dataset` is both workspace restore target **and** production corpus SSOT → restore overwrites durable legacy corpus, but **not** persistent Member shadow.

## Next

Agent: Phase 3A-337 transitional hardening (tests). Full H3 deferred.

---

# 2026-08-22 (Phase 3A-335 — Generation Metadata Failure-Safety Patch)

## 제목

**Close false-fresh window: invalidate → positions → generation commit**

## Mode

**Agent** · IMPLEMENTED (uncommitted) · Commit/Push 없음

## Status

**COMPLETE**. Phase 3A-333 FINAL CLOSURE **APPROVED**. False-fresh on meta-write failure **CLOSED**.

## Root cause (3A-334)

positions write success + `positions_dataset_meta` bump failure left old gen on meta+family → `fresh=true` with new content.

## Fix

`persistPositionsDatasetWithGeneration`:

1. read previousGeneration (memory)
2. invalidate/remove meta (abort mutation if invalidate fails)
3. write `positions_dataset`
4. write next corpusGeneration (from in-memory previous+1)
5. caller syncs shadow only when ok

## Files

**New:** `persistPositionsDatasetWithGeneration.ts` (+ test)

**Modified:** saveFlow · derivedApprovalFlow · App Import · useSettings History restore · dual-write/freshness related tests · INDEX/LOG/DRAFT pointers

## Tests

18 files / **246** PASS (incl. T1 exact 3A-334 defect injection).

## Next

Ask: History H3 (3A-336) · then transitional harden (3A-337) · cleanup `family_*`. Not gated READ.

---

# 2026-08-22 (Phase 3A-333 — Generation/Freshness Contract Implementation)

## 제목

**Durable corpusGeneration linkage — positions_dataset_meta ↔ family_* envelopes**

## Mode

**Agent** · IMPLEMENTED (uncommitted) · Commit/Push 없음

## Status

**COMPLETE** for generation/freshness contract scope. Production READ still `positions_dataset`. Flag **false**. Normalized primary READ **disabled**.

## Purpose

Prove whether normalized shadow was produced from the **same latest** durable working corpus generation as `positions_dataset` (schema-valid ≠ fresh).

## Model

| Item | Value |
|------|--------|
| Type | monotonic integer `corpusGeneration` (≥ 1) |
| Authority | legacy `positions_dataset_meta` after successful positions write |
| Shadow stamp | `family_masters.corpusGeneration` + `family_members.corpusGeneration` |
| Freshness | all three equal + `validateFamilyStore` ok |
| Marker missing | **ineligible** (never treat as fresh) |

## Files

**New**

- `frontend/src/domain/dataset/infra/positionsDatasetMeta.ts`
- `frontend/src/domain/family/familyCorpusFreshness.ts`
- `frontend/src/domain/family/familyCorpusFreshness.test.ts`

**Modified**

- `familyNormalizedSchema.ts` · `familyNormalizedStore.ts` · `syncPositionDatasetToNormalizedFamilyStore.ts`
- `familyNormalizedFlag.ts` (comment) · `index.ts`
- `saveFlow.ts` · `derivedApprovalFlow.ts` · `App.jsx` (Import) · `useSettings.js` (History restore gen bump only)
- `normalizedDualWrite.test.ts` · migration/compat test persist call sites
- `PROJECT_MASTER_INDEX.md` · this LOG · `FAMILY_DATA_ARCHITECTURE_DRAFT.md` (CURRENT pointer)

## Mutation integration

| Path | Legacy gen bump | family gen stamp | Notes |
|------|-----------------|------------------|-------|
| SAVE | YES | YES (on sync ok) | History +1 unchanged |
| Approval | YES | YES | History +1 unchanged |
| Import | YES | YES | |
| History restore | YES | **NO** | intentional divergence · not full H3 |

## Tests

Family + related flows: **16 files / 238 tests PASS** (incl. freshness + dual-write).

## NOT done

cleanup `family_*` preserve · H3 full · SearchIndex · gated READ · Approval +0 · Export · fingerprint

## Next

Ask-only: History H3 · cleanup `family_*`. **Not** gated READ.

---

# 2026-08-20 (Phase 3A-326 — Normalized Dual-Write Complete)

## 제목

**Normalized Shadow Dual-Write — SAVE / Derived Approval / Import**

## Mode

**Agent** · IMPLEMENTED (uncommitted) · Commit/Push 없음

## Status

**COMPLETE** for shadow dual-write scope. Production READ still `positions_dataset`. Flag **false**. Normalized primary READ **disabled**.

## Purpose

Keep `family_masters` / `family_members` in sync after production mutations, without switching READ off of `positions_dataset`.

## Files

**New**

- `frontend/src/domain/family/syncPositionDatasetToNormalizedFamilyStore.ts`
- `frontend/src/domain/family/normalizedDualWrite.test.ts`

**Modified**

- `frontend/src/application/flows/saveFlow.ts`
- `frontend/src/application/flows/derivedApprovalFlow.ts`
- `frontend/src/App.jsx` (Import path)
- `frontend/src/domain/family/index.ts`

## Shared pipeline

`syncPositionDatasetToNormalizedFamilyStore(dataset)`
→ `migratePositionRecordsToFamilyParts`
→ `persistMigratedFamilyParts`
→ `validateFamilyStore`

## Call graphs

| Path | Behavior |
|------|----------|
| **SAVE** | legacy save first → normalized shadow sync → History **+1** unchanged |
| **Derived Approval** | legacy approved dataset write → normalized shadow sync → baseline runtime restore → History **+1** unchanged |
| **Import** | legacy working dataset write → normalized shadow sync |

## Failure policy

- Legacy write succeeds first.
- Normalized failure must **not** rollback `positions_dataset`.
- While legacy READ is primary, normalized shadow failure is **non-catastrophic**.
- Prior valid shadow remains if persist not reached; diagnostics via result / `console.warn`.

## Verified

| Path | Result |
|------|--------|
| SAVE | 1 Master + 4 Members (representative) |
| Approval | legacy Derived count == normalized Derived count · lineage preserved · History exactly **+1** |
| Import | 4-track + handcrafted 16-member / 12-Derived fixture |
| History | SAVE **+1** · Approval **+1** · Cancel **+0** — unchanged |

## Production impact

| Item | State |
|------|--------|
| `positions_dataset` | **Production corpus SSOT** |
| `family_*` | **Normalized shadow** |
| Flag | `FAMILY_NORMALIZED_STORAGE_ENABLED = false` |
| Normalized primary READ | **OFF** |
| Search / Export / geometry / HPT / symmetry / Physical Target | **unchanged** |

## Tests (historical at completion)

**75/75** across 6 files (incl. `normalizedDualWrite.test.ts`).

## Remaining blockers (before normalized READ)

1. generation / freshness marker
2. History restore **H3**
3. cleanup / `preserve_dataset` `family_*` preservation
4. SearchIndex
5. gated normalized READ

Approval History **+1** removal still **BLOCKED**.

## Next

Ask-only: generation marker + History H3 + cleanup `family_*` prerequisite audit. **Not** gated READ implementation.

## Working tree

기존 uncommitted Phase 3A 보존. Commit/Push 없음.

---

# 2026-08-20 (Phase 3A-325 — B6 Gated-Read Pre-Implementation Audit)

## 제목

**B6 Production Dual-Read / Gated-Read Pre-Implementation Audit**

## Mode

**Ask** · documentation / decision only · no code change in this phase

## Verdict

**PRODUCTION NORMALIZED READ = BLOCKED.**

## Why blocked

At audit time, `family_*` stores were **not** updated by production mutation paths:

- SAVE
- Derived Approval
- Import
- History restore

Enabling flag / reading normalized first would risk **stale** `family_*` and lose latest `positions_dataset` changes.

## Current production SSOT (then and through 3A-326 READ policy)

| Layer | Role |
|-------|------|
| `positions_dataset` | Production corpus SSOT |
| React `dataset` | Runtime mirror |
| `workspace_history` | Workspace snapshots |
| `family_masters` / `family_members` | Shadow infrastructure only (pre–dual-write at audit; dual-write landed in 3A-326) |

## Decision

Normalized READ **after** dual-write. Dual-write scope: **SAVE + Derived Approval + Import**. Legacy READ primary. Flag **OFF**.

SearchIndex is **not** a dual-write prerequisite (Members hold 3-ball; Index rebuildable later).

## Discoveries

- **Generation / freshness marker** required before trusting schema-valid normalized store as current.
- **History H3**: restore workspace without rolling back persistent Members.
- **Cleanup**: `preserve_dataset` may delete `family_*` keys outside preserve list — policy needed before READ.

## Recommended sequence

1. migration infra — DONE (323)
2. compatibility read adapter — DONE (324)
3. dual-write SAVE + Approval + Import — NEXT at audit → DONE (326)
4. generation / freshness marker
5. cleanup / reset policy for `family_*`
6. History restore contract (H3)
7. SearchIndex + rebuild
8. gated normalized read
9. legacy retirement

## Next

Phase 3A-326 dual-write Agent.

---

# 2026-08-20 (Phase 3A-324 — B5 Compatibility Read Adapter)

## 제목

**B5 Compatibility Read Adapter**

## Mode

**Agent** · IMPLEMENTED (uncommitted) · Commit/Push 없음

## Purpose

Load validated normalized store → hydrate → `PositionRecord[]` compatible dataset. No App production wiring.

## Files

**New**

- `frontend/src/domain/family/loadFamilyCompatibleDataset.ts`
- `frontend/src/domain/family/loadFamilyCompatibleDataset.test.ts`

**Modified**

- `frontend/src/domain/family/index.ts`

## API

- `loadFamilyCompatibleDataset()` — from localStorage envelopes
- `hydrateFamilyPartsToCompatibleDataset(...)` — in-memory helper

## Pipeline

load Master envelope → load Member envelope → schemaVersion check → `validateFamilyStore` → hydrate each Member with its Master → `PositionRecord[]`.

Valid store → `source = normalized`. Invalid/corrupt → `ok:false` + issues. **No partial** normalized dataset.

## Fail-closed

orphan · schema mismatch · FK mismatch · forbidden Member common payload · corrupt JSON · missing Master · map-key/memberId conflict.

## Contracts

- 3-ball exact numeric preservation
- AUTHORED / SYMMETRY / DERIVED_CUE_IMPACT provenance preserved
- Fixture: 1 Master + 16 Members → 16 hydrated records

## Production impact

`positions_dataset` · `workspace_history` · SAVE/Approval · Search · Export/Import — **unchanged**. Flag **false**. No App.jsx wiring.

## Tests (at completion)

loadFamilyCompatibleDataset **16/16** · migration **16/16** · storage **12/12** · derivedApproval **10/10** · **Total 54/54**.

## Next

3A-325 gated-read pre-audit (Ask).

---

# 2026-08-20 (Phase 3A-323 — B1–B4 Migration Infrastructure)

## 제목

**B1–B4 Migration Infrastructure**

## Mode

**Agent** · IMPLEMENTED (uncommitted) · Commit/Push 없음

## Files

**New**

- `frontend/src/domain/family/migratePositionRecordsToFamilyParts.ts`
- `frontend/src/domain/family/migratePositionRecordsToFamilyParts.test.ts`

**Modified**

- `frontend/src/domain/family/index.ts`
- `frontend/src/domain/family/familyNormalizedStore.ts` (`persistMigratedFamilyParts`)

## API

`migratePositionRecordsToFamilyParts(dataset)` returns either:

- `ok:true` · masters · members · familyCount · memberCount · skippedLegacySlots
- `ok:false` · issues

## Master seed

Exactly one validated **AUTHORED** per family.

| Issue | When |
|-------|------|
| `NO_AUTHORED_SEED` | no AUTHORED |
| `MULTIPLE_AUTHORED_SEEDS` | multiple distinct AUTHORED |
| `COMMON_PAYLOAD_CONFLICT` | conflicting common payload |

No invented Master. No silent merge.

## Member

- Physical PK: `memberId`
- Logical dedup: `genericFamilyMemberIdentityKey`
- same logical key + different memberId → reject
- same memberId + incompatible payload → reject

## Derived lineage preserved

`DERIVED_CUE_IMPACT` · `generatedFromMemberId` · `derivedRule` · `derivedStep` · `track` · IDs.

## Fixture / idempotency

1 Master + 16 Members (12 Derived). Idempotency verified.

## Legacy

`positions_dataset` unchanged · `workspace_history` unchanged · flag **false**.

## Tests (at completion)

migration **16/16** · storage **12/12** · derivedApproval **10/10**.

## Next

3A-324 B5 compatibility read.

---

# 2026-08-20 (Phase 3A-322 — Phase B Migration & Compatibility Read Audit)

## 제목

**Phase B Migration & Compatibility Read Audit**

## Mode

**Ask** · decision only · no production switch

## Verdict

Phase B **infrastructure-only** implementation is **SAFE**. Production read/write switch **forbidden**.

## Migration source (allowed)

`positions_dataset` / working React dataset / explicit Import.

## Forbidden

Use `workspace_history` as Member DB or bulk migration source.

## Master seed

AUTHORED preferred/required. No AUTHORED → fail/quarantine. Conflicting common payload → fail/quarantine. Silent merge forbidden. familyId-only dedup **FORBIDDEN**.

## Member identity

- PK: `memberId`
- Logical: `genericFamilyMemberIdentityKey`

## 3-ball

cue / target / second — exact numeric preservation. No rounding / interpolation / Fg–Rg conversion in migration.

## History / Approval

History restore should not delete `family_*` (direction for later H3). Approval History **+1** **KEEP**.

## Next

3A-323 B1–B4 migration Agent.

---

# 2026-08-20 (Phase 3A-321 — Normalized Family Storage Phase A)

## 제목

**Normalized Family Storage Phase A**

## Mode

**Agent** · IMPLEMENTED (uncommitted) · Commit/Push 없음

## Purpose

Physical FamilyMaster / FamilyMember schema, localStorage store, hydrate/split boundary. No production wiring.

## Files

- `frontend/src/domain/family/familyNormalizedSchema.ts`
- `frontend/src/domain/family/familyNormalizedFlag.ts`
- `frontend/src/domain/family/familyNormalizedStore.ts`
- `frontend/src/domain/family/familyHydrate.ts`
- `frontend/src/domain/family/familyNormalizedStorage.test.ts`
- `frontend/src/domain/family/index.ts` (exports)
- `frontend/src/domain/family/familyMigrationDebt.ts` (debt note)

## Storage keys

`family_masters` · `family_members`

## Flag

`FAMILY_NORMALIZED_STORAGE_ENABLED = false`

## Ownership contract

| Entity | Owns |
|--------|------|
| **FamilyMaster** | family-common payload (`signature`, `sysInputs`, `corrections*`, `ai`, `str`, canonical `hpT`, …) |
| **FamilyMember** | balls `{cue,target,second}` + track + provenance / member delta only |

Member must **not** duplicate family-common payload.

## Representative fixture

1 Master · 16 Members · orphan 0 · duplicate memberId 0 · no common payload on Members.

## Production wiring

**NONE.** SAVE / Approval / Search / History **unchanged**.

## Tests (at completion)

`familyNormalizedStorage` **12/12** · `derivedApprovalFlow` **10/10**.

## Next

3A-322 Phase B migration audit (Ask).

---

# 2026-08-20 (Phase 3A-320 — SAVE vs Derived Approval WorkspaceSnapshot Semantic Diff Audit)

## 제목

**SAVE vs Derived Approval WorkspaceSnapshot Semantic Diff Audit**

## Mode

**Ask** · audit only · no code change in this phase

## Purpose

Verify whether SAVE History snapshot and Derived Approval History snapshot are accidental duplicates (user concern: v007 / v008 look identical on restore; Export might duplicate corpus).

## Representative case

| Snapshot | Role |
|----------|------|
| **S0** (v007-like) | Canonical SAVE |
| **S1** (v008-like) | Derived Approval |

## Three-axis conclusion

| Axis | Result | Meaning |
|------|--------|---------|
| **Visual equality** | **YES** | Both restore visible/runtime baseline A — screen looks the same **by design** |
| **Serialized equality** | **NO** | S0: 4-track base · no approved Derived. S1: 4-track + approved Derived. `state.dataset` differs |
| **Functional equality** | **NO** | S0 restore can drop Derived from working corpus. S1 restore can recover approved Derived |

Therefore: v007/v008 are **not** metadata-only duplicates. S1 is currently a **post-approval persisted-corpus restore point**.

## Writer / History counts

- normal SAVE → WorkspaceSnapshot **+1**
- Derived Approval → separate WorkspaceSnapshot **+1**
- same History writer

## Decision

**TEMPORARILY KEEP** Approval History **+1**.
**REMOVE only AFTER** normalized migration + Members + SearchIndex + restore contract + product agreement that Approval ≠ workspace save-event.

## History +0 transition prerequisites (recorded)

1. physical FamilyMaster / FamilyMember persistence
2. SearchIndex or equivalent
3. working/search read from Members
4. History restore does not delete Members (H3 direction)
5. regression suite
6. explicit product contract: Approval ≠ workspace save-event

## Architecture principle

**History ≠ Member DB** · History ≠ persistent family corpus SSOT · SearchIndex ≠ family-common payload SSOT.

## Export note (session)

Do **not** treat History v007+v008 as two persistent “original” corpora for Export merge/dedup.

**TARGET:** Export corpus = FamilyMaster + FamilyMembers; History = workspace snapshot only.

**CURRENT through 3A-326:** Export format/behavior **unchanged** — normalized Export **NOT IMPLEMENTED**.

## Next

3A-321 Normalized Storage Phase A (Agent).

---

# 2026-08-19 (Family Phase 3A-3E — Derived Preview / Approval)

## 제목

**Cue→Impact Derived Candidate generate-once → Preview → Approve same set**

## Status

**IMPLEMENTED (uncommitted)** · Commit/Push 없음
SAVE 자동 Derived persistence **없음** · AUTO_APPROVE **없음** · C3_PLUS **없음**

## Contract

Derived candidates are generated automatically for review, but are not persisted until explicit administrator approval. The exact candidate set reviewed in Preview is the candidate set passed to persistence; approval must not trigger regeneration.

- Policy: REVIEW_REQUIRED
- 4-track SAVE 후 in-memory review session
- 파생 승인 = frozen Candidate Set → generic writer
- Preview close = no dataset mutation

## Files

- `frontend/src/domain/family/cueImpactDerivedReview.ts` (+ test)
- `frontend/src/components/table/DerivedCandidatePreviewLayer.jsx`
- `frontend/src/App.jsx` (ghost markers · 파생 승인)
- `saveFlow.ts` additive `familyId` / `fourTrackWritten` (Derived persist 없음)

## Working tree

기존 uncommitted · leftover 보존. Commit/Push 없음.

---

# 2026-08-18 (Family Phase 3A-3D — Cue→Impact first 30% Derived)

## 제목

**Cue Ball / Impact Ball / CO 의미 확정 · CO_C1_2RG 폐기 · Cue→Impact 처음 30% adaptive Derived Member 생성**

## Status

**IMPLEMENTED (uncommitted)** · Commit/Push 없음
SAVE 자동 Derived 연결 **없음** · C3_PLUS **없음**

## Contract

- Cue Ball = `source.balls.cue` (물리 중심)
- Impact Ball center = `calcImpactBall(cue, target, runtime T)` = 충돌 순간 Cue 중심
- CO ≠ Cue Ball. CO는 Impact 이후 system trajectory origin
- Cue→Impact = 직선 `P(t) = C + t*(I-C)`, valid `0 < t <= 0.30`
- Adaptive: `N = max(3, ceil(D*0.30 / 3.0))`, last t always 0.30
- 2Rg / CO→C1 / Envelope cueSet 미사용
- `derivedRule = CUE_IMPACT_FIRST_30PCT`, `memberOrigin = DERIVED_CUE_IMPACT`
- `derivedStep = cue_impact:t:0.100000`
- 각 Track은 자기 source에서 직접 생성. H/V/RPI Derived 복제 없음
- generic writer 사용. production SAVE는 기존 4-track만 유지

## Withdrawn

`CO_C1_2RG` / `DERIVED_CO_C1` / `sourceDomainLengthRg` / `evaluateCoC1RgSteps` / `co_c1:rg:`
production persistence에 없었으므로 migration alias 없음.

## Files

- `frontend/src/domain/family/generateCueImpactDerivedMembers.ts` (+ test)
- `familyIdentity.ts` / `positionSearchEngine.ts` / `familyAwareWriter.ts`
- `작업관리/FAMILY_DATA_ARCHITECTURE_DRAFT.md` §5.0–5.1
- `작업관리/4_CALCULATION_RULES.md` (sys/expr 경계 명시)

## Working tree

기존 uncommitted · dataset/vitest leftovers **보존**. Commit/Push 없음.

---

# 2026-08-17 (Authoring/Display uncommitted fixes · Family Data Architecture CONFIRMED DESIGN)

## 제목

**ADMIN Authoring / Display 수정 일괄 기록 · Family Data Architecture 설계 확정 · BUG-A IMPLEMENTED · BUG-B UNCONFIRMED**

## Status

**DOCS SYNC** · 코드는 **working tree uncommitted** (Commit/Push 없음)
Family 구조는 **CONFIRMED DESIGN / NEXT** (미구현)

## Working tree (preserve)

이번 세션 및 직전 세션의 코드 변경은 **모두 보존 대상**이다. 문서 작업이 이를 revert/reset 하지 않는다.

포함 (비완전 목록): Reset / History restore display / C2 Track·HPT-side invalidation / SYS diag / uiMode F5 / saveFlow SYS identity / baseline / HPT tip-side / display-cap nearest-rail (BUG-A) 등.

`SYSTEM_ARCHITECTURE.md` / `CALCULATION_RULES.md` 루트 파일명은 없고, 실제 문서는 `작업관리/3_SYSTEM_ARCHITECTURE.md` · `작업관리/4_CALCULATION_RULES.md` 이다.

---

## A. saveFlow sys.system identity — IMPLEMENTED (uncommitted)

| Item | Fact |
|------|------|
| 문제 | saveFlow가 UI display object를 `system` 필드에 저장 → identity corruption |
| 수정 | `system: ctx.system`이 아니라 이미 계산된 **systemId string** 사용 (예: `"5_half_system"`) |
| 파일 | `frontend/src/application/flows/saveFlow.ts` |
| 테스트 | `saveFlow.sysIdentity.test.ts` · regression PASS |
| Commit/Push | **없음** |

---

## B. C2 stale on Track change — IMPLEMENTED (uncommitted)

| Item | Fact |
|------|------|
| 본질 | C2는 sys 계산값이 아니라 **reflection geometry derived** 값 |
| 문제 | `reflectionOverride`가 Track 변경 후에도 남아 새 Track에서 C2 reflection 계산 skip |
| 수정 | Track 변경 시 reflectionOverride invalidate · runtime + slot draft/applied 정리 |
| 재사용 | 기존 `resolveReflectionC2` |
| 비변경 | C2를 sys 필드로 추가하지 않음 · Reset/baseline/exact-upsert 정책 유지 |
| 테스트 | `c2ReflectionOverride.trackInvalidate.test.ts` |

---

## C. History restore trajectory display — IMPLEMENTED (uncommitted)

| Item | Fact |
|------|------|
| 문제 | History restore 시 balls/target/slot/adminState는 복원되나 `adminTableLayersVisible`이 꺼져 trajectory/labels 미표시 |
| 수정 | History restore **성공 시 display layers ON** · **session은 false 유지** |
| 비변경 | Reset / SYS Apply 우회 없음 · Search/LocalDB 기존 경로 유지 |
| 테스트 | `historyRestoreDisplayContract.test.ts` |

---

## D. ADMIN UI mode F5 persistence — IMPLEMENTED (uncommitted)

| Item | Fact |
|------|------|
| 문제 | `appMode` 초기값 USER 하드코딩 → ADMIN에서 F5 시 USER로 떨어짐 |
| 수정 | `app_ui_mode_v1` localStorage (`domain/uiModePreference.ts`) |
| 계약 | USER F5 → USER · ADMIN F5 → ADMIN · runtime 작업 state는 F5 시 초기화 · dataset/history 목록성 데이터 유지 |
| 분리 | Reset semantics와 분리 · 최초/invalid key fallback = USER |
| 쓰기 | 명시적 toggle에서만 write |
| 테스트 | `uiModePreference.test.ts` T1–T14 |

---

## E. HPT tip side L↔R stale C2 — IMPLEMENTED (uncommitted)

| Item | Fact |
|------|------|
| 문제 | History/Load 후 HPT 타점 L↔R 시 `c2ReflectionOverride`가 남아 old C2를 `anchors.C2`로 주입 |
| 수정 | HPT side 변경 감지 시 reflectionOverride invalidate · React runtime + slot draft/applied |
| 결과 | new tip 기준으로 C2 재계산 |
| 분리 | Track flip invalidation과 **별개** HPT side invalidation |
| 테스트 | `c2ReflectionOverride.hptTipSideInvalidate.test.ts` |
| 한계 | 이 수정만으로는 대회전 C1-cut(BUG-A)을 고치지 못함 (override가 이미 null인 FIRST_RENDER) |

---

## F. BUG-A — HPT corrected display-cap corner — IMPLEMENTED (uncommitted)

### 증상

뒤돌리기 대회전 일부 데이터에서 **corrected** 궤적이 C1에서 잘림. baseline은 C1–C6 정상.

geometry / path generation 실패가 아니라 **display-cap truncation**.

### 원인

reflection 단계는 C2 rail을 RIGHT로 정상 판정.

display-cap `isSameRailSegment`가 `detectRail(EPS_RAIL=3, TOP/BOTTOM 우선)`을 다시 호출해 코너 근처 side-rail C2를 BOTTOM으로 오분류.

예 (T2B_L, tip `{count:3,side:L}`, slide=8, effective CO=55, C1_f=5):

| | 값 |
|--|-----|
| C1 | ≈ (70.47, 0) BOTTOM |
| C2 | ≈ (80, 2.273) |
| reflection `c2Rail` | **RIGHT** |
| display `detectRail(C2)` | **BOTTOM** (`\|y\|=2.273 ≤ 3`) |
| same_rail | true |
| cap | `endIndex=1` · stoppedSegment C1–C2 |
| `pathNodes.length` | **7** (생성은 됨) |

C1_f=10: C2.y≈3.808 → detectRail RIGHT → PASS.

### C1 sweep (사용자 관찰 + production 재계산)

동일 조건에서 C1_f만 변경:

| C1_f | C2.y (approx) | display rail | 결과 |
|------|----------------|--------------|------|
| 5 | 2.273 | BOTTOM | FAIL |
| 7.0 | ≈2.89 | BOTTOM | FAIL |
| ≈7.37 | ≈3.000 | EPS_RAIL boundary | — |
| 7.5 | ≈3.04 | RIGHT | PASS |
| 10 | 3.808 | RIGHT | PASS |

이 threshold는 C1 시스템 경계가 아니라 **C2.y가 EPS=3 band를 통과하는 인공 경계**.

### 수정 (최소)

- `detectRail` **전역 semantics 유지** (reflectionEngine 수식 미변경)
- display-cap `isSameRailSegment`만:
  1. **presence** = `detectRail(eps)` (내부 점은 same-rail 아님)
  2. **identity** = `resolveNearestRail` (코너 tie: LEFT/RIGHT 우선)
- `resolveRailForC2Handle`은 `resolveNearestRail` 위임 (공용 helper)

금지한 것: EPS 축소 · detectRail 순서 변경 · same_rail 제거 · skipSameRail 강제 · C1≥7.5 하드코딩 · shotType/track/tip 예외 · SYS/HPT/slide 수식 변경.

성공 기준: **c2ReflectionOverride / skipSameRail 없이** F1 C1=5가 same_rail로 C1에서 잘리지 않음.
C2 점 조작으로 살아나는 현상은 cap 우회일 뿐 근본 수정이 아님.

### 검증

| Suite | 결과 |
|-------|------|
| `trajectoryPathDisplayPolicy.test.ts` + `c2ReflectionOverride.test.ts` | **28/28 PASS** |
| trajectory folder + display policy | **56/56 PASS** |
| Fixtures | F1 C1=5/7/7.5/10 · F2 mirror · NORMAL C4–C5 same_rail · exact/near-corner · path length 7 |

파일: `reflectionEngine.ts` (`resolveNearestRail`) · `trajectoryPathDisplayPolicy.ts` · `c2ReflectionOverride.ts` · 해당 test.

Cite: `DISPLAY_BOUNDARY_POLICY_SSOT.md` §5.3 (v1.4.1 identity 분리).

---

## G. BUG-B — Reset / History stale — UNCONFIRMED / REPRODUCTION REQUIRED

BUG-A와 **분리**. 이번 세션에서 **수정하지 않음**.

관찰:

- C2 handle override → `c2OverridePoint` → `skipSameRail: true` → false same-rail cap **우회** (궤적이 “살아난 것처럼” 보임)
- Reset이 `c2ReflectionOverride` / `trajectoryExtensionDraft`를 안 지울 수 있음
- History ADMIN extension: payload **없을 때 이전 draft 유지** (`if (payload) set…`)
- 브라우저 Refresh 후 동일 History Load면 정상 → runtime stale 후보

이 현상은 과거 BUG-A가 존재하던 상태에서 관찰되었다. BUG-A 수정 후 실시한 테스트에서는 현재 동일 현상이 재현되지 않았다.

따라서 현재 증거만으로 BUG-B를 **독립된 미해결 코드 버그로 확정해서는 안 된다**.

현재 판정:

- **UNCONFIRMED — BUG-A 수정 후 재현 필요**
- 가능성 1: BUG-A의 2차 증상이었고 BUG-A 수정과 함께 해소되었을 수 있음
- 가능성 2: 별도 stale-state 문제가 있으나 현재 fixture에서는 재현되지 않았을 수 있음

정책:

- 재현 전 코드 수정 금지
- 특히 `Reset` semantics / `History` restore-hydrate / `c2ReflectionOverride` lifecycle / `trajectoryExtensionDraft` / `skipSameRail` / slot draft-applied / runtime cleanup 추측 수정 금지
- 다음 세션에서 Family와 섞지 말고, **동일 stale UI 현상이 production UI에서 다시 재현될 때만** reproduction-first로 재조사

관계 판정: BUG-A는 classifier root. BUG-B 후보는 override/skipSameRail + incomplete clear가 A를 숨기거나 오염을 노출한 현상일 수 있다. 다만 현재는 **재현 전 가설 단계**이며 독립 root cause로 확정하지 않는다.

---

## 샘플 데이터 (사용자 보고 · 2026-08)

| 공략 | 상태 |
|------|------|
| 뒤돌리기 | 1 set × 4 tracks |
| 옆돌리기 | 1 set × 4 tracks |
| 뒤돌리기 대회전 | 샘플 생성/검증 · corner/display-cap(BUG-A) 수정 후 정상 확인 |
| 합계 | 사용자: **샘플 데이터셋 3개 완성** |

다음 목적: 기준 데이터 1개로 나머지 3 track + 각 track 파생 데이터를 **Family로 자동 생성** 가능한가.

### Export ≠ History

History UI snapshot 개수와 export `positions.json` record 수는 **동일 개념이 아니다**.

- History = workspace snapshot
- Export = `dataset/{shotType}/{system}/positions.json` **누적 corpus**
- 대회전 export fault records는 분석용으로 사용
- 둘을 1:1로 동일시하지 말 것

Dataset 3계층 SSOT: MASTER Dataset Architecture · `SESSION_TRANSFER/SESSION_TRANSFER_2026-06_DATASET_ARCHITECTURE.md`.

---

## Family Data Architecture — CONFIRMED DESIGN (미구현)

상세: `작업관리/FAMILY_DATA_ARCHITECTURE_DRAFT.md`

요약:

- Family Master = 공통값 SSOT (shotType · system identity · SYS/AI/STR/HPT/thickness canonical)
- mirrored HPT/thickness **DB 중복 저장 금지** · handedness resolver
- Member = 좌표 + track + provenance (원본도 Member)
- 4 Track = H/V/RPI 대칭 · sys 불변 · 좌표만 대칭
- Derived = 기존 production 규칙 재사용 (CO–C1 1/3 · 2Rg · C3+ 2Rg) — Envelope 1.5gr과 혼동 금지
- Search Index = derived index, 새 SSOT 아님 · PositionKey unique 아님 · position당 최대 3 Family
- 명령: 원본수정 UPDATE · 파생수정 BRANCH+REPLACE · 새로저장 CREATE

**IMPLEMENTED로 쓰지 말 것.**

---

## Next

```text
[Cursor Mode: Ask]
Family Data Architecture Phase 1 — Family Master / Member 현재 저장 구조 분석
```

Carry: BUG-B UNCONFIRMED (reproduction required) · uncommitted 코드 보존 · Commit/Push는 사용자 요청 시.

---

# 2026-08-12 (Ball Fine Position Controller — Mobile Production Final PASS · CLOSED)

## 제목

**Ball Fine Position Controller — Mobile Production Final Verification PASS**

## Status

**CLOSED / COMPLETE** · Desktop Local **PASS** · Mobile Production **PASS** · Admin **PASS** · User **PASS**

## Purpose

Ball Fine Position Controller UI 작업의 스마트폰 Production 실기기 최종 검증이 사용자에 의해 완료되었다.
본 항목은 코드 변경이 아니라 **최종 PASS 기록**이다.

## Final contract (verified)

| Item | Value |
|------|--------|
| Tap | **0.1** |
| Long Press threshold | **1.0s** |
| Hold repeat | **0.2** / **150ms** |
| Acceleration | **none** |
| Release / cancel | 즉시 정지 |
| Fine ↔ Joystick interaction gap | **3 Rg** |
| CENTER | protected dead zone · 터치 시 Controller 유지 · dismiss 없음 |
| Coordinate fontSize | **22** |
| Touch zones | enlarged mobile directional zones · Joystick과 충돌 없음 |
| Joystick drag | 정상 |
| Fine 외부 터치 | 정상 dismiss |
| Admin / User | 동일 동작 |

## Mobile WebKit fix (final)

Production 스마트폰에서 Fine 방향키 Long Press 중 native text-selection / callout이 발생했다.

| Item | Fact |
|------|------|
| Scope | Fine Controller **only** |
| Applied | `touchAction: none` · `userSelect: none` · `WebkitUserSelect: none` · `WebkitTouchCallout: none` |
| Context menu | Fine-scoped `preventDefault` |
| Selection cleanup | Fine `pointerup` / `pointercancel`에서만 `getSelection()?.removeAllRanges()` |
| Global selection policy | **미변경** |
| `mobile-layout.css` | 재활성화 **없음** |
| Smartphone re-verification | **PASS** — 「계산」 및 rail 텍스트 shading 없음 · blue selection handles 없음 · native callout 없음 |

## Production

| Item | Value |
|------|--------|
| Commit | `1eaf76c0102071893c2bc561cfe72d972d53b55f` |
| Message | `fix(ui): prevent mobile long-press selection in Fine Controller` |
| Branch | `main` · `origin/main` · ahead/behind **0/0** |
| Deploy | Vercel production bundle match (`index-CAxrNnCC.js`) |

## Verification

| Check | Result |
|-------|--------|
| Desktop Local | **PASS** |
| Mobile Production (smartphone, user) | **PASS** |
| Admin | **PASS** |
| User | **PASS** |

## Explicit Non-Claims

- 본 항목에서 코드 수정 **없음**
- Search / RI / Slot / Calculator / Anchor / Trajectory / Envelope / Publisher **미변경**
- Fine Controller 재설계/재구현 **없음** (완료된 UI 계약)

## Next

**Sample System Validation** · **READY FOR SAMPLE SYSTEM VALIDATION**

Fine Controller는 완료된 UI 계약이다. 새로운 명시적 요구가 없는 한 재설계/재구현하지 않는다.

## Verdict

**BALL FINE POSITION CONTROLLER COMPLETE · DESKTOP PASS · MOBILE PRODUCTION PASS · ADMIN/USER PASS · CLOSED**

---

# 2026-08-12 (Ball Fine Position Controller — Mobile UX Adjustment)

## 제목

**Fine Controller Mobile UX — Hold 1.0s / 0.2 step · expanded non-overlapping directional zones**

## Status

**Implemented** · Production mobile initial verification **PASS** (prior) · Mobile UX adjustment final verification **PENDING** · **Commit/Push 대기**

## Purpose

Production 모바일 실기기에서 Fine Controller는 정상 작동하나, (1) Long Press 1.5s/0.1 반복이 느리고 (2) hitR=22 원형 영역이 작아 화살표 밖 터치가 table dismiss로 이어지는 문제를 최소 변경으로 개선한다.

## Changes

| Item | Before | After |
|------|--------|--------|
| Tap step | 0.1 | **0.1** (unchanged) |
| Long Press threshold | 1.5s | **1.0s** |
| Hold repeat step | 0.1 | **0.2** |
| Repeat interval | 150ms | **150ms** (unchanged) |
| Touch target | circle hitR=22 | **4 non-overlapping rects** ZONE_INNER=24 · ZONE_OUTER=120 |
| Visual | font 17/15 · offsets 32 / 57.6 | **unchanged** |
| Placement | `computeFineControllerCenterRg` | **unchanged** |
| Joystick | — | **unchanged** |

## Long Press contract

- pointerdown → Tap **0.1** 1회
- 1000ms timer expiry → 추가 nudge 없음 · interval 시작만
- interval first tick → Hold **0.2**
- no acceleration · pointerup/cancel → 즉시 정지

## Touch-zone geometry (SVG px, center = coordinate)

```text
UP:    x[-120, +120]  y[-120, -24]   240 × 96
DOWN:  x[-120, +120]  y[+24, +120]   240 × 96
LEFT:  x[-120, -24]   y[-24, +24]     96 × 48
RIGHT: x[+24, +120]   y[-24, +24]     96 × 48
```

Non-overlap: UP/DOWN occupy |y| > 24; LEFT/RIGHT occupy |x| > 24 and |y| ≤ 24.

## Verification

| Check | Result |
|-------|--------|
| Production mobile initial (prior release `6fce0b4`) | **PASS** (user) |
| Mobile UX adjustment final | **PENDING** |
| Commit / Push | **NOT done** |

## Files

- `frontend/src/App.jsx` only (code)
- SSOT: MASTER v1.68 · HANDOFF · Baseline §Fine Controller · 본 LOG

## Verdict

**MOBILE UX ADJUSTMENT IMPLEMENTED · FINAL VERIFICATION PENDING · AWAITING COMMIT**

---

# 2026-08-12 (Ball Fine Position Controller — COMPLETE · Admin/User runtime 검증)

## 제목

**Ball Fine Position Controller — Joystick + Fine Controller temporary Ball Position Controller**

## Status

**Completed** · Admin UI runtime 검증 **PASS** · User UI runtime 검증 **PASS** · 문서 동기화 (본 항목) · **Commit/Push 대기**

## Purpose

Sample System Validation 및 실사용 Ball positioning 정확도를 높이기 위해, 기존 Ball drag / Joystick에 Fine Position Controller를 추가한다.

- Ball physical center coordinate 확인
- Drag/Joystick으로 대략 이동 + 방향키로 0.1 Rg 미세조정
- 계산 시스템이 **아님** — Ball positioning UI only
- Search / RI / Slot / Calculator / Anchor / Trajectory / Envelope / Publisher **미변경**

## Timeline (사실 순서)

1. Ask 분석 — GO 판정 · `App.jsx` + `joystickInteractionPolicy.ts` 최소 변경 경로 확정
2. 초기 구현 — Joystick visibility 종속 · `fineNudgeBall()` · tap/long-press · placement helper
3. Visual 2× 확대 시도 — 좌표/화살표 과대 → **1.5× 수준으로 최종 조정**
4. Dismissal lifecycle 추가 — `hideBallPositionController()` · positioning 외 UI action 시 숨김
5. Admin UI runtime 검증 **PASS** (사용자 직접 확인)
6. User UI runtime 검증 **PASS** (사용자 직접 확인)
7. 문서 동기화 (본 항목)

## UX (최종)

```text
             ▲
       ◀  (x.x, y.y)  ▶
             ▼
```

| Item | Value |
|------|--------|
| coordinate fontSize | **17** |
| arrow fontSize | **15** |
| fontWeight | **400** |
| arrow offset up/down | **32** px |
| arrow offset left/right | **32 × 1.8 = 57.6** px |
| touch hitR | **22** (~44px diameter) |
| `FINE_CTRL_HALF_H_PX` | **55** |
| coordinate | Ball physical center · `(x.x, y.y)` · read-only · 1 decimal |

## Fine adjustment 동작

| Action | Behavior |
|--------|----------|
| ▶ | x +0.1 |
| ◀ | x -0.1 |
| ▲ | y +0.1 |
| ▼ | y -0.1 |
| Tap | pointerdown 즉시 0.1 · release <1.5s → 추가 이동 없음 |
| Long Press | ≥1.5s Hold → 150ms repeat · 진입 시 double-step 없음 |
| Precision | fine nudge 축만 `Math.round(value * 10) / 10` · Drag/Joystick precision 유지 |
| Boundary | 기존 `nudgeBall` clamp 재사용 · x [0.5, 79.5] y [0.5, 39.5] (impact FREE mode 별도) |

## Placement

```text
Ball → Joystick → Fine Controller → Table Center
```

- `computeFineControllerCenterRg()` — `joystickInteractionPolicy.ts`
- Ball → Table Center vector 재사용 · Joystick보다 Table Center 방향 안쪽
- 별도 독립 geometry system 없음

## Visibility / Dismissal

Joystick + Fine Controller = 하나의 temporary Ball Position Controller.

| Event | Result |
|-------|--------|
| Ball 선택 | Joystick + Fine Controller 표시 |
| 다른 Ball 선택 | 새 Ball 기준 controller 이동/표시 |
| 빈 당구대 터치 | 즉시 숨김 |
| positioning 외 UI action | `hideBallPositionController()` → 숨김 |
| Ball drag / Joystick drag / Fine Tap / Long Press | 유지 |

Dismissal 구현:
- `hideBallPositionController()` — `stopJoystick()` + `stopFineCtrl()` + `joystickVisible=false`
- `currentButtonId` useEffect (USER/ADMIN)
- `handlePositionRecall` · `handleTrajectoryExtensionClick`
- right-panel buttons (Grid · 기준선 · History · SAVE · Data 정리)
- 기존: empty table tap · `handleSelectAdminButton`

## Implementation (코드)

| File | Role |
|------|------|
| `frontend/src/App.jsx` | `fineNudgeBall` · `hideBallPositionController` · Fine Controller SVG render · dismissal hooks |
| `frontend/src/interaction/joystickInteractionPolicy.ts` | `computeFineControllerCenterRg()` · `FINE_CTRL_HALF_H_PX` |

## Verification

| Check | Result |
|-------|--------|
| Admin UI — Ball 선택 · 0.1 이동 · 좌표 표시 · placement · dismissal | **PASS** (사용자 runtime) |
| User UI — 동일 동작 | **PASS** (사용자 runtime) |
| Search / RI / Calculator / Trajectory 영향 | **none** |
| Vercel / mobile production | **not verified** (별도 단계) |
| Commit / Push | **NOT done** |

## Git

| Item | Value |
|------|--------|
| Pre-implementation baseline | `9678b69d0f82b82a685de86cb42eec07e18cb53f` |
| Branch | `main` |
| Working tree | Fine Controller + Centering + docs **uncommitted** |

## Docs sync (same session · docs-only follow-up)

- `PROJECT_MASTER_INDEX.md` v1.67
- `CURSOR_SESSION_HANDOFF.md`
- `2_FRONTEND_ARCHITECTURE_BASELINE_v1.md` §Ball Fine Position Controller
- 본 LOG 항목

## Next

문서 동기화 확인 → `git diff` / `status` → **Commit** → **Push** (사용자 요청 시) → **Sample System Validation** 계속

## Verdict

**FINE POSITION CONTROLLER COMPLETE · ADMIN/USER RUNTIME VERIFIED · AWAITING COMMIT**

---

# 2026-08-12 (USER Overlay Centering SSOT — COMPLETE · 브라우저 검증)

## 제목

**USER Overlay Centering SSOT — Panel ResizeObserver / live dimensions Fix**

## Status

**Completed** · 실제 브라우저 검증 **PASS** · `npm run build` **PASS** · 문서 동기화 (본 항목) · **Commit/Push 대기**

## Purpose

USER AI / HPT / CALC Overlay가 진입 경로에 따라 **table-area 기하 중심**에서 위/아래로 어긋나던 문제를 해결한다.
UX 불변조건: Drag 중이 아니면 `overlayCenter === tableAreaCenter`.

## Timeline (사실 순서)

1. Overlay 위치 불일치 발견 (F5→AI 위 · Zoom In 중앙 · Zoom Out 아래 · CALC→AI 아래 · HPT→AI 중앙)
2. 최초 분석: dragOffset / reset timing 의심 → 1차 centering patch (offsetRef · useLayoutEffect reset · Zoom→table center)
3. 브라우저에서 **일부 경로 문제 지속** (특히 최초 Open · Zoom Out · CALC→AI)
4. runtime `UserOverlayShell` 단일 연결 재검증 (별도 Shell / App 위치 오버라이드 아님)
5. 경로별 재현 비교 (widthRatio 0.62→0.42 vs 0.42→0.42)
6. Ask 재분석
7. **Root Cause 확정: B + C**
   - **B** stale panel dimensions
   - **C** content reflow timing
   - ※ **dragOffset 자체는 최종 주원인이 아님** (부차·기존 보완)
8. Panel ResizeObserver + live `offsetWidth`/`offsetHeight` 기반 placement 수정
9. `npm run build` PASS · repo lint는 기존 unused 등 (Shell 신규 이슈 없음)
10. **실제 브라우저에서 정상 동작 확인** (사용자 검증)

## Root Cause (최종)

Placement가 panel 최종 height 확정 전에 한 번 계산된 뒤, width/font/max-height/text wrapping/reflow로 실제 height가 변해도 재계산되지 않음.
기존 ResizeObserver는 **table-area만** 관찰.

```text
dCy ≈ (h_actual − h_assumed) / 2
```

## Fix (코드)

| Item | Value |
|------|--------|
| File | `frontend/src/components/common/UserOverlayShell.jsx` **only** |
| `index.css` | **최종 미수정** |
| Measurement | `readPanelBox()` → live DOM box |
| SSOT | `updatePanelPlacement()` — `(table − currentPanel) / 2 + dragOffset` |
| Panel ResizeObserver | size 변화 → placement 재계산 · **dragOffset 유지** |
| Table ResizeObserver | 유지 · dragOffset 보존 + clamp |
| Reset | Open / Re-open / Switch / Zoom / layout·size → `dragOffset = 0` |
| Width policy | AI/HPT `0.42` · CALC `0.62` **미변경** |
| Out of scope | DisplayModel · Projection · SYS · Content · Toolbar · App.jsx |

## Policies recorded

- Center 기준 = **`.table-area` 기하 중심** (viewport / Stage 아님)
- Drag = temporary center-relative offset (삭제 아님)
- Zoom = table-area center (이전 시각 중심 유지 폐기)
- Overlay Switch = `dragOffset=0` + Panel RO 재수렴 (CALC→AI 포함)

## Verification

| Check | Result |
|-------|--------|
| 실제 브라우저 (Open / Zoom / Switch / CALC→AI / HPT→AI / Drag 후 reset) | **PASS** |
| `npm run build` | **PASS** |
| UserOverlayShell IDE lint | clean |
| repo `npm run lint` | 기존 다수 (본 변경 신규 아님) |
| Commit / Push | **NOT done** |

## Docs sync (same session · docs-only follow-up)

- `PROJECT_MASTER_INDEX.md` v1.66
- `CURSOR_SESSION_HANDOFF.md`
- `OVERLAY_LAYOUT_SSOT_v1.2.md` §8 Centering SSOT
- `2_FRONTEND_ARCHITECTURE_BASELINE_v1.md` USER Overlay Layout
- 본 LOG 항목

## Next

문서 동기화 확인 → `git diff` / `status` → **Commit** → **Push** (사용자 요청 시)

## Verdict

**CENTERING SSOT COMPLETE · BROWSER VERIFIED · AWAITING COMMIT**

---

# 2026-08-11 (Phase 5 Mission 02 — Dead Code Cleanup Final Closure)

## 제목

**Phase 5 Mission 02 — Dead Code Cleanup · Final Closure**

## Status

**Completed** · Final Closure Verification **PASS** · Documentation sync (this entry) · Commit/Push of docs **NOT** part of Cleanup #4 code baseline

## Purpose

Search Quality Follow-on Task #5 이후, Sample System Validation 전에
temporary agent-log / no-op trace scaffolding을 제거하여 **clean Git baseline**을 확보한다.

Mission 02 목적 = “모든 unused code 제거”가 아니라
**새 검증 단계 전 clean baseline**.

## Cleanup Scope (Completed)

| Cleanup | Scope |
|---------|--------|
| **#1** | `main.jsx` temporary `127.0.0.1:7263` agent-log |
| **#2a** | unused App trace definitions (`traceSearchRuntimeSnapshot` · `emitAdminRecallTrace` · `buildStrategyPickTrace`) |
| **#2b** | `emitStrategyPickTrace` definition + call sites |
| **#2c** | `emitTargetSelectionTrace` + proven-dead local |
| **#2d-1** | no-op admin-target emit · `[ADMIN_SEARCH_TARGET]` console diagnostic **preserved** |
| **#2d-2** | admin-target trace dependency closure · snapshots / RAF scaffolding |
| **#2d-3** | unused `traceMessage` API residue |
| **#3** | `index.html` temporary agent-log inline script |
| **#4** | `systemLabelPlacement.ts` temporary localhost/snap telemetry · `SNAP_RESULT` / `SNAP_OUTPUT` **preserved** |

## Final Code Baseline

| Item | Value |
|------|--------|
| Branch | `main` |
| HEAD | `8bf90b648cfb73752abc0d4af8353aab2ce8998f` |
| Cleanup #4 message | `chore(cleanup): remove temporary snap agent telemetry` |
| origin/main | identical · ahead/behind **0 / 0** |
| Working tree (closure verification) | **clean** |

## Verification (Final Closure)

| Check | Result |
|-------|--------|
| Git clean / synced | **PASS** |
| `npm run build` | **PASS** |
| RI Vitest (`src/domain/realInterpolation`) | **76 PASS** / 6 files |
| Protected Search / RI / Slot / Calculator / Envelope paths | **intact** |
| Cleanup-induced regression | **none** |
| Mission 02 blocker remaining | **none** |
| Cleanup Exit | **EXIT-AFTER-#4** confirmed |

### Full Vitest (reference — not a closure blocker)

| Item | Result |
|------|--------|
| Passed tests | **226** |
| Failed tests / files | **1** failed test · **7** failed files |
| Analysis | Pre-existing / non-Cleanup baseline issues (empty suites · parity `process.exit` · caption geometry assert) |
| Mission 02 closure impact | **Not a blocker** |

Do **not** record Full Vitest as “all PASS”.

## Deferred Items (summary)

No Mission 02 blocker. Remaining candidates are optional hygiene, defer-until-validation, design-decision, or KEEP.
Detail register: Final Closure Verification report (N3–N15).
Do **not** automatically resume Dead Code Cleanup after this closure.

## Next Track

**Sample System Validation** · **READY FOR SAMPLE SYSTEM VALIDATION**

## Verdict

**MISSION 02 COMPLETE WITH DEFERRED ITEMS**

---

# 2026-08-11 (Phase 5 Search Quality Follow-on — Task #5 Production Real Interpolation)

## 제목

**Phase 5 Search Quality Follow-on · Task #5 — Production Real Interpolation Integration**

## Status

**Completed** · Final Integration Verification **PASS** · Commit/Push **COMPLETE**

## Distinction

| Item | Role |
|------|------|
| **Mission 01** | Real Interpolation **core engine** (gates · SYS interp · matchType/confidence · top-3) |
| **Task #4** | Product Envelope Static Publisher |
| **Task #5** | Production **frontend integration** of Mission 01 (loader · DI · slot · Calculator/Builder · UI) |

Task #5 did **not** re-implement Mission 01 interpolation algorithms.

## Purpose

Product-published Envelope corpus를 Frontend read-only loader로 소비하고,
Mission 01 Real Interpolation을 existing Strategy Slot · Calculator · `buildTrajectory` · UI surface에 연결한다.

## E2E Flow (Implemented)

```text
Product Envelope publish
  → /dataset/_published/envelope/dataset.json
  → Frontend read-only Envelope loader
  → App DI
  → Real Interpolation Search
  → same-family gates · exact/interpolated/nearest
  → SYS / primary Modal / confidence / Top-3
  → existing Calculator bridge
  → existing buildTrajectory DI
  → candidate activation
  → existing Strategy Slot hydrate
  → UI render
```

## Steps Completed

| Step | Scope |
|------|--------|
| **1** | Published Envelope locator · read-only loader · parse/validation · module cache |
| **2** | App DI · production `window.__ENVELOPE_PUBLISHED_DATASET__` removed · fail-closed · USER Search isolation |
| **3** | RI → existing `activateStrategySlot` hydrate · `authoringStrategyId` family · `strategyRef` separate |
| **4** | Existing Calculator + App-owned `buildTrajectory` DI · no SYS/Modal recompute |
| **5** | matchType · confidence · Top-3 UI · existing activation path |

## Ownership Preserved

| Owner | Fact |
|-------|------|
| Search | SYS result from engine |
| Modal | primary Modal as-is |
| Calculator | existing `applyCalculatorBridge` / `evaluateStrategy` |
| Builder | existing App/domain `buildTrajectory` |
| Product | Envelope artifact publisher |
| Frontend | read / load / cache / DI / display |
| Phase 3 / Mission 01 core / Architecture Freeze | unchanged |

## Verification (Final)

| Suite | Result |
|-------|--------|
| Step 1 loader | **15 PASS** |
| Step 2 App DI | **5 PASS** |
| Step 3 Strategy Slot | **12 PASS** |
| Step 4 Trajectory Build | **16 PASS** |
| Step 5 UI Surface | **8 PASS** |
| Mission 01 RI | **20 PASS** |
| Vitest total | **76 PASS** |
| Phase 3 interpolation | **12 PASS** |
| Search regression | **4 PASS** |
| Product publisher | **11 PASS** |
| Expected vs Actual | **delta 0** |
| Unexpected changes | **0** |
| Architecture / SSOT audit | **PASS** |

## Git

| Item | Value |
|------|--------|
| Product publisher | `690d6fe` · `feat(product): add envelope static publisher` |
| Task #5 | `282c859` · `feat(search): integrate production real interpolation flow` |
| Push | **COMPLETE** (`main` · ahead/behind 0/0) |

## Next Track

**Phase 5 Mission 02 — Dead Code Cleanup**

## Verdict

**TASK #5 COMPLETE**

---

# 2026-08-11 (Product Envelope Static Publisher — Task #4)

## 제목

**Product Envelope Static Publisher**

## Status

**Completed** · Commit/Push **COMPLETE** (prerequisite for Task #5)

## Purpose

Published Package `dataset.json` → frontend static tree
`dataset/_published/envelope/dataset.json` (full replace · atomic).

Runtime URL: `/dataset/_published/envelope/dataset.json`

## Ownership

Product owns publish · Frontend is read-only consumer (Task #5).

## Verification

| Suite | Result |
|-------|--------|
| `tests/test_publish_envelope_static.py` | **11 PASS** |

## Git

`690d6fe` · `feat(product): add envelope static publisher`

## Verdict

**TASK #4 COMPLETE**

---

# 2026-08-10 (Phase 5 Mission 01 — Real Interpolation)

## 제목

**Phase 5 Mission 01 — Real Interpolation**

## Status

**Completed** (implementation · tests green · docs updated · Commit/Push not requested)

## Purpose

Query Balls에 대해 same-`authoringStrategyId` family 안에서 Exact / Interpolated / Nearest + confidence top-3를 산출하고,
interpolated `sysInputs` + Query balls로 existing Calculator / Trajectory Builder를 consume한다.

Phase 3 `search/interpolation/` `rank_continuity_v1`는 유지한다 (D3-A). Architecture Freeze / PublishedDataset는 변경하지 않는다.

## Official Names

- **Real Interpolation** · **authoringStrategyId** · **matchType** · **confidence**
- **Second Scoring Gate** · **Cue/Target Geometry Gate** · **No Extrapolation**
— `GLOSSARY_SSOT.md`

## Decisions (Locked)

| ID | Decision |
|----|----------|
| D1-C1 | PositionRecord-shaped SYS knot + explicit `authoringStrategyId` |
| D2-B | Gates · matchType/confidence · top-3 · SYS interp · Calculator/Builder consume |
| D3-A | Keep Phase 3 Interpolation · Real Interpolation = separate layer |
| D4-A | Line of Score MVP = ordered Envelope `secondSet` polyline |

## Implementation (facts)

| Area | Path / Fact |
|------|-------------|
| Identity | `StrategyEntry.authoringStrategyId` · `authoringStrategyId.ts` · SAVE mint/inherit |
| Knot / Migration | `knotCorpus.ts` · `migration.ts` · dry-run default · explicit mapping only |
| Gates | `secondScoring.ts` · `geometryGate.ts` |
| Bracket / SYS | `bracket.ts` · `sysInterpolate.ts` · Modal never blended |
| Result | `engine.ts` · `confidence.ts` · `selectTop3.ts` |
| Bridge / Flow | `applicationBridge.ts` · `realInterpolationSearchFlow.ts` |
| App | `VITE_REAL_INTERPOLATION_SEARCH=1` parallel to `userSearchFlow` |
| Envelope join | `strategyRef` · Envelope에 SYS/Modal/authoringStrategyId 추가 없음 |

## Verification

| Suite | Result |
|-------|--------|
| `frontend/.../realInterpolation.test.ts` | **20 PASS** |
| `tests/test_interpolation_engine*.py` (Phase 3) | **12 PASS** |
| Architecture Freeze edited | **No** |
| PublishedDataset mutated by engine | **No** (immutability test) |

## Remaining Limitations

- Production Envelope PublishedDataset loader는 App에서 `window.__ENVELOPE_PUBLISHED_DATASET__` injection MVP
- Cue POS Gate는 Envelope `cueSet[0]` 기준 — Cue-1D INTERPOLATED는 양 knot가 query Cue POS_TOL 내에 있어야 gate 통과
- Legacy corpus without `authoringStrategyId`는 Real Interpolation family에서 제외 (migration 수동)
- UI confidence/matchType는 hook (`__REAL_INTERPOLATION_TOP3__`) · 공략 버튼 디자인 변경 없음

## Verdict

**MISSION 01 COMPLETE**

---

# 2026-08-10 (Phase 5 Preparation — Cue-Only Edit Snap & Exact Position Replacement)

## 제목

**Phase 5 Preparation — Cue-Only Edit Snap & Exact Position Replacement**

## Status

**Completed** (Authoring normalization · Phase 5 Mission 01 아님)

## Purpose

Phase 5 · Mission 01 Real Interpolation 전에, Authoring SAVE의 전역 근접 병합(`MERGE_EPSILON`)을 제거하고
History Load → Cue-only edit → Exact Position Replacement 정책을 고정한다.

Search / Real Interpolation / Architecture Freeze / Generator / Schema는 변경하지 않는다.

## Official Names

- **Cue-Only Edit Snap** · **Exact Position Replacement** · **Edit Source** — `GLOSSARY_SSOT.md`

## Decisions (Recorded)

1. History Load 시 **Edit Source** context를 세션에 유지한다.
2. Edit Source identity는 **`WorkspaceSnapshot.id`** 기반이다 (Schema 변경 없음).
3. **Cue Ball만** 수정된 편집에서만 Snap 판정을 허용한다.
4. **Target Exact** 필수.
5. **Second Exact** 필수.
6. Cue candidate = Edit Source lineage의 Authoring **`balls.cue`** 만.
7. **`cueSet` / Trajectory Sampling samples는 Snap 후보가 아니다.**
8. 거리는 Rg **Euclidean** `sqrt(dx²+dy²)`.
9. **d ≤ 0.5 Rg** → SNAP (경계 0.5 포함).
10. **d > 0.5 Rg** → 신규 Position.
11. Edit Source 없으면 근접 자동 병합/교체 **금지**.
12. SNAP 후 Cue/Target/Second를 Exact identity로 확정.
13. Position equality = **Exact 6-coordinate** comparison.
14. **`createPositionId` 양자화만으로 equality 판정하지 않음** (SNAP 후 재계산).
15. 동일 Exact Position → **Latest Write Wins**.
16. 독립 근접 Position은 **반드시 보존**.
17. Authoring SAVE에서 전역 **`MERGE_EPSILON` proximity merge 사용 금지**.
18. History는 **append-only**.
19. **PublishedDataset 직접 patch/delete 금지**.
20. 다음 Export → Generator **Full Regenerate**로 새 PublishedDataset.
21. Package / Deploy는 생성된 PublishedDataset을 소비.
22. **0.5 Rg ≠ Search / Membership / KDTree / Ranking / Interpolation tolerance.**

## Implementation (code cite)

| Path | Role |
|------|------|
| `frontend/src/domain/cueEditSnap.ts` | Snap gates · lineage candidates |
| `frontend/src/domain/positionMergeEngine.ts` | Exact upsert · LWW |
| `frontend/src/application/flows/saveFlow.ts` | SAVE wiring |
| `frontend/src/hooks/useSettings.js` | Edit Source on History Load |

## Tests

| Suite | Result |
|-------|--------|
| `cueEditSnap.test.ts` + `productExportRequest.test.ts` | **19 PASS** |
| Phase 4 `test_product_*` / package / deployment | **21 PASS** |

## Explicit Non-Claims

- Phase 5 Mission 01 Real Interpolation **미시작 · 미완료**
- Architecture Freeze · Generator · Search · Runtime · Schema **미변경**
- Commit / Push **없음** (본 LOG 작성 시점의 구현 세션 기준)

## Next Track

**Phase 5 — Search Quality · Mission 01 Real Interpolation**

---

# 2026-08-06 (Phase 4 Mission 03 — Deployment Workflow · Phase 4 Complete)

## 제목

**Mission 03 — Deployment Workflow Complete · Mission 04 Absorbed · Phase 4 Product Pipeline COMPLETE**

## Status

**Completed**

## Purpose

Mission 02 **Published Package**를 유일한 입력으로 소비하여
Deployment Workflow(Load · Validation · Target · Metadata · Status · Report)를 구축한다.
Package / Dataset은 수정하지 않는다. Git Push / Vercel Publish는 수행하지 않는다 (prepare/report only).

## Summary

`product/deployment*`가 Package directory를 load·validate하고 Deployment Report를 `deployment/reports/`에 기록한다.
`local_staging` 타겟은 source package를 변경하지 않고 staging mirror만 생성한다.

## Pipeline

```text
Published Package/
  → Package Loader (read-only)
  → Package Validation
  → Deployment Target (local_staging | git_ready | vercel_ready)
  → Deployment Report / Metadata / Status
```

## Completed

| Item | 결과 |
|------|------|
| Published Package sole input | ✅ |
| Package Loader | ✅ `deployment_loader.py` |
| Package Validation | ✅ |
| Deployment Workflow / API / CLI | ✅ `deploy` · `run_deployment` |
| Deployment Report / Metadata / Status | ✅ |
| Package immutability (checksum) | ✅ |
| Mission 04 Review | ✅ **ABSORBED** |

## Mission 04 Review

| Question | Answer |
|----------|--------|
| Mission 01에서 Authoring→Export→Generator가 이미 있는가? | **Yes** |
| 별도 Mission 04 구현이 필요한가? | **No** |
| Continuity CLI | `python -m product pipeline` |

ADR: `SESSION_TRANSFER/ADR_MISSION_04_AUTHORING_INTEGRATION_ABSORBED.md`

## Phase 4 Completion

**Phase 4 Product Pipeline = COMPLETE**
(Foundation · Mission 01 · 02 · 03 · Mission 04 Absorbed)

## Explicit Non-Claims / Not Changed

- Architecture Freeze · Generator · Search · Runtime
- Package Builder / Export Pipeline 코드 책임 변경 없음 (consume only)
- Git Push / Vercel Publish **미수행**
- Commit / Push **없음**

## Next Track

**Phase 5 — Search Quality · Mission 01 Real Interpolation**

## 산출물

| Path | Role |
|------|------|
| `product/deployment.py` | Deployment Workflow |
| `product/deployment_loader.py` | Package dir loader |
| `product/deployment_models.py` | Report / Status / Metadata |
| `tests/test_deployment_workflow.py` | Mission 03 tests |
| `SESSION_TRANSFER/ADR_MISSION_04_…` | Mission 04 Absorbed |
| `PROJECT_MASTER_INDEX.md` | v1.61 · Phase 4 COMPLETE |

---

# 2026-08-06 (Phase 4 Mission 02 — Published Package Builder)

## 제목

**Mission 02 — Published Package Builder Complete**

## Status

**Completed**

## Purpose

Mission 01 **Export Handoff Artifact**를 유일한 입력으로 받아
배포 가능한 **Published Package** (`package/` folder)를 Product Layer에서 생성한다.

## Summary

Package Builder는 dataset wrap · identity mint · manifest / version / package.json 생성 · schema validation · Export Folder write만 수행한다.
Generator / Search / Runtime / Architecture / Schema는 수정하지 않았다.

## Pipeline

```text
Export Handoff Artifact
  → Package Builder
  → dataset.json · package.json · manifest.json · version.json · metadata/
  → Mission 03 input
```

## Completed

| Item | 결과 |
|------|------|
| Export Handoff Artifact sole input | ✅ |
| Package Builder | ✅ `product/package_builder.py` |
| dataset.json / package.json / manifest.json / version.json | ✅ |
| metadata/ (provenance · identities · build) | ✅ |
| Package Validation (schema) | ✅ |
| Export Folder write | ✅ `product/package_writer.py` |
| Loader round-trip | ✅ |
| Mission 03 input contract | ✅ `assert_mission03_input_contract` |
| CLI `python -m product package` | ✅ |

## Explicit Non-Claims / Not Changed

- Architecture Freeze 본문
- Generator / Search / Runtime 코드·책임
- PublishedDataset Schema / record mutation
- Deployment / Git Push / Vercel
- Commit / Push **없음**

## Next Track

**Phase 4 — Mission 03 Deployment Workflow**

## 산출물

| Path | Role |
|------|------|
| `product/package_builder.py` | Package Builder |
| `product/package_writer.py` | Export Folder emit |
| `product/package_factory.py` | Factory / one-shot API |
| `tests/test_package_builder.py` | Mission 02 tests |
| `PROJECT_MASTER_INDEX.md` | Status · Next = Mission 03 (v1.60) |

---

# 2026-08-06 (Phase 4 Foundation — Project Governance)

## 제목

**Phase 4 Foundation — Official Glossary · Session Governance · MASTER Constitution**

## Status

**Completed**

## Purpose

Phase 4 구현(Export Pipeline 등)에 앞서 **Project Governance**를 정비하여,
프로젝트 운영 규칙을 Constitution 수준으로 확립하였다.
본 항목은 **문서 Governance만** 기록한다 (코드·Architecture Freeze 본문 변경 없음).

## Summary

Terminology SSOT(`GLOSSARY_SSOT`) · Session Handoff Modernization · MASTER Constitution을 도입하여
Official Read Order · Authority Hierarchy · Documentation Governance · Glossary Consume Policy를 고정하였다.

## Completed

| Item | 결과 |
|------|------|
| Official Glossary SSOT 도입 | ✅ `작업관리/GLOSSARY_SSOT.md` |
| Session Governance 확립 | ✅ `CURSOR_SESSION_HANDOFF.md` §0 |
| Documentation Governance 확립 | ✅ `PROJECT_MASTER_INDEX.md` |
| Project Constitution 정의 | ✅ MASTER Constitution 절 |
| Official Read Order 표준화 | ✅ MASTER → LOG → GLOSSARY → Architecture → HANDOFF → Mission |
| Authority Hierarchy 확립 | ✅ Status / History / Structure / Terminology / Operations |
| Official Pipeline 명칭 통일 | ✅ Architecture Chain · Product Pipeline · Search Enhancement Pipeline |
| Official Terminology 관리 체계 | ✅ GLOSSARY §3 · Naming Rules |
| Glossary Consume Policy 적용 | ✅ HANDOFF · MASTER banner / cite |
| Duplicate terminology 제거 정책 | ✅ HANDOFF §2 cite-only · GLOSSARY §8 Governance |

## Decisions

1. **GLOSSARY_SSOT**는 공식 Terminology 및 Official Pipeline 표현의 SSOT이다 (Authority: Terminology).
2. **Architecture Freeze**는 Structure와 Constraint의 Parent Authority이다. Glossary는 이를 **cite**하며 의미를 **재정의하지 않는다**.
3. 새 Session은 다음 순서로 시작한다:
   `MASTER → LOG → GLOSSARY → Architecture → HANDOFF → Mission`
4. 새로운 문서는 **Documentation Governance**를 따른다 (Status → Architecture → Terminology → Session → Mission → Reference).
5. 새로운 공식 용어는 **Glossary 등록 후** 사용한다.

## Impact

앞으로 작성되는 Product · Search · Validation · Session · Mission 문서는
Glossary의 Official Terminology를 사용한다.
동일 용어를 문서마다 다시 정의하지 않는다.

## Explicit Non-Claims / Not Changed

다음은 **변경하지 않았다**.

- Architecture Freeze 본문 (`Architecture/**`)
- Generator / Search / Runtime 코드·책임
- Schema / Models
- PublishedDataset Contract
- Membership Contract
- Resolve Contract
- Commit / Push **없음**

## Next Track

**Phase 4 — Mission 01 Export Pipeline**

- Export → Product Host → Generator
- PublishedDataset handoff contract
- No Package emission · No Deployment · No Search migration

Roadmap: `SESSION_TRANSFER/Product Phase Handoff.md` · Official Pipeline: `GLOSSARY_SSOT` §5.2

## 산출물 (문서)

| 문서 | 내용 |
|------|------|
| `작업관리/GLOSSARY_SSOT.md` | Terminology Constitution (Step 1) |
| `CURSOR_SESSION_HANDOFF.md` | Session Read Order · Rules · Authority · Consume (Step 2) |
| `PROJECT_MASTER_INDEX.md` | Constitution · Governance · Next Track Mission 01 (Step 3 · v1.58) |
| `HISTORY/PROJECT_LOG_2026-08.md` | 본 항목 · Version **v1.18** |

---

# 2026-08-06 (Project Documentation — Phase 3 Complete)

## 제목

**Phase 3 Search Engine Enhancement Complete — Project Documentation Update**

## Summary

프로젝트 전체 관점에서 **Search Engine Architecture Complete**를 문서에 확정한다.
Phase 1 Foundation · Phase 2 Dataset Generator · Phase 3 Search Engine Enhancement가 모두 Complete이며, Next Track은 Product / Platform Carry 및 System Authoring / Dataset Expansion 준비이다.
본 항목은 **문서 업데이트만** 수행한다 (코드·테스트·Commit·Push 없음).

## Phase Map

| Phase | 이름 | 상태 |
|-------|------|------|
| **1** | Search Engine Foundation | ✅ Complete |
| **2** | Dataset Generator | ✅ Complete |
| **3** | Search Engine Enhancement | ✅ Complete |

## Phase 3 완료 범위 (Mission 35~42)

| Mission | 내용 | 상태 |
|---------|------|------|
| 35 | Spatial Index | ✅ |
| 36 | KDTree | ✅ |
| 37 | Membership Optimization | ✅ |
| 38 | Ranking | ✅ |
| 39 | Interpolation | ✅ |
| 40 | Geometry Metrics | ✅ |
| 41 | Runtime Wiring | ✅ |
| 42 | Quality Validation / E2E | ✅ |

## 검증 요약

- E2E PASS
- Benchmark PASS
- Regression PASS
- Full Test PASS (**248**)
- Search Quality Report: `search/quality/SEARCH_QUALITY_REPORT.md`
- **Search Engine Enhancement Complete** 선언

## Explicit Non-Claims

- 본 항목에서 코드 / 테스트 변경 **없음**
- Commit / Push **없음**
- Architecture Freeze 문서 내용 수정 **없음**

## Next Track

- Product / Platform Carry
- System Authoring / Published Dataset Expansion 준비
- Real System Corpus · Search Quality Tuning(실데이터) · Product Integration (후보)

## 산출물 (문서)

| 문서 | 내용 |
|------|------|
| `PROJECT_MASTER_INDEX.md` | Phase Map · Search Engine Architecture Complete · Next Track |
| `HISTORY/PROJECT_LOG_2026-08.md` | 본 항목 · Version **v1.17** |
| `CURSOR_SESSION_HANDOFF.md` | Phase 3 Complete · Next Track 후보 |

---

# 2026-08-06 (Search Engine Enhancement Phase Complete)

## 제목

**Mission 42 — Search Quality Validation & E2E · Phase 3 Complete**

## Summary

Phase 3 Enhancement Pipeline 전체에 대해 End-to-End Validation · Regression · Benchmark · Quality Report를 수행하고, **Search Engine Enhancement Phase Complete**를 선언한다. 새 검색 알고리즘·Engine 구현 변경은 없으며, Architecture Freeze / Foundation Contract / Generator는 수정하지 않았다.

## Architecture Review 요약

- Validation 대상 Pipeline: Spatial → KDTree → Membership → Ranking → Interpolation → Geometry → Resolve → SearchResult
- Runtime는 Orchestrator이며 계산을 수행하지 않는다.
- PublishedDataset Immutable / Membership·Resolve·SearchResult Contract 유지 확인
- Phase 3 완료 조건: E2E + Regression + Benchmark + Full Test PASS

## 검증 Suite

| Suite | 경로 | 결과 |
|-------|------|------|
| E2E Validation | `tests/test_search_enhancement_e2e.py` | **PASS** |
| Regression | `tests/test_search_enhancement_regression.py` | **PASS** |
| Benchmark / Quality | `tests/test_search_enhancement_benchmark.py` | **PASS** |
| Phase Complete Smoke | `tests/test_search_enhancement_phase_complete_smoke.py` | **PASS** |
| Full test suite | `tests/` | **PASS** |

## Search Quality Report

`search/quality/SEARCH_QUALITY_REPORT.md`

## 결과

- Full Search Pipeline E2E PASS
- Regression PASS
- Benchmark PASS
- Runtime 호출 순서 검증 PASS
- PublishedDataset Immutable 검증 PASS
- Membership / Resolve / SearchResult Contract 유지
- **Search Engine Enhancement Phase Complete**

## Explicit Non-Claims

- 새 검색 알고리즘 / 새 Metric **미구현**
- Ranking / Interpolation / Geometry / Runtime 구현 변경 **없음**
- Generator / Schema / Architecture 변경 **없음**

## Next

**Product / Platform Carry** — Display Boundary Continuation · STEP9 Pilot · Known Issues

---

# 2026-08-06 (Search Engine Enhancement Phase — Runtime Wiring 완료)

## 제목

**Mission 41 — Search Runtime Enhancement Wiring**

## Summary

Phase 3 Enhancement Engine들(Spatial Index · KDTree · Membership · Ranking · Interpolation · Geometry Metrics)을 기존 Search Runtime Host에 연결하였다. Runtime는 계산을 수행하지 않으며, Engine을 올바른 순서로 호출하는 Orchestrator 역할만 수행한다. Resolve / SearchResult Contract는 유지하였다.

## Architecture Review 요약

- Runtime = Host / Orchestrator (계산 금지).
- Pipeline: Spatial Index → KDTree → Membership → Ranking → Interpolation → Geometry Metrics → Resolve → SearchResult.
- `search/runtime/SearchEnhancementOrchestrator`가 Phase-3 Engine 호출을 담당한다.
- Resolve는 여전히 MembershipCandidate만 소비한다.
- PublishedDataset / Generator / Engine 구현은 수정하지 않았다 (Runtime wiring만).

## 구현 내역

| Layer | 경로 | 비고 |
|-------|------|------|
| Enhancement Orchestrator | `search/runtime/orchestrator.py` | Pipeline stage 호출 |
| Runtime Host wiring | `runtime/engine.py`, `runtime/factory.py` | Orchestrator 연결 |
| Integration / Smoke | `tests/test_runtime_enhancement*.py` | 호출 순서 · Resolve 계약 |

## 검증

| Suite | 결과 |
|-------|------|
| Runtime enhancement integration | **PASS** |
| Runtime enhancement smoke | **PASS** |
| Existing runtime tests | **PASS** |
| Full test suite | **PASS** |

## 결과

- Runtime가 모든 Engine을 올바른 순서로 호출
- Runtime 내부 계산 없음
- PublishedDataset 수정 없음
- Resolve Contract 유지
- SearchResult 계약 유지

## Explicit Non-Claims

- Search Quality Tuning **미구현**
- Benchmark / 추가 Metric **미구현**
- Generator / Schema 변경 **없음**

## Next

**Mission 42 — Search Quality Tuning** — Ranking/Interpolation/Geometry 통합 품질 조정

---

# 2026-08-06 (Search Engine Enhancement Phase — Geometry Metrics 완료)

## 제목

**Mission 40 — Geometry Metrics Engine**

## Summary

Foundation Geometry Context(`geometry/`)와 분리하여, 검색 품질용 Geometry Metrics Engine을 `search/geometry/`에 구현하였다. Geometry는 Metric Producer이며 Trajectory 생성·Sampling·Dataset Patch를 수행하지 않는다. Generator / Ranking / Interpolation 계약은 변경하지 않았다.

## Architecture Review 요약

- Geometry Metrics는 Interpolation 이후 Metric Producer이다.
- Foundation `geometry/` Context Layer와 책임 분리 (`search/geometry/` = Metrics only).
- MetricProvider는 독립 계층이며 distance / angle / similarity / error를 기본 제공한다.
- Trajectory 생성은 Generator만 담당하며, Metrics Engine은 호출하지 않는다.
- 출력 순서는 RefinedCandidate 순서를 보존한다 (재정렬 금지).

## 구현 내역

| Layer | 경로 | 비고 |
|-------|------|------|
| Geometry Metric Contract | `search/geometry/contract.py` | engine id · weights |
| Metric Providers | `search/geometry/providers.py` | distance/angle/similarity/error |
| Metric Engine | `search/geometry/engine.py` | RefinedCandidate[] + Query → GeometryEvaluatedCandidate[] |
| Fixture / Tests | `search/geometry/fixtures.py`, `tests/test_geometry_metrics*.py` | extension · no trajectory · smoke |

## 검증

| Suite | 결과 |
|-------|------|
| Geometry Metrics unit / regression tests | **PASS** |
| Geometry Metrics smoke test | **PASS** |
| Full test suite | **PASS** |

## 결과

- RefinedCandidate[] + GeometrySearchQuery 입력
- geometry_score / metric_detail 제공
- Metric Provider 확장 가능
- Trajectory 미생성 · Generator 미수정 · Dataset Patch 없음
- Ranking / Interpolation Contract 변경 없음

## Explicit Non-Claims

- Trajectory Generation **미구현**
- Runtime wiring **미구현**
- Search Quality Tuning **미구현**
- Resolve 변경 **없음**
- Foundation Geometry Context 계약 변경 **없음**

## Next

**Mission 41 — Search Quality Tuning** — Ranking/Interpolation/Geometry 통합 품질 조정

---

# 2026-08-06 (Search Engine Enhancement Phase — Interpolation Engine 완료)

## 제목

**Mission 39 — Interpolation Engine**

## Summary

Ranking 결과를 입력으로 받아 검색 품질 보정을 수행하는 Interpolation Engine을 구현하였다. Interpolation은 Ranking 순서와 Membership 판정을 재실행하지 않으며, `RankedCandidate[] → RefinedCandidate[]` refinement만 수행한다. PublishedDataset는 Immutable로 유지하였다.

## Architecture Review 요약

- Interpolation은 Ranking 이후 Refinement Layer이다.
- Ranking 순서를 보존하며 score만 보정한다 (재정렬 금지).
- Refinement Policy는 Engine과 분리된 독립 계층이다.
- Baseline Policy는 rank-continuity shrinkage (`rank_continuity_v1`)이다.
- PublishedDataset field 추가/patch/rewrite는 금지한다.

## 구현 내역

| Layer | 경로 | 비고 |
|-------|------|------|
| Interpolation Contract | `search/interpolation/contract.py` | policy id · continuity alpha |
| Refinement Policy | `search/interpolation/policy.py` | RankContinuityRefinementPolicy |
| Interpolation Engine | `search/interpolation/engine.py` | RankedCandidate[] → RefinedCandidate[] |
| Fixture / Tests | `search/interpolation/fixtures.py`, `tests/test_interpolation_engine*.py` | immutable · no re-rank · smoke |

## 검증

| Suite | 결과 |
|-------|------|
| Interpolation unit / regression tests | **PASS** |
| Interpolation smoke test | **PASS** |
| Full test suite | **PASS** |

## 결과

- RankedCandidate[] 입력 → RefinedCandidate[] 반환
- refinement_detail 제공
- Ranking / Membership 재실행 없음
- PublishedDataset Immutable 유지
- Generator / Ranking / Membership 수정 없음

## Explicit Non-Claims

- Geometry Metrics **미구현**
- Runtime wiring **미구현**
- Search Quality Tuning **미구현**
- Resolve 변경 **없음**

## Next

**Mission 40 — Geometry Engine** — Context only 이후 실제 Geometry 계산 단계

---

# 2026-08-06 (Search Engine Enhancement Phase — Ranking Engine 완료)

## 제목

**Mission 38 — Ranking Engine**

## Summary

Membership를 통과한 `MembershipCandidate[]`를 deterministic Score Model로 정렬하는 Ranking Engine을 구현하였다. Ranking은 Ordering만 담당하며 Membership Contract / Resolve / Runtime / PublishedDataset은 변경하지 않았다.

## Architecture Review 요약

- Ranking은 Membership 이후에만 수행된다.
- Score Model은 Ranking Engine과 분리된 독립 계층이다 (`ScoreModel` protocol).
- Baseline Score는 Membership flag contribution (`membership_flags_v1`)이며, 향후 Geometry metric scorer로 확장 가능하다.
- Tie-break는 `record_identity` 오름차순이며, Python `sorted`의 Stable Sort를 유지한다.

## 구현 내역

| Layer | 경로 | 비고 |
|-------|------|------|
| Ranking Contract | `search/ranking/contract.py` | score model id · weights |
| Score Model | `search/ranking/score.py` | MembershipFlagsScoreModel |
| Ranking Engine | `search/ranking/engine.py` | MembershipCandidate[] → RankedCandidate[] |
| Fixture / Tests | `search/ranking/fixtures.py`, `tests/test_ranking_engine*.py` | tie-break · stable sort · smoke |

## 검증

| Suite | 결과 |
|-------|------|
| Ranking unit / regression tests | **PASS** |
| Ranking smoke test | **PASS** |
| Full test suite | **PASS** |

## 결과

- MembershipCandidate[] 입력 → RankedCandidate[] 반환
- Score Model 독립 계층 유지
- Stable Sort / deterministic ordering 확인
- Tie-break Rule 정의 및 테스트
- score_detail 제공
- Membership / PublishedDataset / Generator 수정 없음

## Explicit Non-Claims

- Interpolation Engine **미구현**
- Geometry Metrics **미구현**
- Runtime wiring **미구현**
- Resolve 변경 **없음**
- Search Quality Tuning **미구현**

## Next

**Mission 39 — Interpolation Engine** — Search quality 보강용 파생 계산

---

# 2026-08-06 (Search Engine Enhancement Phase — Membership Optimization 완료)

## 제목

**Mission 37 — Membership Optimization Integration**

## Summary

기존 Membership Contract와 `MembershipCandidate` 모델은 그대로 유지한 채, 내부 후보 탐색 경로를 `Spatial Index -> KDTree -> Membership Gate`로 최적화하였다. 최적화 경로를 사용할 수 없거나 후보를 얻지 못한 경우에는 기존 full scan path로 즉시 fallback하도록 구현하여 결과 정합성을 유지하였다.

## Architecture Review 요약

- Membership는 여전히 최종 contract gate이며, Spatial Index와 KDTree는 후보 축소/정렬만 담당한다.
- 외부 API는 `PublishedDataset + MembershipQuery -> MembershipCandidate[]`로 유지한다.
- 최적화 경로가 비어 있거나 실패하면 full scan fallback을 수행해 기존 결과와 동일성을 보장한다.
- 최종 MembershipCandidate 순서는 dataset 원래 순서를 유지하여 legacy 결과 ordering을 보존한다.

## 구현 내역

| Layer | 경로 | 비고 |
|-------|------|------|
| Candidate Prefilter Adapter | `search/membership/adapter.py` | Spatial Index + KDTree 통합 |
| Membership Optimization Hook | `membership/engine.py` | optimized path + full scan fallback |
| Regression / Smoke | `tests/test_membership_engine.py`, `tests/test_membership_optimization_smoke.py` | 결과 동일성 / fallback 검증 |

## 검증

| Suite | 결과 |
|-------|------|
| Membership regression tests | **PASS** |
| Membership optimization smoke test | **PASS** |
| Full test suite | **PASS** |

## 결과

- Membership Contract 유지
- MembershipCandidate Model 유지
- Spatial Index → KDTree → Membership 경로 동작
- Full Scan Fallback 유지
- 동일 Query에서 기존 full scan과 동일한 Membership 결과 확인
- Resolve Contract 변경 없음
- Runtime API 변경 없음

## Explicit Non-Claims

- Ranking Engine **미구현**
- Interpolation Engine / Geometry Metrics **미구현**
- Runtime wiring **미구현**
- Resolve 변경 **없음**
- PublishedDataset / Generator 수정 **없음**

## Next

**Mission 38 — Ranking Engine** — MembershipCandidate ordering / scoring

---

# 2026-08-06 (Search Engine Enhancement Phase — KDTree 완료)

## 제목

**Mission 36 — KDTree Layer for Envelope Candidates**

## Summary

Mission 35의 Spatial Index 후보 집합을 입력으로 consume하는 KDTree 계층을 구현하였다. EnvelopeRecord는 cue centroid / target / second centroid 기반의 고정 6D 벡터로 encoding되며, KDTree는 deterministic top-N nearest shortlist만 반환하고 Membership 판정·Ranking·Geometry 계산은 수행하지 않는다.

## Architecture Review 요약

- Spatial Index는 coarse prefilter, KDTree는 shortlist retrieval로 책임을 분리한다.
- Encoding은 tree build/query와 분리하여 `search/kd_tree/encoding.py`에 고정한다.
- EnvelopeRecord는 set-valued(`cueSet`, `secondSet`) 구조이므로, KDTree coarse retrieval에서는 centroid representative를 사용한다.
- Tie-break는 `candidate_id` 오름차순으로 고정하여 동일 입력에 동일 순서를 보장한다.

## 구현 내역

| Layer | 경로 | 비고 |
|-------|------|------|
| KDTree Contract | `search/kd_tree/contract.py` | 6D 고정 차원 |
| Point Encoding | `search/kd_tree/encoding.py` | query direct / record centroid encoding |
| KDTree Builder | `search/kd_tree/builder.py` | 후보 집합 → KDTreeIndex |
| KDTree Query API | `search/kd_tree/query.py` | top-N nearest shortlist |
| Fixture / Smoke | `search/kd_tree/fixtures.py`, `tests/test_kd_tree*.py` | tie-break · Spatial Index 연동 검증 |

## 검증

| Suite | 결과 |
|-------|------|
| KDTree unit tests | **PASS** |
| KDTree smoke test | **PASS** |
| Full test suite | **PASS** |

## 결과

- Spatial Index 후보 집합으로 KDTree 생성 성공
- Query와 Record를 동일 6D contract로 encoding
- Query → Top-N nearest shortlist 반환 성공
- 결과에 `candidate_id`, `strategy_ref`, `distance`, deterministic tie-break metadata 포함
- Membership 계약 변경 없음
- PublishedDataset / Generator 수정 없음

## Explicit Non-Claims

- Membership Optimization Integration **미구현**
- Ranking / Interpolation / Geometry Metrics **미구현**
- Runtime wiring **미구현**
- Persisted KDTree / Dataset index field **미구현**
- Loader / Resolve / Schema 변경 **없음**

## Next

**Mission 37 — Membership Optimization** — KDTree shortlist consume

---

# 2026-08-06 (Search Engine Enhancement Phase — Spatial Index 완료)

## 제목

**Mission 35 — Spatial Index Design & Contract**

## Summary

Search Engine Enhancement Phase의 첫 단계로 Spatial Index 계층을 구현하고 coarse prefilter contract를 검증하였다. Spatial Index는 PublishedDataset로부터 런타임에 파생되는 memory-only index이며, PublishedDataset / Generator / Foundation Consumer 계약은 변경하지 않았다.

## 구현 내역

| Layer | 경로 | 비고 |
|-------|------|------|
| Spatial Index Builder | `search/spatial_index/builder.py` | PublishedDataset → SpatialIndex |
| Spatial Cell Contract | `search/spatial_index/contract.py` | 8×4 grid |
| Spatial Query API | `search/spatial_index/models.py` | `SpatialQuery` / `SpatialQueryResult` |
| Fixture / Smoke | `tests/test_spatial_index*.py` | PublishedDataset 기반 coarse prefilter 검증 |

## 검증

| Suite | 결과 |
|-------|------|
| Spatial Index unit tests | **PASS** |
| Spatial Index smoke test | **PASS** |
| Full test suite | **PASS** |

## 결과

- PublishedDataset로부터 Spatial Index 생성 성공
- Spatial Cell 생성 성공
- Query → Candidate ID 반환 성공
- Runtime-derived only 유지
- PublishedDataset 수정 없음
- Generator 수정 없음
- Foundation 계약 변경 없음

## Explicit Non-Claims

- KDTree **미구현**
- Membership 변경 **없음**
- Ranking / Interpolation / Geometry **미구현**
- Runtime wiring **미구현**
- Loader / Resolve / Schema 변경 **없음**

## Next

**Mission 36 — KDTree** — Membership 후보 접근 최적화

---

# 2026-08-06 (Dataset Generator Phase 완료)

## 제목

**Dataset Generator Phase Complete**

## Summary

Envelope Architecture Freeze SSOT 계약을 유지한 상태에서 Dataset Generator Phase 구현을 완료하였다. Generator Producer 계층은 Strategy 입력으로부터 PublishedDataset을 생성하며, 기존 Foundation Consumer(Validation / Loader / Membership)가 그 결과를 그대로 consume할 수 있음을 E2E로 검증하였다. **Architecture Freeze 문서·Foundation Consumer 계층·Schema/Models 계약은 수정하지 않았고, Commit/Push도 수행하지 않았다.**

## 구현 내역 (Generator Phase)

| Layer | 경로 | 비고 |
|-------|------|------|
| Trajectory Generator | `generator/trajectory_generator/` | Strategy → TrajectorySnapshot |
| Cue Sampler | `generator/cue_sampler/` | `cue_trajectory` → `cueSet` |
| Second Sampler | `generator/second_sampler/` | `line_of_score` → `secondSet` |
| Envelope Builder | `generator/envelope_builder/` | Strategy + Snapshot + Sets → EnvelopeRecord |
| Published Dataset Builder | `generator/published_dataset_builder/` | EnvelopeRecord[] → PublishedDataset |
| Generator Pipeline E2E | `tests/test_generator_pipeline_e2e.py` | Validation → Loader → MembershipCandidate |

## 검증

| Suite | 결과 |
|-------|------|
| Generator unit/smoke tests | **PASS** |
| Generator Pipeline E2E | **PASS** |
| Validation Layer | **PASS** |
| Loader 연동 | **PASS** |
| MembershipCandidate 생성 | **PASS** |
| Round-trip (`load` / `load_path`) | **PASS** |
| Full test suite | **PASS** |

## 결과

- PublishedDataset 생성 성공
- Validation PASS
- Loader가 PublishedDataset를 정상 Load
- PublishedDataset Model 유지
- Membership 입력 가능
- MembershipCandidate 반환 확인
- Generator Phase 종료

## Explicit Non-Claims

- Architecture / Schema / Models 의미 변경 **없음**
- Foundation Consumer (Loader / Membership / Resolve / Runtime) 수정 **없음**
- Ranking / Interpolation / KDTree / Spatial Index / Geometry 실계산 **미구현**
- Package Emit **미구현**
- Git Commit / Push **없음**

## Next

**Search Engine Enhancement Phase** — Spatial Index · KDTree · Membership Optimization · Ranking Engine · Interpolation Engine · Geometry Engine · Search Quality Tuning

## 산출물 (문서 세션)

| 문서 | 내용 |
|------|------|
| `PROJECT_MASTER_INDEX.md` | Dataset Generator Phase Complete · Next Search Engine Enhancement Phase |
| `HISTORY/PROJECT_LOG_2026-08.md` | 본 항목 · Version **v1.8** |
| `CURSOR_SESSION_HANDOFF.md` | Generator Phase Complete · Next Search Engine Enhancement Phase |

---

# 2026-08-06 (Search Engine Foundation Phase 완료)

## 제목

**Search Engine Foundation Phase 완료**

## Summary

Envelope Architecture Freeze SSOT 계약에 따라 Search Engine Foundation Phase 구현을 완료하고, 작업관리 문서에 상태를 반영하였다. **Architecture Freeze 문서·기존 SSOT 본문·구현 코드는 본 문서 세션에서 수정하지 않았다. Commit 없음.**

## 구현 내역 (Foundation Phase)

| Layer | 경로 | 비고 |
|-------|------|------|
| Schema | `schemas/` | Published Dataset · Package · Manifest · Version · Membership Candidate |
| Domain Models | `models/` | EnvelopeRecord · PublishedDataset · Package · Manifest · Version · MembershipCandidate |
| Validation Layer | `validation/` | jsonschema Draft 2020-12 · schema registry |
| Package Loader | `loader/` | Package → Validation → PublishedDataset |
| Membership Engine | `membership/` | PublishedDataset + Query → MembershipCandidate[] |
| Resolve Engine | `resolve/` | MembershipCandidate.strategy_ref → Strategy |
| Search Runtime | `runtime/` | Host: Membership → Resolve → SearchResult |
| Search Session | `session/` | 1회 Execution Context · SearchResult 재사용 |
| Strategy Repository | `strategy/` | Read-only MemoryStrategyRepository · FrozenStrategy Handle |
| Strategy Engine | `strategy_engine/` | Strategy Handle → StrategyExecution |
| Modal Engine | `modal/` | StrategyExecution → ModalExecution |
| Geometry Engine | `geometry/` | ModalExecution → GeometryContext (**계산 미구현 · Context only**) |

## 테스트

| Suite | 결과 |
|-------|------|
| Validation / Loader / Membership / Resolve / Runtime / Session / Strategy Repository / Strategy Engine / Modal / Geometry smoke tests | **PASS** (각 Mission 기준) |

## Architecture Freeze

- `Architecture/` Envelope Architecture SSOT **유지** (내용 수정 없음)
- Schema / Models / 기존 Consumer 계층 Freeze 계약 준수
- Generator · Ranking · KDTree · 실제 Geometry 계산 · Search Algorithm — **본 Phase 비범위**

## Explicit Non-Claims

- Dataset Generator Phase — **미착수**
- Architecture / Schema / Models 문서·코드 변경 — **없음** (본 문서 세션)
- Git Commit / Push — **없음**

## Next

**Dataset Generator Phase** — Trajectory Generator · Cue Sampler · Second Sampler · Envelope Builder · Published Dataset Builder

## 산출물 (문서)

| 문서 | 내용 |
|------|------|
| `PROJECT_MASTER_INDEX.md` | v1.56 → **v1.57** · Foundation Phase 완료 · Next Generator Phase |
| `HISTORY/PROJECT_LOG_2026-08.md` | 본 항목 · Version **v1.7** |
| `CURSOR_SESSION_HANDOFF.md` | Foundation 완료 · Generator Phase 이관 · cueSet/secondSet 정의 |

---

# 2026-08-04 (Reading Mode + C2 Reflection Rail Handle — 구현 완료 · 문서 반영)

## 제목

**D-DBP-16 / D-DBP-17 / D-DBP-18** — Reading Mode Implemented · C2 Reflection Rail Handle Implemented · Corner Cap Override

## Summary

이번 세션에서 USER Overlay **Reading Mode**와 ADMIN **C2 Reflection Rail Handle**을 구현·검증하고, Display Boundary Policy SSOT / MASTER INDEX / 본 로그에 완료 상태를 반영하였다. **본 항목의 문서 업데이트는 코드 수정 없음 · Commit/Push 없음.**

## 작업 로그 (시간순)

### ■ Reading Mode UX

- UX 설계 · SSOT §15 작성 (선행 v1.3)
- Overlay 확대: Max Height = Table Inner Height
- Typography × `ReadingFontScale=1.45`
- Aspect 유지 · 우측 상단 돋보기(+/-) 토글
- Backdrop 강화 · 내부 Scroll
- USER Overlay Shell only · Overlay 종료 시 OFF · Persistence 없음
- 구현: `UserOverlayShell.jsx` · `overlayLayoutTokens.ts` · `index.css`

### ■ Reading Mode 개선

- AI Overlay Width 계산 수정 — kind별 **originalAspect**
- AI/HPT: `AI_OVERLAY_ASPECT_RATIO`(6:4) · CALC: max-box aspect
- 줄바꿈 감소
- Reading Mode 토글 시 **Overlay Center 유지** (Drag/clamp 로직 비변경)

### ■ Reflection Handle (C2)

- ADMIN 전용 C2 Rail Handle (작은 노란 점)
- 1D Rail Drag · Rail Snap · `{ rail, t }` Persist (`reflectionOverride`)
- Builder: Override 있으면 Reflection 계산 Skip (`anchors.C2`)
- USER Handle 비표시 · Reflection Engine / `detectRail` 수식 비변경
- Display Layer 중심 · Builder 최소 변경

### ■ Corner 처리

- Manual Override 경로에서 Display Cap **sameRail 절단 생략** (`skipSameRail`)
- `detectRail` 수정 없음 · Reflection Engine 수정 없음 · Builder는 Cap 옵션 전달만

## Decision Log

| ID | Decision |
|----|----------|
| **D-DBP-16** | Reading ON Width = kind별 originalAspect |
| **D-DBP-17** | Reading 토글 시 Overlay Center 유지 · Drag 로직 비변경 |
| **D-DBP-18** | C2 Override rail+t · Cap `skipSameRail` · USER Handle 비표시 |

## 최종 상태

| 항목 | 상태 |
|------|------|
| Reading Mode | **완료** |
| C2 Reflection Handle | **완료** |
| Corner Override (`skipSameRail`) | **완료** |
| Build | **PASS** |
| Unit | **PASS** |
| Lint | **PASS** |

## 산출물 (문서 세션)

| 문서 | 내용 |
|------|------|
| `DISPLAY_BOUNDARY_POLICY_SSOT.md` | v1.3 → **v1.4** (§15 Implemented · §16 C2 Handle) |
| `PROJECT_MASTER_INDEX.md` | v1.55 → **v1.56** |
| `HISTORY/PROJECT_LOG_2026-08.md` | 본 항목 · Version **v1.6** |

## Explicit Non-Claims

- Continuation / Boundary / CASE A / Corrected Cap Minimum 코드 — 미착수
- Extension Runtime redesign — 비대상
- 본 문서 업데이트 세션의 코드·Git Commit/Push — 없음

## Next

Continuation · CASE A attach · Corrected Cap Minimum · Display Boundary · 또는 Handle Drag 잔여 간섭.

---

# 2026-08-04 (Display Boundary Policy SSOT v1.3 — Reading Mode UX)

## 제목

**D-DBP-13 / D-DBP-14 / D-DBP-15** — Overlay Reading Mode UX 정책 SSOT 추가 (문서 only)

## Summary

Overlay Reading Mode를 구현하기 전에, Display Boundary Policy와 동일 수준의 Presentation UX SSOT를 `DISPLAY_BOUNDARY_POLICY_SSOT.md` §15로 확정하였다. Cap/Boundary/Extension Runtime과 **독립**이며, USER Overlay Shell만 대상이다. **코드·CSS·Component·Icon 수정 없음.**

## 추가 정책

| 항목 | 내용 |
|------|------|
| 적용 | USER Overlay (AI · 계산 · 타점) · Shell only |
| 비적용 | ADMIN · Content Panel · Runtime/Builder/Dataset/Search/Extension |
| ON | Max Height = Table Inner Height · Aspect 유지 · Width 자동 · Typography ×1.45 · Backdrop↑ · 내부 scroll |
| 토글 | 우측 상단 돋보기(+)/(-) |
| Animation | 150–180ms ease-out |
| Reset | Overlay 종료 시 OFF · localStorage 없음 |

## Decision Log

| ID | Decision |
|----|----------|
| **D-DBP-13** | Reading Mode = Presentation UX · Display Boundary와 독립 |
| **D-DBP-14** | USER Overlay Shell만 · Content Panel 수정 금지 |
| **D-DBP-15** | Overlay 종료 시 Reading 상태 초기화 · no localStorage |

## 산출물

| 문서 | 내용 |
|------|------|
| `DISPLAY_BOUNDARY_POLICY_SSOT.md` | v1.2 → **v1.3** (§15 Reading Mode) |
| `PROJECT_MASTER_INDEX.md` | v1.54 → **v1.55** |

## Explicit Non-Claims

- Reading Mode 코드/아이콘/CSS 미구현
- OVERLAY_LAYOUT_SSOT 본문 교차 개정은 구현 Phase에서
- Cap / Continuation / Boundary / Extension 미변경

## Next

Reading Mode 구현 (Shell · tokens · App state) 또는 Continuation / Corrected Cap Minimum / Boundary.

---

# 2026-08-04 (Display Boundary Phase 2A — Overlay Attach Gate)

## 제목

**D-DBP-12** — Branch별 Trajectory Extension Overlay Attach/Visibility Gate (CASE B)

## Summary

USER 기준값에서 baseline은 C4까지 정상이나, `TrajectoryExtensionLayer`가 draft 존재만으로 corrected Reveal/E1/E2를 항상 그리던 문제를 Presentation Gate로 해결하였다. Runtime draft/hydrate는 유지한다. **“baseline이면 무조건 숨김”이 아니라** `baselineContinuationAllowed`로 CASE A 확장점을 남긴다.

## 구현

| 항목 | 내용 |
|------|------|
| Helper | `renderer/trajectory/trajectoryExtensionOverlayVisibility.ts` |
| App | mount: `extensionOverlayVisibility.attach` |
| USER baseline (Phase 2A) | `baselineContinuationAllowed: false` → attach=false |
| USER corrected / ADMIN | draft 있으면 attach=true |

## 검증

- unit: overlay visibility 5 cases
- Cap tests 회귀
- Build / Lint

## Explicit Non-Claims

- Continuation Rule 미구현 (CASE A attach는 이후)
- Corrected Cap Minimum 코드 미구현
- Extension Runtime / Builder / Hydrate / Search 미변경
- Commit / Push 없음

## Next

Continuation Rule → CASE A `baselineContinuationAllowed` · Corrected Cap Minimum · Display Boundary.

---

# 2026-08-04 (Display Boundary Policy SSOT v1.1 — Corrected Minimum)

## 제목

**D-DBP-10 / D-DBP-11** — Corrected Display Minimum Guarantee 문서 추가 (Phase 1.5 · 문서 only)

## Summary

Architecture Review 결과, corrected Display Cap이 `second_ball` 미교차 시 기본 **C3**에서 끝나는 현행이 5&Half 제품 의도(계산 결과 C4까지 표시)와 불일치함을 확인하였다. `DISPLAY_BOUNDARY_POLICY_SSOT.md`를 **v1.1**로 보강하여 Corrected Display Minimum Guarantee를 규범화하였다. **코드 수정 없음.**

## 추가 정책

| 항목 | 내용 |
|------|------|
| Corrected Minimum | 세컨드볼과 무관하게 **C4까지 항상 표시** · second_ball로 C3 종료 **금지** |
| C5/C6 | Continuation Rule만 결정 |
| Baseline ↔ Corrected | **최소 C4 정책 공유** · 차이는 path(계산 결과) |
| Cap Priority | Invalid → Chain → **Minimum Guarantee** → Continuation → Physical Limit → Second Ball |

## Decision Log

| ID | Decision |
|----|----------|
| **D-DBP-10** | Corrected는 계산 결과가 존재하는 마지막 계산 쿠션(C4)까지 항상 표시 |
| **D-DBP-11** | Continuation은 C4 이후만 · C4 Minimum과 독립 |

## 산출물

| 문서 | 내용 |
|------|------|
| `DISPLAY_BOUNDARY_POLICY_SSOT.md` | v1.0 → **v1.1** |
| `PROJECT_MASTER_INDEX.md` | v1.53 · Display Boundary 절·참고 갱신 |

## Explicit Non-Claims

- Corrected Cap 코드 미구현 (다음: `trajectoryPathDisplayPolicy.ts`)
- Builder / Extension / Hydrate / Search / Runtime 미변경
- Commit / Push 없음

## Next

Corrected Display Cap C4 Minimum 구현 → Continuation Rule → Display Boundary → Overlay Attach.

---

# 2026-08-04 (Display Boundary Policy SSOT v1.0)

## 제목

**D-DBP-01…09** — USER 기준값/보정값 Display Boundary Policy SSOT 신규 작성 (문서 only)

## Summary

Trajectory Extension은 Task Closed / Runtime Freeze를 유지한 채, USER **기준값 vs 보정값**의 Display Layer 상위 정책이 없음을 확인하고 `DISPLAY_BOUNDARY_POLICY_SSOT.md` v1.0을 신규 작성하였다. Extension Runtime을 Difference로 취급하지 않으며, Builder → Cap → Boundary → Overlay Attach → Render 역할을 분리한다. **코드·Runtime·Builder·Hydrate·Dataset·Search 변경 없음.**

## 배경

- Extension Overlay / Cap / baseline·corrected path는 각각 존재하나, “사용자에게 무엇을 어디까지 보여줄까”는 SSOT 부재
- 증상 분석에서 Extension Layer 숨김만으로는 CASE A(동일 계산 → 동일 표시)와 C4 Minimum이 설명되지 않음
- 근본은 Display Boundary 정책 부재 · baseline의 corrected ceiling 종속 등 **Display Cap/Boundary** 이슈

## 산출물

| 문서 | 내용 |
|------|------|
| `작업관리/DISPLAY_BOUNDARY_POLICY_SSOT.md` | Policy SSOT v1.0 |
| `PROJECT_MASTER_INDEX.md` | v1.52 · 문서 계층·참고·Display 절·차기 우선순위에 등록 |

## 핵심 정책 (요약)

- Extension ≠ Difference · Runtime Geometry는 Boundary 입력 아님
- Cap = 단일 path 절단 · Boundary = 두 path 비교/조립 · Overlay Attach = Boundary 이후
- baseline **C4 Minimum** · corrected second_ball / corrected ceiling **비종속**
- **Continuation Rule** (Cap 하위 · axis long/short) · false → C4 종료 · 실패 segment 미표시
- 구현 전 Architecture Review · 수정 허용 = Cap / Boundary / Overlay Attach only

## Explicit Non-Claims

- 코드 구현 없음
- `TRAJECTORY_EXTENSION_SSOT.md` 미수정
- Builder / Hydrate / Dataset / Search / Extension Runtime / `activateStrategySlot` 미변경
- Commit / Push 없음 (문서 세션 · 사용자 지시 시)

## Next

Architecture Review → Display Cap(C4 Minimum · Continuation · ceiling 해소) → Display Boundary → Overlay Attach 순 구현 검토.

---

# 2026-08-03 ~ 2026-08-04 (Trajectory Extension 완료 · USER Search Runtime Activation)

## 제목

**D-EXT-26** — Trajectory Extension Product Complete · USER Search ↔ Strategy Pick Runtime 경로 통합 (`activateStrategySlot`)

## Summary

Trajectory Extension(궤적 연장) Overlay를 Architecture Freeze(v1.3)부터 구현·통합하고, USER Search에서 Extension이 표시되지 않던 문제를 Runtime Slot Activation 누락으로 확정·해결하였다. Search 전용 Hydrate는 만들지 않았고, 공략 버튼(`pickStrategySlot`)과 동일한 `activateStrategySlot()` 경로만 공유한다. **Trajectory Extension Task Closed.**

---

## 1. 문제

USER Search(및 초기 분석 시점의 ADMIN Published Search)에서 Working/Published에 `trajectoryExtensions`가 저장되어 있어도 Extension Layer가 보이지 않았다.

- ADMIN Local DB Recall → Extension 표시 **정상**
- SAVE → Working Dataset → Export → `positions.json`에 `strategies.S*.trajectoryExtensions` **존재**
- `buildDraftsFromRecord` / `draftRuntimeFieldsFromStrategyEntry`는 payload를 draft에 **정상 복사**

---

## 2. 원인 분석

조사 순서: Published Leaf → SAVE → Hydrate whitelist → Render → **USER Runtime gate**.

| 기각 / 부차 | 내용 |
|-------------|------|
| Export Builder strip | Export는 StrategyEntry pass-through · 필드 유지 |
| `buildDraftsFromRecord` 누락 | whitelist에 `trajectoryExtensions` 포함 |
| 다른 Position 오선택 | 희소 데이터·`userStrict`에서 주원인 아님 (부차: cache stale 가능) |

**최종 원인:** USER Search 성공 후 `userTableDisplaySlotId`를 설정하지 않음.

```text
applyUserSearchRecall  →  slot.draft.trajectoryExtensions = O
        ↓
userTableDisplaySlotId 미설정 (null)
        ↓
App Extension hydrate effect
  if (!userTableDisplaySlotId) {
    setTrajectoryExtensionDraft(null);
    return;
  }
        ↓
extensionDraftCount === 0 → TrajectoryExtensionLayer 미마운트
```

기존 SSOT는 “공략 클릭 시 table hydrate”였고, Search는 draft/labels만 만들었다. Extension Layer는 `userTableDisplaySlotId` 게이트에 묶여 있어 Search 직후 Runtime이 열리지 않았다.

---

## 3. 해결

### `activateStrategySlot(slotId)` (App.jsx)

공용 Runtime Slot Activation (Overlay/UI 제외):

```text
actions.switchSlot(slotId)
  → setUserTableDisplaySlotId(slotId)
  → hydrateSlotRuntime(slotId)
```

- `pickStrategySlot` → Overlay clear 후 **`activateStrategySlot` 호출**
- USER Search 성공 → `resolveUserSearchDisplaySlotId` (activeSlot ∈ record.strategies ? 유지 : S1→S2→S3 첫 슬롯) → **`activateStrategySlot`만 호출**
- Search 전용 Hydrate / Extension / Trajectory 경로 **없음**
- `applyUserSearchRecall`은 `flushSync`로 커밋 후 Activation (stale slots 방지 · `shotEditorRef`)

### SSOT

`TRAJECTORY_EXTENSION_SSOT.md` → **v1.4** (Runtime Flow · Search/Pick 공유 · Search-only Hydrate 부재 명시).

---

## 4. 결과

| 검증 | 결과 |
|------|------|
| ADMIN Local DB Recall | 정상 |
| ADMIN Published Search | 정상 |
| USER Search | 정상 (Extension/Trajectory/Target/Layer) |
| SAVE → Refresh → Recall | 정상 |
| Strategy Slot 전환 / Pick | 정상 (`activateStrategySlot` 공유) |
| ADMIN ↔ USER 전환 세션 리셋 | 정상 |
| Extension Handle | 정상 (Handle First Drag 잔여 간섭은 후속 후보) |

**Trajectory Extension 기능 완료 (Task Closed).**

---

## Decision Log (본 항목)

| ID | Decision |
|----|----------|
| **D-EXT-26** | USER Search와 Strategy Pick은 `activateStrategySlot()` 단일 Runtime Activation 경로를 공유한다. Search 전용 Hydrate를 만들지 않는다. |

---

## 변경 파일 (구현 세션 · 문서 세션 제외)

| 파일 | 내용 |
|------|------|
| `frontend/src/App.jsx` | `activateStrategySlot` · `resolveUserSearchDisplaySlotId` · Search/`pickStrategySlot` 통합 · `shotEditorRef` |
| `frontend/src/application/flows/userSearchFlow.ts` | 성공 시 matched `PositionRecord` 반환 |
| (선행) Extension Domain / SAVE / Hydrate whitelist / Layer | S1–S3 · Role · Projection 등 |

---

## Explicit Non-Claims

- Trajectory Builder · Formula · Display Cap · Runtime Contract · Dataset Formula **미수정**
- Search 전용 Hydrate 엔진 **미도입**
- Handle First Drag 잔여 간섭 **미해결** (후속)
- Commit / Push (문서 세션) **없음**

---

## Current Status

```text
Trajectory Extension     : Completed / Task Closed (SSOT v1.4)
USER Search Runtime      : activateStrategySlot 통합
ADMIN / USER paths       : Runtime Activation 공유
Build / Lint             : PASS (구현 세션 기준)
Next (Product)           : Handle Drag 잔여 또는 차기 기능
```

## Next

Handle First Drag 잔여 간섭 정리, 또는 신규 Product 세션. 상세는 `CURSOR_SESSION_HANDOFF.md`.

---

# 2026-08-01 (SYS Apply 백지화 해결 · Runtime Contract SSOT 완성 · ModalShell Native Selection 제거)

## 제목

**D-RTC-01 / D-OVLSEL-01** — `buildSlotDraftWithUpdatedSys()` legacy `profile` dangling reference 제거 · ModalShell open 시 browser native Selection 초기화

## Summary

관리자 SYS 설정에서 **적용(Apply)** 을 누르면 화면 전체가 백지화되던 오류와, 새로고침 후 **첫 SYS Overlay**를 열 때 패널 텍스트가 파랗게 선택 표시되던 오류를 각각 해결하였다.

백지화의 원인은 `useShotSlots.ts`의 `buildSlotDraftWithUpdatedSys()`가 Batch 6 Runtime Contract 이관 후에도 남아 있던 **선언되지 않은 `profile` 변수**를 debug 필드에서 참조하던 것이다. `commitDraftSys` 경로의 React render phase에서 `ReferenceError`가 발생했고, ErrorBoundary가 없어 React root 전체가 unmount되었다. 같은 함수가 이미 Runtime Contract에서 해석해 둔 `formulaExpr`을 재사용하도록 바꿔, 해당 함수의 마지막 legacy 직접 참조를 제거하고 **Runtime Contract SSOT를 완성**하였다.

파란 selection highlight는 Interaction 문제가 아니라 **브라우저 native text selection의 잔존**이었다. Target Ball 더블클릭이 만든 Selection Range가 살아 있는 상태에서 ModalShell panel DOM이 삽입되면, 새 텍스트가 그 Range에 편입되어 highlight로 렌더된다. ModalShell이 열릴 때 1회 `window.getSelection()?.removeAllRanges()`를 호출해 native Selection만 초기화하는 방식으로 해결하였다. Pointer Capture / `preventDefault` / dblclick 로직 / `user-select` CSS는 일절 변경하지 않았다.

---

## 1. SYS Apply 백지화 (D-RTC-01)

### 문제

- ADMIN에서 기존 포지션을 불러와 SYS 값을 수정하고 **적용**을 누르면 화면 전체가 백지화
- Console: `Uncaught ReferenceError: profile is not defined at buildDraftWithUpdatedSys (useShotSlots.ts:315:17)`
- 사용자 체감상 "신규 포지션은 정상, 기존 포지션만 실패"로 보였음

### Root Cause

`frontend/src/hooks/useShotSlots.ts` `buildSlotDraftWithUpdatedSys()` 내부 debug 필드가 **선언되지 않은 `profile` 변수**를 참조하고 있었다.

```text
Batch 6 Runtime Contract 이관
    ↓
system JSON 직접 접근(profile) → getSystemContract() 경유로 전환
    ↓
같은 함수 상단은 formulaExpr 로 정상 이관됨 (line 255)
    ↓
debug.expr 한 줄만 legacy profile 참조로 잔존 (line 315)
    ↓
commitDraftSys → setState updater(render phase)에서 ReferenceError
    ↓
ErrorBoundary 부재 → React root unmount → 백지 화면
```

**신규 / 기존 포지션 차이에 대한 정정**

오류는 포지션 종류와 무관하게 `commitDraftSys`가 호출될 때마다 발생한다. 새로고침 직후에는 SYS Overlay 컨트롤을 활성화하기 위해 Target Ball 더블클릭이 선행되어야 하고, 그 경로를 거친 뒤에야 Apply에 도달하기 때문에 "기존 포지션에서만 발생"하는 것처럼 관측된 것이다.

### 해결 내용

이미 같은 함수에서 Runtime Contract로 해석해 둔 `formulaExpr`을 재사용한다.

```text
line 255 : const formulaExpr = getSystemContract(nextSystemId)?.profile?.formulaExpr ?? null;
line 315 : expr: profile?.formula?.expr ?? null   →   expr: formulaExpr
```

- 변경 1줄 · 계산 결과에 영향 없음 (debug 표시 필드)
- System JSON 직접 접근 경로가 사라져 해당 함수의 Runtime Contract 경유가 완성됨

### 정적 분석이 놓친 이유

| 도구 | 사유 |
|------|------|
| Build (`vite build`) | `tsc --noEmit` 미포함 — 타입 체크 없이 transpile only |
| Lint (`eslint .`) | `eslint.config.js`의 `files: ['**/*.{js,jsx}']` — `.ts` 파일 미검사 |

> **후속 후보(미적용):** build에 `tsc --noEmit` 추가 또는 ESLint 대상에 `.ts` 포함. 이번 세션 범위 외.

### Commit

`abeca84` — fix(sys): resolve blank screen on SYS apply by removing legacy profile reference

---

## 2. ModalShell Native Selection (D-OVLSEL-01)

### 문제

- 관리자 새로고침 → Target Ball 더블클릭 → SYS Overlay 오픈
- **첫 오픈에서만** 패널 텍스트 전체가 파란 selection highlight 상태로 표시
- 닫았다 다시 열면 정상

### Root Cause

**Pointer Capture / Interaction 문제가 아니다.** 브라우저 native text selection의 잔존이다.

```text
Target Ball 더블클릭 (native dblclick 보존 정책에 따라 preventDefault 없음)
    ↓
브라우저가 Selection Range 생성 (word/paragraph 단위)
    ↓
Range가 해제되지 않은 채 유지
    ↓
SYS Overlay(ModalShell) panel DOM 삽입
    ↓
새 텍스트 노드가 기존 Range 범위 안에 편입
    ↓
selection highlight 렌더
```

"첫 오픈에서만" 발생하는 이유는, SYS 버튼이 Target Ball 더블클릭 이후에만 활성화되기 때문이다. 즉 Overlay를 열기 직전 동작이 반드시 더블클릭이며, 그 더블클릭이 남긴 Selection이 그대로 Overlay에 걸린다. 두 번째 오픈부터는 직전 상호작용이 더블클릭이 아니므로 재현되지 않는다.

**기여 조건**

- `.modal-panel` / `.modal-panel--sys`에 `user-select` 규칙 없음
- `::selection` 커스텀 규칙 없음 (브라우저 기본 파란색)
- `handlePointerDown`은 native dblclick 보존을 위해 `preventDefault()`를 호출하지 않음 (Pointer Capture Timing SSOT)
- `handleBallDoubleClickForTarget`의 `preventDefault()`는 Selection이 이미 생성된 뒤라 시점상 무효
- ModalShell이 mount 시 Selection / focus를 정리하지 않음

### 해결 내용 (Option A)

ModalShell이 열릴 때 1회 native Selection만 초기화한다.

```text
frontend/src/components/common/ModalShell.jsx

useEffect(() => {
  if (!open) return;
  window.getSelection()?.removeAllRanges();
}, [open]);
```

- ModalShell은 닫혀 있을 때 `null`을 렌더링하되 컴포넌트 자체는 mount 상태로 남으므로, 실제 panel DOM이 삽입되는 `open === true` 전환을 기준으로 한다.
- 기존 drag-state 초기화 effect에 병합하지 않고 전용 effect로 분리하여 의도와 롤백 경계를 명확히 유지한다.
- **파일 표기 정정:** 프로젝트에 `ModalShell.tsx`는 존재하지 않는다. 실제 파일은 `ModalShell.jsx`이다.

### 절대 변경하지 않은 것

Pointer 이벤트 · `preventDefault` 추가 · dblclick 로직 · `user-select` CSS · Ball / Pad / SVG Interaction · Pointer Capture Timing. **Native Selection 초기화 외 리팩터링 없음.**

### Commit

`7ef9601` — fix(overlay): clear stale native selection when ModalShell opens

---

## 검증 결과

localhost dev server(`5175`)에서 브라우저 직접 검증.

### 대조군 (Selection 소멸 원인 귀속)

| 절차 | rangeCount |
|------|-----------|
| Selection 생성 후 **비 Overlay 버튼** 프로그램 클릭 | 1 → **1** (유지) |
| Selection 생성 후 **SYS Overlay 오픈** | 1 → **0** (초기화) |

비 Overlay 클릭에서는 Selection이 유지되므로, Overlay 오픈 시의 소멸은 ModalShell effect에 귀속된다.

### 기능 / Regression

| 항목 | 결과 |
|------|------|
| SYS Overlay 파란 Selection Highlight | **없음** |
| SYS 계산 | 정상 (C0=50 · C1=70 → C3 자동 -20 · 기준 계산 블록 렌더) |
| SYS 적용 (`commitDraftSys`) | 정상 · 백지화 없음 · 궤적 반영 |
| HP/T Overlay | 정상 (오픈 · 렌더 · 닫기 · Selection 0) |
| STR Overlay | 정상 (오픈 · 렌더 · 닫기 · Selection 0) |
| AI Overlay | 정상 (오픈 · 렌더 · 닫기 · Selection 0) |
| Workspace History Modal (동일 ModalShell 소비자) | 정상 · Selection 0 |
| Target Ball DoubleClick | 정상 (SYS 버튼 disabled → enabled 전환 확인) |
| Ball Drag | 정상 (요청 좌표 (875,690) 정확 도달) |
| Pointer Capture 시점 | **pointermove에서 획득** — Pointer Capture Timing SSOT 유지 확인 |
| Pad Drag (Joystick) | 정상 (gain 비율대로 공 추종) |
| Console Error | **0건** (전 과정) |
| Fresh Load | 정상 렌더 · 에러 0 |
| Build | **PASS** (`vite build` 5.68s) |
| Lint | **PASS** — 변경 전/후 동일 (`ModalShell.jsx` 기존 `react-hooks/refs` 1건만, 신규 0) |
| Regression | **없음** |

> **검증 한계 (Explicit):** 브라우저 자동화 도구의 왕복 지연이 dblclick 임계시간보다 길어, 두 번의 물리 클릭으로는 native dblclick이 성립하지 않았다. Target Ball DoubleClick 항목은 `dblclick` 이벤트 직접 dispatch로 검증하였다. 실제 마우스 더블클릭 육안 확인은 별도 권장.

---

## Decision Log

| ID | Decision |
|----|----------|
| **D-RTC-01** | Runtime Contract 이관 대상 함수는 debug / 표시 전용 필드까지 포함하여 System JSON 직접 접근을 남기지 않는다. Contract에서 이미 해석된 값을 재사용한다. |
| **D-OVLSEL-01** | ModalShell은 `open` 전환 시 1회 `window.getSelection()?.removeAllRanges()`로 browser native Selection을 초기화한다. |
| **D-OVLSEL-02** | Overlay는 **browser selection 상태만** 초기화한다. Pointer Capture / Ball / Pad Interaction은 변경하지 않는다. Selection 문제를 `preventDefault` 추가나 `user-select` CSS로 해결하지 않는다. |

---

## 변경 파일 / 함수

| 파일 | 함수 / 위치 | 내용 |
|------|-------------|------|
| `frontend/src/hooks/useShotSlots.ts` | `buildSlotDraftWithUpdatedSys()` line 315 | `profile?.formula?.expr ?? null` → `formulaExpr` |
| `frontend/src/components/common/ModalShell.jsx` | `ModalShell` — `open` 전용 `useEffect` | native Selection 1회 초기화 |

---

## Explicit Non-Claims

- SYS 계산 엔진 · Formula · Registry · Dataset 변경 **없음**
- Pointer Capture Timing (D-INTERACT-01~03) 변경 **없음**
- `preventDefault` 추가 **없음** · `user-select` CSS 추가 **없음**
- Ball / Pad / SVG Interaction 변경 **없음**
- USER Overlay(`UserOverlayShell`) 변경 **없음** — ModalShell은 ADMIN 계열 모달 전용
- ErrorBoundary 도입 **없음** (후속 후보)
- build `tsc --noEmit` / ESLint `.ts` 포함 **미적용** (후속 후보)

---

## Interaction / Overlay SSOT

Overlay native Selection 규칙은 `2_FRONTEND_ARCHITECTURE_BASELINE_v1.md` **§Overlay Native Selection (Interaction SSOT)** 에 고정한다.

---

## Current Status

```text
Pointer Capture Timing   : 안정 (D-INTERACT-01~03 유지)
Target Ball DoubleClick  : 안정
Runtime Contract SSOT    : 완료 (legacy profile dangling reference 제거)
SYS Apply 백지화          : 해결
ModalShell Selection      : 해결
Build                    : PASS
Lint                     : PASS
Regression               : 없음
Commit                   : abeca84 · 7ef9601
```

## Next

~~**Trajectory Extension 설계**~~ → **Completed (2026-08-03~04)**. 상단 최신 로그 · `CURSOR_SESSION_HANDOFF.md` 참조.

---
