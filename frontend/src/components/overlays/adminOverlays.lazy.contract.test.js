/**
 * Phase 3E-1 contract: USER initial graph must not statically import ADMIN overlay modules.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const appSrc = readFileSync(join(root, "App.jsx"), "utf8");
const lazySrc = readFileSync(
  join(root, "components/overlays/adminOverlays.lazy.jsx"),
  "utf8"
);

describe("Phase 3E-1 USER initial ADMIN overlay code-split", () => {
  it("App.jsx does not statically import ADMIN overlay modules", () => {
    expect(appSrc).not.toMatch(
      /import\s+\{\s*SysOverlay\s*\}\s+from\s+["'].*SysOverlay/
    );
    expect(appSrc).not.toMatch(
      /import\s+\{\s*HptOverlay,\s*StrOverlay\s*\}\s+from/
    );
    expect(appSrc).not.toMatch(
      /import\s+\{\s*AiOverlay/
    );
    expect(appSrc).not.toMatch(
      /import\s+CategoryManageModal\s+from/
    );
    expect(appSrc).not.toMatch(
      /import\s+WorkspaceHistoryModal\s+from/
    );
    expect(appSrc).not.toMatch(
      /import\s+JoystickCoordinateEditor\s+from/
    );
    expect(appSrc).not.toMatch(
      /import\s+DerivedReviewOverlay\s+from/
    );
    expect(appSrc).toContain('from "./components/overlays/adminOverlays.lazy"');
    expect(appSrc).toContain('from "./domain/lesson/ensureLessonItems"');
  });

  it("adminOverlays.lazy.jsx uses React.lazy dynamic imports", () => {
    expect(lazySrc).toContain("lazy(");
    expect(lazySrc).toContain('import("./SysOverlay")');
    expect(lazySrc).toContain('import("./AiOverlay")');
    expect(lazySrc).toContain('import("./HptOverlay")');
  });
});
