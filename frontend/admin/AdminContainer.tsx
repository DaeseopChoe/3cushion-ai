// frontend/admin/AdminContainer.tsx
import { useState } from "react";

// SYS
import { SysOverlay } from "./sys/SysOverlay";
import { useSysCalculation } from "./sys/useSysCalculation";

// HP/T
import { HptOverlay } from "./hpt/HptOverlay";
import { useHptController } from "./hpt/useHptController";

// STR
import { StrOverlay } from "./str/StrOverlay";
import { useStrController } from "./str/useStrController";

// AI
import { AiOverlay } from "./ai/AiOverlay";
import { useAiController } from "./ai/useAiController";

// SAVE
import { saveShotRecord } from "./save/saveShotRecord";

export default function AdminContainer() {
  /* =========================
     관리자 모드
  ========================= */
  const [isAdmin, setIsAdmin] = useState(false);

  /* =========================
     시나리오 선택 (S1/S2/S3)
  ========================= */
  const [scenario, setScenario] = useState<"S1" | "S2" | "S3">("S1");

  /* =========================
     SYS
  ========================= */
  const [sys, setSys] = useState<any>(null);
  const sysCalc = useSysCalculation({
    sys,
    onChange: setSys,
  });

  /* =========================
     HP/T
  ========================= */
  const [hpt, setHpt] = useState<any>({
    hp: { x: 0, y: 0 },
    T: "8/8",
  });
  const hptCtrl = useHptController({
    hpt,
    onChange: setHpt,
  });

  /* =========================
     STR
  ========================= */
  const [str, setStr] = useState<any>(null);
  const strCtrl = useStrController({
    str,
    onChange: setStr,
  });

  /* =========================
     AI
  ========================= */
  const [ai, setAi] = useState<any>(null);
  const aiCtrl = useAiController({
    ai,
    onChange: setAi,
  });

  /* =========================
     Overlay 제어
  ========================= */
  const [open, setOpen] = useState<
    null | "SYS" | "HPT" | "STR" | "AI"
  >(null);

  /* =========================
     SAVE
  ========================= */
  const handleSave = () => {
    saveShotRecord({
      scenario,
      sys,
      hpt,
      str,
      ai,
    });
    alert("shot_record 저장 완료");
  };

  return (
    <>
      {/* 관리자 모드 토글 */}
      <button
        style={{ position: "absolute", top: 10, right: 10 }}
        onClick={() => setIsAdmin((v) => !v)}
      >
        {isAdmin ? "ADMIN MODE" : "USER MODE"}
      </button>

      {/* SYS Overlay */}
      {open === "SYS" && (
        <SysOverlay
          sys={sys}
          onApply={(next) => {
            setSys(next);
            setOpen(null);
          }}
          onCancel={() => setOpen(null)}
        />
      )}

      {/* HP/T Overlay */}
      {open === "HPT" && (
        <HptOverlay
          hpt={hpt}
          onApply={(next) => {
            setHpt(next);
            setOpen(null);
          }}
          onCancel={() => setOpen(null)}
        />
      )}

      {/* STR Overlay */}
      {open === "STR" && (
        <StrOverlay
          str={str}
          onApply={(next) => {
            setStr(next);
            setOpen(null);
          }}
          onCancel={() => setOpen(null)}
        />
      )}

      {/* AI Overlay */}
      {open === "AI" && (
        <AiOverlay
          ai={ai}
          onApply={(next) => {
            setAi(next);
            setOpen(null);
          }}
          onCancel={() => setOpen(null)}
        />
      )}
    </>
  );
}
