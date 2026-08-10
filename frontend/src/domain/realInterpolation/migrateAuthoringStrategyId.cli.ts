/**
 * CLI: explicit authoringStrategyId migration (dry-run default).
 *
 * Usage:
 *   npx tsx src/domain/realInterpolation/migrateAuthoringStrategyId.cli.ts \
 *     --dataset path/to/positions.json \
 *     --mapping path/to/mapping.json \
 *     [--apply]
 *
 * Mapping JSON: { "positionId.slot": "as_..." }
 * Does not auto-group by shotType/systemId.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { migrateAuthoringStrategyIds } from "./migration";
import type { PositionRecord } from "../positionSearchEngine";

function parseArgs(argv: string[]) {
  const out: {
    dataset?: string;
    mapping?: string;
    apply: boolean;
  } = { apply: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dataset") out.dataset = argv[++i];
    else if (a === "--mapping") out.mapping = argv[++i];
    else if (a === "--apply") out.apply = true;
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.dataset || !args.mapping) {
    console.error(
      "Usage: --dataset <positions.json> --mapping <mapping.json> [--apply]"
    );
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(args.dataset, "utf8"));
  const records: PositionRecord[] = Array.isArray(raw)
    ? raw
    : (raw.records ?? []);
  const mapping = JSON.parse(readFileSync(args.mapping, "utf8"));
  const { records: next, report } = migrateAuthoringStrategyIds(
    records,
    mapping,
    { dryRun: !args.apply }
  );
  console.log(JSON.stringify(report, null, 2));
  if (args.apply) {
    if (Array.isArray(raw)) {
      writeFileSync(args.dataset, JSON.stringify(next, null, 2), "utf8");
    } else {
      writeFileSync(
        args.dataset,
        JSON.stringify({ ...raw, records: next }, null, 2),
        "utf8"
      );
    }
    console.log("Applied mapping to", args.dataset);
  } else {
    console.log("Dry-run only. Pass --apply to write.");
  }
}

main();
