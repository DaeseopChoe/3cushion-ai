/**
 * Every tracked Published leaf (dataset/{shotType}/{systemLabel}/positions.json)
 * loads through the client loader and the Publish base reader. Empty leaves
 * (0 FamilyMaster / 0 FamilyMember) are valid.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { buildPublishedLeafUrl, parsePublishedLeafPayload } from "./datasetLoader";
import { resolveExistingNormalizedLeafBase } from "./publishedLeafPrepare";
import { DATASET_EXPORT_FILENAME, DATASET_ROOT_DIR, systemIdToFolderLabel } from "./datasetPath";
import { writeFourTrackFamilyMembers } from "./family/familyAwareWriter";
import { buildPublishFamilyPayload } from "./publishFamilyPayload";
import { buildPublishClientItemFromSnapshot } from "./historyPublishInput";
import { publishDatasetBatchToRepo } from "./repoPublish/publishDatasetToRepo";
import { resolvePublishedLeafAbsolutePath } from "./repoPublish/resolveRepoLeafPath";
import { parseNormalizedDatasetEnvelope } from "./dataset/normalizedDatasetEnvelope";
import type { WorkspaceSnapshot } from "./workspaceHistory";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const DATASET_ROOT = path.join(REPO_ROOT, DATASET_ROOT_DIR);

function listLeaves(): string[] {
  const out: string[] = [];
  for (const shotDir of fs.readdirSync(DATASET_ROOT, { withFileTypes: true })) {
    if (!shotDir.isDirectory()) continue;
    const shotPath = path.join(DATASET_ROOT, shotDir.name);
    for (const sysDir of fs.readdirSync(shotPath, { withFileTypes: true })) {
      if (!sysDir.isDirectory()) continue;
      const leaf = path.join(shotPath, sysDir.name, DATASET_EXPORT_FILENAME);
      if (fs.existsSync(leaf)) out.push(leaf);
    }
  }
  return out;
}

describe("tracked Published leaves load (empty allowed)", () => {
  const leaves = listLeaves();

  it("at least one leaf is tracked under dataset/", () => {
    expect(leaves.length).toBeGreaterThan(0);
  });

  for (const leaf of leaves) {
    const rel = path.relative(REPO_ROOT, leaf).split(path.sep).join("/");
    it(`${rel} — client loader ok|empty, Publish base reader ok, folder metadata matches`, () => {
      const raw = JSON.parse(fs.readFileSync(leaf, "utf8"));
      const shotTypeDir = path.basename(path.dirname(path.dirname(leaf)));
      const systemDir = path.basename(path.dirname(leaf));
      expect(raw.shotType).toBe(shotTypeDir);
      expect(systemIdToFolderLabel(raw.systemId)).toBe(systemDir);

      const url = buildPublishedLeafUrl(raw.shotType, raw.systemId);
      const loaded = parsePublishedLeafPayload(raw, url);
      if (loaded.kind === "error") throw new Error(`${rel}: ${loaded.message}`);
      expect(["ok", "empty"]).toContain(loaded.kind);

      const base = resolveExistingNormalizedLeafBase({
        raw,
        leafMeta: { shotType: raw.shotType, systemId: raw.systemId, systemLabel: systemDir },
      });
      if (!base.ok) throw new Error(`${rel}: ${base.reason}`);
      expect(base.envelope.shotType).toBe(raw.shotType);
      expect(base.envelope.systemId).toBe(raw.systemId);
    });
  }
});

describe("a Family can be published into a copy of every tracked leaf", () => {
  let tempRoots: string[] = [];
  afterEach(() => {
    for (const root of tempRoots) fs.rmSync(root, { recursive: true, force: true });
    tempRoots = [];
  });

  for (const leaf of listLeaves()) {
    const rel = path.relative(REPO_ROOT, leaf).split(path.sep).join("/");
    it(`${rel} — publish adds exactly the new Family on top of the existing leaf`, () => {
      const text = fs.readFileSync(leaf, "utf8");
      const raw = JSON.parse(text);
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "leaf-copy-"));
      tempRoots.push(root);
      const target = resolvePublishedLeafAbsolutePath(root, raw.shotType, raw.systemId);
      if (!target.ok) throw new Error(target.reason);
      fs.mkdirSync(path.dirname(target.absolutePath), { recursive: true });
      fs.writeFileSync(target.absolutePath, text, "utf8");
      const before = parsePublishedLeafPayload(raw, buildPublishedLeafUrl(raw.shotType, raw.systemId));
      const mastersBefore = before.kind === "ok" ? before.familyMasters.length : 0;

      const familyId = "fm_leaf_copy_probe";
      const written = writeFourTrackFamilyMembers([], {
        balls: { cue: { x: 12, y: 30 }, target: { x: 60, y: 30 }, second: { x: 70, y: 12 } },
        targetBall: "red",
        entry: {
          slot: "S1",
          signature: { systemId: raw.systemId, formulaHash: "v1", shotType: raw.shotType },
          sysInputs: { CO_f: 30, C3_r: 20 },
          hpT: { T: "-3/8", hit_point: { x: 1, y: 1 }, mode: "TIP", tipCount: 1 },
          str: { speed: 2 },
          ai: { text: "probe" },
          track: "B2T_L",
          authoringStrategyId: "as_leaf_copy_probe",
          familyId,
          memberId: "mb_leaf_copy_probe",
          memberOrigin: "AUTHORED",
          meta: { impact: { x: 12, y: 9 }, final: { x: 50, y: 5 }, angle_ci: 0.1, angle_fs: 0.2 },
          corrections: { slide: 0, curve_ratio: 0, draw: 0, departure: 0, spin: 0 },
          correctionsStored: true,
        },
      });
      if (!written.ok) throw new Error(written.reason);
      const payload = buildPublishFamilyPayload(written.dataset, familyId);
      if (!payload.ok) throw new Error(payload.reason);
      const snap: WorkspaceSnapshot = {
        id: "leaf-copy-probe",
        name: "probe",
        systemId: raw.systemId,
        pattern: raw.shotType,
        version: 1,
        timestamp: "2026-09-29T00:00:00.000Z",
        exported: false,
        publishOperation: {
          schemaVersion: 1,
          intent: "CREATE",
          sourceFamilyId: null,
          destinationFamilyId: familyId,
        },
        publishFamilyPayload: payload.payload,
        state: {
          adminState: {},
          ballsState: {},
          shotEditor: { activeSlot: "S1", slots: {} },
          targetBall: "red",
        },
      };
      const input = buildPublishClientItemFromSnapshot(snap);
      if (!input.ok) throw new Error(input.reason);

      const results = publishDatasetBatchToRepo({ datasetRoot: root, items: [input.item as never] });
      expect(results[0]!.ok).toBe(true);
      const after = parseNormalizedDatasetEnvelope(
        JSON.parse(fs.readFileSync(target.absolutePath, "utf8"))
      );
      if (!after.ok) throw new Error(after.issues[0]?.reason);
      expect(after.envelope.familyMasters).toHaveLength(mastersBefore + 1);
      expect(after.envelope.familyMembers.filter((m) => m.familyId === familyId)).toHaveLength(4);
      expect(fs.readFileSync(leaf, "utf8")).toBe(text);
    });
  }
});
