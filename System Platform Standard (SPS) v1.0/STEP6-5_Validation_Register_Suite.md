# STEP6-5_Validation_Register_Suite.md

```text
Document  : STEP6-5_Validation_Register_Suite.md
Version   : v0.2
Status    : Design Complete (Register Suite · State/Lifecycle Reinforced · Not Engine)
Date      : 2026-07-17
STEP      : STEP6-5
Owner     : Schema Validation
Type      : Validation Register Suite Design (Design Only)
Baseline  : Framework Freeze Candidate (Locked · Consume)
            Pipeline Freeze Candidate (Locked · Consume)
            STEP6-3 Analysis v1.1 (Completed · Consume)
            STEP6-4 Rule Catalog Design v0.2 (Completed · Consume)
Rule      : Design Only · No Engine · No Runtime · No Schema JSON · No bulk Rule data
            · No Framework/Pipeline/Catalog Design rewrite
Revision  : v0.2 — Register State / Lifecycle reinforcement · STEP6-5 Complete
```

---

## 0. Design Status

| Item | Status |
|------|--------|
| **Mode** | **Design Complete (v0.2)** — Register Suite + State/Lifecycle |
| **Framework / Pipeline** | Locked · **Consume Only** |
| **STEP6-3 / STEP6-4** | Completed · **Consume Only** |
| **Register field shapes** | **Designed** · Suite Complete for Design track |
| **Register State / Lifecycle** | **Defined (§7)** |
| **Rule ID scheme** | **Designed (Register view)** · No bulk IDs minted |
| **Namespace** | **Candidates only** · Final lock deferred (STEP6-6+) |
| **Engine / Runtime / Schema JSON / Execution** | **Out of scope** |

---

## 1. Register Purpose

### 1.1 Why Registers exist

Validation Register Suite는 Catalog에 정의된 Schema Validation Rules와 Run evidence를 **관리·추적·참조**하기 위한 공식 Registry이다.

| Registers SHALL | Registers SHALL NOT |
|-----------------|---------------------|
| Persist / cite Rule records against Catalog Header Metadata | Redefine Catalog Domain · Family · Layer · Type meanings |
| Support Traceability (Forward / Reverse) per Framework | Redefine Framework Status · Severity · `schemaComplete` |
| Record Run evidence linked to Catalog Version / Revision | Redefine Pipeline Flow semantics |
| Hold `VAL-*` Finding identities (Finding Register) | Mutate STEP4 Facts · STEP5 Suite · System JSON · Runtime |
| Cite Catalog Header compatibility fields | Invent a second Rule semantic SSOT |

### 1.2 Suite position

```text
Framework (Locked)
        ↓
Pipeline (Locked)
        ↓
STEP6-3 Analysis v1.1
        ↓
STEP6-4 Catalog Design v0.2   ← Rule structure · Header Metadata
        ↓
STEP6-5 Register Suite        ← THIS DOCUMENT (persistence / registry)
        ↓ later
STEP6-6+ Engine               ← executes under pins; reads Registers/Catalog
```

### 1.3 Questions Registers answer

```text
Which Catalog Version/Revision was used?
Which Rule records were in scope?
What Dependency / Coverage / Classification candidates applied?
What Executions / Results / VAL / Deferred items were produced?
How do we reverse-trace a Report claim to Rule · Layer · Path?
```

---

## 2. Register Composition Principles

| ID | Principle | Statement |
|----|-----------|-----------|
| **RP1** | **Catalog is semantic SSOT for Rules** | Registers store/cite; Catalog owns Domain×Family·Type·Layer design. |
| **RP2** | **Header Metadata cite-only** | Catalog Version · Revision · Compatible SPS/Framework/Pipeline · Generated From · Last Updated are **referenced**, never redefined (STEP6-4 §9.5). |
| **RP3** | **Layer binding preserved** | Rule records carry `primaryLayer`; no Stage-name binding. |
| **RP4** | **Finding ≠ Rule identity** | `VAL-*` = Finding namespace; Rule IDs = Catalog/Register Rule identity. |
| **RP5** | **Determinism pins recorded** | Official Runs record Catalog Pin + compatible baseline citations. |
| **RP6** | **Non-mutation** | Registers record JUDGE outcomes; do not rewrite packages. |
| **RP7** | **Suite, not single table** | Multiple Registers with clear owners and join keys. |
| **RP8** | **Classification candidates persistable** | Severity/Blocking/Deferred fields allowed as **recorded values**; axis lock remains Catalog Freeze concern. |
| **RP9** | **No Engine inside Registers** | Registers do not schedule Rules; Engine later consumes them. |
| **RP10** | **Namespace undecided** | ID prefix candidates only; final Namespace after STEP6-6+ policy. |

---

## 3. Register Suite Structure

### 3.1 Register inventory (Design)

| Register | Purpose | Primary keys (conceptual) |
|----------|---------|---------------------------|
| **Catalog Pin Register** | Frozen citation of Catalog Header Metadata for a Run / program slice | `catalogPinId` · Catalog Version · Revision |
| **Rule Register** | Persistent Rule Record inventory (metadata + lifecycle) | `ruleId` · Catalog Version/Revision |
| **Rule Dependency Index** | Normalized Dependency / Cascade references | `ruleId` · prereq refs |
| **Validation Run Register** | One Validation Run unit | `runId` |
| **Rule Execution Register** | Per Rule Execution outcomes | `runId` · `ruleId` · target/path |
| **Validation Result Register** | Aggregated Results (path/file/package/system) | `runId` · result grain id |
| **Finding Register (`VAL-*`)** | Persistent Validation Findings | `valId` |
| **Deferred Item Register** | Deferred Validation Items | `deferredId` · `runId` |
| **Summary Register** | Run Summary · `schemaComplete` rollup citation | `runId` |

> Field layouts are **Design shapes**. Exact columns / storage format = Freeze later (align U12).

### 3.2 Suite diagram

```text
Catalog Header Metadata (Catalog SSOT · cite-only)
        ↓ pin
Catalog Pin Register
        ↓
Rule Register ──► Rule Dependency Index
        ↓
Validation Run Register
        ├── Rule Execution Register
        ├── Validation Result Register
        ├── Finding Register (VAL-*)
        ├── Deferred Item Register
        └── Summary Register (schemaComplete)
```

### 3.3 Out of suite (explicit)

| Not a STEP6-5 Register | Owner |
|------------------------|-------|
| STEP5 Finding / Decision Registers | STEP5 Frozen (RO pointers only) |
| Runtime Registry (`getSystemContract`) | Runtime — different Registry |
| Engine job queue / scheduler state | STEP6-6+ |

---

## 4. Rule Record Structure

### 4.1 Rule Record = Register row for one Catalog Rule

Rule Register holds **one Rule Record per `ruleId` within a Catalog Version/Revision scope**.

### 4.2 Required field groups

| Group | Fields (Design names) | Source |
|-------|----------------------|--------|
| **Identity** | `ruleId` · `ruleRevision` · `namespaceCandidate` | Register ID policy (§6) |
| **Catalog Reference** | `catalogVersion` · `catalogRevision` · `catalogPinId?` · `generatedFrom?` | Catalog Header cite |
| **Classification (structural)** | `domain` · `family` · `primaryLayer` · `ruleType` | Catalog Design |
| **Optional tags** | `fileAffinity?` | Catalog T-* tags |
| **Coverage** | `coverageClass` · `completenessImpact?` | Catalog Coverage expression |
| **Dependency** | `dependencyRef` / embedded `RuleDependency` | Catalog Dependency (§8 Design) |
| **Classification candidates** | `severityDefault?` · `blockingCandidate?` · `deferredCandidate?` · `optionalFlag?` · `warningPolicyRef?` | Catalog candidates — not locked enums |
| **Lifecycle** | `status` · `effectiveFrom?` · `retiredAt?` | §7 |
| **Versioning** | `ruleVersion` · `ruleRevision` | §6 · align Catalog Versioning lean |
| **Evidence hooks** | `evidencePointers[]` · `lastExecutionRef?` | Links to Execution/Result/VAL |
| **Trace** | `schRTrace?` · `notes?` | Framework §18 RO |

### 4.3 Canonical Rule Record sketch (shape-free)

```text
RuleRecord {
  // Identity
  ruleId: RuleId                      // Register-view ID scheme
  ruleVersion: string
  ruleRevision: string
  namespaceCandidate?: NamespaceCandidate

  // Catalog Reference (cite Header — do not redefine)
  catalogVersion: string
  catalogRevision: string
  catalogPinId?: string
  compatibleSpsVersion?: string       // optional denormalized cite
  compatibleFrameworkVersion?: string
  compatiblePipelineVersion?: string

  // Structural axes (Catalog)
  domain: D-*
  family: F-*
  primaryLayer: L1..L7
  ruleType: Package|Syntax|Structure|Required|Type|Domain|Reference|Cross-file|Semantic
  fileAffinity?: T-*

  // Coverage
  coverageClass: Required|Optional|Deferred
  completenessImpact?: Affects|DoesNot|UndecidedPolicy

  // Dependency (reference structure)
  dependency: {
    inheritsLayerCascade: boolean
    prerequisites: DependencyRef[]
    skipWhen: SkipConditionRef[]
    blockingCandidate?: yes|no|inherit
    deferredCandidate?: yes|no|policy
  }

  // Classification candidates (persistable; not locked)
  severityDefault?: BLOCKER|ERROR|WARNING|INFO
  optionalFlag?: boolean
  warningPolicyRef?: pending

  // Lifecycle — Register State (§7) · NOT Execution Status
  registerState: Draft|Proposed|Approved|Active|Deprecated|Archived
  supersedesRuleId?: RuleId
  supersededByRuleId?: RuleId
  // optional: Superseded may be recorded via supersededByRuleId while state=Deprecated|Archived

  // Evidence / ops
  evidencePointers?: EvidenceRef[]
  notes?: string
  schRTrace?: string                  // SCH-R-* RO
  lastUpdated?: date
}
```

### 4.4 Field name flexibility

Design names above are normative **intent**. Freeze may rename columns if:

- Catalog Header field names remain cite-compatible  
- Domain / Family / Layer / Type semantics unchanged  
- `VAL-*` remains Finding-only  

---

## 5. Rule Metadata

### 5.1 Metadata vs Catalog Header

| Kind | Owner | Register treatment |
|------|-------|--------------------|
| **Catalog Header Metadata** | Catalog SSOT | Cite on Pin + optional denormalize on RuleRecord |
| **Rule Metadata** | Rule Register | Per-rule Domain/Family/Layer/Coverage/Dependency/Lifecycle |
| **Run Metadata** | Run Register | Pins · Target Set · Validator Version · Options |
| **Outcome Metadata** | Execution / Result / VAL | Status · Severity · paths · timestamps |

### 5.2 Catalog Header fields Registers must be able to cite

From STEP6-4 §9.5 (unchanged meanings):

| Header field | Register use |
|--------------|--------------|
| Catalog Version | Pin + RuleRecord.catalogVersion |
| Catalog Revision | Pin + RuleRecord.catalogRevision |
| Compatible SPS Version | Pin / Run baseline cite |
| Compatible Framework Version | Pin / Run baseline cite |
| Compatible Validation Pipeline Version | Pin / Run baseline cite |
| Generated From | Pin provenance |
| Last Updated | Pin / Catalog snapshot audit |

### 5.3 Classification candidate persistence

Registers **MAY** store candidate values supplied by Catalog for a Rule.  
Registers **SHALL NOT** declare the Classification Axis **frozen** by storing values.

---

## 6. Rule Version Policy

### 6.1 Alignment with Catalog Header

```text
Catalog Version / Revision     ← Catalog-level snapshot identity
        ↓ cited by
Catalog Pin Register
        ↓ scopes
Rule Register rows (ruleId @ catalogVersion/revision)
        ↓
ruleVersion / ruleRevision     ← per-Rule change identity inside that Catalog scope
```

| Rule | Statement |
|------|-----------|
| **No redefine** | Register does not invent alternate Catalog Version semantics |
| **Pin first** | Official evidence cites Pin → Header Version/Revision |
| **Rule-level revision** | Statement/metadata change → `ruleRevision` bump; breaking Rule meaning → `ruleVersion` bump (lean) |
| **Supersession** | Prefer new Active Rule + `supersedesRuleId` over silent rewrite of retired IDs |

### 6.2 Lean bump guide (Design — not Freeze)

| Change | Catalog Header | RuleVersion / Revision |
|--------|----------------|------------------------|
| Header Last Updated only | Revision or Last Updated | unchanged |
| Compatible Framework bump without Rule text change | Version/Revision per Catalog policy | cite new Pin; Rules may stay |
| Rule statement edit | Catalog Revision (typical) | ruleRevision++ |
| Rule Layer/Domain rebind | Catalog Version (typical) | ruleVersion++ · Review |
| Namespace lock (future) | Catalog Version | migration note — not done here |

### 6.3 Immutability of cited Pins

Once an Official Run records `catalogPinId`, that Pin’s Header citation **SHALL** remain immutable for that Run’s evidence trail.

---

## 7. Register State / Lifecycle

### 7.0 Purpose and boundary

**Register State**는 Rule의 **실행 여부(Execution Status)** 가 아니다.

| Concept | Meaning | Owner |
|---------|---------|-------|
| **Register State** | Rule Register에서 Rule이 **관리되는 생명주기** | STEP6-5 Register Suite |
| **Execution Status** | 한 Run에서 Rule이 PASS/FAILED/SKIPPED/… 인지 | Framework §9 · Execution Register |
| **CoverageClass Deferred** | 이번 Run에서 평가 연기 | Catalog Coverage · Deferred Item |
| **Blocking / Cascade Skip** | 선행 실패로 평가 생략 | Framework cascade · Dependency |

```text
Register State     → may this Rule be selected / managed as inventory?
Execution Status   → what happened when (if) it was evaluated in a Run?
```

Engine 실행 로직·스케줄러는 **설계하지 않는다**.

### 7.1 Register State set

| State | Meaning (관리 관점) |
|-------|---------------------|
| **Draft** | Register에 초안 등록. Catalog 축만 스케치; Official Pin 대상 아님. |
| **Proposed** | 설계 검토 제출. Review 대기; Official 실행 집합 아님. |
| **Approved** | Review 통과. 아직 Pin의 Active 집합에 넣기 전(또는 다음 Pin 대기). |
| **Active** | 현재 Catalog Pin 기준 **관리상 활성** — Official/Design Run 바인딩 후보. |
| **Deprecated** | 이행 기간 유지. 후속 Rule 권장; 신규 의존 금지 lean. |
| **Archived** | 실행 후보에서 제외. 이력·Trace용으로만 보존. |

> 이전 Draft(v0.1)의 `Retired` → **Archived**로 명칭 정렬.  
> `Superseded`는 별도 State가 아니라 `supersededByRuleId` 관계 + Deprecated/Archived로 표현한다.

### 7.2 Entry conditions

| State | 진입 조건 (lean) |
|-------|------------------|
| **Draft** | RuleRecord 생성 · Domain/Family/Layer/Type 최소 축 존재 |
| **Proposed** | Draft 완성도 충족 · 제출/Review 요청 기록 |
| **Approved** | Design/Catalog Review PASS (프로젝트 Review 절차) |
| **Active** | Approved + 해당 Catalog Pin에 포함(또는 Pin 갱신으로 활성화) |
| **Deprecated** | 후속 Rule 지정 또는 폐기 예고 · Active에서 강등 |
| **Archived** | Deprecated 종료 또는 즉시 보관 결정 · 실행 후보 제거 |

### 7.3 Allowed transitions

```text
Draft ──► Proposed ──► Approved ──► Active ──► Deprecated ──► Archived
  │                      │            │
  └──────────────────────┴────────────┴──► Archived (exceptional withdraw)
Proposed ──► Draft          (reject / revise)
Approved ──► Proposed       (re-open review · rare)
Active ──► Archived         (emergency withdraw · recorded)
```

| From | To | Notes |
|------|-----|-------|
| Draft | Proposed | Submit for review |
| Proposed | Approved | Review PASS |
| Proposed | Draft | Review reject / revise |
| Approved | Active | Included in Catalog Pin / activation |
| Active | Deprecated | Prefer successor (`supersededByRuleId` optional) |
| Deprecated | Archived | End of transition window |
| Draft / Proposed / Approved | Archived | Withdraw without activation |
| Active | Archived | Exceptional; must record reason in `notes` |

**Forbidden lean:** Archived → Active (use new `ruleId` + `supersedesRuleId` instead of resurrecting).

### 7.4 Link to RuleRecord

| RuleRecord field | Role |
|------------------|------|
| `registerState` | Current Register State (§7.1) |
| `supersedesRuleId` / `supersededByRuleId` | Replacement graph (not a State) |
| `ruleVersion` / `ruleRevision` | Content identity (§6) — independent of State |
| `catalogVersion` / `catalogRevision` | Catalog Header cite — independent of State |

### 7.5 State vs Run eligibility (Design note — not Engine)

| Register State | Typical eligibility for Official binding |
|----------------|------------------------------------------|
| Draft / Proposed | **No** |
| Approved | **No** until Pin activation → Active |
| Active | **Yes** (subject to Coverage / Deferred / Dependency) |
| Deprecated | **Maybe** transition-only (policy later) |
| Archived | **No** |

Coverage Deferred / Execution SKIPPED는 State와 **직교**한다: Active Rule도 Deferred 또는 SKIPPED일 수 있다.

### 7.6 Lifecycle vs Coverage Deferred (restated)

| Concept | Meaning |
|---------|---------|
| `registerState=Archived` | Rule not in managed executable inventory |
| `coverageClass=Deferred` | Rule may be Active but not executed this Run |
| Execution `SKIPPED` | Cascade / prereq — not Register State |

---

## 8. Rule Dependency Reference Design

### 8.1 Principle

Registers **reference** STEP6-4 Dependency / Cascade / Coverage structures; they do not re-specify Framework cascade semantics.

### 8.2 DependencyRef kinds

| Ref kind | Points to | Example |
|----------|-----------|---------|
| **LayerRef** | `L1`…`L7` | inheritsLayerCascade |
| **DomainFamilyRef** | `D-*` × `F-*` | Field×Presence before Field×Typing |
| **RuleGroupRef** | named group id (Catalog) | `L4-Presence-Chain` |
| **RuleIdRef** | specific `ruleId` | optional override |
| **SkipConditionRef** | AbsenceOfPath · PriorBlocker · PolicyDefer · U11Partial | Analysis vocabulary |

### 8.3 Storage options (Design lean)

| Option | Description | Recommendation |
|--------|-------------|----------------|
| **Embed** | `dependency` object on RuleRecord | Default for readability |
| **Index table** | Rule Dependency Index rows | For query / Engine join |
| **Hybrid** | Embed + Index generated | **Lean recommendation** |

### 8.4 Cascade recording (evidence side)

| Event | Where recorded |
|-------|----------------|
| Blocking FAIL at L1/L2 | Rule Execution + Result; successors SKIPPED |
| Intra-L4 Presence→Typing→Domain-check Skip | Execution SKIPPED + skipWhen cite |
| Deferred Semantic | Deferred Item Register (not silent PASS) |

Engine implements scheduling later; Registers only **need fields** to store outcomes and refs.

---

## 9. Catalog ↔ Register Relationship

### 9.1 Authority split

| Concern | Catalog | Register |
|---------|---------|----------|
| Domain / Family / Type / Layer design | **Owner** | Cite |
| Header Metadata meanings | **Owner** | Cite / Pin |
| Rule statements (future bodies) | **Owner** | Snapshot/cite under Pin |
| Persistent Rule inventory + lifecycle | Input | **Owner** |
| Run evidence · VAL · Deferred · Summary | — | **Owner** |
| Namespace final lock | Candidate in Catalog policy | Stores `namespaceCandidate` until lock |

### 9.2 Binding rule

```text
Catalog Design / future Catalog SSOT
        ↓ defines
Rule semantic axes + Header Metadata
        ↓ pinned
Catalog Pin Register
        ↓ materializes / indexes
Rule Register (Rule Records)
        ↓ executed under Pipeline
Execution / Result / VAL Registers
```

### 9.3 Anti-patterns

| Forbidden | Why |
|-----------|-----|
| Register invents new Domain/Family | Breaks Catalog SSOT |
| Register changes Compatible Framework Version meaning | Header cite-only violation |
| Register uses Stage names as Layer | Pipeline/Framework Consume violation |
| Finding ID reused as Rule ID | Namespace confusion |

---

## 10. Rule ID Policy (Register view)

### 10.1 Goals

- Stable citation across Runs  
- Separable from `VAL-*`  
- Compatible with future Namespace lock without rewriting evidence history  

### 10.2 ID scheme (Design — no bulk minting)

**Illustrative form (not locked Namespace):**

```text
RuleId ::= <PREFIX> "-" <LAYER> "-" <SEQ>

Examples (illustrative only):
  SV-R-L1-001
  SV-R-L4-014
```

| Element | Design intent |
|---------|---------------|
| **PREFIX** | Namespace candidate (§11) |
| **LAYER** | Primary Layer token `L1`…`L7` (optional but useful) |
| **SEQ** | Monotonic per Catalog Version scope (or per Layer) |

### 10.3 ID rules

| Rule | Statement |
|------|-----------|
| **Permanent once Active under Pin** | Do not reuse IDs for different meanings |
| **No Version inside ID** | Version/Revision are fields — not `…-v2` suffix |
| **No VAL reuse** | `VAL-*` never equals RuleId |
| **No SCH-R identity merge** | SCH-R Trace is pointer; RuleId remains STEP6 |
| **Bulk generation deferred** | This STEP defines scheme only |

### 10.4 Allocation owner

| Phase | Owner |
|-------|-------|
| Design / Proposed | Catalog authoring process (future) |
| Active under Official Pin | Schema Validation (Register authority) |
| Engine | Consumes IDs; does not allocate casually |

---

## 11. Namespace Candidates (not finalized)

| Candidate | Form sketch | Notes |
|-----------|-------------|-------|
| **A. SV-R-*** | `SV-R-L4-001` | STEP6 Validation Rule lean |
| **B. SCH-R-* execute** | Reuse STEP5 IDs | Discouraged by Analysis (Audit vs Validation blur) |
| **C. Dual** | STEP6 ID + SCH-R Trace | Aligns Framework §18 Trace |
| **D. VAL-R-*** | `VAL-R-…` | **Rejected lean** — confuses Finding `VAL-*` |

**Design lean recommendation:** Candidate **A or C**; **final lock deferred to STEP6-6+**.  
Registers store `namespaceCandidate` until lock.

---

## 12. Ancillary Register Sketches (minimal)

### 12.1 Catalog Pin Record

```text
CatalogPinRecord {
  catalogPinId
  catalogVersion
  catalogRevision
  compatibleSpsVersion
  compatibleFrameworkVersion
  compatiblePipelineVersion
  generatedFrom
  lastUpdated
  pinnedAt
  mode?: Design|Official
}
```

### 12.2 Validation Run Record (evidence spine)

```text
ValidationRunRecord {
  runId
  catalogPinId
  validatorVersionPin?
  runtimeBaseline?
  targetSetRef
  executionOptions?
  activeHandoffRef?          // Official Entry
  startedAt / closedAt
  schemaComplete?: YES|NO|UNDECIDED|NOT_RUN
}
```

### 12.3 Rule Execution Record

```text
RuleExecutionRecord {
  runId
  ruleId
  catalogVersion / catalogRevision   // denormalized cite
  targetRef / pathRef?
  primaryLayer
  executionStatus: PASS|FAILED|SKIPPED|BLOCKED|NOT_RUN
  severity?: BLOCKER|ERROR|WARNING|INFO
  skipWhen?: SkipConditionRef
  evidencePointers?
}
```

### 12.4 Finding Record

```text
FindingRecord {
  valId                        // VAL-*
  runId
  ruleId?
  primaryLayer?
  severity?
  targetRef / pathRef?
  message?
  schRTrace? / fndTrace?       // RO pointers only
}
```

Exact Finding allocation policy remains Framework §11 + U6/U9 Pending.

---

## 13. Register Extension Strategy

| Extension | Handling |
|-----------|----------|
| New RuleRecord under existing axes | Append under new/updated Catalog Pin |
| New Register table (e.g. Occurrence) | Suite minor Design Review |
| Change Header field meanings | **Forbidden** — Catalog Design / ADR |
| Engine-specific columns | Keep out of core Suite; Engine-local |
| Namespace lock migration | Versioned Pin + mapping appendix — future STEP |

---

## 14. Downstream Inputs

### 14.1 STEP6-6 (Validation Engine) — inputs from this Design

| Input | Engine use |
|-------|------------|
| Catalog Pin Record | Resolve Catalog Version/Revision + compatibility |
| Rule Register Active set | Rule selection |
| Dependency refs / Index | Scheduling · Skip · Cascade recording |
| CoverageClass / Deferred | Run vs Deferred Item |
| RuleExecution / Result shapes | Emit evidence |
| Finding Register VAL-* | Persist findings |
| Namespace candidates | Temporary ID acceptance until lock |
| Header compatibility fields | Pre-flight mismatch reject |

Engine **SHALL NOT** be designed in this STEP.  
Engine **SHALL** later Consume Pipeline orchestration + Catalog Pin + Register Suite.

### 14.2 Report / Freeze (later)

| Input | Use |
|-------|-----|
| Summary Register · schemaComplete | Report aggregates |
| Pin + Rule citations | Official attestation |

---

## 15. Pending & Explicit Non-Decisions

| Item | Status |
|------|--------|
| Namespace final lock | **Deferred STEP6-6+** |
| Bulk Rule ID minting / Rule bodies | **Not in this STEP** |
| Classification Axis Freeze | Catalog Freeze concern |
| U12 exact Pin table UI/layout | Pending |
| Coverage numeric formulas | Pending |
| Engine algorithms / Schema JSON / Runtime | Out of scope |
| VAL cross-run identity (U6) | Pending |
| WARNING→VAL (U9) | Pending |
| Framework / Pipeline edits | **Forbidden** |

---

## 16. Design Conclusions

| ID | Statement |
|----|-----------|
| **R1** | Register Suite persists/cites Catalog Rules and Run evidence; Catalog remains semantic SSOT. |
| **R2** | Catalog Header Metadata is cite-only via Pin + optional denormalization. |
| **R3** | RuleRecord carries Domain·Family·Layer·Type·Coverage·Dependency·**registerState**·Version. |
| **R4** | Rule ID scheme is Register-view (`PREFIX-LAYER-SEQ` lean); no bulk data. |
| **R5** | Namespace = candidates only (A/C lean); lock deferred. |
| **R6** | Dependency is reference structure (embed + index lean), Cascade semantics stay Framework. |
| **R7** | Engine / Runtime / Schema JSON / execution intentionally not designed here. |
| **R8** | Register State = Draft→Proposed→Approved→Active→Deprecated→Archived; orthogonal to Execution Status. |

---

## 17. Document Control

| Item | Value |
|------|-------|
| Status | **Design Complete v0.2** (Register Suite + State/Lifecycle) |
| Next | **STEP6-6 Validation Engine Design** |
| Unmodified | Framework · Pipeline · STEP6-3 · STEP6-4 · Architecture · Runtime · System JSON |

### Consume baselines

- Framework Freeze Candidate (Locked)  
- Pipeline Freeze Candidate (Locked)  
- `STEP6-3_Schema_Rule_Analysis.md` v1.1  
- `STEP6-4_Rule_Catalog_Design.md` v0.2  

### Revision History

| Version | Date | Change |
|---------|------|--------|
| **v0.1** | 2026-07-17 | Initial Register Suite Design |
| **v0.2** | 2026-07-17 | **§7 Register State / Lifecycle** reinforcement · STEP6-5 Complete |

---

*End of STEP6-5_Validation_Register_Suite.md v0.2*
