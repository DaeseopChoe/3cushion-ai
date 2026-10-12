/**
 * LocalDB removal — source contracts for UI, wiring and security.
 *
 * B11/B12/B13 SAVE / approve / recall / Publish / Search wiring no longer
 *             touches normalized_dataset, workspace_history or the recovery key
 * B15 No [로컬 삭제] button, delete dialog, or LocalDB count / size notice
 * B16 No user-facing "로컬DB" wording (internal names judged by function)
 * C18 Publish success marks only the D History (no LocalDB cleanup)
 * C20 Published Search never falls back to LocalDB
 * C23 Publish same-position conflict confirm flow kept
 * S   History API is localhost dev middleware only; .workspace-data is git-ignored
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildHistoryDerivedBadge } from "../../domain/historyRowView";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "..", "..");
const FRONTEND = join(SRC, "..");
const REPO = join(FRONTEND, "..");

function read(rel: string): string {
  return readFileSync(join(SRC, rel), "utf8");
}

function fnBody(src: string, name: string): string {
  const start = src.search(new RegExp(`(function|const)\\s+${name}\\b`));
  expect(start, `${name} not found`).toBeGreaterThanOrEqual(0);
  let depth = 0;
  let opened = false;
  for (let i = src.indexOf("{", start); i < src.length; i++) {
    const c = src[i];
    if (c === "{") {
      depth++;
      opened = true;
    } else if (c === "}") {
      depth--;
      if (opened && depth === 0) return src.slice(start, i + 1);
    }
  }
  return src.slice(start);
}

const APP = read("App.jsx");
const STAGE = read("components/Stage.jsx");
const SETTINGS = read("hooks/useSettings.js");

const LOCALDB_MODULE_IMPORTS = [
  "canonicalNormalizedCorpusStore",
  "persistWorkingCorpusNormalizedAuthority",
  "pendingNewFamilySaveRecoveryStore",
  "loadProductionCompatibleDataset",
  "localDbWorkCleanup",
  "normalizedLocalMemberSearch",
  "adminLocalDbFlow",
];

describe("B11–B13 — flows no longer depend on LocalDB / browser History", () => {
  it("App, useSettings and the SAVE / approve / recovery flows import no LocalDB module", () => {
    const files = [
      "App.jsx",
      "hooks/useSettings.js",
      "application/flows/saveFlow.ts",
      "application/flows/historyFlow.ts",
      "application/flows/derivedApprovalFlow.ts",
      "application/flows/pendingSaveCancelFlow.ts",
      "application/flows/pendingSaveRecoveryFlow.ts",
      "application/flows/adminSearchFlow.ts",
      "application/flows/userSearchFlow.ts",
    ];
    for (const f of files) {
      const src = read(f);
      for (const mod of LOCALDB_MODULE_IMPORTS) {
        expect(src, `${f} imports ${mod}`).not.toMatch(new RegExp(`from\\s+["'][^"']*${mod}["']`));
      }
    }
  });

  it("App and useSettings never use the browser workspace_history API", () => {
    for (const src of [APP, SETTINGS]) {
      expect(src).not.toMatch(/from\s+["'][^"']*\/workspaceHistory["']/);
      expect(src).not.toMatch(/from\s+["'][^"']*workspaceHistoryPublishGraph["']/);
      expect(src).not.toMatch(/\bloadWorkspaceHistory\(|\bsaveWorkspaceHistory\(|\bupdateSnapshotsExported\(/);
    }
  });

  it("the App working dataset starts empty (no LocalDB hydrate)", () => {
    expect(APP).toMatch(/const \[dataset, setDataset\] = useState\(\s*\(\)\s*=>\s*\[\]\s*\)|const \[dataset, setDataset\] = useState\(\[\]\)/);
    expect(APP).not.toContain("CANONICAL_NORMALIZED_CORPUS_KEY");
  });

  it("legacy LocalDB work modules are removed", () => {
    for (const rel of [
      "components/LocalDbDeleteConfirmDialog.jsx",
      "application/flows/localDbDeleteFlow.ts",
      "domain/dataset/infra/localDbWorkCleanup.ts",
      "application/flows/adminLocalDbFlow.ts",
      "domain/recall/normalizedLocalMemberSearch.ts",
    ]) {
      expect(existsSync(join(SRC, rel)), rel).toBe(false);
    }
  });
});

describe("B15 / B16 — no LocalDB UI or wording", () => {
  it("no [로컬 삭제] button, dialog or LocalDB count / size notice in App", () => {
    expect(APP).not.toContain("로컬 삭제");
    expect(APP).not.toContain("LocalDbDeleteConfirmDialog");
    expect(APP).not.toContain("summarizeLocalDbWork");
    expect(APP).not.toContain("workspaceCleanupOpen");
    expect(APP).not.toContain("handleWorkspaceLocalStorageCleanup");
  });

  it("no left-rail 로컬DB search button (it searched LocalDB, it did not open History)", () => {
    expect(STAGE).not.toContain("로컬DB");
    expect(STAGE).not.toContain("로컬 DB");
    expect(STAGE).not.toContain("adminSearchHandlerRef");
    expect(APP).not.toContain("adminSearchHandlerRef");
    expect(APP).not.toContain("runAdminLocalDbRecall");
  });

  it("no user-facing 로컬DB / 로컬 작업 wording in UI or flow messages", () => {
    const dirs = ["components", "application/flows", "hooks"];
    const files = ["App.jsx", ...dirs.flatMap((d) =>
      readdirSync(join(SRC, d))
        .filter((f) => /\.(jsx?|tsx?)$/.test(f) && !/\.test\./.test(f))
        .map((f) => `${d}/${f}`)
    )];
    for (const f of files) {
      const src = read(f);
      for (const word of ["로컬DB", "로컬 DB", "로컬 작업", "로컬데이터", "로컬 삭제", "미배포 로컬"]) {
        expect(src.includes(word), `${f} contains ${word}`).toBe(false);
      }
      expect(src, `${f} shows LocalDB to the user`).not.toMatch(/["'`][^"'`\n]*LocalDB[^"'`\n]*["'`]/);
    }
  });

  it("History delete confirm matches the ledger meaning", () => {
    const modal = read("components/WorkspaceHistoryModal.jsx");
    expect(modal).toContain("Published된 데이터는 삭제되지 않습니다");
    expect(modal).not.toContain("History 목록에서만 지워지며");
  });

  it("History rows show PENDING / APPROVED count / PUBLISHED from index entries", () => {
    expect(buildHistoryDerivedBadge({ status: "PENDING", derivedCount: 0 } as never)).toMatchObject({
      kind: "PENDING",
      label: "파생 승인 전 · Publish 불가",
    });
    expect(buildHistoryDerivedBadge({ status: "APPROVED", derivedCount: 12 } as never)).toMatchObject({
      kind: "APPROVED",
      label: "파생 승인 완료 · 12개",
    });
    expect(buildHistoryDerivedBadge({ status: "PUBLISHED", derivedCount: 12 } as never)).toMatchObject({
      kind: "APPROVED",
      count: 12,
    });
  });
});

describe("C18 / C20 / C23 — Publish and Search", () => {
  it("Publish reads snapshots from the D History and marks PUBLISHED only there", () => {
    const body = fnBody(SETTINGS, "handlePublishSnapshots");
    expect(body).toContain("loadPublishItemsFromWorkHistory");
    expect(body).toContain("markPublished");
    expect(body).not.toContain("localStorage");
    expect(body).not.toMatch(/LocalDb|deleteAllLocal|applyPostPublishLocalCleanup/);
    const verified = body.indexOf('status === "PRODUCTION_VERIFIED"');
    expect(verified).toBeGreaterThan(-1);
    expect(body.indexOf("markPublished")).toBeGreaterThan(verified);
  });

  it("same-position Publish conflict confirm flow is kept", () => {
    const body = fnBody(SETTINGS, "handlePublishSnapshots");
    expect(body).toContain("resolvable-publish-overwrite");
    expect(body).toContain("window.confirm(");
    expect(body).toContain("confirmedOverwrite");
    expect(body).toContain("publish-overwrite-cancelled");
  });

  it("Published Search flows have no LocalDB fallback", () => {
    for (const f of ["application/flows/adminSearchFlow.ts", "application/flows/userSearchFlow.ts"]) {
      const src = read(f);
      expect(src).not.toContain("loadCanonicalNormalizedCorpus");
      expect(src).not.toContain("normalized_dataset");
    }
  });
});

describe("S — History API is localhost dev only; data folder is git-ignored", () => {
  it("vite registers /api/work-history in configureServer with localhost checks", () => {
    const vite = readFileSync(join(FRONTEND, "vite.config.js"), "utf8");
    const at = vite.indexOf('"/api/work-history"');
    expect(at).toBeGreaterThan(-1);
    const plugin = vite.slice(vite.lastIndexOf("function ", at), at);
    expect(plugin).toContain("configureServer");
    expect(vite).toMatch(/workHistoryApiDevMiddleware\(REPO_ROOT\)/);
    const block = vite.slice(at, at + 3000);
    expect(block).toContain("ORIGIN_FORBIDDEN");
    expect(block).toContain("HOST_FORBIDDEN");
    expect(block).not.toMatch(/body\.(repoRoot|path|dir)/);
  });

  it("no Production API file for the History", () => {
    expect(existsSync(join(FRONTEND, "api", "work-history.js"))).toBe(false);
    expect(existsSync(join(FRONTEND, "api", "work-history.ts"))).toBe(false);
  });

  it(".workspace-data is git-ignored", () => {
    const gi = readFileSync(join(REPO, ".gitignore"), "utf8");
    expect(gi.split(/\r?\n/).map((l) => l.trim())).toContain(".workspace-data/");
  });

  it("the browser client never hardcodes a drive path", () => {
    const client = read("domain/workHistory/workHistoryClient.ts");
    expect(client).not.toMatch(/[A-Za-z]:\\\\|[A-Za-z]:\//);
    expect(client).not.toContain(".workspace-data");
  });
});
