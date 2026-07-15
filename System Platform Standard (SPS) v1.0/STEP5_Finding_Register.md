# STEP5_Finding_Register.md

```
Document  : STEP5_Finding_Register.md
Version   : v1.0
Status    : Active · Finding Register SSOT
Date      : 2026-07-15
STEP      : STEP5-5
Basis     : STEP5_Architecture_Audit_Framework.md v1.0 Frozen
            STEP5_Evidence_Register.md v1.0
            STEP5-5 Analysis (v1.1 field supplements)
SPS       : System Platform Standard (SPS) v1.0
Rule      : Architecture judgment Register · Evidence-only direct input · No Audit instance records in this doc
```

---

## 1. Purpose

본 문서는 STEP5 Architecture Audit의 **Finding Register SSOT**이다.

**Active Evidence**를 근거로 생성되는 Architecture Audit의 **최초 판단** 레코드를 정의·관리한다.

### 1.1 Role

| Does | Does not |
|------|----------|
| Evidence 기반 Architecture 편차·해석 서술 | Observation / Inventory / Mapping만으로 판단 |
| Severity · Classification hint 부여 | Violation 확정 (→ Violation Register) |
| Finding Statement (judgment) | Evidence Summary 대체·복사 의무 |
| G3 근거 제공 | Recommendation / Decision 생성 · packageComplete 계산 |

### 1.2 Evidence Summary vs Finding Statement

| Artifact | Layer | Content |
|----------|-------|---------|
| **Evidence Summary** | Reasoning | Fact + Rule **결합** · 판정어 금지 |
| **Finding Statement** | Judgment | Architecture **판단**만 (편차 의미 · Fail/Pass 해석) |

Finding은 Evidence를 **해석**한다. Evidence를 다시 쓰지 않는다.  
Finding에서 **Rule을 재적용(re-bind)하지 않는다.**

---

## 2. Position in Pipeline

```text
OBS → MAP → EVD → FND → VIO → REC → DEC
                 ↑
           this Register
```

---

## 3. Generation Conditions

```text
Active Evidence ≥ 1
  ⇒ Finding MAY be created

Evidence = 0
  ⇒ Finding FORBIDDEN

Mapping only / OBS only
  ⇒ Finding FORBIDDEN
```

| Input | Allowed as Finding direct input? |
|-------|----------------------------------|
| Active `EVD-*` (≥1) | **Yes — sole direct input** |
| MAP / OBS / Inventory | No (indirect via EVD only) |
| Rule Catalog ID not on cited EVD | **No** (no Rule re-application) |

### 3.1 Rule Citation Policy

- Finding may list `relatedRuleIds` **only as read-only projection** of cited EVD Rule Anchors (union).
- Finding **Must not** add new Rule Anchors.
- Judgment must be consistent with pinned `ruleCatalogVersion` on cited Evidence.

---

## 4. Register Policy

| Policy | Statement |
|--------|-----------|
| Judgment layer | First Architecture judgment after Reasoning |
| No Fact mix | Does not rewrite Frozen Facts |
| No Rule re-bind | Rules only via Evidence |
| 1 FND → N EVD | Allowed |
| Disposition | Tracks whether Violation path is open (see Status / disposition) |
| Determinism | Same EVD set + same Catalog pin + same judgment rules ⇒ same Finding |

---

## 5. Permanent ID Policy

| Item | Rule |
|------|------|
| Format | `FND-NNN` |
| Permanent | Yes |
| No Reuse | Yes |
| No Version in ID | Yes |
| Correction | New FND + Supersede · do not silently rewrite cited Active FND |

---

## 6. Lifecycle

```text
Draft → Active → Superseded → Deprecated → Archived
```

| Status | Gate / Citation |
|--------|-----------------|
| Draft | Not counted for G3 |
| Active | May be cited by VIO / REC / DEC · counts for G3 |
| Superseded | `supersededBy` required · historical Trace |
| Deprecated | Discouraged for new citations |
| Archived | Preservation |

**No delete after Active.**

When cited Evidence is Superseded for semantic correction, prefer new Finding (or explicit Supersede chain) rather than mutating Active FND in place.

---

## 7. Severity

Align with `System_Audit_Guide` / Framework Severity levels:

| Level | Meaning |
|-------|---------|
| **A** | Critical |
| **B** | Major |
| **C** | Minor |
| **D** | Informational |

Severity is Finding judgment — not an Evidence field.

---

## 8. Classification Hint

Optional non-binding hint toward Audit Classification (`COMPLIANT` · `MINOR DEVIATION` · `MAJOR DEVIATION` · `NON-COMPLIANT`).  
**Architecture Decision** owns final Classification aggregation per SYS.

---

## 9. Disposition (Recommended)

| Disposition | Meaning |
|-------------|---------|
| `OPEN` | Judgment recorded · Violation not yet decided |
| `VIOLATION_RAISED` | ≥1 Active VIO cites this FND |
| `NO_VIOLATION` | Explicitly closed without VIO |
| `DEFERRED` | Deferred (e.g. STEP6 Schema path) |

Supports Gate G4 (“zero Violations also explicit”).

---

## 10. Record Shape

### 10.1 Required

| Field | Description |
|-------|-------------|
| **FND-ID** | `FND-NNN` |
| **SYS-ID** | `SYS-NNN` |
| **EVD-ID[]** | ≥ 1 Active (or historically valid) Evidence IDs |
| **Finding Statement** | Architecture judgment text |
| **Severity** | A · B · C · D |
| **Status** | Draft · Active · Superseded · Deprecated · Archived |

### 10.2 Recommended

| Field | Description |
|-------|-------------|
| **classificationHint** | Non-binding Classification hint |
| **disposition** | OPEN · VIOLATION_RAISED · NO_VIOLATION · DEFERRED |
| **relatedRuleIds** | Read-only union of EVD Rule Anchors |
| **auditContextTag[]** | Plan Category tags |
| **supersededBy** | Successor FND-ID |

### 10.3 Optional

| Field | Description |
|-------|-------------|
| Notes | Non-operational commentary |
| Plan Ref | Coverage context |

### 10.4 Forbidden

| Forbidden | Reason |
|-----------|--------|
| New Rule Anchors | No Rule re-application |
| Fact / OBS rewrite | Fact ≠ Audit mix |
| MAP as sole input | Evidence-only direct input |
| packageComplete · Decision Status | Wrong layer |
| Recommendation / Violation body | Separate Registers |
| Copy-paste replacing Evidence Summary without judgment | Blurs Reasoning vs Judgment |

---

## 11. Field Definitions

| Field | Definition |
|-------|------------|
| Finding Statement | What Architecture concludes from cited Evidence |
| EVD-ID[] | Sole judgment grounds |
| relatedRuleIds | Projected from EVD — not authored norms |
| Severity | Impact of the judged deviation |
| disposition | Violation-path state |

---

## 12. Trace Policy

### Forward

```text
OBS → MAP → EVD → FND → VIO → REC → DEC
```

### Reverse

```text
DEC → … → FND → EVD → Rule (+ Catalog Version pin) → Fact (+ MAP)
```

Finding Must remain reverse-traceable to ≥1 EVD.

---

## 13. Outputs (Consumers)

| Consumer | Use |
|----------|-----|
| Violation Register | Promotion source |
| Recommendation (REC-F) | Optional Finding-based guidance |
| Architecture Decision | findingRefs |
| Gate G3 | Active FND with EVD ≥ 1 |

---

## 14. Example Shape (Conceptual Only)

> Skeleton only — **not** an Audit instance record. IDs below are illustrative placeholders for Shape, not seeded Audit results to execute.

```text
FND-ID              : FND-NNN          # placeholder form — no instance allocated
SYS-ID              : SYS-NNN
EVD-ID[]            : [EVD-NNN]
Finding Statement   : <Architecture judgment derived from cited Evidence only>
Severity            : B
classificationHint  : MAJOR DEVIATION
disposition         : OPEN
relatedRuleIds      : [PKG-R-001]     # from EVD anchors only
Status              : Active
```

---

## 15. Non-Contents

Actual Audit rows · real FND-001 assignments · SYS verdict lists · code/JSON · STEP4/Framework/Plan/Catalog/Mapping/Evidence document edits

---

## 16. Revision History

| Version | Status | Content |
|---------|--------|---------|
| **v1.0** | **Active** | Finding Register SSOT · Evidence-only · no Rule re-bind · disposition |

---

*End of STEP5_Finding_Register.md v1.0*
