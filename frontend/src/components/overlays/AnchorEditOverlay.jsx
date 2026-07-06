import { useState } from "react";
import { cushionMarkToDisplayLabel } from "../../utils/cushionDisplayLabel";

export function AnchorEditOverlay({ anchorKey, initialX, initialY, onApply, onCancel }) {
  const [x, setX] = useState(String(initialX));
  const [y, setY] = useState(String(initialY));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: "280px" }}>
      <div>
        <strong>앵커:</strong> {cushionMarkToDisplayLabel(anchorKey)}
      </div>
      <div>
        <label style={{ display: "block", marginBottom: "4px" }}>X:</label>
        <input
          type="number"
          step="0.1"
          value={x}
          onChange={(e) => setX(e.target.value)}
          style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
        />
      </div>
      <div>
        <label style={{ display: "block", marginBottom: "4px" }}>Y:</label>
        <input
          type="number"
          step="0.1"
          value={y}
          onChange={(e) => setY(e.target.value)}
          style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
        />
      </div>
      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
        <button
          onClick={() => onApply(x, y)}
          style={{ padding: "8px 16px", backgroundColor: "#10b981", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}
        >
          적용
        </button>
        <button
          onClick={onCancel}
          style={{ padding: "8px 16px", backgroundColor: "#64748b", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}
        >
          취소
        </button>
      </div>
    </div>
  );
}
