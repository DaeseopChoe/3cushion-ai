# Fleet Contract Book — Chapter 9

# Layer 5 : Logic Contract

```text
Document   : FLEET_CONTRACT_BOOK_Ch09_L5_Logic_Contract.md
Type       : Fleet Contract Book · Chapter 9 · L5 Logic Contract
Version    : v1.0
Status     : Ratified
Date       : 2026-07-22
Book       : Fleet Contract Book v1.0 (Conditional · Ch.8/Ch.9 persisted)
Baseline   : 5d97520cdc3b3c1cd16c79a47a5f17b0cc04c0d5
Depends on : Fleet Scope Non-Target · WG-AI-001 Consume · B5-0 Logic Taxonomy
Rule       : Contract only · No Formula/System Value/Trajectory/Logic policy meaning change ·
             No Runtime/Loader/Registry/Validation implementation change in this Ratify session
Source     : STEP8 B5-0 Logic Taxonomy 조사 결과 only
```

---

## 0. Layer Header

| 항목 | 값 |
|------|----|
| **Layer ID** | **L5** |
| **Layer Name** | Logic Contract |
| **Status** | **Ratified** |
| **Introduced** | v1.0 (on-disk 2026-07-22) |
| **Class Applicability** | **Normal + Special 공통** · 단, Type별 contract가 다름 |
| **Depends on** | L1 Identity · L2 Schema · L3 Metadata (Consume) · L4 Anchor (Consume) · Fleet Non-Target |
| **Consumed by** | L6 Runtime (cite binding only) · STEP8 Batch **B5** |
| **Book file** | `System Platform Standard (SPS) v1.0/Fleet_Contract_Book/FLEET_CONTRACT_BOOK_Ch09_L5_Logic_Contract.md` |

---

## 1. Purpose

L5 Logic Layer의 목적은 **계산 자체를 수행하는 것**이 아니라, 계산을 **어떻게 표현·선택·위임·검증하는지**에 대한 **Logic Contract**를 정의하는 것이다.

본 Chapter가 규정하는 것:

- Canonical Logic Taxonomy
- Type Matrix
- 38개 System Mapping
- Type별 Required / Optional / Legacy key 분류
- Legacy vs Modern 비교
- Special Logic 분리 원칙
- Runtime Binding (cite only)
- Structure-only Migration Rule
- Semantic Guard / Acceptance Criteria

본 Chapter가 규정하지 **않는** 것:

- Formula / expression / System Value 의미
- Track / Input / Branch / Decision / Calculation Policy의 **실행 의미 재정의**
- Runtime / Loader / Registry / Validation engine 구현 변경
- `logic.meta` rename (Ch.7 미Ratify 상태에서 금지)
- 실제 B5 Target Freeze / Apply / Validation 수행

---

## 2. Scope & Class Applicability

### 2.1 In Scope (L5)

| # | Item |
|---|------|
| 1 | `logic.json`의 canonical **type taxonomy** |
| 2 | Type별 wrapper / policy / role / decision structure |
| 3 | Type별 system mapping (38 systems) |
| 4 | Legacy → Modern **structure-only** migration boundary |
| 5 | Special Logic와 General Logic의 분리 원칙 |
| 6 | Runtime binding / semantic guard / acceptance criteria |

### 2.2 Out of Scope

| # | Item | Owner |
|---|------|-------|
| 1 | Formula / expr / System Value 의미 | Non-Target |
| 2 | Trajectory 물리 의미 / path 알고리즘 | Non-Target / L6+ |
| 3 | rules JSON / derivations 구현 | Runtime / Derivations |
| 4 | Runtime / Loader / Registry code | L6 / implementation |
| 5 | Validation engine rule set 변경 | B8 / Validation |
| 6 | `logic.meta` semantic key rename | Ch.7 / B3 hold |

### 2.3 Class Applicability

| Class | L5 적용 |
|-------|--------|
| **General Logic** | ruleset / declarative / selection / orchestration type 적용 |
| **Special Logic** | validation / geometry / symmetry / exception decision type 적용 |

L5는 Normal/Special 모두를 포함하되, **하나의 단일 logic shape로 강제 통일하지 않는다**.  
차이는 Taxonomy로 명시적으로 모델링한다.

---

## 3. Dependencies

| Dependency | Role | Note |
|------------|------|------|
| Fleet Non-Target | Formula / Value / Trajectory 의미 불변 | 모든 L5 규칙 상위 |
| WG-AI-001 | Impact / Risk / Safe Stop | Consume |
| L1 Identity | system folder / systemId | Consume · 재정의 금지 |
| L2 Schema | `logic.json` 존재 / JSON shape 기초 | Consume |
| L3 Metadata | `logic.meta` 의미 | **Not Persisted** · key rename 금지 |
| L4 Anchor | anchor-based track / validation dependency | Consume only |
| Runtime Binding | `SystemContract.logic` 공급 경로 | 구현 변경 지시 금지 |

---

## 4. Canonical Definition

### 4.1 Logic Layer 역할

Logic Layer는 **계산 결과를 담는 파일이 아니라**, 다음을 서술하는 계약 계층이다.

- 어떤 입력이 필요한가
- track / mode / decision을 어떻게 고르는가
- calculation을 허용하는가 / 위임하는가
- validation / ambiguity / symmetry를 어떻게 선언하는가
- rules / derivations / simulator와 어떻게 연결되는가

### 4.2 Canonical Logic Types

본 Chapter는 다음 6개 type을 **official canonical taxonomy**로 선언한다.

1. `ruleset_selector`
2. `declarative_logic_model`
3. `track_selection_only`
4. `track_and_input_orchestration`
5. `validation_mode_gate_special`
6. `geometric_decision_special`

### 4.3 Type Matrix

| Canonical Type | Structural meaning | Calculation in logic | Typical identity |
|----------------|--------------------|----------------------|------------------|
| `ruleset_selector` | `track_selection` 중심의 legacy selector + minimal policy | No direct calc | legacy general |
| `declarative_logic_model` | variables / formulae / symmetry / pipeline를 하나의 선언형 모델에 담음 | Descriptive only | extended declarative |
| `track_selection_only` | track inference/selection만 담당, calc는 rules_reference로 위임 | `calculation_allowed:false` | modern general |
| `track_and_input_orchestration` | track + input mode + validation hint를 orchestration | delegated | modern general |
| `validation_mode_gate_special` | input/mode/validation/symmetry gate만 담당 | delegated | special |
| `geometric_decision_special` | decision steps / geometric classification 중심 | delegated or bounded | special |

### 4.4 System Mapping (38)

#### `ruleset_selector`

- `0tip_plus`
- `1byhalf`
- `2_3_system`
- `5_half_system`
- `7_system`
- `35half`
- `99_to_1`
- `3tip_plus`
- `ball_system`
- `backside_umbrella`
- `clay_shooting`
- `double_rail`
- `plus2_system`
- `plus_system`
- `rodriguez`

#### `declarative_logic_model`

- `sunrise_sunset`

#### `track_selection_only`

- `zigzag_system`
- `turkish_angle_system`
- `tokyo_system`
- `short_plate_system`
- `peruvian_system`
- `n_across_short`
- `n_across`
- `minus_5_system`
- `long_wedge`
- `long_plate_system`
- `florida_system`
- `plus_5_system`

#### `track_and_input_orchestration`

- `spider_web`
- `short_wedge`
- `schaefer_system`
- `reverse_system`
- `reverse_end_system`

#### `validation_mode_gate_special`

- `accordion`
- `spread30`
- `split`

#### `geometric_decision_special`

- `3and4_system`
- `3tip_across`

### 4.5 Required / Optional / Legacy Keys

#### A. `ruleset_selector`

**Required**

- `track_selection`
- `required_marks`

**Common Optional**

- `optional_marks`
- `hp_policy`
- `input_validation`
- `notes`
- `meta`
- `space_assumptions`
- `aliases`
- `direction_policy`
- `branch_rules`

**Legacy signals**

- top-level `role` 없음 또는 `meta.role = system_logic`
- `track_policy` / `input_mode` wrapper 부재

#### B. `declarative_logic_model`

**Required**

- `meta`
- `system`
- `variables`
- `formulae`
- `track_selection`
- `interpolation`
- `io`
- `pipeline`

**Optional**

- `symmetry`
- `render`
- `safety`

**Legacy / unique**

- generalized wrapper보다 확장 declarative shape에 가까움

#### C. `track_selection_only`

**Required**

- `system_id`
- `role = track_selection_only`
- `track_selection` or `track_policy`
- `calculation_policy`
- `meta`

**Common Optional**

- `input_policy`
- `required_marks`
- `inference_rules`
- `validation_hints`
- `notes`
- `system_name`

#### D. `track_and_input_orchestration`

**Required**

- `system_id`
- `role = track_and_input_logic_only`
- `track_policy`
- `input_mode`
- `calculation_policy`
- `meta`

**Common Optional**

- `track_selection`
- `validation_hints`
- `constraints`
- domain-specific gate (`spin_policy`, `two_cushion_requirement` 등)

#### E. `validation_mode_gate_special`

**Required**

- `system_id`
- validation/mode wrapper (`input_mode`, `constraints`, `applicability` 중 핵심)
- `calculation_policy`
- `meta`

**Optional**

- `symmetry`
- `validation_hints`
- `required_inputs`
- `track_selection` (if `strategy:none`, special gate only)

#### F. `geometric_decision_special`

**Required**

- `system_id`
- `logic_type`
- `inputs_required`
- `decision_steps`
- `meta`

**Optional**

- `outputs`
- `safety`
- `rail_definitions`

---

## 5. Source & Precedence

| Priority | Source | Use |
|----------|--------|-----|
| 1 | **본 Chapter (Ch.9 Ratified)** | B5 Logic Apply / Freeze 근거 |
| 2 | Fleet Front Matter Non-Target | 의미 불변 상위 규칙 |
| 3 | WG-AI-001 | Safe Stop / Impact |
| 4 | B5-0 Logic Taxonomy 조사 결과 | Ch.9 입력 SSOT |
| 5 | Runtime 관찰 (`systemLoader`, `SystemContract.logic`, validation engine) | Binding cite only |

충돌 시: **persisted Ch.9**이 Fleet Logic Apply 권위를 갖는다. 단, Runtime code를 본 Chapter가 직접 수정 지시하지는 않는다.

---

## 6. Rules (SHALL)

| ID | Rule |
|----|------|
| **L5-R-01** | 모든 `logic.json`은 §4.2의 6개 canonical type 중 하나로 분류 가능해야 한다. |
| **L5-R-02** | Logic Layer는 계산 자체가 아니라 **calculation contract / decision / delegation** 을 서술한다. |
| **L5-R-03** | Modern 구조는 `calculation_policy`를 통해 계산 위임 여부를 명시해야 한다. |
| **L5-R-04** | Special Logic는 General Logic와 분리된 canonical type으로 유지한다. |
| **L5-R-05** | Legacy → Modern migration은 **structure-only** 여야 하며, 의미 불변이 증명되어야 한다. |
| **L5-R-06** | `rules_reference`는 calculation / derivation 연결 의미를 보존해야 한다. |
| **L5-R-07** | Track / input / branch / decision / validation policy의 실행 의미는 L5 Apply 중 재정의하지 않는다. |

### 6.1 Legacy vs Modern 비교 규칙

**공통점**

- 대부분 계산을 직접 수행하지 않는다.
- track / input / validation / delegation을 선언적으로 서술한다.
- Runtime이 읽는 계약 payload의 일부이다.

**차이점**

| Axis | Legacy | Modern |
|------|--------|--------|
| 중심 구조 | `track_selection` + marks | `role` + `track_policy` / `input_mode` |
| self-description | 약함 | 강함 |
| validation | ad hoc | explicit wrapper |
| calc delegation | notes/암묵 | `calculation_policy` 명시 |
| symmetry/mode | 흩어짐 | wrapper 기반 |

---

## 7. Prohibited Changes

| ID | Prohibited |
|----|------------|
| **L5-P-01** | Formula 의미 변경 |
| **L5-P-02** | System Value 의미 변경 |
| **L5-P-03** | Trajectory 의미 변경 |
| **L5-P-04** | Track 의미 변경 |
| **L5-P-05** | Input 의미 변경 |
| **L5-P-06** | Branch 의미 변경 |
| **L5-P-07** | Decision 의미 변경 |
| **L5-P-08** | Calculation Policy 의미 변경 |
| **L5-P-09** | Runtime / Loader / Registry 의미 또는 코드 변경 |
| **L5-P-10** | `logic.meta` key rename (Ch.7 Ratify 전 금지) |
| **L5-P-11** | `rules_reference` 경로/역할 의미 변경 |
| **L5-P-12** | Special Logic를 General Logic shape로 강제 통일하면서 의미 손실 유발 |

---

## 8. Validation Rules

| ID | Check | Pass condition |
|----|-------|----------------|
| **L5-V-01** | Taxonomy | 각 시스템이 canonical type 1개로 분류됨 |
| **L5-V-02** | Mapping | 38개 system mapping complete |
| **L5-V-03** | Required keys | 각 type의 required key 정의가 존재 |
| **L5-V-04** | Optional keys | 각 type의 optional / legacy key 정의가 존재 |
| **L5-V-05** | Runtime binding | `systemLoader` / `SystemContract.logic` / validation engine / `rules_reference` binding 명시 |
| **L5-V-06** | Semantic guard | 금지 의미 변경 목록 명시 |
| **L5-V-07** | Migration rule | Legacy → Modern structure-only rule 명시 |
| **L5-V-08** | Special split | Special Logic 분리 원칙 명시 |

---

## 9. Runtime Binding

현재 구현은 `logic.json` 전체를 eager load하여 `SystemContract.logic`에 그대로 주입한다.

```text
data/systems/*/logic.json
  → runtime/loader/systemLoader.ts (logicModules eager glob)
  → LOGIC_BY_SYSTEM
  → assembleSystemContract()
  → SystemContract.logic
  → runtime consumers / validation engine
```

### Runtime cite points

- `systemLoader.ts` — `../../data/systems/*/logic.json` eager load
- `SystemContract.logic` — `Record<string, unknown> | null`
- `validation/engine/full/SystemPackageRuleJudge.ts` — package presence / syntax / structure 소비
- `rules_reference` — derivations / rules layer와의 연결 표시자

**Binding rule:** 본 Chapter는 위 경로를 **cite only** 한다. Runtime 변경 지시를 포함하지 않는다.

---

## 10. Migration Rule

### 10.1 Principle

Legacy → Modern migration은 **구조 정규화만 허용**한다.

- wrapper 추가/재배치
- role 명시
- `track_policy` / `input_mode` / `calculation_policy`로의 무손실 이관

는 허용 가능하다.

### 10.2 Forbidden migration

다음은 금지한다.

- formula 변경
- track rule 의미 변경
- branch / decision rule 변경
- required input 의미 변경
- calculation policy 변경
- `rules_reference` 의미 변경
- symmetry 의미 변경

### 10.3 Special handling

- `validation_mode_gate_special`
- `geometric_decision_special`

는 일반 logic과 **별도 migration lane** 을 가진다.  
General Logic canonical shape로 억지 통합하지 않는다.

---

## 11. Acceptance Criteria

| ID | Criterion |
|----|-----------|
| **L5-AC-01** | Canonical Logic Type 6개 정의 완료 |
| **L5-AC-02** | 38개 System Mapping 완료 |
| **L5-AC-03** | Type별 Required / Optional / Legacy key 정의 완료 |
| **L5-AC-04** | Logic Layer 역할(계산이 아닌 contract layer) 명시 |
| **L5-AC-05** | Runtime Binding (`systemLoader` / `SystemContract.logic` / validation engine / `rules_reference`) 명시 |
| **L5-AC-06** | Legacy vs Modern 비교 명시 |
| **L5-AC-07** | Special Logic 분리 원칙 명시 |
| **L5-AC-08** | Semantic Guard 명시 |
| **L5-AC-09** | Structure-only Migration Rule 명시 |

---

## 12. Change Log

| Date | Change |
|------|--------|
| 2026-07-22 | Ch.9 L5 Logic Contract on-disk Ratify · B5-0 Logic Taxonomy를 canonical definition으로 반영 · Canonical Type 6개 · 38 system mapping · Runtime Binding / Semantic Guard / Migration Rule / Acceptance Criteria 명시 |

---

*End of FLEET_CONTRACT_BOOK_Ch09_L5_Logic_Contract.md — Status: Ratified*
