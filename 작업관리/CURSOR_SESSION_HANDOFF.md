# CURSOR_SESSION_HANDOFF.md

```
Document  : CURSOR_SESSION_HANDOFF.md
Type      : Cursor Session Handoff (Operational)
Authority : Operations
Date      : 2026-08-06
Scope     : Search Engine Architecture Complete
             (Phase 1 Foundation + Phase 2 Dataset Generator + Phase 3 Enhancement)
             · Phase 4 Foundation — GLOSSARY_SSOT adopt (Session ops)
Rule      : Fact only ·
             GLOSSARY_SSOT = Official Terminology / Official Pipeline Expression SSOT ·
             Architecture Freeze (`Architecture/`) = Structure baseline (내용 수정 금지) ·
             Schema / Models / Validation / Loader / Membership / Resolve /
             Runtime / Session / Strategy / Strategy Engine / Modal / Geometry
             Foundation 구현은 완료 · Generator Phase에서 재작성하지 않음 ·
             Pointer Capture Timing SSOT = absolute baseline (변경 금지) ·
             Overlay Native Selection SSOT = absolute baseline (변경 금지)
```

> 본 문서는 `작업관리/GLOSSARY_SSOT.md`의 공식 용어·Official Pipeline 표현을 따른다.

---

## 0. 새 세션 — 필수 읽기 순서

```text
1. PROJECT_MASTER_INDEX.md
2. HISTORY/PROJECT_LOG_YYYY-MM.md
3. 작업관리/GLOSSARY_SSOT.md
4. Architecture/ENVELOPE_ARCHITECTURE_SSOT.md
5. CURSOR_SESSION_HANDOFF.md
6. Mission-specific documents (필요 시)
```

| # | Document | Role |
|---|----------|------|
| **1** | **MASTER** | Status — 현재 Phase · Next Track · 기능 SSOT |
| **2** | **LOG** | History — 최근 Mission · 검증 사실 |
| **3** | **GLOSSARY** | Terminology — Official Name · Official Pipeline 표현 |
| **4** | **Architecture Freeze** | Structure — Envelope / Sampling / Dataset / Membership / Resolve 규칙 (Consume only) |
| **5** | **HANDOFF** | Operations — Current / Next / Carry · Session Checklist |
| **6** | **Mission-specific** | 해당 Mission만 (예: Product Phase Handoff · `search/quality/SEARCH_QUALITY_REPORT.md`) |

**기본 5종을 마친 뒤에만** Mission-specific 문서를 읽는다.

---

## 0.1 Session Rules

세션 시작 · 구현/설계 착수 **전**:

| ID | Rule |
|----|------|
| SR-01 | Read `PROJECT_MASTER_INDEX` |
| SR-02 | Read latest `HISTORY/PROJECT_LOG_YYYY-MM` |
| SR-03 | Read `작업관리/GLOSSARY_SSOT.md` |
| SR-04 | Use **Official Terminology** only |
| SR-05 | Do **not** redefine official terminology |
| SR-06 | **Cite** Glossary definitions — do not duplicate them |
| SR-07 | Read Architecture Freeze **after** Glossary |
| SR-08 | Preserve Architecture Freeze (`Architecture/` 본문 수정 금지) |
| SR-09 | Generator = Producer |
| SR-10 | Search = Consumer |
| SR-11 | Runtime = Orchestrator only |
| SR-12 | Product Host ≠ Search Runtime |
| SR-13 | PublishedDataset ≠ positions.json |
| SR-14 | Mission-specific documents are read **after** the core documents (1–5) |

---

## 0.2 Authority Hierarchy

축을 분리한다. MASTER가 Architecture를 개정하는 상위 헌법이 **아니다**.

### Status

```text
PROJECT_MASTER_INDEX
        ↓
PROJECT_LOG
        ↓
CURSOR_SESSION_HANDOFF
```

| Authority | Role |
|-----------|------|
| MASTER | Current Phase · Next Track · 기능 상태 |
| LOG | 사실 이력 · Mission 완료/검증 기록 |
| HANDOFF | 세션 ops · Current / Next / Carry · Checklist |

### Structure

```text
Architecture Freeze (`Architecture/`)
```

| Authority | Role |
|-----------|------|
| Architecture Freeze | Envelope 의미 · Sampling Policy · Dataset Must/Must-Not · Membership / Resolve 규칙 |

### Terminology

```text
GLOSSARY_SSOT (`작업관리/GLOSSARY_SSOT.md`)
```

| Authority | Role |
|-----------|------|
| GLOSSARY | Official Name · Pipeline Label · Alias · 금지 표현 · Product Terminology |

Envelope 용어의 **의미** Parent는 여전히 Architecture Freeze이다. Glossary는 cite/consume한다.

---

## 0.3 Conflict Resolution

| Conflict domain | Winner |
|-----------------|--------|
| Architecture 의미 · Sampling Policy · Dataset Must/Must-Not | **Architecture Freeze** |
| Official Name · Official Pipeline · Alias · 금지 표현 | **GLOSSARY_SSOT** |
| Project Status · Next Track | **PROJECT_MASTER_INDEX** (+ LOG 보강) |
| Current Mission / Session Checklist / Carry | **CURSOR_SESSION_HANDOFF** |

---

## 0.4 Glossary Consume Policy

```text
All official terminology and Official Pipeline labels shall follow
작업관리/GLOSSARY_SSOT.md.

Envelope meaning, Sampling Policy, Membership, Resolve,
Dataset Must/Must-Not rules are defined by Architecture Freeze.

Glossary cites them and does not redefine them.

Do not duplicate Glossary definitions.

Use official terminology and cite the relevant Glossary section.
```

---

## 0.5 Startup Checklist

새 세션 시작 시:

- [ ] MASTER Next Track 확인
- [ ] 최신 LOG 확인
- [ ] Glossary Official Terminology / Official Pipeline 확인
- [ ] Architecture Freeze 확인 (Consume only)
- [ ] Handoff Current / Next / Carry 확인
- [ ] Mission 문서 확인 (core 5종 이후)

---

## 1. Current Status

```text
Current Status
  Phase 3 Complete — Search Engine Architecture Complete
  Phase 4 Product Pipeline COMPLETE
  ✅ Mission 01 Export · Mission 02 Package · Mission 03 Deploy
  ✅ Mission 04 Authoring Integration ABSORBED (ADR)
  ✅ Phase 5 Preparation — Cue-Only Edit Snap & Exact Position Replacement
  ✅ Phase 5 Mission 01 — Real Interpolation COMPLETE (core engine)
  ✅ Product Envelope Static Publisher (Task #4) COMPLETE
  ✅ Phase 5 Search Quality Follow-on Task #5 COMPLETE (Production RI E2E)
  ✅ Phase 5 Mission 02 — Dead Code Cleanup COMPLETE
      · Closure: COMPLETE WITH DEFERRED ITEMS
      · Cleanup Exit: EXIT-AFTER-#4
      · Code baseline (Mission 02): main · 8bf90b648cfb73752abc0d4af8353aab2ce8998f
  ✅ USER Overlay Centering SSOT COMPLETE (2026-08-12)
      · Root Cause B+C · Panel ResizeObserver · 브라우저 검증 · build PASS
      · Code + docs sync uncommitted · Commit/Push 대기
  ✅ Ball Fine Position Controller COMPLETE (2026-08-12)
      · Joystick + Fine Controller · 0.1 Rg tap/long-press · dismissal lifecycle
      · Admin/User runtime verification PASS · **Commit/Push 대기**

Next Track
  1) Ball Fine Position Controller + USER Overlay Centering — Commit → Push
  2) Sample System Validation
  · Readiness: READY FOR SAMPLE SYSTEM VALIDATION
  · Product / Platform Carry (Display Boundary · STEP9 · Known Issues)
```

| Item | Value |
|------|-------|
| **Phase 1 Foundation** | ✅ **Completed** |
| **Phase 2 Dataset Generator** | ✅ **Completed** |
| **Phase 3 Search Engine Enhancement** | ✅ **Completed** |
| **Search Engine Architecture** | ✅ **Complete** |
| **Phase 4 Product Pipeline** | ✅ **COMPLETED** (Mission 01–03 · Mission 04 ABSORBED) |
| **Phase 5 Preparation** | ✅ **Cue-Only Edit Snap & Exact Position Replacement** (Authoring · not Mission 01) |
| **Phase 5 Mission 01 Real Interpolation** | ✅ **COMPLETED** (core engine · `frontend/src/domain/realInterpolation/`) |
| **Product Envelope Static Publisher** | ✅ **COMPLETED** (`690d6fe`) |
| **Phase 5 Search Quality Follow-on Task #5** | ✅ **COMPLETED** (`282c859` · Production RI E2E · Push done) |
| **Phase 5 Mission 02 Dead Code Cleanup** | ✅ **COMPLETED** (`8bf90b6` · EXIT-AFTER-#4 · **COMPLETE WITH DEFERRED ITEMS**) |
| **USER Overlay Centering SSOT** | ✅ **COMPLETED** (2026-08-12 · 브라우저 검증 · build PASS · **Commit/Push 대기**) |
| **Ball Fine Position Controller** | ✅ **COMPLETED** (2026-08-12 · Admin/User runtime 검증 PASS · **Commit/Push 대기**) |
| **GLOSSARY_SSOT** | ✅ **Active** (`작업관리/GLOSSARY_SSOT.md`) |
| **Architecture Freeze** | **유지** (`Architecture/` 내용 수정 없음) |
| **Product Pipeline Tests** | **21 PASS** (export · package · deploy) |
| **Next Track** | **Commit (Centering + Fine Controller)** → **Sample System Validation** |
| **Next Track Readiness** | **READY FOR SAMPLE SYSTEM VALIDATION** |
### 구현 완료 범위

| ✓ | Phase / Layer | Path |
|---|---------------|------|
| ✓ | Foundation | `schemas/` · `models/` · `validation/` · `loader/` · `membership/` · `resolve/` · `runtime/` · … |
| ✓ | Dataset Generator | `generator/` |
| ✓ | Spatial Index | `search/spatial_index/` |
| ✓ | KDTree | `search/kd_tree/` |
| ✓ | Membership Optimization | `search/membership/` |
| ✓ | Ranking | `search/ranking/` |
| ✓ | Interpolation | `search/interpolation/` |
| ✓ | Geometry Metrics | `search/geometry/` |
| ✓ | Runtime Wiring | `search/runtime/` |
| ✓ | Quality Validation | `search/quality/` |

Official Pipeline 이름: **Search Enhancement Pipeline** — see `GLOSSARY_SSOT` §5.3.

---

## 2. Sampling / Dataset 용어 (cite only)

> Official definitions: `작업관리/GLOSSARY_SSOT.md` §3.1 · §4.  
> Envelope meaning / Sampling Policy: `Architecture/ENVELOPE_ARCHITECTURE_SSOT.md` (Freeze).

| Term | Cite |
|------|------|
| **cueSet** | GLOSSARY §3.1 · Freeze SP-C-* |
| **secondSet** | GLOSSARY §3.1 · Freeze SP-S-* · Line of Score |
| **Target** | GLOSSARY §3.1 — Sampling 대상 아님 · Freeze SP-T-* |
| **Domain Rule** | GLOSSARY §3.1 · Freeze |
| **Cartesian product** | 저장 금지 — GLOSSARY §6 · Freeze SP-D-01 |
| **PublishedDataset** | GLOSSARY §3.1 — ≠ `positions.json` |
| **Trajectory Sampling** | GLOSSARY §3.1 · §4 |

본 Handoff에 용어 전문을 재정의·복제하지 않는다.

---

## 3. 다음 작업 — Next Track

### Primary

- **Ball Fine Position Controller** — ✅ **COMPLETE** · Admin/User runtime 검증 PASS · **Commit/Push 대기**
- **USER Overlay Centering SSOT** — ✅ **COMPLETE** · docs sync → **Commit** → **Push** (사용자 요청 시)
- **Sample System Validation** — **NEXT** (after commit) · **READY FOR SAMPLE SYSTEM VALIDATION**
- **Phase 5 Mission 02 — Dead Code Cleanup** — ✅ **COMPLETE** (EXIT-AFTER-#4 · COMPLETE WITH DEFERRED ITEMS)
- **Phase 5 Mission 01 Real Interpolation** — ✅ **COMPLETE** (core engine)
- **Product Envelope Static Publisher (Task #4)** — ✅ **COMPLETE**
- **Phase 5 Search Quality Follow-on Task #5** — ✅ **COMPLETE** (Production RI E2E)
- **Product / Platform Carry**
  - Display Boundary Continuation / CASE A / Corrected Cap · Handle Drag
  - STEP9 Phase 4 Pilot
  - Known Issues OPEN-01 · OPEN-02 · OPEN-05
  - USER Overlay 기타 통합 (HPT Polish 등) — Centering 외

### Ball Fine Position Controller (2026-08-12) — Complete

Cite: `HISTORY/PROJECT_LOG_2026-08.md` · `2_FRONTEND_ARCHITECTURE_BASELINE_v1.md` §Ball Fine Position Controller · MASTER v1.67

**목적:** Ball physical center coordinate 확인 · Drag/Joystick 대략 이동 + 방향키 0.1 Rg 미세조정 · Sample System Validation / 실사용 Ball positioning 지원.

**UI:** Ball 선택 시 Joystick + Fine Controller 함께 표시 · `▲ ◀ (x.x, y.y) ▶ ▼` · coordinate fontSize **17** · arrow fontSize **15** · hitR **22**.

**동작:** Tap = pointerdown 즉시 0.1 · Hold ≥1.5s → 150ms repeat · Long Press 진입 시 double-step 없음 · fine nudge 축만 `Math.round(v*10)/10` · 기존 boundary clamp 재사용.

**Placement:** Ball → Joystick → Fine Controller → Table Center · `computeFineControllerCenterRg()` (`joystickInteractionPolicy.ts`).

**Dismissal:** `hideBallPositionController()` — positioning 외 UI action 시 `joystickVisible=false` · Fine Controller timer/interval 정리 · 별도 visibility state 없음.

**검증:** Admin UI **PASS** · User UI **PASS** (사용자 직접 runtime 확인) · Vercel/mobile production 검증은 별도 단계.

**Git:** `9678b69` 이후 미커밋 · **Push 안 함**

**다음 세션:** Fine Controller 재설계/재구현 **금지** · Sample System Validation 계속.

### USER Overlay Centering SSOT (2026-08-12) — Complete

Cite: `HISTORY/PROJECT_LOG_2026-08.md` · `OVERLAY_LAYOUT_SSOT_v1.2.md` §8 · MASTER v1.66

**증상:** 동일 Overlay라도 진입 경로에 따라 기하 중심이 table-area center와 불일치  
(F5→AI 위 · Zoom In 중앙 · Zoom Out 아래 · CALC→AI 아래 · HPT→AI 중앙)

**분석:** Ask 재분석으로 Root Cause **B+C** 확정  
- **B** stale panel dimensions  
- **C** content reflow timing  
- 1차 dragOffset/reset patch만으로는 해결 불가 (부차 보완일 뿐 · **최종 주원인 아님**)

**수정:** `UserOverlayShell.jsx` only  
- live panel box · **Panel ResizeObserver** + Table ResizeObserver  
- Centering SSOT: `(table − currentPanel) / 2 + temporary dragOffset`  
- Open/Switch/Zoom → `dragOffset=0` · Panel RO는 offset 유지  
- Zoom = 항상 **table-area center** (이전 시각 중심 유지 폐기)  
- `index.css` 최종 **미수정** · widthRatio 0.42/0.62 **미변경** · DisplayModel/SYS **미변경**

**검증:** 실제 브라우저 **정상** · `npm run build` **PASS** · repo lint 기존 이슈만  
**Git:** 코드+문서 **미커밋** · **Push 안 함**

**다음 단계 (즉시):**

```text
관련 문서 동기화 완료 확인
  → git diff / status 확인
  → Commit
  → Push
```

### Session Guardrails (Mission 02 closed)

- Do **NOT** reopen Cleanup #1–#4.
- Do **NOT** automatically remove deferred candidates (N3–N15).
- Do **NOT** alter locked Search / RI / Slot / Calculator / Envelope / Publisher contracts as “cleanup”.
- Design / run **Sample System Validation** first.
- Deferred cleanup: revisit only after validation results or a separate maintenance / design decision.

### Phase 5 Mission 02 — Dead Code Cleanup (Complete)

Cite: `HISTORY/PROJECT_LOG_2026-08.md` (Mission 02 Final Closure) · MASTER Status

- Cleanup #1–#4 complete — temporary telemetry / no-op trace scaffolding removed
- Protected product / validation paths preserved (`SNAP_RESULT` / `SNAP_OUTPUT` kept)
- Closure: **COMPLETE WITH DEFERRED ITEMS** · Exit: **EXIT-AFTER-#4**
- Code baseline (docs sync prior): `8bf90b648cfb73752abc0d4af8353aab2ce8998f` · `main` == `origin/main` · 0/0 · clean
- Deferred: optional hygiene · defer-until-validation · design-decision · KEEP — **no Mission 02 blocker**

### Phase 5 Search Quality Follow-on — Task #5 (Complete)

Cite: `HISTORY/PROJECT_LOG_2026-08.md` (2026-08-11) · MASTER Status

- Production Envelope URL: `/dataset/_published/envelope/dataset.json`
- Frontend read-only loader · App DI · fail-closed · USER Search isolation
- RI → existing Strategy Slot hydrate · Calculator / `buildTrajectory` ownership reused
- UI: matchType · confidence · Top-3 · existing activation path
- No production `window.__ENVELOPE_PUBLISHED_DATASET__` dependency
- Commit: `282c859` · Push **COMPLETE**

### Phase 5 Mission 01 — Real Interpolation (Complete)

Cite: `GLOSSARY_SSOT` (Real Interpolation · authoringStrategyId · matchType · confidence · Second Scoring Gate · Cue/Target Geometry Gate) · `HISTORY/PROJECT_LOG_2026-08.md`

- Module: `frontend/src/domain/realInterpolation/` · Flow: `realInterpolationSearchFlow`
- Hard Gate: same `authoringStrategyId` only · No Extrapolation · Modal never blended
- Phase 3 `search/interpolation/` `rank_continuity_v1` **unchanged** (D3-A)
- Feature flag: `VITE_REAL_INTERPOLATION_SEARCH=1`
- Production Envelope load / UI surface / Builder DI: **Task #5** (not Mission 01 scope)
- Architecture Freeze / PublishedDataset **not mutated**

### Phase 5 Preparation — Authoring normalization (Complete)

Cite: `GLOSSARY_SSOT` (Cue-Only Edit Snap · Exact Position Replacement · Edit Source) · `HISTORY/PROJECT_LOG_2026-08.md` (2026-08-10)

- Edit Source + Cue-only edit · Target Exact · Second Exact
- lineage Authoring Cue candidate only (not `cueSet`)
- Euclidean **d ≤ 0.5 Rg** → SNAP · **d > 0.5** → new Position
- SNAP 후 Exact 3-Ball identity · Exact duplicate → Latest Write Wins
- near-but-not-exact Positions preserved · global proximity merge **forbidden**
- History append-only · PublishedDataset Full Regenerate only (no in-place patch)

**0.5 Rg SHALL NOT** be reused as Search / Membership / KDTree / Ranking / Real Interpolation tolerance.  
Real Interpolation = separate Search Quality layer (Mission 01 COMPLETE).

### Phase 4 Product Pipeline — Complete

Official Pipeline: GLOSSARY §5.2 · Code: `product/` · CLI: `export` · `package` · `deploy` · `pipeline`  
Mission 04 ADR: `SESSION_TRANSFER/ADR_MISSION_04_AUTHORING_INTEGRATION_ABSORBED.md`
### Follow-up Candidates

- System Authoring
- Published Dataset Expansion
- Real System Corpus
- Search Quality Tuning (실데이터) — Phase 5+
- Product Integration

### Search Enhancement Pipeline (Complete)

Official name — GLOSSARY §5.3:

```text
PublishedDataset
        ↓
Spatial Index
        ↓
KDTree
        ↓
Membership
        ↓
Ranking
        ↓
Interpolation
        ↓
Geometry Metrics
        ↓
Resolve
        ↓
SearchResult
```

**Phase 3 Search Engine Enhancement = Complete.**

---

## 4. In Progress / Carry (병행 트랙)

- **Ball Fine Position Controller** — ✅ 구현·Admin/User runtime 검증·docs sync 완료 · **Commit/Push Carry**
- **USER Overlay Centering SSOT** — ✅ 구현·브라우저 검증·docs sync 완료 · **Commit/Push Carry**
- **Authoring normalization Carry (Active):** Cue-Only Edit Snap · Exact Position Replacement — see §3 Phase 5 Preparation · GLOSSARY
- Product: Display Boundary Continuation / CASE A / Corrected Cap · Handle Drag 잔여
  - Note: `DISPLAY_BOUNDARY_POLICY_SSOT.md` §15 D-DBP-17 “Center Preserve” 문구는 Centering SSOT(Zoom→table-area center)와 어긋날 수 있음 — **후속 문서 정합 후보** (본 Centering 커밋 범위 외)
- Platform: STEP9 Phase 4 Pilot (Frozen Platform Consume)
- Known Issues OPEN-01 · OPEN-02 — P0 조사 중
- OPEN-05 — Known Issue · Low Priority
- USER Overlay 기타 통합 (HPT Polish 등) — Centering 외 carry

---

## 5. Architecture / Ownership (변경 금지 요약)

### Envelope / Search Engine

- `Architecture/` Freeze SSOT **내용 수정 금지**
- Official terminology: **GLOSSARY_SSOT** (재정의 금지 · cite)
- Foundation 구현 계층을 Generator가 재구현·우회하지 않음
- Geometry Metrics ≠ Trajectory Generator (GLOSSARY §6)
- Modal / Strategy Handle에 Modal body · Search Algorithm 삽입 금지 (현 단계)
- Generator = Producer · Search = Consumer · Runtime = Orchestrator only
- Product Host ≠ Search Runtime

### Interaction / Overlay (기존 baseline)

- pointerdown Capture 복귀 금지 · Overlay Selection 우회 금지
- 계산 Trajectory(C1~C6) Builder/Formula 무단 수정 금지
- Search 전용 Hydrate 신설 금지 — `activateStrategySlot` 재사용

---

## 6. Current Session Card

```text
Session ID     : Ball Fine Position Controller COMPLETE + docs sync
Baseline       : Architecture Freeze · GLOSSARY_SSOT · Phase 4 COMPLETE · Mission 01/02 · Task #5 COMPLETE
                 · pre–Fine Controller HEAD: 9678b69d0f82b82a685de86cb42eec07e18cb53f
Current Done   : Fine Controller (tap/long-press · placement · dismissal) · Admin/User runtime PASS · docs sync
                 · Centering (prior) · Panel ResizeObserver · 브라우저 검증 · build PASS
Current Status : Fine Controller COMPLETE · Centering COMPLETE · awaiting Commit/Push
Code change    : frontend/src/App.jsx · frontend/src/interaction/joystickInteractionPolicy.ts (uncommitted)
                 · frontend/src/components/common/UserOverlayShell.jsx (uncommitted, prior)
Docs           : MASTER v1.67 · LOG · HANDOFF · Frontend Baseline §Ball Fine Position Controller
Next Session   : Commit (Fine Controller + Centering +docs) → Push → Sample System Validation
Readiness      : READY FOR SAMPLE SYSTEM VALIDATION (after commit)
Commit         : NOT done · Push NOT done
Guardrail      : Do NOT redesign/reimplement Fine Controller
```

---

*End of CURSOR_SESSION_HANDOFF.md — 2026-08-12 · Ball Fine Position Controller COMPLETE (docs sync · awaiting Commit)*
