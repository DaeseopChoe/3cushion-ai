// frontend/src/utils/aiPlayStrategyBuilder.ts

import { convertTipToClock } from "./tipClockConverter";

export type ImpactStrengthKo = "부드러운" | "평범한" | "강한" | "날카로운";

const DEG_PER_TIP = 22.5;
const MIN_DISTANCE_FOR_ANGLE = 0.05;

/**
 * hit_point {x,y} → tipText, tipClockText (HP_n 약어 노출 없음)
 * - 반드시 0.5 단위로 스냅 후 출력
 * - 방향/팁을 안정적으로 못 뽑으면 "--" 반환
 */
export function hitPointToTipDisplay(hitPoint: { x?: number; y?: number } | null | undefined): {
  tipText: string;
  tipClockText: string;
} {
  const x = typeof hitPoint?.x === "number" ? hitPoint.x : 0;
  const y = typeof hitPoint?.y === "number" ? hitPoint.y : 0;
  const dist = Math.sqrt(x * x + y * y);

  if (dist < MIN_DISTANCE_FOR_ANGLE) {
    return { tipText: "중앙(12시)", tipClockText: "12시" };
  }

  const thetaRad = Math.atan2(x, y);
  const thetaDeg = (thetaRad * 180) / Math.PI;
  const direction: "right" | "left" = x >= 0 ? "right" : "left";
  const absDeg = Math.min(90, Math.abs(thetaDeg));
  const hpNRaw = absDeg / DEG_PER_TIP;
  const snappedTip = Math.round(hpNRaw * 2) / 2;
  const hpNClamp = Math.min(4, Math.max(0, snappedTip));

  if (Number.isNaN(hpNClamp) || !Number.isFinite(hpNClamp)) {
    return { tipText: "--", tipClockText: "--" };
  }

  const tipClockText = convertTipToClock(direction, hpNClamp);
  const tipText =
    hpNClamp === 0
      ? "중앙(12시)"
      : direction === "right"
      ? `우측 ${hpNClamp}팁`
      : `좌측 ${hpNClamp}팁`;

  return { tipText, tipClockText };
}

/** hit_point.x → 회전 텍스트 (소수 1자리) */
export function hitPointToRotationText(hitPoint: { x?: number; y?: number } | null | undefined): string {
  const x = typeof hitPoint?.x === "number" ? hitPoint.x : 0;
  const val = Math.abs(x).toFixed(1);
  if (x > 0) return `우측 ${val}팁`;
  if (x < 0) return `좌측 ${val}팁`;
  return "0팁";
}

/** hit_point.y → 당점 텍스트 (소수 1자리) */
export function hitPointToVerticalText(hitPoint: { x?: number; y?: number } | null | undefined): string {
  const y = typeof hitPoint?.y === "number" ? hitPoint.y : 0;
  const val = Math.abs(y).toFixed(1);
  if (y > 0) return `상단 ${val}팁`;
  if (y < 0) return `하단 ${val}팁`;
  return "0팁";
}

/** T 값(예: "8/8", "+4/8", "-3/8", "BANK") → 두께 표시 텍스트 */
export function formatThickness(T: string | null | undefined): string {
  if (!T) return "8/8";
  if (T === "8/8") return "정면(8/8)";
  if (T === "BANK") return "뱅크 샷";
  if (T.startsWith("+")) return `우측 ${T.slice(1)}`;
  if (T.startsWith("-")) return `좌측 ${T.slice(1)}`;
  return String(T);
}

const SYSTEM_NAME_KO: Record<string, string> = {
  "5_half_system": "파이브 앤드 하프 시스템",
  rodriguez: "로드리게스",
  ball_system: "볼 시스템",
  sunrise_sunset: "일출·일몰 시스템",
  plus_system: "플러스 시스템",
  plus2_system: "플러스2 시스템",
  "3tip_plus": "3팁 플러스",
  "2_3_system": "3분의 2 시스템",
  "35half": "35와 ½ 시스템",
  double_rail: "더블 레일",
  peruvian_system: "페루 시스템",
  reverse_end_system: "리버스 엔드",
  zigzag_system: "지그재그",
  "7_system": "7 시스템",
  "99 to 1": "99 to 1",
  clay_shooting: "클레이 사격",
  long_plate_system: "긴각 접시",
  long_wedge: "롱 웨지",
  reverse_system: "리버스 시스템",
  schaefer_system: "쉐퍼 시스템",
  tokyo_system: "도쿄 시스템",
  turkish_angle_system: "터키 시스템",
  short_plate_system: "짧은각 접시",
  short_wedge: "숏 웨지",
  spider_web: "거미줄 시스템",
  "0tip plus": "0팁 플러스",
  "1byhalf": "반팁 시스템",
  "3and4_system": "3과4 시스템",
  "3tip_across": "3팁 횡단",
  Plus_5_system: "플러스 5",
  minus_5_system: "마이너스 5",
  n_across: "N자 횡단",
  n_across_short: "짧은 N자 횡단",
  spread30: "스프레드 30",
  split: "분열",
  accordion: "아코디언",
  florida_system: "플로리다 시스템",
};

/** 매핑 실패 시 fallbackLabel 또는 systemId 그대로 사용 (undefined 노출 방지) */
export function getSystemNameKo(
  systemId: string | null | undefined,
  fallbackLabel?: string | null
): string {
  if (!systemId) return fallbackLabel || "시스템";
  const mapped = SYSTEM_NAME_KO[systemId];
  if (mapped) return mapped;
  return fallbackLabel || systemId;
}

export function strengthToKo(v: string | null | undefined): ImpactStrengthKo | null {
  switch (v) {
    case "soft":
      return "부드러운";
    case "medium":
      return "평범한";
    case "hard":
      return "강한";
    case "sharp":
      return "날카로운";
    default:
      return null;
  }
}

/**
 * @deprecated SYS/HP/T/STR 나열형 — `composeAiAutoComment(buildAiAutoCommentModel(...))` 사용.
 * 레거시 호출만 유지.
 */
export function buildPlayStrategy(params: {
  systemName: string;
  shotType: string;

  // SYS 출력(없으면 null)
  arrivalValue: number | null;
  firstCushionValue: number | null;

  // HPT 출력
  thicknessText: string;
  tipText: string;
  tipClockText: string;
  rotationText: string;
  verticalText: string;
  mode?: "TIP" | "SPIN";

  // STR 출력
  passBalls: number | null;
  speedRails: number | null;
  accelPatternText: string | null;
  strokeTypeText: string | null;
  impactStrengthKo: ImpactStrengthKo | null;
}): string {
  const lines: string[] = [];

  lines.push(`${params.systemName}을 이용한 ${params.shotType} 공략입니다.`);

  // SYS 문장: 도착값/1쿠션 조건부 출력
  const hasArrival = params.arrivalValue != null;
  const hasFirst = params.firstCushionValue != null;

  if (hasArrival && hasFirst) {
    lines.push(
      `계산상 도착값은 ${params.arrivalValue}이며 1쿠션은 ${params.firstCushionValue} 지점을 겨냥합니다.`
    );
  } else if (hasArrival) {
    lines.push(`계산상 도착값은 ${params.arrivalValue}입니다.`);
  } else if (hasFirst) {
    lines.push(`1쿠션은 ${params.firstCushionValue} 지점을 겨냥합니다.`);
  }

  // 타점 문장: mode 기반 TIP/SPIN 분리
  let tipSentence = "";
  const mode = params.mode ?? "TIP";

  if (mode === "TIP") {
    if (params.tipText && params.tipClockText) {
      tipSentence = `타점은 ${params.tipText} (${params.tipClockText})을 사용합니다.`;
    }
  } else if (mode === "SPIN") {
    const parts: string[] = [];
    if (params.rotationText && params.rotationText !== "0") parts.push(params.rotationText);
    if (params.verticalText && params.verticalText !== "0") parts.push(params.verticalText);
    if (parts.length > 0) {
      tipSentence = `타점은 ${parts.join(" ")}을 사용합니다.`;
    }
  }

  lines.push(
    tipSentence
      ? `두께는 ${params.thicknessText}이고 ${tipSentence}`
      : `두께는 ${params.thicknessText}입니다.`
  );

  // STR 문장: 값이 충분할 때만 출력(없으면 생략). strokeTypeText null이면 스트로크 타입 문구 생략
  if (
    params.passBalls != null &&
    params.speedRails != null &&
    params.accelPatternText &&
    params.impactStrengthKo
  ) {
    if (params.strokeTypeText) {
      lines.push(
        `볼 ${params.passBalls}개 통과 기준으로, ${params.speedRails}레일 속도에서 ${params.accelPatternText} 패턴의 ${params.strokeTypeText}로 ${params.impactStrengthKo} 강도로 타격합니다.`
      );
    } else {
      lines.push(
        `볼 ${params.passBalls}개 통과 기준으로, ${params.speedRails}레일 속도에서 ${params.accelPatternText} 패턴의 ${params.impactStrengthKo} 강도로 타격합니다.`
      );
    }
  }

  return lines.join("\n");
}
