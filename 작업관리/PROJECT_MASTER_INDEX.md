# 3Cushion AI - Project Master Index

Version: 1.1  
Last Updated: 2026-05-27  
Role: **현재 프로젝트 상태 SSOT** (월별 로그 아님)

> 기능이 완료·변경될 때마다 이 문서만 갱신한다.  
> 상세 이력은 `HISTORY/PROJECT_LOG_YYYY-MM.md`에 둔다.  
> **폴더·파이프라인 구조 변경** 시 `5_PROJECT_MASTER_STATE_CURRENT.md` 전면 재작성.

---

## 문서 계층 (읽는 순서)

| 문서 | 역할 |
|------|------|
| **본 문서 (`PROJECT_MASTER_INDEX.md`)** | 현재 기능·UI·완료/예정 SSOT |
| `3_SYSTEM_ARCHITECTURE.md` | 계산·데이터 계층 상세 |
| `4_CALCULATION_RULES.md` | 수식·보정 규칙 |
| `5_PROJECT_MASTER_STATE_CURRENT.md` | 폴더/파이프라인 **구조 변경 시** 전면 재작성 통제 |
| `HISTORY/PROJECT_LOG_YYYY-MM.md` | 월별 작업 이력 |
| `ARCHIVE/1_PROJECT_MASTER_INDEX.md` | 2026-03 헌법 스냅샷 (**deprecated**) |

---

## 프로젝트 개요

### 프로젝트 목적

국제식 3쿠션 **시스템·공략을 데이터화**하고, 관리자가 입력·저장한 포지션을 **Recall/Search**로 불러와 **테이블·궤적·코칭 UI**로 검증·학습하는 분석 전용 앱.

### 현재 개발 단계

| 영역 | 상태 |
|------|------|
| ADMIN | Position Lock → SYS / HP·T / STR / AI 입력 → Dataset SAVE |
| USER | Search(Recall) → 공략 슬롯 표시 → **읽기 전용** AI·HP/T 오버레이 |
| 궤적 | Hermite Segment A + 보정선 기반 baseline (2026-05 안정화) |
| AI 코멘트 | SYS+STR 자동 문장 SSOT + 원 포인트 레슨 분리 **완료** |
| 시스템 학습 | **미구현** (설계·UI·데이터 예정) |

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
7. **저장** — runtime: localStorage `positions_dataset`; 운영 export(dataset.json)는 별도 경로.

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

## 완료된 주요 기능

### SYS

- **시스템 엔진**: `data/systems/*` (profile / anchors / logic), `systemCalculator`, `useSysCalculation`(admin).
- **보정 구조**: `slide`, `draw`, `curve_ratio`, `spin`, `departure` — shotType 부호 연동(5&Half).
- **SYS Overlay**: 메인 렌더는 **`App.jsx` 내 인라인 `SysOverlay`** (교육형 UI). `admin/sys/SysOverlay.tsx`는 메인 트리 미사용.
- **Render SSOT**: `slotRenderSys`, `resolvedSlotSysValues` / `resolvedSlotBaseSysValues`.
- **USER 기준값**: 3-Level 토글(보정 / 기준 / 비교), `ImpactLines` dual path.

### HP/T

- **두께/타점 Overlay**: ADMIN 편집 + USER `UserHptPanel` read-only.
- **관리자 입력**: `adminState.hpt`, slot `draft`/`applied` 동기화, `applyAiToSlot` 등 slot 액션.
- **USER 스택**: AI 오버레이 위에 **동일 `UserHptPanel`** 스택 (`userOverlayChild === "HPT"`).

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
- **두께/타점 보기 버튼**: `handleOpenHptFromAiPanel` → `onUserFuncButtonSelect("HP/T")` — 좌측 메뉴와 **동일 state/action**.
- **Overlay Stack**: `overlayContent` + `userOverlayChild`; HP/T backdrop만 닫으면 AI 유지 (`handleCloseUserOverlayChild`).
- **Deprecated**: `utils/aiPlayStrategyBuilder.ts` `buildPlayStrategy()` — SYS/HP/T/STR 나열형.

---

## 현재 UI 구조

### 관리자 (ADMIN)

| 버튼 | 오버레이 | 비고 |
|------|----------|------|
| Search / Reset | — | Recall·입력 세션 |
| S1/S2/S3 | — | slot 전환, hydrate |
| SYS | `overlayState` SYS | 편집·Apply |
| HP/T | HPT | 편집 |
| STR | STR | 편집 |
| AI | AI | 자동 코멘트 + 원 포인트 레슨 + 전체 적용 |

### 사용자 (USER)

| 버튼 | 오버레이 | 비고 |
|------|----------|------|
| Search | — | `userRelaxed` recall |
| 공략 버튼 | — | `userTableDisplaySlotId` |
| AI | `overlayContent === "AI"` | `UserAiPanel` |
| └ 두께/타점 보기 | `userOverlayChild === "HPT"` | `UserHptPanel` 스택 |
| HP/T (좌측) | 단독 HPT 또는 AI 위 스택 | `currentButtonId` effect |
| 기준값 | 패널 dismiss | 오버레이만 닫기 |
| History | 모달 | |

---

## 핵심 코드 SSOT 맵 (전역)

| 영역 | 파일 |
|------|------|
| Orchestrator | `frontend/src/App.jsx`, `components/Stage.jsx`, `components/common/ModalShell.jsx` |
| 슬롯·SAVE | `hooks/useShotSlots.ts`, `domain/canonicalStrategy.ts`, `domain/adminSaveEngine.ts`, `domain/positionMergeEngine.ts` |
| Recall·Search | `domain/positionSearchEngine.ts`, `domain/positionRecallEngine.ts`, `domain/recall/recallEngine.ts` |
| Slot hydrate | `domain/slotRuntimeHydrate.ts` |
| Render SYS | `domain/slotSysResolve.ts` (App: `slotRenderSys`, effective values) |
| 궤적 | `utils/trajectory/curveTrajectory.ts`, `hooks/useTrajectoryState.ts`, `components/table/ImpactLines.jsx` |
| Anchors | `domain/anchorLookupEngine.ts`, `domain/anchorCoordinateEngine.ts`, `domain/reflectionEngine.ts` |
| Admin SYS 식 | `admin/sys/useSysCalculation.ts` |
| App SYS·궤적 | `utils/systemCalculator.ts`, `utils/trajectorySampleBuilder.ts` |
| AI 자동 코멘트 | `domain/aiAutoCommentViewModel.ts` |
| USER 패널 | `domain/userInfoPanelModel.ts`, `components/user/UserAiPanel.jsx`, `components/user/UserHptPanel.jsx` |

---

## 코드 SSOT 맵 (AI·USER 오버레이)

| 역할 | 파일 |
|------|------|
| 자동 코멘트 모델 | `frontend/src/domain/aiAutoCommentViewModel.ts` |
| USER 패널 모델 | `frontend/src/domain/userInfoPanelModel.ts` |
| USER AI UI | `frontend/src/components/user/UserAiPanel.jsx` |
| USER HP/T UI | `frontend/src/components/user/UserHptPanel.jsx` |
| USER 오버레이·스택 | `frontend/src/App.jsx` (`overlayContent`, `userOverlayChild`, 이중 `ModalShell`) |
| Stage 버튼 연동 | `frontend/src/components/Stage.jsx` (`onUserFuncButtonSelect`) |
| ADMIN AI | `frontend/src/App.jsx` `AiOverlay` |
| 스타일 | `frontend/src/index.css` (`.modal-panel--user-ai`, `.user-ai-panel__hpt-btn`) |

---

## 현재 완료 상태

### 완료

- AI 오버레이 리팩토링 (SYS+STR SSOT, 레슨 분리)
- 원 포인트 레슨 ADMIN/USER 표시 분리
- USER AI 패널 가독성·크기·공간 최적화
- AI → HP/T 스택 연동 (기존 컴포넌트 재사용)
- Slot runtime / Recall canonical (2026-05 PHASE 2)
- Modal draggable + viewport clamp
- Hermite 궤적 baseline, anchors SSOT·canonical persist (2026-05)

### 진행 중

- **시스템 학습 (System Lesson)** — 코드베이스 미착수

### 예정

- **[두께/타점 보기]** → 시스템 학습 진입점 전환 (기능 교체, HP/T 직접 호출 대신)

---

## 다음 작업 우선순위

### P0 — 시스템 학습 구조 설계

- 진입점: AI 패널 하단 CTA (현재 HP/T 연동과의 관계 정의)
- ADMIN 입력 vs USER read-only 경계
- 기존 SYS 교육형 Overlay 문구와의 역할 분담

### P1 — 시스템 학습 UI

- USER 모달/오버레이 패턴 (`ModalShell`, 스택 규칙 재사용 여부)

### P2 — 시스템 학습 데이터 구조

- Dataset / slot / lesson JSON 스키마, SAVE·Recall 연동

---

## 참고 문서

| 문서 | 용도 |
|------|------|
| `HISTORY/PROJECT_LOG_2026-05.md` | 2026-05 상세 작업 로그 |
| `HISTORY/PROJECT_LOG_2026-04.md` | 이전 월 |
| `HISTORY/HANDOFF_ADMIN_MODAL_TO_USER_DISPLAY_2026-05.md` | ADMIN→USER 표시 핸드오프 |
| `HISTORY/HANDOFF_USER_PHASE2_2026-05.md` | USER Phase 2 |
| `ARCHIVE/1_PROJECT_MASTER_INDEX.md` | 2026-03 헌법 스냅샷 (deprecated, 역사·계산 철학 참고) |
| `5_PROJECT_MASTER_STATE_CURRENT.md` | 코드 스냅샷·구조 변경 통제 |
| `3_SYSTEM_ARCHITECTURE.md` | 계산·데이터 계층 |
| `4_CALCULATION_RULES.md` | 수식·보정 규칙 |
| `SESSION_TRANSFER/APP_USER_SEARCH_FLOW.md` | USER Search 흐름 |

`PROJECT_LOG_2026-06.md` — **아직 없음** (생성 시 이 표에 추가).

---

## USER Overlay Stack (요약)

```
[두께/타점 보기] 또는 좌측 HP/T (AI 열린 상태)
  → overlayContent = "AI", userOverlayChild = "HPT"

HP/T backdrop 클릭 → handleCloseUserOverlayChild → AI 유지

AI backdrop / handleCloseUserInfoOverlay → 전체 닫기

좌측 다른 메뉴 → child 초기화 + overlayContent 교체
```

---

## 갱신 규칙

- 월별 로그에만 적지 말고, **기능 완료 시 이 문서의 해당 절을 즉시 수정**.
- “완료 / 진행 / 예정”과 **코드 SSOT 맵**을 항상 일치시킨다.
- **폴더·계산 파이프라인 구조 변경** 시 `5_PROJECT_MASTER_STATE_CURRENT.md` 전면 재작성 후 본 문서 절 링크 점검.
