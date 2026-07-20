# STEP7_P4_IU-4-04A_Planning_Disposition_Taxonomy.md

```text
Document  : STEP7_P4_IU-4-04A_Planning_Disposition_Taxonomy.md
Version   : v1.0
Status    : Complete · Official
Date      : 2026-07-20
STEP      : STEP7 / Phase P4 Standardization Plan
Session   : S7-P4-IU-4-04A
IU        : IU-4-04A
Owner     : System Standardization / Planning
Type      : Planning Disposition Taxonomy
Depends on: IU-4-01A · IU-4-02A · IU-4-03A (PASS)
Rule      : Define Planning Disposition classification system only ·
            No Resolution / Change Design · No category→resolution binding ·
            No D-GAP-A/R mutation · No Runtime / System JSON mutation
VG-P4     : PASS (Cross Review)
```

---

## 1. Taxonomy Objective

Planning Disposition Taxonomy의 목적은  
P4 Planning에서 Gap을 **어떤 처분 분류(bucket)** 로 다룰지를 위한  
**공통 분류체계**를 정의하는 것이다.

본 Taxonomy는 다음 질문에만 답한다.

> “이 Gap은 Planning 관점에서 **어느 Disposition Category에 속하는가?**”

본 Taxonomy는 다음을 하지 않는다.

- 해결 방법(Resolution) 작성
- Change Design / Implementation 설계
- Category → Resolution 산출물 연결
- Severity Lock
- Register row 갱신

Taxonomy = **분류 체계**.  
Design / Apply / Verification ≠ Taxonomy.

---

## 2. Taxonomy Scope

### In Scope

| # | Item |
|---|------|
| 1 | Planning Disposition Category 목록 정의 |
| 2 | 각 Category의 **분류 의미** (한 줄 정의) |
| 3 | Category 선택/배제용 **Definition Rules** |
| 4 | Taxonomy 사용 제약 (Planning-only) |
| 5 | Success Criteria |

### Out of Scope

| # | Item |
|---|------|
| 1 | IU-4-01A / 02A / 03A 변경 |
| 2 | D-GAP-A / D-GAP-R 변경 |
| 3 | Resolution Design · Change Design · Implementation 설계 |
| 4 | Category별 실제 Resolution 내용 |
| 5 | Category ↔ Resolution / Change Design ID 연결 |
| 6 | Severity Lock |
| 7 | Register `resolutionClass` / `resolutionRef` population |
| 8 | Apply / Verification 절차 |
| 9 | IU-4-03A `planningState`(`Plan-Include`/`Defer`/`Out`) 재정의 |

### Relation (cite only · no rewrite)

| Layer | Role |
|-------|------|
| IU-4-03A Mapping | Gap → Planning **대상 여부/슬롯** (`planningState`) |
| IU-4-04A Taxonomy (this) | Gap → Planning **처분 분류** (`dispositionCategory`) |
| Later IU / Phase | Disposition **내용** · Resolution · Apply (본 IU 밖) |

두 층은 직교한다.  
`planningState` ≠ `dispositionCategory`.

---

## 3. Taxonomy Categories

| Code | Category | One-line meaning (classification only) |
|------|----------|----------------------------------------|
| **PD-01** | `SchemaAlign` | Schema/enum/contract 정의와 관측 값의 **정합 분류** |
| **PD-02** | `NormalizeData` | Package/data 값·필드의 **정규화 분류** |
| **PD-03** | `CatalogFreezeDelivery` | Catalog/Register Freeze **전달물(delivery) 분류** |
| **PD-04** | `PolicyPromote` | Deferred/Policy 항목의 **승격·정책화 분류** |
| **PD-05** | `AuditExecution` | Audit instance/package **실행·완결 분류** |
| **PD-06** | `PackageComplete` | Package 구성물 완결성(예: required file) **분류** |
| **PD-07** | `IdentityAlign` | systemId / directory / registration key **정합 분류** |
| **PD-08** | `NamingNormalize` | Naming/casing convention **정규화 분류** |
| **PD-09** | `MetadataUniform` | Metadata shape/key **균일화 분류** |
| **PD-10** | `CanonicalAlign` | Canonical template 정렬 **분류** |
| **PD-11** | `TargetSetExpand` | Validation/Standardization Target Set **확장 분류** |
| **PD-12** | `ReportExport` | Report/Export ops **분류** |
| **PD-13** | `AcceptResidual` | 잔여를 **수용(Accept)** 하는 Planning 분류 |
| **PD-14** | `Other` | 위 bucket에 속하지 않는 잔여 분류 (남용 금지) |

> 위 표의 “meaning”은 **분류 정의**이다.  
> 해결 절차·패치·JSON path·Verification 방법을 포함하지 않는다.

---

## 4. Category Definition Rules

| ID | Rule |
|----|------|
| **DR-01** | Category는 **상호 배타적 Primary 1개**를 원칙으로 한다. (보조 cite 가능, Primary 중복 금지) |
| **DR-02** | Category 선택은 Gap의 **Root Cause 축**을 따른다. Severity·우선순위로 Category를 바꾸지 않는다. |
| **DR-03** | Category는 Planning 분류이다. Register 필드 갱신·Lock을 의미하지 않는다. |
| **DR-04** | `Other`(PD-14)는 기존 Category로 설명 불가할 때만 사용한다. 기본값 금지. |
| **DR-05** | `AcceptResidual`(PD-13)은 “해결 불필요/잔여 수용” **분류**이다. Wontdo 결정문·Verification을 대체하지 않는다. |
| **DR-06** | `CatalogFreezeDelivery`(PD-03)는 Freeze **delivery 공백** 분류이다. NS/CL/CV Locked 결정의 reopen이 아니다. |
| **DR-07** | `PolicyPromote`(PD-04)는 Deferred/Policy **승격 분류**이다. L7 실행·Rule 본문 작성이 아니다. |
| **DR-08** | `AuditExecution`(PD-05)는 Audit **실행/완결 공백** 분류이다. STEP5 Frozen template 수정이 아니다. |
| **DR-09** | Category 정의에 Resolution 단계·Change Design·Apply 순서를 넣지 않는다. |
| **DR-10** | Category 코드(`PD-NN` / name)는 Taxonomy의 ID이다. 본 IU에서 D-GAP-R `resolutionClass`에 쓰지 않는다. |
| **DR-11** | IU-4-03A Mapping Record의 선택적 `taxonomyHint`가 참조할 수 있는 **허용 집합**은 본 Category 목록이다. (값 기입은 후속 IU) |
| **DR-12** | Taxonomy 개정은 새 Session으로만 한다. silent rewrite 금지. |

---

## 5. Taxonomy Constraints

| ID | Constraint |
|----|------------|
| **TC-01** | IU-4-01A / IU-4-02A / IU-4-03A 변경 금지. |
| **TC-02** | D-GAP-A 변경 금지. |
| **TC-03** | D-GAP-R Row 변경 금지. |
| **TC-04** | Resolution Design 금지. |
| **TC-05** | Change Design 금지. |
| **TC-06** | Implementation 설계 금지. |
| **TC-07** | Severity Lock 금지. |
| **TC-08** | Register 수정 금지. |
| **TC-09** | Runtime / System JSON / Analysis 변경 금지. |
| **TC-10** | Category별 Resolution 내용 작성 금지. |
| **TC-11** | Category → Resolution / Change Design 연결 금지. |
| **TC-12** | Taxonomy를 Gap 해결 완료로 선언·해석 금지. |
| **TC-13** | 본 IU는 Taxonomy **단일 산출물**만 허용한다. |

---

## 6. Success Criteria

| # | Criterion |
|---|-----------|
| 1 | Taxonomy Objective가 Planning 분류만 다루고 Resolution/Apply를 배제한다. |
| 2 | Taxonomy Scope가 IU-4-03A `planningState`와 직교함을 명시한다. |
| 3 | Taxonomy Categories(PD-01…PD-14)가 분류 의미만 가진다. |
| 4 | Category Definition Rules가 Primary-1 · Root-Cause 기준 · non-lock · no design content를 포함한다. |
| 5 | Taxonomy Constraints가 선행 IU/D-GAP RO 및 Resolution·Change Design·Category↔Resolution 연결 금지를 포함한다. |
| 6 | 산출물이 Planning Disposition Taxonomy **한 개**뿐이다. |
| 7 | 실제 Gap→Category 값 기입 · Register population · Severity Lock이 없다. |

```text
IU-4-04A = Planning Disposition Taxonomy only
Categories = PD-01 … PD-14
Status = Complete · Official · VG-P4 PASS
```

---

*End of STEP7_P4_IU-4-04A_Planning_Disposition_Taxonomy.md v1.0*
