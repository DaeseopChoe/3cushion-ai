import { useEffect, useState } from "react";
import App from "../App";

const STAGE_RATIO = 2.33;

export default function Stage() {
  const [viewport, setViewport] = useState({ vw: 0, vh: 0 });
  const [currentButtonId, setCurrentButtonId] = useState("S1");
  const [activeSlot, setActiveSlot] = useState("S1");

  useEffect(() => {
    const calc = () => {
      setViewport({ vw: window.innerWidth, vh: window.innerHeight });
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const { vw, vh } = viewport;
  if (!vw || !vh) return null;

  let stageH_try = vh;
  let stageW_try = vh * STAGE_RATIO;

  let stageW, stageH;
  let leftPadRatio = 0.8;
  let centerPadRatio = 0.3;
  let rightPadRatio = 0.5;
  let buttonRatio = 1.9;  // 1.7 → 1.9 (버튼 소폭 확대)
  const tableRatio = 20;

  if (stageW_try <= vw) {
    stageW = stageW_try;
    stageH = stageH_try;
  } else {
    const availableW = vw;
    
    let overflowRatio = (stageW_try - availableW) / stageH_try;
    
    const centerReduction = Math.min(centerPadRatio, overflowRatio);
    centerPadRatio = Math.max(0, centerPadRatio - centerReduction);
    overflowRatio -= centerReduction;
    
    let currentTotal = leftPadRatio + buttonRatio + centerPadRatio + tableRatio + rightPadRatio;
    
    if (currentTotal * stageH_try > availableW) {
      const excessRatio = (currentTotal * stageH_try - availableW) / stageH_try;
      const padReduction = excessRatio / 2;
      
      leftPadRatio = Math.max(0.2, leftPadRatio - padReduction);
      rightPadRatio = Math.max(0.2, rightPadRatio - padReduction);
      
      currentTotal = leftPadRatio + buttonRatio + centerPadRatio + tableRatio + rightPadRatio;
      
      if (currentTotal * stageH_try > availableW) {
        const stillExcess = (currentTotal * stageH_try - availableW) / stageH_try;
        buttonRatio = Math.max(1.2, buttonRatio - stillExcess);
        
        currentTotal = leftPadRatio + buttonRatio + centerPadRatio + tableRatio + rightPadRatio;
        
        if (currentTotal * stageH_try > availableW) {
          stageW = availableW;
          stageH = stageW / STAGE_RATIO;
        } else {
          stageW = stageW_try;
          stageH = stageH_try;
        }
      } else {
        stageW = stageW_try;
        stageH = stageH_try;
      }
    } else {
      stageW = stageW_try;
      stageH = stageH_try;
    }
  }

  const UNIT = stageW / (leftPadRatio + buttonRatio + centerPadRatio + tableRatio + rightPadRatio);

  const LEFT_PAD = UNIT * leftPadRatio;
  const BUTTON_W = UNIT * buttonRatio;
  const CENTER_PAD = UNIT * centerPadRatio;
  const TABLE_W = UNIT * tableRatio;
  const RIGHT_PAD = UNIT * rightPadRatio;

  const BUTTON_HEIGHT = BUTTON_W * 0.65;
  const BUTTON_FONT = BUTTON_W * 0.28;
  let BUTTON_GAP = BUTTON_W * 0.22;  // 0.12 → 0.16 (간격 소폭 증가)

  // S1/S2/S3: shot 슬롯 선택 → currentButtonId로 App에 전달 → App의 useEffect에서 actions.switchSlot 호출
  const buttons = [
    { id: "COACH", label: "코칭", type: "coach" },
    { id: "S1", label: "S1", type: "shot" },
    { id: "S2", label: "S2", type: "shot" },
    { id: "S3", label: "S3", type: "shot" },
    { id: "SYS", label: "SYS", type: "info" },
    { id: "HP/T", label: "HP/T", type: "info" },
    { id: "STR", label: "STR", type: "info" },
    { id: "AI", label: "AI", type: "info" },
  ];

  let totalButtonHeight = BUTTON_HEIGHT * 8 + BUTTON_GAP * 7;
  if (totalButtonHeight > stageH * 0.95) {
    BUTTON_GAP = Math.max(BUTTON_W * 0.08, (stageH * 0.95 - BUTTON_HEIGHT * 8) / 7);
    totalButtonHeight = BUTTON_HEIGHT * 8 + BUTTON_GAP * 7;
  }

  const getButtonColor = (id, isSlotSelected, isFuncSelected) => {
    if (id === "COACH") return isFuncSelected ? "#2563eb" : "#3b82f6";
    if (id === "AI") return isFuncSelected ? "#c2410c" : "#ea580c";
    if (["SYS", "HP/T", "STR"].includes(id)) return isFuncSelected ? "#d97706" : "#f59e0b";
    return isSlotSelected ? "#047857" : "#10b981";
  };

  const SLOT_IDS = ["S1", "S2", "S3"];
  const FUNC_IDS = ["SYS", "HP/T", "STR", "AI"];

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#0f172a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: stageW,
          height: stageH,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{ width: LEFT_PAD, flexShrink: 0 }} />

        <div
          style={{
            width: BUTTON_W,
            maxHeight: stageH,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: BUTTON_GAP,
          }}
        >
          {buttons.map(({ id, label }) => {
            const isSlotSelected = SLOT_IDS.includes(id) && activeSlot === id;
            const isFuncSelected = (id === "COACH" || FUNC_IDS.includes(id)) && currentButtonId === id;
            const borderStyle = isSlotSelected ? "3px solid #ef4444" : isFuncSelected ? "3px solid #fff" : "none";
            return (
              <button
                key={id}
                onClick={() => setCurrentButtonId(id)}
                style={{
                  height: BUTTON_HEIGHT,
                  fontSize: BUTTON_FONT,
                  padding: 0,
                  background: getButtonColor(id, isSlotSelected, isFuncSelected),
                  color: "#fff",
                  border: borderStyle,
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "700",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxSizing: "border-box",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div style={{ width: CENTER_PAD, flexShrink: 0 }} />

        <div
          style={{
            width: TABLE_W,
            height: stageH,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <App currentButtonId={currentButtonId} onActiveSlotChange={setActiveSlot} />
        </div>

        <div style={{ width: RIGHT_PAD, flexShrink: 0 }} />
      </div>
    </div>
  );
}
