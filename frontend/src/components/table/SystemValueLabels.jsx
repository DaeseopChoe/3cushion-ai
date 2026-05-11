import React from "react";
import { toPx, formatResultNum } from "../../utils/geometry/coords";
import { cushionMarkToDisplayLabel } from "../../utils/cushionDisplayLabel";
import { getLabelNumericSuffix } from "../../domain/anchorCoordinateEngine";
import AnchorPoint from "./AnchorPoint";
import LabelText from "./LabelText";

const LABEL_PRIORITY = {
  CO: 0,
  "1C": 1,
  "2C": 2,
  "3C": 3,
  "4C": 4,
  "5C": 5,
  "6C": 6,
};

function byPriority(a, b) {
  const pa = LABEL_PRIORITY[a.label] ?? 999;
  const pb = LABEL_PRIORITY[b.label] ?? 999;
  if (pa !== pb) return pa - pb;
  return String(a.label).localeCompare(String(b.label));
}

function collectBaseNodes(anchors) {
  return Object.entries(anchors)
    .map(([label, data]) => {
      if (!data?.coord) return null;
      const x = Number(data.coord.x);
      const y = Number(data.coord.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      const coord = { x, y };
      return {
        label,
        coord,
      };
    })
    .filter(Boolean)
    .sort(byPriority);
}

function renderNode(node, { scale, tableH, padding, systemValues, onAnchorDoubleClick }) {
  const p = toPx(node.coord, scale, tableH);
  const cx = p.x + padding;
  const cy = p.y + padding;
  let num = getLabelNumericSuffix(node.label, systemValues);
  if (node.label === "C4" && num != null && Number.isFinite(Number(num))) {
    const displayC4 = Number(Number(num).toFixed(1));
    num = displayC4;
  }
  const systemValue = num != null ? formatResultNum(num) : null;
  const displayMark = cushionMarkToDisplayLabel(node.label);
  const textContent =
    systemValue != null ? `${displayMark}_${systemValue}` : displayMark;
  return (
    <g key={node.label}>
      <AnchorPoint
        cx={cx}
        cy={cy}
        dx={0}
        dy={0}
        textAnchor="middle"
        fontSize={20}
        label={node.label}
        displayLabel={displayMark}
        systemValue={systemValue}
        onDoubleClick={onAnchorDoubleClick}
      />
      <text
        x={cx}
        y={cy}
        fill="#FFFFFF"
        fontSize={20}
        fontWeight="bold"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ pointerEvents: "none" }}
      >
        {textContent}
      </text>
    </g>
  );
}

/** C4/C5/C6 프레임 인접 raw 라벨 겹침 완화 (5&half 기준 시스템에는 적용하지 않음). */
function applyRawLabelFrameNudges(label, x, y, enabled) {
  if (!enabled) return { x, y };
  let nx = x;
  let ny = y;
  if (label === "C4") {
    if (nx === -2.25) nx = -0.5;
    if (nx === 82.25) nx = 80.5;
    if (ny === -2.25) ny = -0.5;
    if (ny === 42.25) ny = 40.5;
  }
  if (label === "C5") {
    if (nx === -2.25) nx = 0.5;
    if (nx === 82.25) nx = 79.5;
    if (ny === -2.25) ny = 0.5;
    if (ny === 42.25) ny = 39.5;
  }
  if (label === "C6") {
    if (nx === -2.25) nx = -1;
    if (nx === 82.25) nx = 81;
    if (ny === -2.25) ny = -1;
    if (ny === 42.25) ny = 41;
  }
  return { x: nx, y: ny };
}

function renderRawLabelAnchors(
  labelAnchors,
  scale,
  tableH,
  padding,
  labelStrategy
) {
  if (!labelAnchors) return null;

  const applyCushionNudges = true;
  const nodes = [];

  Object.entries(labelAnchors).forEach(([label, item]) => {
    let fillColor = "#FFD700";
    if (label === "C4") fillColor = "#00E5FF";
    if (label === "C5") fillColor = "#FF4D6D";
    if (label === "C6") fillColor = "#A8FF60";

    if (Array.isArray(item)) {
      item.forEach((nodeItem, idx) => {
        const coord = nodeItem?.coord;
        const value = nodeItem?.value;
        if (!coord) return;
        let { x, y } = coord;
        ({ x, y } = applyRawLabelFrameNudges(label, x, y, applyCushionNudges));

        const p = toPx({ x, y }, scale, tableH);
        nodes.push(
          <LabelText
            key={`RAW-${label}-${idx}`}
            x={p.x + padding}
            y={p.y + padding}
            text={value != null ? String(value) : ""}
            fontSize={10}
            color={fillColor}
          />
        );
      });
      return;
    }

    const coord = item?.coord;
    const value = item?.value;

    if (!coord) return;

    let { x, y } = coord;
    ({ x, y } = applyRawLabelFrameNudges(label, x, y, applyCushionNudges));

    const p = toPx({ x, y }, scale, tableH);

    nodes.push(
      <LabelText
        key={`RAW-${label}`}
        x={p.x + padding}
        y={p.y + padding}
        text={value != null ? String(value) : ""}
        fontSize={10}
        color={fillColor}
      />
    );
  });

  return nodes;
}

export default function SystemValueLabels({
  anchors,
  labelAnchors,
  scale,
  tableH,
  padding,
  systemValues,
  onAnchorDoubleClick,
  labelStrategy = "anchor_ssot",
  outputs,
  showSystemGrid = true,
}) {
  if (!outputs?.result) return null;

  const renderProps = {
    scale,
    tableH,
    padding,
    systemValues,
    onAnchorDoubleClick,
  };

  const nodes = collectBaseNodes(anchors);
  const rawLabels = renderRawLabelAnchors(
    labelAnchors,
    scale,
    tableH,
    padding,
    labelStrategy
  );

  return (
    <>
      {showSystemGrid && rawLabels}
      {nodes.map((node) => renderNode(node, renderProps))}
    </>
  );
}
