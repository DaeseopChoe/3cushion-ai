# STEP5_Audit_Rule_Catalog_Analysis.md

```
Document  : STEP5_Audit_Rule_Catalog_Analysis.md
Version   : v1.1
Status    : Analysis · Design Supplement (Pre-Catalog)
Date      : 2026-07-15
STEP      : STEP5-3 (Analysis only)
Basis     : STEP5-3 Analysis v1 (Ask) · STEP5_Architecture_Audit_Framework.md v1.0 Frozen · STEP5_Audit_Plan.md v1.0
SPS       : System Platform Standard (SPS) v1.0
Rule      : Structure design only · No Rule ID · No Rule Statement instances · No Rule Catalog document
```

---

## 1. Overview

본 문서는 STEP5-3 **Audit Rule Catalog** 작성에 앞선 **구조 Analysis · Design Supplement** 이다.

| 본 문서 | 본 문서가 아닌 것 |
|---------|-------------------|
| Rule Catalog 구조·표준·Scope·Lifecycle 설계 | Rule Catalog SSOT 본문 |
| Rule Statement **작성 규격** | 실제 Rule Statement |
| Rule Scope / Lifecycle **정책** | Rule ID 부여 · Register · Finding |

### 1.1 Version

| Version | Content |
|---------|---------|
| v1.0 | Ask-mode Analysis — SSOT·Category·ID·Shape·Version·Evidence·STEP6/7 평가 |
| **v1.1** | **+ Rule Statement Standard · Rule Scope Model · Rule Lifecycle Policy** |

### 1.2 SSOT Principles (Unchanged)

- Rule = **Audit Rule SSOT** (STEP5 Audit Layer)
- Observation / Inventory와 **독립**
- Evidence의 **Rule Anchor** 출처
- Rule ≠ Fact · Observation · Decision · Finding

### 1.3 Constraints

- Framework / Audit Plan / STEP4 **수정하지 않음** (본 문서는 독립 Analysis)
- Rule Catalog 문서·Rule ID·Rule Statement **미작성**
- 다음 Agent 단계: Rule Catalog 본문 작성 시 본 v1.1 표준을 적용

---

## 2. Analysis v1 Summary (Carry-forward)

| Topic | Verdict |
|-------|---------|
| Independent Rule Catalog SSOT | Appropriate |
| 8 Rule Categories (PKG/META/REG/RT/CAN/CON/SCH/API) | Sufficient |
| Identity Category | Map to META-R / CAN-R / PKG-R — no new prefix without ADR |
| ID form `{CAT}-R-{NNN}` | Permanent · no version in ID |
| Record minimum fields | ID · Category · Statement · Applies/Scope · Owner STEP · Status |
| Catalog Version | Required for Deterministic Audit |
| Evidence Rule Anchor | Sole Rule Source |
| SCH-R | Reference in STEP5 · Validation execution = STEP6 |

상세 논증은 v1 Ask Analysis를 따른다. v1.1은 아래 3절만 신규 보완한다.

---

## 3. Rule Statement Standard (v1.1)

### 3.1 Purpose

모든 Audit Rule의 **Rule Statement**가 동일 형식으로 작성되어  
Evidence · Finding · Violation · Decision에서 **결정적(deterministic)** 으로 참조 가능하게 한다.

### 3.2 Selected Form (SPS)

SPS Audit에 **Requirement Block Form**을 공식 Statement Standard로 채택한다.

IF/THEN/BECAUSE는 보조 표기이며, Catalog 본문의 정규 필드는 Requirement Block이다.

**채택 이유**

| Form | 평가 |
|------|------|
| **Requirement · Condition · Expected Result · Failure Interpretation** | Pass/Fail·Evidence 결합에 명확 · Audit Guide 정합성 높음 · **채택** |
| IF / THEN / BECAUSE | 서술형에 유리하나 Field 분리가 약함 · Requirement Block의 **Narrative View**로만 허용 |

### 3.3 Statement Template (Standard)

각 Rule Record의 Rule Statement는 다음 **4개 필수 하위 필드**로 구성한다.

```text
Rule Statement
├── Requirement              (무엇을 충족해야 하는가 — 규범)
├── Condition                (언제 / 어떤 Fact 상황에서 적용하는가)
├── Expected Result          (Condition 하에서 관찰·구조상 기대되는 상태)
└── Failure Interpretation   (Expected와 다를 때 Architecture상 의미 — 판정 힌트)
```

### 3.4 Field Definitions

| Field | Role | Must | Must not |
|-------|------|------|----------|
| **Requirement** | 규범 문장 (SHALL / MUST) | Normative · testable | SYS별 사례 나열 · OBS 복사 |
| **Condition** | 적용 전제 (Scope·Fact 유형) | When the rule applies | Finding 단정 |
| **Expected Result** | Pass 기준 (관찰 가능) | Align with Fact Anchors | Recommendation / Migration 지시 |
| **Failure Interpretation** | Fail 시 Architecture 의미 | Guides Finding Severity hint | Decision Status 확정 · packageComplete 값 |

### 3.5 Narrative View (Optional Rendering)

작성·리뷰용으로 동일 내용을 다음처럼 렌더링할 수 있다. Catalog 저장 Shape는 §3.3이다.

```text
IF     <Condition>
THEN   <Expected Result>
BECAUSE <Requirement>
# on failure: <Failure Interpretation>
```

### 3.6 Writing Rules

1. Statement는 **Rule ≠ Fact** — Inventory/OBS 값을 Statement에 하드코딩하지 않는다 (필요 시 Condition에 “when anchors absent observed” 등 Fact-type 조건).
2. Statement는 **Rule ≠ Finding** — “SYS-006 is incomplete” 형태의 결론을 쓰지 않는다.
3. Pass/Fail이 **재현 가능**해야 한다 (동일 Fact + 동일 Rule → 동일 해석).
4. SCH-R의 Expected Result는 Validation **규범**을 말하며, STEP5에서 Schema Validation을 **실행하지 않는다**.
5. 언어: 프로젝트 Audit 문서와 동일하게 **한국어 또는 영어** 혼용 가능하나, 한 Rule 안에서는 한 언어로 통일 권장.

### 3.7 Out of Scope for This Document

본 절은 **템플릿(Standard)** 만 정의한다.  
실제 Requirement/Condition/… **문장 인스턴스는 작성하지 않는다.**

---

## 4. Rule Scope Model (v1.1)

### 4.1 Purpose

기존 Record 후보의 **Applies To**를 **Rule Scope** 모델로 확장하여  
Rule 재사용성 · Evidence 적용 범위 · Coverage 추적을 명확히 한다.

### 4.2 Scope Dimensions

Rule Scope는 단일 문자열보다 **차원 조합**으로 정의한다.

| Dimension | Values | Meaning |
|-----------|--------|---------|
| **Breadth** | `GLOBAL` · `CATEGORY` · `TARGETED` | 얼마나 넓게 적용되는가 |
| **Audit Category** | Package · Identity · Metadata · Registration · Runtime · Canonical · Contract · Public API · (none) | Plan Category 축 |
| **System Selectivity** | `ALL_SYS` · `SYS_SET` · `SINGLE_SYS` | Inventory SYS 범위 |
| **Package Selectivity** | `ALL_PACKAGES` · `PACKAGE_SET` · `SINGLE_PACKAGE` | directory / package |
| **Specific Target** | optional pointer | 예: registration key property · Public API symbol class · metadata key-path class |

### 4.3 Breadth Profiles (SPS)

| Profile | When to use | Typical |
|---------|-------------|---------|
| **GLOBAL** | 모든 inventoried System에 동일 규범 | Package Completeness 4-file rule |
| **CATEGORY** | 특정 Audit Category 축에만 | Metadata shape norms · Registration key norms |
| **TARGETED** | 명시적 SYS / Package / Specific Target | Rare — Canonical-exception notes · reserved API edges |

**권장 기본값:** 대부분의 Audit Rule은 `GLOBAL` 또는 `CATEGORY` + `ALL_SYS`.  
`SINGLE_SYS` Permanent Rule은 **지양** (사실상 Finding 고착화). 필요 시 Temporary Draft만.

### 4.4 Scope Record Shape (Design)

Rule Record의 Scope 블록 (설계 Shape — Catalog 작성 시 적용):

```text
Rule Scope
├── breadth                 GLOBAL | CATEGORY | TARGETED
├── auditCategory[]         Plan Categories (0..n)
├── systemSelectivity       ALL_SYS | SYS_SET | SINGLE_SYS
├── systemIds[]             optional · only if SYS_SET / SINGLE_SYS
├── packageSelectivity      ALL_PACKAGES | PACKAGE_SET | SINGLE_PACKAGE
├── packageDirectories[]    optional
└── specificTarget          optional opaque string / path class
```

**Legacy alias:** `Applies To` = Rule Scope의 요약 표기 (예: `GLOBAL · Package · ALL_SYS`).

### 4.5 Scope ↔ Evidence

| Rule Scope | Evidence generation |
|------------|---------------------|
| GLOBAL + ALL_SYS | Same Rule Anchor may pair with per-SYS Fact Anchors (38 Evidence possible) |
| CATEGORY | Evidence Type / Mapping Category should align |
| TARGETED | Evidence only for listed SYS/Package/Target |
| Out of Scope SYS | Do not create Evidence citing that Rule for that SYS |

Scope mismatch (Rule not applicable) → Evidence 미생성.  
“해당 없음”을 Finding으로 강제하지 않는다.

### 4.6 Scope ↔ Reuse

- **High reuse:** GLOBAL / CATEGORY + ALL_SYS  
- **Low reuse:** SINGLE_SYS — Review required before Active  
- Scope 변경이 Rule 의미를 바꾸면 → 새 Rule ID (Lifecycle Supersede) · Scope만 editorial이면 Revision 가능 (Active 정책은 §5)

---

## 5. Rule Lifecycle Policy (v1.1)

### 5.1 Purpose

Rule Catalog는 장기 SSOT이다.  
Rule ID는 Permanent Identifier이며, **삭제(destroy)하지 않는** Lifecycle으로 관리한다.

### 5.2 Official Lifecycle

```text
Draft
  ↓
Active
  ↓
Deprecated
  ↓
Superseded          (may enter Deprecation with successor already known)
  ↓
Archived
```

상태 전이 요약:

```text
Draft ──activate──► Active
Active ──deprecate──► Deprecated
Active|Deprecated ──supersede──► Superseded   (requires successor Rule ID)
Deprecated|Superseded ──archive──► Archived
```

**금지:** Archived / Superseded / Deprecated → 의미만 바꿔 Active로 “재활용” (ID 재사용 금지).  
**허용:** Draft ↔ 폐기(Draft discard) — Draft는 ID를 Catalog에 올리지 않았거나 Draft-only ID인 경우 Catalog에서 제거 가능.  
한번 **Active**가 된 ID는 retire 경로만 탄다 (OBS No-Reuse와 동일 철학).

### 5.3 State Definitions

| State | Meaning | Evidence may cite? | Mutable Statement? |
|-------|---------|--------------------|--------------------|
| **Draft** | 작성 중 · Audit Run에 미사용 | No (not in Active Catalog pin) | Yes (freely) |
| **Active** | 현행 Audit Rule · Rule Anchor 허용 | **Yes** | Editorial only (see §5.4) |
| **Deprecated** | 사용 비권장 · **삭제가 아님** · 구 Evidence 추적 가능 | Yes (historical / pinned Catalog version) | No semantic change |
| **Superseded** | 후속 Rule이 **정식 대체** · `supersededBy` 필수 | Yes (historical) | No |
| **Archived** | 장기 보존 · 신규 Audit Plan에 기본 미포함 | Yes (explicit historical audit only) | No |

### 5.4 Change Rights by State

| Change | Draft | Active | Deprecated | Superseded | Archived |
|--------|-------|--------|------------|------------|----------|
| Edit Statement (editorial) | ✅ | ✅ limited | ❌ | ❌ | ❌ |
| Semantic Statement change | ✅ | ❌ → new ID + Supersede | ❌ | ❌ | ❌ |
| Scope editorial clarifica. | ✅ | ✅ limited | ❌ | ❌ | ❌ |
| Scope semantic expand/narrow | ✅ | ❌ → new ID or ADR | ❌ | ❌ | ❌ |
| Cite as Rule Anchor (new Evidence) | ❌ | ✅ | ⚠️ prefer successor | ⚠️ prefer successor | ❌ new runs |
| Delete ID from history | ✅ (never Active) | ❌ | ❌ | ❌ | ❌ |

**Deprecated는 삭제가 아니다.**  
ID·Statement 스냅샷은 Catalog history에 남는다.

**Superseded는 후속 Rule을 참조한다.**  
필수 필드: `supersededBy` = successor Rule ID.  
신규 Evidence는 successor를 Anchor로 쓰는 것이 기본.

**Archived는 기록 보존 목적이다.**  
신규 STEP5 Audit Plan의 기본 Rule Coverage에 포함하지 않는다.  
과거 Report / Evidence 역추적용.

### 5.5 Catalog Version Interaction

| Event | Catalog Version |
|-------|-----------------|
| Add Active Rule | Minor bump (권장) |
| Deprecate / Supersede / Archive | Minor or patch bump |
| Breaking Category / Prefix change | Major · **ADR** · Framework alignment if needed |
| Deterministic Audit | Evidence pins **Catalog Version** used at Evidence creation |

동일 Frozen Fact + 동일 Catalog Version → 동일 Rule Anchor 집합이 재현되어야 한다.

### 5.6 Relationship to Evidence / Finding / Decision

| Artifact | Lifecycle 영향 |
|----------|----------------|
| Evidence | Active(작성 시점) Rule ID 인용 · 이후 Rule Deprecated 되어도 Evidence 불변 |
| Finding | Rule 상태 변경으로 Finding을 rewrite하지 않음 |
| Decision | 신규 Decision은 Active Ruleset 사용 · 과거 DEC는 당시 Catalog pin 유지 |

Rule Lifecycle ≠ Decision Status.  
Rule Lifecycle ≠ Finding Severity.

---

## 6. Integrated Record Shape Preview (Design Only)

Catalog 작성 시 Rule Record에 반영할 Shape 미리보기이다. **인스턴스는 두지 않는다.**

```text
Rule Record
├── ruleId                    // Permanent · assigned at Catalog authorship
├── category                  // PKG | META | REG | RT | CAN | CON | SCH | API
├── ruleStatement             // §3 Requirement Block
│     ├── requirement
│     ├── condition
│     ├── expectedResult
│     └── failureInterpretation
├── ruleScope                 // §4
├── evidenceUse               // recommended Fact Anchor types
├── severityHint              // optional
├── ownerStep                 // STEP5 | STEP6 | Shared | …
├── lifecycle                 // §5
│     ├── status              // Draft | Active | Deprecated | Superseded | Archived
│     ├── supersededBy        // optional Rule ID
│     └── archivedAt          // optional
└── catalogVersionRef         // pin when published in a Catalog release
```

---

## 7. v1.1 Acceptance Checklist

- [x] Rule Statement Standard defined (Requirement Block Form)
- [x] Rule Scope Model defined (Breadth · Selectivity · Specific Target)
- [x] Rule Lifecycle Policy defined (Draft → Active → Deprecated → Superseded → Archived)
- [x] Deprecated ≠ delete · Superseded requires successor · Archived = preservation
- [x] No Rule IDs created
- [x] No Rule Statement instances written
- [x] No Rule Catalog document created
- [x] Framework / Audit Plan / STEP4 untouched

**Next (STEP5-3 Agent — Catalog authorship):**  
Apply §3–§5 to author `STEP5_Audit_Rule_Catalog.md` with real Rule IDs and Statements.

---

## 8. Revision History

| Version | Status | Content |
|---------|--------|---------|
| v1.0 | Analysis (Ask) | Structure · Category · ID · Shape · Version · Evidence · STEP6/7 |
| **v1.1** | **Analysis Supplement** | **Statement Standard · Scope Model · Lifecycle Policy** |

---

*End of STEP5_Audit_Rule_Catalog_Analysis.md v1.1*
