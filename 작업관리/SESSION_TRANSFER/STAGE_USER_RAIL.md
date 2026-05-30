# FILE

`STAGE_USER_RAIL.md`

# PURPOSE

STEP 2-3 USER Search / hydrate stabilization DEBUG용.  
`frontend/src/components/Stage.jsx`에서 USER rail·Search·History·BASELINE·active border·App wiring 구간만 발췌.

# SOURCE

- **Source file path**: `frontend/src/components/Stage.jsx`
- **Extracted date**: 2026-05-23
- **Repo**: `D:/3Cushion AI`

---

# EXTRACTED SECTIONS

## USER_FUNC_IDS / USER_FUNC_BUTTONS

- **source path**: `frontend/src/components/Stage.jsx`
- **line range**: 13–34

```javascript
const ADMIN_FUNC_IDS = ["SYS", "HP/T", "STR", "AI"];
const USER_FUNC_IDS = ["AI", "HP/T", "BASELINE", "HISTORY"];

const COACH_BUTTON = { id: "COACH", label: "코칭", type: "coach" };
const ADMIN_SHOT_BUTTONS = [
  { id: "S1", label: "S1", type: "shot" },
  { id: "S2", label: "S2", type: "shot" },
  { id: "S3", label: "S3", type: "shot" },
];
const ADMIN_FUNC_BUTTONS = [
  { id: "SYS", label: "SYS", type: "info" },
  { id: "HP/T", label: "HP/T", type: "info" },
  { id: "STR", label: "STR", type: "info" },
  { id: "AI", label: "AI", type: "info" },
];
/** USER info layer labels (ids unchanged for trigger compatibility where mapped). */
const USER_FUNC_BUTTONS = [
  { id: "AI", label: "AI", type: "info" },
  { id: "HP/T", label: "두께/타점", type: "info" },
  { id: "BASELINE", label: "기준값", type: "info" },
  { id: "HISTORY", label: "History", type: "info" },
];
```

---

## Stage component state + refs

- **source path**: `frontend/src/components/Stage.jsx`
- **line range**: 338–349

```javascript
export default function Stage({ onSearchStrategies, onOpenHistory, onCloseUserOverlay }) {
  const STAGE_BUILD_ID = "user-rail-stage-v2026-05";
  const userSearchHandlerRef = useRef(null);
  const userRailActions = useMemo(() => ({}), []);
  const [viewport, setViewport] = useState({ vw: 0, vh: 0 });
  const [currentButtonId, setCurrentButtonId] = useState("S1");
  const [activeSlot, setActiveSlot] = useState("S1");
  const [dirtySlotIds, setDirtySlotIds] = useState([]);
  const [appMode, setAppMode] = useState("USER");
  const [strategyButtons, setStrategyButtons] = useState([]);
  const [systemControlsAvailable, setSystemControlsAvailable] = useState(false);
  const [userGuideLayersActive, setUserGuideLayersActive] = useState(false);
```

---

## getButtonColor (active border color source)

- **source path**: `frontend/src/components/Stage.jsx`
- **line range**: 590–598

```javascript
  const getButtonColor = (id, isSlotSelected, isFuncSelected) => {
    if (id === "COACH") return isFuncSelected ? "#2563eb" : "#3b82f6";
    if (id === "SEARCH") return "#4f46e5";
    if (id === "AI") return isFuncSelected ? "#c2410c" : "#ea580c";
    if (["SYS", "HP/T", "STR", "BASELINE", "SYSVAL", "HISTORY"].includes(id)) {
      return isFuncSelected ? "#d97706" : "#f59e0b";
    }
    return isSlotSelected ? "#047857" : "#10b981";
  };
```

---

## renderUserFuncButton (History / BASELINE / HP-T / active border)

- **source path**: `frontend/src/components/Stage.jsx`
- **line range**: 677–721

```javascript
  const renderUserFuncButton = ({ id, label }) => {
    const isGuideToggle = id === "BASELINE";
    const isHistoryButton = id === "HISTORY";
    const isOverlayFunc = id === "AI" || id === "HP/T";
    const isFuncSelected = isGuideToggle
      ? userGuideLayersActive
      : isHistoryButton
        ? false
        : isOverlayFunc
          ? currentButtonId === id
          : USER_FUNC_IDS.includes(id) && currentButtonId === id;

    return (
      <button
        key={id}
        type="button"
        data-stage-build={STAGE_BUILD_ID}
        data-user-info-btn={id}
        title={isGuideToggle ? "기준값 · 시스템값 표시" : label}
        aria-label={label}
        aria-pressed={isGuideToggle ? userGuideLayersActive : undefined}
        onClick={() => {
          if (isGuideToggle) {
            setUserGuideLayersActive((prev) => !prev);
            (onCloseUserOverlay ?? userRailActions.closeOverlay)?.();
            return;
          }
          if (isHistoryButton) {
            (onOpenHistory ?? userRailActions.openHistory)?.();
            return;
          }
          setCurrentButtonId(id);
        }}
        style={{
          ...userInfoBtnStyle,
          background: getButtonColor(id, false, isFuncSelected),
          color: "#ffffff",
          border: isFuncSelected ? "3px solid #fff" : "none",
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
  };
```

---

## renderUserRail — Search click handler

- **source path**: `frontend/src/components/Stage.jsx`
- **line range**: 748–771

```javascript
        <div style={userRailSectionStyle}>
          <button
            type="button"
            data-stage-build={STAGE_BUILD_ID}
            data-user-info-btn="SEARCH"
            title="공략 검색"
            onClick={() => {
              userSearchHandlerRef.current?.();
              onSearchStrategies?.();
            }}
            style={{
              ...userCompactBtnStyle,
              padding: `${USER_BTN_PAD_Y}px ${USER_BTN_PAD_X}px`,
              background: getButtonColor("SEARCH", false, false),
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
              lineHeight: 1.15,
            }}
          >
            Search
          </button>
        </div>
```

---

## renderUserRail — strategy slot click (currentButtonId → S1/S2/S3)

- **source path**: `frontend/src/components/Stage.jsx`
- **line range**: 775–805

```javascript
        <div style={userRailSectionStyle}>
          {userStrategyRailItems.map(({ id, label, displayLabel, variantIndex, hasRecall }) => {
            const isSlotSelected = hasRecall && activeSlot === id;
            return (
              <button
                key={id}
                type="button"
                disabled={!hasRecall}
                title={
                  hasRecall ? label : `${USER_STRATEGY_PLACEHOLDERS[id]} — 검색 후 활성화`
                }
                onClick={() => {
                  if (!hasRecall) return;
                  setCurrentButtonId(id);
                }}
                style={{
                  ...userStrategyBtnStyle,
                  background: hasRecall
                    ? getUserStrategyButtonColor(variantIndex, isSlotSelected)
                    : "#334155",
                  color: hasRecall ? "#ffffff" : "#94a3b8",
                  border: isSlotSelected ? "3px solid #ef4444" : "none",
                  cursor: hasRecall ? "pointer" : "not-allowed",
                  opacity: hasRecall ? 1 : 0.72,
                }}
              >
                {displayLabel}
              </button>
            );
          })}
        </div>
```

---

## renderUserRail — USER_FUNC_BUTTONS map

- **source path**: `frontend/src/components/Stage.jsx`
- **line range**: 809–811

```javascript
        <div style={userRailSectionStyle}>
          {USER_FUNC_BUTTONS.map(renderUserFuncButton)}
        </div>
```

---

## App mount — currentButtonId / overlay close / Search register

- **source path**: `frontend/src/components/Stage.jsx`
- **line range**: 856–869

```javascript
          <App
            currentButtonId={currentButtonId}
            userGuideLayersVisible={userGuideLayersActive}
            onActiveSlotChange={setActiveSlot}
            onFuncOverlayClose={() => setCurrentButtonId(activeSlot)}
            onDirtySlotsChange={setDirtySlotIds}
            onAppModeChange={setAppMode}
            onStrategyButtonsChange={setStrategyButtons}
            onSystemControlsAvailabilityChange={setSystemControlsAvailable}
            onUserSearchStrategiesRegister={(fn) => {
              userSearchHandlerRef.current = fn ?? null;
            }}
            userRailActions={userRailActions}
          />
```
