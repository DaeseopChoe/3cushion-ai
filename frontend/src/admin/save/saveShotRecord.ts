// /frontend/admin/save/saveShotRecord.ts

import { writeFileSync } from "fs";
import path from "path";

import { SystemCalcOutputV1 } from "@/data/system/calculator";
import { Point } from "@/data/system/calculator/types";

/* =========================
   입력 타입
========================= */

export interface SaveShotRecordInput {
  shotId: string;

  // SYS
  sys?: SystemCalcOutputV1;

  // HP/T
  hpt?: {
    hp: Point;        // 타점 (큐볼 기준, Rg 좌표)
    T: string;        // 두께값 예: "+3/8"
    mode?: "TIP" | "SPIN";  // 없으면 "TIP"
  };

  // STR
  str?: {
    length: "Short" | "Standard" | "Long";
    motion: "등속" | "가속" | "감속";
    speed: string;    // 예: "00", "01", ...
  };

  // AI (텍스트)
  ai?: {
    text: string;
    onePointLessons?: Array<{ id: string; text: string }>;
  };
}

/* =========================
   메인 저장 함수
========================= */

/**
 * Shot Record 저장
 * 
 * - SYS, HP/T, STR, AI 모두 함께 저장
 * - impactBall은 저장하지 않음 (계산값이므로 제외)
 * - 각 버튼은 독립적으로 입력 가능
 * 
 * @param input - 저장할 데이터
 * @returns 저장된 shot_record
 */
export function saveShotRecord(input: SaveShotRecordInput) {
  const {
    shotId,
    sys,
    hpt,
    str,
    ai
  } = input;

  const shotRecord: any = {
    meta: {
      shot_id: shotId,
      created_at: new Date().toISOString()
    }
  };

  /* =====================
     SYS 저장
  ===================== */
  if (sys) {
    shotRecord.sys = sys;
  }

  /* =====================
     HP/T 저장
     ⚠️ impactBall은 저장하지 않음 (계산값)
  ===================== */
  if (hpt) {
    const hpCoords = hpt.hp ?? (hpt as { hit_point?: Point }).hit_point;
    shotRecord.hpt = {
      hp: hpCoords ? { x: hpCoords.x, y: hpCoords.y } : { x: 0, y: 0 },
      T: hpt.T,
      mode: hpt.mode ?? "TIP"
    };
  }

  /* =====================
     STR 저장
  ===================== */
  if (str) {
    shotRecord.str = {
      length: str.length,
      motion: str.motion,
      speed: str.speed
    };
  }

  /* =====================
     AI 저장
  ===================== */
  if (ai) {
    shotRecord.ai = {
      text: ai.text,
      onePointLessons: Array.isArray(ai.onePointLessons)
        ? ai.onePointLessons.map((x, idx) =>
            typeof x === "string"
              ? { id: `legacy-${idx}`, text: x }
              : x && typeof x === "object" && x.id != null && x.text != null
                ? { id: x.id, text: x.text }
                : { id: `fix-${idx}`, text: String(x?.text ?? x ?? "") }
          )
        : [],
      updated_at: new Date().toISOString()
    };
  }

  /* =====================
     파일 저장
  ===================== */
  const outputPath = path.resolve(
    process.cwd(),
    "data/shots/shot_record.json"
  );

  writeFileSync(
    outputPath,
    JSON.stringify(shotRecord, null, 2),
    "utf-8"
  );

  console.log("💾 [SAVE_SHOT_RECORD]", {
    shotId,
    has_sys: !!sys,
    has_hpt: !!hpt,
    has_str: !!str,
    has_ai: !!ai
  });

  return shotRecord;
}
