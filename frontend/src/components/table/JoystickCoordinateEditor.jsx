import React, { useEffect, useRef, useState } from "react";
import { formatRgCoordinateDisplay } from "../../interaction/ballGuideCoordinatePolicy";
import { isCoarsePointerEnvironment } from "../../interaction/ballGuideInteractionPolicy";
import {
  resolveJoystickCoordinateEditorLayout,
  resolveJoystickCoordinateEditorPanelWidth,
} from "./joystickCoordinateEditorLayout";

const FINE_STEP = 0.1;

const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"];

function formatInitial(value) {
  return formatRgCoordinateDisplay(value);
}

function formatFineValue(value) {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function parseFieldValue(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function keypadButtonStyle(layout) {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: layout.keypadButtonPadding,
    borderRadius: 4,
    border: "1px solid #475569",
    background: "#1e293b",
    color: "#f8fafc",
    fontSize: layout.keypadButtonFontSize,
    fontWeight: 600,
    cursor: "pointer",
    touchAction: "manipulation",
    minHeight: layout.keypadTouchTargetMinHeight,
    lineHeight: 1,
    boxSizing: "border-box",
  };
}

function actionButtonStyle(layout, overrides = {}) {
  return {
    ...keypadButtonStyle(layout),
    minHeight: layout.actionTouchTargetMinHeight,
    padding: layout.actionButtonPadding,
    ...overrides,
  };
}

function KeypadButton({ layout, onClick, children, className }) {
  const isCompactVisual =
    layout.keypadButtonMinHeight < layout.keypadTouchTargetMinHeight;
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      style={keypadButtonStyle(layout)}
    >
      {isCompactVisual ? (
        <span
          className="joystick-coordinate-editor__keypad-visual"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: layout.keypadButtonMinHeight,
            lineHeight: 1,
          }}
        >
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export default function JoystickCoordinateEditor({
  mode,
  initialX,
  initialY,
  anchor,
  onApply,
  onCancel,
}) {
  const rootRef = useRef(null);
  const xRef = useRef(null);
  const yRef = useRef(null);
  const isCoarse = isCoarsePointerEnvironment();
  const layout = resolveJoystickCoordinateEditorLayout(isCoarse);
  const [activeField, setActiveField] = useState("x");
  const [xValue, setXValue] = useState(formatInitial(initialX));
  const [yValue, setYValue] = useState(formatInitial(initialY));

  const panelWidth =
    typeof window !== "undefined"
      ? resolveJoystickCoordinateEditorPanelWidth(
          layout,
          window.innerWidth || layout.panelMinWidth
        )
      : layout.panelMinWidth;

  useEffect(() => {
    if (!isCoarse) {
      xRef.current?.focus();
      xRef.current?.select();
    }
  }, [isCoarse]);

  useEffect(() => {
    const onDocPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) {
        onCancel();
      }
    };
    document.addEventListener("pointerdown", onDocPointerDown, true);
    return () => document.removeEventListener("pointerdown", onDocPointerDown, true);
  }, [onCancel]);

  const getActiveValue = () => (activeField === "x" ? xValue : yValue);
  const setActiveValue = (next) => {
    if (activeField === "x") setXValue(next);
    else setYValue(next);
  };

  const appendToActive = (key) => {
    const current = getActiveValue();
    if (key === "." && current.includes(".")) return;
    if (current === "0" && key !== ".") {
      setActiveValue(key);
      return;
    }
    setActiveValue(`${current}${key}`);
  };

  const backspaceActive = () => {
    setActiveValue(getActiveValue().slice(0, -1));
  };

  const clearActive = () => {
    setActiveValue("");
  };

  const nudgeActive = (delta) => {
    const parsed = parseFieldValue(getActiveValue());
    const base = parsed ?? (activeField === "x" ? initialX : initialY);
    if (!Number.isFinite(base)) return;
    setActiveValue(formatFineValue(base + delta));
  };

  const tryApply = () => {
    const parsedX = parseFieldValue(xValue);
    const parsedY = parseFieldValue(yValue);
    if (parsedX == null || parsedY == null) return;
    onApply(parsedX, parsedY);
  };

  const onKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      tryApply();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  const activeFieldStyle = {
    border: "2px solid #38bdf8",
    boxShadow: "0 0 0 2px rgba(56, 189, 248, 0.25)",
  };

  const idleFieldStyle = {
    border: "1px solid #475569",
    boxShadow: "none",
  };

  const fieldBaseStyle = {
    flex: 1,
    minWidth: 0,
    padding: layout.fieldPadding,
    borderRadius: 6,
    background: "#0f172a",
    color: "#f8fafc",
    fontSize: layout.fieldFontSize,
    minHeight: layout.fieldMinHeight,
  };

  return (
    <div
      ref={rootRef}
      className={`joystick-coordinate-editor${
        isCoarse ? " joystick-coordinate-editor--compact" : ""
      }`}
      style={{
        position: "absolute",
        left: anchor.left,
        top: anchor.top,
        zIndex: 40,
        touchAction: "manipulation",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="joystick-coordinate-editor__panel"
        style={{
          background: "rgba(15, 23, 42, 0.98)",
          border: "1px solid rgba(148, 163, 184, 0.45)",
          borderRadius: layout.panelBorderRadius,
          padding: `${layout.panelPadding}px`,
          paddingBottom: layout.panelPaddingBottom,
          minWidth: panelWidth,
          maxWidth: panelWidth,
          boxShadow: "0 10px 28px rgba(0,0,0,0.4)",
          color: "#f8fafc",
          fontSize: layout.bodyFontSize,
        }}
      >
        <div
          style={{
            marginBottom: layout.titleMarginBottom,
            fontWeight: 700,
            fontSize: layout.titleFontSize,
            opacity: 0.9,
          }}
        >
          {mode === "guide" ? "Guide (Rg)" : "Ball (Rg)"}
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: layout.labelGap,
            marginBottom: layout.fieldMarginBottom,
          }}
        >
          <span style={{ width: layout.labelWidth, fontWeight: 600 }}>X</span>
          <input
            ref={xRef}
            type="text"
            inputMode="decimal"
            readOnly={isCoarse}
            value={xValue}
            onChange={(e) => setXValue(e.target.value)}
            onFocus={() => setActiveField("x")}
            onKeyDown={onKeyDown}
            style={{
              ...fieldBaseStyle,
              ...(activeField === "x" ? activeFieldStyle : idleFieldStyle),
            }}
          />
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: layout.labelGap,
            marginBottom: layout.yFieldMarginBottom,
          }}
        >
          <span style={{ width: layout.labelWidth, fontWeight: 600 }}>Y</span>
          <input
            ref={yRef}
            type="text"
            inputMode="decimal"
            readOnly={isCoarse}
            value={yValue}
            onChange={(e) => setYValue(e.target.value)}
            onFocus={() => setActiveField("y")}
            onKeyDown={onKeyDown}
            style={{
              ...fieldBaseStyle,
              ...(activeField === "y" ? activeFieldStyle : idleFieldStyle),
            }}
          />
        </label>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: layout.keypadGap,
            marginBottom: layout.keypadMarginBottom,
          }}
        >
          {KEYPAD_KEYS.map((key) => (
            <KeypadButton
              key={key}
              layout={layout}
              className="joystick-coordinate-editor__keypad-btn"
              onClick={() => appendToActive(key)}
            >
              {key}
            </KeypadButton>
          ))}
          <KeypadButton
            layout={layout}
            className="joystick-coordinate-editor__keypad-btn"
            onClick={backspaceActive}
          >
            ⌫
          </KeypadButton>
          <KeypadButton
            layout={layout}
            className="joystick-coordinate-editor__keypad-btn"
            onClick={clearActive}
          >
            Clear
          </KeypadButton>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: layout.fineNudgeGap,
            marginBottom: layout.fineNudgeMarginBottom,
          }}
        >
          <KeypadButton
            layout={layout}
            className="joystick-coordinate-editor__fine-nudge-btn"
            onClick={() => nudgeActive(-FINE_STEP)}
          >
            {activeField.toUpperCase()} −0.1
          </KeypadButton>
          <KeypadButton
            layout={layout}
            className="joystick-coordinate-editor__fine-nudge-btn"
            onClick={() => nudgeActive(FINE_STEP)}
          >
            {activeField.toUpperCase()} +0.1
          </KeypadButton>
        </div>

        <div
          style={{
            display: "flex",
            gap: layout.actionGap,
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            className="joystick-coordinate-editor__apply-btn"
            onClick={tryApply}
            style={actionButtonStyle(layout, {
              border: "none",
              background: "#38bdf8",
              color: "#0f172a",
            })}
          >
            Apply
          </button>
          <button
            type="button"
            className="joystick-coordinate-editor__cancel-btn"
            onClick={onCancel}
            style={actionButtonStyle(layout, {
              background: "transparent",
            })}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
