import { convertCanonicalAnchors } from "../../lib/convertCanonicalAnchors";

interface SystemValues {
  offset_fg2rg?: number;
  [key: string]: unknown;
}

interface ProfileForCanonical {
  safety?: {
    offset_fg2rg?: number;
  };
  [key: string]: unknown;
}

interface BuildRgAnchorsArgs {
  rawAnchors: Record<string, unknown>;
  rawAnchorsBase: Record<string, unknown> | null;
  canonical: string | null | undefined;
  systemValues: SystemValues | null | undefined;
  profileForCanonical: ProfileForCanonical | null | undefined;
  anchorsOverride: Record<string, unknown>;
}

interface RgAnchorsResult {
  anchors: Record<string, unknown>;
  anchorsBase: Record<string, unknown> | null;
}

export function buildRgAnchors({
  rawAnchors,
  rawAnchorsBase,
  canonical,
  systemValues,
  profileForCanonical,
  anchorsOverride,
}: BuildRgAnchorsArgs): RgAnchorsResult {
  const offsetFg2rg =
    typeof systemValues?.offset_fg2rg === "number"
      ? systemValues.offset_fg2rg
      : profileForCanonical?.safety?.offset_fg2rg;

  const hasConversionData =
    canonical &&
    canonical !== "canonical" &&
    typeof offsetFg2rg === "number";

  let anchors: Record<string, unknown> = rawAnchors;

  if (hasConversionData) {
    try {
      const canonicalConfig = {
        track: canonical,
        coords: {
          offset_fg2rg: offsetFg2rg ?? 2.25,
        },
      };
      anchors = convertCanonicalAnchors(rawAnchors, canonicalConfig);
    } catch (e) {
      console.warn("좌표 변환 실패, 원본 사용:", e);
    }
  } else {
    if (!canonical) {
      console.warn("canonical 정보 없음, 좌표 변환 스킵");
    } else if (typeof offsetFg2rg !== "number") {
      console.warn("offset_fg2rg 없음(profile/view), 좌표 변환 스킵");
    }
  }

  anchors = { ...anchors, ...anchorsOverride };

  let anchorsBase: Record<string, unknown> | null = null;
  if (rawAnchorsBase) {
    anchorsBase = rawAnchorsBase;
    if (hasConversionData) {
      try {
        const canonicalConfigBase = {
          track: canonical,
          coords: {
            offset_fg2rg: offsetFg2rg ?? 2.25,
          },
        };
        anchorsBase = convertCanonicalAnchors(rawAnchorsBase, canonicalConfigBase);
      } catch (e) {
        console.warn("base trajectory 좌표 변환 실패, 원본 사용:", e);
      }
    }
    anchorsBase = { ...anchorsBase, ...anchorsOverride };
  }

  return { anchors, anchorsBase };
}
