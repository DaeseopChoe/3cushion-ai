import React from "react";

const DEFAULT_ACTIVE_SCALE = 1.8;
const HIT_PAD_MIN = 12;
const HIT_PAD_MAX = 16;

export default function LabelText({
  x,
  y,
  text,
  color = "#facc15",
  fontSize = 10,
  interactive = false,
  active = false,
  onPointerDown,
  hitDataAttr,
  activeScale = DEFAULT_ACTIVE_SCALE,
}) {
  const hitPad = Math.min(
    HIT_PAD_MAX,
    Math.max(HIT_PAD_MIN, fontSize * 0.85 + 4)
  );
  const textLen = Math.max(String(text ?? "").length, 1);
  const hitW = Math.max(fontSize * 0.75 * textLen + hitPad, hitPad * 2);
  const hitH = fontSize + hitPad * 2;

  const textEl = (
    <text
      x={x}
      y={y}
      fontSize={fontSize}
      fill={color}
      textAnchor="middle"
      dominantBaseline="middle"
      fontWeight={active ? "700" : undefined}
      style={{
        pointerEvents: "none",
        userSelect: "none",
        filter: active ? "drop-shadow(0 0 2px rgba(0,0,0,0.9))" : undefined,
      }}
    >
      {text}
    </text>
  );

  if (!interactive) {
    return textEl;
  }

  const handlePointerDown = (e) => {
    e.stopPropagation();
    onPointerDown?.(e);
  };

  const content = (
    <>
      <rect
        x={x - hitW / 2}
        y={y - hitH / 2}
        width={hitW}
        height={hitH}
        fill="transparent"
        pointerEvents="all"
        {...(hitDataAttr ? { [hitDataAttr]: "" } : {})}
        onPointerDown={handlePointerDown}
      />
      {textEl}
    </>
  );

  if (!active) {
    return <g style={{ pointerEvents: "auto" }}>{content}</g>;
  }

  return (
    <g
      style={{ pointerEvents: "auto" }}
      transform={`translate(${x}, ${y}) scale(${activeScale}) translate(${-x}, ${-y})`}
    >
      {content}
    </g>
  );
}
