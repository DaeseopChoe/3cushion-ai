버전: v1.3 (Official Baseline)
기준: 2026-02 안정 구조 · USER Overlay Architecture 증분 2026-07-28 · Pointer Capture Timing Interaction SSOT 증분 2026-07-30 · Overlay Native Selection Interaction SSOT 증분 2026-08-01
목적: 현재 “동작하는 구조”를 공식 아키텍처로 고정하고, 향후 리팩터링 기준점으로 삼는다.

본 문서는 **프론트엔드 구조와 레이어 분해, 리팩터링 기준선**을 정의한다.
계산 로직과 시스템 데이터 구조는 SYSTEM_ARCHITECTURE 문서에서 관리한다.

1️⃣ 실제 현재 폴더 구조 (고정 기준)
frontend/src/
 ├── admin/
 ├── assets/
 ├── components/
 │   └── table/
 │       ├── AnchorPoint.jsx
 │       ├── SystemValueLabels.jsx
 │       ├── ImpactLines.jsx
 │       ├── CoachingOverlay.jsx
 │       ├── TableGrid.jsx
 │       ├── RailFrame.jsx
 │       └── Ball.jsx
 ├── config/
 │   └── tableConfig.ts
 ├── contexts/
 ├── data/
 │   └── systems/ (39 systems)
 ├── domain/
 │   ├── railEngine.ts
 │   ├── strategyEngine.ts
 │   └── index.ts
 ├── hooks/
 │   ├── useShotSlots.ts
 │   ├── useTrajectoryState.ts
 │   ├── useCoachingController.ts
 │   ├── useSystemController.ts
 │   └── useDisplayController.ts
 ├── lib/
 ├── styles/
 ├── utils/
 │   ├── geometry/coords.ts
 │   ├── physics/
 │   │   ├── impact.ts
 │   │   ├── systemLine.ts
 │   │   └── index.ts
 │   ├── systemCalculator.ts
 │   ├── trajectorySampleBuilder.ts
 │   └── layoutCalculator.js
 ├── App.jsx
 └── main.jsx


✔ src/systems 제거 완료
✔ src/data/systems 단일화 완료
✔ Geometry/Physics/Rendering/Controllers/Domain 분리 완료 (2026-03)

2️⃣ 핵심 아키텍처 개념 – 6 Layer 모델

현재 프론트엔드는 기능적으로 6개의 레이어가 존재한다.

Layer	역할	현재 위치
Rendering	SVG 테이블/공/가이드	components/table/* + App.jsx
Geometry	Fg/Rg/px 변환	utils/geometry/coords.ts
Physics	ImpactBall 계산	utils/physics/*
System	Expr 기반 계산	utils/systemCalculator
State	Draft/Applied, Trajectory	hooks
Interaction	Drag/Joystick	App.jsx

⚠ Before(과거): 대부분 App.jsx에 결합.
✔ After(현재): geometry/physics/table rendering/controllers/domain/config 분리 완료.

3️⃣ Draft / Applied 설계 원칙 (공식 선언)

이 프로젝트의 핵심 설계 철학:

Draft

실시간 계산 상태

수정 중 상태

Preview

Applied

확정 상태

저장 대상

trajectory 생성 기준

✔ Draft는 절대 저장하지 않는다.
✔ Applied만 저장한다.
✔ trajectory는 Applied 기준으로만 생성한다.

이 구조는 게임 엔진의 Preview vs Commit 패턴과 동일하다.

4️⃣ 전략 → 궤적 → 물리 파이프라인 (공식 흐름)
SysOverlay 입력
   ↓
Draft 계산
   ↓
Applied 확정
   ↓
Trajectory 반영
   ↓
Physics 계산
   ↓
Stage 렌더링

(상세 단계는 SYSTEM_ARCHITECTURE 6️⃣ 참조)

5️⃣ App.jsx 현재 상태 진단 (중요)

**Before (과거):**
- 렌더/좌표변환/Impact 물리/관리자 모드/전략 연결/인터랙션을 모두 App.jsx가 담당하는 슈퍼 컨트롤러 상태

**After (현재):**
- App.jsx 역할: Orchestrator(조립), State Bridge, Event Handler, Stage Layout
- 이미 분리됨: geometry / physics / table rendering / controllers / domain / config
- 아직 남음: Ball 렌더 일부, pointer handlers, Joystick, Overlay 분기

기술 부채:

- 파일 규모 여전히 대형
- ADMIN / USER 분기 혼합
- Ball, Joystick 블록 추가 분리 여지

6️⃣ Slot System

**Slots:** S1 | S2 | S3

**특징:**
- 각 슬롯 = 하나의 전략
- 금지 구조: S1에 전략 A + 전략 B 혼합
- 허용 구조: S1 → 전략 A, S2 → 전략 B, S3 → 전략 C

**Draft vs Applied 상태:**
- draft = 자동 추천 로딩 대상
- applied = 관리자 확정 값
- 규칙: 자동 추천은 applied를 절대 수정하지 않는다.

6.1 useShotSlots – 전략 엔진 정의

정체: Shot Strategy Editor State Engine

상태 구조:

S1 | S2 | S3
  ├── draft
  └── applied


핵심 함수:

updateDraftSys()

applyDraftSys()

validateDraft()

saveShot()

저장 포맷 v1.4 고정.

7️⃣ useTrajectoryState – 궤적 상태 머신

상태 전이:

IDLE → ADJUSTING → APPLIED


⚠ 현재 derived.track 일부 하드코딩 상태
⚠ 실제 물리엔진과 완전 연결은 Phase 2 대상

8️⃣ systems 데이터 드리븐 설계

39개 시스템 × 동일 구조. 코드가 아니라 데이터로 시스템 확장.
계산 구조 상세는 SYSTEM_ARCHITECTURE 참조.

9️⃣ 계산 코어 – systemCalculator.ts

SYSTEM_PROFILES 기반 계산. 구조도상 “System Engine Core” 위치. 계산 규칙 상세는 SYSTEM_ARCHITECTURE 참조.

🔟 Phase 2 리팩터링 청사진 (현재 구조 반영)

목표 (경로 명시):

domain/strategyEngine (runStrategyEngine)
   ↓
utils/trajectorySampleBuilder (TrajectoryEngine)
   ↓
utils/physics/* (PhysicsEngine)
   ↓
components/table/* (RenderEngine)

완료된 단계:
- Physics 로직 분리: utils/physics/*
- Geometry 로직 분리: utils/geometry/coords.ts
- Render 분리: components/table/*
- Controllers: hooks/useCoachingController, useSystemController, useDisplayController
- Config: config/tableConfig.ts
- Domain: domain/railEngine, domain/strategyEngine

잔여:
- AdminContainer 완전 분리
- App.jsx 추가 슬림화 (Ball, Joystick, Overlay)

------------------------------------------------------------

**전략 혼합 금지:**
- signature = systemId + formulaHash + shotType
- 같은 signature 안에서만 nearest search, interpolation 허용

------------------------------------------------------------

## 🔄 2026-02 프론트엔드 구조 업데이트 (HPT/AI 구조 안정화)

### 1. HPT 상태 구조 확정 (SSOT 기반)

HPT는 단일 책임 상태 구조로 확정되었다.

```ts
type HptState = {
  hp: { x: number; y: number };
  T: string;
  mode: "TIP" | "SPIN";
};
```

**구조 원칙**

- mode는 HPT의 표현 방식(TIP / SPIN)을 결정한다.
- hp는 항상 실제 좌표값을 기준으로 관리한다.
- parent ↔ controller 간 역주입 시 clamp는 controller 책임으로 한정한다.
- 단일 clamp 책임 구조 유지.

---

### 2. SYS → HPT 데이터 흐름 정리

**기존 문제**

- SYS 계산 결과 적용 시 hpt.hpDirection을 사용
- 현재 hp 방향과 SYS 결과 방향이 충돌 가능

**수정 구조**

```ts
const dir = sysHpNResult >= 0 ? "right" : "left";
const tip = clamp(Math.abs(sysHpNResult), 0, 4);
hpt.setHpFromTip(dir, tip);
```

**결과**

- SYS 계산값이 HPT UI에 정확히 투영됨
- 방향성 충돌 제거
- 음수 tip clamp 문제 해결

---

### 3. AI 코멘트 계층 구조 정리

AI 코멘트는 다음 계층 구조를 따른다:

```
HPT 상태 → buildPlayStrategyText()
        → buildPlayStrategy()
        → 전략 문장 생성
```

**개선 사항**

- 값 존재 시에만 문장 삽입
- SYS 도착값 / 1쿠션 개별 분기
- TIP / SPIN 모드 기반 문장 분기
- BANK 두께 처리 추가

AI 생성 로직은 현재 안정된 상태이다.

---

### 4. 전략 문서형 출력 계층 도입

**기존:**

- textarea 기반 편집형 출력

**변경:**

- div 기반 문서형 출력
- 자동 높이
- 읽기 전용 전략 박스 구조
  - AI 코멘트
  - 원 포인트 레슨

출력 계층과 입력 계층이 명확히 분리되었다.

---

### 5. 원 포인트 레슨 관리 계층 추가

```ts
type LessonItem = {
  id: string;
  text: string;
};

onePointLessons: LessonItem[];
```

**기능**

- 라이브러리 기반 누적 저장 (localStorage)
- 빈도 기반 정렬 유지
- 전략 문서 출력 계층에 통합
- 다중 레슨 지원

---

### 6. 관리자 전용 인터랙션 계층

관리 기능은 문서 UI를 변경하지 않는 방식으로 설계되었다.

- 클릭 → 선택 (하이라이트)
- Delete 키 → 삭제
- Drag handle → 정렬
- hover 시 핸들 표시

사용자 UI에서는 관리 기능을 숨길 수 있는 구조로 설계됨.

---

### 7. Drag & Drop 계층 추가

**신규 의존성:**

- @dnd-kit/core
- @dnd-kit/sortable
- @dnd-kit/utilities

Drag 계층은 전략 문서 레벨에 영향을 주지 않고 상태 정렬에만 영향을 준다.

---

### 📌 현재 프론트엔드 구조 상태

현재 프론트엔드는 다음과 같은 계층으로 안정화되었다:

1. **계산 계층** (SYS / HPT)
2. **상태 계층** (HptState + mode)
3. **전략 생성 계층** (AI 코멘트)
4. **전략 출력 계층** (문서형 UI)
5. **관리자 인터랙션 계층** (삭제/정렬)
6. **라이브러리 저장 계층** (localStorage)

본 구조는 2026-02 기준 안정화된 아키텍처 베이스라인이다.

---

## State Separation (2026-03 SSOT)

프론트 상태를 다음 **3계층**으로 구분해 기록한다. (SYSTEM_ARCHITECTURE `1️⃣2️⃣ Slot Architecture`와 정합.)

### Global state

- **`ballsState`** — 테이블 공 배치의 SSOT (cue, target, second, impact 등). 슬롯과 무관하게 하나만 유지.

### Slot state

- **`shotEditor.slots[S1 | S2 | S3]`** (`useShotSlots`)
  - **`draft` / `applied`** — 전략 (sys, hpt, str, ai); 슬롯별 독립.
  - **`balls`** — Position LOCK 시에만 각 슬롯에 복제되는 테이블 스냅샷 (전략과 분리).

### UI state (render bridge)

- **`adminState`** — 오버레이·Stage가 직접 읽는 UI/계산 브리지. 활성 슬롯의 draft/applied에서 동기화되며, **sys는 입력과 계산 결과(CO, C3, corrections 등)가 함께 쌓이는 객체**로 취급한다 (단순 replace 금지, merge 원칙).

⚠ **현재 구현:** 의도 구조는 위와 같다. SYS 지속성·궤적 렌더 일관성·슬롯 동기화는 부분적으로 깨진 상태일 수 있으니, 동작은 코드와 `PROJECT_MASTER_STATE_CURRENT`의 Known Issues를 우선한다.

---

## USER Overlay Layout (SSOT Pointer)

USER Overlay(AI · 타점 · 계산)의 **공통 Layout 규약**은 별도 SSOT에서 관리한다.

| Item | Value |
|------|-------|
| Document | `작업관리/OVERLAY_LAYOUT_SSOT_v1.2.md` |
| Status | Confirmed v1.2 (Last Updated **2026-08-12** · Centering SSOT) |
| Container | `.table-area` (viewport / Stage 전체 center **아님**) |
| Positioning SSOT | **`UserOverlayShell`만** |
| Size | Ratio (`tableW × overlayWidthRatio`) · AI/HPT `0.42` · CALC `0.62` |
| Height | `auto` + maxHeight ratio · Content scroll only past cap |
| Surface | glassDark (**Default USER Overlay**) |
| Position | **table-area 기하 중심** + temporary `dragOffset` + Clamp · No persistence |
| Measurement | **current/live panel DOM** dimensions (`offsetWidth` / `offsetHeight`) |
| Observers | **Table ResizeObserver** (table-area) · **Panel ResizeObserver** (panel reflow) — 동일 Centering SSOT |
| Close | Close(X) 없음 · 외부 터치 닫기 |
| Layers | Overlay Shell → Content Layer → (AI \| HPT \| 계산) |

### Ownership

| Layer | Owns |
|------|------|
| **Shell (`UserOverlayShell`)** | surface · ratio · typography scale · padding · drag · clamp · **Centering SSOT** · live panel measurement · Panel/Table ResizeObserver · Reading Mode positioning |
| **Content** | text · image · svg · DisplayModel projection (read-only) · **position 금지** |
| **Toolbar (CALC)** | Shell 밖 Controller · Drag 제외 · **Centering SSOT 아님** |

### Architecture Shape

```text
App
  → .table-area
    → UserOverlayShell   (layout · centering · dragOffset · measure · RO)
      → AI | HPT | CALC Content   (표시만 · 위치 비결정)
```

### Centering invariant (2026-08-12)

```text
Normal:   overlayCenter === tableAreaCenter
Drag:     overlayCenter = tableAreaCenter + temporary dragOffset
Reset:    Open / Re-open / Switch / Zoom / layout·size → dragOffset = 0
```

Zoom In/Out은 항상 **table-area center** (이전 시각 중심 유지 금지).  
Root Cause 해결: stale panel dimensions + content reflow → Panel ResizeObserver.

### Rules

- Content는 Layout Size를 직접 결정하지 않는다.
- Content는 Shell background / border / shadow / radius / position을 직접 소유하지 않는다.
- Content는 Shell max token을 preferred width로 재사용하지 않는다.
- 본 Baseline은 폴더·상태 계층 SSOT를 유지한다. Overlay Layout 상세는 위 문서를 Consume한다.
- v1.2에서 Shell→Content 분리, 전체 Surface Drag, Dark Glass 기본값이 공식 확정되었다.
- 2026-08-12 Centering SSOT는 DisplayModel / Projection / SYS Engine을 변경하지 않는다.

---

## USER Projection Rule (2026-07-28)

공식 문구:

> **“USER는 관리자가 만든 DisplayModel을 투영해서 보여주는 Viewer이다.”**

### 구조

```text
ADMIN Input / Calculation
    ↓
Domain DisplayModel
    ↓
USER 공개 Block 선택
    ↓
Read-only Viewer
    ↓
UserOverlayShell
```

### 금지

- USER 전용 공식 재생성
- USER 전용 계산 문구 재생성
- 동일 결과의 중복 ViewModel
- ADMIN과 USER의 표현 계층 분기

### Calculation Architecture

**이전:**

```text
App
→ buildUserTrajectoryCardModel
→ UserTrajectoryCardModel
→ UserCalculationPanel / UserTrajectoryInfoCard
```

**현재:**

```text
App
→ buildSysCalcDisplayModel
→ baseline / corrected block 선택
→ UserCalculationPanel
→ sections / lines / parts Viewer
```

### 책임 분리

| Layer | Responsibility |
|-------|----------------|
| 계산 엔진 | 숫자 산출 |
| DisplayModel | 최종 표현 구조 생성 (`buildSysCalcDisplayModel`) |
| USER Projection | 공개 Block 선택 |
| Viewer | 순수 렌더 |
| Shell | Layout / Surface / Drag / **Centering SSOT** / live measure / Panel·Table RO |

### AI / HPT

이번 세션에서는 AI/HPT **Projection 구조를 변경하지 않았다.**

장기 원칙은 동일하다.

- ADMIN 최종 표현 결과
- USER 공개 Projection
- Read-only Viewer

후속 Architecture Review에서 별도 적용 여부를 검토한다.

---

## Pointer Capture Timing (Interaction SSOT) — 2026-07-30

ADMIN 테이블 Interaction(공 선택 · Joystick Drag · Ball Drag · Target Ball 더블클릭)의 **Pointer Capture 실행 시점**을 고정하는 SSOT이다.

### 배경

`handlePointerDown()`에서 공 선택 직후 `svg.setPointerCapture()`를 무조건 호출하면, 두 번째 클릭의 browser native `dblclick` target이 Ball `<circle>`에서 `svg.table-svg`로 강제 변경되어 `Ball.onDoubleClick`(Target Ball 지정)이 끊긴다. Playwright trusted event A/B 실험으로 capture ON → dblclick 실패, capture OFF → dblclick 복구가 실측 확인되었다.

### 구조

```text
pointerdown
    ↓
Ball 선택 / Joystick 생성
    ↓
(아직 Pointer Capture 없음 — native click/dblclick 보존)
    ↓
pointermove
    ↓
실제 Drag 시작 (첫 유효 이동)
    ↓
setPointerCapture()   (미보유 시 1회)
    ↓
pointerup / pointercancel → 자동 해제
```

### Rule (이후 수정 시 반드시 유지)

- **pointerdown에서는 Pointer Capture를 획득하지 않는다.**
- **실제 Drag가 시작된 첫 pointermove에서 Capture한다.**
- **클릭 / 더블클릭 입력은 Browser Native Event를 그대로 유지한다.**
- **Drag 전용 기능만 Pointer Capture를 사용한다.**

### 코드 SSOT

| 함수 | 책임 |
|------|------|
| `App.jsx` `handlePointerDown()` | 공 선택 · Joystick 생성 (Capture 호출 **없음**) |
| `App.jsx` `handlePointerMove()` | 첫 유효 이동에서 `hasPointerCapture` false일 때만 `setPointerCapture` 획득 |
| `App.jsx` `handlePointerUp()` / `handlePointerCancel()` | Drag 종료 · Capture 자동 해제 (변경 없음) |

### 금지

- pointerdown 시점 Capture 복귀
- 클릭/더블클릭 경로에 Capture로 인한 target retarget 유발
- `handleBallDoubleClickForTarget` · `applyTargetFromBallId` · `Ball()` · `BALL_PICK_RADIUS_RG` · `BALL_RADIUS_RG` · Joystick offset · Pad geometry · `pointer-events` · SVG 구조 · Render 순서 변경으로 본 규칙 우회

> **상세 이력:** `HISTORY/PROJECT_LOG_2026-07.md` 2026-07-30 (D-INTERACT-01~03)

---

## Overlay Native Selection (Interaction SSOT) — 2026-08-01

ADMIN Overlay(`ModalShell`)가 열릴 때 **browser native text selection**을 어떻게 처리하는지 고정하는 SSOT이다. Pointer Capture Timing SSOT의 부수 효과를 Overlay 계층에서 흡수하는 규칙이다.

### 배경

Pointer Capture Timing SSOT에 따라 클릭 / 더블클릭 경로는 browser native event를 그대로 유지한다. 따라서 Target Ball 더블클릭은 `preventDefault()`를 거치지 않고, 브라우저가 Selection Range를 생성한다. 이 Range가 해제되지 않은 상태에서 Overlay panel DOM이 삽입되면 새 텍스트 노드가 기존 Range에 편입되어 selection highlight로 렌더된다.

SYS 버튼은 Target Ball 더블클릭 이후에만 활성화되므로, 새로고침 후 **첫 Overlay 오픈**의 직전 동작은 항상 더블클릭이다. 이 때문에 첫 오픈에서만 재현된다.

### 구조

```text
Target Ball 더블클릭
    ↓
브라우저 Selection Range 생성 (native dblclick 보존 정책의 정상 부수 효과)
    ↓
Overlay 버튼 활성화 → ModalShell open
    ↓
open 전환 시 1회 window.getSelection()?.removeAllRanges()
    ↓
panel DOM 삽입 → highlight 없음
```

### Rule (이후 수정 시 반드시 유지)

- **ModalShell은 `open` 전환 시 1회 native Selection을 초기화한다.**
- **Overlay는 browser selection 상태만 초기화한다. Pointer Capture / Ball / Pad Interaction은 변경하지 않는다.**
- **Selection 문제를 `preventDefault` 추가 또는 `user-select` CSS로 해결하지 않는다.** (Pointer Capture Timing SSOT 위반 위험)
- **초기화 시점은 mount가 아니라 `open === true` 전환이다.** ModalShell은 닫혀 있을 때 `null`을 렌더링하되 컴포넌트 자체는 mount 상태로 남는다.

### 코드 SSOT

| 파일 | 책임 |
|------|------|
| `components/common/ModalShell.jsx` | `open` 전용 `useEffect` — `window.getSelection()?.removeAllRanges()` 1회 |

적용 범위는 ModalShell을 소비하는 ADMIN 계열 모달 전체다 — SYS · HP/T · STR · AI · Workspace History · Category Manage · Lesson Order Manage. USER Overlay(`UserOverlayShell`)는 별도 Layer이며 본 규칙 대상이 아니다.

### 금지

- Overlay 계열에 `user-select: none` 추가로 우회
- `handlePointerDown` / `handleBallDoubleClickForTarget`에 `preventDefault` 추가로 우회
- `::selection` 커스텀 색상으로 시각적 은폐
- Selection 초기화 로직을 drag-state 초기화 effect 등 다른 관심사에 병합

> **상세 이력:** `HISTORY/PROJECT_LOG_2026-08.md` 2026-08-01 (D-OVLSEL-01~02)