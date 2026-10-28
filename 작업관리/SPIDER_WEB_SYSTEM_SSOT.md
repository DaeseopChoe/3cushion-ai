# Spider Web System (거미줄) SSOT v1.1

**Status:** Phase 1 implemented (2026-10-19) · v1.1 C1 → C2 spin-corrected reflection (2026-10-19)  
**Scope:** `spider_web` only. 5&Half and every other system are unchanged.  
**Related:** `DISPLAY_BOUNDARY_POLICY_SSOT.md` · `TRAJECTORY_EXTENSION_SSOT.md` · `PROJECT_LOG_2026-10.md`

Ball roles are unchanged: `balls.cue` = 내공 · `balls.target` = 앞공 · `balls.second` = 뒷공. `targetBall` is colour metadata only.

---

## 1. Tracks (explicit rail table — no B2T/T2B inference)

| Track | CO | C1 | C2 | C3 (0 ≤ C3 ≤ 60) | C3 (60 < C3 ≤ 80) | Allowed tips |
|---|---|---|---|---|---|---|
| RLTR_R | RIGHT | LEFT | TOP | RIGHT | BOTTOM | 0, R1–R4 |
| LRTL_L | LEFT | RIGHT | TOP | LEFT | BOTTOM | 0, L1–L4 |
| RLBR_L | RIGHT | LEFT | BOTTOM | RIGHT | TOP | 0, L1–L4 |
| LRBL_R | LEFT | RIGHT | BOTTOM | LEFT | TOP | 0, R1–R4 |

- C3 = 60 belongs to the short rail. C3 > 60 is on the adjacent long rail immediately (corner knot at sys 60 on the long rail). 60 → 70 is never interpolated diagonally.
- Code: `domain/spiderWeb/spiderWebTracks.ts` (`SPIDER_WEB_TRACKS`, `spiderC3Rail`).
- Anchors: `data/systems/spider_web/anchors.json` uses the standard `trajectories[track].anchors[{id}]` shape. Each track's long C3 rail starts with a corner knot at sys 60 (the frame corner shared with the short rail):
  - RLTR_R `C3_(82.25,-2.25)_60` · LRTL_L `C3_(-2.25,-2.25)_60` · RLBR_L `C3_(82.25,42.25)_60` · LRBL_R `C3_(-2.25,42.25)_60`.
  - Short-rail lookup ignores corner knots (y must lie in 0..40), so C3 ≤ 60 never reads a long-rail knot and C3 > 60 never reads a short-rail knot.

## 2. Hit point (HP)

- The SYS UI keeps the signed `-4..+4` selection (`HP_sel`). `0` = 0팁, `+n` = right n tips, `-n` = left n tips.
- `HP_n = 10 × |HP_sel|` (unsigned: 0/10/20/30/40). Direction lives in the sign of `HP_sel` and in the track suffix.
- `_R` tracks accept `0..+4` only. `_L` tracks accept `0..-4` only. The opposite direction is rejected (`HP_DIRECTION_MISMATCH`). `HP_n = -40` is never produced.
- Nine hit points: `0`, `R1..R4`, `L1..L4` (`hitPointId`). Metadata: `anchors.json → hit_points.spider_web`.

## 3. Formula and solver

`C3_f = CO_f − C1_f + HP_n`

- The user picks the solve target explicitly (`CO_f` | `C1_f` | `C3_f` | `HP`). Empty-field inference is not used.
- Inverses: `CO_f = C3_f + C1_f − HP_n` · `C1_f = CO_f + HP_n − C3_f` · `HP_n = C3_f − CO_f + C1_f`.
- HP inverse must be exactly 0/10/20/30/40 (no rounding). Otherwise `HP_NOT_REPRESENTABLE`.
- Ranges: CO 0–40 · C1 0–80 · C3 0–80. `C3 < 0` → `C3_BELOW_MIN` · `C3 > 80` → `C3_ABOVE_MAX`.
- No Sn, no 출발값 보정, no 5&Half C4 logic. Physical corrections (slide/draw/curve/spin/departure) are not applied to spider.
- Code: `domain/spiderWeb/spiderWebSolver.ts`.

## 4. Geometry (C2 / C3)

- CO/C1/C3 labels sit on the frame point of the declared rail (e.g. LRTL_L CO_20 → left frame, C1_40 → right frame).
- CO/C1 rail points = line(CO_frame → C1_frame) ∩ the declared rails.
- C3 rail point = C3 frame point projected onto the declared C3 rail (clamped to the rail segment).
- **C3 is the absolute answer.** C3's coordinate, rail and label value are the formula result and are never moved, clamped or re-solved by C2. HP is not added again in C2.

### 4.1 C2 — C1 → C2 spin-corrected reflection (v1.1, 2026-10-19)

- Priority: CO / C1 / C3 / HP formula values → C3 fixed → **C2 is the only unknown**, solved on the track's C2 long rail (RLTR_R / LRTL_L → TOP · RLBR_L / LRBL_R → BOTTOM).
- Condition (Rg y-up, CCW positive):
  - `vIn = normalize(C2 − C1_rail)` · `vOut = normalize(C3_rail − C2)`
  - `vExpected = rotate(specularReflect(vIn, C2 rail), c2SpinDelta)` · require `vOut = vExpected`.
- `c2SpinDelta = spinSign × tipDeltaDeg[|HP_sel|]` (same `[0, 5, 10, 13, 18]` as §5). `_R` → +, `_L` → −. No decay, **no `branchSign`**.
  - C1 → C2 always uses the track's own spin. The C3 > 60 reversed branch applies **only from C3 → C4 onward** (§5).
- Tip 0 → `c2SpinDelta = 0` → identical to the old pure specular point (mirror C3 across the C2 rail ∩ line from C1).
- Solver (`solveSpiderC2`, spider-only pure function): on a horizontal rail the condition is `θ(vIn) + θ(vOut) = δ`. With C1 / C3 strictly on the table side of the rail, the sum is strictly monotonic in `s` → at most one root; bisection on `s ∈ [0, 80]` (x tol `1e-10`, angle tol `1e-8` rad, 200 iterations). No root search outside the rail and no clamping.
- Errors (no nearby-point fallback; the path is not built, so no trajectory, labels or SAVE):
  - `C2_NO_SOLUTION` — the spin-corrected C2 would lie outside the rail (0–80). "C2 연결 불가" message asks to adjust CO / C1 / tip.
  - `C2_DEGENERATE` — C1 or C3 lies on the C2 rail itself (e.g. C3 = 0 or C1 = 0 at the C2-rail corner), or invalid numbers.
  - `C2_NOT_CONVERGED` — bisection did not reach the tolerance.
- Error state: `trajectoryBuilder` returns an empty trajectory with no labels for a failed spider path (never the generic builder); App labels for spider come only from the spider path; SYS panel Apply and SAVE / 덮어쓰기 are blocked with the Korean message.
- C2 handle / C2 override remain disabled for spider. 5&Half and other systems' C2 are unchanged.
- Code: `domain/spiderWeb/spiderWebGeometry.ts` (`spiderC2SpinDeltaDeg`, `solveSpiderC2`, `buildSpiderWebPath` → `c2DeltaDeg`). `trajectoryBuilder` consumes a pre-built spider path (`spiderWebPath`) and skips the generic CO/C1/C2/C3 and 5&Half branches for spider only.

## 5. Expected continuation C3 → C4 → C5 → C6 (spider-only)

- At each vertex the incoming direction is reflected specularly, then rotated by `δ_k = branchSign × spinSign × tipDeltaDeg[|HP_sel|] × decay[k]`.
  - `spinSign` = +1 for `_R`, −1 for `_L` (CCW positive in Rg y-up).
  - `branchSign` = +1 when C3 ≤ 60 · −1 when C3 > 60 (reversed spin direction). Applies from C3 → C4 onward only; C1 → C2 (§4.1) never uses it.
  - `tipDeltaDeg` default `[0, 5, 10, 13, 18]` · `decay` default `[1.0, 0.8, 0.7]` for C4/C5/C6. Both are spider-only settings (`SPIDER_CONTINUATION_DEFAULTS`). Global reflection / 5&Half are unchanged.
- ADMIN can drag C4/C5/C6 along their rail (`{ rail, t }`).
  - Move C4 → C5/C6 overrides cleared and recomputed.
  - Move C5 → C6 override cleared and recomputed.
  - Move C6 → only C6 fixed.
  - Any vertex move invalidates E1/E2 (Extension draft cleared).
- SYS / track / tip change → C4–C6 overrides and E1/E2 invalidated (signature mismatch).
- Persisted separately as `StrategyEntry.spiderContinuation = { ruleVersion, signature, vertices }`. Never in `system_values` / `sysInputs` / `trajectoryExtensions`. A stored payload whose `signature` or `ruleVersion` differs from the current inputs is ignored.
- Code: `domain/spiderWeb/spiderWebContinuation.ts`.

## 6. Boundary with the common Trajectory Extension

- Spider continuation is part of the **calculated** SYS path (pathNodes `[CO, C1, C2, C3, C4, C5, C6]`).
- The common Extension (E1/E2, max 2) starts from the last valid calculated node — C6 for spider. Extension code is unchanged.

## 7. Persistence

- `sysInputs` for spider keep `CO_f`, `C1_f`, `C3_f`, `HP_n`, `HP_sel` (system-specific strip policy: `SPIDER_PERSIST_SYS_INPUT_KEYS` via `stripRuntimeSysInputs(raw, { systemId })`). The global strip list is unchanged for every other system.
- `track` = spider route id. Family 4-track generation is not applied (`parseFamilyTrack` rejects spider routes) → exact single-track upsert. Family identity is still minted; `spiderContinuation` travels on the FamilyMember like `reflectionOverride`.
- History Recall restores inputs, track, tip, C3, C4–C6 edits and E1/E2. Publish/Search preserve `systemId` and `track`.

## 8. Runtime (App / SYS overlay)

- SYS overlay: selecting `spider_web` swaps the 5&Half form for `SpiderWebSysPanel` (track · solve target · CO/C1/C3 · nine-point tip select with opposite-direction tips disabled · result / error). Apply is disabled until the solver succeeds and the spider path (C2 spin-corrected connection) is buildable; the C2 rail position and rotation are shown, or the "C2 연결 불가" error.
- Slot commit (`useShotSlots.buildSlotDraftWithUpdatedSys`): spider branch stores only the solved values (no prevResult merge, no Sn/C4). An invalid map yields an empty result, so the commit is blocked.
- Invalidation: `shouldInvalidateSpiderEditsOnSysChange(prevSys, nextSys)` (signature compare) strips `spiderContinuation` + `trajectoryExtensions` from the slot layers and clears the App Extension draft / vertex state.
- ADMIN handles: C2 handle and C2 override are disabled for spider. C4/C5/C6 rail handles reuse `useC2RailHandleDrag`; the first real move begins an Undo transaction and clears E1/E2. Undo snapshots carry `spiderContinuation`.
- USER: the display slot's stored `spiderContinuation` is rendered (no handles).
