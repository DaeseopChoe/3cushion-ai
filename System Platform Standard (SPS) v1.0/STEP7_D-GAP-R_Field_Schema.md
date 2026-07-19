# STEP7_D-GAP-R_Field_Schema.md

```text
Document  : STEP7_D-GAP-R_Field_Schema.md
Version   : v0.1 Draft Rev.1
Status    : Schema Locked for P3 Population · Enum Candidates not Frozen
Date      : 2026-07-19
STEP      : STEP7 / Phase P3 Gap Analysis
Session   : S7-P3-IU-3-04A (+ Schema Refinement Rev.1)
IU        : IU-3-04A
WP        : WP-3-04
Milestone : M3.2 (schema)
Owner     : System Standardization / Gap Register
Type      : D-GAP-R Field Schema (Draft Rev.1)
Baseline  : D-GAP-A Draft (IU-3-03A) · STEP7 Scope/WBS · Ops v0.3
Rule      : Schema Only · No Rows in this document · No Severity Lock ·
            No Resolution Design · No Runtime / Framework / Pipeline / System JSON mutation
Revision  : Rev.1 — gapId = DGR-NNN · resolutionClass documentation refinement only
Next      : Register Population IU-3-05A/B · Review IU-3-06A
```

---

## 1. Purpose

**D-GAP-R (Gap Register)**는 D-GAP-A에서 식별된 Gap을 **추적·우선순위·처분(disposition)·검증**하기 위한 STEP7 운영 Register이다.

| SHALL | SHALL NOT |
|-------|-----------|
| D-GAP-A 항목을 1:1(또는 명시적 merge)로 row화 | Analysis 본문 재작성 · 신규 Gap 발명 |
| Severity / Status / Owner / Phase 추적 | Framework Severity 의미 재정의 |
| P4 Plan · P5–P8 disposition 입력 | 해결 설계(Change Design)를 이 Schema에서 완성 |
| High Severity undocumented 방지 (VG-P3 lean) | Runtime / System JSON / Catalog JSON 변경 |

```text
D-GAP-A (Analysis)
        ↓
D-GAP-R (Register · this schema)
        ↓
D-PLAN / Pilot / Fleet / Re-validation dispositions
```

**Separation**

| Axis | Meaning |
|------|---------|
| **D-GAP-A** | Analysis narrative · clusters |
| **D-GAP-R** | Inventory lifecycle of each Gap row |
| **Resolution Design** | Later IU / Change Design (not this schema body) |
| **Validation Finding `VAL-*`** | Execution Finding · cite only |
| **Audit `FND-*` / `REC-*`** | Audit layer · cite only |

---

## 2. Register Header Schema

| Field | Type | Meaning | M/O |
|-------|------|---------|-----|
| `registerId` | string | Register identity. Candidate: `D-GAP-R` | **M** |
| `registerVersion` | string | Schema/doc version (e.g. `0.1-draft-rev1`) | **M** |
| `status` | enum cand. | Register document status (not row status) | **M** |
| `basedOnDGapA` | string | Cite D-GAP-A version/session | **M** |
| `schemaSession` | string | Schema authoring session (`S7-P3-IU-3-04A`) | **M** |
| `owner` | string | Register owner role | **M** |
| `createdAt` | date | Header create date | **M** |
| `lastUpdatedAt` | date | Last schema or population update | **M** |
| `rowCount` | number | Populated rows | **M** |
| `highSeverityUndocumented` | enum cand. | Gate lean | **O** (required at M3.2 review) |
| `notes` | string | Header-level notes | **O** |

### Header `status` enum candidates

| Candidate | Meaning |
|-----------|---------|
| `Draft` | Schema/rows incomplete |
| `Active` | Population in progress · citable by Plan |
| `Review` | IU-3-06A gate |
| `Frozen` | Post STEP7 Freeze (later) |
| `Archived` | Superseded register edition |

> Header status ≠ Row `status`.

---

## 3. Row Field Schema

### 3.1 Identity & Trace

| Field | Type | Meaning | M/O |
|-------|------|---------|-----|
| `gapId` | string | Permanent Register ID. Format: **`DGR-NNN`**. No reuse after Active. Prefer NNN align with `dGapAId` when 1:1. | **M** |
| `dGapAId` | string | Cite D-GAP-A ID (`D-GAP-A-001` …). | **M** |
| `title` | string | Short title | **M** |
| `rootCause` | string | One-line root cause | **M** |
| `category` | enum cand. | Primary category | **M** |
| `sourceIds[]` | string[] | Related extract IDs | **M** (≥1) |
| `relatedGapIds[]` | string[] | Other `DGR-*` related | **O** |
| `evidence` | string | Evidence cite | **M** |
| `downstreamImpact` | string | P4–P8 impact lean | **O** → **M** before Plan cite |
| `notes` | string | Non-normative notes | **O** |

### 3.2 Classification & Priority

| Field | Type | Meaning | M/O |
|-------|------|---------|-----|
| `severityCandidate` | enum cand. | From D-GAP-A · **not locked** | **M** at row create |
| `severity` | enum cand. \| null | Locked severity after review | **O** until lock · then **M** |
| `severityLocked` | boolean | `false` until explicit lock | **M** (default `false`) |
| `priority` | enum cand. | Disposition order lean | **O** → **M** for High before Plan |

### 3.3 Lifecycle & Ownership

| Field | Type | Meaning | M/O |
|-------|------|---------|-----|
| `status` | enum cand. | Row lifecycle (Register State) | **M** |
| `owner` | string | Disposition owner | **O** → **M** when `status` ≥ `Open` |
| `phase` | enum cand. | Target STEP7 Phase | **O** → **M** when Planned |
| `targetSession` | string | Planned Session/IU id | **O** |
| `deferredTo` | string | When `status=Deferred` | Cond. **M** if Deferred |

### 3.4 Resolution & Verification

| Field | Type | Meaning | M/O |
|-------|------|---------|-----|
| `resolutionClass` | enum cand. | Disposition taxonomy bucket only · **not Change Design** · links to P4+ Disposition Taxonomy · currently **Candidate Classification** only | **O** until Planned |
| `resolutionRef` | string | Cite Change Design / D-PLAN § / ADR | **O** |
| `resolutionSummary` | string | One-line disposition note (**not** design body) | **O** |
| `verificationMethod` | enum cand. | How closure is verified | **O** until Resolved path |
| `verificationRef` | string | Cite verification record | **O** |
| `verifiedAt` | date | Verification date | **O** |
| `closedAt` | date | When `status=Closed` | Cond. **M** if Closed |

#### resolutionClass documentation (Rev.1)

| Item | Statement |
|------|-----------|
| **What it is** | Gap 처분(disposition)을 **분류**하는 Candidate Taxonomy |
| **What it is not** | **Change Design이 아니다** · 파일/JSON/패치/ADR 본문을 담지 않는다 |
| **P4 linkage** | P4 `D-PLAN` 이후 Disposition Taxonomy와 **연결되는 분류 축** |
| **Maturity now** | **Candidate Classification**만 정의 · enum Lock 아님 |
| **Population** | Design 본문은 `resolutionRef`에만 |

```text
resolutionClass     = taxonomy bucket (candidate)
resolutionRef       = Change Design / D-PLAN § / ADR cite
resolutionSummary   = one-line disposition note (not design body)
```

---

## 4. Enum Candidates (제안만 · Lock 금지)

### 4.1 `category`

`Validation` · `CatalogFreeze` · `Deferred` · `ReportOps` · `Audit` · `Inventory` · `CrossProcess`

### 4.2 `severityCandidate` / `severity`

`High` · `MediumHigh` · `Medium` · `LowMedium` · `Low`

### 4.3 `priority`

`P0` · `P1` · `P2` · `P3`

### 4.4 Row `status`

`Draft` · `Open` · `Planned` · `InProgress` · `Deferred` · `Resolved` · `Closed` · `Wontdo` · `Superseded`

```text
Draft → Open → Planned → InProgress → Resolved → Closed
                ↘ Deferred
                ↘ Wontdo
Any → Superseded (merge)
```

### 4.5 `phase`

`P3` · `P4` · `P5` · `P6` · `P7` · `P8` · `PostSTEP7`

### 4.6 `resolutionClass` (values unchanged in Rev.1)

`SchemaAlign` · `NormalizeData` · `CatalogFreezeDelivery` · `PolicyPromote` · `AuditExecution` · `PackageComplete` · `IdentityAlign` · `NamingNormalize` · `MetadataUniform` · `CanonicalAlign` · `TargetSetExpand` · `ReportExport` · `AcceptResidual` · `Other`

### 4.7 `verificationMethod`

`DocReview` · `RegisterUpdate` · `BuildSmoke` · `ParityCheck` · `OfficialRevalidation` · `PlanAttestation` · `N/A`

---

## 5. ID & Integrity Rules

| ID | Rule |
|----|------|
| **IR-1** | `gapId` = **`DGR-NNN`** · permanent · no reuse |
| **IR-2** | Every row **SHALL** cite exactly one primary `dGapAId` |
| **IR-3** | `sourceIds[]` **SHALL** be subset of IU-3-01A ∪ IU-3-02A extract IDs (or documented merge note) |
| **IR-4** | No new Gap in Register beyond D-GAP-A without new Analysis Session |
| **IR-5** | `severityLocked=false` until explicit Review Session |
| **IR-6** | High (`severityCandidate` or locked `High`) **SHALL** be rowed before VG-P3 |
| **IR-7** | `resolutionSummary` ≠ Change Design; design lives in `resolutionRef` |
| **IR-8** | Status ≠ Validation Execution Status · ≠ Audit Finding Status |

### gapId naming (Rev.1)

**채택: `DGR-NNN`** (비채택: `GAP-NNN`, `D-GAP-R-NNN`)

```text
D-GAP-A-001          (Analysis)
        ↓  dGapAId (Mandatory)
DGR-001              (Register Row)
        ↓  resolutionRef / phase / targetSession
D-PLAN / Pilot IU    (P4+)
```

---

## 6. Population Order

| Order | Session | Action |
|------:|---------|--------|
| 1 | **IU-3-05A** | High `severityCandidate` rows |
| 2 | **IU-3-05B** | Remainder rows |
| 3 | **IU-3-06A** | Review / severity gate · undocumented High = 0 |

---

## 7. Row Shape Skeleton (empty)

```text
gapId                : DGR-NNN
dGapAId              : D-GAP-A-NNN
title                :
rootCause            :
category             : <enum candidate>
sourceIds[]          : [ ... ]
relatedGapIds[]      : [ ]
severityCandidate   : <enum candidate>
severity            : null
severityLocked      : false
priority             : <optional>
status               : Draft
owner                :
phase                :
targetSession        :
deferredTo           :
evidence             :
downstreamImpact     :
resolutionClass      : <enum candidate>  # taxonomy only · not Change Design
resolutionRef        :
resolutionSummary    :
verificationMethod   :
verificationRef      :
verifiedAt           :
closedAt             :
notes                :
```

---

## 8. Document Control

| Item | Value |
|------|-------|
| Version | **v0.1 Draft Rev.1** |
| Location | `System Platform Standard (SPS) v1.0/STEP7_D-GAP-R_Field_Schema.md` |
| Rows | See `STEP7_D-GAP-R.md` |

### Revision History

| Version | Date | Change |
|---------|------|--------|
| v0.1 Draft | 2026-07-19 | Initial schema (IU-3-04A) |
| **v0.1 Draft Rev.1** | 2026-07-19 | `gapId` → `DGR-NNN` · `resolutionClass` docs only |

---

*End of STEP7_D-GAP-R_Field_Schema.md v0.1 Draft Rev.1*
