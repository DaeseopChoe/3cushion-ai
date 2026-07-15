# STEP5_Architecture_Decision_Register.md

```
Document  : STEP5_Architecture_Decision_Register.md
Version   : v1.0
Status    : Active · Architecture Decision Register SSOT
Date      : 2026-07-15
STEP      : STEP5-5
Basis     : STEP5_Architecture_Audit_Framework.md v1.0 Frozen (§8 Decision · §9 Completeness · §12 Exit Gate)
            STEP5_Finding_Register.md · STEP5_Violation_Register.md · STEP5_Recommendation_Register.md
            STEP5-5 Analysis (v1.1)
SPS       : System Platform Standard (SPS) v1.0
Rule      : Final Audit judgment per SYS · Evidence indirect Trace only · No Audit instance records in this doc
```

---

## 1. Purpose

본 문서는 STEP5 Architecture Audit의 **Architecture Decision Register SSOT**이다.

System(`SYS-*`) 단위의 **최종 Architecture Audit 판단**을 기록한다.

### 1.1 Role

| Does | Does not |
|------|----------|
| Aggregate Status · Classification · Completeness | Execute Schema Validation (STEP6) |
| Cite Rules · Findings · Violations · Recommendations | Use Evidence as **direct** Decision input |
| Close Gates G6 / G7 (per SYS → global) | Standardization implementation (STEP7) |
| Record Deferred / conditionalOn | Mutate upstream Registers after Exit PASS |

### 1.2 Evidence Policy

```text
Decision does NOT take Evidence as direct input.
Evidence remains reachable only via Finding → Evidence (indirect Trace).
```

---

## 2. Position in Pipeline

```text
… → FND → VIO → REC → DEC
                      ↑
                this Register
```

**Cardinality:** **exactly one** Architecture Decision per audited `SYS-ID` (Framework).

---

## 3. Decision Input

```text
Decision = f(Audit Rules, Findings, Violations, Recommendations)
```

| Input | Role | Required? |
|-------|------|-----------|
| **Audit Rules** | Normative basis (via ruleRefs / Catalog Version) | Recommended explicit refs |
| **Findings** | Judgment set for SYS | Yes (may be empty set only if Plan allows · normally present when Evidence path ran) |
| **Violations** | Confirmed breaches (0..n **confirmed**, including explicit zero) | Yes (refs; empty list allowed if G4 confirmed) |
| **Recommendations** | REC-F ∪ REC-V | Yes (G5 completeness) |
| **Evidence** | Indirect only via FND | Not a direct field requirement |

---

## 4. Register Policy

| Policy | Statement |
|--------|-----------|
| One DEC per SYS | `DEC-NNN` ↔ single `SYS-NNN` |
| Status ≠ Classification | Both recorded |
| Completeness bag | `packageComplete` Active · others Reserved |
| Exit freeze | After Exit Gate PASS · Registers immutable (Framework Handoff) |
| Determinism | Same inputs + same Catalog Version ⇒ same Decision |

---

## 5. Decision Status

| Status | Meaning |
|--------|---------|
| **COMPLIANT** | No blocking VIO · packageComplete=YES · no mandatory open REC |
| **CONDITIONAL** | No RP-0 open blocker · conditional REC remain |
| **NON_COMPLIANT** | Blocking VIO and/or packageComplete=NO and/or RP-0 unresolved |
| **DEFERRED** | Material issues deferred to STEP6/STEP7 |

Lifecycle Status (Draft/Active/…) is separate from Decision Status — see §10.

---

## 6. Classification

From `System_Audit_Guide` / Framework (aggregate per SYS):

| Classification | Meaning |
|----------------|---------|
| **COMPLIANT** | Meets SPS |
| **MINOR DEVIATION** | Compatible · improvement optional |
| **MAJOR DEVIATION** | Differs from Canonical · migration before Release |
| **NON-COMPLIANT** | Violates SPS · Runtime participation barred until corrected |

Do not auto-equate Decision Status COMPLIANT with Classification COMPLIANT without review.

---

## 7. Completeness Properties

```text
completeness
├── packageComplete      YES | NO | UNDECIDED     ← Active in STEP5
├── schemaComplete       Reserved (STEP6)
├── runtimeComplete      Reserved
└── contractComplete     Reserved
```

| Value | Meaning |
|-------|---------|
| **YES** | Package Completeness norms satisfied per Decision |
| **NO** | Package incomplete per Decision |
| **UNDECIDED** | Decision chain incomplete · **G7 fail** |

**packageComplete** is a **Decision property** — not a separate Register.  
Default evaluation basis: Package four-file Facts + PKG Rules (Framework) · do not silently fold Identity VIOs into packageComplete unless Decision explicitly binds them.

### 7.1 Recommended — packageCompleteBasis

Cite which Rule / Finding / Violation grounds justified `packageComplete`:

```text
packageCompleteBasis: { ruleIds[], findingIds[], violationIds[] }
```

---

## 8. Deferred / conditionalOn

| Field | Meaning |
|-------|---------|
| **deferredTo[]** | STEP6 · STEP7 · FUTURE … |
| **conditionalOn[]** | REC-IDs (or conditions) that keep Status=CONDITIONAL |

---

## 9. ruleRefs / Catalog Version Pin

| Field | Role |
|-------|------|
| **ruleRefs[]** | Audit Rules cited as Decision basis (typically union from FND/VIO paths) |
| **ruleCatalogVersion** | Pin aligning Determinism with Evidence pins |

---

## 10. Permanent ID & Lifecycle

| Item | Rule |
|------|------|
| Format | `DEC-NNN` |
| Permanent · No Reuse | Yes |
| Lifecycle | Draft → Active → Superseded → Deprecated → Archived |
| No delete after Active | Yes |
| Exit PASS | Treat Active DEC as **immutable** for Handoff |

Pre-Exit corrections: new DEC + Supersede (still one Active DEC per SYS).

---

## 11. Exit Gate Link

| Gate | Decision Register role |
|------|------------------------|
| **G6** | One Active Decision per target SYS |
| **G7** | Every target SYS has `packageComplete ∈ {YES, NO}` |

Global Exit PASS requires G1–G7 including G2.5 (Framework).

---

## 12. Record Shape

### 12.1 Required

| Field | Description |
|-------|-------------|
| **DEC-ID** | `DEC-NNN` |
| **SYS-ID** | `SYS-NNN` |
| **decisionStatus** | COMPLIANT · CONDITIONAL · NON_COMPLIANT · DEFERRED |
| **classification** | COMPLIANT · MINOR DEVIATION · MAJOR DEVIATION · NON-COMPLIANT |
| **completeness.packageComplete** | YES · NO · UNDECIDED |
| **findingRefs[]** | FND-IDs (list; may be empty only if explicitly justified) |
| **violationRefs[]** | VIO-IDs (empty allowed if G4 zero confirmed) |
| **recommendationRefs[]** | REC-IDs |
| **Record Status** | Draft · Active · Superseded · Deprecated · Archived |

### 12.2 Recommended

| Field | Description |
|-------|-------------|
| **packageCompleteBasis** | ruleIds / findingIds / violationIds |
| **conditionalOn[]** | Open REC conditions |
| **deferredTo[]** | STEP6 / STEP7 … |
| **ruleRefs[]** | Normative Rule IDs |
| **ruleCatalogVersion** | Catalog pin |
| **supersededBy** | Successor DEC |

### 12.3 Optional

| Field | Description |
|-------|-------------|
| evidenceTraceNote | Human hint that Trace goes FND→EVD |
| Notes | Non-implementation |

### 12.4 Forbidden

| Forbidden | Reason |
|-----------|--------|
| Direct EVD-ID as required Decision input | Indirect Trace only |
| Setting schemaComplete as Active STEP5 result | Reserved · STEP6 |
| Fact / OBS / JSON edits | Wrong layer |
| Multiple Active DEC per SYS | One Decision per SYS |

---

## 13. Trace Policy

### Forward

```text
OBS → MAP → EVD → FND → VIO → REC → DEC
```

### Reverse

```text
DEC
 → REC (recommendationRefs)
 → VIO (violationRefs)
 → FND (findingRefs)
 → EVD
 → Rule (+ ruleCatalogVersion)
 → Fact
 (+ MAP)
```

Evidence remains **indirect**.

---

## 14. Example Shape (Conceptual Only)

```text
DEC-ID                         : DEC-NNN      # placeholder — no instance allocated
SYS-ID                         : SYS-NNN
decisionStatus                 : CONDITIONAL
classification                 : MINOR DEVIATION
completeness.packageComplete   : YES
completeness.schemaComplete    : (Reserved)
packageCompleteBasis           : { ruleIds: [PKG-R-001], findingIds: [], violationIds: [] }
findingRefs[]                  : [FND-NNN]
violationRefs[]                : []
recommendationRefs[]           : [REC-NNN]
conditionalOn[]                : [REC-NNN]
deferredTo[]                   : []
ruleRefs[]                     : [PKG-R-001]
ruleCatalogVersion             : v1.0
Record Status                  : Active
```

---

## 15. STEP6 / STEP7 Handoff

| Consumer | Use |
|----------|-----|
| STEP6 | deferredTo · SCH-related context · does not rewrite DEC after Exit PASS |
| STEP7 | decisionStatus · classification · recommendationRefs · packageComplete |
| Report | Decision Summary · packageComplete Summary |

---

## 16. Non-Contents

Actual DEC-001 / per-SYS Audit results · schemaComplete final values · upstream document edits · code/JSON

---

## 17. Revision History

| Version | Status | Content |
|---------|--------|---------|
| **v1.0** | **Active** | Decision Register SSOT · Inputs · Completeness · Gates · Trace |

---

*End of STEP5_Architecture_Decision_Register.md v1.0*
