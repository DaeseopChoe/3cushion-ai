# SESSION TRANSFER — Family Data Architecture / Normalized Storage

| Field | Value |
|-------|--------|
| **Date** | 2026-08-20 |
| **Checkpoint** | Phase **3A-326** — Normalized Shadow Dual-Write **COMPLETE** |
| **Documentation checkpoint** | Phase **3A-328** — Session Handoff SSOT Documentation Update **COMPLETE** |
| **Transfer document** | Phase **3A-329** |
| **Current production READ** | **LEGACY** / `positions_dataset` |
| **Normalized production READ** | **OFF / BLOCKED** |
| **Feature flag** | `FAMILY_NORMALIZED_STORAGE_ENABLED = false` |
| **Commit / Push** | **NOT PERFORMED** |

> **IMPORTANT**  
> This document is a **handoff / navigation** document.  
> `PROJECT_MASTER_INDEX.md` and `HISTORY/PROJECT_LOG_2026-08.md` remain **authoritative**.  
> Architecture definitions must be verified against their corresponding SSOT documents.  
> If this transfer conflicts with INDEX / LOG / subsystem SSOT, **do not invent a synthesis** — re-read the authoritative sources.

---

## 1. Executive Handoff Summary

- Family Data Architecture **normalization** is in progress (uncommitted working tree).
- Phases **3A-320 → 3A-326** covered: design audit → storage schema → migration → compatibility read → gated-read audit → **shadow dual-write**.
- Docs **3A-327** (audit) + **3A-328** (INDEX / LOG / DRAFT update) made the checkpoint recoverable for a new session.
- Normalized storage **physically exists**: `family_masters` / `family_members` receive **shadow writes**.
- **Production corpus SSOT is still `positions_dataset`.**
- Production normalized READ is **not** enabled.
- `FAMILY_NORMALIZED_STORAGE_ENABLED = false`.
- SAVE / Derived Approval / Import → normalized **shadow dual-write** is **COMPLETE**.
- **SearchIndex** is **NOT IMPLEMENTED**.
- History restore policy is **not** finally cut over (H3 pending).
- Approval History **+1** is **intentionally KEPT**.
- **Next step is NOT gated READ implementation.**
- Next: **Ask-only** audit of **generation/freshness + cleanup `family_*` + History H3**, then infrastructure as needed.

**Do not treat “dual-write COMPLETE” as “normalization COMPLETE.”**

---

## 2. Why This Architecture Work Started

Legacy workspace History snapshots embed a full `state.dataset`. SAVE and Approval can therefore *look like* two persistent corpora (e.g. v007 / v008). That confuses **workspace restore** with **persistent member corpus**.

**TARGET separation (design):**

| Concern | Role |
|---------|------|
| **History** | Workspace / session restore — **≠** persistent Member DB |
| **FamilyMember** | Persistent member corpus SSOT (TARGET) |
| **SearchIndex** | Rebuildable locator / search acceleration — **≠** common-payload SSOT |

Separating these three roles is the core of Family Normalization. Detail: `FAMILY_DATA_ARCHITECTURE_DRAFT.md` (CURRENT vs TARGET) · LOG Phase 3A-320.

---

## 3. v007 / v008 Semantic Decision

Confirmed in Phase **3A-320** (Ask). Preserve the **three axes**:

| Axis | Result | Meaning |
|------|--------|---------|
| **Visual equality** | **YES** | SAVE (S0) and Approval (S1) both restore visible/runtime **baseline A** — screens can look identical **by design** |
| **Serialized equality** | **NO** | S0: 4-track base, no approved Derived. S1: 4-track + approved Derived — `state.dataset` differs |
| **Functional equality** | **NO** | S0 restore can drop Derived from working corpus. S1 restore can recover approved Derived |

**Do not** treat History v007/v008 as metadata-only duplicates and delete one.

**TARGET Export:** persistent corpus = Master + Members; History is workspace-only — so “dedupe v007+v008 corpus for Export” should stop being the core problem.

**CURRENT Export:** legacy behavior **unchanged** through 3A-326. Do **not** confuse TARGET Export with current implementation.

---

## 4. Phase-by-Phase Reconstruction (3A-320 → 3A-328)

Authoritative detail: `HISTORY/PROJECT_LOG_2026-08.md`. This section is a navigation map only.

### 3A-320 — SAVE vs Approval History Semantic Diff Audit

| Field | Content |
|-------|---------|
| **Mode** | Ask |
| **Purpose** | Are SAVE and Approval History snapshots accidental duplicates? |
| **Decision** | Visual **YES** · Serialized **NO** · Functional **NO**. S1 is post-approval corpus restore point today. **TEMPORARILY KEEP** Approval History **+1**. Remove only after Members + SearchIndex + H3 + product contract. History ≠ Member DB. Export TARGET ≠ History-row merge. |
| **Files** | Docs / decisions only |
| **Tests** | N/A |
| **Production impact** | None (audit) |
| **NOT done** | History +0 · Export change |
| **Next** | Phase A storage |

### 3A-321 — Normalized Family Storage Phase A

| Field | Content |
|-------|---------|
| **Mode** | Agent |
| **Purpose** | Physical FamilyMaster / FamilyMember schema, stores, hydrate/split |
| **Implementation** | Schema · `family_masters` / `family_members` · hydrate/split · validation · flag |
| **Important files** | `familyNormalizedSchema.ts` · `familyNormalizedFlag.ts` · `familyNormalizedStore.ts` · `familyHydrate.ts` · `familyNormalizedStorage.test.ts` · `index.ts` · `familyMigrationDebt.ts` |
| **Flag** | `false` |
| **App wiring** | **None** |
| **Fixture** | 1 Master + 16 Members · orphan 0 · duplicate memberId 0 · no common payload on Members |
| **Tests** | storage **12/12** · Approval regression **10/10** |
| **Production impact** | SAVE/Approval/Search/History unchanged |
| **NOT done** | Dual-write · production READ |
| **Next** | Phase B migration audit |

### 3A-322 — Phase B Migration & Compatibility Read Audit

| Field | Content |
|-------|---------|
| **Mode** | Ask |
| **Purpose** | Is infrastructure-only Phase B safe? |
| **Decision** | Yes. Migrate from `positions_dataset` / working dataset / explicit Import. **Never** use `workspace_history` as Member DB / bulk migration source. AUTHORED Master seed required fail-safe. familyId-only dedup **FORBIDDEN**. Member: `memberId` + `genericFamilyMemberIdentityKey`. History ≠ Member DB. Flag stays OFF. Approval History +1 KEEP. |
| **Production impact** | None (audit) |
| **Next** | B1–B4 migration Agent |

### 3A-323 — B1–B4 Migration Infrastructure

| Field | Content |
|-------|---------|
| **Mode** | Agent |
| **Purpose** | `migratePositionRecordsToFamilyParts` + `persistMigratedFamilyParts` |
| **Important files** | `migratePositionRecordsToFamilyParts.ts` (+ test) · `familyNormalizedStore.ts` · `index.ts` |
| **Contracts** | Exactly one AUTHORED seed · `NO_AUTHORED_SEED` / `MULTIPLE_AUTHORED_SEEDS` / `COMMON_PAYLOAD_CONFLICT` · no invented Master · no silent merge · 3-ball exact · Derived lineage · idempotency |
| **Tests** | migration **16/16** · storage **12/12** · Approval **10/10** |
| **Production impact** | Legacy paths untouched · flag false |
| **Next** | B5 compatibility read |

### 3A-324 — B5 Compatibility Read Adapter

| Field | Content |
|-------|---------|
| **Mode** | Agent |
| **Purpose** | Master + Members → `PositionRecord[]` (fail-closed) |
| **Important files** | `loadFamilyCompatibleDataset.ts` (+ test) · `index.ts` |
| **Contracts** | No partial normalized dataset · 3-ball exact · AUTHORED/SYMMETRY/DERIVED preserved · fixture 1+16 → 16 hydrated |
| **Tests** | **54/54** (16+16+12+10) |
| **Production impact** | No App wiring · flag false |
| **Next** | B6 gated-read pre-audit |

### 3A-325 — B6 Gated-Read Pre-Implementation Audit

| Field | Content |
|-------|---------|
| **Mode** | Ask |
| **Purpose** | Can production normalized READ be enabled? |
| **Decision** | **NORMALIZED PRODUCTION READ = BLOCKED.** SAVE/Approval/Import/History did not yet update `family_*` → flag ON risks **stale** stores. Dual-write first. SearchIndex **not** dual-write prerequisite. Need generation/freshness marker · cleanup `family_*` · History **H3**. |
| **Production impact** | None (audit) |
| **Next** | Dual-write Agent |

### 3A-326 — Normalized Shadow Dual-Write Complete

| Field | Content |
|-------|---------|
| **Mode** | Agent |
| **Purpose** | Shadow-sync `family_*` after SAVE / Approval / Import |
| **Important files** | `syncPositionDatasetToNormalizedFamilyStore.ts` · `normalizedDualWrite.test.ts` · `saveFlow.ts` · `derivedApprovalFlow.ts` · `App.jsx` (Import) · `index.ts` |
| **Pipeline** | migrate → persistMigratedFamilyParts → validateFamilyStore |
| **Failure policy** | Legacy write first · normalized failure must **not** rollback `positions_dataset` |
| **History** | SAVE **+1** · Approval **+1** · Cancel **+0** — **unchanged** |
| **Tests** | **75/75** (historical at completion) |
| **Production impact** | READ still `positions_dataset` · flag false · Search/Export/geometry/HPT/symmetry/Physical Target unchanged |
| **NOT done** | Normalized READ · SearchIndex · H3 · freshness · cleanup · History +0 |
| **Next** | Docs handoff · then Ask prerequisites |

### 3A-327 — Session Handoff / SSOT Documentation Audit

| Field | Content |
|-------|---------|
| **Mode** | Ask |
| **Purpose** | Can a new session recover state from INDEX + LOG? |
| **Decision** | INDEX/LOG were stale at 3A-3E → update required. CURRENT vs TARGET must be separated in DRAFT. No code changes. |
| **Next** | 3A-328 docs Agent |

### 3A-328 — Session Handoff SSOT Documentation Update

| Field | Content |
|-------|---------|
| **Mode** | Agent (docs only) |
| **Modified** | `PROJECT_MASTER_INDEX.md` · `HISTORY/PROJECT_LOG_2026-08.md` · `FAMILY_DATA_ARCHITECTURE_DRAFT.md` |
| **Result** | INDEX points at 3A-326 · LOG has 3A-320…326 · DRAFT CURRENT vs TARGET split |
| **NOT done** | Code · Commit · Push |
| **Next** | This transfer document (3A-329) → new session Ask |

---

## 5. CURRENT Architecture Contract

| Layer / Item | CURRENT state |
|--------------|----------------|
| `positions_dataset` | **Production corpus SSOT** · production READ · primary legacy WRITE corpus |
| React `dataset` | Runtime mirror |
| `family_masters` | Normalized **shadow** common-family store |
| `family_members` | Normalized **shadow** member store |
| `workspace_history` | Workspace save-event snapshots — **NOT** Member DB |
| SearchIndex | **NOT IMPLEMENTED** |
| `FAMILY_NORMALIZED_STORAGE_ENABLED` | **false** |
| Normalized production READ | **OFF / BLOCKED** |
| SAVE normalized dual-write | **COMPLETE** |
| Derived Approval normalized dual-write | **COMPLETE** |
| Import normalized dual-write | **COMPLETE** |
| History restore → normalized sync | **NOT YET CONTRACTED** |
| cleanup `family_*` preservation | **NOT YET CONTRACTED** |
| generation / freshness marker | **NOT IMPLEMENTED** |

---

## 6. TARGET Architecture

> **TARGET IS NOT CURRENT PRODUCTION STATE.**

| Layer | TARGET role |
|-------|-------------|
| **FamilyMaster** | Family-common **writable physical SSOT** |
| **FamilyMember** | balls `{cue,target,second}` + track + provenance / member-delta **physical SSOT** (no common payload duplicate) |
| **SearchIndex** | Rebuildable 3-ball **locator** — does **not** store family-common payload |
| **History** | Workspace / session snapshot **only** — **not** Member corpus DB |
| **Long-term Approval** | Members (+ SearchIndex update) · History **+0** |
| **Long-term Export** | Hydrate external representation from Master + Members |

---

## 7. Data Contract / Invariants

1. Family common payload lives on **Master** only.  
2. Members must **not** duplicate common payload.  
3. Member balls `cue` / `target` / `second` — **exact numeric** preservation.  
4. Preserve AUTHORED / SYMMETRY / DERIVED provenance.  
5. **familyId-only** dedup is **FORBIDDEN**.  
6. `memberId` / logical identity conflicts → **fail closed**.  
7. Do **not** invent Master seeds.  
8. Do **not** use History as Member DB migration source.  
9. Do **not** partial-read a corrupt normalized store.  
10. Do **not** enable production normalized READ until **freshness** is proven (schema-valid ≠ current generation).

---

## 8. History Contract

### CURRENT

| Event | History |
|-------|---------|
| SAVE | **+1** |
| Derived Approval | **+1** — **KEEP FOR NOW** |
| Cancel / Preview close | **+0** |

- History restore = workspace snapshot restore (typically overwrites working `positions_dataset` / React dataset).  
- History is **NOT** the persistent Member corpus.

### Unresolved

After dual-write, History restore can leave `positions_dataset` at an older generation while `family_*` remain newer (or vice versa) — **divergence**.

### Target orientation (H3) — **NOT IMPLEMENTED**

**H3:** History restores workspace authoring/runtime state; it does **not** roll back persistent FamilyMembers corpus.

Do **not** remove Approval History **+1** until Members + SearchIndex + H3 + product contract are ready.

---

## 9. Export / Import Contract

### Export

- **CURRENT:** legacy behavior **unchanged** (through 3A-326).  
- Normalized Export format: **NOT IMPLEMENTED**.  
- Do **not** treat v007/v008 as simple duplicate corpora for Export merge/dedup.  
- **TARGET:** hydrate export from Master + Members.

### Import

- **CURRENT:** legacy working corpus write + normalized **shadow sync** (3A-326).  
- Import does **not** use History as Member corpus source.

---

## 10. Search / SearchIndex State

- **CURRENT Search:** existing React dataset / `positions_dataset` corpus path.  
- **SearchIndex:** **NOT IMPLEMENTED**.  
- Design: rebuildable from FamilyMember 3-ball (`cue` / `target` / `second`).  
- SearchIndex was **not** a dual-write prerequisite.  
- Separate Phase required before Search cutover / normalized READ completion.

---

## 11. What Is COMPLETE

- [x] v007/v008 semantic audit (Visual YES / Serialized NO / Functional NO)  
- [x] FamilyMaster schema  
- [x] FamilyMember schema  
- [x] normalized stores (`family_masters` / `family_members`)  
- [x] split / hydrate  
- [x] migration infrastructure  
- [x] migration validation  
- [x] compatibility read adapter  
- [x] SAVE shadow dual-write  
- [x] Derived Approval shadow dual-write  
- [x] Import shadow dual-write  
- [x] provenance preservation  
- [x] 3-ball exact preservation  
- [x] History +1 temporary policy documented  
- [x] CURRENT vs TARGET docs separated (DRAFT)  
- [x] INDEX updated (3A-328)  
- [x] LOG updated through 3A-326 (3A-328)  
- [x] normalized production READ intentionally kept **OFF**  

---

## 12. What Is NOT COMPLETE

- [ ] generation / freshness marker  
- [ ] `positions_dataset` ↔ `family_*` generation consistency contract  
- [ ] cleanup / `preserve_dataset` policy for `family_*` keys  
- [ ] History **H3** restore contract  
- [ ] History restore / normalized corpus interaction implementation  
- [ ] SearchIndex  
- [ ] SearchIndex rebuild  
- [ ] gated normalized-read audit **after** prerequisites  
- [ ] normalized READ production enablement  
- [ ] flag/mode rollout design beyond boolean  
- [ ] legacy corpus retirement  
- [ ] Approval History **+0** transition  
- [ ] normalized Export cutover  

**“dual-write COMPLETE” ≠ “normalization COMPLETE.”**

---

## 13. Remaining Mission — Exact Order

### NEXT IMMEDIATE PHASE — **ASK ONLY**

**Topic:** generation/freshness marker **+** cleanup `family_*` preservation **+** History restore **H3**  

Audit these three as one **normalized READ prerequisite contract** (interactions, not three isolated tickets).

### Recommended sequence

1. generation / freshness contract  
2. cleanup / `preserve_dataset` `family_*` key policy  
3. History restore **H3** contract  
4. Infrastructure implementation only after the above Ask settles  
5. SearchIndex + rebuild  
6. gated normalized-read audit  
7. controlled normalized READ rollout  
8. Later: legacy retirement · Approval History +0 · Export transition  

> **The next Phase is NOT gated READ implementation.**

---

## 14. Why Next Phase Must Be Ask First

generation marker, cleanup behavior, and History restore are not independent — they all answer:

> Are legacy corpus and normalized shadow the **same generation**?

Example risk: `positions_dataset` = generation **B**, `family_*` = generation **A**, but schema validation still **passes** → store is valid yet **stale**.

Distinguish **schema validity** from **freshness validity**.

Also: `preserve_dataset` cleanup may delete `family_*`; History restore may rewind only `positions_*` — both require policy **before** read gating.

**Do not start Agent coding on gated READ in the new session.**

---

## 15. Protected / Do-Not-Touch Areas

During the next Ask (and until a later Phase explicitly authorizes changes):

**DO NOT MODIFY**

- App production read wiring  
- `FAMILY_NORMALIZED_STORAGE_ENABLED = true`  
- Search behavior / SearchIndex implementation  
- Export format  
- History +1 semantics  
- geometry · generators · symmetry · HPT / handedness · Physical Target  
- ball coordinate contracts · calculation rules · trajectory system  
- existing uncommitted Phase 3A work  

**Also forbidden unless a later Phase explicitly instructs:**

- `git reset` · `git clean` · `git stash` · checkout restore · revert  
- Commit · Push  

---

## 16. Git / Working Tree Warning

> **CRITICAL — PRESERVE UNCOMMITTED WORK**

This repo has a **large uncommitted Phase 3A tree**. Treat it as valuable in-progress work, not accidental noise.

Especially preserve:

- `frontend/src/domain/family/` (and related family modules)  
- `saveFlow` · `derivedApprovalFlow` · App Import path  
- related tests  
- documentation already updated in 3A-328  

New session: **observe** git status only. Do **not** reset / clean / stash / revert.

If shell git output is unavailable or unclear, **do not invent** a “clean tree” claim.

Commit / Push: **only when the user explicitly requests.**

---

## 17. Source-of-Truth Reading Order (New Session)

### Tier 1 — mandatory

1. `작업관리/PROJECT_MASTER_INDEX.md`  
2. `작업관리/SESSION_TRANSFER_2026-08-20_FAMILY_NORMALIZATION.md` (this file)  
3. `작업관리/HISTORY/PROJECT_LOG_2026-08.md`  

### Tier 2 — architecture for next task

4. `작업관리/FAMILY_DATA_ARCHITECTURE_DRAFT.md`  
5. `작업관리/3_SYSTEM_ARCHITECTURE.md`  
6. `작업관리/4_CALCULATION_RULES.md`  

### Tier 3 — only when needed

7. `작업관리/2_FRONTEND_ARCHITECTURE_BASELINE_v1.md`  
8. `작업관리/DISPLAY_BOUNDARY_POLICY_SSOT.md`  
9. Overlay layout SSOT (as applicable)  
10. Other subsystem-specific SSOT docs  

**Conflict rule:** Transfer vs SSOT → prefer latest **INDEX / LOG** and the **subsystem SSOT**. Do not free-form merge.

---

## 18. Mandatory Files to Upload to New Chat

### REQUIRED MINIMUM SET

| # | File | Role |
|---|------|------|
| 1 | `작업관리/PROJECT_MASTER_INDEX.md` | Top-level Current Mission / Next Track pointer |
| 2 | `작업관리/SESSION_TRANSFER_2026-08-20_FAMILY_NORMALIZATION.md` | This handoff / checkpoint restore |
| 3 | `작업관리/HISTORY/PROJECT_LOG_2026-08.md` | Phase 3A-320…326 decisions, files, tests |
| 4 | `작업관리/FAMILY_DATA_ARCHITECTURE_DRAFT.md` | CURRENT vs TARGET Master/Member/SearchIndex/History |

### STRONGLY RECOMMENDED (technical continuation)

| # | File | Role |
|---|------|------|
| 5 | `작업관리/3_SYSTEM_ARCHITECTURE.md` | System architecture boundaries |
| 6 | `작업관리/4_CALCULATION_RULES.md` | Calculation / system-value SSOT — Family storage must not invade |

### OPTIONAL / LOAD WHEN NEEDED

| # | File |
|---|------|
| 7 | `작업관리/2_FRONTEND_ARCHITECTURE_BASELINE_v1.md` |
| 8 | `작업관리/DISPLAY_BOUNDARY_POLICY_SSOT.md` |
| 9 | Overlay layout SSOT |
| 10 | Other subsystem docs as the Ask requires |

---

## 19. New Chat Bootstrap Prompt

Copy-paste into a new ChatGPT / Cursor session:

```text
첨부한 PROJECT_MASTER_INDEX.md,
SESSION_TRANSFER_2026-08-20_FAMILY_NORMALIZATION.md,
HISTORY/PROJECT_LOG_2026-08.md,
FAMILY_DATA_ARCHITECTURE_DRAFT.md를 먼저 읽고
현재 Family Normalization 상태를 복원하라.

현재 checkpoint:
- Phase 3A-326 Normalized Shadow Dual-Write COMPLETE (uncommitted)
- Documentation checkpoint Phase 3A-328 COMPLETE
- Production corpus SSOT = positions_dataset
- family_masters / family_members = normalized shadow
- FAMILY_NORMALIZED_STORAGE_ENABLED = false
- Normalized production READ = OFF / BLOCKED
- Approval History +1 = KEEP FOR NOW
- SearchIndex = NOT IMPLEMENTED

바로 코드를 수정하지 말고,
generation/freshness marker + cleanup family_* preservation + History restore H3
에 대한 Ask-only prerequisite audit부터 이어간다.
다음 단계는 gated READ 구현이 아니다.

기존 uncommitted Phase 3A 작업은 모두 보존한다.
git reset / clean / stash / revert / Commit / Push 금지
(사용자가 나중에 명시적으로 요청하기 전까지).

이관문서는 navigation이다. INDEX와 LOG가 authoritative SSOT이다.
```

---

## 20. Pre-Finish Validation (3A-329 author checklist)

| # | Check | Result |
|---|--------|--------|
| A | CURRENT vs TARGET not mixed | **YES** |
| B | `positions_dataset` = CURRENT production SSOT | **YES** |
| C | `family_*` = CURRENT shadow | **YES** |
| D | dual-write COMPLETE recorded | **YES** |
| E | normalized READ OFF/BLOCKED | **YES** |
| F | flag = false | **YES** |
| G | SearchIndex NOT IMPLEMENTED | **YES** |
| H | Approval History +1 KEEP | **YES** |
| I | History ≠ Member DB | **YES** |
| J | v007/v008 Visual YES / Serialized NO / Functional NO | **YES** |
| K | Export CURRENT legacy unchanged | **YES** |
| L | generation / cleanup / H3 pending | **YES** |
| M | Next = Ask prerequisite audit (not gated READ) | **YES** |
| N | Uncommitted work preservation warning | **YES** |
| O | Required upload file list present | **YES** |

---

## 21. Document Authority Reminder

| Document | Authority |
|----------|-----------|
| `PROJECT_MASTER_INDEX.md` | Status / Current Mission / Next Track |
| `HISTORY/PROJECT_LOG_2026-08.md` | Chronological facts · phase decisions · tests |
| `FAMILY_DATA_ARCHITECTURE_DRAFT.md` | Family design CURRENT vs TARGET |
| **This SESSION_TRANSFER** | Navigation / handoff only — **not** a new SSOT |

---

*End of SESSION TRANSFER — Family Data Architecture / Normalized Storage (Phase 3A-329).*
