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
      if (label === "CO" || label === "2C" || label === "3C") {
        // #region agent log
        fetch("http://127.0.0.1:7263/ingest/2d7c02db-24bd-4dad-8e7a-c7f7bce1b5b1", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "75c16c",
          },
          body: JSON.stringify({
            sessionId: "75c16c",
            runId: "snap-debug-pre",
            hypothesisId: "H3",
            location: "SystemValueLabels.jsx:collectBaseNodes",
            message: "base node resolved",
            data: { label, coord, labelStrategy: "anchor_ssot" },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      }
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
  console.log("[RENDER_RG]", rg);
  console.log("[TO_PX_INPUT]", rg);
  console.log("[FINAL_COORD_BEFORE_RENDER]", rg);
  if (node.label === "CO" || node.label === "2C" || node.label === "3C") {
    // #region agent log
    fetch("http://127.0.0.1:7263/ingest/2d7c02db-24bd-4dad-8e7a-c7f7bce1b5b1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "75c16c",
      },
      body: JSON.stringify({
        sessionId: "75c16c",
        runId: "snap-debug-pre",
        hypothesisId: "H4",
        location: "SystemValueLabels.jsx:renderNode",
        message: "toPx input on common path",
        data: { label: node.label, coord: node.coord, rg, path: "anchor_ssot" },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }
  console.log("TO_PX_INPUT_CO", rg);
  const p = toPx(rg, scale, tableH);
  const cx = p.x + padding;
  const cy = p.y + padding;
  console.log("[FINAL_COORD]", { label: node.label, cx, cy, rg });
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

function renderRawLabelAnchors(labelAnchors, scale, tableH, padding) {
  if (!labelAnchors) return null;

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

        // --- STEP 3: C4 / C5 / C6 축 이동 ---
        if (label === "C4") {
          if (x === -2.25) x = -0.5;
          if (x === 82.25) x = 80.5;
          if (y === -2.25) y = -0.5;
          if (y === 42.25) y = 40.5;
        }

        if (label === "C5") {
          if (x === -2.25) x = 0.5;
          if (x === 82.25) x = 79.5;
          if (y === -2.25) y = 0.5;
          if (y === 42.25) y = 39.5;
        }

        if (label === "C6") {
          if (x === -2.25) x = -1;
          if (x === 82.25) x = 81;
          if (y === -2.25) y = -1;
          if (y === 42.25) y = 41;
        }

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

    // --- STEP 3: C4 / C5 / C6 축 이동 ---
    if (label === "C4") {
      if (x === -2.25) x = -0.5;
      if (x === 82.25) x = 80.5;
      if (y === -2.25) y = -0.5;
      if (y === 42.25) y = 40.5;
    }

    if (label === "C5") {
      if (x === -2.25) x = 0.5;
      if (x === 82.25) x = 79.5;
      if (y === -2.25) y = 0.5;
      if (y === 42.25) y = 39.5;
    }

    if (label === "C6") {
      if (x === -2.25) x = -1;
      if (x === 82.25) x = 81;
      if (y === -2.25) y = -1;
      if (y === 42.25) y = 41;
    }

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
  systemId,
}) {
  const renderProps = {
    scale,
    tableH,
    padding,
    systemValues,
    onAnchorDoubleClick,
  };
  // #region agent log
  fetch("http://127.0.0.1:7263/ingest/2d7c02db-24bd-4dad-8e7a-c7f7bce1b5b1", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "75c16c",
    },
    body: JSON.stringify({
      sessionId: "75c16c",
      runId: "snap-debug-pre",
      hypothesisId: "H5",
      location: "SystemValueLabels.jsx:component-entry",
      message: "SystemValueLabels render entered",
      data: {
        systemId,
        labelStrategy,
        anchorCount: anchors ? Object.keys(anchors).length : 0,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  // #region agent log
  fetch("http://127.0.0.1:7263/ingest/2d7c02db-24bd-4dad-8e7a-c7f7bce1b5b1", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "75c16c",
    },
    body: JSON.stringify({
      sessionId: "75c16c",
      runId: "snap-debug-pre",
      hypothesisId: "H1",
      location: "SystemValueLabels.jsx:strategy-branch",
      message: "anchor_ssot strategy branch selected",
      data: { labelStrategy, systemId },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const nodes = collectBaseNodes(anchors);
  const rawLabels = renderRawLabelAnchors(
    labelAnchors,
    scale,
    tableH,
    padding
  );

  return (
    <>
      {rawLabels}
      {nodes.map((node) => renderNode(node, renderProps))}
    </>
  );
}
