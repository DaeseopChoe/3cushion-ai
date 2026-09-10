/**
 * Phase 3B / 3B.1 — Strategy Summary override persistence contracts.
 * No OpenAI / no calculation mutation.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  captureAiCommentCommittedSnapshot,
  isAiCommentDraftDirty,
  normalizeStrategySummaryDraftText,
  pickCommittedAiForUser,
} from "./aiCommentEditorSession";
import {
  assertStrategySummaryNumericPreserved,
  buildAiCommentApplyPayloadWithSummary,
  buildStrategySummaryFingerprintInputs,
  isStrategySummaryOverrideStale,
  resolveEffectiveStrategySummary,
  serializeStrategySummaryFingerprint,
} from "./strategySummaryPersistence";
import {
  buildStrategySummaryTemplateInputs,
  composeFinalStrategySummary,
} from "./strategySummaryTemplate";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appPath = join(__dirname, "../../App.jsx");
const overlayPath = join(__dirname, "../../components/overlays/AiOverlay.jsx");

const GENERATED = composeFinalStrategySummary(
  buildStrategySummaryTemplateInputs({
    systemId: "5_half_system",
    shotType: "뒤돌리기",
    baseValues: { CO_f: 30, C1_f: 4 },
    correctedValues: {
      CO_f: 37,
      C3_r: 33,
      Sn: -6.5,
      C4_f: 26.5,
    },
    corrections: { slide: 7, draw: 0 },
  })
);

describe("Phase 3B effective summary priority", () => {
  it("missing override → generated summary", () => {
    expect(
      resolveEffectiveStrategySummary({
        generatedSummary: GENERATED,
        strategySummaryOverride: undefined,
      })
    ).toBe(normalizeStrategySummaryDraftText(GENERATED));
  });

  it("valid override wins over generated", () => {
    const override = GENERATED.replace("공략입니다", "공략입니다(관리자)");
    expect(
      resolveEffectiveStrategySummary({
        generatedSummary: GENERATED,
        strategySummaryOverride: override,
      })
    ).toBe(normalizeStrategySummaryDraftText(override));
  });
});

describe("Phase 3B Apply persistence payload", () => {
  it("identical to generated → omit override fields", () => {
    const payload = buildAiCommentApplyPayloadWithSummary({
      draftText: "원포인트",
      strategySummaryDraft: `  ${GENERATED}  `,
      generatedStrategySummary: GENERATED,
      fingerprint: "v2:{}",
    });
    expect(payload.strategySummaryOverride).toBeUndefined();
    expect(payload.strategySummaryFingerprint).toBeUndefined();
    expect(payload.onePointLessons).toHaveLength(1);
  });

  it("prose edit → stores override + fingerprint", () => {
    const edited = GENERATED.replace("공략입니다", "공략입니다!");
    const payload = buildAiCommentApplyPayloadWithSummary({
      draftText: "원포인트",
      strategySummaryDraft: edited,
      generatedStrategySummary: GENERATED,
      fingerprint: "v2:fp",
    });
    expect(payload.strategySummaryOverride).toBe(
      normalizeStrategySummaryDraftText(edited)
    );
    expect(payload.strategySummaryFingerprint).toBe("v2:fp");
  });
});

describe("Phase 3B.1 numeric protection (submultiset)", () => {
  it("same numeric tokens → allow", () => {
    expect(
      assertStrategySummaryNumericPreserved(
        GENERATED,
        GENERATED.replace("공략입니다.", "공략입니다!")
      ).ok
    ).toBe(true);
  });

  it("value change → reject", () => {
    const r = assertStrategySummaryNumericPreserved(
      GENERATED,
      GENERATED.replace("37", "38")
    );
    expect(r.ok).toBe(false);
  });

  it("optional sentence deletion → allow; new number → reject", () => {
    const withoutLast = GENERATED.split("\n").slice(0, -1).join("\n");
    expect(
      assertStrategySummaryNumericPreserved(GENERATED, withoutLast).ok
    ).toBe(true);
    expect(
      assertStrategySummaryNumericPreserved(GENERATED, `${GENERATED}\n여분 1`).ok
    ).toBe(false);
  });
});

describe("Phase 3B fingerprint + stale", () => {
  const inputs = buildStrategySummaryTemplateInputs({
    systemId: "5_half_system",
    shotType: "뒤돌리기",
    baseValues: { CO_f: 30, C1_f: 4 },
    correctedValues: { CO_f: 37, C3_r: 33, Sn: -6.5, C4_f: 26.5 },
    corrections: { slide: 7 },
  });

  it("same generator inputs → same fingerprint", () => {
    const a = serializeStrategySummaryFingerprint(
      buildStrategySummaryFingerprintInputs(inputs)
    );
    const b = serializeStrategySummaryFingerprint(
      buildStrategySummaryFingerprintInputs({ ...inputs })
    );
    expect(a).toBe(b);
  });

  it("override preserved when stale", () => {
    const override = "관리자 요약";
    expect(
      isStrategySummaryOverrideStale({
        strategySummaryOverride: override,
        strategySummaryFingerprint: "v2:old",
        currentFingerprint: "v2:new",
      })
    ).toBe(true);
    expect(
      resolveEffectiveStrategySummary({
        generatedSummary: GENERATED,
        strategySummaryOverride: override,
      })
    ).toBe(override);
  });
});

describe("Phase 3B dirty vs stale + USER isolation", () => {
  it("stale fingerprint alone does not imply draft dirty", () => {
    const snap = captureAiCommentCommittedSnapshot({
      ai: {
        onePointLessons: [{ id: "1", text: "OP" }],
        strategySummaryOverride: "관리자",
        strategySummaryFingerprint: "v2:old",
      },
      strategySummaryText: "관리자",
    });
    expect(
      isAiCommentDraftDirty({
        shotOnePointDraft: "OP",
        strategySummaryDraft: "관리자",
        committed: snap,
      })
    ).toBe(false);
  });

  it("USER pickCommittedAi reads slot override only", () => {
    const committed = pickCommittedAiForUser({
      draftAi: {
        text: "",
        onePointLessons: [{ id: "1", text: "committed OP" }],
        strategySummaryOverride: "committed summary",
        strategySummaryFingerprint: "v2:x",
      },
    });
    expect(committed?.strategySummaryOverride).toBe("committed summary");
    expect(committed).not.toHaveProperty("strategySummaryDraft");
  });
});

describe("Phase 3B SAVE/History clone compatibility", () => {
  it("JSON clone preserves optional override fields", () => {
    const ai = {
      text: "",
      onePointLessons: [{ id: "1", text: "OP" }],
      strategySummaryOverride: "관리자 요약",
      strategySummaryFingerprint: "v2:fp",
    };
    const cloned = JSON.parse(JSON.stringify(ai));
    expect(cloned.strategySummaryOverride).toBe("관리자 요약");
    expect(cloned.strategySummaryFingerprint).toBe("v2:fp");
  });

  it("family writers clone ai wholesale", () => {
    const writer = readFileSync(
      join(__dirname, "../family/familyAwareWriter.ts"),
      "utf8"
    );
    expect(writer).toContain("ai: cloneJson(source.ai)");
  });
});

describe("Phase 3B App / Overlay wiring", () => {
  const app = readFileSync(appPath, "utf8");
  const overlay = readFileSync(overlayPath, "utf8");

  it("Apply uses numeric guard + summary payload; keep-open", () => {
    const commit = app.slice(
      app.indexOf("const commitAiCommentEditorSession"),
      app.indexOf("const applyOnePointToShot")
    );
    expect(commit).toContain("assertStrategySummaryNumericPreserved");
    expect(commit).toContain("buildAiCommentApplyPayloadWithSummary");
    expect(commit).toContain("keep AI overlay open after Apply");
  });

  it("stale warning + restore in ADMIN overlay", () => {
    expect(overlay).toContain("strategySummaryStale");
    expect(overlay).toContain("원본 요약으로 되돌리기");
    expect(app).toContain("restoreStrategySummaryToGenerated");
  });

  it("Cancel restores override fields; keep-open", () => {
    const cancel = app.slice(
      app.indexOf("const cancelAiCommentEditorSession"),
      app.indexOf("const onStrategySummaryDraftChange")
    );
    expect(cancel).toContain("strategySummaryOverride");
    expect(cancel).toContain("keep AI overlay open after Cancel");
  });
});
