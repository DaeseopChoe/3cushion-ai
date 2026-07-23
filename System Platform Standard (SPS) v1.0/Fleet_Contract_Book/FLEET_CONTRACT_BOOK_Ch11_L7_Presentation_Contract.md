# Fleet Contract Book — Chapter 11

# Layer 7 : Presentation Contract

```text
Document   : FLEET_CONTRACT_BOOK_Ch11_L7_Presentation_Contract.md
Type       : Fleet Contract Book · Chapter 11 · L7 Presentation Contract
Version    : v1.0
Status     : Ratified
Date       : 2026-07-23
Book       : Fleet Contract Book v1.0 (Conditional · Ch.8/Ch.9/Ch.10/Ch.11 Ratified)
Baseline   : c398f3abb4b52a11369f77bba1a5c4877155acb4 (Book) · STEP8 B6 PASS (Runtime Applied)
Depends on : Fleet Scope Non-Target · WG-AI-001 Consume · Ch.8 · Ch.9 · Ch.10 (Ratified · Consume)
             · docs/APPLICATION_FLOW.md (Architecture Guide · cite)
             · STEP8 B7 Architecture Review · Ratify Review · Minor Amendment (MA-01…05)
Rule       : Contract only · No Formula/System Value/Logic/Trajectory meaning change ·
             No Runtime/Loader/Registry/Code/System JSON mutation in this Ratify session ·
             Ratify ≠ Apply · No Target Freeze · No ADR · No Commit / Push
Source     : STEP8 B7 Architecture Review · Ratify Review · Minor Amendment · APPLICATION_FLOW.md ·
             Ch.10 · AAS Presentation / Renderer / Overlay constitution (cite)
Naming     : Fleet L7 Presentation ≠ STEP6 Validation L7 Semantic Consistency
             (SCH-FV-L7-SEM-CONS / DGR-003 / KI-03) — 혼합 금지
```

---

## 0. Layer Header

| 항목 | 값 |
|------|----|
| **Layer ID** | **L7** |
| **Layer Name** | Presentation Contract |
| **Status** | **Ratified** (Minor Amendment Complete · Review PASS) |
| **Introduced** | v0.1 (on-disk 2026-07-23) · Amended v0.2 · **Ratified v1.0** (2026-07-23) |
| **ID Legend** | **L7-I** Invariant · **L7-D** Decision · **L7-A** Public API Consumption · **L7-B** Boundary · **L7-M** Model · **L7-C** Display/Render Consumption · **L7-S** Structure Only · **L7-P** Prohibited · **L7-AC** Acceptance · **L7-VR** Verification |
| **Class Applicability** | **전 System** · Presentation 소비 규칙은 공통 · Special UI 예외는 OOS 또는 Defer |
| **Depends on** | L6 Runtime (Ch.10 · Consume) · L4 Anchor / L5 Logic (cite only) · Fleet Non-Target · WG-AI-001 · `docs/APPLICATION_FLOW.md` |
| **Consumed by** | STEP8 Batch **B7** (Target Freeze / ADR / Apply — **후속** · Ratify ≠ Apply 승인) |
| **Book file** | `System Platform Standard (SPS) v1.0/Fleet_Contract_Book/FLEET_CONTRACT_BOOK_Ch11_L7_Presentation_Contract.md` |

### Core Principles (shall uphold)

| Principle | Statement |
|-----------|-----------|
| **Presentation Purity** | Presentation은 표시·사용자 입력·Overlay 표시만 담당한다. |
| **Renderer = Display Model** | Renderer는 display model만 만든다. 계산·Package load·Contract lookup 금지. |
| **App = Sole Hub** | Application(App)은 Contract lookup · projection · dependency injection · composition의 **Sole Hub**이다. |
| **Canonical Consumption** | Presentation의 **정규 경로**는 props / injected display model 소비이다. System JSON · PackageStore · Loader **bypass 금지**. |
| **Meaning Preservation** | Formula / System Value / Logic / Trajectory **의미** 및 **관찰 가능한 표시 결과**를 변경하지 않는다. |
| **Structure Only (L7)** | L7 Migration은 소비·경계·표시 구조 정규화만 허용한다. |
| **L6 Consume** | Ch.10 Public API · Projection · Supply Isolation을 **재정의하지 않고** 소비한다. |
| **Ch.7 Caution** | `profile.display` / displayName 등 Metadata rename은 Ch.7 / B3 Hold — L7이 우회하지 않는다. |
| **Ratify ≠ Apply** | Ratify만으로 Code Apply가 승인되지 않는다 (Freeze · ADR 필요). |
| **Safe Stop** | 의미 변경 징후 시 즉시 중단한다. **Safe Stop ≠ FAIL**. |
| **Non-Target Respect** | Fleet Non-Target (Formula / Value / Trajectory 의미) 상위 준수. |
| **Naming Isolation** | Fleet **L7 Presentation**과 STEP6 **L7 Semantic Consistency**를 혼합하지 않는다. |

### Ratify Session Declaration

| Item | Value |
|------|-------|
| **본 세션** | Ch.11 L7 Presentation Contract **on-disk Ratify** |
| **Status** | **Ratified** |
| **Target Freeze / ADR** | **미수행** · Next Gate = **B7 Target Freeze** |
| **Code / System JSON Apply** | **금지** (본 Ratify 세션) |
| **Front Matter** | Ch.11 = **Ratified** · Persisted Index 반영 |
| **L7-D-001** | **Explicit Defer / Transitional Debt** 유지 · Option = Freeze/ADR |
| **B3** | **Hold** · 재시도 금지 |

---

## 1. Purpose

L7 Presentation Layer의 목적은 Runtime이 공급한 Contract / Projection / Display Model을 **표시 계층이 어떻게 소비하는가**에 대한 **경계 계약**을 정의하는 것이다.

본 Chapter가 규정하는 것:

- Presentation / Renderer / Overlay / ViewModel / Display Model 역할
- Canonical Presentation Path (Runtime → Application → Renderer → Presentation)
- Boundary Rules (JSON / PackageStore / Loader bypass 금지)
- Display & Render Consumption Contract
- Public API Consumption Policy
- Structure Only (L7) · Meaning Preservation
- Migration Rule · Semantic Guard
- Ratify Acceptance · Apply-time Verification Rule
- Decision Records (L7-D-001 = Explicit Defer / Transitional Debt)

본 Chapter가 규정하지 **않는** 것:

- Formula / System Value / Logic / Anchor / Trajectory **계산·물리 의미**
- Runtime / Loader / Registry / Completeness 정책 재정의 (Ch.10)
- Metadata key rename · displayName canonicalization (Ch.7 / B3)
- Validation Engine · STEP6 Semantic Consistency L7 (B8 / STEP6)
- CSS / UX polish · Caption placement algorithm
- Search / Dataset behavior · system-specific rule
- 본 Ratify 세션의 Code / JSON Apply · Target Freeze · ADR

---

## 2. Scope / Class Applicability

### 2.1 In Scope (L7)

| # | Item |
|---|------|
| 1 | Presentation Layer 역할 · 순수성 |
| 2 | Renderer / Overlay / ViewModel / Display Model 역할 분리 |
| 3 | Canonical Path · App Sole Hub |
| 4 | Boundary Rules (vs Runtime / Domain / Package / Loader) |
| 5 | Display & Render Consumption (`profile.display` · `capabilities.render` · `labelStrategy` · `baselineHandle` · `TrajectoryContractView`) |
| 6 | Public API Consumption Policy · SysOverlay Transitional Debt (L7-D-001) |
| 7 | Structure Only (L7) · Meaning Preservation · Semantic Guard |
| 8 | Migration Rule · Ratify Acceptance · Verification Rule |
| 9 | Decision Records |
| 10 | Fleet L7 vs STEP6 L7 Semantic Consistency **명칭 분리** |

### 2.2 Out of Scope

| # | Item | Owner |
|---|------|-------|
| 1 | Formula / expr / System Value **의미** | Non-Target |
| 2 | Logic 실행 의미 | Ch.9 |
| 3 | Anchor 좌표·id **값** | Ch.8 |
| 4 | Trajectory 물리·path 알고리즘 | Non-Target / Domain Trajectory |
| 5 | Runtime Public API / Loader / Registry / Completeness | Ch.10 / B6 |
| 6 | Metadata key rename · displayName canonical | Ch.7 / **B3 Hold** |
| 7 | Validation Engine · `SCH-FV-L7-SEM-CONS` | B8 / STEP6 |
| 8 | CSS / UX / Caption algorithm / Search / Dataset | Product / Domain / Dataset |
| 9 | 본 Ratify 세션의 Code / JSON / Freeze / ADR | **Prohibited** |

### 2.3 Class Applicability

| Class | L7 적용 |
|-------|--------|
| **전 System** | Public API 소비 · Presentation 순수성 · Renderer display-model · Meaning Preservation 공통 |
| **Normal / Special** | UI 노출 차이는 Product Catalog 영역 · L7이 Special anchors를 발명하거나 Metadata를 rename하지 않음 |
| **Carry-only slices** | `profile.display` 등 Contract에 존재하나 UI 미소비인 슬라이스는 **소비 계약 + Caution**만 규정 (강제 통일 Apply 금지) |

---

## 3. Dependencies

| Dependency | Role | Note |
|------------|------|------|
| **Fleet Non-Target** | Formula / Value / Trajectory 의미 불변 | 모든 L7 규칙 상위 |
| **WG-AI-001** | Impact / Risk / Safe Stop | Consume |
| **Ch.8 L4 Anchor** | anchors → labels / trajectory display 전제 | **Consume only** · 재정의 금지 |
| **Ch.9 L5 Logic** | logic payload cite | **Consume only** · 실행 의미 재정의 금지 |
| **Ch.10 L6 Runtime** | Public API · Projection · Supply Isolation · capabilities | **Consume only** · Runtime 계약 수정 금지 |
| **Ch.7 L3 Metadata** | displayName / meta key 의미 | **Not Persisted** · **Caution** · rename **금지** (B3 Hold) |
| **`docs/APPLICATION_FLOW.md`** | Runtime Orchestration 구현 가이드 | Architecture First Consume · Binding Map cite |
| **STEP8 B7 Architecture Review** | PASS (Conditional) → Minor Amendment → **Ratify** | Conditional Blocker (Ch.11 Not Persisted) **해소** |
| **AAS Constitution / Batch2** | Presentation Purity · AD-B2-01 | cite · 재작성 금지 |

충돌 시: **Ratified Ch.8–Ch.11**이 해당 Layer Apply 권위를 유지한다.  
Ch.11은 **Status = Ratified**이고 Front Matter에 반영되어 B7 Apply의 **계약 근거**가 된다.  
단 **Ratify ≠ Apply** — Target Freeze · ADR 없이 Code Apply 금지.

---

## 4. Presentation Model

### 4.1 Canonical Path (shall)

```text
L6 Runtime
  getSystemContract · extractTrajectoryContractView
        ↓
Application (App.jsx) — Sole Hub
  lookup · projection · injection · composition
        ↓
Renderer (display model)
        ↓
Presentation (JSX · Overlay · table UI)
```

Domain VM은 Canonical Path의 **대체 Presentation이 아니다**.  
Domain은 Runtime Contract **Supply**를 주입받아 계산 또는 ViewModel 조합을 수행한다.

### 4.2 Role Definitions

| Role | Path / Artifact (cite) | Shall | Shall not |
|------|------------------------|-------|-----------|
| **Application (Sole Hub)** | `App.jsx` | Contract lookup · `extractTrajectoryContractView` · `bindDomainContractSupply` · Domain/Renderer wiring · UI state orchestration | Package assemble · Registry cache 소유 · System JSON 직접 읽기 |
| **Domain VM** | `domain/*` ViewModels · calculators via supply | 계산 · Render용 데이터 **조합** · supply resolvers | React Presentation · Runtime import · PackageStore |
| **Renderer** | `renderer/**` | Display Model 생성 (labels · trajectory render · path attr · baseline handle model) | Formula 계산 · System JSON · Package load · Runtime lookup · Search · Dataset merge |
| **Presentation** | `components/**` · overlays · table JSX | 화면 표시 · 사용자 입력 · Overlay 표시 · **정규 경로:** props / injected display model | 계산 · system-specific 의미 규칙 소유 · Search · Dataset merge · JSON bypass |
| **Overlay** | `components/overlays/*` · `overlay/router|state/*` | Routing / lifecycle / Presentation UI | Domain 계산 내장 (AD-B2-01) · Package bypass |
| **Display Model** | Renderer 출력 · Domain ViewModel 결과 | Presentation이 그릴 수 있는 **표시 전용** 구조 | 의미 재해석 · Contract mutate |

### 4.3 Model Rules

| ID | Rule |
|----|------|
| **L7-M-01** | Presentation ≠ Domain VM. Domain VM은 Presentation이 아니다. |
| **L7-M-02** | Renderer = **Display Model only**. |
| **L7-M-03** | Presentation의 **정규 경로**는 **props / injected display model** 소비이다 (App Sole Hub). Overlay의 Runtime Public API **직접** 소비는 정규 경로가 아니며 **L7-D-001 (Explicit Defer / Transitional Debt)** lane으로만 취급한다. |
| **L7-M-04** | Overlay는 Routing + Presentation + Overlay State를 담당한다. 계산·검색·Dataset·System 로직을 소유하지 않는다 (AAS ADR-009 cite). |
| **L7-M-05** | Display Model은 Contract 또는 Domain 결과를 **재해석하여 의미를 바꾸지 않는다**. |

---

## 5. Boundary Rules

### 5.1 Layer Boundaries

| ID | Boundary | Rule |
|----|----------|------|
| **L7-B-01** | Runtime → Application | Application은 Runtime **Public API**만 호출한다. |
| **L7-B-02** | Application → Domain | Domain은 App이 bind한 **Supply**만 사용한다. Domain → Runtime **import 금지** (Ch.10 L6-U / L6-B-03 cite). |
| **L7-B-03** | Application → Renderer | Renderer는 App이 주입한 Contract views / Domain 결과 / build 결과만 받는다. |
| **L7-B-04** | Renderer → Presentation | Presentation은 Renderer display model · props를 표시한다. |
| **L7-B-05** | Presentation → System JSON | **금지** — `data/systems/**` 직접 접근 금지. |
| **L7-B-06** | Presentation → PackageStore / Loader | **금지** — Public API 아님 (Ch.10 cite). |
| **L7-B-07** | Presentation → Registry internals | **금지** — cache / bootstrap / assemble 경로 노출 금지. |
| **L7-B-08** | L7 → L6 | L7은 L6 Public API · Projection · capabilities **소비**만 한다. Loader/Registry/Completeness **재정의 금지**. |

### 5.2 Forbidden Bypass Summary

```text
Presentation / Renderer / Overlay
  ✗ data/systems/** JSON import
  ✗ systemPackageStore
  ✗ assembleSystemContract / bootstrapRegistry (Public 아님)
  ✗ Domain이 Runtime을 import하도록 강제
```

관찰 (Architecture Review / APPLICATION_FLOW):  
components · renderer · overlay에서 System JSON / PackageStore 직접 접근 = **0**.

---

## 6. Display & Render Consumption Contract

### 6.1 Slice Map

| Slice | Origin (L6 cite) | Presentation 역할 | 현재 관찰 |
|-------|------------------|-------------------|-----------|
| **`profile.display`** | `profile.json` → Loader `parseDisplay` → `SystemContract.profile.display` | 표시 메타 **소비 계약** 정의 가능 | Contract **carry** · UI **사실상 미사용** |
| **`capabilities.render`** | `system_meta` / family → `buildCapabilities` | render capability 입력 | `labelStrategy` optional |
| **`labelStrategy`** | capabilities 또는 family 추론 → **`TrajectoryContractView.render.labelStrategy`** | 라벨 표시 전략 **canonical 소비** | App → Renderer / `SystemValueLabels` |
| **`baselineHandle`** | capabilities / family → **`TrajectoryContractView.baselineHandle`** | baseline handle 표시 플래그 | App → `buildBaselineHandleModel` |
| **`TrajectoryContractView`** | `extractTrajectoryContractView(contract)` | Presentation 경로의 **canonical projection** | App render path |
| **Display Model** | `renderer/**` outputs | JSX가 소비하는 최종 표시 구조 | trajectory / labels / handles |

### 6.2 Consumption Rules

| ID | Rule |
|----|------|
| **L7-C-01** | Trajectory Presentation의 canonical projection은 **`extractTrajectoryContractView`** 이다. |
| **L7-C-02** | Effective `labelStrategy` 소비는 **`TrajectoryContractView.render.labelStrategy`** 를 우선한다 (App injection). |
| **L7-C-03** | Effective `baselineHandle` 소비는 **`TrajectoryContractView.baselineHandle`** 을 우선한다. |
| **L7-C-04** | Renderer / Presentation은 `labelStrategy` · baselineHandle의 **의미를 재정의하지 않는다** (L6 projection cite). |
| **L7-C-05** | `profile.display`는 **소비 계약**을 둘 수 있으나, **canonical metadata key rename은 L7 Apply가 아니다**. |
| **L7-C-06** | `profile.display` shape **강제 통일**은 Meaning Preservation **증명 전 Apply 금지**. |
| **L7-C-07** | Display Model은 Domain/Contract 입력의 관찰 가능 표시 결과를 **변경하지 않는다**. |

### 6.3 `profile.display` Caution (Ch.7)

| Caution | Statement |
|---------|-----------|
| **다형성** | Inventory 관찰: `name_key` / `ko|en.title` / `overlay_keys` 등 **다형** shape |
| **경계 겹침** | displayName · category 등 Metadata 관측과 **겹침 가능** |
| **허용** | L7에서 **읽기/소비 규칙** 정의 |
| **금지** | `displayName` 등 **Metadata rename** · Ch.7 / B3 Hold **우회** |
| **Apply** | shape 강제 통일 = Meaning Preservation 증명 + (필요 시) Ch.7 정합 전 **금지** |
| **B3** | Metadata Normalize **재시도 금지** |

---

## 7. Public API Consumption Policy

### 7.1 Approved Surface (L6 cite · L7 consume)

| API | Role in L7 |
|-----|------------|
| **`getSystemContract(systemId)`** | Sole Lookup Entry — App Sole Hub의 조회 Entry |
| **`extractTrajectoryContractView(contract)`** | Pure projection — Presentation/Trajectory display 입력 |
| `listRegisteredSystemIds` / `isRegistered` | Discovery (Presentation 메뉴 ≠ Runtime discovery — APPLICATION_FLOW cite) |
| Types | Shape cite only |

**Public API가 아닌 것:** `bootstrapRegistry` · Loader · PackageStore · `assembleSystemContract`.

### 7.2 Consumption Policy Rules

| ID | Rule |
|----|------|
| **L7-A-01** | **App = Sole Hub** — Contract lookup · projection · supply bind · composition의 **정규** 경로. |
| **L7-A-02** | Renderer는 Runtime을 **직접 lookup하지 않는다**. 주입된 views / props만 소비한다. |
| **L7-A-03** | Domain은 Public API를 **직접 import하지 않는다**. Supply만 사용한다. |
| **L7-A-04** | Presentation의 **정규 경로**는 **props / injected display model** 소비이다. |
| **L7-A-05** | Overlay / Presentation의 Runtime Public API **직접** 소비는 **정규 경로가 아니다**. 현행 SysOverlay 관찰 경로는 **L7-D-001 Explicit Defer / Transitional Debt**로만 인정한다. Option 1/2/3 **최종 선택은 Target Freeze 또는 ADR**에서 확정한다. B7에서 props-only **강제 Migration 금지**. |
| **L7-A-06** | System JSON · PackageStore · Loader 직접 접근은 **항상 금지** (Decision으로도 허용 불가). |

### 7.3 Observed Exception (fact only · Transitional)

| Item | Observation |
|------|-------------|
| **File** | `frontend/src/components/overlays/SysOverlay.jsx` |
| **Import** | `getSystemContract` from `runtime` |
| **Use** | `getSystemContract(formData.system)?.profile?.formulaExpr` |
| **Context** | formula **표시**용 조회 · AD-B2-01 / Ch.10 Overlay Approved Consumer **긴장** |
| **Disposition** | **L7-D-001 — Explicit Defer / Transitional Debt** (§14) |

---

## 8. Invariants

L7 Layer의 **절대 불변** 조건이다. 위반 시 Safe Stop / Apply 거부.

| ID | Invariant |
|----|-----------|
| **L7-I-01** | Presentation은 계산 · Search · Dataset merge · system-specific 의미 규칙을 소유하지 않는다. |
| **L7-I-02** | Renderer는 Display Model only이다. |
| **L7-I-03** | Application은 Contract lookup / projection / injection / composition의 **Sole Hub**이다. |
| **L7-I-04** | Presentation / Renderer는 System JSON · PackageStore · Loader를 **bypass하지 않는다**. |
| **L7-I-05** | Domain은 Runtime을 import하지 않는다 (Supply Isolation · Ch.10 cite). |
| **L7-I-06** | Formula / System Value / Logic / Trajectory **의미**는 L7에서 변경하지 않는다. |
| **L7-I-07** | 관찰 가능한 표시 결과(SYS 숫자 · 궤적 path · label 선택 결과 등)의 **의미**를 L7 Migration이 바꾸지 않는다. |
| **L7-I-08** | L7은 Ch.10 Runtime Contract · Completeness · Public API Surface를 **재정의하지 않는다**. |
| **L7-I-09** | Metadata key rename (`displayName` 등)은 L7 Apply로 **수행하지 않는다** (Ch.7 / B3). |
| **L7-I-10** | Ch.11이 Front Matter에서 **Ratified**로 반영되기 전에는 B7 Code Apply 근거로 사용하지 않는다. (본 Chapter Ratify 후: Freeze·ADR Entry 전 Code Apply 금지 — Ratify ≠ Apply) |
| **L7-I-11** | Fleet L7 Presentation과 STEP6 L7 Semantic Consistency를 **동일 규칙으로 취급하지 않는다**. |
| **L7-I-12** | Safe Stop ≠ FAIL · 의미 변경 징후 시 즉시 중단한다. |
| **L7-I-13** | B3 Metadata Normalize를 L7에서 **재시도하지 않는다**. |

---

## 9. Structure Only · Meaning Preservation

### 9.1 Structure Only (L7)

**정의:** L7 Migration = Presentation **소비·경계·표시 구조** 정규화만 허용한다.

| 허용 (조건부) | 금지 |
|---------------|------|
| 소비 경로·역할·금지 bypass의 **계약 명문화** | Formula / Value / Logic / Trajectory **의미** 변경 |
| 이미 Canonical인 Renderer/Overlay/App path → **No-op** | 관찰 가능 표시 결과의 의미 변경 |
| `profile.display` **무손실** 구조 정규화 (증명 시 · Ch.7 비충돌) | Metadata rename · displayName canonicalization |
| Public API Consumption **문서 정합** (code Apply는 별도 ADR) | Runtime / Loader / Registry / Completeness 변경 |
| Empty Apply (대상 없음) | Validation Semantic Rule 구현 (B8) |
| L7-D-001 Transitional Debt **유지** (강제 props-only Apply 없음) | SysOverlay 강제 Migration을 Structure Only로 위장 |

| ID | Rule |
|----|------|
| **L7-S-01** | Structure Only (L7) ≠ UX redesign ≠ CSS polish. |
| **L7-S-02** | Structure Only라도 Meaning Preservation을 위반하면 **금지**. |
| **L7-S-03** | `profile.display` 강제 통일은 무손실·Ch.7 비충돌 증명 전 **Defer**. |

### 9.2 Meaning Preservation

다음을 **변경하지 않는다**:

1. Formula 의미  
2. System Value 의미  
3. Logic 실행 의미  
4. Trajectory 물리·path 의미  
5. **관찰 가능한 표시 결과**의 의미 (동일 입력 → 동일 표시 해석)

Runtime 조립이 의미를 바꾸지 않듯 (Ch.10), Presentation 소비 정규화도 의미를 바꾸지 않는다.

---

## 10. Migration Rule

### 10.1 Principle

L7 Migration = **Structure Only (L7)**  
Presentation 소비·경계·표시 구조 정규화만 허용한다.

### 10.2 Classification (Target Freeze 입력용 · 본 문서 ≠ Freeze)

| Class | Meaning |
|-------|---------|
| **Apply** | Structure Only 입증 · Meaning Preservation 유지 · Ch.11 **Ratified** · Freeze · ADR 후 |
| **No-op** | 이미 Canonical (App hub · Renderer injection · JSON bypass 없음 등) |
| **Defer** | Ch.7 의존 · 의미 증명 부족 · **L7-D-001 SysOverlay Transitional** · display 다형 통일 등 |
| **Out-of-Scope** | Non-Target · B3 · B8 · Runtime Completeness · CSS/UX |

### 10.3 Forbidden Migration

- Formula / Value / Logic / Trajectory 의미 변경  
- Metadata rename  
- Runtime Public API breaking  
- System JSON bypass “편의” 도입  
- STEP6 Semantic L7 규칙을 Presentation Apply로 편입  
- **Ch.11 Not Ratified** (Front Matter 미반영) 상태에서 Code Apply  
- L7-D-001을 근거 없이 props-only **강제** Apply  

### 10.4 Relation to B7

| Gate | Status (본 Ratify 시점) |
|------|------------------------|
| Architecture Review | **PASS** |
| Ratify Review | **READY AFTER MINOR AMENDMENT** → Minor Amendment **Applied** |
| Ch.11 on-disk | **Ratified** (본 문서 v1.0) |
| Front Matter | Ch.11 = **Ratified** |
| B7 Target Freeze | **Next Gate** |
| ADR / Code Apply | **후속** (Freeze 이후 · 필요 시) |

**본 Chapter Ratified ≠ B7 Apply Approved.**  
**Ratify ≠ Apply.**

---

## 11. Semantic Guard

### 11.1 Absolute Prohibitions

| ID | Prohibited |
|----|------------|
| **L7-P-01** | Formula 의미 변경 |
| **L7-P-02** | System Value 의미 변경 |
| **L7-P-03** | Logic 실행 의미 변경 |
| **L7-P-04** | Trajectory 의미 변경 |
| **L7-P-05** | 관찰 가능한 표시 결과의 의미 변경 |
| **L7-P-06** | System JSON / PackageStore / Loader bypass 도입 |
| **L7-P-07** | Runtime / Loader / Registry / Completeness 재정의 |
| **L7-P-08** | Metadata key rename · displayName canonicalization (Ch.7 전) |
| **L7-P-09** | B3 Metadata Normalize 재시도 |
| **L7-P-10** | Front Matter에 Ch.11이 Ratified로 반영되지 않은 채 Apply SSOT로 사용 |
| **L7-P-11** | Fleet L7과 STEP6 L7 Semantic Consistency 규칙 혼합 |
| **L7-P-12** | Caption / Search / Dataset / system-specific rule을 L7 Apply로 수행 |
| **L7-P-13** | L7-D-001 Option 1/2/3을 Target Freeze / ADR 전에 **최종 확정·강제 Apply** |
| **L7-P-14** | 본 Ratify 세션의 Code / JSON / Freeze / ADR / Commit / Push |

### 11.2 Safe Stop Triggers

| Trigger | Action |
|---------|--------|
| 의미 변경 필요성 발견 | **Safe Stop** |
| Ch.7 미Ratify 하 display/metadata rename 유혹 | **Safe Stop** · B3/Ch.7로 분리 |
| Ch.11 Not Ratified (Front Matter) 상태에서 Code Apply 시도 | **Safe Stop** |
| JSON / PackageStore bypass 필요성 | **Safe Stop** |
| Runtime Completeness / Public API 변경 필요 | **Stop** · Ch.10 / B6 경로 |
| STEP6 Semantic L7을 B7 Apply에 편입 | **Safe Stop** |
| L7-D-001 강제 props-only Apply (Freeze/ADR 전) | **Safe Stop** |

**Safe Stop ≠ FAIL.**  
Gate 기준: Front Matter에서 Ch.11 = **Ratified**이고 B7 Entry Criteria가 충족되기 전에는 code Apply에 진입하지 않는다.

---

## 12. Ratify Acceptance

본 Chapter가 **Ratified**로 인정되기 위한 기준 (문서 완전성).  
**본 세션에서 기준 충족 · Status = Ratified 선언.**

| ID | Criterion |
|----|-----------|
| **L7-AC-01** | Layer Header · Purpose · Scope 명시 |
| **L7-AC-02** | Presentation Model (Presentation / Renderer / Overlay / ViewModel / Display Model) 명시 |
| **L7-AC-03** | Boundary Rules · JSON/PackageStore/Loader bypass 금지 명시 |
| **L7-AC-04** | Display & Render Consumption Contract 명시 |
| **L7-AC-05** | Public API Consumption Policy · App Sole Hub 명시 |
| **L7-AC-06** | Invariants (L7-I-*) 명시 |
| **L7-AC-07** | Structure Only · Meaning Preservation 명시 |
| **L7-AC-08** | Migration Rule · Semantic Guard 명시 |
| **L7-AC-09** | Verification Rule 명시 |
| **L7-AC-10** | Decision Records 명시 · Open Decision 해소 **또는 Explicit Defer** (**L7-D-001 = Explicit Defer · 충족**) |
| **L7-AC-11** | Out-of-Scope · Fleet L7 ≠ STEP6 L7 Semantic 명시 |
| **L7-AC-12** | Binding Map (`APPLICATION_FLOW` cite) 명시 |
| **L7-AC-13** | Ratify 세션에서 Runtime/Loader/Registry/System JSON **미변경** |
| **L7-AC-14** | Status를 **Ratified**로 승격하고 Front Matter Chapter Status 반영 (**본 세션 Complete**) |

---

## 13. Verification Rule

Apply-time (Ch.11 Ratified · B7 Freeze · ADR 이후 · Apply Count > 0일 때) 검증.  
**본 세션에서 Validation 실행하지 않는다.**

| ID | Check | Pass condition |
|----|-------|----------------|
| **L7-VR-01** | Ch.11 Ratified | on-disk · Front Matter Status = Ratified |
| **L7-VR-02** | B7 Entry / Freeze | Apply/Defer/OOS가 Migration Rule과 정합 |
| **L7-VR-03** | Boundary | Presentation/Renderer → System JSON / PackageStore / Loader = **0** |
| **L7-VR-04** | Sole Hub | App injection / projection path 유지 |
| **L7-VR-05** | Invariants | L7-I-01…13 위반 없음 |
| **L7-VR-06** | Meaning Preservation | Formula/Value/Logic/Trajectory · 관찰 가능 표시 의미 diff 없음 |
| **L7-VR-07** | L6 Non-regression | Public API Surface · Loader/Registry 책임 불변 |
| **L7-VR-08** | Metadata | displayName 등 rename 없음 (Ch.7 Hold) |
| **L7-VR-09** | Naming | STEP6 Semantic L7 규칙을 B7 Apply에 미포함 |
| **L7-VR-10** | Build / smoke | Apply > 0일 때 Build PASS · selected-system display smoke |
| **L7-VR-11** | WG-AI-001 | Interface/Architecture Impact Consume · Issue 절차 준수 |
| **L7-VR-12** | L7-D-001 | Transitional Debt 유지 또는 Freeze/ADR에서 Option 확정 후 정합 |

Apply Count = 0이면 L7-VR-06…10은 vacuous / N/A로 기록할 수 있다.  
단 L7-VR-01…05 · Invariants 문서 준수는 유지한다.

### 13.1 Distinction from B8 / STEP6

| Track | Layer meaning | Owner |
|-------|---------------|-------|
| **Fleet L7** | Presentation Contract | Ch.11 / B7 |
| **STEP6 L7** | Semantic Consistency Validation | Framework / Catalog / B8 · `SCH-FV-L7-SEM-CONS` |

L7-VR는 **Presentation Apply 검증**이다. Validation Engine 재설계·Semantic Rule 실행이 **아니다**.

---

## 14. Decision Records

### L7-D-001 — Overlay / SysOverlay Public API Direct Consumption

| Field | Value |
|-------|-------|
| **Decision ID** | **L7-D-001** |
| **Subject** | Overlay(특히 SysOverlay)의 `getSystemContract()` **직접** 소비 |
| **Disposition** | **Explicit Defer** |
| **Classification** | **Transitional Debt** |
| **Status** | **Locked (Defer)** · Option 1/2/3 **미선택** |
| **Observed Fact** | `SysOverlay.jsx` imports `getSystemContract` · `profile.formulaExpr` 조회 |
| **Meaning** | 현행 직접 소비는 **관찰 사실로 인정**한다. **정규 경로가 아니다** (L7-M-03 / L7-A-04/05). |
| **B7 Apply** | props-only **강제 Migration 하지 않는다**. |
| **Final Option** | Option **1 / 2 / 3** 최종 선택은 **Target Freeze 또는 ADR**에서 확정한다. |
| **Tension (cite)** | Ch.10: Overlay ∈ Approved Consumers · AAS AD-B2-01: props-driven Pure Presentation |

**Candidate Options (Freeze / ADR에서만 확정):**

| Option | Statement | Implication |
|--------|-----------|-------------|
| **1** | **Approved L6 Consumer 유지** | Overlay Public API direct = 허용 · L7-A에 명시적 Allow |
| **2** | **Transitional Debt 유지·명문화** | 허용 유지 · Debt ID · 후속 Migration 계획 |
| **3** | **props-only Migration** | Sole Hub props 주입으로 이전 · ADR Baseline에 포함 시에만 Apply |

**Rule:** Target Freeze **이전**에는 Option을 **최종 확정하지 않는다**.  
암묵적 영구 허용·금지 선언 금지.

### L7-D-002 — `profile.display` vs Ch.7 Boundary

| Field | Value |
|-------|-------|
| **Decision ID** | **L7-D-002** |
| **Subject** | `profile.display` 소비 vs Metadata rename |
| **Decision** | 소비 계약 **정의 가능** · **rename / 강제 통일 Apply = Ch.7/B3 또는 Defer** |
| **Reason** | Meaning Preservation · B3 Hold · Inventory 다형 shape |
| **Rejected** | B7에서 displayName canonical rename 수행 |

### L7-D-003 — Ratify Gate / Apply Separation

| Field | Value |
|-------|-------|
| **Decision ID** | **L7-D-003** |
| **Subject** | Ratify vs Apply |
| **Decision** | 본 문서 = **Ratified** · Apply는 Front Matter 반영 후에도 **Target Freeze · ADR** 없이 금지 · Next Gate = **B7 Target Freeze** |
| **Reason** | Ch.8–10 패턴 · Ratify ≠ Apply · B3 Safe Stop 교훈 |
| **Rejected** | Ratify 세션에서 Freeze · ADR · Code Apply 동시 수행 |

### L7-D-004 — Fleet L7 ≠ STEP6 L7 Semantic Consistency

| Field | Value |
|-------|-------|
| **Decision ID** | **L7-D-004** |
| **Subject** | Naming / Scope isolation |
| **Decision** | Fleet Ch.11 = Presentation Contract only · STEP6 `SCH-FV-L7-SEM-CONS` / DGR-003 = **OOS** |
| **Reason** | Architecture Review Risk R3 · Scope Drift 방지 |
| **Rejected** | DGR-003을 B7 Apply 대상으로 편입 |

---

## 15. Out-of-Scope

| Item | Notes |
|------|-------|
| Formula 의미 | Non-Target |
| System Value 의미 | Non-Target |
| Logic 실행 의미 | Ch.9 |
| Anchor 좌표/id 값 | Ch.8 |
| Trajectory 계산 의미 | Non-Target / Domain |
| Runtime Contract / Loader / Registry / Completeness | Ch.10 / B6 |
| Metadata canonical rename | Ch.7 / **B3 Hold** |
| B3 Metadata Normalize retry | **Forbidden** |
| B8 Validation Engine | OOS |
| STEP6 L7 Semantic Consistency | OOS · 명칭 혼합 금지 |
| CSS / UX polish | Product |
| Caption placement algorithm | Domain |
| Search / Dataset behavior | Domain / Dataset |
| System-specific rule | System / Domain |
| L7-D-001 Option 최종 확정 (Freeze/ADR 전) | **Deferred** |
| Target Freeze / ADR / Code Apply (본 Ratify 세션) | **Prohibited** |

---

## 16. Binding Map (cite only)

구현 대응 가이드: **`docs/APPLICATION_FLOW.md`** (§1–§7 · §9 · §10.1).  
본 Chapter는 아래 경로를 **cite only** 한다. 코드 수정을 지시하지 않는다.

### 16.1 Canonical Presentation Path

```text
User / systemId / render tick
  → App.jsx (Sole Hub)
  → getSystemContract(systemId)                 ← runtime Public API
  → extractTrajectoryContractView(contract)     ← pure projection
  → supplyReflectionSafety / buildRgAnchors / buildTrajectory
  → renderer/trajectory/* · renderer/labels/*   ← Display Model
  → Presentation JSX (table / overlays)
```

### 16.2 Domain Supply Path (not Presentation)

```text
App module load
  → bindDomainContractSupply({ getFormulaExpr, getFormulaHash, getAnchorsData })
  → domain/* via resolveDomainFormulaExpr / resolveDomainAnchorsData
  → (supply → getSystemContract → Registry → Loader → Package)
```

### 16.3 Responsibility Cite

| Layer | Owns (cite) |
|-------|-------------|
| Runtime | Lookup · Cache · Assemble · Projection extractors |
| Application | Orchestration · Sole Hub · UI state |
| Domain | Calc · VM compose via supply |
| Renderer | Display models |
| Presentation | UI · input · overlays (정규: props / models) |
| System Package | Persistent JSON (L4/L5/L6 consume) |

### 16.4 SysOverlay Transitional Cite (L7-D-001)

```text
components/overlays/SysOverlay.jsx
  → getSystemContract(systemId)?.profile?.formulaExpr
  → formula display
  → Disposition = Explicit Defer / Transitional Debt
  → Final Option = Target Freeze or ADR (not now)
```

**Binding rule:** cite only. 본 Chapter는 위 경로의 코드 수정을 지시하지 않는다.

---

## 17. Change Log / Decision Summary

### 17.1 Change Log

| Date | Change |
|------|--------|
| 2026-07-23 | Ch.11 L7 Presentation Contract **on-disk v0.1** · Status = Draft · Not Ratified · Architecture Review 입력 반영 |
| 2026-07-23 | **Minor Amendment v0.2** · Status = Ready for Ratify · Not Ratified · MA-01…05 · L7-D-001 Explicit Defer |
| 2026-07-23 | **Ch.11 L7 Presentation Contract on-disk Ratified v1.0** · Front Matter sync · L7-D-001 Explicit Defer / Transitional Debt **유지** · Option 확정 = Target Freeze/ADR · **No Code/JSON Apply · No Freeze · No ADR · No Commit/Push** · Next = **B7 Target Freeze** |

### 17.2 Decision Summary (Ratify)

| Decision | Statement |
|----------|-----------|
| **D-FCB-Ch11-01** | Ch.11 L7 Presentation Contract **on-disk Ratified** (v1.0) |
| **D-FCB-Ch11-02** | Canonical Path = Runtime → Application (Sole Hub) → Renderer → Presentation |
| **D-FCB-Ch11-03** | Renderer = Display Model only · Domain VM ≠ Presentation |
| **D-FCB-Ch11-04** | System JSON / PackageStore / Loader bypass = **Prohibited** |
| **D-FCB-Ch11-05** | `profile.display` 소비 계약 가능 · Metadata rename = **Ch.7/B3 OOS** |
| **D-FCB-Ch11-06** | SysOverlay Public API direct = **Explicit Defer / Transitional Debt** · Option 확정 = **Freeze/ADR** |
| **D-FCB-Ch11-07** | Fleet L7 ≠ STEP6 L7 Semantic Consistency |
| **D-FCB-Ch11-08** | Next Gate = **B7 Target Freeze** |
| **D-FCB-Ch11-09** | B3 Hold 유지 · Ch.8–Ch.10 Consume only · Ratify ≠ Apply |

### 17.3 Ratify Card

```text
Document     : FLEET_CONTRACT_BOOK_Ch11_L7_Presentation_Contract.md
Status       : Ratified
Version      : v1.0
Minor Amend  : MA-01…05 Applied (pre-Ratify)
Apply        : FORBIDDEN (until Target Freeze + ADR as required)
L7-D-001     : Explicit Defer / Transitional Debt
               Final Option → Target Freeze or ADR
Front Matter : Ch.11 = Ratified · Persisted Index updated
Next Gate    : B7 Target Freeze
```

---

*End of FLEET_CONTRACT_BOOK_Ch11_L7_Presentation_Contract.md — Status: Ratified · Version: v1.0 · Ratify Complete*
