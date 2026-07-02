# App.jsx 완전 해부 문서

작성일: 2026-06-27  
대상 파일: `frontend/src/App.jsx`  
분석 기준: 현재 업로드된 `App.jsx` 스냅샷  
파일 규모: 약 9,079 lines / 약 310 KB

---

## 0. 요약 결론

현재 `App.jsx`는 단순한 React 화면 파일이 아니라, 다음 책임을 한 파일 안에서 동시에 수행하고 있다.

1. App 전체 오케스트레이션
2. ADMIN / USER 모드 상태 관리
3. SYS Overlay 렌더링 및 계산 입력 처리
4. HP/T, STR, AI, History Overlay 연결
5. Slot draft / applied 연결
6. Published Dataset Search / LocalDB / Recall 흐름 연결
7. Trajectory 생성 및 표시
8. SystemValueLabels / Caption / Axis 표시 제어
9. Baseline drag / endpoint 편집
10. Sample JSON loader
11. 공 위치 drag / impact / physics 계산 연결
12. Debug / Trace / 검증 로그

따라서 `App.jsx`는 현재 **Controller + UI + Domain Glue + 일부 시스템 특수 로직**이 혼합된 상태이다.

다만 중요한 점은, `App.jsx`가 처음 우려했던 것처럼 완전히 `5_half_system` 전용으로만 작성된 것은 아니다. 이미 많은 핵심 계산은 다음 구조를 사용한다.

```txt
SYSTEM_PROFILES[systemId]
profile.formula.expr
calculateByProfileExpr()
getAnchorsForRendering()
getAnchorsForSystem(systemId)
useShotSlots()
useTrajectoryState()
```

즉, **계산 엔진 자체는 상당 부분 profile 기반으로 일반화되어 있다.**

문제는 `App.jsx` 내부에 아직 다음과 같은 5½ 전용 규칙과 기본값이 남아 있다는 것이다.

```txt
5_half_system / 5_HALF / five_half
SYS_SYSTEM_CONFIG
useSn
solveFiveHalfTwoOfThree()
fiveHalfComputedInputKey()
isFiveHalfSystemId()
/samples/5_half_system
mergeBaselineDraftInputDeltaForCommit() 내부 5½ 분기
C3_r missing (5_half) 검사
SYS Overlay 내부 시스템 목록 하드코딩
```

따라서 향후 방향은 다음이 맞다.

> `App.jsx`를 시스템별 계산 규칙을 모르는 오케스트레이터로 축소하고,  
> 시스템별 커스터마이징은 `profile.json`, `logic.json`, `system_meta.json`, `domain/*`으로 이동한다.

---

## 1. App.jsx 현재 책임 지도

### 1.1 Import 계층

`App.jsx`는 이미 많은 domain / hook / component를 import한다.

대표 계층:

```txt
hooks/
  useShotSlots
  useTrajectoryState
  useCoachingController
  useSystemController
  useDisplayController
  useSettings
  useUserToast

domain/
  adminSysFromSlot
  slotRuntimeHydrate
  strategyButtonModel
  userInfoPanelModel
  userHptViewModel
  railEngine
  userDisplayFlags
  userTrajectoryCardViewModel
  adminSaveEngine
  positionMergeEngine
  canonicalStrategy
  systemEngine
  anchorCoordinateEngine
  anchorLookupEngine
  trajectoryPathDisplayPolicy
  reflectionEngine
  recall/recallEngine
  publishedDatasetStore
  publishedLeafResolve
  positionRecallTrace
  dataset/search

components/
  UserAiPanel
  UserHptPanel
  UserTrajectoryInfoCard
  SystemValueLabels
  WorkspaceHistoryModal
  ModalShell
  ImpactLines
  SystemGrid
  CoachingOverlay
```

이 구조 자체는 나쁘지 않다. 이미 모듈화는 많이 진행되어 있다.

다만 문제는, import된 domain을 사용하는 최종 조합과 일부 특수 계산이 아직 `App.jsx` 안에 직접 남아 있다는 점이다.

---

## 2. App.jsx 내부 주요 구역

### 2.1 전역 상수 / 기하 상수

위치: 대략 lines 177~301

현재 `App.jsx` 내부에 다음 상수들이 존재한다.

```txt
TABLE_CONFIG 기반 SCALE / TABLE_W / TABLE_H / PADDING
ADMIN_BUTTONS
INITIAL_BALLS_RG
SHOTS
BALL_DIAMETER_MM
RG_UNIT_MM
BALL_DIAMETER_RG
BALL_RADIUS_RG
PHYSICS_SCALE
CUSHION_MM
FRAME_MM
POINT_OFFSET_MM
```

판단:

- `TABLE_CONFIG`는 이미 외부화되어 있어 좋다.
- 하지만 공 크기, 물리 스케일, cushion/frame offset 등은 `App.jsx`보다 `config/tableConfig.ts` 또는 `domain/tablePhysicsConfig.ts`가 더 적합하다.
- 현재 단계에서 즉시 이동할 필요는 없지만, 장기적으로 App에서 제거할 후보이다.

분류:

```txt
공통 설정
→ config/tableConfig.ts 또는 domain/tablePhysicsConfig.ts로 이동 후보
```

---

### 2.2 공통 유틸 / Physics helper

위치: 대략 lines 308~393

대표 함수:

```txt
coStartForCushionPath()
firstRailHitTowardTarget()
anchorSemanticForPath()
spinPathGetDistance()
spinPathComputeProgress()
spinPathGetSpinFactor()
spinPathGetDirectionType()
spinPathRotateVector()
spinPathApplySpin()
```

판단:

- 이 함수들은 UI가 아니라 geometry / trajectory / spin path 계산에 가깝다.
- `utils/trajectory/*` 또는 `domain/trajectory/*`로 이동하는 것이 맞다.
- 현재 `App.jsx`가 trajectory 계산의 일부를 직접 담당하게 만드는 원인이다.

분류:

```txt
공통 trajectory helper
→ domain/trajectory/spinPath.ts 또는 utils/trajectory/spinPath.ts 이동 후보
```

---

### 2.3 Ball / target helper

위치: 대략 lines 433~489

대표 함수:

```txt
getYellowBallCoords()
getRedBallCoords()
resolveImpactTargetBall()
resolveBallColorFromId()
isConfirmedTargetBall()
Ball()
```

판단:

- 공 좌표와 targetColor 관련 helper는 공통 domain으로 분리 가능하다.
- `Ball` 컴포넌트는 SVG 렌더링 UI이므로 별도 component로 이동 가능하다.

분류:

```txt
좌표/타겟 helper → domain/balls/ballTarget.ts
Ball component → components/table/Ball.jsx
```

---

## 3. SYS 관련 구역

이 영역이 현재 `App.jsx`에서 가장 중요한 기술 부채이다.

### 3.1 Recall SYS Snapshot 생성

위치: 대략 lines 498~564

대표 함수:

```txt
mergeSysOverlayPayloadToNumericInputs()
buildSlotSysSnapshotFromStrategyEntry()
```

관찰:

`buildSlotSysSnapshotFromStrategyEntry()` 안에서 다음 기본값이 사용된다.

```js
entry.signature.systemId === "5_HALF"
  ? "5_half_system"
  : (entry.signature.systemId ?? "5_half_system")
```

또한 `CO_f`, `C3_r`를 5½ 기준으로 보정한다.

판단:

- `5_HALF → 5_half_system` alias normalize는 공통 함수로 분리해야 한다.
- `systemId` 기본값이 항상 `5_half_system`인 것은 현재 앱 초기값으로는 허용 가능하지만, 시스템 확장 관점에서는 별도 default config로 빼는 것이 좋다.
- `CO_f`, `C3_r` fallback은 formula별 input alias resolver로 이동해야 한다.

이동 후보:

```txt
domain/systemId.ts
  normalizeSystemId()
  DEFAULT_SYSTEM_ID

domain/sys/sysSnapshotFromStrategy.ts
  buildSlotSysSnapshotFromStrategyEntry()
```

---

### 3.2 SYS_SYSTEM_CONFIG

위치: 대략 lines 662~688

현재 구조:

```js
const SYS_SYSTEM_CONFIG = {
  five_half: { mode: "derived", useSn: true },
  "5_half_system": { mode: "derived", useSn: true },
  "5_HALF": { mode: "derived", useSn: true },
  sunrise_sunset: { mode: "full_input", useSn: false },
  sunset: { mode: "full_input", useSn: false },
};
```

문제:

- 시스템별 모드가 `App.jsx`에 하드코딩되어 있다.
- `useSn`도 5½ 전용 규칙인데 App에서 직접 알고 있다.
- 새 시스템이 추가될 때마다 App 수정이 필요해질 수 있다.

권장 구조:

`profile.json` 또는 `logic.json`에 다음과 같이 이동.

```json
{
  "sysMode": "derived",
  "calculationFeatures": {
    "useSn": true,
    "twoOfThree": {
      "enabled": true,
      "marks": ["CO_f", "C1_f", "C3_r"],
      "formula": "C1_f = CO_f - C3_r"
    }
  }
}
```

또는 더 단순하게:

```json
{
  "logic": {
    "inputMode": "derived",
    "specialRules": ["five_half_two_of_three", "five_half_sn"]
  }
}
```

분류:

```txt
반드시 App에서 제거해야 할 시스템 의존 설정
→ profile.json / logic.json / domain/sysSystemConfig.ts
```

---

### 3.3 5½ 전용 계산 함수

위치: 대략 lines 690~760

대표 함수:

```txt
sysOverlayInputFinite()
solveFiveHalfTwoOfThree()
fiveHalfComputedInputKey()
fmtFiveHalfDisplayNum()
fmtSysOverlayInputDisplay()
```

특히 `solveFiveHalfTwoOfThree()`는 주석부터 5½ 전용이다.

현재 역할:

```txt
CO · C1 · C3 중 2개 입력 시 나머지 1개 계산
C1 = CO - C3
CO + C1 → C3
CO + C3 → C1
C1 + C3 → CO
```

판단:

- 이 로직은 `App.jsx`가 아니라 5½ 시스템의 logic 규칙이다.
- 그러나 2-of-3 입력 UI 자체는 다른 시스템에도 재사용 가능할 수 있다.
- 따라서 함수명에서 `FiveHalf`를 제거하고 profile/logic 기반 rule로 일반화하는 것이 좋다.

권장 구조:

```txt
domain/sys/inputCompletionEngine.ts

completeSysInputsByRule(inputs, rule)
```

예시 rule:

```json
{
  "id": "five_half_two_of_three",
  "type": "two_of_three_linear",
  "keys": {
    "co": "CO_f",
    "c1": "C1_f",
    "c3": "C3_r"
  },
  "relations": {
    "C1_f": "CO_f - C3_r",
    "C3_r": "CO_f - C1_f",
    "CO_f": "C1_f + C3_r"
  }
}
```

---

### 3.4 parseSysFormulaExpr / normalized inputs

위치: 대략 lines 759~909

대표 함수:

```txt
normalizeToFormulaInputsApp()
isRhsKeyReadOnlyForSys()
isMarkBasisReadOnly()
lhsTokenFromExpr()
showMarkRowExtraForSys()
buildSysOverlayInitialInputs()
buildSysOverlayNumericPayload()
unifiedSlideFromCorrections()
normalizeSlideDrawCorrections()
parseSysFormulaExpr()
```

판단:

- 이 영역은 꽤 중요하다.
- 일부는 공통 SYS overlay helper이고 일부는 5½ 보정에 가깝다.
- `parseSysFormulaExpr()`는 매우 좋은 일반화 함수이다. formula.expr를 기준으로 필요한 token과 forced space를 파악한다.
- `unifiedSlideFromCorrections()`도 shotType 부호 처리와 관련되므로 공통 correction domain으로 이동 가능하다.

이동 후보:

```txt
domain/sys/sysFormulaParser.ts
domain/sys/sysOverlayInputModel.ts
domain/corrections/slideDrawCorrection.ts
```

---

### 3.5 buildSlotEffectiveRenderSysValues()

위치: 대략 lines 910~1065

이 함수는 현재 가장 중요한 SYS 표시 계산 함수 중 하나이다.

역할:

```txt
merged numeric input
resolvedSlotSys
adminSys corrections
profile.formula.expr
forced space
needed RHS keys
5½ two-of-three solve
base payload normalize
correction 적용
final calculateByProfileExpr
display map 반환
```

5½ 의존 지점:

```txt
rawSid default = "5_half_system"
getSysSystemMode()
getSysUseSn()
isFiveHalfSystemId()
solveFiveHalfTwoOfThree()
fiveHalfComputedInputKey()
Sn = (CO - 50) * 0.5
C4_f = C3_r + Sn
C5/C6 sync
```

판단:

- 이 함수는 App에서 반드시 분리해야 한다.
- 이름상 "render sys values"이지만 실제로는 계산 + 보정 + 표시값 조립을 수행한다.
- 앞으로 다른 시스템이 들어오면 이 함수가 계속 커질 가능성이 높다.

권장 이동:

```txt
domain/sys/buildSlotEffectiveRenderSysValues.ts
```

그리고 내부 5½ 분기는 다음처럼 plugin/rule 기반으로 분리한다.

```txt
domain/sys/rules/fiveHalfEffectiveValues.ts
domain/sys/rules/defaultEffectiveValues.ts
```

권장 인터페이스:

```ts
buildEffectiveSysValues({
  systemId,
  mergedInputs,
  resolvedSlotSys,
  adminSys,
  profile,
  logic
})
```

---

### 3.6 SYS Overlay 컴포넌트

위치: 대략 lines 1135~2220 전후

현재 `App.jsx` 안에 로컬 `SysOverlay`가 정의되어 있다.

파일 주석에도 다음 의미가 존재한다.

```txt
Main app currently renders the LOCAL SysOverlay defined in this file.
admin/sys/SysOverlay.tsx is NOT used by main.jsx.
```

문제:

- `SysOverlay`가 App 내부에 있어서 App가 매우 커진다.
- 시스템 목록 `SYSTEM_OPTIONS`가 Overlay 내부에 하드코딩되어 있다.
- 공략 유형 `SHOT_TYPE_OPTIONS`도 Overlay 내부에 하드코딩되어 있다.
- 5½용 `useSn`, `two-of-three`, `Sn`, 보정 표시가 Overlay UI 안에 섞여 있다.

권장 이동:

```txt
components/admin/SysOverlay.jsx
domain/sys/sysOverlayViewModel.ts
domain/sys/sysSystemOptions.ts
```

시스템 목록은 직접 하드코딩하지 말고 `SYSTEM_PROFILES`와 `system_meta.json` 기반으로 생성해야 한다.

권장 구조:

```ts
buildSysOverlayViewModel({
  profile,
  logic,
  currentInputs,
  corrections,
  shotType
})
```

---

## 4. Dataset / Search / Recall 관련 구역

### 4.1 Published leaf hint / Search alert

위치: 대략 lines 566~610

대표 함수:

```txt
shotTypeForSysOverlayFromSignature()
normalizePublishedShotTypeHint()
resolvePublishedLeafHintsFromRuntime()
userSearchNoMatchAlertMessage()
```

판단:

- Published Dataset Architecture와 직접 관련된 helper이다.
- App 내부보다 `domain/publishedSearchUi.ts` 또는 `domain/publishedLeafHints.ts`로 이동 가능하다.
- 시스템 의존성은 낮고, dataset path / shotType normalize 영역이다.

---

### 4.2 Recall / LocalDB / Published Search orchestration

위치: App 함수 내부 여러 구간

관련 import:

```txt
PositionKDIndex
runSpatialRecall
getOrLoadPublishedLeaf
resolvePublishedLeafKey
buildRecallTracePayload
summarizeDatasetRecords
makeSignatureKey
listStrategiesInRecord
```

판단:

- Search engine 자체는 이미 domain으로 분리되어 있다.
- App는 Search 실행 시점, 결과 적용, UI reset/gate를 담당한다.
- 이 구조는 유지 가능하다.
- 단, `App.jsx` 안의 Search handler가 길다면 향후 `hooks/usePublishedSearchController.ts`로 분리 가능하다.

우선순위:

```txt
중간
```

SYS/Trajectory 분리보다 우선순위는 낮다.

---

## 5. Sample Loader 의존성

위치: 대략 lines 6163~6190

현재 코드:

```js
const basePath = "/samples/5_half_system";

const url = shot.file === "canonical.json"
  ? `${basePath}/B2T_R/canonical.json`
  : `${basePath}/${shot.file}`;
```

문제:

- Sample loader가 5½ 시스템에 고정되어 있다.
- `currentId`는 SHOTS에서 선택하지만 systemId 기반 sample path가 아니다.
- 다른 시스템 도입 시 샘플 로딩은 거의 확실히 실패하거나 5½ 샘플을 계속 읽는다.

권장 구조:

`system_meta.json`에 sample 정보를 둔다.

```json
{
  "samples": {
    "basePath": "/samples/5_half_system",
    "defaultTrack": "B2T_R",
    "canonicalFile": "canonical.json"
  }
}
```

또는 전역 resolver:

```ts
resolveSampleUrl({ systemId, shotId, file, track })
```

이동 후보:

```txt
domain/samples/samplePathResolver.ts
system_meta.json
```

우선순위:

```txt
높음
```

이 부분은 명확한 5½ 고정 경로이므로 시스템 확장 전에 반드시 정리해야 한다.

---

## 6. Trajectory / Anchor Rendering 구역

### 6.1 systemIdForGrid / anchors loading

위치: 대략 lines 6440~6539

현재 흐름:

```txt
trackForAnchors = resolvedSlotSys.track || view.track || "B2T_L"
rawSystemIdForGrid = resolvedSlotSys.systemId ?? "5_half_system"
systemIdForGrid = rawSystemIdForGrid === "5_HALF" ? "5_half_system" : rawSystemIdForGrid

getAnchorsForRendering({
  systemId,
  track,
  sysValues,
  anchorsData: getAnchorsForSystem(systemId),
  fallback: sysValuesToAnchors(sysValues)
})
```

판단:

- 좋은 점: anchors는 이미 `getAnchorsForSystem(systemId)`와 `getAnchorsForRendering()`으로 일반화되어 있다.
- 문제: default가 여전히 `5_half_system`이다.
- fallback `sysValuesToAnchors()`가 시스템별 mapping 부족 시 임시 동작할 가능성이 있다. 이 부분은 운영 단계에서 정확한 SSOT 여부를 검증해야 한다.

권장:

```txt
DEFAULT_SYSTEM_ID를 App 밖으로 이동
systemId alias normalize를 공통화
fallback 사용 시 dev warning 유지
```

---

### 6.2 baseline endpoint drag / inverse lookup

위치: 대략 lines 6599~6818

대표 함수:

```txt
baselineAnchorPrepFromSys()
baselineForwardHandleRg()
baselineSysFromHandleRg()
baselinePartnerAndSlotSys()
baselineSysValueFromHandleRg()
resolveBaselineLabelOverrideValue()
captureBaselineLabelSlotSnapshot()
```

판단:

- 이 영역은 baseline label 편집 및 handle drag에 관련된다.
- 일반 trajectory / anchor domain에 속한다.
- `0~90` sys scan이 하드코딩되어 있다.
- 모든 시스템이 0~90 범위를 쓰는 것은 아닐 수 있다.

문제 지점:

```txt
refineLo = Math.max(0, bestSys - 0.5)
refineHi = Math.min(90, bestSys + 0.5)
```

권장:

`profile.value_domains`에서 sys range를 읽어야 한다.

```json
{
  "value_domains": {
    "CO_f": [0, 90],
    "C1_f": [0, 90]
  }
}
```

이동 후보:

```txt
domain/baseline/baselineEndpointDrag.ts
```

우선순위:

```txt
중간~높음
```

시스템 확장 시 baseline 편집 기능이 깨질 가능성이 있으므로 점검 필요.

---

### 6.3 reflection / path node / display cap

위치: 대략 lines 7320~8060

이 영역은 매우 크며 다음을 수행한다.

```txt
canonicalConfig 생성
offset_fg2rg / safety 읽기
CO/C1 prep
C1 rail impact
C2 reflection
C3/C4/C5/C6 anchor point resolve
calculateImpact
curve correction
spin path deform
trajectory display cap
baseline path 계산
```

좋은 점:

- `SYSTEM_PROFILES[systemIdForGrid]`에서 `units.offset_fg2rg`, `safety.m_min`, `safety.theta_t_max`를 읽는다.
- `trajectoryPathDisplayPolicy.ts`로 display cap이 분리되어 있다.
- `reflectionEngine`도 분리되어 있다.

문제:

- path assembly 자체가 여전히 App 내부에 매우 길게 존재한다.
- C3~C6 처리 패턴이 반복된다.
- 시스템별 path depth / marks / C5/C6 sync는 향후 logic/profile 기반으로 이동해야 한다.

권장 이동:

```txt
domain/trajectory/buildTrajectoryRenderModel.ts
domain/trajectory/buildAnchorPathNodes.ts
domain/trajectory/buildBaselinePathNodes.ts
```

우선순위:

```txt
높음
```

하지만 한 번에 이동하면 위험하다. Cursor 복귀 후 단계적으로 분리해야 한다.

---

## 7. USER UX / Overlay 구역

### 7.1 App props

위치: 대략 lines 3373~3397

현재 App는 외부에서 다음 USER UX 상태를 받는다.

```txt
currentButtonId
userTableDisplayMode
trajectoryCardSource
trajectoryShowAxisValues
trajectoryCardOffset
onTrajectoryCardOffsetChange
onTrajectoryCardSourceChange
onTrajectoryShowAxisValuesChange
...
```

판단:

- 최신 USER UX 단순화 방향과 맞다.
- 동선 카드의 기준값/보정값/시스템값 표시 상태가 App 외부 props로 제어된다.
- 이 구조는 유지 가능하다.

---

### 7.2 USER Info / HPT / Trajectory Card

위치: 대략 lines 6090~6150, 8354 이후

관련:

```txt
buildUserInfoPanel()
buildUserHptViewModel()
buildUserTrajectoryCardModel()
UserAiPanel
UserHptPanel
UserTrajectoryInfoCard
```

판단:

- USER AI / HP/T / 동선은 이미 ViewModel 기반이다.
- 매우 좋은 방향이다.
- 시스템 레슨 보류 상태를 반영하면 App의 USER overlay는 AI / HP/T / table-area trajectory 중심으로 유지하면 된다.

권장:

- App는 overlayContent switch만 담당.
- 각 패널 구성은 ViewModel에서 계속 처리.
- `SYSTEM_LESSON` 경로가 남아 있다면 비노출 상태인지 확인하고, 삭제하지 말고 보류 처리.

---

## 8. 5_half_system 의존성 전체 목록

현재 업로드된 App.jsx에서 검색된 주요 문자열:

```txt
5_half: 32회
5_HALF: 11회
useSn: 18회
SYS_SYSTEM_CONFIG: 3회
samples/5_half_system: 1회
needsC3r: 2회
```

### 8.1 의존성 분류표

| 구분 | 위치/대상 | 현재 상태 | 권장 조치 |
|---|---|---|---|
| systemId alias | `5_HALF → 5_half_system` | 여러 위치에 산재 | `domain/systemId.ts`로 통합 |
| default system | `?? "5_half_system"` | 여러 위치에 산재 | `DEFAULT_SYSTEM_ID` 상수화 |
| SYS mode | `SYS_SYSTEM_CONFIG` | App 하드코딩 | profile/logic 또는 `domain/sysSystemConfig.ts` |
| useSn | `getSysUseSn()` | App 하드코딩 | `logic.json` feature로 이동 |
| 2-of-3 solve | `solveFiveHalfTwoOfThree()` | 5½ 전용 | input completion engine으로 이동 |
| Sn 계산 | `(CO - 50) * 0.5` | App 내부 | fiveHalf rule module |
| C4/C5/C6 sync | `C4 = C3 + Sn`, C5/C6 sync | App 내부 | logic rule module |
| Sample path | `/samples/5_half_system` | 완전 고정 | system_meta sample config |
| C3_r dev check | `needsC3r` | 5½ 전용 | profile formula validation으로 대체 |
| SYS option list | `SYSTEM_OPTIONS` | App 내부 하드코딩 | SYSTEM_PROFILES + meta 기반 생성 |

---

## 9. 각 시스템 4파일 SSOT 재정의 제안

현재 시스템 폴더 구조:

```txt
frontend/src/data/systems/<system_name>/
  profile.json
  anchors.json
  logic.json
  system_meta.json
```

이 구조는 유지하는 것이 좋다. 다만 각 파일의 책임을 명확히 해야 한다.

### 9.1 profile.json

역할: **계산 공식과 입력/출력 도메인**

권장 포함:

```json
{
  "id": "5_half_system",
  "name": "파이브 앤드 하프",
  "formula": {
    "expr": "C1_f = CO_f - C3_r"
  },
  "value_domains": {
    "CO_f": [0, 90],
    "C1_f": [0, 90],
    "C3_r": [0, 90],
    "C4_f": [0, 90]
  },
  "units": {
    "offset_fg2rg": 2.25
  },
  "safety": {
    "m_min": 0.05,
    "theta_t_max": 68
  },
  "display": {
    "marks": ["CO", "C1", "C2", "C3", "C4", "C5", "C6"]
  }
}
```

### 9.2 anchors.json

역할: **좌표 SSOT**

권장 포함:

```json
{
  "trajectories": {
    "B2T_L": {},
    "B2T_R": {},
    "T2B_L": {},
    "T2B_R": {}
  }
}
```

원칙:

- 좌표/라벨/track anchor만 둔다.
- 계산식이나 UI 텍스트를 넣지 않는다.
- 대칭 생성 메타는 anchors에 보존 가능.

### 9.3 logic.json

역할: **시스템별 특수 계산/보정/분기**

5½ 예시:

```json
{
  "inputMode": "derived",
  "features": {
    "twoOfThree": true,
    "useSn": true
  },
  "rules": [
    {
      "id": "five_half_two_of_three",
      "type": "input_completion",
      "relations": {
        "C1_f": "CO_f - C3_r",
        "C3_r": "CO_f - C1_f",
        "CO_f": "C1_f + C3_r"
      }
    },
    {
      "id": "five_half_sn",
      "type": "derived_value",
      "expr": "Sn = (CO_f - 50) * 0.5"
    },
    {
      "id": "five_half_c4_sync",
      "type": "derived_value",
      "expr": "C4_f = C3_r + Sn"
    },
    {
      "id": "five_half_c5_c6_sync",
      "type": "sync",
      "targets": ["C5_f", "C6_f"],
      "source": "C4_f"
    }
  ]
}
```

### 9.4 system_meta.json

역할: **UI/표시/샘플/검색 메타**

권장 포함:

```json
{
  "labelKo": "파이브 앤드 하프",
  "category": "뒤돌리기",
  "enabled": true,
  "samples": {
    "basePath": "/samples/5_half_system",
    "defaultTrack": "B2T_R",
    "canonicalFile": "canonical.json"
  },
  "ui": {
    "showInSysOverlay": true,
    "defaultShotType": "뒤돌리기"
  },
  "aliases": ["5_HALF", "five_half"]
}
```

---

## 10. App.jsx에서 빠져야 할 항목

### 즉시 분리 후보

1. `SYS_SYSTEM_CONFIG`
2. `canonicalSystemIdForConfig()`
3. `isFiveHalfSystemId()`
4. `solveFiveHalfTwoOfThree()`
5. `fiveHalfComputedInputKey()`
6. `/samples/5_half_system`
7. `SYSTEM_OPTIONS`
8. `buildSlotEffectiveRenderSysValues()`
9. `SysOverlay` 로컬 컴포넌트

### 중기 분리 후보

1. Ball component
2. Ball target helper
3. spin path helper
4. baseline drag helper
5. trajectory path assembly
6. Published Search handler
7. Debug trace 함수

---

## 11. App.jsx가 유지해야 할 책임

최종적으로 App.jsx는 다음만 담당하는 것이 이상적이다.

```txt
1. appMode 상태
2. currentId / selected shot 상태
3. overlayContent 상태
4. hooks 연결
5. slot/action/event handler 연결
6. table SVG 렌더 컴포넌트 호출
7. ADMIN/USER 모드별 UI 배치
8. domain controller 호출 결과를 component에 전달
```

즉, App.jsx는 다음을 몰라야 한다.

```txt
5½의 Sn 공식
5½의 C4/C5/C6 sync
어떤 시스템이 two-of-three인지
샘플 path가 어떤 시스템 폴더인지
특정 시스템의 C3_r 필수 여부
각 시스템 UI 표시명 목록
```

---

## 12. Cursor 복귀 후 추천 작업 순서

### Phase A — 영향 범위 분석 전용

```txt
[Cursor Mode: Ask]

목표:
App.jsx의 5_half_system 의존 지점을 수정 없이 재확인한다.

확인 대상:
- "5_half"
- "5_HALF"
- "five_half"
- "useSn"
- "SYS_SYSTEM_CONFIG"
- "samples/5_half_system"
- "solveFiveHalfTwoOfThree"
- "buildSlotEffectiveRenderSysValues"
- "SYSTEM_OPTIONS"

산출:
1. 파일/라인별 목록
2. 각 항목의 이동 후보
3. 수정 위험도
4. 테스트 필요 항목
```

### Phase B — systemId normalize 분리

```txt
[Cursor Mode: Agent]

목표:
App.jsx 내부 systemId alias/default 처리를 공통 util로 분리한다.

작업:
1. frontend/src/domain/systemId.ts 생성
2. DEFAULT_SYSTEM_ID = "5_half_system"
3. normalizeSystemId(systemId)
4. isSystemAlias(systemId, canonicalId)
5. App.jsx 내 "5_HALF" 직접 비교를 normalizeSystemId로 대체

주의:
- 동작 변경 금지
- DEFAULT는 일단 5_half_system 유지
- 테스트/빌드 확인
```

### Phase C — SYS_SYSTEM_CONFIG 외부화

```txt
[Cursor Mode: Agent]

목표:
SYS_SYSTEM_CONFIG를 App.jsx 밖으로 이동한다.

작업:
1. frontend/src/domain/sys/sysSystemConfig.ts 생성
2. getSysSystemMode()
3. getSysUseSn()
4. 기존 App 함수 제거 또는 import 대체

주의:
- logic.json 이동은 다음 Phase로 미룸
- 먼저 코드 위치만 분리
```

### Phase D — 5½ rule module 분리

```txt
[Cursor Mode: Agent]

목표:
5½ 전용 계산 함수를 별도 rule module로 분리한다.

작업:
1. frontend/src/domain/sys/rules/fiveHalfRules.ts 생성
2. solveFiveHalfTwoOfThree()
3. fiveHalfComputedInputKey()
4. computeFiveHalfSn()
5. applyFiveHalfEffectiveValues()
6. App.jsx import 대체

주의:
- 함수명은 임시로 유지해도 됨
- 동작 변경 금지
```

### Phase E — Sample path resolver

```txt
[Cursor Mode: Agent]

목표:
"/samples/5_half_system" 고정 경로 제거.

작업:
1. system_meta.json에 samples 추가
2. domain/samples/samplePathResolver.ts 생성
3. App.jsx fetch URL 생성부 교체

주의:
- 기본 동작은 기존 5_half_system과 동일해야 함
```

### Phase F — SysOverlay 파일 분리

```txt
[Cursor Mode: Agent]

목표:
App.jsx 내부 SysOverlay를 별도 컴포넌트로 이동한다.

작업:
1. components/admin/SysOverlay.jsx 생성
2. 관련 helper는 domain/sys로 이동하거나 함께 이동
3. App.jsx는 import SysOverlay만 사용

주의:
- 현재 main app은 App.jsx 내부 SysOverlay를 사용 중이라는 주석 유지/갱신
- admin/sys/SysOverlay.tsx와 혼동 방지
```

### Phase G — buildSlotEffectiveRenderSysValues 분리

```txt
[Cursor Mode: Agent]

목표:
buildSlotEffectiveRenderSysValues를 domain 함수로 분리한다.

작업:
1. domain/sys/buildSlotEffectiveRenderSysValues.ts 생성
2. 필요한 helper 함께 이동/import
3. App.jsx 호출부 유지

주의:
- 이 함수는 영향 범위가 크므로 단독 PR/커밋 권장
- USER 동선 카드, SystemValueLabels, AI comment, SAVE/Recall 영향 확인
```

---

## 13. 검증 체크리스트

각 Phase 이후 다음을 확인한다.

### ADMIN

- SYS Overlay 열림
- 5½ 시스템 선택 가능
- CO/C1/C3 중 2개 입력 시 나머지 계산
- 보정값 입력 후 Apply
- C4/C5/C6 값 기존과 동일
- SAVE 정상
- LocalDB 정상
- Search 정상

### USER

- Search 정상
- 공략 버튼 활성
- AI 패널 정상
- 두께/타점 패널 정상
- 동선 카드 정상
- 기준값/보정값 전환 정상
- 시스템값 표시 ON/OFF 정상
- 카드 드래그 위치 유지

### Dataset

- `/dataset/{공략}/{시스템}/positions.json` fetch 정상
- `dataset/` Git 포함 유지
- Production 직접 URL 확인

### Rendering

- 기준/보정 궤적 동일
- SystemValueLabels 표시 동일
- Caption 위치 동일
- Trajectory Display Cap 유지

---

## 14. 최종 판단

현재 `App.jsx`는 5½ 시스템 전용 앱에서 다중 시스템 앱으로 전환되는 중간 상태이다.

좋은 점:

- `SYSTEM_PROFILES`
- `profile.formula.expr`
- `calculateByProfileExpr`
- `getAnchorsForRendering`
- `getAnchorsForSystem`
- slot draft/applied SSOT
- Published Dataset Loader
- USER ViewModel 기반 패널

이 이미 존재한다.

문제점:

- `App.jsx` 안에 5½ 전용 rule과 UI 목록이 남아 있다.
- Sample loader가 5½ 고정이다.
- SYS Overlay가 App 내부에 있어 App가 계속 비대해진다.
- Effective sys value 계산이 App 내부에서 시스템별 특수 로직을 직접 처리한다.

따라서 다음 목표는 명확하다.

```txt
App.jsx = 시스템을 모르는 오케스트레이터
profile.json = 계산 공식/도메인
anchors.json = 좌표 SSOT
logic.json = 시스템별 보정/특수 규칙
system_meta.json = UI/샘플/표시 메타
domain/* = 실행 엔진
```

이 방향으로 정리하면, 이후 다른 시스템을 추가할 때 `App.jsx`를 거의 수정하지 않고도 시스템별 4파일과 필요한 rule module만 추가하는 구조가 가능해진다.
