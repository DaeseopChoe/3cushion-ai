# PROJECT_LOG_2026-08

Version : v1.0  
Period : 2026-08  
Status : Active Project Log

---

# 2026-08-01 (SYS Apply 백지화 해결 · Runtime Contract SSOT 완성 · ModalShell Native Selection 제거)

## 제목

**D-RTC-01 / D-OVLSEL-01** — `buildSlotDraftWithUpdatedSys()` legacy `profile` dangling reference 제거 · ModalShell open 시 browser native Selection 초기화

## Summary

관리자 SYS 설정에서 **적용(Apply)** 을 누르면 화면 전체가 백지화되던 오류와, 새로고침 후 **첫 SYS Overlay**를 열 때 패널 텍스트가 파랗게 선택 표시되던 오류를 각각 해결하였다.

백지화의 원인은 `useShotSlots.ts`의 `buildSlotDraftWithUpdatedSys()`가 Batch 6 Runtime Contract 이관 후에도 남아 있던 **선언되지 않은 `profile` 변수**를 debug 필드에서 참조하던 것이다. `commitDraftSys` 경로의 React render phase에서 `ReferenceError`가 발생했고, ErrorBoundary가 없어 React root 전체가 unmount되었다. 같은 함수가 이미 Runtime Contract에서 해석해 둔 `formulaExpr`을 재사용하도록 바꿔, 해당 함수의 마지막 legacy 직접 참조를 제거하고 **Runtime Contract SSOT를 완성**하였다.

파란 selection highlight는 Interaction 문제가 아니라 **브라우저 native text selection의 잔존**이었다. Target Ball 더블클릭이 만든 Selection Range가 살아 있는 상태에서 ModalShell panel DOM이 삽입되면, 새 텍스트가 그 Range에 편입되어 highlight로 렌더된다. ModalShell이 열릴 때 1회 `window.getSelection()?.removeAllRanges()`를 호출해 native Selection만 초기화하는 방식으로 해결하였다. Pointer Capture / `preventDefault` / dblclick 로직 / `user-select` CSS는 일절 변경하지 않았다.

---

## 1. SYS Apply 백지화 (D-RTC-01)

### 문제

- ADMIN에서 기존 포지션을 불러와 SYS 값을 수정하고 **적용**을 누르면 화면 전체가 백지화
- Console: `Uncaught ReferenceError: profile is not defined at buildDraftWithUpdatedSys (useShotSlots.ts:315:17)`
- 사용자 체감상 "신규 포지션은 정상, 기존 포지션만 실패"로 보였음

### Root Cause

`frontend/src/hooks/useShotSlots.ts` `buildSlotDraftWithUpdatedSys()` 내부 debug 필드가 **선언되지 않은 `profile` 변수**를 참조하고 있었다.

```text
Batch 6 Runtime Contract 이관
    ↓
system JSON 직접 접근(profile) → getSystemContract() 경유로 전환
    ↓
같은 함수 상단은 formulaExpr 로 정상 이관됨 (line 255)
    ↓
debug.expr 한 줄만 legacy profile 참조로 잔존 (line 315)
    ↓
commitDraftSys → setState updater(render phase)에서 ReferenceError
    ↓
ErrorBoundary 부재 → React root unmount → 백지 화면
```

**신규 / 기존 포지션 차이에 대한 정정**

오류는 포지션 종류와 무관하게 `commitDraftSys`가 호출될 때마다 발생한다. 새로고침 직후에는 SYS Overlay 컨트롤을 활성화하기 위해 Target Ball 더블클릭이 선행되어야 하고, 그 경로를 거친 뒤에야 Apply에 도달하기 때문에 "기존 포지션에서만 발생"하는 것처럼 관측된 것이다.

### 해결 내용

이미 같은 함수에서 Runtime Contract로 해석해 둔 `formulaExpr`을 재사용한다.

```text
line 255 : const formulaExpr = getSystemContract(nextSystemId)?.profile?.formulaExpr ?? null;
line 315 : expr: profile?.formula?.expr ?? null   →   expr: formulaExpr
```

- 변경 1줄 · 계산 결과에 영향 없음 (debug 표시 필드)
- System JSON 직접 접근 경로가 사라져 해당 함수의 Runtime Contract 경유가 완성됨

### 정적 분석이 놓친 이유

| 도구 | 사유 |
|------|------|
| Build (`vite build`) | `tsc --noEmit` 미포함 — 타입 체크 없이 transpile only |
| Lint (`eslint .`) | `eslint.config.js`의 `files: ['**/*.{js,jsx}']` — `.ts` 파일 미검사 |

> **후속 후보(미적용):** build에 `tsc --noEmit` 추가 또는 ESLint 대상에 `.ts` 포함. 이번 세션 범위 외.

### Commit

`abeca84` — fix(sys): resolve blank screen on SYS apply by removing legacy profile reference

---

## 2. ModalShell Native Selection (D-OVLSEL-01)

### 문제

- 관리자 새로고침 → Target Ball 더블클릭 → SYS Overlay 오픈
- **첫 오픈에서만** 패널 텍스트 전체가 파란 selection highlight 상태로 표시
- 닫았다 다시 열면 정상

### Root Cause

**Pointer Capture / Interaction 문제가 아니다.** 브라우저 native text selection의 잔존이다.

```text
Target Ball 더블클릭 (native dblclick 보존 정책에 따라 preventDefault 없음)
    ↓
브라우저가 Selection Range 생성 (word/paragraph 단위)
    ↓
Range가 해제되지 않은 채 유지
    ↓
SYS Overlay(ModalShell) panel DOM 삽입
    ↓
새 텍스트 노드가 기존 Range 범위 안에 편입
    ↓
selection highlight 렌더
```

"첫 오픈에서만" 발생하는 이유는, SYS 버튼이 Target Ball 더블클릭 이후에만 활성화되기 때문이다. 즉 Overlay를 열기 직전 동작이 반드시 더블클릭이며, 그 더블클릭이 남긴 Selection이 그대로 Overlay에 걸린다. 두 번째 오픈부터는 직전 상호작용이 더블클릭이 아니므로 재현되지 않는다.

**기여 조건**

- `.modal-panel` / `.modal-panel--sys`에 `user-select` 규칙 없음
- `::selection` 커스텀 규칙 없음 (브라우저 기본 파란색)
- `handlePointerDown`은 native dblclick 보존을 위해 `preventDefault()`를 호출하지 않음 (Pointer Capture Timing SSOT)
- `handleBallDoubleClickForTarget`의 `preventDefault()`는 Selection이 이미 생성된 뒤라 시점상 무효
- ModalShell이 mount 시 Selection / focus를 정리하지 않음

### 해결 내용 (Option A)

ModalShell이 열릴 때 1회 native Selection만 초기화한다.

```text
frontend/src/components/common/ModalShell.jsx

useEffect(() => {
  if (!open) return;
  window.getSelection()?.removeAllRanges();
}, [open]);
```

- ModalShell은 닫혀 있을 때 `null`을 렌더링하되 컴포넌트 자체는 mount 상태로 남으므로, 실제 panel DOM이 삽입되는 `open === true` 전환을 기준으로 한다.
- 기존 drag-state 초기화 effect에 병합하지 않고 전용 effect로 분리하여 의도와 롤백 경계를 명확히 유지한다.
- **파일 표기 정정:** 프로젝트에 `ModalShell.tsx`는 존재하지 않는다. 실제 파일은 `ModalShell.jsx`이다.

### 절대 변경하지 않은 것

Pointer 이벤트 · `preventDefault` 추가 · dblclick 로직 · `user-select` CSS · Ball / Pad / SVG Interaction · Pointer Capture Timing. **Native Selection 초기화 외 리팩터링 없음.**

### Commit

`7ef9601` — fix(overlay): clear stale native selection when ModalShell opens

---

## 검증 결과

localhost dev server(`5175`)에서 브라우저 직접 검증.

### 대조군 (Selection 소멸 원인 귀속)

| 절차 | rangeCount |
|------|-----------|
| Selection 생성 후 **비 Overlay 버튼** 프로그램 클릭 | 1 → **1** (유지) |
| Selection 생성 후 **SYS Overlay 오픈** | 1 → **0** (초기화) |

비 Overlay 클릭에서는 Selection이 유지되므로, Overlay 오픈 시의 소멸은 ModalShell effect에 귀속된다.

### 기능 / Regression

| 항목 | 결과 |
|------|------|
| SYS Overlay 파란 Selection Highlight | **없음** |
| SYS 계산 | 정상 (C0=50 · C1=70 → C3 자동 -20 · 기준 계산 블록 렌더) |
| SYS 적용 (`commitDraftSys`) | 정상 · 백지화 없음 · 궤적 반영 |
| HP/T Overlay | 정상 (오픈 · 렌더 · 닫기 · Selection 0) |
| STR Overlay | 정상 (오픈 · 렌더 · 닫기 · Selection 0) |
| AI Overlay | 정상 (오픈 · 렌더 · 닫기 · Selection 0) |
| Workspace History Modal (동일 ModalShell 소비자) | 정상 · Selection 0 |
| Target Ball DoubleClick | 정상 (SYS 버튼 disabled → enabled 전환 확인) |
| Ball Drag | 정상 (요청 좌표 (875,690) 정확 도달) |
| Pointer Capture 시점 | **pointermove에서 획득** — Pointer Capture Timing SSOT 유지 확인 |
| Pad Drag (Joystick) | 정상 (gain 비율대로 공 추종) |
| Console Error | **0건** (전 과정) |
| Fresh Load | 정상 렌더 · 에러 0 |
| Build | **PASS** (`vite build` 5.68s) |
| Lint | **PASS** — 변경 전/후 동일 (`ModalShell.jsx` 기존 `react-hooks/refs` 1건만, 신규 0) |
| Regression | **없음** |

> **검증 한계 (Explicit):** 브라우저 자동화 도구의 왕복 지연이 dblclick 임계시간보다 길어, 두 번의 물리 클릭으로는 native dblclick이 성립하지 않았다. Target Ball DoubleClick 항목은 `dblclick` 이벤트 직접 dispatch로 검증하였다. 실제 마우스 더블클릭 육안 확인은 별도 권장.

---

## Decision Log

| ID | Decision |
|----|----------|
| **D-RTC-01** | Runtime Contract 이관 대상 함수는 debug / 표시 전용 필드까지 포함하여 System JSON 직접 접근을 남기지 않는다. Contract에서 이미 해석된 값을 재사용한다. |
| **D-OVLSEL-01** | ModalShell은 `open` 전환 시 1회 `window.getSelection()?.removeAllRanges()`로 browser native Selection을 초기화한다. |
| **D-OVLSEL-02** | Overlay는 **browser selection 상태만** 초기화한다. Pointer Capture / Ball / Pad Interaction은 변경하지 않는다. Selection 문제를 `preventDefault` 추가나 `user-select` CSS로 해결하지 않는다. |

---

## 변경 파일 / 함수

| 파일 | 함수 / 위치 | 내용 |
|------|-------------|------|
| `frontend/src/hooks/useShotSlots.ts` | `buildSlotDraftWithUpdatedSys()` line 315 | `profile?.formula?.expr ?? null` → `formulaExpr` |
| `frontend/src/components/common/ModalShell.jsx` | `ModalShell` — `open` 전용 `useEffect` | native Selection 1회 초기화 |

---

## Explicit Non-Claims

- SYS 계산 엔진 · Formula · Registry · Dataset 변경 **없음**
- Pointer Capture Timing (D-INTERACT-01~03) 변경 **없음**
- `preventDefault` 추가 **없음** · `user-select` CSS 추가 **없음**
- Ball / Pad / SVG Interaction 변경 **없음**
- USER Overlay(`UserOverlayShell`) 변경 **없음** — ModalShell은 ADMIN 계열 모달 전용
- ErrorBoundary 도입 **없음** (후속 후보)
- build `tsc --noEmit` / ESLint `.ts` 포함 **미적용** (후속 후보)

---

## Interaction / Overlay SSOT

Overlay native Selection 규칙은 `2_FRONTEND_ARCHITECTURE_BASELINE_v1.md` **§Overlay Native Selection (Interaction SSOT)** 에 고정한다.

---

## Current Status

```text
Pointer Capture Timing   : 안정 (D-INTERACT-01~03 유지)
Target Ball DoubleClick  : 안정
Runtime Contract SSOT    : 완료 (legacy profile dangling reference 제거)
SYS Apply 백지화          : 해결
ModalShell Selection      : 해결
Build                    : PASS
Lint                     : PASS
Regression               : 없음
Commit                   : abeca84 · 7ef9601
```

## Next

**Trajectory Extension 설계** — 계산 종료 이후(C4/C5/C6 이후)의 Reverse End 연장 궤적을 기존 계산 엔진과 분리된 독립 Overlay로 설계한다. 상세는 `CURSOR_SESSION_HANDOFF.md` 참조.

---
