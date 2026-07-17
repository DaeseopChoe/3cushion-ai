# STEP6-6_Validation_Engine_Design.md

```text
Document  : STEP6-6_Validation_Engine_Design.md
Version   : v0.2
Status    : Design Draft (Engine Architecture · Event Layer Reinforced · Not Implemented)
Date      : 2026-07-17
STEP      : STEP6-6
Owner     : Schema Validation
Type      : Validation Engine Design (Design Only)
Baseline  : Framework Freeze Candidate (Locked · Consume)
            Pipeline Freeze Candidate (Locked · Consume)
            STEP6-3 Analysis v1.1 (Completed · Consume)
            STEP6-4 Catalog Design v0.2 (Completed · Consume)
            STEP6-5 Register Suite v0.2 (Completed · Consume)
Rule      : Design Only · No code · No Runtime · No Schema JSON · No execution
            · Catalog/Register Consume-only (no mutation)
            · No Framework/Pipeline rewrite
Revision  : v0.2 — Engine Event Layer reinforcement (STEP6-7 Implementation input)
```

---

## 0. Design Status

| Item | Status |
|------|--------|
| **Mode** | **Design Only** — Architecture + **Event Layer** confirmed for Design track |
| **Design doc version** | **v0.2** |
| **Framework / Pipeline** | Locked · **Consume Only** |
| **STEP6-3 / 4 / 5** | Completed · **Consume Only** |
| **Engine Event Layer** | **Defined (§2.3)** — meta progress · not Finding |
| **Engine implementation** | **Out of scope** |
| **Namespace** | **Candidates only** · not locked |
| **Runtime / System JSON** | **Unmodified / unused as mutation target** |

---

## 1. Engine Purpose

### 1.1 Mission

Validation Engine은 Framework 의미와 Pipeline 절차를 준수하여:

1. Catalog / Register를 **로드·검증·참조**하고  
2. Active Rule 집합을 **Dependency에 따라 스케줄**하며  
3. Target에 대해 Rule을 **평가(JUDGE)** 하고  
4. Execution · Finding(`VAL-*`) · Deferred · Summary · Report Input을 **기록**한다.

### 1.2 Non-goals (this STEP)

| Forbidden | Reason |
|-----------|--------|
| Python / TS Engine code | Implementation = later STEP |
| Mutating Catalog or Register SSOTs | Consume only |
| Mutating System JSON / Runtime | Non-Mutation |
| Redefining Layer / Severity / schemaComplete | Framework owns semantics |
| Locking Namespace | Candidates only |

### 1.3 Authority split

| Concern | Owner |
|---------|-------|
| Semantics (Layer · Status · Severity · schemaComplete · VAL policy) | **Framework** |
| Flow · Binding · Orchestration procedure | **Pipeline** |
| Rule axes · Header Metadata | **Catalog** |
| Rule inventory · Pins · evidence shapes | **Register Suite** |
| Load · schedule · execute · emit evidence | **Engine** (this Design) |

```text
Framework → Pipeline → Catalog → Register
                              ↓ consume (RO)
                         Validation Engine
                              ↓ emit
                    Execution · VAL · Deferred · Summary → Report
```

---

## 2. Engine Architecture

### 2.1 Architecture statement

Engine = **deterministic evaluator + evidence emitter** under pinned baselines, with an internal **Event Layer** for progress/meta signaling.

```text
┌──────────────────────────────────────────────────────────────────┐
│                      Validation Engine                            │
│                                                                   │
│  Ingress → Planner → Executor → Event Bus → Outcome Bus           │
│                                      │           │                │
│                                      │           ▼                │
│                                      │    Finding Emitter         │
│                                      │           │                │
│                                      ▼           ▼                │
│                               Aggregator → Summary → Report Adapter│
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
         ▲ consume (RO)                      ▲ consume (RO)
   Catalog (+ Header)                  Register Suite (+ Pin)
```

Component chain (normative internal order):

```text
Ingress
  ↓
Planner
  ↓
Executor
  ↓
Event Bus          ← Engine Event Layer (meta / progress)
  ↓
Outcome Bus        ← Execution Status normalization
  ↓
Finding Emitter    ← VAL-* final Validation results only
  ↓
Aggregator
  ↓
Summary
  ↓
Report Adapter
```

### 2.2 Core invariants

| ID | Invariant |
|----|-----------|
| **E1** | Engine **SHALL** Consume Catalog & Register; **SHALL NOT** rewrite them. |
| **E2** | Engine **SHALL** honor Framework Layer cascade and Status/Severity meanings. |
| **E3** | Engine **SHALL** bind Rules to **Layers**, not Pipeline Stage names. |
| **E4** | **Register State ≠ Execution Status** (STEP6-5 §7). |
| **E5** | Under identical pins + Target contents → identical evidence path (Framework Determinism). |
| **E6** | READ → JUDGE → RECORD only (Non-Mutation). |
| **E7** | **Event ≠ Finding** — Events are Engine-internal progress; Findings (`VAL-*`) are final Validation results. |

### 2.3 Engine Event Layer

#### 2.3.1 Purpose

Event Layer는 Engine **내부 실행 과정**의 메타 계층이다.

| Event Layer SHALL | Event Layer SHALL NOT |
|-------------------|------------------------|
| Signal Engine progress / state transitions | Replace Finding (`VAL-*`) |
| Link Scheduler · Executor · Outcome / Finding stages | Redefine Execution Status meanings |
| Support Debug · Log · Progress · Extension hooks | Mutate Catalog / Register / System JSON |
| Carry correlation ids (runId · ruleId · targetRef) | Alone determine `schemaComplete` |

```text
Event     → Engine 내부 상태·진행 전달 (meta)
Finding   → 최종 Validation 결과 (VAL-*)
```

#### 2.3.2 Event ≠ Finding

| Aspect | **Event** | **Finding** |
|--------|-----------|-------------|
| Purpose | Internal progress / control signaling | Persistent Validation result |
| Audience | Engine components · logs · debug · UI progress | Registers · Report · STEP7 |
| Namespace | Engine-local event types | `VAL-*` (Framework Finding) |
| Required for Official result? | Optional for evidence completeness | Required when policy demands VAL |
| Survives as SSOT outcome? | Typically ephemeral / ops log | Yes — Finding Register |

#### 2.3.3 Event catalog (Design names — adjustable)

| Event | When emitted |
|-------|----------------|
| **ValidationStarted** | Run begins after Header validation success (or at Ingress start with pending header — implementation choice) |
| **RuleStarted** | Executor begins a Rule Evaluation |
| **RulePassed** | Execution Status = PASS |
| **RuleFailed** | Execution Status = FAILED |
| **RuleSkipped** | Execution Status = SKIPPED |
| **RuleDeferred** | Execution Status = DEFERRED |
| **RuleBlocked** | Execution Status = BLOCKED (rule/target level) |
| **RuleError** | Execution Status = ERROR (infra fault) |
| **ValidationCompleted** | Run close before/at Summary finalize |

Additional Events **MAY** be added later (e.g. `HeaderValidated`, `ScheduleBuilt`) without changing Finding semantics.

#### 2.3.4 Event record sketch (shape-free · not Register SSOT)

```text
EngineEvent {
  eventType: ValidationStarted | RuleStarted | RulePassed | ...
  runId
  ruleId?
  targetRef? / pathRef?
  primaryLayer?
  executionStatus?          // mirror when rule-scoped; does not redefine Status
  at: timestamp
  correlationId?
  payload?: { ... }         // debug/progress only — not Finding body
}
```

Events **MAY** be logged or streamed; they are **not** Validation Findings.

#### 2.3.5 Placement in architecture

```text
Executor
  ↓ emits rule-scoped Events
Event Bus
  ↓ fans out
  ├─→ Progress / Debug / Log sinks (Extension)
  └─→ Outcome Bus (normalize Execution Status)
          ↓
    Finding Emitter (only when Finding policy applies)
```

Outcome Bus remains the gate that normalizes **Execution Status**.  
Finding Emitter remains the only producer of **VAL-*** final results.
## 3. Engine Layer

Engine-internal layers (not Framework Validation Layers L1–L7):

| Engine Layer | Responsibility |
|--------------|----------------|
| **L-Ingress** | Load Catalog snapshot · Load Register Pin/Rules · Validate Header compatibility |
| **L-Plan** | Filter Active Rules · Coverage filter · Dependency resolution · Schedule |
| **L-Execute** | Evaluate Rules in schedule order · Produce Execution Status (+ Severity when FAILED) |
| **L-Event** | Emit Engine Events (progress/meta) · fan-out to log/debug/Outcome path |
| **L-Emit** | Findings (`VAL-*`) · Deferred Items · Results · Summary · Report package |
| **L-Control** | Mode (Design Dry-run / Official) · Options · Abort / Blocked handling |

Framework **Validation Layers L1–L7** remain concern-depth inside L-Execute scheduling, not Engine Layer names.

---

## 4. Engine Component

| Component | Role | Inputs | Outputs |
|-----------|------|--------|---------|
| **Catalog Loader** | Load Catalog bodies + Header Metadata | Catalog Pin / path | CatalogView (RO) |
| **Register Loader** | Load Rule Records · Pins · indices | Register Suite | RuleInventory (RO) |
| **Header Validator** | Compatibility preflight | Header vs Framework/Pipeline/SPS pins | PASS / BLOCKED reason |
| **Active Rule Resolver** | `registerState=Active` (+ Deprecated policy) ∩ Coverage | Inventory · Options | CandidateRuleSet |
| **Dependency Resolver** | Layer cascade + L4 chain + overrides | CandidateRuleSet · Catalog Dependency | Schedule · Skip plan |
| **Rule Scheduler** | Ordered work queue by Layer then Family chain | Schedule | ExecutionQueue |
| **Rule Executor** | Per-Rule JUDGE against Target | Queue item · Target package (RO) | RuleExecutionRecord · rule Events |
| **Event Bus** | Distribute Engine Events (progress/meta) | Executor / Control Events | Progress sinks · Outcome Bus feed |
| **Outcome Bus** | Normalize Execution Status / Severity | Executor outcomes (+ Events) | Stream to Aggregator/Finding |
| **Finding Emitter** | Allocate/persist `VAL-*` per policy | FAILED (+ WARNING policy U9) | FindingRecord |
| **Deferred Manager** | Record Deferred Items | Deferred Coverage / L7 policy | DeferredItemRecord |
| **Result Aggregator** | Path→File→Package→System rollup | Executions | ValidationResult |
| **Summary Builder** | Run Summary · `schemaComplete` cite | Results · Deferred · Pins | ValidationSummary |
| **Report Adapter** | Package Report Input (no Report SSOT rewrite) | Summary · Findings · Pins | ReportInputPackage |
| **Trace Indexer** | Forward/Reverse Trace pointers | All evidence | TraceView |

---

## 5. Validation Flow (normative order)

Engine **SHALL** follow this sequence for a Validation Run:

```text
1.  Load Catalog
        ↓
2.  Load Register (Pin + Rule Inventory + Dependency Index)
        ↓
3.  Validate Header (Catalog Header Metadata compatibility)
        ↓
4.  Resolve Active Rules (Register State + CoverageClass)
        ↓
5.  Dependency Resolution (cascade plan + skip plan)
        ↓
6.  Rule Scheduling (L1→L7 · intra-L4 Presence→Typing→Domain-check)
        ↓
7.  Execution (per Rule JUDGE · emit Execution Status)
        ↓
8.  Event emission (Engine Event Layer — progress/meta; not Finding)
        ↓
9.  Finding Generation (VAL-* per policy — final Validation results)
        ↓
10. Deferred Recording (non-executed Deferred Rules)
        ↓
11. Result Aggregation
        ↓
12. Summary (incl. schemaComplete rollup citation)
        ↓
13. Report Output (Report Input package)
```

### 5.0 Reinforced result path (Execution → Report)

```text
Execution
  ↓
Event          ← internal progress (Event Bus)
  ↓
Finding        ← final Validation result (VAL-*) when policy applies
  ↓
Summary
  ↓
Report
```

> **v0.1 path** `Execution → Finding` is preserved in meaning.  
> **v0.2** inserts **Event** as the Engine-internal meta step **before** Finding emission.  
> Execution Status set (§10) is **unchanged**.

### 5.1 Early exits

| Condition | Engine behavior |
|-----------|-----------------|
| Header compatibility FAIL | Run **BLOCKED**; emit Events as applicable; no Rule Finding set; record reason |
| Official mode without ACTIVE Handoff | Official Entry denied; `schemaComplete=NOT_RUN` for official claims |
| Catalog Pin missing | BLOCKED |
| Target unreadable | Target-level FAILED/BLOCKED per policy; other Targets MAY continue |

---

## 6. Execution Pipeline

### 6.1 Pipeline Stage vs Engine Execution Pipeline

| Concept | Owner | Engine use |
|---------|-------|------------|
| Pipeline Execution Stages | Pipeline SSOT | Orchestration names Pending — Engine does not hardcode Stage identity as Layer |
| Engine Execution Pipeline | This Design | Steps §5 inside Engine |

### 6.2 Per-Target inner loop

```text
For each Validation Target in Target Set:
  For Layer in L1 → L7:
    For each scheduled Rule at Layer (respecting skip plan):
      if skipped → record SKIPPED / DEFERRED
      else → execute → PASS | FAILED | ERROR | BLOCKED
      if BLOCKER severity on L1/L2 → mark deeper Layers SKIPPED (Framework cascade)
  Aggregate Target Results
```

### 6.3 Modes

| Mode | schemaComplete official claim | Notes |
|------|-------------------------------|-------|
| **Design Dry-run** | Remains **NOT_RUN** for official reliance (U8) | Evidence MAY still be recorded as Design |
| **Official** | Requires ACTIVE Handoff + pins | Full I1–I6 path |

---

## 7. Dependency Resolution

### 7.1 Sources (Consume)

| Source | Rule |
|--------|------|
| Framework §8 | L1/L2 BLOCKER → deeper SKIPPED |
| Catalog Dependency (STEP6-4) | inheritsLayerCascade · prerequisites · skipWhen |
| Register Dependency Index (STEP6-5) | RuleId / DomainFamily / Layer refs |
| Lean Option C | Default Layer cascade + L4 Family chain; overrides when present |

### 7.2 Resolution algorithm (Design — not code)

```text
1. Start with CandidateRuleSet (Active ∩ Coverage In-Run)
2. Apply Layer order L1→L7
3. Within L4: order Presence → Typing → Domain-check (same path)
4. Build SkipPlan:
   - Prior Blocking FAIL ⇒ successors SKIPPED
   - Presence FAIL ⇒ Typing/Domain-check/local REF SKIPPED
   - Coverage Deferred / L7 out of scope ⇒ DEFERRED (Deferred Item), not PASS
5. Emit ExecutionQueue = Rules not skipped/deferred, ordered
```

### 7.3 Blocking vs Deferred (Engine)

| Kind | Trigger | Engine action |
|------|---------|---------------|
| **Blocking cascade** | BLOCKER at L1/L2 (or blockingCandidate) | Mark deeper work SKIPPED |
| **Deferred** | coverageClass/Deferred policy / L7 U3 | Do not execute; Deferred Item |
| **Skip (prereq)** | Predecessor FAIL for same path | SKIPPED |

Engine **SHALL NOT** treat Register State `Deprecated` as Execution SKIPPED by default (policy table later).

---

## 8. Rule Loading

### 8.1 Load Catalog

| Step | Action |
|------|--------|
| Resolve Pin | `catalogPinId` → Catalog Version · Revision |
| Load Header | Catalog Header Metadata fields (STEP6-4 §9.5) |
| Load indices | Domain · Family · Type×Layer · Dependency defaults |
| Load Rule bodies | Statements under Pin (when Catalog bodies exist) |

### 8.2 Load Register

| Step | Action |
|------|--------|
| Load Pin Record | Cite Header — do not redefine |
| Load Rule Records | Filter by catalogVersion/Revision |
| Load Dependency Index | Hybrid embed+index |
| Deny mutation APIs | Engine has RO view only |

### 8.3 Header validation (preflight)

Must verify compatibility of:

- Compatible SPS Version  
- Compatible Framework Version  
- Compatible Validation Pipeline Version  

Mismatch → **BLOCKED** Run (or Target Set abort per options).

---

## 9. Rule Scheduling

### 9.1 Eligibility filter

| Filter | Include when |
|--------|--------------|
| Register State | `Active` (Deprecated: policy optional / transition-only) |
| CoverageClass | `Required` or `Optional` In-Run; `Deferred` → Deferred path |
| Target grain | Package / File / Path per Rule + U2 options |
| Mode | Official vs Design options |

**Exclude:** Draft · Proposed · Approved (not activated) · Archived.

### 9.2 Order

1. Layer L1 → L7  
2. Within Layer: Catalog/Register group order  
3. L4 Family chain: Presence → Typing → Domain-check  
4. Stable tie-break: `ruleId` ascending (Determinism)

### 9.3 Scheduler outputs

| Artifact | Content |
|----------|---------|
| ExecutionQueue | Ordered executable Rules |
| SkipPlan | ruleId → SKIPPED + skipWhen |
| DeferPlan | ruleId → DEFERRED + reason |

---

## 10. Execution Result

### 10.1 Register State vs Execution Status (mandatory distinction)

| Axis | Values | Meaning |
|------|--------|---------|
| **Register State** | Draft · Proposed · Approved · Active · Deprecated · Archived | Inventory lifecycle (STEP6-5) |
| **Execution Status** | See §10.2 | Outcome of one Rule Execution in a Run |

Engine **SHALL** record Execution Status on RuleExecutionRecord.  
Engine **SHALL NOT** change Register State as a side effect of Execution (except separate lifecycle workflows outside Engine JUDGE).

### 10.2 Execution Status (Engine Design)

Aligned to Framework §9 with Engine-facing clarity:

| Execution Status | Meaning | Typical Severity |
|------------------|---------|------------------|
| **PASS** | Evaluation completed; Rule expectation satisfied | ordinarily none / INFO |
| **FAILED** | Evaluation completed; expectation not satisfied | BLOCKER · ERROR · WARNING |
| **SKIPPED** | Not evaluated due to cascade / prereq skip plan | ordinarily none |
| **DEFERRED** | Not evaluated by Deferred policy this Run | none; Deferred Item required |
| **BLOCKED** | Could not start (pin/header/infra/gate) | ordinarily none; reason required |
| **ERROR** | Evaluation attempted but aborted by engine/infrastructure fault (distinct from Rule FAILED) | ops severity; not Rule Outcome Severity |
| **NOT_RUN** | Outside Run scope / never queued | none |

> Framework lists PASS · FAILED · SKIPPED · BLOCKED · NOT_RUN.  
> Engine Design adds **DEFERRED** (explicit deferred path) and **ERROR** (infra fault) for operational clarity.  
> Mapping: DEFERRED evidence also feeds Deferred Item Register; ERROR maps to BLOCKED-like Run health without inventing Rule Severity.

### 10.3 Severity (Rule Outcome property)

When Execution Status = **FAILED**, Severity **SHALL** be present:

BLOCKER · ERROR · WARNING · INFO (Framework meanings unchanged).

Severity is **not** a Register State and **not** an Engine Layer attribute.

### 10.4 RuleExecutionRecord (emit shape — cite STEP6-5)

```text
RuleExecutionRecord {
  runId, ruleId, catalogVersion, catalogRevision
  targetRef, pathRef?
  primaryLayer, domain, family
  executionStatus: PASS|FAILED|SKIPPED|DEFERRED|BLOCKED|ERROR|NOT_RUN
  severity?: BLOCKER|ERROR|WARNING|INFO
  skipWhen? / deferReason?
  evidencePointers?
}
```

---

## 11. Finding Generation

### 11.0 Event → Finding handoff

```text
Executor completes Rule Evaluation
  ↓
Event Bus emits RulePassed | RuleFailed | RuleSkipped | ...
  ↓
Outcome Bus normalizes Execution Status (+ Severity if FAILED)
  ↓
Finding Emitter creates VAL-* ONLY when Finding policy applies
```

| Rule | Statement |
|------|-----------|
| Every Finding **MAY** correlate to prior Events | via runId · ruleId · correlationId |
| Not every Event becomes a Finding | PASS/SKIPPED/DEFERRED Events typically produce no VAL |
| Finding remains the **only** final Validation result object | Events are Engine meta |

### 11.1 When to create Findings

| Trigger | Finding? |
|---------|----------|
| FAILED + BLOCKER / ERROR | **Yes** → `VAL-*` |
| FAILED + WARNING | Per U9 (required vs recommended) — **Pending**; Engine Design supports both modes |
| PASS / SKIPPED / DEFERRED / NOT_RUN | No Finding by default |
| ERROR (infra) | Ops Finding or Run BLOCKED record — not Schema Rule VAL lean |
| Engine Event alone | **Never** sufficient for VAL |

### 11.2 VAL output structure (Design)

```text
FindingRecord {
  valId                    // VAL-* permanent ID
  runId
  ruleId?
  catalogPinId / catalogVersion / catalogRevision
  primaryLayer?
  domain? / family?
  severity
  targetRef / pathRef?
  message / code?
  evidencePointers[]       // paths · snippets refs · artifact ids
  trace {
    forward: Rule · Layer · Target · Path · Run
    reverse: Report claim → this VAL
    schRTrace?             // RO
    fndTrace?              // RO STEP5 pointer only
  }
  createdAt
}
```

### 11.3 Evidence

| Evidence class | Examples |
|----------------|----------|
| Location | package id · file · JSON path |
| Observation | expected vs actual (non-mutating snapshot) |
| Context | Layer · RuleId · Catalog Pin |
| Pointer | artifact URI / hash (RO) |

### 11.4 Trace

Engine Trace Indexer **SHALL** support:

- Forward: Run → RuleExecution → VAL → Target/Path  
- Reverse: Report claim / VAL → Rule · Layer · Pin · Catalog Version  

### 11.5 Summary linkage

Findings contribute to Validation Summary counts and `schemaComplete` rollup **per Framework §10** (algorithms Pending where noted U5/U7).

---

## 12. Report Interface

### 12.1 Engine → Report boundary

Engine produces **ReportInputPackage**; Report SSOT (later) formats OFFICIAL/DRAFT Reports.

```text
ReportInputPackage {
  runId
  catalogPin (Header Metadata cite)
  mode: Design|Official
  targetSetRef
  executions[]
  results[]
  findings[]          // VAL-*
  deferredItems[]
  summary {
    counts
    schemaComplete?: YES|NO|UNDECIDED|NOT_RUN
  }
  traceIndex?
}
```

### 12.2 Rules

| Rule | Statement |
|------|-----------|
| Engine does not own Report narrative | Adapter only |
| Official claims require Official mode + Handoff | Framework Entry |
| Design Dry-run must not claim Active official schemaComplete | U8 |

---

## 13. Extension Point

| Extension Point | Intent | Constraint |
|-----------------|--------|------------|
| **Rule Evaluator Plugins** | Per Domain/Family evaluators | Must emit standard Execution Status |
| **Event Sinks** | Progress UI · structured logs · metrics | Must not invent Findings from Events alone |
| **Skip Policy Hooks** | U11 partial L6 etc. | Cannot redefine Framework cascade |
| **Finding Policy Hooks** | U9 WARNING→VAL | Versioned options |
| **Target Adapters** | Package filesystem / bundle | RO read only |
| **Report Adapters** | Alternate exporters | Same ReportInputPackage |
| **Observability** | Metrics / logs via Event Bus | No semantic change |

Extension **SHALL NOT** mutate Catalog/Register/System JSON.

---

## 14. Namespace Candidates (not finalized)

| Candidate | Use | Notes |
|-----------|-----|-------|
| **SV-R-*** | Rule IDs (Register) | Lean from STEP6-5 |
| **VAL-*** | Findings only | Locked Finding namespace (Framework) |
| **Dual + SCH-R Trace** | Rule ID + SCH-R pointer | Framework §18 |
| **VAL-R-*** for Rules | — | **Rejected lean** (Finding confusion) |

Engine accepts Register `namespaceCandidate` until lock; **no final Namespace decision in STEP6-6 Design**.

---

## 15. Downstream Inputs

### 15.1 STEP6-7 (Implementation) — inputs from this Design

| Input | Implementation use |
|-------|--------------------|
| Architecture · Components · Layers | Module boundaries |
| **Event Bus · Event catalog (§2.3)** | Progress/log wiring · Executor→Outcome decoupling |
| Validation Flow §5 order (incl. Event before Finding) | Control program |
| Dependency Resolution §7 | Scheduler |
| Execution Status set §10.2 | Outcome enum (**unchanged**) |
| Finding / Evidence / Trace §11 | Persistence writers |
| ReportInputPackage §12 | Report integration |
| Extension Points §13 (incl. Event Sinks) | Plugin ports |
| Header preflight | Startup gate |
| Register State eligibility §9.1 | Active filter |

Implementation **SHALL** remain Non-Mutating toward System JSON / Catalog / Register SSOTs.

### 15.2 Still Pending for implementers

Namespace lock · Classification Freeze · Coverage formulas · U5/U7/U9/U11 policy tables · Stage name lock · Schema JSON artifacts.

---

## 16. Pending & Explicit Non-Decisions

| Item | Status |
|------|--------|
| Engine source code / language | **Not in this STEP** |
| Namespace final | **Candidates only** |
| Exact Evaluator algorithms per Domain | Implementation / Catalog bodies |
| Coverage numeric thresholds | Pending |
| WARNING→VAL hard rule | U9 Pending |
| BLOCKER skip → schemaComplete NO vs UNDECIDED | U7 Pending |
| Framework / Pipeline edits | **Forbidden** |
| Runtime / System JSON changes | **Forbidden** |

---

## 17. Design Conclusions

| ID | Statement |
|----|-----------|
| **EN1** | Engine Architecture = Ingress → Planner → Executor → **Event Bus** → Outcome Bus → Finding → Aggregator → Summary → Report Adapter. |
| **EN2** | Normative flow: Load Catalog → Load Register → Validate Header → Active Rules → Dependency → Schedule → Execute → **Event** → Findings → Summary → Report. |
| **EN3** | Dependency = Framework cascade + Catalog/Register refs + L4 Family chain (Option C lean). |
| **EN4** | Execution Status ≠ Register State; DEFERRED/ERROR clarified for Engine ops. (**Unchanged in v0.2.**) |
| **EN5** | Findings = VAL-* with Evidence + Trace; Catalog/Register Consume-only. |
| **EN6** | Implementation deferred; Namespace not locked. |
| **EN7** | **Event ≠ Finding** — Event Layer is Engine meta/progress only; Finding is final Validation result. |

---

## 18. Document Control

| Item | Value |
|------|-------|
| Status | **Design Draft v0.2** (Event Layer reinforced) |
| Next | Engine Design Review → STEP6-7 Implementation (when approved) |
| Unmodified | Framework · Pipeline · STEP6-3 · STEP6-4 · STEP6-5 · Architecture · Runtime · System JSON |
| v0.2 scope | **Engine Event Layer only** — Catalog/Register/Execution Status/Dependency/Coverage/Namespace untouched |

### Consume baselines

- Framework Freeze Candidate (Locked)  
- Pipeline Freeze Candidate (Locked)  
- `STEP6-3_Schema_Rule_Analysis.md` v1.1  
- `STEP6-4_Rule_Catalog_Design.md` v0.2  
- `STEP6-5_Validation_Register_Suite.md` v0.2  

### Revision History

| Version | Date | Change |
|---------|------|--------|
| **v0.1** | 2026-07-17 | Initial Engine Architecture · Flow · Execution Status · Finding · Report Interface |
| **v0.2** | 2026-07-17 | Add **Engine Event Layer** (§2.3) · Flow Execution→Event→Finding · Event≠Finding |

---

*End of STEP6-6_Validation_Engine_Design.md v0.2*
