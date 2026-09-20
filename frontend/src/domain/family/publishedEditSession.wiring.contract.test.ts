/**
 * Phase 2 — Search → Apply identity preservation + SAVE intent wiring (source).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("Phase 2 published family identity session wiring", () => {
  it("applyDraftSys preserves family identity fields from draft", () => {
    const src = readFileSync(
      join(__dirname, "../../hooks/useShotSlots.ts"),
      "utf8"
    );
    expect(src).toContain("identityFromDraft");
    expect(src).toContain("draft.familyId");
    expect(src).toContain("draft.memberId");
  });

  it("adminSearch sets editingPublishedFamilyId; LocalDB clears it", () => {
    const published = readFileSync(
      join(__dirname, "../../application/flows/adminSearchFlow.ts"),
      "utf8"
    );
    const local = readFileSync(
      join(__dirname, "../../application/flows/adminLocalDbFlow.ts"),
      "utf8"
    );
    expect(published).toContain("setEditingPublishedFamilyId");
    expect(published).toContain("readFamilyIdFromRecordSlot");
    expect(local).toContain("setEditingPublishedFamilyId?.(null)");
  });

  it("saveFlow uses saveCommand SAVE→CREATE / OVERWRITE→session UPDATE", () => {
    const src = readFileSync(
      join(__dirname, "../../application/flows/saveFlow.ts"),
      "utf8"
    );
    expect(src).toContain('saveCommand === "OVERWRITE"');
    expect(src).toContain("resolveOverwriteSaveIntent");
    expect(src).toContain('requestedIntent = "CREATE"');
    expect(src).toContain("editingPublishedFamilyId");
    expect(src).not.toContain("publishedEditIntent ?? ctx.saveIntent");
  });

  it("App owns editingPublishedFamilyId, OVERWRITE button, and clearPublishedEditSession", () => {
    const app = readFileSync(join(__dirname, "../../App.jsx"), "utf8");
    expect(app).toContain("editingPublishedFamilyId");
    expect(app).toContain("clearPublishedEditSession");
    expect(app).toContain("setEditingPublishedFamilyId");
    expect(app).toContain("handleCanonicalOverwrite");
    expect(app).toContain("덮어쓰기");
    expect(app).toContain('saveCommand: "SAVE"');
    expect(app).toContain('saveCommand: "OVERWRITE"');
  });

  it("Phase 1 SAVE success alert remains removed", () => {
    const src = readFileSync(
      join(__dirname, "../../hooks/useSettings.js"),
      "utf8"
    );
    expect(src).not.toMatch(/alert\(`스냅샷 저장: \$\{name\}`\)/);
    expect(src).toContain("WORKSPACE_CLEANUP_LOCAL_DELETE");
  });
});
