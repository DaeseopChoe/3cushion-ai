# STEP5_Observation_Mapping_Evidence_Analysis.md

```
Document  : STEP5_Observation_Mapping_Evidence_Analysis.md
Version   : v1.1
Status    : Analysis · Design Supplement (Pre-Register)
Date      : 2026-07-15
STEP      : STEP5-4 (Analysis only)
Basis     : STEP5-4 Analysis v1 (Ask) · STEP5_Architecture_Audit_Framework.md v1.0 Frozen
            STEP5_Audit_Plan.md v1.0 · STEP5_Audit_Rule_Catalog.md v1.0
SPS       : System Platform Standard (SPS) v1.0
Rule      : Structure design only · No Mapping/Evidence Register instances · No Finding
```

---

## 1. Overview

본 문서는 STEP5-4 **Observation Mapping Register** · **Evidence Register** 작성에 앞선  
**구조 Analysis · Design Supplement** 이다.

| 본 문서 | 본 문서가 아닌 것 |
|---------|-------------------|
| Mapping / Evidence 책임·Shape·ID·Trace 설계 | Register 레코드 본문 |
| Mapping↔Evidence 관계 · Type 구분 · Determinism 보완 | Finding / Violation / Decision |
| v1.1 소규모 보완 (§3–§5) | Framework / Plan / Rule Catalog 변경 |

### 1.1 Version

| Version | Content |
|---------|---------|
| v1.0 | Ask-mode Analysis — Mapping/Evidence 책임 · Shape · ID · Trace · STEP5-5 입력 |
| **v1.1** | **+ 1 MAP→N EVD · Evidence Type≠Rule Category · Catalog Version in Trace/Determinism** |

### 1.2 Constraints

- Framework / Audit Plan / Rule Catalog / STEP4 **수정하지 않음**
- Register · Finding · 코드/JSON **미생성**
- 다음 Agent 단계: Mapping + Evidence Register 문서·인스턴스 작성 시 본 Analysis 적용

---

## 2. Analysis v1 Summary (Carry-forward)

| Topic | Verdict |
|-------|---------|
| Mapping | OBS↔SYS↔Category 연결 · Coverage · OBS 수정 금지 |
| Evidence | Fact+Rule Reasoning Artifact · Finding 아님 |
| E8 | OBS 없이 Inventory/Shape/Reg Fact + Rule 허용 |
| Finding input | Evidence ≥ 1 필수 · Mapping alone 불가 |
| ID | `MAP-*` · `EVD-*` Permanent · No Reuse · Supersede |
| Shape | Framework Frozen Evidence Shape 유지 |

---

## 3. Mapping ↔ Evidence Relationship (v1.1)

### 3.1 Cardinality — Explicit

```text
1 Observation Mapping (MAP)
        │
        ├──► Evidence (EVD)   0..N
        ├──► Evidence (EVD)
        └──► Evidence (EVD)   …
```

**공식 관계:** **1 Mapping → N Evidence** (N ≥ 0).

| Cardinality | Meaning |
|-------------|---------|
| N = 0 | Mapping은 Coverage만 닫음 · Finding 후보 Evidence 없음 |
| N = 1 | 단일 Rule·Fact 결합 |
| N ≥ 2 | 동일 Mapping 맥락에서 여러 Rule 및/또는 Fact 조합으로 Evidence 복수 생성 |

**역방향:** 1 Evidence는 보통 Mapping Ref **0..1** (E8 등으로 Mapping 없이 Fact+Rule만 가능).  
권장: Coverage 추적을 위해 NO_OBS / CATEGORY_SLOT Mapping을 두고 EVD가 이를 참조.

**금지하는 오해**

- 1 Mapping = 1 Evidence (강제 아님)
- Mapping 존재 = Finding 필수 (강제 아님)
- Evidence 없이 Mapping만으로 Finding (금지)

### 3.2 Coverage vs Reasoning — Responsibility Split

| Layer | Responsibility | Artifact |
|-------|----------------|----------|
| **Observation Mapping** | **Coverage** — 무엇을 Audit Category / Plan 축에 올렸는가 | `MAP-*` |
| **Evidence** | **Reasoning** — 어떤 Fact를 어떤 Rule에 대었는가 | `EVD-*` |

```text
Coverage (Mapping)     ≠   Reasoning (Evidence)
연결 · 누락 방지              Fact Anchor + Rule Anchor + Summary
Rule 미적용                   Rule Catalog ID 필수
Finding 입력 아님             Finding의 유일한 직접 입력
```

| | Mapping (Coverage) | Evidence (Reasoning) |
|--|--------------------|----------------------|
| 질문 | 감사 대상이 Plan 축에 연결되었는가? | 규범 적용 근거가 고정되었는가? |
| Rule Catalog | 참조하지 않음 (연결만) | Rule Anchor **필수** |
| Gate | G2 | G2.5 |
| Finding | 불가 | 필수 선행 |

동일 Mapping에서 Category Coverage는 한 번으로 닫히고,  
Reasoning은 Rule별로 Evidence를 **N개** 쌓을 수 있다 → **1 MAP → N EVD**가 Coverage/Reasoning 분리와 일치한다.

---

## 4. Evidence Type vs Rule Category (v1.1)

둘은 **다른 분류 축**이다. 혼용·동일시하지 않는다.

### 4.1 Rule Category (Rule Catalog)

Rule Catalog의 **규범 분류**이다. Rule ID Prefix와 대응한다.

| Rule Category | Prefix |
|---------------|--------|
| Package | `PKG-R-` |
| Metadata | `META-R-` |
| Registration | `REG-R-` |
| Runtime | `RT-R-` |
| Canonical | `CAN-R-` |
| Contract | `CON-R-` |
| Schema | `SCH-R-` |
| Public API | `API-R-` |

Audit Plan의 Audit Category(Package / Metadata / Runtime …)는 **감사 수행 축**이며,  
Rule Category와 정렬하되 **Evidence Type이 아니다**.

### 4.2 Evidence Type (Evidence Structure)

Evidence **레코드 구조·구성 방식**의 유형이다.  
“어떤 Category를 감사하는가”가 아니라 **“이 Reasoning Artifact가 어떻게 조립되었는가”** 이다.

| Evidence Type (권장 구분) | Meaning |
|---------------------------|---------|
| **OBS** | Fact Anchor에 Observation이 포함된 결합 |
| **FACT_ONLY** | Observation 없음 · Inventory/Shape/Reg 등 Fact만 (E8 path) |
| **COMPOSITE** | 복수 Fact Anchor 종류 또는 복수 Audit 맥락 Fact를 한 Evidence에 결합 |
| **MULTI_RULE** | Rule Anchor가 2개 이상인 Evidence 구조 |

> Framework/Plan에 열거된 Type 라벨(`PACKAGE` · `IDENTITY` · `METADATA` …)은  
> **Audit 맥락 태그**(어디서 쓰였는가)로 쓸 수 있으나,  
> 본 v1.1에서는 **구조적 Evidence Type**(OBS / FACT_ONLY / COMPOSITE / MULTI_RULE)과  
> **Rule Category**(PKG-R …)를 **문서상 반드시 구분**한다.

Register 작성 시 권장:

```text
Evidence Record
├── evidenceTypeStructural   // OBS | FACT_ONLY | COMPOSITE | MULTI_RULE
├── auditContextTag[]        // optional · Package | Metadata | Runtime | …
└── ruleAnchors[]            // Rule Category는 각 Rule ID의 Catalog 분류로 따라옴
```

### 4.3 Separation Rules

| Do | Do not |
|----|--------|
| Rule Anchor → Rule Category는 Catalog가 결정 | Evidence Type = `PKG-R` 로 표기 |
| Evidence Type으로 OBS/E8/복합/다중 Rule 구조 표현 | Evidence Type으로 Package/Metadata **Category 대용** |
| Audit Category는 Mapping · Plan Sequence에 유지 | Mapping Category를 Evidence Type과 동일시 |

**예시**

- Mapping Category = Package · Evidence Type = `OBS` · Rule Anchor = `PKG-R-001`  
- Mapping Kind = NO_OBS · Evidence Type = `FACT_ONLY` · Rule Anchor = `PKG-R-001`  
- 동일 MAP에서 `PKG-R-001` + `META-R-001` 각각 EVD → 두 Evidence 모두 Type `OBS` 또는 하나가 `MULTI_RULE` (설계 선택; 1 MAP→N EVD 권장 시 Rule당 EVD 분리)

---

## 5. Traceability + Rule Catalog Version (v1.1)

### 5.1 Official Trace (with Catalog Version)

```text
OBS  (STEP4 Frozen · optional on E8)
 ↓
MAP  (Coverage)
 ↓
EVD  (Reasoning · Fact + Rule Anchors)
 ↓
Rule Catalog Version   ← pin at Evidence creation
 ↓
Finding
 ↓
Violation
 ↓
Recommendation
 ↓
Decision
```

역추적:

```text
Decision
 ↓
Finding
 ↓
Evidence
 ↓
Rule ID + Rule Catalog Version
 ↓
Fact Anchor (OBS / Inventory / Shape / Reg …)
 (+ Mapping Ref)
```

### 5.2 Deterministic Audit — Reinforced

| Principle | Statement |
|-----------|-----------|
| Same Frozen Input | Same OBS · Inventory · Matrices |
| Same Audit Plan | Same scope · sequence · coverage |
| **Same Rule Catalog Version** | Same Active Rule set · same Rule Anchor meanings |
| ⇒ Same Mapping Coverage | Same MAP set for Plan scope |
| ⇒ Same Evidence | Same Fact+Rule bindings under that Catalog Version |
| ⇒ Same Finding / Violation / Recommendation / Decision | Same evaluation |

**v1.1 명시:**

```text
Identical Frozen Input
  + Identical Rule Catalog Version
  ⇒ Identical Audit Result
```

Evidence Record는 생성 시 **Rule Catalog Version을 pin** 해야 Determinism이 성립한다.  
Catalog가 이후 bump되어도 과거 EVD·FND는 pin된 Version 기준으로 재현·해석한다.

---

## 6. v1.1 Acceptance Checklist

- [x] 1 Mapping → N Evidence cardinality explicit
- [x] Coverage (MAP) vs Reasoning (EVD) responsibility split documented
- [x] Evidence Type (structural) ≠ Rule Category (Catalog) distinguished
- [x] Trace includes Rule Catalog Version
- [x] Deterministic Audit reinforces Frozen Input + Catalog Version → same result
- [x] Framework / Plan / Rule Catalog untouched
- [x] No Register / Finding / code / JSON created

**Next:** STEP5-4 Register authorship applying §3–§5.

---

## 7. Revision History

| Version | Status | Content |
|---------|--------|---------|
| v1.0 | Analysis (Ask) | Mapping/Evidence structure · Shape · ID · Trace · STEP5-5 input |
| **v1.1** | **Analysis Supplement** | **1→N · Type≠Category · Catalog Version in Trace/Determinism** |

---

*End of STEP5_Observation_Mapping_Evidence_Analysis.md v1.1*
