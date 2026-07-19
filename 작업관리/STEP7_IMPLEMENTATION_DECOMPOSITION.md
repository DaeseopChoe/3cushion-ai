# STEP7_IMPLEMENTATION_DECOMPOSITION.md

```text
Document  : STEP7_IMPLEMENTATION_DECOMPOSITION.md
Version   : v1.0 (Approved)
Status    : Approved
Date      : 2026-07-19
STEP      : STEP7 Implementation Decomposition
Type      : Session Execution SSOT (Official)
Owner     : System Standardization / Project Operations
Baseline  : STEP7_SCOPE Approved · STEP7_WORK_BREAKDOWN Approved ·
            DEVELOPMENT_WORKFLOW v0.3 · STEP6 Final Freeze v1.0
Rule      : Decompose WBS IUs → Session Units only ·
            No new Scope / Milestone / Deliverable / WP / IU ·
            No Code / System JSON / Framework / Pipeline / Runtime mutation in this document stage
Next      : Agent Implementation (Session S7-P2-IU-2-01A)
```

---

## 0. Purpose

본 문서는 Approved WBS의 **IU**를 Agent가 **세션 단위(Session Block)** 로 수행할 수 있도록 분해한 **Implementation 실행 계획**이자 **Session Execution SSOT**이다.

```text
STEP7 Scope (Approved)
        ↓
STEP7 Work Breakdown (Approved)
        ↓
Implementation Decomposition (this document · Approved)
        ↓
Agent Implementation (next)
```

새로운 Scope·Milestone·Deliverable·WP·IU를 **만들지 않는다**.  
IU ID는 WBS와 **1:1 또는 1:N Session**으로만 매핑한다 (IU 번호 변경·신설 금지).

---

## 1. Input

### 1.1 Consume

| Document | Role |
|----------|------|
| `STEP7_SCOPE.md` (Approved) | In/Out · Constraints · E/SM · Phase meaning |
| `STEP7_WORK_BREAKDOWN.md` (Approved) | Phase · Milestone · WP · IU · Gates · Roadmap |
| `DEVELOPMENT_WORKFLOW.md` v0.3 | §7 STEP flow · **§12 Implementation Decomposition** · §8 Git · §11 Proposal |
| `PROJECT_MASTER_INDEX.md` | Current stage SSOT |
| `PROJECT_LOG_2026-07.md` | Decision / history |
| `CURSOR_SESSION_HANDOFF.md` | Entry / Lock / Forbidden |
| `STEP6_FINAL_FREEZE.md` v1.0 | Consume baseline · no STEP6 reopen |

Phase 착수 시 추가 Consume (해당 Phase Design SSOT가 생긴 뒤):

| When | Extra Consume |
|------|----------------|
| P2+ | Catalog Design drafts produced by prior Sessions |
| P5+ | D-PLAN · D-CAT Pin · Gap Register |
| P7 | Frozen Pin · D-FLEET / Pilot closure |

### 1.2 Forbidden

| Forbidden |
|-----------|
| Scope change |
| WBS Phase / Milestone / WP / IU renumber or invent |
| Framework / Pipeline informal edit |
| Runtime Baseline mutation |
| System JSON / code change **outside** the Session’s declared IU and Change Design |
| Mega one-shot Implementation bypassing Session Template |

---

## 2. Session Model

```text
IU (from WBS)
   ↓
Session Block   (1 IU = 1 Session default; split only if IU > 1 day — same IU id, suffix -S1/-S2)
   ↓
Agent Task      (concrete edits / doc writes listed in Session)
   ↓
Validation      (IU Done + Session Exit checks)
   ↓
Commit          (scoped · one logical purpose)
   ↓
Next Session    (next IU in queue · §12 ID3 confirm)
```

| Rule | Statement |
|------|-----------|
| **Default** | **1 IU → 1 Session** |
| **Split** | Same IU, Session suffix `-S1`, `-S2` only if timebox exceeded — **no new IU id** |
| **Merge** | Forbidden across different IU ids in one Session |
| **Design-first** | Design IUs before apply IUs (WBS order) |

**Session ID format:**

```text
S7-{Phase}-{IU-id}[ -Sn ]
예: S7-P2-IU-2-01A
    S7-P5-IU-5-03A-S1
```

---

## 3. Implementation Unit Mapping

| Layer | Source | This doc adds |
|-------|--------|---------------|
| Phase / Milestone / WP / IU | WBS (immutable) | — |
| Session Block | — | Session ID · template fill |
| Agent Task | — | File/doc actions per Session |
| Validation / Commit / Next | Ops §8 · §12 · WBS VG-* | Session-level checklist |

Mapping principle:

| IU (WBS) | Session Block | Agent Task | Validation | Commit | Next |
|----------|---------------|------------|------------|--------|------|
| IU-x-yz | S7-P*-IU-x-yz | Per template | IU Done from WBS | Optional/required per §8 | Next IU in §5 Queue |

Fleet batches (`IU-6-N-*`): Session IDs use concrete N from D-PLAN after M4.1  
예: `S7-P6-IU-6-1-01A` for batch N=1.

---

## 4. Session Template

모든 Agent Session은 아래 템플릿을 **세션 시작 시 채우고** 종료 시 Exit를 기록한다.

```text
────────────────────────────────
Session ID     : S7-P#-IU-#-##X
IU             : IU-#-##X          (WBS — do not invent)
WP             : WP-#-##
Phase          : P#
Milestone      : M#.n
────────────────────────────────
Consumed docs  :
  - STEP7_SCOPE (Approved)
  - STEP7_WORK_BREAKDOWN (Approved)
  - STEP7_IMPLEMENTATION_DECOMPOSITION (this)
  - [phase-specific SSOT]
────────────────────────────────
Forbidden this session :
  - Runtime / Framework / Pipeline / out-of-IU System JSON
  - Scope / WBS renumber
────────────────────────────────
Agent Task (single responsibility) :
  - …
────────────────────────────────
Modified files (planned) :
  - … (docs-only until Pilot Change Design allows JSON)
────────────────────────────────
Expected outputs :
  - … (must match WBS IU Done)
────────────────────────────────
Validation :
  - [ ] IU Done criteria (from WBS)
  - [ ] VG-IU (§12 ID3)
  - [ ] No Runtime diff
  - [ ] Build/smoke if code/JSON touched
────────────────────────────────
Commit :
  - [ ] Scoped commit message cites Session ID + IU
────────────────────────────────
Exit :
  - [ ] PASS → Next Session = <next IU>
  - [ ] FAIL → stop · report · do not skip ahead
────────────────────────────────
```

---

## 5. First Implementation Queue

WBS Implementation Roadmap 순서를 **그대로** 사용한다.  
**Agent Implementation 착수 큐는 Catalog Design부터** (IU-2-01A…).

### 5.1 Pre-queue (docs entry — if not yet done)

| Order | Session ID | IU | Purpose |
|------:|------------|-----|---------|
| 0.1 | S7-P0-IU-0-01A | IU-0-01A | Entry Consume checklist |
| 0.2 | S7-P0-IU-0-01B | IU-0-01B | Confirm next path |
| 0.3 | S7-P1-IU-1-01A | IU-1-01A | File Approved Scope |
| 0.4 | S7-P1-IU-1-01B | IU-1-01B | LOG/MASTER Scope cite |

> Scope/WBS가 이미 repo에 Approved로 파일화되어 있으면 0.1–0.4는 **attestation-only** 또는 skip(기록만).

### 5.2 Primary queue (start here for formal Implementation)

| Order | Session ID | IU | WP | Expected class |
|------:|------------|-----|-----|----------------|
| **1** | **S7-P2-IU-2-01A** | **IU-2-01A** | WP-2-01 | Catalog Freeze Design skeleton |
| **2** | S7-P2-IU-2-01B | IU-2-01B | WP-2-01 | Pin / provenance / Seed→Freeze rules |
| **3** | S7-P2-IU-2-02A | IU-2-02A | WP-2-02 | Path + file naming SSOT |
| **4** | S7-P2-IU-2-02B | IU-2-02B | WP-2-02 | Pin field table (U12) |
| 5 | S7-P2-IU-2-03A | IU-2-03A | WP-2-03 | Namespace options compare |
| 6 | S7-P2-IU-2-03B | IU-2-03B | WP-2-03 | Namespace Decision record |
| 7 | S7-P2-IU-2-04A | IU-2-04A | WP-2-04 | Classification lock |
| 8 | S7-P2-IU-2-04B | IU-2-04B | WP-2-04 | Coverage formula lock |
| 9 | S7-P2-IU-2-05A | IU-2-05A | WP-2-05 | Register Freeze Design |
| 10 | S7-P2-IU-2-06A | IU-2-06A | WP-2-06 | Catalog JSON body |
| 11 | S7-P2-IU-2-06B | IU-2-06B | WP-2-06 | Catalog Pin packaging |
| 12 | S7-P2-IU-2-07A | IU-2-07A | WP-2-07 | Register JSON body |
| 13 | S7-P2-IU-2-07B | IU-2-07B | WP-2-07 | Register Pin packaging |
| 14 | S7-P2-IU-2-08A | IU-2-08A | WP-2-08 | Freeze Candidate declaration |
| 15 | S7-P2-IU-2-08B | IU-2-08B | WP-2-08 | MASTER/LOG Catalog Freeze cite |

### 5.3 Continuation queue (after P2 — WBS order, IDs unchanged)

```text
P3: IU-3-01A → … → IU-3-06A
P4: IU-4-01A → … → IU-4-05A
P5: IU-5-01A → … → IU-5-06A   (Fleet Entry Approved at IU-5-06A)
P6: IU-6-N-* per D-PLAN batches → IU-6-90A/B
P7: IU-7-01A → … → IU-7-07A
P8: IU-8-01A → … → IU-8-06B
```

**Hard stop before Pilot JSON (IU-5-03*):** M2.3 + M4.1 must be complete (WBS).

**Hard stop before Fleet (P6):** WP-5-06 **Fleet Entry Approved**.

---

## 6. Session Rules (§12)

| ID | Rule | Application |
|----|------|-------------|
| **ID1** | Split by unit | Queue = IU list; no mega-session |
| **ID2** | Minimal shippable | Each Session ends with reviewable output |
| **ID3** | Gate before next | Exit PASS required before next Session ID |
| **ID4** | Small steps default | Prefer 1 IU / Session |
| **ID5** | Design whole first | Design IUs (e.g. 2-01…2-05) before body apply (2-06…) |
| **ID6** | Expand only if required | New Session suffix only; never new IU id |

추가:

| Rule | Statement |
|------|-----------|
| Single Responsibility | One Agent Task theme per Session |
| ≤ 1 day | Else split `-S1/-S2` same IU |
| Independent Validation | Session Validatable without next IU |
| Runtime 변경 금지 | Continuous SM-04 |
| Scope 변경 금지 | Continuous |

---

## 7. Validation Policy

| Level | When | Pass condition |
|-------|------|----------------|
| **Session Exit** | End of Session | Template Validation ✔ · Forbidden not violated · Output matches IU Done |
| **IU Done** | Session(s) for that IU complete | WBS IU Done criteria |
| **WP Done** | All IUs of WP Done | WBS WP Done · Milestone progress |
| **Phase Exit** | WBS VG-P* | WBS Validation Gate (incl. VG-P5 Fleet Entry Approved) |
| **Freeze** | P8 | WBS Freeze Gate FG-1…FG-7 |

Session FAIL → **stop** · report · fix in new Session on **same IU** (no skip).

---

## 8. Commit Policy

```text
Session (PASS)
    ↓
Commit   (scoped · cite Session ID + IU)
    ↓
Validation residual check (hooks / build if needed)
    ↓
Next Session
```

| Rule | Statement |
|------|-----------|
| Scope | One Session ≈ one Commit (preferred) |
| Message | `docs(step7): S7-P2-IU-2-01A catalog freeze design skeleton` 형식 권장 |
| No dump | Unrelated files excluded (Ops §8) |
| Push | Milestone/Phase gates — not every micro-session (team choice); **P8 requires Push** |
| No force / no amend-by-default | Ops §8 |

Design-only Sessions: docs commits only.  
Apply Sessions (P5/P6 JSON): Change Design must exist in prior Session outputs.

---

## 9. Next Linkage

```text
Implementation Decomposition (Approved)
        ↓
Agent Implementation   ← execute Session Queue (§5)
        ↓
Validation             ← Session / IU / WP / Phase gates
        ↓
STEP7 Freeze           ← P8 · FG-* · SM/E
        ↓
STEP7 Complete
```

Post STEP7 (Certification / Dataset Production)는 Scope §11 — **본 Decomposition 범위 밖**.

---

## 10. First Agent Session Card (ready to run)

```text
Session ID     : S7-P2-IU-2-01A
IU             : IU-2-01A
WP             : WP-2-01
Phase          : P2 Catalog
Milestone      : M2.1

Consumed       : SCOPE · WBS · this Decomposition · STEP6-4/5 cite · STEP6_FINAL_FREEZE
Forbidden      : Runtime · Framework · Pipeline · System JSON · new IU/WP
Agent Task     : Author Catalog Freeze Design skeleton only (structure · sections · Consume pins)
Modified files : (planned) STEP7 Catalog Freeze Design doc under SPS/작업관리 path TBD in-session per project doc layout
Expected       : Design skeleton exists · Reviewable · no Freeze declaration yet
Validation     : IU-2-01A Done (skeleton) · no Runtime diff
Commit         : docs(step7): S7-P2-IU-2-01A …
Next Session   : S7-P2-IU-2-01B
```

---

## 11. Document Control

| Item | Value |
|------|-------|
| Version | **v1.0 (Approved)** |
| Status | **Approved** |
| Role | STEP7 Official Session Execution SSOT |
| Next after Approve | **Agent Implementation (Session S7-P2-IU-2-01A)** |
| Does not create | Scope · Milestone · Deliverable · WP · IU |

### Revision History

| Version | Date | Change |
|---------|------|--------|
| v0.1 | 2026-07-19 | Initial Implementation Decomposition Draft — Session Model · Queue · Template · Policies |
| **v1.0** | 2026-07-19 | **Approved — No structural changes** |

### Approval checklist

- [x] Purpose / Input / Forbidden accepted  
- [x] Session Model (IU→Session→…→Next) accepted  
- [x] No new WP/IU/Scope confirmed  
- [x] First Implementation Queue starts at **IU-2-01A**  
- [x] Session Rules §12 accepted  
- [x] Validation / Commit / Next Linkage accepted  
- [x] First Agent Session Card accepted  

---

*End of STEP7_IMPLEMENTATION_DECOMPOSITION.md v1.0 (Approved)*
