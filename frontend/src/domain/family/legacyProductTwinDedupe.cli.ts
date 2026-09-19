/**
 * CLI — Product Twin Dedupe (dry-run default; optional guarded --apply).
 *
 * Usage (from frontend/):
 *   npm run migrate:product-twin:dry-run
 *   npm run migrate:product-twin:apply
 *
 * Targets ONLY clean leaf:
 *   dataset/옆돌리기/파이브앤하프/positions.json
 *
 * --apply writes that leaf only after fail-closed gates.
 * Never touches 뒤돌리기. Never runs meta migration.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  dryRunProductTwinDedupe,
  formatTwinDedupeApplyReport,
  formatTwinDedupeReport,
  PRODUCT_TWIN_DEDUPE_APPLY_TARGET,
  writeProductTwinDedupeLeafFs,
  type SourceState,
} from "./legacyProductTwinDedupe";

const TARGET_REL = PRODUCT_TWIN_DEDUPE_APPLY_TARGET;

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
  const doApply = argv.includes("--apply");
  if (argv.includes("--write") || argv.includes("--fix")) {
    console.error(
      "Refusing --write/--force. Use --apply only after dry-run gates."
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
  const originalText = fs.readFileSync(absolutePath, "utf8");
  const payload = JSON.parse(originalText);

  if (!doApply) {
    const report = dryRunProductTwinDedupe({
      relativePosix: TARGET_REL,
      sourceState,
      payload,
      enforceExpectedBaseline: true,
    });
    console.log(formatTwinDedupeReport(report));
    console.log("========== SUMMARY ==========");
    console.log(
      `SAFE TO APPLY PRODUCT TWIN DEDUPE: ${report.result === "SAFE_TO_APPLY" ? "YES" : "NO"}`
    );
    console.log(
      `CORPUS diagnostics: keep=${report.canonicalKeep} remove=${report.nonCanonicalRemove} ambiguous=${report.ambiguousGroups}`
    );
    console.log("APPLY EXECUTED: NO");
    return;
  }

  if (sourceState !== "HEAD_MATCH") {
    console.error(`SOURCE_STATE_CHANGED: ${sourceState} — APPLY ABORTED`);
    process.exit(1);
  }

  const write = writeProductTwinDedupeLeafFs({
    absoluteTargetPath: absolutePath,
    relativePosix: TARGET_REL,
    sourceState,
    originalText,
    payload,
  });

  console.log(formatTwinDedupeApplyReport({ write }));
  console.log("========== SUMMARY ==========");
  if (!write.ok) {
    console.error(`APPLY FAILED: ${write.reason}`);
    console.error(`BLOCKERS: ${write.blockers.join(", ")}`);
    process.exit(1);
  }
  console.log("SAFE TO APPLY PRODUCT TWIN DEDUPE: YES (applied)");
  console.log(
    `CORPUS: keep=${write.dryRun.canonicalKeep} remove=${write.dryRun.nonCanonicalRemove}`
  );
  console.log(`POST-WRITE READ-BACK: ${write.readBack.ok ? "PASS" : "FAIL"}`);
  console.log(`POST-APPLY IDEMPOTENT: ${write.readBack.idempotent ? "YES" : "NO"}`);
  console.log("META MIGRATION EXECUTED: NO");
  console.log("APPLY EXECUTED: YES");
}

main();
