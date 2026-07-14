# System_Inventory.md

```
Document  : System_Inventory.md
Version   : v1.0 (STEP4 Final)
Status    : Final · Inventory SSOT · Reference Manual
Date      : 2026-07-14
Basis     : STEP4-1 Discovery · STEP4-2 Inventory/Observation SSOT · STEP4-3 Metadata · STEP4-4 Registration · STEP4 Inventory Assets · STEP4 Final
SPS       : System Platform Standard (SPS) v1.0
Rule      : Read-only Fact Collection · No Runtime / JSON / Schema / Standardization changes
Baseline  : Batch6 Final Freeze maintained
```

---

## 1. Overview

본 문서는 SPS Standardization workflow의 **STEP4 Inventory SSOT**이다.

`frontend/src/data/systems/` 하위 **38개 System Package**에 대해  
**Package Fact · Observation · Metadata Shape Fact · Registration Fact** 를 기록하고,  
§19에서 STEP5~7 소비를 위한 **Reference Entry Point** 를 제공한다.

### 1.1 STEP4 역할

```text
Fact Collection
        ↓
Observation
        ↓
Reference ID 부여 (SYS-001 … SYS-038)
        ↓
Inventory SSOT
        ↓
Metadata Inventory
        ↓
Registration Inventory
        ↓
STEP4 Inventory Assets (Reference Catalog)
```

STEP4 Inventory는 **영구 관찰·참조 문서**이다.

포함하지 않는다:

- Analysis
- Finding
- Violation
- Evaluation
- Audit
- Standardization Decision

Analysis / Finding / Violation / Audit는 **STEP5부터** 시작한다.

### 1.2 SSOT 이중 구조

| Object | 역할 |
|--------|------|
| **Inventory ID** (`SYS-NNN`) | System의 SSOT (Permanent Identifier) |
| **Observation Code** (`OBS-<TYPE>-NNN`) | 관찰(Fact)의 SSOT (Permanent Identifier · No Reuse) |

Inventory ID와 Observation Code는 **동일한 SSOT 철학**을 따른다.

### 1.3 후속 STEP

| STEP | 역할 |
|------|------|
| **STEP5** | Architecture Audit · Finding · Violation |
| **STEP6** | Schema Validation · Schema Result |
| **STEP7** | Standardization |

STEP5~7 입력 Asset 위치는 **§19 STEP4 Inventory Assets** 를 Entry Point로 사용한다.

### 1.4 Document status

```text
Document status: Final (STEP4 Final v1.0)
Frozen Assets: declared (§20)
```

---

## 2. Inventory Rule

### 2.1 Inventory ID

| 규칙 | 내용 |
|------|------|
| 형식 | `SYS-001` … `SYS-038` |
| 부여 기준 | STEP4-1 Discovery 목록 순서 (directory) |
| 용도 | Audit / Validation / Standardization 공통 Reference ID |
| 성격 | Permanent Identifier · Inventory SSOT |

### 2.2 Record Fields

| Field | 설명 |
|-------|------|
| Inventory ID | `SYS-NNN` |
| systemId | `system_meta.json`의 `system_id` (observed) |
| directory | 실제 package directory |
| canonical | Canonical 여부 (observed) |
| profile | `profile.json` 존재 여부 |
| anchors | `anchors.json` 존재 여부 |
| logic | `logic.json` 존재 여부 |
| system_meta | `system_meta.json` 존재 여부 |
| observations | Observation Code · 평가·제안 없음 |

### 2.3 Canonical

| 값 | 조건 |
|----|------|
| **YES** | `directory === 5_half_system` |
| **NO** | 그 외 |

### 2.4 Package presence (Fact)

| 표기 | 의미 |
|------|------|
| **present** | 해당 파일이 directory에 **존재**함이 관찰됨 |
| **absent** | 해당 파일이 directory에 **부재**함이 관찰됨 |

존재 여부는 **디스크상 파일 존재**에 대한 Fact이다.

---

## 3. Observation SSOT

### 3.1 Observation SSOT 원칙

Observation Code는 **영구 식별자(Permanent Identifier)** 이다.

| 원칙 | 내용 |
|------|------|
| Permanent Identifier | Observation Code는 SPS 전역에서 동일 대상을 가리킨다 |
| Meaning Stability | Observation Code는 **동일 의미**를 영구히 유지한다 |
| No Reuse | Observation Code는 **재사용하지 않는다** |
| No Semantic Reassignment | 삭제·폐기되더라도 **다른 의미로 다시 사용하지 않는다** |

### 3.2 Inventory ↔ Observation Reference Model

```text
System
   ↓
Inventory ID          ← System의 SSOT
   ↓
Observation           ← 관찰(Fact)의 SSOT
   ↓
(입력)
   ↓
STEP5  Finding
   ↓
STEP5  Violation
   ↓
STEP6  Schema Result
   ↓
STEP7  Standardization
```

### 3.3 Observation Reference Rule

| 규칙 | 내용 |
|------|------|
| Required link | Observation은 **반드시 하나 이상의 Inventory ID**와 연결된다 |
| No orphan Observation | Observation은 Inventory 없이 존재하지 않는다 |
| Optional Observation | Inventory는 Observation이 **없어도** 존재할 수 있다 |

### 3.4 Observation Lifecycle

```text
Observation          ← 최초 입력 (Source of Truth)
        ↓
Finding              ← STEP5
        ↓
Violation            ← STEP5
        ↓
Standardization      ← STEP7
```

### 3.5 Observation Version Rule

Observation Code는 **문서 Version과 무관하게 유지**한다.

의미를 바꾸면 **새 Code**를 부여하고, 기존 Code는 폐기(retired)하되 재사용하지 않는다.

### 3.6 Observation Rule (Fact only)

Observation은 **관찰(Fact)** 을 표현한다.

포함하지 않는다: Evaluation · Root Cause · Violation · Recommendation · Standardization Decision.

### 3.7 Observation Type

| Type | Code prefix | 의미 |
|------|-------------|------|
| PACKAGE | `OBS-PKG-` | Package 구조 |
| IDENTITY | `OBS-ID-` | systemId / directory |
| CANONICAL | `OBS-CAN-` | Canonical 관련 |
| METADATA | `OBS-META-` | Metadata Shape |
| NAMING | `OBS-NAME-` | Naming / casing |
| RUNTIME | `OBS-RT-` | Runtime 관찰 |
| USAGE | `OBS-USG-` | Usage 조사 |
| BEHAVIOR | `OBS-BHV-` | Behavior 후보 |

### 3.8 Observation ID Rule

형식: `OBS-<TYPE>-NNN`  
TYPE: `PKG | ID | CAN | META | NAME | RT | USG | BHV`  
번호는 Type별 독립 증가 · **절대 재사용하지 않는다**.

### 3.9 Observation terminology

| 사용 | 미사용 |
|------|--------|
| absent · present · available · observed · difference | missing · incorrect · invalid · violation · problem |

### 3.10 Observation Catalog — base (Package / Identity / Naming / Canonical / Runtime retained)

| Code | Type | Observation (Fact) |
|------|------|--------------------|
| OBS-PKG-001 | PACKAGE | anchors.json absent |
| OBS-ID-001 | IDENTITY | directory ≠ systemId (difference observed) |
| OBS-CAN-001 | CANONICAL | Canonical System |
| OBS-META-001 | METADATA | profile.system differs from directory (difference observed) |
| OBS-NAME-001 | NAMING | directory casing observed (`Plus_5_system`) |
| OBS-RT-001 | RUNTIME | Loader eager anchors exclusion observed; anchors.json present on disk |

Base Observation Index:

| Code | Type | Inventory IDs |
|------|------|---------------|
| OBS-PKG-001 | PACKAGE | SYS-006, SYS-012, SYS-033, SYS-034 |
| OBS-ID-001 | IDENTITY | SYS-001, SYS-010 |
| OBS-CAN-001 | CANONICAL | SYS-008 |
| OBS-META-001 | METADATA | SYS-001 |
| OBS-NAME-001 | NAMING | SYS-011 |
| OBS-RT-001 | RUNTIME | SYS-001, SYS-016 |

---

## 4. System Inventory Table

| Inventory ID | systemId | directory | canonical | profile | anchors | logic | system_meta | observations |
|--------------|----------|-----------|-----------|---------|---------|-------|-------------|--------------|
| SYS-001 | `0tip plus` | `0tip_plus` | NO | present | present | present | present | OBS-ID-001; OBS-META-001; OBS-RT-001 |
| SYS-002 | `1byhalf` | `1byhalf` | NO | present | present | present | present | — |
| SYS-003 | `2_3_system` | `2_3_system` | NO | present | present | present | present | — |
| SYS-004 | `35half` | `35half` | NO | present | present | present | present | — |
| SYS-005 | `3and4_system` | `3and4_system` | NO | present | present | present | present | — |
| SYS-006 | `3tip_across` | `3tip_across` | NO | present | absent | present | present | OBS-PKG-001 |
| SYS-007 | `3tip_plus` | `3tip_plus` | NO | present | present | present | present | — |
| SYS-008 | `5_half_system` | `5_half_system` | **YES** | present | present | present | present | OBS-CAN-001 |
| SYS-009 | `7_system` | `7_system` | NO | present | present | present | present | — |
| SYS-010 | `99 to 1` | `99_to_1` | NO | present | present | present | present | OBS-ID-001 |
| SYS-011 | `Plus_5_system` | `Plus_5_system` | NO | present | present | present | present | OBS-NAME-001 |
| SYS-012 | `accordion` | `accordion` | NO | present | absent | present | present | OBS-PKG-001 |
| SYS-013 | `backside_umbrella` | `backside_umbrella` | NO | present | present | present | present | — |
| SYS-014 | `ball_system` | `ball_system` | NO | present | present | present | present | — |
| SYS-015 | `clay_shooting` | `clay_shooting` | NO | present | present | present | present | — |
| SYS-016 | `double_rail` | `double_rail` | NO | present | present | present | present | OBS-RT-001 |
| SYS-017 | `florida_system` | `florida_system` | NO | present | present | present | present | — |
| SYS-018 | `long_plate_system` | `long_plate_system` | NO | present | present | present | present | — |
| SYS-019 | `long_wedge` | `long_wedge` | NO | present | present | present | present | — |
| SYS-020 | `minus_5_system` | `minus_5_system` | NO | present | present | present | present | — |
| SYS-021 | `n_across` | `n_across` | NO | present | present | present | present | — |
| SYS-022 | `n_across_short` | `n_across_short` | NO | present | present | present | present | — |
| SYS-023 | `peruvian_system` | `peruvian_system` | NO | present | present | present | present | — |
| SYS-024 | `plus2_system` | `plus2_system` | NO | present | present | present | present | — |
| SYS-025 | `plus_system` | `plus_system` | NO | present | present | present | present | — |
| SYS-026 | `reverse_end_system` | `reverse_end_system` | NO | present | present | present | present | — |
| SYS-027 | `reverse_system` | `reverse_system` | NO | present | present | present | present | — |
| SYS-028 | `rodriguez` | `rodriguez` | NO | present | present | present | present | — |
| SYS-029 | `schaefer_system` | `schaefer_system` | NO | present | present | present | present | — |
| SYS-030 | `short_plate_system` | `short_plate_system` | NO | present | present | present | present | — |
| SYS-031 | `short_wedge` | `short_wedge` | NO | present | present | present | present | — |
| SYS-032 | `spider_web` | `spider_web` | NO | present | present | present | present | — |
| SYS-033 | `split` | `split` | NO | present | absent | present | present | OBS-PKG-001 |
| SYS-034 | `spread30` | `spread30` | NO | present | absent | present | present | OBS-PKG-001 |
| SYS-035 | `sunrise_sunset` | `sunrise_sunset` | NO | present | present | present | present | — |
| SYS-036 | `tokyo_system` | `tokyo_system` | NO | present | present | present | present | — |
| SYS-037 | `turkish_angle_system` | `turkish_angle_system` | NO | present | present | present | present | — |
| SYS-038 | `zigzag_system` | `zigzag_system` | NO | present | present | present | present | — |

> Metadata / Registration Observation 연결은 §8 · §14 Index에 기록한다.

---

## 5. Discovery Summary (Package Facts)

| Fact | Value |
|------|-------|
| Total Systems | 38 |
| Inventory IDs | SYS-001 … SYS-038 |
| Canonical Count (YES) | 1 (`SYS-008` / `5_half_system`) |
| profile present | 38 |
| anchors present | 34 · absent 4 |
| logic present | 38 |
| system_meta present | 38 |

Non-System paths (observed, not inventoried): `schema/` · `index.ts` · `anchorsRegistry.ts`

---

## 6. Metadata Inventory (STEP4-3)

### 6.1 Scope

| Item | Value |
|------|-------|
| Systems surveyed | 38 |
| Sources | `profile.json` · `system_meta.json` |
| Mode | Fact only · shape · key path · present/absent |

Literal keys `displayName`, `systemId` (camelCase), `schemaVersion`, `summary`, `capability`, `aliases` 는 **0/38** 에서 absent로 관찰됨.

### 6.2 Semantic ↔ Key Mapping (observed shapes)

#### Identity — systemId

| Source | Key Path | Value Shape | Present count |
|--------|----------|-------------|---------------|
| system_meta.json | `system_id` | string | 38 |
| profile.json | `system_id` | string | 9 |

#### Identity — displayName

| Source | Key Path | Value Shape | Present count |
|--------|----------|-------------|---------------|
| profile.json | `system` | string | 31 |
| profile.json | `system_name` | string | 7 |
| profile.json | `display.name_key` | string | 11 |
| profile.json | `display.short_name_key` | string | 11 |
| profile.json | `display.ko.title` | string | 6 |
| profile.json | `display.ko.short_title` | string | 6 |
| profile.json | `display.en.title` | string | 5 |
| profile.json | `display.en.short_title` | string | 5 |
| — | literal `displayName` | — | 0 (absent) |

#### Identity — aliases

| Source | Key Path | Value Shape | Present count |
|--------|----------|-------------|---------------|
| profile.json | `alias` | array | 6 |
| — | literal `aliases` | — | 0 (absent) |

#### Classification — category

| Source | Key Path | Value Shape | Present count |
|--------|----------|-------------|---------------|
| profile.json | `category` | string | 9 |
| profile.json | `category` | object | 6 |
| profile.json | `display.category` | string | 11 |
| profile.json | `ui.category` | string | 8 |
| profile.json | category locus | — | 12 systems: all category keys absent |

#### Classification — family / type

| Source | Key Path | Value Shape | Present count |
|--------|----------|-------------|---------------|
| system_meta.json | `family` | string | 38 |
| profile.json | `category.family` | string | 6 |
| profile.json | `category.type` | string | 6 |
| profile.json | `system_characteristics.type` | string | 9 |

#### Version

| Source | Key Path | Value Shape | Present count |
|--------|----------|-------------|---------------|
| profile.json | `meta.version` | string | 23 |
| profile.json | `meta.spec_version` | string | 13 |
| profile.json | `meta.rule_version` | string | 2 |
| — | literal `version` key | — | 15 systems: version key absent |
| — | `schemaVersion` | — | 0 (absent all 38) |

#### Description / notes

| Source | Key Path | Value Shape | Present count |
|--------|----------|-------------|---------------|
| profile.json | `description` | object (`ko`/`en`) | 9 |
| profile.json | `display.description_key` | string | 11 |
| profile.json | `display.ko.description` | string | 6 |
| profile.json | `display.en.description` | string | 5 |
| — | `summary` | — | 0 (absent all 38) |
| system_meta.json | `notes` | string | 38 |
| profile.json | `notes` | array | 6 |
| profile.json | `notes` | object | 6 |
| profile.json | `meta.notes` | array | 15 |

#### Runtime Metadata

| Source | Key Path | Value Shape | Present count |
|--------|----------|-------------|---------------|
| system_meta.json | `canonical_track` | string | 38 |
| profile.json | `meta.canonical_track` | string | 1 |
| profile.json | `formula_concept.canonical` | string | 2 |
| profile.json | `meta.role` | string | 10 |
| — | `capability` | — | 0 (absent all 38) |
| profile.json | `display.tags` | array | 11 |

### 6.3 system_meta.json observed key set (uniform · all 38)

```text
system_id · family · required_cushions · canonical_track ·
entry_rail · exit_rail · allowed_tracks · difficulty · notes
```

---

## 7. Metadata Shape Matrix

| Semantic | Shape Count | Current Shapes (Source · Key Path · Value Shape) |
|----------|-------------|--------------------------------------------------|
| systemId | 2 | system_meta.`system_id` string · profile.`system_id` string |
| displayName | 8 | profile.`system` · `system_name` · `display.name_key` · `display.short_name_key` · `display.ko.title` · `display.ko.short_title` · `display.en.title` · `display.en.short_title` · *(literal displayName absent)* |
| aliases | 1 | profile.`alias` array · *(literal aliases absent)* |
| category | 4 | profile.`category` string · profile.`category` object · profile.`display.category` string · profile.`ui.category` string · *(absent in 12)* |
| family | 2 | system_meta.`family` string · profile.`category.family` string |
| type | 2 | profile.`category.type` string · profile.`system_characteristics.type` string |
| version | 3 | profile.`meta.version` · `meta.spec_version` · `meta.rule_version` · *(version key absent in 15)* |
| schemaVersion | 0 | *(absent all 38)* |
| description | 5 | profile.`description` object · `display.description_key` · `display.ko.description` · `display.en.description` · `formula.description` |
| summary | 0 | *(absent all 38)* |
| notes | 4 | system_meta.`notes` string · profile.`notes` array · profile.`notes` object · profile.`meta.notes` array |
| canonical | 3 | system_meta.`canonical_track` · profile.`meta.canonical_track` · `formula_concept.canonical` |
| profile (marker) | 1 | profile.`meta.role` string |
| capability | 0 | *(absent all 38)* |
| tags | 1 | profile.`display.tags` array |

---

## 8. Metadata Observation Catalog

OBS-META-001 의미는 §3.10에서 고정. STEP4-3 Metadata Shape Observation은 **OBS-META-002부터**.

| Code | Type | Observation (Fact) |
|------|------|--------------------|
| OBS-META-002 | METADATA | displayName observed at profile.system (string) |
| OBS-META-003 | METADATA | displayName observed at profile.system_name (string) |
| OBS-META-004 | METADATA | displayName observed at profile.display.name_key (string) |
| OBS-META-005 | METADATA | displayName observed at profile.display.ko.title (string) |
| OBS-META-006 | METADATA | category observed as profile.category string |
| OBS-META-007 | METADATA | category observed as profile.category object |
| OBS-META-008 | METADATA | category observed at profile.display.category (string) |
| OBS-META-009 | METADATA | category key absent in profile |
| OBS-META-010 | METADATA | version key absent |
| OBS-META-011 | METADATA | version observed at profile.meta.version (string) |
| OBS-META-012 | METADATA | version-like key observed at profile.meta.spec_version (string) |
| OBS-META-013 | METADATA | version-like key observed at profile.meta.rule_version (string) |
| OBS-META-014 | METADATA | aliases observed at profile.alias (array) |
| OBS-META-015 | METADATA | schemaVersion absent |
| OBS-META-016 | METADATA | summary absent |
| OBS-META-017 | METADATA | capability absent |
| OBS-META-018 | METADATA | tags observed at profile.display.tags (array) |
| OBS-META-019 | METADATA | family observed at system_meta.family (string) |
| OBS-META-020 | METADATA | type observed at profile.category.type (string) |
| OBS-META-021 | METADATA | type observed at profile.system_characteristics.type (string) |
| OBS-META-022 | METADATA | description observed as profile.description object |
| OBS-META-023 | METADATA | notes observed as profile.notes array |
| OBS-META-024 | METADATA | notes observed as profile.notes object |
| OBS-META-025 | METADATA | notes observed at profile.meta.notes (array) |
| OBS-META-026 | METADATA | notes observed at system_meta.notes (string) |
| OBS-META-027 | METADATA | canonical observed at system_meta.canonical_track (string) |
| OBS-META-028 | METADATA | systemId observed at profile.system_id (string) |
| OBS-META-029 | METADATA | literal displayName key absent |
| OBS-META-030 | METADATA | category observed at profile.ui.category (string) |

### Observation Index (Metadata)

| Code | Inventory IDs |
|------|---------------|
| OBS-META-001 | SYS-001 |
| OBS-META-002 | SYS-001–003, SYS-005–008, SYS-010–011, SYS-014, SYS-017–025, SYS-027–038 *(31)* |
| OBS-META-003 | SYS-004, SYS-009, SYS-012, SYS-013, SYS-015, SYS-016, SYS-026 |
| OBS-META-004 | SYS-001, SYS-002, SYS-005–008, SYS-010, SYS-014, SYS-024, SYS-025, SYS-028 |
| OBS-META-005 | SYS-004, SYS-009, SYS-012, SYS-013, SYS-015, SYS-016 |
| OBS-META-006 | SYS-026, SYS-027, SYS-029, SYS-031–034, SYS-037–038 |
| OBS-META-007 | SYS-004, SYS-009, SYS-012, SYS-013, SYS-015, SYS-016 |
| OBS-META-008 | SYS-001, SYS-002, SYS-005–008, SYS-010, SYS-014, SYS-024, SYS-025, SYS-028 |
| OBS-META-009 | SYS-003, SYS-011, SYS-017–023, SYS-030, SYS-035–036 |
| OBS-META-010 | SYS-004, SYS-009, SYS-012–013, SYS-015–016, SYS-026–027, SYS-029, SYS-031–034, SYS-037–038 |
| OBS-META-011 | SYS-001–003, SYS-005–008, SYS-010–011, SYS-014, SYS-017–025, SYS-028, SYS-030, SYS-035–036 *(23)* |
| OBS-META-012 | SYS-012–013, SYS-015–016, SYS-026–027, SYS-029, SYS-031–034, SYS-037–038 |
| OBS-META-013 | SYS-004, SYS-009 |
| OBS-META-014 | SYS-004, SYS-009, SYS-012–013, SYS-015–016 |
| OBS-META-015 | SYS-001 … SYS-038 |
| OBS-META-016 | SYS-001 … SYS-038 |
| OBS-META-017 | SYS-001 … SYS-038 |
| OBS-META-018 | SYS-001–002, SYS-005–008, SYS-010, SYS-014, SYS-024–025, SYS-028 |
| OBS-META-019 | SYS-001 … SYS-038 |
| OBS-META-020 | SYS-004, SYS-009, SYS-012–013, SYS-015–016 |
| OBS-META-021 | SYS-026–027, SYS-029, SYS-031–034, SYS-037–038 |
| OBS-META-022 | SYS-026–027, SYS-029, SYS-031–034, SYS-037–038 |
| OBS-META-023 | SYS-027, SYS-029, SYS-031–034 |
| OBS-META-024 | SYS-004, SYS-009, SYS-012–013, SYS-015–016 |
| OBS-META-025 | SYS-001–003, SYS-005–008, SYS-010–011, SYS-014, SYS-021–022, SYS-024–025, SYS-028 |
| OBS-META-026 | SYS-001 … SYS-038 |
| OBS-META-027 | SYS-001 … SYS-038 |
| OBS-META-028 | SYS-004, SYS-009, SYS-012–013, SYS-015–016, SYS-026, SYS-037–038 |
| OBS-META-029 | SYS-001 … SYS-038 |
| OBS-META-030 | SYS-027, SYS-029, SYS-031–034, SYS-037–038 |

---

## 9. Metadata Summary

| Fact | Value |
|------|-------|
| Systems surveyed | 38 |
| system_meta shape | uniform key set (38/38) |
| Distinct displayName shapes | 8 (+ literal key absent) |
| Distinct category shapes | 4 (+ absent in 12) |
| Distinct version-related shapes | 3 (+ version key absent in 15) |
| schemaVersion / summary / capability present | 0 |
| METADATA Observation codes | OBS-META-001 … OBS-META-030 |

---

## 12. Registration Inventory (STEP4-4)

### 12.1 Scope

| Item | Value |
|------|-------|
| Systems | SYS-001 … SYS-038 |
| Sources inspected | `runtime/loader/systemPackageStore.ts` · `systemLoader.ts` · `systemRegistry.ts` · `runtime/index.ts` · `data/systems/index.ts` |
| Mode | Fact only |

### 12.2 Observed Registration Path (Fact)

```text
data/systems/<directory>/profile.json
        ↓  import.meta.glob (eager) — systemPackageStore
PROFILE_BY_SYSTEM[directory]
        ↓  listDiscoverableSystemIds
Loader.assembleSystemContract(directory)
        ↓
Registry.bootstrapRegistry() — eager register
        ↓
Public API: getSystemContract · listRegisteredSystemIds · isRegistered
```

### 12.3 Registration Type (observed)

| Observed form | Fact |
|---------------|------|
| dynamic discovery | `import.meta.glob` eager on `*/profile.json` |
| eager Registry bootstrap | `bootstrapRegistry()` over discoverable ids |
| gate | profile.json presence |
| static hand-written ID list | not observed |
| `data/systems/index.ts` | `export {}` — not a registration source |

### 12.4 Registration Key (Fact)

Registration key = **package directory name**.  
Inventory `systemId` = `system_meta.system_id` (may differ).  
Registry alias normalization observed: empty/null → `5_half_system`; `5_HALF` → `5_half_system`.

---

## 13. Registration Matrix

| Inventory ID | directory | Registration Source | Registration Method | Runtime Visible | Registry Visible | Public API | Observation |
|--------------|-----------|---------------------|---------------------|-----------------|------------------|------------|-------------|
| SYS-001 | `0tip_plus` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006; OBS-RT-007; OBS-RT-001 |
| SYS-002 | `1byhalf` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-003 | `2_3_system` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-004 | `35half` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-005 | `3and4_system` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-006 | `3tip_across` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-007 | `3tip_plus` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-008 | `5_half_system` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-009 | `7_system` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-010 | `99_to_1` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006; OBS-RT-007 |
| SYS-011 | `Plus_5_system` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-012 | `accordion` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-013 | `backside_umbrella` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-014 | `ball_system` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-015 | `clay_shooting` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-016 | `double_rail` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006; OBS-RT-001 |
| SYS-017 | `florida_system` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-018 | `long_plate_system` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-019 | `long_wedge` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-020 | `minus_5_system` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-021 | `n_across` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-022 | `n_across_short` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-023 | `peruvian_system` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-024 | `plus2_system` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-025 | `plus_system` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-026 | `reverse_end_system` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-027 | `reverse_system` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-028 | `rodriguez` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-029 | `schaefer_system` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-030 | `short_plate_system` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-031 | `short_wedge` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-032 | `spider_web` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-033 | `split` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-034 | `spread30` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-035 | `sunrise_sunset` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-036 | `tokyo_system` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-037 | `turkish_angle_system` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |
| SYS-038 | `zigzag_system` | PackageStore → Loader → Registry | dynamic discovery + eager bootstrap | yes | yes | yes | OBS-RT-002; OBS-RT-003; OBS-RT-004; OBS-RT-006 |

OBS-RT-005 (registration source absent): Inventory 38개 중 **해당 System 없음** → Code 미부여.

---

## 14. Registration Observation Catalog

| Code | Type | Observation (Fact) |
|------|------|--------------------|
| OBS-RT-001 | RUNTIME | Loader eager anchors exclusion observed; anchors.json present on disk *(retained)* |
| OBS-RT-002 | RUNTIME | registered via systemPackageStore (profile.json eager glob) |
| OBS-RT-003 | RUNTIME | visible through Registry (eager bootstrap / contractCache) |
| OBS-RT-004 | RUNTIME | available via Public Runtime API (`getSystemContract` · `listRegisteredSystemIds` · `isRegistered`) |
| OBS-RT-006 | RUNTIME | registration key observed as package directory name |
| OBS-RT-007 | RUNTIME | Inventory systemId (system_meta.system_id) differs from registration key (directory) |

| Code | Inventory IDs |
|------|---------------|
| OBS-RT-001 | SYS-001, SYS-016 |
| OBS-RT-002 | SYS-001 … SYS-038 |
| OBS-RT-003 | SYS-001 … SYS-038 |
| OBS-RT-004 | SYS-001 … SYS-038 |
| OBS-RT-006 | SYS-001 … SYS-038 |
| OBS-RT-007 | SYS-001, SYS-010 |

---

## 15. Registration Fact Matrix

| Registration Pattern | Systems (Inventory ID) |
|----------------------|------------------------|
| systemPackageStore profile glob discovery | SYS-001 … SYS-038 |
| Loader assemble | SYS-001 … SYS-038 |
| Registry eager bootstrap / cache | SYS-001 … SYS-038 |
| Public API (`runtime/index.ts`) | SYS-001 … SYS-038 |
| Registration key = directory | SYS-001 … SYS-038 |
| systemId ≠ directory (difference) | SYS-001, SYS-010 |
| Anchors eager glob exclusion in package store | SYS-001, SYS-016 |
| Registration source absent | *(none among 38)* |
| Alternate registration via `data/systems/index.ts` | *(not observed)* |
| Static hand-written registration list | *(not observed)* |

---

## 16. Registration Summary

| Fact | Value |
|------|-------|
| Systems surveyed | 38 |
| Runtime / Registry / Public API Visible = yes | 38 |
| Registration Source chain | PackageStore → Loader → Registry → Public API |
| Registration Method | dynamic discovery (eager glob) + eager Registry bootstrap |
| Registration key | directory name |
| systemId ≠ registration key | 2 |
| RUNTIME Observation codes | OBS-RT-001 … OBS-RT-004, OBS-RT-006, OBS-RT-007 |

---

## 17. Next Step

```text
STEP5 — Architecture Audit
  (use §19 Downstream Checklist)

↓

STEP6 — Schema Validation

↓

STEP7 — Standardization
```

STEP4 범위에서는 Runtime / Registry / Loader / Contract / JSON / Schema를 변경하지 않는다.

---

## 18. Revision History

| Version | Status | 내용 |
|---------|--------|------|
| v0.1 | Draft | STEP4-2 Package Inventory · packageComplete · Remarks |
| v0.2 | Draft | Fact SSOT · Remarks → Observations |
| v0.3 | Draft | Observation Standard · Type · Code 규칙 |
| v0.4 | Draft | Observation SSOT · Reference Model · Lifecycle |
| v0.5 | Draft | STEP4-3 Metadata Inventory · Shape Matrix · OBS-META-002+ |
| v0.6 | Draft | STEP4-4 Registration Inventory · Matrix · OBS-RT-002+ |
| v0.7 | Draft | STEP4 Inventory Assets — Reference Entry Point (§19) |
| **v1.0** | **Final** | **STEP4 Final — Frozen Assets declared (§20)** |

### Planned Milestones (reference)

| Version | Milestone | 비고 |
|---------|-----------|------|
| v0.5 | Metadata Inventory | completed |
| v0.6 | Registration Inventory | completed |
| v0.7 | STEP4 Inventory Assets | completed |
| **v1.0** | **STEP4 Final** | **completed** |

---

## 19. STEP4 Inventory Assets

### 19.1 Role

본 Section은 STEP4에서 생성된 Inventory Asset의 **Reference Catalog**이다.

| 본 Section이 하는 일 | 본 Section이 하지 않는 일 |
|----------------------|---------------------------|
| Asset 목록 · Purpose · Section · Primary STEP · Consumed by 기록 | 신규 Fact / Observation / Matrix 생성 |
| STEP5+ Entry Point 역할 | Evaluation · Audit · Recommendation |
| 기존 Section 위치만 가리킴 | Fact · Observation · Matrix · Summary **본문 재복사** |

§19는 Inventory / Observation / Matrix 본문이 아니다.  
**단순 Reference Index**이다.

### 19.2 Production Rule

```text
All STEP4 Assets are produced by STEP4 unless noted.
```

Produced by 컬럼은 두지 않는다.

### 19.3 Asset Index

| Category | Asset | Purpose | Section | Primary STEP | Consumed by |
|----------|-------|---------|---------|--------------|-------------|
| Rule | Inventory Rule | Inventory SSOT Rule | §2 | All STEP | All STEP |
| Rule | Observation SSOT | Observation Permanent Identifier · Reference · Lifecycle Rules | §3 | All STEP | STEP5 · STEP6 · STEP7 |
| Catalog | Observation Catalog (base) | Package / Identity / Canonical / Naming / Runtime Observations | §3.10 | STEP5 | STEP5 · STEP7 |
| Record | System Inventory Table | 38 System Records | §4 | STEP5 | STEP5 |
| Summary | Discovery Summary | Package presence statistics | §5 | Reference | Reference |
| Catalog | Metadata Inventory | Semantic ↔ Key Mapping (Fact) | §6 | STEP5 | STEP5 · STEP7 |
| Matrix | Metadata Shape Matrix | Metadata Shape Survey | §7 | STEP7 | STEP6 · STEP7 |
| Catalog | Metadata Observation Catalog | Metadata Observation Reference (OBS-META-*) | §8 | STEP5 | STEP5 · STEP7 |
| Summary | Metadata Summary | Metadata survey statistics | §9 | Reference | Reference |
| Record | Registration Inventory | Registration path · type · key Facts | §12 | STEP5 | STEP5 |
| Matrix | Registration Matrix | Per-System Registration Facts | §13 | STEP5 | STEP5 |
| Catalog | Registration Observation Catalog | RUNTIME Observation Reference (OBS-RT-*) | §14 | STEP5 | STEP5 · STEP7 |
| Matrix | Registration Fact Matrix | Registration Pattern Summary | §15 | STEP5 | STEP5 |
| Summary | Registration Summary | Registration statistics | §16 | Reference | Reference |
| Index | STEP4 Inventory Assets | Reference Entry Point for STEP5~7 | §19 | Reference | STEP5 · STEP6 · STEP7 |

**Primary STEP** 값: `STEP5` | `STEP6` | `STEP7` | `Reference` | `All STEP` (행당 하나).

**Category** 값: `Rule` | `Record` | `Catalog` | `Matrix` | `Summary` | `Index` 만 사용.

### 19.4 Downstream Checklist

#### STEP5

- System Inventory Table (§4)
- Observation Catalog (§3.10 · §14)
- Metadata Observation Catalog (§8)
- Metadata Shape Matrix (§7)
- Registration Matrix (§13)
- Registration Fact Matrix (§15)

#### STEP6

- Metadata Shape Matrix (§7)

#### STEP7

- Metadata Shape Matrix (§7)
- Observation Catalog (§3.10 · §8 · §14)

### 19.5 Note

Frozen Assets는 **§20 STEP4 Final** 에서 선언한다.
§19는 Reference Index 역할만 유지한다.

---

## 20. STEP4 Final

### 20.1 Role

```text
Official STEP4 outputs for STEP5+.
```

본 Section은 STEP4 Inventory SSOT의 **공식 완료(Final)** 선언이다.
신규 Inventory · Observation · Asset을 생성하지 않는다.

### 20.2 Frozen Rules

다음 Rule은 **Frozen Rule** 로 선언한다.

| Frozen Rule | Section |
|-------------|---------|
| Inventory Rule | §2 |
| Observation SSOT | §3 |

### 20.3 Frozen Assets

다음 Asset은 STEP4 공식 출력이며, STEP5 이후의 공식 입력으로 사용한다.

| Frozen Asset | Section |
|--------------|---------|
| Inventory Rule | §2 |
| Observation SSOT | §3 |
| System Inventory Table | §4 |
| Observation Catalog | §3.10 · §14 |
| Metadata Observation Catalog | §8 |
| Metadata Shape Matrix | §7 |
| Registration Matrix | §13 |
| Registration Fact Matrix | §15 |
| Inventory Assets | §19 |

### 20.4 Freeze Constraints

```text
After STEP4 Final (v1.0):

• Inventory ID (SYS-001 … SYS-038) SHALL NOT change
• Observation Code (OBS-*) SHALL NOT change meaning or be reused
• Frozen Assets listed above are the official STEP5+ inputs
• New Inventory / Observation / Asset creation is out of STEP4 scope
```

### 20.5 Next Stage

```text
STEP4 Final (complete)
        ↓
STEP5 — Architecture Audit
        ↓
STEP6 — Schema Validation
        ↓
STEP7 — Standardization
```

STEP5 Entry Point: **§19 Downstream Checklist**.

---

## Completion Checklist

| 조건 | 상태 |
|------|------|
| STEP4-1 System Discovery | ✅ |
| STEP4-2 Inventory · Observation SSOT | ✅ |
| STEP4-3 Metadata Inventory | ✅ |
| STEP4-4 Registration Inventory | ✅ |
| STEP4 Inventory Assets (§19) | ✅ |
| Reference Entry Point | ✅ |
| **STEP4 Final (v1.0)** | ✅ |
| **Frozen Assets declared (§20)** | ✅ |
| Inventory ID SYS-001…038 unchanged | ✅ |
| Observation Codes unchanged / no reuse | ✅ |
| No new Inventory / Observation / Asset in Final | ✅ |
| Runtime / Registry / Loader / Contract / JSON 변경 | ✅ 없음 |

---

*End of System_Inventory.md v1.0 (STEP4 Final)*
