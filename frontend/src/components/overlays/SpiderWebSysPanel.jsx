import { useMemo, useState } from "react";
import {
  SPIDER_DEFAULT_TRACK,
  SPIDER_WEB_TRACKS,
  SPIDER_WEB_TRACK_IDS,
  isSpiderWebTrack,
  spiderC3Branch,
  spiderC3Rail,
} from "../../domain/spiderWeb/spiderWebTracks";
import {
  solveSpiderWeb,
  spiderAllowedHpSelections,
  spiderValuesFromStoredInputs,
} from "../../domain/spiderWeb/spiderWebSolver";
import { buildSpiderWebPath } from "../../domain/spiderWeb/spiderWebGeometry";
import { getSystemContract } from "../../runtime";

/**
 * Spider Web (거미줄) SYS panel — explicit solve target, nine-point tip select.
 * No Sn / 출발값 보정 / 5&Half terms.
 */

const SOLVE_TARGET_OPTIONS = [
  { id: "C3_f", label: "C3 계산" },
  { id: "CO_f", label: "CO 계산" },
  { id: "C1_f", label: "C1 계산" },
  { id: "HP", label: "타점 계산" },
];

const HP_SELECTIONS = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

function hpLabel(sel) {
  if (sel === 0) return "무회전 (0)";
  return sel > 0 ? `우 ${sel}팁 (R${sel})` : `좌 ${-sel}팁 (L${-sel})`;
}

function fmt(n) {
  if (n === "" || n == null) return "";
  const v = Number(n);
  return Number.isFinite(v) ? String(Number(v.toFixed(4))) : "";
}

function initialSpiderState(data) {
  const track = isSpiderWebTrack(data?.track) ? data.track : SPIDER_DEFAULT_TRACK;
  const stored =
    spiderValuesFromStoredInputs(track, data?.system_values) ??
    spiderValuesFromStoredInputs(track, data?.inputs);
  return {
    track,
    solveTarget: "C3_f",
    CO_f: stored ? String(stored.CO_f) : "",
    C1_f: stored ? String(stored.C1_f) : "",
    C3_f: stored ? String(stored.C3_f) : "",
    hpSel: stored ? stored.HP_sel : 0,
  };
}

const inputStyle = {
  width: "70px",
  height: "32px",
  padding: "0 6px",
  border: "1px solid #cbd5e1",
  borderRadius: "4px",
  fontSize: "13px",
  boxSizing: "border-box",
};

const selectStyle = {
  height: "32px",
  padding: "0 6px",
  border: "1px solid #cbd5e1",
  borderRadius: "4px",
  fontSize: "13px",
  backgroundColor: "#fff",
  boxSizing: "border-box",
};

export function SpiderWebSysPanel({ data, onApply, onCancel, applyDisabled = false }) {
  const [state, setState] = useState(() => initialSpiderState(data));
  const allowed = useMemo(() => spiderAllowedHpSelections(state.track), [state.track]);

  const solved = useMemo(
    () =>
      solveSpiderWeb({
        track: state.track,
        solveTarget: state.solveTarget,
        CO_f: state.CO_f,
        C1_f: state.C1_f,
        C3_f: state.C3_f,
        hpSel: state.hpSel,
      }),
    [state]
  );

  /** C1 → C2 spin-corrected reflection must connect to the fixed C3 before Apply. */
  const pathCheck = useMemo(() => {
    if (!solved.ok) return null;
    const anchors = getSystemContract("spider_web")?.anchors;
    if (!anchors?.trajectories) return null;
    return buildSpiderWebPath({
      track: state.track,
      inputs: solved.values,
      anchorsData: { trajectories: anchors.trajectories },
      vertices: {},
    });
  }, [solved, state.track]);
  const pathError = pathCheck && !pathCheck.ok ? pathCheck : null;
  const canApply = solved.ok && !pathError && !applyDisabled;

  const spec = SPIDER_WEB_TRACKS[state.track];
  const c3Value = solved.ok ? solved.values.C3_f : null;
  const c3Rail = c3Value != null ? spiderC3Rail(state.track, c3Value) : null;
  const c3Branch = c3Value != null ? spiderC3Branch(c3Value) : null;

  const setField = (key, value) => setState((prev) => ({ ...prev, [key]: value }));

  const onTrackChange = (track) => {
    setState((prev) => {
      const nextAllowed = spiderAllowedHpSelections(track);
      return {
        ...prev,
        track,
        hpSel: nextAllowed.includes(prev.hpSel) ? prev.hpSel : 0,
      };
    });
  };

  const displayValue = (key) => {
    if (state.solveTarget === key) return solved.ok ? fmt(solved.values[key]) : "";
    return state[key];
  };

  const hpDisplaySel =
    state.solveTarget === "HP" ? (solved.ok ? solved.values.HP_sel : "") : state.hpSel;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canApply) return;
    onApply({
      track: state.track,
      values: { ...solved.values },
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="spider-sys-panel"
      style={{ display: "flex", flexDirection: "column", gap: "10px" }}
    >
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>트랙</label>
        <select
          data-testid="spider-track"
          value={state.track}
          onChange={(e) => onTrackChange(e.target.value)}
          style={{ ...selectStyle, width: "110px" }}
        >
          {SPIDER_WEB_TRACK_IDS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <label style={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>계산 대상</label>
        <select
          data-testid="spider-solve-target"
          value={state.solveTarget}
          onChange={(e) => setField("solveTarget", e.target.value)}
          style={{ ...selectStyle, width: "110px" }}
        >
          {SOLVE_TARGET_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ fontSize: "12px", color: "#475569" }}>
        경로: CO {spec.co} → C1 {spec.c1} → C2 {spec.c2} → C3 {spec.c3Short} (≤60) / {spec.c3Long} (&gt;60)
        · 회전 {spec.spin === "R" ? "우" : "좌"}
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        {["CO_f", "C1_f", "C3_f"].map((key) => {
          const ro = state.solveTarget === key;
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600 }}>{key.replace("_f", "")}</label>
              <input
                data-testid={`spider-${key}`}
                type="number"
                step="0.5"
                readOnly={ro}
                value={displayValue(key)}
                onChange={(e) => !ro && setField(key, e.target.value)}
                style={{ ...inputStyle, backgroundColor: ro ? "#f1f5f9" : "#fff" }}
              />
            </div>
          );
        })}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>타점</label>
          <select
            data-testid="spider-hp"
            value={hpDisplaySel}
            disabled={state.solveTarget === "HP"}
            onChange={(e) => setField("hpSel", Number(e.target.value))}
            style={{ ...selectStyle, width: "120px" }}
          >
            {state.solveTarget === "HP" && !solved.ok ? <option value="">—</option> : null}
            {HP_SELECTIONS.map((sel) => (
              <option key={sel} value={sel} disabled={!allowed.includes(sel)}>
                {hpLabel(sel)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          padding: "6px 8px",
          backgroundColor: "#f1f5f9",
          borderRadius: "6px",
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: "13px",
          border: "1px solid #e2e8f0",
        }}
      >
        계산 공식 : C3 = CO − C1 + HPn (HPn = 10 × 팁 수)
      </div>

      <div className="sys-info-box sys-info-box--base" data-testid="spider-result">
        <strong className="sys-info-box__title">기준 계산값</strong>
        {solved.ok ? (
          <>
            <div className="sys-info-box__line">
              {`C3_${fmt(solved.values.C3_f)} = CO_${fmt(solved.values.CO_f)} − C1_${fmt(
                solved.values.C1_f
              )} + HP_${fmt(solved.values.HP_n)}`}
            </div>
            <div className="sys-info-box__line">
              {`타점 ${hpLabel(solved.values.HP_sel)} · C3 레일 ${c3Rail} (${
                c3Branch === "long" ? "긴 레일, C3 > 60" : "짧은 레일, C3 ≤ 60"
              })`}
            </div>
            {pathCheck?.ok ? (
              <div className="sys-info-box__line">
                {`C2 ${pathCheck.rails.C2} ${fmt(pathCheck.pathNodes[2].x)} · 회전 보정 ${
                  pathCheck.c2DeltaDeg > 0 ? "+" : ""
                }${pathCheck.c2DeltaDeg}°`}
              </div>
            ) : null}
            {pathError ? (
              <div className="sys-info-box__line" style={{ color: "#b91c1c" }} data-testid="spider-error">
                {`C2 연결 불가 (${pathError.code}): ${pathError.message}`}
              </div>
            ) : null}
          </>
        ) : (
          <div className="sys-info-box__line" style={{ color: "#b91c1c" }} data-testid="spider-error">
            {solved.message}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "4px",
          paddingTop: "10px",
          borderTop: "1px solid #e2e8f0",
        }}
      >
        <button
          type="submit"
          disabled={!canApply}
          style={{
            flex: 1,
            height: "36px",
            backgroundColor: canApply ? "#3b82f6" : "#94a3b8",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontWeight: 600,
            fontSize: "14px",
            cursor: canApply ? "pointer" : "not-allowed",
          }}
        >
          적용
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            height: "36px",
            backgroundColor: "#e2e8f0",
            color: "#475569",
            border: "none",
            borderRadius: "6px",
            fontWeight: 600,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          취소
        </button>
      </div>
    </form>
  );
}
