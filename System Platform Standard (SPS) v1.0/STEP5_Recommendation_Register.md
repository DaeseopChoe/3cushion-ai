# STEP5_Recommendation_Register.md

```
Document  : STEP5_Recommendation_Register.md
Version   : v1.0
Status    : Active · Recommendation Register SSOT
Date      : 2026-07-15
STEP      : STEP5-5
Basis     : STEP5_Architecture_Audit_Framework.md v1.0 Frozen (§6 Dual Path)
            STEP5_Finding_Register.md v1.0
            STEP5_Violation_Register.md v1.0
            STEP5-5 Analysis (v1.1)
SPS       : System Platform Standard (SPS) v1.0
Rule      : Migration Guidance only · Dual REC-F / REC-V · No Audit instance records in this doc
```

---

## 1. Purpose

본 문서는 STEP5 Architecture Audit의 **Recommendation Register SSOT**이다.

Architecture 정렬을 위한 **Migration Guidance**만 관리한다.  
구현·코드·JSON·Runtime 변경 지시를 포함하지 않는다.

### 1.1 Role

| Does | Does not |
|------|----------|
| Dual Path REC-F / REC-V | Execute Standardization (STEP7) |
| Assign M0–M4 · RP-0–RP-4 | Merge M and RP axes |
| Defer to STEP6 / STEP7 | Patch repositories · edit System JSON |
| Feed Architecture Decision | Mutate Finding / Violation / Evidence |

### 1.2 Migration Guidance Only

```text
Recommendation = Guidance
≠ Implementation
≠ Code change order
≠ JSON/Schema patch
≠ Runtime behavior change
```

---

## 2. Dual Recommendation Path

```text
Finding
  ├──► REC-F   (Finding-based)     optional
  │
  └──► Violation
         └──► REC-V               required if Active VIO exists
```

| Kind | ID form | Meaning |
|------|---------|---------|
| **REC-F** | `REC-F-NNN` or Kind=F on `REC-NNN` | Improvement without confirmed Violation (or soft path) |
| **REC-V** | `REC-V-NNN` or Kind=V on `REC-NNN` | Minimum guidance to address confirmed Violation |

**Official Kind values:** `F` \| `V`  
**ID policy:** Prefer `REC-NNN` + Kind field, **or** prefixed `REC-F-*` / `REC-V-*` — choose one convention in instances; Shape allows Kind + REC-ID.

This Catalog document uses:

| Field | Convention |
|-------|------------|
| REC-ID | `REC-NNN` |
| Kind | `F` \| `V` |

---

## 3. Migration Category (M0–M4)

From `System_Audit_Guide` / Framework — **not** Priority:

| Cat | Meaning |
|-----|---------|
| **M0** | No migration required |
| **M1** | Minor architectural improvement · No Runtime impact |
| **M2** | Schema / Package modification · behavior preserved |
| **M3** | Canonical migration required |
| **M4** | Major redesign required |

---

## 4. Priority (RP-0..RP-4)

Separate axis from M:

| Priority | Meaning |
|----------|---------|
| **RP-0** Mandatory | Blocking |
| **RP-1** Strongly Recommended | Pre-release strong |
| **RP-2** Recommended | Non-blocking backlog |
| **RP-3** Optional | Quality / consistency |
| **RP-4** Deferred | Explicit defer to STEP6 / STEP7 / later |

Heuristic: REC-V → mainly RP-0..RP-2 · REC-F → mainly RP-2..RP-4

---

## 5. Status / Deferred

| Status | Meaning |
|--------|---------|
| **Draft** | Incomplete · not for G5 / DEC |
| **Active** | Current guidance · citable by DEC |
| **Deferred** | Explicitly postponed · set `deferredTo` |
| **Superseded** | Replaced · `supersededBy` required |
| **Archived** | Preservation |

`deferredTo` ∈ { `STEP6` · `STEP7` · `FUTURE` · … }

RP-4 usually aligns with Status=Deferred, but Status is authoritative for Gate accounting.

---

## 6. Relationship Rules

| Rule | Statement |
|------|-----------|
| REC-F | Optional on Finding · refs FND-ID |
| REC-V | **Required** for each Active VIO · refs VIO-ID (+ FND) |
| After VIO raised | Prior REC-F may remain or be Superseded (project policy: default **may remain** as soft guidance unless contradictory) |
| Decision | Cites REC-F ∪ REC-V |

---

## 7. Permanent ID Policy

| Item | Rule |
|------|------|
| Format | `REC-NNN` |
| Permanent · No Reuse | Yes |
| Kind | Separate field `F` \| `V` |
| Correction | New REC + Supersede |

---

## 8. Lifecycle

```text
Draft → Active → Deferred → Superseded → Deprecated → Archived
```

Deferred may return to Active when resumed (same ID allowed only if semantics unchanged; else new REC + Supersede).  
**No delete after Active.**

---

## 9. Record Shape

### 9.1 Required

| Field | Description |
|-------|-------------|
| **REC-ID** | `REC-NNN` |
| **Kind** | `F` \| `V` |
| **SYS-ID** | `SYS-NNN` |
| **Migration Category** | M0–M4 |
| **Priority** | RP-0–RP-4 |
| **Guidance** | Migration Guidance text only |
| **Status** | Draft · Active · Deferred · Superseded · Deprecated · Archived |
| **Refs** | FND-ID required for Kind=F · VIO-ID (+ FND) required for Kind=V |

### 9.2 Recommended

| Field | Description |
|-------|-------------|
| **targetRuleIds** | Rules guidance aims to satisfy (⊆ known EVD/VIO rules) |
| **deferredTo** | When Status=Deferred |
| **supersededBy** | Successor REC-ID |

### 9.3 Optional

| Field | Description |
|-------|-------------|
| Notes | Non-implementation |

### 9.4 Forbidden

| Forbidden | Reason |
|-----------|--------|
| Code / file / JSON patch instructions | Guidance only |
| Runtime toggle commands | Implementation |
| New Audit Rules | Catalog ownership |
| Fact / OBS edits | Fact layer |

---

## 10. Trace Policy

### Forward

```text
OBS → MAP → EVD → FND → VIO → REC → DEC
```

### Reverse

```text
DEC → REC → VIO (if Kind=V) → FND → EVD → Rule → Fact
DEC → REC → FND (if Kind=F) → EVD → …
```

---

## 11. Gate Link

| Gate | Criterion |
|------|-----------|
| **G5** | Recommendations complete · every Active VIO has ≥1 Active or Deferred REC-V |

---

## 12. Example Shape (Conceptual Only)

### Kind F

```text
REC-ID               : REC-NNN
Kind                 : F
SYS-ID               : SYS-NNN
FND-ID               : FND-NNN
Migration Category   : M1
Priority             : RP-2
Guidance             : <non-implementation architectural alignment guidance>
Status               : Active
```

### Kind V

```text
REC-ID               : REC-NNN
Kind                 : V
SYS-ID               : SYS-NNN
VIO-ID               : VIO-NNN
FND-ID               : FND-NNN
targetRuleIds        : [PKG-R-001]
Migration Category   : M2
Priority             : RP-0
Guidance             : <minimum guidance to address confirmed violation>
Status               : Active
```

---

## 13. STEP6 / STEP7

| STEP | Use |
|------|-----|
| STEP6 | Deferred REC (esp. SCH-related) as handoff context |
| STEP7 | Active/Deferred REC as Standardization backlog input · does not rewrite REC after Exit PASS without process |

---

## 14. Non-Contents

Actual REC-001 instances · implementation tickets as Register body · upstream doc edits

---

## 15. Revision History

| Version | Status | Content |
|---------|--------|---------|
| **v1.0** | **Active** | Recommendation Register SSOT · Dual Path · M/RP · Guidance only |

---

*End of STEP5_Recommendation_Register.md v1.0*
