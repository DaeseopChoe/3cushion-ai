# PROJECT LOG – 2026-06

Version: v1.5  
Created: 2026-06-02  
Last Updated: 2026-06-22  
Scope: AI 코멘트 SSOT · USER AI 패널 · SYSTEM_LESSON P0 · Dataset Architecture Phase 2~3-1 · 운영 검증 회귀 조사 · OPEN-05 · OPEN-04 Caption · USER Overlay · Trajectory Display Cap  

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

### 14.5 후속 Phase (Phase 2~3-1는 §15 완료)

| Phase | 내용 | 상태 |
|-------|------|------|
| 2 | Published Dataset Loader · ADMIN Recall 전환 | ✅ §15 |
| 3 | USER Search → Published · carry-over 제거 · UI 정리 | ✅ §15 |
| 3-1 | Recall profile 분리 (`userStrict` / `adminSearch`) | ✅ §15 |
| 4 | Spatial Index (8×4 grid, `spatialCells`) | 예정 |

Search / Recall / Reset 최종 UX 정의(Reset = 세션 종료, 공·SYS·궤적 유지)는 문서화만 완료, Reset 코드는 미반영.

---

## 15. Dataset Architecture — Phase 2~3-1 완료

**일자:** 2026-06-11  
**이관 문서:** `../SESSION_TRANSFER/SESSION_TRANSFER_2026-06_DATASET_ARCHITECTURE.md`  
**현재 상태 SSOT:** `../PROJECT_MASTER_INDEX.md` §Dataset Architecture

### 15.1 Phase 2 — Published Dataset Loader · ADMIN Recall

| 항목 | 내용 |
|------|------|
| Loader | `domain/publishedDatasetStore.ts` — `getOrLoadPublishedLeaf`, in-memory cache |
| Fetch | `domain/datasetLoader.ts` — `fetchPublishedLeaf`, `buildPublishedLeafUrl` |
| Path SSOT | `domain/datasetPath.ts` — `dataset/{공략}/{시스템}/positions.json` |
| ADMIN Recall | `handlePositionRecall` → published corpus (local `positions_dataset` **미사용**) |
| URL fallback | `domain/publishedLeafResolve.ts` — 빈 `shotType("")` → `"뒤돌리기"` |
| 검증 | ADMIN Recall 수동 검증 통과 (published leaf load · match) |

### 15.2 Phase 3 — USER Search · UI · carry-over

| 항목 | 내용 |
|------|------|
| USER Search corpus | `handleUserSearchStrategies` → `getOrLoadPublishedLeaf` → published only |
| USER UI | Search 버튼만 유지 — **Search/Recall 토글 제거** (`userSearchButtonMode` 삭제) |
| 공략 gate | S1/S2/S3 — **USER Search 성공 시에만** `recommendedFrom` → 활성 |
| carry-over 제거 | ADMIN→USER 전환 시 `resetUserSearchSessionOnAdminExit` — draft/`userLastSearchRecord` 초기화 |
| 원칙 | USER는 local data·ADMIN draft에 접근하지 않음; F5 직후 USER와 동일 session state |

**소비자 최종 정리**

| 기능 | Corpus | Profile |
|------|--------|---------|
| ADMIN Search | `positions_dataset` | `adminSearch` (Phase 3-1) |
| ADMIN Recall | published | `adminStrict` |
| USER Search | published | `userStrict` (Phase 3-1) |

### 15.3 Phase 3-1 — Recall profile 분리

**SSOT:** `domain/recall/recallProfiles.ts`, `domain/recall/recallEngine.ts` (`requireCoarsePass`)

| Profile | coarsePerBall | totalL1Cap | permutation | coarse 필수 | fallback | 용도 |
|---------|---------------|------------|-------------|-------------|----------|------|
| **userStrict** | 2 | 6 | O | O | 없음 | USER Search |
| **adminSearch** | 5 | 15 | X | O | 없음 | ADMIN Search |
| **adminStrict** | 6 | null | X | O | 없음 | ADMIN Recall · legacy |
| userRelaxed | 10 | 18 | O | — | 있음 | **deprecated** |

**USER Search 목적:** “근사 추천”이 아닌 **현재 배치와 매우 유사한 포지션 검색** — published 1건에서도 과도한 match 방지.

### 15.4 자동 테스트

| Suite | 결과 |
|-------|------|
| `publishedLeafResolve.test.ts` | 6/6 pass |
| `datasetLoader.test.ts` | 6/6 pass |
| `strategyButtonModel.test.ts` | 8/8 pass |
| `recallEngine.parity.test.ts` | 19/19 pass |

### 15.5 수동 검증

| Case | 절차 | 결과 |
|------|------|------|
| 1 | 새로고침 → USER → Search (exact position) | **match**, 공략 활성 |
| 2 | 한 공 3grid 이상 이동 → USER Search | **no-match** (`userStrict` coarse) |
| 3 | ADMIN Search 근처 위치 | **match** (`adminSearch`) |

### 15.6 후속 (별도 세션 이관 예정)

- **trajectory 기반 파생 데이터 생성**
- interpolation 재설계
- KD-Tree USER Search 적용
- targetBall 가중치 재설계
- Dataset Architecture Phase 4 — Spatial Index (`spatialCells`, 8×4 grid)

### 15.7 관련 코드 (추가)

```
frontend/src/domain/publishedDatasetStore.ts
frontend/src/domain/datasetLoader.ts
frontend/src/domain/publishedLeafResolve.ts
frontend/src/domain/recall/recallProfiles.ts
frontend/src/domain/recall/recallEngine.ts
frontend/src/domain/recall/recallCompare.ts
frontend/src/App.jsx  (handleUserSearchStrategies, runAdminPositionRecall, handlePositionRecall)
frontend/src/components/Stage.jsx
```

---

## 16. USER Search / Published Dataset 회귀 조사 (2026-06)

**기록일:** 2026-06-13  
**범위:** Dataset Architecture Phase 2~3-1 완료 이후 운영 검증 · **코드 수정 없음** · 조사·문서화만

### 16.1 배경

Dataset Architecture Phase 2~3-1 완료 이후 실제 운영 테스트 중 다음 현상 발견.

1. USER Search 결과의 임팩트 방향이 ADMIN Recall과 다르게 표시되는 사례 발생
2. 신규 Export 데이터가 ADMIN Recall 및 USER Search에서 조회되지 않는 사례 발생
3. USER UI에서 HP/T(두께/타점) 버튼이 사라짐 → **2026-06-22 복구 완료** (§19.2 · OPEN-03 CLOSED)
4. 트랙(B2T_R 등) 변경 시 캡션 표시가 기존과 다르게 표시되는 사례 발생

### 16.2 조사 결과

#### USER Search 임팩트 방향

분석 결과:

- export / published 데이터 자체는 정상
- trajectory 계산 엔진 문제 증거 없음
- Search apply 이후 `targetColor`(UI SSOT)가 `record.targetBall`과 즉시 동기화되지 않는 **설계** 확인
- USER Search는 draft 생성만 수행 (`applyUserSearchRecall`)
- `hydrateSlotRuntime()`은 공략 버튼(S1/S2/S3) 선택 시에만 수행 (`pickStrategySlot`)
- ADMIN Recall은 UI target 선택 상태를 draft에 patch (`applyAdminRecallMatch` · `getAdminSearchTargetBall`)

정리:

임팩트 방향 반전은 trajectory 엔진보다는 **targetColor ↔ draft.targetBall 불일치** 가능성이 가장 유력.

참고: `HYDRATE_CHAIN.md`, `HANDOFF_USER_PHASE2_2026-05.md` §4 — Search 직후 explicit hydrate는 **의도적 미해결(STEP 2-3)** 이력.

**상태:** OPEN (미해결)

#### Published Dataset 검색 실패

현상:

- 신규 저장 → Export → `positions.json` 생성 확인
- 이후 ADMIN Recall 실패 · USER Search 실패 사례 확인

현재 상태:

- Export 파일 생성 자체는 정상
- Published Loader 동작 여부 추가 확인 필요
- `userStrict` / `adminStrict` profile 비교 필요
- exact match 조건 확인 필요
- in-memory cache stale 가능성 (`getOrLoadPublishedLeaf` · export 후 `force` 미호출) 조사 대상

**상태:** OPEN (원인 미확정)

#### USER HP/T 버튼 소실

현상:

- USER 좌측 메뉴에서 HP/T 버튼 사라짐
- 시스템레슨 메뉴 분리 이후 발생한 것으로 추정

**2026-06-22 갱신:** USER **두께/타점** 메뉴·read-only `UserHptPanel` 복구 — **OPEN-03 CLOSED** (§19.2)

**상태:** ~~OPEN~~ **CLOSED** (2026-06-22)

#### 캡션 표시 불일치

현상:

- 동일 데이터라도 트랙 변경 시 C1/C3/CO 캡션 위치 또는 값 표시가 달라지는 사례 확인

추정:

- 최근 Caption/UI 리팩터링 영향 가능성
- trajectory 계산 자체 문제 증거 없음

**상태:** OPEN

### 16.3 중요 결론

현재 발견된 문제들은 Dataset Architecture 설계 완료 이후 **운영 검증 단계**에서 발견됨.

아직 trajectory 엔진 오류로 확정된 사항 없음.

특히 USER Search 임팩트 방향 문제는 `targetColor` · `draft.targetBall` · `record.targetBall` 동기화 흐름을 **우선 조사 대상**으로 유지.

**SSOT 교차 참조:** `../PROJECT_MASTER_INDEX.md` §Known Issues / Investigation (2026-06)

---

## 17. OPEN-05 조사 및 안정화 작업 (2026-06)

**기록일:** 2026-06-18  
**범위:** ADMIN Recall · LocalDB · Published Search trajectory rehydration 조사 · OPEN-05C 안정화 · **완전 해결 아님**

### 배경

운영 테스트 중 다음 현상 발견:

- 새로고침 직후 LocalDB 클릭 시 과거 trajectory 표시
- Search 클릭 시 다른 trajectory 표시
- SYS 값(C1/C3/CO)이 현재 상태와 무관하게 나타나는 사례

### OPEN-05A

**조사 범위:**

- `syncSlotRuntimeAdminAndTrajectory`
- `hydrateSlotRuntime`
- `applyPositionRecall`
- `buildSlotRuntimePayload`
- `resolveSlotSysForRender`

**결론:**

- `recommendedFrom` fallback은 원인 아님 (OPEN-05 1차에서 제거 확인)
- `slot_draft_fallback` 관련 경로는 현재 원인 아님

### OPEN-05B

**조사 범위:**

- applied slot 경로
- `resolveSlotSysForRender` 우선순위
- `trajectoryResult` 생성 경로

**결론:**

- applied 오염설 기각
- recall 데이터는 `slot.draft` 기반
- 새로고침 직후 `applied`는 null
- `resolveSlotSysForRender()`는 draft 우선

### OPEN-05C

**수정:**

- mismatch gate 추가
- recall display draft 제거 강화 (`clearAdminSearchDisplaySlotDrafts` · `clearAdminSearchDisplayFromSlot`)
- clear 직후 trajectory reset 강화
- helper crash 수정 (`hasRenderableOutputsResult` import)
- `flushSync` 적용

**검증 (PASS):**

- no-match alert
- 화면 백지화 제거
- explicit target mismatch recall 차단

**미해결 (Known Issue 유지):**

- 새로고침 직후 · target 미선택 · LocalDB/Search 첫 호출에서 spatial match 시 과거 trajectory/SYS label 표시 사례 잔존

### 현재 상태

**Known Issue 유지**

**증상:**

- 새로고침 직후
- target 미선택
- LocalDB / Search 첫 호출

상황에서 과거 trajectory 또는 SYS label이 표시되는 사례 존재

### 최종 판단

- 원인 미확정
- trajectory engine 오류로 확정된 사항 없음

**후보:**

- spatial match
- hydrate chain
- trajectory 재생성 시점
- render cache
- memoized label source
- localStorage corpus contamination

**현재 우선순위:** Low

**프로젝트 영향:** 낮음

**실사용 영향:** 낮음 (target 선택·SYS 입력 시 정상)

### 후속 작업

- OPEN-05 추가 추적은 **보류** · 우선순위를 아래로 이동

**다음 작업:**

1. SYS SSOT 정리
2. ~~HP/T 버튼 복구 작업~~ — **완료** (§19.2, 2026-06-22)
3. 이후 OPEN-05 재조사 필요 시 재개

**SSOT 교차 참조:** `../PROJECT_MASTER_INDEX.md` §Known Issues / Investigation (2026-06) · OPEN-05

---

## 부록 A. Git 커밋 요약 (본 세션)

| 날짜 | 커밋 | 요약 |
|------|------|------|
| 2026-05-27 | `9a024b5` | `docs: add PROJECT_MASTER_INDEX as current-state SSOT` |
| 2026-05-27 | `6b055a8` | `docs: merge architecture into PROJECT_MASTER_INDEX, archive legacy constitution` |
| 2026-06 | `438a856` | `feat(user-ai): AI panel lesson flow and HP/T overlay stack` (이후 HP/T USER 경로 제거됨) |
| 2026-06 | `582a451` | `docs: add PROJECT_LOG_2026-06 and link in PROJECT_MASTER_INDEX` |
| 2026-06 | **`ffe0a26`** | **`feat(user): add SYSTEM_LESSON overlay and remove USER HP/T`** — P0 완료 |
| 2026-06-11 | — | `docs: update dataset recall and user search SSOT` — Phase 2~3-1 문서 반영 |

---

## 18. OPEN-04 Caption Placement Engine 완료

**날짜:** 2026-06-20  
**상태:** OPEN → **CLOSED**  
**조사 완료 · 설계 확정 · 구현 완료 · 검증 완료**

---

### 배경

운영 검증 과정에서 트랙 변경 시 Caption 위치가 기존 의도와 다르게 표시되는 현상 발견.

초기 조사 결과 다음 구조가 혼재되어 있었음:

- value 기반 탐색 (`findFirstByValue`, `findLastByValue`, `computeCoDepartureAlong`)
- mark별 switch 분기 및 track별 예외 처리
- `denseGridStep` 기반 safetyMargin 계산
- `alignC4SideCaptionsToCo()` 후처리 강제 덮어쓰기

---

### 문제점

**문제 1 — 출발값(CO): 50~60 대신 60~70 공간에 표시**

원인: CO 코너 앵커 `(−2.25, −2.25)` value=50이 bottom bucket에만 포함됨.  
left/right bucket이 이 점을 알 수 없어 50~60 공간이 외부 공간 판단에 활용되지 않음.

**문제 2 — 1쿠션: 40~50 내부 공간에 배치**

원인: A/B 공간 비교식에서 aWidth/bWidth 산정 시 `safetyMargin`이 차감되어 외부 공간이 과소평가됨.  
내부 Gap은 `halfNum`만 차감하여 비교 비대칭 발생.

**문제 3 — 4쿠션 측면: CO 위치로 강제 정렬**

원인: `alignC4SideCaptionsToCo()` 후처리가 OPEN-04 엔진 결과를 무조건 덮어씀.

**문제 4 — 5쿠션/6쿠션: 숫자와 캡션 간격 과도**

원인: `safetyMargin = denseGridStep × GRID_GAP_MULTIPLIER` 계산.  
실제 2grid(20px)보다 5배 이상 크게 산출됨.

---

### 설계 원칙 확정

**배치 우선순위:**

1. A Space — 첫 숫자 이전 공간
2. B Space — 마지막 숫자 이후 공간
3. Internal Max Gap — 내부 최대 빈 간격

동률 시 외부 공간(A/B) 우선 (`>=`).

**배치 원칙:**

```
숫자 + 2grid + 캡션
또는
캡션 + 2grid + 숫자
```

**비교 규칙:** raw width 기준 (safetyMargin 미포함).  
**배치 좌표:** safetyMargin 적용 (aEnd / bStart 기준).  
**safetyMargin:** `GRID_GAP_MULTIPLIER × scalePx` = 2grid (20px).  
`denseGridStep` 기반 계산 **금지**.

---

### 구현

**제거:**

| 항목 | 사유 |
|------|------|
| `computeExplicitAlong()` | value 기반 탐색 — track 의존 |
| `findFirstByValue()` | 동상 |
| `findLastByValue()` | 동상 |
| `maxValuePoint()` | 동상 |
| `betweenAlong()` | 동상 |
| `computeCoDepartureAlong()` | CO 하드코딩 |
| `alignC4SideCaptionsToCo()` | 후처리 강제 덮어쓰기 |
| `CAPTION_TOP_C4_OFFSET_PX` | 하드코딩 오프셋 |
| `CAPTION_C6_OFFSET_PX` | 동상 |

**추가:**

- `findBestAlongSequential()` — A→B→Gap 순서 Geometry 엔진
- `CAPTION_ESTIMATED_WIDTH_PX`, `HALF_NUMBER_WIDTH_PX` — 폭 상수

**수정 1 — safetyMargin:**

```typescript
// 수정 전 (오류): denseGridStep 기반 (100~200px)
const safetyMargin = denseGridStep(sorted, side) * GRID_GAP_MULTIPLIER;

// 수정 후 (확정): tableBounds 기반 실제 2grid (20px)
const tableSpan  = isH ? tableBounds.maxX - tableBounds.minX : tableBounds.maxY - tableBounds.minY;
const tableUnits = isH ? 80 : 40;
const scalePx    = tableSpan / tableUnits;
const safetyMargin = GRID_GAP_MULTIPLIER * scalePx;
```

**수정 2 — 비교식 대칭화 + `>=`:**

```typescript
// 비교용 폭 (safetyMargin 미포함 — Gap과 대칭)
const aWidthCompare = firstAlong - halfNum - boundsMin;
const bWidthCompare = boundsMax - (lastAlong + halfNum);

// 배치 좌표 (safetyMargin 적용)
const aEnd   = firstAlong - halfNum - safetyMargin;
const bStart = lastAlong  + halfNum + safetyMargin;

if (aWidthCompare >= maxGapFree) { along = aEnd - captionW / 2; }
else if (bWidthCompare >= maxGapFree) { along = bStart + captionW / 2; }
else { along = (bestGapLeft + bestGapRight) / 2; }
```

**수정 3 — CO 코너 앵커 이중 bucket (`SystemValueLabels.jsx` `pushGroup`):**

```javascript
// CO 코너 앵커: bottom/top bucket 외 인접 left/right bucket에도 추가
if (label === "CO") {
  const atLeft   = Math.abs(x - (-2.25)) < 0.01;
  const atRight  = Math.abs(x - 82.25)   < 0.01;
  const atTop    = Math.abs(y - 42.25)   < 0.01;
  const atBottom = Math.abs(y - (-2.25)) < 0.01;
  if ((atLeft || atRight) && (atTop || atBottom)) {
    const sideBucketKey = `${atLeft ? "left" : "right"}:CO`;
    captionBuckets.get(sideBucketKey)?.points.push(point) ??
      captionBuckets.set(sideBucketKey, { label, points: [point] });
  }
}
```

---

### 최종 검증 결과

전 트랙 (B2T_L · B2T_R · T2B_L · T2B_R) 검증 완료.

| Mark | 배치 결과 |
|------|----------|
| 1쿠션 | 90 이후 외부 공간 (B Space) |
| 3쿠션 | 90 이전 외부 공간 (A Space) |
| 4쿠션 측면 | 90 이후/이전 외부 공간 (자체 bucket 기준, CO 강제 정렬 제거) |
| 5쿠션 | 90 이후 외부 공간 (B Space) |
| 6쿠션 | 20 이전 외부 공간 (A Space) |
| 출발값 | 50~60 공간 (코너 앵커 left/right bucket 포함으로 활성화) |

---

### 코드 SSOT

| 파일 | 변경 내용 |
|------|----------|
| `domain/systemAxisCaption.ts` | `findBestAlongSequential()` 신규, 비교식 분리, safetyMargin 수정, `alignC4SideCaptionsToCo` 삭제 |
| `components/table/SystemValueLabels.jsx` | `pushGroup()` CO 코너 앵커 이중 bucket 배정 |

**Build 검증:** `npm run build` exit 0 확인.

---

### 상태

**OPEN-04 종료 — CLOSED**

**SSOT 교차 참조:** `../PROJECT_MASTER_INDEX.md` §Caption Engine (OPEN-04) · §완료 목록

---

## 19. USER Overlay 반응형 · 동선분석 · 시스템값 라벨 (2026-06-22)

**일자:** 2026-06-22  
**범위:** USER read-only overlay 모바일 스케일 통합 · HP/T 복구 · System Value Labels · Trajectory Info Card UI  
**계산 엔진:** 변경 없음 (표시·CSS·터치 UX만)

### 19.1 USER Overlay Scale Framework (B-1)

**목표:** PC / tablet / phone landscape에서 USER overlay 가독성 유지 — 패널별 `calc(토큰 × scale)` 패턴.

| 변수 | 적용 대상 | 기본 | tablet (≤1199px) | phone landscape (≤520px height) |
|------|-----------|------|------------------|----------------------------------|
| `--ai-scale` | `.modal-panel--user-ai` | 1 | 0.72 | 0.44 |
| `--overlay-scale` | SYSTEM_LESSON · TRAJECTORY card · HP/T panel | 1 | 0.72 | 0.44 |
| `--overlay-svg-scale` | HP/T SVG viz only | 1 | 0.72 | ~0.58 |

**SSOT:** `frontend/src/index.css` — 각 패널 루트에서 토큰 정의 + 미디어쿼리에서 `--*-scale`만 덮어씀.

**보류 (Phase 2):** `--ai-scale` → `--overlay-scale` rename · MQ 블록 4→1 통합 — 기능 영향 없음, 유지보수용. 당장 필수 아님.

### 19.2 USER HP/T read-only 오버레이

**배경:** §12·§13에서 USER HP/T 의도적 제거 → §16 OPEN-03 등록 → 본 세션 복구.

| 항목 | 내용 |
|------|------|
| 메뉴 | `Stage.jsx` — `HP/T` · 라벨 **두께/타점** |
| 오버레이 | `overlayContent === "HP/T"` → `UserHptPanel` + `.modal-panel--user-hpt` |
| 스케일 | `--overlay-scale` + `--overlay-svg-scale` |
| 패널 | `width: fit-content` · `rgba(255,255,255,0.72)` + `backdrop-filter: blur(2px)` |
| 내부 | viz/grid 박스 배경·테두리 제거 (텍스트·SVG 중심) |

**OPEN-03:** CLOSED (2026-06-22)

### 19.3 System Value Labels — Phone Landscape · Persistent Selection

**메뉴:** `SYSTEM_VALUES` · 라벨 **시스템값**

| 항목 | 내용 |
|------|------|
| Phone landscape 확대 | `tableConfig.ts` — `MEDIA_PHONE_LANDSCAPE`, `SYS_LABEL_PHONE_LANDSCAPE_SCALE = 1.5` |
| App 연동 | `App.jsx` — `sysLabelScale` state + `matchMedia` listener → `SystemValueLabels labelScale` |
| Persistent selection | 탭한 라벨 1.8× 유지 · 다른 라벨 탭 전환 · 빈 테이블 영역 탭 해제 · document capture dismiss |
| Caption placement | `systemAxisCaption.ts` — `buildCaptionLayoutScale(labelScale)` 비례 |

**버그 수정 — React hooks 순서:**

- **증상:** `Rendered more hooks than during the previous render`
- **원인:** `useState`/`useEffect`(`sysLabelScale`)가 `if (loading)` early return **이후** 배치
- **수정:** hooks를 early return **이전**으로 이동 (`App.jsx` ~L6353)

### 19.4 USER 동선분석 (Trajectory Info Card)

**메뉴:** `TRAJECTORY` · 라벨 **동선분석**  
**표시:** ModalShell 밖 — `App.jsx` table-area 중앙 `UserTrajectoryInfoCard`

#### Phase A — 투명도·가독성·스케일

| 항목 | 내용 |
|------|------|
| 패널 | `background: transparent`, `border: none`, `box-shadow: none` (탭만 자체 스타일) |
| 본문 | `width: fit-content`, `margin-inline: auto`, `text-align: left` |
| 타이포 | 본문 26px · 라벨 24px · `font-weight: 700` · `#ffffff` · `--overlay-text-shadow` |
| 스케일 | `--overlay-scale` — tablet 0.72 · phone landscape 0.44 · `max-height: 85vh` (landscape) |
| 미변경 | 탭 크기·위치 · `--overlay-tab` 32px 토큰 |

#### Phase B — 제목 구조 단순화 (2026-06-22)

**목표:** 탭 `[기준값]`/`[보정값]`과 중복되는 본문 제목 제거 · 섹션 구분 강화.

| Before | After |
|--------|-------|
| `기준 계산값` / `보정 계산값` (h3) | **렌더 제거** |
| `공식` · `계산` (인라인 라벨) | **`[공식]`** · **`[계산]`** (블록 헤더) |
| 라벨 흰색 | accent **`#38bdf8`** (탭 active border 계열) · `font-weight: 700` |
| 공식·계산값 한 줄 | 헤더 아래 별도 줄 — 공식 1줄 · 계산값 리스트 |

**ViewModel:** `userTrajectoryCardViewModel.ts`의 `title` 필드는 유지, UI에서만 미표시.

**변경 파일:**

- `components/user/UserTrajectoryInfoCard.jsx` — title h3 제거 · `[공식]`/`[계산]` 블록 구조
- `index.css` — `.user-trajectory-info-card__label`, `__formula-line` (신규), `__formula`, `__values`

**검증:**

| # | 항목 | 결과 |
|---|------|------|
| 1 | 기준값 — "기준 계산값" 미표시 | ✅ |
| 2 | 보정값 — "보정 계산값" 미표시 | ✅ |
| 3 | `[공식]`/`[계산]` 구분 | ✅ accent + block |
| 4–5 | PC · Phone Landscape | ✅ scale 토큰 유지 |
| 6 | `npm run build` | ✅ exit 0 |

### 19.5 관련 코드 (빠른 참조)

```
frontend/src/index.css                          (.modal-panel--user-ai/hpt, .user-trajectory-info-card, .modal-panel--user-system-lesson)
frontend/src/components/user/UserTrajectoryInfoCard.jsx
frontend/src/domain/userTrajectoryCardViewModel.ts
frontend/src/components/user/UserHptPanel.jsx
frontend/src/domain/userHptViewModel.ts
frontend/src/components/table/SystemValueLabels.jsx
frontend/src/components/table/LabelText.jsx
frontend/src/config/tableConfig.ts
frontend/src/App.jsx                              (sysLabelScale, overlayContent, UserTrajectoryInfoCard)
frontend/src/components/Stage.jsx                 (USER_FUNC_IDS: TRAJECTORY, SYSTEM_VALUES, HP/T)
```

### 19.6 SSOT 교차 참조

- `../PROJECT_MASTER_INDEX.md` — §USER 동선분석 · §USER 시스템값 라벨 · §HP/T · §USER Overlay · OPEN-03 CLOSED
- Overlay Scale Layer 통합 (Phase 2) — **예정·보류** (§19.1)

---

## 20. Trajectory Display Cap — same-rail segment 차단 (2026-06-22)

**일자:** 2026-06-22  
**범위:** USER 동선분석 baseline/corrected 궤적·라벨 표시 depth · **Display Layer only**  
**계산 엔진:** 변경 없음 (`buildSlotEffectiveRenderSysValues` · C5/C6 sync 유지)

### 20.1 배경

- baseline `pathNodesBase`가 있음에도 `pathEndIndexBase = pathEndIndex`(corrected 공유)로 corrected 세컨드볼 판정을 따름
- C4=C5=C16 등 동일 값 sync 시 C4→C5→C6 **동일 rail 연속 segment** → 비물리 궤적·역행 polyline (기준값 탭 두드러짐)

### 20.2 정책

| 규칙 | 내용 |
|------|------|
| 허용 | CO·C3·C6 모두 BOTTOM 등 **비연속** 동일 rail |
| 금지 | 연속 segment `node[i]→node[i+1]` 양 끝 **동일 rail** |
| 종료 | invalid segment **직전 node**까지 path·label 유지 |
| cap | `endIndex = min(sameRailCap, secondBallCap, chainBreakCap)` |
| baseline/corrected | **독립** `resolveTrajectoryDisplayCap(pathNodes, secondPoint)` |

**rail 판정:** `reflectionEngine.detectRail`  
**코너 보조:** `distance(a,b) < 0.75` Rg → same-rail degenerate

### 20.3 코드 SSOT

| 파일 | 역할 |
|------|------|
| `domain/trajectoryPathDisplayPolicy.ts` | `computeSameRailCapEndIndex`, `computeSecondBallCapEndIndex`, `resolveTrajectoryDisplayCap`, `slicePathNodesToCap` |
| `domain/trajectoryPathDisplayPolicy.test.ts` | Case 1~4 unit test (7 pass) |
| `App.jsx` | capCorrected/capBaseline 적용 · `visibleKeysForLabels` 동기화 · `pathEndIndexBase=pathEndIndex` **제거** |

**미변경:** `ImpactLines.jsx`, `SystemValueLabels.jsx` (cap된 path/keys 수신), SYS 엔진, `logic.json`

### 20.4 검증

| Case | 결과 |
|------|------|
| baseline C4=C5=C16 same-rail | C4까지 · C5/C6 label/path 없음 |
| corrected C4 LEFT → C5 TOP → C6 BOTTOM | C6까지 유지 |
| CO/C3/C6 non-consecutive BOTTOM | 허용 |
| baseline 독립 second-ball hit | chain 유효 시 C6까지 가능 |
| 기준값 ↔ 보정값 탭 | path depth = label depth |
| `npm run build` | exit 0 |

**SSOT 교차 참조:** `../PROJECT_MASTER_INDEX.md` §USER 동선분석 · Trajectory Display Cap

---

# 2026-06 사용자 UX 단순화 및 동선 카드 체계 정리

## 개요

2026-06 작업에서는 USER 모드 UX를 단순화하고, 동선(Trajectory) 기능을 중심으로 사용자 경험을 재정의하였다.

핵심 방향은 다음과 같다.

* USER 화면은 "공략 실행"에 집중
* 시스템 학습 기능은 추후 재설계
* 동선 카드에서 기준값/보정값/시스템값을 함께 확인
* 시스템값은 독립 토글 방식 적용
* AI/타법/동선 3개 핵심 기능 중심으로 단순화

---

# 1. USER 레슨(System Lesson) 제거 결정

## 기존 구조

USER Rail

* AI
* 타법
* 동선
* 레슨

레슨 모달은 현재 공략에 사용된 시스템을 설명하는 기능이었다.

---

## 문제점

AI 설명과 레슨 설명이 상당 부분 중복되었다.

사용자 입장에서는

"왜 두 개가 존재하는지"

구분하기 어려웠다.

또한 레슨은 학습 기능과 공략 기능이 혼재되어 있었다.

---

## 결정

USER 화면에서는 레슨 버튼 제거.

USER Rail은 다음만 유지.

* AI
* 타법
* 동선

---

## 향후 계획

레슨 기능은 폐기하지 않는다.

추후

"시스템 학습 모드"

로 재설계 후 재도입 가능.

현재 관련 ViewModel 및 도메인 자산은 보존.

---

# 2. 동선 카드 UX 재정의

## 기존 구조

동선 카드

* 기준값
* 보정값

만 존재.

---

## 사용자 요구

현재 위치가 왜 특정 시스템값인지 즉시 확인하고 싶음.

예)

CO=33
C3=34
C1=4

---

## 결정

동선 카드에

[시스템값 표시]

독립 토글 추가.

---

# 3. 시스템값 표시 동작 원칙

중요

시스템값 표시란

CO_33
C3_34

같은 궤적 포인트 값을 의미하지 않는다.

---

시스템값 표시의 의미

축에 표시되는 시스템 눈금.

예)

출발값
1쿠션
3쿠션
4쿠션

축 값

0
13
20
25
30
...

---

사용자는

"왜 출발값이 33인가"

궁금할 때

시스템값 표시를 켜서 즉시 확인 가능.

---

# 4. 동선 카드 상태 모델 확정

## 기준값 / 보정값

상호배타 토글

baseline ↔ corrected

동시에 하나만 표시.

---

## 시스템값 표시

독립 토글

ON/OFF

---

가능한 상태

기준값 + 시스템값 ON

기준값 + 시스템값 OFF

보정값 + 시스템값 ON

보정값 + 시스템값 OFF

---

## 유지 규칙

기준값 → 보정값 전환

시스템값 표시 상태 유지.

보정값 → 기준값 전환

시스템값 표시 상태 유지.

---

## 초기화 규칙

Reset 시

* 기준값 선택
* 시스템값 표시 OFF

---

# 5. 시스템값 표시 구현 원칙

사용자에게 제공되는 것은

SystemGrid

아님.

---

USER 모드

* 축 숫자
* 축 캡션

만 표시.

예)

출발값
1쿠션
3쿠션
4쿠션

0
13
20
25
30

---

ADMIN 전용

Grid SVG
축 편집
시스템 편집

유지.

---

# 6. 동선 카드 UI 개선 방향

가독성 개선 작업 진행.

목표

* 궤적 가림 최소화
* 카드 존재감 최소화
* 텍스트 가독성 향상
* 모바일/PC 일관성 확보

---

적용 방향

* 반투명 카드
* 드래그 이동 가능
* 위치 유지
* Reset 시 중앙 복귀

---

# 7. USER UX 최종 구조

USER Rail

* Search
* 공략1~3
* AI
* 타법
* 동선

---

동선 내부

* 기준값
* 보정값
* 시스템값 표시

---

AI

현재 공략 설명

---

타법

스트로크 및 샷 가이드

---

동선

시스템 계산 및 진행 경로 확인

---

# 8. 설계 원칙

USER 화면은

"학습"

보다

"실전 활용"

을 우선한다.

시스템 학습은 추후 별도 모드로 재설계한다.

현재 단계에서는

AI
타법
동선

3축 구조를 USER UX의 기준 구조로 확정한다.

21. Published Dataset Git 관리 복구 및 Production Search 검증 (2026-06)
배경

Dataset Architecture Phase 2~3-1 완료 이후

localhost 환경에서는 USER Search 정상
https://www.3cushionai.com 운영 환경에서는 USER Search 실패

현상 확인.

조사

브라우저 Network 확인 결과

/dataset/뒤돌리기/파이브앤하프/positions.json

요청이 발생하나

404 NOT_FOUND

반환.

직접 URL 접근 시에도 동일.

원인

프로젝트 루트 .gitignore 에

dataset/

가 포함되어 있었음.

결과적으로

로컬
  dataset 존재
  Search 성공

Github
  dataset 없음

Vercel
  dataset 없음

Production
  Search 실패

구조가 형성됨.

수정

.gitignore

수정 전

dataset/

수정 후

# dataset/
Git 반영

추가된 Published Dataset

dataset/뒤돌리기/파이브앤하프/positions.json
dataset/옆돌리기/파이브앤하프/positions.json

커밋

55190d0
add published gameplay datasets
결과

Github main 에 dataset 포함.

Vercel 재배포 후

https://www.3cushionai.com/dataset/...

접근 가능 확인.

검증 결과
localhost
USER Search
PASS
Production
USER Search
PASS
결론

Dataset Architecture Phase 2~3-1의

Published Dataset Loader
USER Search
ADMIN Recall

이 실제 Production 환경에서도 동작함을 최초 검증.

중요 설계 확인

현재 Published Dataset SSOT

dataset/

이며

frontend/src/data/systems/

는 시스템 정의 데이터(공식·anchors·logic) 용도임.

양자는 역할이 다름.


*End of PROJECT_LOG_2026-06*
