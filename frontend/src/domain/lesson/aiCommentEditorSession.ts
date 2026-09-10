/**
 * Admin AI Comment editor session helpers (Phase 1 + 2B.1 + 3A + 3B).
 * Presentation/text layer only — no SYS/STR/calculation mutation.
 *
 * Semantics:
 * - accidental close (X / backdrop / ESC) while dirty = blocked
 * - admin modal switch while dirty = allowed; App-owned draft preserved
 * - cancel = rollback to last committed snapshot (keep open)
 * - apply = commit current-shot AI (single PRO ONE POINT block replace; keep open)
 * - shot dirty = strategySummaryDraft + shotOnePointDraft vs lastCommitted
 * - libraryDraft / selectedId alone ≠ shot dirty
 * - Phase 3B: strategySummaryOverride + fingerprint on slot.ai (additive optional)
 */

export type OnePointLessonItem = {
  id: string;
  text: string;
};

export type AiCommentCommittedSnapshot = {
  /** Working PRO ONE POINT text (may contain multiple paragraphs). */
  onePointText: string;
  onePointSelectedId: string;
  /** Shot ai.onePointLessons at commit time (legacy array preserved on read). */
  onePointLessons: OnePointLessonItem[];
  /** Legacy ai.text (Apply clears to ""; not used for Strategy Summary). */
  aiText: string;
  /** Effective Strategy Summary shown in editor (override or generated). */
  strategySummaryText: string;
  /** Committed override when present (Phase 3B). */
  strategySummaryOverride?: string;
  /** Fingerprint stored with override (Phase 3B). */
  strategySummaryFingerprint?: string;
};

/** Phase 3B.1: final Strategy Summary uses strategySummaryTemplate (not intro+str). */
export function composeStrategySummarySessionText(
  model:
    | { introLine?: string | null; strLine?: string | null; text?: string | null }
    | string
    | null
    | undefined
): string {
  if (model == null) return "";
  if (typeof model === "string") return normalizeStrategySummaryDraftText(model);
  if (typeof model.text === "string" && model.text.trim()) {
    return normalizeStrategySummaryDraftText(model.text);
  }
  const parts = [model.introLine, model.strLine]
    .map((x) => (x == null ? "" : String(x).trim()))
    .filter(Boolean);
  return parts.join("\n\n");
}

export function normalizeOnePointBlockText(value: unknown): string {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

export function normalizeStrategySummaryDraftText(value: unknown): string {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

export function newOnePointLessonId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function lessonTextOf(item: unknown): string {
  if (typeof item === "string") return normalizeOnePointBlockText(item);
  if (!item || typeof item !== "object") return "";
  const row = item as Record<string, unknown>;
  for (const key of ["text", "content", "message", "body", "lesson"] as const) {
    const v = row[key];
    if (typeof v === "string" && normalizeOnePointBlockText(v)) {
      return normalizeOnePointBlockText(v);
    }
  }
  return "";
}

function lessonIdOf(item: unknown, index: number, text: string): string {
  if (item && typeof item === "object" && (item as { id?: unknown }).id != null) {
    return String((item as { id: unknown }).id);
  }
  return `legacy-${index}-${text.slice(0, 40).replace(/\s/g, "_")}`;
}

/** Normalize legacy string|object lessons without dropping multi-paragraph text. */
export function ensureOnePointLessonItems(items: unknown): OnePointLessonItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, index) => {
      const text = lessonTextOf(item);
      if (!text) return null;
      return { id: lessonIdOf(item, index, text), text };
    })
    .filter((x): x is OnePointLessonItem => x != null);
}

/**
 * Active PRO ONE POINT block text for the current shot.
 * - 0 items → ""
 * - 1 item → that item's text (may be multi-paragraph)
 * - N legacy items → join with blank lines (read compatibility; Apply replaces with 1)
 */
export function activeOnePointBlockText(lessons: unknown): string {
  const items = ensureOnePointLessonItems(lessons);
  if (items.length === 0) return "";
  if (items.length === 1) return items[0].text;
  return items.map((l) => l.text).join("\n\n");
}

/**
 * Commit payload: current shot gets at most one PRO ONE POINT block.
 * Empty draft → empty lessons array (clears previous block).
 * Strategy Summary override is added by buildAiCommentApplyPayloadWithSummary (Phase 3B).
 */
export function buildCommittedOnePointLessons(
  draftText: unknown,
  options?: { preferId?: string | null }
): OnePointLessonItem[] {
  const text = normalizeOnePointBlockText(draftText);
  if (!text) return [];
  const preferId =
    typeof options?.preferId === "string" && options.preferId.trim()
      ? options.preferId.trim()
      : null;
  return [{ id: preferId ?? newOnePointLessonId(), text }];
}

export function captureAiCommentCommittedSnapshot(args: {
  ai?: {
    text?: unknown;
    onePointLessons?: unknown;
    strategySummaryOverride?: unknown;
    strategySummaryFingerprint?: unknown;
  } | null;
  onePointSelectedId?: string | null;
  strategySummaryText?: string | null;
}): AiCommentCommittedSnapshot {
  const lessons = ensureOnePointLessonItems(args.ai?.onePointLessons);
  const override = normalizeStrategySummaryDraftText(
    args.ai?.strategySummaryOverride
  );
  const fingerprint =
    args.ai?.strategySummaryFingerprint == null ||
    args.ai.strategySummaryFingerprint === ""
      ? undefined
      : String(args.ai.strategySummaryFingerprint);
  const summaryText =
    args.strategySummaryText != null
      ? normalizeStrategySummaryDraftText(args.strategySummaryText)
      : override;
  const snap: AiCommentCommittedSnapshot = {
    onePointText: activeOnePointBlockText(lessons),
    onePointSelectedId:
      args.onePointSelectedId == null ? "" : String(args.onePointSelectedId),
    onePointLessons: lessons,
    aiText:
      args.ai?.text == null || args.ai.text === ""
        ? ""
        : String(args.ai.text),
    strategySummaryText: summaryText,
  };
  if (override) {
    snap.strategySummaryOverride = override;
    if (fingerprint) snap.strategySummaryFingerprint = fingerprint;
  }
  return snap;
}

export function buildAiCommentApplyPayload(args: {
  /** Current-shot PRO ONE POINT draft (not libraryDraft). */
  draftText: unknown;
  preferLessonId?: string | null;
}): { text: ""; onePointLessons: OnePointLessonItem[] } {
  return {
    text: "",
    onePointLessons: buildCommittedOnePointLessons(args.draftText, {
      preferId: args.preferLessonId,
    }),
  };
}

/**
 * Shot editor dirty = Strategy Summary and/or current-shot PRO ONE POINT vs lastCommitted.
 * libraryDraft / selectedId alone do NOT make the shot editor dirty.
 */
export function isAiCommentDraftDirty(args: {
  /** Preferred Phase 3A name */
  shotOnePointDraft?: unknown;
  /** Backward-compatible alias for shotOnePointDraft */
  draftText?: unknown;
  strategySummaryDraft?: unknown;
  onePointSelectedId?: string | null;
  committed: AiCommentCommittedSnapshot | null | undefined;
}): boolean {
  const shot = normalizeOnePointBlockText(
    args.shotOnePointDraft ?? args.draftText
  );
  const summary = normalizeStrategySummaryDraftText(args.strategySummaryDraft);
  if (!args.committed) {
    return shot.length > 0 || summary.length > 0;
  }
  const committedSummary = normalizeStrategySummaryDraftText(
    args.committed.strategySummaryText
  );
  return shot !== args.committed.onePointText || summary !== committedSummary;
}

/** Resolve committed AI source for USER: slot only (never editor working draft). */
export function pickCommittedAiForUser(args: {
  draftAi?: {
    onePointLessons?: unknown;
    text?: unknown;
    strategySummaryOverride?: unknown;
    strategySummaryFingerprint?: unknown;
  } | null;
  appliedAi?: {
    onePointLessons?: unknown;
    text?: unknown;
    strategySummaryOverride?: unknown;
    strategySummaryFingerprint?: unknown;
  } | null;
}): {
  text?: string;
  onePointLessons?: OnePointLessonItem[];
  strategySummaryOverride?: string;
  strategySummaryFingerprint?: string;
} | null {
  const src = args.draftAi ?? args.appliedAi ?? null;
  if (!src) return null;
  const out: {
    text?: string;
    onePointLessons?: OnePointLessonItem[];
    strategySummaryOverride?: string;
    strategySummaryFingerprint?: string;
  } = {
    text: src.text == null ? "" : String(src.text),
    onePointLessons: ensureOnePointLessonItems(src.onePointLessons),
  };
  const override = normalizeStrategySummaryDraftText(
    src.strategySummaryOverride
  );
  if (override) {
    out.strategySummaryOverride = override;
    if (
      src.strategySummaryFingerprint != null &&
      String(src.strategySummaryFingerprint) !== ""
    ) {
      out.strategySummaryFingerprint = String(src.strategySummaryFingerprint);
    }
  }
  return out;
}
