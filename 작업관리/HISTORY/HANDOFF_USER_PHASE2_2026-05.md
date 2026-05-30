# 3Cushion AI — 새 창 이관문서 (USER mode · PHASE 2)

> **용도**: Cursor 새 채팅에 **첫 메시지로 붙여넣기** 또는 `@`로 참조  
> **전제**: 로컬 **커밋 완료** 상태. 다음 작업 = **STEP 2-3 (hydrate/sync 타이밍)**  
> **상세 로그**: `작업관리/HISTORY/PROJECT_LOG_2026-05.md` **§21, §22**

---

## 1. 프로젝트·진입 구조

| 항목 | 내용 |
|------|------|
| Repo | `D:/3Cushion AI` |
| Frontend | `frontend/src` |
| 실행 트리 | `main.jsx` → `RootWrapper` → **`<Stage>`** (실제 SSOT) |
| 테이블 앱 | `Stage.jsx` **내부**에서 `<App />` 렌더 (rail + table) |
| 주의 | `main.jsx`의 `<Stage><App /></Stage>` 자식 `<App>`은 **사실상 dead** — rail/Search는 Stage 내부 App만 사용 |

---

## 2. 완료된 작업 (커밋 기준 요약)

### STEP 2-1 — USER Search → recall pipeline

- **파일**: `App.jsx`, `Stage.jsx`
- **동작**: Search 클릭 → `handleUserSearchStrategies` → `runPositionRecall` → match 시 `actions.applyPositionRecall(record)` (draft only)
- **연결**: `onUserSearchStrategiesRegister` + Stage `userSearchHandlerRef` (이 패턴만 유지)
- **미호출**: Search 성공 후 **`hydrateSlotRuntime` 없음** → STEP 2-3 대상

### STEP 2-2 — USER UI/state cleanup (low-risk)

- History → `handleOpenUserHistory` → `setShowHistoryModal(true)` (`WorkspaceHistoryModal` 재사용, read-only)
- Rail label: **기준값** (`BASELINE` id 유지)
- 기준값 클릭: `handleCloseUserInfoOverlay` → `setOverlayContent(null)` + `onFuncOverlayClose` (Stage `currentButtonId` → `activeSlot`)
- Active border: BASELINE=`userGuideLayersActive`, AI/HP/T=`currentButtonId`, HISTORY=항상 false

### White screen 긴급 복구

- **원인**: `userHistoryOpenRef` 미선언 + `onUserHistoryOpenRegister` mount crash
- **조치**: ref register 제거 → **`userRailActions` 객체 prop** + `(onOpenHistory ?? userRailActions.openHistory)?.()` 패턴
- **금지 재시도**: `onUserHistoryOpenRegister` / 미선언 ref register

### 문서

- `PROJECT_LOG_2026-05.md` **§22** append 완료

---

## 3. 현재 코드 패턴 (필수 이해)

### 3.1 Stage → App 콜백 (USER rail)

```
Stage (부모)
  userSearchHandlerRef        ← onUserSearchStrategiesRegister
  userRailActions = useMemo(() => ({}), [])
    .openHistory              ← App useEffect 할당
    .closeOverlay             ← App useEffect 할당
  userGuideLayersActive       → App prop userGuideLayersVisible
  currentButtonId             → App prop
  onFuncOverlayClose          → setCurrentButtonId(activeSlot)
```

**Stage** (`components/Stage.jsx` ~338–720, ~855–868)

- Search: `userSearchHandlerRef.current?.()`
- HISTORY: `(onOpenHistory ?? userRailActions.openHistory)?.()`
- BASELINE: toggle `userGuideLayersActive` + `(onCloseUserOverlay ?? userRailActions.closeOverlay)?.()`

**App** (`App.jsx` ~4360–4400, ~4765–4783)

- `handleUserSearchStrategies`, `handleOpenUserHistory`, `handleCloseUserInfoOverlay`
- `userRailActions.openHistory / closeOverlay` USER 모드에서만 할당

### 3.2 USER 데이터 SSOT

| 데이터 | 소스 |
|--------|------|
| 공략 저장 | `localStorage["positions_dataset"]` → App `dataset` |
| ADMIN SAVE | `handleCanonicalRightPanelSave` → `handleSaveStrategy` (건드리지 말 것) |
| USER Search | `runPositionRecall` + `applyPositionRecall` (draft only, balls/adminState 직접 수정 없음) |
| Rail 라벨 | passive `userRecallRecord` memo + `buildStrategyButtons` |
| Trajectory render | `slotRenderSys` + `syncSlotRuntimeAdminAndTrajectory` (내부 수정 금지) |

### 3.3 Slot hydrate 체인 (STEP 2-3 핵심)

```
공략 S1|S2|S3 클릭 (Stage setCurrentButtonId)
  → App: switchSlot + setOverlayContent(null)
  → [activeSlot] hydrateSlotRuntime
       → applySlotRuntimeTargetBall(payload.targetBall)
       → syncSlotRuntimeAdminAndTrajectory
  → [slots, activeSlot] syncSlotRuntimeAdminAndTrajectory only (target UI 덮어쓰기 금지)

USER Search 성공 (현재)
  → applyPositionRecall only
  → [slots] sync only  ← hydrateSlotRuntime 미호출 (버그/갭)
```

**Recall draft target**: `buildDraftsFromRecord` (`useShotSlots.ts`) — 모든 slot에 **`record.targetBall` 동일** (position-level). per-slot target 차이는 recall에 반영 안 됨.

### 3.4 기준값(시스템값) 표시 gate

- Stage `userGuideLayersActive` → App `userGuideLayersVisible`
- App effect: `showBaseLine` / `showSystemGrid` 동기화
- `SystemValueLabels`: USER && `!userGuideLayersVisible` → `outputs=null` → 컴포넌트 전체 null
- `SystemValueLabels.jsx`: `if (!outputs?.result) return null`
- USER: `SystemGrid`는 `canEdit`(ADMIN only)라 **그리드 라인 미표시** — 숫자 라벨만

---

## 4. STEP 2-3 — 다음 작업 (미해결 + root cause)

PROJECT_LOG **§22.7** 와 DEBUG trace 기준.

| # | 증상 | Root cause (요약) | 최소 수정 방향 (가이드만) |
|---|------|-------------------|---------------------------|
| 1 | 기준값 ON인데 시스템값 숫자 없음 | active slot `resolvedSlotSys.outputs.result` 없음 / Search 후 draft만 있고 derive 미반영 | Search 성공 후 **`hydrateSlotRuntime(activeSlot)` 1회** (함수 **내부** 수정 없이 **호출만**) |
| 2 | 공략 전환 시 target 안 바뀜 | `record.targetBall` position 단일값 → slot draft 동일 | 스키마 변경은 별도 STEP; 당장은 slot switch 시 hydrate로 draft target 적용 확인 |
| 3 | 옆돌리기 선택 시 이전 trajectory 잔존 | Search 후 sync만, slot switch hydrate 타이밍/ applied fallback | Search 후 hydrate; slot switch는 기존 chain 유지 검증 |
| 4 | Search 후 target UI stale | `applySlotRuntimeTargetBall`는 **activeSlot 변경 시만** | Search handler 끝에 `hydrateSlotRuntime(shotEditor.activeSlot)` 호출 검토 |

**절대 수정 금지 (STEP 2-3에서도)**

`hydrateSlotRuntime`, `syncSlotRuntimeAdminAndTrajectory`, `slotRenderSys` **함수 본문** · `applyPositionRecall` schema · ADMIN SAVE · trajectory algorithm · Stage rail layout constants

**허용 예시**

`handleUserSearchStrategies` 성공 분기 끝에 `hydrateSlotRuntime(shotEditor.activeSlot)` 한 줄 + 필요 시 동일 파일 내 호출 순서만.

---

## 5. 검증 체크리스트 (STEP 2-3 후)

1. ADMIN SAVE → USER 동일 포지션 → Search → 공략 라벨·trajectory·target
2. S1→S2 공략 전환: trajectory/target이 S2 draft 기준
3. 기준값 ON: `SystemValueLabels` 숫자 표시 (`outputs.result` 존재)
4. History / HP-T / 기준값 overlay / Search — STEP 2-2 회귀 없음
5. ADMIN SAVE / Recall / Position lock 회귀 없음
6. `npm run build` 성공

---

## 6. 주요 파일·심볼 인덱스

| 파일 | 심볼/영역 |
|------|-----------|
| `components/Stage.jsx` | `USER_FUNC_BUTTONS`, `renderUserFuncButton`, `userRailActions`, Search/HISTORY/BASELINE onClick |
| `App.jsx` | `handleUserSearchStrategies`, `handleOpenUserHistory`, `handleCloseUserInfoOverlay`, `userRecallRecord`, `hydrateSlotRuntime`, `syncSlotRuntimeAdminAndTrajectory`, `SystemValueLabels` props ~6701 |
| `hooks/useShotSlots.ts` | `applyPositionRecall`, `buildDraftsFromRecord`, `switchSlot` |
| `domain/slotRuntimeHydrate.ts` | `buildSlotRuntimePayload`, `extractSlotTargetBall` |
| `domain/slotSysResolve.ts` | `resolveSlotSysForRender` |
| `domain/strategyButtonModel.ts` | `buildStrategyButtons` |
| `domain/positionRecallEngine.ts` | `runPositionRecall` |
| `components/table/SystemValueLabels.jsx` | `outputs?.result` gate |
| `hooks/useSettings.js` | `workspaceHistory`, `showHistoryModal` |

---

## 7. 운영 규칙 (반복 사고 방지)

1. **요청 범위 외 수정 금지** — import 정리, lint 전체, refactor, hook reorder 금지
2. **새 ref/register 추가 시** — 선언·cleanup·mount 경로 검증 (white screen 재발 방지)
3. **USER UI vs hydrate core 분리** — overlay/rail은 App handler 타이밍만
4. Cursor 요청 시 **파일·라인·금지 목록** 명시
5. **이중 SysOverlay** — 메인 SYS UI는 `App.jsx` 내부 `SysOverlay` (PROJECT_LOG §5.3)

---

## 8. 새 창용 시작 프롬프트 (복사용)

```text
[MODE] EXECUTE — STEP 2-3 USER Search/slot hydrate sync

컨텍스트: @작업관리/HISTORY/PROJECT_LOG_2026-05.md §22.7
@작업관리/HISTORY/HANDOFF_USER_PHASE2_2026-05.md 기준. 커밋 완료 상태에서 이어감.

목표:
1) USER Search 성공 후 activeSlot에 대해 hydrateSlotRuntime(activeSlot) 1회 호출 (함수 본문 수정 금지)
2) 공략 S1/S2/S3 전환 시 target/trajectory가 slot draft와 일치하는지 검증·보완 (호출 타이밍만)
3) 기준값 ON 시 SystemValueLabels outputs.result 연결 확인

절대 수정 금지:
hydrateSlotRuntime, syncSlotRuntimeAdminAndTrajectory, slotRenderSys 내부
applyPositionRecall schema, ADMIN SAVE, trajectory algorithm, Stage rail constants

허용: App.jsx handleUserSearchStrategies 등 handler 타이밍 최소 변경.

완료 후: PROJECT_LOG §22.7 갱신 제안, npm run build, 검증 체크리스트 보고.
범위 외 import/refactor 금지.
```

---

## 9. 참고 링크

- 이전 대화 transcript: `agent-transcripts/de99269d-feb8-4bff-b4bd-2061ee13d94c` (Search/white screen/2-2 맥락)
- PHASE 2 slot/hydrate: PROJECT_LOG **§21**
- Recall 정책: PROJECT_LOG **§8**

---

*문서 버전: 2026-05 · STEP 2-2 커밋 후 · 다음 STEP 2-3*
