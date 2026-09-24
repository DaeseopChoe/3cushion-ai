/**
 * Phase B-0 — product_export / export_request.json side-channel must stay gone.
 *
 * Product Members (DERIVED_CUE_C3_PRODUCT) remain an in-app Family pipeline.
 * Manual Dataset Export must not recreate product_export scratch folders.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Ball3, Point, StrategyEntry } from "./positionSearchEngine";
import {
  approveUnifiedDerivedReview,
  createUnifiedDerivedReview,
} from "./family/unifiedDerivedReview";
import { writeFourTrackFamilyMembers } from "./family/familyAwareWriter";
import { CUE_C3_PRODUCT_MEMBER_ORIGIN } from "./family/buildCueC3ProductMembers";
import { FAMILY_MASTER_COMMON_FIELD_KEYS } from "./family/familyNormalizedSchema";
import { resolveTrajectoryHitTolerance } from "./trajectory/hitToleranceRg";
import { DEFAULT_SCALE } from "../utils/physics/ImpactEngine";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");
const settingsPath = join(here, "../hooks/useSettings.js");
const frontendSrc = join(here, "..");
const HIT = resolveTrajectoryHitTolerance();

function readUtf8(path: string): string {
  return readFileSync(path, "utf8");
}

function pt(x: number, y: number): Point {
  return { x, y };
}

function pathNodesThrough(
  marks: Array<{ id: string; p: Point }>
): Array<Point | null> {
  const defaults: Point[] = [
    pt(10, 0),
    pt(40, 40),
    pt(80, 20),
    pt(40, 0),
    pt(0, 20),
    pt(40, 40),
    pt(80, 20),
  ];
  const map: Record<string, number> = { C3: 3, C4: 4, C5: 5, C6: 6 };
  let last = 3;
  for (const m of marks) {
    const i = map[m.id];
    if (i != null) {
      defaults[i] = m.p;
      last = Math.max(last, i);
    }
  }
  const nodes: Array<Point | null> = defaults.map((p) => ({ ...p }));
  for (let i = last + 1; i <= 6; i += 1) nodes[i] = null;
  return nodes;
}

function collinearCueBalls(distance: number): Ball3 {
  return {
    cue: { x: 8, y: 16 },
    target: { x: 8 + distance + DEFAULT_SCALE.BALL_DIAMETER_RG, y: 16 },
    second: { x: 20, y: 10 },
  };
}

function authoredEntry(): StrategyEntry {
  return {
    slot: "S1",
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType: "뒤돌리기",
    },
    sysInputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
    authoringStrategyId: "as_b0_auth",
    familyId: "fm_b0_product",
    memberId: "mb_authored",
    memberOrigin: "AUTHORED",
    track: "B2T_L",
    hpT: {
      T: "8/8",
      hit_point: { x: -2, y: 1.5 },
      mode: "TIP",
      tipCount: 2,
    },
    thickness: "8/8",
    corrections: {
      slide: 0,
      curve_ratio: 0,
      draw: 0,
      departure: 0,
      spin: 0,
    },
    ai: { text: "", onePointLessons: [] },
    str: { speed: 2.5 },
    meta: {
      impact: pt(12, 9),
      final: pt(50, 5),
      angle_ci: 0.1,
      angle_fs: 0.2,
    },
  };
}

describe("Phase B-0 — product_export side-channel removal", () => {
  it("CASE 1–2: Publish path never creates product_export or export_request.json", () => {
    const src = readUtf8(settingsPath);
    expect(src).toContain("handlePublishSnapshots");
    expect(src).toContain("publishDatasetToLocalRepoWithGit");
    expect(src).not.toContain("handleExportSnapshots");
    expect(src).not.toContain("saveDatasetExportToFile");
    expect(src).not.toContain("saveProductExportRequestToFile");
    expect(src).not.toContain("PRODUCT_EXPORT_ROOT_DIR");
    expect(src).not.toContain("export_request.json");
    expect(src).not.toContain("product_export");
    expect(src).not.toContain("__PRODUCT_EXPORT_HOST__");
    expect(src).not.toMatch(/getOrCreateDir\([^)]*product_export/);
  });

  it("CASE 7–9: SAVE / Derived Approval / Publish owners do not reference product_export", () => {
    const save = readUtf8(join(frontendSrc, "application/flows/saveFlow.ts"));
    const approval = readUtf8(
      join(frontendSrc, "application/flows/derivedApprovalFlow.ts")
    );
    const settings = readUtf8(settingsPath);
    for (const needle of [
      "product_export",
      "export_request",
      "productExportRequest",
      "__PRODUCT_EXPORT_HOST__",
    ]) {
      expect(save).not.toContain(needle);
      expect(approval).not.toContain(needle);
    }
    expect(settings).toContain("handlePublishSnapshots");
    expect(settings).not.toContain("productExportRequest");
  });

  it("CASE 10: live frontend/Python producer modules are gone", () => {
    expect(existsSync(join(here, "productExportRequest.ts"))).toBe(false);
    expect(existsSync(join(repoRoot, "product"))).toBe(false);
    const settings = readUtf8(settingsPath);
    for (const needle of [
      "product_export",
      "export_request.json",
      "product-export-pipeline-v1",
      "saveProductExportRequestToFile",
      "__PRODUCT_EXPORT_HOST__",
      "buildProductExportRequestFromSnapshot",
      "mergeProductExportRequests",
      "PRODUCT_EXPORT_ROOT_DIR",
    ]) {
      expect(settings).not.toContain(needle);
    }
  });

  it("CASE 3–6: Product Members generate with Family identity + shared common payload", () => {
    const seed = authoredEntry();
    const written = writeFourTrackFamilyMembers([], {
      balls: collinearCueBalls(20),
      entry: seed,
    });
    expect(written.ok).toBe(true);
    if (!written.ok) return;

    const review = createUnifiedDerivedReview({
      dataset: written.dataset,
      familyId: "fm_b0_product",
      authoredPathNodes: pathNodesThrough([
        { id: "C3", p: pt(40, 0) },
        { id: "C4", p: pt(0, 20) },
      ]),
      hitTolerance: HIT,
    });
    expect(review.ok).toBe(true);
    if (!review.ok) return;
    expect(review.bag.productBuildError).toBeNull();
    expect(review.bag.productMembers.length).toBeGreaterThan(0);

    const approved = approveUnifiedDerivedReview({
      dataset: written.dataset,
      bag: review.bag,
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;

    const productEntries = approved.dataset.flatMap((rec) =>
      Object.values(rec.strategies ?? {}).filter(
        (s): s is StrategyEntry =>
          !!s && s.memberOrigin === CUE_C3_PRODUCT_MEMBER_ORIGIN
      )
    );
    expect(productEntries.length).toBeGreaterThan(0);
    for (const s of productEntries) {
      expect(s.familyId).toBe("fm_b0_product");
      expect(s.memberOrigin).toBe(CUE_C3_PRODUCT_MEMBER_ORIGIN);
      for (const key of FAMILY_MASTER_COMMON_FIELD_KEYS) {
        expect(s[key as keyof StrategyEntry]).toEqual(
          seed[key as keyof StrategyEntry]
        );
      }
    }
  });

  it("Publish success alert never mentions Product Export Request", () => {
    const src = readUtf8(settingsPath);
    expect(src).not.toMatch(/Product Export Request/i);
    expect(src).not.toContain("Dataset Export 완료");
    expect(src).toContain("Publish 완료");
    expect(src).toContain("Published 데이터 검증까지 완료되었습니다");
  });
});
