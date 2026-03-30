# PROJECT_MASTER_STATE_CURRENT
3Cushion AI – Current Code State Snapshot
Version: v2.4
Last Updated: 2026-03-28
Owner: 목계님

------------------------------------------------------------
이 문서는 “현재 실제 코드 상태”만 기록한다.
설명/이론/설계 철학은 포함하지 않는다.
구조 변경 시 전체를 재작성한다.

이 문서는 구조 붕괴 방지를 위한 통제 문서이다.
아래의 SESSION CHANGE DECISION PROTOCOL이
이 문서의 유일한 재작성 기준이다.

⚠ 구조 변경 항목이 감지되면,
ChatGPT는 작업을 계속하기 전에
반드시 "MASTER_STATE_CURRENT 전면 재작성 권고" 메시지를 먼저 출력한다.

------------------------------------------------------------
# 🔴 SESSION CHANGE DECISION PROTOCOL

작업 도중 아래 항목 중 하나라도 발생하면:

□ 폴더/파일 구조 변경
□ 계산 흐름 변경
□ Draft/Applied 구조 변경
□ 전략 → 궤적 → 물리 파이프라인 변경
□ 저장 포맷 변경
□ 물리 계산 로직 변경

→ ChatGPT는 즉시 아래 메시지를 출력해야 한다:

"⚠ 구조 변경 감지되었습니다.
PROJECT_MASTER_STATE_CURRENT를 전면 재작성하시겠습니까?"

사용자는 반드시:
1) 전면 재작성
또는
2) 구조 변경이 아님을 명시적으로 선언

둘 중 하나를 선택해야 한다.

--------------------------------------------

위 항목이 모두 해당되지 않는 경우:

→ CURRENT_CODE_SNAPSHOT_SUMMARY.md만 업데이트한다.

------------------------------------------------------------

# 1. 현재 실제 폴더 구조 (Frontend 기준)

frontend/src/

admin/
  ai/
  hpt/
  str/
  sys/
  save/
  tests/
  slotAutoRecommend.ts
  AdminContainer.tsx

components/
  WorkspaceHistoryModal.jsx
  table/
    AnchorPoint.jsx
    SystemValueLabels.jsx
    ImpactLines.jsx
    CoachingOverlay.jsx
    SystemGrid.jsx
    TableGrid.jsx
    RailFrame.jsx
    Ball.jsx

config/
  tableConfig.ts

contexts/
data/
  systems/ (39개 시스템)
  anchorsRegistry.ts
  system/calculator/

domain/
  anchorLookupEngine.ts
  anchorCoordinateEngine.ts
  calibrationEngine.ts
  reflectionEngine.ts
  railEngine.ts
  strategyEngine.ts
  adminSaveEngine.ts
  positionMergeEngine.ts
  positionSearchEngine.ts
  positionRecallEngine.ts
  positionRecallEngine.test.ts
  workspaceHistory.ts
  finalCoordinateEngine.ts
  evaluateStrategy.ts
  strategySignature.ts
  search/
    kdTree6d.ts
    signatureKey.ts
    positionKDIndex.ts
  index.ts

hooks/
  useShotSlots.ts
  useTrajectoryState.ts
  useCoachingController.ts
  useSystemController.ts
  useDisplayController.ts

lib/
utils/
  geometry/
    coords.ts
    line.ts
    rail.ts
    anchorResolve.ts
  physics/
    impact.ts
    systemLine.ts
    index.ts
  systemCalculator.ts
  trajectorySampleBuilder.ts
  layoutCalculator.js
  tipClockConverter.ts
  aiPlayStrategyBuilder.ts

App.jsx
main.jsx

※ 이 구조는 현재 실제 코드 기준이며, 변경 시 본 섹션 전체 수정.

------------------------------------------------------------

# 2. App.jsx 현재 상태 평가

App.jsx 역할 (Orchestrator 전환 완료):

✔ State Bridge (ballsState, dragState, overlayState, adminState)
✔ Event Handler (pointer, joystick, overlay)
✔ Stage Layout (SVG 조립)
✔ 훅 호출·데이터 조립 (useSystemController, useCoachingController, useDisplayController, buildRailGroupedStrategy)

이미 분리된 것:

- Geometry: utils/geometry/coords.ts (toPx, toRg, clamp, pointerToRg 등)
- Physics: utils/physics/* (calculateImpact, adjustSystemLine)
- Rendering: components/table/* (AnchorPoint, SystemValueLabels, ImpactLines, CoachingOverlay)
- Controllers: hooks/useCoachingController, useSystemController, useDisplayController
- Config: config/tableConfig.ts
- Domain: domain/strategyEngine (추천), domain/railEngine (레일 그룹핑)

아직 App에 남은 것:

- Ball 렌더 (로컬 Ball 컴포넌트)
- Pointer handlers (handlePointerDown, handlePointerMove 등)
- Joystick 블록
- Overlay 모달 분기 (SysOverlay, HptOverlay, StrOverlay, AiOverlay)
- groupSystemValuesByRail 등 rail 계산 로직 → domain으로 이전됨 (2026-03)

※ 구조 변경 시 이 항목은 반드시 갱신

------------------------------------------------------------

# 3. 전략 엔진 상태 (useShotSlots)

현재 구조:

Draft / Applied 분리 유지
3 Slot 구조 (S1 / S2 / S3)

updateDraftSys 흐름:
input 병합 → base 고정 → SYSTEM_PROFILES 조회 →
calculateByProfileExpr 실행 →
draft.sys.outputs.result 생성

applyDraftSys:
structuredClone 기반 확정

saveShot:
Applied만 저장
trajectorySamples 파생 생성
version: v1.4

------------------------------------------------------------

# 4. 궤적 엔진 상태 (useTrajectoryState)

상태 머신:

IDLE → ADJUSTING → APPLIED

현재 문제점:

- 실제 물리 트랙 계산 미연결
- derived.track 하드코딩
- App.jsx 브리지 의존

------------------------------------------------------------

# 5. 전략 → 궤적 → 물리 연결 구조 (현재)

Admin SysOverlay / Recall draft
   ↓
calculateByProfileExpr → draft.sys.outputs.result (Recall은 buildDraftsFromRecord에서 재실행)
   ↓
useShotSlots.updateDraftSys / applyDraftSys
   ↓
getAnchorsForRendering: anchorLookupEngine + anchorCoordinateEngine (anchors.json SSOT, coord + valueSpace)
   ↓
utils/geometry/anchorResolve (resolveAnchorPoint; Fg snap 없음) + computeRailImpactPoint (C1_rail)
   ↓
App.jsx: CO_rail = 조건부 하단 교점 (isBottomCO), 그 외 CO_prep 유지
   ↓
reflectionEngine (2C 자동) when anchors["2C"] 없음
   ↓
useTrajectoryState.applySysResult
   ↓
domain/buildRailGroupedStrategy
   ↓
utils/physics/* (Impact)
   ↓
hooks/useCoachingController
   ↓
components/table/*
   ↓
Stage (App.jsx)

※ calibrationEngine 모듈은 존재하나 **현 App 경로에서 calibrateTrajectory 미호출**.

------------------------------------------------------------

# 5.5 Domain Layer Additions (2026-03)

- anchorLookupEngine.ts: anchors.json mark+sys → getAnchorCoordFromSys (보간, valueSpace 부여)
- anchorCoordinateEngine.ts: sysValues → getAnchorsForRendering (후보 키 CO_f, C1_f 등)
- calibrationEngine.ts: (모듈만 존재; App 메인 궤적에서 미사용)
- reflectionEngine.ts: 2C 후보, TIP_TO_DELTA_DEG 등
- anchorsRegistry.ts (data/systems/): 모든 anchors.json 자동 로딩 (32 systems)
- adminSaveEngine.ts: createStrategyEntry, buildStrategyMeta (positionMergeEngine re-export)
- positionMergeEngine.ts: Position 병합 (upsertPositionRecord, isSameBalls, findSimilarPosition, mergeStrategyIntoPosition)
- finalCoordinateEngine.ts: system-based final (1C) coordinate calculation (5_half_system, n_across_short)
- evaluateStrategy.ts: impact + final computation wrapper (balls + sysInputs → userImpact, userFinal)
- domain/search/kdTree6d.ts: 6D KD-tree 구현
- domain/search/signatureKey.ts: makeSignatureKey (systemId + formulaHash + shotType)
- domain/search/positionKDIndex.ts: signatureKey별 KD-Tree 인덱스 매니저
- admin/slotAutoRecommend.ts: 관리자 슬롯 자동 추천

# 5.5.1 Geometry Module (utils/geometry/)

- line.ts: computeLineFromPoints
- rail.ts: lineRailIntersection, computeRailPoints, buildCushionPath, snapToRail
- anchorResolve.ts: normalizeAnchor, resolveAnchorPoint (Fg snap 없음), computeRailImpactPoint
- App.jsx: CO_rail 조건부, C1_rail = computeRailImpactPoint mark "1C"; allAnchors["1C"] = C1_rail

# 5.5.2 SystemGrid (components/table/)

- anchors.json 기반 시스템 그리드 표시
- FG values → frame 영역, RG values → rail edge
- ADMIN 모드 showSystemGrid 옵션으로 표시

# 5.5.3 Trajectory Reference Model

- 시스템 궤적 기준: CO → C1 → C2 → C3 → C4 → C5 → C6
- baseline: C3 = C4 = C5 = C6
- corrected: C4 = C5 = C6

------------------------------------------------------------

# 5.6 Dataset State

- dataset is stored in App.jsx as React state
- persisted to localStorage under key "positions_dataset"
- structure: PositionRecord[]
- PositionRecord contains: balls, strategies[]
- StrategyEntry contains: slot, signature, sysInputs, hpT, str, ai, meta

------------------------------------------------------------

# 5.7 Meta Storage

StrategyMeta now includes:
- impact (Point)
- final (Point)
- angle_ci
- angle_fs

------------------------------------------------------------

# 5.8 Save Flow (2026-03 재구성)

## 5.8.1 저장 구조 (현재)

| 단계 | 트리거 | 저장 대상 | 저장소 |
|------|--------|-----------|--------|
| **SAVE** | SAVE 버튼 클릭 | Workspace Snapshot | localStorage `workspace_history` |
| **Export** | History → Unexported → 선택 → Export | JSON 파일 | File System (systemId/pattern 폴더) |

## 5.8.2 SAVE = Workspace History Snapshot

- SYS/HPT/STR/AI/Anchor overlay **적용 버튼 클릭 시** → `handleSaveWorkspaceSnapshot(true)` (silent)
- SAVE 버튼 클릭 시 → `handleSaveWorkspaceSnapshot()` (alert 표시)
- snapshot 구조: `{ id, name, systemId, pattern, version, timestamp, exported, state }`
- state: adminState, ballsState, dataset, shotEditor

## 5.8.3 Export 구조

- **위치:** History 모달 → Unexported 탭에서만 수행
- **File System Access API** 사용 (`showDirectoryPicker`, `getDirectoryHandle`)
- **폴더 구조:** `{선택폴더}/{systemId}/{pattern}/*.json`
- **파일명:** `{systemId}_{pattern}_v{version}_{date}.json`
- **version:** patternDir 내 기존 파일 파싱 후 max+1 (overwrite 금지)
- **exported:** Export 완료 시 snapshot.exported = true

## 5.8.4 Auto Save 정책

- **항상 ON** (버튼 제거)
- **적용 버튼 클릭 시만 저장** (입력 중 저장 금지)
- anchorsOverride: 적용 시에만 localStorage + snapshot 저장

## 5.8.5 handleSaveStrategy (유지)

- AiOverlay "전체 적용" / onSaveStrategy에서 호출
- dataset upsert → positions_dataset localStorage
- autoSave=true 시 saveToFile (fileHandle 연결 시)

## 5.8.6 Workspace History 구조

- **All / Unexported** 탭 구조
- **snapshot.exported** 필드: Export 완료 시 true
- **Delete N개:** All 탭에서 최신순 기준 가장 오래된 N개(최대 30) 삭제
- **localStorage key:** `workspace_history`

## 5.8.7 Recall 구조

- **Recall** = 전략 템플릿 불러오기 (Import 완전 대체)
- `runPositionRecall` (positionRecallEngine) 사용
- `applyPositionRecall` draft만 업데이트 (balls 변경 없음)

### Recall 동작 정의 (2026-03 업데이트, 2026-03-28 보강)

- Recall은 balls를 변경하지 않는다.
- Recall은 draft 상태만 변경한다.
- applied 상태는 변경하지 않는다.
- SAVE 수행 전까지 dataset에는 반영되지 않는다.
- **buildDraftsFromRecord:** 저장된 `sysInputs`로 `calculateByProfileExpr`를 실행해 **`draft.sys.outputs.result`를 채운다.** (과거: inputs만 → result 비어 1C lookup 실패·CO-1C-2C-3C 궤적 소실)

### UI 데이터 소스 정책

- UI 표시 값은 draft를 기준으로 한다.
- applied는 저장 및 확정 상태로만 사용한다.

## 5.8.8 버튼 구조 (우측 패널)

**레이아웃:** app-layout (flex) → table-area | right-panel (120px)

**현재 버튼:**
- Grid (System Grid 토글)
- Recall (Position Recall)
- History (WorkspaceHistoryModal)
- SAVE (snapshot 저장)

**제거된 버튼:**
- Admin (Ctrl+Shift+A로 모드 전환)
- Import (Recall로 대체)
- Export (History 내부로 이동)
- Auto Save (항상 ON)
- 파일 연결
- Save Strategy

------------------------------------------------------------

# 5.8.1 Strategy Recommendation Engine

strategyEngine.ts now acts as the central recommendation engine.

Admin Mode:

- recommendForAdmin(balls, dataset)
  → nearest PositionRecord

User Mode:

- recommendForUser(balls, dataset, options)
  → returns StrategyEntry for S1/S2/S3 slots

------------------------------------------------------------

# 5.9 positionMergeEngine.ts

**역할:** 동일(또는 ε 이내) balls 배치 시 새 PositionRecord 생성 대신 기존에 StrategyEntry 추가/갱신

- MERGE_EPSILON = 0.5
- isSameBalls(a, b, epsilon): 6축 각각 |Δ| < ε 비교
- findSimilarPosition(dataset, balls)
- mergeStrategyIntoPosition(position, newStrategy): slot+signature 동일 시 덮어쓰기, 아니면 추가
- upsertPositionRecord(dataset, balls, newStrategy): 최종 진입점

------------------------------------------------------------

# 5.10 Known Limitations

- Search engine (positionSearchEngine) not yet connected to user flow
- Admin auto-recommend (slotAutoRecommend) 진행 중
- Interpolation 미구현
- Δ_sys correction 미구현
- Export: File System Access API (Chrome/Edge 지원, Firefox 제한적)

------------------------------------------------------------

# 5.11 설계 원칙 (Design Principles)

**전략 혼합 금지:**
- signature = systemId + formulaHash + shotType
- 같은 signature 안에서만 nearest search, interpolation, Δ_sys correction 허용
- KD-tree는 signatureKey별로 분리 관리

**데이터 관리 방식:**
- localStorage = positions_dataset, workspace_history, ANCHORS_OVERRIDE_V1
- Export = History → Unexported → 선택 → File System (systemId/pattern 폴더)

------------------------------------------------------------

# 5.12 Architecture Summary — Strategy Engine Refactor (2026-03)

- strategyEngine.ts now handles recommendation logic.
- railEngine.ts contains rail grouping logic.
- runStrategyEngine moved to railEngine.

------------------------------------------------------------

# 6. 현재 기술 부채 (Technical Debt)

□ App.jsx 여전히 대형 (Orchestrator + Overlay + Ball + pointer handlers)
□ derived.track 미구현
□ Admin/User 분기 통합 (Overlay 블록 일부 혼합)
□ Ball, Joystick 블록 추가 분리 여지

해소됨:

- Geometry/physics/render/controllers/config/domain 분리 완료

------------------------------------------------------------

# 7. 세션 종료 체크 프로토콜 (강제 실행)

새 채팅창으로 이동하기 전 반드시 실행:

1. 오늘 변경 사항 요약
2. 아래 항목 체크

[CHECK]

□ 폴더 구조 변경
□ 계산 로직 변경
□ 상태 엔진 변경
□ 저장 포맷 변경
□ 물리 계산 로직 변경
□ 전략→궤적→물리 연결 변경

3. 하나라도 체크되면:

→ PROJECT_MASTER_STATE_CURRENT 전면 재작성
→ Version 증가
→ 날짜 업데이트

4. 체크가 모두 해제라면:

→ 버전 유지
→ 날짜만 갱신 가능

------------------------------------------------------------

# 8. 새 채팅 시작 템플릿 (자동 감지 트리거)

새 채팅창에서 항상 아래 템플릿 사용:

------------------------------------------------------------
프로젝트: 3Cushion AI

업로드 문서:
- PROJECT_MASTER_INDEX
- FRONTEND_ARCHITECTURE_BASELINE
- SYSTEM_ARCHITECTURE
- CALCULATION_RULES
- PROJECT_MASTER_STATE_CURRENT

작업 중 아래 변경이 발생하면
CURRENT 업데이트 필요 여부를 즉시 판단해 주세요:

1. 폴더 구조 변경
2. 계산 흐름 변경
3. Draft/Applied 구조 변경
4. 전략→궤적→물리 파이프라인 변경
------------------------------------------------------------

이 문장을 반드시 포함한다.
이 문장은 구조 붕괴 방지 장치이다.

------------------------------------------------------------

# 9. 문서 운영 규칙

- CURRENT는 누적 로그가 아니다.
- 항상 “현재 코드 상태”만 기록한다.
- 과거 내용은 제거한다.
- 세션 단위로 재작성한다.
- Git 커밋과 함께 관리한다.

------------------------------------------------------------

# 🔄 2026-02 프로젝트 상태 업데이트 (AI/HPT 구조 안정화 완료)

## 1. HPT 구조 상태

- HptState에 `mode: "TIP" | "SPIN"` 필드 확정
- parent ↔ controller 역주입 구조 안정화
- 단일 clamp 책임 유지
- SYS 계산값의 HP_n이 HPT에 정확히 투영됨

### SYS → HPT 투영 구조

- 방향: sysHpNResult 부호 기준
- 크기: Math.abs(sysHpNResult)
- tip 범위: 0 ~ 4 clamp

방향 충돌 및 음수 clamp 문제 해결 완료.

---

## 2. AI 코멘트 생성 구조 확정

AI 전략 문장은 다음 조건 기반 구조로 확정됨:

- 도착값 / 1쿠션 값 존재 시에만 해당 문장 출력
- TIP 모드 → 시침 기반 문장
- SPIN 모드 → 회전/당점 기반 문장
- BANK 두께 처리 반영
- STR 기본값 반영

문장 생성 로직은 현재 안정 상태.

---

## 3. STR 기본값 구조 확정

**기본 설정:**

- 스트로크 타입 → null
- 가속 패턴 → 부드러운 등속
- 목표 속도 → 2.5 레일
- 스트로크 깊이 → 1.5 Ball
- 타격 강도 → 평범한

null 스트로크 타입은 문장에 출력하지 않음.

---

## 4. 전략 출력 UI 구조 확정

전략 출력은 textarea 기반에서 문서형 div 구조로 변경됨.

**출력 구조:**

- AI 코멘트
- 원 포인트 레슨 (다중 지원)

**특성:**

- 자동 높이
- 읽기 전용 출력
- 입력 계층과 출력 계층 완전 분리

---

## 5. 원 포인트 레슨 시스템 도입 완료

### 구조

```ts
type LessonItem = {
  id: string;
  text: string;
};

onePointLessons: LessonItem[];
```

### 기능

- 다중 레슨 지원
- 라이브러리 누적 저장 (localStorage)
- Drag & Drop 정렬
- 선택 → Delete 키 삭제
- hover 시 핸들 표시
- 관리자 전용 인터랙션

사용자 UI와 관리자 UI 분리 가능한 구조로 설계됨.

---

## 6. Drag & Drop 계층 추가

**의존성:**

- @dnd-kit/core
- @dnd-kit/sortable
- @dnd-kit/utilities

- 전략 문서 출력에는 영향 없음.
- 정렬 상태만 변경.

---

------------------------------------------------------------

# 🔄 2026-03 구조 변경 (궤적/anchors/calibration/SystemGrid)

## 1. 신규 엔진 계층

- **anchorLookupEngine / AnchorCoordinateEngine**: anchors.json SSOT → sys 보간 좌표
- **CalibrationEngine**: (모듈 존재; App 메인 궤적 경로 미사용)
- **Geometry Module**: line.ts, rail.ts, **anchorResolve.ts**

## 2. anchorsRegistry

- data/systems/anchorsRegistry.ts: anchors.json 자동 로딩 (32 systems)

## 3. SystemGrid

- components/table/SystemGrid.jsx: FG/RG 표시 규칙 기반 시스템 그리드
- ADMIN 모드 showSystemGrid 옵션

## 4. Trajectory Reference Model 명확화

- CO → C1 → C2 → C3 → C4 → C5 → C6
- baseline: C3 = C4 = C5 = C6 | corrected: C4 = C5 = C6

------------------------------------------------------------

### 📌 현재 프로젝트 안정 상태 요약

**2026-03-28 기준 (v2.4):**

- HPT / SYS / AI / STR / 원포인트 레슨: 유지
- **anchors.json 좌표 SSOT** + anchorLookupEngine / anchorCoordinateEngine
- **valueSpace (Fg/Rg)** + resolveAnchorPoint **Fg snap 제거**
- **Recall → outputs.result 복구** (buildDraftsFromRecord + expr)
- **1C 라벨 = C1_rail** (allAnchors 고정), override와 꺾임점 정합
- **CO regression 복구** (isBottomCO 조건부 교점; LEFT 구간 CO_prep 유지)
- **2C reflection:** TIP_TO_DELTA_DEG 3팁 13°, 4팁 18° (1차 튜닝)
- anchorsRegistry / SystemGrid / Trajectory Reference Model: 유지

**남은 과제:**

- 2C reflection **실전 샷 기반 미세 보정**
- computeRailImpactPoint **fallback 정리** (CO는 App에서 이미 가드; C1 등 일원화 검토)
- anchor / rail / reflection **장기 리팩터링** (SSOT·좌표계 단일화)

------------------------------------------------------------

# 🔄 2026-03 C2 Reflection & Spin Calibration — Current State Summary

## Current State Summary

- **Reflection Engine:** Stable
- **Spin Model:** Calibrated (TIP_TO_DELTA_DEG: **5 / 10 / 13 / 18** — 3·4팁 과보정 완화)
- **Input System:** Fixed (tipCount direct, joystick → tip equivalent)
- **Anchor System:** Editable (더블클릭 + 좌표 입력, anchorsOverride)
- **Calibration Tool:** Ready (anchor 직접 수정으로 미세 보정)
- **Data Export Structure:** In Design (ADMIN → JSON → USER)

## 주요 변경 (누적)

1. HP/T: r 제거 → tipCount 직접 사용
2. TIP_TO_DELTA_DEG: **5 / 10 / 13 / 18** (3·4팁 1차 튜닝)
3. Joystick: SPIN_TO_TIP_EQUIV 보간
4. Anchor: anchorsOverride, 직접 편집, localStorage

------------------------------------------------------------

# Known critical issues (2026-03)

⚠ 아래는 **문서화된 가설·관측**이며, 코드가 완전히 안정화되었다는 뜻이 아니다.

### 1. SYS apply rollback

- SYS 적용 직후 한동안 궤적·값이 보였다가 **이전 값으로 되돌아가는** 현상이 보고됨.

### 2. Trajectory flicker

- 궤적이 **잠깐 보였다 사라지는** 플리커.

### 3. S1 SAVE 후 궤적 소실

- S1에서 SAVE 이후 **궤적이 사라지는** 현상.

### 4. Slot desync

- **S1:** 궤적 없음 / 이상 동작.
- **S2/S3:** 이전 슬롯·stale `sys` 값이 남는 **불일치**.

### Trajectory / render timing

- **최종 계산 완료 시점**과 **렌더가 읽는 상태**의 조건이 어긋나 partial state로 그리거나, 직후 다른 effect가 덮어쓰는 경우가 의심됨.

### Root cause hypothesis

- **`adminState` ↔ slot (`draft`/`applied`) ↔ render** 파이프라인에서 상태 소스·타이밍이 충돌 (merge 규칙·`useEffect` 순서·SAVE 이후 스냅샷 등).

→ 의도 아키텍처는 `3_SYSTEM_ARCHITECTURE.md` Slot Architecture / `2_FRONTEND_ARCHITECTURE_BASELINE_v1.md` State Separation 참고. **현재 구현은 불안정할 수 있음.**
