# STEP5_Violation_Register.md

```
Document  : STEP5_Violation_Register.md
Version   : v1.0
Status    : Active · Violation Register SSOT
Date      : 2026-07-15
STEP      : STEP5-5
Basis     : STEP5_Architecture_Audit_Framework.md v1.0 Frozen
            STEP5_Finding_Register.md v1.0
            STEP5_Evidence_Register.md v1.0
            STEP5-5 Analysis (v1.1)
SPS       : System Platform Standard (SPS) v1.0
Rule      : Separate promotion Register · Does not mutate Finding · No Audit instance records in this doc
```

---

## 1. Purpose

본 문서는 STEP5 Architecture Audit의 **Violation Register SSOT**이다.

Finding 중 **Audit Rule 위반으로 확정(승격)** 된 항목을 별도 레코드로 관리한다.

### 1.1 Role

| Does | Does not |
|------|----------|
| Confirm Rule violation from Finding | Modify / overwrite Finding Statement |
| Cite Violated Rule IDs ⊆ EVD Rule Anchors | Introduce new Rules not on Evidence |
| Feed REC-V (required) and Decision | Implement Migration · change JSON/code |
| Support Gate G4 | Replace Finding Register |

### 1.2 Separate Register — Not Finding Mutation

```text
Finding record     = immutable judgment artifact (except Lifecycle)
Violation record   = separate promotion artifact
```

**Violation is not an in-place edit of Finding.**  
Finding may update `disposition = VIOLATION_RAISED` as a status projection; Statement/EVD refs stay.

---

## 2. Position in Pipeline

```text
… → EVD → FND → VIO → REC-V → DEC
                 ↑
           this Register
```

---

## 3. Promotion Conditions

```text
Active Finding
  ∧ Finding interprets cited Evidence as Fail against Rule R
  ∧ R ∈ union(cited EVD.Rule Anchors)
  ⇒ Violation MAY be created for R (or R-set policy below)

R ∉ EVD Rule Anchors
  ⇒ Violation FORBIDDEN (no new Rule)
```

### 3.1 Cardinality

**1 Finding → 0..N Violations** (allowed / recommended).

| N | Meaning |
|---|---------|
| 0 | Explicit NO_VIOLATION disposition on Finding · counts as G4 “confirmed zero” |
| 1 | Single Rule confirmed |
| N | Prefer one VIO per Violated Rule for Trace clarity |

---

## 4. Register Policy

| Policy | Statement |
|--------|-----------|
| Separate SSOT | Never fold Violation into Finding body |
| Rule subset | Violated Rules ⊆ Evidence Rule Anchors of cited FND |
| REC-V | Each Active VIO requires ≥ 1 REC-V (Framework Dual Path) |
| Guidance elsewhere | Violation confirms breach · Recommendation guides migration |
| Determinism | Same FND + same Rules ⇒ same VIO set under fixed promotion rules |

---

## 5. Permanent ID Policy

| Item | Rule |
|------|------|
| Format | `VIO-NNN` |
| Permanent · No Reuse | Yes |
| No Version in ID | Yes |
| Correction | New VIO + Supersede |

---

## 6. Lifecycle

```text
Draft → Active → Superseded → Deprecated → Archived
```

| Status | Notes |
|--------|-------|
| Draft | Not counted for G4 / REC-V obligation |
| Active | Counts for G4 · requires REC-V · citable by DEC |
| Superseded | `supersededBy` required |
| Deprecated / Archived | Historical |

**No delete after Active.**  
If Finding is Superseded, related Active VIOs should be Superseded or re-anchored via new chain.

---

## 7. Severity

Usually inherits or refines Finding Severity (A–D).  
May not be weaker than Finding without justification note (optional).

---

## 8. Record Shape

### 8.1 Required

| Field | Description |
|-------|-------------|
| **VIO-ID** | `VIO-NNN` |
| **FND-ID** | Source Finding |
| **SYS-ID** | `SYS-NNN` (must match Finding) |
| **Violated Rule ID(s)** | ⊆ EVD Rule Anchors of FND |
| **Severity** | A · B · C · D |
| **Status** | Draft · Active · Superseded · Deprecated · Archived |

### 8.2 Recommended

| Field | Description |
|-------|-------------|
| **EVD-ID[]** | Denormalized Evidence cited by FND (Trace convenience) |
| **ruleCatalogVersion** | From Evidence pins |
| **failureRef** | Pointer to Rule Statement Failure Interpretation |
| **supersededBy** | Successor VIO-ID |

### 8.3 Optional

| Field | Description |
|-------|-------------|
| Notes | Non-implementation commentary |

### 8.4 Forbidden

| Forbidden | Reason |
|-----------|--------|
| Mutating Finding Statement | Separate Register |
| New Rule IDs | No Rule re-bind |
| Migration code / JSON patches | Guidance is REC |
| packageComplete | Decision property only |

---

## 9. Rule Reference Policy

```text
Violated Rule IDs
  ⊆ ⋃ EVD.RuleAnchors for EVD ∈ Finding.EVD-ID[]
```

Sole Rule Source remains Rule Catalog (via Evidence).  
Ad-hoc violated “rules” forbidden.

---

## 10. Trace Policy

### Forward

```text
OBS → MAP → EVD → FND → VIO → REC → DEC
```

### Reverse

```text
DEC → REC → VIO → FND → EVD → Rule → Fact
```

---

## 11. Outputs (Consumers)

| Consumer | Use |
|----------|-----|
| Recommendation Register | REC-V required |
| Architecture Decision | violationRefs · Status influence |
| Gate G4 / G5 | Confirmation · REC-V completeness |
| STEP7 | Migration target Rules |

---

## 12. Example Shape (Conceptual Only)

```text
VIO-ID              : VIO-NNN          # placeholder — no instance allocated
FND-ID              : FND-NNN
SYS-ID              : SYS-NNN
Violated Rule ID(s) : [PKG-R-001]      # must ⊆ Finding EVD anchors
Severity            : B
EVD-ID[]            : [EVD-NNN]
ruleCatalogVersion  : v1.0
Status              : Active
```

---

## 13. Non-Contents

Actual Audit rows · real VIO-001 · SYS verdict lists · Finding mutations · code/JSON · upstream doc edits

---

## 14. Revision History

| Version | Status | Content |
|---------|--------|---------|
| **v1.0** | **Active** | Violation Register SSOT · separate promotion · 0..N · Rule ⊆ EVD |

---

*End of STEP5_Violation_Register.md v1.0*
