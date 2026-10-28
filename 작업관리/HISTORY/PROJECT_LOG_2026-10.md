# PROJECT_LOG_2026-10

Version : v1.00
Period : 2026-10
Status : Active Project Log

> 2026-10 entries moved here from `PROJECT_LOG_2026-09.md` on 2026-10-12 (content unchanged). Earlier history → `PROJECT_LOG_2026-09.md`.

---

# 2026-10-19 — 거미줄(spider_web) C1 → C2 회전 보정 반사 (C3 고정)

## Mode

**Agent** · code + tests + docs · uncommitted · no commit / push / Publish · browser check in an isolated temp copy on D: (port 5391, own Vite cache, removed afterwards) · real `.workspace-data` / History / Published / browser storage not touched

## Why

Phase 1 computed C2 as the pure specular point between C1 and C3 (rotation 0). The confirmed rule is: C3 = CO − C1 + HPn is the absolute answer and must not move, while the C1 → C2 reflection must carry the tip rotation. So C2 has to be re-solved on the long rail.

## Change

- `spiderWebGeometry.ts`: `spiderC2SpinDeltaDeg` (track spin × `tipDeltaDeg`, no decay, no C3 > 60 branch) · `solveSpiderC2` (condition `θ(vIn) + θ(vOut) = δ` on TOP / BOTTOM, strictly monotonic → bisection on 0..80, x tol 1e-10, angle tol 1e-8 rad, no clamp) · error codes `C2_NO_SOLUTION` / `C2_DEGENERATE` / `C2_NOT_CONVERGED` with Korean messages · `buildSpiderWebPath` uses the solver and exposes `c2DeltaDeg`; the old mirror helper is removed.
- `trajectoryBuilder.ts`: a failed spider path returns an empty trajectory with no labels (no generic fallback).
- `App.jsx`: spider path is built whenever spider is selected; spider labels come only from the spider path; SAVE / 덮어쓰기 blocked with the Korean message while the path is not buildable.
- `SpiderWebSysPanel.jsx`: shows C2 rail position + rotation, or "C2 연결 불가 (code)"; Apply blocked on C2 errors.
- SSOT: `SPIDER_WEB_SYSTEM_SSOT.md` v1.1 (§4.1 C2 formula / priority / C3 fixed · §5 branch applies from C3 → C4 only).

## Tests

- Failing-first: the new C2 block was run with the C2 rotation forced to 0 (= old specular behaviour) → 13 failures (tips 1–4, C3 fixed vs C2 moved, C3 60 / 60.1 / 70 / 80, path-level failure); tip 0 and solver unit cases passed as expected. Then restored.
- Spider 43 domain + 22 integration → 65 pass after the change (old specular test replaced). Full suite 710 suites / 2326 tests pass · `npm run build` pass.
- Sandbox browser:
  - LRTL_L CO 20 / C1 40 / L3 → C2 TOP 34.838 (old specular 20.075), C3_10 kept at LEFT (0, 33.3), CO / C1 labels on left / right frame.
  - Tip 0 with C3_10 kept (CO 20 / C1 10) → C2 TOP 44.2997 = pure specular. Literal CO 20 / C1 40 / tip 0 → C3 = −20 blocked by the formula.
  - LRTL_L CO 40 / C1 10 / L4 → C3_70 BOTTOM, measured C1 → C2 −18° (track spin), C3 → C4 +18° (reversed). CO 40 / C1 5 / L4 (C3_75) → same rotations, E1 from C6 and E2 chained.
  - RLTR_R CO 30 / C1 30 / tip 0 (C3 = 0 on the C2-rail corner) → "C2 연결 불가 (C2_DEGENERATE)", Apply disabled.

## Notes

- C3 = 0, or C1 / CO = 0 at the C2-rail corner, now yields `C2_DEGENERATE` (previously a zero-length C2 = C3 / C1 segment).
- C3 = 60 / 60.1 sit on the table corner; C4–C6 are not generated there, with or without the C2 correction (unchanged).
- With the new C2, LRTL_L C3_70 ends C6 ≈ 1.45 from the top-right corner, where the common Extension proposal finds no next cushion hit (Extension code unchanged).

## Not changed

- C3 / CO / C1 / HP formula values, C3 rail branch, C4–C6 continuation rule, common Trajectory Extension, persistence structure.
- 5&Half and every other system's C2 / reflection code. `incidenceAngle.ts`, `.tmp.driveupload/`.

---

# 2026-10-19 — 거미줄(spider_web) 시스템 Phase 1

## Mode

**Agent** · code + tests + docs · uncommitted · no commit / push / Publish · browser check in an isolated temp copy on D: (separate port 5391 / origin, own Vite cache, no History write) · real `.workspace-data` / History / Published not read or changed

## Why

spider_web had a formula only (`C3_f = CO_f - C1_f + HP_n`) and no track / rail / tip / geometry model. The generic B2T/T2B path could not draw it (wrong rails, signed HP, no C4–C6 rule).

## Change

- Domain `domain/spiderWeb/`: four route tracks with an explicit rail table (C3 ≤ 60 short rail · C3 > 60 long rail, no 60→70 diagonal) · signed tip select → `HP_n = 10 × |HP_sel|` with direction check · explicit-target solver (exact HP inverse, range errors) · geometry (frame-rail knots, specular C2) · C4–C6 continuation (tip delta × decay 1.0 / 0.8 / 0.7, reversed when C3 > 60) with `{ rail, t }` vertex edits under a signature + ruleVersion.
- `trajectoryBuilder`: spider-only branch consuming a pre-built `spiderWebPath` (cap = chain / same-rail). 5&Half and other branches unchanged.
- Persistence: system-specific sysInputs strip (`CO_f / C1_f / C3_f / HP_n / HP_sel`) · `StrategyEntry.spiderContinuation` through SAVE → FamilyMember split / hydrate → Recall · slot carry · Undo snapshot.
- UI: `SpiderWebSysPanel` (track · solve target · nine-point tip) inside `SysOverlay` · slot commit spider branch · ADMIN C4/C5/C6 rail handles (C2 handle off for spider) · SYS / track / tip change or vertex move clears E1/E2.
- Data: `data/systems/spider_web/{anchors,system_meta,profile,logic}.json` rewritten · `system_meta.schema.json` widened (family `spider`, route tracks, `track_model`).
- SSOT: new `SPIDER_WEB_SYSTEM_SSOT.md` · `TRAJECTORY_EXTENSION_SSOT.md` v1.4.3 · `DISPLAY_BOUNDARY_POLICY_SSOT.md` v1.7.1.

## Tests

- New `spiderWeb.domain.test.ts` (26) + `spiderWeb.integration.test.ts` (21). Integration persistence / builder / render-value cases failed before the slot / strip / builder changes.
- Full suite 709 suites / 2308 tests pass · `npm run build` pass.
- Sandbox browser:
  - LRTL_L CO 20 / C1 40 / L3 → C3_10 on LEFT; CO / C1 labels on left / right frame; right tips disabled; C3→C4 δ = −13°.
  - C4 drag → C5 / C6 recomputed and E1 cleared; C6 drag → only C6; C5 drag → C6 recomputed; SYS re-apply → edits reset.
  - LRTL_L CO 40 / C1 10 / L4 → C3_70 on BOTTOM, δ = +18° (reversed); E1 / E2 start at C6.

## Not changed

5&Half formulas / cushion coordinates / C4 < 20 → C4 else C6 · global strip list · Extension domain code · Search · History / Published storage · ball-role SSOT (`balls.cue` 내공 · `balls.target` 앞공 · `balls.second` 뒷공; `targetBall` = colour only) · `incidenceAngle.ts` · `.tmp.driveupload/`.

---

# 2026-10-12 — 누적 작업 정리: 문서 최신화 · 검증 · commit / push

## Mode

**Agent** · docs + verification + Git (explicit commit / push approval) · no app Publish · no dataset / Production change · `.workspace-data` not read or changed

## Scope (one commit)

Uncommitted work since `accec11` (2026-09-29 … 2026-10-11): LocalDB removal → D-drive History (Task F) · new SAVE cancel / F5 recovery · History approved graph · Publish 현황 report · 12MiB Published leaf cap · local delete UI / policy · C3+ full scoring line (2026-09-28) · Display Boundary v1.7 · ADMIN Search over every Published leaf · related tests and docs.

## Docs

- This file created; the three 2026-10 entries below moved from the 09 log (09 keeps September only).
- `PROJECT_LOG_2026-09.md`: added the missing 2026-09-28 C3+ full scoring line entry.
- `PROJECT_MASTER_INDEX.md`: **Current State (2026-10-12)** section · log links → 2026-10 · LocalDB-era rows marked 폐지됨 / 대체됨 (not deleted).
- `DISPLAY_BOUNDARY_POLICY_SSOT.md` v1.7 checked against `trajectoryPathDisplayPolicy.ts` / `trajectoryBuilder.ts` (no second-ball cap; Cap = min(chain, same-rail, PhysicalLimit)).

## Excluded from the commit

`frontend/src/domain/trajectory/incidenceAngle.ts` (protected) · `.tmp.driveupload/` (Google Drive temp) · `.workspace-data/` (ignored, real History) · `frontend/dist` / `node_modules` (ignored).

---

# 2026-10-11 — ADMIN Search: 새로고침 전후 모두 Published 전체 leaf(공략 × 시스템 폴더) 검색

## Mode

**Agent** · code + tests + docs · uncommitted · no commit / push / Publish · browser check in an isolated temp sandbox (separate origin, synthetic Published leaves, no `.workspace-data`)

## Why

ADMIN Search searched one leaf, chosen from screen state (`adminState.sys`, slot, `userPublishedSearchContext`). A reload clears that state, so Search fell back to `뒤돌리기 / 5_half_system` and data Published in another leaf (e.g. 옆돌리기 / 파이브앤하프) showed "해당 데이터 없음" only after the reload.

## Change

- `publishedLeafResolve.ts`: `resolveAllPublishedLeafCandidates(hint?)` = canonical shot types × `listCanonicalPublishedSystemIds()` (runtime system packages + SYS overlay ids, default `5_half_system` first, rest sorted), one per Published folder. The hint only moves matching leaves first; nothing is dropped. ADMIN branch of `resolveCandidatePublishedLeaves` uses it. `formatPublishedLeafSource` → "옆돌리기 · 파이브앤하프". USER branch unchanged.
- `publishedDatasetStore.ts`: `loadPublishedLeaves` — same leaf cache, ordered results, 12 parallel loads, one failing leaf does not stop the others.
- `adminSearchFlow.ts`: every leaf is ranked with the unchanged `adminStrict` rules; only a strictly closer candidate replaces the best (tie → hint leaf, then fixed canonical order). Failed leaves → one `console.warn` diagnostic; load-error alert only when every leaf fails; "해당 데이터 없음" after all leaves. Winning leaf shotType goes to `adminState.sys` (next Search's hint only).
- `recallPositionDifference.ts`: optional `sourceLabel` → first notice line "유사한 공략을 찾았습니다. (옆돌리기 · 파이브앤하프)". Exact matches still show no notice.
- `aiPlayStrategyBuilder.ts`: `listSystemNameKoIds()` export.

## Tests

- New `adminSearchAllPublishedLeaves.contract.test.ts` (A1–A2, B1, C1–C2, D1–D3, E1–E3, F1–F4, G1–G4); `publishedLeafResolve.test.ts` ADMIN cases + `resolveAllPublishedLeafCandidates`. On the old code 20 / 36 fail.
- `publishedSearchLeafResolution.contract.test.ts` CASE A / B: "fetch once, never 뒤돌리기" → "hint leaf loaded first, every leaf searched".
- Full suite 196 files / 2261 tests pass · `npm run build` pass.
- Sandbox browser (leaf A 뒤돌리기 cue +1.0, leaf B 옆돌리기 cue +0.5 from the start balls): before reload → B "(옆돌리기 · 파이브앤하프)" 내공 0.5, 720 leaves; after reload → same; hint 뒤돌리기 → B still chosen.

## Not changed

USER Search (still canonical shot types for one systemId) · `adminStrict` tolerance · ball normalisation · ball-role SSOT · History (APPROVED / PENDING never searched) · Publish, cache invalidation, Production verify · `vite.config.js` · `.workspace-data` · Published files.

## Observed (not changed)

In the sandbox browser a leaf file changed on disk was still served from the browser HTTP cache after `refreshPublishedDataset()` (the dev `/dataset` middleware sends no cache headers). Not part of this task; worth a separate check of "Publish → Search sees new data" in the real dev browser.

---

# 2026-10-11 — SYS 궤적은 뒷공(세컨드볼) 적중 여부와 무관하게 마지막 유효 쿠션까지 항상 표시 (Display Boundary v1.7)

## Mode

**Agent** · code + tests + docs · uncommitted · no commit / push / Publish · browser check in an isolated temp sandbox (separate origin, empty dataset, no `.workspace-data`)

## Why

The 2026-10-10 rule "hit → end at the ball" confused SYS checking: the admin must see which final cushion value the current SYS points to, not only whether the 뒷공 is hit.

## Change

- `trajectoryPathDisplayPolicy.ts`: removed `computeSecondBallCapEndIndex`, `second_ball_hit` / `second_ball_miss`, `endPoint`, segment projection and the baseline own-hit cut. `resolveTrajectoryDisplayCap(pathNodes, opts?)` = min(chain, same-rail, PhysicalLimit?). `slicePathNodesToCap` returns nodes only.
- `trajectoryBuilder.ts`: no second ball / hit tolerance in either cap; baseline gets no corrected ceiling (each path keeps its own PhysicalLimit / valid range); removed the unused `resolveSecondBall` wrapper; `hitTolerance` input now optional (unused for display). Coordinate formulas unchanged.
- SSOT `DISPLAY_BOUNDARY_POLICY_SSOT.md` v1.7 (§5.2 row 6 retired · §5.4 · §6.1.1 · D-DBP-05 · D-DBP-19).

## Tests

- `trajectoryBuilder.secondBallDisplay.test.ts` rewritten (A–H + C-OFF / E2 / E3); `trajectoryPathDisplayPolicy.test.ts` second-ball cases replaced; `c2ReflectionOverride.hptTipSideInvalidate.test.ts` call signature updated. On the 10-10 code 11 / 62 fail (ball on C3–C4 or C5–C6 ends at 3 / 5 instead of 6 or 4).
- Full suite 195 files / 2235 tests pass · `npm run build` pass.
- Sandbox browser (5&Half B2T_L, CO 45 / C1 20 / C3 25): 뒷공 off path, on C3–C4, on C5–C6 → identical line to C6 with C4_22.5 / C5_22.5 / C6_22.5, 기준선 ON and OFF. C1 30 (C3 15, C4 12.5) → ends at C4, last label C4_12.5, 뒷공 off path or on C3–C4, ON and OFF.

## Not changed

Cushion / coordinate formulas · SYS value formulas · Search · storage · derived generation (C3+ uses its own `isSegmentHitBall`) · Extension layer · History · `.workspace-data` · Published · ball-role SSOT (`balls.cue` 내공 · `balls.target` 앞공 · `balls.second` 뒷공; `targetBall` = colour only) · `incidenceAngle.ts` · `.tmp.driveupload/`.

---

# 2026-10-10 — SYS 입력 중 뒷공(세컨드볼) 미적중 시 전체 예상 궤적 표시 복원 (Display Boundary v1.6)

> **대체됨 (2026-10-11, v1.7):** "적중 → 뒷공 위치에서 종료"와 baseline corrected ceiling은 폐지. 아래는 이력.

## Mode

**Agent** · code + tests + docs · uncommitted · no commit / push / Publish · browser check in an isolated temp sandbox (separate origin, empty dataset, no `.workspace-data`)

## Why

While entering SYS, the predicted path stopped at C3 whenever the 뒷공 (`balls.second`) was not on the path: `computeSecondBallCapEndIndex` defaulted a miss to `min(3, maxChain)`, and fb1e5cf passed that C3 end as the 5&Half baseline ceiling. With 5&Half 기준선 ON, the C4–C6 line and labels disappeared.

## Change

- `trajectoryPathDisplayPolicy.ts`: miss → `maxChain` (`second_ball_miss`); hit → first post-C3 segment in travel order, ends at the segment start node plus `endPoint` (ball centre projected onto the segment) (`second_ball_hit`); `"full"` → `full_valid_path`; optional `physicalLimitEndIndex`; a tie with another limit → that limit wins, no `endPoint`. 5&Half baseline: corrected ceiling only when corrected is a hit; the baseline's own segment hit ends at its own `endPoint` (no corrected-XY clip). `slicePathNodesToCap` appends `endPoint` on a hit.
- `trajectoryBuilder.ts`: `correctedSysValues` input → 5&Half corrected PhysicalLimit (C4 < 20 → C4, else C6) only when the corrected C4 resolves; baseline ceiling hit-only. Coordinate formulas unchanged.
- `App.jsx`: `correctedSysValues: resolvedSlotSysValues` on the main `buildTrajectory` call.
- SSOT: `DISPLAY_BOUNDARY_POLICY_SSOT.md` v1.6 (§5.2 / §5.4 / §6.1.1 / §6.2 resolved · D-DBP-05 · D-DBP-19).

## Tests

- New `trajectoryBuilder.secondBallDisplay.test.ts` (A–H + D2 / F2b / F3); `trajectoryPathDisplayPolicy.test.ts` updated / extended; `hptTrajectoryDiag.test.ts` reason rename. A / C / E / G fail on the old code (C3 end).
- Full suite 195 files / 2244 tests pass · `npm run build` pass.
- Sandbox browser (5&Half B2T_L, CO 45 / C3 25): miss → C6 with C4–C6 labels (기준선 ON / OFF) · C3–C4 hit → line ends at the 뒷공, labels CO–C3 (ON / OFF) · C5–C6 hit → through C5, ends at the 뒷공, no C6 (ON / OFF).

## Not changed

`buildTrajectory` cushion / coordinate formulas · Search algorithm / tolerance · Family storage · History · `.workspace-data` · Published · C3+ derived input · Extension layer · ball-role SSOT (`balls.cue` 내공 · `balls.target` 앞공 · `balls.second` 뒷공; `targetBall` = colour only) · `incidenceAngle.ts` · `.tmp.driveupload/`.
