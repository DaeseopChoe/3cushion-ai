/**
 * Category Korean IME Enter guard — source contract (no jsdom/RTL).
 * Option B native spellCheck assertions removed (superseded by AI proofreading).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readOverlaySource(name) {
  return readFileSync(join(__dirname, name), "utf8");
}

describe("Category Korean IME Enter guard (source contract)", () => {
  it("create and rename Enter handlers guard isComposing before create/update", () => {
    const source = readOverlaySource("CategoryManageModal.jsx");
    expect(source).not.toMatch(/spellCheck\s*=\s*\{\s*true\s*\}/);
    const enterBlocks = [
      ...source.matchAll(
        /if\s*\(\s*e\.key\s*===\s*["']Enter["']\s*\)\s*\{([\s\S]*?)\}/g
      ),
    ].map((m) => m[1]);
    expect(enterBlocks.length).toBeGreaterThanOrEqual(2);
    for (const block of enterBlocks) {
      expect(block).toMatch(
        /e\.isComposing\s*\|\|\s*e\.nativeEvent\?\.isComposing/
      );
      expect(block).toMatch(/return/);
    }
    expect(source).toContain("handleCreate()");
    expect(source).toContain("handleUpdate(cat.no)");
  });
});

describe("AiOverlay proofreading UI wiring (source contract)", () => {
  it("exposes AI 교정 controls and does not enable native spellCheck", () => {
    const source = readOverlaySource("AiOverlay.jsx");
    expect(source).not.toMatch(/spellCheck\s*=\s*\{\s*true\s*\}/);
    expect(source).toContain("AI 교정");
    expect(source).toContain("교정안 적용");
    expect(source).toContain("fetchProofreading");
    expect(source).toContain("canAcceptProofreadResponse");
    expect(source).toContain("setOnePointDraft?.(corrected)");
  });
});
