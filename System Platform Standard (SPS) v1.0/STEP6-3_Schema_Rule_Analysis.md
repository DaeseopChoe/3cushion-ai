# STEP6-3_Schema_Rule_Analysis.md

```text
Document  : STEP6-3_Schema_Rule_Analysis.md
Version   : v1.1
Status    : Analysis Complete · STEP6-4 Input Reinforced
Date      : 2026-07-17
STEP      : STEP6-3 (Reinforcement)
Owner     : Schema Validation
Type      : Schema Rule Analysis (Analysis Only)
Baseline  : Framework v1.0 Freeze Candidate (Locked · Consume)
            Pipeline v0.6 Freeze Candidate (Locked · Consume)
            Runtime ec71ef9 · STEP4 Final RO · STEP5 Final Freeze RO
Rule      : Analysis only · No Catalog bodies · No Namespace lock · No Register/Report/Engine
Revision  : v1.1 — Domain≠Family separation · Rule Dependency cascade · Classification axes = candidates only
```

---

## 1. Purpose

본 문서는 STEP6 Schema Validation의 **Validation Rule 구조**를 Framework · Pipeline Freeze Candidate를 **Consume-only**로 소비하여 분석한다.

목적:

- Validation Rule이 다루어야 할 Domain · Type · Layer · Coverage · Family · Classification 후보를 정리한다.
- **Domain(무엇을)** 과 **Family(어떻게)** 를 독립 축으로 분리한다.
- Rule 간 **실행 의존·Cascade** 를 Engine이 소비할 수 있는 관점으로 분석한다 (Engine 설계는 하지 않음).
- STEP6-4 Schema Rule Catalog Design의 **입력**을 보강한다.
- STEP5 `SCH-R-*`를 **참조(intent)** 로만 다루고, 실행 Rule은 STEP6 Catalog가 소유함을 유지한다.

본 문서는 Rule 본문 · ID 할당 · Namespace 확정 · Register Shape · Engine 설계 · Classification 축 확정을 **포함하지 않는다**.

---

## 2. Scope

### 2.1 In Scope

| 항목 | 내용 |
|------|------|
| Validation Rule Domain | **무엇을** 검증하는가 (독립 축) |
| Rule Family | **어떻게** 검증하는가 / Rule 성격 (독립 축) |
| Rule Type | Framework Glossary 9종 (Consume · Layer 대응) |
| Layer Mapping | L1–L7 ↔ Type / Domain / Family 대응 |
| Coverage | Required / Optional / Deferred 후보 · `schemaComplete` 기여 (수치식 미정) |
| Rule Dependency | 선행·후행·Skip·Cascade·Blocking·Deferred |
| Rule Gap | 중복 · 누락 · 경계 모호성 |
| Pending (U1–U12) | Catalog 설계에 미치는 영향 |
| Classification candidates | 축 **후보만** 메모 · **미확정** |
| STEP6-4 Input | Catalog Design 착수 입력 목록 |

### 2.2 Out of Scope (절대 비작성)

| 금지 | 이유 |
|------|------|
| Rule Catalog 본문 / Rule Statement / Rule ID | STEP6-4+ |
| Rule Namespace 확정 (U1) | Catalog-owned · Pending |
| Classification 축 확정 | STEP6-4 Design |
| Register / Report Shape | STEP6-5+ |
| Validation Engine / Schema JSON | 후속 |
| Framework / Pipeline 수정 | Locked |
| Architecture / Runtime / System JSON 변경 | Locked · Frozen |
| Stage 이름 확정 | Pipeline Pending |
| Coverage 수치식 / 임계값 | Pending |

### 2.3 Consume Sources (RO)

```text
Framework  → Objects · Layers L1–L7 · Status · Severity · schemaComplete · VAL-* · SCH-R relation
Pipeline   → Binding (I1) · Orchestration L1→L7 · Layer≠Stage · Catalog binds to Layers
STEP5 SCH-R → Reference intent only (non-mutation)
```

### 2.4 Axis Separation Principle (v1.1)

```text
Domain  = WHAT is being validated   (대상 영역)
Family  = HOW / nature of the check (검증 방식·성격)
Type    = Framework check kind      (Glossary · Layer binding)
Layer   = Concern depth L1–L7       (Framework)
```

Domain과 Family는 **1:1 고정 매핑이 아니다**.  
한 Domain에 여러 Family가 붙을 수 있고, 한 Family가 여러 Domain에 적용될 수 있다.

---

## 3. Validation Domain Analysis

### 3.0 Domain definition (v1.1)

| Term | Definition |
|------|------------|
| **Domain** | Validation **대상 영역** — *무엇을* 검증하는가 |
| **Not Domain** | 검증 방식(Presence/Typing/…) · Severity · Coverage band · Stage 이름 |

### 3.1 Primary Validation Target

Framework §7 · §8 및 Appendix C **U2**에 따라:

| Grain | 의미 | 분석 판단 |
|-------|------|-----------|
| **System Package (`SYS-*`)** | Inventory 식별 단위 · L1/L6/L7의 주 Target | **Primary grain (권장 lean)** |
| **Package file** | `profile` · `logic` · `anchors` · `system_meta` | L2–L5 실행 단위 |
| **JSON path / field** | Field / Reference 대상의 세분 | L4–L5 grain |

**분석 결론:** Official Run 주소 공간은 **Package/SYS-first**, 실행은 **File → Path**로 내려간다. U2는 미결정.

### 3.2 Canonical package files (Domain carriers — not Domains)

| File | Carries content for Domains |
|------|------------------------------|
| `profile.json` | Structure · Field · Reference · (parts of) Semantic |
| `logic.json` | Structure · Field · Reference · Cross-file related content |
| `anchors.json` | Structure · Field · Reference · Semantic (valueSpace 등) |
| `system_meta.json` | Structure · Field · Package identity surfaces |

파일 자체는 Domain이 아니라 **Domain이 적용되는 carrier**다.

### 3.3 Validation Domain Map (WHAT)

| Domain ID | Domain (대상 영역) | Question answered | Typical Layers |
|-----------|-------------------|-------------------|----------------|
| **D-PACKAGE** | **Package** | 패키지·파일 세트가 식별·구성되는가? | L1 (· L6 composition side) |
| **D-SYNTAX** | **Syntax** | 파일 텍스트가 구문적으로 처리 가능한가? | L2 |
| **D-STRUCTURE** | **Structure** | 문서 구조(루트·노드 shape)가 규범에 맞는가? | L3 |
| **D-FIELD** | **Field** | 필드/경로의 존재·형·값 공간이 규범에 맞는가? | L4 |
| **D-REFERENCE** | **Reference** | 참조가 범위 내 대상으로 해석되는가? | L5 |
| **D-CROSSFILE** | **Cross-file** | 파일 간 내용이 서로 모순 없는가? | L6 |
| **D-SEMANTIC** | **Semantic** | 구조 너머 의미 일관성이 성립하는가? | L7 |

> **Note:** v1.0의 `D-PKG`/`D-FLD` 등은 위 Domain ID로 정리한다.  
> 구 Family 코드(PKG/REQ/…)와 Domain ID를 **동일시하지 않는다**.

### 3.4 What is NOT a Validation Domain

| Non-domain | Owner | Why excluded |
|------------|-------|--------------|
| Presence / Typing / Consistency (방식) | → **Family** | HOW 축 |
| Architecture Audit judgment | STEP5 | `FND-*` · `packageComplete` |
| Inventory Fact mutation | STEP4 | Facts RO |
| Runtime Contract / Loader | Runtime | Schema Layer 밖 |
| Standardization | STEP7 | Validation consumer |
| UI / Orchestrator | AAS App | Schema Layer 밖 |

### 3.5 Domain × Family independence (preview)

| Example Rule concern | Domain (WHAT) | Family (HOW) |
|----------------------|---------------|--------------|
| Required key missing in profile | Field | Presence |
| Wrong JSON type on a field | Field | Typing |
| Enum / valueSpace out of range | Field | Domain-check* |
| Anchor id not found | Reference | Resolution |
| profile.systemId ≠ meta identity | Cross-file | Consistency |
| File set incomplete | Package | Presence |
| Invalid JSON text | Syntax | Parseability |
| Meaning-level formula inconsistency | Semantic | Consistency |

\* “Domain-check” Family = value-domain **방식**; Validation **Domain** `D-FIELD`와 이름을 혼동하지 말 것 (Catalog Design에서 표기 구분 권장).

---

## 4. Rule Type Analysis

Framework Appendix A Glossary **Rule Type** (Kind of check) — Framework Consume.

| Rule Type | Meaning (Consume) | Primary Domain (WHAT) | Primary Layer |
|-----------|-------------------|----------------------|---------------|
| **Package** | Package identifiable · required file set | Package | L1 |
| **Syntax** | File syntactically processable | Syntax | L2 |
| **Structure** | Document structure norms | Structure | L3 |
| **Required** | Required fields / paths present | Field | L4 |
| **Type** | Field types conform | Field | L4 |
| **Domain** | Value domains / ranges / enums | Field | L4 |
| **Reference** | References resolve | Reference | L5 |
| **Cross-file** | Multi-file consistency | Cross-file | L6 |
| **Semantic** | Meaning-level consistency | Semantic | L7 |

### 4.1 Type vs Family vs Domain

| Axis | Role |
|------|------|
| **Domain** | 대상 영역 (WHAT) |
| **Family** | 검증 방식·성격 (HOW) — §7 |
| **Type** | Framework이 정의한 check kind · Layer binding의 1차 앵커 |

Type은 Framework SSOT에서 온 축이다. Family는 Catalog 조직용 HOW 축이다.  
STEP6-4에서 Type↔Family 정렬표를 설계한다 (본 STEP에서 1:1 고정하지 않음).

### 4.2 Type → Layer discipline

| Norm | Statement |
|------|-----------|
| Primary Layer | Type **SHOULD** bind primarily to one Layer |
| L4 triple | Required · Type · Domain Types share L4, different **Family** (Presence / Typing / Domain-check) |
| Severity ≠ Type | Severity = Rule Outcome property (Framework §9) |

### 4.3 Type overlaps to watch

| Overlap | Guidance |
|---------|----------|
| Structure vs Required | 부재 → Presence(Family)+Field; shape 불일치 → Structure Domain + Structure Type |
| Domain(Type) vs Semantic | 측정 가능 값공간 → Field+Domain-check; 해석적 의미 → Semantic Domain |
| Reference vs Cross-file | 단일 참조 해석 → Reference; 파일 간 합의 → Cross-file Domain + Consistency Family |
| Package vs Cross-file | 파일 부재 → Package+Presence; 파일 불일치 → Cross-file+Consistency |

---

## 5. Layer Mapping Analysis

### 5.1 Layer summary (Framework Consume)

| Layer | Name | Target grain | Cascade role |
|-------|------|--------------|--------------|
| **L1** | Package Integrity | Package / SYS-* | BLOCKER → deeper SKIPPED |
| **L2** | Syntax Integrity | File | BLOCKER → deeper SKIPPED (unparsable file) |
| **L3** | Structure Integrity | Parsed document | Requires L2 PASS |
| **L4** | Field Constraints | Paths / fields | Requires L3 sufficient |
| **L5** | Reference Integrity | Reference-bearing paths | Needs L2/L3; SHOULD L4 when type matters |
| **L6** | Cross-file Integrity | Multi-file package | Requires L1; SHOULD past L2; **U11** |
| **L7** | Semantic Consistency | Package / conceptual | **MAY Deferred** · **U3** |

### 5.2 Mapping matrix (Type × Layer)

| Type \ Layer | L1 | L2 | L3 | L4 | L5 | L6 | L7 |
|--------------|----|----|----|----|----|----|-----|
| Package | ● | | | | | ○ | |
| Syntax | | ● | | | | | |
| Structure | | | ● | | | | |
| Required | | | ○ | ● | | | |
| Type | | | | ● | | | |
| Domain | | | | ● | | | |
| Reference | | | | ○ | ● | ○ | |
| Cross-file | | | | | ○ | ● | |
| Semantic | | | | | | ○ | ● |

● = primary · ○ = secondary (Catalog must justify)

### 5.3 Domain × Layer (WHAT × depth)

| Domain | Primary Layer |
|--------|---------------|
| Package | L1 |
| Syntax | L2 |
| Structure | L3 |
| Field | L4 |
| Reference | L5 |
| Cross-file | L6 |
| Semantic | L7 |

### 5.4 Layer ≠ Stage (Pipeline Consume)

Catalog Rules **SHALL** bind to **Layers**, not Stage names.

```text
Pipeline Stage (names Pending)
  └── Execution loop: bind Rules → evaluate L1→L7 → BLOCKER cascade → Results → VAL → schemaComplete
```

### 5.5 Rule flow (Layer order — conceptual)

```text
Target (SYS-* / package)
  → L1 Package Domain rules
  → L2 Syntax Domain rules (per file)
  → L3 Structure Domain rules (per file)
  → L4 Field Domain rules (Presence → Typing → Domain-check)
  → L5 Reference Domain rules
  → L6 Cross-file Domain rules
  → L7 Semantic Domain rules (In Scope) OR Deferred Item
  → Result rollup → schemaComplete
```

상세 Skip/Cascade는 **§9** 참고.

---

## 6. Coverage Analysis

### 6.1 Coverage axes (candidates — not locked)

| Axis | Candidate values | Decision owner |
|------|------------------|----------------|
| Coverage Class | Required · Optional · Deferred | STEP6-4 |
| Run Scope | In-Run · NOT_RUN · SKIPPED | Pipeline options + cascade |
| Completeness contribution | Affects / does not affect `schemaComplete` | Framework §10 + Catalog policy |
| Target selectivity | ALL_SYS · subset · single | U2 |

### 6.2 schemaComplete contribution (conceptual)

| Outcome class | Lean default effect |
|---------------|---------------------|
| Required + BLOCKER / ERROR | Forces **NO** (U7 cascade policy Pending) |
| Required + WARNING only | **MAY** remain **YES** (U5) |
| INFO only | **SHALL NOT** alone force NO |
| Deferred (policy) | Deferred Item; silent YES 금지 |
| SKIPPED via BLOCKER | U7 Strict NO vs UNDECIDED — Pending |

### 6.3 `packageComplete` ≠ `schemaComplete`

| Property | Owner |
|----------|-------|
| `packageComplete` | STEP5 |
| `schemaComplete` | STEP6 |

### 6.4 Coverage banding (draft input for STEP6-4 — not locked)

| Band | Typical Domains | First Official Run lean |
|------|-----------------|-------------------------|
| Required | Package→Reference + core Cross-file | In Scope |
| Optional | Soft Field Domain-check / style | In Scope; non-forcing |
| Deferred | Semantic | Deferred Item (U3 lean) |

---

## 7. Rule Family Analysis

### 7.0 Family definition (v1.1)

| Term | Definition |
|------|------------|
| **Family** | Validation Rule의 **검증 방식·성격** — *어떻게* 검증하는가 |
| **Not Family** | Domain(대상) · Layer · Severity · Namespace |

Family는 Catalog **조직·탐색** 축이다. Namespace가 아니다.  
Domain과 **독립**이다.

### 7.1 Proposed Rule Families (HOW)

| Family ID | Family (방식·성격) | Meaning | Typical Domains (examples, not exclusive) |
|-----------|-------------------|---------|------------------------------------------|
| **F-PRESENCE** | **Presence** | 존재·구성·필수 항목 유무 | Package · Field · Structure(부분) |
| **F-PARSE** | **Parseability** | 구문 처리 가능 여부 | Syntax |
| **F-SHAPE** | **Shape** | 구조 shape / schema-shape 적합 | Structure |
| **F-TYPING** | **Typing** | 자료형 적합 | Field |
| **F-DOMAINCHK** | **Domain-check** | 값 공간·범위·열거 적합 | Field |
| **F-RESOLUTION** | **Resolution** | 참조 해석·해소 | Reference |
| **F-CONSISTENCY** | **Consistency** | 동일 대상 내·의미 일관성 | Field · Semantic · (intra) |
| **F-CROSSFILE** | **Cross-file** | 파일 간 합의·불일치 검출 | Cross-file (primary) · Package(composition side) |

> v1.0의 PKG/SYN/STR/REQ/TYP/DOM/REF/XFL/SEM **Family 코드는 Domain과 혼재**되어 폐기한다.  
> Framework **Rule Type** 이름은 유지(Consume). Family는 위 HOW 축으로 재정의.

### 7.2 Domain × Family matrix (independence proof)

| Family \ Domain | Package | Syntax | Structure | Field | Reference | Cross-file | Semantic |
|-----------------|---------|--------|-----------|-------|-----------|------------|----------|
| Presence | ● | | ○ | ● | | ○ | |
| Parseability | | ● | | | | | |
| Shape | | | ● | | | | |
| Typing | | | | ● | | | |
| Domain-check | | | | ● | | | |
| Resolution | | | | | ● | | |
| Consistency | ○ | | ○ | ○ | ○ | ○ | ● |
| Cross-file | ○ | | | | ○ | ● | ○ |

● = common · ○ = possible · blank = atypical

### 7.3 Relation to STEP5 Categories (RO)

| STEP5 Prefix | Relation |
|--------------|----------|
| `PKG-R-*` | Package Domain + Presence/Consistency intent — STEP6 재표현 |
| `SCH-R-*` | Intent pin only — 실행 ID 아님 (U1) |
| Other Audit prefixes | STEP6 Family로 복제하지 않음 |

### 7.4 File affinity tags (optional — not Family)

| Tag | Files |
|-----|-------|
| `F-PROFILE` | profile.json |
| `F-LOGIC` | logic.json |
| `F-ANCHORS` | anchors.json |
| `F-META` | system_meta.json |
| `F-PACKAGE` | multi-file |

Tags ≠ Domain ≠ Family.

---

## 8. Rule Classification Analysis

### 8.0 Status: Candidates only (NOT locked)

Classification / Execution 관련 축은 **STEP6-4에서 설계**한다.  
본 절은 **후보 메모**만 제공한다. **확정하지 않는다.**

### 8.1 Candidate axes (memo for STEP6-4)

| Candidate axis | Example values (memo) | Notes |
|----------------|----------------------|-------|
| Domain | Package · Syntax · Structure · Field · Reference · Cross-file · Semantic | WHAT — §3 |
| Family | Presence · Parseability · Shape · Typing · Domain-check · Resolution · Consistency · Cross-file | HOW — §7 |
| Type | Framework 9 Types | Consume |
| Layer | L1–L7 | Consume |
| Coverage Class | Required · Optional · Deferred | Candidate |
| **Severity** | BLOCKER · ERROR · WARNING · INFO | Framework meanings RO; Catalog defaults TBD |
| **Blocking** | Blocks deeper evaluation · Does not | Cascade-related candidate |
| **Warning** | Non-forcing outcome class | Related U5 · U9 |
| **Optional** | In-run but non-required coverage | Coverage candidate |
| **Deferred** | Not executed this Run · Deferred Item | U3 · L7 |
| Target Grain | Package · File · Path | U2 |
| SCH-R Trace | Optional RO pointer | Framework §18 |
| Execution Axis | (unnamed) ordering / eligibility metadata | STEP6-4 Design |

### 8.2 Analysis invariants (not a Classification lock)

1. Every executable Rule binds to one primary **Layer**.  
2. Domain(WHAT) and Family(HOW) remain independent.  
3. Severity is a Rule Outcome property, not a Layer attribute.  
4. Finding namespace = `VAL-*` only; Rule Namespace = Catalog (U1 Pending).  
5. No Stage-name binding.  
6. Non-mutation: READ → JUDGE → RECORD.

### 8.3 Catalog record fields

필드 목록·Pin layout(U12)·축 확정은 **STEP6-4**. 본 문서는 후보만 전달한다.

---

## 9. Rule Dependency Analysis

Engine 설계·알고리즘·의사코드 구현은 **하지 않는다**.  
아래는 Catalog/Pipeline이 소비할 **의존 관계 분석**이다.

### 9.1 Dependency vocabulary

| Term | Meaning (Analysis) |
|------|-------------------|
| **선행 Rule (Prerequisite)** | 후행 평가 전에 PASS(또는 충분 성공)가 필요한 Rule/Layer 결과 |
| **후행 Rule (Successor)** | 선행 결과에 의존하여 평가되는 Rule |
| **Skip 조건** | 평가를 시작하지 않거나 생략하는 조건 → Execution Status **SKIPPED** |
| **Cascade** | BLOCKER 등이 더 깊은 Layer/후행 Rule을 SKIPPED로 전파 |
| **Blocking Rule** | 실패 시 Cascade를 유발하는 Rule (전형: Default Severity BLOCKER at L1/L2) |
| **Deferred Rule** | Run 정책상 실행하지 않고 Deferred Validation Item으로 남기는 Rule (전형: L7/U3) |

### 9.2 Layer cascade (Framework Consume)

```text
L1 BLOCKER ──cascade──► L2..L7 SKIPPED (same Target)
L2 BLOCKER ──cascade──► L3..L7 SKIPPED (same file / dependent paths)
L3 insufficient ───────► L4+ may not address paths
L4 typing weak ─SHOULD─► L5 token-sensitive refs unreliable
L1 (+ L2 SHOULD) ──────► L6 eligibility (U11 partial Pending)
L1..L6 available ──────► L7 if In Scope; else Deferred
```

| From | To | Relation |
|------|----|----------|
| L1 Blocking FAIL | L2–L7 | Skip (Target) |
| L2 Blocking FAIL | L3–L7 | Skip (file) |
| L3 | L4 | Prerequisite: structure sufficient |
| L4 | L5 | Soft prerequisite when type matters |
| L1 (+ files) | L6 | Prerequisite package; partial = U11 |
| Prior layers | L7 | Prerequisite outcomes **or** Deferred |

### 9.3 Intra-L4 Family chain (Presence → Typing → Domain-check)

사용자 예시와 정합하는 **Field Domain** 내부 의존:

```text
REQ / Presence FAIL (path absent)
        ↓ Skip
TYP / Typing          SKIPPED
        ↓ Skip
DOM / Domain-check    SKIPPED
        ↓ (no typed token)
REF / Resolution      SKIPPED  (path-local refs)
        ↓
SEM                   DEFERRED or SKIPPED
        (policy: Deferred if L7 out of scope; else may Skip if no substrate)
```

| Predecessor | Successor | Skip when |
|-------------|-----------|-----------|
| Presence FAIL | Typing | Path/key absent — typing meaningless |
| Typing FAIL (BLOCKER/ERROR hard) | Domain-check | Value not typed — domain check not meaningful |
| Presence/Typing insufficient | Resolution | No resolvable token |
| L1–L6 incomplete / L7 out of scope | Semantic | **Deferred** (not silent PASS) |

> ERROR(non-BLOCKER)가 동일 Layer 내 후행을 계속할지는 Catalog Severity policy · U10 후보 — **미확정**.

### 9.4 Cross-Domain dependency chains (examples)

**Chain A — Package Blocking**

```text
Package + Presence FAIL (BLOCKER)
  → Syntax SKIPPED
  → Structure SKIPPED
  → Field (Presence/Typing/Domain-check) SKIPPED
  → Reference SKIPPED
  → Cross-file SKIPPED
  → Semantic DEFERRED or SKIPPED
```

**Chain B — Syntax Blocking (per file)**

```text
Syntax + Parseability FAIL (BLOCKER) on profile.json
  → Structure/Field/Reference for profile.json SKIPPED
  → Cross-file: partial eligibility (U11) — Pending
  → Semantic: Deferred or limited
```

**Chain C — Structure prerequisite**

```text
Structure + Shape FAIL (hard)
  → Field Presence/Typing/Domain-check SKIPPED or narrowed
  → Reference SKIPPED for unaddressable paths
```

**Chain D — Cross-file after per-file**

```text
Prerequisite: L1 PASS · relevant files past L2 (SHOULD)
Successor: Cross-file + Consistency / Cross-file Family
Skip: package BLOCKER; or all relevant files Failed (policy U11)
```

**Chain E — Deferred Semantic**

```text
Semantic Domain Rules
  → default lean: DEFERRED (U3)
  → record Deferred Validation Item
  → do not invent PASS
  → if forced In Scope: require L1–L6 substrates available
```

### 9.5 Blocking vs Deferred (contrast)

| Kind | Typical trigger | Effect on successors | Effect on evidence |
|------|-----------------|----------------------|--------------------|
| **Blocking** | BLOCKER at L1/L2 (and Catalog-designated) | Cascade SKIPPED | FAILED + Severity; deeper SKIPPED |
| **Deferred** | Policy (L7/U3/options) | Not executed (NOT_RUN/ Deferred path) | Deferred Validation Item |
| **Skip (cascade)** | Prior Blocking | SKIPPED | No Severity ordinarily (Framework §9) |
| **Skip (intra-chain)** | Predecessor FAIL for same path | Successor SKIPPED | Path-local |

### 9.6 Pins (external prerequisites — not Rule-to-Rule)

| Pin | Role |
|-----|------|
| STEP6 Catalog Pin | Which Rules exist |
| Validator Version Pin | Evaluation identity |
| Runtime Baseline | Platform freeze RO |
| ACTIVE Handoff | Official Entry |
| STEP5 SCH-R Pin | Optional intent Trace |

### 9.7 Dependency deliverable to STEP6-4

STEP6-4 Catalog Design **SHALL** (when authoring Rules) be able to express, per Rule or Rule group:

- Prerequisite Layer / Family / Domain outcomes  
- Successor eligibility  
- Skip conditions  
- Blocking designation (candidate axis)  
- Deferred designation (candidate axis)  

표현 문법·엔진 스케줄러는 **본 STEP 밖**.

---

## 10. Rule Gap Analysis

### 10.1 Duplication risks

| Risk | Mitigation |
|------|------------|
| Domain↔Family 1:1 재혼동 | §2.4 · §3 · §7 독립 축 유지 |
| STEP5 PKG-R vs Package Domain | Trace only; STEP6 re-express |
| SCH-R direct execute (U1-A) | Prefer distinct STEP6 IDs + Trace (미확정) |
| Structure vs Presence | Domain/Family split §3.5 |
| Reference vs Cross-file | Domain split |

### 10.2 Omission risks

| Gap | Domain | Family hint |
|-----|--------|-------------|
| valueSpace Fg/Rg | Field or Semantic | Domain-check / Consistency |
| formula.expr vs inputs | Field / Semantic | Presence · Typing · Consistency |
| anchors ↔ profile identity | Cross-file | Consistency / Cross-file |
| logic keys ↔ profile inputs | Cross-file | Consistency / Cross-file |
| system_meta ↔ SYS-* | Package / Cross-file | Presence / Consistency |
| L6 partial | Cross-file | U11 eligibility |
| Empty Semantic set | Semantic | Deferred list |

### 10.3 Ambiguities (unresolved)

U1 · U2 · U3 · U5 · U7 · U11 — §11.

### 10.4 Non-gaps

Runtime Import Graph · UI · STEP7 auto-fix — out of Schema Rule Domain.

---

## 11. Pending Items (U1–U12 Impact)

| ID | Topic | Impact |
|----|-------|--------|
| **U1** | Rule Namespace | Catalog IDs; SCH-R mapping |
| **U2** | Target grain | Scope fields |
| **U3** | L7 scope | Semantic Deferred vs Required |
| **U4** | schemaComplete storage | Registers/Report later |
| **U5** | WARNING-only | Optional / Warning candidates |
| **U6** | VAL identity | Finding Register |
| **U7** | BLOCKER cascade vs Completeness | Skip → NO vs UNDECIDED |
| **U8** | Design Dry-run | schemaComplete stays NOT_RUN |
| **U9** | WARNING → VAL | Finding policy |
| **U10** | Rule Override | Blocking override lean forbid |
| **U11** | L6 partial | Cross-file eligibility after file FAIL |
| **U12** | Pin layout | Catalog/Run Register |

U1–U12 **Pending 유지** · 본 STEP 미확정.

---

## 12. STEP6-4 Input

### 12.1 Must consume (reinforced v1.1)

1. **Domain map (WHAT)** §3.3 — independent of Family  
2. **Family map (HOW)** §7.1 — independent of Domain  
3. **Domain × Family matrix** §7.2  
4. **Rule Type set** §4 (Framework Consume)  
5. **Layer matrices** §5.2 · §5.3  
6. **Rule Dependency / Cascade** §9 (선행·후행·Skip·Blocking·Deferred)  
7. **Coverage candidates** §6 (수치식 미정)  
8. **Classification candidates only** §8.1 — **do not treat as locked**  
9. **Gap list** §10  
10. **U1–U12** §11  
11. Framework §18 SCH-R RO · Pipeline I1 (Layer binding)

### 12.2 Additional inputs from v1.1 reinforcement

| Input | Use in STEP6-4 |
|-------|----------------|
| Domain ≠ Family principle | Catalog record must carry both axes separately |
| Intra-L4 chain Presence→Typing→Domain-check | Rule ordering / skip metadata design |
| Blocking vs Deferred contrast | Candidate Execution / Coverage design |
| Dependency vocabulary §9.1 | Catalog fields for prereq / skip / defer (shape TBD) |

### 12.3 STEP6-4 shall produce (preview)

| Deliverable | Constraint |
|-------------|------------|
| Schema Rule Catalog | Bind Domain · Family · Type · Layer (axes designed in STEP6-4) |
| Namespace path | U1 schedule or decide |
| Rule statements | First allowed in STEP6-4 |
| Classification / Severity defaults | **Design here** — not inherited as Freeze from STEP6-3 |
| SCH-R Trace | Pointers only |

### 12.4 STEP6-4 shall NOT

- Modify Framework / Pipeline  
- Treat §8 candidates as Frozen  
- Implement Engine  
- Mutate System JSON / Runtime  

### 12.5 Catalog skeleton outline (analysis-only)

```text
Catalog Header
Domain Index          ← §3 WHAT
Family Index          ← §7 HOW
Type Index            ← §4 Framework
Layer Binding Index   ← §5
Dependency Notes      ← §9 (prereq / skip / cascade / defer)
Classification Design ← STEP6-4 (candidates from §8)
Rule Records[]        ← bodies in STEP6-4
Appendix: U-pending · Deferred Semantic set
```

---

## 13. Analysis Conclusions

| ID | Statement |
|----|-----------|
| **C1** | Domain = WHAT (Package…Semantic). Family = HOW (Presence…Cross-file). **Independent axes.** |
| **C2** | Framework Rule Type 9종은 Layer 1차 앵커로 유지한다. Type≠Family 고정 등식 아님. |
| **C3** | Rules bind to **Layers**, not Stages. |
| **C4** | L4 내부 의존: Presence → Typing → Domain-check → (REF Skip) → SEM Deferred/Skip. |
| **C5** | Blocking(Cascade Skip)과 Deferred(Item)는 구분한다. |
| **C6** | Classification / Severity / Blocking / Warning / Optional / Deferred 축은 **후보만** — STEP6-4 설계. |
| **C7** | `schemaComplete`는 Required Coverage 함수; 수치식 Pending. |
| **C8** | SCH-R/PKG-R는 Trace; STEP6 실행 Rule과 ID 공간 혼동 금지. |
| **C9** | U1–U12 미확정 유지. |

---

## 14. Document Control

| Item | Value |
|------|-------|
| Status | **Analysis Complete · v1.1 Reinforced** |
| Next | **STEP6-4 Schema Rule Catalog Design** |
| v1.1 changes | Domain/Family separation · §9 Dependency cascade · §8 candidates-only |
| Forbidden | Catalog bodies · IDs · Namespace lock · Registers · Report · Engine · Framework/Pipeline edits |
| Locked/Frozen | Framework · Pipeline · STEP4 · STEP5 · Architecture · Runtime · System JSON — **unchanged** |

---

## Appendix R — Reinforcement Summary (v1.0 → v1.1)

| Area | v1.0 issue | v1.1 change |
|------|------------|-------------|
| Domain / Family | Family codes mirrored Domains (PKG↔D-PKG) | Domain=WHAT · Family=HOW · matrix §7.2 |
| Dependency | Layer flow mainly | §9 vocabulary · L4 chain · Blocking vs Deferred · Skip cascades |
| Classification | Multi-axis presented as design model | **Candidates only** · STEP6-4 owns design |
| STEP6-4 Input | Listed axes as if ready | Reinforced inputs + “do not lock §8” |

---

*End of STEP6-3_Schema_Rule_Analysis.md*
