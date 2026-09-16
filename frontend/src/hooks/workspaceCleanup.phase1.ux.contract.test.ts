/**
 * Phase 1 — SAVE success alert removed; Local Delete UX (source contracts).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("Phase 1 SAVE UX + Local Delete", () => {
  it("commitWorkspaceHistory does not alert on success; keeps failure alert", () => {
    const src = readFileSync(join(__dirname, "useSettings.js"), "utf8");
    expect(src).not.toMatch(/alert\(`스냅샷 저장: \$\{name\}`\)/);
    expect(src).toMatch(/alert\(`스냅샷 저장 실패:/);
    expect(src).not.toMatch(/localStorage\.clear\s*\(/);
    expect(src).toContain("WORKSPACE_CLEANUP_LOCAL_DELETE");
    expect(src).toContain("ONE_POINT_CATEGORY_LIBRARY_V1");
    expect(src).toContain("listWorkspaceCleanupPreservedKeys");
  });

  it("App exposes Local Delete UI without clear_all / Data cleanup label", () => {
    const app = readFileSync(join(__dirname, "../App.jsx"), "utf8");
    expect(app).toContain("aria-label=");
    expect(app).toContain("WORKSPACE_CLEANUP_LOCAL_DELETE");
    expect(app).toMatch(/로컬 삭제 실행/);
    expect(app).not.toContain(">Data 정리<");
    expect(app).not.toContain(">전체 삭제<");
    expect(app).not.toContain("WORKSPACE_CLEANUP_CLEAR_ALL");
  });
});
