# 3Cushion AI - Project Master Index

Version: 2.22
Last Updated: 2026-09-27
Role: **현재 프로젝트 상태 SSOT** (월별 로그 아님) · **Project Entry Point**

> 기능이 완료·변경될 때마다 이 문서만 갱신한다.
> 상세 이력은 `HISTORY/PROJECT_LOG_YYYY-MM.md`에 둔다.
> **폴더·파이프라인 구조 변경** 시 `5_PROJECT_MASTER_STATE_CURRENT.md` 전면 재작성.
> 공식 용어·Official Pipeline: `작업관리/GLOSSARY_SSOT.md` (Terminology Authority).

---

## Milestone — Phase 4 Foundation

| Field | Value |
|-------|--------|
| **Phase** | Phase 4 Foundation |
| **Status** | **COMPLETED** |
| **Date** | 2026-08-06 |
| **Type** | Project Governance (docs only · no code / Architecture Freeze change) |

### Foundation Completion

| Item | Status |
|------|--------|
| Project Constitution | ✓ |
| Official Glossary SSOT | ✓ |
| Session Governance | ✓ |
| Documentation Governance | ✓ |
| Authority Hierarchy | ✓ |
| Official Read Order | ✓ |
| Glossary Consume Policy | ✓ |
| Product Phase Handoff alignment | ✓ |

### Foundation Summary

Phase 4 Foundation established the Project Governance required before Product Pipeline implementation.
All Constitution-level documents are now aligned (MASTER · Architecture Freeze · GLOSSARY · HANDOFF · LOG · Product Phase Handoff).
**Mission 01 · Mission 02 · Mission 03 COMPLETED. Mission 04 ABSORBED. Phase 4 Product Pipeline COMPLETE.**

### Project Status (Current)

| Field | Value |
|-------|--------|
| **Current Phase** | Phase 5 — Search Quality |
| **Phase 4 Product Pipeline** | ✅ **COMPLETED** |
| **Phase 5 Preparation** | ✅ **Cue-Only Edit Snap & Exact Position Replacement** (Authoring) |
| **Phase 5 Mission 01** | ✅ **Real Interpolation COMPLETE** (core engine · separate layer · D3-A) |
| **Product Envelope Static Publisher** | ✅ **COMPLETE** (`690d6fe` · Task #4) |
| **Phase 5 Search Quality Follow-on · Task #5** | ✅ **COMPLETE** (`282c859` · Production RI E2E · Push done) |
| **Phase 5 Mission 02 — Dead Code Cleanup** | ✅ **COMPLETE** (`8bf90b6` · EXIT-AFTER-#4 · **COMPLETE WITH DEFERRED ITEMS**) |
| **Current Mission** | **Session handoff after F-3D** — baseline `b39b676` · see **Current Session Handoff (2026-09-27)** below |
| **Next Track** | Choose **one** open issue from **Current Session Handoff** (USER C2 Display Boundary Ask · HP/T Derived opposite-handed display Ask · other Stage 1 work) — not auto-decided · F-2 · F-3B · F-3B.2 · F-3C · F-3C.2 · F-3D COMPLETE |
| **Phase E** | ✅ **COMPLETE** — Published normalized store · Member-centric Search · RI on-demand rematerialize |
| **Phase F-1** | ✅ **COMPLETE** — Dead Manual Export / folder picker removed · stale flat-authority docs/UI repaired · productionVerify test-local timeout |
| **Phase F-2B** | ✅ **META GATE FIXED** — existing-v2-only `repairLegacyV2MissingMeta` via `rebuildCanonicalMemberMeta`; new-data validators stay strict |
| **Phase F-2C** | ✅ **ORPHAN DISCARD** — Policy D: remove unrecoverable Product-only Family `fm_668fe281…` from 뒤돌리기 v2 leaf · no fake AUTHORED · leaf stays v2 · first-touch dry-run PASS · real Publish still pending |
| **Phase F-2E** | ✅ **PUBLISH OVERWRITE UX** — resolvable same AUTHORED Position+Slot → user confirm → Family-level replacement; existing Published familyId survives; History immutable; C-0 strict |
| **Phase F-2F** | ✅ **CLIENT CONFLICT PRESERVE** — Git browser client keeps top-level `conflict` + `leafRevision` (nested `["conflict"]` parse bug fixed) |
| **Phase F-2G-2** | ✅ **PARTIAL PUBLISH RECOVERED** — WT v3 candidate validated · assume-unchanged cleared target-scoped · data commit/push · PRODUCTION_VERIFIED · History exported pending UI reconcile |
| **Phase F-3B** | ✅ **ADMIN DESTINATION SLOT** — S1/S2/S3 during editing = SAVE destination; edit draft preserved across slot select + failed SAVE; OVERWRITE only on recalled source slot; C-0 unchanged |
| **Phase F-3B.2** | ✅ **4-TRACK FAMILY STRATEGY SLOT INVARIANT** — AUTHORED + H/V/RPI SYMMETRY Members of one Family share the selected S1/S2/S3; no first-empty fallback; any collision fails the whole CREATE; C-0 unchanged; Derived slot semantics not decided |
| **Phase F-3C** | ✅ **COMPLETE** (core + F-3C.2 C2 Family-common: AUTHORED canonical C2 · H/V/RPI projections · edits from any Track canonicalized) — **TRUSTED FAMILY OVERWRITE** — OVERWRITE edits the trusted Family at its stored AUTHORED root (never the Recall entry / screen coordinates); AUTHORED / SYMMETRY / DERIVED Recall equally eligible; Derived Family-common synced; Recall shows 내공/앞공/뒷공 position differences; thickness edit keeps eligibility; C2 reflectionOverride Family-common (F-3C.2) |
| **Phase F-3D** | ✅ **COMPLETE** — **OVERWRITE PRESERVES THE WHOLE FAMILY IDENTITY GRAPH** — Published-only Family first Local OVERWRITE seeds the recalled Family's full normalized graph (Master + every Member incl. Derived) into the working dataset, then the regular OVERWRITE path runs; every memberId / authoringStrategyId / lineage / balls / slot / Member count preserved; C-0 + no-relocation guard fail closed; one atomic persist; SAVE unchanged |
| **Derived Data** | Cue→Impact · C3+ · Unified Review · **Cartesian Product durable** · Atomic 4-track · History/Recall — see below |
| **LocalDB ADMIN Search** | **Euclidean 2.0 Rg / ball** · Role-direct · trajectory proximity ≠ Recall guarantee |
| **ADMIN Recall→Edit** | **Load → editable** · **Undo** (되돌리기) + **Recall** (Origin S0) · SAVE ≠ Origin replace · detail → `TRAJECTORY_EXTENSION_SSOT` §7 |
| **ADMIN Impact CONTACT ownership** | ✅ **COMPLETE** (2026-09-07 · practical PASS) — runtime Impact = CONTACT · temporary `balls.impact` only while dragging · dblclick = nearest-trajectory snap → T/HPT → CONTACT · detail → `HISTORY/PROJECT_LOG_2026-09.md` |
| **ADMIN HP/T zero-tip tipSideIntent** | ✅ **COMPLETE** (2026-09-07 · practical PASS) — UI `tipSideIntent` survives tipCount=0 · left 0 calc == right 0 calc · no fake ε · detail → `HISTORY/PROJECT_LOG_2026-09.md` |
| **SYS Signed Correction Authoring** | ✅ **FINALIZED** (2026-09-15 · manual PASS) — SSOT `SIGNED_CORRECTION_AUTHORING_SSOT.md` · commits `82f8296` + `84b753b` · log: `HISTORY/PROJECT_LOG_2026-09.md` |
| **History / Search Corpus Separation** | ✅ **COMPLETE** — History snapshot load no longer overwrites searchable corpus · independent search pool preserved |
| **USER Search Normalization & Role Permutation** | ✅ **COMPLETE** — 2-way Target/Second permutation · winning matchedBalls preserved · Trajectory Target alignment |
| **ADMIN Target Selection Contract** | ✅ **COMPLETE** — Target defaults to NONE · explicit double-click reassign · non-target search supported |
| **Regression Test Foundation (R01~R24)** | ✅ **COMPLETE** — FAST/CONTRACT/FULL/BUILD 4-tier standardized regression · Full Lifecycle Contract · 98 files/964 tests GREEN |
| **GitHub Actions Regression CI** | ✅ **COMPLETE** — `.github/workflows/regression.yml` · Node 20 LTS · npm ci · contents:read · 4-step fail-fast gate |
| **Ball3 Role SSOT** | **UNCHANGED** — field name == physical role · Physical Color (Red/Yellow) ≠ Logical Role |
| **Product Coverage Display** | APPROVED/History: **persisted Product balls** (not live `buildTrajectory`) |
| **Sample datasets (user)** | ✅ 뒤돌리기 / 옆돌리기 / 뒤돌리기 대회전 **3 set 완성 보고** (4 tracks each) |
| **BUG-A display-cap corner** | ✅ **IMPLEMENTED** (uncommitted) · nearest-rail identity |
| **BUG-B Reset/History stale** | **UNCONFIRMED** · BUG-A 수정 후 재현 필요 · Family와 분리 |
| **Phase 3D AI proofreading latency** | ✅ **COMPLETE** (`6ad91fb` · `gpt-5.6-luna` + `reasoning.effort: "none"`) |
| **Phase 3E USER mobile cold-start / First Visual** | ✅ **COMPLETE · USER ACCEPTED** (3E-1 lazy overlays + 3E-2 `#app-shell`) |
| **USER Cushion Value Focus UI** | ✅ **COMPLETED** (`5c10387` · Production · smartphone manual PASS · FRAME/RAIL presentation SSOT) |
| **Working tree** | Focus UI commit excludes unrelated `positions.json` · `incidenceAngle.ts` **보존** |
| **USER Overlay Centering SSOT** | ✅ **COMPLETE** (2026-08-12 · 브라우저 검증 · build PASS · **Commit/Push 대기**) |
| **ADMIN History Overlay UX** | ✅ **COMPLETE** (2026-08-28 · Selection/Shift/Density/Delete/Sizing · 브라우저 검증 완료 · **Commit/Push 대기**) |
| **Ball Fine Position Controller** | ✅ **COMPLETE** (`1eaf76c` · Desktop PASS · Mobile Production PASS · Admin/User PASS) |
| **Git baseline (pre–Fine Controller)** | `9678b69d0f82b82a685de86cb42eec07e18cb53f` |
| **Mission 01 Export Pipeline** | ✅ **COMPLETED** · **RETIRED Phase B-0** (app no longer writes `product_export/`; offline `product/` package removed) |
| **Mission 02 Published Package Builder** | ✅ **COMPLETED** · **RETIRED Phase B-0** (offline package builder removed with `product/`) |
| **Mission 03 Deployment Workflow** | ✅ **COMPLETED** · **RETIRED Phase B-0** (offline deploy CLI removed with `product/`) |
| **Mission 04 Authoring Integration** | ✅ **ABSORBED** · offline `product pipeline` **RETIRED Phase B-0** |

### Current Session Handoff (2026-09-27)

**Authority:** 본 절 = 새 세션 시작 기준점 (current state pointer). 상세 규칙은 각 Phase 절이 SSOT이며 여기서 재정의하지 않는다.

| Field | Value |
|-------|-------|
| **As of** | 2026-09-27 |
| **Baseline** | `b39b676fafb8805f706496f57df88c7fd2ec5f1d` — fix(overwrite): preserve published family identity graph (HEAD == origin/main) |
| **Last verification (F-3D)** | full 187 files / 2155 tests PASS · `npm run build` PASS · manual browser NOT RUN (browser Local DB = user's real authoring store) |
| **Schema / migration / dataset / History data / Publish** | unchanged through F-3B … F-3D |

| Phase | Status | Commit | Section |
|-------|--------|--------|---------|
| F-3B | COMPLETE | `48726f4` fix(admin): preserve edit draft across strategy slot selection | Phase F-3B |
| F-3B.2 | COMPLETE | `67d67fd` fix(family): keep strategy slot invariant across four tracks | Phase F-3B.2 |
| F-3C | COMPLETE | `58ef947` fix(admin): preserve family root on overwrite recall | Phase F-3C |
| F-3C.2 | COMPLETE | `4e89dca` fix(family): canonicalize c2 reflection across four tracks | F-3C.2 C2 Reflection Family-Common |
| F-3D | COMPLETE | `b39b676` fix(overwrite): preserve published family identity graph | F-3D Full Family Identity Preservation |

**Frozen product meaning (one line each — detail in the cited sections):**

- **SAVE** = CREATE: current screen Position → new Family (new familyId / memberIds); existing Family untouched — also after a Recall. Blocked by C-0; no auto overwrite, no auto slot move. (Save Intent SSOT · F-3C)
- **C-0:** `(positionId, sourceSlot) → at most one familyId`. (Phase C-0)
- **OVERWRITE** = UPDATE of the trusted recalled Family: whichever Member was recalled (AUTHORED / SYMMETRY / DERIVED), the existing Family's Member identity / geometry / Position / Track / Slot / origin / lineage stay; only Family-common strategy values change. (F-3C · F-3D)
- **Published-only first OVERWRITE:** the recalled Family's full normalized graph (FamilyMaster + every FamilyMember) is seeded into the in-memory Local working dataset → existing OVERWRITE path → one atomic persist. Local already holds any Member of that familyId → no seed, Local is the authority, no automatic merge / reconcile. (F-3D)
- **4 Tracks** (B2T_L · B2T_R · T2B_L · T2B_R) = one real Position / strategy / Family shown in four screen orientations → one S1/S2/S3 on all four Tracks; coordinates differ by symmetry. (F-3B.2)
- **Ownership:** FamilyMaster common (SYS inputs · corrections · AI · STR · canonical HP/T incl. thickness) · Track-projected Family-common (`reflectionOverride` C2 · `trajectoryExtensions`: stored per Member, AUTHORED canonical, SYMMETRY projection, C3+ / Product same-track base, Cue→Impact none) · Member identity preserved on OVERWRITE · `meta` derivable. (Field Ownership Matrix)
- **Search / Recall:** approximate Search allowed; the screen is not snapped to the stored Member; notice "유사한 공략을 찾았습니다." with 내공 / 앞공 / 뒷공 differences vs the winning Member (SYMMETRY / DERIVED compared as themselves); no similarity %; informational only. (F-3C Rules)
- **Ball move:** moving 내공 / 앞공 / 뒷공 after Recall clears OVERWRITE eligibility (draft kept, SAVE possible); impact point / thickness edit keeps it. (F-3B · F-3C)
- **Fail closed, never auto-repair:** `POSITION_STRATEGY_SLOT_CONFLICT` · `OVERWRITE_PUBLISHED_SEED_CONFLICT` · `OVERWRITE_PUBLISHED_SEED_INVALID` · `OVERWRITE_FAMILY_GEOMETRY_MISMATCH` · `OVERWRITE_FAMILY_ROOT_MISMATCH` / `_MISSING`. (F-3C · F-3D)

**Open issues (record only — one at a time, each starts as Ask):**

1. **USER C2 Display Boundary** — saved C2 `reflectionOverride` is used by the ADMIN trajectory only; whether USER applies it is undecided.
2. **HP/T Derived opposite-handed display** — possible pre-existing display quirk: a Derived Member recalled on an opposite-handed Track may show canonical HP/T without mirroring. OVERWRITE inverse canonicalization keeps data consistent; display needs its own Ask.
3. **Local ↔ Published divergent graph reconciliation** — same familyId with different graphs is not merged automatically (future architecture).
4. **Recall / Published concurrency / versioning** — no version check when Published changes after Recall (future architecture).
5. **Legacy stale Published SYMMETRY geometry** — OVERWRITE fails closed (`OVERWRITE_FAMILY_GEOMETRY_MISMATCH`); a repair policy only if real cases appear.

Items 3–5 are not promoted to priority features until a real need appears.

**Protected untracked (never modify / delete / stage / commit — not project changes):** `frontend/src/domain/trajectory/incidenceAngle.ts` · `.tmp.driveupload/`

**New session start:** (1) this file (2) latest entry of `HISTORY/PROJECT_LOG_2026-09.md` (3) Git HEAD == origin/main == baseline (4) protected untracked unchanged (5) one open issue at a time. **Next candidates (user decides):** A. USER C2 Display Boundary Ask · B. HP/T Derived opposite-handed display Ask · C. other Stage 1 work.

### USER Display Runtime HPT (2026-09-02)

> **Pointer only** — 상세 완료 기록: `HISTORY/PROJECT_LOG_2026-09.md` 2026-09-02 항목.

| Item | Status |
|------|--------|
| **USER Display Runtime HPT — modal / coaching / table parity** | ✅ **RESOLVED** · Production `73c7ac0` · bundle `index-DBuPhVvp.js` · Android SM-A516N Remote DevTools **VERIFIED** |
| **4-track USER Search (Five-and-Half)** | ✅ **PASS** — B2T_L · B2T_R · T2B_L · T2B_R (Android Production 실기) |
| **Regression baseline** | **FIXED** — `73c7ac0` · 근거 없이 HPT/trajectory 재수정 금지 |
| **Next manual QA** | 옆돌리기 · 뒤돌리기 대회전 · 옆돌리기 대회전 (5&1/2 전체 검증 **미완**) |

### Search & Ball Role Normalization (2026-08-29)

> **Pointer only** — 상세 완료 기록: `HISTORY/PROJECT_LOG_2026-08.md` 2026-08-29 마일스톤.

| Item | Status |
|------|--------|
| **History / Search Corpus Separation** | ✅ **COMPLETE** — `handleLoadWorkspaceSnapshot`의 `positions_dataset` 영속화 및 `dataset` 덮어쓰기 호출 분리. History 스냅샷 복원은 UI 편집 상태만 복원하며 전체 검색 코퍼스 독립성 보장. (`historySearchCorpusSeparation.contract.test.ts` 6 PASS) |
| **Track Symmetry Runtime Hydrate** | ✅ **COMPLETE** — `hydrateFamilyMemberRuntimeHpt` / `hydrateFamilyMemberRuntimeThickness`가 `memberOrigin` 대신 `authoredTrack` vs `requestedTrack`의 handedness 관계(`isOppositeHandedness`)를 기준으로 판정. `AUTHORED`, `SYMMETRY`, `DERIVED_*` 전 영역에서 canonical 유지 및 Thickness sign mirror / hit_point.x mirror 일관 적용. (`adminDerivedPersistenceMarginalSearchLifecycle.contract.test.ts` TEST 1~5 PASS) |
| **History Single Successor SSOT** | ✅ **COMPLETE** — SAVE 시 `runCanonicalSave`에서 단일 후속자 스냅샷(v005)만 기록하고, `commitDerivedApprovalDataset`의 중복 히스토리 커밋 제거. 한 번의 논리적 작업(Recall v004 → Edit → SAVE → Derived Approval) 후 정확히 단일 후속자(`[v004, v005]`)만 생성. (`adminDerivedPersistenceMarginalSearchLifecycle.contract.test.ts` TEST 6 PASS) |
| **ADMIN Initial Target Gate SSOT** | ✅ **COMPLETE** (IMPLEMENTED · AUTOMATED TESTED · BROWSER VERIFIED) — Fresh ADMIN 진입 시 Target 미지정(`isTargetSelected=false`, `targetColor=null`) 상태에서 Impact Ball 및 Cue→Impact 점선 Guide 완전 차단 (`useCoachingController` / `computeCoachingState` ADMIN gate 적용). 명시적 Red/Yellow 더블클릭 시에만 Target 확정 및 Impact/Guide 계산 활성화. Drag는 Target을 선택하지 않음 (`Drag ≠ Target Selection`). (`adminTargetBallRules.contract.test.ts` TEST A~E PASS, Manual Tests 1~3 PASS) |
| **HMR Fresh-State SSOT** | ✅ **COMPLETE** (IMPLEMENTED · AUTOMATED TESTED · BROWSER VERIFIED) — Fresh/view 초기화 effect에서 `actions.clearAdminWorkSlots()`를 실행하여 HMR/새로고침 후 Fresh ball과 stale slot draft(S1)가 결합되는 Mixed Runtime State 방지. History Recall 정상 스냅샷 hydrate는 완전 보존. (`adminTargetBallRules.contract.test.ts` TEST F~G PASS, Manual Test 4 PASS) |
| **ADMIN Target Selection Contract** | ✅ **COMPLETE** — ADMIN 진입 및 Reset 시 Target Ball 기본값을 NONE(`null`)으로 초기화. 더블클릭을 통한 명시적 재지정 지원 및 Target 미지정 상태에서도 전체 코퍼스 검색 보장. (`adminTargetBallRules.contract.test.ts` 19 PASS) |
| **Published Leaf Resolution** | ✅ **COMPLETE** — USER Search에서 stale `shotType` 단일 leaf 잠금 제거, 모든 활성 canonical leaf 동적 탐색 및 Export 후 published cache 전체 무효화. (`publishedSearchLeafResolution.contract.test.ts` 13 PASS) |
| **USER Search 2-way Role Permutation** | ✅ **COMPLETE** — Target=NONE 상태에서 Yellow=Target/Red=Second 및 Red=Target/Yellow=Second 2가지 역할 순열을 모두 평가하여 물리 색상과 무관하게 정확한 레코드 매칭. (`userSearchRolePermutation.contract.test.ts` 11 PASS) |
| **Winning Role Mapping & Trajectory Target** | ✅ **COMPLETE** — `runUserSearch`가 승리한 `matchedBalls`를 반환하고 UI `ballsState`를 동기화하여 화면 상 물리공 위치 불변 및 Trajectory 엔진으로의 정확한 1적구 물리 좌표 전달 보장. |
| **Full Lifecycle Pipeline Contract** | ✅ **COMPLETE** — Save → `positions_dataset` → Derived Approval → Cartesian Product → Export → Published Leaf → USER Search → Trajectory Target 전 수명주기 무결성 보장. (`endToEndDataPipeline.contract.test.ts` 7 PASS) |

### Regression Test Foundation & CI Automation (2026-08-29)

> **Pointer only** — 상세 완료 기록: `HISTORY/PROJECT_LOG_2026-08.md` 2026-08-29 마일스톤 및 `DEVELOPMENT_WORKFLOW.md`.

| Item | Status |
|------|--------|
| **Standard Regression Scripts** | ✅ **COMPLETE** — `npm run test:fast`, `npm run test:contract`, `npm test`, `npm run test:regression`, `npm run build` 표준 명령 체계 확립. |
| **R01 ~ R24 Regression Matrix** | ✅ **COMPLETE** — Ball Role, Search, History/Corpus, Derived, Published, Trajectory, UI State, Schema 8대 영역 24개 핵심 회귀 규칙 100% GREEN 보호. |
| **Full Vitest Legacy Remediation** | ✅ **COMPLETE** — 5개 레거시 단독 스크립트의 정식 Vitest describe/it 등록 및 `systemAxisCaption.test.ts`의 OPEN-04 기하 expectation 동기화 완료 (98 files / 964 tests PASS). |
| **GitHub Actions Regression CI** | ✅ **COMPLETE** — `.github/workflows/regression.yml` 구축 (Ubuntu runner, Node.js 20 LTS, `npm ci`, 4-step fail-fast, `contents: read` 최소 권한). |

### Precision Editing (B1~B5 + Guide Live Preview · 2026-08-28)

> **Pointer only** — 상세 완료 기록: `HISTORY/PROJECT_LOG_2026-08.md` 최신 **Precision Editing Guide Live Coordinate Preview** 항목.
> Feature SSOT를 별도 중복 문서로 만들지 않으며, 기존 Ball / Baseline / Apply 계약을 소비한다.

| Item | Status |
|------|--------|
| **Ball Guide** | ✅ **COMPLETE** — 선택 Ball 기준 H/V Guide · handle/arrow/Alt+drag · dedicated intersection Snap |
| **Guide Live Coordinate** | ✅ **COMPLETE** — Guide drag 중 live coordinate preview (Vertical drag: X live / Y fixed, Horizontal drag: Y live / X fixed) · Preview ≠ Commit invariant 유지 |
| **Ball editing presentation** | ✅ **COMPLETE** — Fine directional arrows 제거 · movement handle + live coordinate 유지 |
| **CO/C1 Fine Adjustment** | ✅ **COMPLETE** — canonical Mark axis 기반 0.1 Rg arrows · 기존 Draft → Apply → SYS commit |
| **CO/C1 Impact Snap** | ✅ **COMPLETE** — native double-click · visible Impact authoritative · existing Apply/SYS path |
| **Runtime / persistence** | Ball Guide는 runtime-only · Guide state는 SAVE/History/dataset/schema에 저장하지 않음 |
| **Explicit exclusion** | CO/C1 Alt+drag는 구현하지 않음 · Guide Alt+drag는 유지 |
| **Verification** | 사용자 앱 실검증 완료(Visual Review PASS) · targeted tests PASS (22/22) · production build PASS |
| **Architecture** | SYS formula · Fg/Rg contract · trajectory/Impact physics · dataset/History/WRITE SSOT 불변 |
| **Release state** | Visual review approved · `0105e47` pushed · Vercel Production verified (`6139357202`) |

### Table Redesign / Label Clarity (2026-08-27)

> **Pointer only** — 상세 완료 기록: `HISTORY/PROJECT_LOG_2026-08.md` 최신 **Table Redesign Finalization** 항목.

| Item | Status |
|------|--------|
| **Table presentation** | ✅ **COMPLETE** — Natural Oak / Light Walnut frame · separator · dark diamonds |
| **Frame/rail scale text** | ✅ **COMPLETE** — white raw scale + dark espresso halo |
| **System scale identifiers** | ✅ **COMPLETE** — anchor/source mark 기반 group identifier · ADMIN caption gate |
| **CO/C1 presentation** | ✅ **COMPLETE** — identifier/value text `#FFFFFF` 통일 + existing halo |
| **Architecture** | Presentation-only · geometry · calculation · interaction · dataset/schema 불변 |
| **Release state** | Visual review approved · `b764d5a` pushed · Vercel Production verified |

### Derived Data (Phase 3A-359 + 3A-360)

> **Pointer only** — detail: `HISTORY/PROJECT_LOG_2026-08.md` Phase **3A-359E…M** · **3A-360**. Design: `FAMILY_DATA_ARCHITECTURE_DRAFT.md`.

```text
Derived Data
  ├─ Cue→Impact generator — COMPLETE (Review samples)
  ├─ C3+ Scoring Line generator — COMPLETE (Review samples)
  ├─ Unified Derived Review UX — COMPLETE (Cue∪C3 markers)
  ├─ Cartesian Product durable (Track×Cue×C3+) — COMPLETE (3A-360)
  ├─ Atomic 4-track Consistency — COMPLETE
  └─ History / Recall — Product rematerialize path
```

| Field | Value |
|-------|--------|
| **Review samples** | Cue markers ∪ C3+ markers (≠ durable count) |
| **Durable Product** | **Phase 6 Role-native:** `balls.target` = physical Target · `balls.second` = scoring sample P · Canonical: `placePhysicalSecondSampleOnRoleBall3` |
| **Cardinality** | `T × Nc × N3` (dynamic; fixture e.g. 4×3×21=252; real sets may be 4×4×18=288) · Product-only on Approve |
| **Identity** | `DERIVED_CUE_C3_PRODUCT` · `CUE_C3_CARTESIAN_PRODUCT_V1` · `cue:{cueStep}\|c3:{c3Step}` |
| **Generators** | Separate · no Cue→C3 chaining · base AUTHORED/SYMMETRY only |
| **Impl** | `buildCueC3ProductMembers.ts` · `placePhysicalSecondSampleOnRoleBall3` · `resolveC3PlusSecondBall` → `balls.second` |
| **Coverage display SSOT** | APPROVED/History: `productCoverageFromDataset` ← unique Product `balls.cue` / **`balls.second`** (Role physical Second) per track |

### LocalDB ADMIN Spatial Search (adminSearch)

> Path: `handleAdminSearch` → `runAdminLocalDbRecall` → `runSpatialRecall(adminSearch)`.
> **Corpus** = persisted `PositionRecord` Ball3 samples (React `dataset` after History load / working corpus).
> **Not** trajectory geometry · **Not** Coverage markers as candidate expansion.

| Field | Value |
|-------|--------|
| **Coordinates** | Ball3 table coordinates / **Rg** |
| **Role match** | `cue↔cue` · `target↔target` · `second↔second` (permutation removed) |
| **Per-ball metric** | **Euclidean** center distance |
| **Per-ball tolerance** | **2.0 Rg** (cue ∧ target ∧ second; all must pass) |
| **Winner** | minimum `dCue + dTarget + dSecond` |
| **Tie-break** | `targetBallMatch` → `positionId.localeCompare` |
| **Aggregate cap** | **none** (per-ball gate primary) |
| **Soft UI warn** | aggregate > **4.0** → "유사도 낮음" (still match) |
| **Trajectory / Coverage** | Visualization only — **do not** create Search candidates |
| **NO MATCH** | No persisted sample within coarse gate → **expected** ("해당 데이터 없음") |
| **Not changed** | Product cardinality / generators / Published `adminStrict` (Manhattan) |

> Edit-session after Load: **Undo/Recall model** — see `TRAJECTORY_EXTENSION_SSOT.md` §7 · log: `HISTORY/PROJECT_LOG_2026-09.md`.

### Phase 5 Mission 01 — Real Interpolation (Implemented)

| Item | Status |
|------|--------|
| `authoringStrategyId` lineage (D1-C1) | ✅ |
| Knot View + explicit-mapping Migration (dry-run default) | ✅ |
| Second Scoring Gate (ordered `secondSet` polyline · 1.73 Rg) | ✅ |
| Cue/Target Geometry Gate (POS/SHAPE · angle off) | ✅ |
| Same-family SYS interpolation · No Extrapolation | ✅ |
| `matchType` exact/interpolated/nearest · confidence · top-3 | ✅ |
| Calculator / Builder bridge consume | ✅ |
| Parallel App flow (`VITE_REAL_INTERPOLATION_SEARCH=1`) | ✅ |
| Phase 3 `rank_continuity_v1` unchanged | ✅ regression green |
| Architecture Freeze / PublishedDataset mutation | ✅ not modified |

### Phase 5 Search Quality Follow-on — Task #5 (Production Integration)

> Mission 01 = Real Interpolation **core engine**.
> Task #5 = Production frontend **integration** (loader · DI · slot · Calculator/Builder · UI).
> Task #5 did **not** re-implement Mission 01 interpolation algorithms.

| Step | Item | Status |
|------|------|--------|
| **1** | Published Envelope locator · read-only loader · parse/validation · module cache | ✅ |
| **2** | App DI · production `window.__ENVELOPE_PUBLISHED_DATASET__` removed · fail-closed · USER Search isolation | ✅ |
| **3** | RI candidate → existing Strategy Slot hydrate · `authoringStrategyId` family · `strategyRef` separate | ✅ |
| **4** | Existing Calculator + App-owned `buildTrajectory` DI · no SYS/Modal recompute | ✅ |
| **5** | matchType · confidence · Top-3 UI surface · existing activation path | ✅ |
| **E2E** | Product publish → `/dataset/_published/envelope/dataset.json` → RI → Slot → Calculator/Builder → UI | ✅ VERIFIED |
| **Commit/Push** | `282c859` · `feat(search): integrate production real interpolation flow` | ✅ |

**Final Integration Verification:** Vitest **76 PASS** · Phase 3 **12** · Search **4** · Publisher **11** · Architecture/SSOT audit PASS · Unexpected **0**.

### Phase 5 Mission 02 — Dead Code Cleanup (Complete)

| Field | Value |
|-------|--------|
| **Status** | ✅ **COMPLETE** |
| **Closure** | **COMPLETE WITH DEFERRED ITEMS** |
| **Cleanup Exit** | **EXIT-AFTER-#4** |
| **Code baseline** | `8bf90b6` · `chore(cleanup): remove temporary snap agent telemetry` |
| **Scope** | Cleanup #1–#4 complete — temporary telemetry / no-op trace scaffolding removed; protected product / validation paths preserved |
| **Deferred** | Optional hygiene · defer-until-validation · design-decision · KEEP — **no Mission 02 blocker**; do not auto-resume Dead Code Cleanup |
| **Next Track** | **Family Data Architecture Phase 1** · **READY FOR ASK** |

Detail: `HISTORY/PROJECT_LOG_2026-08.md` (Mission 02 Final Closure).

---

### Current Family Normalization State (2026-08-22 · Phase 3A-349)

> **Pointer only** — detail: `HISTORY/PROJECT_LOG_2026-08.md` Phase **3A-320 ~ 3A-349**. Design: `FAMILY_DATA_ARCHITECTURE_DRAFT.md` (CURRENT vs TARGET).

| Field | Value |
|-------|--------|
| **Current Phase** | **Phase 3A-349** — Controlled Normalized READ Flag Enable **PASS** (uncommitted) |
| **Production corpus SSOT** | `positions_dataset` (+ React `dataset` mirror) — **WRITE authority unchanged** |
| **Safe corpus persist** | `persistPositionsDatasetWithGeneration` (invalidate → positions → gen) |
| **Legacy generation meta** | `positions_dataset_meta.corpusGeneration` (authority) |
| **Normalized shadow stores** | `family_masters` · `family_members` (schema **v2** · `sourceSlot` required) |
| **Feature flag** | `FAMILY_NORMALIZED_STORAGE_ENABLED = true` (default) · gated READ · **OFF → instant legacy rollback** |
| **Production READ loader** | `loadProductionCompatibleDataset()` — App startup wired |
| **Normalized READ eligibility** | `flag ∧ freshness ∧ rematerialize/hydrate success` — else legacy |
| **Rematerialization** | Exact-ball grouping · `strategies[sourceSlot]` packing · slot collision fail-closed |
| **Parity regressions** | 3A-347 suite + default-ON / explicit-OFF (3A-349) — **PASS** |
| **History H3** | **TRANSITIONAL HARDENED** (3A-337) · **FULL H3 DEFERRED** |
| **preserve_dataset** | positions + **meta KEEP** · `family_*` **DELETE** (3A-339) |
| **SearchIndex** | **NOT REQUIRED** · **NOT IMPLEMENTED** |
| **F12 residual** | generation-aligned content drift theoretically possible (no new fingerprint in 349) |

#### Done (through 3A-349)

- Shadow dual-write · corpusGeneration · fail-closed persist · transitional H3 · preserve meta KEEP
- Gated READ loader (3A-342) · Exact-ball rematerializer + sourceSlot (3A-345)
- Production semantic parity regressions (3A-347) · Final GO audit (3A-348)
- **Controlled production flag default ON** (3A-349) — eligibility gate unchanged · WRITE SSOT unchanged

#### Not done

- Commit/Push of enable · Full H3 · SearchIndex · Approval +0 · Export cutover · family_* as durable SSOT · F12 content fingerprint

### 왜 지금인가 (context)

샘플 데이터셋 3개 완성 후 Family 정규화 경로 진행. Phase 3A-349에서 gated normalized READ production default **ON**. WRITE SSOT는 여전히 `positions_dataset`; flag OFF 시 즉시 legacy READ.

### 설계 한 줄 (TARGET)

FamilyMaster = 공통값 SSOT · FamilyMember = 좌표+track+provenance · SearchIndex = derived locator (새 SSOT 아님) · History = workspace snapshot only.

상세·안전 원칙: **DRAFT** (CURRENT vs TARGET). 본 MASTER는 상태 pointer.

### 구현된 Authoring/Display (uncommitted · cite LOG)

saveFlow system identity · C2 Track invalidate · History restore layers ON · uiMode F5 · HPT tip-side C2 invalidate · **BUG-A** display-cap nearest-rail. **BUG-B UNCONFIRMED (reproduction required)**.

### Export ≠ History

History snapshot count ≠ export `positions.json` record count. Dataset 3계층 SSOT 유지. **CURRENT Export format unchanged** through 3A-326. Target Export corpus = Master+Members (not History-row merge) — **NOT IMPLEMENTED**.

---

## Project Constitution

This project is governed by the following Constitution-level documents.

| # | Document | Authority | Role |
|---|----------|-----------|------|
| 1 | **`PROJECT_MASTER_INDEX.md`** (본 문서) | **Status** | Project Entry · Project Status · Current Phase · Next Track |
| 2 | **`Architecture/*`** | **Structure** | Structure · Contract · Constraints (Architecture Freeze · 내용 수정 금지) |
| 3 | **`작업관리/GLOSSARY_SSOT.md`** | **Terminology** | Official Terminology · Official Pipeline Expression |
| 4 | **`CURSOR_SESSION_HANDOFF.md`** | **Operations** | Session Operations · Startup Rules · Current / Next / Carry |
| 5 | **`HISTORY/PROJECT_LOG_YYYY-MM.md`** | **History** | Mission Completion · 검증 사실 · 월별 이력 |

Envelope 의미·Sampling Policy·Dataset Must/Must-Not은 **Architecture Freeze**가 Parent이다.
Official Name·Pipeline Label은 **GLOSSARY_SSOT**가 우선한다.
본 문서는 Status Entry이며 Architecture를 개정하는 상위 헌법이 **아니다**.

### Core Document Roles

| Document | Role |
|----------|------|
| **PROJECT_MASTER_INDEX** | Project Status · Current Phase · Next Track |
| **Architecture** | Structure · Contract · Constraints |
| **GLOSSARY_SSOT** | Official Terminology · Official Pipeline |
| **CURSOR_SESSION_HANDOFF** | Session Operations · Startup Rules |
| **PROJECT_LOG** | History · Mission Completion |

### SSOT Authority Summary

| Authority | Document |
|-----------|----------|
| **Status** | MASTER (`PROJECT_MASTER_INDEX.md`) |
| **History** | LOG (`HISTORY/PROJECT_LOG_YYYY-MM.md`) |
| **Structure** | Architecture (`Architecture/*`) |
| **Terminology** | Glossary (`작업관리/GLOSSARY_SSOT.md`) |
| **Operations** | Handoff (`CURSOR_SESSION_HANDOFF.md`) |
| **User Communication** | MASTER § User Communication Principles (Beginner-First) |

Authority는 중복되지 않는다. Terminology 전용 추가 SSOT(`SEARCH_TERMINOLOGY.md` 등)를 신설하지 않는다 — GLOSSARY에 통합 (GLOSSARY §8).

### Conflict Resolution (요약)

| Domain | Winner |
|--------|--------|
| Architecture 의미 · Sampling · Dataset Must/Must-Not | Architecture Freeze |
| Official Name · Official Pipeline · Alias | GLOSSARY_SSOT |
| Project Status · Next Track | PROJECT_MASTER_INDEX (+ LOG) |
| Current Mission · Session Checklist | CURSOR_SESSION_HANDOFF |

---

## Official Session Read Order

새 세션(Envelope / Product / Search / Validation)의 **기본** 순서:

```text
1. PROJECT_MASTER_INDEX.md
        ↓
2. HISTORY/PROJECT_LOG_YYYY-MM.md
        ↓
3. 작업관리/GLOSSARY_SSOT.md
        ↓
4. Architecture/ENVELOPE_ARCHITECTURE_SSOT.md
        ↓
5. CURSOR_SESSION_HANDOFF.md
        ↓
6. Mission-specific documents
```

| # | Document | Purpose |
|---|----------|---------|
| 1 | MASTER | Status / Next Track |
| 2 | LOG | Recent facts / Mission history |
| 3 | GLOSSARY | Official Terminology / Pipelines |
| 4 | Architecture Freeze | Structure (Consume only) |
| 5 | HANDOFF | Session ops / Checklist |
| 6 | Mission-specific | 해당 Mission만 (예: `FAMILY_DATA_ARCHITECTURE_DRAFT.md` · Product Phase Handoff · Quality Report) |

상세 Session Rules: `CURSOR_SESSION_HANDOFF.md` §0.1.

---

## Documentation Governance

새 문서를 만들기 전 반드시 확인한다.

| # | Question | Look in |
|---|----------|---------|
| ① | Project Status | MASTER / LOG |
| ② | Architecture | `Architecture/` |
| ③ | Terminology | `GLOSSARY_SSOT` |
| ④ | Session Operation | HANDOFF |
| ⑤ | Mission | `SESSION_TRANSFER/` |
| ⑥ | Reference | `docs/` |

기존 Authority와 중복되는 별도 SSOT를 만들지 않는다.
용어·Pipeline 표현은 GLOSSARY에만 등록한다.

---

## User Communication Principles (Beginner-First)

**Authority:** 본 절 · Project Operations / User Communication
**Not:** 코드·계산·Architecture SSOT (동작 규칙은 변경하지 않는다)

프로젝트 소유자는 **비개발자**이다.
AI Agent·Cursor·문서 작성자가 작업 결과·오류·다음 행동을 설명할 때
**개발 용어·status code·파일 경로만으로 끝내지 않는다.**

### Required order

1. **무엇이 일어났는지** — 쉬운 말로 먼저 설명한다.
2. **왜 그런 일이 생겼는지** — 원인을 쉬운 말로 이어서 설명한다.
3. **지금은 어떤 상태인지** — 고쳐졌는지 / 아직 남았는지 / 막힌 것인지 명확히 말한다.
4. **다음에 무엇을 하면 되는지** — 사용자가 앱에서 할 다음 행동을 구체적으로 안내한다.

### Style rules

- 전문용어가 필요하면 **쉬운 설명 뒤에** 괄호 또는 짧은 보충으로만 붙인다.
- `status` / `reason` / function / file 이름만 나열하고 설명을 끝내지 않는다.
- 사용자가 다른 AI에게 다시 해석을 요청하지 않아도 이해할 수 있는 수준을 목표로 한다.
- Cursor Agent **최종 보고**는 가능하면 **`BEGINNER SUMMARY`를 맨 앞**에 둔다.

### Behavior Documentation — User Operation Flow (REQUIRED, permanent)

**Authority:** 본 절 · Project Operations / Documentation (F-3C, 2026-09-27)

중요한 프로젝트/관리자 동작은 **개발 용어만으로 기록하지 않는다.**
중요한 동작을 문서화할 때는 다음 7가지를 설명한다:

1. 사용자가 무엇을 한다
2. 화면에서 무엇을 본다
3. 어떤 버튼을 누른다
4. 프로그램이 그 행동을 어떤 의미로 처리한다
5. 무엇이 유지된다
6. 무엇이 변경된다
7. SAVE와 OVERWRITE가 어떻게 다른가

기술 용어를 함께 적어도 되지만, 반드시 **구체적인 사용자 조작 설명**이 같이 있어야 한다.

Example:

> 관리자가 대칭 방향에서 Family A를 Search한다.
> 공을 Recall 이후 움직이지 않고 공략 내용을 수정한다.
> 덮어쓰기를 누르면 대칭 Member를 새 원본으로 만드는 것이 아니라
> 기존 Family A의 공용 내용을 수정한다.
> Family A의 원래 공 위치와 4 Track은 그대로 유지된다.

### Terminology — 내공 / 앞공 / 뒷공 (REQUIRED, permanent)

**Authority:** 본 절 · Project Operations / Terminology (F-3C, 2026-09-27)

| Role | Korean user-facing (UI · 사용자 문서) | Internal / system (code · schema · JSON) |
|------|------|------|
| cue | **내공** | `cue` · `cue_ball` / `cueBall` (현재 code convention 유지) |
| target | **앞공** | `target` · `target_ball` / `targetBall` |
| second | **뒷공** | `second` · `second_ball` / `secondBall` |

- 앞공/뒷공은 **logical role**이다. physical red/yellow 색과 고정 결합하지 않는다.
- 한국어 사용자-facing 문서/UI에서 일본어 유래 **수구 / 1적구 / 2적구**를 새로 사용하지 않는다.
- 내부 코드/schema/JSON 식별자는 국제화를 고려해 기존 영문 role identifier를 유지한다.

### Cursor Final Report Output (Copyable Plain Text) — REQUIRED

**Authority:** 본 절 · Project Operations / Cursor Agent Reporting
**Not:** 코드·계산·Architecture SSOT

Cursor Agent **최종 보고서**는 사용자가 ChatGPT에 **그대로 전달**할 수 있도록
**복사 가능한 plain-text code block**으로 출력한다.

| Rule | Statement |
|------|-----------|
| Format | 최종 보고 전체를 ` ```text ` code block으로 제공 |
| Beginner | `BEGINNER SUMMARY`도 **같은** 복사 영역에 포함 |
| No UI-only | UI table만으로 최종 보고하지 않음 |
| No screenshot-only | screenshot을 찍어야 전달 가능한 형식 금지 |
| Copy-first | Copy 버튼으로 복사 가능한 형식 우선 |
| Split | 너무 길면 `REPORT 1/2`, `REPORT 2/2` 등으로 분할 |
| Split independence | 분할된 각 보고도 독립된 plain-text code block |
| Verification | Git / test / files / PASS·FAIL / hash 등 검증 정보 생략 금지 |

### Example (shape only)

> Publish가 실패한 것은 새 데이터가 잘못돼서가 아닙니다.
> Publish하려는 파일에 예전 테스트 변경이 남아 있어서,
> 프로그램이 덮어쓰지 않도록 먼저 멈춘 것입니다.
> (status: `PRE_EXISTING_TARGET_DIRTY`)

---

## 문서 계층 (읽는 순서)

### 기본 세션 — Official Read Order (위 절)

Envelope / Product / Search 세션은 **Official Session Read Order**를 따른다.

### Development Workflow — Architecture 구현 전 Consume (공식 · AAS/Fleet 트랙)

Application Runtime / Fleet Contract 관련 구현(Runtime / Presentation / Validation 등) **전에** 반드시 다음 순서로 Consume한다.
(**기본 Official Read Order와 병행** — AAS 트랙 전용 First Consume.)

```text
1. docs/APPLICATION_FLOW.md
2. 관련 Fleet Contract Book (L4 / L5 / L6 / L7)
3. PROJECT_MASTER_INDEX.md
4. 작업관리/GLOSSARY_SSOT.md
5. CURSOR_SESSION_HANDOFF.md
        ↓
Architecture Review
        ↓
구현 진행
```

| Rule | Statement |
|------|-----------|
| **First reference (AAS Runtime)** | `APPLICATION_FLOW.md` = Runtime Orchestration 공식 Architecture Guide |
| **Normative layers** | Fleet Contract Book Ch.8(L4) · Ch.9(L5) · Ch.10(L6) · **Ch.11(L7 Ratified)** |
| **Ops context** | MASTER + GLOSSARY + HANDOFF로 현재 Gate / Hold / Next · 용어 확인 |
| **Gate** | Consume → **Architecture Review** → 구현 (Review 생략 금지) |

### 신규 세션 온보딩 (STEP7 Agent Implementation)

1. **`DEVELOPMENT_WORKFLOW.md`** — **Operational Workflow SSOT v1.0** (General + Fleet Apply Workflow)
2. **`OPS_AI_MODEL_GUIDE.md`** — Ops AI Model Recommendation **v0.1** (Recommendation only)
3. **`docs/APPLICATION_FLOW.md`** — **Runtime Orchestration Architecture Guide** (Architecture 구현 시 **최우선**)
4. **`PROJECT_MASTER_INDEX.md`** (본 문서) — 현재 기능·UI·완료/예정 SSOT
5. **`CURSOR_SESSION_HANDOFF.md`** — **Search Engine Foundation Phase 완료** · Next **Dataset Generator Phase**
6. **`STEP7_IMPLEMENTATION_DECOMPOSITION.md`** — Session Execution SSOT **v1.0 Approved**
7. **`System Platform Standard (SPS) v1.0/STEP7_P4_IU-4-0*.md`** — **P4 Plan suite** (Complete · Official · Consume)
8. **`System Platform Standard (SPS) v1.0/STEP7_Catalog_Freeze_Design.md`** — **P2 Catalog Design v0.15** (Consume)
9. **`HISTORY/PROJECT_LOG_2026-07.md`** — P4 Complete · VG-P4 PASS · STEP7 Decisions
10. **`System Platform Standard (SPS) v1.0/STEP6_FINAL_FREEZE.md`** — **STEP6 Final Freeze v1.0** (Consume)
11. Framework · Pipeline Freeze Candidate (Locked · Consume)

### 신규 세션 온보딩 (STEP6-6 Validation Engine Design) — 이력 참조

1. **`PROJECT_MASTER_INDEX.md`** (본 문서) — 현재 기능·UI·완료/예정 SSOT
2. **`CURSOR_SESSION_HANDOFF.md`** — (현행은 STEP7 Entry; 이력은 LOG 참고)
3. **`HISTORY/PROJECT_LOG_2026-07.md`** — STEP6-5…STEP6-11
4. **`System Platform Standard (SPS) v1.0/STEP6-5_Validation_Register_Suite.md`** — Register Suite v0.2
5. **`System Platform Standard (SPS) v1.0/STEP6-4_Rule_Catalog_Design.md`** — Catalog Design v0.2
6. **`System Platform Standard (SPS) v1.0/STEP6-3_Schema_Rule_Analysis.md`** — Analysis v1.1
7. Framework · Pipeline Freeze Candidate (Locked · Consume)

### 신규 세션 온보딩 (STEP6-4 / STEP6-5) — 이력 참조

1. **`PROJECT_MASTER_INDEX.md`** (본 문서)
2. **`CURSOR_SESSION_HANDOFF.md`** — (현행은 STEP7 Entry; 이력은 LOG 참고)
3. **`HISTORY/PROJECT_LOG_2026-07.md`** — STEP6-4 Catalog · STEP6-5 Register
4. Catalog Design v0.2 · Register Suite v0.2 · Analysis v1.1
5. Framework · Pipeline Freeze Candidate (Locked · Consume)

### 신규 세션 온보딩 (STEP5 Final → STEP6 Schema Validation) — 이력 참조

1. **`PROJECT_MASTER_INDEX.md`** (본 문서) — 현재 기능·UI·완료/예정 SSOT
2. **`System Platform Standard (SPS) v1.0/STEP5_FINAL_FREEZE.md`** — **STEP5 Final Freeze v1.0**
3. **`System Platform Standard (SPS) v1.0/STEP5_STEP6_Handoff.md`** — STEP6 Entry · Manifest · Owner
4. **`HISTORY/PROJECT_LOG_2026-07.md`** — STEP5 Completed · STEP6-1/2 Freeze Candidate

### 신규 세션 온보딩 (STEP4 / Inventory 참조)

1. **`PROJECT_MASTER_INDEX.md`** (본 문서) — 현재 기능·UI·완료/예정 SSOT
2. **`System Platform Standard (SPS) v1.0/System_Inventory.md`** — **STEP4 Final v1.0** · Frozen Assets · §19 Entry Point
3. **`HISTORY/PROJECT_LOG_2026-07.md`** — STEP4 Final 로그 (2026-07-14) · Batch 6 Final Freeze (2026-07-13)
4. **`작업관리/Runtime Refactoring/Batch06/Batch6_Final_Freeze.md`** — Batch 6 Final Freeze SSOT (Runtime baseline)

### 신규 세션 온보딩 (Dataset Architecture 포함 시)

1. **`PROJECT_MASTER_INDEX.md`** (본 문서) — 현재 기능·UI·완료/예정 SSOT
2. **`HISTORY/PROJECT_LOG_2026-06.md`** — 2026-06 월별 이력 (§14 Phase 1 · §15 Phase 2~3-1 · §16 운영 검증 조사 · §17 OPEN-05 조사 · §18 OPEN-04 Caption Engine · §19 USER Overlay · §20 Trajectory Display Cap)
3. **`SESSION_TRANSFER/SESSION_TRANSFER_2026-06_DATASET_ARCHITECTURE.md`** — Dataset Architecture 전용 이관 문서

### 전체 문서 계층

| 문서 | 역할 |
|------|------|
| **본 문서 (`PROJECT_MASTER_INDEX.md`)** | **Project Entry** · Status · Current Phase · Next Track |
| `작업관리/GLOSSARY_SSOT.md` | **Terminology Constitution** — Official Terminology · Official Pipeline Expression |
| `Architecture/` | **Structure Constitution** — Envelope Architecture Freeze suite (내용 수정 금지) |
| `docs/APPLICATION_FLOW.md` | **Runtime Orchestration Architecture Guide** — AAS Architecture 구현 전 **First Consume** |
| `작업관리/DEVELOPMENT_WORKFLOW.md` | **Operational Workflow SSOT v1.0** (General + Fleet Apply Workflow · Sole Ops SSOT) |
| `작업관리/STEP7_IMPLEMENTATION_DECOMPOSITION.md` | **STEP7 Session Execution SSOT v1.0 Approved** |
| `작업관리/CURSOR_SESSION_HANDOFF.md` | **Operations** — Session Read Order · Startup Rules · Current / Next / Carry |
| `SESSION_TRANSFER/Product Phase Handoff.md` | Phase 4 Product Pipeline Mission roadmap |
| `작업관리/DISPLAY_BOUNDARY_POLICY_SSOT.md` | **Display Boundary Policy SSOT v1.5** — Cap / Boundary · Phase 2A · Reading Mode · C2 Override · **5&Half Baseline Display Ceiling** |
| `작업관리/TRAJECTORY_EXTENSION_SSOT.md` | Trajectory Extension Overlay Runtime SSOT **v1.4** (Task Closed · Freeze) |
| `System Platform Standard (SPS) v1.0/Fleet_Contract_Book/` | **Fleet Contract Book v1.0** · Front Matter + **Ch.8–Ch.11 Ratified** · **B0–B8 Completed** · **Final Validation Gate v1.0** |
| `System Platform Standard (SPS) v1.0/Certification_Platform/` | **STEP9 Certification Platform SSOT v1.0 · FROZEN** · P-01…P-05 · FC-01…FC-08 |
| `System Platform Standard (SPS) v1.0/STEP7_P6_IU-6-0*.md` | **STEP7 P6 Apply Decision suite** (IU-6-01A…06A Complete · Design-only · Consume) |
| `작업관리/OPS_AI_MODEL_GUIDE.md` | **Ops AI Model Recommendation Guide v0.1** (Recommendation only · never Gate) |
| `System Platform Standard (SPS) v1.0/STEP7_P4_IU-4-0*.md` | **STEP7 P4 Standardization Plan suite** (Complete · Official · VG-P4 PASS) |
| `System Platform Standard (SPS) v1.0/STEP7_Catalog_Freeze_Design.md` | **STEP7 P2 Catalog Freeze Design v0.15** (Design Complete · Freeze not declared) |
| `System Platform Standard (SPS) v1.0/STEP6_FINAL_FREEZE.md` | **STEP6 Final Freeze v1.0** · Final Summary |
| `System Platform Standard (SPS) v1.0/STEP6-10_Validation_Report.md` | **STEP6-10 Validation Report v1.0** |
| `System Platform Standard (SPS) v1.0/STEP6-6_Validation_Engine_Design.md` | **STEP6-6 Engine Design Complete (v0.2)** |
| `frontend/src/validation/engine/` | **STEP6-7…9 Validation Engine baseline** |
| `System Platform Standard (SPS) v1.0/STEP6-5_Validation_Register_Suite.md` | **STEP6-5 Validation Register Suite Complete (v0.2)** · Register State |
| `System Platform Standard (SPS) v1.0/STEP6-4_Rule_Catalog_Design.md` | **STEP6-4 Rule Catalog Design Complete (v0.2)** |
| `System Platform Standard (SPS) v1.0/STEP6-3_Schema_Rule_Analysis.md` | **STEP6-3 Schema Rule Analysis Complete (v1.1)** · Catalog Design Input |
| `System Platform Standard (SPS) v1.0/STEP6_Schema_Validation_Framework.md` | **STEP6 Framework Freeze Candidate (Locked)** |
| `System Platform Standard (SPS) v1.0/STEP6_Validation_Pipeline.md` | **STEP6 Pipeline Freeze Candidate (Locked · Framework Consume-only)** |
| `System Platform Standard (SPS) v1.0/STEP5_FINAL_FREEZE.md` | **STEP5 Final Freeze v1.0** · 문서 suite |
| `System Platform Standard (SPS) v1.0/STEP5_Architecture_Audit_Framework.md` | STEP5 Architecture Audit Framework SSOT (Frozen) |
| `System Platform Standard (SPS) v1.0/STEP5_STEP6_Handoff.md` | STEP6 Handoff Manifest · Entry Conditions |
| `System Platform Standard (SPS) v1.0/System_Inventory.md` | **STEP4 Inventory SSOT (v1.0 Final)** · Frozen Assets |
| `HISTORY/PROJECT_LOG_YYYY-MM.md` | 월별 작업 이력 |
| `SESSION_TRANSFER/SESSION_TRANSFER_2026-06_DATASET_ARCHITECTURE.md` | Dataset Architecture 설계·Phase 1 Export·후속 Phase |
| `3_SYSTEM_ARCHITECTURE.md` | 계산·데이터 계층 상세 |
| `4_CALCULATION_RULES.md` | 수식·보정 규칙 |
| `5_PROJECT_MASTER_STATE_CURRENT.md` | 폴더/파이프라인 **구조 변경 시** 전면 재작성 통제 |
| `ARCHIVE/1_PROJECT_MASTER_INDEX.md` | 2026-03 헌법 스냅샷 (**deprecated**) |

---

## 프로젝트 개요

### 프로젝트 목적

국제식 3쿠션 **시스템·공략을 데이터화**하고, 관리자가 입력·저장한 포지션을 **Recall/Search**로 불러와 **테이블·궤적·코칭 UI**로 검증·학습하는 분석 전용 앱.

### 현재 개발 단계

| 영역 | 상태 |
|------|------|
| **Architecture** | **Application Architecture Standard (AAS) v2.0 Complete** · **Application Runtime Constitution (SSOT) Established** — `App_Migration_Map.md` 생성 완료 · Runtime Constitution 확정 · Architecture Governance 완료 · Migration Blueprint 완료 |
| **AAS Runtime Migration** | **Batch 1~6 Complete (2026-07-13)** — Batch 6 Final Freeze · Runtime Contract / Registry / Loader · Baseline `ec71ef9` · **Completed · Final Freeze** |
| **SPS System Inventory (STEP 4)** | **Complete · Final v1.0 (2026-07-14)** — 38 Systems · Observation SSOT · Metadata Inventory · Registration Inventory · Inventory Assets · **Frozen Assets declared** · SSOT: `System Platform Standard (SPS) v1.0/System_Inventory.md` |
| **SPS Architecture Audit (STEP 5)** | **Complete · Final Freeze v1.0 (2026-07-15)** — Framework · Audit Plan · Rule Catalog · Registers · Audit Report · STEP6 Handoff · `STEP5_FINAL_FREEZE.md` |
| **SPS Schema Validation (STEP 6)** | **Complete · Final Freeze v1.0 (2026-07-17)** — Framework · Pipeline **Locked** · Catalog/Register Design · Engine (7A–7G) · Pilot · Production Validation · Report · `STEP6_FINAL_FREEZE.md` |
| **SPS System Standardization (STEP 7)** | **P6 Complete (2026-07-21)** — P5 IU-5-01A…05A PASS · P6 IU-6-01A…06A Complete (Design-only) · WG-AI-001 PASS · Architecture Workflow PASS · Fleet design chain (01A–01F) authored |
| **SPS Fleet Apply (STEP 8)** | **Completed (2026-07-23)** — **B0·B1·B2·B2.5·B4·B5·B6·B7·B8 PASS** · **B3 HALTED (Hold)** · B8 Validation **PASS** · Fleet Closure **Confirmed** · **Final Validation Gate v1.0** · Ops Workflow **v1.0** |
| ADMIN | Position Lock → SYS / HP·T / STR / AI 입력 → Dataset SAVE |
| USER | Search(published) → 공략 선택 → **AI · 두께/타점 · 계산** 중심 실전 공략 UI |
| 궤적 | Hermite Segment A + 보정선 기반 baseline (2026-05 안정화) |
| AI 코멘트 | SYS+STR 자동 문장 SSOT + 원 포인트 레슨 분리 **완료** |
| 시스템 레슨 | **보류** — USER UI 단순화 정책에 따라 현재 메뉴 비노출 · 관련 코드/VM은 보존 |
| **Dataset Architecture** | **Phase 1~3-1 완료** — Export · Published Loader · USER/ADMIN Recall·Search SSOT |
| **Search Engine Foundation Phase** | **완료 (2026-08-06)** — Schema · Models · Validation · Loader · Membership · Resolve · Runtime · Session · Strategy Repository · Strategy Engine · Modal Engine · Geometry Engine · **Architecture Freeze 유지** · Commit 없음 |
| **Dataset Generator Phase** | **완료 (2026-08-06)** — Trajectory Generator · Cue Sampler · Second Sampler · Envelope Builder · Published Dataset Builder · Generator Pipeline E2E · Validation/Loader/Membership PASS |
| **Search Engine Enhancement Phase** | **완료 (2026-08-06)** — Phase 3 Complete · Spatial Index · KDTree · Membership Optimization · Ranking · Interpolation · Geometry Metrics · Runtime Wiring · E2E/Regression/Benchmark Validation |
| **Search Engine Architecture** | **Complete** — Phase 1 Foundation ✅ · Phase 2 Dataset Generator ✅ · Phase 3 Search Engine Enhancement ✅ |
| **Phase 4 Foundation** | ✅ **COMPLETED** — Project Constitution · GLOSSARY · Session / Documentation Governance · Handoff alignment |
| **Phase 4 Product Pipeline** | ✅ **COMPLETED** — Mission 01–03 · Mission 04 ABSORBED |
| **Next Phase** | **Family Data Architecture Phase 1 (Ask)** — 샘플 3 set 완성 보고 이후 |

### Search Engine Phase Map (Complete)

| Phase | 이름 | 상태 |
|-------|------|------|
| **1** | Search Engine Foundation | ✅ Complete |
| **2** | Dataset Generator | ✅ Complete |
| **3** | Search Engine Enhancement | ✅ Complete |

**Search Engine Architecture Complete (2026-08-06).**
상세: `HISTORY/PROJECT_LOG_2026-08.md` · `search/quality/SEARCH_QUALITY_REPORT.md` · `CURSOR_SESSION_HANDOFF.md`

### Phase 4 Product Pipeline Map

| Mission | 이름 | 상태 |
|---------|------|------|
| **Foundation** | Project Governance (GLOSSARY · Session · MASTER · Product Handoff align) | ✅ **COMPLETED** |
| **01** | Export Pipeline | ✅ **COMPLETED** |
| **02** | Published Package Builder | ✅ **COMPLETED** |
| **03** | Deployment Workflow | ✅ **COMPLETED** |
| **04** | Authoring Integration | ✅ **ABSORBED** (see ADR) |

Official Product Pipeline: `GLOSSARY_SSOT` §5.2 · `SESSION_TRANSFER/Product Phase Handoff.md`
Mission 04 ADR: `SESSION_TRANSFER/ADR_MISSION_04_AUTHORING_INTEGRATION_ABSORBED.md`


### Search Engine Foundation Phase (완료)

**상태:** **Complete (2026-08-06)** · Architecture Freeze Compatible · 구현 코드 Commit 없음 (문서 반영 세션)

Envelope Architecture SSOT 계약을 따라 Search Representation Consumer / Host 계층을 구현하였다.
Generator·Ranking·KDTree·실제 Geometry 계산·Search Algorithm은 **본 Phase 범위 밖**이다.

| Layer | 상태 | 경로 |
|-------|------|------|
| ✓ Schema | 완료 | `schemas/` |
| ✓ Domain Models | 완료 | `models/` |
| ✓ Validation | 완료 | `validation/` |
| ✓ Package Loader | 완료 | `loader/` |
| ✓ Membership Engine | 완료 | `membership/` |
| ✓ Resolve Engine | 완료 | `resolve/` |
| ✓ Search Runtime | 완료 | `runtime/` |
| ✓ Search Session | 완료 | `session/` |
| ✓ Strategy Repository | 완료 | `strategy/` |
| ✓ Strategy Engine | 완료 | `strategy_engine/` |
| ✓ Modal Engine | 완료 | `modal/` |
| ✓ Geometry Engine | 완료 | `geometry/` (Context only · 계산 미구현) |

**Architecture SSOT (Consume · Freeze 유지 · 본 문서에서 내용 수정 금지):** `Architecture/`
**상세 로그:** `HISTORY/PROJECT_LOG_2026-08.md` — Search Engine Foundation Phase 완료
**세션 이관:** `CURSOR_SESSION_HANDOFF.md`

### Dataset Generator Phase (완료)

**상태:** **Complete (2026-08-06)** · Architecture Freeze Compatible · Foundation Consumer 수정 없음 · Commit 없음

Generator Producer 계층을 구현하여 Strategy Authoring 입력으로부터 PublishedDataset까지 생성하고, Validation → Loader → Membership E2E 검증을 완료하였다.
Trajectory Generator · Cue Sampler · Second Sampler · Envelope Builder · Published Dataset Builder · Generator Pipeline E2E가 모두 완료되었다.

| Layer | 상태 | 경로 |
|-------|------|------|
| ✓ Trajectory Generator | 완료 | `generator/trajectory_generator/` |
| ✓ Cue Sampler | 완료 | `generator/cue_sampler/` |
| ✓ Second Sampler | 완료 | `generator/second_sampler/` |
| ✓ Envelope Builder | 완료 | `generator/envelope_builder/` |
| ✓ Published Dataset Builder | 완료 | `generator/published_dataset_builder/` |
| ✓ Generator Pipeline E2E | 완료 | `tests/test_generator_pipeline_e2e.py` |

**Architecture SSOT (Consume · Freeze 유지 · 본 문서에서 내용 수정 금지):** `Architecture/`
**상세 로그:** `HISTORY/PROJECT_LOG_2026-08.md` — Dataset Generator Phase Complete
**세션 이관:** `CURSOR_SESSION_HANDOFF.md`

### Search Engine Enhancement Phase (완료)

**상태:** **Complete (2026-08-06)** · Architecture Freeze Compatible · Foundation / Generator 계약 유지 · Full Test **248 PASS**

Phase 3에서 Search 품질·성능 Enhancement Engine을 구현하고 Runtime에 연결한 뒤 E2E / Regression / Benchmark로 검증 완료하였다.

| Layer | 상태 | 경로 |
|-------|------|------|
| ✓ Spatial Index | 완료 | `search/spatial_index/` |
| ✓ KDTree | 완료 | `search/kd_tree/` |
| ✓ Membership Optimization | 완료 | `search/membership/` |
| ✓ Ranking | 완료 | `search/ranking/` |
| ✓ Interpolation | 완료 | `search/interpolation/` |
| ✓ Geometry Metrics | 완료 | `search/geometry/` |
| ✓ Runtime Wiring | 완료 | `search/runtime/` · `runtime/` |
| ✓ Quality Validation | 완료 | `search/quality/` · E2E/Regression/Benchmark |

**Architecture SSOT (Consume · Freeze 유지 · 본 문서에서 내용 수정 금지):** `Architecture/`
**상세 로그:** `HISTORY/PROJECT_LOG_2026-08.md` — Phase 3 Complete
**품질 보고서:** `search/quality/SEARCH_QUALITY_REPORT.md`
**세션 이관:** `CURSOR_SESSION_HANDOFF.md`

**Next Track:** **Family Data Architecture Phase 1 (Ask)** · 설계: `FAMILY_DATA_ARCHITECTURE_DRAFT.md`

### 핵심 설계 원칙

1. **계산 엔진 vs 표시 레이어 분리** — Recall/SYS/STR/궤적 엔진은 USER 표시 작업에서 변경 금지.
2. **슬롯 SSOT** — `draft` / `applied`, `slotRenderSys`, `buildSlotRuntimePayload` 기준 hydrate.
3. **Canonical SAVE** — `sysInputs` + `corrections` persist, effective strip (2026-05 PR 2a–2d).
4. **오버레이 이중 트랙** — ADMIN: `overlayState` + `ModalShell`(편집). USER: `overlayContent` + read-only 패널.
5. **AI 텍스트** — 자동 생성(SYS+STR)과 `onePointLessons`(관리자 수동) **완전 분리**.

---

## 기술 스택

- Frontend: React (Vite), TypeScript + JSX
- 시스템 정의: `frontend/src/data/systems/*` (profile / anchors / logic / system_meta) — **Loader only**
- Runtime Contract: `frontend/src/runtime/` — Registry Public Entry `getSystemContract()`
- Admin SYS 식: `admin/sys/useSysCalculation.ts` (anchors 비의존 expr)
- App SYS·궤적: Domain calculators + `domain/trajectory/` (Batch 5) · Contract supply (Batch 6)

---

## 아키텍처 불변 규칙 (변경 시 로그·MASTER_STATE 갱신 필수)

1. **값 vs 좌표** — `profile.formula.expr`는 SYS **숫자**; 테이블 **CO/C1/C3 좌표**는 `anchors.json` + `anchorLookupEngine` / `anchorCoordinateEngine` SSOT.
2. **valueSpace (Fg / Rg)** — lookup은 `coord` + `valueSpace`. Fg는 프레임·방향점, Rg는 레일 맞춤. Fg에 무조건 `snapToRail` 적용 금지.
3. **Draft / Applied** — Draft는 실시간·미저장; **Applied만** SAVE/궤적 기준. USER 표시는 slot hydrate SSOT.
4. **전략 혼합 금지** — `signature = systemId + formulaHash + shotType`; 동일 signature 내에서만 search/merge.
5. **Recall** — 저장 `sysInputs` 기준; draft에 `outputs.result` 없으면 `buildDraftsFromRecord` 등에서 expr 재실행해 result 채움.
6. **표기** — UI/데이터는 C1, C3, CO_f … (`1C`, `3C` 역표기 금지).
7. **저장** — Local durable SSOT: localStorage `normalized_dataset` (NormalizedDatasetEnvelope). Published: `dataset/{공략}/{시스템}/positions.json` (writer = v3; untouched leaves may remain v2 until first-touch Publish). **ADMIN 로컬DB** → Local Member-centric Search; **ADMIN Search · USER Search** → Published Member-centric Search.

### 계산 3계층 (파일 기준)

| 계층 | 파일 | 역할 |
|------|------|------|
| Strategy | `hooks/useShotSlots.ts` | Draft/Applied, SAVE, Recall draft 적용 |
| Trajectory | `hooks/useTrajectoryState.ts` | IDLE → ADJUSTING → APPLIED, SYS 결과 UI 반영 |
| Physics·궤적 | `utils/physics/*`, `utils/trajectory/curveTrajectory.ts` | Impact, Hermite segment, cushion path |

### ADMIN SYS 입력 → 렌더 (요약)

```
SysOverlay 입력 → draft.sys → applyDraftSys → applied.sys
  → useTrajectoryState.applySysResult → Physics → Stage/ImpactLines
```

---

## 데이터 드리븐 시스템 (요약)

`frontend/src/data/systems/<system_name>/`

| 파일 | 역할 |
|------|------|
| `profile.json` | formula.expr, value_domains, safety |
| `anchors.json` | 좌표 SSOT (보간 기준점) |
| `logic.json` | 조건·특수 보정 |
| `system_meta.json` | 메타 |

상세: `3_SYSTEM_ARCHITECTURE.md`.

---

## Dataset Architecture

**상태 (CURRENT):** Local = `normalized_dataset` · Published runtime = NormalizedDatasetEnvelope (v2 leaf → in-memory convert; v3 native) · Local + Published Search = FamilyMember-centric · RI = normalized + on-demand rematerialize · PositionRecord = runtime projection only · Publish writer = v3 · checked-in leaves may remain v2 until first-touch Publish.

**UI 용어:** ADMIN **로컬DB** = Local Dataset Search; ADMIN **Search** = USER **Search** = Published Search. UI에서 Recall 라벨 제거 · published Search active state `isAdminPublishedSearchMatched` · CSS `.published-search-btn`.

**이관 문서 (historical):** `SESSION_TRANSFER/SESSION_TRANSFER_2026-06_DATASET_ARCHITECTURE.md`
**월별 로그:** `HISTORY/PROJECT_LOG_2026-06.md` §14 (Phase 1) · §15 (Phase 2~3-1)

**Export ≠ History:** History UI snapshot 개수와 `positions.json` record/member 수는 동일 개념이 아니다. History user-facing path = **Publish only** (Manual Export UI removed D-3/F-1).

### 데이터 3계층

| 계층 | SSOT | 용도 | 현재 소비자 |
|------|------|------|-------------|
| **Local Dataset** | `normalized_dataset` (localStorage) | ADMIN 작업·누적 | **ADMIN 로컬DB** (UI; profile `adminSearch`) |
| **Workspace History** | `workspace_history` (localStorage) | SAVE 스냅샷·작업 이력 | History UI (Load / Delete / **Publish**) |
| **Published Dataset** | `dataset/{공략}/{시스템}/positions.json` | 배포·사용자 검색 | **ADMIN Search**, **USER Search** (profile `adminStrict` / `userStrict`) |

### Save Intent / Source Ownership SSOT (2026-09-20)

| Command | Meaning |
|---------|---------|
| **SAVE** | Always **CREATE NEW Family** (source kind never switches SAVE → UPDATE) |
| **덮어쓰기 (OVERWRITE)** | **UPDATE** the current **trusted** recall source Family |

| Source kind | How set | OVERWRITE target |
|-------------|---------|------------------|
| **NONE** | New input / reset / cleared session | Blocked |
| **LOCAL** | ADMIN 로컬DB recall (`editingLocalFamilyId`) | Local Family UPDATE in `normalized_dataset` |
| **PUBLISHED** | ADMIN Search recall (`editingPublishedFamilyId`) | Published Source Family UPDATE intent |

Rules:

- Recall source determines **OVERWRITE target**, not SAVE intent.
- LOCAL and PUBLISHED ownership are **mutually exclusive**.
- Draft `familyId` alone never grants overwrite permission.
- **LOCAL UPDATE ≠ PUBLISHED UPDATE** — Local overwrite must not create a Published UPDATE `PublishOperation`.

### Position / Strategy / Family / Member Identity Contract (2026-09-20)

**Authority:** 본 절 · Architecture Identity SSOT
**Code owners:** `domain/positionId.ts` · `domain/positionSearchEngine.ts` · `domain/family/familyIdentity.ts` · `domain/family/trackSymmetry.ts`
**Not this work:** dataset migration · ID format change · Master/Members cutover · Search Index · Product reshape · storage 0.1 rounding

#### Hierarchy

```text
Position  (Ball3: cue/target/second · 6 logical coords)
│
├─ Position Key = positionId / createPositionId
│    (deterministic · 0.1 quantum in key only · color excluded)
│
├─ S1 ── Family A (familyId) ── MASTER + MEMBERS
│    └── Family B (familyId)     ← SAVE may create another Family
├─ S2 ── Family C
└─ S3 ── Family D
```

| Layer | Meaning | Owner / field |
|-------|---------|----------------|
| **Position** | Logical Ball3 centers (cue → target → second) | `Ball3` |
| **Position Key** | Deterministic Exact Position identity | `positionId` = `createPositionId(balls)` |
| **Strategy** | Slot on a Position — **not** part of Position Key | `S1` \| `S2` \| `S3` |
| **Family** | Permanent unique 공략 묶음 identity | `familyId` (`fm_*` UUID) |
| **Member** | Permanent Member identity + logical replace key | `memberId` (`mb_*`) + `genericFamilyMemberIdentityKey` |
| **Track** | Member semantic / handedness — **not** Position identity | `B2T_L` \| `B2T_R` \| `T2B_L` \| `T2B_R` |

#### Hard rules

1. **Position** = 6 logical coordinates only. Physical `red`/`yellow` (`targetBall`) is metadata — **excluded** from Position Key.
2. **PositionKey ≡ positionId** conceptually. Field is **not** renamed to `positionKey` in this ratification.
3. Position Key quantum = `round(v * 10)` (0.1). This does **not** authorize whole-corpus coordinate storage rounding (separate future policy).
4. **Strategy S1/S2/S3** is a separate layer from Position identity.
5. **Position Strategy Cardinality (Phase C-0 ACTIVE SSOT):** One Position → maximum **three** Strategies (`S1`/`S2`/`S3`). Each slot holds **at most one** Family. `(positionId, sourceSlot) → at most one familyId`. Same Position + same Slot + different Families = **BLOCKED**. Same Position + different Slots = **ALLOWED**. ~~Previous contract (same Position + same Strategy may hold multiple Families because SAVE = always NEW Family) is **SUPERSEDED**.~~
6. **Forbidden as familyId:** coordinate key · `positionId` · `positionId+S1` · six coords + strategy.
7. **SAVE** = CREATE intent (mints new `familyId`) but **BLOCKED** when preferred Position+Slot is already occupied by another Family (no auto S2/S3; no auto-overwrite). **OVERWRITE** preserves trusted source `familyId` (LOCAL or PUBLISHED) and still must pass corpus occupancy validation. Same Position Key alone never selects UPDATE.
8. **memberId KEEP** (lineage / validators / Derived·Product). Logical replacement also uses `genericFamilyMemberIdentityKey` (AUTHORED / SYMMETRY / DERIVED axes) — not coordinates.
9. **Track KEEP** as Member semantic. Symmetry may change Ball3 → different `positionId`; track remains a separate field.
10. Local WRITE SSOT = `normalized_dataset` (NormalizedDatasetEnvelope). ~~Flat `positions_dataset` = compatibility only~~ — **SUPERSEDED Phase C-2:** Local persisted flat / family_* shadow removed. **Phase D-2:** repository Publish write SSOT = NormalizedDatasetEnvelope v3 (per-leaf cutover; untouched leaves may remain flat v2).

#### Logical Member identity (existing)

| Kind | `genericFamilyMemberIdentityKey` shape |
|------|----------------------------------------|
| AUTHORED | `family:{familyId}\|base:AUTHORED` |
| SYMMETRY | `family:{familyId}\|sym:{H\|V\|RPI}` |
| DERIVED | `family:{familyId}\|src:{from}\|rule:{rule}\|step:{step}` |

#### Next Architecture Issue — Family MASTER / MEMBERS Storage Separation

**Problem:** Flat production `positions.json` repeats Family-common payload on every Member (`TEMPORARY_COMPATIBILITY_DUPLICATION`).

**Common payload examples (duplicated today):** `signature` · `sysInputs` · `corrections` · `ai` · `str` · canonical `hpT`

**Member-specific candidates (future split audit):** `balls` · `positionId` · `track` · `memberOrigin` · `symmetryOp` · `derivedRule` / `derivedStep` · `generatedFromMemberId` · `memberId` · member meta / extensions

**Amplification input (Product):** `DERIVED_CUE_C3_PRODUCT` expected ≈ `4 * (nc + n3 + nc*n3)` per Family; large term `4 * nc * n3`. Product delete/shrink policy **not** decided here.

**Search input:** Current recall is Ball3 distance **O(N)** linear rank; no Search Index. Future candidate: lightweight index (`positionId`, slot, track, `familyId`, `memberId`) → hydrate — **not** implemented here.

**Ownership SSOT:** ratified below (2026-09-20). Open questions for field ownership / meta / HPT are **closed**. Remaining: production WRITE cutover.

**Next Track:** Family MASTER / MEMBER Production Storage Cutover Audit (Ask) — after Ownership + Hydration Fidelity ratification.

### Family MASTER / MEMBER Ownership Contract (2026-09-20)

**Authority:** 본 절 · Architecture Ownership SSOT

**Code owners:** `domain/family/familyNormalizedSchema.ts` · `familyHydrate.ts` · `rebuildCanonicalMemberMeta.ts` · `familyMigrationDebt.ts` · `migratePositionRecordsToFamilyParts.ts` · `hptResolver.ts`

**Contract tests:** `domain/family/familyMasterMemberOwnership.contract.test.ts`

**Not this work:** production WRITE cutover · dataset migration · Product Cartesian shrink · Search Index · calculation formula change · ID redesign

#### FAMILY OWNS THE STRATEGY

Family는 공략 자체를 소유한다. 같은 `familyId`의 모든 Member는 동일한 공략 정의를 공유한다.

Member가 다른 위치에 있다고 해서 별도의 SYS / correction / AI / STR / canonical HPT / thickness를 소유하지 않는다.

공략 정의가 달라져야 하면 **새 Member가 아니라 새 Family**다.

| Intent | Effect |
|--------|--------|
| **SAVE** | Always **NEW** Family (`familyId` mint) |
| **OVERWRITE** | Trusted source Family **UPDATE** (same `familyId`) |

예: Family A Cue→Impact 30% 이후 다른 correction이 필요하면 Family A 내부 Derived의 correction을 바꾸지 않는다. Derived Position recall 후 **SAVE → NEW Family B**.

**Member-specific strategy override 개념은 존재하지 않는다.**

#### Field Ownership Matrix

| Category | Fields | Notes |
|----------|--------|-------|
| **MASTER** | `familyId`, `signature`, `sysInputs`, `corrections?`, `correctionsStored?`, `ai?`, `str?`, canonical `hpT?` (thickness = `hpT.T`) | Authoritative Family-common strategy payload. Optional semantics follow existing `FamilyMaster` type. |
| **MEMBER** | `memberId`, `familyId` (FK), `balls`, `track`, `memberOrigin`, `generatedFromMemberId?`, `symmetryOp?`, `derivedRule?`, `derivedStep?`, `authoringStrategyId?`, `sourceSlot`, `targetBall?` (+ storage of the Track-projected fields below) | Geometry / Track / provenance / packing. `positionId` = `createPositionId(balls)` (derivable; retained on PositionRecord). AUTHORED + SYMMETRY `sourceSlot` = the Family Strategy Slot (identical on all four Tracks — see **4-TRACK FAMILY STRATEGY SLOT INVARIANT**, Phase F-3B.2). **OVERWRITE never changes any MEMBER field** (Phase F-3D) — `memberId` and `authoringStrategyId` are permanent identity. |
| **FAMILY-COMMON · TRACK-PROJECTED** (Phase F-3C.2) | `reflectionOverride?` (C2 `{rail, t}`), `trajectoryExtensions?` | **Physical storage:** Member field (raw values differ per Track). **Semantic ownership:** Family-common strategy — one C2 / one Extension per Family. **Authority:** the AUTHORED Member's value (AUTHORED track frame) is canonical. **Projection:** SYMMETRY Members store the deterministic H/V/RPI projection, regenerated from AUTHORED on every 4-Track write; C3+ / Product Derived copy their same-track base projection; Cue→Impact Derived carries neither. SYMMETRY / Derived raw values are never an independent strategy authority (no Member-specific strategy override). Not in `FAMILY_MASTER_COMMON_FIELD_KEYS` (those require byte-identical copies). |
| **DERIVABLE** | `meta` (impact/final/angles), runtime/display mirrored HPT & thickness, `positionId` from balls | Not Family Master. Not Member strategy authority. Rebuild via existing calculation owner. `meta` may legitimately change on OVERWRITE with identical balls when Family-common values (sysInputs · signature · hpT · corrections) change — never freeze it as identity (Phase F-3D). |
| **COMPATIBILITY DUPLICATE** | Flat `StrategyEntry` copies of MASTER common payload | `TEMPORARY_COMPATIBILITY_DUPLICATION` on **rematerialized runtime** objects only — **not** a durable Local store. ~~Production WRITE SSOT still flat `positions_dataset` / `positions.json`.~~ **SUPERSEDED:** Local WRITE = `normalized_dataset` (B-1); Local flat persist removed (C-2). External Export/Publish/`positions.json` remain flat until Phase D. |

#### HPT / Thickness

- **Stored canonical HPT / thickness (`hpT.T`):** Family MASTER
- **Runtime / display mirrored HPT / thickness:** DERIVABLE from Master canonical + Member Track handedness (`resolveFamilyHpt`) — **not** a new stored Member 공략 SSOT
- Flat Member `hpT` copies remain temporary compatibility only

#### Meta + Hydration Fidelity

- `meta` = **DERIVABLE geometry** (Master strategy + Member balls + existing `rebuildCanonicalMemberMeta` / `evaluateStrategy` / `buildStrategyMeta`)
- Normalized hydrate (`hydrateFamilyMemberToPositionRecord` / rematerialize) **MUST** rebuild canonical meta when `options.meta` omitted
- **`placeholderMeta` must NEVER be the final production-equivalent hydrated StrategyEntry.meta**

#### Shadow store status (historical · SUPERSEDED Phase C-2)

- ~~`family_masters` / `family_members`: dual-written after positions persist; gated READ may rematerialize~~
- ~~Production **WRITE SSOT unchanged** (flat). Flag / dual-write cutover **not** decided here~~
- **Phase C-2 ACTIVE:** no production dual-write; no production App-load fallback to `family_*` or `positions_dataset`. Stale browser keys are ignored.

#### Separated problems

| Problem | Status |
|---------|--------|
| **A — Duplicated Master payload** | Ownership + hydrate fidelity **ratified**; WRITE cutover = next Ask |
| **B — Product Cartesian member count** | **Separate** later architecture issue — not solved by MASTER/MEMBER split |

**Next Track:** Family MASTER / MEMBER Production Storage Cutover — Phase A Canonical Normalized Dataset Envelope (in progress / below).

### Canonical Normalized Dataset Leaf Envelope (Phase A · 2026-09-21)

**Authority:** 본 절 · future leaf storage contract

**Code owners:** `domain/dataset/normalizedDatasetEnvelope.ts` · `domain/family/familyNormalizedSchema.ts`

**Contract tests:** `domain/dataset/normalizedDatasetEnvelope.contract.test.ts`

**Not this work:** WRITE/READ/Export/Publish cutover · dataset wipe · Search Index · Product shrink

#### Path (unchanged)

```text
dataset/{shotType}/{systemLabel}/positions.json
```

Filename **kept**. Path resolvers / Vercel public URLs **unchanged**.

#### Schema versions (distinct contracts)

| Version | Shape | Status |
|---------|--------|--------|
| `DATASET_EXPORT_SCHEMA_VERSION` = **2** | `records: PositionRecord[]` | **LIVE** Export / Publish / Published loader |
| `NORMALIZED_DATASET_SCHEMA_VERSION` = **3** | `familyMasters[]` + `familyMembers[]` | **LIVE Local durable SSOT** (`normalized_dataset`) since B-1/C/C-2; repository leaf still flat v2 until Phase D |
| `PublishOperation.schemaVersion` = **1** | publish intent identity | **Separate** — not coupled to leaf schemaVersion |

#### Canonical future leaf content

```text
NormalizedDatasetEnvelope {
  schemaVersion: 3
  shotType, systemId, systemLabel
  exportedAt?, sourceSnapshotId?
  familyMasters: FamilyMaster[]
  familyMembers: FamilyMember[]
}
```

- **Storage ≠ Runtime.** Runtime may hydrate to `PositionRecord` / `StrategyEntry`; that projection is **not** canonical storage.
- **Forbidden:** hydrate → flat `records[]` → export (would reintroduce Master payload duplication).
- **Member** must not carry Master common fields (`FAMILY_MASTER_COMMON_FIELD_KEYS`).
- **Position × Strategy Slot occupancy (Phase C-0 ACTIVE):** `(positionId, sourceSlot) → at most one familyId`. Same Position + same `sourceSlot` across different Families = **REJECT** (`POSITION_STRATEGY_SLOT_CONFLICT`). Same Position + different slots = **PASS**. Same slot + different Positions = **PASS**.
- ~~Previous Phase A note: “Same Position + same sourceSlot across different Families is LEGAL” / “Global uniqueness of positionId+sourceSlot is FORBIDDEN” — **SUPERSEDED** by Phase C-0.~~ Occupancy uniqueness is **not** a Family-ID rule; `familyId` remains `fm_<uuid>`.
- Logical Member uniqueness remains **Family-scoped** (`genericFamilyMemberIdentityKey`).
- Legacy test datasets may be discarded at clean cutover (Phase F); **no migration requirement**. Phase A does **not** delete data.

#### Helpers

- `parseNormalizedDatasetEnvelope` — fail-closed; rejects flat `records[]` without silent migration
- `isFlatLegacyDataset` / `isNormalizedDataset` — discriminators
- `composeNormalizedDatasetEnvelope` / `decomposeNormalizedDatasetEnvelope` — pure shadow ↔ leaf shape (no persistence)

**Next Track (historical Phase A pointer):** ~~Phase C — Local READ / Member-Centric Search + Hydration.~~ → **DONE** (see Phase C / C-2).

### Phase B-0 — Product Export Pipeline Permanent Removal (2026-09-21)

**Authority:** 본 절 · Product = FamilyMember; no product_export side-channel

**Code owners:** `hooks/useSettings.js` (Dataset Export only) · `domain/family/buildCueC3ProductMembers.ts` · `domain/family/unifiedDerivedReview.ts`

**Contract tests:** `domain/productExportSideChannelRemoval.contract.test.ts`

#### SSOT

- **Product** (`DERIVED_CUE_C3_PRODUCT`) = **FamilyMember** sharing **FamilyMaster** strategy common payload.
- Generation is **in-app / in-memory** (`buildCueC3ProductMembers` → Unified Derived Review → Approval → corpus persist).
- **Does not** depend on `product_export/` or `export_request.json`.

#### Removed

- App producer: `productExportRequest.ts`, `saveProductExportRequestToFile`, `__PRODUCT_EXPORT_HOST__` bridge
- Manual Export side-channel that wrote `product_export/export_request.json`
- Legacy offline Python package `product/` (Mission 01–04 export→handoff→package→deploy CLI) and its pytest suite
- `.gitignore` `product_export/` rule (must not be created; do not hide)

#### Preserved

- Manual Dataset Export → `dataset/{shotType}/{systemLabel}/positions.json` (flat schemaVersion **2** until Phase D)
- PublishOperation / Publish / Search / Local WRITE SSOT (unchanged this Phase)
- Canonical shotType/system `positions.json` leaves (not deleted; Phase F Clean Reset)

#### Dataset root policy

```text
dataset/
  {shotType}/
    {systemLabel}/
      positions.json
```

**Forbidden:** `dataset/product_export/`, `export_request.json` scratch under dataset root.

**Next Track (historical Phase B-0 pointer):** ~~Phase C — Local READ / Member-Centric Search + Hydration.~~ → **DONE** (see Phase C / C-2).

### Phase B-1 — Atomic Normalized Local Corpus Store (2026-09-21)

**Authority:** 본 절 · Local WRITE SSOT cutover

**Code owners:**
- `domain/dataset/infra/canonicalNormalizedCorpusStore.ts`
- `domain/dataset/infra/persistWorkingCorpusNormalizedAuthority.ts`
- `application/flows/saveFlow.ts` · `derivedApprovalFlow.ts`

**Contract tests:** `domain/dataset/canonicalNormalizedCorpus.contract.test.ts`

#### Local WRITE SSOT (LIVE)

```text
localStorage key: normalized_dataset
type: NormalizedDatasetEnvelope (schemaVersion = 3)
contents: familyMasters[] + familyMembers[]
```

- **SAVE success** = validate + ONE durable canonical commit (+ read-back) only.
- Flat `positions_dataset` = ~~compatibility projection~~ **REMOVED as production persist/App authority (Phase C-2)**.
- `family_masters` / `family_members` = ~~best-effort shadow~~ **REMOVED as production dual-write/fallback (Phase C-2)**.
- **Position Strategy Cardinality (Phase C-0):** One Position → max 3 Strategies; each `S1`/`S2`/`S3` → 0..1 Family. Occupancy conflict → validation reject → **zero** canonical writes.
- ~~same Position + same `sourceSlot` across Families = legal — **SUPERSEDED**.~~ Flat packing cardinality now matches domain occupancy invariant.
- Repository `positions.json` remains flat schemaVersion **2** until Phase D.
- Manual Export / Publish / Search algorithms unchanged this Phase.

#### Atomicity

| Level | Status |
|-------|--------|
| In-memory build + validate | YES |
| Application (no write on invalid) | YES |
| Storage (single-key setItem) | YES |

### Phase C-0 — Position × Strategy Slot Cardinality SSOT Correction (2026-09-21)

**Authority:** 본 절 · One Position = maximum three Strategies

**Code owners:** `domain/dataset/normalizedDatasetEnvelope.ts` · `domain/family/familyAwareWriter.ts` · `application/flows/saveFlow.ts`

#### FINAL SSOT

```text
Position (cue/target/second via createPositionId)
  ├─ S1 → 0..1 Family
  ├─ S2 → 0..1 Family
  └─ S3 → 0..1 Family

(positionId, sourceSlot) → at most one familyId
Families per Position: 0..3
```

- Different 공략 on the same Position → admin stores on a **different** Strategy Slot (S1/S2/S3). Same system name with different thickness/HPT/correction may still be separate Strategies (admin decision; no auto equality).
- `familyId` / `memberId` formats unchanged (`fm_` / `mb_` UUID). Position+Slot is **occupancy only**, never Family ID.
- Same Family across many Positions (AUTHORED + SYMMETRY + Derived + Product) remains **LEGAL**.
- **SAVE** to occupied preferred Slot → **BLOCK** (clear Korean reason; no auto S2/S3; no auto-overwrite).
  - Phase F-3B.2: the required slot applies to **every** AUTHORED + H/V/RPI SYMMETRY Member Position of the 4-Track set (no first-empty fallback for symmetry Members).
- **OVERWRITE** same Family on its Slot → **PASS**; collision with another Family's occupied Slot → **BLOCK**; failed overwrite preserves prior corpus.
  - Phase F-3C: the OVERWRITE target = the **trusted Family's stored AUTHORED root** (Position · track · Family Slot · memberId), **not** the Recall entry Member's coordinates and not the current screen balls. SYMMETRY / DERIVED Recall therefore rewrite the same 4-Track Positions in place (no self-conflict, no relocation).
- schemaVersion **3** retained (validator strengthen; no bump).
- Local Search / Published Search / Export / Publish / dataset leaves / Product / trajectory: **UNCHANGED**.

**Next Track (historical Phase C-0 pointer):** ~~Phase C — Local READ / Member-Centric Search + Hydration~~ → **DONE** (see Phase C / C-2).
(Design must assume ≤3 Strategy candidates per Position match; not multiple Families per same Slot.)

### Phase C — Local READ / Member-Centric Search + Hydration (2026-09-22)

**Authority:** 본 절 · Normalized Local Search READ cutover

**Code owners:** `domain/recall/normalizedLocalMemberSearch.ts` · `application/flows/adminLocalDbFlow.ts` · `domain/recall/recallCompare.ts` (generic Ball3 rank)

#### FINAL Local SSOT

```text
LOCAL WRITE SSOT = normalized_dataset
LOCAL READ  SSOT = normalized_dataset

SEARCH UNIT     = FamilyMember.balls
STRATEGY OWNER  = FamilyMaster (via member.familyId)
POSITION        = createPositionId(member.balls)
STRATEGIES      = S1 / S2 / S3 (0..1 Family each; C-0)
```

#### Pipeline

```text
normalized_dataset
  → parseNormalizedDatasetEnvelope
  → familyMembers[] Ball3 rank (shared euclidean primitives)
  → winning Position's S1/S2/S3 Members preserved
  → rematerialize ONLY those Members + Masters
  → applyPositionRecall (runtime PositionRecord)
```

#### Authority gates

| Key | Local Search authority |
|-----|------------------------|
| `normalized_dataset` | **YES** (only) |
| `positions_dataset` | **NO** (obsolete; not production persist/App load) |
| `family_masters` / `family_members` | **NO** |

- invalid / missing canonical → **FAIL CLOSED** (no flat/shadow fallback)
- empty valid normalized → **NO MATCH** (stale flat ignored)
- Published Search remains flat `positions.json` (unchanged)

### Phase C-2 — Local Persisted Flat Compatibility Removal (2026-09-22)

**Authority:** 본 절 · Local durable SSOT = `normalized_dataset` only

**Code owners:**
- `domain/family/loadProductionCompatibleDataset.ts`
- `domain/dataset/infra/persistWorkingCorpusNormalizedAuthority.ts`
- `application/flows/saveFlow.ts` · `derivedApprovalFlow.ts`
- `domain/datasetExport.ts` · `hooks/useSettings.js` · `App.jsx`

#### FINAL Local architecture

```text
LOCAL DURABLE SSOT = normalized_dataset only

APP LOAD   = canonical rematerialize → PositionRecord[] (MEMORY ONLY)
SEARCH     = FamilyMember-centric (Phase C; unchanged)
SAVE       = memory mutate → canonical commit (no flat/shadow write)

positions_dataset          = NOT production persist / NOT App authority
family_masters/members     = NOT production dual-write / NOT fallback
PositionRecord[]           = runtime projection KEEP
```

#### Fail-closed

- canonical invalid / rematerialize fail → empty App dataset (no flat/shadow)
- canonical absent (fresh) → empty App dataset
- stale browser flat/shadow keys ignored

#### External flat boundaries (kept intentionally)

- Manual Export UI **removed** (D-3); dead helpers removed (F-1)
- DatasetExportPayload schemaVersion **2** retained for legacy leaf / first-touch Publish
- PublishOperation / PublishFamilyPayload (History transport — unchanged)
- repository `positions.json` may remain physical **v2** until first-touch Publish (writer = v3)
- Published runtime read/cache = NormalizedDatasetEnvelope (E-1…E-3)
- workspace_history snapshot payloads

### Phase D-1 — Normalized Whole-Leaf Publish Mutation (2026-09-22)

**Authority:** 본 절 · Pure domain only · No production cutover

**Code owners:**
- `domain/publishedNormalizedLeafMutation.ts`
- `domain/publishedNormalizedLeafMutation.contract.test.ts`

**What is ready:**
- Pure CREATE / UPDATE mutation:
  existing NormalizedDatasetEnvelope + PublishOperation + PublishFamilyPayload
  → validated candidate NormalizedDatasetEnvelope
- Reuses `migratePositionRecordsToFamilyParts` + `parseNormalizedDatasetEnvelope` (C-0 occupancy)
- CREATE retry = idempotent same-`destinationFamilyId` replacement
- Different Family + same Position+Slot = `POSITION_STRATEGY_SLOT_CONFLICT` (BLOCK)
- Semantic equality helper for D-2 readback prep
- History UI / Vite publisher / Git / deploy verify / Published Search / `dataset/**` **unchanged**

**What is NOT active:**
- Actual normalized Publish write to repository
- Published Search rematerialize adapter
- History ONE Publish UI
- Manual Export removal

**Next Track:** Phase D-2 — Normalized Publisher + Published Read Adapter Cutover.

### Phase D-2 — Normalized Publisher + Published Read Adapter Cutover (2026-09-22)

**Authority:** 본 절 · Production repository write SSOT = NormalizedDatasetEnvelope v3

**Code owners:**
- `domain/publishedLeafPrepare.ts` (v2|v3|absent → D-1 mutation → v3 candidate)
- `domain/publishedNormalizedWrite.ts` + `repoPublish/writeVerifiedPublishedLeafFs.ts`
- `repoPublish/publishDatasetToRepo.ts` · `gitPublish.ts` · `productionVerify.ts`
- `domain/datasetLoader.ts` (v2/v3 reader adapter)
- v3 leaf protection via `isNormalizedDataset` / leaf-kind detect (no Manual Export path)

**What is active:**
- Publish writes **schemaVersion 3** NormalizedDatasetEnvelope to `positions.json`
- First Publish of a v2 target leaf converts that leaf only (no bulk migration)
- Mixed repository allowed: some leaves v3, untouched leaves remain v2
- Published reader: v2 flat parse OR v3 parse + rematerialize → PositionRecord[]
- Git staged blob + production verify require v3 semantic equality
- Manual Export blocked from overwriting an existing v3 leaf

**What is NOT active:**
- Bulk dataset/** migration
- Native Member-centric Published Search (Phase E)
- Local SSOT change

**Next Track:** Phase D-3 — History ONE Publish UX. (COMPLETE — see below)

### Phase D-3 — History ONE Publish UX (2026-09-22)

**Authority:** 본 절 · History user-facing deployment action = Publish only

**Product rules (fixed):**
- History user-facing action = **Publish only**
- Independent Manual Export UI **removed**
- Internal repository file-write remains inside Publish pipeline (D-2 normalized v3 writer)
- Strict SUCCESS = **PRODUCTION_VERIFIED** only
- `PRODUCTION_VERIFY_TIMEOUT` / Git push failure / semantic mismatch → **NOT** completed (`exported` not set)
- Publish in-flight duplicate protection (handler-owned ref + UI disable)
- Failure stage UX (beginner-first messages)
- SAVE remains Local-only
- Local Search / Published Search remain separate
- Publish remains localhost admin environment only
- Repository writer remains normalized v3; Published reader remains v2/v3 adapter
- Tab label **Unexported** retained (means not yet PRODUCTION_VERIFIED Publish)
- Legacy History `exported:true` rows are **not** auto-migrated

**Code owners:**
- `components/WorkspaceHistoryModal.jsx` (Publish-only footer; selection retained until success)
- `hooks/useSettings.js` (`handlePublishSnapshots` strict SUCCESS + `publishInFlight`)
- `App.jsx` (wires `onPublish` + `publishInFlight`; no `onExport`)

**What is NOT active:**
- Native Member-centric Published Search rewrite (Phase E-2)
- History schema migration / PublishOperation / PublishFamilyPayload schema change
- D-2 writer / Local SSOT / C-0 / Search architecture change

**Next Track:** Phase E — Native Normalized Published Search (E-1 COMPLETE — see below).

### Phase E-1 — Normalized Published Store / Loader Authority (2026-09-22)

**Authority:** 본 절 · Published load/cache AUTHORITY = NormalizedDatasetEnvelope

**Product rules (fixed):**
- Published load: **v2 → in-memory** `convertFlatDatasetExportToNormalizedLeaf` (no disk rewrite)
- Published load: **v3 → native** `parseNormalizedDatasetEnvelope`
- Invalid v2/v3 → **fail closed** (no v3→flat fallback)
- Cache authority = normalized envelope / Masters / Members (+ derived `masterByFamilyId`)
- `records` = **TEMPORARY COMPATIBILITY PROJECTION** via `rematerializeFamilyPartsToPositionRecords` (eager)
- Existing Published Search still uses flat projection until E-2 (profiles unchanged)
- Real Interpolation still consumes compatibility `records`
- No persisted Search Index; no KD rewrite for Published Search
- Publish pipeline / History / Local SSOT / Local Search **unchanged**
- No durable dataset/** migration

**Code owners:**
- `domain/datasetLoader.ts`
- `domain/publishedDatasetStore.ts`

**Next Track:** Phase E-2 — Member-Centric Published Search + Winner-Only Hydration (COMPLETE — see below).

### Phase E-2 — Member-Centric Published Search + Winner-Only Hydration (2026-09-22)

**Authority:** 본 절 · Published Search corpus = FamilyMember[] (Position-level candidates)

**Product rules (fixed):**
- Published ADMIN/USER Search: `runNormalizedPublishedMemberSearch`
- Position candidate = `createPositionId(member.balls)` group (not per-Member ranking bias)
- Profiles unchanged: ADMIN `adminStrict` manhattan · USER `userStrict` manhattan
- Winner-only: sibling S1/S2/S3 Members + Masters → `rematerializeFamilyPartsToPositionRecords`
- Search does **not** use `entry.records` / `loadResult.records` as corpus
- Runtime PositionRecord = winner hydrate only (UI/recall boundary)
- `records` cache field **retained** for Real Interpolation TEMP COMPAT (E-3)
- Fail-closed: missing Master / duplicate sourceSlot / hydrate failure
- No persisted Search Index; no KD rewrite
- Publish / History / Local SSOT / Local Search **unchanged**

**Code owners:**
- `domain/recall/normalizedPublishedMemberSearch.ts`
- `application/flows/adminSearchFlow.ts`
- `application/flows/userSearchFlow.ts`

**Next Track:** Phase E-3 — RI / Remaining Published Flat Compatibility Cleanup (COMPLETE — see below).

### Phase E-3 — Real Interpolation / Remaining Published Flat Compatibility Cleanup (2026-09-24)

**Authority:** 본 절 · Phase E COMPLETE — Published flat whole-leaf cache removed

**Product rules (fixed):**
- RI reads normalized Masters/Members from Published cache
- RI knot corpus: on-demand `rematerializePublishedLeafForRi` (whole-leaf; Cue-1D brackets)
- RI formulas / neighbor / weights / thresholds **unchanged**
- Published cache: **no** `records: PositionRecord[]` field
- Loader: **no** eager whole-leaf rematerialization
- Search remains Member-centric (E-2)
- Runtime PositionRecord only at Search winner / RI on-demand / UI boundaries
- No persisted Search/RI Index; no KD rewrite
- Publish / History / Local SSOT / Local Search **unchanged**

**Code owners:**
- `domain/realInterpolation/rematerializePublishedLeafForRi.ts`
- `domain/datasetLoader.ts`
- `domain/publishedDatasetStore.ts`
- `App.jsx` (RI wiring)

**Phase E COMPLETE:** YES

**Next Track:** Phase F — Closure (F-1 COMPLETE · F-2 Real Publish E2E **WAIT for user approval**).

### Phase F-1 — Final Legacy Cleanup / SSOT Drift Repair (2026-09-24)

**Authority:** 본 절 · No architecture rewrite · cleanup only

**What changed:**
- Dead Manual Export production handlers removed (`handleExportSnapshots` / folder picker / `saveDatasetExportToFile`)
- History remains Publish-only (Delete / Publish / Close)
- Stale CURRENT `positions_dataset` / flat-authority / Published-records-authority docs & UI strings repaired
- `productionVerify.contract.test.ts` file-local timeout (20s) for temp-git infra flake — production verify semantics **unchanged**
- DatasetExportPayload v2 · v2→v3 converter · PublishFamilyPayload · PositionRecord runtime roles · rematerialize helpers **retained**
- No `dataset/**` migration · no real Publish · no Search/RI/Publish/Local SSOT rewrite

**CURRENT architecture (post F-1):**

```text
LOCAL:
  normalized_dataset → NormalizedDatasetEnvelope
  → FamilyMaster / FamilyMember → Member-centric Search
  → winner hydrate → Runtime PositionRecord

PUBLISHED:
  repository v2/v3 → ONE normalized read path
  → NormalizedDatasetEnvelope cache → FamilyMember Search
  → winner-only hydrate → Runtime PositionRecord

RI:
  Normalized Masters/Members → on-demand rematerialization → existing RI algorithm

PUBLISH:
  History ONE Publish → normalized candidate → atomic repository write
  → Git → push → production semantic verification
  → PRODUCTION_VERIFIED only on SUCCESS

Repository leaves: writer = v3; checked-in leaves may remain v2 until first-touch Publish.
```

**Phase F-1 COMPLETE:** YES

**Next Track:** Phase F-2 — Real Publish / Production E2E (do not auto-start; user must approve test Family/leaf).

### Phase F-2B — First-Touch Legacy v2 Canonical Meta Repair (2026-09-25)

**Authority:** 본 절 · EXISTING v2 migration boundary only · no validator weakening

**Root cause (F-2A):** first real 뒤돌리기 Publish failed at
`convertFlatDatasetExportToNormalizedLeaf` → `validatePublishedExportCandidate`
→ `flat-leaf-validation-failed` / `meta:missing` on legacy DERIVED* entries
(PRODUCT / C3_PLUS / CUE_IMPACT). Migration never started. New Family not at fault.

**Fix:**
- `repairLegacyV2MissingMeta` — pure in-memory; semantic eligibility (missing meta +
  complete rebuild inputs); calls `rebuildCanonicalMemberMeta` only; no placeholders
- Wired **only** into `convertFlatDatasetExportToNormalizedLeaf` (existing v2 /
  Published reader first-touch path)
- Strict `validatePublishedExportCandidate` / CANONICAL meta required **unchanged**
  for new flat payloads

**Dry-run (no dataset write):**
- 옆돌리기: 252 missing meta → repaired → convert PASS (masters=1, members=256)
- 뒤돌리기: 884 missing meta → repaired → flat validate PASS → migrate FAILS
  `NO_AUTHORED_SEED` (Product-only family `fm_668fe281…` has no AUTHORED Master seed)
  — **next blocker; do not invent AUTHORED in F-2B**

**Not done:**
- real History Publish retry
- dataset/** rewrite
- F-2 COMPLETE

**Phase F-2B (meta gate) COMPLETE:** YES
**First-touch fully unblocked for 뒤돌리기:** NO (`NO_AUTHORED_SEED` → resolved in F-2C)

**Next Track:** Phase F-2C — resolve Product-only family AUTHORED-seed migration
(or offline leaf disposition) before user retries same History Publish.

### Phase F-2C — Discard Unrecoverable Orphan Product Family (2026-09-25)

**Authority:** 본 절 · Policy D (user chose discard orphan Product-only Family) · no architecture change

**Target:** `dataset/뒤돌리기/파이브앤하프/positions.json` (schemaVersion **2** kept on purpose)

**Orphan:** `fm_668fe281-7b09-4a97-b7c3-594315ea104d`
- 336 StrategyEntry · DERIVED_CUE_C3_PRODUCT only · AUTHORED/SYMMETRY/CUE_IMPACT/C3_PLUS = 0
- `generatedFromMemberId` → 4 missing parents · true upstream AUTHORED unrecoverable
- current producer cannot create this structure · historical incomplete / obsolete test corpus

**Disposition:**
- deleted by `familyId` only (336 entries / empty PositionRecords pruned)
- **no** Product→AUTHORED fabrication · **no** identity rewrite · **no** validator weaken
- F-2B meta repair remains **in-memory** first-touch only (not persisted into v2 leaf)
- healthy 5 Families preserved (each exactly one AUTHORED)

**Counts:** PositionRecords 2228→1892 · StrategyEntries 2232→1896 · Families 6→5

**In-memory first-touch after edit:**
v2 → legacy meta repair → strict flat validate → migrate → normalize → parse → **PASS**
(Masters=5 · Members=1896 · AUTHORED=5 · C-0 PASS · generatedFrom PASS)

**Not done:** real History Publish · repo v3 write · Git deploy · PRODUCTION_VERIFIED · Published Search smoke

**Phase F-2C COMPLETE:** YES
**F-2 COMPLETE:** NO (real production E2E still pending)

**Next Track:** User manually retries the **SAME** Unexported History Publish item.

### Phase F-2E — Publish-Time Occupancy Confirmation + Family Replacement (2026-09-25)

**Authority:** 본 절 · CASE A (RESOLVABLE_PUBLISH_OVERWRITE) from F-2D-2 diagnostic

**Evidence (F-2D-2):**
- Unexported History `0600c4f9…` CREATE `fm_2a1440b5…`
- AUTHORED `200160600200200200` S1 matches existing `fm_3c75c038…`
- 4 conflicts (1 AUTHORED↔AUTHORED + 3 SYMMETRY↔SYMMETRY); single existing Family

**Delivered:**
- `publishOccupancy.ts` — Map `(positionId|sourceSlot)` index; resolvable classifier
- `prepareNormalizedPublishCandidate` returns `RESOLVABLE_PUBLISH_OVERWRITE` (no write)
- User confirm → remap payload to existing familyId + UPDATE; History snapshot immutable
- Stale leaf revision (SHA-256 of leaf bytes) revalidated before confirmed write
- Cancel → zero write / Unexported
- Hard fail for derived-only / multi-Family / corruption (no overwrite dialog)
- UI: `window.confirm` Korean overwrite prompt in `handlePublishSnapshots`

**Contracts:**
- Local SAVE ≠ Published occupancy authority
- C-0 remains strict for all Members
- Occupancy index derived/rebuildable — not SSOT
- Existing Published familyId survives confirmed replacement
- No auto S1→S2; no auto overwrite without confirm

**Not done:** real History Publish retry · ADMIN_OPERATION_MANUAL · F-2 COMPLETE

**Phase F-2E COMPLETE:** YES (implementation)
**F-2 COMPLETE:** NO (awaits real Publish verification)

**Next Track:** User manually retries the **SAME** Unexported History Publish item.

### Phase F-2F — Preserve Publish Overwrite Conflict Through Local Git Client (2026-09-25)

**Authority:** 본 절 · F-2F Ask root cause

**Bug:** `publishDatasetToLocalRepoGit` nested `body.conflict["conflict"]` → always undefined;
`leafRevision` was fine. UI incomplete after confirm.

**Fix:** Parse `body.conflict` as `ResolvablePublishOverwriteConflict`; keep `leafRevision`.
No useSettings fallback reconstruction. History/dataset untouched.

**Contracts:** parser regression + confirm→retry (`targetFamilyId` / `expectedLeafRevision`).

**Phase F-2F COMPLETE:** YES (implementation)
**F-2 COMPLETE:** NO (awaits real Publish verification)

**Next Track:** User manually retries SAME Unexported History Publish → 확인.

### Phase F-2G-2 — Reconcile Partial Publish Candidate + assume-unchanged Visibility (2026-09-25)

**Authority:** 본 절 · F-2G-1 exact Git truth

**Cause:** Confirmed overwrite wrote WT v3 candidate; `assume-unchanged` hid porcelain dirty → `expected-target-not-dirty`. Not a C-0 failure.

**Recovery:** Semantic+byte match to reconstructed prepare candidate → clear target flag → commit/push leaf → PRODUCTION_VERIFIED.

**Prevention:** `clearAssumeUnchangedForTargets` in `verifyPostWriteWorkingTree` (target-scoped; no restore; no project policy for permanent assume-unchanged on dataset leaves).

**History:** exported still false in browser LS (Agent cannot safely mutate Chrome localStorage). Reconcile via UI helper after PRODUCTION_VERIFIED — do not re-Publish.

**Phase F-2G-2 COMPLETE:** YES (repo/production)
**F-2 COMPLETE:** NO until History exported reconciled + Local UX phase

**Next Track:** Mark snapshot `0600c4f9…` exported via supported post-PRODUCTION_VERIFIED path; then Local S1/S2/S3 UX.

> **F-2 status update:** History snapshot `0600c4f9…` marked exported (F-2G-3). **F-2 COMPLETE.**

### Phase F-3B — ADMIN Strategy Destination Slot + Edit Draft Preservation (2026-09-27)

**Authority:** 본 절 · F-3A audit

**Rule:** During ADMIN editing, **S1/S2/S3 = SAVE destination selection**, not navigation into stored slot data.
Selecting a slot keeps the current edit draft (SYS · HP/T · STR · AI · corrections · trajectory · Extension · C2 override · balls).

- SAVE = CREATE (new familyId) into the selected destination slot — unchanged
- SAVE conflict (C-0) preserves current work → user may select another empty slot → SAVE
- No automatic overwrite · no automatic slot move · C-0 unchanged
- OVERWRITE only when the active slot still carries the trusted recalled familyId (`isOverwriteSourceAlignedWithSlot`); a different destination slot disables OVERWRITE
- Ball Position change = new Position / new Family candidate → existing Family OVERWRITE disabled (existing `clearPublishedEditSession` on ball move); current content reusable for new Position SAVE
- Carry is runtime-only: no Local write · no History · no familyId mint

**Code SSOT:** `domain/adminStrategyDestinationSlot.ts` · `useShotSlots.selectDestinationSlotWithEditDraft` · App slot effect · `publishedEditSession.isOverwriteSourceAlignedWithSlot`

**Phase F-3B COMPLETE:** YES
**Next Track:** F-3C — exact OVERWRITE self/cross Family conflict diagnosis and fix.

### Phase F-3B.2 — 4-TRACK FAMILY STRATEGY SLOT INVARIANT (2026-09-27)

**Authority:** 본 절 · F-3B.1 sourceSlot audit

> A 4-Track set is not four independent strategies. It is one real billiards Position/strategy represented in four screen orientations. Therefore all AUTHORED + H/V/RPI symmetry Members of one Family MUST share the same S1/S2/S3 strategy slot.

- Coordinates / Track differ per Member (B2T_L · B2T_R · T2B_L · T2B_R); `familyId`, strategy slot and Family-common values (SYS · HP/T · STR · AI · corrections) are the **same**.
- The Family Strategy Slot = the slot selected at SAVE (`preferredAuthoredSlot`). Without a selection: the existing Family AUTHORED slot, else the lowest slot free at all four Positions.
- **No first-empty fallback** for AUTHORED / SYMMETRY Members.
- Any required `(positionId, slot)` held by another Family → **whole CREATE fails** (`POSITION_STRATEGY_SLOT_CONFLICT`): dataset unchanged · no partial Family · no orphan familyId · no S1/S3 fallback.
- C-0 `(positionId, sourceSlot) → at most one familyId` **unchanged**. No automatic slot movement.
- Same-Family rewrite (same familyId + same member identity) stays in place.
- **Derived Member (Cue→Impact · C3+ · Unified Review) slot semantics are NOT decided by this Phase** (writer keeps existing first-free placement for Derived).
- `FamilyMember.sourceSlot` for AUTHORED + SYMMETRY is the Family Strategy Slot, **not** arbitrary per-Position packing provenance. (Earlier wording “packing provenance only” is superseded for 4-Track Members.)
- No schema change · no new FamilyMaster field · no migration. Published audit (2026-09-27): 6 Families · 6 complete 4-Track · 0 mixed-slot · 0 C-0 violations. Local corpus: UNKNOWN (browser localStorage, not audited).

**Code SSOT:** `familyAwareWriter.ts` — `resolveFourTrackFamilyStrategySlot` (one slot per 4-Track set) → `FamilyWriteOptions.familyStrategySlot` → `resolveInsertSlot` strict for AUTHORED/SYMMETRY · tests `fourTrackStrategySlotInvariant.contract.test.ts`

**Phase F-3B.2 COMPLETE:** YES
**Next Track:** F-3C — reproduce exact Local OVERWRITE case and fix non-AUTHORED/Family self-conflict without changing the 4-Track strategy-slot invariant.

### Phase F-3C — Trusted Family OVERWRITE + Recall Position Difference Notice (2026-09-27)

**Authority:** 본 절 · F-3C.0 audit

**Frozen SSOT:** 4 Track = one real Position/strategy shown in four orientations. AUTHORED + H/V/RPI share one familyId and one S1/S2/S3. OVERWRITE modifies the existing trusted Family — it never promotes a Recall Member to a new original. SAVE = CREATE a new Family at the current screen Position (C-0 applies).

#### F-3C SSOT statements

- **OVERWRITE:** "Recall entry Member is only the entry point to a trusted Family. OVERWRITE targets the trusted Family's existing AUTHORED root, not the Recall entry Member's coordinates."
- **SAVE:** "SAVE uses current screen ball coordinates as the new Position and creates a new Family subject to C-0."
- **Search:** "Approximate Search may Recall an existing Member even when current screen coordinates differ. Immediately after successful Recall, show the actual individual ball-position differences between current screen and the winning stored Member."
- **Family-common:** "AUTHORED / SYMMETRY / DERIVED Recall all have equal eligibility to modify Family-common strategy data, provided trusted identity remains valid."

#### User operation flow (Behavior Documentation rule)

| 상황 | 사용자가 하는 일 · 보는 것 | 누르는 버튼 | 프로그램 처리 | 유지되는 것 | 바뀌는 것 |
|------|------|------|------|------|------|
| 원본 방향 Recall | 원본 Position에서 Search → 공략이 화면에 표시됨 → 내용 수정 | 덮어쓰기 | 같은 Family의 AUTHORED 원본 수정 | 원본 공 위치 · 4 Track · Family Slot · memberId | 공략 공용 내용(SYS·HP/T·STR·AI·보정·Extension) |
| 대칭 방향 Recall | 대칭 방향(H/V/RPI)에서 Search → 대칭 Member의 공략 표시 → 수정 | 덮어쓰기 | 대칭 Member를 새 원본으로 만들지 않고 기존 Family의 공용 내용 수정 (편집값은 원본 방향 기준으로 환산) | 원본 공 위치 · 4 Track 좌표 · Slot · 모든 memberId | 공용 내용 (4 Track 모두 동일하게 반영) |
| 파생 데이터 Recall | Derived Position에서 Search → 수정 | 덮어쓰기 | Derived를 원본으로 승격하지 않음; Family 공용 내용 수정 + 같은 Family의 Derived 공용값 동기화 | Derived 좌표 · Slot · memberId · 계보(generatedFrom · rule · step) | 공용 내용 |
| 근사 Search → 덮어쓰기 | 저장 위치와 조금 다른 화면 배치에서 Search → "유사한 공략을 찾았습니다" + 내공/앞공/뒷공 차이 안내 | 덮어쓰기 | 화면 좌표가 아니라 **저장된 원본 위치**에 기록 | 기존 Family 위치 (이동 없음) | 공용 내용 |
| 근사 Search → SAVE | 위와 같음 | SAVE | 현재 화면 좌표를 새 Position으로 **새 Family 생성** (C-0 적용) | 기존 Family 전체 그대로 | 새 Family 1개 추가 |
| Recall 후 공을 실제로 이동 | 내공/앞공/뒷공 중 하나를 드래그·직접 입력 | — | 덮어쓰기 자격 해제 (편집 draft는 유지) | 편집 중인 공략 내용 | 덮어쓰기 불가 → SAVE로 새 Position 저장 가능 |
| 두께(T) 변경 | 임팩트 핸들 드래그 / 두께 선택 | 덮어쓰기 | 두께는 Family 공용 값 → 덮어쓰기 자격 **유지** | Family 위치 | 두께(원본 방향 기준으로 환산 저장) |
| C2 수정 (F-3C.2) | 어느 방향(원본·대칭·파생)에서든 ADMIN C2 노란 점을 레일을 따라 이동 | 덮어쓰기 | 현재 방향의 C2를 AUTHORED 방향 기준으로 환산해 Family의 canonical C2로 저장 → 나머지 3방향은 H/V/RPI 대칭으로 재생성 → C3+ / Product 파생은 같은 방향 기준 Member의 C2를 따름 | Family 위치 · 4 Track · Slot · memberId · 파생 계보 | 4방향 C2 (각 방향 표현은 다르지만 같은 공략) |
| C2로 새 공략 저장 | 화면에서 C2 조정 | SAVE | 현재 화면 방향이 새 Family의 AUTHORED → 화면 C2가 그대로 canonical | 기존 Family | 새 Family 1개 |
| Published에만 있는 Family 덮어쓰기 (F-3D) | Published Search → 원본·대칭·파생 중 하나 Recall → 공용 내용 수정 | 덮어쓰기 | Local에 그 familyId가 전혀 없으면 Recall 때 읽은 Family 전체(원본·대칭·모든 파생)를 Local 작업 데이터에 그대로 올린 뒤 기존 덮어쓰기 수행 → 한 번에 저장 | 모든 memberId · authoringStrategyId · 좌표 · Track · Slot · origin · 파생 계보 · Member 수 | 공용 내용 (C2 · Extension은 기존 Member 위 projection) |

#### Rules

- **Three separate concepts:** Recall entry Member → difference notice + edit frame · trusted Family AUTHORED root → OVERWRITE geometry · current screen balls → SAVE only.
- **Root resolution:** LOCAL = Local normalized dataset AUTHORED Member · PUBLISHED = AUTHORED root captured at Recall from the Published normalized Family (`OverwriteRecallContext`, cleared with the edit session). A Local copy of a Published Family with a different root → fail closed (`OVERWRITE_FAMILY_ROOT_MISMATCH`). No root → fail closed (`OVERWRITE_FAMILY_ROOT_MISSING`). Current ballsState is never used as AUTHORED geometry. Published-only Family → whole identity graph seeded first (see **F-3D** below).
- **Edit frame → root frame:** HP/T edited on an opposite-handedness Member is mirrored back (exact inverse of Recall hydrate). Extension unchanged → root payload kept exactly; edited → transformed from the Recall track to the root track (H/V/RPI involution) and regenerated on all 4 Tracks.
- **Derived Family-common sync:** after a 4-Track UPDATE, same-family Derived Members receive the AUTHORED FamilyMaster common keys (signature · sysInputs · corrections · correctionsStored · ai · str · hpT); when the root Extension / C2 changed, a C3+ / Product Derived Extension / C2 follows its same-track base Member (DERIVED_CUE_IMPACT never receives either — F-3C.2). Derived balls · Position · track · slot · memberId · origin · generatedFromMemberId · derivedRule · derivedStep · meta untouched. Fixes `COMMON_PAYLOAD_CONFLICT` on OVERWRITE when Derived Members exist. No second durable authority.
- **Slot identity after OVERWRITE:** the active slot keeps the recalled Member identity (SYMMETRY / DERIVED stay as shown).
- **Recall screen balls:** Recall does not snap the screen balls to the stored Member coordinates — the screen keeps the Search query balls (current screen Position, role permutation only); the difference notice compares them with the winning stored Member.
- **Eligibility:** physical cue/target/target_center/second move clears it (`shouldClearOverwriteEligibilityOnBallEdit`); the temporary impact (thickness T) handle keeps it. Approximate-query difference alone never clears the session. No extra confirmation at OVERWRITE.
- **Difference notice:** per-ball Euclidean distance `sqrt(dx²+dy²)` in ball grid coordinates (cueDifference · targetDifference · secondDifference) vs the **winning** Member (SYMMETRY / DERIVED member, not always AUTHORED). 1 decimal display; no internal rounding; exact (every ball < 0.05 = half the positionId 0.1 quantum) → no notice. Informational only (no SAVE/OVERWRITE choice). No similarity % · no weighted score · no grades · no Fg/Rg mapping · no "Rg" unit. Existing low-similarity warning is appended to the same alert.
- **C2 reflectionOverride — Family-common (Phase F-3C.2):** see **F-3C.2 C2 Reflection Family-Common** below.
- **Unchanged:** familyAwareWriter (no same-family different-identityKey replacement) · C-0 validator · F-3B.2 slot invariant · F-3B draft carry · Derived slot policy · Publish semantics · system formulas · positionId · H/V/RPI formulas · schema version · dataset · History.

**Code SSOT:** `domain/family/overwriteFamilyRoot.ts` (root / recall frame / HP/T + Extension canonicalization / Derived common sync) · `familyRuntimeProjection.canonicalizeFamilyMemberRuntimeHpt` · `saveFlow.ts` UPDATE path · `domain/recall/recallPositionDifference.ts` · `adminLocalDbFlow.ts` / `adminSearchFlow.ts` (notice + `setOverwriteRecallContext`) · `publishedEditSession.shouldClearOverwriteEligibilityOnBallEdit` · App wiring · tests `trustedFamilyOverwrite.contract.test.ts`

#### ADMIN MANUAL TODO (do NOT create ADMIN_OPERATION_MANUAL yet)

Future chapter **「불러오기 · SAVE · 덮어쓰기」** must include: exact Search · approximate Search · 내공/앞공/뒷공 차이 안내 · AUTHORED Recall · SYMMETRY Recall · DERIVED Recall · OVERWRITE preserves existing Family Position · SAVE creates new Position · physical ball move clears overwrite eligibility · Family-common values · Extension · C2 reflection · thickness · C-0 duplicate handling.

Future **C2 section** must explain: 관리자가 AUTHORED / 대칭 / 파생 중 어느 방향에서 C2를 수정하더라도 Family의 하나의 C2 공략을 수정한다. SAVE: 현재 화면 방향이 새 Family의 canonical 기준 방향이 된다. OVERWRITE: 수정값은 기존 Family의 AUTHORED 방향 기준으로 환산된다. USER 화면의 C2 동작은 별도 정책이며 현재 변경되지 않는다 (ADMIN 전용 표시).

Future **덮어쓰기 보존 section** (Phase F-3D) must state: "AUTHORED / SYMMETRY / DERIVED 중 어느 Member를 Recall해도 덮어쓰기는 기존 Family의 Member identity, 좌표, Position, Track, Slot, origin 및 lineage를 변경하지 않는다. Family 공용 전략값만 갱신한다. C2/Extension처럼 방향별 표현이 필요한 Family 공용값은 기존 Member 위에서 projection만 갱신한다." · Published에만 있는 Family를 처음 덮어쓰면 Family 전체(파생 포함)가 같은 ID로 Local에 이어진다 · Local에 같은 Family가 이미 있으면 Local 내용이 기준이다 · 다른 공략이 같은 위치·Slot을 쓰고 있거나 기존 Member 위치가 달라지게 되면 덮어쓰기가 중단된다.

**Full manual checklist (handoff 2026-09-27 — every item needs a user-operation explanation):** S1/S2/S3 · Search · exact / approximate Search · Recall · 내공/앞공/뒷공 차이 알림 · SAVE · OVERWRITE · Local vs Published · Published-only 첫 OVERWRITE · Family identity 보존 · AUTHORED / SYMMETRY / DERIVED Recall · 공 이동 후 덮어쓰기 자격 해제 · C-0 duplicate · 4 Track same strategy slot · C2 · Extension · HP/T · thickness · AI · STR · History · Publish · 로컬 삭제 · Grid / 기준선 / 궤적 연장 · 오류/복구 흐름 (`POSITION_STRATEGY_SLOT_CONFLICT` · `OVERWRITE_FAMILY_GEOMETRY_MISMATCH` · seed conflict/invalid · root mismatch/missing) · Local/Published conflict handling (Local authority · no automatic merge · Publish overwrite confirm).

#### F-3D Full Family Identity Preservation on OVERWRITE (2026-09-27)

**Authority:** 본 절 · F-3D audit (Ask)

**OVERWRITE preservation invariant (frozen):** "AUTHORED / SYMMETRY / DERIVED 중 어느 Member를 Recall해도 덮어쓰기는 기존 Family의 Member identity, 좌표, Position, Track, Slot, origin 및 lineage를 변경하지 않는다. Family 공용 전략값만 갱신한다. C2/Extension처럼 방향별 표현이 필요한 Family 공용값은 기존 Member 위에서 projection만 갱신한다."

OVERWRITE = EXISTING FAMILY CONTENT UPDATE ≠ Family / Member / Position re-creation ≠ memberId reissue. SAVE = CREATE (new familyId / memberIds normal; unchanged).

**Published-first-OVERWRITE seed rule:** "Published-only Family의 첫 OVERWRITE에서는 Recall한 Family의 normalized identity graph 전체를 Local working dataset에 seed한 뒤 기존 OVERWRITE 경로를 사용한다. 단, Local에 같은 familyId가 하나라도 이미 존재하면 Published snapshot을 자동 merge/copy하지 않는다."

- **Capture (Recall):** `buildOverwriteRecallContext` (PUBLISHED) stores `publishedFamily = { familyId, master, members[] }` — the recalled familyId only, deep copies of the Published normalized parts. Session-only (cleared with the edit session); not a durable authority, not a schema field.
- **Seed (OVERWRITE):** `seedPublishedFamilyForOverwrite` — only when sourceKind = PUBLISHED **and** Local holds zero Members of the familyId. Snapshot validated (one AUTHORED equal to the captured root · unique memberIds · lineage resolvable) → `rematerializeFamilyPartsToPositionRecords` (exact `sourceSlot`, no slot move) → merged into an in-memory copy of the Local dataset.
- **Then unchanged path:** `resolveOverwriteFamilyRoot` → `writeFourTrackFamilyMembers` (lineage now read from the seeded rows → same memberIds + authoringStrategyIds) → `syncFamilyCommonPayloadToDerivedMembers` (base found by generatedFromMemberId) → one `persistWorkingCorpusNormalizedAuthority`. No second OVERWRITE algorithm.
- **authoringStrategyId:** preserved identity on OVERWRITE (Local-existing and Published-only). A new asid may be assigned only where a legacy Member had none.
- **meta:** derivable cache — may rebuild with identical balls when Family-common values change; tests must not freeze it.
- **Atomicity:** seed (in-memory only) → validation → C-0 → OVERWRITE write → Derived sync → preservation guard → **ONE persist**. Any failure → Local durable dataset unchanged · UI dataset unchanged.

**Fail closed (nothing persisted, UI dataset unchanged):**

- `POSITION_STRATEGY_SLOT_CONFLICT` — another Local Family (or legacy entry) holds a Published Member's (positionId, sourceSlot) — C-0, no auto overwrite / slot move / partial seed.
- `OVERWRITE_PUBLISHED_SEED_CONFLICT` — different target ball at a shared exact Position.
- `OVERWRITE_PUBLISHED_SEED_INVALID` — snapshot missing / inconsistent.
- `OVERWRITE_FAMILY_GEOMETRY_MISMATCH` — `checkOverwriteFamilyPreserved` (every OVERWRITE): each Member present before the write must keep memberId · exact balls · track · slot · origin · symmetryOp · generatedFromMemberId · derivedRule · derivedStep · (existing) authoringStrategyId. Catches legacy / stale SYMMETRY geometry that differs from the current canonical transform — no auto-correction, no relocation, no new id.

**Stale / conflict policy (unchanged architecture):** Local gains the familyId before OVERWRITE → Local used, root mismatch fails closed · divergent Local graph → not reconciled (Local is the authority) · Published changed after Recall → no concurrency/versioning (pre-existing limitation).

**Code SSOT:** `domain/family/publishedFamilySeed.ts` (`capturePublishedFamilySnapshot` · `seedPublishedFamilyForOverwrite`) · `overwriteFamilyRoot.ts` (`publishedFamily` context · `checkOverwriteFamilyPreserved`) · `adminSearchFlow.ts` (masters passed) · `saveFlow.ts` UPDATE path (seed → root → write → sync → guard → persist) · tests `publishedFamilySeed.test.ts` · `trustedFamilyOverwrite.contract.test.ts` (F-3D block)

**Schema change:** NO · **Migration:** NO · **Phase F-3D COMPLETE:** YES

#### F-3C.2 C2 Reflection Family-Common (2026-09-27)

**Authority:** 본 절 · F-3C.1 audit

**Product meaning (frozen):** C2 reflectionOverride는 특정 Member 하나만의 독립 공략값이 아니다. Family A에는 하나의 C2 공략 의미가 있고, 4 Track은 그 하나의 C2를 각 화면 방향에 맞게 표현한다. **Family-common semantic ≠ identical raw JSON on every Member.**

**User operation:** "관리자가 어느 방향에서 C2를 수정하더라도, 그 방향의 Member 하나만 바꾸는 것이 아니라 Family의 C2 공략을 수정한다. 프로그램은 현재 방향의 C2를 AUTHORED 방향 기준으로 환산하고, 그 값을 Family의 canonical C2로 저장한다. 나머지 3방향은 canonical C2에서 H/V/RPI 대칭으로 다시 생성한다."

**Data model (unchanged):** `ReflectionOverride = { rail: TOP|BOTTOM|LEFT|RIGHT, t }`, `t` = normalized rail fraction (existing `clampRailT` edge band). TOP/BOTTOM: t=0 LEFT side → t=1 RIGHT side. LEFT/RIGHT: t=0 BOTTOM side → t=1 TOP side. Trajectory/display geometry in the 80×40 table frame — not sys, not Fg, not a system value; reflection formulas unchanged.

**Storage:**

- AUTHORED Member `reflectionOverride` = **canonical authority** (AUTHORED track frame — any of B2T_L / B2T_R / T2B_L / T2B_R).
- SYMMETRY Member `reflectionOverride` = **deterministic projection**, regenerated from AUTHORED on every 4-Track write (never read back as a source).
- Derived `reflectionOverride` = **base-derived projection**: DERIVED_C3_PLUS / DERIVED_CUE_C3_PRODUCT copy their same-track base Member; DERIVED_CUE_IMPACT carries none.
- Raw values differ per Track while the strategic meaning is shared. Not a `FAMILY_MASTER_COMMON_FIELD_KEYS` entry (no `COMMON_PAYLOAD_CONFLICT`). No schema change · no migration.

**Transform (`trackSymmetry.transformReflectionOverride`):** decode `railPointFromT` → Family `transformPoint(op)` → explicitly mapped rail (no corner re-detection) → `railTFromPoint` → `clampRailT`.

| Op | TOP | BOTTOM | LEFT | RIGHT |
|----|-----|--------|------|-------|
| **H** | TOP · 1−t | BOTTOM · 1−t | RIGHT · t | LEFT · t |
| **V** | BOTTOM · t | TOP · t | LEFT · 1−t | RIGHT · 1−t |
| **RPI** | BOTTOM · 1−t | TOP · 1−t | RIGHT · 1−t | LEFT · 1−t |

H² = V² = RPI² = identity · H∘V = V∘H = RPI · source track → destination → source recovers C2.

**Flows:**

- **SAVE (CREATE):** current screen track becomes AUTHORED → screen C2 stored as canonical (no forced B2T_L conversion) → H/V/RPI projected.
- **OVERWRITE:** `resolveOverwriteRootReflectionOverride` — unchanged vs the recalled Member (incl. a Member carrying none by rule) → root C2 kept exactly (no round-trip drift); cleared → removed Family-wide (4 Tracks + C3+ / Product Derived); edited → transformed by `symmetryOpBetweenTracks(recalled track, root track)` → canonical → 4 Tracks regenerated → C3+ / Product Derived synced from their base.
- **Derived Recall:** edit interpreted in the Derived Member's own track (= its base track); Derived is never promoted; Derived geometry · identity · slot · lineage unchanged.
- **Existing invalidation unchanged:** SYS Apply track change and HP/T tip side / tipCount change clear C2; thickness T keeps C2 and keeps OVERWRITE eligibility.
- **Display boundary unchanged:** C2 override affects the ADMIN trajectory only; USER keeps the calculated reflection (separate future decision).

**Latent defects fixed with F-3C.2:** (1) Derived Extension sync no longer gives DERIVED_CUE_IMPACT an Extension. (2) OVERWRITE from a Cue→Impact Recall (which shows no C2 / Extension by rule) no longer wipes the Family C2 / Extension — "unchanged" includes a recalled Member that carries none.

**Code SSOT:** `trackSymmetry.transformReflectionOverride` · `generateFourTrackMembers` · `overwriteFamilyRoot` (`resolveOverwriteRootReflectionOverride` · `resolveOverwriteRootExtensions` · `syncFamilyCommonPayloadToDerivedMembers`) · `saveFlow.ts` · tests `trackSymmetry.reflectionOverride.test.ts` · `generateFourTrackMembers.test.ts` · `trustedFamilyOverwrite.contract.test.ts` (F-3C.2 block)

**Phase F-3C COMPLETE:** YES (core `58ef947` + F-3C.2 C2 Family-common).
**Next Track:** separate Display Boundary Ask (optional) — whether saved ADMIN C2 should also apply to USER.

**Production SSOT (검증 완료, 2026-06):**

- Published Dataset은 **Git 관리 대상**이다.
- Vercel은 Git Repository의 `dataset/` 경로를 직접 배포한다.
- USER Search / ADMIN Search는 Production에서 `dataset/{공략}/{시스템}/positions.json`을 fetch한다.
- `dataset/`이 Git에 포함되지 않으면 Production Search는 동작하지 않는다.

> **`dataset/`은 작업용 데이터가 아니라 Production Search가 사용하는 Published Corpus SSOT이다.**
> 절대 `.gitignore` 대상이 되어서는 안 된다.

### Dataset Export (legacy schema retained — UI removed)

- History user-facing Manual Export **removed** (D-3); dead helpers removed (F-1). Official path = Publish only.
- DatasetExportPayload schemaVersion **2** retained for legacy leaf read / first-touch Publish conversion.
- Publish path uses D-2 normalized repository writer (v3).
- 경로 (Publish auto-resolve): `dataset/{공략명}/{시스템명}/positions.json`
- Legacy Envelope reader: `schemaVersion: 2` still supported for untouched leaves
- 코드 SSOT: `domain/datasetExport.ts`, `domain/datasetPath.ts`, `domain/publishedLeafPrepare.ts`

### Published Dataset Loader (Phase 2 — 완료)

- `getOrLoadPublishedLeaf(shotType, systemId)` — lazy load + in-memory cache
- URL SSOT: `domain/datasetPath.ts` → `/dataset/{공략}/{시스템}/positions.json`
- **ADMIN Search** (UI; 우측 패널) → published corpus (`handlePositionRecall`, profile `adminStrict`)
- Published leaf URL fallback: 빈 `shotType("")` → `"뒤돌리기"` (`domain/publishedLeafResolve.ts`)

**운영 검증 완료 (2026-06):**

- localhost USER Search
- Production USER Search
- Published Dataset Loader
- Vercel Static Asset Delivery

→ 모두 정상 확인.

### USER Search (Phase 3 — 완료)

- **USER Search** → published corpus only (`handleUserSearchStrategies`, profile **`userStrict`**)
- USER UI: **Search 버튼만** (Search/Recall 토글 제거)
- 공략 S1/S2/S3: **USER Search 성공 시에만** 활성 (`recommendedFrom` gate)
- **Runtime Activation (2026-08-04)** — Search 성공 후 `resolveUserSearchDisplaySlotId` → **`activateStrategySlot(slotId)`** (`switchSlot` → `setUserTableDisplaySlotId` → `hydrateSlotRuntime`). Strategy Pick과 **동일 경로** · Search 전용 Hydrate **없음**.
- **ADMIN→USER carry-over 제거**: 전환 시 draft/`recommendedFrom` 초기화 — F5 직후 USER와 동일 상태

### Recall profile 분리 (Phase 3-1 — 완료)

| Profile | coarsePerBall | totalL1Cap | 용도 |
|---------|---------------|------------|------|
| **userStrict** | 2 | 6 | USER Search · ADMIN Search (published; permutation, coarse 필수) |
| **adminSearch** | 5 | 15 | ADMIN **로컬DB** (UI) — Local Search via `normalized_dataset` Members (Phase C) |
| **adminStrict** | 6 | null | ADMIN **Search** (UI; published) · legacy `runPositionRecall` |

### Published Dataset 운영 검증 (Phase 3-2 — 완료)

- Published Dataset Git 관리 복구
- Vercel 정적 배포 검증
- USER Search Production 검증
- `positions.json` 직접 URL 검증

**결과:** Published Dataset Architecture 운영 검증 완료

### Production Dataset Delivery

| 환경 | 경로 |
|------|------|
| **localhost** | `dataset/` 직접 참조 |
| **Production** | GitHub → Vercel → `dataset/*` 정적 배포 |

Production Search 장애 발생 시 점검 순서:

1. `dataset` 파일 존재 여부
2. GitHub 반영 여부
3. Vercel 배포 여부
4. `positions.json` 직접 URL 확인

### Search / 로컬DB / Reset (현재 UI 용어)

| UI 기능 | 데이터 | Profile | 상태 |
|---------|--------|---------|------|
| ADMIN **로컬DB** (Stage rail) | Local `normalized_dataset` Members | `adminSearch` | ✅ |
| ADMIN **Search** (우측 패널) | Published Normalized Members | `adminStrict` | ✅ |
| USER **Search** | Published Normalized Members | `userStrict` | ✅ |
| USER **Reset** | 공 위치만 유지 · 검색 결과/공략/오버레이/타겟 상태 초기화 | — | ✅ (Search 성공 시 Reset 버튼으로 전환) |

### 예정

| Phase | 내용 |
|-------|------|
| **Phase 1 Foundation** | **Complete** |
| **Phase 2 Dataset Generator** | **Complete** |
| **Phase 3 Search Engine Enhancement** | **Complete** — Mission 35~42 |
| **Phase 4 Foundation** | ✅ **COMPLETED** |
| **Phase 4 Product Pipeline** | ✅ **COMPLETED** |
| **Next** | **Family Data Architecture Phase 1 (Ask)** |

> Phase 3 Enhancement 로드맵(Spatial Index → … → Quality Validation)은 **전부 완료**되었다.
> Phase 4 Foundation · Mission 01–03 COMPLETED · Mission 04 ABSORBED · **Phase 4 Product Pipeline COMPLETE**.
> Phase 4 Product Pipeline Official Name: `GLOSSARY_SSOT` §5.2.
> Phase 5 Mission 02 Dead Code Cleanup ✅ COMPLETE (EXIT-AFTER-#4 · COMPLETE WITH DEFERRED ITEMS).

---

## Application Architecture Standard (AAS) v2.0

**상태:** **Complete** — Application Runtime Constitution (SSOT) 확정 (2026-07-03) · **AAS Runtime Migration Complete** — Batch 1~6 완료 (2026-07-13) · **Batch 6 Completed · Final Freeze**

App.jsx를 Application Runtime Orchestrator로 전환하기 위한 Architecture 표준·거버넌스가 완료되었다. Architecture 설계·Migration Blueprint·Governance가 하나의 영구 SSOT 문서로 확정되었다. 실제 Runtime Refactoring은 Batch 단위로 진행 중이다.

### Architecture 문서

| 문서 | 역할 |
|------|------|
| `Application Architecture Standard (AAS) v2.0/App_Migration_Map.md` | **Application Runtime Constitution** · **Migration Blueprint** · **Architecture SSOT** |
| `Application Architecture Standard (AAS) v2.0/App_Authority_Inventory.md` | Phase 1 App.jsx 책임 Inventory |
| `Application Architecture Standard (AAS) v2.0/Architecture_Constitution.md` | Architecture 헌법 |
| `Application Architecture Standard (AAS) v2.0/Architecture_Dictionary.md` | 용어 SSOT |
| `Application Architecture Standard (AAS) v2.0/App.jsx_Responsibility_Analysis_Guide.md` | 책임 분석·Migration 가이드 |

### Runtime Migration Design 문서

| 문서 | 역할 | 상태 |
|------|------|------|
| `작업관리/Runtime Refactoring/Batch01/Batch1_Design.md` | Batch 1 Design SSOT — Domain Layer 초기 분리 | ✅ 완료 |
| `작업관리/Runtime Refactoring/Batch02/Batch2_Design.md` | Batch 2 Design SSOT — Presentation Layer 분리 | ✅ 완료 |
| `작업관리/Runtime Refactoring/Batch03/Batch3_Design.md` | **Batch 3 Design SSOT — Application Flow · Search · Dataset · AI** | **✅ 완료 (v1.0, 2026-07-07)** |
| `작업관리/Runtime Refactoring/Batch04/Batch4_Closure.md` | **Batch 4 Closure SSOT — Regression · AC · Architecture · Debt** | **✅ 완료 (v1.0, 2026-07-07)** |
| `작업관리/Runtime Refactoring/Batch05/Batch5_Design.md` | **Batch 5 Design SSOT — Trajectory Runtime · AD-B5-01~11** | **✅ Frozen (v1.0, 2026-07-08) · Implementation Complete** |
| `작업관리/Runtime Refactoring/Batch06/Batch6_Final_Freeze.md` | **Batch 6 Final Freeze — Design v1.0 Frozen 기록 · Closure SSOT · AD-B6-01~10** | **✅ Completed · Final Freeze (2026-07-13)** |
| `작업관리/Runtime Refactoring/Batch06/Batch6_Architecture_Completion_Report.md` | **Batch 6 Architecture Completion Report** | **✅ Final (2026-07-13)** |

### App_Migration_Map.md 구성

- **Part A** — Migration Blueprint (Batch/Priority/Target Layer·Folder·File·Function)
- **Part B** — Architecture Meta (Capability · Owner · Visibility · Architecture Rule · Capability Matrix · Ownership Matrix · Guard Rules)
- **Part C** — Architecture Decision Record (ADR-001 ~ ADR-010)
- **Part D** — Architecture Review Checklist & Approval Flow

### 핵심 원칙 (요약)

- App.jsx는 Runtime Orchestrator 역할만 수행한다.
- 하나의 Capability는 단일 Owner를 가진다.
- Dependency는 단방향이다: `System → Runtime Contract → Runtime → Application → Application Flow → Domain → Renderer → Presentation`.
- Runtime Contract를 우회하지 않는다 (System JSON 직접 접근 금지).
- 신규 Architecture 변경은 ADR + Review Checklist를 통과해야 한다.

> **주의:** Architecture SSOT 확정 이후 실제 코드 이동은 Batch 단위로 진행했다. **AAS Runtime Migration Batch 1~6 Complete (2026-07-13).** **SPS STEP4 Inventory Final v1.0 Complete (2026-07-14).** **SPS STEP5 Architecture Audit Final Freeze v1.0 Complete (2026-07-15).** **SPS STEP6 Schema Validation Final Freeze v1.0 Complete (2026-07-17).** 다음: **STEP7**.

### AAS Runtime Migration 진행 상황

| Batch | 위험도 | 대상 | 상태 |
|-------|--------|------|------|
| **Batch 1** | 매우 낮음 | SYS-004/005, CAL-001, MISC-006 — 순수 함수·정규화·파서 | **완료** (2026-07-06) |
| **Batch 2** | 낮음 | APP-013, RND-002/004, TRJ-002, OVL-001~008 — Presentation Layer 분리 | **완료** (2026-07-06) |
| **Batch 3** | 중간 | SRCH-001~005, DS-001~007, CAL-004/006, AI-001~003 | **✅ 완료 (2026-07-07)** |
| **Batch 4** | 높음 | CAL-002/003/005, MISC-004 | **✅ 완료 (2026-07-07)** |
| **Batch 5** | 매우 높음 | TRJ-001/003, RND-003, APP-009 | **✅ Completed (2026-07-08) · Release Approved** |
| **Batch 6** | 최고 | SYS-001/002/003/006, DS-006, Runtime Contract | **✅ Completed · Final Freeze (2026-07-13)** |

### Batch 1 생성 파일

| 파일 | 역할 |
|------|------|
| `frontend/src/domain/system/systemIdentity.ts` | systemId canonicalization · system mode 판정 · useSn 판정 · five-half 판정 · SYS_SYSTEM_CONFIG 임시 은닉 · Batch 6 이후도 API Stable / Implementation Replace(optional SYS-003 meta migration) |
| `frontend/src/domain/calculator/fiveHalfCalculator.ts` | 5½ 2-of-3 계산 (`solveFiveHalfTwoOfThree`) · computed input key 판정 (`fiveHalfComputedInputKey`) |
| `frontend/src/domain/calculator/formulaExpr.ts` | SYS formula expr parsing (`parseSysFormulaExpr`) · display expr 변환 (`getDisplayExprForSys`) |

### Batch 2 생성 파일

| 파일 | 역할 |
|------|------|
| `frontend/src/components/overlays/AnchorEditOverlay.jsx` | 앵커 좌표 편집 오버레이 (OVL-006) |
| `frontend/src/components/overlays/HptOverlay.jsx` | HP/T·STR 오버레이 (OVL-002/003) |
| `frontend/src/components/overlays/AiOverlay.jsx` | AI 코멘트·레슨 오버레이 (OVL-008) |
| `frontend/src/components/overlays/SysOverlay.jsx` | SYS 오버레이 — AD-B2-01 Pure Presentation (OVL-005) |
| `frontend/src/overlay/utils/sysOverlayUtils.jsx` | SysOverlay 공유 헬퍼 16개 (포맷·계산보조·렌더링) |
| `frontend/src/overlay/router/adminOverlayRouter.ts` | Admin Overlay 라우팅 훅 `useAdminOverlayRouter` (OVL-001) |
| `frontend/src/overlay/state/overlayStateMachine.ts` | Admin Overlay 생명주기 훅 `useAdminOverlayLifecycle` (OVL-001) |
| `frontend/src/overlay/router/userOverlayRouter.ts` | User Overlay 라우팅 훅 `useUserOverlayRouter` (OVL-007) |
| `frontend/src/renderer/labels/labelScalePolicy.ts` | 라벨 배율 훅 `useSysLabelScale` (APP-013) |
| `frontend/src/renderer/trajectory/trajectoryRenderModel.ts` | 궤적 렌더 모델 `buildTrajectoryRenderModel` (TRJ-002) |
| `frontend/src/renderer/labels/systemAxisLabelModel.ts` | 축 라벨 모델 `buildSystemAxisLabelModel` (RND-002) |
| `frontend/src/renderer/trajectory/anchorConversionModel.ts` | 앵커 변환 모델 `buildRgAnchors` (RND-004) |

### Batch 4 생성 파일

| 파일 | 역할 |
|------|------|
| `frontend/src/domain/calculator/sysOverlayCalcHelpers.ts` | SysOverlay 순수 calc helper SSOT (AD-B4-01 Option A) |
| `frontend/src/domain/calculator/systemValueCalculator.ts` | CAL-002/003/005 — `buildEffectiveRenderSysValues` · `buildSlotSysSnapshot` · `computeSysOverlayValues` |
| `frontend/src/domain/system/slotSysViewModel.ts` | MISC-004 — `resolveSlotSys()` Render SSOT ViewModel |

### Batch 5 생성 파일

| 파일 | 역할 |
|------|------|
| `frontend/src/domain/trajectory/pathNodeHelpers.ts` | TRJ-001 — cushion path node helpers |
| `frontend/src/domain/trajectory/reflectionPolicy.ts` | TRJ-003 — C2 reflection policy SSOT |
| `frontend/src/domain/trajectory/trajectoryBuilder.ts` | TRJ-001 — `buildTrajectory()` single entry · TrajectoryBuildResult |
| `frontend/src/domain/trajectory/baselineHandleGeometry.ts` | APP-009-B — baseline handle Rg ↔ SYS geometry |
| `frontend/src/overlay/state/baselineDraftState.ts` | APP-009-A — baseline draft overlay React state |
| `frontend/src/renderer/trajectory/trajectoryPathAttrModel.ts` | AD-B5-09 — SVG path attr display model |
| `frontend/src/renderer/trajectory/baselineHandleModel.ts` | AD-B5-11 — baseline handle display model |
| `frontend/src/application/flows/trajectoryHydrateFlow.ts` | AD-B5-07 — slot trajectory hydrate flow |
| `frontend/src/application/flows/baselineDraftApplyFlow.ts` | AD-B5-08 — baseline draft apply flow |

### Batch 5 상태 (Closing SSOT)

| 항목 | 상태 |
|------|------|
| Status | **Completed** |
| Architecture | **Released** |
| Implementation | **Completed** |
| Validation | **PASS** |
| Release | **Approved** |
| Code Baseline | `04e341b` (STEP 5-8) |

---

## 완료된 주요 기능

### SYS

- **시스템 엔진**: `data/systems/*` (profile / anchors / logic), `systemCalculator`, `useSysCalculation`(admin).
- **보정 구조 (Signed Authoring FINALIZED):** 상세 원칙·domain·상호배타·CO label·legacy·curve KEEP → **`SIGNED_CORRECTION_AUTHORING_SSOT.md`**.
  - Fields: `slide` / `draw` / `curve_ratio` / `spin` / `departure` + optional `signMode`.
  - Authored: per-field `[-]` · signed value SSOT · slide/draw→**CO** · spin/기울기→**C3** · shotType는 authored sign 비반전.
  - Legacy (no marker): 기존 slide/draw shotType flip path 보존 · corpus rewrite 없음.
  - Curve geometry: **LOCK / KEEP** (1·2차 미변경).
- **SYS Overlay**: `components/overlays/SysOverlay.jsx` — 필드별 `[-]` · Domain `computeSysOverlayValues`. `admin/sys/SysOverlay.tsx` 메인 트리 미사용.
- **Render SSOT**: `slotRenderSys`, `resolvedSlotSysValues` / `resolvedSlotBaseSysValues`.
- **USER 기준값**: 3-Level 토글(보정 / 기준 / 비교), `ImpactLines` dual path.

### Caption Engine (OPEN-04 — 완료)

**OPEN-04 Caption Placement Engine 전면 재설계 완료.**

기존 value 기반 탐색·mark별 예외 처리·track별 하드코딩 배치를 제거하였다.
캡션 배치는 숫자 배열 자체를 기준으로 계산하는 **순수 Geometry 기반 엔진**으로 통합하였다.

**배치 우선순위:**

1. A Space — 첫 숫자 이전 공간
2. B Space — 마지막 숫자 이후 공간
3. Internal Max Gap — 내부 최대 빈 간격

동률 시 외부 공간(A/B)을 우선 선택한다.

**배치 원칙:**

캡션은 항상 `숫자 + 2grid + 캡션` 또는 `캡션 + 2grid + 숫자` 형태를 유지한다.
캡션 자체를 공간 중앙에 두는 것이 아니라 **숫자와의 관계를 기준**으로 배치한다.

**최종 결과:**

| Mark | 결과 |
|------|------|
| 1쿠션 | 90 이후 외부 공간 우선 |
| 3쿠션 | 90 이전 외부 공간 우선 |
| 4쿠션 측면 | 자체 bucket 기준 계산 (alignC4SideCaptionsToCo 제거) |
| 5쿠션 | 90 이후 외부 공간 우선 |
| 6쿠션 | 20 이전 외부 공간 우선 |
| 출발값 | 코너 앵커 인접 side bucket 포함 → 50~60 공간 사용 |

**코드 SSOT:**

- `domain/systemAxisCaption.ts` — `findBestAlongSequential()`
- `components/table/SystemValueLabels.jsx` — `pushGroup()` CO 코너 bucket 이중 배정

---

### HP/T

- **두께/타점 Overlay**: **ADMIN 전용** 편집 (`HptOverlay`, `overlayState` HPT).
- **관리자 입력**: `adminState.hpt`, slot `draft`/`applied` 동기화.
- **Zero-tip tipSideIntent (2026-09-07)**: UI-only `left`|`right` intent in `useHptController` — tipCount=0에서도 side-first 입력 가능 · geometry는 center 유지 · Apply canonical 불변.
- **USER HP/T read-only 오버레이**: 좌측 **두께/타점** · `UserHptPanel` + `userHptViewModel` · Common Shell = HPT 규격 (`widthRatio 0.42`, `maxHeightRatio 0.85`, `medium`, `fitContent: false`, `glassDark`) — AI `0.63`과 분리
  - 공/텍스트 Content 크기 독립 유지 및 SVG viewBox crop = **UX Polish 보류** (임시로 Shell `--uos-w` 커플링 수용)

### 시스템 레슨 (System Lesson)

**상태:** 보류

USER UI 단순화 정책에 따라 현재 USER 메뉴에서는 노출하지 않는다.

기존 P0 구현은 삭제하지 않고 보존한다.

**보존 대상**

- `components/user/UserSystemLessonPanel.jsx`
- `domain/userSystemLessonViewModel.ts`
- `.modal-panel--user-system-lesson`
- 기존 `SYSTEM_LESSON` 관련 데이터/계산 ViewModel

**현재 판단**

- USER의 1차 목적은 시스템 학습이 아니라 현재 포지션의 실전 공략 확인이다.
- 기존 레슨 콘텐츠는 AI 및 계산 Overlay 내용과 일부 중복된다.
- 따라서 현재 USER UI는 AI / 두께·타점 / 계산 중심으로 단순화한다.
- 시스템 레슨은 향후 “시스템 학습 모드” 또는 별도 교육 UX로 재설계할 수 있다.

**현재 USER 런타임**

- 레슨 버튼 없음
- `overlayContent === "SYSTEM_LESSON"` 경로는 USER 메뉴에서 진입하지 않음
- 관련 파일은 향후 재사용을 위해 보존

### STR

- **속도·깊이·가속 패턴**: slot `str`, AI 자동 문장에 depth/speed/acceleration 반영.
- **STR Overlay**: ADMIN `App.jsx` 인라인 UI.

### AI

- **자동 생성 SSOT**: `domain/aiAutoCommentViewModel.ts` — `buildAiAutoCommentModel`, `composeAiAutoComment`.
  - SYS 보정 전/후, STR만 포함 (**HP/T·타격강도 제외**).
  - 사용자 공식: `1쿠션값 = 출발값 - 3쿠션값`.
  - **read-only Auto Comment** — OpenAI / proofreading 대상 **아님** (SYS+STR 자동문장만).
- **표시 형식**: `[기본 공식]` 한 줄, 문단 `\n\n`, `[원 포인트 레슨]` 분리.
- **원 포인트 레슨**: `adminState.ai.onePointLessons` — 저장 구조 유지. **Phase 1 Apply** = 현재 shot **single PRO ONE POINT block replace** (블록 내부 복수 문장/개행 허용). USER는 **slot draft/applied.ai만** (`adminState` 미확정 merge 금지).
- **ADMIN UI**: `components/overlays/AiOverlay.jsx` — 자동 미리보기 + editor session · **Apply=commit** · **Cancel=rollback** · close(X/other modal)=draft 유지 · Category/Lesson-order manage 메뉴 **숨김**(데이터·모달 파일 보존).
- **AI Comment Editor Session (Phase 1 · 2026-09-09)**
  - Helpers: `domain/lesson/aiCommentEditorSession.ts`
  - close ≠ cancel · Apply ≠ Library Save ≠ canonical SAVE
  - proofreading = working draft only · calculation engine **완전 분리**
  - C3/C4 의미(표시 매핑용): C3 = 기울기·스핀 반영 3쿠션 도착 · C4 = 4쿠션/출발값보정(Sn) 반영 최종 도착 — **계산 미변경** · correction domain SSOT → `SIGNED_CORRECTION_AUTHORING_SSOT.md`
- **Sentence Library (Phase 2A · 2026-09-10)**
  - SSOT: `domain/lesson/onePointLibrary.ts` · key `ONE_POINT_LESSON_LIBRARY_V1` · **MAX 30 FIFO (`createdAt` age)**
  - Explicit: select / update / register / delete · Apply와 library mutation **완전 분리**
  - identical text register → reuse id · load >30 non-destructive · cancel does not rollback library
  - dropdown feed: flat + newest-first · Category/Order **data preserved** (UI → Phase 2B)
- **PRO ONE POINT Library UI (Phase 2B · 2026-09-10)**
  - AiOverlay: `문장 선택` / `문장 수정` / `문장 등록` / `AI 교정` / `적용` / `취소` (+ selected `삭제` confirm)
  - Category/Order manage UI **retired from overlay** · modal files + LS/`categoryNo` **preserved**
  - mixed 「저장」 UI removed · Strategy Summary / USER WYSIWYG → **Phase 3**
- **PRO ONE POINT Shell UX (Phase 2B.1 · 2026-09-10)**
  - Apply = commit + **keep-open** · Cancel = rollback + **keep-open**
  - dirty → X/backdrop/ESC **blocked** · dirty → SYS/STR modal switch **allowed** + draft preserved
  - dropdown newest preview ≠ selected · delete via empty + 문장 수정 + confirm
  - shot dirty = draft text only (selectedId alone ≠ dirty) · USER committed-only preserved
- **AI Comment WYSIWYG Session (Phase 3A · 2026-09-10)**
  - bold **공략 요약** + **PRO ONE POINT** current-shot editors · `strategySummaryDraft` session-only
  - dual draft: `shotOnePointDraft` (Apply) ≠ `libraryDraft` (수정/등록/AI교정)
  - Apply keep-open + **immediate upper refresh** · library-only ≠ shot dirty
  - summary override / fingerprint / numeric guard / USER shared VM → **Phase 3B/3C**
- **AI Comment WYSIWYG UX Refinement (Phase 3A.1 · 2026-09-10)**
  - summary = real controlled value (partial edit) · select → upper only · lower = new-entry
  - 문장 수정 = selected + upper shot text · AI 교정 = shot|library target routing
  - Apply promotes last-edited new-entry · hydrate on openOverlay(AI) path
- **Strategy Summary Persistence (Phase 3B · 2026-09-10)**
  - additive `slot.ai.strategySummaryOverride` + `strategySummaryFingerprint` (no hard migration)
  - effective summary = override ?: generated · identical Apply → omit override
  - numeric token multiset guard on Apply · stale fingerprint warning (preserve override)
  - SAVE/History via existing `ai` cloneJson · USER committed-slot only · layout → **Phase 3C (done)**
  - OpenAI / latency → **Phase 3D**
- **Final Strategy Summary Template (Phase 3B.1 · 2026-09-10)**
  - presentation SSOT: `strategySummaryTemplate.ts` — resolved scalars only · **no recalc** · no STR prose paragraph
  - generated-only CLEAN → SYS/STR reopen refresh · committed override KEEP + stale + 「원본 요약으로 되돌리기」
  - fingerprint v2 aligned to template inputs · numeric **submultiset** guard (optional sentence delete OK)
  - Modal Undo → **Phase 3B.2/3B.3** · USER layout → **Phase 3C (done)** · latency → **Phase 3D**
- **Strategy Summary Correction Explanation (Phase 3B.1.1 · 2026-09-10)**
  - 밀림/끌림 = 출발값(CO) 보정 설명 · 기울기(`curve_ratio`)/스핀 = 3쿠션(C3) 도착 설명 · Sn = 최종 도착(`출발값 보정`) 설명
  - CO 문구: 실제 COΔ 기준 「출발값」/「보정한 출발값」 — **`SIGNED_CORRECTION_AUTHORING_SSOT.md`**
  - correction 없으면 해당 문구 생략 · Summary→SYS reverse edit 없음 · 한국어 조사 자동화 **deferred**
  - signed display tokens (`밀림값 +N` / `끌림값 -N` 등) · authored sign SSOT와 정렬
- **USER Shared AI Presentation (Phase 3C · 2026-09-10)**
  - USER AI read-only: 「공략 요약」 + 「PRO ONE POINT」 · shared `committedAiPresentation.ts`
  - effective = committed `strategySummaryOverride` ?: Strategy Summary template SSOT (ADMIN과 동일)
  - `selectCommittedSlotAiForUser` applied-first · USER path no draft+applied `aiLessonSources` dual merge
  - ADMIN draft/library/proofread/stale/fingerprint/editing chrome **미노출** · no OpenAI · no calc
  - Modal Undo → **Phase 3B.2/3B.3** · latency → **Phase 3D**
- **USER AI Overlay Responsive Width (Phase 3C follow-up · 2026-09-11)**
  - AI Reading OFF `widthRatio` **0.42 → 0.63** (~1.5×) · `HPT_OVERLAY_WIDTH_RATIO` **0.42** 분리 유지
  - Reading Mode clamp / `READING_FONT_SCALE` / text reflow (`pre-line`) **unchanged** · CALC/ADMIN untouched
  - **PC manual review PASS** · mobile device validation **after Push/deploy**
- **Phase 1→3C cumulative status (2026-09-11)**
  - ADMIN editor + Strategy Summary SSOT/persistence + USER committed presentation + AI width 0.63 **shipped to main**
  - Deferred: Modal Undo **3B.2/3B.3** · Korean particle automation
- **AI Proofreading Latency (Phase 3D · 2026-09-12)** — ✅ **COMPLETE**
  - Keep `gpt-5.6-luna` · Responses `reasoning: { effort: "none" }` · Numeric Guard / Style / approval UX unchanged
  - Latency ~OpenAI-bound · PC manual ~2.5–3s (was ~5s) · detail → `HISTORY/PROJECT_LOG_2026-09.md`
- **USER Mobile Cold-Start / First Visual (Phase 3E · 2026-09-12)** — ✅ **COMPLETE · USER ACCEPTED**
  - **3E-1:** noncritical ADMIN/UI overlays `React.lazy` out of USER initial JS (~911 → ~849 KB raw · ~7% gzip cut) · ADMIN features kept via lazy load (not an ADMIN perf project)
  - **3E-2:** inline `#app-shell` Table Shell in `index.html` (React-before-paint) · remove after `.table-svg` + 2 rAF · ~1.5 KB · 0 extra network · not table geometry SSOT
  - Success criterion: user can tell the app started after icon tap · not Fully Interactive ≈ 0s
  - Full cold-start elimination **not** claimed · accepted at current level
- **USER Cushion Value Focus UI (2026-09-14)** — ✅ **COMPLETED · PRODUCTION · SMARTPHONE MANUAL PASS**
  - Central family selector (controller) · selection 0 hides system values · selected only · multi-toggle · no auto shrink/nudge
  - Focus Display SSOT: CO/C1/C4/C5/C6 → **FRAME** · C3 → **RAIL** (presentation; calculation `_f`/`_r` unchanged)
  - Focus legacy collision nudge bypass · along-axis preserved · shared Focus typography
  - USER PC/Mobile/Tablet · ADMIN OFF · table-relative responsive KEEP AS-IS
  - Feature `5c10387` · hook-order hotfix `498f581` · detail → `HISTORY/PROJECT_LOG_2026-09.md` · SSOT → `3_SYSTEM_ARCHITECTURE.md`
- **AI Writing Assistant (Proofreading)** — **Implemented** (2026-09-08)
  - 대상: 관리자 One-Point Lesson 원문(`onePointDraft`)만.
  - 흐름: `[AI 교정]` → `POST /api/proofread` → Style Contract + OpenAI Responses API → before/after preview → 관리자 `[교정안 적용]` → `setOnePointDraft` → 기존 Apply/Save.
  - **자동 overwrite 금지** · numeric mutation reject · 의미/전문용어/숫자 보존.
  - Provider: OpenAI Responses API · model env `OPENAI_PROOFREAD_MODEL` (local/ops: `gpt-5.6-luna`) · `temperature` **미사용** · Phase 3D: `reasoning.effort: "none"`.
  - Security: API key **server-only** (`OPENAI_API_KEY`) · Vite `loadEnv`로 dev middleware에만 전달 · browser/VITE_* secret 없음 · non-2xx 시 server-only safe diagnostics.
  - 계산 엔진(SYS/Fg/Rg/Δ_sys/anchors/trajectory/Impact 등)과 **분리**된 UI/text/service 기능.
- **USER AI 패널**: `components/user/UserAiPanel.jsx` + `domain/userInfoPanelModel.ts` (`buildUserInfoPanel`).
  - Phase 3C: `strategySummaryText` + `onePointText` (committed presentation) · multiline `pre-line`
  - 본문 32px / 제목 40px, 패널 `min(80vw, 1400px)`, `max-height: 72vh`.
  - 상단 공략 제목 중복 제거, 공간 최적화.
  - **반응형 스케일**: `--ai-scale` (tablet 0.72 · phone landscape 0.44) — SYSTEM_LESSON 등과 동일 계수, 변수명만 분리 (통합 Phase 2 **보류**)
- **Deprecated**: `utils/aiPlayStrategyBuilder.ts` `buildPlayStrategy()` — SYS/HP/T/STR 나열형. · legacy USER `AiAutoCommentDisplay` (intro+STR) — USER AI path에서 Strategy Summary SSOT로 대체.

### USER Projection Rule (공식)

> **“USER는 관리자가 만든 DisplayModel을 투영해서 보여주는 Viewer이다.”**

| 규칙 | 내용 |
|------|------|
| ADMIN | 최종 DisplayModel 생성 (`buildSysCalcDisplayModel` 등) |
| USER | USER 공개 영역(block)만 선택 |
| Viewer | 읽기 전용 렌더 |
| 금지 | USER에서 문구 재생성 · 계산식 재조립 · 숫자 배열 재구성 |
| SSOT | ADMIN과 USER의 **최종 표현 문구** 일치 |

### USER 계산 Overlay (Calculation)

- **메뉴 id:** `TRAJECTORY` (내부) · **좌측 라벨:** **계산** (구명칭 `동선` 폐기)
- **Shell:** `UserOverlayShell` · AI 디자인 언어 · CALC 전용 `widthRatio: 0.62` · `maxHeightRatio: 0.85` · `height: auto`
- **Content Viewer:** `UserCalculationPanel` — DisplayModel block을 `sections → lines → parts`로 투영
- **역할:** 현재 선택 공략의 기준값/보정값 계산 표현을 ADMIN DisplayModel과 동일하게 확인

#### Projection 경로

```text
App
  → buildSysCalcDisplayModel(...)   // ADMIN과 동일 Formatter
  → baseline | corrected block 선택
  → UserCalculationPanel (read-only Viewer)
  → UserOverlayShell
```

- `buildUserTrajectoryCardModel()` 의존 **제거** (Calculation 경로)
- block title(`기준 계산` / `보정 계산`)은 USER에서 **숨김**
- 내부 계산 내용(공식·보정·설명·안내)은 ADMIN DisplayModel **그대로** 투영
- SYS 계산 엔진 및 DisplayModel **생성 로직 변경 없음**

#### Calculation Toolbar (Shell 밖)

Overlay 외부 상단 · Drag 대상 아님 · Overlay hide 시에도 Toolbar 유지 가능

| 버튼 | 역할 |
|------|------|
| **기준값** | `baseline` block |
| **보정값** | `corrected` block |
| **계산 보기 / 계산 감추기** | Overlay panel 표시 토글 |
| **쿠션 포인트** | 레일/쿠션 시스템 눈금 표시 (`trajectoryShowAxisValues`) |

정책: 한 줄(`nowrap`) · 텍스트 길이에 따른 `fit-content` · Overlay typography token · Glass Button · 선택 Accent

#### Layout (CALC)

- AI Typography 기준 (본문 `32px × --ai-scale`, line-height 1.4)
- Close(X) 없음 · 외부 터치 닫기 · Close 예약 `padding-right: 1.35em` **제거**
- 본문은 Shell 공통 padding 한계까지 사용
- 일반 내용 = 자연 높이 · 극단적으로 긴 내용만 body scroll

#### 쿠션 포인트의 의미

여기서 말하는 쿠션 포인트는 현재 계산 결과값 목록이 아니다.

위 값들은 이미 궤적 라벨과 계산 Overlay 투영값으로 표시된다.

Calculation Toolbar의 **쿠션 포인트**는 관리자 SYS/Grid에서 사용하는 **레일/프레임 축 시스템 기준 눈금**을 USER 계산 화면에 표시하는 기능이다.

사용 목적:

- 사용자가 “왜 출발값이 33인가?”를 즉시 이해할 수 있도록 한다.
- 기준값/보정값 궤적 위에 축 기준 숫자를 함께 표시해 위치 감각을 제공한다.

#### 렌더링 원칙

쿠션 포인트 ON:

- 현재 기준값/보정값 궤적 유지
- 현재 CO/C1/C3/C4 등 궤적 라벨 유지
- 추가로 레일/프레임 축 시스템 기준 숫자 표시

쿠션 포인트 OFF:

- 축 시스템 기준 숫자만 숨김
- 궤적과 현재 계산 라벨은 유지

#### 금지

- ADMIN용 Grid 편집 UI 노출 금지
- SYS 계산 엔진 변경 금지
- `SystemValueLabels` 축 숫자 크기/`labelScale` 임의 변경 금지
- baseline/corrected 계산 로직 · DisplayModel 생성 로직 변경 금지
- USER에서 계산 문구/식 재생성 금지

#### UI 스타일 (Calculation)

- Glass Dark Common Shell
- Full Surface Drag · **table-area 기하 중심** / Clamp · 위치 저장 없음
- Close(X) 없음 · 외부 터치 닫기
- Toolbar는 Shell 밖 · Drag 제외
- 일반 내용은 자연 높이 · 극단 길이만 body scroll
- 모바일/PC에서 동일 상대 Ratio 유지

#### ViewModel / 코드

- `overlay/utils/sysCalcDisplayModel.ts` — `buildSysCalcDisplayModel`
- `components/user/UserCalculationPanel.jsx` — DisplayModel Viewer
- `components/user/UserCalcToolbar.jsx` — 외부 4버튼
- `App.jsx` — DisplayModel 입력 공급 · `trajectoryCardSource` · `trajectoryShowAxisValues` · `calcOverlayVisible`
- (이력) `domain/userTrajectoryCardViewModel.ts` — Calculation Projection 경로에서는 미사용

#### Trajectory Display Cap

2026-06에 추가된 표시 안전 정책은 유지한다. **2026-09-08:** 5&Half Baseline Display Ceiling 확정. **2026-09-09:** Active C2 Handle Ownership 사용자 검증 PASS.

- `domain/trajectoryPathDisplayPolicy.ts`
- corrected: `endIndex = min(sameRailCap, secondBallCap, chainBreakCap)`
- **5&Half baseline DISPLAY:** `min(chain, sameRail, PhysicalLimit, correctedDisplayEndIndex)` — 내부 pathNodes(C5/C6) 보존 · cushionPath/labels만 절단 · second-ball XY spatial clip 금지
- 비-5&Half baseline: 기존 second-ball Cap 유지 (corrected ceiling 미적용)
- **ADMIN C2 Handle:** `resolveActiveC2HandleRg` + `showBaseLine` — Baseline/Corrected active C2 · display≡drag seed · click-only no mutate
- 연속 segment `(node[i] → node[i+1])` 양 끝 동일 rail이면 해당 segment부터 path/label 미표시
- CO–C3–C6 같은 비연속 동일 rail은 허용
- 계산 엔진 및 C5/C6 sync rule은 변경하지 않음

#### Display Boundary Policy (2026-08-04 · **v1.5 / v1.5.1 2026-09-09**)

**상태:** Policy SSOT **v1.5.1** · Phase 1 Cap + Phase 2A · **Reading Mode Completed** · **C2 Active Ownership Completed** · **5&Half Baseline Display Ceiling** · Continuation/Boundary/Corrected Cap 잔여

USER 기준값/보정값의 **Display Layer 상위 정책**이다. Extension Runtime(Freeze)과 역할을 분리한다.

- SSOT: `작업관리/DISPLAY_BOUNDARY_POLICY_SSOT.md` **v1.5.1**
- Flow: Builder → **Display Cap** → **Display Boundary** → **Overlay Attach** → Render
- **Phase 2A:** `trajectoryExtensionOverlayVisibility.ts` — USER baseline CASE B 미부착 · corrected/ADMIN 부착 · Runtime 유지
- **Reading Mode (§15):** USER Overlay Shell · Original Aspect · Zoom → **table-area center** (`dragOffset=0`) · `ReadingFontScale=1.45` · **Completed**
- **C2 Reflection Rail Handle (§16):** ADMIN only · **Active trajectory C2** ownership (`resolveActiveC2HandleRg`) · click-only no mutate · rail+t Override · Cap `skipSameRail` · **Completed**
- **Extension ≠ Difference** · Extension Runtime은 Boundary 입력이 아님
- **5&Half:** baseline DISPLAY ceiling = corrected DISPLAY Cn (D-DBP-05 v1.5)
- 구현 범위: Display Cap / Boundary / Overlay Attach / Reading Shell / C2 Override Presentation · Extension Runtime **비대상**

| 항목 | 상태 |
|------|------|
| Reading Mode UX | **Completed** |
| Reading Mode Original Aspect | **Completed** |
| Reading Mode Zoom → table-area center | **Completed** (Centering SSOT · 이전 시각 중심 유지 폐기) |
| C2 Reflection Rail Handle | **Completed** |
| Reflection Override Persist (`{rail,t}`) | **Completed** |
| Display Cap Corner Override (`skipSameRail`) | **Completed** |

### USER 쿠션 포인트 라벨 (System Value Labels)

- **노출 방식**: 독립 USER 메뉴가 아니라 **Calculation Toolbar `쿠션 포인트` 토글**로 노출
- **Phone Landscape 확대**: `MEDIA_PHONE_LANDSCAPE` → `labelScale` **1.5** (`SYS_LABEL_PHONE_LANDSCAPE_SCALE`, `tableConfig.ts`)
- **터치 Persistent Selection** (2026-06-22): 라벨 탭 → 선택 유지(1.8× 확대) · 다른 라벨 탭 → 전환 · 빈 테이블 영역 탭 → 해제 · document capture + transparent dismiss rect
- **Caption Engine 연동**: `systemAxisCaption.ts` — `labelScale` 비례 placement · `SystemValueLabels.jsx` · `LabelText.jsx`
- **버그 수정**: `App.jsx` — `sysLabelScale` hooks를 `loading`/`error` early return **이전**으로 이동 (React hooks 순서 오류 해결)

---

## 현재 UI 구조

### 관리자 (ADMIN)

| 버튼 | 오버레이 | 비고 |
|------|----------|------|
| **로컬DB** (Stage rail) | — | Local `normalized_dataset` · profile `adminSearch` |
| **Search** (우측 패널) | — | published normalized Members · profile `adminStrict` (= USER Search와 동일 corpus) |
| S1/S2/S3 | — | slot 전환, hydrate |
| SYS | `overlayState` SYS | 편집·Apply |
| HP/T | HPT | 편집 |
| STR | STR | 편집 |
| AI | AI | 자동 코멘트 + 원 포인트 레슨 + 전체 적용 |

### 사용자 (USER)

| 버튼 | 오버레이 | 비고 |
|------|----------|------|
| Search / Reset | — | Search 성공 시 Reset으로 전환 · Reset은 공 위치만 유지하고 검색 결과/공략/오버레이/타겟 상태 초기화 |
| 공략 버튼 | — | USER Search 성공 시 활성 · 선택 공략 기준으로 AI/타점/계산 표시 |
| AI | `overlayContent === "AI"` | `UserAiPanel` · Common Shell · 기준 UX |
| 두께/타점 | `overlayContent === "HPT"` | `UserHptPanel` · HPT Shell (`widthRatio 0.42`) |
| 계산 | `overlayContent === "CALC"` (id `TRAJECTORY` 유지) | `UserCalculationPanel` + `UserCalcToolbar` · DisplayModel Viewer |
| History | 모달 | |

---

## 핵심 코드 SSOT 맵 (전역)

| 영역 | 파일 |
|------|------|
| Orchestrator | `frontend/src/App.jsx`, `components/Stage.jsx`, `components/common/ModalShell.jsx` |
| 슬롯·SAVE | `hooks/useShotSlots.ts`, `domain/canonicalStrategy.ts`, `domain/adminSaveEngine.ts`, `domain/positionMergeEngine.ts` |
| Recall·Search | `domain/positionSearchEngine.ts`, `domain/positionRecallEngine.ts`, `domain/recall/recallEngine.ts`, `domain/recall/recallProfiles.ts`, `domain/recall/recallCompare.ts` |
| Published Dataset | `domain/publishedDatasetStore.ts`, `domain/datasetLoader.ts`, `domain/publishedLeafResolve.ts`, `domain/datasetPath.ts` |
| Dataset Export | `domain/datasetExport.ts`, `domain/datasetPath.ts`, `hooks/useSettings.js` (`handleExportSnapshots`) |
| Workspace History | `domain/workspaceHistory.ts`, `hooks/useSettings.js` (`commitWorkspaceHistoryWithStrategyDataset`) |
| Slot hydrate | `domain/slotRuntimeHydrate.ts` |
| Render SYS | `domain/slotSysResolve.ts` (App: `slotRenderSys`, effective values) |
| 궤적 | `utils/trajectory/curveTrajectory.ts`, `hooks/useTrajectoryState.ts`, `components/table/ImpactLines.jsx` |
| Anchors | `domain/anchorLookupEngine.ts`, `domain/anchorCoordinateEngine.ts`, `domain/reflectionEngine.ts` (`detectRail` · **`resolveNearestRail`**) |
| Display Cap | `domain/trajectoryPathDisplayPolicy.ts` — same-rail presence=`detectRail` · identity=`resolveNearestRail` |
| **Caption Engine** | `domain/systemAxisCaption.ts` (`findBestAlongSequential`), `components/table/SystemValueLabels.jsx` (`pushGroup`) |
| Overlay Router | `overlay/router/adminOverlayRouter.ts` (`useAdminOverlayRouter`), `overlay/state/overlayStateMachine.ts` (`useAdminOverlayLifecycle`), `overlay/router/userOverlayRouter.ts` (`useUserOverlayRouter`) |
| Overlay Utils | `overlay/utils/sysOverlayUtils.jsx` — SysOverlay 공유 헬퍼 |
| Renderer Label | `renderer/labels/labelScalePolicy.ts` (`useSysLabelScale`), `renderer/labels/systemAxisLabelModel.ts` (`buildSystemAxisLabelModel`) |
| Renderer Trajectory | `renderer/trajectory/trajectoryRenderModel.ts` · `trajectoryPathAttrModel.ts` · `baselineHandleModel.ts` · `anchorConversionModel.ts` |
| Trajectory Domain | `domain/trajectory/trajectoryBuilder.ts` · `reflectionPolicy.ts` · `pathNodeHelpers.ts` · `baselineHandleGeometry.ts` |
| Trajectory Flows | `application/flows/trajectoryHydrateFlow.ts` · `baselineDraftApplyFlow.ts` |
| Admin SYS 식 | `admin/sys/useSysCalculation.ts` |
| App SYS·궤적 | `utils/systemCalculator.ts`, `utils/trajectorySampleBuilder.ts` |
| AI 자동 코멘트 | `domain/aiAutoCommentViewModel.ts` |
| USER 패널 | `domain/userInfoPanelModel.ts`, `components/user/UserAiPanel.jsx` |
| USER 시스템 레슨 (보류) | `domain/userSystemLessonViewModel.ts`, `components/user/UserSystemLessonPanel.jsx` — 현재 USER 메뉴 비노출, 향후 학습 모드 재사용 후보 |
| USER HP/T | `components/user/UserHptPanel.jsx`, `domain/userHptViewModel.ts`, `.modal-panel--user-hpt` |
| USER 계산 | `components/user/UserCalculationPanel.jsx`, `components/user/UserCalcToolbar.jsx`, `overlay/utils/sysCalcDisplayModel.ts`, `App.jsx` (`trajectoryCardSource`, `trajectoryShowAxisValues`, `calcOverlayVisible`) |
| USER 쿠션 포인트 | `components/table/SystemValueLabels.jsx`, `components/table/LabelText.jsx`, `config/tableConfig.ts` — Calculation Toolbar 토글로 노출 |
| Overlay 반응형 CSS | `frontend/src/index.css` — `--overlay-scale`, `--ai-scale`, `--overlay-svg-scale` (bridge token 유지, **Layout SSOT는 Ratio/Surface token 기준**) |
| **Overlay Layout SSOT** | `OVERLAY_LAYOUT_SSOT_v1.2.md` — USER Overlay 공통 Shell 규약 (**Confirmed v1.2**, Consume) · **Centering SSOT** (live panel · Panel/Table RO · 2026-08-12) · Reading Mode UX → `DISPLAY_BOUNDARY_POLICY_SSOT.md` **§15** (v1.4 · **Implemented**) |

---

## 코드 SSOT 맵 (AI·USER 오버레이)

| 역할 | 파일 |
|------|------|
| 자동 코멘트 모델 | `frontend/src/domain/aiAutoCommentViewModel.ts` |
| USER 패널 모델 | `frontend/src/domain/userInfoPanelModel.ts` |
| USER AI UI | `frontend/src/components/user/UserAiPanel.jsx` |
| USER 시스템 레슨 (보류) UI | `frontend/src/components/user/UserSystemLessonPanel.jsx` |
| USER 시스템 레슨 (보류) VM | `frontend/src/domain/userSystemLessonViewModel.ts` |
| USER 계산 Overlay UI | `frontend/src/components/user/UserCalculationPanel.jsx` |
| USER 계산 Toolbar | `frontend/src/components/user/UserCalcToolbar.jsx` |
| USER 계산 DisplayModel | `frontend/src/overlay/utils/sysCalcDisplayModel.ts` |
| USER HP/T UI | `frontend/src/components/user/UserHptPanel.jsx` |
| USER 쿠션 포인트 | `frontend/src/components/table/SystemValueLabels.jsx` — Toolbar `쿠션 포인트` 토글로 제어 |
| USER 오버레이 | `frontend/src/App.jsx` (`overlayContent`: AI · HPT · CALC) |
| USER Overlay Shell | `frontend/src/components/common/UserOverlayShell.jsx` — 공통 Layout Layer · **Centering SSOT** (Ratio · Surface · Drag · Clamp · live panel measure · Panel/Table ResizeObserver · Close 없음) |
| Stage 버튼 연동 | `frontend/src/components/Stage.jsx` (`USER_FUNC_IDS`, `onUserFuncButtonSelect`) |
| ADMIN AI Overlay | `frontend/src/components/overlays/AiOverlay.jsx` |
| AI Comment editor session | `frontend/src/domain/lesson/aiCommentEditorSession.ts` |
| AI Proofreading client | `frontend/src/domain/lesson/proofreadingClient.ts` |
| AI Proofreading API | `frontend/api/proofread.js` · `frontend/api/_lib/*` (Style Contract · numericGuard · OpenAI provider) |
| AI Proofreading local middleware | `frontend/vite.config.js` (`loadEnv` + `/api/proofread`) |
| 스타일 | `frontend/src/index.css` (`.modal-panel--user-ai`, `.modal-panel--user-hpt`, `.modal-panel--user-calc`, `.user-calc-toolbar`) |

---

## 현재 완료 상태

### AI Writing Assistant / Proofreading (2026-09-08)

- **역할**: 관리자 One-Point Lesson **교정 편집자** (콘텐츠 자동 작성기 아님)
- **경계**: Auto Comment · SYS/STR/계산 엔진 · SAVE/History persistence **비대상** (승인 후 `onePointDraft`만 갱신 → 기존 Apply/Save)
- **검증**: targeted + full suite PASS · `vite build` PASS · local live OpenAI 교정 실사용 PASS
- **상세:** `HISTORY/PROJECT_LOG_2026-09.md` 2026-09-08

### Runtime Contract SSOT 안정화 (2026-08-01)

- **SYS Apply 백지화 해결** — 관리자 SYS 설정에서 **적용**을 누르면 화면 전체가 백지화되던 오류 해결
- **직접 원인** — `hooks/useShotSlots.ts` `buildSlotDraftWithUpdatedSys()`의 debug 필드가 Batch 6 Runtime Contract 이관 후에도 남은 **선언되지 않은 `profile` 변수**를 참조 → `commitDraftSys` render phase에서 `ReferenceError` → ErrorBoundary 부재로 React root unmount
- **해결** — 같은 함수가 Runtime Contract에서 이미 해석해 둔 `formulaExpr` 재사용 (`getSystemContract()` 경유). System JSON 직접 접근 경로 제거로 **해당 함수의 Runtime Contract 경유 완성**
- **Legacy profile dangling reference 제거 완료** — Batch 6 이관 잔여 debt 해소
- **정적 분석 사각지대 확인** — build는 `vite build`(transpile only, `tsc --noEmit` 미포함), ESLint는 `files: ['**/*.{js,jsx}']`로 `.ts` 미검사 → 두 게이트 모두 통과했었음
- **후속 후보 (미적용):** build에 `tsc --noEmit` 추가 또는 ESLint 대상에 `.ts` 포함 · ErrorBoundary 도입
- **변경 파일:** `frontend/src/hooks/useShotSlots.ts` (1줄) · **Commit:** `abeca84`

### ADMIN Overlay — Native Selection 처리 (2026-08-01)

- **새로고침 후 첫 SYS Overlay 파란 selection highlight 해결** — Overlay 텍스트 전체가 선택 표시되던 현상 제거
- **직접 원인** — Pointer Capture / Interaction 문제가 **아님**. Pointer Capture Timing SSOT에 따라 native dblclick을 보존하므로 Target Ball 더블클릭이 Selection Range를 생성하고, 이 Range가 살아 있는 상태에서 Overlay panel DOM이 삽입되면 새 텍스트가 Range에 편입되어 highlight로 렌더
- **"첫 오픈에서만" 발생하는 이유** — SYS 버튼은 Target Ball 더블클릭 이후에만 활성화되므로 첫 Overlay 오픈의 직전 동작은 항상 더블클릭
- **해결 (Option A)** — `ModalShell`이 열릴 때 1회 `window.getSelection()?.removeAllRanges()` 호출. `open === true` 전환 기준 (ModalShell은 닫혀 있을 때 `null`을 렌더링하되 mount 상태 유지)
- **적용 범위** — ModalShell 소비자 전체 (SYS · HP/T · STR · AI · Workspace History · Category Manage · Lesson Order Manage). USER Overlay(`UserOverlayShell`)는 별도 Layer로 비대상
- **비변경 보증** — Pointer Capture Timing · `preventDefault` · dblclick 로직 · `user-select` CSS · Ball / Pad / SVG Interaction 일절 변경 없음
- **Overlay SSOT** — `2_FRONTEND_ARCHITECTURE_BASELINE_v1.md` §Overlay Native Selection (D-OVLSEL-01~02)
- **변경 파일:** `frontend/src/components/common/ModalShell.jsx` (7줄) · **Commit:** `7ef9601`
- **참고:** 프로젝트에 `ModalShell.tsx`는 존재하지 않는다. 실제 파일은 `ModalShell.jsx`이다.

### 검증 상태 (2026-08-01 기준)

| 항목 | 결과 |
|------|------|
| Build | **PASS** (`vite build`) |
| Lint | **PASS** — 변경 전/후 동일 · 신규 0 |
| Regression | **없음** |
| Interaction | 안정 — Target Ball DoubleClick · Ball Drag · Pad Drag · Pointer Capture 시점 유지 |
| Runtime Contract | 안정 — legacy 직접 접근 제거 |
| Dataset Pipeline | 안정 — SAVE / Export / Search / Production 반영 검증 완료 |

**상세:** `HISTORY/PROJECT_LOG_2026-08.md` 2026-08-01 (D-RTC-01 · D-OVLSEL-01~02)

### Authoring / Display (2026-08-17) — uncommitted

상세: `HISTORY/PROJECT_LOG_2026-08.md` 2026-08-17. **Commit/Push 없음. working tree 보존.**

| Item | Status |
|------|--------|
| saveFlow `system` identity string | IMPLEMENTED (uncommitted) |
| C2 Track-change invalidate | IMPLEMENTED (uncommitted) |
| History restore `adminTableLayersVisible` ON · session false | IMPLEMENTED (uncommitted) |
| `app_ui_mode_v1` F5 USER/ADMIN | IMPLEMENTED (uncommitted) |
| HPT tip-side C2 invalidate | ✅ **COMPLETE** (`896221e`) |
| **BUG-A** display-cap nearest-rail | IMPLEMENTED (uncommitted) |
| **BUG-B** Reset/History stale | **UNCONFIRMED** — BUG-A 수정 후 재현 필요 |
| Family Master/Member | **Shadow physical stores IMPLEMENTED** (3A-321…326) · production SSOT still `positions_dataset` · normalized READ **OFF** |

### ADMIN Interaction — Pointer Capture Timing (2026-07-30)

- **Target Ball native dblclick Regression 해결** — ADMIN SYS에서 Cue 선택 후 Yellow/Red 더블클릭(Impact Ball · Baseline 생성)이 실패하던 회귀 해결
- **직접 원인** — `handlePointerDown()`의 무조건 `setPointerCapture()`가 두 번째 클릭의 native `dblclick` target을 Ball `<circle>` → `svg.table-svg`로 강제 변경
- **Pointer Capture 구조 개선** — Capture 제거가 아니라 **실제 Drag가 시작되는 첫 유효 `pointermove` 시점으로 이동**
- **Drag / DoubleClick 충돌 제거** — 클릭·더블클릭은 Browser Native Event 유지, Drag 전용 기능만 Capture 사용
- **Playwright trusted event 검증 완료** — Cue/Yellow/Red Target 선택 · Pad Drag · Ball Drag · PointerMove/Up/Cancel · Capture 시점 · Build PASS · Regression 없음
- **Interaction SSOT** — `2_FRONTEND_ARCHITECTURE_BASELINE_v1.md` §Pointer Capture Timing (D-INTERACT-01~03)
- **변경 파일:** `frontend/src/App.jsx` (`handlePointerDown` · `handlePointerMove`) · **상세:** `HISTORY/PROJECT_LOG_2026-07.md` 2026-07-30

### USER Overlay UX Phase (2026-07 · Centering 2026-08-12)

| Item | Status |
|------|--------|
| **Overlay Layout SSOT** | **v1.2 Confirmed** (+ 2026-07-28 · **Centering SSOT 2026-08-12**) |
| **USER Overlay Common Shell** | **Implemented** · Close(X) 없음 · 외부 터치 닫기 |
| **USER Overlay Centering SSOT** | ✅ **COMPLETE** — Root Cause B+C · Panel ResizeObserver · 브라우저 검증 · build PASS · **Commit/Push 대기** |
| **USER Projection Rule** | **Official** — DisplayModel Viewer |
| **AI Overlay** | **Completed** · Shell `widthRatio 0.63` (Phase 3C ~1.5×; was 0.42) |
| **HPT Overlay** | **Common Shell 적용 완료** · AI Shell 규격 · 공 크기 독립은 **Polish 보류** |
| **Calculation Overlay** | **Completed** · Common Shell + Toolbar + DisplayModel Viewer · `widthRatio 0.62` |
| **좌측 메뉴** | `동선` → **`계산`** |
| **Centering 통합 검증** | ✅ **COMPLETE** (실제 브라우저) |
| **기타 통합 검증** | **Pending** (HPT Polish 등) |

### USER Overlay Centering SSOT (2026-08-12) — Summary

| Field | Value |
|-------|--------|
| **Status** | ✅ **COMPLETE** · 실제 브라우저 검증 완료 · `npm run build` PASS |
| **Root Cause** | **B** stale panel dimensions + **C** content reflow timing (dragOffset은 부차) |
| **Fix** | `UserOverlayShell` — live panel box · **Panel ResizeObserver** + Table ResizeObserver · 동일 Centering SSOT |
| **Invariant** | Drag 제외 안정 상태: `overlayCenter === tableAreaCenter` (`.table-area` 기하 중심) |
| **Reset** | Open / Re-open / Switch / Zoom / layout·size → `dragOffset = 0` |
| **Drag** | temporary center-relative offset 유지 · Panel RO는 offset 리셋 금지 |
| **Zoom** | 항상 table-area center (이전 시각 중심 유지 폐기) |
| **Width policy** | AI `0.63` · HPT `0.42` · CALC `0.62` |
| **Code** | `frontend/src/components/common/UserOverlayShell.jsx` only · `index.css` 최종 미수정 |
| **Out of scope** | DisplayModel · Projection · SYS · Content · Toolbar · App positioning |
| **Git** | **Commit/Push 대기** (코드+문서 미커밋) |
| **SSOT** | `OVERLAY_LAYOUT_SSOT_v1.2.md` §8 · Detail: `HISTORY/PROJECT_LOG_2026-08.md` |

### Ball Fine Position Controller (2026-08-12) — Summary

| Field | Value |
|-------|--------|
| **Status** | ✅ **COMPLETE** · Desktop **PASS** · Mobile Production **PASS** · Admin/User **PASS** |
| **Purpose** | Ball physical center coordinate 확인 · 0.1 Rg 미세조정 · Sample System Validation / 실사용 Ball positioning 지원 |
| **Scope** | Ball positioning UI only — Search / RI / Slot / Calculator / Anchor / Trajectory / Envelope / Publisher **미변경** |
| **UI** | Joystick과 함께 표시 · `▲ ◀ (x.x, y.y) ▶ ▼` · coordinate fontSize **22** · arrow fontSize **15** |
| **Tap / Hold** | Tap **0.1** · Long Press threshold **1.0s** · Hold repeat **0.2** / **150ms** · no acceleration · no double-step |
| **Touch** | Non-overlapping 4-direction zones · ZONE_INNER **24** · ZONE_OUTER **120** · CENTER protected dead zone |
| **Placement** | Ball → Joystick → **3 Rg** gap → Fine Controller → Table Center · `computeFineControllerCenterRg()` |
| **Dismissal** | `hideBallPositionController()` · `dragState.joystickVisible` 종속 · positioning 외 UI action 시 숨김 · CENTER 터치는 dismiss 없음 |
| **Mobile WebKit** | Fine-scoped only: `touchAction` / `userSelect` / `WebkitUserSelect` / `WebkitTouchCallout` none · scoped contextmenu · Fine pointerup/cancel selection cleanup · **전역 selection 정책 미변경** |
| **Code** | `frontend/src/App.jsx` · `frontend/src/interaction/joystickInteractionPolicy.ts` |
| **Git** | Production `1eaf76c0102071893c2bc561cfe72d972d53b55f` · `fix(ui): prevent mobile long-press selection in Fine Controller` |
| **Verification** | Desktop Local **PASS** · Mobile Production **PASS** · Admin **PASS** · User **PASS** |
| **SSOT** | `2_FRONTEND_ARCHITECTURE_BASELINE_v1.md` §Ball Fine Position Controller · Detail: `HISTORY/PROJECT_LOG_2026-08.md` |

### 완료

- **Search Engine Foundation Phase (2026-08-06)** — Schema · Models · Validation · Loader · Membership · Resolve · Runtime · Session · Strategy Repository · Strategy Engine · Modal Engine · Geometry Engine(Context) **완료** · Architecture Freeze 유지 · Commit 없음
- **Dataset Generator Phase (2026-08-06)** — Trajectory Generator · Cue Sampler · Second Sampler · Envelope Builder · Published Dataset Builder · Generator Pipeline E2E **완료** · Validation PASS · Loader 연동 PASS · MembershipCandidate 생성 PASS · Round-trip PASS · Next **Search Engine Enhancement Phase**
- **Search Engine Enhancement Phase (2026-08-06)** — Spatial Index **완료** · Runtime-derived only · PublishedDataset 수정 없음 · Query → Candidate ID 반환 · Unit/Smoke/Full PASS · Next **KDTree**
- **Search Engine Enhancement Phase (2026-08-06)** — KDTree **완료** · Spatial 후보 집합 consume · 6D encoding · deterministic top-N shortlist · Unit/Smoke/Full PASS · Next **Membership Optimization**
- **Search Engine Enhancement Phase (2026-08-06)** — Membership Optimization **완료** · Spatial Index → KDTree → Membership path · Full Scan Fallback 유지 · Regression/Smoke/Full PASS · Next **Ranking Engine**
- **Search Engine Enhancement Phase (2026-08-06)** — Ranking Engine **완료** · MembershipCandidate[] → RankedCandidate[] · deterministic Score Model · Stable Sort · Unit/Regression/Smoke/Full PASS · Next **Interpolation Engine**
- **Search Engine Enhancement Phase (2026-08-06)** — Interpolation Engine **완료** · RankedCandidate[] → RefinedCandidate[] · rank-continuity refinement · PublishedDataset Immutable · Unit/Regression/Smoke/Full PASS · Next **Geometry Engine**
- **Search Engine Enhancement Phase (2026-08-06)** — Geometry Metrics Engine **완료** · RefinedCandidate[] + Query → GeometryEvaluatedCandidate[] · distance/angle/similarity/error providers · Trajectory 미생성 · Unit/Regression/Smoke/Full PASS · Next **Search Quality Tuning**
- **Search Engine Enhancement Phase (2026-08-06)** — Search Runtime Enhancement Wiring **완료** · Spatial → KDTree → Membership → Ranking → Interpolation → Geometry → Resolve orchestration · Integration/Smoke/Full PASS · Next **Search Quality Tuning**
- **Search Engine Enhancement Phase (2026-08-06)** — **Complete** · Mission 42 E2E/Regression/Benchmark/Quality Report PASS · Phase 3 Complete 선언 · Full Test **248 PASS**
- **Application Architecture Standard (AAS) v2.0** — Application Runtime Constitution (SSOT) 확정 (2026-07-03):
  - ✔ Application Migration Blueprint
  - ✔ Architecture Meta
  - ✔ Capability Ownership Matrix
  - ✔ Architecture Capability Matrix
  - ✔ Architecture Decision Record (ADR-001~010)
  - ✔ Architecture Review Checklist
  - ✔ Architecture Approval Flow
  - ✔ Runtime Constitution
  - ✔ Architecture Governance
- **AAS Runtime Migration Batch 1** — Domain Layer 초기 분리 완료 (2026-07-06):
  - ✔ Batch1 Analysis · Design v1.2 · Architecture Review
  - ✔ `domain/system/systemIdentity.ts` 생성 (SYS-004/005)
  - ✔ `domain/calculator/fiveHalfCalculator.ts` 생성 (CAL-001)
  - ✔ `domain/calculator/formulaExpr.ts` 생성 (MISC-006)
  - ✔ App.jsx 순수 함수 95 lines 제거 · SYS-005 inline 정규화 3곳 제거
  - ✔ npm run build PASS · Regression R-1~R-10 PASS · Acceptance AC-1~AC-11 PASS
- **AAS Runtime Migration Batch 2** — Presentation Layer 분리 완료 (2026-07-06):
  - ✔ Batch2 Design v1.1 · STEP Lock Rule · Architecture Decisions AD-B2-01/02/03
  - ✔ `components/overlays/AnchorEditOverlay.jsx` (OVL-006)
  - ✔ `components/overlays/HptOverlay.jsx` (OVL-002/003)
  - ✔ `components/overlays/AiOverlay.jsx` (OVL-008)
  - ✔ `components/overlays/SysOverlay.jsx` AD-B2-01 Pure Presentation (OVL-005)
  - ✔ `overlay/utils/sysOverlayUtils.jsx` 공유 헬퍼 16개
  - ✔ `overlay/router/adminOverlayRouter.ts` · `overlay/state/overlayStateMachine.ts` (OVL-001)
  - ✔ `overlay/router/userOverlayRouter.ts` (OVL-007)
  - ✔ `renderer/labels/labelScalePolicy.ts` (APP-013)
  - ✔ `renderer/trajectory/trajectoryRenderModel.ts` (TRJ-002)
  - ✔ `renderer/labels/systemAxisLabelModel.ts` (RND-002)
  - ✔ `renderer/trajectory/anchorConversionModel.ts` (RND-004)
  - ✔ AD-B2-02: `sysOverlayInputFinite` module-private · Migration Debt D-002 Close
  - ✔ App.jsx 8,983 → 6,509 lines (−2,474 lines)
  - ✔ npm run build PASS · Import Graph Validation PASS
  - ✔ Batch 2 Baseline 확정 · origin/main Push 완료
- **AAS Runtime Migration Batch 3** — Application Flow · Search · Dataset · AI Domain 분리 완료 (2026-07-07):
  - ✔ Batch3 Design v1.0 · STEP Lock Rule · Architecture Decisions AD-B3-01~05
  - ✔ `application/flows/recallHydrateFlow.ts` (CAL-004)
  - ✔ `application/flows/resetFlow.ts` (SRCH-004)
  - ✔ `application/flows/adminLocalDbFlow.ts` (SRCH-001)
  - ✔ `application/flows/adminSearchFlow.ts` (SRCH-002)
  - ✔ `application/flows/userSearchFlow.ts` (SRCH-003)
  - ✔ `application/flows/saveFlow.ts` (SRCH-005 + DS-002)
  - ✔ `application/flows/historyFlow.ts` (DS-003)
  - ✔ `application/flows/ballDragFlow.ts` (CAL-006)
  - ✔ `domain/lesson/onePointLibrary.ts` (AI-002)
  - ✔ `domain/dataset/infra/datasetStorage.ts` (DS-001 + DS-004)
  - ✔ `domain/dataset/autoCapture.ts` (MISC-002)
  - ✔ App.jsx 6,509 → 5,807 lines (−702 lines)
  - ✔ npm run build PASS · Regression R-B3-C1~C8 PASS · Acceptance AC-1~AC-17 PASS (AC-2 부분: 목표 ~5,400 lines 미달, −702 감소)
  - ✔ Migration Debt D-006/D-007 Open · D-008 Closed · Batch 3 Baseline 확정
- **AAS Runtime Migration Batch 4** — Calculation Runtime Domain 이전 완료 (2026-07-07):
  - ✔ STEP 4-1~4-4 (4 commits): CAL-002/003/005, MISC-004
  - ✔ `domain/calculator/systemValueCalculator.ts` · `domain/calculator/sysOverlayCalcHelpers.ts`
  - ✔ `domain/system/slotSysViewModel.ts` (resolveSlotSys)
  - ✔ AD-B4-01: Option A Domain helper co-location
  - ✔ App.jsx 5,807 → 5,640 lines (−167 lines)
  - ✔ npm run build PASS · Regression R-B4-C1~C6 PASS · Acceptance AC-1~AC-12 PASS
  - ✔ Migration Debt D-008 Closed · Batch 4 Baseline 확정
- **AAS Runtime Migration Batch 5** — Trajectory Runtime Domain 이전 완료 (2026-07-08):
  - ✔ STEP 5-1~5-8 (9 commits): TRJ-001/003, RND-003, APP-009
  - ✔ `domain/trajectory/` · `application/flows/trajectoryHydrateFlow` · `baselineDraftApplyFlow`
  - ✔ `renderer/trajectory/trajectoryPathAttrModel` · `baselineHandleModel`
  - ✔ `overlay/state/baselineDraftState` · AD-B5-01~11
  - ✔ App.jsx 5,640 → ~3,903 lines · Orchestrator only
  - ✔ npm run build PASS · Release Gate PASS · Batch 5 Closed · Release Approved · Batch 6 Ready
- **AAS Runtime Migration Batch 6** — Runtime Contract / Registry / Loader 완료 (2026-07-13):
  - ✔ STEP 6-1~6-7 (+ API boundary cleanup): Contract · Registry · Loader · Debt Closure
  - ✔ `runtime/contract/` · `runtime/registry/` · `runtime/loader/` · `runtime/index.ts`
  - ✔ Public API: `getSystemContract` · `extractTrajectoryContractView` · Import Graph Gate PASS
  - ✔ D-005 / D-006 / D-007 / D-009 / D-010 **Closed**
  - ✔ Serializable Contract (AD-B6-10) · AC-1~AC-21 PASS · Batch5 parity 유지
  - ✔ Final Code Baseline `ec71ef9` · **Completed · Final Freeze**
  - ✔ Closure: `Batch06/Batch6_Final_Freeze.md` · `Batch6_Architecture_Completion_Report.md`
- **SPS STEP4 System Inventory Final (v1.0, 2026-07-14)**:
  - ✔ STEP4-1 Discovery · STEP4-2 Inventory/Observation SSOT · STEP4-3 Metadata · STEP4-4 Registration
  - ✔ STEP4 Inventory Assets (§19 Reference Entry Point)
  - ✔ Frozen Assets / Frozen Rules declared (§20)
  - ✔ Inventory ID `SYS-001`…`SYS-038` · Observation Codes frozen
  - ✔ SSOT: `System Platform Standard (SPS) v1.0/System_Inventory.md` **v1.0 Final**
- **SPS STEP5 Architecture Audit Final Freeze (v1.0, 2026-07-15)**:
  - ✔ STEP5-1 Framework Frozen
  - ✔ STEP5-2 Audit Plan Frozen
  - ✔ STEP5-3 Audit Rule Catalog Frozen
  - ✔ STEP5-4 Observation Mapping Register · Evidence Register Frozen
  - ✔ STEP5-5 Finding · Violation · Recommendation · Architecture Decision Registers Frozen
  - ✔ STEP5-6 Architecture Audit Report Template · STEP6 Handoff Template Frozen
  - ✔ `STEP5_FINAL_FREEZE.md` declared
  - ✔ Location: `System Platform Standard (SPS) v1.0/`
- **SPS STEP6 Schema Validation — Framework + Pipeline Freeze Candidate (2026-07-15)**:
  - ✔ STEP6-1 Framework Draft · Review PASS · QA Patch · **Freeze Candidate (Locked)**
  - ✔ STEP6-2 Validation Pipeline Draft · Review PASS · QA Patch · **Freeze Candidate (Locked)**
  - ✔ Architecture Locked · Pipeline = Framework **Consume-only**
  - ✔ SSOT: `STEP6_Schema_Validation_Framework.md` v1.0 · `STEP6_Validation_Pipeline.md` v0.6
  - ✔ Location: `System Platform Standard (SPS) v1.0/`
- **SPS STEP6-3 Schema Rule Analysis Complete (v1.1, 2026-07-17)**:
  - ✔ Analysis Only · Framework / Pipeline **Consume Only**
  - ✔ Domain (WHAT) ≠ Family (HOW) 분리
  - ✔ Rule Type · Layer Mapping · Coverage 후보 · Rule Dependency (Cascade / Skip / Blocking / Deferred)
  - ✔ Classification Axis = **후보만** (STEP6-4 Design)
  - ✔ SSOT: `STEP6-3_Schema_Rule_Analysis.md` v1.1
  - ✔ Next: **STEP6-4 Rule Catalog Design**
- **SPS STEP6-4 Rule Catalog Design Complete (v0.2, 2026-07-17)**:
  - ✔ Design Only · Domain≠Family · Layer×Type · Coverage/Dependency expression · Header Metadata
  - ✔ Classification Axis = candidates only
  - ✔ SSOT: `STEP6-4_Rule_Catalog_Design.md` v0.2
- **SPS STEP6-5 Validation Register Suite Complete (v0.2, 2026-07-17)**:
  - ✔ Design Only · Rule Record · Catalog Pin cite · Dependency refs · Rule ID scheme
  - ✔ **Register State / Lifecycle** — Draft · Proposed · Approved · Active · Deprecated · Archived
  - ✔ State ≠ Execution Status
  - ✔ SSOT: `STEP6-5_Validation_Register_Suite.md` v0.2
- **SPS STEP6-6…STEP6-11 Schema Validation Complete · Final Freeze (2026-07-17)**:
  - ✔ STEP6-6 Engine Design v0.2
  - ✔ STEP6-7 Engine Implementation (7A–7G) — `frontend/src/validation/engine/`
  - ✔ STEP6-8 Pilot Validation · STEP6-9 Full Validation (Production)
  - ✔ STEP6-10 Validation Report v1.0 · Known Issues KI-01…04
  - ✔ STEP6-11 **Final Freeze v1.0** — `STEP6_FINAL_FREEZE.md`
  - ✔ Ops: `DEVELOPMENT_WORKFLOW.md` v0.3 (Implementation Decomposition)
  - ✔ Next: **STEP7**
- **SPS STEP7 P2 Catalog Design Complete (v0.15, 2026-07-19)**:
  - ✔ Sessions `S7-P2-IU-2-01A` … `S7-P2-IU-2-08B` PASS
  - ✔ SSOT: `STEP7_Catalog_Freeze_Design.md` **v0.15**
  - ✔ Decisions Locked: **NS-U1-001 Option (C)** · **CL-001** · **CV-001**
  - ✔ Gate + Declaration procedure defined · Freeze Candidate **Not Declared**
  - ✔ Catalog/Register JSON **not created** · `catalogPinId` **not issued**
  - ✔ Next: **P3** · **`S7-P3-IU-3-01A`** (superseded — P3 now Complete)
- **SPS STEP7 P3 Gap Analysis Complete (2026-07-19)**:
  - ✔ Sessions `S7-P3-IU-3-01A` … `S7-P3-IU-3-06A` PASS
  - ✔ D-GAP-A Complete · D-GAP-R Schema Rev.1 · D-GAP-R Complete Draft (13 rows)
  - ✔ **VG-P3 PASS** · High undocumented = 0
  - ✔ Decisions: **`DGR-NNN`** · `resolutionClass` taxonomy only · Candidate Severity · Severity Lock Deferred · Resolution Design → P4+
  - ✔ Next: **P4** · **`S7-P4-IU-4-01A`** (superseded — P4 now Complete)
- **SPS STEP7 P4 Standardization Plan Complete (2026-07-20)**:
  - ✔ Sessions `S7-P4-IU-4-01A` … `S7-P4-IU-4-08A` PASS
  - ✔ Official docs: `STEP7_P4_IU-4-0*.md` (Scope · Principles · Mapping · Taxonomy · Workflow · IU Planning · Gate · Review)
  - ✔ **VG-P4 PASS** · P4 Freeze Candidate **Recommended** (Planning rules)
  - ✔ Ops: `OPS_AI_MODEL_GUIDE.md` v0.1 created
  - ✔ Next: **P5** · **WG-AI-001 PASS** · **`STEP7_P5_IU-5-04A` Ready**
- **SPS STEP7 P5 Change Design Complete (2026-07-21)**:
  - ✔ IU-5-01A…05A PASS · WG-AI-001 PASS · Architecture Workflow PASS
  - ✔ Working Guideline → IU Consume 패턴 최초 적용
  - ✔ Design-only · Apply / Verification / Runtime / System JSON 변경 없음
  - ✔ Next: **P6** · **`STEP7_P6_IU-6-01A` Ready**
- **SPS STEP7 P6 Apply Decision Complete (2026-07-21 · Design-only)**:
  - ✔ IU-6-01A (Apply Decision Scope) · IU-6-02A (Apply Candidate) · IU-6-03A (Decision Criteria)
  - ✔ IU-6-04A (Apply Readiness Review) · IU-6-05A (Apply Decision Outcome) · IU-6-06A (Verification Entry)
  - ✔ Workflow: Scope → Candidate → Criteria → Readiness → Outcome → Verification Entry
  - ✔ WG-AI-001 · P5 IU-5-01A…05A Consume Only · Rule 재정의 없음
  - ✔ Design-only · Apply / Verification / Runtime / System JSON / WG / P5 변경 없음
  - ✔ Next: **P6 Fleet** · **`STEP7_P6_FLEET_BATCH1_01A`**
- AI 오버레이 리팩토링 (SYS+STR SSOT, 레슨 분리)
- 원 포인트 레슨 ADMIN/USER 표시 분리
- USER AI 패널 가독성·크기·공간 최적화
- **USER UX 단순화** — USER 레슨 버튼 제거, AI/두께·타점/계산 중심 실전 공략 구조 확정
- **USER 계산 Overlay** — Common Shell + Toolbar + DisplayModel Viewer (`buildSysCalcDisplayModel`) · `동선`→`계산`
- **USER 쿠션 포인트** — Calculation Toolbar 토글 · 레일/프레임 축 눈금 표시
- **USER Projection Rule** — ADMIN DisplayModel → USER read-only Viewer
- **Search/Reset UX** — Search 성공 시 Reset 전환, Reset은 공 위치만 유지하고 검색 결과/공략/오버레이/타겟 상태 초기화
- USER **시스템 레슨** P0 구현 이력 보존 (`ffe0a26`: ViewModel·Panel) — 현재는 USER UX 단순화 정책에 따라 메뉴 비노출
- **SYSTEM_LESSON 모바일 UI 최적화 이력 보존** — 현재 활성 메뉴는 아니며 향후 학습 모드 재사용 후보
- **SYSTEM_LESSON Table Layout 확정 이력 보존** — 표 기반·2섹션·4쿠션 3칸
- **SYSTEM_LESSON Overlay UX 이력 보존** — 단일 오버레이·내부 스크롤·AI/CTA/스택 없음
- Slot runtime / Recall canonical (2026-05 PHASE 2)
- Modal draggable + viewport clamp
- Hermite 궤적 baseline, anchors SSOT·canonical persist (2026-05)
- **Dataset Architecture Phase 1** — Dataset Export, `dataset/{공략}/{시스템}/positions.json`, envelope `schemaVersion: 2`
- **Dataset Architecture Phase 2** — Published Dataset Loader, ADMIN Search (published) → published corpus, published leaf URL fallback (`publishedLeafResolve`)
- **Dataset Architecture Phase 3** — USER Search → published, Search/Recall 토글 제거, carry-over 제거
- **Dataset Architecture Phase 3-1** — Recall profile 분리 (`userStrict` / `adminSearch` / `adminStrict`)
- **OPEN-04 Caption Placement Engine** — Geometry 기반 엔진 전면 재설계 (A→B→Gap 순위, safetyMargin 2grid 고정, CO 코너 앵커 이중 bucket, `alignC4SideCaptionsToCo` 제거) — 전 트랙 검증 완료
- **USER Overlay Scale Framework (B-1)** — `--overlay-scale` / `--ai-scale` / `--overlay-svg-scale` · tablet 0.72 · phone landscape 0.44 (`index.css`)
- **USER HP/T read-only 오버레이** — 모바일 스케일·반투명 패널·SVG 축소 · `UserHptPanel`
- **USER System Value Labels** — phone landscape 1.5× · 터치 persistent selection · `App.jsx` hooks 순서 수정
- **USER 동선분석 Overlay** — 투명 패널 · 가독성(26px·shadow) · `[공식]`/`[계산]` 섹션 · 기준/보정 계산값 제목 제거
- **Trajectory Display Cap** — same-rail 연속 segment 차단 · **5&Half baseline DISPLAY ceiling = corrected Cn** (v1.5) · `trajectoryPathDisplayPolicy.ts`
- **ADMIN Target Ball native dblclick Regression 해결 (2026-07-30)** — Pointer Capture를 pointerdown→실제 Drag 시작 시점으로 이동 · Drag/DoubleClick 충돌 제거 · Playwright trusted event 검증 · Regression 없음 · Interaction SSOT 고정 (`2_FRONTEND_ARCHITECTURE_BASELINE_v1.md` §Pointer Capture Timing)
- **Runtime Contract SSOT 완성 (2026-08-01)** — `buildSlotDraftWithUpdatedSys()` legacy `profile` dangling reference 제거 · SYS Apply 백지화(`ReferenceError` → React root unmount) 해결 · Contract에서 해석된 `formulaExpr` 재사용 · Build/Lint PASS · Regression 없음 (`abeca84`)
- **ADMIN Overlay Native Selection 처리 (2026-08-01)** — ModalShell `open` 전환 시 1회 native Selection 초기화 · 새로고침 후 첫 SYS Overlay 파란 highlight 해결 · Pointer Capture / preventDefault / user-select CSS 비변경 · Overlay SSOT 고정 (`2_FRONTEND_ARCHITECTURE_BASELINE_v1.md` §Overlay Native Selection) (`7ef9601`)
- **Trajectory Extension (2026-08-03~04) — Task Closed** — 독립 Overlay · Role SSOT · Target Lock + DoubleClick Projection · SAVE/`StrategyEntry.trajectoryExtensions` · Hydrate whitelist · ADMIN/USER 적색 stroke · **`activateStrategySlot()`** 로 USER Search ↔ Strategy Pick Runtime 경로 통합 · Search 전용 Hydrate 없음 · SAVE → Export → Published → Search/Recall → Render 파이프라인 완료 · SSOT `TRAJECTORY_EXTENSION_SSOT.md` v1.4
- **USER Overlay Centering SSOT (2026-08-12) — COMPLETE** — Root Cause B+C (stale panel dimensions + content reflow) · Panel ResizeObserver · table-area center invariant · Open/Switch/Zoom reset · Drag temporary offset 유지 · 브라우저 검증 · build PASS · **Commit/Push 대기** · `UserOverlayShell.jsx` · `OVERLAY_LAYOUT_SSOT_v1.2.md` §8
- **Ball Fine Position Controller (2026-08-12) — COMPLETE** — Joystick + Fine Controller temporary Ball Position Controller · Tap 0.1 · Hold 1.0s · 0.2/150ms · 3 Rg gap · CENTER dead zone · fontSize 22 · Fine-scoped WebKit selection/callout suppression · Desktop / Mobile Production / Admin/User **PASS** · Search/RI/Calculator/Trajectory **미변경** · production `1eaf76c` · `App.jsx` · `joystickInteractionPolicy.ts`
- **ADMIN Workspace History Overlay UX (2026-08-28) — COMPLETE** — 상단 [전체선택]/[로컬데이터]/[Unexported] 컨트롤 구조 개편 · 탭 전환 시 Selection/Shift reset · 양쪽 뷰 Checkbox 및 Shift 범위 선택 · Row click(onLoad 복원) vs Checkbox(선택) 완전 분리 · 단일 Delete (n) 파이프라인 (window.confirm 확인 후 일괄 삭제) · Export 워크플로 유지 · Checkbox 24x24 & Hit-Area 36x36 확대 · Row 세로 padding 7px(높이 ~44px) 고밀도화(화면당 노출 2배 증가) · Modal 세로 높이 ~1.5배 확장(height min(820px, 90vh), max-height min(860px, 92vh)) · List Body 독립 세로 스크롤 · `WorkspaceHistoryModal.jsx`, `workspaceHistory.ts`, `useSettings.js`, `index.css` · SSOT: `OVERLAY_LAYOUT_SSOT_v1.2.md` §14, `2_FRONTEND_ARCHITECTURE_BASELINE_v1.md`

### 진행 중

- 운영 검증 회귀 조사 — §Known Issues / Investigation (2026-06) · `HISTORY/PROJECT_LOG_2026-06.md` §16
- OPEN-05 ADMIN Recall / LocalDB Trajectory Rehydration — 조사 완료 · Known Issue 유지 · `HISTORY/PROJECT_LOG_2026-06.md` §17

### 예정

- **STEP7 Agent Implementation — P6 Complete** — P5 IU-5-01A…05A PASS · P6 IU-6-01A…06A Complete (Design-only) · WG-AI-001 PASS · Next Session **`STEP7_P6_FLEET_BATCH1_01A`** (P6 Fleet Batch 1) · Prerequisite P6 IU suite Complete · Verification Entry Complete
- **STEP7 remaining Phases** — Pilot → Fleet → Re-validation → Freeze (WBS) · P2 Catalog · P3 Gap · **P4 Plan done**
- **Catalog Freeze delivery (post-Design)** — on-disk Catalog/Register JSON · live Freeze Candidate declaration · `catalogPinId` mint (procedure in Design §14)
- **P4 residuals** — Mapping/Taxonomy value population · Change Design after Gate Package PASS
- **Overlay Scale Layer 통합 (Phase 2, 보류)** — `--ai-scale` → `--overlay-scale` 통일 · MQ 블록 4→1 축소 (기능 영향 없음, 유지보수용)
- **Dataset Architecture Phase 4** — Spatial Index (`spatialCells`, 8×4 grid)
- **trajectory 기반 파생 데이터 생성** — 별도 세션 이관 예정
- 시스템 레슨: sunrise/sunset 등 **비 5½** 시스템 확장
- 학습 흐름 확장: AI → 원 포인트 레슨 → 시스템 레슨 → 실전 공략 (내비만, 스택 없음)

---

## Known Issues / Investigation (2026-06)

**기록일:** 2026-06-13 (OPEN-05 갱신: 2026-06-18 · OPEN-04 종료: 2026-06-20 · OPEN-03 종료: 2026-06-22)
**상세 조사:** `HISTORY/PROJECT_LOG_2026-06.md` §16 · §17 (OPEN-05) · §18 (OPEN-04) · §19 (USER Overlay)

### OPEN-01 USER Search 임팩트 방향 불일치

**상태:** 조사 중

**증상:**

- ADMIN **Search (published)**과 USER Search가 동일 record를 사용해도 임팩트 방향이 다르게 표시되는 사례 존재

**현재 가설:**

- `targetColor`(UI) · `draft.targetBall` · `record.targetBall` 동기화 시점 차이
- (갱신 2026-08-04) USER Search도 `activateStrategySlot`로 Runtime hydrate 수행 — “Search = draft only”는 더 이상 정확하지 않음. 잔여 불일치는 targetBall 동기화 쪽 우선 조사

**우선순위:** P0

### OPEN-02 신규 Export 데이터 Search 실패

**상태:** **해결** (2026-08-28) — ADMIN/USER Published Search canonical shotType leaf resolving 연결 + USER candidate published leaf multi-resolution + History Export 성공 후 published cache invalidation

**원인 및 해결 (2026-08-28):**
1. **ADMIN Published Search leaf resolution:** `adminSearchFlow.ts`가 `adminState.sys`의 canonical `shotType`/`systemId`를 읽지 않고 `userPublishedSearchContext`만 읽어 `"뒤돌리기"`로 기본 fallback하던 결함 수정 (`resolvePublishedLeafHints` 연동).
2. **USER Published Search runtime leaf resolution:** USER 초기 진입 시 `shotType` context가 `null`일 때 임의의 단일 fallback(`"뒤돌리기"`)으로 404가 발생하던 결함 수정 (`resolveCandidatePublishedLeaves`로 `shot_types.json` canonical active shot types 대상 candidate leaf multi-resolution 수행, 매칭 시 context 확정).
3. **Export Cache Invalidation:** `useSettings.js` `handleExportSnapshots` 성공 후 `refreshPublishedDataset(shotType, systemId)` 호출로 in-memory leafCache 갱신 보장.
4. **운영 분리 명문화:** History Export는 클라이언트 로컬 디스크 기록이며, Production Search(`www.3cushionai.com`) 반영을 위해서는 Git Commit/Push 및 Vercel 배포 파이프라인 수행 필수.
5. **보존:** Search matcher, 2Rg threshold, Ball3 Role SSOT, dataset records 일체 변경 없음.

**우선순위:** ~~P0~~ CLOSED

### OPEN-03 USER HP/T 버튼 소실

**상태:** **해결** (2026-06-22) — USER 좌측 **두께/타점** 메뉴·read-only `UserHptPanel` 복구

**이력:**

- 시스템레슨 메뉴 분리 시 USER HP/T **의도적 제거** (`ffe0a26`, §12)
- 운영 검증(§16)에서 버튼 소실 OPEN 등록
- 2026-06-22: `Stage.jsx` `HP/T` · `overlayContent === "HP/T"` · `.modal-panel--user-hpt` 스케일·UI 복구

**우선순위:** ~~P1~~ CLOSED

### OPEN-05 — ADMIN Recall / LocalDB Trajectory Rehydration Investigation

**상태:** 조사 완료 · Known Issue 유지

**배경:**

- Dataset Architecture 이후 운영 테스트 중 발견
- 새로고침 직후 LocalDB 클릭 시 과거 SYS/C1/C3/Trajectory가 표시되는 사례 확인
- Search 클릭 시 다른 trajectory가 표시되는 사례 확인

**조사 결과:**

1. **recommendedFrom fallback 경로는 제거됨** (OPEN-05A)
   - 과거 no-match fallback이 원인은 아님
   - `slot_draft_fallback` 관련 경로는 현재 원인 아님

2. **applied slot 오염 가설 기각** (OPEN-05B)
   - `applyPositionRecall()`은 applied를 쓰지 않음
   - recall 결과는 `slot.draft`에 기록
   - 새로고침 직후 applied는 null 상태
   - `resolveSlotSysForRender()`는 draft 우선 사용

3. **실제 재생성 경로 확인**
   - spatial match 성공 → `slot.draft` hydrate → `syncSlotRuntimeAdminAndTrajectory()` → trajectory 재생성

4. **OPEN-05C 안정화 작업**
   - 수행: mismatch gate 추가 · recall display draft 제거 강화 · clear 직후 trajectory reset 강화 · helper crash 수정 · `flushSync` 적용
   - 결과: no-match 시 alert 동작 · 백지화 오류 제거 · 일부 recall 경로 정리
   - **완전 해결 아님** — 아래 현상 잔존

**아직 확인되는 현상:**

- 새로고침 직후 LocalDB 클릭
- 특정 spatial match 상황

에서 과거 SYS/C1/C3/Trajectory가 표시되는 사례 존재

**현재 판단:**

- trajectory engine 오류로 확정되지 않음

**우선순위:** Known Issue (Low Priority)

**사유:**

- target 선택 시 정상
- SYS 입력 시 정상
- 일반 사용자 흐름 영향 낮음

**향후 조사 후보:**

- spatial match 자체
- hydrate chain
- `syncSlotRuntimeAdminAndTrajectory`
- trajectory label source
- localStorage corpus contamination
- render memo cache

**상세:** `HISTORY/PROJECT_LOG_2026-06.md` §17

---

## 다음 작업 우선순위

> **Architecture 상태:** AAS v2.0 **완료**. Batch 1~6 **Final Freeze**. STEP4/5 **Final Freeze**. **STEP6 Final Freeze v1.0**. **STEP7** P2–P6 **Complete**. **STEP8 Fleet Apply Completed**. **STEP9 Certification Platform v1.0 FROZEN**. **Envelope Architecture Freeze** — Search Engine Architecture **Complete (2026-08-06)** · Freeze 문서 비수정.
>
> **Search Engine (2026-08-06):** **Architecture Complete** — Phase 1 Foundation ✅ · Phase 2 Dataset Generator ✅ · Phase 3 Enhancement ✅ (E2E/Regression/Benchmark · Full Test 248 PASS).
>
> **Phase 4 Foundation (2026-08-06):** ✅ **COMPLETED**.
>
> **Mission 01 Export Pipeline:** ✅ **COMPLETED**.
>
> **Mission 02 Published Package Builder:** ✅ **COMPLETED**.
>
> **Mission 03 Deployment Workflow:** ✅ **COMPLETED** (`product/deployment*` · prepare/report · Package immutable).
>
> **Mission 04 Authoring Integration:** ✅ **ABSORBED** — `SESSION_TRANSFER/ADR_MISSION_04_AUTHORING_INTEGRATION_ABSORBED.md` · `python -m product pipeline`.
>
> **Phase 4 Product Pipeline:** ✅ **COMPLETED**.
>
> **Phase 5 Preparation (2026-08-10):** ✅ **Cue-Only Edit Snap & Exact Position Replacement** (Authoring normalization · not Mission 01). Detail: LOG · GLOSSARY.
>
> **Phase 5 Mission 01 Real Interpolation:** ✅ **COMPLETE** (core engine).
>
> **Product Envelope Static Publisher (Task #4):** ✅ **COMPLETE** — `690d6fe`.
>
> **Phase 5 Search Quality Follow-on Task #5:** ✅ **COMPLETE** — Production RI E2E · `282c859` · Push done.
>
> **Phase 5 Mission 02 — Dead Code Cleanup:** ✅ **COMPLETE** — Cleanup #1–#4 · EXIT-AFTER-#4 · **COMPLETE WITH DEFERRED ITEMS** · baseline `8bf90b6`.
>
> **Next Track:** Family Normalization **Phase 3A-349** controlled flag enable **PASS** · next Ask = post-enable **final audit** before Commit/Push · flag default **true** · Full H3 **DEFERRED**.
>
> **Sample datasets:** 사용자 보고 3 set 완성 (뒤돌리기 · 옆돌리기 · 뒤돌리기 대회전 × 4 tracks). Auto-generation은 Family Phase 2–3.
>
> **병행 Carry:** **BUG-B 재현 확인 필요** · Display Boundary Continuation · STEP9 Pilot · Known Issues OPEN-01/02/05 · uncommitted working tree 보존 · Commit/Push 사용자 요청 시.
>
> **Runtime / Product 상태 (2026-08-22):** Family shadow schema **v2** (`sourceSlot`) · Exact-ball rematerialize · WRITE SSOT = `positions_dataset` · flag default **true** → gated normalized READ (else legacy).

### STEP7 상태

```text
STEP7 Scope
Approved
        ↓
STEP7 Work Breakdown
Approved
        ↓
STEP7 Implementation Decomposition
Approved
        ↓
P2 Catalog Design
COMPLETE (v0.15)
        ↓
P3 Gap Analysis
COMPLETE · VG-P3 PASS
        ↓
P4 Standardization Plan
COMPLETE · VG-P4 PASS
        ↓
P5 Change Design
COMPLETE · IU-5-01A…05A PASS · WG-AI-001 PASS
        ↓
P6 Apply Decision
COMPLETE · IU-6-01A…06A · Design-only
        ↓
Next Stage
STEP7 P6 Fleet · STEP7_P6_FLEET_BATCH1_01A
```

| Item | Status |
|------|--------|
| **STEP7 Scope** | **Approved** |
| **STEP7 Work Breakdown** | **Approved** |
| **STEP7 Implementation Decomposition** | **Approved** (`작업관리/STEP7_IMPLEMENTATION_DECOMPOSITION.md` v1.0) |
| **P2 Catalog** | **COMPLETE** (Design · `IU-2-01A` … `IU-2-08B`) |
| **Catalog Freeze Design** | **`STEP7_Catalog_Freeze_Design.md` v0.15** |
| **P3 Gap Analysis** | **COMPLETE** (`IU-3-01A` … `IU-3-06A`) |
| **VG-P3** | **PASS** |
| **D-GAP-A** | **Complete** (Draft) |
| **D-GAP-R Schema** | **Rev.1** (`DGR-NNN`) |
| **D-GAP-R** | **Complete Draft** (13 rows) |
| **P4 Standardization Plan** | **COMPLETE** (`IU-4-01A` … `IU-4-08A`) |
| **VG-P4** | **PASS** |
| **P4 Freeze Candidate** | **Recommended** (Planning rules) |
| **P5 Change Design** | **COMPLETE** (`IU-5-01A` … `IU-5-05A` PASS) |
| **P6 Apply Decision** | **COMPLETE** (`IU-6-01A` … `IU-6-06A` · Design-only) |
| **P6 Verification Entry** | **Complete** (IU-6-06A · P7 Handoff Package) |
| **WG-AI-001** | **PASS** · Consume · Freeze Candidate |
| **Severity** | **Candidate only** · Lock **Deferred** |
| **NS-U1-001** | **Locked** — Option (C) Dual catalogs |
| **CL-001** | **Locked** |
| **CV-001** | **Locked** |
| **Freeze Candidate (Catalog)** | **Not Declared** |
| **Catalog / Register JSON** | **Not created** |
| **catalogPinId** | **Not issued** |
| **Current Stage** | **STEP9 Certification Platform v1.0 FROZEN** · Platform SSOT P-01…P-05 · FC-01…FC-08 |
| **Prerequisite** | **Frozen Certification Platform v1.0** + Fleet Validation Standard baseline · Ch.8–Ch.11 Ratified · Ops Workflow v1.0 |
| **Next Session** | **STEP9 Phase 4 Pilot Certification** (Platform 검증 목적) |
| **Current Queue** | **STEP9 Phase 4 Pilot** |
| **Ops AI Guide** | **`OPS_AI_MODEL_GUIDE.md` v0.1** |

### STEP9 상태 (Certification Platform — Frozen)

| Item | Status |
|------|--------|
| **Phase 0 Architecture Review** | **PASS / Completed** |
| **Phase 1 Platform Definition** | **PASS / Completed** |
| **Phase 2 Freeze Review** | **PASS / Completed** |
| **Phase 2.5 Gate Closure** | **PASS / Completed** |
| **Phase 3-A Persist** | **Completed** — P-01…P-04 on-disk |
| **Phase 3-B Freeze Declaration** | **PASS · FROZEN** — P-05 |
| **Certification Platform** | **v1.0 · Official STEP9 SSOT · Frozen** |
| **Frozen Scope** | **FC-01…FC-08** |
| **Change policy** | **Amendment only** (Level 1 Editorial · Level 2 Clarification · Level 3 Contract/Workflow · Level 4 Principle) |
| **System Certification** | **Not started** |
| **Production Ready** | **Not declared** |
| **Next** | **STEP9 Phase 4 Pilot Certification** — Frozen Platform 검증 |

> Platform does not certify. Actors(User/Agent)가 Frozen Platform 기준을 적용한다. 특정 System 때문에 Platform을 변경하지 않는다.

### STEP8 상태 (Fleet Apply — Completed)

```text
STEP8 Fleet Apply Plan (Execution)
        ↓
B0  Compatibility Alias        PASS   (82cb371, atomic w/ B1)
B1  Identity Rename            PASS   (Plus_5_system → plus_5_system)
B2  Schema Normalize           PASS   (a32bed9)
B2.5 File-format Normalize     PASS   (0tip_plus JSONC · double_rail Python → JSON)
B3  Metadata Normalize         HALTED (Hold · Safe Stop · Ch.7 Not Persisted)
B4  Anchor Apply               PASS   (Schema Normalize · 35half · rodriguez · reverse_end_system)
B5  Logic Apply                PASS   (Structure-only · Apply 6 · clay_shooting Defer)
B6  Runtime                    PASS   (double_rail Loader exclusion only · L6-VR PASS · 0tip_plus Defer)
B7  Presentation               PASS   (Empty Apply 0 · L7-VR PASS · L7-D-001 Explicit Defer)
B8  Validation                 PASS   (Empty Apply 0 · Mode A · B8-VR PASS · XC PASS · Fleet Closure)
        ↓
Final Validation Gate v1.0     ACCEPTED
STEP8 Fleet Apply              COMPLETED
```

| Item | Status |
|------|--------|
| **Fleet Contract Book v1.0** | **Ratified (Conditional)** · Front Matter on-disk · **Ch.8·Ch.9·Ch.10·Ch.11 Ratified** · Remaining chapters **Not Persisted** |
| **Ch.8 L4 Anchor Contract** | **Ratified** · `Fleet_Contract_Book/FLEET_CONTRACT_BOOK_Ch08_L4_Anchor_Contract.md` |
| **Ch.9 L5 Logic Contract** | **Ratified** · `Fleet_Contract_Book/FLEET_CONTRACT_BOOK_Ch09_L5_Logic_Contract.md` |
| **Ch.10 L6 Runtime Contract** | **Ratified** · Minor Amendment Complete · `FLEET_CONTRACT_BOOK_Ch10_L6_Runtime_Contract.md` |
| **Ch.11 L7 Presentation Contract** | **Ratified** · v1.0 · L7-D-001 Explicit Defer · `FLEET_CONTRACT_BOOK_Ch11_L7_Presentation_Contract.md` |
| **B0 Compatibility Alias** | **PASS** (`82cb371`, atomic with B1) |
| **B1 Identity Rename** | **PASS** (`Plus_5_system` → `plus_5_system`) |
| **B2 Schema Normalize** | **PASS** (`a32bed9`) — 9× `logic.system` → `system_id` |
| **B2.5 File-format** | **PASS** — 0tip_plus JSONC / double_rail Python → strict JSON |
| **B3 Metadata Normalize** | **HALTED (Hold)** — Ch.7 Not Persisted · **NOT a failure** · 재시도 금지 |
| **B4 L4 Anchor Apply** | **PASS** — Target Freeze A3/B25/C6/D4 · Apply 3 systems · id 불변 · Build PASS |
| **B5 L5 Logic Apply** | **PASS / Completed** — Structure-only · Apply 6 · Meaning Preservation · Semantic Guard PASS · Validation PASS |
| **B6 L6 Runtime** | **PASS / Completed** — Amendment v1.1 · ADR Approve · Apply 1 (`double_rail` exclusion) · L6-VR PASS · Meaning Preservation · `0tip_plus` Defer |
| **B7 L7 Presentation** | **Completed / PASS** — Empty Apply (**0**) · L7-VR PASS · Code ADR Not Required · L7-D-001 Explicit Defer |
| **B8 Fleet Validation** | **Completed / PASS** — Empty Apply (**0**) · Mode A · B8-VR PASS · XC-01…XC-12 PASS · Code ADR Not Required |
| **Final Validation Gate** | **v1.0 · Final Acceptance** · `FLEET_CONTRACT_BOOK_STEP8_Final_Validation_Gate.md` |
| **STEP8 Fleet Apply** | **Completed** |
| **Next** | **STEP9 Entry** |
| **Operational Workflow** | **`DEVELOPMENT_WORKFLOW.md` v1.0** (General + Fleet Apply Workflow · Sole Ops SSOT) |
| **Commit** | B0+B1 `82cb371` · B2+B2.5 `a32bed9` · B4/B5/B6 prior · B7 `9befe68` · **B8 Closure `dde06d2`** (docs · no B8 code) |

### STEP6 상태 (Consume)

| Item | Status |
|------|--------|
| **Framework** | **Freeze Candidate (Locked)** |
| **Pipeline** | **Freeze Candidate (Locked)** |
| **STEP6-3…STEP6-10** | **Complete** |
| **STEP6-11 Final Freeze** | **Declared v1.0** |
| **Architecture** | **Locked** |

Framework / Pipeline / STEP6 Freeze surfaces 비공식 수정 **금지**. STEP7은 STEP6 **Consume**.

### Product — Trajectory Extension (**Completed / Task Closed**)

**상태:** **Completed** (2026-08-04) · SSOT `TRAJECTORY_EXTENSION_SSOT.md` **v1.4**

계산 엔진(C1~C6) 비수정 · 독립 Overlay · Role SSOT · SAVE/`trajectoryExtensions` · Hydrate · Render 완료.

| 항목 | 상태 |
|------|------|
| Extension Runtime 통합 | **완료** |
| USER Search Runtime 활성화 (`activateStrategySlot`) | **완료** |
| ADMIN / USER Runtime 경로 통합 (Search ↔ Strategy Pick 공유) | **완료** |
| Search 전용 Hydrate | **없음** (기존 `hydrateSlotRuntime` 재사용) |
| SAVE → Hydrate → Render 파이프라인 | **완료** |

상세: `HISTORY/PROJECT_LOG_2026-08.md` (2026-08-03~04) · `CURSOR_SESSION_HANDOFF.md`.

### 최우선 (Phase 5 Search Quality) — Next Track

- **Phase 4 Product Pipeline** — ✅ **COMPLETED** (Mission 01–03 · Mission 04 ABSORBED)
- **Phase 5 Preparation** — ✅ **Cue-Only Edit Snap & Exact Position Replacement** (Authoring · cite LOG / GLOSSARY)
- **Phase 5 Mission 01 — Real Interpolation** — ✅ **COMPLETE** (core engine)
- **Product Envelope Static Publisher (Task #4)** — ✅ **COMPLETE** (`690d6fe`)
- **Phase 5 Search Quality Follow-on · Task #5** — ✅ **COMPLETE** (`282c859` · Production RI E2E · Push done)
- **Phase 5 Mission 02 — Dead Code Cleanup** — ✅ **COMPLETE** (`8bf90b6` · EXIT-AFTER-#4 · **COMPLETE WITH DEFERRED ITEMS**)
- **Ball Fine Position Controller** — ✅ **COMPLETE** (`1eaf76c` · Desktop / Mobile Production / Admin/User PASS)
- **Sample datasets (user)** — ✅ 3 set 완성 보고 · Export≠History
- **BUG-A display-cap corner** — ✅ **IMPLEMENTED** (uncommitted) · `resolveNearestRail`
- **BUG-B Reset/History stale** — **UNCONFIRMED** · BUG-A 수정 후 동일 UI stale 현상 재현 시에만 별도 조사
- **Family Data Architecture** — **CONFIRMED DESIGN** · **NEXT = Phase 1 Ask** · `FAMILY_DATA_ARCHITECTURE_DRAFT.md`
- Official Search Enhancement Pipeline: `GLOSSARY_SSOT` §5.3
- Terminology: `작업관리/GLOSSARY_SSOT.md` · Session ops: `CURSOR_SESSION_HANDOFF.md`
- Architecture SSOT: `Architecture/` (**Freeze 유지 · 내용 수정 금지**)
- Deferred cleanup (N3–N15): optional / deferred / design / KEEP — **not** auto-resumed as Mission 02

### 최우선 (Phase 4 Product Pipeline) — Complete

- **Mission 01 — Export Pipeline** — ✅ COMPLETED
- **Mission 02 — Published Package Builder** — ✅ COMPLETED
- **Mission 03 — Deployment Workflow** — ✅ COMPLETED
- **Mission 04 — Authoring Integration** — ✅ ABSORBED (`ADR_MISSION_04_AUTHORING_INTEGRATION_ABSORBED.md`)
- Code: `product/` (Export · Package · Deploy · `pipeline` CLI)
- Mission roadmap: `SESSION_TRANSFER/Product Phase Handoff.md`
- Official Pipeline: `GLOSSARY_SSOT` §5.2

### 최우선 (Search Engine) — Architecture Complete (Closed)

- **Phase 1–3** — ✅ Complete · Full Test 248 PASS
- Search Quality (Real Interpolation 등)는 **Phase 5** — Product Pipeline 이후
- 품질 보고서: `search/quality/SEARCH_QUALITY_REPORT.md`

### 최우선 (Product Carry) — 병행 가능 잔여

- **Display Boundary Policy** — SSOT **v1.5** · **5&Half Baseline Display Ceiling** · BUG-A same-rail identity **Implemented** · Reading Mode · C2 Handle · Next: Continuation / CASE A · Corrected Cap Minimum · Boundary · **BUG-B UNCONFIRMED**
- **Handle First Drag 잔여 간섭** (명시적 후속 · Extension Handle vs Ball/Joystick) — 또는 신규 Product 세션
- 인계: `DISPLAY_BOUNDARY_POLICY_SSOT.md`

### 최우선 (Platform) — STEP9 Phase 4 Pilot Entry (Frozen Platform Consume)

- Session Entry: `CURSOR_SESSION_HANDOFF.md` (**Platform Frozen** · Next **STEP9 Phase 4 Pilot**)
- **Certification Platform baseline:** `Certification_Platform/STEP9_Platform_Freeze.md` v1.0 + P-01…P-04 · **FROZEN**
- **Current baseline (Fleet Validation Standard):** `FLEET_CONTRACT_BOOK_STEP8_Final_Validation_Gate.md` v1.0 + Ch.8–Ch.11 + B4–B8 Freeze/ADR + Ops Workflow v1.0
- **STEP8:** **Completed** · B8 Validation **PASS** · Fleet Closure **Confirmed** · Final Gate **Accepted**
- **Carry (non-blocking):** B3 Hold · L7-D-001 · Catalog Freeze Candidate · Ch.12–14 · KI backlog
- Ops: `DEVELOPMENT_WORKFLOW.md` **v1.0** · `OPS_AI_MODEL_GUIDE.md` v0.1
- **금지:** Frozen Platform informal edit · System-driven Platform change · B3 재시도 · Ch.8–Ch.11 informal edit · Runtime / JSON silent mutation

### SPS STEP6 Document Suite

| STEP | Document | Status |
|------|----------|--------|
| STEP6-1 | `STEP6_Schema_Validation_Framework.md` | Freeze Candidate (Locked) |
| STEP6-2 | `STEP6_Validation_Pipeline.md` | Freeze Candidate (Locked) |
| STEP6-3 | `STEP6-3_Schema_Rule_Analysis.md` | **Complete (v1.1)** |
| STEP6-4 | `STEP6-4_Rule_Catalog_Design.md` | **Complete (v0.2)** |
| STEP6-5 | `STEP6-5_Validation_Register_Suite.md` | **Complete (v0.2)** |
| STEP6-6 | `STEP6-6_Validation_Engine_Design.md` | **Complete (v0.2)** |
| STEP6-7…9 | `frontend/src/validation/engine/` | **Complete** |
| STEP6-10 | `STEP6-10_Validation_Report.md` | **Complete (v1.0)** |
| STEP6-11 | `STEP6_FINAL_FREEZE.md` | **Final Freeze v1.0** |

Path prefix: `System Platform Standard (SPS) v1.0/` (Engine: `frontend/src/validation/engine/`)

### SPS STEP5 Document Suite (Frozen)

| STEP | Document | Status |
|------|----------|--------|
| STEP5-1 | `STEP5_Architecture_Audit_Framework.md` | Frozen |
| STEP5-2 | `STEP5_Audit_Plan.md` | Frozen |
| STEP5-3 | `STEP5_Audit_Rule_Catalog.md` | Frozen |
| STEP5-4 | `STEP5_Observation_Mapping_Register.md` | Frozen |
| STEP5-4 | `STEP5_Evidence_Register.md` | Frozen |
| STEP5-5 | `STEP5_Finding_Register.md` | Frozen |
| STEP5-5 | `STEP5_Violation_Register.md` | Frozen |
| STEP5-5 | `STEP5_Recommendation_Register.md` | Frozen |
| STEP5-5 | `STEP5_Architecture_Decision_Register.md` | Frozen |
| STEP5-6 | `STEP5_Architecture_Audit_Report.md` | Frozen |
| STEP5-6 | `STEP5_STEP6_Handoff.md` | Frozen |
| Closure | `STEP5_FINAL_FREEZE.md` | Frozen |

Path prefix: `System Platform Standard (SPS) v1.0/`

### P0 — 운영 검증 회귀 (OPEN-01 · OPEN-02)

- USER Search 임팩트 방향: `targetColor` ↔ `draft.targetBall` ↔ `record.targetBall` 동기화 흐름
- 신규 Export 후 Search 실패: Published Loader · recall profile · cache

### P0 — Search Engine Enhancement Phase

- _(Phase 3 Complete — Enhancement P0 closed)_

### P0 — Next Track

- **Current (2026-09-27):** see **Current Session Handoff (2026-09-27)** at the top — one open issue at a time, user decides. Items below are historical.
- **Ball Fine Position Controller** — ✅ **COMPLETE** (`1eaf76c` · Desktop / Mobile Production / Admin/User PASS)
- **Family Data Architecture Phase 1** — **NEXT** · **Ask** · `FAMILY_DATA_ARCHITECTURE_DRAFT.md`
- Phase 5 Mission 02 Dead Code Cleanup: ✅ COMPLETE (`8bf90b6` · EXIT-AFTER-#4 · COMPLETE WITH DEFERRED ITEMS)
- Phase 5 Search Quality Follow-on Task #5: ✅ COMPLETE (`282c859`)
- Phase 5 Mission 01 Real Interpolation: ✅ COMPLETE
- Phase 5 Preparation (Cue-Only Edit Snap): ✅ COMPLETED
- Phase 4 Product Pipeline: ✅ COMPLETED
- 병행: Product Carry (Display Boundary · STEP9 · Known Issues) · System Authoring 준비

### P1 — SYS SSOT 정리

- `targetColor` · `draft.targetBall` · `record.targetBall` · render SYS 우선순위 정합

### P1 — Dataset Architecture Phase 4

- Spatial Index (`spatialCells`, Recall 1차 필터)

### P2 — 시스템 레슨 확장

- `full_input` 및 기타 `systemId` 교육 블록
- SYS Overlay 교육 라인 로직 domain 공통 추출 (ADMIN·USER 중복 제거)

### P3 — 학습 내비

- 학습 흐름: AI → 원 포인트 레슨 → 시스템 레슨 → 실전 공략 (내비만)

### 보류 — OPEN-05 재조사

- 추가 추적 보류 · 우선순위 Low
- 필요 시 §17·본 절 Known Issues 참고 후 재개

---

## 참고 문서

| 문서 | 용도 |
|------|------|
| `docs/APPLICATION_FLOW.md` | **Runtime Orchestration Architecture Guide** — AAS Architecture 구현 전 First Consume |
| `작업관리/GLOSSARY_SSOT.md` | **Terminology Constitution** — Official Terminology · Official Pipeline |
| `Architecture/` | **Structure Constitution** — Envelope Architecture Freeze (내용 수정 금지) |
| `작업관리/CURSOR_SESSION_HANDOFF.md` | **Session Operations** — Official Read Order · Startup Rules · Current / Next / Carry |
| `SESSION_TRANSFER/Product Phase Handoff.md` | Phase 4 Product Pipeline Mission roadmap |
| `작업관리/FAMILY_DATA_ARCHITECTURE_DRAFT.md` | **Family Data Architecture** — CONFIRMED DESIGN · CURRENT vs TARGET · Derived Data **3A-359 COMPLETE** · production WRITE SSOT still `positions_dataset` · gated READ default ON |
| `작업관리/DISPLAY_BOUNDARY_POLICY_SSOT.md` | **Display Boundary Policy SSOT v1.5** — 5&Half Baseline Display Ceiling · same-rail nearest-rail identity (BUG-A) · Reading Mode · C2 Handle |
| `작업관리/SIGNED_CORRECTION_AUTHORING_SSOT.md` | **Signed Correction Authoring SSOT** — authored ± · CO/C3 domains · slide/draw mutex · CO label · legacy · curve KEEP · manual PASS 2026-09-15 |
| `작업관리/TRAJECTORY_EXTENSION_SSOT.md` | Trajectory Extension SSOT **v1.4** · Runtime Activation · USER Search flow |
| `System Platform Standard (SPS) v1.0/Fleet_Contract_Book/` | **Fleet Contract Book** — Ch.8·Ch.9·Ch.10·**Ch.11 Ratified** · B0–**B8 PASS** · **Final Validation Gate v1.0** |
| `작업관리/WG-AI-001_Architecture_Impact_Working_Guideline.md` | **Architecture Impact Working Guideline** — PASS · Consume · Freeze Candidate |
| `System Platform Standard (SPS) v1.0/STEP7_P6_IU-6-0*.md` | **STEP7 P6 Apply Decision suite** — IU-6-01A…06A Complete · Design-only |
| `System Platform Standard (SPS) v1.0/STEP7_P5_IU-5-0*.md` | **STEP7 P5 Change Design suite** — IU-5-01A…05A PASS |
| `작업관리/OPS_AI_MODEL_GUIDE.md` | **Ops AI Model Recommendation Guide v0.1** |
| `작업관리/STEP7_IMPLEMENTATION_DECOMPOSITION.md` | **STEP7 Session Execution SSOT v1.0 Approved** |
| `System Platform Standard (SPS) v1.0/STEP7_P4_IU-4-0*.md` | **P4 Standardization Plan suite** (Complete · Official · VG-P4 PASS) |
| `System Platform Standard (SPS) v1.0/STEP7_Catalog_Freeze_Design.md` | **P2 Catalog Freeze Design v0.15** |
| `작업관리/DEVELOPMENT_WORKFLOW.md` | **Operational Workflow SSOT v1.0** (General + Fleet Apply Workflow) |
| `System Platform Standard (SPS) v1.0/STEP6_FINAL_FREEZE.md` | **STEP6 Final Freeze v1.0** |
| `System Platform Standard (SPS) v1.0/STEP6-10_Validation_Report.md` | **STEP6-10 Validation Report v1.0** |
| `System Platform Standard (SPS) v1.0/STEP6-6_Validation_Engine_Design.md` | **STEP6-6 Engine Design Complete (v0.2)** |
| `System Platform Standard (SPS) v1.0/STEP6-5_Validation_Register_Suite.md` | **STEP6-5 Register Suite Complete (v0.2)** |
| `System Platform Standard (SPS) v1.0/STEP6-4_Rule_Catalog_Design.md` | **STEP6-4 Catalog Design Complete (v0.2)** |
| `System Platform Standard (SPS) v1.0/STEP6-3_Schema_Rule_Analysis.md` | **STEP6-3 Analysis Complete (v1.1)** |
| `System Platform Standard (SPS) v1.0/STEP6_Schema_Validation_Framework.md` | **STEP6 Framework Freeze Candidate (Locked)** |
| `System Platform Standard (SPS) v1.0/STEP6_Validation_Pipeline.md` | **STEP6 Pipeline Freeze Candidate (Locked)** |
| `System Platform Standard (SPS) v1.0/STEP5_FINAL_FREEZE.md` | **STEP5 Final Freeze v1.0** — suite list · freeze policy |
| `System Platform Standard (SPS) v1.0/STEP5_STEP6_Handoff.md` | **STEP6 Handoff SSOT** — Manifest · Owner · Immutability |
| `System Platform Standard (SPS) v1.0/STEP5_Architecture_Audit_Framework.md` | **STEP5 Audit Framework (Frozen)** |
| `System Platform Standard (SPS) v1.0/System_Inventory.md` | **STEP4 Inventory SSOT (v1.0 Final)** — Frozen Assets · Observation SSOT · Metadata/Registration Inventory |
| `Application Architecture Standard (AAS) v2.0/App_Migration_Map.md` | **Application Runtime Constitution (Permanent SSOT)** — Migration Blueprint · Architecture Meta · ADR · Review Checklist |
| `SESSION_TRANSFER/SESSION_TRANSFER_2026-06_DATASET_ARCHITECTURE.md` | **Dataset Architecture** — 3계층·Export·Phase 계획·이관 SSOT |
| `HISTORY/PROJECT_LOG_2026-09.md` | **2026-09 월별 이력 (current)** · USER Display Runtime HPT Production deploy · Android 4-track 실기 검증 PASS |
| `HISTORY/PROJECT_LOG_2026-08.md` | 2026-08 월별 이력 · Search Engine Architecture Complete · Phase 4 Foundation · Display Boundary · Trajectory Extension |
| `HISTORY/PROJECT_LOG_2026-07.md` | 2026-07 AAS Batch · STEP4/5 Final · STEP6 Framework+Pipeline · STEP6-3/4/5 Complete · **2026-07-30 ADMIN Pointer Capture Timing / Target Ball dblclick Regression** |
| `HISTORY/PROJECT_LOG_2026-06.md` | 2026-06 AI · USER AI · 시스템 레슨 · Dataset Phase 1~3-1 (§14·§15) · **운영 검증 조사** (§16) · **OPEN-05 조사** (§17) · **USER Overlay** (§19) |
| `HISTORY/PROJECT_LOG_2026-05.md` | 2026-05 상세 작업 로그 |
| `HISTORY/PROJECT_LOG_2026-04.md` | 이전 월 |
| `HISTORY/HANDOFF_ADMIN_MODAL_TO_USER_DISPLAY_2026-05.md` | ADMIN→USER 표시 핸드오프 |
| `HISTORY/HANDOFF_USER_PHASE2_2026-05.md` | USER Phase 2 |
| `ARCHIVE/1_PROJECT_MASTER_INDEX.md` | 2026-03 헌법 스냅샷 (deprecated, 역사·계산 철학 참고) |
| `5_PROJECT_MASTER_STATE_CURRENT.md` | 코드 스냅샷·구조 변경 통제 |
| `3_SYSTEM_ARCHITECTURE.md` | 계산·데이터 계층 |
| `4_CALCULATION_RULES.md` | 수식·보정 규칙 |
| `2_FRONTEND_ARCHITECTURE_BASELINE_v1.md` | Frontend 구조·레이어 기준선 · **Pointer Capture Timing Interaction SSOT (2026-07-30)** · **Overlay Native Selection Interaction SSOT (2026-08-01)** |
| `OVERLAY_LAYOUT_SSOT_v1.2.md` | **USER Overlay Layout SSOT v1.2 (Confirmed)** — Shell/Content · Dark Glass · Ratio · Drag · **Centering SSOT** (Panel/Table RO · 2026-08-12) |
| `SESSION_TRANSFER/APP_USER_SEARCH_FLOW.md` | USER Search 흐름 |

---

## USER Overlay (요약)

> **Layout SSOT:** `OVERLAY_LAYOUT_SSOT_v1.2.md` (Confirmed · Centering SSOT 2026-08-12).
> **기준 UX:** AI Overlay — Glass Dark · table-area Ratio · Typography · Padding · Full Surface Drag · **table-area 기하 중심**/Clamp · Close(X) 없음 · 외부 터치 닫기 · 위치 저장 없음.
> **Centering:** `UserOverlayShell` SSOT · live panel dimensions · Panel + Table ResizeObserver · Drag = temporary dragOffset · Open/Switch/Zoom → `dragOffset=0` · 브라우저 검증 완료 · **Commit/Push 대기**.
> **Projection Rule:** USER = ADMIN DisplayModel 투영 Viewer.
> Progress = AI 완료 · HPT Shell 완료(Polish 보류) · Calculation Shell+Viewer 완료 · **Centering 검증 완료** · 기타 통합(HPT Polish 등) 예정.
> `--overlay-scale` / `--ai-scale` / `--overlay-svg-scale`는 bridge token이며, 장기 SSOT는 Ratio/Surface/Typography token이다.

```
좌측 AI → overlayContent = "AI" → UserAiPanel (Shell widthRatio 0.63)

좌측 두께/타점 → overlayContent = "HPT" → UserHptPanel (AI Shell 규격 0.42 · Polish: 공 크기 독립 보류)

좌측 계산 → overlayContent = "CALC" → UserCalcToolbar + UserCalculationPanel
         → buildSysCalcDisplayModel → baseline|corrected Viewer (Shell widthRatio 0.62)

쿠션 포인트 → SystemValueLabels on table rail (Toolbar 토글)

backdrop / outside tap → overlayContent = null (Close X 없음)

기준값(BASELINE) → 오버레이만 dismiss (레벨 유지)
```

### USER Overlay 기준 (AI)

- Glass Dark
- table-area 기준 Ratio
- Typography / Padding token
- Full Surface Drag
- **table-area 기하 중심** / Clamp (Centering SSOT)
- Close(X) 없음 · 외부 터치 닫기
- 위치 저장 없음

### HPT 상태 (임시 확정)

- AI Shell 규격 이전 (`widthRatio 0.42` · `maxHeightRatio 0.85` · `fitContent: false` · `medium`)
- 공/텍스트 Content가 Shell 스케일(`--uos-w`) 영향을 받아 함께 축소된 상태는 **임시 수용**
- **보류:** HPT Overlay SVG intrinsic bounds / viewBox crop 및 공 크기 독립 유지 (UX Polish)

---

## 갱신 규칙

- 월별 로그에만 적지 말고, **기능 완료 시 이 문서의 해당 절을 즉시 수정**.
- “완료 / 진행 / 예정”과 **코드 SSOT 맵**을 항상 일치시킨다.
- **폴더·계산 파이프라인 구조 변경** 시 `5_PROJECT_MASTER_STATE_CURRENT.md` 전면 재작성 후 본 문서 절 링크 점검.
