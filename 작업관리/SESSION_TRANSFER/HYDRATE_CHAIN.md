# FILE

`HYDRATE_CHAIN.md`

# PURPOSE

STEP 2-3 DEBUG: Search `applyPositionRecall` 이후 target / trajectory / system labels sync chain 추적.  
`useShotSlots.ts`, `slotRuntimeHydrate.ts`, `App.jsx` hydrate 관련 구간 발췌.

# SOURCE

- **Source files**:
  - `frontend/src/hooks/useShotSlots.ts`
  - `frontend/src/domain/slotRuntimeHydrate.ts`
  - `frontend/src/App.jsx` (hydrate/sync/target only)
- **Extracted date**: 2026-05-23
- **Repo**: `D:/3Cushion AI`

---

# EXTRACTED SECTIONS

## buildDraftsFromRecord

- **source path**: `frontend/src/hooks/useShotSlots.ts`
- **line range**: 79–126

```typescript
/** PositionRecord → slot별 draft 맵 생성 (applyPositionRecall 단일 트랜잭션용) */
function buildDraftsFromRecord(record: PositionRecord): Record<string, DraftState> {
  const map: Record<string, DraftState> = {};
  for (const slotId of ["S1", "S2", "S3"] as const) {
    const entry = record.strategies[slotId];
    if (!entry) continue;

    const runtime = draftRuntimeFieldsFromStrategyEntry(entry);
    const recordTarget = normalizeSlotTargetBall(record.targetBall);
    map[slotId] = {
      sys: strategyEntryToSlotDraftSys(entry),
      hpt: entry.hpT,
      str: entry.str,
      ai: entry.ai,
      meta: { recommendedFrom: { positionId: record.positionId, score: 0 } },
      corrections: runtime.corrections,
      shotType: runtime.shotType,
      system_values: runtime.system_values,
      targetBall: recordTarget,
    };
  }
  return map;
}

/** 기존 slots에 nextDrafts 적용, applied 절대 변경 안 함. record에 없는 slot은 그대로 유지 */
function applyDraftsToSlots(
  slots: ShotEditorState["slots"],
  nextDrafts: Record<string, DraftState>
): ShotEditorState["slots"] {
  return Object.fromEntries(
    (Object.entries(slots) as Array<[keyof ShotEditorState["slots"], SlotState]>).map(
      ([slotId, slot]) => {
        const nextDraft = nextDrafts[slotId];
        if (!nextDraft) return [slotId, slot];
        return [
          slotId,
          {
            ...slot,
            draft: {
              ...(slot.draft ?? {}),
              ...nextDraft,
            },
          },
        ];
      }
    )
  ) as ShotEditorState["slots"];
}
```

---

## applyPositionRecall

- **source path**: `frontend/src/hooks/useShotSlots.ts`
- **line range**: 769–780

```typescript
  /**
   * Position Recall 결과를 UI 상태에 적용 (옵션 B: 전략만 적용)
   * - balls / adminState.balls 절대 변경 안 함
   * - draft만 갱신 (applied 유지)
   */
  const applyPositionRecall = (record: PositionRecord) => {
    const nextDrafts = buildDraftsFromRecord(record);
    setShotEditor((prev) => ({
      ...prev,
      slots: applyDraftsToSlots(prev.slots, nextDrafts),
    }));
  };
```

---

## switchSlot

- **source path**: `frontend/src/hooks/useShotSlots.ts`
- **line range**: 290–298

```typescript
  /**
   * 슬롯 전환(activeSlot만 변경)
   */
  const switchSlot = (slotId: SlotId) => {
    setShotEditor(prev => ({
      ...prev,
      activeSlot: slotId
    }));
  };
```

---

## extractSlotTargetBall

- **source path**: `frontend/src/domain/slotRuntimeHydrate.ts`
- **line range**: 45–62

```typescript
export function normalizeSlotTargetBall(
  value: unknown
): TargetBall | null {
  return value === "red" || value === "yellow" ? value : null;
}

/** Per-slot targetBall (draft → applied); no prev-slot fallback. */
export function extractSlotTargetBall(
  slot: SlotRuntimeDraftSlice | null | undefined
): TargetBall | null {
  const draft = slot?.draft;
  const applied = slot?.applied;
  return (
    normalizeSlotTargetBall(draft?.targetBall) ??
    normalizeSlotTargetBall(applied?.targetBall) ??
    null
  );
}
```

---

## buildSlotRuntimePayload

- **source path**: `frontend/src/domain/slotRuntimeHydrate.ts`
- **line range**: 128–159

```typescript
/** Empty slot: position-only blank runtime (no prev-slot SYS/trajectory carry-over). */
export function createEmptySlotRuntime(): SlotRuntimePayload {
  return {
    adminSys: createEmptyAdminSysSnapshot(),
    hpt: { ...DEFAULT_SLOT_HPT },
    str: { ...DEFAULT_SLOT_STR },
    ai: { ...DEFAULT_SLOT_AI },
    trajectoryResult: null,
    targetBall: null,
  };
}

/** Full runtime from slot container (draft/applied SSOT). */
export function buildSlotRuntimePayload(
  slot: SlotRuntimeDraftSlice | null | undefined
): SlotRuntimePayload {
  const slotSys = resolveSlotSysForRender(slot);
  if (!slotSys || !hasRenderableOutputsResult(slotSys)) {
    return createEmptySlotRuntime();
  }
  const meta = extractSlotRuntimeMeta(slot);
  const draft = slot?.draft;
  const applied = slot?.applied;
  return {
    adminSys: adminSysFromResolvedSlotSys(slotSys, meta),
    hpt: (draft?.hpt ?? applied?.hpt ?? DEFAULT_SLOT_HPT) as typeof DEFAULT_SLOT_HPT,
    str: (draft?.str ?? applied?.str ?? DEFAULT_SLOT_STR) as typeof DEFAULT_SLOT_STR,
    ai: (draft?.ai ?? applied?.ai ?? DEFAULT_SLOT_AI) as typeof DEFAULT_SLOT_AI,
    trajectoryResult: { ...(slotSys.outputs?.result ?? {}) },
    targetBall: extractSlotTargetBall(slot),
  };
}
```

---

## App.jsx — applySlotRuntimeTargetBall

- **source path**: `frontend/src/App.jsx`
- **line range**: 3342–3367

```javascript
  /**
   * PHASE 2 STEP 2: slot click = full runtime replace from slot container (no runAutoRecommend merge).
   */
  function applySlotRuntimeTargetBall(targetBall) {
    // #region agent log
    fetch("http://127.0.0.1:7608/ingest/d3b6e5e7-f840-44d2-9550-b3dacd8b3ccf", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5e25b9" },
      body: JSON.stringify({
        sessionId: "5e25b9",
        location: "App.jsx:applySlotRuntimeTargetBall",
        message: "applySlotRuntimeTargetBall",
        hypothesisId: "H1",
        timestamp: Date.now(),
        data: { targetBall, stack: new Error().stack?.split("\n").slice(1, 4) },
      }),
    }).catch(() => {});
    // #endregion
    if (targetBall === "red" || targetBall === "yellow") {
      setTargetColor(targetBall);
      setIsTargetSelected(true);
    } else {
      setTargetColor(null);
      setIsTargetSelected(false);
    }
  }
```

---

## App.jsx — syncSlotRuntimeAdminAndTrajectory

- **source path**: `frontend/src/App.jsx`
- **line range**: 3369–3419

```javascript
  /** sys/hpt/str/ai + trajectory only — never touches targetColor / isTargetSelected */
  function syncSlotRuntimeAdminAndTrajectory(slotId) {
    const payload = buildSlotRuntimePayload(shotEditor.slots[slotId]);
    // #region agent log
    fetch("http://127.0.0.1:7608/ingest/d3b6e5e7-f840-44d2-9550-b3dacd8b3ccf", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5e25b9" },
      body: JSON.stringify({
        sessionId: "5e25b9",
        location: "App.jsx:syncSlotRuntimeAdminAndTrajectory",
        message: "syncSlotRuntimeAdminAndTrajectory",
        hypothesisId: "STEP2_2_B",
        timestamp: Date.now(),
        data: { slotId, activeSlot: shotEditor.activeSlot },
      }),
    }).catch(() => {});
    // #endregion
    setAdminState((prev) => {
      const nextSys = payload.adminSys;
      if (adminSysShallowEqual(prev.sys, nextSys)) {
        return {
          ...prev,
          hpt: payload.hpt,
          str: payload.str,
          ai: payload.ai,
        };
      }
      return {
        ...prev,
        hpt: payload.hpt,
        str: payload.str,
        ai: payload.ai,
        sys: nextSys,
      };
    });
    const result = payload.trajectoryResult;
    const hasTraj =
      result &&
      (typeof result.oneC === "number" || typeof result.threeC === "number");
    if (hasTraj) {
      trajectory.setAdjusting({
        sys: {
          oneC: Number(result.oneC) || 0,
          threeC: Number(result.threeC) || 0,
        },
      });
      trajectory.applySysResult(result);
    } else {
      trajectory.resetTrajectory();
    }
  }
```

---

## App.jsx — hydrateSlotRuntime

- **source path**: `frontend/src/App.jsx`
- **line range**: 3421–3447

```javascript
  /** Slot switch only: targetBall hydrate + admin/trajectory */
  function hydrateSlotRuntime(slotId) {
    const slot = shotEditor.slots[slotId];
    const payload = buildSlotRuntimePayload(slot);
    // #region agent log
    fetch("http://127.0.0.1:7608/ingest/d3b6e5e7-f840-44d2-9550-b3dacd8b3ccf", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5e25b9" },
      body: JSON.stringify({
        sessionId: "5e25b9",
        location: "App.jsx:hydrateSlotRuntime",
        message: "hydrateSlotRuntime_target",
        hypothesisId: "STEP2_2_A",
        timestamp: Date.now(),
        data: {
          slotId,
          activeSlot: shotEditor.activeSlot,
          payloadTargetBall: payload.targetBall,
          draftTargetBall: slot?.draft?.targetBall ?? null,
          appliedTargetBall: slot?.applied?.targetBall ?? null,
        },
      }),
    }).catch(() => {});
    // #endregion
    applySlotRuntimeTargetBall(payload.targetBall);
    syncSlotRuntimeAdminAndTrajectory(slotId);
  }
```

---

## App.jsx — hydrate/sync effect calls

- **source path**: `frontend/src/App.jsx`
- **line range**: 4706–4736

```javascript
  useEffect(() => {
    const slotIds = ["S1", "S2", "S3"];
    if (!slotIds.includes(currentButtonId)) return;

    const prevSlotButton = lastSlotNavButtonRef.current;
    const isCrossSlotNavigation =
      prevSlotButton != null &&
      prevSlotButton !== currentButtonId &&
      slotIds.includes(prevSlotButton);

    actions.switchSlot(currentButtonId);
    setOverlayContent(null);
    setOverlayState({ open: false, type: null });

    // Position OFF only when admin moves S1↔S2↔S3 — not when SYS/HPT/STR/AI closes (currentButtonId → activeSlot).
    if (isCrossSlotNavigation) {
      setIsPositionLocked(false);
    }

    lastSlotNavButtonRef.current = currentButtonId;
  }, [currentButtonId]);

  // STEP 2-2 A: slot 전환 시에만 targetBall hydrate (Target 클릭 patch는 slots만 변경 → 여기 미실행)
  useEffect(() => {
    hydrateSlotRuntime(shotEditor.activeSlot);
  }, [shotEditor.activeSlot]);

  // STEP 2-2 B: slots/draft 변경 시 sys·trajectory만 sync (target UI 덮어쓰기 금지)
  useEffect(() => {
    syncSlotRuntimeAdminAndTrajectory(shotEditor.activeSlot);
  }, [shotEditor.slots, shotEditor.activeSlot]);
```

---

## App.jsx — handleUserSearchStrategies (Search apply, no hydrate call)

- **source path**: `frontend/src/App.jsx`
- **line range**: 4359–4381

```javascript
  /** USER Search: recall read → draft apply → existing slot hydrate/sync chain (no save, no ball edit). */
  const handleUserSearchStrategies = useCallback(() => {
    if (appMode !== "USER") return;

    const currentBalls = normalizeBallsToBall3(ballsState ?? adminState?.balls ?? {});
    const result = runPositionRecall({
      dataset: dataset ?? [],
      balls: currentBalls,
      targetBall: targetColor ?? null,
    });

    console.log("[USER_SEARCH_RECALL]", result);

    if (!result || result.kind === "no-match") {
      console.log("[USER_SEARCH_RECALL] no-match", result?.reason ?? "unknown");
      return;
    }

    console.log("[USER_SEARCH_RECALL] applyPositionRecall", {
      positionId: result.record?.positionId,
      kind: result.kind,
    });
    actions.applyPositionRecall(result.record);
  }, [
```

---

## Chain summary (reference only — not rewritten logic)

```text
USER Search click
  → handleUserSearchStrategies
  → runPositionRecall
  → applyPositionRecall (draft only, useShotSlots)
  → useEffect [shotEditor.slots] → syncSlotRuntimeAdminAndTrajectory(activeSlot)
  ✗ hydrateSlotRuntime NOT called (activeSlot unchanged)

Strategy S1|S2|S3 click (Stage currentButtonId)
  → switchSlot
  → useEffect [activeSlot] → hydrateSlotRuntime
       → applySlotRuntimeTargetBall
       → syncSlotRuntimeAdminAndTrajectory
  → useEffect [slots, activeSlot] → syncSlotRuntimeAdminAndTrajectory (again)
```
