# CURSOR_SESSION_HANDOFF.md

```
Document  : CURSOR_SESSION_HANDOFF.md
Type      : Cursor Session Handoff (Operational)
Date      : 2026-08-01
Scope     : Runtime Contract 안정화 Closure → Trajectory Extension 설계 Entry
Rule      : Fact only ·
             Pointer Capture Timing SSOT = absolute baseline (변경 금지) ·
             Overlay Native Selection SSOT = absolute baseline (변경 금지) ·
             기존 계산 Trajectory(C1~C6) 및 계산 엔진 수정 금지 ·
             Extension은 계산 엔진이 아니라 독립 Overlay Layer
```

---

## 0. 새 세션 — 필수 읽기 순서 (Trajectory Extension 설계)

```text
1. PROJECT_MASTER_INDEX.md
2. HISTORY/PROJECT_LOG_2026-08.md      ← D-RTC-01 / D-OVLSEL-01~02 (최신)
3. HISTORY/PROJECT_LOG_2026-07.md      ← D-INTERACT-01~03 (Pointer Capture Timing)
4. 2_FRONTEND_ARCHITECTURE_BASELINE_v1.md
5. CURSOR_SESSION_HANDOFF.md
6. 3_SYSTEM_ARCHITECTURE.md
7. 4_CALCULATION_RULES.md
8. frontend/src/domain/trajectory/trajectoryBuilder.ts
9. frontend/src/domain/trajectory/reflectionPolicy.ts
10. frontend/src/domain/trajectoryPathDisplayPolicy.ts
11. frontend/src/renderer/trajectory/trajectoryRenderModel.ts
12. frontend/src/hooks/useTrajectoryState.ts
13. frontend/src/components/table/ImpactLines.jsx
```

| # | Document | Purpose |
|---|----------|---------|
| **1** | **MASTER** | 현재 상태 SSOT · 다음 작업 우선순위 |
| **2** | **LOG 2026-08** | 이번 세션 상세 (Runtime Contract · Overlay Selection) |
| **3** | **LOG 2026-07** | Pointer Capture Timing 배경 |
| **4** | **Frontend Baseline** | Interaction / Overlay SSOT (변경 금지 규칙) |
| **5** | **HANDOFF** | carry / next / 금지 |
| 6–7 | System Architecture · Calculation Rules | 계산 계층 경계 확인 (**수정 대상 아님**) |
| 8–13 | Trajectory Domain · Renderer · State · View | Extension 설계 inspection |

---

## 1. 완료

### Interaction

- **Pointer Capture Timing 안정** — Capture는 pointerdown이 아니라 실제 Drag가 시작된 첫 `pointermove`에서 획득 (D-INTERACT-01~03)
- **Target Ball DoubleClick 안정** — 클릭 / 더블클릭은 browser native event 유지, Drag 전용 기능만 Capture 사용
- **ModalShell native selection 해결** — Overlay `open` 전환 시 1회 `window.getSelection()?.removeAllRanges()` (D-OVLSEL-01~02)

### Runtime

- **Runtime Contract SSOT 완료** — `buildSlotDraftWithUpdatedSys()`의 Batch 6 이관 잔여 legacy 직접 접근 제거
- **Legacy `profile` dangling reference 제거** — 선언되지 않은 `profile` 참조를 Contract 해석값 `formulaExpr`로 대체
- **SYS Apply 백지화 해결** — `commitDraftSys` render phase `ReferenceError` → React root unmount 경로 차단

### Dataset

- **SAVE / Export / Search / Production 반영 검증 완료** — Published Dataset Git 반영 · Vercel 정적 배포 · Production Search 정상 확인

---

## 2. 현재 안정 상태

| Item | Value |
|------|-------|
| **Build** | **PASS** (`vite build`) |
| **Lint** | **PASS** — 변경 전/후 동일 · 신규 0 |
| **Regression** | **없음** |
| **Interaction** | **안정** — Target Ball DoubleClick · Ball Drag · Pad Drag · Capture 시점 유지 |
| **Runtime Contract** | **안정** — System JSON 직접 접근 잔여 없음 |
| **Dataset Pipeline** | **안정** — SAVE → Export → Published → Search → Production |

```text
Pointer Capture Timing   : 안정 (D-INTERACT-01~03)
Overlay Native Selection : 안정 (D-OVLSEL-01~02)
Runtime Contract SSOT    : 완료 (D-RTC-01)
SYS Apply                : 정상
Build / Lint             : PASS / PASS
Regression               : 없음
Commit                   : abeca84 (Runtime Contract) · 7ef9601 (ModalShell Selection)
```

---

## 3. 다음 작업 (최우선) — Trajectory Extension 설계

### 목표

계산 종료 이후의 **Reverse End 연장 궤적**을 표현한다.

| 원칙 | 내용 |
|------|------|
| **계산 Trajectory 불변** | 기존 계산 Trajectory(**C1~C6**)를 수정하지 않는다 |
| **시작 지점** | 계산 종료 이후 — **C4 / C5 / C6부터 시작 가능** |
| **엔진 분리** | 연장 궤적은 계산 엔진이 아니라 **독립 Overlay**로 설계한다 |
| **다중 생성** | Extension은 **여러 개** 생성 가능하도록 설계한다 |
| **Second Ball** | 계산 기준이 아니라 **생성된 Extension 위에 위치하는 구조를 검토**한다 (확정 아님) |
| **진입 산출물** | **Trajectory Extension SSOT 초안** |

### 착수 순서

```text
1. Trajectory Extension SSOT 초안 설계   ← 여기서 시작
        ↓
2. 계산 엔진 / Extension 경계 정의 (Ownership · Data Flow)
        ↓
3. Extension 자료구조 설계 (다중 Extension · 시작 노드 · 종료 조건)
        ↓
4. Overlay Layer 설계 (Render 위치 · 기존 Trajectory Render와의 관계)
        ↓
5. Second Ball 배치 구조 검토 (결론 미정 — 검토 산출물)
        ↓
6. Architecture Review
        ↓
7. 구현 (별도 세션)
```

> **첫 세션은 구현이 아니라 SSOT 초안 설계다.** 코드 변경 없이 문서 산출물로 시작한다.

### 설계 시 확인해야 할 기존 경계

| 영역 | 파일 | 확인 포인트 |
|------|------|-------------|
| Trajectory 생성 | `domain/trajectory/trajectoryBuilder.ts` | `buildTrajectory()` 단일 진입 · `TrajectoryBuildResult` 구조 |
| 반사 정책 | `domain/trajectory/reflectionPolicy.ts` | C2 reflection policy SSOT |
| 표시 Cap | `domain/trajectoryPathDisplayPolicy.ts` | `endIndex = min(sameRailCap, secondBallCap, chainBreakCap)` — Extension은 이 Cap **밖** 영역 |
| Render Model | `renderer/trajectory/trajectoryRenderModel.ts` · `trajectoryPathAttrModel.ts` | baseline / corrected 독립 path |
| Runtime State | `hooks/useTrajectoryState.ts` | IDLE → ADJUSTING → APPLIED |
| View | `components/table/ImpactLines.jsx` | baseline / corrected dual path |

**주의:** 현재 `trajectoryPathDisplayPolicy.ts`의 Display Cap은 계산 궤적의 **표시 안전 정책**이다. Extension은 이 Cap을 완화하거나 우회하는 방식이 아니라, Cap 종료 지점 이후를 **별도 Layer로 덧그리는** 방식으로 설계한다.

---

## 4. In Progress / Carry

- USER Overlay 통합 검증 (AI ↔ HPT ↔ CALC) — **미완료 carry**
- HPT UX Polish — Shell / Content 크기 독립 (공 크기 유지 · SVG intrinsic bounds / viewBox crop) — **보류 유지**
- Known Issues OPEN-01 (USER Search 임팩트 방향) · OPEN-02 (신규 Export Search 실패) — P0 조사 중
- OPEN-05 (ADMIN Recall / LocalDB Trajectory Rehydration) — Known Issue · Low Priority

### 후속 후보 (미적용 · 이번 세션 범위 외)

- build에 `tsc --noEmit` 추가 또는 ESLint 대상에 `.ts` 포함 — 이번 `ReferenceError`가 두 게이트를 모두 통과한 사각지대
- ErrorBoundary 도입 — render phase 예외 시 React root 전체 unmount 방지

### 반드시 기억할 보류 항목

> **HPT Overlay SVG intrinsic bounds / viewBox crop 및 공 크기 독립 유지**

현재 HPT는 AI Shell로 이전되었으나, Content(viz)가 `--uos-w`에 커플링되어 Shell 스케일 축소에 따라 공 크기도 함께 줄어든 상태를 **임시 수용**한다.

---

## 5. Architecture / Ownership

### Interaction (변경 금지)

```text
pointerdown → Ball 선택 / Joystick 생성 (Capture 없음)
    ↓
pointermove → 실제 Drag 시작 → setPointerCapture() 1회
    ↓
pointerup / pointercancel → 자동 해제
```

클릭 / 더블클릭은 browser native event를 그대로 유지한다.

### Overlay (변경 금지)

```text
ModalShell open === true 전환
    ↓
window.getSelection()?.removeAllRanges()  (1회)
    ↓
panel DOM 삽입
```

Overlay는 **browser selection 상태만** 초기화한다. Pointer Capture / Ball / Pad Interaction은 변경하지 않는다.

### Runtime Contract

```text
System JSON
  → runtime/registry (getSystemContract)
  → Runtime
  → Application
  → Domain
  → Renderer
  → Presentation
```

System JSON 직접 접근 금지. debug / 표시 전용 필드도 예외가 아니다 (D-RTC-01).

---

## 6. 수정 금지 / 주의사항

### Interaction / Overlay

- pointerdown 시점 Pointer Capture 복귀 금지
- 클릭 / 더블클릭 경로에 `preventDefault` 추가 금지
- Overlay 계열에 `user-select` CSS 추가로 Selection 문제 우회 금지
- `::selection` 커스텀 색상으로 시각적 은폐 금지
- Ball / Pad / SVG Interaction · `BALL_PICK_RADIUS_RG` · `BALL_RADIUS_RG` · Joystick offset · Pad geometry 변경 금지

### Trajectory Extension

- 기존 계산 Trajectory(C1~C6) 수정 금지
- 계산 엔진 · Formula · Registry · Dataset 수정 금지
- Extension을 계산 엔진 내부에 편입 금지 (독립 Overlay 유지)
- `trajectoryPathDisplayPolicy` Display Cap 완화 / 우회 금지
- Second Ball 배치 구조는 **검토 단계** — 확정으로 기술 금지

### 공통

- Frozen Platform / Fleet Contract Book informal edit 금지
- USER Projection Rule 위반 금지 (USER는 문구 / 식 / 숫자 배열 재생성 안 함)
- Overlay Layout SSOT v1.2 위반 금지 (viewport 기반 width / `vh` 재도입 금지)

---

## 7. Current Session Card

```text
Session ID     : D-RTC-01 / D-OVLSEL-01
Baseline       : Pointer Capture Timing SSOT + Overlay Native Selection SSOT
Current Done   : Runtime Contract SSOT 완료 · SYS Apply 백지화 해결 ·
                 ModalShell native selection 해결 · Build/Lint PASS · Regression 없음
Current Carry  : USER Overlay 통합 검증 · HPT Polish · OPEN-01/02
Next Session   : Trajectory Extension SSOT 초안 설계 (문서 산출물 · 코드 변경 없음)
Commit         : abeca84 · 7ef9601
```

---

*End of CURSOR_SESSION_HANDOFF.md — 2026-08-01 · D-RTC-01 / D-OVLSEL-01*
