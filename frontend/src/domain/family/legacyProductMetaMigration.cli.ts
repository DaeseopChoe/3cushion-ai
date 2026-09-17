/**
 * CLI — Legacy Product Meta Migration (DRY-RUN ONLY).
 *
 * Usage (from frontend/):
 *   npm run migrate:product-meta:dry-run
 *   npx vite-node src/domain/family/legacyProductMetaMigration.cli.ts
 *
 * Default: dry-run. --apply is rejected (deferred).
 * Never writes repo dataset positions.json files.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getSystemContract } from "../../runtime";
import { bindDomainContractSupply } from "../runtimeContractSupply";
import {
  formatDryRunReport,
  runLegacyProductMetaMigrationDryRun,
  type MigrationFs,
  type SourceState,
} from "./legacyProductMetaMigration";

function resolveRepoRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // frontend/src/domain/family → repo root
  return path.resolve(here, "../../../../");
}

function bindRepoContractSupply(): void {
  bindDomainContractSupply({
    getFormulaExpr: (systemId) =>
      getSystemContract(systemId)?.profile?.formulaExpr ?? null,
    getFormulaHash: (systemId) => {
      const contract = getSystemContract(systemId);
      if (!contract) return "v1";
      return (
        contract.profile.formulaExpr ??
        contract.version.packageVersion ??
        "v1"
      ).slice(0, 32);
    },
    getAnchorsData: (systemId) => {
      const anchors = getSystemContract(systemId)?.anchors;
      if (!anchors?.trajectories) return undefined;
      return {
        trajectories: anchors.trajectories,
        ...(anchors.meta ? { meta: anchors.meta } : {}),
      };
    },
  });
}

function listLeafAbsolutePaths(datasetRoot: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "_published" || ent.name === "node_modules") continue;
        walk(abs);
      } else if (ent.isFile() && ent.name === "positions.json") {
        out.push(abs);
      }
    }
  };
  walk(datasetRoot);
  return out;
}

function toRelativePosix(datasetRoot: string, absolutePath: string): string {
  const rel = path.relative(datasetRoot, absolutePath).split(path.sep).join("/");
  return `dataset/${rel}`;
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

function createFs(repoRoot: string): MigrationFs {
  return {
    readFile: (absolutePath) => fs.readFileSync(absolutePath, "utf8"),
    listLeafAbsolutePaths,
    toRelativePosix,
    resolveSourceState: (relativePosix) =>
      resolveSourceState(repoRoot, relativePosix),
  };
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--apply") || argv.includes("--write") || argv.includes("--fix")) {
    console.error(
      "APPLY DEFERRED: this tool is dry-run only. Refusing --apply/--write/--fix."
    );
    process.exit(2);
  }

  bindRepoContractSupply();

  const repoRoot = resolveRepoRoot();
  const datasetRoot = path.join(repoRoot, "dataset");
  if (!fs.existsSync(datasetRoot)) {
    console.error("dataset root not found:", datasetRoot);
    process.exit(1);
  }

  const report = runLegacyProductMetaMigrationDryRun({
    datasetRoot,
    fs: createFs(repoRoot),
  });

  console.log(formatDryRunReport(report));

  // Target-specific summary
  const side = report.leaves.find((l) =>
    l.relativePosix.includes("옆돌리기/파이브앤하프")
  );
  const back = report.leaves.find((l) =>
    l.relativePosix.includes("뒤돌리기/파이브앤하프")
  );
  console.log("========== TARGET SUMMARY ==========");
  if (side) {
    console.log("옆돌리기/파이브앤하프:");
    console.log(`  SOURCE STATE: ${side.sourceState}`);
    console.log(`  PRODUCT: ${side.productEntries} META_MISSING: ${side.metaMissingProduct}`);
    console.log(`  REPAIRABLE: ${side.repairable} UNREPAIRABLE: ${side.unrepairable}`);
    console.log(`  BEFORE VALID: ${side.beforeValid} AFTER: ${side.afterValid}`);
    console.log(`  AFTER META-MISSING REMAINING: ${side.afterMetaMissingRemaining}`);
    console.log(`  AFTER OTHER ISSUES: ${side.afterOtherIssues.length}`);
    console.log(`  RESULT: ${side.result}`);
  }
  if (back) {
    console.log("뒤돌리기/파이브앤하프:");
    console.log(`  SOURCE STATE: ${back.sourceState} (DIRTY WT expected — do not write)`);
    console.log(`  PRODUCT: ${back.productEntries} META_MISSING: ${back.metaMissingProduct}`);
    console.log(`  REPAIRABLE: ${back.repairable} UNREPAIRABLE: ${back.unrepairable}`);
    console.log(`  BEFORE VALID: ${back.beforeValid} AFTER: ${back.afterValid}`);
    console.log(`  AFTER META-MISSING REMAINING: ${back.afterMetaMissingRemaining}`);
    console.log(`  AFTER OTHER ISSUES: ${back.afterOtherIssues.length}`);
    console.log(`  RESULT: ${back.result}`);
  }
  console.log("APPLY EXECUTED: NO");
}

main();
