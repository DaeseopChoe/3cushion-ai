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
  const rg = node.coord;
  const p = toPx(rg, scale, tableH);
  const cx = p.x + padding;
  const cy = p.y + padding;
  const num = getLabelNumericSuffix(node.label, systemValues);
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
  // #region agent log
  console.log("[STEP4] renderRawLabelAnchors called", labelAnchors);
  fetch("http://127.0.0.1:7698/ingest/05c8c604-4ee9-4069-8fc1-5ac9e58f8454", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5e5472" },
    body: JSON.stringify({
      sessionId: "5e5472",
      hypothesisId: "STEP4",
      location: "SystemValueLabels.jsx:renderRawLabelAnchors",
      message: "STEP4 entry",
      data: {
        hasLabelAnchors: labelAnchors != null,
        keys: labelAnchors ? Object.keys(labelAnchors) : [],
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  if (!labelAnchors) return null;

  const applyCushionNudges = true;
  const nodes = [];

  Object.entries(labelAnchors).forEach(([label, item]) => {
    // #region agent log
    console.log("[STEP5] label loop:", label, item);
    fetch("http://127.0.0.1:7698/ingest/05c8c604-4ee9-4069-8fc1-5ac9e58f8454", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5e5472" },
      body: JSON.stringify({
        sessionId: "5e5472",
        hypothesisId: "STEP5",
        location: "SystemValueLabels.jsx:renderRawLabelAnchors forEach",
        message: "STEP5 label loop",
        data: { label, isArray: Array.isArray(item) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
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

        // #region agent log
        console.log("[STEP6] render label:", {
          label,
          coord,
          value,
        });
        fetch("http://127.0.0.1:7698/ingest/05c8c604-4ee9-4069-8fc1-5ac9e58f8454", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5e5472" },
          body: JSON.stringify({
            sessionId: "5e5472",
            hypothesisId: "STEP6",
            location: "SystemValueLabels.jsx:array branch",
            message: "STEP6 before LabelText",
            data: { label, coord, value },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
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

    // #region agent log
    console.log("[STEP6] render label:", {
      label,
      coord,
      value,
    });
    fetch("http://127.0.0.1:7698/ingest/05c8c604-4ee9-4069-8fc1-5ac9e58f8454", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5e5472" },
      body: JSON.stringify({
        sessionId: "5e5472",
        hypothesisId: "STEP6",
        location: "SystemValueLabels.jsx:single branch",
        message: "STEP6 before LabelText",
        data: { label, coord, value },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
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

  // #region agent log
  console.log("[STEP3] SystemValueLabels mounted", {
    labelAnchors,
  });
  fetch("http://127.0.0.1:7698/ingest/05c8c604-4ee9-4069-8fc1-5ac9e58f8454", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5e5472" },
    body: JSON.stringify({
      sessionId: "5e5472",
      hypothesisId: "STEP3",
      location: "SystemValueLabels.jsx:component",
      message: "STEP3 render",
      data: {
        labelAnchorsKeys: labelAnchors ? Object.keys(labelAnchors) : null,
        labelAnchorsUndefined: labelAnchors === undefined,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
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
