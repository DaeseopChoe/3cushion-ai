# STEP5_Evidence_Register.md

```
Document  : STEP5_Evidence_Register.md
Version   : v1.0
Status    : Active · Evidence Register SSOT
Date      : 2026-07-15
STEP      : STEP5-4
Basis     : STEP5_Architecture_Audit_Framework.md v1.0 Frozen (§5 Evidence Layer)
            STEP5_Audit_Plan.md v1.0 (§8 Evidence Strategy)
            STEP5_Audit_Rule_Catalog.md v1.0
            STEP5_Observation_Mapping_Evidence_Analysis.md v1.1
SPS       : System Platform Standard (SPS) v1.0
Input     : Frozen Facts (Read-only) · Mapping Register · Rule Catalog
Rule      : Reasoning Artifact Register · No Finding / Violation / Decision in this document
```

---

## 1. Purpose

본 문서는 STEP5 Architecture Audit의 **Evidence Register SSOT**이다.

Finding **이전**에 생성되는 **Rule-bound Reasoning Artifact**를 정의·관리한다.

Evidence는 Fact가 아니며, Finding도 아니고, Decision도 아니다.

### 1.1 Role

| Does | Does not |
|------|----------|
| Fact Anchor + Rule Anchor + Summary 고정 | Observation / Inventory 수정 |
| Finding의 **유일한 직접 입력** 제공 | Finding / Violation / REC / DEC 생성 |
| Rule Catalog Version pin (Determinism) | Ad-hoc Rule 사용 |
| G2.5 근거 제공 | packageComplete 계산 · Schema Validation 실행 |

### 1.2 Reasoning ≠ Coverage

```text
Mapping  = Coverage
Evidence = Reasoning
```

| | Mapping | Evidence (this Register) |
|--|---------|--------------------------|
| Layer | Coverage | Reasoning |
| Rule | Not applied | **Required** Rule Anchor |
| Cardinality | 1 MAP → N EVD (N≥0) | EVD cites MAP Ref 0..1 |
| Finding | Forbidden as sole input | **Required** (≥1 EVD) |

---

## 2. Position in Pipeline

```text
STEP4 Frozen Fact
        ↓
MAP (Coverage)
        ↓
EVD (Reasoning)          ← this Register
        ↓
FND → VIO → REC → DEC    (STEP5-5 · not authored here)
```

---

## 3. Generation Conditions (E1–E10)

| ID | Rule |
|----|------|
| **E1** | Observation alone is not Evidence |
| **E2** | Evidence = Fact Anchor(s) + Rule Anchor(s) + Summary |
| **E3** | Record only grounds actually used in Audit |
| **E4** | Evidence is created **before** Finding |
| **E5** | Evidence belongs to STEP5 Audit Layer only |
| **E6** | Does not modify or replace Observation / Inventory (reference only) |
| **E7** | Must not create new Observation Codes |
| **E8** | OBS-absent Evidence allowed: Inventory / Shape / Reg Fact + Rule |
| **E9** | Summary must not use Violation / Recommendation / Decision judgment terms |
| **E10** | Same Plan + same Ruleset/Catalog Version + same Frozen Input ⇒ same Evidence set |

### 3.1 Minimum Creation Predicate

```text
( ≥ 1 Fact Anchor )
  ∧ ( ≥ 1 Rule Anchor from Rule Catalog · Active at pin time )
  ∧ ( Evidence Summary without judgment terms )
```

---

## 4. Permanent ID Policy

| Item | Rule |
|------|------|
| Format | `EVD-NNN` |
| Permanent | Yes |
| No Reuse | Yes |
| No Version in ID | Catalog Version is a **field**, not part of ID |
| Correction | New EVD + **Supersede**; do not silently rewrite cited Evidence |

---

## 5. Lifecycle

```text
Draft → Active → Deprecated → Superseded → Archived
```

| Status | New Finding may cite? | Meaning |
|--------|----------------------|---------|
| Draft | **No** | Incomplete Reasoning |
| Active | **Yes** | Eligible Finding input |
| Deprecated | Historical only | Discouraged for new FND |
| Superseded | Historical · prefer successor | `supersededBy` required |
| Archived | Explicit historical audits only | Preservation |

**Superseded policy:** When Evidence is corrected, create a new `EVD-*`, set old Status=Superseded, set `supersededBy`. Existing Findings that cited the old EVD remain valid for Trace; new Findings use the successor.

**No delete** after Active.

---

## 6. Evidence Type (Structural Axis)

Evidence Type describes **how the Reasoning Artifact is assembled**.  
It is **not** Rule Category and **not** Audit Category.

### 6.1 Official Structural Types

| Evidence Type | Meaning |
|---------------|---------|
| **OBS** | Fact Anchors include Frozen Observation |
| **FACT_ONLY** | No OBS · Inventory / Shape / Registration Fact only (E8) |
| **COMPOSITE** | Multiple Fact Anchor kinds combined in one EVD |
| **MULTI_RULE** | Two or more Rule Anchors on one EVD |

### 6.2 Separation from Rule Category

| Axis | Owner | Examples |
|------|-------|----------|
| **Rule Category** | Rule Catalog | PKG-R · META-R · REG-R · RT-R · CAN-R · CON-R · SCH-R · API-R |
| **Audit Category** | Audit Plan / Mapping | Package · Metadata · Runtime · … |
| **Evidence Type** | This Register | OBS · FACT_ONLY · COMPOSITE · MULTI_RULE |

Do **not** set Evidence Type = `PKG-R` or `Package`.  
Rule Category is implied by each Rule Anchor ID prefix.

### 6.3 Optional Audit Context Tag

Optional recommended field `auditContextTag[]` may record Plan/Mapping Category context  
(e.g. Package, Metadata) without replacing Evidence Type.

---

## 7. Fact Anchor

| Fact Anchor kind | Source (Read-only) |
|------------------|--------------------|
| Observation | OBS Catalog (`OBS-*`) |
| Inventory | System Inventory Table |
| Metadata Shape | Metadata Shape Matrix |
| Registration | Registration Matrix / Fact Matrix |

At least one Fact Anchor is required (E2).

---

## 8. Rule Anchor

| Rule | Statement |
|------|-----------|
| Sole Source | Rule Anchors **Must** be IDs from `STEP5_Audit_Rule_Catalog.md` |
| Active at pin | Prefer Catalog Status **Active** at Evidence creation |
| Ad-hoc Rule | **Forbidden** (no free-text norms as anchors) |
| Scope | Rule Scope must allow the target SYS / Package |
| Count | ≥ 1 · if ≥ 2 → Evidence Type typically `MULTI_RULE` (or split into N EVD under same MAP) |

---

## 9. Summary Policy

| Allowed | Forbidden |
|---------|-----------|
| Describe Fact + Rule binding neutrally | Violation / Recommendation / Decision terms |
| Present / absent / difference language aligned with Fact | Severity assignment · Classification · packageComplete |
| Point to Source References | “NON_COMPLIANT”, “shall migrate”, imperative remediation |

Evidence is Reasoning, not judgment.

---

## 10. Rule Catalog Version Pin

| Field | Role |
|-------|------|
| **ruleCatalogVersion** | Pin of Catalog Version used when EVD was created (**Recommended · strongly**) |

Determinism:

```text
Identical Frozen Input
  + Identical Rule Catalog Version
  ⇒ Identical Audit Result
```

Past Evidence remains interpretable against the **pinned** Catalog Version even after later Catalog bumps.

---

## 11. Record Shape

### 11.1 Required Fields

| Field | Description |
|-------|-------------|
| **EVD-ID** | Permanent `EVD-NNN` |
| **SYS-ID** | `SYS-NNN` |
| **Fact Anchors** | ≥ 1 Fact Anchor descriptors |
| **Rule Anchors** | ≥ 1 Catalog Rule IDs (`*-R-*`) |
| **Evidence Type** | OBS · FACT_ONLY · COMPOSITE · MULTI_RULE |
| **Evidence Summary** | Non-judgmental Fact+Rule binding text |
| **Source References** | RO pointers to Fact / Plan / Mapping sources |
| **Evidence Status** | Draft · Active · Deprecated · Superseded · Archived |

### 11.2 Recommended Fields

| Field | Description |
|-------|-------------|
| **OBS-ID[]** | 0..n · empty for FACT_ONLY |
| **mappingRef** | `MAP-*` (preferred even for E8 via NO_OBS / CATEGORY_SLOT) |
| **Plan Ref** | Audit Plan item |
| **ruleCatalogVersion** | Catalog Version pin (e.g. `v1.0`) |
| **auditContextTag[]** | Optional Plan Category tags |
| **supersededBy** | When Superseded |

### 11.3 Optional Fields

| Field | Description |
|-------|-------------|
| Framework Version | Framework pin |
| Composer note | Non-judgmental assembly note |

### 11.4 Forbidden Fields

severity · classification · violationFlag · recommendation · decisionStatus · packageComplete · Finding body

---

## 12. Traceability

### 12.1 Forward

```text
OBS
 ↓
MAP
 ↓
EVD          ← this Register
 ↓
Rule Catalog Version (pin on EVD)
 ↓
FND
 ↓
VIO
 ↓
REC
 ↓
DEC
```

### 12.2 Reverse

```text
DEC
 ↓
FND
 ↓
EVD
 ↓
Rule ID(s) + ruleCatalogVersion
 ↓
Fact Anchor(s)  (+ OBS if any)
 (+ mappingRef → MAP → Coverage)
```

---

## 13. Relationship to Mapping

| Rule | Statement |
|------|-----------|
| Cardinality | 1 MAP → N EVD |
| mappingRef | 0..1 per EVD · strongly recommended |
| E8 | FACT_ONLY may omit OBS; prefer NO_OBS/CATEGORY_SLOT MAP ref |
| Finding | Never from MAP alone |

---

## 14. Gate Link

| Gate | Criterion |
|------|-----------|
| G2 | Mapping Register (Coverage) |
| **G2.5** | Evidence Register complete for planned Finding candidates |
| G3 | Finding cites Active EVD ≥ 1 (STEP5-5) |

---

## 15. Example Shape (Conceptual Only)

> Skeletons for Shape illustration. **Not** Finding cases. **Not** full 38-SYS Audit.

### Example A — OBS + Package Rule

```text
EVD-ID                 : EVD-001
SYS-ID                 : SYS-006
OBS-ID[]               : [OBS-PKG-001]
Fact Anchors           : OBS-PKG-001; Inventory anchors=absent (SYS-006)
Rule Anchors           : [PKG-R-001]
Evidence Type          : OBS
Evidence Summary       : Observed anchors.json absent on SYS-006 package; bound to PKG-R-001 four-file completeness requirement for Evidence assembly.
Source References      : System_Inventory.md §4 SYS-006; Rule Catalog PKG-R-001
mappingRef             : MAP-001
Plan Ref               : PLAN:STEP5-2/v1.0/Category=Package/Sequence=1
ruleCatalogVersion     : v1.0
auditContextTag[]      : [Package]
Evidence Status        : Active
```

### Example B — FACT_ONLY (E8)

```text
EVD-ID                 : EVD-002
SYS-ID                 : SYS-002
OBS-ID[]               : []
Fact Anchors           : Inventory presence (profile/logic/anchors/system_meta all present)
Rule Anchors           : [PKG-R-001]
Evidence Type          : FACT_ONLY
Evidence Summary       : Inventory presence Facts for SYS-002 bound to PKG-R-001 without Observation Code.
Source References      : System_Inventory.md §4 SYS-002
mappingRef             : MAP-002
Plan Ref               : PLAN:STEP5-2/v1.0/Category=Package/Sequence=1
ruleCatalogVersion     : v1.0
auditContextTag[]      : [Package]
Evidence Status        : Active
```

### Example C — MULTI_RULE (conceptual)

```text
EVD-ID                 : EVD-003
SYS-ID                 : SYS-001
OBS-ID[]               : [OBS-ID-001]
Fact Anchors           : OBS-ID-001; Inventory directory vs systemId difference observed
Rule Anchors           : [META-R-001, REG-R-001]
Evidence Type          : MULTI_RULE
Evidence Summary       : Identity difference Fact for SYS-001 bound jointly to META-R-001 and REG-R-001 for composite Reasoning (illustrative).
Source References      : System_Inventory.md §3.10 · §4 SYS-001
mappingRef             : (optional MAP for Identity Category)
Plan Ref               : PLAN:STEP5-2/v1.0/Category=Identity/Sequence=2
ruleCatalogVersion     : v1.0
auditContextTag[]      : [Identity]
Evidence Status        : Active
```

> Prefer splitting MULTI_RULE into separate EVDs under the same MAP when Trace simplicity is desired (`1 MAP → N EVD`).

---

## 16. Seed Index

| EVD-ID | Type | Purpose |
|--------|------|---------|
| EVD-001 | OBS | Conceptual Package+OBS example |
| EVD-002 | FACT_ONLY | Conceptual E8 example |
| EVD-003 | MULTI_RULE | Conceptual multi-anchor example |

Full Audit Evidence set is filled progressively during STEP5-4 execution; this document is the Register SSOT.

---

## 17. Downstream

| Consumer | Use |
|----------|-----|
| STEP5-5 Finding | Must cite EVD ≥ 1 (Active) |
| Violation / REC / DEC | Via Finding chain |
| STEP5-6 Report / Handoff | Evidence Register + Catalog pins |
| STEP6 | Trace only · no STEP5 EVD rewrite |

---

## 18. Non-Contents

Finding · Violation · Recommendation · Decision · packageComplete · Schema Validation execution · Runtime/JSON/code · edits to STEP4 / Framework / Plan / Rule Catalog / Mapping policy docs (except consuming MAP IDs)

---

## 19. Revision History

| Version | Status | Content |
|---------|--------|---------|
| **v1.0** | **Active** | Evidence Register SSOT · E1–E10 · Types · Catalog pin · conceptual examples |

---

*End of STEP5_Evidence_Register.md v1.0*
