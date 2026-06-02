# PROJECT LOG – 2026-06

Version: v1.0  
Created: 2026-06-02  
Scope: AI 코멘트 SSOT · USER AI 패널 · HP/T 오버레이 스택 · 문서 SSOT  

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
6. `[두께/타점 보기]` → HP/T 스택

---

## 8. 변경 금지 (본 세션 준수)

- SYS / STR **계산 엔진** 로직
- `composeAiAutoComment` **문장 생성 규칙** (표시·CSS 위주 변경)
- `onePointLessons` **저장 구조**
- ADMIN HP/T·SYS **입력 UI** (크기·레이아웃)

---

## 9. 다음 예정 작업

### P0 — 시스템 학습 (System Lesson) 구조 설계

- **시스템 학습** 데이터·UI·SAVE/Recall 경계 정의
- **기존 좌측 HP/T 메뉴** → **「시스템 레슨」** 메뉴 전환 예정
- **USER AI 패널 CTA** `[두께/타점 보기]` → **`[시스템 레슨 보기]`** 전환 예정
- **학습 구조 확장 예정:**

  ```
  AI 패널
    → 원 포인트 레슨
    → 시스템 레슨
    → 실전 공략
  ```

### P1 — 시스템 학습 UI

- USER 모달/오버레이 패턴 (`ModalShell`, 스택 규칙 재사용 검토)

### P2 — 시스템 학습 데이터 구조

- Dataset / slot / lesson JSON 스키마, SAVE·Recall 연동

---

## 10. 세션 인계 체크리스트

- [ ] USER 모드: AI 오버레이 → 레슨·공식·`[두께/타점 보기]` 확인
- [ ] HP/T 스택 열기/닫기 후 AI 유지
- [ ] ADMIN: AI 전체 적용 후 USER recall 시 레슨 표시
- [ ] `PROJECT_MASTER_INDEX.md` §AI·§USER Overlay Stack 참고
- [ ] 미커밋 `frontend` 변경 있으면 별도 커밋 후 부록 §A 갱신

---

## 11. 관련 파일 (빠른 참조)

```
frontend/src/domain/aiAutoCommentViewModel.ts
frontend/src/domain/userInfoPanelModel.ts
frontend/src/components/user/UserAiPanel.jsx
frontend/src/components/user/UserHptPanel.jsx
frontend/src/App.jsx
frontend/src/components/Stage.jsx
frontend/src/index.css
작업관리/PROJECT_MASTER_INDEX.md
작업관리/ARCHIVE/1_PROJECT_MASTER_INDEX.md
```

---

## 부록 A. Git 커밋 요약 (본 세션·문서)

| 날짜 | 커밋 | 요약 |
|------|------|------|
| 2026-05-27 | `9a024b5` | `docs: add PROJECT_MASTER_INDEX as current-state SSOT` |
| 2026-05-27 | `6b055a8` | `docs: merge architecture into PROJECT_MASTER_INDEX, archive legacy constitution` |

**참고:** `frontend/src` AI·USER 패널 변경은 본 세션에서 작업되었으나, 워킹 트리에 **미커밋일 수 있음**. 반영 시 권장 메시지 예시:

- `feat(user-ai): refactor AI comment display, HP/T overlay stack, and panel UX`
- `docs: add PROJECT_LOG_2026-06 for AI panel and overlay stack work`

---

*End of PROJECT_LOG_2026-06*
