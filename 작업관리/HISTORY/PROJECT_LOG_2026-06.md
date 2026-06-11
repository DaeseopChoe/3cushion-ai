# PROJECT LOG – 2026-06

Version: v1.0  
Created: 2026-06-02  
Scope: AI 코멘트 SSOT · USER AI 패널 · SYSTEM_LESSON P0 · 문서 SSOT  

이전 월 로그: `PROJECT_LOG_2026-05.md`  
현재 상태 SSOT: `../PROJECT_MASTER_INDEX.md`

---

## 1. 세션 개요

2026-06(본 세션) 작업은 **AI 코멘트 데이터·표시 분리**, **USER AI 오버레이 가독성**, **AI→HP/T 오버레이 스택**, **프로젝트 문서 SSOT 정리**를 중심으로 진행했다.

주제별 요약:

- **AI 코멘트**: `ai.text` / `summaryText` / `onePointLessons` 혼재 → SYS+STR 자동 생성 SSOT + 원 포인트 레슨 분리
- **USER UI**: 모바일 읽기 전용 패널(글자·폭·간격·스크롤), `[두께/타점 보기]` CTA 및 터치 hit area
- **Overlay**: `overlayContent` + `userOverlayChild` 스택 (AI 유지 + HP/T)
- **문서**: `PROJECT_MASTER_INDEX.md` 신규·병합, `1_PROJECT_MASTER_INDEX.md` ARCHIVE

**범위 제외:** 2026-05 궤적·Recall canonical·SYS 교육형 UI 등 (5월 로그 참고).

---

## 2. AI 코멘트 시스템 리팩토링

### 2.1 문제 (Before)

- `ai.text`, `summaryText`, `onePointLessons`가 한 흐름에 섞여 ADMIN/USER 표시·저장 경계가 불명확
- 레거시 `buildPlayStrategy()`가 SYS/HP/T/STR 나열형 요약 생성

### 2.2 목표 구조 (After)

| 영역 | 내용 | 데이터/코드 |
|------|------|-------------|
| **자동 생성** | 시스템명, 샷명, `[기본 공식]`, 보정, STR | `buildAiAutoCommentModel`, `composeAiAutoComment` |
| **원 포인트 레슨** | 관리자 입력만 | `adminState.ai.onePointLessons` (구조 유지) |

**자동 생성 입력:** corrected/base SYS values, `slotRenderSys.corrections`, STR (`depth`, `speed`, `acceleration`).  
**제외:** HP/T, 타격강도, narrative fallback.

**사용자 공식 (엔진 식 미노출):** `1쿠션값 = 출발값 - 3쿠션값`

### 2.3 SSOT 파일

| 역할 | 경로 |
|------|------|
| ViewModel | `frontend/src/domain/aiAutoCommentViewModel.ts` |
| USER/ADMIN 모델 | `frontend/src/domain/userInfoPanelModel.ts` (`buildUserInfoPanel`, `collectOnePointLessonTexts`) |
| UI 공통 | `frontend/src/components/user/UserAiPanel.jsx` (`AiAutoCommentDisplay`, `AiOnePointLessonsBlock`) |
| ADMIN | `frontend/src/App.jsx` — `AiOverlay` (인라인), `ensureLessonItems` |
| Deprecated | `utils/aiPlayStrategyBuilder.ts` — `buildPlayStrategy()` |

### 2.4 ADMIN 동작

- 자동 생성 미리보기: `buildAiAutoCommentFromContext` (SYS+STR)
- 원 포인트 레슨: DnD 목록, 적용/저장, **전체 적용** 시 `text: ""`, `onePointLessons`만 slot에 반영
- 상단 라벨 `자동 생성 (SYS · STR)` 제거

### 2.5 USER 동작

- `buildUserInfoPanel` + `aiLessonSources: [draft.ai, applied.ai, admin.ai]`로 레슨 문장 병합 (슬롯 ai가 비어 있어도 admin 레슨 표시)
- `onePointLessons` 저장 스키마 **변경 없음**

### 2.6 출력 형식 (표시)

```
{intro}

[기본 공식]  1쿠션값 = 출발값 - 3쿠션값

{correction}

{str}

────────────────
[원 포인트 레슨]

{lesson lines}
```

- 문단 사이 `\n\n` (플레인) / USER는 `<p>` + `margin-top` (과도한 margin 지양)
- 글머리 `-` 제거, 일반 문장

---

## 3. USER AI 패널 UI 개선

### 3.1 레이아웃·가독성

| 항목 | 변경 |
|------|------|
| 상단 제목 | `model.title`(예: 뒤돌리기 대회전) **제거** — intro와 중복 |
| 기본 공식 | `[기본 공식]` + 공식 **한 줄** (`display: inline` on formula line) |
| 문단 간격 | `line-height` 축소, `margin-top: ~0.85em` |
| 패널 폭 | `min(80vw, 1400px)` (공간 최적화 단계에서 조정 이력 있음) |
| 높이 | `height: auto`, `max-height: 72vh`, 내용 많을 때만 스크롤 |
| 글자 (USER only) | 본문 **32px**, 섹션 제목 **40px**, `line-height: 1.3~1.75` |
| ADMIN | `.admin-ai-overlay` **14px 유지** |

**스타일:** `frontend/src/index.css` — `.modal-panel--user-ai`, `.user-ai-panel__*`

### 3.2 버그 수정 (표시)

- `[원 포인트 레슨]` 제목이 본문 정규화 실패 시 블록 전체 미표시 → **레슨 배열 있으면 제목 항상 표시**
- 레슨 본문: `collectOnePointLessonTexts` + `normalizeLessonText` (앞 공백·`-` 제거)

---

## 4. AI 패널 → HP/T 연동 (오버레이 스택)

### 4.1 요구

- AI 패널 하단 **「두께/타점 보기」** — 새 HP/T 컴포넌트 금지, 좌측 **HP/T**와 동일 동작
- 스택: `당구대 → AI → (선택) HP/T`
- HP/T backdrop만 닫기 → **AI 유지**
- AI/당구대 backdrop → 전체 닫기
- 좌측 다른 메뉴 → 스택 초기화 후 해당 메뉴

### 4.2 State

| State | 의미 |
|-------|------|
| `overlayContent` | USER 주 오버레이 (`"AI"`, `"HPT"`, …) |
| `userOverlayChild` | AI 위 자식 (`"HPT"`) |

### 4.3 핵심 함수

| 함수 | 역할 |
|------|------|
| `handleOpenHptFromAiPanel` | `onUserFuncButtonSelect("HP/T")` |
| `handleCloseUserOverlayChild` | HP/T만 닫기, `currentButtonId` → `"AI"` |
| `handleCloseUserInfoOverlay` | USER 오버레이 전체 닫기 |

`currentButtonId === "HP/T"` 이고 `overlayContent === "AI"` 이면 **replace 없이** `userOverlayChild = "HPT"`.

### 4.4 렌더

- 주 `ModalShell`: `UserAiPanel` / 단독 `UserHptPanel`
- 보조 `ModalShell` (`fixed`, `zIndex: 55`): `overlayContent==="AI" && userOverlayChild==="HPT"` → 동일 `UserHptPanel` + `userHptModel`

**연동:** `Stage.jsx` — `onUserFuncButtonSelect={setCurrentButtonId}`

---

## 5. [두께/타점 보기] 버튼 UX

| 단계 | 내용 |
|------|------|
| 1 | 폭 확대, `white-space: nowrap`, CTA `#374151` / `#FFFFFF` |
| 2 | 세로 padding 축소 (공간 절약) |
| 3 | 모바일: 시각 높이 ~64–78px, `::before` hit slop 상하 ±20px (터치 ~118px), `touch-action: manipulation` |

**클래스:** `.user-ai-panel__footer`, `.user-ai-panel__hpt-btn`

---

## 6. 프로젝트 문서 (본 세션)

| 작업 | 결과 |
|------|------|
| `PROJECT_MASTER_INDEX.md` v1.0 | 현재 상태 SSOT 신규 |
| v1.1 병합 | 아키텍처 불변 규칙·전역 SSOT 맵·문서 계층 |
| `1_PROJECT_MASTER_INDEX.md` | `ARCHIVE/` 이동 + 루트 스텁 DEPRECATED |

**신규 대화 첫 참고:** `작업관리/PROJECT_MASTER_INDEX.md`

---

## 7. 최종 USER AI 패널 구성 (현재)

1. 자동 생성 intro (시스템·샷 요약)
2. `[기본 공식]` + 사용자 공식 한 줄
3. 보정 설명 (있을 때)
4. STR 설명 (있을 때)
5. 구분선 + `[원 포인트 레슨]` + 관리자 레슨 문장(들)
6. ~~`[두께/타점 보기]` → HP/T 스택~~ → **제거** (시스템 레슨 독립 메뉴로 대체, §12)

---

## 8. 변경 금지 (본 세션 준수)

- SYS / STR **계산 엔진** 로직
- `composeAiAutoComment` **문장 생성 규칙** (표시·CSS 위주 변경)
- `onePointLessons` **저장 구조**
- ADMIN HP/T·SYS **입력 UI** (크기·레이아웃)

---

## 9. 다음 예정 작업

### P0 — 시스템 레슨 (**완료**, §12·§13, 커밋 `ffe0a26`)

- 독립 메뉴 `SYSTEM_LESSON`, USER HP/T·AI CTA·`userOverlayChild` 스택 제거
- `userSystemLessonViewModel` + `UserSystemLessonPanel` (5½, SYS SSOT 재사용)
- 표 기반 UI·모바일 가로·대형 폰트·내부 스크롤·90% 폭 (§13)

### P1 — 시스템 레슨 확장

- 비 5½ 시스템 교육 블록
- ADMIN `SysOverlay` 교육 라인과 domain 공통화

### P2 — 학습 흐름·데이터

- AI → 원 포인트 레슨 → 시스템 레슨 → 실전 공략 (내비·콘텐츠, **오버레이 스택 없음**)
- Dataset / slot / lesson JSON, SAVE·Recall

---

## 10. 세션 인계 체크리스트

- [x] USER: 좌측 **시스템레슨** → 표 기반 2섹션·4쿠션 중간식 (5½)
- [x] USER: AI 패널에 HP/T CTA **없음**
- [x] 가로모드·대형 폰트·내부 스크롤·90% 폭 (§13)
- [ ] ADMIN: HP/T 메뉴·편집 유지
- [ ] `PROJECT_MASTER_INDEX.md` §시스템 레슨·§USER Overlay 참고

---

## 11. 관련 파일 (빠른 참조)

```
frontend/src/domain/aiAutoCommentViewModel.ts
frontend/src/domain/userInfoPanelModel.ts
frontend/src/domain/userSystemLessonViewModel.ts
frontend/src/components/user/UserAiPanel.jsx
frontend/src/components/user/UserSystemLessonPanel.jsx
frontend/src/App.jsx
frontend/src/components/Stage.jsx
frontend/src/index.css
작업관리/PROJECT_MASTER_INDEX.md
```

---

## 12. USER 시스템 레슨 (P0 구현)

### 12.1 메뉴

| Before | After |
|--------|-------|
| AI · 두께/타점 · 기준값 · History | AI · 기준값 · **시스템 레슨** · History |

- `Stage.jsx`: `USER_FUNC_IDS`, `USER_FUNC_BUTTONS` — `SYSTEM_LESSON` / 라벨 `시스템 레슨`
- USER `HP/T` 제거; ADMIN `HP/T` 유지

### 12.2 오버레이

- `overlayContent === "SYSTEM_LESSON"` — **독립** `ModalShell`
- `userOverlayChild` · AI CTA · 이중 HP/T Modal **삭제**
- 패널: `UserSystemLessonPanel` + `buildUserSystemLessonViewModel`

### 12.3 데이터 (엔진 무변경)

- `resolvedSlotBaseSysValues` — 포지션 기준·4쿠션(예: 16)
- `resolvedSlotSysValues` — 보정 반영·4쿠션(예: 25.5)
- `slotRenderSys.corrections` — 밀림/끌림/기울기/스핀 표시

### 12.4 UI (초기 P0 — §13에서 최종 확정)

- 초기: 2열 카드형 → **폐기**
- 이후: 표 기반·세로 2섹션·모바일 튜닝 (§13)

---

## 13. SYSTEM_LESSON UI 최종 확정

**커밋:** `ffe0a26` — `feat(user): add SYSTEM_LESSON overlay and remove USER HP/T`

### 13.1 초기 버전 문제

- 텍스트 블록 중심 레이아웃 (AI 패널 스타일 재사용)
- 모바일 **시인성 부족** — 글자·줄 간격이 작음
- 스마트폰 가로모드에서 **읽기 어려움**
- 정보 **밀도 과다** — 한눈에 계산 흐름 파악 어려움

### 13.2 최종 결정

- **표(Table) 기반 구조** 채택 — 행 라벨(회색 `th`) + 데이터 셀
- **글자 크기 확대** — 본문 ~38px, 제목 ~44px, 표·footnote 동일 가독성 기준
- **당구대 내부 크기에 맞춘 오버레이** — 폭 **90%** (점진 튜닝: 76% → 81% → 90%)
- **내부 스크롤 허용** — `modal-panel-body` 세로 스크롤, 터치 `pan-y`
- **모바일 가로모드 기준 최적화** — landscape 미디어쿼리·표 padding·섹션 간격

### 13.3 최종 UX (아키텍처)

| 항목 | 상태 |
|------|------|
| 독립 메뉴 | `SYSTEM_LESSON` / 라벨 **시스템레슨** |
| AI와 분리 | AI `overlayContent`와 무관 |
| HP/T 제거 | USER 좌측 메뉴·스택·`UserHptPanel` 경로 제거 |
| CTA 제거 | `UserAiPanel` `[두께/타점 보기]` 없음 |
| 오버레이 스택 제거 | `userOverlayChild`·이중 HP/T `ModalShell` 삭제 |

### 13.4 최종 패널 구조

**[포지션 기준 계산]**

| 행 | 내용 |
|----|------|
| 시스템 공식 | `출발값 - 3쿠션값 = 1쿠션값` (1행) |
| 포지션 기준값 | `출발(30)` · `3쿠션(26)` · `1쿠션(4)` — **3칸 균등** |
| 4쿠션 계산 | 식 · `26-10=16` · `4쿠션값 : 16` (3칸, inner table·비균등 폭) |

설명 (파란 bullet): 출발값 보정 50 기준·frame/rail 안내

**[보정치 반영 계산]** (보정 있을 때)

| 행 | 내용 |
|----|------|
| 보정치 | 밀림 · 끌림 · 기울기 · 스핀 (4칸) |
| 출발값 보정 | `출발+밀림=출발값` 등 한 줄 |
| 3쿠션 보정 | `출발값+기울기-1쿠션=3쿠션값` 한 줄 |
| 4쿠션 계산 | 식 · 계산 · 결과 3칸 (`colSpan` 2 + calc + result) |

설명: 밀림·끌림→출발값, 기울기·스핀→3쿠션 / 4=5=6쿠션 동일

### 13.5 비고

- **SYSTEM_LESSON P0 범위 = 완료** (구현·UI 확정·`ffe0a26` push)
- P1: 비 5½ 시스템·ADMIN/USER 교육 라인 domain 공통화

---

## 14. Dataset Architecture — Phase 1 완료

**일자:** 2026-06-05  
**이관 문서:** `../SESSION_TRANSFER/SESSION_TRANSFER_2026-06_DATASET_ARCHITECTURE.md`

### 14.1 배경

- Recall·Search가 모두 `positions_dataset`(working)을 사용해 역할 혼재  
- Export가 WorkspaceSnapshot 형태로 작업 데이터와 published 데이터가 분리되지 않음  

### 14.2 데이터 계층 (목표)

| 계층 | SSOT | 용도 |
|------|------|------|
| Working | `positions_dataset` | ADMIN 작업 · ADMIN Search |
| History | `workspace_history` | 작업 이력 |
| Published | `dataset/{공략}/{시스템}/positions.json` | ADMIN Recall · USER Search (목표) |

### 14.3 Phase 1 완료 항목

- Dataset Export envelope (`schemaVersion: 2`, `records: PositionRecord[]`)  
- 경로 SSOT: `dataset/{공략명}/{시스템명}/positions.json` (`datasetPath.ts`)  
- 변환·필터: `buildDatasetExport`, `filterRecordsForDatasetExport` (`datasetExport.ts`)  
- History Export → `handleExportSnapshots` / `saveDatasetExportToFile` (`useSettings.js`)  
- 폴더 자동 생성 · Export picker user activation 수정  

### 14.4 Export 동작 (분석 확정)

- 선택 스냅샷 1건 → `snapshot.state.dataset`(SAVE 시점 전체 working dataset embed) → `systemId` + `shotType` 필터 → `records[]` 저장  
- **Position 1건 Export 아님** — Dataset Export  
- 테스트·레거시 데이터가 필터 조건에 맞으면 함께 export될 수 있음  

### 14.5 미완료 (후속 Phase)

| Phase | 내용 |
|-------|------|
| 2 | Published Dataset Loader · ADMIN Recall 전환 |
| 3 | USER Search → Published Dataset |
| 4 | Spatial Index (8×4 grid, `spatialCells`) |

Search / Recall / Reset 최종 UX 정의(Reset = 세션 종료, 공·SYS·궤적 유지)는 문서화만 완료, 코드 전환은 Phase 2 이후.

---

## 부록 A. Git 커밋 요약 (본 세션)

| 날짜 | 커밋 | 요약 |
|------|------|------|
| 2026-05-27 | `9a024b5` | `docs: add PROJECT_MASTER_INDEX as current-state SSOT` |
| 2026-05-27 | `6b055a8` | `docs: merge architecture into PROJECT_MASTER_INDEX, archive legacy constitution` |
| 2026-06 | `438a856` | `feat(user-ai): AI panel lesson flow and HP/T overlay stack` (이후 HP/T USER 경로 제거됨) |
| 2026-06 | `582a451` | `docs: add PROJECT_LOG_2026-06 and link in PROJECT_MASTER_INDEX` |
| 2026-06 | **`ffe0a26`** | **`feat(user): add SYSTEM_LESSON overlay and remove USER HP/T`** — P0 완료 |

---

*End of PROJECT_LOG_2026-06*
