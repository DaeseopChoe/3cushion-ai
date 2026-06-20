import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import App from "../App";
/** @typedef {import("../domain/userDisplayFlags").UserTableDisplayMode} UserTableDisplayMode */
/** @typedef {import("../domain/userDisplayFlags").TrajectoryCardSource} TrajectoryCardSource */

const STAGE_RATIO = 2.33;

const SLOT_IDS = ["S1", "S2", "S3"];
const USER_STRATEGY_SLOT_IDS = ["S1", "S2", "S3"];
const USER_STRATEGY_PLACEHOLDERS = {
  S1: "공략1",
  S2: "공략2",
  S3: "공략3",
};
const ADMIN_FUNC_IDS = ["SYS", "HP/T", "STR", "AI"];
const USER_FUNC_IDS = ["AI", "TRAJECTORY", "SYSTEM_VALUES", "SYSTEM_LESSON", "HP/T"];

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
  { id: "TRAJECTORY", label: "동선분석", type: "info" },
  { id: "SYSTEM_VALUES", label: "시스템값", type: "info" },
  { id: "SYSTEM_LESSON", label: "시스템레슨", type: "info" },
  { id: "HP/T", label: "두께/타점", type: "info" },
];

const STRATEGY_DISPLAY_SUFFIX_RE = /[①②③]$/;
const USER_STRATEGY_VARIANT_COLORS = [
  { bg: "#10b981", active: "#047857" },
  { bg: "#14b8a6", active: "#0f766e" },
  { bg: "#06b6d4", active: "#0891b2" },
];

const USER_LAYOUT = {
  leftPadBoost: 0.24,
  stageMarginLeftRatio: 0.035,
  /** 2.38 × 0.84 — compact retune: rail width */
  buttonRatioScale: 1.9992,
  /** 1.9 × 0.84 — compact retune: USER overflow button floor */
  buttonRatioFloor: 1.596,
  /** 0.84 × 0.75 — compact retune: button height */
  buttonHeightScale: 0.63,
  /** 0.88 × 0.80 — compact retune: label type */
  buttonFontScale: 0.704,
  /** strategy minHeight floor; height grows via auto when label wraps */
  strategyHeightScale: 1.0,
  /** info BUTTON_FONT 대비 strategy 전용 (~6% 축소) */
  strategyFontScale: 0.94,
  /** strategy 2-line clamp target */
  strategyLineHeight: 1.06,
  buttonGapScale: 0.88,
  groupGapScale: 2.125,
  strategySlotCount: 3,
};

/** DEV-only: ?railVerify=1line | 2line | mixed | variants */
function getRailVerifyMockLabels() {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  const mode = new URLSearchParams(window.location.search).get("railVerify");
  if (mode === "1line") {
    return {
      S1: { slotId: "S1", label: "뒤돌리기" },
      S2: { slotId: "S2", label: "옆돌리기" },
      S3: { slotId: "S3", label: "빗겨치기" },
    };
  }
  if (mode === "2line") {
    return {
      S1: { slotId: "S1", label: "뒤돌리기 대회전" },
      S2: { slotId: "S2", label: "횡단 더블레일" },
      S3: { slotId: "S3", label: "초장축 앞돌리기" },
    };
  }
  if (mode === "mixed") {
    return {
      S1: { slotId: "S1", label: "뒤돌리기" },
      S2: { slotId: "S2", label: "뒤돌리기 대회전" },
      S3: { slotId: "S3", label: "횡단 더블레일" },
    };
  }
  if (mode === "variants") {
    return {
      S1: { slotId: "S1", label: "뒤돌리기①" },
      S2: { slotId: "S2", label: "뒤돌리기②" },
      S3: { slotId: "S3", label: "횡단 더블레일" },
    };
  }
  return null;
}

function stripStrategyDisplaySuffix(label) {
  return label.replace(STRATEGY_DISPLAY_SUFFIX_RE, "");
}

function enrichUserStrategyRailItems(items) {
  const seenBase = new Map();
  return items.map((item) => {
    const displayLabel = stripStrategyDisplaySuffix(item.label);
    const variantIndex = seenBase.get(displayLabel) ?? 0;
    seenBase.set(displayLabel, variantIndex + 1);
    return { ...item, displayLabel, variantIndex };
  });
}

function getUserStrategyButtonColor(variantIndex, isSelected) {
  const palette =
    USER_STRATEGY_VARIANT_COLORS[variantIndex] ?? USER_STRATEGY_VARIANT_COLORS[0];
  return isSelected ? palette.active : palette.bg;
}

function computeStageMetrics(vw, vh, appMode) {
  let stageH_try = vh;
  let stageW_try = vh * STAGE_RATIO;

  let stageW;
  let stageH;
  let leftPadRatio = 0.8;
  let centerPadRatio = 0.3;
  let rightPadRatio = 0.5;
  let buttonRatio = 1.9;
  let tableRatio = 20;
  let buttonRatioDesired = buttonRatio;

  if (appMode === "USER") {
    leftPadRatio += USER_LAYOUT.leftPadBoost;
    buttonRatio *= USER_LAYOUT.buttonRatioScale;
    buttonRatioDesired = buttonRatio;
  }

  const totalRatio =
    () => leftPadRatio + buttonRatio + centerPadRatio + tableRatio + rightPadRatio;
  const ratioExcess = (availableW) =>
    Math.max(0, (totalRatio() * stageH_try - availableW) / stageH_try);

  if (stageW_try <= vw) {
    stageW = stageW_try;
    stageH = stageH_try;
  } else {
    const availableW = vw;

    let overflowRatio = (stageW_try - availableW) / stageH_try;

    const centerReduction = Math.min(centerPadRatio, overflowRatio);
    centerPadRatio = Math.max(0, centerPadRatio - centerReduction);
    overflowRatio -= centerReduction;

    if (appMode === "USER") {
      const USER_TABLE_RATIO_MIN = 17;
      const USER_PAD_RATIO_MIN = 0.2;
      const USER_BUTTON_RATIO_MIN = USER_LAYOUT.buttonRatioFloor;

      let excess = ratioExcess(availableW);

      if (excess > 0) {
        const tableShrink = Math.min(tableRatio - USER_TABLE_RATIO_MIN, excess);
        tableRatio -= tableShrink;
        excess = ratioExcess(availableW);
      }

      if (excess > 0) {
        const padShrinkable =
          Math.max(0, leftPadRatio - USER_PAD_RATIO_MIN) +
          Math.max(0, rightPadRatio - USER_PAD_RATIO_MIN);
        const padShrink = Math.min(padShrinkable, excess);
        leftPadRatio = Math.max(USER_PAD_RATIO_MIN, leftPadRatio - padShrink / 2);
        rightPadRatio = Math.max(USER_PAD_RATIO_MIN, rightPadRatio - padShrink / 2);
        excess = ratioExcess(availableW);
      }

      if (excess > 0) {
        buttonRatio = Math.max(USER_BUTTON_RATIO_MIN, buttonRatio - excess);
      }

      if (totalRatio() * stageH_try > availableW) {
        stageW = availableW;
        stageH = stageW / STAGE_RATIO;
      } else {
        stageW = stageW_try;
        stageH = stageH_try;
      }
    } else if (totalRatio() * stageH_try > availableW) {
      const excessRatio = ratioExcess(availableW);
      const padReduction = excessRatio / 2;

      leftPadRatio = Math.max(0.2, leftPadRatio - padReduction);
      rightPadRatio = Math.max(0.2, rightPadRatio - padReduction);

      if (totalRatio() * stageH_try > availableW) {
        const stillExcess = ratioExcess(availableW);
        buttonRatio = Math.max(1.2, buttonRatio - stillExcess);

        if (totalRatio() * stageH_try > availableW) {
          stageW = availableW;
          stageH = stageW / STAGE_RATIO;
        } else {
          stageW = stageW_try;
          stageH = stageH_try;
        }
      } else {
        stageW = stageW_try;
        stageH = stageH_try;
      }
    } else {
      stageW = stageW_try;
      stageH = stageH_try;
    }
  }

  const UNIT =
    stageW / (leftPadRatio + buttonRatio + centerPadRatio + tableRatio + rightPadRatio);

  const isUser = appMode === "USER";
  const heightFactor = isUser ? 0.65 * USER_LAYOUT.buttonHeightScale : 0.65;
  const fontFactor = isUser ? 0.28 * USER_LAYOUT.buttonFontScale : 0.28;

  const metricsOut = {
    stageW,
    stageH,
    buttonRatioFinal: buttonRatio,
    LEFT_PAD: UNIT * leftPadRatio,
    BUTTON_W: UNIT * buttonRatio,
    CENTER_PAD: UNIT * centerPadRatio,
    TABLE_W: UNIT * tableRatio,
    RIGHT_PAD: UNIT * rightPadRatio,
    BUTTON_HEIGHT: UNIT * buttonRatio * heightFactor,
    BUTTON_FONT: UNIT * buttonRatio * fontFactor,
    BUTTON_GAP:
      UNIT * buttonRatio * 0.22 * (isUser ? USER_LAYOUT.buttonGapScale : 1),
    USER_STAGE_MARGIN_LEFT: isUser ? stageW * USER_LAYOUT.stageMarginLeftRatio : 0,
  };


  return metricsOut;
}

function computeAdminRailHeight(stageH, buttonCount, buttonHeight, buttonGap, buttonW) {
  let gap = buttonGap;
  let total = buttonHeight * buttonCount + gap * Math.max(0, buttonCount - 1);
  if (total > stageH * 0.95) {
    gap = Math.max(
      buttonW * 0.08,
      (stageH * 0.95 - buttonHeight * buttonCount) / Math.max(1, buttonCount - 1)
    );
    total = buttonHeight * buttonCount + gap * Math.max(0, buttonCount - 1);
  }
  return { buttonGap: gap, totalButtonHeight: total };
}

function computeUserRailHeight(
  stageH,
  strategyCount,
  infoCount,
  buttonHeight,
  strategyButtonHeight,
  buttonGap,
  groupGap,
  buttonW
) {
  let gap = buttonGap;
  let group = groupGap;

  const sectionHeight = (count, itemH) =>
    count <= 0 ? 0 : count * itemH + gap * Math.max(0, count - 1);

  const calcTotal = () => {
    const searchH = buttonHeight;
    const strategyH = sectionHeight(strategyCount, strategyButtonHeight);
    const infoH = sectionHeight(infoCount, buttonHeight);
    const groupGaps = group * 2;
    return searchH + strategyH + infoH + groupGaps;
  };

  let total = calcTotal();
  if (total > stageH * 0.95) {
    group = Math.max(buttonW * 0.06, group * 0.65);
    total = calcTotal();
  }
  if (total > stageH * 0.95) {
    gap = Math.max(
      buttonW * 0.06,
      (stageH * 0.95 -
        buttonHeight * (1 + infoCount) -
        strategyButtonHeight * strategyCount -
        group * 2) /
        Math.max(1, Math.max(0, strategyCount - 1) + Math.max(0, infoCount - 1))
    );
    total = calcTotal();
  }

  return { buttonGap: gap, groupGap: group, totalButtonHeight: total };
}

export default function Stage({ onSearchStrategies, onOpenHistory, onCloseUserOverlay }) {
  const STAGE_BUILD_ID = "user-rail-stage-v2026-05";
  const userSearchHandlerRef = useRef(null);
  const userSearchResetHandlerRef = useRef(null);
  const adminSearchHandlerRef = useRef(null);
  const userStrategySlotPickRef = useRef(null);
  const userRailActions = useMemo(() => ({}), []);
  const [viewport, setViewport] = useState({ vw: 0, vh: 0 });
  const [currentButtonId, setCurrentButtonId] = useState("S1");
  const [activeSlot, setActiveSlot] = useState("S1");
  const [dirtySlotIds, setDirtySlotIds] = useState([]);
  const [appMode, setAppMode] = useState("USER");
  const [strategyButtons, setStrategyButtons] = useState([]);
  const [systemControlsAvailable, setSystemControlsAvailable] = useState(false);
  const [userTableDisplayMode, setUserTableDisplayMode] = useState(
    /** @type {UserTableDisplayMode} */ ("default")
  );
  const [trajectoryCardSource, setTrajectoryCardSource] = useState(
    /** @type {TrajectoryCardSource} */ ("baseline")
  );
  const resetUserTableDisplayMode = useCallback(() => {
    setUserTableDisplayMode("default");
    setTrajectoryCardSource("baseline");
  }, []);

  useEffect(() => {
    const calc = () => {
      setViewport({ vw: window.innerWidth, vh: window.innerHeight });
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);


  const { vw, vh } = viewport;
  if (!vw || !vh) return null;

  const metrics = computeStageMetrics(vw, vh, appMode);
  const {
    stageW,
    stageH,
    LEFT_PAD,
    BUTTON_W,
    CENTER_PAD,
    TABLE_W,
    RIGHT_PAD,
    BUTTON_HEIGHT,
    BUTTON_FONT,
    USER_STAGE_MARGIN_LEFT,
  } = metrics;

  let BUTTON_GAP = metrics.BUTTON_GAP;
  const STRATEGY_BUTTON_HEIGHT = BUTTON_HEIGHT * USER_LAYOUT.strategyHeightScale;
  let USER_GROUP_GAP = BUTTON_GAP * USER_LAYOUT.groupGapScale;
  const USER_BTN_PAD_X = Math.max(6, BUTTON_W * 0.04);
  const USER_BTN_PAD_Y = Math.max(5, BUTTON_HEIGHT * 0.07);
  const USER_STRATEGY_PAD_X = Math.max(12, BUTTON_W * 0.1);
  const USER_STRATEGY_PAD_Y = Math.max(6, STRATEGY_BUTTON_HEIGHT * 0.08);

  const strategyBySlot = Object.fromEntries(
    strategyButtons.map((item) => [item.slotId, item])
  );
  const railVerifyMock = getRailVerifyMockLabels();
  const userStrategyRailItems = enrichUserStrategyRailItems(
    USER_STRATEGY_SLOT_IDS.map((slotId) => {
      const recall = railVerifyMock?.[slotId] ?? strategyBySlot[slotId];
      const hasRecall = railVerifyMock ? !!recall : !!recall?.hasRecall;
      return {
        id: slotId,
        label: hasRecall
          ? (recall?.label ?? USER_STRATEGY_PLACEHOLDERS[slotId])
          : USER_STRATEGY_PLACEHOLDERS[slotId],
        hasRecall,
      };
    })
  );
  const USER_RAIL_BUTTON_FONT = BUTTON_FONT * 0.88;
  const USER_RAIL_BUTTON_LINE_HEIGHT = 1.15;
  const STRATEGY_BUTTON_FONT = USER_RAIL_BUTTON_FONT;
  const STRATEGY_TWO_LINE_MAX_HEIGHT =
    BUTTON_FONT * USER_LAYOUT.strategyFontScale * USER_LAYOUT.strategyLineHeight * 2 +
    USER_STRATEGY_PAD_Y * 2;

  const userCompactBtnStyle = {
    width: "100%",
    minHeight: BUTTON_HEIGHT,
    height: "auto",
    flexShrink: 0,
    fontSize: USER_RAIL_BUTTON_FONT,
    fontWeight: "600",
    lineHeight: USER_RAIL_BUTTON_LINE_HEIGHT,
    boxSizing: "border-box",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  };

  const userInfoBtnStyle = {
    ...userCompactBtnStyle,
    padding: `${USER_BTN_PAD_Y}px ${USER_BTN_PAD_X}px`,
    whiteSpace: "nowrap",
    lineHeight: USER_RAIL_BUTTON_LINE_HEIGHT,
  };

  const userStrategyBtnStyle = {
    width: "100%",
    minHeight: STRATEGY_BUTTON_HEIGHT,
    maxHeight: STRATEGY_TWO_LINE_MAX_HEIGHT,
    height: "auto",
    flexShrink: 0,
    fontSize: STRATEGY_BUTTON_FONT,
    padding: `${USER_STRATEGY_PAD_Y}px ${USER_STRATEGY_PAD_X}px`,
    boxSizing: "border-box",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    fontWeight: "600",
    whiteSpace: "normal",
    lineHeight: USER_RAIL_BUTTON_LINE_HEIGHT,
    wordBreak: "keep-all",
    overflow: "hidden",
  };

  const adminButtons = [...ADMIN_SHOT_BUTTONS, ...ADMIN_FUNC_BUTTONS];
  const adminFuncIds = ADMIN_FUNC_IDS;
  const adminRailButtonCount = 1 + adminButtons.length;

  let totalButtonHeight;
  if (appMode === "ADMIN") {
    const adminSizing = computeAdminRailHeight(
      stageH,
      adminRailButtonCount,
      BUTTON_HEIGHT,
      BUTTON_GAP,
      BUTTON_W
    );
    BUTTON_GAP = adminSizing.buttonGap;
    totalButtonHeight = adminSizing.totalButtonHeight;
  } else {
    const userSizing = computeUserRailHeight(
      stageH,
      USER_LAYOUT.strategySlotCount,
      USER_FUNC_BUTTONS.length,
      BUTTON_HEIGHT,
      STRATEGY_BUTTON_HEIGHT,
      BUTTON_GAP,
      USER_GROUP_GAP,
      BUTTON_W
    );
    BUTTON_GAP = userSizing.buttonGap;
    USER_GROUP_GAP = userSizing.groupGap;
    totalButtonHeight = userSizing.totalButtonHeight;
  }

  const getButtonColor = (id, isSlotSelected, isFuncSelected) => {
    if (id === "SEARCH") return "#4f46e5";
    if (id === "AI") return isFuncSelected ? "#c2410c" : "#ea580c";
    if (["SYS", "HP/T", "STR", "TRAJECTORY", "SYSTEM_VALUES", "SYSVAL", "HISTORY", "SYSTEM_LESSON"].includes(id)) {
      return isFuncSelected ? "#d97706" : "#f59e0b";
    }
    return isSlotSelected ? "#047857" : "#10b981";
  };

  const getSlotIndicator = (slotId, isDirty) => {
    if (appMode === "ADMIN") return isDirty;
    return false;
  };

  const renderAdminRail = () => (
    <div
      style={{
        width: BUTTON_W,
        maxHeight: stageH,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: BUTTON_GAP,
      }}
    >
      <button
        type="button"
        data-stage-build={STAGE_BUILD_ID}
        data-user-info-btn="SEARCH"
        title="로컬 작업 DB 검색 (positions_dataset)"
        onClick={() => {
          adminSearchHandlerRef.current?.();
        }}
        style={{
          height: BUTTON_HEIGHT,
          fontSize: BUTTON_FONT,
          padding: 0,
          background: getButtonColor("SEARCH", false, false),
          color: "#ffffff",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "700",
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
      >
        로컬DB
      </button>
      {adminButtons.map(({ id, label, type }) => {
        const isShotButton = type === "shot";
        const isSlotSelected = isShotButton && activeSlot === id;
        const isFuncSelected =
          adminFuncIds.includes(id) && currentButtonId === id;
        const borderStyle = isSlotSelected
          ? "3px solid #ef4444"
          : isFuncSelected
            ? "3px solid #fff"
            : "none";
        const isDirty = SLOT_IDS.includes(id) && dirtySlotIds.includes(id);
        const hasIndicator =
          appMode === "ADMIN" && isShotButton && getSlotIndicator(id, isDirty);
        const displayLabel = hasIndicator ? `${label} ●` : label;
        const slotColorClass =
          appMode === "ADMIN" && hasIndicator ? "slot-dirty" : "slot-normal";
        const slotTooltip =
          appMode === "ADMIN" && isShotButton
            ? hasIndicator
              ? "적용되지 않은 변경 있음"
              : ""
            : "";
        const funcDisabled =
          appMode === "ADMIN" && ADMIN_FUNC_IDS.includes(id) && !systemControlsAvailable;
        return (
          <button
            key={id}
            type="button"
            title={slotTooltip}
            disabled={funcDisabled}
            onClick={() => {
              if (funcDisabled) return;
              setCurrentButtonId(id);
            }}
            className={isShotButton ? slotColorClass : ""}
            style={{
              height: BUTTON_HEIGHT,
              fontSize: BUTTON_FONT,
              padding: 0,
              background: getButtonColor(id, isSlotSelected, isFuncSelected),
              color: slotColorClass === "slot-dirty" ? "#ffd54f" : "#ffffff",
              border: borderStyle,
              borderRadius: "6px",
              cursor: funcDisabled ? "not-allowed" : "pointer",
              fontWeight: "700",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxSizing: "border-box",
              opacity: funcDisabled ? 0.45 : 1,
            }}
          >
            {displayLabel}
          </button>
        );
      })}
    </div>
  );

  const renderUserFuncButton = ({ id, label }) => {
    const isTrajectoryBtn = id === "TRAJECTORY";
    const isSystemValuesBtn = id === "SYSTEM_VALUES";
    const isDisplayModeBtn = isTrajectoryBtn || isSystemValuesBtn;
    const isHistoryButton = id === "HISTORY";
    const isFuncSelected =
      USER_FUNC_IDS.includes(id) && currentButtonId === id;

    const displayModeActive =
      (isTrajectoryBtn && userTableDisplayMode === "trajectory") ||
      (isSystemValuesBtn && userTableDisplayMode === "systemValues");

    const btnBackground = isDisplayModeBtn
      ? displayModeActive
        ? isTrajectoryBtn
          ? "#0ea5e9"
          : "#8b5cf6"
        : getButtonColor(id, false, false)
      : getButtonColor(id, false, isFuncSelected);

    return (
      <button
        key={id}
        type="button"
        data-stage-build={STAGE_BUILD_ID}
        data-user-info-btn={id}
        data-user-display-mode={
          isDisplayModeBtn ? userTableDisplayMode : undefined
        }
        className={
          [
            isDisplayModeBtn ? "user-display-mode-btn" : "",
            id === "SYSTEM_LESSON" ? "user-rail-btn--system-lesson" : "",
          ]
            .filter(Boolean)
            .join(" ") || undefined
        }
        title={
          isTrajectoryBtn
            ? "동선분석 — 기준/보정 궤적과 계산값"
            : isSystemValuesBtn
              ? "시스템값 — 레일·프레임 눈금 학습"
              : label
        }
        aria-label={label}
        aria-pressed={isDisplayModeBtn ? displayModeActive : isFuncSelected ? true : undefined}
        onClick={() => {
          if (isTrajectoryBtn) {
            setUserTableDisplayMode((prev) =>
              prev === "trajectory" ? "default" : "trajectory"
            );
            setCurrentButtonId("TRAJECTORY");
            (
              onCloseUserOverlay ??
              userRailActions.dismissOverlayPanel ??
              userRailActions.closeOverlay
            )?.();
            return;
          }
          if (isSystemValuesBtn) {
            setUserTableDisplayMode((prev) =>
              prev === "systemValues" ? "default" : "systemValues"
            );
            setCurrentButtonId("SYSTEM_VALUES");
            (
              onCloseUserOverlay ??
              userRailActions.dismissOverlayPanel ??
              userRailActions.closeOverlay
            )?.();
            return;
          }
          resetUserTableDisplayMode();
          setCurrentButtonId(id);
          if (isHistoryButton) {
            (onOpenHistory ?? userRailActions.openHistory)?.();
            return;
          }
        }}
        style={{
          ...userInfoBtnStyle,
          background: btnBackground,
          color: "#ffffff",
          border: isFuncSelected || displayModeActive ? "3px solid #fff" : "none",
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
  };

  const renderUserRail = () => {
    const groupSpacerStyle = { height: USER_GROUP_GAP, flexShrink: 0 };
    const userRailSectionStyle = {
      display: "flex",
      flexDirection: "column",
      gap: BUTTON_GAP,
      width: "100%",
    };

    return (
      <div
        data-user-rail="1"
        data-stage-build={STAGE_BUILD_ID}
        style={{
          width: BUTTON_W,
          maxHeight: stageH,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: "center",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <div style={userRailSectionStyle}>
          <button
            type="button"
            data-stage-build={STAGE_BUILD_ID}
            data-user-info-btn="SEARCH"
            title="공략 검색"
            onClick={() => {
              resetUserTableDisplayMode();
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
              lineHeight: USER_RAIL_BUTTON_LINE_HEIGHT,
            }}
          >
            Search
          </button>
        </div>

        <div aria-hidden="true" style={groupSpacerStyle} />

        <div style={userRailSectionStyle}>
          {userStrategyRailItems.map(
            ({ id, label, displayLabel, variantIndex, hasRecall }) => {
            const isEnabled = hasRecall;
            const isSlotSelected = isEnabled && activeSlot === id;
            return (
              <button
                key={id}
                type="button"
                disabled={!isEnabled}
                title={
                  isEnabled
                    ? label
                    : `${USER_STRATEGY_PLACEHOLDERS[id]} — Search 후 활성화`
                }
                onClick={() => {
                  if (!isEnabled) return;
                  resetUserTableDisplayMode();
                  userStrategySlotPickRef.current?.(id);
                  setCurrentButtonId(id);
                }}
                style={{
                  ...userStrategyBtnStyle,
                  background: isEnabled
                    ? getUserStrategyButtonColor(variantIndex, isSlotSelected)
                    : "#334155",
                  color: isEnabled ? "#ffffff" : "#94a3b8",
                  border: isSlotSelected ? "3px solid #ef4444" : "none",
                  cursor: isEnabled ? "pointer" : "not-allowed",
                  opacity: isEnabled ? 1 : 0.72,
                }}
              >
                {displayLabel}
              </button>
            );
          }
          )}
        </div>

        <div aria-hidden="true" style={groupSpacerStyle} />

        <div style={userRailSectionStyle}>
          {USER_FUNC_BUTTONS.map(renderUserFuncButton)}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        width: "100vw",
        maxWidth: "100vw",
        height: "100vh",
        overflowX: "hidden",
        background: "#0f172a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        data-stage-inner="1"
        data-stage-build={STAGE_BUILD_ID}
        style={{
          width: stageW,
          height: stageH,
          display: "flex",
          alignItems: "center",
          marginLeft: USER_STAGE_MARGIN_LEFT,
        }}
      >
        <div style={{ width: LEFT_PAD, flexShrink: 0 }} />

        {appMode === "ADMIN" ? renderAdminRail() : renderUserRail()}

        <div style={{ width: CENTER_PAD, flexShrink: 0 }} />

        <div
          style={{
            width: TABLE_W,
            height: stageH,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <App
            currentButtonId={currentButtonId}
            userTableDisplayMode={userTableDisplayMode}
            trajectoryCardSource={trajectoryCardSource}
            onTrajectoryCardSourceChange={setTrajectoryCardSource}
            onActiveSlotChange={setActiveSlot}
            onFuncOverlayClose={() => {
              resetUserTableDisplayMode();
              setCurrentButtonId(activeSlot);
            }}
            onDirtySlotsChange={setDirtySlotIds}
            onAppModeChange={setAppMode}
            onStrategyButtonsChange={setStrategyButtons}
            onSystemControlsAvailabilityChange={setSystemControlsAvailable}
            onUserSearchStrategiesRegister={(fn) => {
              userSearchHandlerRef.current = fn ?? null;
            }}
            onUserSearchResetRegister={(fn) => {
              userSearchResetHandlerRef.current = fn ?? null;
            }}
            onAdminSearchRegister={(fn) => {
              adminSearchHandlerRef.current = fn ?? null;
            }}
            onUserFuncButtonSelect={setCurrentButtonId}
            onUserStrategySlotPickRegister={(fn) => {
              userStrategySlotPickRef.current = fn ?? null;
            }}
            userRailActions={userRailActions}
          />
        </div>

        <div style={{ width: RIGHT_PAD, flexShrink: 0 }} />
      </div>
    </div>
  );
}
