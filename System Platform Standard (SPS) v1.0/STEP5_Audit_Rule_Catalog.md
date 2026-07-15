# STEP5_Audit_Rule_Catalog.md

```
Document  : STEP5_Audit_Rule_Catalog.md
Version   : v1.0
Status    : Active · Audit Rule Catalog SSOT
Date      : 2026-07-15
STEP      : STEP5-3
Basis     : STEP5_Architecture_Audit_Framework.md v1.0 Frozen
            STEP5_Audit_Plan.md v1.0
            STEP5_Audit_Rule_Catalog_Analysis.md v1.1
SPS       : System Platform Standard (SPS) v1.0
Rule      : Audit Rule SSOT · Independent of Observation / Inventory
Baseline  : Batch6 Final Freeze (ec71ef9) · STEP4 Inventory Final (v1.0) Read-only
```

---

## 1. Catalog Overview

### 1.1 Purpose

본 문서는 SPS STEP5 Architecture Audit에서 사용하는 **Audit Rule의 SSOT**이다.

Rule는 Architecture 규범(Norm)을 Permanent ID로 고정하여  
Evidence · Finding · Violation · Recommendation · Decision · STEP6 Validation · STEP7 Standardization이  
동일 기준으로 참조하게 한다.

### 1.2 Responsibilities

| Responsibility | Description |
|----------------|-------------|
| Audit Rule SSOT | Architecture Audit 규범의 단일 출처 |
| Rule Anchor Source | Evidence의 **유일한** Rule 참조원 |
| Judgment basis | Finding / Violation / Decision의 규범 근거 |
| STEP6 reference | Schema Validation 등이 참조하는 규범 (실행 Owner는 STEP6) |
| STEP7 reference | Recommendation · Migration · Standardization의 목표 규범 |

### 1.3 Non-Responsibilities

본 Catalog는 다음을 **생성·수행하지 않는다.**

- Observation / Inventory / Fact
- Evidence / Finding / Violation / Recommendation / Decision 레코드
- Schema Validation 실행
- Standardization / Migration 구현
- Runtime / JSON / 코드 변경

### 1.4 Scope

| In Catalog | Out of Catalog |
|------------|----------------|
| Rule ID · Statement · Scope · Lifecycle · Category | STEP4 Fact / OBS |
| Example Rules (seed) | Full Finding set |
| Version / ADR policy | Framework structure changes |

### 1.5 SSOT Principles

| Principle | Statement |
|-----------|-----------|
| Rule ≠ Fact | Inventory / Observation 값을 대체하지 않는다 |
| Rule ≠ Observation | OBS Code와 Rule ID는 독립 Permanent ID |
| Rule ≠ Finding | Rule은 규범 · Finding은 Evidence 기반 편차 서술 |
| Rule ≠ Decision | Decision은 Rule을 **소비**할 뿐 Rule을 쓰지 않는다 |
| Independence | Observation Catalog · Inventory Table과 **독립 문서** |
| Sole Rule Source | Catalog에 없는 ID는 Evidence Rule Anchor 금지 |

### 1.6 Related Documents

| Document | Role |
|----------|------|
| `STEP5_Architecture_Audit_Framework.md` v1.0 Frozen | Pipeline · Evidence · Decision · Exit Gate |
| `STEP5_Audit_Plan.md` v1.0 | Category sequence · Coverage · Rule Category scope |
| `STEP5_Audit_Rule_Catalog_Analysis.md` v1.1 | Pre-catalog design (Statement · Scope · Lifecycle) |
| `System_Inventory.md` v1.0 Final | Fact input (Read-only) — not Rule SSOT |

---

## 2. Category Index

### 2.1 Official Categories

| Prefix | Category | STEP5 use | Notes |
|--------|----------|-----------|-------|
| **PKG-R-** | Package Rule | Active | Package Completeness · composition |
| **META-R-** | Metadata Rule | Active | Shape · semantic key norms |
| **REG-R-** | Registration Rule | Active | Registration key · chain · discovery |
| **RT-R-** | Runtime Rule | Active | Runtime observation norms |
| **CAN-R-** | Canonical Rule | Active | Canonical Template alignment |
| **CON-R-** | Contract Rule | Active | Runtime Contract content / exposure norms |
| **SCH-R-** | Schema Rule | Reference | Normative reference · **Validation execution = STEP6** |
| **API-R-** | Public API Rule | Active | Public API surface norms |

### 2.2 Identity Mapping (No ID-R Prefix)

Audit Plan의 **Identity** Category는 별도 Rule Prefix를 갖지 않는다.

| Identity / Naming concern | Handled under |
|---------------------------|---------------|
| directory ↔ systemId consistency | META-R · CAN-R (as applicable) |
| Package presence / composition | PKG-R |
| Naming / casing norms | META-R · CAN-R |

`ID-R-` / `NAME-R-` 신설은 Framework ADR (v1.1+) 없이 금지한다.

### 2.3 Contract vs Public API

| Category | Focus |
|----------|-------|
| CON-R | Runtime Contract **내용·노출 규범** |
| API-R | Runtime **Public API surface** (export / entry boundary) |

통합하지 않는다.

---

## 3. Rule Naming 규칙

### 3.1 ID Format

```text
{PREFIX}{NNN}

PREFIX ∈ { PKG-R- | META-R- | REG-R- | RT-R- | CAN-R- | CON-R- | SCH-R- | API-R- }
NNN    = zero-padded decimal sequence per prefix (001, 002, …)
```

Examples: `PKG-R-001` · `META-R-001` · `SCH-R-001`

### 3.2 Permanent ID Principles

| Rule | Statement |
|------|-----------|
| Permanent Identifier | ID는 SPS 전역에서 동일 Rule을 가리킨다 |
| Meaning Stability | Active 이후 의미를 바꾸려면 **새 ID** |
| No Reuse | Deprecated / Superseded / Archived ID를 다른 의미로 재사용 금지 |
| No Version in ID | `PKG-R-001-v2` 형태 금지 · Version은 Catalog/Revision 필드 |

### 3.3 Allocation

- Sequence는 **Category Prefix별** 독립 증가
- 번호 공백은 허용하되, retire 후 그 번호를 새 의미에 재사용하지 않음
- 본 Catalog v1.0은 각 Prefix의 **001 예시 Rule**만 seed로 둔다 (확장 예약)

### 3.4 Deprecated / Superseded Naming

- Deprecated: ID 유지 · Status만 변경
- Superseded: ID 유지 · `supersededBy`에 후속 Rule ID 필수
- 후속 Rule은 **새 ID** (예: 구 `PKG-R-001` → 신 `PKG-R-014`)

---

## 4. Rule Statement Standard

### 4.1 Official Form — Requirement Block

모든 Rule Statement는 다음 4필드로 구성한다.

```text
Rule Statement
├── Requirement
├── Condition
├── Expected Result
└── Failure Interpretation
```

| Field | Meaning |
|-------|---------|
| **Requirement** | SHALL/MUST 규범 |
| **Condition** | 적용 전제 (Scope · Fact 유형) |
| **Expected Result** | Pass 기준 (관찰 가능) |
| **Failure Interpretation** | Fail 시 Architecture 의미 (판정 **힌트** · Decision 확정 아님) |

### 4.2 Optional Narrative View

```text
IF     <Condition>
THEN   <Expected Result>
BECAUSE <Requirement>
# on failure: <Failure Interpretation>
```

Catalog 저장 Shape는 Requirement Block이다.

### 4.3 Writing Rules

1. Rule ≠ Fact — OBS/Inventory 특정 값을 Statement에 하드코딩하지 않는다  
2. Rule ≠ Finding — 특정 SYS 결론을 Statement에 쓰지 않는다  
3. Pass/Fail이 Deterministic Audit에 맞게 재현 가능해야 한다  
4. SCH-R Expected Result는 Validation **규범**이며 STEP5에서 Schema Validation을 실행하지 않는다  

---

## 5. Rule Scope

### 5.1 Scope Model

```text
Rule Scope
├── breadth                 GLOBAL | CATEGORY | TARGETED
├── auditCategory[]         Plan Categories (0..n)
├── systemSelectivity       ALL_SYS | SYS_SET | SINGLE_SYS
├── systemIds[]             optional
├── packageSelectivity      ALL_PACKAGES | PACKAGE_SET | SINGLE_PACKAGE
├── packageDirectories[]    optional
└── specificTarget          optional
```

**Applies To** = Scope의 요약 표기 (예: `GLOBAL · Package · ALL_SYS`).

### 5.2 Breadth

| Breadth | Use |
|---------|-----|
| **GLOBAL** | 모든 inventoried System에 동일 규범 |
| **CATEGORY** | 특정 Audit Category 축 |
| **TARGETED** | 명시 SYS / Package / Specific Target (드묾) |

권장 기본: `GLOBAL` 또는 `CATEGORY` + `ALL_SYS`.  
Permanent `SINGLE_SYS` Rule은 지양한다.

### 5.3 Scope ↔ Evidence

- GLOBAL + ALL_SYS → 동일 Rule Anchor를 SYS별 Fact와 결합 가능  
- Scope 밖 SYS에 대해 해당 Rule로 Evidence를 만들지 않음  

---

## 6. Rule Lifecycle

### 6.1 Official Lifecycle

```text
Draft
  ↓
Active
  ↓
Deprecated
  ↓
Superseded
  ↓
Archived
```

### 6.2 State Meanings

| State | Meaning |
|-------|---------|
| **Draft** | 작성 중 · 신규 Evidence Anchor 금지 |
| **Active** | 현행 · Evidence Rule Anchor **허용** |
| **Deprecated** | 사용 비권장 · **삭제가 아님** · 역사적 인용 가능 |
| **Superseded** | 후속 Rule이 대체 · `supersededBy` 필수 |
| **Archived** | 장기 보존 · 신규 Audit Plan 기본 Coverage 제외 |

### 6.3 No Delete Policy

- Active가 된 Rule ID는 history에서 **물리 삭제하지 않는다**
- Draft만 (Active 전) Catalog에서 discard 가능
- OBS No-Reuse와 동일: retired ID 재할당 금지

### 6.4 Mutation Rights (Summary)

| | Draft | Active | Deprecated+ |
|--|-------|--------|-------------|
| Editorial Statement | ✅ | ✅ limited | ❌ |
| Semantic change | ✅ | ❌ → new ID + Supersede | ❌ |
| New Evidence Anchor | ❌ | ✅ | prefer successor |

---

## 7. Rule Record Shape

### 7.1 Required Fields

| Field | Description |
|-------|-------------|
| **Rule ID** | Permanent `{PREFIX}{NNN}` |
| **Category** | PKG · META · REG · RT · CAN · CON · SCH · API |
| **Rule Statement** | Requirement Block (§4) |
| **Rule Scope** | §5 model |
| **Applies To** | Scope summary string |
| **Owner STEP** | STEP5 · STEP6 · Shared · … |
| **Rule Status** | Draft · Active · Deprecated · Superseded · Archived |

### 7.2 Recommended Fields

| Field | Description |
|-------|-------------|
| **Evidence Use** | Typical Fact Anchor types |
| **Severity Hint** | A–D hint for Finding (non-binding) |
| **Related Audit Category** | Plan Category mapping |
| **Superseded By** | Required when Status = Superseded |

### 7.3 Optional Fields

| Field | Description |
|-------|-------------|
| **Catalog Version** | Pin / publication stamp |
| **Rule Revision** | Editorial revision marker |
| **Source Reference** | SPS doc · Template § · Contract § |

### 7.4 Forbidden Fields

Finding text · Violation flag · Decision Status · packageComplete · OBS payload copies

---

## 8. Version Policy

### 8.1 Layers

| Layer | Role |
|-------|------|
| **Catalog Version** | 문서 전체 버전 (본 문서 header) · Deterministic Audit pin |
| **Rule Status** | Lifecycle state per Rule |
| **Rule Revision** | Same ID editorial bump (optional) |
| **ADR** | Prefix 추가 · Breaking 의미 변경 · Category 구조 변경 |

### 8.2 ID ↔ Version Separation

- Version은 ID에 넣지 않는다  
- Evidence는 작성 시점의 **Catalog Version**을 pin 한다  
- Semantic 변경 → **새 Rule ID** + Supersede (Version bump만으로 의미 교체 금지)

### 8.3 When to Bump Catalog Version

| Event | Suggested bump |
|-------|----------------|
| Add Active Rules | Minor |
| Deprecate / Supersede / Archive | Minor or patch |
| Breaking Category / Prefix / Statement Standard | Major + ADR |

### 8.4 ADR Triggers

- New Rule Prefix (e.g. ID-R-)
- Merge/split of Categories
- Change to Statement Standard fields
- Change to Lifecycle or Sole Rule Source rule
- Alignment requiring Framework v1.1+

---

## 9. Rule ↔ Evidence

### 9.1 Sole Rule Source

```text
Fact Anchor (OBS / Inventory / Shape / Reg Fact …)
        +
Rule Anchor (this Catalog · Rule ID only)
        ↓
Evidence
        ↓
Finding
        ↓
(Violation / Recommendation)
        ↓
Architecture Decision
```

| Rule | Statement |
|------|-----------|
| Sole Source | Evidence Rule Anchor는 **본 Catalog ID만** |
| No Ad-hoc Rules | Catalog 미등록 규범 문자열을 Anchor로 사용 금지 |
| No Rule-only Evidence | Fact Anchor 없이 Evidence 금지 |
| No Obs-only Evidence | Rule Anchor 없이 Evidence 금지 |

### 9.2 Catalog Does Not Create Evidence

Rule 추가는 Evidence / Finding / Decision을 자동 생성하지 않는다.  
STEP5-4 / STEP5-5가 Catalog를 **소비**한다.

---

## 10. STEP6 연계

| Topic | Policy |
|-------|--------|
| Primary Rule set | **SCH-R** (plus related META-R as needed) |
| Owner of Validation **execution** | **STEP6** |
| STEP5 role for SCH-R | Reference · Evidence/Deferred · Finding hints |
| schemaComplete | STEP6 Decision/Validation property — not set by this Catalog |
| Immutability | STEP6는 STEP5 Evidence/Finding/Decision을 rewrite하지 않음 |

Validation Rule을 별도 Catalog로 복제하지 않는다.  
동일 Rule ID 공간을 `Owner STEP`으로 구분한다.

---

## 11. STEP7 연계

| Consumer | How it uses the Catalog |
|----------|-------------------------|
| Recommendation | Target / violated Rule ID 인용 |
| Migration Guide | Rule ID + M / RP로 backlog 정렬 |
| Architecture Decision | Normative basis citation |
| Standardization | Rule Statement = 달성 목표 |

STEP7은 Rule Catalog를 **준수·참조**하며, Standardization 과정에서 Rule 본문을 임의 수정하지 않는다.  
Rule 개정이 필요하면 Catalog Lifecycle + Version / ADR 경로를 따른다.

---

## 12. Example Rules (Seed · Shape Illustration)

본 절의 Rule은 **Category당 1개 seed**이다.  
Shape · Statement Standard · Scope 설명용이므로 **전체 Audit Rule set이 아니다.**  
이후 Audit 진행에 따라 동일 Prefix 아래에서 점진 확장한다.

모든 seed Status = **Active** · Catalog Version = **v1.0**

---

### 12.1 PKG-R-001 — Package Four-File Completeness

| Field | Value |
|-------|-------|
| Rule ID | `PKG-R-001` |
| Category | PKG |
| Applies To | `GLOBAL · Package · ALL_SYS` |
| Owner STEP | STEP5 |
| Rule Status | Active |
| Evidence Use | Inventory presence (profile · logic · anchors · system_meta) |
| Severity Hint | A–B |
| Related Audit Category | Package |

**Rule Scope:** breadth=GLOBAL · auditCategory=[Package] · systemSelectivity=ALL_SYS · packageSelectivity=ALL_PACKAGES

**Rule Statement**

| Block | Text |
|-------|------|
| Requirement | Every Runtime System Package SHALL contain `profile.json`, `logic.json`, `anchors.json`, and `system_meta.json`. |
| Condition | When auditing an inventoried System Package under `data/systems/<directory>/`. |
| Expected Result | Inventory (or equivalent package inspection Fact) shows all four files as present. |
| Failure Interpretation | Package composition does not meet Package Completeness norms; Architecture package completeness is at risk. |

---

### 12.2 META-R-001 — system_meta system_id Present

| Field | Value |
|-------|-------|
| Rule ID | `META-R-001` |
| Category | META |
| Applies To | `GLOBAL · Metadata · ALL_SYS` |
| Owner STEP | STEP5 |
| Rule Status | Active |
| Evidence Use | system_meta / Metadata Inventory · Identity Facts |
| Severity Hint | A–B |
| Related Audit Category | Metadata · Identity |

**Rule Scope:** breadth=GLOBAL · auditCategory=[Metadata, Identity] · ALL_SYS

**Rule Statement**

| Block | Text |
|-------|------|
| Requirement | Every System Package SHALL expose a string `system_id` in `system_meta.json`. |
| Condition | When auditing metadata identity fields for an inventoried System. |
| Expected Result | Metadata Fact shows `system_meta.system_id` present as string. |
| Failure Interpretation | Metadata identity anchor is missing; Identity / Metadata alignment cannot be established from system_meta. |

---

### 12.3 REG-R-001 — Registration Key Equals Directory

| Field | Value |
|-------|-------|
| Rule ID | `REG-R-001` |
| Category | REG |
| Applies To | `CATEGORY · Registration · ALL_SYS` |
| Owner STEP | STEP5 |
| Rule Status | Active |
| Evidence Use | Registration Matrix · directory Fact |
| Severity Hint | B |
| Related Audit Category | Registration |

**Rule Scope:** breadth=CATEGORY · auditCategory=[Registration] · ALL_SYS

**Rule Statement**

| Block | Text |
|-------|------|
| Requirement | Registration key SHALL equal the System Package directory name. |
| Condition | When auditing Registration Facts for an inventoried System. |
| Expected Result | Registration Fact key matches Inventory `directory`. |
| Failure Interpretation | Registration identity diverges from package directory; Runtime discovery/registration consistency is at risk. |

---

### 12.4 RT-R-001 — No Consumer Bypass of Registry Public Entry

| Field | Value |
|-------|-------|
| Rule ID | `RT-R-001` |
| Category | RT |
| Applies To | `CATEGORY · Runtime · ALL_SYS` |
| Owner STEP | STEP5 |
| Rule Status | Active |
| Evidence Use | Runtime / Import-graph / Registration observation Facts (as available) |
| Severity Hint | A–B |
| Related Audit Category | Runtime · Contract |

**Rule Scope:** breadth=CATEGORY · auditCategory=[Runtime] · ALL_SYS

**Rule Statement**

| Block | Text |
|-------|------|
| Requirement | Application / Domain consumers SHALL obtain System Contracts via Registry Public Entry and SHALL NOT bypass Runtime Contract assembly for System JSON access. |
| Condition | When auditing Runtime access patterns against SPS Runtime / Batch6 Public Entry norms. |
| Expected Result | Runtime Facts show Contract supply via public Registry entry; direct System JSON consumption by main-tree consumers is absent. |
| Failure Interpretation | Runtime boundary is violated; Architecture Runtime Contract discipline is compromised. |

---

### 12.5 CAN-R-001 — Canonical Directory Designation

| Field | Value |
|-------|-------|
| Rule ID | `CAN-R-001` |
| Category | CAN |
| Applies To | `CATEGORY · Canonical · ALL_SYS` |
| Owner STEP | STEP5 |
| Rule Status | Active |
| Evidence Use | Inventory canonical flag · directory Fact |
| Severity Hint | B–C |
| Related Audit Category | Canonical |

**Rule Scope:** breadth=CATEGORY · auditCategory=[Canonical] · ALL_SYS

**Rule Statement**

| Block | Text |
|-------|------|
| Requirement | Exactly one inventoried System SHALL be designated Canonical, and that designation SHALL be the package directory `5_half_system`. |
| Condition | When auditing Canonical designation Facts across the Inventory set. |
| Expected Result | Inventory shows Canonical=YES only for directory `5_half_system`; all others Canonical=NO. |
| Failure Interpretation | Canonical reference baseline is ambiguous or incorrect; Canonical comparisons lose a single source of architectural truth. |

---

### 12.6 CON-R-001 — System Contract Exposure Required

| Field | Value |
|-------|-------|
| Rule ID | `CON-R-001` |
| Category | CON |
| Applies To | `CATEGORY · Contract · ALL_SYS` |
| Owner STEP | STEP5 |
| Rule Status | Active |
| Evidence Use | Registration / Runtime Contract visibility Facts |
| Severity Hint | A–B |
| Related Audit Category | Contract |

**Rule Scope:** breadth=CATEGORY · auditCategory=[Contract] · ALL_SYS

**Rule Statement**

| Block | Text |
|-------|------|
| Requirement | Every inventoried System participating in Runtime SHALL be exposable as an assembled System Contract through the Runtime Contract path. |
| Condition | When auditing Contract exposure for an inventoried System. |
| Expected Result | Registration/Contract Facts indicate the System is visible through the Contract/Registry path (per SPS Runtime Contract norms). |
| Failure Interpretation | System cannot participate consistently in Runtime Contract architecture. |

---

### 12.7 SCH-R-001 — Schema Validation Before Standardization Reliance

| Field | Value |
|-------|-------|
| Rule ID | `SCH-R-001` |
| Category | SCH |
| Applies To | `CATEGORY · (Schema reference) · ALL_SYS` |
| Owner STEP | **STEP6** (Shared reference from STEP5) |
| Rule Status | Active |
| Evidence Use | Metadata Shape / Schema-related Facts · Deferred to STEP6 for execution |
| Severity Hint | B |
| Related Audit Category | Metadata (reference) · Deferred Schema |

**Rule Scope:** breadth=CATEGORY · auditCategory=[Metadata] · ALL_SYS · specificTarget=`schema-validation-norm`

**Rule Statement**

| Block | Text |
|-------|------|
| Requirement | System Package schemas SHALL satisfy SPS Schema Definition norms before Standardization treats the System as schema-complete. |
| Condition | When Schema Validation norms are applied (Owner execution = STEP6). |
| Expected Result | Schema Validation Result records compliance with Schema Definition for the System Package. |
| Failure Interpretation | Schema Completeness cannot be claimed; Standardization relying on schema-complete status is premature. |

> STEP5 may cite `SCH-R-001` in Evidence/Deferred Findings.  
> STEP5 does **not** execute Schema Validation.

---

### 12.8 API-R-001 — Public Runtime API Surface Closed

| Field | Value |
|-------|-------|
| Rule ID | `API-R-001` |
| Category | API |
| Applies To | `CATEGORY · Public API · ALL_SYS` |
| Owner STEP | STEP5 |
| Rule Status | Active |
| Evidence Use | Public API / export-boundary Facts (Batch6 closure norms) |
| Severity Hint | A–B |
| Related Audit Category | Public API · Runtime |

**Rule Scope:** breadth=CATEGORY · auditCategory=[Public API] · ALL_SYS

**Rule Statement**

| Block | Text |
|-------|------|
| Requirement | Only the designated Runtime Public API surface SHALL be exported for System Contract consumers; non-public loader/bootstrap/internal assembly APIs SHALL NOT be part of the public surface. |
| Condition | When auditing Runtime Public API surface against SPS / Batch6 Public API closure norms. |
| Expected Result | Public API Facts show consumers limited to designated public exports; internal loader/bootstrap APIs are not public. |
| Failure Interpretation | Public API boundary leaks internals; Architecture API discipline is compromised. |

---

### 12.9 Seed Index

| Rule ID | Category | Status | Purpose |
|---------|----------|--------|---------|
| PKG-R-001 | PKG | Active | Package four-file completeness |
| META-R-001 | META | Active | system_meta.system_id present |
| REG-R-001 | REG | Active | Registration key = directory |
| RT-R-001 | RT | Active | Registry public entry · no JSON bypass |
| CAN-R-001 | CAN | Active | Canonical = 5_half_system only |
| CON-R-001 | CON | Active | System Contract exposure |
| SCH-R-001 | SCH | Active | Schema norms · STEP6 execution |
| API-R-001 | API | Active | Public API surface closed |

**Extension policy:** Audit 진행 중 필요 Rule을 동일 Prefix에 `002+`로 추가하고 Catalog Version을 bump한다.

---

## 13. Consumption Checklist (Downstream)

| STEP | Consumes |
|------|----------|
| STEP5-4 Evidence | Rule ID as Rule Anchor · Catalog Version pin |
| STEP5-5 Finding / Violation / REC / DEC | Rule citation |
| STEP5-6 Report / Handoff | Catalog Version pinned list |
| STEP6 | SCH-R (+ related) for Validation |
| STEP7 | Rule IDs as Standardization targets |

---

## 14. Revision History

| Version | Status | Content |
|---------|--------|---------|
| **v1.0** | **Active** | Catalog SSOT established · Standards · Lifecycle · 8 seed Rules (`*-R-001`) |

---

*End of STEP5_Audit_Rule_Catalog.md v1.0*
