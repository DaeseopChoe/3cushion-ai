import React from "react";
import { toPx, formatResultNum } from "../../utils/geometry/coords";
import { cushionMarkToDisplayLabel } from "../../utils/cushionDisplayLabel";
import { getLabelNumericSuffix } from "../../domain/anchorCoordinateEngine";
import AnchorPoint from "./AnchorPoint";
import {
  getSpace,
  toRenderRg,
} from "../../utils/geometry/systemLabelPlacement";

const LABEL_PRIORITY = {
  CO: 0,
  "1C": 1,
  "2C": 2,
  "3C": 3,
  "4C": 4,
  "5C": 5,
  "6C": 6,
};
const SPACE_EPS = 0.02;

function detectRailForCoord(coord, eps = SPACE_EPS) {
  const { x, y } = coord;
  if (Math.abs(x + 2.25) <= eps) return "LEFT";
  if (Math.abs(x - 82.25) <= eps) return "RIGHT";
  if (Math.abs(y + 2.25) <= eps) return "BOTTOM";
  if (Math.abs(y - 42.25) <= eps) return "TOP";
  if (Math.abs(x - 0) <= eps) return "LEFT";
  if (Math.abs(x - 80) <= eps) return "RIGHT";
  if (Math.abs(y - 0) <= eps) return "BOTTOM";
  if (Math.abs(y - 40) <= eps) return "TOP";
  return null;
}

function byPriority(a, b) {
  const pa = LABEL_PRIORITY[a.label] ?? 999;
  const pb = LABEL_PRIORITY[b.label] ?? 999;
  if (pa !== pb) return pa - pb;
  return String(a.label).localeCompare(String(b.label));
}

function resolveSpace(coord) {
  return getSpace(coord);
}

function collectBaseNodes(anchors, forceRgByLabel, forceMidByLabel, railByLabel) {
  return Object.entries(anchors)
    .map(([label, data]) => {
      if (!data?.coord) return null;
      const x = Number(data.coord.x);
      const y = Number(data.coord.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      const coord = { x, y };
      const space = resolveSpace(coord);
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
            data: { label, coord, space, labelStrategy: "anchor_ssot" },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      }
      return {
        label,
        coord,
        space,
        rail: railByLabel?.[label] ?? detectRailForCoord(coord),
        forceRg: !!forceRgByLabel?.[label],
        forceMid: !!forceMidByLabel?.[label],
      };
    })
    .filter(Boolean)
    .sort(byPriority);
}


function renderNode(node, { scale, tableH, padding, systemValues, onAnchorDoubleClick }) {
  if (node.id === "CO") {
    console.log("TO_RENDER_INPUT_CO", node.coord, node.space);
  }
  const rg = toRenderRg(node.coord, node.space, {
    forceRg: node.forceRg,
    forceMid: node.forceMid,
    rail: node.rail,
  });
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
        data: { label: node.label, coord: node.coord, space: node.space, rg, path: "anchor_ssot" },
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
  return (
    <AnchorPoint
      key={node.label}
      cx={cx}
      cy={cy}
      dx={0}
      dy={0}
      textAnchor="middle"
      fontSize={20}
      label={node.label}
      displayLabel={cushionMarkToDisplayLabel(node.label)}
      systemValue={systemValue}
      onDoubleClick={onAnchorDoubleClick}
    />
  );
}

export default function SystemValueLabels({
  anchors,
  scale,
  tableH,
  padding,
  systemValues,
  onAnchorDoubleClick,
  labelStrategy = "anchor_ssot",
  systemId,
  forceRgByLabel,
  forceMidByLabel,
  railByLabel,
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

  const nodes = collectBaseNodes(anchors, forceRgByLabel, forceMidByLabel, railByLabel);

  return (
    <>
      {nodes.map((node) => renderNode(node, renderProps))}
    </>
  );
}
