/**
 * Phase 3E-2 — Instant Table Shell contracts (source-only; no jsdom).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  APP_SHELL_ID,
  APP_SHELL_READY_SELECTOR,
} from "./removeAppShell.js";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const bootSrc = readFileSync(
  join(frontendRoot, "src/boot/removeAppShell.js"),
  "utf8"
);
const mainSrc = readFileSync(join(frontendRoot, "src/main.jsx"), "utf8");
const html = readFileSync(join(frontendRoot, "index.html"), "utf8");

describe("Phase 3E-2 index.html Table Shell", () => {
  it("declares #app-shell sibling before #root with inline critical CSS", () => {
    expect(html).toContain('id="app-shell"');
    expect(html).toContain('data-app-shell="1"');
    expect(html).toContain('id="root"');
    expect(html.indexOf('id="app-shell"')).toBeLessThan(html.indexOf('id="root"'));
    expect(html).toContain("<style>");
    expect(html).toMatch(/background:\s*#0f172a/);
    expect(html).toMatch(/#8d582f|#6b3410/i);
    expect(html).toMatch(/#2563eb/);
    expect(html).toMatch(/#1e40af/);
    expect(html).toMatch(/aspect-ratio:\s*2\s*\/\s*1/);
    expect(html).toMatch(/pointer-events:\s*none/);
  });

  it("does not depend on image/font/API for the shell markup", () => {
    const shellBlock = html.slice(
      html.indexOf('id="app-shell"'),
      html.indexOf('id="root"')
    );
    expect(shellBlock).not.toMatch(/<img\b/i);
    expect(shellBlock).not.toMatch(/url\(/i);
    expect(shellBlock).not.toMatch(/fonts\.google|@font-face/i);
    expect(shellBlock).not.toMatch(/\/api\//);
  });

  it("keeps critical shell CSS inline in index.html (not external stylesheet)", () => {
    const styleEnd = html.indexOf("</style>");
    const shellCss = html.slice(html.indexOf("<style>"), styleEnd);
    expect(shellCss).toContain("#app-shell");
    expect(shellCss).toContain("app-shell__cloth");
    expect(html).not.toMatch(
      /<link[^>]+href=["'][^"']*app-shell[^"']*["']/i
    );
  });
});

describe("Phase 3E-2 removeAppShell boot contract", () => {
  it("uses .table-svg ready marker and app-shell id constants", () => {
    expect(APP_SHELL_ID).toBe("app-shell");
    expect(APP_SHELL_READY_SELECTOR).toBe(".table-svg");
    expect(bootSrc).toContain('APP_SHELL_READY_SELECTOR = ".table-svg"');
  });

  it("removes only after ready + paint frames (not createRoot-only, no timed delay)", () => {
    expect(bootSrc).toContain("MutationObserver");
    expect(bootSrc).toContain("requestAnimationFrame");
    expect(bootSrc).toMatch(
      /requestAnimationFrame\(\s*\(\)\s*=>\s*\{\s*requestAnimationFrame/
    );
    expect(bootSrc).not.toMatch(/setTimeout\s*\(/);
    expect(bootSrc).toContain("el.remove()");
  });

  it("is independent of calculation / trajectory / SYS paths", () => {
    expect(bootSrc).not.toMatch(/TABLE_CONFIG|Fg|Rg|trajectory|SYS|Δ_sys|CO|C1/);
    expect(bootSrc).not.toMatch(/incidenceAngle|openai|proofread/i);
  });
});

describe("Phase 3E-2 main.jsx boot wiring", () => {
  it("schedules shell removal after createRoot render", () => {
    expect(mainSrc).toContain("scheduleAppShellRemoval");
    expect(mainSrc).toContain("createRoot");
    const createIdx = mainSrc.indexOf("createRoot");
    const scheduleIdx = mainSrc.indexOf("scheduleAppShellRemoval()");
    expect(scheduleIdx).toBeGreaterThan(createIdx);
  });
});
