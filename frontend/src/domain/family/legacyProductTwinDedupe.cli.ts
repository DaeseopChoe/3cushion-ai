/**
 * CLI — Product Twin Dedupe (DRY-RUN ONLY).
 *
 * Usage (from frontend/):
 *   npm run migrate:product-twin:dry-run
 *
 * Targets ONLY clean leaf:
 *   dataset/옆돌리기/파이브앤하프/positions.json
 *
 * Refuses --apply/--write/--fix. Never writes dataset files.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  dryRunProductTwinDedupe,
  formatTwinDedupeReport,
  type SourceState,
} from "./legacyProductTwinDedupe";

const TARGET_REL =
  "dataset/옆돌리기/파이브앤하프/positions.json";

function resolveRepoRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../../../");
}

function resolveSourceState(
  repoRoot: string,
  relativePosix: string
): SourceState {
  try {
    const porcelain = execFileSync(
      "git",
      ["-c", "core.quotepath=false", "status", "--porcelain", "--", relativePosix],
      { cwd: repoRoot, encoding: "utf8", windowsHide: true }
    ).trim();
    if (!porcelain) return "HEAD_MATCH";
    if (porcelain.startsWith("??")) return "UNTRACKED";
    return "DIRTY_WORKTREE";
  } catch {
    return "UNKNOWN";
  }
}

function main(): void {
  const argv = process.argv.slice(2);
  if (
    argv.includes("--apply") ||
    argv.includes("--write") ||
    argv.includes("--fix")
  ) {
    console.error(
      "APPLY DEFERRED: this tool is dry-run only. Refusing --apply/--write/--fix."
    );
    process.exit(2);
  }

  const repoRoot = resolveRepoRoot();
  const absolutePath = path.join(repoRoot, ...TARGET_REL.split("/"));
  if (!fs.existsSync(absolutePath)) {
    console.error("Target leaf not found:", absolutePath);
    process.exit(1);
  }

  const sourceState = resolveSourceState(repoRoot, TARGET_REL);
  const raw = fs.readFileSync(absolutePath, "utf8");
  const payload = JSON.parse(raw);

  const report = dryRunProductTwinDedupe({
    relativePosix: TARGET_REL,
    sourceState,
    payload,
    enforceExpectedBaseline: true,
  });

  console.log(formatTwinDedupeReport(report));
  console.log("========== SUMMARY ==========");
  console.log(`SAFE TO APPLY PRODUCT TWIN DEDUPE: ${report.result === "SAFE_TO_APPLY" ? "YES" : "NO"}`);
  console.log(
    `CORPUS diagnostics: keep=${report.canonicalKeep} remove=${report.nonCanonicalRemove} ambiguous=${report.ambiguousGroups}`
  );
  console.log("APPLY EXECUTED: NO");
}

main();
