# FILE

`APP_USER_SEARCH_FLOW.md`

# PURPOSE

STEP 2-3 USER Search / hydrate stabilization DEBUG용.  
`frontend/src/App.jsx`에서 USER Search·recall·hydrate effect·overlay·guide layer·callback wiring 관련 구간만 발췌.

# SOURCE

- **Source file path**: `frontend/src/App.jsx`
- **Extracted date**: 2026-05-23
- **Repo**: `D:/3Cushion AI`

---

# EXTRACTED SECTIONS

## App component props (USER rail wiring)

- **source path**: `frontend/src/App.jsx`
- **line range**: 3202–3220

```javascript
export default function App({
  currentButtonId,
  userGuideLayersVisible,
  onActiveSlotChange,
  onFuncOverlayClose,
  onDirtySlotsChange,
  onAppModeChange,
  onStrategyCountMapChange,
  onStrategyButtonsChange,
  onUserInfoPanelChange,
  onSystemControlsAvailabilityChange,
  onUserSearchStrategiesRegister,
  userRailActions,
}) {
  const [currentId, setCurrentId] = useState(SHOTS[0].id);
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overlayContent, setOverlayContent] = useState(null);
```

---

## showBaseLine / showSystemGrid state

- **source path**: `frontend/src/App.jsx`
- **line range**: 3676–3691

```javascript
  const [overlayState, setOverlayState] = useState({
    open: false,
    type: null, // "SYS" | "HPT" | "STR" | "AI" | "ANCHOR_EDIT" | null
    anchorKey: null,
  });

  const [showSystemGrid, setShowSystemGrid] = useState(false);
  const [showBaseLine, setShowBaseLine] = useState(false);
  const autoSave = true;

  /** 우측 패널: 상태 가시성 (버튼 = 시스템 상태 표현) */
  const [isPositionLocked, setIsPositionLocked] = useState(false);
  const [isTargetSelected, setIsTargetSelected] = useState(false);
  const [isRecalled, setIsRecalled] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [targetColor, setTargetColor] = useState(null);
```

---

## notifyFuncOverlayClose

- **source path**: `frontend/src/App.jsx`
- **line range**: 3984–4001

```javascript
  function openAnchorEdit(anchorKey) {
    setOverlayState({ open: true, type: "ANCHOR_EDIT", anchorKey });
  }

  /** SYS/HPT/STR/AI 닫을 때 Stage가 슬롯 버튼으로 currentButtonId를 되돌림 */
  function notifyFuncOverlayClosedByAdminUi() {
    onFuncOverlayClose?.();
  }

  // 오버레이 닫기
  function closeOverlay() {
    const wasType = overlayState.type;
    setOverlayState({ open: false, type: null, anchorKey: null });
    // SYS/HP/T/STR/AI 오버레이 닫힐 때 부모에 알려 선택 초기화 → 같은 버튼 재클릭 시 즉시 열림
    if (wasType && ["SYS", "HPT", "STR", "AI"].includes(wasType)) {
      notifyFuncOverlayClosedByAdminUi();
    }
  }
```

---

## applySlotRuntimeTargetBall

- **source path**: `frontend/src/App.jsx`
- **line range**: 3338–3367

```javascript
  const debugSlotSysSnapshotPrevRef = useRef(null);
  /** Last S1/S2/S3 button id — Position reset only on cross-slot navigation, not overlay→slot restore */
  const lastSlotNavButtonRef = useRef(null);

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

## syncSlotRuntimeAdminAndTrajectory

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

## hydrateSlotRuntime

- **source path**: `frontend/src/App.jsx`
- **line range**: 3421–3453

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

  /** 궤적/앵커 렌더 SSOT: 활성 슬롯의 sys만 사용 (adminState.sys / view.ui.system 혼합 금지) */
  const resolvedSlotSys = useMemo(() => {
    const slot = shotEditor.slots[shotEditor.activeSlot];
    return resolveSlotSysForRender(slot) ?? null;
  }, [shotEditor.slots, shotEditor.activeSlot]);
```

---

## handlePositionRecall (ADMIN)

- **source path**: `frontend/src/App.jsx`
- **line range**: 4229–4357

```javascript
  /** L1 거리합(Recall v1) 상한 참고 — strict ±3 내 최대 18, 초과 시 참고용 안내 */
  const HARD_THRESHOLD_L1 = 14;

  function handlePositionRecall() {
    const currentBalls = normalizeBallsToBall3(ballsState ?? adminState?.balls ?? {});
    const sys = adminState?.sys;
    const systemId = sys?.systemId ?? sys?.system_id ?? "5_half_system";
    const profile = SYSTEM_PROFILES[systemId];
    const formulaHash = (profile?.formula?.expr ?? profile?.meta?.version ?? "v1").slice(0, 32);
    /** 키는 systemId+formulaHash만; StrategySignature 타입상 shotType 필드는 더미 */
    const signatureKey = makeSignatureKey({
      systemId,
      formulaHash,
      shotType: "_",
    });
    const ds = dataset ?? [];
    const datasetSigKeys = new Set();
    for (const r of ds) {
      for (const e of listStrategiesInRecord(r)) {
        datasetSigKeys.add(makeSignatureKey(e.signature));
      }
    }
    const recallDebugPayload = {
      hypothesisId: "H_RECALL_QUERY",
      signatureKey,
      systemId,
      formulaHash,
      uiShotType: sys?.shotType ?? null,
      datasetLength: ds.length,
      uniqueSignatureKeysInDataset: [...datasetSigKeys].slice(0, 40),
      uniqueKeyCount: datasetSigKeys.size,
    };
    // #region agent log
    fetch("http://127.0.0.1:7608/ingest/d3b6e5e7-f840-44d2-9550-b3dacd8b3ccf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "a98f58",
      },
      body: JSON.stringify({
        sessionId: "a98f58",
        location: "App.jsx:handlePositionRecall",
        message: "RECALL_QUERY",
        data: recallDebugPayload,
        timestamp: Date.now(),
        hypothesisId: "H_RECALL_QUERY",
      }),
    }).catch(() => {});
    // #endregion
    console.log("[RECALL_QUERY]", recallDebugPayload);
    console.log("[RECALL_DATASET_SIGNATURES]", {
      datasetLength: ds.length,
      signatures: [...datasetSigKeys],
    });

    const result = runPositionRecall({
      dataset: ds,
      balls: currentBalls,
      targetBall: targetColor ?? null,
    });

    // #region agent log
    fetch("http://127.0.0.1:7608/ingest/d3b6e5e7-f840-44d2-9550-b3dacd8b3ccf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "a98f58",
      },
      body: JSON.stringify({
        sessionId: "a98f58",
        location: "App.jsx:handlePositionRecall:afterRun",
        message: "RECALL_RESULT",
        data: {
          hypothesisId: "H_RECALL_RESULT",
          kind: result?.kind,
          reason: result?.kind === "no-match" ? result.reason : undefined,
        },
        timestamp: Date.now(),
        hypothesisId: "H_RECALL_RESULT",
      }),
    }).catch(() => {});
    // #endregion
    console.log("[RECALL_RESULT]", result);

    if (!result || result.kind === "no-match") {
      alert(result?.reason === "empty-dataset" ? "추천 데이터 없음 (데이터셋 비어 있음)" :
        result?.reason === "coarse-empty" ? "추천 데이터 없음 (±3 그리드 내 유사 포지션 없음)" :
        "추천 데이터 없음");
      return;
    }

    // #region agent log
    fetch("http://127.0.0.1:7608/ingest/d3b6e5e7-f840-44d2-9550-b3dacd8b3ccf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "a98f58",
      },
      body: JSON.stringify({
        sessionId: "a98f58",
        location: "App.jsx:handlePositionRecall:beforeApply",
        message: "RECALL_APPLY_POSITION_RECALL",
        data: {
          hypothesisId: "H_APPLY",
          positionId: result.record?.positionId,
          kind: result.kind,
        },
        timestamp: Date.now(),
        hypothesisId: "H_APPLY",
      }),
    }).catch(() => {});
    // #endregion
    console.log("[RECALL_APPLY]", { positionId: result.record?.positionId, kind: result.kind });

    actions.applyPositionRecall(result.record);
    const recallEntry = result.record?.strategies?.[shotEditor.activeSlot];
    if (recallEntry) {
      setAdminState((prev) => {
        const nextSys = adminSysFromRecallStrategyEntry(recallEntry, prev.sys);
        if (!nextSys) return prev;
        return { ...prev, sys: nextSys };
      });
    }
    setIsRecalled(true);

    if (result.distance > HARD_THRESHOLD_L1) {
      alert("유사도 낮음");
    }
  }
```

---

## handleUserSearchStrategies

- **source path**: `frontend/src/App.jsx`
- **line range**: 4359–4400

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
    appMode,
    dataset,
    ballsState,
    adminState?.balls,
    targetColor,
    actions,
  ]);

  const handleOpenUserHistory = useCallback(() => {
    if (appMode !== "USER") return;
    setShowHistoryModal(true);
  }, [appMode, setShowHistoryModal]);

  const handleCloseUserInfoOverlay = useCallback(() => {
    if (appMode !== "USER") return;
    setOverlayContent(null);
    onFuncOverlayClose?.();
  }, [appMode, onFuncOverlayClose]);
```

---

## USER overlay effect (overlayContent)

- **source path**: `frontend/src/App.jsx`
- **line range**: 4667–4686

```javascript
  // ============================================
  // currentButtonId 처리 (USER 모드 오버레이)
  // ============================================
  useEffect(() => {
    // ✅ ADMIN 모드에서는 기존(USER) overlayContent 흐름을 막는다
    if (appMode === "ADMIN") return;
    
    if (!currentButtonId) return;

    // 코칭 버튼 처리
    if (currentButtonId === "COACH") {
      setShowCoaching(true);
      console.log("🎯 코칭 버튼 클릭 감지");
    }
    else if (currentButtonId === "SYS") setOverlayContent("SYS");
    else if (currentButtonId === "HP/T") setOverlayContent("HPT");
    else if (currentButtonId === "STR") setOverlayContent("STR");
    else if (currentButtonId === "AI") setOverlayContent("AI");
    else setOverlayContent(null);
  }, [currentButtonId, appMode]);
```

---

## S1/S2/S3 navigation + hydrate/sync effects

- **source path**: `frontend/src/App.jsx`
- **line range**: 4703–4736

```javascript
  // ============================================
  // S1/S2/S3: navigation only (no runAutoRecommend)
  // ============================================
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

## userGuideLayersVisible → showBaseLine/showSystemGrid

- **source path**: `frontend/src/App.jsx`
- **line range**: 4753–4783

```javascript
  useEffect(() => {
    if (appMode !== "USER") return;
    if (typeof userGuideLayersVisible !== "boolean") return;
    setShowBaseLine(userGuideLayersVisible);
    setShowSystemGrid(userGuideLayersVisible);
  }, [appMode, userGuideLayersVisible]);

  useEffect(() => {
    if (appMode !== "USER") {
      onUserSearchStrategiesRegister?.(null);
      return;
    }
    onUserSearchStrategiesRegister?.(handleUserSearchStrategies);
    return () => onUserSearchStrategiesRegister?.(null);
  }, [appMode, handleUserSearchStrategies, onUserSearchStrategiesRegister]);

  useEffect(() => {
    if (!userRailActions) return;
    if (appMode === "USER") {
      userRailActions.openHistory = handleOpenUserHistory;
      userRailActions.closeOverlay = handleCloseUserInfoOverlay;
    } else {
      userRailActions.openHistory = null;
      userRailActions.closeOverlay = null;
    }
    return () => {
      if (!userRailActions) return;
      userRailActions.openHistory = null;
      userRailActions.closeOverlay = null;
    };
  }, [appMode, handleOpenUserHistory, handleCloseUserInfoOverlay, userRailActions]);
```

---

## userRecallRecord (passive labels)

- **source path**: `frontend/src/App.jsx`
- **line range**: 4785–4796

```javascript
  // USER: recall record for strategy rail labels (passive); Search applies drafts via handleUserSearchStrategies
  const userRecallRecord = useMemo(() => {
    const currentBalls = normalizeBallsToBall3(ballsState ?? adminState?.balls ?? {});
    if (!dataset?.length) return null;
    const result = runPositionRecall({
      dataset: dataset ?? [],
      balls: currentBalls,
      targetBall: targetColor ?? null,
    });
    if (!result || result.kind === "no-match" || !result.record) return null;
    return result.record;
  }, [dataset, ballsState, adminState?.balls, targetColor]);
```

---

## SystemValueLabels (USER guide gate)

- **source path**: `frontend/src/App.jsx`
- **line range**: 6694–6720

```javascript
      {canEdit && (
        <SystemGrid
          track={trackForAnchors}
          anchorsData={getAnchorsForSystem(systemIdForGrid)}
          visible={showSystemGrid}
        />
      )}
      <SystemValueLabels
        showSystemGrid={appMode === "USER" ? !!userGuideLayersVisible : showSystemGrid}
        anchors={allAnchorsForLabels}
        labelAnchors={labelAnchorsForRaw}
        scale={SCALE}
        tableH={TABLE_H}
        padding={PADDING}
        systemValues={systemValuesForLabels}
        labelStrategy={labelStrategy}
        outputs={
          appMode === "USER" && !userGuideLayersVisible
            ? null
            : resolvedSlotSys?.outputs ??
              (system?.outputs ??
                (Object.keys(system?.values ?? {}).length > 0
                  ? { result: system.values }
                  : undefined))
        }
        onAnchorDoubleClick={canEdit ? openAnchorEdit : undefined}
      />
```

---

## USER ModalShell overlay

- **source path**: `frontend/src/App.jsx`
- **line range**: 6997–7034

```javascript
      {/* USER 모드 오버레이 — read-only info (AI panel = userInfoPanel SSOT) */}
      <ModalShell
        open={appMode === "USER" && !!overlayContent}
        onClose={() => setOverlayContent(null)}
        draggable
        panelClassName="modal-panel--compact"
        title={
          overlayContent === "HPT"
            ? "HP/T"
            : overlayContent === "AI"
              ? "AI 코칭"
              : ""
        }
        panelStyle={{
          maxHeight: "70vh",
          overflowY: "auto",
        }}
      >
        {overlayContent === "HPT" && (
          <div style={{ color: "#334155", fontSize: "14px" }}>
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                타점 (Hit Point)
              </div>
              <div style={{ fontSize: "16px", fontWeight: "bold" }}>
                {opts.hitpoint_clock || "-"}
              </div>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <span style={{ fontWeight: "600" }}>두께:</span> {thicknessForCalc || "-"}
            </div>
            <div>
              <span style={{ fontWeight: "600" }}>회전:</span> {opts.english_tips || "-"}
            </div>
          </div>
        )}
        {overlayContent === "AI" && <UserAiPanel model={userInfoPanel} />}
      </ModalShell>
```
