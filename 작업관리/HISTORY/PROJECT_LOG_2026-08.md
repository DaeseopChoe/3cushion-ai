# PROJECT_LOG_2026-08

Version : v1.43  
Period : 2026-08  
Status : Active Project Log

---

# 2026-08-24 (Phase 3A-359F — C3+ Scoring Derived Generator)

## Mode

**Agent** · generator + focused tests · no UI · no schema rewrite · no Push · datasets protected

## Status

| Item | Result |
|------|--------|
| **PHASE 3A-359F** | **PASS** |
| Scoring path | Variable: C3 → system Origin tail → EXT1? → EXT2? |
| Origin | Not forced to C6 (`min(chain, sameRail)`) |
| SB rule | First hit segment; full segment to endpoint; no cut at SB center |
| E2 end | Handle endpoint when SB on E1→E2 (no projected C8) |
| No SB | `NO_SB_HIT` fail-closed |
| Sampling | Hybrid · spacing≤3 · min≥3 · **no** VALID_FRACTION 0.30 |
| SB closest sample | **Not** mandatory |
| derivedRule | `C3_PLUS_SCORING_LINE_v1` (not 2Rg) |
| trajectoryExtensions | **COPY** on derived members |
| Cue clamp | Family ball-center inset when sample on rail |

## Tests

`generateC3PlusScoringDerivedMembers.test.ts` — **17 PASS**  
Regressions: Cue→Impact 31 · familyIdentity 31 · familyAwareWriter 16 · 359C cushions 13 — **all green** (108 total in suite run)

## Files (new/updated)

- `frontend/src/domain/family/c3PlusScoringPath.ts`
- `frontend/src/domain/family/sampleC3PlusScoringLine.ts`
- `frontend/src/domain/family/generateC3PlusScoringDerivedMembers.ts` (+ test)
- `frontend/src/domain/trajectory/hitToleranceRg.ts`
- `familyAwareWriter` · `familyIdentity` · `positionSearchEngine` · `family/index` (minimal)

## Next

C3+ review/approval UI wiring (optional) · App pathNodes DI into generator · sampling product polish

---

# 2026-08-24 (Phase 3A-359C — Manual Extension C7/C8 Geometry Helper)

## Mode

**Agent** · read-only geometry helper + focused tests · no C3+ generator · no UI · no schema change · no Push

## Status

| Item | Result |
|------|--------|
| **PHASE 3A-359C** | **PASS** |
| Helper | `deriveManualExtensionCushions` |
| C7 | E1 rail-normalized (fail-closed if not recoverable rail) |
| C8 | Manual direction C7→E2 → first next cushion (`findNextCushionHit` policy) |
| SYS scalars C7/C8 | **NOT** created |
| Auto reflection / reverse-spin | **NOT** implemented |
| Durable storage of C7/C8 | **NOT** — derived only |
| trajectoryExtensions schema | **unchanged** |
| Protected user datasets | **untouched** |

## Product rules locked

- SYS ends at C6
- E1 → C7 (physical Rg cushion)
- E2 → post-C7 manual direction → derived C8
- C6→C7 kept for future scoring even if cue would stop earlier (energy not modeled here)
- No mirror / spin / SYS extrapolation

## Tests

`frontend/src/domain/trajectoryExtension/deriveManualExtensionCushions.test.ts` — **13 PASS**  
Regression smoke: `trajectoryPathDisplayPolicy.test.ts` — **22 PASS**

## Files

- `frontend/src/domain/trajectoryExtension/deriveManualExtensionCushions.ts` (new)
- `frontend/src/domain/trajectoryExtension/deriveManualExtensionCushions.test.ts` (new)
- `frontend/src/domain/trajectoryExtension/index.ts` (export)

## Next

C3+ scoring trajectory derived generator may consume this helper read-only (Ask/Agent follow-on). UI C7/C8 markers deferred.

---

# 2026-08-23 (Phase 3A-358 — FINAL DERIVED CUE-IMPACT E2E VERIFICATION)

## Mode

**Ask / Agent (doc-only)** · verification record · production/dataset/localStorage **unchanged**

## Final status

| Item | Result |
|------|--------|
| **PHASE 3A-358** | **PASS** |
| **Q7 LOCALDB HIT IDENTITY** | **VERIFIED** |
| Production code modified | **NO** |
| Dataset modified by verification | **NO** |

## Verification flow

1. Authored dataset SAVE → History **v001**
2. Cue→Impact derived approval
3. 10% / 20% / 30% derived records → approved corpus → History **v002**
4. User DevTools: v001 records = **112** · v002 = **124** · delta = **+12**
5. +12 = **4 source × {0.1, 0.2, 0.3}** derived steps
6. LocalDB recall near ~30% Cue position
7. `[RECALL_RESULT]` winner metadata confirmed directly

## Final LocalDB winner evidence

| Field | Value |
|-------|--------|
| positionId | `203174220360700390` |
| slot | S1 |
| memberOrigin | `DERIVED_CUE_IMPACT` |
| derivedRule | `CUE_IMPACT_FIRST_30PCT` |
| derivedStep | `cue_impact:t:0.300000` |
| cue (Exact) | ≈ (20.321164872848954, 17.36227996072103) |
| LocalDB query cue | ≈ (20.3, 17.5) |
| distance (Ball3 L1) | ≈ 0.18121729433007516 |

## Judgment

LocalDB trajectory was not merely “similar to authored.” The selected winner itself is the **DERIVED_CUE_IMPACT / 30%** record, proven via `[RECALL_RESULT]` metadata. Prior 3A-358 Q7 **PARTIAL / NOT PROVEN** is closed as **VERIFIED**.

## E2E verified chain

authored SAVE → v001 History → derived approval → 10/20/30 Cue→Impact generation → approved corpus / v002 History → LocalDB working-corpus search → exact 30% derived winner recall

## Next

**PHASE 3A-359** — C3 이후 파생 데이터 생성/저장 설계 및 구현 검토

---

# 2026-08-22 (Phase 3A-349 — Controlled Normalized READ Flag Enable)

## 제목

**Production default: FAMILY_NORMALIZED_STORAGE_ENABLED false → true (gated READ only)**

## Mode

**Agent** · minimal production change · Commit/Push 없음

## Status

**PASS** · CONTROLLED FLAG ENABLE IMPLEMENTED = **YES**

## Change

| Item | Before | After |
|------|--------|--------|
| `FAMILY_NORMALIZED_STORAGE_ENABLED` | `false` | **`true`** |
| Eligibility gate | flag ∧ fresh ∧ rematerialize | **unchanged** |
| WRITE SSOT | `positions_dataset` | **unchanged** |
| Flag OFF rollback | legacy | **preserved** (test override + reason `flag_off`) |

## Architecture

| Invariant | Result |
|-----------|--------|
| WRITE SSOT | positions_dataset |
| Generation authority | positions_dataset_meta |
| family_* | shadow |
| SearchIndex | not required |
| Full H3 | deferred |
| F12 residual | generation-aligned content drift theoretically possible (not addressed) |

## Files

**Production:** `familyNormalizedFlag.ts` (+ comment drift fixes in schema/sync/migrate/freshness/index/loadProductionCompatibleDataset)

**Tests:** isolation for default ON · explicit OFF rollback · parity A0 default-ON path · related flag assertions

**Docs:** INDEX · LOG · DRAFT

## Tests

**23 files / 312 PASS / 0 FAIL** (baseline 311 + 1 default-ON parity case)

## Next

Ask-only: Post-enable final audit before Commit/Push.

---

# 2026-08-22 (Phase 3A-348 — Final Controlled Flag-Enable Re-Audit)

## Mode

**Ask** · audit only · no code/flag change

## Status

**PASS** · CONTROLLED FLAG ENABLE = **GO** · Choice **A**

## Evidence

G1–G20 ALL PASS · live regression 23/311 PASS · ROLLBACK TRUE→FALSE SAFE = YES

## Next

Agent: Phase 3A-349 Controlled Flag Enable (implemented below).

---

# 2026-08-22 (Phase 3A-347 — Production Parity Regression Completion)

## 제목

**Close 3A-346 CONDITIONAL gaps with production-path parity regressions (test-only)**

## Mode

**Agent** · TEST-ONLY · production algorithm **unchanged** · Commit/Push 없음 · flag enable **NOT** performed

## Status

**PASS** · PRODUCTION PARITY REGRESSION COMPLETION = **PASS** · Choice **A** (ready for final controlled flag-enable re-audit)

## Gaps closed (were 3A-346 PARTIAL / NOT PROVEN)

| Gap | Result |
|-----|--------|
| ADMIN LocalDB actual path (`runAdminLocalDbRecall` + `applyPositionRecall`) S2 | **PROVEN** |
| ADMIN LocalDB activeSlot S3 | **PROVEN** |
| preferredAuthoredSlot S3 → sourceSlot → rematerialize | **PROVEN** |
| Recall S2 → edit → SAVE → reload | **PROVEN** (sibling S1 preserved) |
| Recall S3 → edit → SAVE → reload | **PROVEN** (S1/S2 preserved) |
| Approval → reload → rematerialize | **PROVEN** |
| Import → reload → rematerialize | **PROVEN** |
| Reload determinism (+ member order permutation) | **PROVEN** |
| Meta regeneration on SAVE (placeholder not durable) | **PROVEN** |
| Fail-closed + flag-off rollback | **PROVEN** |

## Files

**New:** `frontend/src/application/flows/productionParity.347.contract.test.ts`

**Production code:** **none** changed in this phase

## Tests

- Parity file: **1 / 12 PASS**
- Related suite: **23 files / 311 PASS / 0 FAIL** (family + persist/dual-write/Approval/saveFlow/H3/preserve + 347)

## Invariants preserved

| Item | Value |
|------|--------|
| WRITE SSOT | `positions_dataset` |
| Generation authority | `positions_dataset_meta` |
| family_* | shadow |
| Flag default | **false** |
| Flag enabled | **NO** |
| SearchIndex | not required |
| Full H3 | deferred |

## Next

Ask-only: Controlled Flag-Enable **Final Re-Audit**. Do **not** flip `FAMILY_NORMALIZED_STORAGE_ENABLED` default in that audit unless explicitly approved.

---

# 2026-08-22 (Phase 3A-346 — Production Semantic Parity Re-Audit)

## Mode

**Ask** · audit only

## Status

**CONDITIONAL** — packing / identity / fail-closed PASS; ADMIN LocalDB E2E · S2/S3 recall→edit→SAVE · preferred S3 · Approval/Import reload · determinism/meta **PARTIAL or NOT PROVEN** → closed by **3A-347**.

---

# 2026-08-22 (Phase 3A-345 — PositionRecord Rematerialization + sourceSlot)

## 제목

**Exact-ball packing restored via FamilyMember.sourceSlot (schema v2)**

## Mode

**Agent** · IMPLEMENTED (uncommitted) · Commit/Push 없음 · flag enable **NOT** performed

## Status

**COMPLETE**. Phase 3A-343/344 STOP-B addressed for projection invertibility.

## Contract

| Item | Value |
|------|--------|
| `FamilyMember.sourceSlot` | required `S1\|S2\|S3` packing provenance |
| Schema | **v1 → v2** |
| Old schema / missing sourceSlot | freshness/eligibility fail → legacy READ |
| Rematerialize | Exact balls → one PositionRecord · `strategies[sourceSlot]` |
| Slot collision | fail-closed (no overwrite / no fan-out) |
| WRITE SSOT | still `positions_dataset` |
| Flag default | **false** · controlled enable **NOT** performed |

## Files

**New:** `rematerializeFamilyPartsToPositionRecords.ts` · `rematerializeFamilyParts.contract.test.ts`

**Modified:** `familyNormalizedSchema.ts` · `familyHydrate.ts` · `familyNormalizedStore.ts` · `loadFamilyCompatibleDataset.ts` · related fixtures/tests · INDEX / LOG / DRAFT

## Tests

**22 files / 299 PASS** (family + persist/dual-write/Approval/saveFlow/H3/preserve + rematerialize A–J).

## Next

Ask-only: Production Semantic Parity & Controlled Flag-Enable **Re-Audit**. Do not flip flag default.

---

# 2026-08-22 (Phase 3A-342 — Gated Normalized READ Implementation)

## 제목

**Production READ gate: flag ∧ freshness ∧ hydration → else positions_dataset**

## Mode

**Agent** · IMPLEMENTED (uncommitted) · Commit/Push 없음

## Status

**COMPLETE**. Phase 3A-341 contract implemented on production READ boundary.

## Contract

| Case | Source |
|------|--------|
| flag OFF (default) | `positions_dataset` (legacy) |
| flag ON + fresh + hydrate OK | normalized PositionRecord-compatible projection |
| flag ON + stale / missing / partial / invalid / schema / hydrate fail / exception | legacy fallback |
| READ failure | **no** corpus / generation / family mutation · **no** auto rebuild |

## Eligibility

```
normalizedReadEligible =
  isFamilyNormalizedStorageEnabled()
  AND evaluateNormalizedCorpusFreshness().fresh
  AND loadFamilyCompatibleDataset().ok
```

## Result

- App startup uses `loadProductionCompatibleDataset().dataset`
- WRITE SSOT remains `positions_dataset` + meta
- `family_*` remains synchronized shadow
- flag default **false**
- SearchIndex **not** required · Full H3 **DEFERRED**
- preserve_dataset / transitional H3 / 3A-335 persist unchanged

## Files

**New:** `loadProductionCompatibleDataset.ts` · `loadProductionCompatibleDataset.contract.test.ts`

**Modified:** `App.jsx` (startup READ) · `familyNormalizedFlag.ts` (test override) · `familyNormalizedStore.ts` (stale comment) · `family/index.ts` · INDEX / this LOG / DRAFT

## Tests

**11 files / 132 PASS** (gated READ contract 20 + related regressions) · `saveFlow.sysIdentity` also green.

## Architecture

- production corpus SSOT = `positions_dataset`
- optional READ projection ≠ durable authority
- READY FOR CONTROLLED FLAG-ENABLE AUDIT (Ask) — not auto-enable

## Next

Ask-only: controlled flag-enable audit. Not Full H3. Do not set flag default true.

---

# 2026-08-22 (Phase 3A-339 — Cleanup / preserve_dataset Policy Implementation)

## 제목

**preserve_dataset keeps positions + generation meta; deletes family shadow**

## Mode

**Agent** · IMPLEMENTED (uncommitted) · Commit/Push 없음

## Status

**COMPLETE**. Phase 3A-338 policy implemented.

## Contract

| Key | preserve_dataset |
|-----|------------------|
| `positions_dataset` | **KEEP** |
| `positions_dataset_meta` | **KEEP** |
| `family_masters` / `family_members` | **DELETE** |
| `workspace_history` | DELETE (unchanged) |
| `ONE_POINT_LESSON_LIBRARY_V1` | KEEP (unchanged) |

## Reason

`positions_dataset_meta` is generation **authority** paired with production corpus. Deleting it on preserve caused N→missing→1 reset and `LEGACY_MARKER_MISSING`. Family remains disposable normalized shadow while READ is legacy.

## Result

- generation N survives cleanup
- cleanup freshness = `NORMALIZED_MISSING` (not `LEGACY_MARKER_MISSING`)
- next SAVE/Approval/Import → N+1 + dual-write rebuild → fresh=true
- clear_all / ADMIN·USER Reset / History delete / transitional H3 unchanged
- lesson category preserve pair **DEFERRED**

## Files

**New:** `frontend/src/hooks/workspaceCleanup.preserveDataset.contract.test.ts`

**Modified:** `useSettings.js` (preserve list) · `normalizedDualWrite.test.ts` (call production cleanup) · INDEX / this LOG / DRAFT

## Tests

**10 files / 112 PASS** (prior 101 + 11 new cleanup contract).

## Architecture

- production SSOT = `positions_dataset`
- normalized READ **OFF** · flag **false** · SearchIndex untouched · Full H3 **DEFERRED**

## Next

Ask-only: next prerequisite audit (gated READ / SearchIndex later). Not Full H3.

---

# 2026-08-22 (Phase 3A-338 — Cleanup / preserve_dataset Family Shadow Policy Audit)

## 제목

**Ask-only: what must preserve_dataset keep for generation/freshness + H3?**

## Mode

**Ask** · AUDIT ONLY · no implementation

## Verdict

| Item | Result |
|------|--------|
| CLEANUP POLICY CHANGE REQUIRED | **YES** |
| CURRENT preserve_dataset | **SAFE-BUT-INCOMPLETE** (meta DELETE) |
| FAMILY_* PRESERVE POLICY | **DELETE** |
| POSITIONS_DATASET_META PRESERVE | **YES** |
| Ready for implementation | **YES** → 3A-339 |

## Next

Agent: Phase 3A-339 implement preserve list + regressions.

---

# 2026-08-22 (Phase 3A-337 — Transitional History H3 Contract Hardening)

## 제목

**Lock transitional History contract: restore ≠ Member DB rollback**

## Mode

**Agent** · IMPLEMENTED (uncommitted) · Commit/Push 없음

## Status

**TRANSITIONAL H3 HARDENING COMPLETE**. **FULL H3 DEFERRED** (workspace/corpus storage split not introduced).

## Purpose

Regression-fix the 3A-336 transitional contract without implementing Full H3:

- History = workspace snapshot ≠ Member DB
- restore leaves `family_*` untouched
- restore advances legacy `corpusGeneration` → freshness false
- restore → SAVE / Approval may resync shadow → freshness true
- Approval History **+1 KEEP**
- 3A-335 false-fresh safety unchanged

## Files

**New:** `frontend/src/application/flows/historyTransitionalH3.contract.test.ts`

**Modified (minimal):** `useSettings.js` (transitional H3 comment) · INDEX / this LOG / DRAFT pointers

## Production behavior

No intentional runtime contract change — behavior already matched 3A-336; tests lock it.

## Tests

Related suite: **9 files / 101 PASS** (incl. new H3 contract + 3A-335 persist + freshness + dual-write + Approval + SAVE family + load/migrate).

## Explicitly deferred (Full H3)

`workspace_dataset` / active `workspace_current` persistence · workspaceGeneration · positions SSOT demotion · normalized READ · flag ON · SearchIndex

## Next

Ask-only: cleanup / `preserve_dataset` `family_*` policy audit. **Not** Full H3 · **not** gated READ.

---

# 2026-08-22 (Phase 3A-336 — History H3 Full Contract Audit)

## 제목

**Ask-only: is Full H3 required now, or is transitional Member protection enough?**

## Mode

**Ask** · AUDIT ONLY · no implementation

## Verdict

| Item | Result |
|------|--------|
| H3 CONTRACT REQUIRED | **YES** (eventually) |
| Transitional Member protection | **SAFE** (restore does not overwrite `family_*`) |
| Partial / transitional hardening | **READY** → done in 3A-337 |
| Full H3 | **DEFERRED** — needs workspace vs durable corpus storage split |
| Production SSOT | remains `positions_dataset` |

## Central contradiction (documented, not fixed in 337)

`positions_dataset` is both workspace restore target **and** production corpus SSOT → restore overwrites durable legacy corpus, but **not** persistent Member shadow.

## Next

Agent: Phase 3A-337 transitional hardening (tests). Full H3 deferred.

---

# 2026-08-22 (Phase 3A-335 — Generation Metadata Failure-Safety Patch)

## 제목

**Close false-fresh window: invalidate → positions → generation commit**

## Mode

**Agent** · IMPLEMENTED (uncommitted) · Commit/Push 없음

## Status

**COMPLETE**. Phase 3A-333 FINAL CLOSURE **APPROVED**. False-fresh on meta-write failure **CLOSED**.

## Root cause (3A-334)

positions write success + `positions_dataset_meta` bump failure left old gen on meta+family → `fresh=true` with new content.

## Fix

`persistPositionsDatasetWithGeneration`:

1. read previousGeneration (memory)
2. invalidate/remove meta (abort mutation if invalidate fails)
3. write `positions_dataset`
4. write next corpusGeneration (from in-memory previous+1)
5. caller syncs shadow only when ok

## Files

**New:** `persistPositionsDatasetWithGeneration.ts` (+ test)

**Modified:** saveFlow · derivedApprovalFlow · App Import · useSettings History restore · dual-write/freshness related tests · INDEX/LOG/DRAFT pointers

## Tests

18 files / **246** PASS (incl. T1 exact 3A-334 defect injection).

## Next

Ask: History H3 (3A-336) · then transitional harden (3A-337) · cleanup `family_*`. Not gated READ.

---

# 2026-08-22 (Phase 3A-333 — Generation/Freshness Contract Implementation)

## 제목

**Durable corpusGeneration linkage — positions_dataset_meta ↔ family_* envelopes**

## Mode

**Agent** · IMPLEMENTED (uncommitted) · Commit/Push 없음

## Status

**COMPLETE** for generation/freshness contract scope. Production READ still `positions_dataset`. Flag **false**. Normalized primary READ **disabled**.

## Purpose

Prove whether normalized shadow was produced from the **same latest** durable working corpus generation as `positions_dataset` (schema-valid ≠ fresh).

## Model

| Item | Value |
|------|--------|
| Type | monotonic integer `corpusGeneration` (≥ 1) |
| Authority | legacy `positions_dataset_meta` after successful positions write |
| Shadow stamp | `family_masters.corpusGeneration` + `family_members.corpusGeneration` |
| Freshness | all three equal + `validateFamilyStore` ok |
| Marker missing | **ineligible** (never treat as fresh) |

## Files

**New**

- `frontend/src/domain/dataset/infra/positionsDatasetMeta.ts`
- `frontend/src/domain/family/familyCorpusFreshness.ts`
- `frontend/src/domain/family/familyCorpusFreshness.test.ts`

**Modified**

- `familyNormalizedSchema.ts` · `familyNormalizedStore.ts` · `syncPositionDatasetToNormalizedFamilyStore.ts`
- `familyNormalizedFlag.ts` (comment) · `index.ts`
- `saveFlow.ts` · `derivedApprovalFlow.ts` · `App.jsx` (Import) · `useSettings.js` (History restore gen bump only)
- `normalizedDualWrite.test.ts` · migration/compat test persist call sites
- `PROJECT_MASTER_INDEX.md` · this LOG · `FAMILY_DATA_ARCHITECTURE_DRAFT.md` (CURRENT pointer)

## Mutation integration

| Path | Legacy gen bump | family gen stamp | Notes |
|------|-----------------|------------------|-------|
| SAVE | YES | YES (on sync ok) | History +1 unchanged |
| Approval | YES | YES | History +1 unchanged |
| Import | YES | YES | |
| History restore | YES | **NO** | intentional divergence · not full H3 |

## Tests

Family + related flows: **16 files / 238 tests PASS** (incl. freshness + dual-write).

## NOT done

cleanup `family_*` preserve · H3 full · SearchIndex · gated READ · Approval +0 · Export · fingerprint

## Next

Ask-only: History H3 · cleanup `family_*`. **Not** gated READ.

---

# 2026-08-20 (Phase 3A-326 — Normalized Dual-Write Complete)

## 제목

**Normalized Shadow Dual-Write — SAVE / Derived Approval / Import**

## Mode

**Agent** · IMPLEMENTED (uncommitted) · Commit/Push 없음

## Status

**COMPLETE** for shadow dual-write scope. Production READ still `positions_dataset`. Flag **false**. Normalized primary READ **disabled**.

## Purpose

Keep `family_masters` / `family_members` in sync after production mutations, without switching READ off of `positions_dataset`.

## Files

**New**

- `frontend/src/domain/family/syncPositionDatasetToNormalizedFamilyStore.ts`
- `frontend/src/domain/family/normalizedDualWrite.test.ts`

**Modified**

- `frontend/src/application/flows/saveFlow.ts`
- `frontend/src/application/flows/derivedApprovalFlow.ts`
- `frontend/src/App.jsx` (Import path)
- `frontend/src/domain/family/index.ts`

## Shared pipeline

`syncPositionDatasetToNormalizedFamilyStore(dataset)`  
→ `migratePositionRecordsToFamilyParts`  
→ `persistMigratedFamilyParts`  
→ `validateFamilyStore`

## Call graphs

| Path | Behavior |
|------|----------|
| **SAVE** | legacy save first → normalized shadow sync → History **+1** unchanged |
| **Derived Approval** | legacy approved dataset write → normalized shadow sync → baseline runtime restore → History **+1** unchanged |
| **Import** | legacy working dataset write → normalized shadow sync |

## Failure policy

- Legacy write succeeds first.
- Normalized failure must **not** rollback `positions_dataset`.
- While legacy READ is primary, normalized shadow failure is **non-catastrophic**.
- Prior valid shadow remains if persist not reached; diagnostics via result / `console.warn`.

## Verified

| Path | Result |
|------|--------|
| SAVE | 1 Master + 4 Members (representative) |
| Approval | legacy Derived count == normalized Derived count · lineage preserved · History exactly **+1** |
| Import | 4-track + handcrafted 16-member / 12-Derived fixture |
| History | SAVE **+1** · Approval **+1** · Cancel **+0** — unchanged |

## Production impact

| Item | State |
|------|--------|
| `positions_dataset` | **Production corpus SSOT** |
| `family_*` | **Normalized shadow** |
| Flag | `FAMILY_NORMALIZED_STORAGE_ENABLED = false` |
| Normalized primary READ | **OFF** |
| Search / Export / geometry / HPT / symmetry / Physical Target | **unchanged** |

## Tests (historical at completion)

**75/75** across 6 files (incl. `normalizedDualWrite.test.ts`).

## Remaining blockers (before normalized READ)

1. generation / freshness marker  
2. History restore **H3**  
3. cleanup / `preserve_dataset` `family_*` preservation  
4. SearchIndex  
5. gated normalized READ  

Approval History **+1** removal still **BLOCKED**.

## Next

Ask-only: generation marker + History H3 + cleanup `family_*` prerequisite audit. **Not** gated READ implementation.

## Working tree

기존 uncommitted Phase 3A 보존. Commit/Push 없음.

---

# 2026-08-20 (Phase 3A-325 — B6 Gated-Read Pre-Implementation Audit)

## 제목

**B6 Production Dual-Read / Gated-Read Pre-Implementation Audit**

## Mode

**Ask** · documentation / decision only · no code change in this phase

## Verdict

**PRODUCTION NORMALIZED READ = BLOCKED.**

## Why blocked

At audit time, `family_*` stores were **not** updated by production mutation paths:

- SAVE  
- Derived Approval  
- Import  
- History restore  

Enabling flag / reading normalized first would risk **stale** `family_*` and lose latest `positions_dataset` changes.

## Current production SSOT (then and through 3A-326 READ policy)

| Layer | Role |
|-------|------|
| `positions_dataset` | Production corpus SSOT |
| React `dataset` | Runtime mirror |
| `workspace_history` | Workspace snapshots |
| `family_masters` / `family_members` | Shadow infrastructure only (pre–dual-write at audit; dual-write landed in 3A-326) |

## Decision

Normalized READ **after** dual-write. Dual-write scope: **SAVE + Derived Approval + Import**. Legacy READ primary. Flag **OFF**.

SearchIndex is **not** a dual-write prerequisite (Members hold 3-ball; Index rebuildable later).

## Discoveries

- **Generation / freshness marker** required before trusting schema-valid normalized store as current.  
- **History H3**: restore workspace without rolling back persistent Members.  
- **Cleanup**: `preserve_dataset` may delete `family_*` keys outside preserve list — policy needed before READ.

## Recommended sequence

1. migration infra — DONE (323)  
2. compatibility read adapter — DONE (324)  
3. dual-write SAVE + Approval + Import — NEXT at audit → DONE (326)  
4. generation / freshness marker  
5. cleanup / reset policy for `family_*`  
6. History restore contract (H3)  
7. SearchIndex + rebuild  
8. gated normalized read  
9. legacy retirement  

## Next

Phase 3A-326 dual-write Agent.

---

# 2026-08-20 (Phase 3A-324 — B5 Compatibility Read Adapter)

## 제목

**B5 Compatibility Read Adapter**

## Mode

**Agent** · IMPLEMENTED (uncommitted) · Commit/Push 없음

## Purpose

Load validated normalized store → hydrate → `PositionRecord[]` compatible dataset. No App production wiring.

## Files

**New**

- `frontend/src/domain/family/loadFamilyCompatibleDataset.ts`
- `frontend/src/domain/family/loadFamilyCompatibleDataset.test.ts`

**Modified**

- `frontend/src/domain/family/index.ts`

## API

- `loadFamilyCompatibleDataset()` — from localStorage envelopes  
- `hydrateFamilyPartsToCompatibleDataset(...)` — in-memory helper  

## Pipeline

load Master envelope → load Member envelope → schemaVersion check → `validateFamilyStore` → hydrate each Member with its Master → `PositionRecord[]`.

Valid store → `source = normalized`. Invalid/corrupt → `ok:false` + issues. **No partial** normalized dataset.

## Fail-closed

orphan · schema mismatch · FK mismatch · forbidden Member common payload · corrupt JSON · missing Master · map-key/memberId conflict.

## Contracts

- 3-ball exact numeric preservation  
- AUTHORED / SYMMETRY / DERIVED_CUE_IMPACT provenance preserved  
- Fixture: 1 Master + 16 Members → 16 hydrated records  

## Production impact

`positions_dataset` · `workspace_history` · SAVE/Approval · Search · Export/Import — **unchanged**. Flag **false**. No App.jsx wiring.

## Tests (at completion)

loadFamilyCompatibleDataset **16/16** · migration **16/16** · storage **12/12** · derivedApproval **10/10** · **Total 54/54**.

## Next

3A-325 gated-read pre-audit (Ask).

---

# 2026-08-20 (Phase 3A-323 — B1–B4 Migration Infrastructure)

## 제목

**B1–B4 Migration Infrastructure**

## Mode

**Agent** · IMPLEMENTED (uncommitted) · Commit/Push 없음

## Files

**New**

- `frontend/src/domain/family/migratePositionRecordsToFamilyParts.ts`
- `frontend/src/domain/family/migratePositionRecordsToFamilyParts.test.ts`

**Modified**

- `frontend/src/domain/family/index.ts`
- `frontend/src/domain/family/familyNormalizedStore.ts` (`persistMigratedFamilyParts`)

## API

`migratePositionRecordsToFamilyParts(dataset)` returns either:

- `ok:true` · masters · members · familyCount · memberCount · skippedLegacySlots  
- `ok:false` · issues  

## Master seed

Exactly one validated **AUTHORED** per family.

| Issue | When |
|-------|------|
| `NO_AUTHORED_SEED` | no AUTHORED |
| `MULTIPLE_AUTHORED_SEEDS` | multiple distinct AUTHORED |
| `COMMON_PAYLOAD_CONFLICT` | conflicting common payload |

No invented Master. No silent merge.

## Member

- Physical PK: `memberId`  
- Logical dedup: `genericFamilyMemberIdentityKey`  
- same logical key + different memberId → reject  
- same memberId + incompatible payload → reject  

## Derived lineage preserved

`DERIVED_CUE_IMPACT` · `generatedFromMemberId` · `derivedRule` · `derivedStep` · `track` · IDs.

## Fixture / idempotency

1 Master + 16 Members (12 Derived). Idempotency verified.

## Legacy

`positions_dataset` unchanged · `workspace_history` unchanged · flag **false**.

## Tests (at completion)

migration **16/16** · storage **12/12** · derivedApproval **10/10**.

## Next

3A-324 B5 compatibility read.

---

# 2026-08-20 (Phase 3A-322 — Phase B Migration & Compatibility Read Audit)

## 제목

**Phase B Migration & Compatibility Read Audit**

## Mode

**Ask** · decision only · no production switch

## Verdict

Phase B **infrastructure-only** implementation is **SAFE**. Production read/write switch **forbidden**.

## Migration source (allowed)

`positions_dataset` / working React dataset / explicit Import.

## Forbidden

Use `workspace_history` as Member DB or bulk migration source.

## Master seed

AUTHORED preferred/required. No AUTHORED → fail/quarantine. Conflicting common payload → fail/quarantine. Silent merge forbidden. familyId-only dedup **FORBIDDEN**.

## Member identity

- PK: `memberId`  
- Logical: `genericFamilyMemberIdentityKey`  

## 3-ball

cue / target / second — exact numeric preservation. No rounding / interpolation / Fg–Rg conversion in migration.

## History / Approval

History restore should not delete `family_*` (direction for later H3). Approval History **+1** **KEEP**.

## Next

3A-323 B1–B4 migration Agent.

---

# 2026-08-20 (Phase 3A-321 — Normalized Family Storage Phase A)

## 제목

**Normalized Family Storage Phase A**

## Mode

**Agent** · IMPLEMENTED (uncommitted) · Commit/Push 없음

## Purpose

Physical FamilyMaster / FamilyMember schema, localStorage store, hydrate/split boundary. No production wiring.

## Files

- `frontend/src/domain/family/familyNormalizedSchema.ts`
- `frontend/src/domain/family/familyNormalizedFlag.ts`
- `frontend/src/domain/family/familyNormalizedStore.ts`
- `frontend/src/domain/family/familyHydrate.ts`
- `frontend/src/domain/family/familyNormalizedStorage.test.ts`
- `frontend/src/domain/family/index.ts` (exports)
- `frontend/src/domain/family/familyMigrationDebt.ts` (debt note)

## Storage keys

`family_masters` · `family_members`

## Flag

`FAMILY_NORMALIZED_STORAGE_ENABLED = false`

## Ownership contract

| Entity | Owns |
|--------|------|
| **FamilyMaster** | family-common payload (`signature`, `sysInputs`, `corrections*`, `ai`, `str`, canonical `hpT`, …) |
| **FamilyMember** | balls `{cue,target,second}` + track + provenance / member delta only |

Member must **not** duplicate family-common payload.

## Representative fixture

1 Master · 16 Members · orphan 0 · duplicate memberId 0 · no common payload on Members.

## Production wiring

**NONE.** SAVE / Approval / Search / History **unchanged**.

## Tests (at completion)

`familyNormalizedStorage` **12/12** · `derivedApprovalFlow` **10/10**.

## Next

3A-322 Phase B migration audit (Ask).

---

# 2026-08-20 (Phase 3A-320 — SAVE vs Derived Approval WorkspaceSnapshot Semantic Diff Audit)

## 제목

**SAVE vs Derived Approval WorkspaceSnapshot Semantic Diff Audit**

## Mode

**Ask** · audit only · no code change in this phase

## Purpose

Verify whether SAVE History snapshot and Derived Approval History snapshot are accidental duplicates (user concern: v007 / v008 look identical on restore; Export might duplicate corpus).

## Representative case

| Snapshot | Role |
|----------|------|
| **S0** (v007-like) | Canonical SAVE |
| **S1** (v008-like) | Derived Approval |

## Three-axis conclusion

| Axis | Result | Meaning |
|------|--------|---------|
| **Visual equality** | **YES** | Both restore visible/runtime baseline A — screen looks the same **by design** |
| **Serialized equality** | **NO** | S0: 4-track base · no approved Derived. S1: 4-track + approved Derived. `state.dataset` differs |
| **Functional equality** | **NO** | S0 restore can drop Derived from working corpus. S1 restore can recover approved Derived |

Therefore: v007/v008 are **not** metadata-only duplicates. S1 is currently a **post-approval persisted-corpus restore point**.

## Writer / History counts

- normal SAVE → WorkspaceSnapshot **+1**  
- Derived Approval → separate WorkspaceSnapshot **+1**  
- same History writer  

## Decision

**TEMPORARILY KEEP** Approval History **+1**.  
**REMOVE only AFTER** normalized migration + Members + SearchIndex + restore contract + product agreement that Approval ≠ workspace save-event.

## History +0 transition prerequisites (recorded)

1. physical FamilyMaster / FamilyMember persistence  
2. SearchIndex or equivalent  
3. working/search read from Members  
4. History restore does not delete Members (H3 direction)  
5. regression suite  
6. explicit product contract: Approval ≠ workspace save-event  

## Architecture principle

**History ≠ Member DB** · History ≠ persistent family corpus SSOT · SearchIndex ≠ family-common payload SSOT.

## Export note (session)

Do **not** treat History v007+v008 as two persistent “original” corpora for Export merge/dedup.  

**TARGET:** Export corpus = FamilyMaster + FamilyMembers; History = workspace snapshot only.  

**CURRENT through 3A-326:** Export format/behavior **unchanged** — normalized Export **NOT IMPLEMENTED**.

## Next

3A-321 Normalized Storage Phase A (Agent).

---

# 2026-08-19 (Family Phase 3A-3E — Derived Preview / Approval)

## 제목

**Cue→Impact Derived Candidate generate-once → Preview → Approve same set**

## Status

**IMPLEMENTED (uncommitted)** · Commit/Push 없음  
SAVE 자동 Derived persistence **없음** · AUTO_APPROVE **없음** · C3_PLUS **없음**

## Contract

Derived candidates are generated automatically for review, but are not persisted until explicit administrator approval. The exact candidate set reviewed in Preview is the candidate set passed to persistence; approval must not trigger regeneration.

- Policy: REVIEW_REQUIRED
- 4-track SAVE 후 in-memory review session
- 파생 승인 = frozen Candidate Set → generic writer
- Preview close = no dataset mutation

## Files

- `frontend/src/domain/family/cueImpactDerivedReview.ts` (+ test)
- `frontend/src/components/table/DerivedCandidatePreviewLayer.jsx`
- `frontend/src/App.jsx` (ghost markers · 파생 승인)
- `saveFlow.ts` additive `familyId` / `fourTrackWritten` (Derived persist 없음)

## Working tree

기존 uncommitted · leftover 보존. Commit/Push 없음.

---

# 2026-08-18 (Family Phase 3A-3D — Cue→Impact first 30% Derived)

## 제목

**Cue Ball / Impact Ball / CO 의미 확정 · CO_C1_2RG 폐기 · Cue→Impact 처음 30% adaptive Derived Member 생성**

## Status

**IMPLEMENTED (uncommitted)** · Commit/Push 없음  
SAVE 자동 Derived 연결 **없음** · C3_PLUS **없음**

## Contract

- Cue Ball = `source.balls.cue` (물리 중심)
- Impact Ball center = `calcImpactBall(cue, target, runtime T)` = 충돌 순간 Cue 중심
- CO ≠ Cue Ball. CO는 Impact 이후 system trajectory origin
- Cue→Impact = 직선 `P(t) = C + t*(I-C)`, valid `0 < t <= 0.30`
- Adaptive: `N = max(3, ceil(D*0.30 / 3.0))`, last t always 0.30
- 2Rg / CO→C1 / Envelope cueSet 미사용
- `derivedRule = CUE_IMPACT_FIRST_30PCT`, `memberOrigin = DERIVED_CUE_IMPACT`
- `derivedStep = cue_impact:t:0.100000`
- 각 Track은 자기 source에서 직접 생성. H/V/RPI Derived 복제 없음
- generic writer 사용. production SAVE는 기존 4-track만 유지

## Withdrawn

`CO_C1_2RG` / `DERIVED_CO_C1` / `sourceDomainLengthRg` / `evaluateCoC1RgSteps` / `co_c1:rg:`  
production persistence에 없었으므로 migration alias 없음.

## Files

- `frontend/src/domain/family/generateCueImpactDerivedMembers.ts` (+ test)
- `familyIdentity.ts` / `positionSearchEngine.ts` / `familyAwareWriter.ts`
- `작업관리/FAMILY_DATA_ARCHITECTURE_DRAFT.md` §5.0–5.1
- `작업관리/4_CALCULATION_RULES.md` (sys/expr 경계 명시)

## Working tree

기존 uncommitted · dataset/vitest leftovers **보존**. Commit/Push 없음.

---

# 2026-08-17 (Authoring/Display uncommitted fixes · Family Data Architecture CONFIRMED DESIGN)

## 제목

**ADMIN Authoring / Display 수정 일괄 기록 · Family Data Architecture 설계 확정 · BUG-A IMPLEMENTED · BUG-B UNCONFIRMED**

## Status

**DOCS SYNC** · 코드는 **working tree uncommitted** (Commit/Push 없음)  
Family 구조는 **CONFIRMED DESIGN / NEXT** (미구현)

## Working tree (preserve)

이번 세션 및 직전 세션의 코드 변경은 **모두 보존 대상**이다. 문서 작업이 이를 revert/reset 하지 않는다.

포함 (비완전 목록): Reset / History restore display / C2 Track·HPT-side invalidation / SYS diag / uiMode F5 / saveFlow SYS identity / baseline / HPT tip-side / display-cap nearest-rail (BUG-A) 등.

`SYSTEM_ARCHITECTURE.md` / `CALCULATION_RULES.md` 루트 파일명은 없고, 실제 문서는 `작업관리/3_SYSTEM_ARCHITECTURE.md` · `작업관리/4_CALCULATION_RULES.md` 이다.

---

## A. saveFlow sys.system identity — IMPLEMENTED (uncommitted)

| Item | Fact |
|------|------|
| 문제 | saveFlow가 UI display object를 `system` 필드에 저장 → identity corruption |
| 수정 | `system: ctx.system`이 아니라 이미 계산된 **systemId string** 사용 (예: `"5_half_system"`) |
| 파일 | `frontend/src/application/flows/saveFlow.ts` |
| 테스트 | `saveFlow.sysIdentity.test.ts` · regression PASS |
| Commit/Push | **없음** |

---

## B. C2 stale on Track change — IMPLEMENTED (uncommitted)

| Item | Fact |
|------|------|
| 본질 | C2는 sys 계산값이 아니라 **reflection geometry derived** 값 |
| 문제 | `reflectionOverride`가 Track 변경 후에도 남아 새 Track에서 C2 reflection 계산 skip |
| 수정 | Track 변경 시 reflectionOverride invalidate · runtime + slot draft/applied 정리 |
| 재사용 | 기존 `resolveReflectionC2` |
| 비변경 | C2를 sys 필드로 추가하지 않음 · Reset/baseline/exact-upsert 정책 유지 |
| 테스트 | `c2ReflectionOverride.trackInvalidate.test.ts` |

---

## C. History restore trajectory display — IMPLEMENTED (uncommitted)

| Item | Fact |
|------|------|
| 문제 | History restore 시 balls/target/slot/adminState는 복원되나 `adminTableLayersVisible`이 꺼져 trajectory/labels 미표시 |
| 수정 | History restore **성공 시 display layers ON** · **session은 false 유지** |
| 비변경 | Reset / SYS Apply 우회 없음 · Search/LocalDB 기존 경로 유지 |
| 테스트 | `historyRestoreDisplayContract.test.ts` |

---

## D. ADMIN UI mode F5 persistence — IMPLEMENTED (uncommitted)

| Item | Fact |
|------|------|
| 문제 | `appMode` 초기값 USER 하드코딩 → ADMIN에서 F5 시 USER로 떨어짐 |
| 수정 | `app_ui_mode_v1` localStorage (`domain/uiModePreference.ts`) |
| 계약 | USER F5 → USER · ADMIN F5 → ADMIN · runtime 작업 state는 F5 시 초기화 · dataset/history 목록성 데이터 유지 |
| 분리 | Reset semantics와 분리 · 최초/invalid key fallback = USER |
| 쓰기 | 명시적 toggle에서만 write |
| 테스트 | `uiModePreference.test.ts` T1–T14 |

---

## E. HPT tip side L↔R stale C2 — IMPLEMENTED (uncommitted)

| Item | Fact |
|------|------|
| 문제 | History/Load 후 HPT 타점 L↔R 시 `c2ReflectionOverride`가 남아 old C2를 `anchors.C2`로 주입 |
| 수정 | HPT side 변경 감지 시 reflectionOverride invalidate · React runtime + slot draft/applied |
| 결과 | new tip 기준으로 C2 재계산 |
| 분리 | Track flip invalidation과 **별개** HPT side invalidation |
| 테스트 | `c2ReflectionOverride.hptTipSideInvalidate.test.ts` |
| 한계 | 이 수정만으로는 대회전 C1-cut(BUG-A)을 고치지 못함 (override가 이미 null인 FIRST_RENDER) |

---

## F. BUG-A — HPT corrected display-cap corner — IMPLEMENTED (uncommitted)

### 증상

뒤돌리기 대회전 일부 데이터에서 **corrected** 궤적이 C1에서 잘림. baseline은 C1–C6 정상.

geometry / path generation 실패가 아니라 **display-cap truncation**.

### 원인

reflection 단계는 C2 rail을 RIGHT로 정상 판정.

display-cap `isSameRailSegment`가 `detectRail(EPS_RAIL=3, TOP/BOTTOM 우선)`을 다시 호출해 코너 근처 side-rail C2를 BOTTOM으로 오분류.

예 (T2B_L, tip `{count:3,side:L}`, slide=8, effective CO=55, C1_f=5):

| | 값 |
|--|-----|
| C1 | ≈ (70.47, 0) BOTTOM |
| C2 | ≈ (80, 2.273) |
| reflection `c2Rail` | **RIGHT** |
| display `detectRail(C2)` | **BOTTOM** (`\|y\|=2.273 ≤ 3`) |
| same_rail | true |
| cap | `endIndex=1` · stoppedSegment C1–C2 |
| `pathNodes.length` | **7** (생성은 됨) |

C1_f=10: C2.y≈3.808 → detectRail RIGHT → PASS.

### C1 sweep (사용자 관찰 + production 재계산)

동일 조건에서 C1_f만 변경:

| C1_f | C2.y (approx) | display rail | 결과 |
|------|----------------|--------------|------|
| 5 | 2.273 | BOTTOM | FAIL |
| 7.0 | ≈2.89 | BOTTOM | FAIL |
| ≈7.37 | ≈3.000 | EPS_RAIL boundary | — |
| 7.5 | ≈3.04 | RIGHT | PASS |
| 10 | 3.808 | RIGHT | PASS |

이 threshold는 C1 시스템 경계가 아니라 **C2.y가 EPS=3 band를 통과하는 인공 경계**.

### 수정 (최소)

- `detectRail` **전역 semantics 유지** (reflectionEngine 수식 미변경)
- display-cap `isSameRailSegment`만:
  1. **presence** = `detectRail(eps)` (내부 점은 same-rail 아님)
  2. **identity** = `resolveNearestRail` (코너 tie: LEFT/RIGHT 우선)
- `resolveRailForC2Handle`은 `resolveNearestRail` 위임 (공용 helper)

금지한 것: EPS 축소 · detectRail 순서 변경 · same_rail 제거 · skipSameRail 강제 · C1≥7.5 하드코딩 · shotType/track/tip 예외 · SYS/HPT/slide 수식 변경.

성공 기준: **c2ReflectionOverride / skipSameRail 없이** F1 C1=5가 same_rail로 C1에서 잘리지 않음.  
C2 점 조작으로 살아나는 현상은 cap 우회일 뿐 근본 수정이 아님.

### 검증

| Suite | 결과 |
|-------|------|
| `trajectoryPathDisplayPolicy.test.ts` + `c2ReflectionOverride.test.ts` | **28/28 PASS** |
| trajectory folder + display policy | **56/56 PASS** |
| Fixtures | F1 C1=5/7/7.5/10 · F2 mirror · NORMAL C4–C5 same_rail · exact/near-corner · path length 7 |

파일: `reflectionEngine.ts` (`resolveNearestRail`) · `trajectoryPathDisplayPolicy.ts` · `c2ReflectionOverride.ts` · 해당 test.

Cite: `DISPLAY_BOUNDARY_POLICY_SSOT.md` §5.3 (v1.4.1 identity 분리).

---

## G. BUG-B — Reset / History stale — UNCONFIRMED / REPRODUCTION REQUIRED

BUG-A와 **분리**. 이번 세션에서 **수정하지 않음**.

관찰:

- C2 handle override → `c2OverridePoint` → `skipSameRail: true` → false same-rail cap **우회** (궤적이 “살아난 것처럼” 보임)
- Reset이 `c2ReflectionOverride` / `trajectoryExtensionDraft`를 안 지울 수 있음
- History ADMIN extension: payload **없을 때 이전 draft 유지** (`if (payload) set…`)
- 브라우저 Refresh 후 동일 History Load면 정상 → runtime stale 후보

이 현상은 과거 BUG-A가 존재하던 상태에서 관찰되었다. BUG-A 수정 후 실시한 테스트에서는 현재 동일 현상이 재현되지 않았다.

따라서 현재 증거만으로 BUG-B를 **독립된 미해결 코드 버그로 확정해서는 안 된다**.

현재 판정:

- **UNCONFIRMED — BUG-A 수정 후 재현 필요**
- 가능성 1: BUG-A의 2차 증상이었고 BUG-A 수정과 함께 해소되었을 수 있음
- 가능성 2: 별도 stale-state 문제가 있으나 현재 fixture에서는 재현되지 않았을 수 있음

정책:

- 재현 전 코드 수정 금지
- 특히 `Reset` semantics / `History` restore-hydrate / `c2ReflectionOverride` lifecycle / `trajectoryExtensionDraft` / `skipSameRail` / slot draft-applied / runtime cleanup 추측 수정 금지
- 다음 세션에서 Family와 섞지 말고, **동일 stale UI 현상이 production UI에서 다시 재현될 때만** reproduction-first로 재조사

관계 판정: BUG-A는 classifier root. BUG-B 후보는 override/skipSameRail + incomplete clear가 A를 숨기거나 오염을 노출한 현상일 수 있다. 다만 현재는 **재현 전 가설 단계**이며 독립 root cause로 확정하지 않는다.

---

## 샘플 데이터 (사용자 보고 · 2026-08)

| 공략 | 상태 |
|------|------|
| 뒤돌리기 | 1 set × 4 tracks |
| 옆돌리기 | 1 set × 4 tracks |
| 뒤돌리기 대회전 | 샘플 생성/검증 · corner/display-cap(BUG-A) 수정 후 정상 확인 |
| 합계 | 사용자: **샘플 데이터셋 3개 완성** |

다음 목적: 기준 데이터 1개로 나머지 3 track + 각 track 파생 데이터를 **Family로 자동 생성** 가능한가.

### Export ≠ History

History UI snapshot 개수와 export `positions.json` record 수는 **동일 개념이 아니다**.

- History = workspace snapshot
- Export = `dataset/{shotType}/{system}/positions.json` **누적 corpus**
- 대회전 export fault records는 분석용으로 사용
- 둘을 1:1로 동일시하지 말 것

Dataset 3계층 SSOT: MASTER Dataset Architecture · `SESSION_TRANSFER/SESSION_TRANSFER_2026-06_DATASET_ARCHITECTURE.md`.

---

## Family Data Architecture — CONFIRMED DESIGN (미구현)

상세: `작업관리/FAMILY_DATA_ARCHITECTURE_DRAFT.md`

요약:

- Family Master = 공통값 SSOT (shotType · system identity · SYS/AI/STR/HPT/thickness canonical)
- mirrored HPT/thickness **DB 중복 저장 금지** · handedness resolver
- Member = 좌표 + track + provenance (원본도 Member)
- 4 Track = H/V/RPI 대칭 · sys 불변 · 좌표만 대칭
- Derived = 기존 production 규칙 재사용 (CO–C1 1/3 · 2Rg · C3+ 2Rg) — Envelope 1.5gr과 혼동 금지
- Search Index = derived index, 새 SSOT 아님 · PositionKey unique 아님 · position당 최대 3 Family
- 명령: 원본수정 UPDATE · 파생수정 BRANCH+REPLACE · 새로저장 CREATE

**IMPLEMENTED로 쓰지 말 것.**

---

## Next

```text
[Cursor Mode: Ask]
Family Data Architecture Phase 1 — Family Master / Member 현재 저장 구조 분석
```

Carry: BUG-B UNCONFIRMED (reproduction required) · uncommitted 코드 보존 · Commit/Push는 사용자 요청 시.

---

# 2026-08-12 (Ball Fine Position Controller — Mobile Production Final PASS · CLOSED)

## 제목

**Ball Fine Position Controller — Mobile Production Final Verification PASS**

## Status

**CLOSED / COMPLETE** · Desktop Local **PASS** · Mobile Production **PASS** · Admin **PASS** · User **PASS**

## Purpose

Ball Fine Position Controller UI 작업의 스마트폰 Production 실기기 최종 검증이 사용자에 의해 완료되었다.  
본 항목은 코드 변경이 아니라 **최종 PASS 기록**이다.

## Final contract (verified)

| Item | Value |
|------|--------|
| Tap | **0.1** |
| Long Press threshold | **1.0s** |
| Hold repeat | **0.2** / **150ms** |
| Acceleration | **none** |
| Release / cancel | 즉시 정지 |
| Fine ↔ Joystick interaction gap | **3 Rg** |
| CENTER | protected dead zone · 터치 시 Controller 유지 · dismiss 없음 |
| Coordinate fontSize | **22** |
| Touch zones | enlarged mobile directional zones · Joystick과 충돌 없음 |
| Joystick drag | 정상 |
| Fine 외부 터치 | 정상 dismiss |
| Admin / User | 동일 동작 |

## Mobile WebKit fix (final)

Production 스마트폰에서 Fine 방향키 Long Press 중 native text-selection / callout이 발생했다.

| Item | Fact |
|------|------|
| Scope | Fine Controller **only** |
| Applied | `touchAction: none` · `userSelect: none` · `WebkitUserSelect: none` · `WebkitTouchCallout: none` |
| Context menu | Fine-scoped `preventDefault` |
| Selection cleanup | Fine `pointerup` / `pointercancel`에서만 `getSelection()?.removeAllRanges()` |
| Global selection policy | **미변경** |
| `mobile-layout.css` | 재활성화 **없음** |
| Smartphone re-verification | **PASS** — 「계산」 및 rail 텍스트 shading 없음 · blue selection handles 없음 · native callout 없음 |

## Production

| Item | Value |
|------|--------|
| Commit | `1eaf76c0102071893c2bc561cfe72d972d53b55f` |
| Message | `fix(ui): prevent mobile long-press selection in Fine Controller` |
| Branch | `main` · `origin/main` · ahead/behind **0/0** |
| Deploy | Vercel production bundle match (`index-CAxrNnCC.js`) |

## Verification

| Check | Result |
|-------|--------|
| Desktop Local | **PASS** |
| Mobile Production (smartphone, user) | **PASS** |
| Admin | **PASS** |
| User | **PASS** |

## Explicit Non-Claims

- 본 항목에서 코드 수정 **없음**
- Search / RI / Slot / Calculator / Anchor / Trajectory / Envelope / Publisher **미변경**
- Fine Controller 재설계/재구현 **없음** (완료된 UI 계약)

## Next

**Sample System Validation** · **READY FOR SAMPLE SYSTEM VALIDATION**

Fine Controller는 완료된 UI 계약이다. 새로운 명시적 요구가 없는 한 재설계/재구현하지 않는다.

## Verdict

**BALL FINE POSITION CONTROLLER COMPLETE · DESKTOP PASS · MOBILE PRODUCTION PASS · ADMIN/USER PASS · CLOSED**

---

# 2026-08-12 (Ball Fine Position Controller — Mobile UX Adjustment)

## 제목

**Fine Controller Mobile UX — Hold 1.0s / 0.2 step · expanded non-overlapping directional zones**

## Status

**Implemented** · Production mobile initial verification **PASS** (prior) · Mobile UX adjustment final verification **PENDING** · **Commit/Push 대기**

## Purpose

Production 모바일 실기기에서 Fine Controller는 정상 작동하나, (1) Long Press 1.5s/0.1 반복이 느리고 (2) hitR=22 원형 영역이 작아 화살표 밖 터치가 table dismiss로 이어지는 문제를 최소 변경으로 개선한다.

## Changes

| Item | Before | After |
|------|--------|--------|
| Tap step | 0.1 | **0.1** (unchanged) |
| Long Press threshold | 1.5s | **1.0s** |
| Hold repeat step | 0.1 | **0.2** |
| Repeat interval | 150ms | **150ms** (unchanged) |
| Touch target | circle hitR=22 | **4 non-overlapping rects** ZONE_INNER=24 · ZONE_OUTER=120 |
| Visual | font 17/15 · offsets 32 / 57.6 | **unchanged** |
| Placement | `computeFineControllerCenterRg` | **unchanged** |
| Joystick | — | **unchanged** |

## Long Press contract

- pointerdown → Tap **0.1** 1회
- 1000ms timer expiry → 추가 nudge 없음 · interval 시작만
- interval first tick → Hold **0.2**
- no acceleration · pointerup/cancel → 즉시 정지

## Touch-zone geometry (SVG px, center = coordinate)

```text
UP:    x[-120, +120]  y[-120, -24]   240 × 96
DOWN:  x[-120, +120]  y[+24, +120]   240 × 96
LEFT:  x[-120, -24]   y[-24, +24]     96 × 48
RIGHT: x[+24, +120]   y[-24, +24]     96 × 48
```

Non-overlap: UP/DOWN occupy |y| > 24; LEFT/RIGHT occupy |x| > 24 and |y| ≤ 24.

## Verification

| Check | Result |
|-------|--------|
| Production mobile initial (prior release `6fce0b4`) | **PASS** (user) |
| Mobile UX adjustment final | **PENDING** |
| Commit / Push | **NOT done** |

## Files

- `frontend/src/App.jsx` only (code)
- SSOT: MASTER v1.68 · HANDOFF · Baseline §Fine Controller · 본 LOG

## Verdict

**MOBILE UX ADJUSTMENT IMPLEMENTED · FINAL VERIFICATION PENDING · AWAITING COMMIT**

---

# 2026-08-12 (Ball Fine Position Controller — COMPLETE · Admin/User runtime 검증)

## 제목

**Ball Fine Position Controller — Joystick + Fine Controller temporary Ball Position Controller**

## Status

**Completed** · Admin UI runtime 검증 **PASS** · User UI runtime 검증 **PASS** · 문서 동기화 (본 항목) · **Commit/Push 대기**

## Purpose

Sample System Validation 및 실사용 Ball positioning 정확도를 높이기 위해, 기존 Ball drag / Joystick에 Fine Position Controller를 추가한다.

- Ball physical center coordinate 확인
- Drag/Joystick으로 대략 이동 + 방향키로 0.1 Rg 미세조정
- 계산 시스템이 **아님** — Ball positioning UI only
- Search / RI / Slot / Calculator / Anchor / Trajectory / Envelope / Publisher **미변경**

## Timeline (사실 순서)

1. Ask 분석 — GO 판정 · `App.jsx` + `joystickInteractionPolicy.ts` 최소 변경 경로 확정
2. 초기 구현 — Joystick visibility 종속 · `fineNudgeBall()` · tap/long-press · placement helper
3. Visual 2× 확대 시도 — 좌표/화살표 과대 → **1.5× 수준으로 최종 조정**
4. Dismissal lifecycle 추가 — `hideBallPositionController()` · positioning 외 UI action 시 숨김
5. Admin UI runtime 검증 **PASS** (사용자 직접 확인)
6. User UI runtime 검증 **PASS** (사용자 직접 확인)
7. 문서 동기화 (본 항목)

## UX (최종)

```text
             ▲
       ◀  (x.x, y.y)  ▶
             ▼
```

| Item | Value |
|------|--------|
| coordinate fontSize | **17** |
| arrow fontSize | **15** |
| fontWeight | **400** |
| arrow offset up/down | **32** px |
| arrow offset left/right | **32 × 1.8 = 57.6** px |
| touch hitR | **22** (~44px diameter) |
| `FINE_CTRL_HALF_H_PX` | **55** |
| coordinate | Ball physical center · `(x.x, y.y)` · read-only · 1 decimal |

## Fine adjustment 동작

| Action | Behavior |
|--------|----------|
| ▶ | x +0.1 |
| ◀ | x -0.1 |
| ▲ | y +0.1 |
| ▼ | y -0.1 |
| Tap | pointerdown 즉시 0.1 · release <1.5s → 추가 이동 없음 |
| Long Press | ≥1.5s Hold → 150ms repeat · 진입 시 double-step 없음 |
| Precision | fine nudge 축만 `Math.round(value * 10) / 10` · Drag/Joystick precision 유지 |
| Boundary | 기존 `nudgeBall` clamp 재사용 · x [0.5, 79.5] y [0.5, 39.5] (impact FREE mode 별도) |

## Placement

```text
Ball → Joystick → Fine Controller → Table Center
```

- `computeFineControllerCenterRg()` — `joystickInteractionPolicy.ts`
- Ball → Table Center vector 재사용 · Joystick보다 Table Center 방향 안쪽
- 별도 독립 geometry system 없음

## Visibility / Dismissal

Joystick + Fine Controller = 하나의 temporary Ball Position Controller.

| Event | Result |
|-------|--------|
| Ball 선택 | Joystick + Fine Controller 표시 |
| 다른 Ball 선택 | 새 Ball 기준 controller 이동/표시 |
| 빈 당구대 터치 | 즉시 숨김 |
| positioning 외 UI action | `hideBallPositionController()` → 숨김 |
| Ball drag / Joystick drag / Fine Tap / Long Press | 유지 |

Dismissal 구현:
- `hideBallPositionController()` — `stopJoystick()` + `stopFineCtrl()` + `joystickVisible=false`
- `currentButtonId` useEffect (USER/ADMIN)
- `handlePositionRecall` · `handleTrajectoryExtensionClick`
- right-panel buttons (Grid · 기준선 · History · SAVE · Data 정리)
- 기존: empty table tap · `handleSelectAdminButton`

## Implementation (코드)

| File | Role |
|------|------|
| `frontend/src/App.jsx` | `fineNudgeBall` · `hideBallPositionController` · Fine Controller SVG render · dismissal hooks |
| `frontend/src/interaction/joystickInteractionPolicy.ts` | `computeFineControllerCenterRg()` · `FINE_CTRL_HALF_H_PX` |

## Verification

| Check | Result |
|-------|--------|
| Admin UI — Ball 선택 · 0.1 이동 · 좌표 표시 · placement · dismissal | **PASS** (사용자 runtime) |
| User UI — 동일 동작 | **PASS** (사용자 runtime) |
| Search / RI / Calculator / Trajectory 영향 | **none** |
| Vercel / mobile production | **not verified** (별도 단계) |
| Commit / Push | **NOT done** |

## Git

| Item | Value |
|------|--------|
| Pre-implementation baseline | `9678b69d0f82b82a685de86cb42eec07e18cb53f` |
| Branch | `main` |
| Working tree | Fine Controller + Centering + docs **uncommitted** |

## Docs sync (same session · docs-only follow-up)

- `PROJECT_MASTER_INDEX.md` v1.67
- `CURSOR_SESSION_HANDOFF.md`
- `2_FRONTEND_ARCHITECTURE_BASELINE_v1.md` §Ball Fine Position Controller
- 본 LOG 항목

## Next

문서 동기화 확인 → `git diff` / `status` → **Commit** → **Push** (사용자 요청 시) → **Sample System Validation** 계속

## Verdict

**FINE POSITION CONTROLLER COMPLETE · ADMIN/USER RUNTIME VERIFIED · AWAITING COMMIT**

---

# 2026-08-12 (USER Overlay Centering SSOT — COMPLETE · 브라우저 검증)

## 제목

**USER Overlay Centering SSOT — Panel ResizeObserver / live dimensions Fix**

## Status

**Completed** · 실제 브라우저 검증 **PASS** · `npm run build` **PASS** · 문서 동기화 (본 항목) · **Commit/Push 대기**

## Purpose

USER AI / HPT / CALC Overlay가 진입 경로에 따라 **table-area 기하 중심**에서 위/아래로 어긋나던 문제를 해결한다.  
UX 불변조건: Drag 중이 아니면 `overlayCenter === tableAreaCenter`.

## Timeline (사실 순서)

1. Overlay 위치 불일치 발견 (F5→AI 위 · Zoom In 중앙 · Zoom Out 아래 · CALC→AI 아래 · HPT→AI 중앙)
2. 최초 분석: dragOffset / reset timing 의심 → 1차 centering patch (offsetRef · useLayoutEffect reset · Zoom→table center)
3. 브라우저에서 **일부 경로 문제 지속** (특히 최초 Open · Zoom Out · CALC→AI)
4. runtime `UserOverlayShell` 단일 연결 재검증 (별도 Shell / App 위치 오버라이드 아님)
5. 경로별 재현 비교 (widthRatio 0.62→0.42 vs 0.42→0.42)
6. Ask 재분석
7. **Root Cause 확정: B + C**
   - **B** stale panel dimensions
   - **C** content reflow timing  
   - ※ **dragOffset 자체는 최종 주원인이 아님** (부차·기존 보완)
8. Panel ResizeObserver + live `offsetWidth`/`offsetHeight` 기반 placement 수정
9. `npm run build` PASS · repo lint는 기존 unused 등 (Shell 신규 이슈 없음)
10. **실제 브라우저에서 정상 동작 확인** (사용자 검증)

## Root Cause (최종)

Placement가 panel 최종 height 확정 전에 한 번 계산된 뒤, width/font/max-height/text wrapping/reflow로 실제 height가 변해도 재계산되지 않음.  
기존 ResizeObserver는 **table-area만** 관찰.

```text
dCy ≈ (h_actual − h_assumed) / 2
```

## Fix (코드)

| Item | Value |
|------|--------|
| File | `frontend/src/components/common/UserOverlayShell.jsx` **only** |
| `index.css` | **최종 미수정** |
| Measurement | `readPanelBox()` → live DOM box |
| SSOT | `updatePanelPlacement()` — `(table − currentPanel) / 2 + dragOffset` |
| Panel ResizeObserver | size 변화 → placement 재계산 · **dragOffset 유지** |
| Table ResizeObserver | 유지 · dragOffset 보존 + clamp |
| Reset | Open / Re-open / Switch / Zoom / layout·size → `dragOffset = 0` |
| Width policy | AI/HPT `0.42` · CALC `0.62` **미변경** |
| Out of scope | DisplayModel · Projection · SYS · Content · Toolbar · App.jsx |

## Policies recorded

- Center 기준 = **`.table-area` 기하 중심** (viewport / Stage 아님)
- Drag = temporary center-relative offset (삭제 아님)
- Zoom = table-area center (이전 시각 중심 유지 폐기)
- Overlay Switch = `dragOffset=0` + Panel RO 재수렴 (CALC→AI 포함)

## Verification

| Check | Result |
|-------|--------|
| 실제 브라우저 (Open / Zoom / Switch / CALC→AI / HPT→AI / Drag 후 reset) | **PASS** |
| `npm run build` | **PASS** |
| UserOverlayShell IDE lint | clean |
| repo `npm run lint` | 기존 다수 (본 변경 신규 아님) |
| Commit / Push | **NOT done** |

## Docs sync (same session · docs-only follow-up)

- `PROJECT_MASTER_INDEX.md` v1.66
- `CURSOR_SESSION_HANDOFF.md`
- `OVERLAY_LAYOUT_SSOT_v1.2.md` §8 Centering SSOT
- `2_FRONTEND_ARCHITECTURE_BASELINE_v1.md` USER Overlay Layout
- 본 LOG 항목

## Next

문서 동기화 확인 → `git diff` / `status` → **Commit** → **Push** (사용자 요청 시)

## Verdict

**CENTERING SSOT COMPLETE · BROWSER VERIFIED · AWAITING COMMIT**

---

# 2026-08-11 (Phase 5 Mission 02 — Dead Code Cleanup Final Closure)

## 제목

**Phase 5 Mission 02 — Dead Code Cleanup · Final Closure**

## Status

**Completed** · Final Closure Verification **PASS** · Documentation sync (this entry) · Commit/Push of docs **NOT** part of Cleanup #4 code baseline

## Purpose

Search Quality Follow-on Task #5 이후, Sample System Validation 전에  
temporary agent-log / no-op trace scaffolding을 제거하여 **clean Git baseline**을 확보한다.

Mission 02 목적 = “모든 unused code 제거”가 아니라  
**새 검증 단계 전 clean baseline**.

## Cleanup Scope (Completed)

| Cleanup | Scope |
|---------|--------|
| **#1** | `main.jsx` temporary `127.0.0.1:7263` agent-log |
| **#2a** | unused App trace definitions (`traceSearchRuntimeSnapshot` · `emitAdminRecallTrace` · `buildStrategyPickTrace`) |
| **#2b** | `emitStrategyPickTrace` definition + call sites |
| **#2c** | `emitTargetSelectionTrace` + proven-dead local |
| **#2d-1** | no-op admin-target emit · `[ADMIN_SEARCH_TARGET]` console diagnostic **preserved** |
| **#2d-2** | admin-target trace dependency closure · snapshots / RAF scaffolding |
| **#2d-3** | unused `traceMessage` API residue |
| **#3** | `index.html` temporary agent-log inline script |
| **#4** | `systemLabelPlacement.ts` temporary localhost/snap telemetry · `SNAP_RESULT` / `SNAP_OUTPUT` **preserved** |

## Final Code Baseline

| Item | Value |
|------|--------|
| Branch | `main` |
| HEAD | `8bf90b648cfb73752abc0d4af8353aab2ce8998f` |
| Cleanup #4 message | `chore(cleanup): remove temporary snap agent telemetry` |
| origin/main | identical · ahead/behind **0 / 0** |
| Working tree (closure verification) | **clean** |

## Verification (Final Closure)

| Check | Result |
|-------|--------|
| Git clean / synced | **PASS** |
| `npm run build` | **PASS** |
| RI Vitest (`src/domain/realInterpolation`) | **76 PASS** / 6 files |
| Protected Search / RI / Slot / Calculator / Envelope paths | **intact** |
| Cleanup-induced regression | **none** |
| Mission 02 blocker remaining | **none** |
| Cleanup Exit | **EXIT-AFTER-#4** confirmed |

### Full Vitest (reference — not a closure blocker)

| Item | Result |
|------|--------|
| Passed tests | **226** |
| Failed tests / files | **1** failed test · **7** failed files |
| Analysis | Pre-existing / non-Cleanup baseline issues (empty suites · parity `process.exit` · caption geometry assert) |
| Mission 02 closure impact | **Not a blocker** |

Do **not** record Full Vitest as “all PASS”.

## Deferred Items (summary)

No Mission 02 blocker. Remaining candidates are optional hygiene, defer-until-validation, design-decision, or KEEP.  
Detail register: Final Closure Verification report (N3–N15).  
Do **not** automatically resume Dead Code Cleanup after this closure.

## Next Track

**Sample System Validation** · **READY FOR SAMPLE SYSTEM VALIDATION**

## Verdict

**MISSION 02 COMPLETE WITH DEFERRED ITEMS**

---

# 2026-08-11 (Phase 5 Search Quality Follow-on — Task #5 Production Real Interpolation)

## 제목

**Phase 5 Search Quality Follow-on · Task #5 — Production Real Interpolation Integration**

## Status

**Completed** · Final Integration Verification **PASS** · Commit/Push **COMPLETE**

## Distinction

| Item | Role |
|------|------|
| **Mission 01** | Real Interpolation **core engine** (gates · SYS interp · matchType/confidence · top-3) |
| **Task #4** | Product Envelope Static Publisher |
| **Task #5** | Production **frontend integration** of Mission 01 (loader · DI · slot · Calculator/Builder · UI) |

Task #5 did **not** re-implement Mission 01 interpolation algorithms.

## Purpose

Product-published Envelope corpus를 Frontend read-only loader로 소비하고,  
Mission 01 Real Interpolation을 existing Strategy Slot · Calculator · `buildTrajectory` · UI surface에 연결한다.

## E2E Flow (Implemented)

```text
Product Envelope publish
  → /dataset/_published/envelope/dataset.json
  → Frontend read-only Envelope loader
  → App DI
  → Real Interpolation Search
  → same-family gates · exact/interpolated/nearest
  → SYS / primary Modal / confidence / Top-3
  → existing Calculator bridge
  → existing buildTrajectory DI
  → candidate activation
  → existing Strategy Slot hydrate
  → UI render
```

## Steps Completed

| Step | Scope |
|------|--------|
| **1** | Published Envelope locator · read-only loader · parse/validation · module cache |
| **2** | App DI · production `window.__ENVELOPE_PUBLISHED_DATASET__` removed · fail-closed · USER Search isolation |
| **3** | RI → existing `activateStrategySlot` hydrate · `authoringStrategyId` family · `strategyRef` separate |
| **4** | Existing Calculator + App-owned `buildTrajectory` DI · no SYS/Modal recompute |
| **5** | matchType · confidence · Top-3 UI · existing activation path |

## Ownership Preserved

| Owner | Fact |
|-------|------|
| Search | SYS result from engine |
| Modal | primary Modal as-is |
| Calculator | existing `applyCalculatorBridge` / `evaluateStrategy` |
| Builder | existing App/domain `buildTrajectory` |
| Product | Envelope artifact publisher |
| Frontend | read / load / cache / DI / display |
| Phase 3 / Mission 01 core / Architecture Freeze | unchanged |

## Verification (Final)

| Suite | Result |
|-------|--------|
| Step 1 loader | **15 PASS** |
| Step 2 App DI | **5 PASS** |
| Step 3 Strategy Slot | **12 PASS** |
| Step 4 Trajectory Build | **16 PASS** |
| Step 5 UI Surface | **8 PASS** |
| Mission 01 RI | **20 PASS** |
| Vitest total | **76 PASS** |
| Phase 3 interpolation | **12 PASS** |
| Search regression | **4 PASS** |
| Product publisher | **11 PASS** |
| Expected vs Actual | **delta 0** |
| Unexpected changes | **0** |
| Architecture / SSOT audit | **PASS** |

## Git

| Item | Value |
|------|--------|
| Product publisher | `690d6fe` · `feat(product): add envelope static publisher` |
| Task #5 | `282c859` · `feat(search): integrate production real interpolation flow` |
| Push | **COMPLETE** (`main` · ahead/behind 0/0) |

## Next Track

**Phase 5 Mission 02 — Dead Code Cleanup**

## Verdict

**TASK #5 COMPLETE**

---

# 2026-08-11 (Product Envelope Static Publisher — Task #4)

## 제목

**Product Envelope Static Publisher**

## Status

**Completed** · Commit/Push **COMPLETE** (prerequisite for Task #5)

## Purpose

Published Package `dataset.json` → frontend static tree  
`dataset/_published/envelope/dataset.json` (full replace · atomic).

Runtime URL: `/dataset/_published/envelope/dataset.json`

## Ownership

Product owns publish · Frontend is read-only consumer (Task #5).

## Verification

| Suite | Result |
|-------|--------|
| `tests/test_publish_envelope_static.py` | **11 PASS** |

## Git

`690d6fe` · `feat(product): add envelope static publisher`

## Verdict

**TASK #4 COMPLETE**

---

# 2026-08-10 (Phase 5 Mission 01 — Real Interpolation)

## 제목

**Phase 5 Mission 01 — Real Interpolation**

## Status

**Completed** (implementation · tests green · docs updated · Commit/Push not requested)

## Purpose

Query Balls에 대해 same-`authoringStrategyId` family 안에서 Exact / Interpolated / Nearest + confidence top-3를 산출하고,  
interpolated `sysInputs` + Query balls로 existing Calculator / Trajectory Builder를 consume한다.

Phase 3 `search/interpolation/` `rank_continuity_v1`는 유지한다 (D3-A). Architecture Freeze / PublishedDataset는 변경하지 않는다.

## Official Names

- **Real Interpolation** · **authoringStrategyId** · **matchType** · **confidence**
- **Second Scoring Gate** · **Cue/Target Geometry Gate** · **No Extrapolation**
— `GLOSSARY_SSOT.md`

## Decisions (Locked)

| ID | Decision |
|----|----------|
| D1-C1 | PositionRecord-shaped SYS knot + explicit `authoringStrategyId` |
| D2-B | Gates · matchType/confidence · top-3 · SYS interp · Calculator/Builder consume |
| D3-A | Keep Phase 3 Interpolation · Real Interpolation = separate layer |
| D4-A | Line of Score MVP = ordered Envelope `secondSet` polyline |

## Implementation (facts)

| Area | Path / Fact |
|------|-------------|
| Identity | `StrategyEntry.authoringStrategyId` · `authoringStrategyId.ts` · SAVE mint/inherit |
| Knot / Migration | `knotCorpus.ts` · `migration.ts` · dry-run default · explicit mapping only |
| Gates | `secondScoring.ts` · `geometryGate.ts` |
| Bracket / SYS | `bracket.ts` · `sysInterpolate.ts` · Modal never blended |
| Result | `engine.ts` · `confidence.ts` · `selectTop3.ts` |
| Bridge / Flow | `applicationBridge.ts` · `realInterpolationSearchFlow.ts` |
| App | `VITE_REAL_INTERPOLATION_SEARCH=1` parallel to `userSearchFlow` |
| Envelope join | `strategyRef` · Envelope에 SYS/Modal/authoringStrategyId 추가 없음 |

## Verification

| Suite | Result |
|-------|--------|
| `frontend/.../realInterpolation.test.ts` | **20 PASS** |
| `tests/test_interpolation_engine*.py` (Phase 3) | **12 PASS** |
| Architecture Freeze edited | **No** |
| PublishedDataset mutated by engine | **No** (immutability test) |

## Remaining Limitations

- Production Envelope PublishedDataset loader는 App에서 `window.__ENVELOPE_PUBLISHED_DATASET__` injection MVP
- Cue POS Gate는 Envelope `cueSet[0]` 기준 — Cue-1D INTERPOLATED는 양 knot가 query Cue POS_TOL 내에 있어야 gate 통과
- Legacy corpus without `authoringStrategyId`는 Real Interpolation family에서 제외 (migration 수동)
- UI confidence/matchType는 hook (`__REAL_INTERPOLATION_TOP3__`) · 공략 버튼 디자인 변경 없음

## Verdict

**MISSION 01 COMPLETE**

---

# 2026-08-10 (Phase 5 Preparation — Cue-Only Edit Snap & Exact Position Replacement)

## 제목

**Phase 5 Preparation — Cue-Only Edit Snap & Exact Position Replacement**

## Status

**Completed** (Authoring normalization · Phase 5 Mission 01 아님)

## Purpose

Phase 5 · Mission 01 Real Interpolation 전에, Authoring SAVE의 전역 근접 병합(`MERGE_EPSILON`)을 제거하고  
History Load → Cue-only edit → Exact Position Replacement 정책을 고정한다.

Search / Real Interpolation / Architecture Freeze / Generator / Schema는 변경하지 않는다.

## Official Names

- **Cue-Only Edit Snap** · **Exact Position Replacement** · **Edit Source** — `GLOSSARY_SSOT.md`

## Decisions (Recorded)

1. History Load 시 **Edit Source** context를 세션에 유지한다.
2. Edit Source identity는 **`WorkspaceSnapshot.id`** 기반이다 (Schema 변경 없음).
3. **Cue Ball만** 수정된 편집에서만 Snap 판정을 허용한다.
4. **Target Exact** 필수.
5. **Second Exact** 필수.
6. Cue candidate = Edit Source lineage의 Authoring **`balls.cue`** 만.
7. **`cueSet` / Trajectory Sampling samples는 Snap 후보가 아니다.**
8. 거리는 Rg **Euclidean** `sqrt(dx²+dy²)`.
9. **d ≤ 0.5 Rg** → SNAP (경계 0.5 포함).
10. **d > 0.5 Rg** → 신규 Position.
11. Edit Source 없으면 근접 자동 병합/교체 **금지**.
12. SNAP 후 Cue/Target/Second를 Exact identity로 확정.
13. Position equality = **Exact 6-coordinate** comparison.
14. **`createPositionId` 양자화만으로 equality 판정하지 않음** (SNAP 후 재계산).
15. 동일 Exact Position → **Latest Write Wins**.
16. 독립 근접 Position은 **반드시 보존**.
17. Authoring SAVE에서 전역 **`MERGE_EPSILON` proximity merge 사용 금지**.
18. History는 **append-only**.
19. **PublishedDataset 직접 patch/delete 금지**.
20. 다음 Export → Generator **Full Regenerate**로 새 PublishedDataset.
21. Package / Deploy는 생성된 PublishedDataset을 소비.
22. **0.5 Rg ≠ Search / Membership / KDTree / Ranking / Interpolation tolerance.**

## Implementation (code cite)

| Path | Role |
|------|------|
| `frontend/src/domain/cueEditSnap.ts` | Snap gates · lineage candidates |
| `frontend/src/domain/positionMergeEngine.ts` | Exact upsert · LWW |
| `frontend/src/application/flows/saveFlow.ts` | SAVE wiring |
| `frontend/src/hooks/useSettings.js` | Edit Source on History Load |

## Tests

| Suite | Result |
|-------|--------|
| `cueEditSnap.test.ts` + `productExportRequest.test.ts` | **19 PASS** |
| Phase 4 `test_product_*` / package / deployment | **21 PASS** |

## Explicit Non-Claims

- Phase 5 Mission 01 Real Interpolation **미시작 · 미완료**
- Architecture Freeze · Generator · Search · Runtime · Schema **미변경**
- Commit / Push **없음** (본 LOG 작성 시점의 구현 세션 기준)

## Next Track

**Phase 5 — Search Quality · Mission 01 Real Interpolation**

---

# 2026-08-06 (Phase 4 Mission 03 — Deployment Workflow · Phase 4 Complete)

## 제목

**Mission 03 — Deployment Workflow Complete · Mission 04 Absorbed · Phase 4 Product Pipeline COMPLETE**

## Status

**Completed**

## Purpose

Mission 02 **Published Package**를 유일한 입력으로 소비하여  
Deployment Workflow(Load · Validation · Target · Metadata · Status · Report)를 구축한다.  
Package / Dataset은 수정하지 않는다. Git Push / Vercel Publish는 수행하지 않는다 (prepare/report only).

## Summary

`product/deployment*`가 Package directory를 load·validate하고 Deployment Report를 `deployment/reports/`에 기록한다.  
`local_staging` 타겟은 source package를 변경하지 않고 staging mirror만 생성한다.

## Pipeline

```text
Published Package/
  → Package Loader (read-only)
  → Package Validation
  → Deployment Target (local_staging | git_ready | vercel_ready)
  → Deployment Report / Metadata / Status
```

## Completed

| Item | 결과 |
|------|------|
| Published Package sole input | ✅ |
| Package Loader | ✅ `deployment_loader.py` |
| Package Validation | ✅ |
| Deployment Workflow / API / CLI | ✅ `deploy` · `run_deployment` |
| Deployment Report / Metadata / Status | ✅ |
| Package immutability (checksum) | ✅ |
| Mission 04 Review | ✅ **ABSORBED** |

## Mission 04 Review

| Question | Answer |
|----------|--------|
| Mission 01에서 Authoring→Export→Generator가 이미 있는가? | **Yes** |
| 별도 Mission 04 구현이 필요한가? | **No** |
| Continuity CLI | `python -m product pipeline` |

ADR: `SESSION_TRANSFER/ADR_MISSION_04_AUTHORING_INTEGRATION_ABSORBED.md`

## Phase 4 Completion

**Phase 4 Product Pipeline = COMPLETE**  
(Foundation · Mission 01 · 02 · 03 · Mission 04 Absorbed)

## Explicit Non-Claims / Not Changed

- Architecture Freeze · Generator · Search · Runtime
- Package Builder / Export Pipeline 코드 책임 변경 없음 (consume only)
- Git Push / Vercel Publish **미수행**
- Commit / Push **없음**

## Next Track

**Phase 5 — Search Quality · Mission 01 Real Interpolation**

## 산출물

| Path | Role |
|------|------|
| `product/deployment.py` | Deployment Workflow |
| `product/deployment_loader.py` | Package dir loader |
| `product/deployment_models.py` | Report / Status / Metadata |
| `tests/test_deployment_workflow.py` | Mission 03 tests |
| `SESSION_TRANSFER/ADR_MISSION_04_…` | Mission 04 Absorbed |
| `PROJECT_MASTER_INDEX.md` | v1.61 · Phase 4 COMPLETE |

---

# 2026-08-06 (Phase 4 Mission 02 — Published Package Builder)

## 제목

**Mission 02 — Published Package Builder Complete**

## Status

**Completed**

## Purpose

Mission 01 **Export Handoff Artifact**를 유일한 입력으로 받아  
배포 가능한 **Published Package** (`package/` folder)를 Product Layer에서 생성한다.

## Summary

Package Builder는 dataset wrap · identity mint · manifest / version / package.json 생성 · schema validation · Export Folder write만 수행한다.  
Generator / Search / Runtime / Architecture / Schema는 수정하지 않았다.

## Pipeline

```text
Export Handoff Artifact
  → Package Builder
  → dataset.json · package.json · manifest.json · version.json · metadata/
  → Mission 03 input
```

## Completed

| Item | 결과 |
|------|------|
| Export Handoff Artifact sole input | ✅ |
| Package Builder | ✅ `product/package_builder.py` |
| dataset.json / package.json / manifest.json / version.json | ✅ |
| metadata/ (provenance · identities · build) | ✅ |
| Package Validation (schema) | ✅ |
| Export Folder write | ✅ `product/package_writer.py` |
| Loader round-trip | ✅ |
| Mission 03 input contract | ✅ `assert_mission03_input_contract` |
| CLI `python -m product package` | ✅ |

## Explicit Non-Claims / Not Changed

- Architecture Freeze 본문
- Generator / Search / Runtime 코드·책임
- PublishedDataset Schema / record mutation
- Deployment / Git Push / Vercel
- Commit / Push **없음**

## Next Track

**Phase 4 — Mission 03 Deployment Workflow**

## 산출물

| Path | Role |
|------|------|
| `product/package_builder.py` | Package Builder |
| `product/package_writer.py` | Export Folder emit |
| `product/package_factory.py` | Factory / one-shot API |
| `tests/test_package_builder.py` | Mission 02 tests |
| `PROJECT_MASTER_INDEX.md` | Status · Next = Mission 03 (v1.60) |

---

# 2026-08-06 (Phase 4 Foundation — Project Governance)

## 제목

**Phase 4 Foundation — Official Glossary · Session Governance · MASTER Constitution**

## Status

**Completed**

## Purpose

Phase 4 구현(Export Pipeline 등)에 앞서 **Project Governance**를 정비하여,  
프로젝트 운영 규칙을 Constitution 수준으로 확립하였다.  
본 항목은 **문서 Governance만** 기록한다 (코드·Architecture Freeze 본문 변경 없음).

## Summary

Terminology SSOT(`GLOSSARY_SSOT`) · Session Handoff Modernization · MASTER Constitution을 도입하여  
Official Read Order · Authority Hierarchy · Documentation Governance · Glossary Consume Policy를 고정하였다.

## Completed

| Item | 결과 |
|------|------|
| Official Glossary SSOT 도입 | ✅ `작업관리/GLOSSARY_SSOT.md` |
| Session Governance 확립 | ✅ `CURSOR_SESSION_HANDOFF.md` §0 |
| Documentation Governance 확립 | ✅ `PROJECT_MASTER_INDEX.md` |
| Project Constitution 정의 | ✅ MASTER Constitution 절 |
| Official Read Order 표준화 | ✅ MASTER → LOG → GLOSSARY → Architecture → HANDOFF → Mission |
| Authority Hierarchy 확립 | ✅ Status / History / Structure / Terminology / Operations |
| Official Pipeline 명칭 통일 | ✅ Architecture Chain · Product Pipeline · Search Enhancement Pipeline |
| Official Terminology 관리 체계 | ✅ GLOSSARY §3 · Naming Rules |
| Glossary Consume Policy 적용 | ✅ HANDOFF · MASTER banner / cite |
| Duplicate terminology 제거 정책 | ✅ HANDOFF §2 cite-only · GLOSSARY §8 Governance |

## Decisions

1. **GLOSSARY_SSOT**는 공식 Terminology 및 Official Pipeline 표현의 SSOT이다 (Authority: Terminology).
2. **Architecture Freeze**는 Structure와 Constraint의 Parent Authority이다. Glossary는 이를 **cite**하며 의미를 **재정의하지 않는다**.
3. 새 Session은 다음 순서로 시작한다:  
   `MASTER → LOG → GLOSSARY → Architecture → HANDOFF → Mission`
4. 새로운 문서는 **Documentation Governance**를 따른다 (Status → Architecture → Terminology → Session → Mission → Reference).
5. 새로운 공식 용어는 **Glossary 등록 후** 사용한다.

## Impact

앞으로 작성되는 Product · Search · Validation · Session · Mission 문서는  
Glossary의 Official Terminology를 사용한다.  
동일 용어를 문서마다 다시 정의하지 않는다.

## Explicit Non-Claims / Not Changed

다음은 **변경하지 않았다**.

- Architecture Freeze 본문 (`Architecture/**`)
- Generator / Search / Runtime 코드·책임
- Schema / Models
- PublishedDataset Contract
- Membership Contract
- Resolve Contract
- Commit / Push **없음**

## Next Track

**Phase 4 — Mission 01 Export Pipeline**

- Export → Product Host → Generator
- PublishedDataset handoff contract
- No Package emission · No Deployment · No Search migration

Roadmap: `SESSION_TRANSFER/Product Phase Handoff.md` · Official Pipeline: `GLOSSARY_SSOT` §5.2

## 산출물 (문서)

| 문서 | 내용 |
|------|------|
| `작업관리/GLOSSARY_SSOT.md` | Terminology Constitution (Step 1) |
| `CURSOR_SESSION_HANDOFF.md` | Session Read Order · Rules · Authority · Consume (Step 2) |
| `PROJECT_MASTER_INDEX.md` | Constitution · Governance · Next Track Mission 01 (Step 3 · v1.58) |
| `HISTORY/PROJECT_LOG_2026-08.md` | 본 항목 · Version **v1.18** |

---

# 2026-08-06 (Project Documentation — Phase 3 Complete)

## 제목

**Phase 3 Search Engine Enhancement Complete — Project Documentation Update**

## Summary

프로젝트 전체 관점에서 **Search Engine Architecture Complete**를 문서에 확정한다.  
Phase 1 Foundation · Phase 2 Dataset Generator · Phase 3 Search Engine Enhancement가 모두 Complete이며, Next Track은 Product / Platform Carry 및 System Authoring / Dataset Expansion 준비이다.  
본 항목은 **문서 업데이트만** 수행한다 (코드·테스트·Commit·Push 없음).

## Phase Map

| Phase | 이름 | 상태 |
|-------|------|------|
| **1** | Search Engine Foundation | ✅ Complete |
| **2** | Dataset Generator | ✅ Complete |
| **3** | Search Engine Enhancement | ✅ Complete |

## Phase 3 완료 범위 (Mission 35~42)

| Mission | 내용 | 상태 |
|---------|------|------|
| 35 | Spatial Index | ✅ |
| 36 | KDTree | ✅ |
| 37 | Membership Optimization | ✅ |
| 38 | Ranking | ✅ |
| 39 | Interpolation | ✅ |
| 40 | Geometry Metrics | ✅ |
| 41 | Runtime Wiring | ✅ |
| 42 | Quality Validation / E2E | ✅ |

## 검증 요약

- E2E PASS
- Benchmark PASS
- Regression PASS
- Full Test PASS (**248**)
- Search Quality Report: `search/quality/SEARCH_QUALITY_REPORT.md`
- **Search Engine Enhancement Complete** 선언

## Explicit Non-Claims

- 본 항목에서 코드 / 테스트 변경 **없음**
- Commit / Push **없음**
- Architecture Freeze 문서 내용 수정 **없음**

## Next Track

- Product / Platform Carry
- System Authoring / Published Dataset Expansion 준비
- Real System Corpus · Search Quality Tuning(실데이터) · Product Integration (후보)

## 산출물 (문서)

| 문서 | 내용 |
|------|------|
| `PROJECT_MASTER_INDEX.md` | Phase Map · Search Engine Architecture Complete · Next Track |
| `HISTORY/PROJECT_LOG_2026-08.md` | 본 항목 · Version **v1.17** |
| `CURSOR_SESSION_HANDOFF.md` | Phase 3 Complete · Next Track 후보 |

---

# 2026-08-06 (Search Engine Enhancement Phase Complete)

## 제목

**Mission 42 — Search Quality Validation & E2E · Phase 3 Complete**

## Summary

Phase 3 Enhancement Pipeline 전체에 대해 End-to-End Validation · Regression · Benchmark · Quality Report를 수행하고, **Search Engine Enhancement Phase Complete**를 선언한다. 새 검색 알고리즘·Engine 구현 변경은 없으며, Architecture Freeze / Foundation Contract / Generator는 수정하지 않았다.

## Architecture Review 요약

- Validation 대상 Pipeline: Spatial → KDTree → Membership → Ranking → Interpolation → Geometry → Resolve → SearchResult
- Runtime는 Orchestrator이며 계산을 수행하지 않는다.
- PublishedDataset Immutable / Membership·Resolve·SearchResult Contract 유지 확인
- Phase 3 완료 조건: E2E + Regression + Benchmark + Full Test PASS

## 검증 Suite

| Suite | 경로 | 결과 |
|-------|------|------|
| E2E Validation | `tests/test_search_enhancement_e2e.py` | **PASS** |
| Regression | `tests/test_search_enhancement_regression.py` | **PASS** |
| Benchmark / Quality | `tests/test_search_enhancement_benchmark.py` | **PASS** |
| Phase Complete Smoke | `tests/test_search_enhancement_phase_complete_smoke.py` | **PASS** |
| Full test suite | `tests/` | **PASS** |

## Search Quality Report

`search/quality/SEARCH_QUALITY_REPORT.md`

## 결과

- Full Search Pipeline E2E PASS
- Regression PASS
- Benchmark PASS
- Runtime 호출 순서 검증 PASS
- PublishedDataset Immutable 검증 PASS
- Membership / Resolve / SearchResult Contract 유지
- **Search Engine Enhancement Phase Complete**

## Explicit Non-Claims

- 새 검색 알고리즘 / 새 Metric **미구현**
- Ranking / Interpolation / Geometry / Runtime 구현 변경 **없음**
- Generator / Schema / Architecture 변경 **없음**

## Next

**Product / Platform Carry** — Display Boundary Continuation · STEP9 Pilot · Known Issues

---

# 2026-08-06 (Search Engine Enhancement Phase — Runtime Wiring 완료)

## 제목

**Mission 41 — Search Runtime Enhancement Wiring**

## Summary

Phase 3 Enhancement Engine들(Spatial Index · KDTree · Membership · Ranking · Interpolation · Geometry Metrics)을 기존 Search Runtime Host에 연결하였다. Runtime는 계산을 수행하지 않으며, Engine을 올바른 순서로 호출하는 Orchestrator 역할만 수행한다. Resolve / SearchResult Contract는 유지하였다.

## Architecture Review 요약

- Runtime = Host / Orchestrator (계산 금지).
- Pipeline: Spatial Index → KDTree → Membership → Ranking → Interpolation → Geometry Metrics → Resolve → SearchResult.
- `search/runtime/SearchEnhancementOrchestrator`가 Phase-3 Engine 호출을 담당한다.
- Resolve는 여전히 MembershipCandidate만 소비한다.
- PublishedDataset / Generator / Engine 구현은 수정하지 않았다 (Runtime wiring만).

## 구현 내역

| Layer | 경로 | 비고 |
|-------|------|------|
| Enhancement Orchestrator | `search/runtime/orchestrator.py` | Pipeline stage 호출 |
| Runtime Host wiring | `runtime/engine.py`, `runtime/factory.py` | Orchestrator 연결 |
| Integration / Smoke | `tests/test_runtime_enhancement*.py` | 호출 순서 · Resolve 계약 |

## 검증

| Suite | 결과 |
|-------|------|
| Runtime enhancement integration | **PASS** |
| Runtime enhancement smoke | **PASS** |
| Existing runtime tests | **PASS** |
| Full test suite | **PASS** |

## 결과

- Runtime가 모든 Engine을 올바른 순서로 호출
- Runtime 내부 계산 없음
- PublishedDataset 수정 없음
- Resolve Contract 유지
- SearchResult 계약 유지

## Explicit Non-Claims

- Search Quality Tuning **미구현**
- Benchmark / 추가 Metric **미구현**
- Generator / Schema 변경 **없음**

## Next

**Mission 42 — Search Quality Tuning** — Ranking/Interpolation/Geometry 통합 품질 조정

---

# 2026-08-06 (Search Engine Enhancement Phase — Geometry Metrics 완료)

## 제목

**Mission 40 — Geometry Metrics Engine**

## Summary

Foundation Geometry Context(`geometry/`)와 분리하여, 검색 품질용 Geometry Metrics Engine을 `search/geometry/`에 구현하였다. Geometry는 Metric Producer이며 Trajectory 생성·Sampling·Dataset Patch를 수행하지 않는다. Generator / Ranking / Interpolation 계약은 변경하지 않았다.

## Architecture Review 요약

- Geometry Metrics는 Interpolation 이후 Metric Producer이다.
- Foundation `geometry/` Context Layer와 책임 분리 (`search/geometry/` = Metrics only).
- MetricProvider는 독립 계층이며 distance / angle / similarity / error를 기본 제공한다.
- Trajectory 생성은 Generator만 담당하며, Metrics Engine은 호출하지 않는다.
- 출력 순서는 RefinedCandidate 순서를 보존한다 (재정렬 금지).

## 구현 내역

| Layer | 경로 | 비고 |
|-------|------|------|
| Geometry Metric Contract | `search/geometry/contract.py` | engine id · weights |
| Metric Providers | `search/geometry/providers.py` | distance/angle/similarity/error |
| Metric Engine | `search/geometry/engine.py` | RefinedCandidate[] + Query → GeometryEvaluatedCandidate[] |
| Fixture / Tests | `search/geometry/fixtures.py`, `tests/test_geometry_metrics*.py` | extension · no trajectory · smoke |

## 검증

| Suite | 결과 |
|-------|------|
| Geometry Metrics unit / regression tests | **PASS** |
| Geometry Metrics smoke test | **PASS** |
| Full test suite | **PASS** |

## 결과

- RefinedCandidate[] + GeometrySearchQuery 입력
- geometry_score / metric_detail 제공
- Metric Provider 확장 가능
- Trajectory 미생성 · Generator 미수정 · Dataset Patch 없음
- Ranking / Interpolation Contract 변경 없음

## Explicit Non-Claims

- Trajectory Generation **미구현**
- Runtime wiring **미구현**
- Search Quality Tuning **미구현**
- Resolve 변경 **없음**
- Foundation Geometry Context 계약 변경 **없음**

## Next

**Mission 41 — Search Quality Tuning** — Ranking/Interpolation/Geometry 통합 품질 조정

---

# 2026-08-06 (Search Engine Enhancement Phase — Interpolation Engine 완료)

## 제목

**Mission 39 — Interpolation Engine**

## Summary

Ranking 결과를 입력으로 받아 검색 품질 보정을 수행하는 Interpolation Engine을 구현하였다. Interpolation은 Ranking 순서와 Membership 판정을 재실행하지 않으며, `RankedCandidate[] → RefinedCandidate[]` refinement만 수행한다. PublishedDataset는 Immutable로 유지하였다.

## Architecture Review 요약

- Interpolation은 Ranking 이후 Refinement Layer이다.
- Ranking 순서를 보존하며 score만 보정한다 (재정렬 금지).
- Refinement Policy는 Engine과 분리된 독립 계층이다.
- Baseline Policy는 rank-continuity shrinkage (`rank_continuity_v1`)이다.
- PublishedDataset field 추가/patch/rewrite는 금지한다.

## 구현 내역

| Layer | 경로 | 비고 |
|-------|------|------|
| Interpolation Contract | `search/interpolation/contract.py` | policy id · continuity alpha |
| Refinement Policy | `search/interpolation/policy.py` | RankContinuityRefinementPolicy |
| Interpolation Engine | `search/interpolation/engine.py` | RankedCandidate[] → RefinedCandidate[] |
| Fixture / Tests | `search/interpolation/fixtures.py`, `tests/test_interpolation_engine*.py` | immutable · no re-rank · smoke |

## 검증

| Suite | 결과 |
|-------|------|
| Interpolation unit / regression tests | **PASS** |
| Interpolation smoke test | **PASS** |
| Full test suite | **PASS** |

## 결과

- RankedCandidate[] 입력 → RefinedCandidate[] 반환
- refinement_detail 제공
- Ranking / Membership 재실행 없음
- PublishedDataset Immutable 유지
- Generator / Ranking / Membership 수정 없음

## Explicit Non-Claims

- Geometry Metrics **미구현**
- Runtime wiring **미구현**
- Search Quality Tuning **미구현**
- Resolve 변경 **없음**

## Next

**Mission 40 — Geometry Engine** — Context only 이후 실제 Geometry 계산 단계

---

# 2026-08-06 (Search Engine Enhancement Phase — Ranking Engine 완료)

## 제목

**Mission 38 — Ranking Engine**

## Summary

Membership를 통과한 `MembershipCandidate[]`를 deterministic Score Model로 정렬하는 Ranking Engine을 구현하였다. Ranking은 Ordering만 담당하며 Membership Contract / Resolve / Runtime / PublishedDataset은 변경하지 않았다.

## Architecture Review 요약

- Ranking은 Membership 이후에만 수행된다.
- Score Model은 Ranking Engine과 분리된 독립 계층이다 (`ScoreModel` protocol).
- Baseline Score는 Membership flag contribution (`membership_flags_v1`)이며, 향후 Geometry metric scorer로 확장 가능하다.
- Tie-break는 `record_identity` 오름차순이며, Python `sorted`의 Stable Sort를 유지한다.

## 구현 내역

| Layer | 경로 | 비고 |
|-------|------|------|
| Ranking Contract | `search/ranking/contract.py` | score model id · weights |
| Score Model | `search/ranking/score.py` | MembershipFlagsScoreModel |
| Ranking Engine | `search/ranking/engine.py` | MembershipCandidate[] → RankedCandidate[] |
| Fixture / Tests | `search/ranking/fixtures.py`, `tests/test_ranking_engine*.py` | tie-break · stable sort · smoke |

## 검증

| Suite | 결과 |
|-------|------|
| Ranking unit / regression tests | **PASS** |
| Ranking smoke test | **PASS** |
| Full test suite | **PASS** |

## 결과

- MembershipCandidate[] 입력 → RankedCandidate[] 반환
- Score Model 독립 계층 유지
- Stable Sort / deterministic ordering 확인
- Tie-break Rule 정의 및 테스트
- score_detail 제공
- Membership / PublishedDataset / Generator 수정 없음

## Explicit Non-Claims

- Interpolation Engine **미구현**
- Geometry Metrics **미구현**
- Runtime wiring **미구현**
- Resolve 변경 **없음**
- Search Quality Tuning **미구현**

## Next

**Mission 39 — Interpolation Engine** — Search quality 보강용 파생 계산

---

# 2026-08-06 (Search Engine Enhancement Phase — Membership Optimization 완료)

## 제목

**Mission 37 — Membership Optimization Integration**

## Summary

기존 Membership Contract와 `MembershipCandidate` 모델은 그대로 유지한 채, 내부 후보 탐색 경로를 `Spatial Index -> KDTree -> Membership Gate`로 최적화하였다. 최적화 경로를 사용할 수 없거나 후보를 얻지 못한 경우에는 기존 full scan path로 즉시 fallback하도록 구현하여 결과 정합성을 유지하였다.

## Architecture Review 요약

- Membership는 여전히 최종 contract gate이며, Spatial Index와 KDTree는 후보 축소/정렬만 담당한다.
- 외부 API는 `PublishedDataset + MembershipQuery -> MembershipCandidate[]`로 유지한다.
- 최적화 경로가 비어 있거나 실패하면 full scan fallback을 수행해 기존 결과와 동일성을 보장한다.
- 최종 MembershipCandidate 순서는 dataset 원래 순서를 유지하여 legacy 결과 ordering을 보존한다.

## 구현 내역

| Layer | 경로 | 비고 |
|-------|------|------|
| Candidate Prefilter Adapter | `search/membership/adapter.py` | Spatial Index + KDTree 통합 |
| Membership Optimization Hook | `membership/engine.py` | optimized path + full scan fallback |
| Regression / Smoke | `tests/test_membership_engine.py`, `tests/test_membership_optimization_smoke.py` | 결과 동일성 / fallback 검증 |

## 검증

| Suite | 결과 |
|-------|------|
| Membership regression tests | **PASS** |
| Membership optimization smoke test | **PASS** |
| Full test suite | **PASS** |

## 결과

- Membership Contract 유지
- MembershipCandidate Model 유지
- Spatial Index → KDTree → Membership 경로 동작
- Full Scan Fallback 유지
- 동일 Query에서 기존 full scan과 동일한 Membership 결과 확인
- Resolve Contract 변경 없음
- Runtime API 변경 없음

## Explicit Non-Claims

- Ranking Engine **미구현**
- Interpolation Engine / Geometry Metrics **미구현**
- Runtime wiring **미구현**
- Resolve 변경 **없음**
- PublishedDataset / Generator 수정 **없음**

## Next

**Mission 38 — Ranking Engine** — MembershipCandidate ordering / scoring

---

# 2026-08-06 (Search Engine Enhancement Phase — KDTree 완료)

## 제목

**Mission 36 — KDTree Layer for Envelope Candidates**

## Summary

Mission 35의 Spatial Index 후보 집합을 입력으로 consume하는 KDTree 계층을 구현하였다. EnvelopeRecord는 cue centroid / target / second centroid 기반의 고정 6D 벡터로 encoding되며, KDTree는 deterministic top-N nearest shortlist만 반환하고 Membership 판정·Ranking·Geometry 계산은 수행하지 않는다.

## Architecture Review 요약

- Spatial Index는 coarse prefilter, KDTree는 shortlist retrieval로 책임을 분리한다.
- Encoding은 tree build/query와 분리하여 `search/kd_tree/encoding.py`에 고정한다.
- EnvelopeRecord는 set-valued(`cueSet`, `secondSet`) 구조이므로, KDTree coarse retrieval에서는 centroid representative를 사용한다.
- Tie-break는 `candidate_id` 오름차순으로 고정하여 동일 입력에 동일 순서를 보장한다.

## 구현 내역

| Layer | 경로 | 비고 |
|-------|------|------|
| KDTree Contract | `search/kd_tree/contract.py` | 6D 고정 차원 |
| Point Encoding | `search/kd_tree/encoding.py` | query direct / record centroid encoding |
| KDTree Builder | `search/kd_tree/builder.py` | 후보 집합 → KDTreeIndex |
| KDTree Query API | `search/kd_tree/query.py` | top-N nearest shortlist |
| Fixture / Smoke | `search/kd_tree/fixtures.py`, `tests/test_kd_tree*.py` | tie-break · Spatial Index 연동 검증 |

## 검증

| Suite | 결과 |
|-------|------|
| KDTree unit tests | **PASS** |
| KDTree smoke test | **PASS** |
| Full test suite | **PASS** |

## 결과

- Spatial Index 후보 집합으로 KDTree 생성 성공
- Query와 Record를 동일 6D contract로 encoding
- Query → Top-N nearest shortlist 반환 성공
- 결과에 `candidate_id`, `strategy_ref`, `distance`, deterministic tie-break metadata 포함
- Membership 계약 변경 없음
- PublishedDataset / Generator 수정 없음

## Explicit Non-Claims

- Membership Optimization Integration **미구현**
- Ranking / Interpolation / Geometry Metrics **미구현**
- Runtime wiring **미구현**
- Persisted KDTree / Dataset index field **미구현**
- Loader / Resolve / Schema 변경 **없음**

## Next

**Mission 37 — Membership Optimization** — KDTree shortlist consume

---

# 2026-08-06 (Search Engine Enhancement Phase — Spatial Index 완료)

## 제목

**Mission 35 — Spatial Index Design & Contract**

## Summary

Search Engine Enhancement Phase의 첫 단계로 Spatial Index 계층을 구현하고 coarse prefilter contract를 검증하였다. Spatial Index는 PublishedDataset로부터 런타임에 파생되는 memory-only index이며, PublishedDataset / Generator / Foundation Consumer 계약은 변경하지 않았다.

## 구현 내역

| Layer | 경로 | 비고 |
|-------|------|------|
| Spatial Index Builder | `search/spatial_index/builder.py` | PublishedDataset → SpatialIndex |
| Spatial Cell Contract | `search/spatial_index/contract.py` | 8×4 grid |
| Spatial Query API | `search/spatial_index/models.py` | `SpatialQuery` / `SpatialQueryResult` |
| Fixture / Smoke | `tests/test_spatial_index*.py` | PublishedDataset 기반 coarse prefilter 검증 |

## 검증

| Suite | 결과 |
|-------|------|
| Spatial Index unit tests | **PASS** |
| Spatial Index smoke test | **PASS** |
| Full test suite | **PASS** |

## 결과

- PublishedDataset로부터 Spatial Index 생성 성공
- Spatial Cell 생성 성공
- Query → Candidate ID 반환 성공
- Runtime-derived only 유지
- PublishedDataset 수정 없음
- Generator 수정 없음
- Foundation 계약 변경 없음

## Explicit Non-Claims

- KDTree **미구현**
- Membership 변경 **없음**
- Ranking / Interpolation / Geometry **미구현**
- Runtime wiring **미구현**
- Loader / Resolve / Schema 변경 **없음**

## Next

**Mission 36 — KDTree** — Membership 후보 접근 최적화

---

# 2026-08-06 (Dataset Generator Phase 완료)

## 제목

**Dataset Generator Phase Complete**

## Summary

Envelope Architecture Freeze SSOT 계약을 유지한 상태에서 Dataset Generator Phase 구현을 완료하였다. Generator Producer 계층은 Strategy 입력으로부터 PublishedDataset을 생성하며, 기존 Foundation Consumer(Validation / Loader / Membership)가 그 결과를 그대로 consume할 수 있음을 E2E로 검증하였다. **Architecture Freeze 문서·Foundation Consumer 계층·Schema/Models 계약은 수정하지 않았고, Commit/Push도 수행하지 않았다.**

## 구현 내역 (Generator Phase)

| Layer | 경로 | 비고 |
|-------|------|------|
| Trajectory Generator | `generator/trajectory_generator/` | Strategy → TrajectorySnapshot |
| Cue Sampler | `generator/cue_sampler/` | `cue_trajectory` → `cueSet` |
| Second Sampler | `generator/second_sampler/` | `line_of_score` → `secondSet` |
| Envelope Builder | `generator/envelope_builder/` | Strategy + Snapshot + Sets → EnvelopeRecord |
| Published Dataset Builder | `generator/published_dataset_builder/` | EnvelopeRecord[] → PublishedDataset |
| Generator Pipeline E2E | `tests/test_generator_pipeline_e2e.py` | Validation → Loader → MembershipCandidate |

## 검증

| Suite | 결과 |
|-------|------|
| Generator unit/smoke tests | **PASS** |
| Generator Pipeline E2E | **PASS** |
| Validation Layer | **PASS** |
| Loader 연동 | **PASS** |
| MembershipCandidate 생성 | **PASS** |
| Round-trip (`load` / `load_path`) | **PASS** |
| Full test suite | **PASS** |

## 결과

- PublishedDataset 생성 성공
- Validation PASS
- Loader가 PublishedDataset를 정상 Load
- PublishedDataset Model 유지
- Membership 입력 가능
- MembershipCandidate 반환 확인
- Generator Phase 종료

## Explicit Non-Claims

- Architecture / Schema / Models 의미 변경 **없음**
- Foundation Consumer (Loader / Membership / Resolve / Runtime) 수정 **없음**
- Ranking / Interpolation / KDTree / Spatial Index / Geometry 실계산 **미구현**
- Package Emit **미구현**
- Git Commit / Push **없음**

## Next

**Search Engine Enhancement Phase** — Spatial Index · KDTree · Membership Optimization · Ranking Engine · Interpolation Engine · Geometry Engine · Search Quality Tuning

## 산출물 (문서 세션)

| 문서 | 내용 |
|------|------|
| `PROJECT_MASTER_INDEX.md` | Dataset Generator Phase Complete · Next Search Engine Enhancement Phase |
| `HISTORY/PROJECT_LOG_2026-08.md` | 본 항목 · Version **v1.8** |
| `CURSOR_SESSION_HANDOFF.md` | Generator Phase Complete · Next Search Engine Enhancement Phase |

---

# 2026-08-06 (Search Engine Foundation Phase 완료)

## 제목

**Search Engine Foundation Phase 완료**

## Summary

Envelope Architecture Freeze SSOT 계약에 따라 Search Engine Foundation Phase 구현을 완료하고, 작업관리 문서에 상태를 반영하였다. **Architecture Freeze 문서·기존 SSOT 본문·구현 코드는 본 문서 세션에서 수정하지 않았다. Commit 없음.**

## 구현 내역 (Foundation Phase)

| Layer | 경로 | 비고 |
|-------|------|------|
| Schema | `schemas/` | Published Dataset · Package · Manifest · Version · Membership Candidate |
| Domain Models | `models/` | EnvelopeRecord · PublishedDataset · Package · Manifest · Version · MembershipCandidate |
| Validation Layer | `validation/` | jsonschema Draft 2020-12 · schema registry |
| Package Loader | `loader/` | Package → Validation → PublishedDataset |
| Membership Engine | `membership/` | PublishedDataset + Query → MembershipCandidate[] |
| Resolve Engine | `resolve/` | MembershipCandidate.strategy_ref → Strategy |
| Search Runtime | `runtime/` | Host: Membership → Resolve → SearchResult |
| Search Session | `session/` | 1회 Execution Context · SearchResult 재사용 |
| Strategy Repository | `strategy/` | Read-only MemoryStrategyRepository · FrozenStrategy Handle |
| Strategy Engine | `strategy_engine/` | Strategy Handle → StrategyExecution |
| Modal Engine | `modal/` | StrategyExecution → ModalExecution |
| Geometry Engine | `geometry/` | ModalExecution → GeometryContext (**계산 미구현 · Context only**) |

## 테스트

| Suite | 결과 |
|-------|------|
| Validation / Loader / Membership / Resolve / Runtime / Session / Strategy Repository / Strategy Engine / Modal / Geometry smoke tests | **PASS** (각 Mission 기준) |

## Architecture Freeze

- `Architecture/` Envelope Architecture SSOT **유지** (내용 수정 없음)
- Schema / Models / 기존 Consumer 계층 Freeze 계약 준수
- Generator · Ranking · KDTree · 실제 Geometry 계산 · Search Algorithm — **본 Phase 비범위**

## Explicit Non-Claims

- Dataset Generator Phase — **미착수**
- Architecture / Schema / Models 문서·코드 변경 — **없음** (본 문서 세션)
- Git Commit / Push — **없음**

## Next

**Dataset Generator Phase** — Trajectory Generator · Cue Sampler · Second Sampler · Envelope Builder · Published Dataset Builder

## 산출물 (문서)

| 문서 | 내용 |
|------|------|
| `PROJECT_MASTER_INDEX.md` | v1.56 → **v1.57** · Foundation Phase 완료 · Next Generator Phase |
| `HISTORY/PROJECT_LOG_2026-08.md` | 본 항목 · Version **v1.7** |
| `CURSOR_SESSION_HANDOFF.md` | Foundation 완료 · Generator Phase 이관 · cueSet/secondSet 정의 |

---

# 2026-08-04 (Reading Mode + C2 Reflection Rail Handle — 구현 완료 · 문서 반영)

## 제목

**D-DBP-16 / D-DBP-17 / D-DBP-18** — Reading Mode Implemented · C2 Reflection Rail Handle Implemented · Corner Cap Override

## Summary

이번 세션에서 USER Overlay **Reading Mode**와 ADMIN **C2 Reflection Rail Handle**을 구현·검증하고, Display Boundary Policy SSOT / MASTER INDEX / 본 로그에 완료 상태를 반영하였다. **본 항목의 문서 업데이트는 코드 수정 없음 · Commit/Push 없음.**

## 작업 로그 (시간순)

### ■ Reading Mode UX

- UX 설계 · SSOT §15 작성 (선행 v1.3)
- Overlay 확대: Max Height = Table Inner Height
- Typography × `ReadingFontScale=1.45`
- Aspect 유지 · 우측 상단 돋보기(+/-) 토글
- Backdrop 강화 · 내부 Scroll
- USER Overlay Shell only · Overlay 종료 시 OFF · Persistence 없음
- 구현: `UserOverlayShell.jsx` · `overlayLayoutTokens.ts` · `index.css`

### ■ Reading Mode 개선

- AI Overlay Width 계산 수정 — kind별 **originalAspect**
- AI/HPT: `AI_OVERLAY_ASPECT_RATIO`(6:4) · CALC: max-box aspect
- 줄바꿈 감소
- Reading Mode 토글 시 **Overlay Center 유지** (Drag/clamp 로직 비변경)

### ■ Reflection Handle (C2)

- ADMIN 전용 C2 Rail Handle (작은 노란 점)
- 1D Rail Drag · Rail Snap · `{ rail, t }` Persist (`reflectionOverride`)
- Builder: Override 있으면 Reflection 계산 Skip (`anchors.C2`)
- USER Handle 비표시 · Reflection Engine / `detectRail` 수식 비변경
- Display Layer 중심 · Builder 최소 변경

### ■ Corner 처리

- Manual Override 경로에서 Display Cap **sameRail 절단 생략** (`skipSameRail`)
- `detectRail` 수정 없음 · Reflection Engine 수정 없음 · Builder는 Cap 옵션 전달만

## Decision Log

| ID | Decision |
|----|----------|
| **D-DBP-16** | Reading ON Width = kind별 originalAspect |
| **D-DBP-17** | Reading 토글 시 Overlay Center 유지 · Drag 로직 비변경 |
| **D-DBP-18** | C2 Override rail+t · Cap `skipSameRail` · USER Handle 비표시 |

## 최종 상태

| 항목 | 상태 |
|------|------|
| Reading Mode | **완료** |
| C2 Reflection Handle | **완료** |
| Corner Override (`skipSameRail`) | **완료** |
| Build | **PASS** |
| Unit | **PASS** |
| Lint | **PASS** |

## 산출물 (문서 세션)

| 문서 | 내용 |
|------|------|
| `DISPLAY_BOUNDARY_POLICY_SSOT.md` | v1.3 → **v1.4** (§15 Implemented · §16 C2 Handle) |
| `PROJECT_MASTER_INDEX.md` | v1.55 → **v1.56** |
| `HISTORY/PROJECT_LOG_2026-08.md` | 본 항목 · Version **v1.6** |

## Explicit Non-Claims

- Continuation / Boundary / CASE A / Corrected Cap Minimum 코드 — 미착수
- Extension Runtime redesign — 비대상
- 본 문서 업데이트 세션의 코드·Git Commit/Push — 없음

## Next

Continuation · CASE A attach · Corrected Cap Minimum · Display Boundary · 또는 Handle Drag 잔여 간섭.

---

# 2026-08-04 (Display Boundary Policy SSOT v1.3 — Reading Mode UX)

## 제목

**D-DBP-13 / D-DBP-14 / D-DBP-15** — Overlay Reading Mode UX 정책 SSOT 추가 (문서 only)

## Summary

Overlay Reading Mode를 구현하기 전에, Display Boundary Policy와 동일 수준의 Presentation UX SSOT를 `DISPLAY_BOUNDARY_POLICY_SSOT.md` §15로 확정하였다. Cap/Boundary/Extension Runtime과 **독립**이며, USER Overlay Shell만 대상이다. **코드·CSS·Component·Icon 수정 없음.**

## 추가 정책

| 항목 | 내용 |
|------|------|
| 적용 | USER Overlay (AI · 계산 · 타점) · Shell only |
| 비적용 | ADMIN · Content Panel · Runtime/Builder/Dataset/Search/Extension |
| ON | Max Height = Table Inner Height · Aspect 유지 · Width 자동 · Typography ×1.45 · Backdrop↑ · 내부 scroll |
| 토글 | 우측 상단 돋보기(+)/(-) |
| Animation | 150–180ms ease-out |
| Reset | Overlay 종료 시 OFF · localStorage 없음 |

## Decision Log

| ID | Decision |
|----|----------|
| **D-DBP-13** | Reading Mode = Presentation UX · Display Boundary와 독립 |
| **D-DBP-14** | USER Overlay Shell만 · Content Panel 수정 금지 |
| **D-DBP-15** | Overlay 종료 시 Reading 상태 초기화 · no localStorage |

## 산출물

| 문서 | 내용 |
|------|------|
| `DISPLAY_BOUNDARY_POLICY_SSOT.md` | v1.2 → **v1.3** (§15 Reading Mode) |
| `PROJECT_MASTER_INDEX.md` | v1.54 → **v1.55** |

## Explicit Non-Claims

- Reading Mode 코드/아이콘/CSS 미구현
- OVERLAY_LAYOUT_SSOT 본문 교차 개정은 구현 Phase에서
- Cap / Continuation / Boundary / Extension 미변경

## Next

Reading Mode 구현 (Shell · tokens · App state) 또는 Continuation / Corrected Cap Minimum / Boundary.

---

# 2026-08-04 (Display Boundary Phase 2A — Overlay Attach Gate)

## 제목

**D-DBP-12** — Branch별 Trajectory Extension Overlay Attach/Visibility Gate (CASE B)

## Summary

USER 기준값에서 baseline은 C4까지 정상이나, `TrajectoryExtensionLayer`가 draft 존재만으로 corrected Reveal/E1/E2를 항상 그리던 문제를 Presentation Gate로 해결하였다. Runtime draft/hydrate는 유지한다. **“baseline이면 무조건 숨김”이 아니라** `baselineContinuationAllowed`로 CASE A 확장점을 남긴다.

## 구현

| 항목 | 내용 |
|------|------|
| Helper | `renderer/trajectory/trajectoryExtensionOverlayVisibility.ts` |
| App | mount: `extensionOverlayVisibility.attach` |
| USER baseline (Phase 2A) | `baselineContinuationAllowed: false` → attach=false |
| USER corrected / ADMIN | draft 있으면 attach=true |

## 검증

- unit: overlay visibility 5 cases
- Cap tests 회귀
- Build / Lint

## Explicit Non-Claims

- Continuation Rule 미구현 (CASE A attach는 이후)
- Corrected Cap Minimum 코드 미구현
- Extension Runtime / Builder / Hydrate / Search 미변경
- Commit / Push 없음

## Next

Continuation Rule → CASE A `baselineContinuationAllowed` · Corrected Cap Minimum · Display Boundary.

---

# 2026-08-04 (Display Boundary Policy SSOT v1.1 — Corrected Minimum)

## 제목

**D-DBP-10 / D-DBP-11** — Corrected Display Minimum Guarantee 문서 추가 (Phase 1.5 · 문서 only)

## Summary

Architecture Review 결과, corrected Display Cap이 `second_ball` 미교차 시 기본 **C3**에서 끝나는 현행이 5&Half 제품 의도(계산 결과 C4까지 표시)와 불일치함을 확인하였다. `DISPLAY_BOUNDARY_POLICY_SSOT.md`를 **v1.1**로 보강하여 Corrected Display Minimum Guarantee를 규범화하였다. **코드 수정 없음.**

## 추가 정책

| 항목 | 내용 |
|------|------|
| Corrected Minimum | 세컨드볼과 무관하게 **C4까지 항상 표시** · second_ball로 C3 종료 **금지** |
| C5/C6 | Continuation Rule만 결정 |
| Baseline ↔ Corrected | **최소 C4 정책 공유** · 차이는 path(계산 결과) |
| Cap Priority | Invalid → Chain → **Minimum Guarantee** → Continuation → Physical Limit → Second Ball |

## Decision Log

| ID | Decision |
|----|----------|
| **D-DBP-10** | Corrected는 계산 결과가 존재하는 마지막 계산 쿠션(C4)까지 항상 표시 |
| **D-DBP-11** | Continuation은 C4 이후만 · C4 Minimum과 독립 |

## 산출물

| 문서 | 내용 |
|------|------|
| `DISPLAY_BOUNDARY_POLICY_SSOT.md` | v1.0 → **v1.1** |
| `PROJECT_MASTER_INDEX.md` | v1.53 · Display Boundary 절·참고 갱신 |

## Explicit Non-Claims

- Corrected Cap 코드 미구현 (다음: `trajectoryPathDisplayPolicy.ts`)
- Builder / Extension / Hydrate / Search / Runtime 미변경
- Commit / Push 없음

## Next

Corrected Display Cap C4 Minimum 구현 → Continuation Rule → Display Boundary → Overlay Attach.

---

# 2026-08-04 (Display Boundary Policy SSOT v1.0)

## 제목

**D-DBP-01…09** — USER 기준값/보정값 Display Boundary Policy SSOT 신규 작성 (문서 only)

## Summary

Trajectory Extension은 Task Closed / Runtime Freeze를 유지한 채, USER **기준값 vs 보정값**의 Display Layer 상위 정책이 없음을 확인하고 `DISPLAY_BOUNDARY_POLICY_SSOT.md` v1.0을 신규 작성하였다. Extension Runtime을 Difference로 취급하지 않으며, Builder → Cap → Boundary → Overlay Attach → Render 역할을 분리한다. **코드·Runtime·Builder·Hydrate·Dataset·Search 변경 없음.**

## 배경

- Extension Overlay / Cap / baseline·corrected path는 각각 존재하나, “사용자에게 무엇을 어디까지 보여줄까”는 SSOT 부재
- 증상 분석에서 Extension Layer 숨김만으로는 CASE A(동일 계산 → 동일 표시)와 C4 Minimum이 설명되지 않음
- 근본은 Display Boundary 정책 부재 · baseline의 corrected ceiling 종속 등 **Display Cap/Boundary** 이슈

## 산출물

| 문서 | 내용 |
|------|------|
| `작업관리/DISPLAY_BOUNDARY_POLICY_SSOT.md` | Policy SSOT v1.0 |
| `PROJECT_MASTER_INDEX.md` | v1.52 · 문서 계층·참고·Display 절·차기 우선순위에 등록 |

## 핵심 정책 (요약)

- Extension ≠ Difference · Runtime Geometry는 Boundary 입력 아님
- Cap = 단일 path 절단 · Boundary = 두 path 비교/조립 · Overlay Attach = Boundary 이후
- baseline **C4 Minimum** · corrected second_ball / corrected ceiling **비종속**
- **Continuation Rule** (Cap 하위 · axis long/short) · false → C4 종료 · 실패 segment 미표시
- 구현 전 Architecture Review · 수정 허용 = Cap / Boundary / Overlay Attach only

## Explicit Non-Claims

- 코드 구현 없음
- `TRAJECTORY_EXTENSION_SSOT.md` 미수정
- Builder / Hydrate / Dataset / Search / Extension Runtime / `activateStrategySlot` 미변경
- Commit / Push 없음 (문서 세션 · 사용자 지시 시)

## Next

Architecture Review → Display Cap(C4 Minimum · Continuation · ceiling 해소) → Display Boundary → Overlay Attach 순 구현 검토.

---

# 2026-08-03 ~ 2026-08-04 (Trajectory Extension 완료 · USER Search Runtime Activation)

## 제목

**D-EXT-26** — Trajectory Extension Product Complete · USER Search ↔ Strategy Pick Runtime 경로 통합 (`activateStrategySlot`)

## Summary

Trajectory Extension(궤적 연장) Overlay를 Architecture Freeze(v1.3)부터 구현·통합하고, USER Search에서 Extension이 표시되지 않던 문제를 Runtime Slot Activation 누락으로 확정·해결하였다. Search 전용 Hydrate는 만들지 않았고, 공략 버튼(`pickStrategySlot`)과 동일한 `activateStrategySlot()` 경로만 공유한다. **Trajectory Extension Task Closed.**

---

## 1. 문제

USER Search(및 초기 분석 시점의 ADMIN Published Search)에서 Working/Published에 `trajectoryExtensions`가 저장되어 있어도 Extension Layer가 보이지 않았다.

- ADMIN Local DB Recall → Extension 표시 **정상**
- SAVE → Working Dataset → Export → `positions.json`에 `strategies.S*.trajectoryExtensions` **존재**
- `buildDraftsFromRecord` / `draftRuntimeFieldsFromStrategyEntry`는 payload를 draft에 **정상 복사**

---

## 2. 원인 분석

조사 순서: Published Leaf → SAVE → Hydrate whitelist → Render → **USER Runtime gate**.

| 기각 / 부차 | 내용 |
|-------------|------|
| Export Builder strip | Export는 StrategyEntry pass-through · 필드 유지 |
| `buildDraftsFromRecord` 누락 | whitelist에 `trajectoryExtensions` 포함 |
| 다른 Position 오선택 | 희소 데이터·`userStrict`에서 주원인 아님 (부차: cache stale 가능) |

**최종 원인:** USER Search 성공 후 `userTableDisplaySlotId`를 설정하지 않음.

```text
applyUserSearchRecall  →  slot.draft.trajectoryExtensions = O
        ↓
userTableDisplaySlotId 미설정 (null)
        ↓
App Extension hydrate effect
  if (!userTableDisplaySlotId) {
    setTrajectoryExtensionDraft(null);
    return;
  }
        ↓
extensionDraftCount === 0 → TrajectoryExtensionLayer 미마운트
```

기존 SSOT는 “공략 클릭 시 table hydrate”였고, Search는 draft/labels만 만들었다. Extension Layer는 `userTableDisplaySlotId` 게이트에 묶여 있어 Search 직후 Runtime이 열리지 않았다.

---

## 3. 해결

### `activateStrategySlot(slotId)` (App.jsx)

공용 Runtime Slot Activation (Overlay/UI 제외):

```text
actions.switchSlot(slotId)
  → setUserTableDisplaySlotId(slotId)
  → hydrateSlotRuntime(slotId)
```

- `pickStrategySlot` → Overlay clear 후 **`activateStrategySlot` 호출**
- USER Search 성공 → `resolveUserSearchDisplaySlotId` (activeSlot ∈ record.strategies ? 유지 : S1→S2→S3 첫 슬롯) → **`activateStrategySlot`만 호출**
- Search 전용 Hydrate / Extension / Trajectory 경로 **없음**
- `applyUserSearchRecall`은 `flushSync`로 커밋 후 Activation (stale slots 방지 · `shotEditorRef`)

### SSOT

`TRAJECTORY_EXTENSION_SSOT.md` → **v1.4** (Runtime Flow · Search/Pick 공유 · Search-only Hydrate 부재 명시).

---

## 4. 결과

| 검증 | 결과 |
|------|------|
| ADMIN Local DB Recall | 정상 |
| ADMIN Published Search | 정상 |
| USER Search | 정상 (Extension/Trajectory/Target/Layer) |
| SAVE → Refresh → Recall | 정상 |
| Strategy Slot 전환 / Pick | 정상 (`activateStrategySlot` 공유) |
| ADMIN ↔ USER 전환 세션 리셋 | 정상 |
| Extension Handle | 정상 (Handle First Drag 잔여 간섭은 후속 후보) |

**Trajectory Extension 기능 완료 (Task Closed).**

---

## Decision Log (본 항목)

| ID | Decision |
|----|----------|
| **D-EXT-26** | USER Search와 Strategy Pick은 `activateStrategySlot()` 단일 Runtime Activation 경로를 공유한다. Search 전용 Hydrate를 만들지 않는다. |

---

## 변경 파일 (구현 세션 · 문서 세션 제외)

| 파일 | 내용 |
|------|------|
| `frontend/src/App.jsx` | `activateStrategySlot` · `resolveUserSearchDisplaySlotId` · Search/`pickStrategySlot` 통합 · `shotEditorRef` |
| `frontend/src/application/flows/userSearchFlow.ts` | 성공 시 matched `PositionRecord` 반환 |
| (선행) Extension Domain / SAVE / Hydrate whitelist / Layer | S1–S3 · Role · Projection 등 |

---

## Explicit Non-Claims

- Trajectory Builder · Formula · Display Cap · Runtime Contract · Dataset Formula **미수정**
- Search 전용 Hydrate 엔진 **미도입**
- Handle First Drag 잔여 간섭 **미해결** (후속)
- Commit / Push (문서 세션) **없음**

---

## Current Status

```text
Trajectory Extension     : Completed / Task Closed (SSOT v1.4)
USER Search Runtime      : activateStrategySlot 통합
ADMIN / USER paths       : Runtime Activation 공유
Build / Lint             : PASS (구현 세션 기준)
Next (Product)           : Handle Drag 잔여 또는 차기 기능
```

## Next

Handle First Drag 잔여 간섭 정리, 또는 신규 Product 세션. 상세는 `CURSOR_SESSION_HANDOFF.md`.

---

# 2026-08-01 (SYS Apply 백지화 해결 · Runtime Contract SSOT 완성 · ModalShell Native Selection 제거)

## 제목

**D-RTC-01 / D-OVLSEL-01** — `buildSlotDraftWithUpdatedSys()` legacy `profile` dangling reference 제거 · ModalShell open 시 browser native Selection 초기화

## Summary

관리자 SYS 설정에서 **적용(Apply)** 을 누르면 화면 전체가 백지화되던 오류와, 새로고침 후 **첫 SYS Overlay**를 열 때 패널 텍스트가 파랗게 선택 표시되던 오류를 각각 해결하였다.

백지화의 원인은 `useShotSlots.ts`의 `buildSlotDraftWithUpdatedSys()`가 Batch 6 Runtime Contract 이관 후에도 남아 있던 **선언되지 않은 `profile` 변수**를 debug 필드에서 참조하던 것이다. `commitDraftSys` 경로의 React render phase에서 `ReferenceError`가 발생했고, ErrorBoundary가 없어 React root 전체가 unmount되었다. 같은 함수가 이미 Runtime Contract에서 해석해 둔 `formulaExpr`을 재사용하도록 바꿔, 해당 함수의 마지막 legacy 직접 참조를 제거하고 **Runtime Contract SSOT를 완성**하였다.

파란 selection highlight는 Interaction 문제가 아니라 **브라우저 native text selection의 잔존**이었다. Target Ball 더블클릭이 만든 Selection Range가 살아 있는 상태에서 ModalShell panel DOM이 삽입되면, 새 텍스트가 그 Range에 편입되어 highlight로 렌더된다. ModalShell이 열릴 때 1회 `window.getSelection()?.removeAllRanges()`를 호출해 native Selection만 초기화하는 방식으로 해결하였다. Pointer Capture / `preventDefault` / dblclick 로직 / `user-select` CSS는 일절 변경하지 않았다.

---

## 1. SYS Apply 백지화 (D-RTC-01)

### 문제

- ADMIN에서 기존 포지션을 불러와 SYS 값을 수정하고 **적용**을 누르면 화면 전체가 백지화
- Console: `Uncaught ReferenceError: profile is not defined at buildDraftWithUpdatedSys (useShotSlots.ts:315:17)`
- 사용자 체감상 "신규 포지션은 정상, 기존 포지션만 실패"로 보였음

### Root Cause

`frontend/src/hooks/useShotSlots.ts` `buildSlotDraftWithUpdatedSys()` 내부 debug 필드가 **선언되지 않은 `profile` 변수**를 참조하고 있었다.

```text
Batch 6 Runtime Contract 이관
    ↓
system JSON 직접 접근(profile) → getSystemContract() 경유로 전환
    ↓
같은 함수 상단은 formulaExpr 로 정상 이관됨 (line 255)
    ↓
debug.expr 한 줄만 legacy profile 참조로 잔존 (line 315)
    ↓
commitDraftSys → setState updater(render phase)에서 ReferenceError
    ↓
ErrorBoundary 부재 → React root unmount → 백지 화면
```

**신규 / 기존 포지션 차이에 대한 정정**

오류는 포지션 종류와 무관하게 `commitDraftSys`가 호출될 때마다 발생한다. 새로고침 직후에는 SYS Overlay 컨트롤을 활성화하기 위해 Target Ball 더블클릭이 선행되어야 하고, 그 경로를 거친 뒤에야 Apply에 도달하기 때문에 "기존 포지션에서만 발생"하는 것처럼 관측된 것이다.

### 해결 내용

이미 같은 함수에서 Runtime Contract로 해석해 둔 `formulaExpr`을 재사용한다.

```text
line 255 : const formulaExpr = getSystemContract(nextSystemId)?.profile?.formulaExpr ?? null;
line 315 : expr: profile?.formula?.expr ?? null   →   expr: formulaExpr
```

- 변경 1줄 · 계산 결과에 영향 없음 (debug 표시 필드)
- System JSON 직접 접근 경로가 사라져 해당 함수의 Runtime Contract 경유가 완성됨

### 정적 분석이 놓친 이유

| 도구 | 사유 |
|------|------|
| Build (`vite build`) | `tsc --noEmit` 미포함 — 타입 체크 없이 transpile only |
| Lint (`eslint .`) | `eslint.config.js`의 `files: ['**/*.{js,jsx}']` — `.ts` 파일 미검사 |

> **후속 후보(미적용):** build에 `tsc --noEmit` 추가 또는 ESLint 대상에 `.ts` 포함. 이번 세션 범위 외.

### Commit

`abeca84` — fix(sys): resolve blank screen on SYS apply by removing legacy profile reference

---

## 2. ModalShell Native Selection (D-OVLSEL-01)

### 문제

- 관리자 새로고침 → Target Ball 더블클릭 → SYS Overlay 오픈
- **첫 오픈에서만** 패널 텍스트 전체가 파란 selection highlight 상태로 표시
- 닫았다 다시 열면 정상

### Root Cause

**Pointer Capture / Interaction 문제가 아니다.** 브라우저 native text selection의 잔존이다.

```text
Target Ball 더블클릭 (native dblclick 보존 정책에 따라 preventDefault 없음)
    ↓
브라우저가 Selection Range 생성 (word/paragraph 단위)
    ↓
Range가 해제되지 않은 채 유지
    ↓
SYS Overlay(ModalShell) panel DOM 삽입
    ↓
새 텍스트 노드가 기존 Range 범위 안에 편입
    ↓
selection highlight 렌더
```

"첫 오픈에서만" 발생하는 이유는, SYS 버튼이 Target Ball 더블클릭 이후에만 활성화되기 때문이다. 즉 Overlay를 열기 직전 동작이 반드시 더블클릭이며, 그 더블클릭이 남긴 Selection이 그대로 Overlay에 걸린다. 두 번째 오픈부터는 직전 상호작용이 더블클릭이 아니므로 재현되지 않는다.

**기여 조건**

- `.modal-panel` / `.modal-panel--sys`에 `user-select` 규칙 없음
- `::selection` 커스텀 규칙 없음 (브라우저 기본 파란색)
- `handlePointerDown`은 native dblclick 보존을 위해 `preventDefault()`를 호출하지 않음 (Pointer Capture Timing SSOT)
- `handleBallDoubleClickForTarget`의 `preventDefault()`는 Selection이 이미 생성된 뒤라 시점상 무효
- ModalShell이 mount 시 Selection / focus를 정리하지 않음

### 해결 내용 (Option A)

ModalShell이 열릴 때 1회 native Selection만 초기화한다.

```text
frontend/src/components/common/ModalShell.jsx

useEffect(() => {
  if (!open) return;
  window.getSelection()?.removeAllRanges();
}, [open]);
```

- ModalShell은 닫혀 있을 때 `null`을 렌더링하되 컴포넌트 자체는 mount 상태로 남으므로, 실제 panel DOM이 삽입되는 `open === true` 전환을 기준으로 한다.
- 기존 drag-state 초기화 effect에 병합하지 않고 전용 effect로 분리하여 의도와 롤백 경계를 명확히 유지한다.
- **파일 표기 정정:** 프로젝트에 `ModalShell.tsx`는 존재하지 않는다. 실제 파일은 `ModalShell.jsx`이다.

### 절대 변경하지 않은 것

Pointer 이벤트 · `preventDefault` 추가 · dblclick 로직 · `user-select` CSS · Ball / Pad / SVG Interaction · Pointer Capture Timing. **Native Selection 초기화 외 리팩터링 없음.**

### Commit

`7ef9601` — fix(overlay): clear stale native selection when ModalShell opens

---

## 검증 결과

localhost dev server(`5175`)에서 브라우저 직접 검증.

### 대조군 (Selection 소멸 원인 귀속)

| 절차 | rangeCount |
|------|-----------|
| Selection 생성 후 **비 Overlay 버튼** 프로그램 클릭 | 1 → **1** (유지) |
| Selection 생성 후 **SYS Overlay 오픈** | 1 → **0** (초기화) |

비 Overlay 클릭에서는 Selection이 유지되므로, Overlay 오픈 시의 소멸은 ModalShell effect에 귀속된다.

### 기능 / Regression

| 항목 | 결과 |
|------|------|
| SYS Overlay 파란 Selection Highlight | **없음** |
| SYS 계산 | 정상 (C0=50 · C1=70 → C3 자동 -20 · 기준 계산 블록 렌더) |
| SYS 적용 (`commitDraftSys`) | 정상 · 백지화 없음 · 궤적 반영 |
| HP/T Overlay | 정상 (오픈 · 렌더 · 닫기 · Selection 0) |
| STR Overlay | 정상 (오픈 · 렌더 · 닫기 · Selection 0) |
| AI Overlay | 정상 (오픈 · 렌더 · 닫기 · Selection 0) |
| Workspace History Modal (동일 ModalShell 소비자) | 정상 · Selection 0 |
| Target Ball DoubleClick | 정상 (SYS 버튼 disabled → enabled 전환 확인) |
| Ball Drag | 정상 (요청 좌표 (875,690) 정확 도달) |
| Pointer Capture 시점 | **pointermove에서 획득** — Pointer Capture Timing SSOT 유지 확인 |
| Pad Drag (Joystick) | 정상 (gain 비율대로 공 추종) |
| Console Error | **0건** (전 과정) |
| Fresh Load | 정상 렌더 · 에러 0 |
| Build | **PASS** (`vite build` 5.68s) |
| Lint | **PASS** — 변경 전/후 동일 (`ModalShell.jsx` 기존 `react-hooks/refs` 1건만, 신규 0) |
| Regression | **없음** |

> **검증 한계 (Explicit):** 브라우저 자동화 도구의 왕복 지연이 dblclick 임계시간보다 길어, 두 번의 물리 클릭으로는 native dblclick이 성립하지 않았다. Target Ball DoubleClick 항목은 `dblclick` 이벤트 직접 dispatch로 검증하였다. 실제 마우스 더블클릭 육안 확인은 별도 권장.

---

## Decision Log

| ID | Decision |
|----|----------|
| **D-RTC-01** | Runtime Contract 이관 대상 함수는 debug / 표시 전용 필드까지 포함하여 System JSON 직접 접근을 남기지 않는다. Contract에서 이미 해석된 값을 재사용한다. |
| **D-OVLSEL-01** | ModalShell은 `open` 전환 시 1회 `window.getSelection()?.removeAllRanges()`로 browser native Selection을 초기화한다. |
| **D-OVLSEL-02** | Overlay는 **browser selection 상태만** 초기화한다. Pointer Capture / Ball / Pad Interaction은 변경하지 않는다. Selection 문제를 `preventDefault` 추가나 `user-select` CSS로 해결하지 않는다. |

---

## 변경 파일 / 함수

| 파일 | 함수 / 위치 | 내용 |
|------|-------------|------|
| `frontend/src/hooks/useShotSlots.ts` | `buildSlotDraftWithUpdatedSys()` line 315 | `profile?.formula?.expr ?? null` → `formulaExpr` |
| `frontend/src/components/common/ModalShell.jsx` | `ModalShell` — `open` 전용 `useEffect` | native Selection 1회 초기화 |

---

## Explicit Non-Claims

- SYS 계산 엔진 · Formula · Registry · Dataset 변경 **없음**
- Pointer Capture Timing (D-INTERACT-01~03) 변경 **없음**
- `preventDefault` 추가 **없음** · `user-select` CSS 추가 **없음**
- Ball / Pad / SVG Interaction 변경 **없음**
- USER Overlay(`UserOverlayShell`) 변경 **없음** — ModalShell은 ADMIN 계열 모달 전용
- ErrorBoundary 도입 **없음** (후속 후보)
- build `tsc --noEmit` / ESLint `.ts` 포함 **미적용** (후속 후보)

---

## Interaction / Overlay SSOT

Overlay native Selection 규칙은 `2_FRONTEND_ARCHITECTURE_BASELINE_v1.md` **§Overlay Native Selection (Interaction SSOT)** 에 고정한다.

---

## Current Status

```text
Pointer Capture Timing   : 안정 (D-INTERACT-01~03 유지)
Target Ball DoubleClick  : 안정
Runtime Contract SSOT    : 완료 (legacy profile dangling reference 제거)
SYS Apply 백지화          : 해결
ModalShell Selection      : 해결
Build                    : PASS
Lint                     : PASS
Regression               : 없음
Commit                   : abeca84 · 7ef9601
```

## Next

~~**Trajectory Extension 설계**~~ → **Completed (2026-08-03~04)**. 상단 최신 로그 · `CURSOR_SESSION_HANDOFF.md` 참조.

---
