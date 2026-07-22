# Fleet Contract Book — Chapter 10

# Layer 6 : Runtime Contract

```text
Document   : FLEET_CONTRACT_BOOK_Ch10_L6_Runtime_Contract.md
Type       : Fleet Contract Book · Chapter 10 · L6 Runtime Contract
Version    : v1.0
Status     : Ratified
Date       : 2026-07-22
Book       : Fleet Contract Book v1.0 (Conditional · Ch.8/Ch.9/Ch.10 persisted)
Baseline   : c398f3abb4b52a11369f77bba1a5c4877155acb4
Depends on : Fleet Scope Non-Target · WG-AI-001 Consume · Ch.8 · Ch.9 · B6 Target Freeze v1.0
             · AAS Batch6 Final Freeze (cite) · System_Runtime_Contract.md (Implementation reference · cite)
Rule       : Contract only · No Formula/System Value/Logic/Trajectory meaning change ·
             No Runtime/Loader/Registry/Code/System JSON mutation in this Ratify session
Source     : STEP8 B6 Architecture Review · B6 Target Freeze · Cursor Ask Ch.10 Ratify 설계 ·
             Ratify Review (Ready after Minor Amendment) · Minor Amendment applied
```

---

## 0. Layer Header

| 항목 | 값 |
|------|----|
| **Layer ID** | **L6** |
| **Layer Name** | Runtime Contract |
| **Status** | **Ratified** (Minor Amendment applied · Review PASS) |
| **Introduced** | v1.0 (on-disk 2026-07-22) |
| **ID Legend** | **L6-I** Invariant · **L6-D** Decision · **L6-A** Public API · **L6-L** Loader · **L6-G** Registry · **L6-J** Projection · **L6-U** Supply · **L6-C** Completeness · **L6-P** Prohibited · **L6-AC** Acceptance · **L6-VR** Verification · **L6-V** Compatibility · **L6-B** Boundary · **L6-S** Shape |
| **Class Applicability** | **전 System** · Package Completeness는 Normal/Special 구분 (Ch.8 cite) |
| **Depends on** | L1 Identity · L2 Schema · L4 Anchor (Consume) · L5 Logic (Consume) · Fleet Non-Target · WG-AI-001 |
| **Consumed by** | STEP8 Batch **B6** (ADR / Apply) · L7 Presentation (cite) · Validation (B8 cite) |
| **Book file** | `System Platform Standard (SPS) v1.0/Fleet_Contract_Book/FLEET_CONTRACT_BOOK_Ch10_L6_Runtime_Contract.md` |

### Core Principles (shall uphold)

| Principle | Statement |
|-----------|-----------|
| **Public API Stability** | Sole Lookup Entry(`getSystemContract`) 및 Approved sibling API는 안정적으로 유지한다. |
| **Runtime Boundary** | System JSON / Loader / PackageStore는 Public Consumer에 노출되지 않는다. |
| **Contract Immutability** | 조립 완료 후 SystemContract는 immutable · read-only이다. |
| **Meaning Preservation** | Formula / System Value / Logic / Trajectory **의미**는 Runtime이 변경하지 않는다. |
| **Structure Only (L6)** | L6 Migration은 경계·완전성 정규화만 허용한다. |
| **Loader Responsibility** | Loader는 locate · load · validate · assemble만 수행한다. |
| **Registry Responsibility** | Registry는 Public Entry · cache · bootstrap의 소유자이다. |
| **Sole Assembler** | Loader만이 SystemContract를 조립한다. |
| **Supply Isolation** | Domain은 Runtime을 import하지 않으며 Supply injection으로만 Contract slice를 소비한다. |
| **Package Completeness Policy** | disk 존재와 eager load·소비 가능 여부의 관계를 Option C로 규정한다 (§10). |
| **Compatibility / Version** | `contractVersion` 진화 규칙을 따른다. |
| **Non-Target Respect** | Fleet Non-Target (Formula / Value / Trajectory 의미) 상위 준수. |
| **Safe Stop** | 의미 변경 징후 시 즉시 중단한다. Safe Stop ≠ FAIL. |

---

## 1. Purpose

L6 Runtime Layer의 목적은 System Package를 **Runtime-ready Contract**로 공급하는 **경계 계약**을 정의하는 것이다.

본 Chapter가 규정하는 것:

- Canonical Runtime Model · SystemContract Shape
- Public API Contract
- Loader / Registry 책임 분리
- Projection (Resolver) · Supply (Provider) 개념 계약
- Runtime Boundary · Dependency Rule
- Package Completeness Policy (Loader Exclusion 포함)
- Compatibility / Version
- Runtime Invariants
- Migration Rule · Semantic Guard
- Ratify Acceptance · Apply-time Verification Rule
- Decision Records

본 Chapter가 규정하지 **않는** 것:

- Formula / System Value / Logic / Trajectory **실행·물리 의미**
- Loader / Registry **구현 디테일** (glob 문법·자료구조)
- Runtime / Loader / Registry **code mutation** (본 Ratify 세션)
- Metadata key rename (Ch.7 / B3)
- Presentation UI (Ch.11 / B7)
- Validation Engine 규칙 재설계 (B8)
- 실제 B6 Apply / Validation 실행

---

## 2. Scope

### 2.1 In Scope (L6)

| # | Item |
|---|------|
| 1 | Runtime Layer 역할 · Canonical Runtime |
| 2 | SystemContract Canonical Shape · Contract Version |
| 3 | Public API Contract |
| 4 | Loader Contract · PackageStore (internal) |
| 5 | Registry Contract |
| 6 | Projection / Resolver Contract |
| 7 | Supply / Provider Contract |
| 8 | Runtime Boundary · Dependency Rule |
| 9 | Package Completeness Policy · Loader Exclusion |
| 10 | Compatibility & Evolution |
| 11 | Runtime Invariants |
| 12 | Migration Rule · Semantic Guard · Acceptance · Verification |

### 2.2 Out of Scope

| # | Item | Owner |
|---|------|-------|
| 1 | Formula / expr / System Value **의미** | Non-Target |
| 2 | Logic Decision / Track / Input **실행 의미** | Ch.9 |
| 3 | Trajectory 물리·path 알고리즘 | Non-Target / Domain Trajectory |
| 4 | Anchor 좌표·id **값** | Ch.8 |
| 5 | Metadata key rename | Ch.7 / B3 (HALTED) |
| 6 | Presentation / UI | Ch.11 / B7 |
| 7 | Validation Engine / Catalog | B8 / STEP6 |
| 8 | Loader glob · Map · freeze 구현 | Implementation |
| 9 | Registry Map 구현 · bootstrap 코드 형태 | Implementation |
| 10 | 본 Ratify 세션의 Runtime code / System JSON Apply | **Prohibited** |

### 2.3 Class Applicability

| Class | L6 적용 |
|-------|--------|
| **Normal** | profile 기반 discovery · anchors는 Ch.8 consumable 여부에 따라 Completeness Policy 적용 |
| **Special (anchors N/A)** | anchors 부재 허용 (Ch.8 / DGR-008) · anchors **발명 금지** |
| **전 System** | Public API · Boundary · Supply Isolation · Meaning Preservation 공통 |

---

## 3. Runtime Model

### 3.1 Official Flow

```text
System Package (profile / logic / anchors / system_meta)
        ↓
PackageStore (Loader-internal)
        ↓
Loader (sole assembler)
        ↓
SystemContract (immutable)
        ↓
Registry (sole lookup entry · cache · bootstrap)
        ↓
Public API (getSystemContract · Approved siblings)
        ↓
App Orchestrator (Domain Contract Supply bind)
        ↓
Domain / Overlay / Trajectory consumers (read-only slices)
```

### 3.2 Layer Role

Runtime은 System 내부 구현을 이해하지 않는다.  
Runtime은 **Contract만** 이해한다.

의존 방향 (shall):

```text
System → Runtime Contract → Registry/Loader → Application → Domain → Renderer → Presentation
```

역방향 의존 (System이 Runtime 구현에 의존)은 **금지**한다.

### 3.3 Implementation Reference (cite only)

| Artifact | Role |
|----------|------|
| `System_Runtime_Contract.md` | SPS Runtime 철학 · Registry/Loader 책임 (재작성 금지) |
| AAS Batch6 Final Freeze | 구현 Canonical · INV-B6 / AD-B6 (재정의 금지) |
| `frontend/src/runtime/*` | 관찰된 구현 경로 (cite only · 본 Chapter가 코드 변경을 지시하지 않음) |

충돌 시: **persisted Ch.10**이 Fleet Runtime Apply 권위를 갖는다.  
SPS / AAS 본문을 본 Ratify 세션에서 수정하지 않는다.

---

## 4. Runtime Boundary

### 4.1 Public Boundary

Public Consumer가 알 수 있는 것:

- `getSystemContract(systemId)`
- `extractTrajectoryContractView(contract)`
- `listRegisteredSystemIds()` / `isRegistered(systemId)`
- SystemContract / TrajectoryContractView **타입 슬라이스**

Public Consumer가 알 수 **없는** 것 (shall not):

- System directory / package file path
- PackageStore / Loader 내부 index
- Registry cache 내부 구조
- `import.meta.glob` 맵

### 4.2 Boundary Rules

| ID | Rule |
|----|------|
| **L6-B-01** | Application / Domain / Overlay / Renderer는 System JSON에 **직접 접근하지 않는다**. |
| **L6-B-02** | Application / Domain / Overlay / Renderer는 Loader / PackageStore를 **직접 호출하지 않는다**. |
| **L6-B-03** | Domain은 Runtime 모듈을 **import하지 않는다**. Contract slice는 Supply로만 공급받는다. |
| **L6-B-04** | Contract 내용은 Consumer가 **mutate하지 않는다**. |

---

## 5. Canonical Runtime

### 5.1 SystemContract Canonical Shape

모든 System은 동일 Shape의 Runtime Contract를 노출한다 (내용 값은 System별).

| Slice | Role |
|-------|------|
| **identity** | systemId · family · aliases |
| **profile** | formulaExpr · valueDomains · safety · display |
| **anchors** | trajectories · meta (Ch.8 소비 전제) |
| **logic** | logic package payload (Ch.9 cite) |
| **metadata** | system_meta payload |
| **capabilities** | render / baselineHandle 등 Runtime capability view |
| **validation** | assembly ok · errors |
| **version** | contractVersion · packageVersion |

### 5.2 Shape Rules

| ID | Rule |
|----|------|
| **L6-S-01** | SystemContract는 serializable · read-only Shape이다. |
| **L6-S-02** | anchors 소비의 Runtime 전제는 **`trajectories`** 이다 (Ch.8 cite). |
| **L6-S-03** | `trajectories`가 없으면 Domain anchors supply는 **undefined**로 취급될 수 있다 (관찰 경로 cite). |
| **L6-S-04** | flat / non-canonical anchors payload를 “anchors load complete”로 선언하지 않는다. |

### 5.3 Contract Version

| Field | Rule |
|-------|------|
| **contractVersion** | Canonical marker (현재 구현 cite: `SYSTEM_CONTRACT_VERSION = 1`) |
| **packageVersion** | package meta에서 파생 가능한 버전 문자열 (없으면 null) |
| **Additive evolution** | 슬라이스/필드 **추가**는 Compatibility 절을 따른다 |
| **Breaking evolution** | Public API 제거·의미 변경·필수 슬라이스 재해석은 **version bump + Issue** 없이 금지 |

---

## 6. Public API Contract

### 6.1 Sole Lookup Entry & Public API Surface

| API | Role |
|-----|------|
| **`getSystemContract(systemId)`** | **Sole Lookup Entry** — SystemContract lookup의 유일한 공식 Entry |
| `extractTrajectoryContractView(contract)` | **Approved sibling** — Pure projection (Registry cache 아님) |
| `listRegisteredSystemIds()` | **Approved sibling** — Discovery list |
| `isRegistered(systemId)` | **Approved sibling** — Registration predicate |

**정의**

- **Sole Lookup Entry** = `getSystemContract()` — SystemContract를 얻는 **유일한 lookup Entry**.
- **Public API Surface** = Sole Lookup Entry + **Approved sibling APIs only** (위 표).
- bootstrapRegistry / Loader / PackageStore / 기타 미명시 export는 Public API Surface에 **포함되지 않는다**.

### 6.2 Public API Rules

| ID | Rule |
|----|------|
| **L6-A-01** | Sole Lookup Entry는 **`getSystemContract`** 이다. |
| **L6-A-02** | Public API Surface = Sole Lookup Entry + Approved sibling APIs only. |
| **L6-A-03** | bootstrapRegistry / Loader / PackageStore는 **Public API가 아니다**. |
| **L6-A-04** | 명시되지 않은 export를 Consumer 계약으로 강제하지 않는다. |
| **L6-A-05** | Public API 제거 또는 의미 변경은 Compatibility / Version 절차 없이 **금지**한다. |

---

## 7. Loader Contract

### 7.1 Purpose

Loader는 System Package를 Runtime-ready **SystemContract로 조립**하는 유일한 승인 경로이다.

### 7.2 Responsibilities (shall)

- locate System package
- load required package files (via PackageStore / internal maps)
- validate assembly minimums
- **assemble** SystemContract
- return immutable Contract

### 7.3 Prohibitions (shall not)

- own Contract **cache**
- calculate System values / evaluate formulas
- generate trajectories / render UI
- expose itself as Public API to Domain/Overlay

### 7.4 PackageStore

PackageStore는 Loader-internal JSON access SSOT이다.

- Public API **아님**
- Consumer는 PackageStore를 호출하지 **않는다**

### 7.5 Loader Rules

| ID | Rule |
|----|------|
| **L6-L-01** | Loader = **Sole Assembler** |
| **L6-L-02** | Loader **never owns cache** (Registry가 cache 소유) |
| **L6-L-03** | Loader는 Formula/Value/Logic/Trajectory **의미를 변경하지 않는다** |
| **L6-L-04** | Package Completeness Policy (§10)를 준수한다 |

---

## 8. Registry Contract

### 8.1 Purpose

Registry는 모든 System에 대한 **공식 Runtime Entry Point**이다.  
모든 Runtime 요청은 Registry에서 시작한다.

### 8.2 Responsibilities (shall)

- discover / register Systems (bootstrap)
- expose SystemContract via Public API
- **own Contract cache**
- normalize lookup keys (alias cite · L1/B0)
- provide registration queries

### 8.3 Prohibitions (shall not)

- assemble Contract independently of Loader
- calculate / evaluate / trajectory / render
- expose package paths to Public Consumers

### 8.4 Registry Rules

| ID | Rule |
|----|------|
| **L6-G-01** | Registry = **Sole Cache Owner** |
| **L6-G-02** | Registry = **Sole Lookup Entry** owner (`getSystemContract`) · Public API Surface 관리 |
| **L6-G-03** | Consumer는 Loader를 우회하여 Contract를 조립하지 **않는다** |
| **L6-G-04** | Registry는 Formula/Value/Logic/Trajectory **의미를 변경하지 않는다** |

---

## 9. Projection / Supply Contract

### 9.1 Projection / Resolver (concept)

**Resolver**는 별도 필수 Runtime 모듈을 강제하지 않는다.  
개념적으로 다음을 포함한다.

| Kind | Role |
|------|------|
| **Trajectory projection** | `SystemContract` → `TrajectoryContractView` (pure extract) |
| **Domain resolve helpers** | Supply 경유 formula / anchors resolve |

| ID | Rule |
|----|------|
| **L6-J-01** | TrajectoryContractView는 **pure projection**이다. I/O 금지. |
| **L6-J-02** | TrajectoryContractView는 Registry cache 대상이 **아니다**. |
| **L6-J-03** | Projection은 Contract **의미를 변경하지 않는다**. |

### 9.2 Supply / Provider (concept)

**Provider**는 React System Provider를 의미하지 않는다.  
Domain Contract **Supply injection**을 의미한다.

| ID | Rule |
|----|------|
| **L6-U-01** | App Orchestrator만이 Registry → Supply bind를 수행한다. |
| **L6-U-02** | Domain은 Runtime / `data/systems` JSON maps를 import하지 **않는다**. |
| **L6-U-03** | Supply는 read-only slices만 제공한다. |
| **L6-U-04** | Supply Isolation — Domain 계산은 Contract slice에만 의존한다. |

### 9.3 Approved Consumers (cite)

```text
Application Runtime
Calculation Domain (via Supply)
Trajectory Domain (via Supply / Contract views)
Overlay
Renderer (via injected views)
Search / Dataset / AI / Lesson / History (Contract 또는 Supply 경유)
```

Validation Engine은 L6 Public API Consumer가 아닐 수 있다 (B8 / package judge cite).  
본 Chapter는 Validation Engine 재설계를 **포함하지 않는다**.

---

## 10. Package Completeness Policy

### 10.1 Problem Statement (cite)

Inventory / DGR-011:

- 일부 System은 disk에 `anchors.json`이 **존재**하나
- Loader eager anchors glob에서 **제외**되어 있다 (`0tip_plus`, `double_rail`)

Ch.8:

- exclusion 해제는 **L6 / B6** 범위
- `0tip_plus` = flat · non-canonical id → L4 **Deferred**
- `double_rail` = trajectories shape (B2.5) · exclusion = B6

### 10.2 Decision: Option C (adopted)

| Option | Statement | Verdict |
|--------|-----------|---------|
| A | disk 존재만으로 exclusion lift = Structure Only | **Rejected** — flat silent-drop / 동작 오해 |
| B | exclusion lift 전면 = Behavior Change → 상시 Defer | **Rejected as sole policy** — consumable 정규화 경로 봉쇄 |
| **C** | **consumable만 lift 허용 · non-consumable은 Defer** | **Adopted** |

### 10.3 Policy Rules

**Structure Only (L6) — Completeness lift 의미**

Package Completeness lift(Loader exclusion 해제)는 Formula · System Value · Logic · Trajectory의 **의미(semantics)를 변경하는 작업이 아니다**.  
그것은 disk에 이미 존재하는 consumable package를 Runtime eager load 경로에 **균일하게 포함**시켜, Package↔Loader **Load Completeness를 복원**하는 Structure Only (L6) 정규화이다.  
관찰 가능한 “anchors가 Contract에 채워짐”은 completeness 복원의 결과일 수 있으나, 좌표·공식·logic decision·trajectory 물리 의미의 재해석을 **허용하지 않는다**.  
B6 Target Freeze v1.0에서 exclusion을 Defer한 것은 Ch.10 부재 시점의 안전 조치이며, Ch.10 Ratify 이후 Scope reconfirm / Freeze Amendment에서 Completeness Policy에 따라 **재분류**한다 (§13.2).

| ID | Rule |
|----|------|
| **L6-C-01** | **Consumable** = disk present **and** Ch.8 L4-consumable (`trajectories` + 소비 가능 id 전제). |
| **L6-C-02** | Consumable 시스템에 대한 Loader exclusion 해제는 **Structure Only (L6)** 후보이다 — **Load Completeness 복원** (의미·좌표·formula 불변 전제). |
| **L6-C-03** | **Non-consumable** (flat / non-canonical id 등) exclusion 해제는 **Defer**이다. lift만으로 “canonical complete” 선언 **금지**. |
| **L6-C-04** | Special anchors **absent (N/A)** — 파일·좌표 **발명 금지** (Ch.8 / DGR-008). |
| **L6-C-05** | non-`trajectories` payload의 **silent drop**을 load success / complete로 선언 **금지**. |
| **L6-C-06** | Package Completeness Apply는 Ch.10 Ratify 세션에서 **수행하지 않는다** (후속 B6 ADR / Apply). |

### 10.4 Current Observation (cite · not Apply)

| System | Disk anchors | L4 consumable | Exclusion | L6 disposition |
|--------|--------------|---------------|-----------|----------------|
| `double_rail` | present · trajectories | Yes (Ch.8 No-op shape) | excluded | **Apply 후보 (Completeness)** — ADR 후 |
| `0tip_plus` | present · flat · non-canonical id | No (Ch.8 Deferred) | excluded | **Defer** |
| DGR-008 Special 4 | absent | N/A | n/a | **Out-of-Scope** (invent 금지) |

---

## 11. Compatibility & Version

| ID | Rule |
|----|------|
| **L6-V-01** | Public API는 Backward Compatibility를 우선한다. |
| **L6-V-02** | Additive field / capability는 `contractVersion` 정책에 따라 허용 가능하다. |
| **L6-V-03** | Breaking change (Entry 제거 · Shape 의미 재해석 · Boundary 붕괴)는 Issue + version bump 없이 **금지**. |
| **L6-V-04** | Alias normalize는 Identity (L1) cite이며, L6는 “Registry가 key normalize를 소유한다”만 규정한다. |
| **L6-V-05** | Compatibility 변경이 Formula/Value/Logic/Trajectory **의미**를 바꾸면 **금지**. |

---

## 12. Runtime Invariants

Runtime Layer의 **절대 불변** 조건이다. 위반 시 Safe Stop / Apply 거부.

| ID | Invariant |
|----|-----------|
| **L6-I-01** | Public API Surface는 안정적으로 유지되어야 한다 (Sole Lookup Entry + Approved siblings). |
| **L6-I-02** | SystemContract는 조립 완료 후 **immutable**이다. |
| **L6-I-03** | Loader는 Contract를 **조립만** 하며, **cache를 소유하지 않는다**. |
| **L6-I-04** | Registry는 **cache와 bootstrap**의 유일한 책임자이다. |
| **L6-I-05** | Formula / System Value / Logic / Trajectory의 **의미**는 Runtime Layer에서 변경하지 않는다. |
| **L6-I-06** | **Ratify Session**에서는 Runtime Code · Loader · Registry · System JSON을 변경하지 않는다. |
| **L6-I-07** | Loader = **Sole Assembler** · Registry = **Sole Lookup Entry / Cache Owner**. |
| **L6-I-08** | Domain은 Runtime을 import하지 않는다 (**Supply Isolation**). |
| **L6-I-09** | Package Completeness는 **Option C**를 따른다 (consumable만 Structure Only lift 후보 · Load Completeness 복원). |
| **L6-I-10** | Consumer는 System JSON / PackageStore / Loader를 **bypass하지 않는다**. |
| **L6-I-11** | Safe Stop ≠ FAIL · 의미 변경 징후 시 즉시 중단한다. |
| **L6-I-12** | B3 Metadata rename · DGR-008 anchors 발명은 L6 Apply로 **수행하지 않는다**. |

---

## 13. Migration Rule

### 13.1 Principle

L6 Migration = **Structure Only (L6)**  
경계·완전성·등록 경로 정규화만 허용한다.

**허용 (조건부)**

- Package Completeness: **consumable** exclusion lift (L6-C-02) — **Load Completeness 복원** (의미 불변)
- Public API / Shape **additive** extension (Compatibility 준수)
- 문서·계약 정합을 위한 책임 경계 명확화 (code Apply는 별도 ADR)

**금지**

- Formula / System Value / Logic / Trajectory **의미** 변경
- Runtime 알고리즘·계산·렌더 의미 변경
- non-consumable을 lift만으로 complete 선언
- Special anchors 발명
- Metadata rename
- Ratify 세션 중 code/JSON mutation

### 13.2 Relation to B6 Target Freeze

| B6 Freeze (v1.0) | Ch.10 이후 |
|------------------|------------|
| Apply **0** (Empty) · PASS Conditional | Conditional 원인(Ch.10 부재) **해소 가능** |
| exclusion **Defer** | Completeness Policy에 따라 **재분류** (Scope reconfirm / Amendment) |
| ADR Entry blocked | Ch.10 Ratified 후 B6-EN 재평가 |

**본 Chapter Ratify ≠ B6 Apply Approved.**  
Apply는 B6 ADR · Freeze Amendment(필요 시) 이후다.

---

## 14. Semantic Guard

### 14.1 Absolute Prohibitions

| ID | Prohibited |
|----|------------|
| **L6-P-01** | Formula 의미 변경 |
| **L6-P-02** | System Value 의미 변경 |
| **L6-P-03** | Logic 실행 의미 변경 |
| **L6-P-04** | Trajectory 의미 변경 |
| **L6-P-05** | Runtime / Loader / Registry **의미** 재정의 (책임 붕괴) |
| **L6-P-06** | Public API bypass / System JSON 직접 접근 도입 |
| **L6-P-07** | Loader cache 소유 / Registry 우회 assemble |
| **L6-P-08** | Metadata key rename (Ch.7 전) |
| **L6-P-09** | Special anchors 발명 |
| **L6-P-10** | non-consumable “canonical complete” 거짓 선언 |
| **L6-P-11** | Ratify 세션 code / System JSON mutation |
| **L6-P-12** | B3 재시도 |

### 14.2 Safe Stop Triggers

| Trigger | Action |
|---------|--------|
| 의미 변경 필요성 발견 | **Safe Stop** |
| Boundary 붕괴 (Domain→JSON 직접 접근) | **Safe Stop** |
| Completeness lift가 silent-drop/complete 오판 | **Safe Stop** |
| Public API breaking without version/Issue | **Safe Stop** |
| **Ch.10 Not Persisted** 상태에서 Runtime / Loader / Registry **code Apply** | **Safe Stop** |
| B6 Entry Criteria(B6-EN) 미충족 상태에서 Apply 시도 | **Safe Stop** |

**Safe Stop ≠ FAIL.**  
Gate 기준: Front Matter Chapter Status에서 Ch.10 = **Ratified**이고 B6-EN-*가 충족되기 전에는 code Apply에 진입하지 않는다.

---

## 15. Ratify Acceptance

본 Chapter가 **Ratified**로 인정되기 위한 기준 (문서 완전성):

| ID | Criterion |
|----|-----------|
| **L6-AC-01** | Layer Header · Purpose · Scope 명시 |
| **L6-AC-02** | Runtime Model · Boundary · Canonical Shape 명시 |
| **L6-AC-03** | Public API · Loader · Registry Contract 명시 |
| **L6-AC-04** | Projection / Supply Contract 명시 |
| **L6-AC-05** | Package Completeness Policy (**Option C**) 명시 |
| **L6-AC-06** | Compatibility / Version 명시 |
| **L6-AC-07** | Runtime Invariants (L6-I-*) 명시 |
| **L6-AC-08** | Migration Rule · Semantic Guard 명시 |
| **L6-AC-09** | Verification Rule 명시 |
| **L6-AC-10** | Decision Records 명시 |
| **L6-AC-11** | Out-of-Scope / Prohibited 명시 |
| **L6-AC-12** | 본 Ratify 세션에서 Runtime/Loader/Registry/System JSON **미변경** |

---

## 16. Verification Rule

Apply-time (B6 ADR 이후 · Apply Count > 0일 때) 검증:

| ID | Check | Pass condition |
|----|-------|----------------|
| **L6-VR-01** | Ch.10 Ratified | on-disk · Front Matter Status = Ratified |
| **L6-VR-02** | B6 Entry Criteria | B6-EN-* 충족 |
| **L6-VR-03** | Scope Freeze | Apply/Defer/OOS가 Completeness Policy와 정합 |
| **L6-VR-04** | Public API | Entry/surface 불변 또는 additive-only |
| **L6-VR-05** | Invariants | L6-I-01…12 위반 없음 |
| **L6-VR-06** | Meaning Preservation | Formula/Value/Logic/Trajectory 의미 diff 없음 |
| **L6-VR-07** | Completeness | lift 대상 = consumable only · silent-drop 없음 |
| **L6-VR-08** | Boundary | Domain bypass / direct JSON = 0 |
| **L6-VR-09** | Loader/Registry | Sole Assembler / Sole Cache Owner 유지 |
| **L6-VR-10** | Special N/A | DGR-008 invent 없음 |
| **L6-VR-11** | Build / smoke | Apply > 0일 때 Build PASS · selected-system smoke |
| **L6-VR-12** | WG-AI-001 | Runtime=Y → L3 Architecture Review Consume |

Apply Count = 0이면 L6-VR-06…11은 vacuous / N/A로 기록할 수 있다.  
단 L6-VR-01…05 · Invariants 문서 준수는 유지한다.

---

## 17. Decision Records

### L6-D-001 — Package Completeness Policy

| Field | Value |
|-------|-------|
| **Decision ID** | **L6-D-001** |
| **Subject** | Package Completeness Policy / Loader Exclusion |
| **Decision** | **Option C** 채택 — consumable만 Structure Only lift 후보 · non-consumable Defer · Special N/A invent 금지 |
| **Reason** | Meaning Preservation · silent-drop 금지 · Ch.8 Deferred(`0tip_plus`)와 정합 · DGR-011 해소 경로 확보 |
| **Alternative** | Option A (disk 존재 = lift) |
| **Rejected Reason** | flat payload silent-drop · “complete” 오판 · Behavior/의미 혼선 |
| **Also rejected** | Option B sole (전면 Defer) — consumable 정규화 경로 봉쇄 |

### L6-D-002 — Runtime Boundary / Public Entry

| Field | Value |
|-------|-------|
| **Decision ID** | **L6-D-002** |
| **Subject** | Runtime Boundary · Public API |
| **Decision** | **Sole Lookup Entry** = **`getSystemContract()`** · Public API Surface = Entry + Approved sibling APIs only · PackageStore/Loader internal |
| **Reason** | Lookup Entry 단일화 · AAS AD-B6-04 · Boundary 명확화 · sibling API 오해 방지 |
| **Alternative** | Multi-entry / Direct JSON access 허용 |
| **Rejected Reason** | Boundary 붕괴 · System 결합 |

### L6-D-003 — Loader Responsibility

| Field | Value |
|-------|-------|
| **Decision ID** | **L6-D-003** |
| **Subject** | Loader Responsibility |
| **Decision** | Loader = **Sole Assembler** · **no cache** |
| **Reason** | INV-B6-05 · 조립 책임 단일화 |
| **Alternative** | Registry가 assemble+cache 동시 소유 |
| **Rejected Reason** | 책임 혼선 · 테스트/교체 비용 |

### L6-D-004 — Registry Responsibility

| Field | Value |
|-------|-------|
| **Decision ID** | **L6-D-004** |
| **Subject** | Registry Responsibility |
| **Decision** | Registry = **Sole Cache Owner** · Sole Lookup Entry owner · bootstrap |
| **Reason** | INV-B6-04 · AD-B6-06 · Consumer 단순화 |
| **Alternative** | Loader cache |
| **Rejected Reason** | L6-I-03/04 위반 |

### L6-D-005 — Ratify Scope

| Field | Value |
|-------|-------|
| **Decision ID** | **L6-D-005** |
| **Subject** | Ratify Scope |
| **Decision** | **Contract only** · 본 세션 **Code / System JSON Apply 금지** |
| **Reason** | Ch.8/Ch.9 Ratify 패턴 · Safe Stop · WG-AI-001 |
| **Alternative** | Ratify와 exclusion lift Apply 동시 수행 |
| **Rejected Reason** | Ratify≠Apply 혼동 · Conditional 해소와 Apply 승인을 동일시하는 위험 |

### L6-D-006 — Projection / Supply Modeling

| Field | Value |
|-------|-------|
| **Decision ID** | **L6-D-006** |
| **Subject** | Resolver / Provider |
| **Decision** | 개념 계약으로 규정 · 신규 필수 모듈 강제 **안 함** · Projection = TrajectoryContractView · Provider = Domain Supply |
| **Reason** | 현재 구조와 정합 · 과잉 설계 방지 |
| **Alternative** | `Resolver.ts` / `Provider.ts` 필수화 |
| **Rejected Reason** | Implementation 강제 · Contract 범위 초과 |

---

## 18. Out-of-Scope

본 Chapter / L6 Ratify·Apply가 **다루지 않는** 영역:

| Item | Notes |
|------|-------|
| Formula 의미 | Non-Target |
| Logic 실행 의미 | Ch.9 |
| Trajectory 의미 | Non-Target / Domain |
| Metadata Rename | Ch.7 / B3 HALTED |
| Presentation | Ch.11 / B7 |
| Validation Engine | B8 / STEP6 |
| Runtime Code Mutation (Ratify session) | Prohibited |
| Loader Implementation Detail | glob/Map/freeze 코드 |
| Registry Internal Implementation | cache Map 구현 |
| Coordinate invent / Special anchors invent | Prohibited |
| B3 Metadata Normalize retry | Forbidden |

---

## 19. Runtime Binding Map (cite only)

관찰된 구현 경로 (변경 지시 **아님**):

```text
data/systems/<id>/{profile,logic,anchors,system_meta}.json
  → runtime/loader/systemPackageStore.ts     (internal)
  → runtime/loader/systemLoader.ts           (assembleSystemContract)
  → runtime/registry/systemRegistry.ts       (getSystemContract · cache)
  → runtime/index.ts                         (Public API)
  → App.jsx bindDomainContractSupply
  → domain/runtimeContractSupply.ts
  → Domain / Overlay consumers
```

Trajectory projection:

```text
SystemContract
  → extractTrajectoryContractView
  → TrajectoryContractView (pure)
```

Loader exclusion cite:

```text
systemPackageStore anchors glob
  !0tip_plus/anchors.json
  !double_rail/anchors.json
```

**Binding rule:** cite only. 본 Chapter는 위 경로의 코드 수정을 지시하지 않는다.

---

## 20. Change Log

| Date | Change |
|------|--------|
| 2026-07-22 | Ch.10 L6 Runtime Contract **on-disk Ratified** v1.0 · Canonical Runtime · Public API · Loader/Registry · Projection/Supply · Package Completeness **Option C** · Invariants L6-I-01…12 · Decision Records L6-D-001…006 · Migration/Guard/Acceptance/Verification · Ratify session = Contract only · **No code/JSON Apply** |
| 2026-07-22 | **Minor Amendment** (Ratify Review) · Sole Lookup Entry 정의 · Structure Only(L6)=Load Completeness 복원 명시 · Projection IDs `L6-J-*` · Prohibited IDs `L6-P-*` (Ch.8/9 관례) · Safe Stop Gate 표현 정리 · **Status = Ratified** 확정 |

---

## 21. Decision Summary (Ratify)

| Decision | Statement |
|----------|-----------|
| **D-FCB-Ch10-01** | Ch.10 L6 Runtime Contract **on-disk Ratified** |
| **D-FCB-Ch10-02** | Package Completeness = **Option C** · Structure Only(L6) = **Load Completeness 복원** (의미 불변) |
| **D-FCB-Ch10-03** | Sole Lookup Entry = **`getSystemContract`** · Public API Surface = Entry + Approved siblings · Loader Sole Assembler · Registry Sole Cache Owner |
| **D-FCB-Ch10-04** | Ratify = **Contract only** · Code Apply **금지** (본 세션) |
| **D-FCB-Ch10-05** | Ratify Review = **Ready after Minor Amendment** → Minor Amendment **Complete** · Status **Ratified** |
| **D-FCB-Ch10-06** | Next = Front Matter / Ops SSOT sync · **B6 Scope Reconfirm** · Freeze Amendment(필요 시) · **ADR** · B3 Hold 유지 |

---

*End of FLEET_CONTRACT_BOOK_Ch10_L6_Runtime_Contract.md — Status: Ratified · Version: v1.0 · Minor Amendment Complete*
