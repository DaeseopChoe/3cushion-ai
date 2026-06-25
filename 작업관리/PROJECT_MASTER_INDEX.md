# 3Cushion AI - Project Master Index

Version: 1.10  
Last Updated: 2026-06-22  
Role: **현재 프로젝트 상태 SSOT** (월별 로그 아님)

> 기능이 완료·변경될 때마다 이 문서만 갱신한다.  
> 상세 이력은 `HISTORY/PROJECT_LOG_YYYY-MM.md`에 둔다.  
> **폴더·파이프라인 구조 변경** 시 `5_PROJECT_MASTER_STATE_CURRENT.md` 전면 재작성.

---

## 문서 계층 (읽는 순서)

### 신규 세션 온보딩 (Dataset Architecture 포함 시)

1. **`PROJECT_MASTER_INDEX.md`** (본 문서) — 현재 기능·UI·완료/예정 SSOT  
2. **`HISTORY/PROJECT_LOG_2026-06.md`** — 2026-06 월별 이력 (§14 Phase 1 · §15 Phase 2~3-1 · §16 운영 검증 조사 · §17 OPEN-05 조사 · §18 OPEN-04 Caption Engine · §19 USER Overlay · §20 Trajectory Display Cap)  
3. **`SESSION_TRANSFER/SESSION_TRANSFER_2026-06_DATASET_ARCHITECTURE.md`** — Dataset Architecture 전용 이관 문서  

### 전체 문서 계층

| 문서 | 역할 |
|------|------|
| **본 문서 (`PROJECT_MASTER_INDEX.md`)** | 현재 기능·UI·완료/예정 SSOT |
| `HISTORY/PROJECT_LOG_YYYY-MM.md` | 월별 작업 이력 |
| `SESSION_TRANSFER/SESSION_TRANSFER_2026-06_DATASET_ARCHITECTURE.md` | Dataset Architecture 설계·Phase 1 Export·후속 Phase |
| `3_SYSTEM_ARCHITECTURE.md` | 계산·데이터 계층 상세 |
| `4_CALCULATION_RULES.md` | 수식·보정 규칙 |
| `5_PROJECT_MASTER_STATE_CURRENT.md` | 폴더/파이프라인 **구조 변경 시** 전면 재작성 통제 |
| `ARCHIVE/1_PROJECT_MASTER_INDEX.md` | 2026-03 헌법 스냅샷 (**deprecated**) |

---

## 프로젝트 개요

### 프로젝트 목적

국제식 3쿠션 **시스템·공략을 데이터화**하고, 관리자가 입력·저장한 포지션을 **Recall/Search**로 불러와 **테이블·궤적·코칭 UI**로 검증·학습하는 분석 전용 앱.

### 현재 개발 단계

| 영역 | 상태 |
|------|------|
| ADMIN | Position Lock → SYS / HP·T / STR / AI 입력 → Dataset SAVE |
| USER | Search(published) → 공략 슬롯 표시 → **읽기 전용** AI·**시스템 레슨** 오버레이 |
| 궤적 | Hermite Segment A + 보정선 기반 baseline (2026-05 안정화) |
| AI 코멘트 | SYS+STR 자동 문장 SSOT + 원 포인트 레슨 분리 **완료** |
| 시스템 레슨 | **P0 완료** (5½ · 독립 메뉴 · 표 기반 UI · 모바일 가로 UX 확정 · `ffe0a26`) |
| **Dataset Architecture** | **Phase 1~3-1 완료** — Export · Published Loader · USER/ADMIN Recall·Search SSOT |

### 핵심 설계 원칙

1. **계산 엔진 vs 표시 레이어 분리** — Recall/SYS/STR/궤적 엔진은 USER 표시 작업에서 변경 금지.
2. **슬롯 SSOT** — `draft` / `applied`, `slotRenderSys`, `buildSlotRuntimePayload` 기준 hydrate.
3. **Canonical SAVE** — `sysInputs` + `corrections` persist, effective strip (2026-05 PR 2a–2d).
4. **오버레이 이중 트랙** — ADMIN: `overlayState` + `ModalShell`(편집). USER: `overlayContent` + read-only 패널.
5. **AI 텍스트** — 자동 생성(SYS+STR)과 `onePointLessons`(관리자 수동) **완전 분리**.

---

## 기술 스택

- Frontend: React (Vite), TypeScript + JSX
- 시스템 정의: `frontend/src/data/systems/*` (profile / anchors / logic / system_meta)
- 시스템 등록: `import.meta.glob("./*/profile.json")` — profile만 있으면 자동 등록
- Admin SYS 식: `admin/sys/useSysCalculation.ts` (anchors 비의존 expr)
- App SYS·궤적: `utils/systemCalculator.ts`, `utils/trajectorySampleBuilder.ts`, `utils/trajectory/curveTrajectory.ts`

---

## 아키텍처 불변 규칙 (변경 시 로그·MASTER_STATE 갱신 필수)

1. **값 vs 좌표** — `profile.formula.expr`는 SYS **숫자**; 테이블 **CO/C1/C3 좌표**는 `anchors.json` + `anchorLookupEngine` / `anchorCoordinateEngine` SSOT.
2. **valueSpace (Fg / Rg)** — lookup은 `coord` + `valueSpace`. Fg는 프레임·방향점, Rg는 레일 맞춤. Fg에 무조건 `snapToRail` 적용 금지.
3. **Draft / Applied** — Draft는 실시간·미저장; **Applied만** SAVE/궤적 기준. USER 표시는 slot hydrate SSOT.
4. **전략 혼합 금지** — `signature = systemId + formulaHash + shotType`; 동일 signature 내에서만 search/merge.
5. **Recall** — 저장 `sysInputs` 기준; draft에 `outputs.result` 없으면 `buildDraftsFromRecord` 등에서 expr 재실행해 result 채움.
6. **표기** — UI/데이터는 C1, C3, CO_f … (`1C`, `3C` 역표기 금지).
7. **저장** — Working: localStorage `positions_dataset`; Published: `dataset/{공략}/{시스템}/positions.json`. **ADMIN 로컬DB** → working; **ADMIN Search · USER Search** → published (동일 Published Search).

### 계산 3계층 (파일 기준)

| 계층 | 파일 | 역할 |
|------|------|------|
| Strategy | `hooks/useShotSlots.ts` | Draft/Applied, SAVE, Recall draft 적용 |
| Trajectory | `hooks/useTrajectoryState.ts` | IDLE → ADJUSTING → APPLIED, SYS 결과 UI 반영 |
| Physics·궤적 | `utils/physics/*`, `utils/trajectory/curveTrajectory.ts` | Impact, Hermite segment, cushion path |

### ADMIN SYS 입력 → 렌더 (요약)

```
SysOverlay 입력 → draft.sys → applyDraftSys → applied.sys
  → useTrajectoryState.applySysResult → Physics → Stage/ImpactLines
```

---

## 데이터 드리븐 시스템 (요약)

`frontend/src/data/systems/<system_name>/`

| 파일 | 역할 |
|------|------|
| `profile.json` | formula.expr, value_domains, safety |
| `anchors.json` | 좌표 SSOT (보간 기준점) |
| `logic.json` | 조건·특수 보정 |
| `system_meta.json` | 메타 |

상세: `3_SYSTEM_ARCHITECTURE.md`.

---

## Dataset Architecture

**상태:** Phase 1~3-1 완료 · **UI 용어 (OPEN-02C~E, 2026-06):** ADMIN **로컬DB** = Local Dataset Search (`positions_dataset`); ADMIN **Search** = USER **Search** = Published Search (`dataset/{공략}/{시스템}/positions.json`). UI에서 Recall 라벨 제거 · published Search active state `isAdminPublishedSearchMatched` · CSS `.published-search-btn`. 내부 handler명(`handlePositionRecall` 등)·profile ID·trace는 2차 정리 예정.  
**이관 문서:** `SESSION_TRANSFER/SESSION_TRANSFER_2026-06_DATASET_ARCHITECTURE.md`  
**월별 로그:** `HISTORY/PROJECT_LOG_2026-06.md` §14 (Phase 1) · §15 (Phase 2~3-1)

### 데이터 3계층

| 계층 | SSOT | 용도 | 현재 소비자 |
|------|------|------|-------------|
| **Working Dataset** | `positions_dataset` (localStorage) | ADMIN 작업·누적 | **ADMIN 로컬DB** (UI; profile `adminSearch`) |
| **Workspace History** | `workspace_history` (localStorage) | SAVE 스냅샷·작업 이력 | History UI (Load / Delete / Export) |
| **Published Dataset** | `dataset/{공략}/{시스템}/positions.json` | 배포·사용자 검색 | **ADMIN Search**, **USER Search** (profile `adminStrict` / `userStrict`) |

### Dataset Export (Phase 1 — 완료)

- History Export 버튼 → `handleExportSnapshots` → `saveDatasetExportToFile`
- 경로: `dataset/{공략명}/{시스템명}/positions.json` (폴더 자동 생성)
- Envelope: `schemaVersion: 2`, `records: PositionRecord[]`
- 코드 SSOT: `domain/datasetExport.ts`, `domain/datasetPath.ts`, `hooks/useSettings.js`
- Export 단위: 선택 스냅샷의 `state.dataset` → `systemId` + `shotType` 필터 (Position 1건이 아닌 **Dataset Export**)

### Published Dataset Loader (Phase 2 — 완료)

- `getOrLoadPublishedLeaf(shotType, systemId)` — lazy load + in-memory cache
- URL SSOT: `domain/datasetPath.ts` → `/dataset/{공략}/{시스템}/positions.json`
- **ADMIN Search** (UI; 우측 패널) → published corpus (`handlePositionRecall`, profile `adminStrict`)
- Published leaf URL fallback: 빈 `shotType("")` → `"뒤돌리기"` (`domain/publishedLeafResolve.ts`)

### USER Search (Phase 3 — 완료)

- **USER Search** → published corpus only (`handleUserSearchStrategies`, profile **`userStrict`**)
- USER UI: **Search 버튼만** (Search/Recall 토글 제거)
- 공략 S1/S2/S3: **USER Search 성공 시에만** 활성 (`recommendedFrom` gate)
- **ADMIN→USER carry-over 제거**: 전환 시 draft/`recommendedFrom` 초기화 — F5 직후 USER와 동일 상태

### Recall profile 분리 (Phase 3-1 — 완료)

| Profile | coarsePerBall | totalL1Cap | 용도 |
|---------|---------------|------------|------|
| **userStrict** | 2 | 6 | USER Search · ADMIN Search (published; permutation, coarse 필수) |
| **adminSearch** | 5 | 15 | ADMIN **로컬DB** (UI) — local `positions_dataset` |
| **adminStrict** | 6 | null | ADMIN **Search** (UI; published) · legacy `runPositionRecall` |

### Search / 로컬DB / Reset (현재 UI 용어)

| UI 기능 | 데이터 | Profile | 상태 |
|---------|--------|---------|------|
| ADMIN **로컬DB** (Stage rail) | `positions_dataset` | `adminSearch` | ✅ |
| ADMIN **Search** (우측 패널) | Published Dataset | `adminStrict` | ✅ |
| USER **Search** | Published Dataset | `userStrict` | ✅ |
| Reset | 세션 종료 (공·SYS·궤적 유지) | — | 정의만 — 코드 미반영 |

### 예정

| Phase | 내용 |
|-------|------|
| **4** | **Spatial Index** — 8×4 grid, `spatialCells` (cue / target / second), Recall 1차 필터 |
| **5** | **trajectory 기반 파생 데이터 생성** — 별도 세션 이관 예정 |

---

## 완료된 주요 기능

### SYS

- **시스템 엔진**: `data/systems/*` (profile / anchors / logic), `systemCalculator`, `useSysCalculation`(admin).
- **보정 구조**: `slide`, `draw`, `curve_ratio`, `spin`, `departure` — shotType 부호 연동(5&Half).
- **SYS Overlay**: 메인 렌더는 **`App.jsx` 내 인라인 `SysOverlay`** (교육형 UI). `admin/sys/SysOverlay.tsx`는 메인 트리 미사용.
- **Render SSOT**: `slotRenderSys`, `resolvedSlotSysValues` / `resolvedSlotBaseSysValues`.
- **USER 기준값**: 3-Level 토글(보정 / 기준 / 비교), `ImpactLines` dual path.

### Caption Engine (OPEN-04 — 완료)

**OPEN-04 Caption Placement Engine 전면 재설계 완료.**

기존 value 기반 탐색·mark별 예외 처리·track별 하드코딩 배치를 제거하였다.  
캡션 배치는 숫자 배열 자체를 기준으로 계산하는 **순수 Geometry 기반 엔진**으로 통합하였다.

**배치 우선순위:**

1. A Space — 첫 숫자 이전 공간
2. B Space — 마지막 숫자 이후 공간
3. Internal Max Gap — 내부 최대 빈 간격

동률 시 외부 공간(A/B)을 우선 선택한다.

**배치 원칙:**

캡션은 항상 `숫자 + 2grid + 캡션` 또는 `캡션 + 2grid + 숫자` 형태를 유지한다.  
캡션 자체를 공간 중앙에 두는 것이 아니라 **숫자와의 관계를 기준**으로 배치한다.

**최종 결과:**

| Mark | 결과 |
|------|------|
| 1쿠션 | 90 이후 외부 공간 우선 |
| 3쿠션 | 90 이전 외부 공간 우선 |
| 4쿠션 측면 | 자체 bucket 기준 계산 (alignC4SideCaptionsToCo 제거) |
| 5쿠션 | 90 이후 외부 공간 우선 |
| 6쿠션 | 20 이전 외부 공간 우선 |
| 출발값 | 코너 앵커 인접 side bucket 포함 → 50~60 공간 사용 |

**코드 SSOT:**

- `domain/systemAxisCaption.ts` — `findBestAlongSequential()`
- `components/table/SystemValueLabels.jsx` — `pushGroup()` CO 코너 bucket 이중 배정

---

### HP/T

- **두께/타점 Overlay**: **ADMIN 전용** 편집 (`HptOverlay`, `overlayState` HPT).
- **관리자 입력**: `adminState.hpt`, slot `draft`/`applied` 동기화.
- **USER HP/T read-only 오버레이** (2026-06-22): 좌측 **두께/타점** 메뉴 복구 · `UserHptPanel` + `userHptViewModel` · `.modal-panel--user-hpt`
  - **Overlay Scale Framework**: `--overlay-scale` (tablet 0.72 · phone landscape 0.44), `--overlay-svg-scale` (SVG 별도 축소)
  - 반투명 패널 `rgba(255,255,255,0.72)` + `backdrop-filter: blur(2px)` · 내부 viz/grid 박스 투명 · `width: fit-content`

### 시스템 레슨 (System Lesson)

**최종 확정 (아키텍처)**

- **USER 전용 독립 메뉴** — `SYSTEM_LESSON` (`Stage.jsx` 라벨: **시스템레슨**)
- **AI 패널과 완전 분리** — AI 오버레이·코칭 흐름과 무관
- **USER HP/T 메뉴 제거** — ADMIN HP/T 편집은 유지
- **AI 패널 CTA 없음** — `[두께/타점 보기]` / 시스템 레슨 진입 버튼 없음
- **`userOverlayChild` 스택 없음** — 이중 `ModalShell` HP/T 스택 삭제
- **`overlayContent === "SYSTEM_LESSON"`** — 단일 read-only 오버레이만 사용

**최종 확정 (UI · UX)**

- **표(Table) 기반 교육 UI** — 텍스트 나열형 카드 폐기, 학습용 계산표 구조
- **모바일 가로모드 우선** — landscape 기준 레이아웃·폰트·간격 튜닝
- **대형 폰트** — 스마트폰 확대 없이 읽을 수 있는 본문·표 셀 크기 (AI 패널과 별도 스케일)
- **오버레이 내부 스크롤** — `.modal-panel-body` `overflow-y: auto`, 터치 스크롤
- **당구대 영역 내부 표시** — 패널 폭 **90%** (부모 영역 기준), 프레임 밖 이탈 방지
- **2개 섹션 (세로 스택)** — `[포지션 기준 계산]` · `[보정치 반영 계산]`
- **4쿠션 중간 계산식** — 식 · 계산 · 결과 3칸 (포지션 4쿠션 행은 내용량 비균등 inner table)
- **파란 설명문** — 본문과 **동일 font-size** (`1em`), disc bullet(검정), 50 기준 설명 1줄 병합(UI)

**데이터·코드 (P0)**

- **데이터**: `buildSlotEffectiveRenderSysValues` → `resolvedSlotBaseSysValues` / `resolvedSlotSysValues` (계산 엔진 추가 없음)
- **ViewModel**: `domain/userSystemLessonViewModel.ts`
- **UI**: `components/user/UserSystemLessonPanel.jsx`, `.modal-panel--user-system-lesson` (`index.css`)
- **P0 시스템**: 파이브 앤드 하프 (`useSn`) 우선; 그 외 `systemId`는 empty 안내

### STR

- **속도·깊이·가속 패턴**: slot `str`, AI 자동 문장에 depth/speed/acceleration 반영.
- **STR Overlay**: ADMIN `App.jsx` 인라인 UI.

### AI

- **자동 생성 SSOT**: `domain/aiAutoCommentViewModel.ts` — `buildAiAutoCommentModel`, `composeAiAutoComment`.
  - SYS 보정 전/후, STR만 포함 (**HP/T·타격강도 제외**).
  - 사용자 공식: `1쿠션값 = 출발값 - 3쿠션값`.
- **표시 형식**: `[기본 공식]` 한 줄, 문단 `\n\n`, `[원 포인트 레슨]` 분리.
- **원 포인트 레슨**: `adminState.ai.onePointLessons` — 저장 구조 유지, USER는 `collectOnePointLessonTexts`로 draft/applied/admin 병합 표시.
- **ADMIN UI**: `App.jsx` `AiOverlay` — 자동 미리보기 + 레슨 DnD + 전체 적용(`text: ""`, 레슨만 slot 반영).
- **USER AI 패널**: `components/user/UserAiPanel.jsx` + `domain/userInfoPanelModel.ts` (`buildUserInfoPanel`).
  - 본문 32px / 제목 40px, 패널 `min(80vw, 1400px)`, `max-height: 72vh`.
  - 상단 공략 제목 중복 제거, 공간 최적화.
  - **반응형 스케일**: `--ai-scale` (tablet 0.72 · phone landscape 0.44) — SYSTEM_LESSON 등과 동일 계수, 변수명만 분리 (통합 Phase 2 **보류**)
- **Deprecated**: `utils/aiPlayStrategyBuilder.ts` `buildPlayStrategy()` — SYS/HP/T/STR 나열형.

### USER 동선분석 (Trajectory Info Card)

- **메뉴**: `TRAJECTORY` · 라벨 **동선분석** (`Stage.jsx`)
- **표시**: 테이블 영역 중앙 고정 overlay — `UserTrajectoryInfoCard` (ModalShell 밖, `App.jsx` table-area 자식)
- **탭**: `[기준값]` / `[보정값]` — baseline vs corrected 계산값 전환
- **본문 구조** (2026-06-22 확정):
  - ~~`기준 계산값` / `보정 계산값` 제목~~ **제거** (탭과 중복)
  - **`[공식]`** · **`[계산]`** 섹션 헤더 — accent `#38bdf8`, `font-weight: 700`, 블록 배치
  - 계산값 줄(`출발값 = 30` 등) — 흰색 본문 스타일 유지
- **스타일**: 패널 **완전 투명** (`background: transparent`, border/shadow 없음) · 탭만 자체 배경
- **가독성**: 본문 26px · 라벨 24px · `--overlay-text-shadow` · `--overlay-scale` (tablet 0.72 · phone landscape 0.44)
- **ViewModel**: `domain/userTrajectoryCardViewModel.ts` — 5½ 우선; `title` 필드는 VM에 잔존, UI 미표시
- **Trajectory Display Cap** (2026-06-22): `domain/trajectoryPathDisplayPolicy.ts` — baseline/corrected **독립** path depth
  - `endIndex = min(sameRailCap, secondBallCap, chainBreakCap)`
  - 연속 segment `(node[i]→node[i+1])` 양 끝 **동일 rail** → 해당 segment부터 path·label **미표시** (CO–C3–C6 비연속 동일 rail은 허용)
  - rail 판정: `reflectionEngine.detectRail` · 코너 degenerate: `distance < 0.75` Rg
  - `ImpactLines` / `SystemValueLabels` — cap된 path·`visibleKeysForLabels` 공유 (`App.jsx`)
  - **계산 엔진·C5/C6 sync 무변경** (표시 레이어만)
- **코드**: `components/user/UserTrajectoryInfoCard.jsx`, `.user-trajectory-info-card` (`index.css`)

### USER 시스템값 라벨 (System Value Labels)

- **메뉴**: `SYSTEM_VALUES` · 라벨 **시스템값** — 테이블 rail C0/C1/C3/C4/C5/C6 캡션·값 표시
- **Phone Landscape 확대**: `MEDIA_PHONE_LANDSCAPE` → `labelScale` **1.5** (`SYS_LABEL_PHONE_LANDSCAPE_SCALE`, `tableConfig.ts`)
- **터치 Persistent Selection** (2026-06-22): 라벨 탭 → 선택 유지(1.8× 확대) · 다른 라벨 탭 → 전환 · 빈 테이블 영역 탭 → 해제 · document capture + transparent dismiss rect
- **Caption Engine 연동**: `systemAxisCaption.ts` — `labelScale` 비례 placement · `SystemValueLabels.jsx` · `LabelText.jsx`
- **버그 수정**: `App.jsx` — `sysLabelScale` hooks를 `loading`/`error` early return **이전**으로 이동 (React hooks 순서 오류 해결)

---

## 현재 UI 구조

### 관리자 (ADMIN)

| 버튼 | 오버레이 | 비고 |
|------|----------|------|
| **로컬DB** (Stage rail) | — | local `positions_dataset` · profile `adminSearch` |
| **Search** (우측 패널) | — | published · profile `adminStrict` (= USER Search와 동일 corpus) |
| S1/S2/S3 | — | slot 전환, hydrate |
| SYS | `overlayState` SYS | 편집·Apply |
| HP/T | HPT | 편집 |
| STR | STR | 편집 |
| AI | AI | 자동 코멘트 + 원 포인트 레슨 + 전체 적용 |

### 사용자 (USER)

| 버튼 | 오버레이 | 비고 |
|------|----------|------|
| Search | — | published · profile `userStrict` · 버튼 라벨 **Search** (Recall 토글 없음) |
| 공략 버튼 | — | `userTableDisplaySlotId` · **USER Search 성공 시에만** 활성 (`recommendedFrom`) |
| AI | `overlayContent === "AI"` | `UserAiPanel` · `--ai-scale` |
| 동선분석 | table-area overlay | `UserTrajectoryInfoCard` · 기준/보정 탭 · `[공식]`/`[계산]` |
| 시스템값 | 테이블 rail 라벨 | `SystemValueLabels` · phone landscape 1.5× · 터치 선택 |
| 기준값 | 패널 dismiss | 오버레이만 닫기, 3-Level 토글 |
| 시스템레슨 | `overlayContent === "SYSTEM_LESSON"` | `UserSystemLessonPanel` (독립·표·스크롤) · `--overlay-scale` |
| 두께/타점 | `overlayContent === "HP/T"` | `UserHptPanel` read-only · `--overlay-scale` + `--overlay-svg-scale` |
| History | 모달 | |

---

## 핵심 코드 SSOT 맵 (전역)

| 영역 | 파일 |
|------|------|
| Orchestrator | `frontend/src/App.jsx`, `components/Stage.jsx`, `components/common/ModalShell.jsx` |
| 슬롯·SAVE | `hooks/useShotSlots.ts`, `domain/canonicalStrategy.ts`, `domain/adminSaveEngine.ts`, `domain/positionMergeEngine.ts` |
| Recall·Search | `domain/positionSearchEngine.ts`, `domain/positionRecallEngine.ts`, `domain/recall/recallEngine.ts`, `domain/recall/recallProfiles.ts`, `domain/recall/recallCompare.ts` |
| Published Dataset | `domain/publishedDatasetStore.ts`, `domain/datasetLoader.ts`, `domain/publishedLeafResolve.ts`, `domain/datasetPath.ts` |
| Dataset Export | `domain/datasetExport.ts`, `domain/datasetPath.ts`, `hooks/useSettings.js` (`handleExportSnapshots`) |
| Workspace History | `domain/workspaceHistory.ts`, `hooks/useSettings.js` (`commitWorkspaceHistoryWithStrategyDataset`) |
| Slot hydrate | `domain/slotRuntimeHydrate.ts` |
| Render SYS | `domain/slotSysResolve.ts` (App: `slotRenderSys`, effective values) |
| 궤적 | `utils/trajectory/curveTrajectory.ts`, `hooks/useTrajectoryState.ts`, `components/table/ImpactLines.jsx` |
| Anchors | `domain/anchorLookupEngine.ts`, `domain/anchorCoordinateEngine.ts`, `domain/reflectionEngine.ts` |
| **Caption Engine** | `domain/systemAxisCaption.ts` (`findBestAlongSequential`), `components/table/SystemValueLabels.jsx` (`pushGroup`) |
| Admin SYS 식 | `admin/sys/useSysCalculation.ts` |
| App SYS·궤적 | `utils/systemCalculator.ts`, `utils/trajectorySampleBuilder.ts` |
| AI 자동 코멘트 | `domain/aiAutoCommentViewModel.ts` |
| USER 패널 | `domain/userInfoPanelModel.ts`, `components/user/UserAiPanel.jsx` |
| USER 시스템 레슨 | `domain/userSystemLessonViewModel.ts`, `components/user/UserSystemLessonPanel.jsx` |
| USER HP/T | `components/user/UserHptPanel.jsx`, `domain/userHptViewModel.ts`, `.modal-panel--user-hpt` |
| USER 동선분석 | `components/user/UserTrajectoryInfoCard.jsx`, `domain/userTrajectoryCardViewModel.ts`, `domain/trajectoryPathDisplayPolicy.ts`, `.user-trajectory-info-card` |
| USER 시스템값 라벨 | `components/table/SystemValueLabels.jsx`, `components/table/LabelText.jsx`, `config/tableConfig.ts` |
| Overlay 반응형 CSS | `frontend/src/index.css` — `--overlay-scale`, `--ai-scale`, `--overlay-svg-scale` |

---

## 코드 SSOT 맵 (AI·USER 오버레이)

| 역할 | 파일 |
|------|------|
| 자동 코멘트 모델 | `frontend/src/domain/aiAutoCommentViewModel.ts` |
| USER 패널 모델 | `frontend/src/domain/userInfoPanelModel.ts` |
| USER AI UI | `frontend/src/components/user/UserAiPanel.jsx` |
| USER 시스템 레슨 UI | `frontend/src/components/user/UserSystemLessonPanel.jsx` |
| USER 시스템 레슨 VM | `frontend/src/domain/userSystemLessonViewModel.ts` |
| USER 동선분석 UI | `frontend/src/components/user/UserTrajectoryInfoCard.jsx` |
| USER 동선분석 VM | `frontend/src/domain/userTrajectoryCardViewModel.ts` |
| USER HP/T UI | `frontend/src/components/user/UserHptPanel.jsx` |
| USER 시스템값 라벨 | `frontend/src/components/table/SystemValueLabels.jsx` |
| USER 오버레이 | `frontend/src/App.jsx` (`overlayContent`: AI · SYSTEM_LESSON · HP/T; table-area: Trajectory card) |
| Stage 버튼 연동 | `frontend/src/components/Stage.jsx` (`USER_FUNC_IDS`, `onUserFuncButtonSelect`) |
| ADMIN AI | `frontend/src/App.jsx` `AiOverlay` |
| 스타일 | `frontend/src/index.css` (`.modal-panel--user-ai`, `.modal-panel--user-system-lesson`, `.user-trajectory-info-card`, `.modal-panel--user-hpt`) |

---

## 현재 완료 상태

### 완료

- AI 오버레이 리팩토링 (SYS+STR SSOT, 레슨 분리)
- 원 포인트 레슨 ADMIN/USER 표시 분리
- USER AI 패널 가독성·크기·공간 최적화
- USER **시스템 레슨** P0 구현·커밋 (`ffe0a26`: 독립 메뉴, HP/T 제거, ViewModel·Panel)
- **SYSTEM_LESSON 모바일 UI 최적화 완료** (가로모드·대형 폰트·간격·90% 폭)
- **SYSTEM_LESSON Table Layout 확정** (표 기반·2섹션·4쿠션 3칸)
- **SYSTEM_LESSON Overlay UX 확정** (단일 오버레이·내부 스크롤·AI/CTA/스택 없음)
- USER HP/T 메뉴·AI CTA·`userOverlayChild` 스택 **제거**
- Slot runtime / Recall canonical (2026-05 PHASE 2)
- Modal draggable + viewport clamp
- Hermite 궤적 baseline, anchors SSOT·canonical persist (2026-05)
- **Dataset Architecture Phase 1** — Dataset Export, `dataset/{공략}/{시스템}/positions.json`, envelope `schemaVersion: 2`
- **Dataset Architecture Phase 2** — Published Dataset Loader, ADMIN Search (published) → published corpus, published leaf URL fallback (`publishedLeafResolve`)
- **Dataset Architecture Phase 3** — USER Search → published, Search/Recall 토글 제거, carry-over 제거
- **Dataset Architecture Phase 3-1** — Recall profile 분리 (`userStrict` / `adminSearch` / `adminStrict`)
- **OPEN-04 Caption Placement Engine** — Geometry 기반 엔진 전면 재설계 (A→B→Gap 순위, safetyMargin 2grid 고정, CO 코너 앵커 이중 bucket, `alignC4SideCaptionsToCo` 제거) — 전 트랙 검증 완료
- **USER Overlay Scale Framework (B-1)** — `--overlay-scale` / `--ai-scale` / `--overlay-svg-scale` · tablet 0.72 · phone landscape 0.44 (`index.css`)
- **USER HP/T read-only 오버레이** — 모바일 스케일·반투명 패널·SVG 축소 · `UserHptPanel`
- **USER System Value Labels** — phone landscape 1.5× · 터치 persistent selection · `App.jsx` hooks 순서 수정
- **USER 동선분석 Overlay** — 투명 패널 · 가독성(26px·shadow) · `[공식]`/`[계산]` 섹션 · 기준/보정 계산값 제목 제거
- **Trajectory Display Cap** — same-rail 연속 segment 차단 · baseline/corrected 독립 세컨드볼 cap · `trajectoryPathDisplayPolicy.ts`

### 진행 중

- 운영 검증 회귀 조사 — §Known Issues / Investigation (2026-06) · `HISTORY/PROJECT_LOG_2026-06.md` §16
- OPEN-05 ADMIN Recall / LocalDB Trajectory Rehydration — 조사 완료 · Known Issue 유지 · `HISTORY/PROJECT_LOG_2026-06.md` §17

### 예정

- **Overlay Scale Layer 통합 (Phase 2, 보류)** — `--ai-scale` → `--overlay-scale` 통일 · MQ 블록 4→1 축소 (기능 영향 없음, 유지보수용)
- **Dataset Architecture Phase 4** — Spatial Index (`spatialCells`, 8×4 grid)
- **trajectory 기반 파생 데이터 생성** — 별도 세션 이관 예정
- 시스템 레슨: sunrise/sunset 등 **비 5½** 시스템 확장
- 학습 흐름 확장: AI → 원 포인트 레슨 → 시스템 레슨 → 실전 공략 (내비만, 스택 없음)

---

## Known Issues / Investigation (2026-06)

**기록일:** 2026-06-13 (OPEN-05 갱신: 2026-06-18 · OPEN-04 종료: 2026-06-20 · OPEN-03 종료: 2026-06-22)  
**상세 조사:** `HISTORY/PROJECT_LOG_2026-06.md` §16 · §17 (OPEN-05) · §18 (OPEN-04) · §19 (USER Overlay)

### OPEN-01 USER Search 임팩트 방향 불일치

**상태:** 조사 중

**증상:**

- ADMIN **Search (published)**과 USER Search가 동일 record를 사용해도 임팩트 방향이 다르게 표시되는 사례 존재

**현재 가설:**

- `targetColor`(UI) · `draft.targetBall` · `record.targetBall` 동기화 시점 차이
- Search apply = draft only; hydrate = 공략 버튼 선택 시

**우선순위:** P0

### OPEN-02 신규 Export 데이터 Search 실패

**상태:** 조사 중

**증상:**

- 신규 export 후 ADMIN Search (published) 및 USER Search에서 조회되지 않는 사례 존재

**현재 가설:**

- Published Dataset Loader · profile (`userStrict` / `adminStrict`) · exact match 조건 · cache stale 중 하나

**우선순위:** P0

### OPEN-03 USER HP/T 버튼 소실

**상태:** **해결** (2026-06-22) — USER 좌측 **두께/타점** 메뉴·read-only `UserHptPanel` 복구

**이력:**

- 시스템레슨 메뉴 분리 시 USER HP/T **의도적 제거** (`ffe0a26`, §12)
- 운영 검증(§16)에서 버튼 소실 OPEN 등록
- 2026-06-22: `Stage.jsx` `HP/T` · `overlayContent === "HP/T"` · `.modal-panel--user-hpt` 스케일·UI 복구

**우선순위:** ~~P1~~ CLOSED

### OPEN-05 — ADMIN Recall / LocalDB Trajectory Rehydration Investigation

**상태:** 조사 완료 · Known Issue 유지

**배경:**

- Dataset Architecture 이후 운영 테스트 중 발견
- 새로고침 직후 LocalDB 클릭 시 과거 SYS/C1/C3/Trajectory가 표시되는 사례 확인
- Search 클릭 시 다른 trajectory가 표시되는 사례 확인

**조사 결과:**

1. **recommendedFrom fallback 경로는 제거됨** (OPEN-05A)
   - 과거 no-match fallback이 원인은 아님
   - `slot_draft_fallback` 관련 경로는 현재 원인 아님

2. **applied slot 오염 가설 기각** (OPEN-05B)
   - `applyPositionRecall()`은 applied를 쓰지 않음
   - recall 결과는 `slot.draft`에 기록
   - 새로고침 직후 applied는 null 상태
   - `resolveSlotSysForRender()`는 draft 우선 사용

3. **실제 재생성 경로 확인**
   - spatial match 성공 → `slot.draft` hydrate → `syncSlotRuntimeAdminAndTrajectory()` → trajectory 재생성

4. **OPEN-05C 안정화 작업**
   - 수행: mismatch gate 추가 · recall display draft 제거 강화 · clear 직후 trajectory reset 강화 · helper crash 수정 · `flushSync` 적용
   - 결과: no-match 시 alert 동작 · 백지화 오류 제거 · 일부 recall 경로 정리
   - **완전 해결 아님** — 아래 현상 잔존

**아직 확인되는 현상:**

- 새로고침 직후 LocalDB 클릭
- 특정 spatial match 상황

에서 과거 SYS/C1/C3/Trajectory가 표시되는 사례 존재

**현재 판단:**

- trajectory engine 오류로 확정되지 않음

**우선순위:** Known Issue (Low Priority)

**사유:**

- target 선택 시 정상
- SYS 입력 시 정상
- 일반 사용자 흐름 영향 낮음

**향후 조사 후보:**

- spatial match 자체
- hydrate chain
- `syncSlotRuntimeAdminAndTrajectory`
- trajectory label source
- localStorage corpus contamination
- render memo cache

**상세:** `HISTORY/PROJECT_LOG_2026-06.md` §17

---

## 다음 작업 우선순위

### P0 — 운영 검증 회귀 (OPEN-01 · OPEN-02)

- USER Search 임팩트 방향: `targetColor` ↔ `draft.targetBall` ↔ `record.targetBall` 동기화 흐름
- 신규 Export 후 Search 실패: Published Loader · recall profile · cache

### P0 — trajectory 기반 파생 데이터 생성

- 별도 세션 이관 예정 (interpolation·KD-Tree USER 적용·targetBall 가중은 범위 외)

### P1 — SYS SSOT 정리

- `targetColor` · `draft.targetBall` · `record.targetBall` · render SYS 우선순위 정합

### P1 — Dataset Architecture Phase 4

- Spatial Index (`spatialCells`, Recall 1차 필터)

### P2 — 시스템 레슨 확장

- `full_input` 및 기타 `systemId` 교육 블록
- SYS Overlay 교육 라인 로직 domain 공통 추출 (ADMIN·USER 중복 제거)

### P3 — 학습 내비

- 학습 흐름: AI → 원 포인트 레슨 → 시스템 레슨 → 실전 공략 (내비만)

### 보류 — OPEN-05 재조사

- 추가 추적 보류 · 우선순위 Low
- 필요 시 §17·본 절 Known Issues 참고 후 재개

---

## 참고 문서

| 문서 | 용도 |
|------|------|
| `SESSION_TRANSFER/SESSION_TRANSFER_2026-06_DATASET_ARCHITECTURE.md` | **Dataset Architecture** — 3계층·Export·Phase 계획·이관 SSOT |
| `HISTORY/PROJECT_LOG_2026-06.md` | 2026-06 AI · USER AI · 시스템 레슨 · Dataset Phase 1~3-1 (§14·§15) · **운영 검증 조사** (§16) · **OPEN-05 조사** (§17) · **USER Overlay** (§19) |
| `HISTORY/PROJECT_LOG_2026-05.md` | 2026-05 상세 작업 로그 |
| `HISTORY/PROJECT_LOG_2026-04.md` | 이전 월 |
| `HISTORY/HANDOFF_ADMIN_MODAL_TO_USER_DISPLAY_2026-05.md` | ADMIN→USER 표시 핸드오프 |
| `HISTORY/HANDOFF_USER_PHASE2_2026-05.md` | USER Phase 2 |
| `ARCHIVE/1_PROJECT_MASTER_INDEX.md` | 2026-03 헌법 스냅샷 (deprecated, 역사·계산 철학 참고) |
| `5_PROJECT_MASTER_STATE_CURRENT.md` | 코드 스냅샷·구조 변경 통제 |
| `3_SYSTEM_ARCHITECTURE.md` | 계산·데이터 계층 |
| `4_CALCULATION_RULES.md` | 수식·보정 규칙 |
| `SESSION_TRANSFER/APP_USER_SEARCH_FLOW.md` | USER Search 흐름 |

---

## USER Overlay (요약)

```
좌측 AI → overlayContent = "AI" → UserAiPanel (--ai-scale)

좌측 시스템레슨 → overlayContent = "SYSTEM_LESSON" → UserSystemLessonPanel (--overlay-scale)

좌측 두께/타점 → overlayContent = "HP/T" → UserHptPanel read-only (--overlay-scale + --overlay-svg-scale)

좌측 동선분석 → table-area UserTrajectoryInfoCard (기준값/보정값 탭 · [공식]/[계산])

좌측 시스템값 → SystemValueLabels on table rail (phone landscape labelScale 1.5×)

backdrop / handleCloseUserInfoOverlay → overlayContent = null

기준값(BASELINE) → 오버레이만 dismiss (레벨 유지)
```

---

## 갱신 규칙

- 월별 로그에만 적지 말고, **기능 완료 시 이 문서의 해당 절을 즉시 수정**.
- “완료 / 진행 / 예정”과 **코드 SSOT 맵**을 항상 일치시킨다.
- **폴더·계산 파이프라인 구조 변경** 시 `5_PROJECT_MASTER_STATE_CURRENT.md` 전면 재작성 후 본 문서 절 링크 점검.
