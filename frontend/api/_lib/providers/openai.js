/**
 * Thin OpenAI Responses API adapter (server-only).
 * No SDK — HTTPS fetch only.
 */

import {
  PROOFREAD_RESPONSE_SCHEMA,
  STYLE_CONTRACT_ID,
  buildProofreadingSystemPrompt,
  buildProofreadingUserPrompt,
} from "../styleContract.js";

export const DEFAULT_PROOFREAD_MODEL = "gpt-5.6-terra";
export const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const DIAGNOSTIC_MESSAGE_MAX = 240;
const SECRETISH_RE =
  /\b(sk-[A-Za-z0-9_-]+|Bearer\s+\S+|OPENAI_API_KEY\s*=\s*\S+)/gi;

/**
 * @returns {string}
 */
export function resolveProofreadModel(env = process.env) {
  const fromEnv = String(env.OPENAI_PROOFREAD_MODEL || "").trim();
  return fromEnv || DEFAULT_PROOFREAD_MODEL;
}

/**
 * Sanitize upstream error.message for server-only diagnostics.
 * @param {unknown} value
 * @returns {string | null}
 */
export function sanitizeUpstreamDiagnosticMessage(value) {
  if (typeof value !== "string") return null;
  let text = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (!text) return null;
  text = text.replace(SECRETISH_RE, "[redacted]");
  if (text.length > DIAGNOSTIC_MESSAGE_MAX) {
    text = `${text.slice(0, DIAGNOSTIC_MESSAGE_MAX)}…`;
  }
  return text;
}

/**
 * Extract safe OpenAI error fields from a parsed non-2xx body.
 * @param {unknown} body
 * @param {number} status
 */
export function extractUpstreamErrorDiagnostics(body, status) {
  const errObj =
    body &&
    typeof body === "object" &&
    /** @type {Record<string, unknown>} */ (body).error &&
    typeof /** @type {Record<string, unknown>} */ (body).error === "object"
      ? /** @type {Record<string, unknown>} */ (
          /** @type {Record<string, unknown>} */ (body).error
        )
      : null;

  const type = errObj && typeof errObj.type === "string" ? errObj.type : null;
  const code = errObj && typeof errObj.code === "string" ? errObj.code : null;
  let param = null;
  if (errObj && typeof errObj.param === "string") {
    param = errObj.param;
  } else if (errObj && errObj.param === null) {
    param = null;
  }
  const message = sanitizeUpstreamDiagnosticMessage(
    errObj ? errObj.message : null
  );

  return {
    status: Number.isFinite(status) ? status : null,
    type,
    code,
    message,
    param,
  };
}

/**
 * Server-terminal-only diagnostic. Never include secrets/request/user text.
 * @param {ReturnType<typeof extractUpstreamErrorDiagnostics>} diagnostic
 * @param {{ error?: (...args: unknown[]) => void }} [logger]
 */
export function logOpenAiUpstreamDiagnostic(diagnostic, logger = console) {
  logger.error("[AI Proofread][OpenAI upstream]", {
    status: diagnostic.status,
    type: diagnostic.type,
    code: diagnostic.code,
    message: diagnostic.message,
    param: diagnostic.param,
  });
}

/**
 * Extract output_text from a Responses API JSON body.
 * @param {unknown} body
 * @returns {string}
 */
export function extractOutputText(body) {
  if (!body || typeof body !== "object") return "";
  const row = /** @type {Record<string, unknown>} */ (body);
  if (typeof row.output_text === "string" && row.output_text.trim()) {
    return row.output_text;
  }
  const output = row.output;
  if (!Array.isArray(output)) return "";
  const chunks = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = /** @type {Record<string, unknown>} */ (item).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const p = /** @type {Record<string, unknown>} */ (part);
      if (p.type === "output_text" && typeof p.text === "string") {
        chunks.push(p.text);
      }
    }
  }
  return chunks.join("");
}

/**
 * @param {string} raw
 * @returns {{ corrected_text: string, changed: boolean }}
 */
export function parseProofreadJson(raw) {
  const text = String(raw ?? "").trim();
  if (!text) {
    const err = new Error("Empty model output");
    err.code = "MALFORMED";
    throw err;
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const err = new Error("Model output is not valid JSON");
    err.code = "MALFORMED";
    throw err;
  }
  if (!parsed || typeof parsed !== "object") {
    const err = new Error("Model output is not an object");
    err.code = "MALFORMED";
    throw err;
  }
  const corrected =
    typeof parsed.corrected_text === "string" ? parsed.corrected_text : null;
  if (corrected == null) {
    const err = new Error("Missing corrected_text");
    err.code = "MALFORMED";
    throw err;
  }
  if (typeof parsed.changed !== "boolean") {
    const err = new Error("Missing or invalid changed flag");
    err.code = "MALFORMED";
    throw err;
  }
  return { corrected_text: corrected, changed: parsed.changed };
}

/**
 * @param {{ text: string, apiKey: string, model?: string, fetchImpl?: typeof fetch, timeoutMs?: number }} args
 */
export async function callOpenAiProofread(args) {
  const apiKey = String(args.apiKey || "").trim();
  if (!apiKey) {
    const err = new Error("OpenAI API key is not configured");
    err.code = "CONFIG";
    throw err;
  }
  const model = String(args.model || resolveProofreadModel()).trim();
  const fetchImpl = args.fetchImpl || fetch;
  const timeoutMs = Number.isFinite(args.timeoutMs) ? args.timeoutMs : 25000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const payload = {
    model,
    instructions: buildProofreadingSystemPrompt(),
    input: [
      {
        role: "user",
        content: buildProofreadingUserPrompt(args.text),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: STYLE_CONTRACT_ID,
        strict: true,
        schema: PROOFREAD_RESPONSE_SCHEMA,
      },
    },
  };

  try {
    const res = await fetchImpl(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const rawBody = await res.text();
    let body;
    try {
      body = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      body = null;
    }

    if (!res.ok) {
      const diagnostic = extractUpstreamErrorDiagnostics(body, res.status);
      logOpenAiUpstreamDiagnostic(diagnostic);
      const err = new Error("Proofreading provider request failed");
      err.code = "PROVIDER";
      err.status = res.status;
      throw err;
    }

    const outputText = extractOutputText(body);
    return parseProofreadJson(outputText);
  } catch (e) {
    if (e?.name === "AbortError") {
      const err = new Error("Proofreading request timed out");
      err.code = "TIMEOUT";
      throw err;
    }
    if (e?.code) throw e;
    const err = new Error("Proofreading provider request failed");
    err.code = "PROVIDER";
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
