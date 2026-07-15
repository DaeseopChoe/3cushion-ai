# STEP5_Observation_Mapping_Register.md

```
Document  : STEP5_Observation_Mapping_Register.md
Version   : v1.0
Status    : Active · Observation Mapping Register SSOT
Date      : 2026-07-15
STEP      : STEP5-4
Basis     : STEP5_Architecture_Audit_Framework.md v1.0 Frozen
            STEP5_Audit_Plan.md v1.0
            STEP5_Observation_Mapping_Evidence_Analysis.md v1.1
SPS       : System Platform Standard (SPS) v1.0
Input     : System_Inventory.md v1.0 Final (Frozen Assets · Read-only)
Rule      : Coverage Layer only · No Finding · No Evidence instances required in this doc seed
```

---

## 1. Purpose

본 문서는 STEP5 Architecture Audit의 **Observation Mapping Register SSOT**이다.

STEP4 Frozen Observation(및 no-OBS Coverage)을  
Audit Plan의 **Audit Category / Plan Item**에 연결하는 **Coverage Layer**를 정의·관리한다.

### 1.1 Role

| Does | Does not |
|------|----------|
| Frozen OBS ↔ SYS ↔ Audit Category 연결 | Observation 수정·재생성·신규 OBS |
| Plan Sequence / Coverage 추적 | Rule 적용 (Reasoning) |
| NO_OBS · CATEGORY_SLOT 커버리지 명시 | Finding / Violation / Decision 생성 |
| G2 (Mapping complete) 근거 제공 | Evidence 자동 생성 · packageComplete 계산 |

### 1.2 Coverage ≠ Reasoning

```text
Observation Mapping  =  Coverage Layer
Evidence             =  Reasoning Layer
```

| | Mapping (this Register) | Evidence (`STEP5_Evidence_Register.md`) |
|--|-------------------------|------------------------------------------|
| Question | What is placed on which Audit axis? | Which Fact bound to which Rule? |
| Rule Catalog | Not applied | Rule Anchor required |
| Finding input | **No** | **Yes** (only direct input) |
| Gate | G2 | G2.5 |

---

## 2. Position in Pipeline

```text
STEP4 Frozen Fact / OBS
        ↓
Observation Mapping          ← this Register (Coverage)
        ↓
Evidence                     ← STEP5 Evidence Register (Reasoning)
        ↓
Finding → Violation → Recommendation → Decision   (STEP5-5 · not this document)
```

### 2.1 Cardinality with Evidence

```text
1 MAP  ──►  N EVD    (N ≥ 0)
```

| N | Meaning |
|---|---------|
| 0 | Coverage only · no Finding-candidate Evidence yet |
| 1 | Single Reasoning artifact |
| ≥ 2 | Multiple Rules and/or Fact bindings under same Mapping context |

**1 Mapping → N Evidence is explicitly allowed.**  
Mapping existence does **not** require Finding.  
Finding requires Evidence ≥ 1 — never Mapping alone.

---

## 3. Register Policy

| Policy | Statement |
|--------|-----------|
| Read-only Fact | STEP4 Inventory / OBS are referenced only |
| No new OBS | Mapping never invents Observation Codes |
| Independent Systems | Each SYS mapped independently (Plan Target SYS-001…038) |
| Plan-driven | Audit Category · Sequence · Coverage from Audit Plan |
| Deterministic | Same Frozen Input + Same Plan ⇒ same Mapping set for Coverage |
| No judgment | No Severity · Violation · Decision language on Mapping records |

---

## 4. Permanent ID Policy

| Item | Rule |
|------|------|
| Format | `MAP-NNN` (zero-padded decimal) |
| Permanent | Yes |
| No Reuse | Retired IDs never reassigned to a new meaning |
| No Version in ID | Version lives in Register / Status — not in ID |
| Correction | New `MAP-*` + Supersede; do not rewrite Active history in place |

---

## 5. Lifecycle

```text
Draft → Active → Deprecated → Superseded → Archived
```

| Status | Meaning |
|--------|---------|
| Draft | Work in progress · not counted for G2 |
| Active | Counts toward Coverage / G2 |
| Deprecated | Discouraged · not deleted |
| Superseded | Replaced · `supersededBy` required |
| Archived | Preservation only |

**No delete** after Active. Draft-only IDs may be discarded before first Active.

Evidence may reference Active (or historically pinned) MAP IDs. Prefer not to cite Draft MAP from Active EVD.

---

## 6. Mapping Kind (Required)

Every Mapping record **Must** declare exactly one **Mapping Kind**.

| Kind | Meaning | Typical OBS-ID |
|------|---------|----------------|
| **OBS_LINK** | Frozen Observation attached to SYS + Category | Required (`OBS-*`) |
| **NO_OBS** | SYS has no OBS for this Coverage need · explicit gap record | Empty |
| **CATEGORY_SLOT** | Category Coverage slot without a specific OBS (Plan Category closed / tracked) | Empty or optional |

### 6.1 NO_OBS Processing

- Invented OBS **forbidden**
- Record proves Coverage awareness for Plan Category / SYS
- Downstream Evidence may use **E8** (Fact-only + Rule) and should preferably set `mappingRef` to this NO_OBS / CATEGORY_SLOT MAP

### 6.2 CATEGORY_SLOT

- Used when Category Coverage is tracked independently of a single OBS row
- May coexist with OBS_LINK rows for the same SYS·Category
- Does not imply Finding

---

## 7. Record Shape

### 7.1 Required Fields

| Field | Description |
|-------|-------------|
| **MAP-ID** | Permanent `MAP-NNN` |
| **SYS-ID** | `SYS-NNN` |
| **Audit Category** | Package · Identity · Metadata · Registration · Runtime · Canonical · Contract · Public API |
| **Plan Ref** | Reference to Audit Plan scope / sequence item |
| **Mapping Kind** | `OBS_LINK` \| `NO_OBS` \| `CATEGORY_SLOT` |
| **Mapping Status** | Draft · Active · Deprecated · Superseded · Archived |

### 7.2 Recommended Fields

| Field | Description |
|-------|-------------|
| **OBS-ID** | Frozen OBS code (required for OBS_LINK) |
| **Source Reference** | Inventory Table / OBS Catalog section pointer |
| **supersededBy** | When Status = Superseded |

### 7.3 Optional Fields

| Field | Description |
|-------|-------------|
| Sequence order | Plan Category order hint |
| Notes | Non-judgmental coverage notes only |

### 7.4 Forbidden Fields

Finding · Violation · Recommendation · Decision · Severity · packageComplete · Rule Anchors · Evidence Summary

---

## 8. Field Definitions

| Field | Definition |
|-------|------------|
| MAP-ID | Mapping Permanent Identifier |
| SYS-ID | Inventory System ID under audit |
| OBS-ID | Observation Code from STEP4 Catalog (link only) |
| Audit Category | Plan Audit Category axis for this link |
| Plan Ref | Which Plan coverage item this record closes |
| Mapping Kind | OBS_LINK / NO_OBS / CATEGORY_SLOT |
| Mapping Status | Lifecycle state |
| Source Reference | RO pointer into Frozen Assets |
| supersededBy | Successor MAP-ID |

---

## 9. Coverage Policy

| Coverage | Mapping responsibility |
|----------|------------------------|
| **SYS Coverage** | Every Plan-target SYS appears in Mapping as needed per Category |
| **OBS Coverage** | Every in-scope OBS↔SYS attachment has ≥ 1 OBS_LINK |
| **Category Coverage** | Each Plan Category applied per Sequence; empty OBS → NO_OBS or CATEGORY_SLOT |
| **No orphan OBS** | OBS listed on Inventory for a SYS must map if in Plan scope |

Completion of Active Mapping for Plan scope closes **Gate G2**.

Coverage ≠ Evidence Coverage (G2.5). Mapping alone does not invent Reasoning.

---

## 10. Plan Ref

| Rule | Statement |
|------|-----------|
| Required | Every Active MAP cites a Plan Ref |
| Source | `STEP5_Audit_Plan.md` scope / category / sequence |
| Stability | Plan changes require Mapping review · do not silently drop Coverage |

Recommended Plan Ref form (illustrative):

```text
PLAN:STEP5-2/v1.0/Category=<Category>/Sequence=<n>
```

---

## 11. Source Reference

Points only to Read-only Fact locations, e.g.:

- `System_Inventory.md` §4 System Inventory Table
- Observation Catalog §3.10 / §8 / §14
- Metadata Shape Matrix §7
- Registration Matrix §13

Never rewrites those documents.

---

## 12. Trace Policy

### 12.1 Forward Trace

```text
OBS
 ↓
MAP     ← this Register
 ↓
EVD
 ↓
FND
 ↓
VIO
 ↓
REC
 ↓
DEC
```

### 12.2 Reverse Trace

```text
DEC → … → EVD → MAP → OBS / (NO_OBS) → Frozen Fact
```

Mapping participates in Coverage Trace.  
Finding still requires EVD; MAP is not a Finding substitute.

---

## 13. Example Shape (Conceptual Only)

> Illustrative skeletons — **not** completed Audit Coverage for 38 systems.  
> No Finding cases.

### Example A — OBS_LINK

```text
MAP-ID            : MAP-001
SYS-ID            : SYS-006
OBS-ID            : OBS-PKG-001
Audit Category    : Package
Plan Ref          : PLAN:STEP5-2/v1.0/Category=Package/Sequence=1
Mapping Kind      : OBS_LINK
Mapping Status    : Active
Source Reference  : System_Inventory.md §3.10 · §4 (SYS-006)
```

### Example B — NO_OBS

```text
MAP-ID            : MAP-002
SYS-ID            : SYS-002
OBS-ID            : (empty)
Audit Category    : Package
Plan Ref          : PLAN:STEP5-2/v1.0/Category=Package/Sequence=1
Mapping Kind      : NO_OBS
Mapping Status    : Active
Source Reference  : System_Inventory.md §4 (SYS-002 · observations —)
```

### Example C — CATEGORY_SLOT

```text
MAP-ID            : MAP-003
SYS-ID            : SYS-008
OBS-ID            : (empty)
Audit Category    : Canonical
Plan Ref          : PLAN:STEP5-2/v1.0/Category=Canonical/Sequence=6
Mapping Kind      : CATEGORY_SLOT
Mapping Status    : Active
Source Reference  : System_Inventory.md §4 (SYS-008)
```

From **MAP-001**, zero or more Evidence records may be created later (`1 MAP → N EVD`).

---

## 14. Record Index (Seed)

본 v1.0 문서는 **Register 정책·Shape**을 확정한다.  
전수 SYS×Category Mapping 인스턴스는 Audit 진행에 따라 본 Register에 추가한다.

| Seed examples | Kind |
|---------------|------|
| MAP-001 | OBS_LINK (conceptual) |
| MAP-002 | NO_OBS (conceptual) |
| MAP-003 | CATEGORY_SLOT (conceptual) |

---

## 15. Downstream

| Consumer | Use |
|----------|-----|
| Evidence Register | `mappingRef` · Coverage context for EVD |
| Gate G2 | Active Mapping completeness |
| STEP5-5 | Indirect only via Evidence · never Finding-from-MAP |
| Report | Coverage summary |

---

## 16. Non-Contents

Finding · Violation · Recommendation · Decision · packageComplete · Schema Validation · Runtime/JSON/code changes · STEP4/Framework/Plan/Rule Catalog edits

---

## 17. Revision History

| Version | Status | Content |
|---------|--------|---------|
| **v1.0** | **Active** | Mapping Register SSOT · Kind · Coverage · 1→N · conceptual examples |

---

*End of STEP5_Observation_Mapping_Register.md v1.0*
