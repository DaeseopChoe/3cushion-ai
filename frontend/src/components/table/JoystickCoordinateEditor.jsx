import React, { useEffect, useRef, useState } from "react";
import { formatRgCoordinateDisplay } from "../../interaction/ballGuideCoordinatePolicy";

const FINE_STEP = 0.1;

function formatInitial(value) {
  return formatRgCoordinateDisplay(value);
}

function formatFineValue(value) {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function isCoarsePointerEnvironment() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

function parseFieldValue(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"];

const btnStyle = {
  padding: "10px 0",
  borderRadius: 6,
  border: "1px solid #475569",
  background: "#1e293b",
  color: "#f8fafc",
  fontSize: 18,
  fontWeight: 600,
  cursor: "pointer",
  touchAction: "manipulation",
  minHeight: 44,
};

const activeFieldStyle = {
  border: "2px solid #38bdf8",
  boxShadow: "0 0 0 2px rgba(56, 189, 248, 0.25)",
};

const idleFieldStyle = {
  border: "1px solid #475569",
  boxShadow: "none",
};

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
  const preferBuiltInKeypad = isCoarsePointerEnvironment();
  const [activeField, setActiveField] = useState("x");
  const [xValue, setXValue] = useState(formatInitial(initialX));
  const [yValue, setYValue] = useState(formatInitial(initialY));

  useEffect(() => {
    if (!preferBuiltInKeypad) {
      xRef.current?.focus();
      xRef.current?.select();
    }
  }, [preferBuiltInKeypad]);

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

  const fieldBaseStyle = {
    flex: 1,
    minWidth: 0,
    padding: "8px 10px",
    borderRadius: 6,
    background: "#0f172a",
    color: "#f8fafc",
    fontSize: 18,
  };

  return (
    <div
      ref={rootRef}
      className="joystick-coordinate-editor"
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
          borderRadius: 10,
          padding: "16px 16px 14px",
          minWidth: 336,
          boxShadow: "0 10px 28px rgba(0,0,0,0.4)",
          color: "#f8fafc",
          fontSize: 16,
        }}
      >
        <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 14, opacity: 0.9 }}>
          {mode === "guide" ? "Guide (Rg)" : "Ball (Rg)"}
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 8,
          }}
        >
          <span style={{ width: 18, fontWeight: 600 }}>X</span>
          <input
            ref={xRef}
            type="text"
            inputMode="decimal"
            readOnly={preferBuiltInKeypad}
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
            gap: 10,
            marginBottom: 12,
          }}
        >
          <span style={{ width: 18, fontWeight: 600 }}>Y</span>
          <input
            ref={yRef}
            type="text"
            inputMode="decimal"
            readOnly={preferBuiltInKeypad}
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
            gap: 8,
            marginBottom: 8,
          }}
        >
          {KEYPAD_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => appendToActive(key)}
              style={btnStyle}
            >
              {key}
            </button>
          ))}
          <button type="button" onClick={backspaceActive} style={btnStyle}>
            ⌫
          </button>
          <button type="button" onClick={clearActive} style={btnStyle}>
            Clear
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <button
            type="button"
            onClick={() => nudgeActive(-FINE_STEP)}
            style={btnStyle}
          >
            {activeField.toUpperCase()} −0.1
          </button>
          <button
            type="button"
            onClick={() => nudgeActive(FINE_STEP)}
            style={btnStyle}
          >
            {activeField.toUpperCase()} +0.1
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={tryApply}
            style={{
              ...btnStyle,
              padding: "8px 18px",
              border: "none",
              background: "#38bdf8",
              color: "#0f172a",
            }}
          >
            Apply
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              ...btnStyle,
              padding: "8px 18px",
              background: "transparent",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
