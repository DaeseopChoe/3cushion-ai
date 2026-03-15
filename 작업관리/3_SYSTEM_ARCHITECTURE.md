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
 │   ├── anchorCoordinateEngine.ts
 │   ├── calibrationEngine.ts
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

파일:

utils/systemCalculator.ts
utils/trajectorySampleBuilder.ts


특징:

anchors 기반 보정

value_domains 검증

trajectory 샘플 생성

Stage 렌더 반영

5️⃣ Draft / Applied 설계 원칙 (공식 선언)

전략 상태는 반드시 이중 구조를 따른다.

Slot
 ├── draft
 └── applied

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

**엔진 계층 (신규 구조):**
```
System Engine
   ↓
AnchorCoordinateEngine
   ↓
CalibrationEngine
   ↓
TrajectoryEngine
   ↓
PhysicsEngine
```

**전체 레이어:**
```
UI (App.jsx)
   ↓
Controllers (hooks: useSystemController, useCoachingController, useDisplayController)
   ↓
Domain (anchorCoordinateEngine, calibrationEngine, strategyEngine, railEngine)
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
SysOverlay 입력
   ↓
useShotSlots.updateDraftSys()
   ↓
calculateByProfileExpr()
   ↓
draft.sys.outputs.result
   ↓
useShotSlots.applyDraftSys()
   ↓
applied.sys
   ↓
AnchorCoordinateEngine (anchors.json → sys 좌표)
   ↓
CalibrationEngine (impact pivot 기준 보정)
   ↓
useTrajectoryState.applySysResult()
   ↓
domain/buildRailGroupedStrategy (전략·레일 가공)
   ↓
Trajectory adjusted
   ↓
utils/physics/* (Impact 계산)
   ↓
components/table/* (Stage Rendering)

6.2 Engine Layer (Domain)

**anchorCoordinateEngine.ts**

Role: anchors.json 기반 sys → 좌표 계산.

Main functions:
- parseAnchorId: 앵커 id 파싱 (형식: "CO_(82.25,10)_60")
- getTrackAnchors: track별 anchors 목록 추출
- interpolateCoord: sys 값 보간으로 좌표 계산
- sysToCoordFromAnchors: sys → 좌표 변환
- getAnchorsForRendering: 렌더링용 앵커 좌표 생성

**calibrationEngine.ts**

Role: impact pivot 기준 CO → C1 라인 보정.

Flow:
rawAnchors → calibrateTrajectory → rawAnchorsCalibrated

**Geometry Module (utils/geometry/)**

- line.ts: computeLineFromPoints
- rail.ts: lineRailIntersection, computeRailPoints, buildCushionPath
- App.jsx에서 CO→C1 rail 교점 계산 분리

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

SYS 계산 결과는 다음 파이프라인을 통해
렌더링 좌표로 변환된다.

```
sysValues
   ↓
getAnchorsForRendering()
   ↓
sysToCoordFromAnchors()
또는
sysValuesToAnchors()
   ↓
convertCanonicalAnchors()
(FG → RG 변환)
   ↓
rawAnchors
   ↓
snapToRail()
   ↓
CO / C1 rail projection
   ↓
computeReflectionC2()
   ↓
buildCushionPath()
   ↓
Trajectory rendering
```

⚠ convertCanonicalAnchors 실행 조건

- `hasConversionData = system.values.offset_fg2rg 존재`
- 현재 구조에서는 `offset_fg2rg`가 `profile.json` safety에 존재하지만
  `system.values`로 전달되지 않아 좌표 변환이 비활성화될 수 있다.

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

CO_f 기준 보정

Sn 계산

C4_f 재정의

C5_f, C6_f 동기화

해당 분기는 logic.json 및 계산 엔진에서 처리된다.

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

📌 최종 선언

이 문서는 3Cushion AI 시스템 구조의 공식 명세서이다.
구조 변경은 반드시 본 문서 대비 변경점으로 기록한다.