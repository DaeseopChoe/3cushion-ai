/**
 * Strategy Summary presentation-only Bold renderer.
 * Plain-text storage stays unchanged; emphasis is display-layer only.
 */
import type { CSSProperties } from "react";
import type { StrategySummarySegment } from "./strategySummaryTemplate";

export function StrategySummaryEmphasisView({
  segments,
  className,
  style,
}: {
  segments: StrategySummarySegment[];
  className?: string;
  style?: CSSProperties;
}) {
  if (!Array.isArray(segments) || segments.length === 0) return null;

  return (
    <div
      className={className}
      style={{ whiteSpace: "pre-line", lineHeight: 1.55, ...style }}
    >
      {segments.map((seg) => (
        <p
          key={seg.id}
          className="ai-comment-para strategy-summary-emphasis__line"
          style={{ margin: "0 0 0.35em" }}
        >
          {(seg.parts?.length
            ? seg.parts
            : [{ text: seg.text, emphasize: false }]
          ).map((part, i) =>
            part.emphasize ? (
              <strong key={`${seg.id}-${i}`}>{part.text}</strong>
            ) : (
              <span key={`${seg.id}-${i}`}>{part.text}</span>
            )
          )}
        </p>
      ))}
    </div>
  );
}

export {
  canRenderStrategySummaryEmphasis,
  listEmphasizedStrategySummaryUnits,
} from "./strategySummaryEmphasis";
