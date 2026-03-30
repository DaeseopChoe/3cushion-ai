본 문서는 3Cushion AI 프로젝트의 **최상위 기준 문서(Constitution)**이다.
모든 구조, 계산 로직, Admin/UI 흐름은 이 문서를 기준으로 한다.
하위 문서는 본 문서를 보조하는 세부 명세서이다.

1. 프로젝트 정의
1.1 목적

3Cushion AI는 국제식 3쿠션 시스템을

데이터화

검증

시뮬레이션

계산 자동화

하기 위한 분석 전용 시스템이다.

1.2 기술 스택

Frontend: React (Vite)
언어: TypeScript + JSX
계산 구조: profile / anchors / logic 기반 데이터 드리븐 구조
Admin 계산: useSysCalculation
App 계산: systemCalculator + trajectorySampleBuilder

2. 현재 실제 폴더 구조 (2026-03 기준)
frontend/src/
 ├── admin/
 │   ├── sys/
 │   ├── hpt/
 │   ├── str/
 │   ├── ai/
 │   ├── save/
 │   └── AdminContainer.tsx
 │
 ├── components/
 │   └── table/ (AnchorPoint, SystemValueLabels, ImpactLines, CoachingOverlay, TableGrid, RailFrame, Ball)
 ├── config/
 │   └── tableConfig.ts
 ├── contexts/
 ├── data/
 │   └── systems/   (39개 시스템)
 │
 ├── domain/
 │   ├── anchorLookupEngine.ts
 │   ├── anchorCoordinateEngine.ts
 │   ├── reflectionEngine.ts
 │   ├── railEngine.ts
 │   ├── strategyEngine.ts
 │   ├── calibrationEngine.ts (모듈 존재; App 궤적 경로에서는 미사용)
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
 │   ├── geometry/coords.ts, line.ts, rail.ts, anchorResolve.ts
 │   ├── physics/ (impact.ts, systemLine.ts, index.ts)
 │   ├── systemCalculator.ts
 │   ├── trajectorySampleBuilder.ts
 │   └── layoutCalculator.js
 │
 ├── App.jsx
 └── main.jsx


src/systems는 제거되었으며,
src/data/systems 단일 구조로 확정되었다.

추가된 레이어 (2026-03):
- config/tableConfig.ts
- hooks/useCoachingController, useSystemController, useDisplayController
- domain/railEngine, domain/strategyEngine
- utils/geometry/coords.ts
- utils/physics/*
- components/table/*

3. 시스템 데이터 구조 (Data Driven Architecture)

모든 시스템은 코드가 아니라 JSON 기반 데이터로 정의된다.

frontend/src/data/systems/

system_name/
├─ profile.json
├─ anchors.json
├─ logic.json
└─ system_meta.json

3.1 profile.json 역할

formula.expr 정의

value_domains 정의

safety 규칙

space_rule 정의

UI 표시 기준

3.2 anchors.json 역할

**좌표 SSOT (Single Source of Truth):** sys·track·mark에 대해 보간 가능한 기준점 집합.

궤적 검증용 기준점

Canonical anchor 정의

**역할 분리:** `profile.formula.expr`는 시스템 **값(숫자)** 계산 규칙이고, **화면에 그리는 CO/1C/3C 좌표**는 anchors lookup 파이프라인이 담당한다.

3.3 logic.json 역할

시스템 특수 보정 규칙

분기 처리

조건 기반 계산 확장

4. 시스템 등록 방식

파일:

frontend/src/data/systems/index.ts

const modules = import.meta.glob("./*/profile.json", { eager: true });


✔ profile.json만 존재하면 자동 등록
✔ 수동 import 금지
✔ 시스템 확장은 JSON 추가만으로 가능

5. 계산 엔진 계층 구조

이 프로젝트는 3계층 계산 구조를 가진다.

5.1 Strategy Engine (전략 엔진)

파일:

useShotSlots.ts

역할

Draft / Applied 상태 관리

SYSTEM_PROFILES 기반 계산 실행

calculateByProfileExpr 호출

**Recall:** `buildDraftsFromRecord`에서 저장된 inputs로 expr 재실행 → **`outputs.result` 채움** (lookup용)

저장 포맷 v1.4 생성

핵심 설계 원칙
상태	의미
Draft	실시간 계산 상태
Applied	확정된 전략 상태

✔ Draft는 저장하지 않는다
✔ Applied만 저장한다
✔ trajectory는 Applied 기준으로 생성한다

5.2 Trajectory Engine (궤적 상태 엔진)

파일:

useTrajectoryState.ts

역할

상태 전이 관리

IDLE → ADJUSTING → APPLIED

Strategy 결과를 UI 반영 상태로 변환

⚠ 현재 track 값은 일부 하드코딩 상태

5.3 Physics Engine (물리 엔진)

현재 위치:

utils/physics/ (impact.ts, systemLine.ts)

주요 함수:

- calculateImpact, determineRotation, getImpactDirection (impact.ts)
- adjustSystemLine (systemLine.ts)

config/tableConfig.ts: 테이블 상수
utils/geometry/coords.ts: 좌표 변환
components/table/*: SVG 렌더
hooks/*Controller: T, coaching, display 상태
domain/*: 전략·레일 가공 (runStrategyEngine)

6. Admin 계산 구조
6.1 Admin 계산 (순수 수식 엔진)

파일:

frontend/src/admin/sys/useSysCalculation.ts


특징:

profile.formula.expr 기반 계산

anchors 비의존

RHS 토큰 파싱 후 evaluate

5_half_system 특수 분기 포함

6.2 App 계산 (실제 궤적 계산)

파일:

systemCalculator.ts
trajectorySampleBuilder.ts
domain/strategyEngine.ts (runStrategyEngine)
utils/physics/* (Impact 계산)


흐름:

profile 로드
   ↓
value_domains 검증
   ↓
anchors 기반 보정
   ↓
trajectory 생성
   ↓
LayoutContext 반영

7. 데이터 흐름 다이어그램 (핵심)
SysOverlay 입력
   ↓
updateDraftSys()
   ↓
calculateByProfileExpr()
   ↓
draft.sys
   ↓
applyDraftSys()
   ↓
applied.sys
   ↓
useTrajectoryState.applySysResult()
   ↓
Physics 계산 (Impact)
   ↓
Stage 렌더링

8. Layout 구조

파일:

frontend/src/contexts/LayoutContext.jsx


역할:

현재 선택 시스템 관리

계산 결과 상태 관리

Stage 렌더링 연동

9. App.jsx 현재 상태 진단

App.jsx 역할 (Orchestrator 전환 완료):

- State Bridge, Event Handler, Stage Layout
- 훅·domain·physics·table 컴포넌트 조립

이미 분리됨: geometry, physics, table rendering, controllers, domain, config

⚠ 남은 문제점:

- 파일 규모 여전히 대형
- Ball, Joystick, Overlay 분기 추가 분리 여지

10. 데이터 표기 규칙

표기 통일:

1C → C1
2C → C2
3C → C3
4C → C4
5C → C5
6C → C6

역방향 표기 금지.

11. 주요 버그 히스토리
Maximum Update Depth exceeded

원인:

useEffect 내부 상태 재파생 구조

해결:

파생 상태 계산 분리

systems 경로 중복 문제

src/systems 제거

src/data/systems 단일화 완료

12. 2026-03 최신 상태 (문서·코드 동기화 요약)

**최근 핵심 주제 (2026-03 후반 ~ 03-28 기준):**

| 주제 | 요약 |
|------|------|
| **anchors SSOT** | 렌더용 앵커 좌표는 `anchors.json` + `anchorLookupEngine` / `anchorCoordinateEngine`에서 sys 보간으로 가져온다. “좌표를 expr로 새로 계산”하지 않는다. |
| **valueSpace (Fg / Rg)** | lookup 결과는 `coord` + `valueSpace`. Fg는 프레임 의미·방향점, Rg는 레일 맞음 좌표. `resolveAnchorPoint`는 Fg에 `snapToRail`을 적용하지 않는다. |
| **Recall + `outputs.result`** | Recall 시 draft에 `inputs`만 있고 `outputs.result`가 비면 `getAnchorsForRendering`이 1C 등을 채우지 못한다. `buildDraftsFromRecord`에서 `calculateByProfileExpr`로 `draft.sys.outputs.result`를 채우도록 보강됨. |
| **CO regression 복구** | `CO_rail`을 무조건 `computeRailImpactPoint(..., mark:"CO")`로 두면 5_half에서 CO_f>50(LEFT 구간)일 때 하단 교점 실패 → fallback으로 튀던 문제가 있었다. **Fg 하단 근처(`isBottomCO`)일 때만** 해당 교점을 적용하고, 그 외에는 `CO_prep` 유지로 복구. |
| **2C reflection 튜닝** | `reflectionEngine.ts`의 `TIP_TO_DELTA_DEG`: 3팁 **13°**, 4팁 **18°** (과보정 완화). 구조·테이블 형식은 유지, 값만 조정. |
| **1C 라벨 정합** | `allAnchors["1C"]`를 `C1_rail`(궤적 꺾임점)과 고정해 override와 라벨 불일치를 제거. |

아래 12절(2026-02 Baseline)은 역사적 스냅샷으로 유지하되, **운영 기준 최신 상태는 위 표와 `5_PROJECT_MASTER_STATE_CURRENT.md`를 우선**한다.

---

12. 현재 안정 상태 (2026-02 Baseline)

src/systems 제거 완료

SYSTEM_PROFILES 단일화 완료

Admin import 경로 정리 완료

dist 제거 완료

docs 구조 정리 완료

Draft/Applied 구조 고정

Save 포맷 v1.4 확정

12.1 Current Implementation Status

**완료:**
- StrategyEntry 구조
- PositionRecord 구조
- Position 병합 (upsertPositionRecord)
- localStorage 저장 (positions_dataset)
- SYS / HP-T / STR / AI UI
- Admin draft/applied 상태 관리
- positionMergeEngine, slotAutoRecommend, KD-tree 구조

**진행 중:**
- Position search engine (positionSearchEngine 연동)
- Admin auto recommendation (slotAutoRecommend)

**미구현:**
- Interpolation
- Δ_sys correction
- User recommendation UI
- dataset.json export

13. 향후 작업 (Roadmap)

TrajectoryEngine 순수 함수화

App.jsx 추가 슬림화 (Ball, Joystick, Overlay)

계산 파이프라인 완전 분리

SYSTEM_ARCHITECTURE.md 고도화

CALCULATION_RULES.md 정밀화

trajectory 파이프라인 도식화

완료 (2026-03): PhysicsEngine 분리, Geometry 분리, Render 분리, Controllers/Domain/Config 분리

12.2 설계 원칙 (Design Principles)

**전략 혼합 금지:**
- signature = systemId + formulaHash + shotType
- 같은 signature 안에서만 nearest search, interpolation, Δ_sys correction 허용

**데이터 관리 방식:**
- localStorage = 관리자 입력 임시 저장
- dataset.json = 실제 운영 데이터셋 (관리자 수동 export, 미구현)

🔒 최종 선언

본 문서는 3Cushion AI의
프론트엔드 구조 / 계산 철학 / 데이터 설계의 공식 기준 문서이다.

모든 변경은 이 문서를 기준으로 한다.