본 문서는 3Cushion AI의 **계산 구조와 시스템 데이터 계층**만 다룬다.
UI 구조, 렌더 구조, 리팩터링 청사진은 FRONTEND_ARCHITECTURE 문서에서 관리한다.

1️⃣ 현재 실제 폴더 구조 (2026-03 기준)
frontend/src/
 ├── admin/
 │   ├── sys/
 │   ├── hpt/
 │   ├── str/
 │   ├── ai/
 │   ├── save/
 │   ├── slotAutoRecommend.ts
 │   └── AdminContainer.tsx
 │
 ├── components/
 │   └── table/ (AnchorPoint, SystemValueLabels, ImpactLines, CoachingOverlay, SystemGrid, TableGrid, RailFrame, Ball)
 ├── config/
 │   └── tableConfig.ts
 ├── contexts/
 ├── data/
 │   └── systems/ (39 systems, anchorsRegistry.ts)
 │
 ├── domain/
 │   ├── anchorLookupEngine.ts
 │   ├── anchorCoordinateEngine.ts
 │   ├── calibrationEngine.ts (존재; App 메인 궤적 조립에서는 미호출)
 │   ├── reflectionEngine.ts
 │   ├── railEngine.ts
 │   ├── strategyEngine.ts
 │   ├── adminSaveEngine.ts
 │   ├── positionMergeEngine.ts
 │   ├── positionSearchEngine.ts
 │   ├── evaluateStrategy.ts
 │   ├── finalCoordinateEngine.ts
 │   ├── search/
 │   │   ├── kdTree6d.ts
 │   │   ├── signatureKey.ts
 │   │   └── positionKDIndex.ts
 │   └── index.ts
 │
 ├── hooks/
 │   ├── useShotSlots.ts
 │   ├── useTrajectoryState.ts
 │   ├── useCoachingController.ts
 │   ├── useSystemController.ts
 │   └── useDisplayController.ts
 │
 ├── utils/
 │   ├── geometry/coords.ts
 │   ├── geometry/line.ts
 │   ├── geometry/rail.ts
 │   ├── geometry/anchorResolve.ts
 │   ├── physics/ (impact.ts, systemLine.ts, index.ts)
 │   ├── systemCalculator.ts
 │   ├── trajectorySampleBuilder.ts
 │   └── layoutCalculator.js
 │
 ├── App.jsx
 └── main.jsx


✔ src/systems 제거 완료
✔ src/data/systems 단일화 완료
✔ Geometry/Physics/Domain/Controllers 분리 완료

2️⃣ 시스템 데이터 계층 (Data Driven Architecture)

모든 시스템은 JSON 기반으로 정의된다.

frontend/src/data/systems/<systemId>/
 ├── profile.json
 ├── anchors.json
 ├── logic.json
 └── system_meta.json

2.1 profile.json

formula.expr 정의

value_domains 정의

출력 항목 정의

UI 입력 구조 정의

2.2 anchors.json

기준 앵커 데이터

Canonical 좌표 샘플

궤적 검증 기준점

2.3 logic.json

시스템 특수 분기

보정 로직 정의

5_half 특수 처리 등

3️⃣ 시스템 등록 방식

파일:

frontend/src/data/systems/index.ts

const modules = import.meta.glob("./*/profile.json", { eager: true });


✔ profile.json만 존재하면 자동 등록
✔ 수동 import 금지
✔ 코드 수정 없이 시스템 확장 가능

4️⃣ 계산 모드 구분
4.1 Admin Mode (실험/검증 모드)

파일:

admin/sys/useSysCalculation.ts


특징:

anchors 비의존

expr 기반 순수 계산

디버깅/검증 목적

흐름:

expr 파싱
   ↓
RHS 토큰화
   ↓
값 치환
   ↓
new Function 실행
   ↓
LHS 결과 반환

4.2 App Mode (실제 시뮬레이션 모드)

**데이터·렌더 파이프라인 (요약):**

```
profile 로드 (검증·expr 메타)
  → sysValues (inputs + outputs.result; Recall 시 result 필수)
  → anchorsRegistry → anchors.json
  → anchorLookupEngine / getAnchorCoordFromSys (mark별 sys 보간)
  → anchorCoordinateEngine / getAnchorsForRendering ({ coord, valueSpace })
  → normalizeAnchor → resolveAnchorPoint (Fg 좌표 그대로; snap 없음)
  → computeRailImpactPoint (주로 1C: 첫 쿠션 레일과의 교점 = C1_rail)
  → App.jsx: CO_rail은 조건부(하단 CO만 하단 교점; 아래 6.3 참조)
  → convertCanonicalAnchors (조건 충족 시 FG→RG)
  → computeReflectionC2 (2C 없을 때) / buildCushionPath
  → components/table/* 렌더
```

**역할 분리:**

- **expr (`calculateByProfileExpr`):** 시스템 **스칼라 값** (C1_f, C3_r 등) 계산.
- **anchors lookup:** 그 스칼라를 키로 **표시 좌표**를 꺼냄 — 좌표를 expr로 재계산하지 않음.

관련 파일: `App.jsx`, `domain/anchorLookupEngine.ts`, `domain/anchorCoordinateEngine.ts`, `utils/geometry/anchorResolve.ts`, `lib/convertCanonicalAnchors.js`, `utils/systemCalculator.ts`, `utils/trajectorySampleBuilder.ts`(파생 샘플 등).

5️⃣ Draft / Applied 설계 원칙 (공식 선언)

전략 상태는 반드시 이중 구조를 따른다.

Slot
 ├── draft
 └── applied

### UI State Layer (Draft vs Applied) — 2026-03 확정

**Draft Layer:**
- 사용자 인터랙션 및 Recall draft 적용 결과 반영
- UI 표시 기준

**Applied Layer:**
- 확정된 계산 결과
- dataset 저장 기준

**UI Rendering:**
- Draft 기준 (모든 입력 필드 SYS/HP/T/STR/AI)

Draft

실시간 계산

수정 중 상태

Preview

Applied

확정 상태

저장 대상

trajectory 계산 기준

✔ Draft는 저장하지 않는다
✔ Applied만 저장한다

6️⃣ Architecture Diagram (App Orchestrator)

```
App (Orchestrator)
 ├── useSystemController
 ├── useDisplayController
 ├── useCoachingController
 ├── domain
 │   ├── anchorCoordinateEngine.ts
 │   ├── calibrationEngine.ts
 │   ├── adminSaveEngine.ts
 │   ├── positionMergeEngine.ts
 │   ├── positionSearchEngine.ts
 │   ├── strategyEngine.ts
 │   ├── finalCoordinateEngine.ts
 │   └── evaluateStrategy.ts
 ├── domain/search
 │   ├── kdTree6d.ts
 │   ├── signatureKey.ts
 │   └── positionKDIndex.ts
 ├── data/systems/anchorsRegistry.ts
 ├── utils/geometry/line.ts, rail.ts
 └── admin
     └── slotAutoRecommend.ts
```

6.1 전략 → 궤적 → 물리 연결 구조 (공식 파이프라인)

**엔진 계층 (현재 App 궤적 기준):**
```
inputs + outputs.result (sysValues)
   ↓
anchorLookupEngine + anchorCoordinateEngine (anchors.json SSOT)
   ↓
anchorResolve (resolveAnchorPoint / computeRailImpactPoint)
   ↓
reflectionEngine (2C) / rail geometry (cushion path)
   ↓
Physics (impact 등)
```

`calibrationEngine` 모듈은 저장소에 있으나 **현재 App.jsx orchestration에서는 `calibrateTrajectory`를 호출하지 않음**.

**전체 레이어:**
```
UI (App.jsx)
   ↓
Controllers (hooks: useSystemController, useCoachingController, useDisplayController)
   ↓
Domain (anchorLookupEngine, anchorCoordinateEngine, reflectionEngine, strategyEngine, railEngine)
   ↓
Geometry (utils/geometry/*, anchorResolve)
   ↓
Calculator/Trajectory (utils/systemCalculator, data/system/calculator)
   ↓
Physics (utils/physics/*)
   ↓
Rendering (components/table/*)
```

**Trajectory Reference Model:**
- 시스템 궤적 기준: CO → C1 → C2 → C3 → C4 → C5 → C6
- baseline trajectory: C3 = C4 = C5 = C6 (기준 계산)
- corrected trajectory: C4 = C5 = C6 (보정 적용)

**상세 흐름:**
SysOverlay 입력 / Recall → draft
   ↓
useShotSlots.updateDraftSys() 또는 buildDraftsFromRecord (Recall 시 expr로 result 채움)
   ↓
calculateByProfileExpr() → draft.sys.outputs.result
   ↓
applyDraftSys() → applied (저장/확정 시)
   ↓
getAnchorsForRendering (sysValues + anchors.json SSOT → rawAnchors: coord + valueSpace)
   ↓
resolveAnchorPoint / computeRailImpactPoint (geometry; C1_rail = 1C 교점 SSOT)
   ↓
CO_rail: Fg 하단 근처일 때만 하단 교점, 그 외 CO_prep 유지 (App.jsx isBottomCO)
   ↓
useTrajectoryState.applySysResult() (상태 반영)
   ↓
domain/buildRailGroupedStrategy
   ↓
utils/physics/* (Impact)
   ↓
components/table/* (Stage Rendering)

6.2 Engine Layer (Domain)

**anchorLookupEngine.ts**

Role: `anchors.json`만 보고 mark(CO/1C/3C…) + `sysValue` → `{ coord, valueSpace }` 직접 보간 (`getAnchorCoordFromSys`).

**anchorCoordinateEngine.ts**

Role: sysValues 전체에서 mark별 후보 키(CO_f, C1_f, …)를 뽑아 lookup 호출, 렌더용 맵 생성 (`getAnchorsForRendering`).

**anchorResolve.ts**

- `normalizeAnchor`: raw 앵커 → `{ coord, valueSpace }` 정규화.
- `resolveAnchorPoint`: **coord를 그대로 반환**. Fg에 `snapToRail` 적용하지 않음 (방향·의미점 보존).
- `computeRailImpactPoint`: CO→1C 직선과 **트랙이 정하는 레일**의 교점. **`mark: "1C"`**일 때 첫 쿠션(TOP/BOTTOM) 교점이 **C1_rail(SSOT)**. `mark: "CO"`는 B2T에서 이론상 하단이나, **5_half 등에서 CO가 LEFT에만 있을 때 무조건 호출하면 교점 실패·fallback 위험** → App.jsx에서 **조건부 호출**로 제한.

**CO vs C1 (표시·궤적):**

- **앵커 1C (`rawAnchors["1C"]`):** lookup이 준 **Fg 방향점** (예: 상단 프레임 C1_f 근처).
- **C1_rail:** 실제 그리는 **첫 쿠션 충돌점** (computeRailImpactPoint, Rg 레일 `y=0`/`y=40` 교차).
- **라벨:** `allAnchors["1C"]`는 **C1_rail**과 맞춰 꺾임점과 일치.

**calibrationEngine.ts**

Role (모듈): `calibrateTrajectory` — 저장소에 존재. **현 App 메인 렌더 경로에서는 미사용.**

**Geometry Module (utils/geometry/)**

- line.ts: computeLineFromPoints
- rail.ts: lineRailIntersection, computeRailPoints, buildCushionPath, snapToRail
- anchorResolve.ts: 위 참조

**anchorsRegistry.ts (data/systems/)**

Role: 모든 anchors.json 자동 로딩 (import.meta.glob).
현재 32 systems 지원.

**SystemGrid.jsx (components/table/)**

Role: anchors.json 기반 시스템 그리드 표시.
- FG values → frame 영역
- RG values → rail edge
- ADMIN 모드에서 showSystemGrid 옵션으로 표시

**strategyEngine.ts**

Role:
Strategy recommendation engine.

Main functions:

- recommendForAdmin()
  Returns the nearest PositionRecord.

- recommendForUser()
  Returns recommended StrategyEntry for S1/S2/S3 slots
  based on nearest positions.

Future extension:

- recommendWithInterpolation()

**railEngine.ts**

Role:
Rail grouping and system value attachment.

Note:
Previous runStrategyEngine logic has been moved here
from strategyEngine.ts during refactoring.

6.3 Anchor Coordinate Pipeline

SYS / Recall이 넘긴 **sysValues**가 다음을 거친다.

```
sysValues (inputs + outputs.result 필수; Recall은 buildDraftsFromRecord에서 result 생성)
   ↓
getAnchorsForRendering()
   ↓
anchorLookupEngine (per-mark 보간) → coord + valueSpace
   ↓
convertCanonicalAnchors() (hasConversionData 시, Fg↔Rg 규칙)
   ↓
normalizeAnchor → CO_prep, C1_prep (= resolveAnchorPoint; Fg snap 없음)
   ↓
C1_rail = computeRailImpactPoint(CO_prep, C1_prep, { mark: "1C", track, ... })
   ↓
CO_rail = CO_prep 기본; |CO_prep.y + 2.25| < 0.5 일 때만 위와 동일 직선으로 mark "CO" 교점 시도, 성공 시에만 덮어씀
   ↓
C3: 레일 스냅 등 (C3_r 앵커 좌표는 lookup SSOT)
   ↓
computeReflectionC2() (anchors["2C"] 없을 때)
   ↓
buildCushionPath()
   ↓
Trajectory rendering
```

**Fallback 원칙 (교점 SSOT):**

직선–레일 교점 계산이 불가능한 경우에만, `computeRailImpactPoint` 내부에서 가장 가까운 유효 레일 투영 등 **fallback**이 동작할 수 있다. **CO에 대해서는** 교점을 억지로 쓰지 않고 **의미점(`CO_prep`) 유지**가 우선이므로, App.jsx에서 **하단 CO가 아닐 때는 `mark:"CO"` 교점 호출 자체를 하지 않는다** (회귀 방지). **1C(SSOT 꺾임점)** 쪽은 교점 기반을 유지한다.

5_half_system **B2T_R** 특수성: CO_f=50은 LEFT·BOTTOM 코너; CO_f>50은 같은 x에서 y만 올라가는 **LEFT 진행** — 아래 8절 참조.

**Reflection Flow**
1. CO → C1 → C3 방향 기반 입사각 계산
2. C1이 위치한 레일(c1Rail) 확인
3. 레일 법선 기준 반사각 계산
4. spinAdjustDeg 적용
5. +180 방향 보정
6. C1에서 ray 발사
7. rail과의 교차점 = C2

⚠ ray는 반드시 C1 기준에서 발사됨. 방향 보정(+180)이 없으면 교차가 발생하지 않음.

⚠ convertCanonicalAnchors 실행 조건

- `hasConversionData = system.values.offset_fg2rg 존재`
- 현재 구조에서는 `offset_fg2rg`가 `profile.json` safety에 존재하지만
  `system.values`로 전달되지 않아 좌표 변환이 비활성화될 수 있다.

6.4 Anchor Override 구조

anchors = {
  ...baseAnchors,
  ...anchorsOverride
}

설명:
- baseAnchors: 시스템 기본값 (getAnchorsForRendering + convertCanonicalAnchors)
- anchorsOverride: 관리자 보정값 (adminState.anchorsOverride)

6.5 Anchor Edit Flow

1. anchor 더블클릭
2. 좌표 입력 (X, Y)
3. override 저장 (소수점 1자리 제한)
4. 즉시 반영
5. localStorage 저장 (ANCHORS_OVERRIDE_V1)

6.6 향후 구조 (설계 중)

ADMIN → JSON Export → USER 적용

- ADMIN: anchor 보정
- JSON: 확정 데이터
- USER: 계산 없이 사용

7️⃣ Admin Save 데이터 흐름

Admin Input (SYS / HP-T / STR / AI)
   ↓
Slot.applied
   ↓
evaluateStrategy (Domain)
   ↓
StrategyMeta (impact, final, angle_ci, angle_fs)
   ↓
createStrategyEntry
   ↓
upsertPositionRecord(dataset, balls, strategy) [positionMergeEngine]
   ↓
dataset (App.jsx state) → localStorage "positions_dataset"

※ Position 병합: ε=0.5 grid, 6축(cue/target/second) 비교, 동일 slot+signature 시 덮어쓰기

7.5 Computation Separation Principle

- UI 레이어는 impact/final을 계산하지 않음
- Domain 레이어가 모든 기하/시스템 평가 수행
- adminSaveEngine은 저장 조율만 담당

7.6 App.jsx 현재 상태 요약 (계산 관점)

App.jsx는 Orchestrator로 전환됨. 계산·물리·좌표는 분리 완료:

- 좌표 변환: utils/geometry/coords.ts
- 물리 계산: utils/physics/* (calculateImpact, adjustSystemLine)
- 전략 가공: domain/buildRailGroupedStrategy (railEngine)
- 렌더: components/table/*

App.jsx는 관리자 모드 분기, 상태 연결 허브, Event Handler, Stage 조립만 담당.

8️⃣ 5_half 특수 구조

**앵커 기하 (B2T_R 예):** CO_f=50 부근은 **코너** `(-2.25,-2.25)`; CO_f>50은 **LEFT 레일**에서 y가 증가하는 구간(`CO_(-2.25,10)_60` 등). 따라서 CO_rail은 “항상 하단 교점”이 아니며, **하단에 있을 때만** 하단 교점을 쓴다.

CO_f 기준 보정 (Sn, C4_f~C6_f)

logic.json 및 expr/rules에서 처리.

9️⃣ 상태 관리 원칙

계산은 순수 함수로 유지

useEffect에서 재계산 최소화

파생 상태는 useMemo 사용

Draft/Applied 분리 유지

훅은 early return 이전에 항상 호출 (React 규칙 준수)

table 관련 상수는 config/tableConfig 단일 출처

🔟 전략 혼합 금지 원칙

- signature = systemId + formulaHash + shotType
- 같은 signature 안에서만 nearest search, interpolation, Δ_sys correction 허용
- KD-tree는 signatureKey별로 분리 관리

1️⃣1️⃣ 데이터 관리 방식

- localStorage = 관리자 입력 임시 저장 (positions_dataset)
- dataset.json = 실제 운영 데이터셋 (관리자 수동 export, 미구현)

1️⃣2️⃣ Slot Architecture (S1 / S2 / S3)

S1 / S2 / S3는 **동일한 테이블**을 공유하고, **서로 다른 전략**을 담는 슬롯이다.

### Rules

- **balls (테이블 공 위치)**  
  → 전역 단일 SSOT (`ballsState`). Position LOCK 시 스냅샷이 S1/S2/S3 각 `slots[*].balls`에 동일하게 저장된다.  
  → `syncBallsToAllSlots`는 **balls만 deep copy**하며, 각 슬롯의 `draft` / `applied`는 변경하지 않는다.

- **strategy (sys / hpt / str / ai)**  
  → 슬롯 로컬: `shotEditor.slots[S1|S2|S3].draft` 및 `.applied`.

### Position LOCK

- **LOCK:** `ballsState` 기준 스냅샷 → S1/S2/S3 모두 동일 `balls` 저장. **전략 필드는 절대 건드리지 않는다.**
- **UNLOCK:** `slots[*].balls = null`. 전략은 그대로.

### Slot switch behavior

전환 시 **하면 안 되는 것:**

- `currentId` 변경으로 샘플 JSON 재로드
- `view` 교체
- `ballsState` 초기화

전환 시 **해야 하는 것:**

- `activeSlot`만 변경 (`switchSlot`)
- 활성 슬롯의 `draft` / `applied`를 기준으로 `adminState` 갱신 (렌더 브리지; 구현은 `App.jsx`)

⚠ **구현 상태 (2026-03):** 위는 **의도된 아키텍처** 명세이다. `adminState` ↔ 슬롯 ↔ 렌더 타이밍은 아직 불안정한 구간이 있으며, 상세 버그는 `5_PROJECT_MASTER_STATE_CURRENT.md`, `6_CURRENT_CODE_SNAPSHOT_SUMMARY.md`를 참고한다.

---

# 🆕 TRAJECTORY RENDERING LAYER

## 구조

1. System Layer (sys 계산)
2. Anchor Layer (좌표 변환)
3. Path Layer (기본 경로 생성)
4. Correction Layer (NEW)

---

## Correction Layer 역할

- spin decay 적용
- forward / reverse 보정
- vector 기반 각도 수정

---

## 특징

- non-destructive layer
- anchor / sys와 완전 분리
- rendering 전용 보정

---

## Data Flow

resolvedSlotSys  
→ resolvedSlotSysValues  
→ getAnchorsForRendering  
→ pathNodesRaw  
→ adjustedNodes (spin 적용)  
→ pathNodes (렌더링)

---

📌 최종 선언

이 문서는 3Cushion AI 시스템 구조의 공식 명세서이다.
구조 변경은 반드시 본 문서 대비 변경점으로 기록한다.

---

## [UPDATE 2026-04-01] Rail-based Normal 통합 및 C3~C6 정책 정리

### 1. Normal 정의 (FG 기준 단일 소스)

모든 쿠션 벡터 normal은 `railLine` 기반 **외향 단위 벡터**로 통일한다.

구현: [`frontend/src/utils/geometry/railNormalFG.ts`](../frontend/src/utils/geometry/railNormalFG.ts) — `getRailOutwardUnitNormalFG(railLine)`

| Rail | Normal (FG) |
|------|-------------|
| TOP | (0, +1) |
| BOTTOM | (0, -1) |
| LEFT | (-1, 0) |
| RIGHT | (+1, 0) |

- 좌표 `(x, y)`에 의존하지 않음 (normal 표 lookup만 사용).
- symmetry(H/V/RPI) 적용 시 `railLine` 또는 벡터 변환만 일관되게 맞추면 동일 구조 유지 가능.

### 2. `computeNormalFromPosition` 제거

- **기존:** 좌표 기반 최근접 쿠션 → normal 계산 (`SystemGrid.jsx` 등).
- **현재:** 완전 제거. `railLine` → `getRailOutwardUnitNormalFG` 구조로 단일화.

### 3. Vector Mark 배치 구조 (SSOT)

공통 파이프라인 (`SystemGrid.jsx` — `computeVectorMarkTargetFG`):

1. `railLine = getRailLineFromPosition(x, y)`
2. `normal = normalForVectorMarkPlacement(railLine, mark)` — 내부에서 `getRailOutwardUnitNormalFG` 기반
3. `targetFG = baseFG + normal * distance`
4. 이후 `fgToRg` → `toPx` (렌더 파이프라인)

### 4. Mark별 정책 분리

| Mark | baseFG | normal | distance |
|------|--------|--------|----------|
| C3 | rail snap | outward + **수직 변에서만** x 반전 (레거시 배치 유지) | `CUSHION_HALF` |
| C4 | rail snap | pure outward | `CUSHION_HALF` |
| C5 | anchor | pure outward | `MID_RANGE + BETA` |
| C6 | anchor | pure outward | `MID_RANGE + BETA` |

### 5. FRAME (CO / C1)

- `getRailLineFromPosition(x, y)` → `getRailOutwardUnitNormalFG(railLine)` 사용.
- `applyLayerOffset`는 **outward** 법선에 맞춰 픽셀 `dx/dy` 매핑됨 (기존 화면과 동일하도록 부호 조정 완료).

### 6. 핵심 설계 원칙

- normal은 반드시 **railLine 기반** (좌표만으로 normal 계산 금지).
- 위치 의미는 **baseFG**와 **distance**로 결정.
- symmetry 적용 가능 구조 확보 (표준 outward + rail 선택 정책 분리).

---

## Label Rendering Architecture (v2 - SSOT 기반)

라벨 렌더링은 **anchor SSOT** 기반으로 동작한다.

- `anchor.coord`는 절대 변경하지 않는다.
- 좌표 이동(`offset` / `normal` / `collision` 기반 이동)은 금지한다.
- 렌더 직전 좌표 변환만 허용한다.

### 현재 구조

```
coord
  ↓
space 판별
  ↓
(space === FG) ? fgToRg 1회 : 그대로
  ↓
toPx
```

### 전략 구조

- `five_half_reference` (기준 시스템, 완전 분리)
- `anchor_ssot` (기본 전략)
- `custom` (향후 확장)

### 금지 규칙

- 충돌 기반 이동 금지
- MID 임의 이동 금지
- FG↔RG 강제 전환 금지

### 현재 문제 정의

현재 일부 시스템은 `space`가 명시되지 않아 `inferCoordSpace` fallback에 의존한다.
이로 인해 시스템별 좌표 의미와 불일치가 발생할 수 있다.

### 다음 목표

`anchor` 데이터에 `space`를 명시하는 구조를 도입한다.

예시:

```json
{
  "coord": [82.25, 20],
  "space": "FG"
}
```