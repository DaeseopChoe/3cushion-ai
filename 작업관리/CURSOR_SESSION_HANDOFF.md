# CURSOR_SESSION_HANDOFF.md

```
Document  : CURSOR_SESSION_HANDOFF.md
Type      : Cursor Session Handoff (Operational)
Date      : 2026-08-04
Scope     : Trajectory Extension Completed (Task Closed) → Next Product / Handle Drag residual
Rule      : Fact only ·
             Pointer Capture Timing SSOT = absolute baseline (변경 금지) ·
             Overlay Native Selection SSOT = absolute baseline (변경 금지) ·
             기존 계산 Trajectory(C1~C6) 및 계산 엔진 수정 금지 ·
             Extension은 계산 엔진이 아니라 독립 Overlay Layer ·
             Search 전용 Hydrate 금지 — activateStrategySlot 단일 Runtime 경로
```

---

## 0. 새 세션 — 필수 읽기 순서

```text
1. PROJECT_MASTER_INDEX.md
2. HISTORY/PROJECT_LOG_2026-08.md      ← Trajectory Extension Complete (최신)
3. TRAJECTORY_EXTENSION_SSOT.md        ← v1.4 (Runtime Activation)
4. CURSOR_SESSION_HANDOFF.md
5. 2_FRONTEND_ARCHITECTURE_BASELINE_v1.md
6. (필요 시) frontend/src/App.jsx — activateStrategySlot / pickStrategySlot / handleUserSearchStrategies
```

| # | Document | Purpose |
|---|----------|---------|
| **1** | **MASTER** | 현재 상태 SSOT · Trajectory Extension **Task Closed** |
| **2** | **LOG 2026-08** | Extension 완료 · USER Search Runtime 원인/해결 |
| **3** | **EXT SSOT v1.4** | Overlay · SAVE/Hydrate · Search/Pick Runtime Flow |
| **4** | **HANDOFF** | carry / next / 금지 |
| **5** | **Frontend Baseline** | Interaction / Overlay SSOT (변경 금지) |

---

## 1. 완료 (이번·직전 세션)

### Trajectory Extension — **Task Closed**

- Extension Runtime 통합 완료 (독립 Overlay · Role SSOT · Target Lock + DoubleClick Projection)
- SAVE → `StrategyEntry.trajectoryExtensions` → Export → Published Leaf
- Hydrate whitelist (`buildDraftsFromRecord` 등) · Reveal runtime 재생성
- ADMIN / USER 적색 stroke · Handle은 ADMIN 편집만
- **USER Search Runtime 문제 해결** — `userTableDisplaySlotId` 미설정으로 hydrate가 null 처리되던 경로 수정
- **Runtime Activation 통합** — `activateStrategySlot()` · Search ↔ Strategy Pick 공유
- Search 전용 Hydrate **없음**
- ADMIN Local DB / Published Search / USER Search / Slot 전환 / ADMIN↔USER 리셋 검증 기준 충족

### 선행 안정화 (유지)

- Pointer Capture Timing · Target Ball DoubleClick · Runtime Contract SSOT · ModalShell native Selection · Dataset Pipeline

---

## 2. 현재 안정 상태

| Item | Value |
|------|-------|
| **Trajectory Extension** | **Completed / Task Closed** (SSOT v1.4) |
| **USER Search Runtime** | `activateStrategySlot` 통합 |
| **Build / Lint** | 구현 세션 기준 PASS |
| **Regression** | Extension 범위 내 주요 경로 정상 |
| **Interaction / Contract** | 안정 (baseline 유지) |

```text
Trajectory Extension     : Task Closed
activateStrategySlot     : Search + Strategy Pick 공유
Search-only Hydrate      : 없음
SSOT                     : TRAJECTORY_EXTENSION_SSOT.md v1.4
Next (Product)           : Handle Drag 잔여 또는 차기 기능
```

---

## 3. 다음 작업

### 후보 A — Handle First Drag 잔여 간섭

Extension Handle vs Ball / Joystick pointer 우선순위는 SSOT에 있으나, **Handle 첫 Drag 잔여 간섭**은 명시적 후속 항목으로 남아 있을 수 있다. 착수 전 App pointer 경로·`trajectoryExtensionHandleDrag`를 재확인한다.

### 후보 B — 차기 Product / Platform

- MASTER §다음 작업 우선순위 · STEP9 Phase 4 Pilot 등 Platform 트랙
- OPEN-01 / OPEN-02 운영 검증 (P0 조사 중)

---

## 4. In Progress / Carry

- USER Overlay 통합 검증 (AI ↔ HPT ↔ CALC) — **미완료 carry**
- HPT UX Polish — **보류 유지**
- Known Issues OPEN-01 · OPEN-02 — P0 조사 중 (OPEN-01 가설: Search=draft-only 문구는 2026-08-04 이후 부정확 → targetBall 동기화 우선)
- OPEN-05 — Known Issue · Low Priority
- Handle First Drag 잔여 — Extension 후속 후보

---

## 5. Architecture / Ownership (변경 금지 요약)

### Interaction / Overlay

- pointerdown Capture 복귀 금지 · Overlay `user-select` / `::selection` 우회 금지
- ModalShell: `open` 시 native Selection 1회 clear만

### Trajectory Extension

- 계산 Trajectory(C1~C6) · Builder · Formula · Display Cap 파일 수정 금지
- Extension = 독립 Overlay
- **Search 전용 Hydrate 신설 금지** — `activateStrategySlot` / `hydrateSlotRuntime` 재사용
- `trajectoryExtensions` DO NOT STRIP

### Runtime Activation (v1.4)

```text
USER Search success
  → resolveUserSearchDisplaySlotId
  → activateStrategySlot
       → switchSlot → setUserTableDisplaySlotId → hydrateSlotRuntime
  → existing hydrate effects → Trajectory / Extension / Target / Layer
```

---

## 6. Current Session Card

```text
Session ID     : D-EXT-26 / Trajectory Extension Closure
Baseline       : Pointer Capture · Overlay Selection · Runtime Contract · EXT SSOT v1.3→v1.4
Current Done   : Extension Product Complete · USER Search Runtime Activation ·
                 activateStrategySlot 통합 · Docs (MASTER / LOG / SSOT / HANDOFF)
Current Carry  : Handle First Drag 잔여 · OPEN-01/02 · USER Overlay 검증
Next Session   : Handle Drag 잔여 또는 차기 Product / Platform
Commit         : (문서 세션 미커밋 · 구현 커밋은 사용자 지시 시)
```

---

*End of CURSOR_SESSION_HANDOFF.md — 2026-08-04*
