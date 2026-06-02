# 3Cushion AI - Project Master Index

Version: 1.0  
Last Updated: 2026-05-27  
Role: **현재 프로젝트 상태 SSOT** (월별 로그 아님)

> 기능이 완료·변경될 때마다 이 문서만 갱신한다.  
> 상세 이력은 `HISTORY/PROJECT_LOG_YYYY-MM.md`에 둔다.

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

## 코드 SSOT 맵 (AI·USER 패널)

| 역할 | 파일 |
|------|------|
| 자동 코멘트 모델 | `frontend/src/domain/aiAutoCommentViewModel.ts` |
| USER 패널 모델 | `frontend/src/domain/userInfoPanelModel.ts` |
| USER AI UI | `frontend/src/components/user/UserAiPanel.jsx` |
| USER HP/T UI | `frontend/src/components/user/UserHptPanel.jsx` (기존 재사용) |
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
| `1_PROJECT_MASTER_INDEX.md` | 구 헌법·폴더 SSOT (2026-03, 별도 유지) |
| `5_PROJECT_MASTER_STATE_CURRENT.md` | 코드 스냅샷 통제 문서 |
| `3_SYSTEM_ARCHITECTURE.md` | 계산·데이터 계층 |
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
