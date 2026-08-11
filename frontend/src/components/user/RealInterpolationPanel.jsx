/**
 * Minimal USER Real Interpolation surface — matchType / confidence / Top-3.
 * Display only; activation is injected by App (existing RI activate path).
 */

/**
 * @param {{
 *   surface: {
 *     candidates: Array<{
 *       index: number;
 *       slotHint: string;
 *       authoringStrategyId: string;
 *       strategyRef: string;
 *       matchType: string;
 *       confidence: number;
 *       displayName: string;
 *     }>;
 *     primary: { matchType: string; confidence: number } | null;
 *   };
 *   selectedIndex: number | null;
 *   onSelect: (index: number) => void;
 *   formatMatchType?: (matchType: string) => string;
 *   formatConfidence?: (confidence: number) => string;
 * }} props
 */
export default function RealInterpolationPanel({
  surface,
  selectedIndex = null,
  onSelect,
  formatMatchType = (m) => m,
  formatConfidence = (c) => String(c),
}) {
  const candidates = surface?.candidates ?? [];
  if (!candidates.length) return null;

  const focus =
    selectedIndex != null
      ? candidates.find((c) => c.index === selectedIndex) ?? surface.primary
      : surface.primary;

  return (
    <div
      data-ri-ui-surface="1"
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        zIndex: 40,
        maxWidth: 280,
        padding: "10px 12px",
        borderRadius: 8,
        background: "rgba(15, 23, 42, 0.92)",
        border: "1px solid rgba(148, 163, 184, 0.35)",
        color: "#e2e8f0",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: 12,
        lineHeight: 1.35,
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        pointerEvents: "auto",
      }}
    >
      <div style={{ fontWeight: 650, marginBottom: 6, color: "#f8fafc" }}>
        Real Interpolation
      </div>
      {focus ? (
        <div
          data-ri-focus="1"
          style={{ marginBottom: 8, color: "#cbd5e1" }}
        >
          <div data-ri-match-type={focus.matchType}>
            Match: {formatMatchType(focus.matchType)}
          </div>
          <div data-ri-confidence={String(focus.confidence)}>
            Confidence: {formatConfidence(focus.confidence)}
          </div>
        </div>
      ) : null}

      <div style={{ fontWeight: 600, marginBottom: 4, color: "#94a3b8" }}>
        Top candidates
      </div>
      <ol
        data-ri-top3="1"
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {candidates.map((c) => {
          const selected = selectedIndex === c.index;
          return (
            <li key={c.authoringStrategyId}>
              <button
                type="button"
                data-ri-candidate={c.index}
                data-ri-authoring-strategy-id={c.authoringStrategyId}
                data-ri-strategy-ref={c.strategyRef}
                data-ri-match-type={c.matchType}
                data-ri-confidence={String(c.confidence)}
                onClick={() => onSelect?.(c.index)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 8px",
                  borderRadius: 6,
                  border: selected
                    ? "1px solid #38bdf8"
                    : "1px solid transparent",
                  background: selected
                    ? "rgba(56, 189, 248, 0.15)"
                    : "rgba(30, 41, 59, 0.85)",
                  color: "#f1f5f9",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  {c.index + 1}. {c.displayName}
                </div>
                <div style={{ color: "#94a3b8", fontSize: 11 }}>
                  {formatMatchType(c.matchType)} ·{" "}
                  {formatConfidence(c.confidence)}
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
