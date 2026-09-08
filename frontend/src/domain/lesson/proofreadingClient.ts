/**
 * Thin browser client for One-Point Lesson AI proofreading.
 * No Style Contract / API key / model selection here.
 */

export type ProofreadSuccess = {
  corrected_text: string;
  changed: boolean;
};

export type ProofreadError = {
  code: string;
  message: string;
};

export type ProofreadResult =
  | { ok: true; data: ProofreadSuccess }
  | { ok: false; error: ProofreadError };

export type FetchProofreadingOptions = {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  endpoint?: string;
};

const DEFAULT_ENDPOINT = "/api/proofread";

function safeError(
  code: string,
  message: string
): { ok: false; error: ProofreadError } {
  return { ok: false, error: { code, message } };
}

/**
 * POST text to the server-side proofreading endpoint.
 */
export async function fetchProofreading(
  text: string,
  options: FetchProofreadingOptions = {}
): Promise<ProofreadResult> {
  if (typeof text !== "string") {
    return safeError("VALIDATION", "교정할 텍스트가 필요합니다.");
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return safeError("VALIDATION", "교정할 텍스트가 비어 있습니다.");
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT;

  let res: Response;
  try {
    res = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed }),
      signal: options.signal,
    });
  } catch (err) {
    if (err && typeof err === "object" && (err as { name?: string }).name === "AbortError") {
      return safeError("ABORTED", "교정 요청이 취소되었습니다.");
    }
    return safeError(
      "NETWORK",
      "네트워크 오류로 교정 요청에 실패했습니다. 다시 시도해 주세요."
    );
  }

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const errObj =
      payload &&
      typeof payload === "object" &&
      (payload as { error?: unknown }).error &&
      typeof (payload as { error: unknown }).error === "object"
        ? ((payload as { error: { code?: unknown; message?: unknown } }).error)
        : null;
    const code =
      errObj && typeof errObj.code === "string" ? errObj.code : "PROVIDER";
    const message =
      errObj && typeof errObj.message === "string"
        ? errObj.message
        : "교정 요청에 실패했습니다. 다시 시도해 주세요.";
    return safeError(code, message);
  }

  if (!payload || typeof payload !== "object") {
    return safeError(
      "MALFORMED",
      "교정 결과를 해석하지 못했습니다. 다시 시도해 주세요."
    );
  }

  const row = payload as { corrected_text?: unknown; changed?: unknown };
  if (typeof row.corrected_text !== "string" || !row.corrected_text.trim()) {
    return safeError(
      "MALFORMED",
      "교정 결과를 해석하지 못했습니다. 다시 시도해 주세요."
    );
  }
  if (typeof row.changed !== "boolean") {
    return safeError(
      "MALFORMED",
      "교정 결과를 해석하지 못했습니다. 다시 시도해 주세요."
    );
  }

  return {
    ok: true,
    data: {
      corrected_text: row.corrected_text,
      changed: row.changed,
    },
  };
}

/**
 * Stale-response guard for overlay sessions.
 */
export function canAcceptProofreadResponse(args: {
  generation: number;
  currentGeneration: number;
  requestText: string;
  currentDraft: string;
}): boolean {
  if (args.generation !== args.currentGeneration) return false;
  return args.requestText === args.currentDraft;
}
