/**
 * Proofreading service — validation, provider call, numeric guard.
 */

import { assertNumericPreserved } from "./numericGuard.js";
import {
  callOpenAiProofread,
  resolveProofreadModel,
} from "./providers/openai.js";

export const MAX_PROOFREAD_CHARS = 4000;

/**
 * @param {unknown} body
 * @returns {{ ok: true, text: string } | { ok: false, status: number, error: { code: string, message: string } }}
 */
export function validateProofreadRequest(body) {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      status: 400,
      error: {
        code: "VALIDATION",
        message: "요청 형식이 올바르지 않습니다.",
      },
    };
  }
  const text = /** @type {Record<string, unknown>} */ (body).text;
  if (typeof text !== "string") {
    return {
      ok: false,
      status: 400,
      error: {
        code: "VALIDATION",
        message: "교정할 텍스트가 필요합니다.",
      },
    };
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      ok: false,
      status: 400,
      error: {
        code: "VALIDATION",
        message: "교정할 텍스트가 비어 있습니다.",
      },
    };
  }
  if (trimmed.length > MAX_PROOFREAD_CHARS) {
    return {
      ok: false,
      status: 400,
      error: {
        code: "VALIDATION",
        message: `텍스트가 너무 깁니다. (최대 ${MAX_PROOFREAD_CHARS}자)`,
      },
    };
  }
  return { ok: true, text: trimmed };
}

/**
 * @param {unknown} err
 * @returns {{ status: number, error: { code: string, message: string } }}
 */
export function normalizeProofreadError(err) {
  const code = err && typeof err === "object" ? err.code : null;
  if (code === "VALIDATION") {
    return {
      status: 400,
      error: {
        code: "VALIDATION",
        message: err.message || "요청이 올바르지 않습니다.",
      },
    };
  }
  if (code === "NUMERIC_GUARD") {
    return {
      status: 422,
      error: {
        code: "NUMERIC_GUARD",
        message:
          err.message ||
          "교정 결과가 원문의 숫자 정보를 보존하지 않아 적용할 수 없습니다.",
      },
    };
  }
  if (code === "MALFORMED") {
    return {
      status: 502,
      error: {
        code: "MALFORMED",
        message: "교정 결과를 해석하지 못했습니다. 다시 시도해 주세요.",
      },
    };
  }
  if (code === "TIMEOUT") {
    return {
      status: 504,
      error: {
        code: "TIMEOUT",
        message: "교정 요청 시간이 초과되었습니다. 다시 시도해 주세요.",
      },
    };
  }
  if (code === "CONFIG") {
    return {
      status: 503,
      error: {
        code: "CONFIG",
        message: "교정 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      },
    };
  }
  return {
    status: 502,
    error: {
      code: "PROVIDER",
      message: "교정 요청에 실패했습니다. 다시 시도해 주세요.",
    },
  };
}

/**
 * @param {{
 *   body: unknown,
 *   apiKey?: string,
 *   model?: string,
 *   callProvider?: typeof callOpenAiProofread,
 *   env?: NodeJS.ProcessEnv,
 * }} args
 */
export async function runProofread(args) {
  const validated = validateProofreadRequest(args.body);
  if (!validated.ok) {
    return {
      ok: false,
      status: validated.status,
      error: validated.error,
    };
  }

  const env = args.env || process.env;
  const apiKey = args.apiKey ?? String(env.OPENAI_API_KEY || "");
  const model = args.model || resolveProofreadModel(env);
  const callProvider = args.callProvider || callOpenAiProofread;

  let result;
  try {
    result = await callProvider({
      text: validated.text,
      apiKey,
      model,
    });
  } catch (err) {
    const normalized = normalizeProofreadError(err);
    return { ok: false, ...normalized };
  }

  if (!result || typeof result.corrected_text !== "string") {
    return {
      ok: false,
      status: 502,
      error: {
        code: "MALFORMED",
        message: "교정 결과를 해석하지 못했습니다. 다시 시도해 주세요.",
      },
    };
  }

  const corrected = result.corrected_text;
  if (!corrected.trim()) {
    return {
      ok: false,
      status: 502,
      error: {
        code: "MALFORMED",
        message: "교정 결과가 비어 있습니다. 다시 시도해 주세요.",
      },
    };
  }

  const guard = assertNumericPreserved(validated.text, corrected);
  if (!guard.ok) {
    return {
      ok: false,
      status: 422,
      error: { code: guard.code, message: guard.message },
    };
  }

  const changed =
    typeof result.changed === "boolean"
      ? result.changed
      : corrected !== validated.text;

  return {
    ok: true,
    status: 200,
    data: {
      corrected_text: corrected,
      changed,
    },
  };
}
