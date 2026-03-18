import React from "react";
import { toPx } from "../../utils/geometry/coords";
import AnchorPoint from "./AnchorPoint";

export default function SystemValueLabels({
  anchors,
  scale,
  tableH,
  padding,
  systemValues,
  onAnchorDoubleClick,
}) {
  return (
    <>
      {Object.entries(anchors).map(([label, data]) => {
        if (!data.coord) return null;

        let dotX = data.coord.x;
        let dotY = data.coord.y;

        if (data.isFg) {
          if (Math.abs(dotY - 42.25) < 0.5) dotY = 40;
          else if (Math.abs(dotY - (-2.25)) < 0.5) dotY = 0;
        }

        const p = toPx({ x: dotX, y: dotY }, scale, tableH);

        let dx = 0,
          dy = 0,
          textAnchor = "middle";

        if (Math.abs(dotY - 40) < 0.5) dy = -10;
        else if (Math.abs(dotY - 0) < 0.5) dy = 17.5;

        if (Math.abs(dotX - 0) < 0.5) {
          dx = -10;
          textAnchor = "end";
        } else if (Math.abs(dotX - 80) < 0.5) {
          dx = 10;
          textAnchor = "start";
        }

        const systemValue =
          typeof label === "string" && systemValues?.[label] != null
            ? systemValues[label]
            : null;

        return (
          <AnchorPoint
            key={label}
            cx={p.x + padding}
            cy={p.y + padding}
            dx={dx}
            dy={dy}
            textAnchor={textAnchor}
            label={label}
            systemValue={systemValue}
            onDoubleClick={onAnchorDoubleClick}
          />
        );
      })}
    </>
  );
}
