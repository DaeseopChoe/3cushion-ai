/**
 * AI proofreading server/client contracts — mocked provider only (no live OpenAI).
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import {
  assertNumericPreserved,
  extractNumericTokens,
} from "../../../api/_lib/numericGuard.js";
import {
  STYLE_CONTRACT_ID,
  buildProofreadingSystemPrompt,
  buildProofreadingUserPrompt,
} from "../../../api/_lib/styleContract.js";
import {
  MAX_PROOFREAD_CHARS,
  normalizeProofreadError,
  runProofread,
  validateProofreadRequest,
} from "../../../api/_lib/proofreadService.js";
import {
  parseProofreadJson,
  extractOutputText,
  callOpenAiProofread,
  extractUpstreamErrorDiagnostics,
  sanitizeUpstreamDiagnosticMessage,
  logOpenAiUpstreamDiagnostic,
} from "../../../api/_lib/providers/openai.js";
import {
  canAcceptProofreadResponse,
  fetchProofreading,
} from "./proofreadingClient";

const SAMPLE_ORIGINAL =
  "파이브앤드 시스템은 가장 보편적으로 많이 사용하는 시스탬입다. 따라서 해당 시스템을 잘알아야 한다.";
const SAMPLE_CORRECTED =
  "파이브앤드 시스템은 가장 보편적으로 많이 사용하는 시스템입니다. 따라서 해당 시스템을 잘 알아야 합니다.";

describe("numericGuard", () => {
  it("extracts fractions, signed values, units, and cushion labels", () => {
    expect(extractNumericTokens("두께 1/2, 속도 2.5레일, +2, -1, 30°, 50%, 80mm, 2C")).toEqual(
      ["+2", "-1", "1/2", "2.5", "2C", "30°", "50%", "80mm"].sort()
    );
  });

  it("accepts identical numeric multisets", () => {
    expect(
      assertNumericPreserved("볼 2개, 2.5레일", "볼 2개 기준, 2.5레일 속도").ok
    ).toBe(true);
  });

  it("rejects numeric mutation", () => {
    const result = assertNumericPreserved("2.5레일", "3.0레일");
    expect(result.ok).toBe(false);
    expect(result.code).toBe("NUMERIC_GUARD");
  });
});

describe("styleContract SSOT", () => {
  it("defines proofreading editor role and preservation rules", () => {
    const prompt = buildProofreadingSystemPrompt();
    expect(STYLE_CONTRACT_ID).toBe("one-point-lesson-proofread-v1");
    expect(prompt).toContain("교정 편집자");
    expect(prompt).toContain("내용 작성자가 아니다");
    expect(prompt).toContain("숫자");
    expect(prompt).toContain("전문용어");
    expect(buildProofreadingUserPrompt(SAMPLE_ORIGINAL)).toContain(
      SAMPLE_ORIGINAL
    );
  });
});

describe("proofreadService validation", () => {
  it("rejects empty / non-string / oversized input", () => {
    expect(validateProofreadRequest({ text: "   " }).ok).toBe(false);
    expect(validateProofreadRequest({ text: 123 }).ok).toBe(false);
    expect(
      validateProofreadRequest({ text: "a".repeat(MAX_PROOFREAD_CHARS + 1) }).ok
    ).toBe(false);
  });

  it("sanitizes provider errors", () => {
    const normalized = normalizeProofreadError({
      code: "PROVIDER",
      message: "secret sk-abc detail",
    });
    expect(normalized.error.message).not.toContain("sk-abc");
    expect(normalized.error.code).toBe("PROVIDER");
  });
});

describe("openai adapter parse helpers", () => {
  it("parses structured JSON and output_text", () => {
    expect(
      parseProofreadJson(
        JSON.stringify({ corrected_text: SAMPLE_CORRECTED, changed: true })
      )
    ).toEqual({ corrected_text: SAMPLE_CORRECTED, changed: true });
    expect(
      extractOutputText({
        output: [
          {
            content: [{ type: "output_text", text: '{"corrected_text":"ok","changed":false}' }],
          },
        ],
      })
    ).toContain("corrected_text");
  });

  it("rejects malformed JSON", () => {
    expect(() => parseProofreadJson("not-json")).toThrow();
  });
});

describe("runProofread (mocked provider)", () => {
  it("returns corrected text when provider succeeds", async () => {
    const result = await runProofread({
      body: { text: SAMPLE_ORIGINAL },
      apiKey: "test-key",
      callProvider: async () => ({
        corrected_text: SAMPLE_CORRECTED,
        changed: true,
      }),
    });
    expect(result.ok).toBe(true);
    expect(result.data.corrected_text).toBe(SAMPLE_CORRECTED);
    expect(result.data.changed).toBe(true);
  });

  it("supports changed=false", async () => {
    const result = await runProofread({
      body: { text: SAMPLE_CORRECTED },
      apiKey: "test-key",
      callProvider: async () => ({
        corrected_text: SAMPLE_CORRECTED,
        changed: false,
      }),
    });
    expect(result.ok).toBe(true);
    expect(result.data.changed).toBe(false);
  });

  it("rejects numeric mutation from provider", async () => {
    const result = await runProofread({
      body: { text: "속도 2.5레일 패턴입니다." },
      apiKey: "test-key",
      callProvider: async () => ({
        corrected_text: "속도 3.0레일 패턴입니다.",
        changed: true,
      }),
    });
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe("NUMERIC_GUARD");
  });

  it("rejects empty corrected_text", async () => {
    const result = await runProofread({
      body: { text: SAMPLE_ORIGINAL },
      apiKey: "test-key",
      callProvider: async () => ({
        corrected_text: "   ",
        changed: true,
      }),
    });
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe("MALFORMED");
  });

  it("normalizes provider throw", async () => {
    const result = await runProofread({
      body: { text: SAMPLE_ORIGINAL },
      apiKey: "test-key",
      callProvider: async () => {
        const err = new Error("upstream boom with sk-secret");
        err.code = "PROVIDER";
        throw err;
      },
    });
    expect(result.ok).toBe(false);
    expect(result.error.message).not.toContain("sk-secret");
  });

  it("reads OPENAI_API_KEY and OPENAI_PROOFREAD_MODEL from explicit env arg", async () => {
    const seen = { apiKey: "", model: "" };
    const result = await runProofread({
      body: { text: SAMPLE_ORIGINAL },
      env: {
        OPENAI_API_KEY: "env-injected-key",
        OPENAI_PROOFREAD_MODEL: "gpt-5.6-luna",
      },
      callProvider: async (args) => {
        seen.apiKey = args.apiKey;
        seen.model = args.model;
        return { corrected_text: SAMPLE_CORRECTED, changed: true };
      },
    });
    expect(result.ok).toBe(true);
    expect(seen.apiKey).toBe("env-injected-key");
    expect(seen.model).toBe("gpt-5.6-luna");
    expect(JSON.stringify(result)).not.toContain("env-injected-key");
  });

  it("returns CONFIG when env has no OPENAI_API_KEY", async () => {
    const result = await runProofread({
      body: { text: SAMPLE_ORIGINAL },
      env: { OPENAI_PROOFREAD_MODEL: "gpt-5.6-luna" },
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
    expect(result.error.code).toBe("CONFIG");
  });
});

describe("proofreadingClient", () => {
  it("posts text and parses success", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        corrected_text: SAMPLE_CORRECTED,
        changed: true,
      }),
    }));
    const result = await fetchProofreading(SAMPLE_ORIGINAL, { fetchImpl });
    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/proofread",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ text: SAMPLE_ORIGINAL }),
      })
    );
  });

  it("maps HTTP error payload safely", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      json: async () => ({
        error: { code: "NUMERIC_GUARD", message: "숫자 보존 실패" },
      }),
    }));
    const result = await fetchProofreading(SAMPLE_ORIGINAL, { fetchImpl });
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe("NUMERIC_GUARD");
  });

  it("guards stale responses", () => {
    expect(
      canAcceptProofreadResponse({
        generation: 1,
        currentGeneration: 1,
        requestText: "A",
        currentDraft: "A",
      })
    ).toBe(true);
    expect(
      canAcceptProofreadResponse({
        generation: 1,
        currentGeneration: 2,
        requestText: "A",
        currentDraft: "A",
      })
    ).toBe(false);
    expect(
      canAcceptProofreadResponse({
        generation: 1,
        currentGeneration: 1,
        requestText: "A",
        currentDraft: "A'",
      })
    ).toBe(false);
  });
});

describe("OpenAI upstream safe diagnostics", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts status/type/code/message/param without secrets", () => {
    const diagnostic = extractUpstreamErrorDiagnostics(
      {
        error: {
          type: "invalid_request_error",
          code: "unsupported_parameter",
          message: "Unsupported parameter: 'temperature' is not supported with this model.",
          param: "temperature",
        },
      },
      400
    );
    expect(diagnostic).toEqual({
      status: 400,
      type: "invalid_request_error",
      code: "unsupported_parameter",
      message:
        "Unsupported parameter: 'temperature' is not supported with this model.",
      param: "temperature",
    });
  });

  it("redacts secret-like tokens from diagnostic messages", () => {
    expect(
      sanitizeUpstreamDiagnosticMessage(
        "bad key Bearer sk-abcdefghijklmnop and OPENAI_API_KEY=secretvalue"
      )
    ).toBe("bad key [redacted] and [redacted]");
  });

  it("logs only safe diagnostic fields", () => {
    const error = vi.fn();
    logOpenAiUpstreamDiagnostic(
      {
        status: 403,
        type: "invalid_request_error",
        code: "missing_scope",
        message: "Insufficient permissions",
        param: null,
      },
      { error }
    );
    expect(error).toHaveBeenCalledWith("[AI Proofread][OpenAI upstream]", {
      status: 403,
      type: "invalid_request_error",
      code: "missing_scope",
      message: "Insufficient permissions",
      param: null,
    });
    const logged = JSON.stringify(error.mock.calls[0]);
    expect(logged).not.toContain("Authorization");
    expect(logged).not.toContain("OPENAI_API_KEY");
    expect(logged).not.toContain(SAMPLE_ORIGINAL);
  });

  for (const status of [400, 401, 403, 429]) {
    it(`maps OpenAI HTTP ${status} to public PROVIDER 502 while logging diagnostics`, async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const fetchImpl = vi.fn(async () => ({
        ok: false,
        status,
        text: async () =>
          JSON.stringify({
            error: {
              type: "invalid_request_error",
              code: `mock_${status}`,
              message: `mock failure ${status}`,
              param: status === 400 ? "temperature" : null,
            },
          }),
      }));

      const result = await runProofread({
        body: { text: SAMPLE_ORIGINAL },
        apiKey: "test-key-not-for-logging",
        callProvider: (args) => callOpenAiProofread({ ...args, fetchImpl }),
      });

      expect(result.ok).toBe(false);
      expect(result.status).toBe(502);
      expect(result.error).toEqual({
        code: "PROVIDER",
        message: "교정 요청에 실패했습니다. 다시 시도해 주세요.",
      });
      expect(JSON.stringify(result)).not.toContain("mock failure");
      expect(JSON.stringify(result)).not.toContain("temperature");
      expect(JSON.stringify(result)).not.toContain("test-key-not-for-logging");

      expect(errorSpy).toHaveBeenCalledWith(
        "[AI Proofread][OpenAI upstream]",
        expect.objectContaining({
          status,
          type: "invalid_request_error",
          code: `mock_${status}`,
          message: `mock failure ${status}`,
        })
      );
      const logPayload = JSON.stringify(errorSpy.mock.calls);
      expect(logPayload).not.toContain("test-key-not-for-logging");
      expect(logPayload).not.toContain("Authorization");
      expect(logPayload).not.toContain(SAMPLE_ORIGINAL);
    });
  }

  it("omits unsupported temperature and sets reasoning.effort none", async () => {
    let requestBody = "";
    const fetchImpl = vi.fn(async (_url, init) => {
      requestBody = String(init?.body || "");
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            output_text: JSON.stringify({
              corrected_text: SAMPLE_CORRECTED,
              changed: true,
            }),
          }),
      };
    });
    const result = await callOpenAiProofread({
      text: SAMPLE_ORIGINAL,
      apiKey: "test-key",
      model: "gpt-5.6-luna",
      fetchImpl,
    });
    expect(result.ok !== false).toBe(true);
    expect(result.corrected_text).toBe(SAMPLE_CORRECTED);
    const parsed = JSON.parse(requestBody);
    expect(parsed).not.toHaveProperty("temperature");
    expect(parsed).not.toHaveProperty("stream");
    expect(parsed).not.toHaveProperty("tools");
    expect(parsed.model).toBe("gpt-5.6-luna");
    expect(parsed.reasoning).toEqual({ effort: "none" });
    expect(parsed.text?.format?.type).toBe("json_schema");
    expect(parsed.text?.format?.strict).toBe(true);
    expect(parsed.text?.format?.name).toBe(STYLE_CONTRACT_ID);
    expect(parsed.text?.format?.schema).toEqual({
      type: "object",
      properties: {
        corrected_text: { type: "string" },
        changed: { type: "boolean" },
      },
      required: ["corrected_text", "changed"],
      additionalProperties: false,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("Phase 3D: env model gpt-5.6-luna reaches Responses payload unchanged", async () => {
    let requestBody = "";
    const fetchImpl = vi.fn(async (_url, init) => {
      requestBody = String(init?.body || "");
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            output_text: JSON.stringify({
              corrected_text: SAMPLE_CORRECTED,
              changed: true,
            }),
          }),
      };
    });
    const result = await runProofread({
      body: { text: SAMPLE_ORIGINAL },
      env: {
        OPENAI_API_KEY: "env-key",
        OPENAI_PROOFREAD_MODEL: "gpt-5.6-luna",
      },
      callProvider: (args) => callOpenAiProofread({ ...args, fetchImpl }),
    });
    expect(result.ok).toBe(true);
    const parsed = JSON.parse(requestBody);
    expect(parsed.model).toBe("gpt-5.6-luna");
    expect(parsed.reasoning).toEqual({ effort: "none" });
    expect(JSON.stringify(result)).not.toContain("env-key");
  });
});

describe("proofreading terminology / numeric regression fixtures", () => {
  const TERM_SAMPLE =
    "밀림이 발생하지 않도록 그림의 힘을 빼고 경쾌하게 스트로크해야 합니다.";
  const NUMERIC_SAMPLE =
    "출발값 30에서 밀림값 +4를 보정하면 출발값은 34가 됩니다.";

  it("Style Contract still requires terminology and numeric preservation", () => {
    const prompt = buildProofreadingSystemPrompt();
    expect(prompt).toContain("전문용어");
    expect(prompt).toContain("숫자");
    expect(prompt).toContain("원문에 없는 기술적 사실");
    expect(prompt).toContain("교정 편집자");
  });

  it("numeric guard preserves 출발값 / 밀림값 tokens (30, +4, 34)", () => {
    const tokens = extractNumericTokens(NUMERIC_SAMPLE);
    expect(tokens).toEqual(["+4", "30", "34"].sort());
    expect(assertNumericPreserved(NUMERIC_SAMPLE, NUMERIC_SAMPLE).ok).toBe(true);
    expect(
      assertNumericPreserved(
        NUMERIC_SAMPLE,
        "출발값 30에서 밀림값 +4를 보정하면 출발값은 34가 됩니다."
      ).ok
    ).toBe(true);
    expect(
      assertNumericPreserved(
        NUMERIC_SAMPLE,
        "출발값 31에서 밀림값 +4를 보정하면 출발값은 34가 됩니다."
      ).ok
    ).toBe(false);
  });

  it("mocked provider path keeps term sample text through Numeric Guard", async () => {
    const corrected = TERM_SAMPLE;
    const result = await runProofread({
      body: { text: TERM_SAMPLE },
      apiKey: "test-key",
      callProvider: async () => ({
        corrected_text: corrected,
        changed: false,
      }),
    });
    expect(result.ok).toBe(true);
    expect(result.data.corrected_text).toContain("그림");
    expect(result.data.corrected_text).toContain("스트로크");
    expect(result.data.corrected_text).toContain("밀림");
    expect(assertNumericPreserved(TERM_SAMPLE, result.data.corrected_text).ok).toBe(
      true
    );
  });

  it("rejects mocked provider output that mutates 출발값 numerics", async () => {
    const result = await runProofread({
      body: { text: NUMERIC_SAMPLE },
      apiKey: "test-key",
      callProvider: async () => ({
        corrected_text:
          "출발값 31에서 밀림값 +4를 보정하면 출발값은 34가 됩니다.",
        changed: true,
      }),
    });
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe("NUMERIC_GUARD");
  });
});
