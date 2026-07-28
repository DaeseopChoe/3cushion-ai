/**
 * SYS 계산 결과 Display Model — 표시 전용 (Domain 계산 금지).
 * 숫자는 호출측이 넘긴 값을 포맷만 한다.
 */

export type SysDisplayPart =
  | { type: "value"; label: string; value: string }
  | { type: "operator"; text: string }
  | { type: "plain"; text: string };

export type SysDisplayLine = {
  id: string;
  layout: "stack" | "inline" | "divider" | "note";
  parts: SysDisplayPart[];
};

export type SysDisplaySection = {
  id: string;
  title: string | null;
  /** true면 [title], false면 title 그대로 (기본 true) */
  titleBracket?: boolean;
  /** USER UI 설명용 — Admin에서는 미표시 */
  description: string | null;
  lines: SysDisplayLine[];
};

export type SysDisplayBlock = {
  id: "baseline" | "corrected";
  title: string;
  visible: boolean;
  sections: SysDisplaySection[];
};

export type SysCalcDisplayModel = {
  systemId: string;
  ready: boolean;
  blocks: SysDisplayBlock[];
};

export type SysCalcDisplayInput = {
  systemId: string;
  hasAllInputs: boolean;
  useSn: boolean;
  /** 기준 CO / C1 / C3 (normalizedBasePayload) */
  baseCo: number | null;
  baseC1: number | null;
  baseC3: number | null;
  /** 보정 반영 CO / C3 (effDisplayMap / adjustedInputs) */
  effCo?: number | null;
  effC3?: number | null;
  /** unified slide (밀림 +, 끌림 −) */
  unifiedSlide?: number;
  angleTilt?: number;
  spin?: number;
  /** 보정 블록 표시 여부 (호출측 hasAnyCorrection) */
  hasCorrection?: boolean;
};

const CORRECTION_EPS = 1e-9;

/** 표시용 숫자 포맷 — sysOverlayUtils.fmtFiveHalfDisplayNum 과 동일 규칙 */
export function fmtSysDisplayNum(n: number): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return "?";
  return x % 1 === 0 ? String(Math.round(x)) : String(Math.round(x * 10) / 10);
}

/** 출발 보정 표시: 양수 +n, 음수 -n, 0은 0 */
export function fmtSignedDeparture(n: number): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return "?";
  if (x === 0) return "0";
  const body = fmtSysDisplayNum(Math.abs(x));
  return x > 0 ? `+${body}` : `-${body}`;
}

function isFiveHalfSystemId(systemId: string | null | undefined): boolean {
  const s = systemId == null ? "" : String(systemId);
  return s === "5_half_system" || s === "5_HALF" || s === "five_half";
}

/** 기준 Sn 표시 산술: (CO − 50) × 0.5 — Domain 미호출 */
function snFromCoDisplay(co: number): number {
  return (co - 50) * 0.5;
}

function valuePart(label: string, value: string): SysDisplayPart {
  return { type: "value", label, value };
}

function opPart(text: string): SysDisplayPart {
  return { type: "operator", text };
}

function plainPart(text: string): SysDisplayPart {
  return { type: "plain", text };
}

function inlineLine(id: string, parts: SysDisplayPart[]): SysDisplayLine {
  return { id, layout: "inline", parts };
}

function noteLine(id: string, parts: SysDisplayPart[]): SysDisplayLine {
  return { id, layout: "note", parts };
}

function finiteNum(n: number | null | undefined): n is number {
  return n != null && Number.isFinite(n);
}

export function buildBaselineBlock(input: SysCalcDisplayInput): SysDisplayBlock {
  const { systemId, hasAllInputs, useSn, baseCo, baseC1, baseC3 } = input;
  const ready =
    isFiveHalfSystemId(systemId) &&
    hasAllInputs &&
    finiteNum(baseCo) &&
    finiteNum(baseC1) &&
    finiteNum(baseC3);

  if (!ready) {
    return {
      id: "baseline",
      title: "기준 계산",
      visible: false,
      sections: [],
    };
  }

  const co = baseCo;
  const c1 = baseC1;
  const c3 = baseC3;
  const coS = fmtSysDisplayNum(co);
  const c1S = fmtSysDisplayNum(c1);
  const c3S = fmtSysDisplayNum(c3);

  const formulaSection: SysDisplaySection = {
    id: "baseline-formula",
    title: "공식",
    description: "출발값과 3쿠션으로 1쿠션을 계산합니다.",
    lines: [
      inlineLine("baseline-formula-eq", [
        valuePart("1쿠션", c1S),
        plainPart("="),
        valuePart("출발", coS),
        opPart("-"),
        valuePart("3쿠션", c3S),
      ]),
    ],
  };

  const sections: SysDisplaySection[] = [formulaSection];

  if (useSn) {
    const sn = snFromCoDisplay(co);
    const c4 = c3 + sn;
    const snS = fmtSignedDeparture(sn);
    const c4S = fmtSysDisplayNum(c4);

    sections.push({
      id: "baseline-c4",
      title: "4쿠션",
      description: "3쿠션에 출발 보정을 더해 4쿠션을 계산합니다.",
      lines: [
        inlineLine("baseline-c4-eq", [
          valuePart("3쿠션", c3S),
          opPart("+"),
          valuePart("출발 보정", snS),
          plainPart("="),
          valuePart("4쿠션", c4S),
        ]),
        noteLine("baseline-c4-note", [
          plainPart("※ 5쿠션, 6쿠션은 4쿠션과 같은 값을 사용"),
        ]),
      ],
    });
  }

  return {
    id: "baseline",
    title: "기준 계산",
    visible: true,
    sections,
  };
}

/**
 * Corrected Block — 호출측이 넘긴 보정 숫자만 표시 조립.
 */
export function buildCorrectedBlock(input: SysCalcDisplayInput): SysDisplayBlock {
  const {
    systemId,
    hasAllInputs,
    useSn,
    baseCo,
    baseC1,
    effCo,
    effC3,
    unifiedSlide = 0,
    angleTilt = 0,
    spin = 0,
    hasCorrection = false,
  } = input;

  const ready =
    isFiveHalfSystemId(systemId) &&
    hasAllInputs &&
    hasCorrection &&
    finiteNum(baseCo) &&
    finiteNum(baseC1) &&
    finiteNum(effCo) &&
    finiteNum(effC3);

  if (!ready) {
    return {
      id: "corrected",
      title: "보정 계산",
      visible: false,
      sections: [],
    };
  }

  const coBase = baseCo;
  const c1 = baseC1;
  const coE = effCo;
  const c3E = effC3;
  const slide = Number(unifiedSlide) || 0;
  const tilt = Number(angleTilt) || 0;
  const sp = Number(spin) || 0;

  const slideMag = Math.abs(slide) > CORRECTION_EPS ? Math.abs(slide) : 0;
  const milim = slide > CORRECTION_EPS ? slideMag : 0;
  const kkeullim = slide < -CORRECTION_EPS ? slideMag : 0;
  const snEff = useSn ? snFromCoDisplay(coE) : null;

  const summaryItems: string[] = [];
  if (milim > CORRECTION_EPS) summaryItems.push(`밀림 = ${fmtSysDisplayNum(milim)}`);
  if (kkeullim > CORRECTION_EPS) summaryItems.push(`끌림 = ${fmtSysDisplayNum(kkeullim)}`);
  if (Math.abs(tilt) > CORRECTION_EPS) {
    summaryItems.push(`기울기 = ${fmtSysDisplayNum(tilt)}`);
  }
  if (Math.abs(sp) > CORRECTION_EPS) {
    summaryItems.push(`스핀 = ${fmtSysDisplayNum(sp)}`);
  }
  if (snEff != null && Math.abs(snEff) > CORRECTION_EPS) {
    summaryItems.push(`4쿠션 보정값 = ${fmtSignedDeparture(snEff)}`);
  }

  const sections: SysDisplaySection[] = [];

  if (summaryItems.length > 0) {
    sections.push({
      id: "corrected-summary",
      title: "보정",
      description: "적용된 보정량 요약입니다.",
      lines: [
        inlineLine("corrected-summary-vals", [
          plainPart(summaryItems.join(", ")),
        ]),
      ],
    });
  }

  // 출발 보정: 출발(base) ± 밀림|끌림 = 보정한 출발값(eff)
  if (Math.abs(slide) > CORRECTION_EPS) {
    const startParts: SysDisplayPart[] = [
      valuePart("출발", fmtSysDisplayNum(coBase)),
    ];
    if (slide > 0) {
      startParts.push(opPart("+"), valuePart("밀림", fmtSysDisplayNum(milim)));
    } else {
      startParts.push(opPart("-"), valuePart("끌림", fmtSysDisplayNum(kkeullim)));
    }
    startParts.push(
      plainPart("="),
      valuePart("보정한 출발값", fmtSysDisplayNum(coE))
    );
    sections.push({
      id: "corrected-start",
      title: "출발값 보정",
      description: "밀림·끌림을 출발값에 반영합니다.",
      lines: [inlineLine("corrected-start-eq", startParts)],
    });
  }

  // 3쿠션 보정: 보정한 출발값 [±기울기] [±스핀] - 1쿠션 = 보정한 3쿠션
  {
    const c3Parts: SysDisplayPart[] = [
      valuePart("보정한 출발값", fmtSysDisplayNum(coE)),
    ];
    if (Math.abs(tilt) > CORRECTION_EPS) {
      c3Parts.push(
        opPart(tilt > 0 ? "+" : "-"),
        valuePart("기울기", fmtSysDisplayNum(Math.abs(tilt)))
      );
    }
    if (Math.abs(sp) > CORRECTION_EPS) {
      c3Parts.push(
        opPart(sp > 0 ? "+" : "-"),
        valuePart("스핀", fmtSysDisplayNum(Math.abs(sp)))
      );
    }
    c3Parts.push(
      opPart("-"),
      valuePart("1쿠션", fmtSysDisplayNum(c1)),
      plainPart("="),
      valuePart("보정한 3쿠션", fmtSysDisplayNum(c3E))
    );
    sections.push({
      id: "corrected-c3",
      title: "3쿠션 보정",
      description: "보정한 출발값과 기울기·스핀으로 3쿠션을 계산합니다.",
      lines: [inlineLine("corrected-c3-eq", c3Parts)],
    });
  }

  if (useSn && snEff != null) {
    const c4Eff = c3E + snEff;
    sections.push({
      id: "corrected-c4",
      title: "4쿠션 보정",
      description: "보정한 3쿠션에 4쿠션 보정값을 더해 4쿠션을 계산합니다.",
      lines: [
        inlineLine("corrected-c4-eq", [
          valuePart("보정한 3쿠션", fmtSysDisplayNum(c3E)),
          opPart("+"),
          valuePart("4쿠션 보정값", fmtSignedDeparture(snEff)),
          plainPart("="),
          valuePart("보정한 4쿠션", fmtSysDisplayNum(c4Eff)),
        ]),
      ],
    });
  }

  return {
    id: "corrected",
    title: "보정 계산",
    visible: true,
    sections,
  };
}

export function buildSysCalcDisplayModel(
  input: SysCalcDisplayInput
): SysCalcDisplayModel {
  const baseline = buildBaselineBlock(input);
  const corrected = buildCorrectedBlock(input);
  return {
    systemId: input.systemId,
    ready: baseline.visible,
    blocks: [baseline, corrected],
  };
}
