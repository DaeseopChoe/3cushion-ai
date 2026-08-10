# GLOSSARY_SSOT.md

```
Document       : GLOSSARY_SSOT.md
Role           : Official Terminology / Official Pipeline Expression SSOT
Authority      : Terminology
Parent Authority : Architecture Freeze for Envelope meaning
Status         : Active
Scope          : Envelope / Generator / Product / Search / Validation terminology
Out of Scope   : Architecture rule changes, algorithm, schema, API, implementation
Last Updated   : 2026-08-10
Path           : 작업관리/GLOSSARY_SSOT.md
```

---

## 0. Document Control

| Field | Value |
|-------|--------|
| **Role** | Official Terminology · Official Pipeline Expression SSOT |
| **Status** | Active |
| **Authority** | **Terminology** |
| **Parent Authority** | `Architecture/ENVELOPE_ARCHITECTURE_SSOT.md` (Architecture Freeze) — Envelope meaning · Sampling Policy · Dataset Must/Must-Not |
| **Related (non-parent)** | `Application Architecture Standard (AAS) v2.0/Architecture_Dictionary.md` — AAS Layer / Application Runtime vocabulary (병존 · 대체하지 않음) |
| **Scope** | Envelope · Generator · Product · Search · Validation terminology and Official Pipeline labels |
| **Out of Scope** | Architecture rule changes · algorithm · JSON Schema · API · code · Generator/Search/Runtime responsibility changes |

### Conflict rule (요약)

| Domain | Winner |
|--------|--------|
| Envelope 의미 · Sampling Policy · Dataset Must/Must-Not | **Architecture Freeze** |
| Official Name · Pipeline Label · Alias · 금지 표현 | **본 Glossary** |
| Current Phase · Next Mission · Carry | **PROJECT_MASTER_INDEX** (+ LOG · HANDOFF) |
| Session Checklist · Current Work | **CURSOR_SESSION_HANDOFF** |

Glossary는 Architecture Freeze를 무단으로 개정할 수 없다.

상세: §9 Conflict Resolution · §8 Document Consume Rule · §8.1 SSOT Governance.

---

## 1. Purpose and Scope

### 1.1 Purpose

본 문서는 프로젝트 전반의 **공식 용어(Terminology)** 와 **공식 Pipeline 표현**을 단일화한다.

| Goal | Statement |
|------|-----------|
| Official Name | 하나의 개념 = 하나의 Official Name |
| 한글 정의 | 동일 개념의 정의 표현을 단일화 |
| Alias / 금지 | Allowed Alias와 Do Not Use를 관리 |
| 충돌 방지 | 문서 간 임의 동의어·재정의를 금지 |
| Official Pipeline | Architecture / Product / Search Enhancement Pipeline 표현을 통합 |
| Freeze consume | Envelope 용어는 Architecture Freeze를 **cite / consume** |

### 1.2 Explicit non-claims

- Glossary는 **Architecture Rule을 재정의하지 않는다.**
- Glossary는 **Generator / Search / Runtime 책임을 변경하지 않는다.**
- Glossary는 **Schema / Code / API를 변경하지 않는다.**

### 1.3 Related dictionaries

| Document | Authority | Scope |
|----------|-----------|--------|
| **본 문서** | Terminology | Envelope · Product · Search Engine · Validation 용어 · Official Pipelines |
| `Architecture_Dictionary.md` (AAS) | AAS Architecture Vocabulary | Application Runtime · Layer · Domain naming (AAS v2.0) |

두 문서는 병존한다. AAS Layer 용어는 Dictionary · Envelope/Product/Search 용어는 본 Glossary.

---

## 2. Naming Rules

| ID | Rule |
|----|------|
| NR-01 | Official Name은 문서·세션·코드 주석 규범 문서에서 **동일하게** 사용한다. |
| NR-02 | Schema field는 **camelCase**를 유지한다 (`cueSet`, `secondSet`, `strategyRef`). |
| NR-03 | 개념명(Concept)은 PascalCase 또는 본 문서의 공식 표기를 유지한다 (`PublishedDataset`, `Product Host`). |
| NR-04 | 신규 용어는 **본 Glossary에 등록한 후** 규범 문서에서 사용한다. |
| NR-05 | 문서별 임의 동의어 생성 금지. |
| NR-06 | 레거시 용어는 반드시 **`(Legacy)`** 로 표시한다. |
| NR-07 | `PositionRecord` / `positions.json` 과 `PublishedDataset` 을 **동의어로 사용 금지**. |
| NR-08 | `Product Host` 와 `Search Runtime` 을 **동의어로 사용 금지**. |
| NR-09 | 동일 의미 Alias는 규범 문서 본문에 쓰지 않는다 (Allowed Alias 열은 참조용). |
| NR-10 | Envelope 의미 충돌 시 Freeze 우선 · Glossary는 Freeze에 맞춰 개정한다 (Freeze 무단 수정 금지). |

---

## 3. Official Terminology

각 항목 형식: Official Name · Kind · Definition · Parent / Source · Allowed Alias · Do Not Use · Notes.

---

### 3.1 Architecture / Sampling

#### Strategy

| Field | Value |
|-------|--------|
| **Official Name** | Strategy |
| **Kind** | Authoring SSOT |
| **Definition** | Modal Data와 논리 Envelope의 소유 주체. 수정 가능한 유일 Authoring 대상. |
| **Parent / Source** | Architecture Freeze §3 |
| **Allowed Alias** | — |
| **Do Not Use** | “검색용 Strategy 복사본” (Envelope에 Strategy 본문 저장 의미) |
| **Notes** | Cite Freeze. Glossary 재정의 없음. |

#### Strategy Envelope

| Field | Value |
|-------|--------|
| **Official Name** | Strategy Envelope |
| **Kind** | Logical Concept |
| **Definition** | Strategy가 논리적으로 허용하는 좌표 공간. Target(1) + Cue 축 + Second 축. **저장물 아님**. |
| **Parent / Source** | Architecture Freeze §3 · §5 |
| **Allowed Alias** | — |
| **Do Not Use** | Envelope Dataset, PublishedDataset |
| **Notes** | Strategy Envelope ≠ Envelope Dataset. |

#### Sampling Policy

| Field | Value |
|-------|--------|
| **Official Name** | Sampling Policy |
| **Kind** | Architecture Rule Set |
| **Definition** | Strategy Envelope → Envelope Dataset 변환 Rule Set. Generator와 독립인 Architecture SSOT. |
| **Parent / Source** | Architecture Freeze §6 |
| **Allowed Alias** | — |
| **Do Not Use** | Generator Rule, “Generator가 소유한 Sampling 규칙” |
| **Notes** | Generator는 Policy **실행기**. Rule 소유자 아님. |

#### Trajectory Sampling

| Field | Value |
|-------|--------|
| **Official Name** | Trajectory Sampling |
| **Kind** | Process / Concept |
| **Definition** | 원본 시스템의 계산된 실제 궤적을 Sampling Policy에 따라 분할하여, Search Engine이 소비할 파생 데이터인 **target**, **cueSet**, **secondSet**, **strategyRef**를 구성하는 과정이다. 기본 Sampling 간격은 **1.5gr**이다. |
| **Parent / Source** | Glossary (표현) · Rule 본문은 Architecture Freeze §6 |
| **Allowed Alias** | — |
| **Do Not Use** | 전체 궤적 Sampling, Cartesian Sampling, Target Sampling |
| **Notes** | Target 자체는 Sampling 대상이 **아니다** (Authoring Target 복사). Cue×Second Cartesian Product 생성·저장 금지. 상세: §4. |

#### Target

| Field | Value |
|-------|--------|
| **Official Name** | Target |
| **Kind** | Field / Axis |
| **Definition** | Strategy당 정확히 1개의 Authoring Target Point. Sampling 없음. EnvelopeRecord의 `target` 필드. |
| **Parent / Source** | Architecture Freeze SP-T-01 · SP-T-02 |
| **Allowed Alias** | — |
| **Do Not Use** | targetSet, Target Sampling |
| **Notes** | Schema field명도 문맥상 `target`. |

#### cueSet

| Field | Value |
|-------|--------|
| **Official Name** | cueSet |
| **Kind** | Schema Field (PointSet) |
| **Definition** | 큐볼에서 임펙트볼로 향하는 실제 궤적에서, 큐볼 시작점부터 임펙트볼과 연결되기 직전 **1/3 지점**까지를 **1.5gr** 간격으로 분할하여 저장한 좌표 집합(Set). |
| **Parent / Source** | Architecture Freeze §6.3 (SP-C-01…05) — **cite only** |
| **Allowed Alias** | Cue Set (서술형) |
| **Do Not Use** | cueSamples (비공식), Cartesian pair collection, Cue→Impact **전체** set |
| **Notes** | Glossary에서 Sampling Rule을 재정의하지 않는다. Freeze cite. |

#### secondSet

| Field | Value |
|-------|--------|
| **Official Name** | secondSet |
| **Kind** | Schema Field (PointSet) |
| **Definition** | C3 이후 세컨드볼을 통과한 쿠션까지 이어지는 실제 궤적에서, **C3를 시작점**으로 마지막 쿠션까지를 **1.5gr** 간격으로 분할하여 저장한 좌표 집합(Set). |
| **Parent / Source** | Architecture Freeze §6.4 · Line of Score (SP-S-01…06) — **cite only** |
| **Allowed Alias** | Second Set (서술형) |
| **Do Not Use** | secondSamples (비공식), Trajectory Extension sample, Display Cap 상한 set |
| **Notes** | Trajectory Extension 미포함. Glossary Rule 재정의 없음. |

#### Line of Score

| Field | Value |
|-------|--------|
| **Official Name** | Line of Score |
| **Kind** | Geometry Concept |
| **Definition** | Runtime `buildTrajectory`가 산출한 계산 path에서 **C3 → 마지막 유효 득점 쿠션** polyline. Extension·표시용 Hermite(CO→C1) 제외. |
| **Parent / Source** | Architecture Freeze §3 |
| **Allowed Alias** | — |
| **Do Not Use** | Extension path, Display Cap path |
| **Notes** | secondSet Sampling 구간의 논리 입력. |

#### strategyRef

| Field | Value |
|-------|--------|
| **Official Name** | strategyRef |
| **Kind** | Logical Reference (Schema Field) |
| **Definition** | EnvelopeRecord가 Strategy를 가리키는 논리 참조. Resolve 후에서만 Modal 접근. |
| **Parent / Source** | Architecture Freeze AR-16 · §11 — 구현 형태 미정 · 참조 계약만 Freeze |
| **Allowed Alias** | — |
| **Do Not Use** | strategyId를 strategyRef와 혼용 (규범 문서에서 임의 동의어 금지) |
| **Notes** | 구체 ID 형식은 Freeze Out of Scope / 후속 결정. |

#### EnvelopeRecord

| Field | Value |
|-------|--------|
| **Official Name** | EnvelopeRecord |
| **Kind** | Search Representation Record |
| **Definition** | Trajectory Sampling 결과를 저장하는 Search Representation Record. 구성: `strategyRef` · `target` · `cueSet` · `secondSet`. Modal 또는 Strategy 본문 미포함. |
| **Parent / Source** | Architecture Freeze §8 · `schemas/published_dataset.schema.json` |
| **Allowed Alias** | — |
| **Do Not Use** | PositionRecord, Strategy 복사본 |
| **Notes** | Strategy : EnvelopeRecord = 1:1 (논리). |

#### PublishedDataset

| Field | Value |
|-------|--------|
| **Official Name** | PublishedDataset |
| **Kind** | Search Representation Corpus |
| **Definition** | EnvelopeRecord 컬렉션으로 구성되는 Generator의 최종 Search Representation 산출물. Generator가 생산 · Search Engine이 소비 · **Immutable**. PositionRecord / positions.json과 **동일 객체가 아니다**. |
| **Parent / Source** | Architecture Freeze §8 · PUBLISHED_DATASET_SSOT (cite) |
| **Allowed Alias** | Envelope Dataset (Freeze 용어 · 동일 Search Representation 계열) |
| **Do Not Use** | positions.json, Position corpus, Legacy Position Corpus |
| **Notes** | 재생성 대상은 Dataset만 (Invalidate → Full Regenerate). |

#### AuthoringStrategy

| Field | Value |
|-------|--------|
| **Official Name** | AuthoringStrategy |
| **Kind** | Generator Input |
| **Definition** | Generator가 읽는 read-only Strategy Authoring 입력 (예: strategy_ref, cue, target, second). Modal body는 Generator Mission 범위 밖일 수 있음. |
| **Parent / Source** | Glossary / Generator Host contract (표현) · Authoring 권한은 Freeze Authority |
| **Allowed Alias** | — |
| **Do Not Use** | FrozenStrategy와 혼동, Search Runtime Strategy Handle과 동일시 |
| **Notes** | Generator는 Strategy 저장소를 수정하지 않는다. |

#### Modal Data

| Field | Value |
|-------|--------|
| **Official Name** | Modal Data |
| **Kind** | Authoring Payload |
| **Definition** | SYS, HP, STR, AI, Reflection, Correction 및 기타 모달·설명 데이터. Strategy에만 존재. |
| **Parent / Source** | Architecture Freeze §3 |
| **Allowed Alias** | Modal |
| **Do Not Use** | EnvelopeRecord에 Modal 저장 |
| **Notes** | Resolve **성공 후**에만 접근. |

#### Domain Rule

| Field | Value |
|-------|--------|
| **Official Name** | Domain Rule |
| **Kind** | Architecture Rule |
| **Definition** | Cue Set의 모든 원소와 Second Set의 모든 원소는 동일 Strategy 안에서 유효하다. Cue Sampling이 Impact 1/3까지로 제한되어 성립. |
| **Parent / Source** | Architecture Freeze §3 · SP-D-02 |
| **Allowed Alias** | — |
| **Do Not Use** | Cartesian pair 매칭으로 Domain Rule 대체 |
| **Notes** | Cite Freeze. |

---

### 3.2 Generator / Product

#### Generator

| Field | Value |
|-------|--------|
| **Official Name** | Generator |
| **Kind** | Producer |
| **Definition** | Sampling Policy를 **실행**하여 Envelope Dataset / PublishedDataset을 만드는 Producer. Strategy를 수정하지 않는다. |
| **Parent / Source** | Architecture Freeze §7 |
| **Allowed Alias** | Dataset Generator, Generator Host (구현 Host) |
| **Do Not Use** | Search Engine, Package Emit 주체(미구현 시) |
| **Notes** | Package Emit은 Generator 책임이 아님 (Product / Mission 02). |

#### Product Host

| Field | Value |
|-------|--------|
| **Official Name** | Product Host |
| **Kind** | Product Orchestration |
| **Definition** | Export와 Generator를 연결하는 Product 전용 Orchestration 계층. Search Runtime이 **아니다**. 계산을 직접 수행하지 않는다. Generator Host API를 호출하고 결과를 handoff한다. |
| **Parent / Source** | Glossary (Product Terminology 원 정의) · Product Phase Handoff |
| **Allowed Alias** | Export Pipeline Orchestrator (서술) |
| **Do Not Use** | Search Runtime, Application Runtime (AAS)과 동의어 |
| **Notes** | Phase 4 Mission 01 핵심 계층. |

#### Export Pipeline

| Field | Value |
|-------|--------|
| **Official Name** | Export Pipeline |
| **Kind** | Product Process |
| **Definition** | 관리자 Export 제스처에서 Product Host를 거쳐 Generator를 자동 실행하고 PublishedDataset handoff까지 이르는 Product 구간. |
| **Parent / Source** | Glossary · Product Phase Handoff Mission 01 |
| **Allowed Alias** | — |
| **Do Not Use** | “Export = positions.json만 쓰기”를 Export Pipeline 전체와 동일시 |
| **Notes** | Package emission · Deployment는 본 Pipeline 명칭에 포함하지 않음 (후속 Mission). |

#### Export Handoff Artifact

| Field | Value |
|-------|--------|
| **Official Name** | Export Handoff Artifact |
| **Kind** | Product Contract |
| **Definition** | Phase 4 Mission 01에서 Generator가 생산한 **validated PublishedDataset**을 Mission 02 Package Builder에 전달하기 위한 Product 계약. 최소 구성: `dataset` · `provenance` · `status`. Package / Manifest / Version 생성은 포함하지 않는다. |
| **Parent / Source** | Glossary (Product 원 정의) · Mission 01 Design |
| **Allowed Alias** | Handoff Artifact |
| **Do Not Use** | Published Package, package.json |
| **Notes** | `packageEmitted: false` (Mission 01). |

#### Published Package

| Field | Value |
|-------|--------|
| **Official Name** | Published Package |
| **Kind** | Delivery Unit |
| **Definition** | PublishedDataset을 감싸는 Physical Delivery Unit (Package + 연계 Manifest / Version 메타). Search Representation 의미를 packaging이 바꾸지 않는다. |
| **Parent / Source** | Architecture `PACKAGE_SSOT` · `schemas/package.schema.json` (cite) |
| **Allowed Alias** | Package |
| **Do Not Use** | PublishedDataset (동의어 금지) |
| **Notes** | Mission 02 Package Builder 산출. |

#### Package Builder

| Field | Value |
|-------|--------|
| **Official Name** | Package Builder |
| **Kind** | Product Producer (Packaging) |
| **Definition** | Export Handoff Artifact의 dataset을 입력으로 Package · Manifest · Version 및 Export Folder 산출을 조립하는 Product 계층. |
| **Parent / Source** | Glossary · Product Phase Handoff Mission 02 |
| **Allowed Alias** | — |
| **Do Not Use** | Generator, Published Dataset Builder와 혼동 |
| **Notes** | Generator의 Published Dataset Builder ≠ Package Builder. |

#### Manifest

| Field | Value |
|-------|--------|
| **Official Name** | Manifest |
| **Kind** | Metadata |
| **Definition** | Package / Dataset을 설명하는 Metadata. EnvelopeRecord·Modal을 embed하지 않는다. |
| **Parent / Source** | Architecture `MANIFEST_SSOT` (cite) |
| **Allowed Alias** | — |
| **Do Not Use** | — |
| **Notes** | Mission 02. |

#### Version

| Field | Value |
|-------|--------|
| **Official Name** | Version |
| **Kind** | Metadata |
| **Definition** | Build/Replace 식별 Metadata. Search Representation이 아니다. |
| **Parent / Source** | Architecture `VERSION_SSOT` (cite) |
| **Allowed Alias** | — |
| **Do Not Use** | — |
| **Notes** | Mission 02. |

#### Deployment Workflow

| Field | Value |
|-------|--------|
| **Official Name** | Deployment Workflow |
| **Kind** | Product Process |
| **Definition** | Export Folder → Git → Push → Vercel 등 배포 절차. Search Engine redesign이 아니다. |
| **Parent / Source** | Glossary · Product Phase Handoff Mission 03 |
| **Allowed Alias** | Deployment Flow |
| **Do Not Use** | — |
| **Notes** | Mission 03. |

---

### 3.3 Search Engine

#### Search Engine

| Field | Value |
|-------|--------|
| **Official Name** | Search Engine |
| **Kind** | Consumer Stack |
| **Definition** | PublishedDataset을 소비하여 Membership·(Enhancement)·Resolve·SearchResult에 이르는 Consumer 측 전체. Generator가 아니다. |
| **Parent / Source** | Glossary (표현) · Freeze Search Runtime chain cite |
| **Allowed Alias** | — |
| **Do Not Use** | Generator, Product Host |
| **Notes** | AAS Dictionary의 “Search Domain”과는 계층이 다름 — 혼용 시 문맥 명시. |

#### Search Runtime

| Field | Value |
|-------|--------|
| **Official Name** | Search Runtime |
| **Kind** | Orchestrator Host |
| **Definition** | Envelope Dataset만 Search Representation으로 읽고 Membership 후 Resolve로 Strategy/Modal에 도달하는 Runtime Host. **계산을 소유하지 않는 Orchestrator**. |
| **Parent / Source** | Architecture Freeze §9 · SEARCH_RUNTIME_SSOT (cite) |
| **Allowed Alias** | — |
| **Do Not Use** | Product Host, Application Runtime (AAS)과 동의어 |
| **Notes** | No Runtime calculation (Product/Search Quality 제약과 정합). |

#### Spatial Index

| Field | Value |
|-------|--------|
| **Official Name** | Spatial Index |
| **Kind** | Search Enhancement |
| **Definition** | PublishedDataset에서 파생된 공간 후보 필터. Dataset을 수정하지 않는다. |
| **Parent / Source** | Glossary · Phase 3 Complete |
| **Allowed Alias** | — |
| **Do Not Use** | — |
| **Notes** | Runtime-derived only. |

#### KDTree

| Field | Value |
|-------|--------|
| **Official Name** | KDTree |
| **Kind** | Search Enhancement |
| **Definition** | Spatial 후보에 대한 결정적 shortlist (예: 6D encoding). |
| **Parent / Source** | Glossary · Phase 3 Complete |
| **Allowed Alias** | — |
| **Do Not Use** | — |
| **Notes** | — |

#### Membership

| Field | Value |
|-------|--------|
| **Official Name** | Membership |
| **Kind** | Search Layer |
| **Definition** | 사용자 좌표가 EnvelopeRecord의 Target ∧ Cue Set ∧ Second Set에 속하는가에 대한 논리 판정. |
| **Parent / Source** | Architecture Freeze §10 |
| **Allowed Alias** | — |
| **Do Not Use** | Ranking, Resolve |
| **Notes** | Cartesian pair 매칭으로 대체 금지. |

#### Ranking

| Field | Value |
|-------|--------|
| **Official Name** | Ranking |
| **Kind** | Search Enhancement |
| **Definition** | MembershipCandidate[] → RankedCandidate[]. Deterministic score · stable sort. |
| **Parent / Source** | Glossary · Phase 3 |
| **Allowed Alias** | — |
| **Do Not Use** | Membership, Interpolation |
| **Notes** | — |

#### Interpolation

| Field | Value |
|-------|--------|
| **Official Name** | Interpolation |
| **Kind** | Search Enhancement (Refinement) |
| **Definition** | RankedCandidate[] → RefinedCandidate[]. Ranking 순서 보존 · score refinement. Modal/sysInputs 보간과는 별 개념. |
| **Parent / Source** | Glossary · Phase 3 (baseline) · Phase 5 Real Interpolation (후속) |
| **Allowed Alias** | Refinement (계층 서술) |
| **Do Not Use** | Ranking, Modal blend를 Interpolation과 동의어 |
| **Notes** | Architecture Freeze Out of Scope (알고리즘). |

#### Geometry Metrics

| Field | Value |
|-------|--------|
| **Official Name** | Geometry Metrics |
| **Kind** | Search Enhancement (Metric Producer) |
| **Definition** | RefinedCandidate + Query → geometry scores. Trajectory 생성·Sampling·Dataset patch를 수행하지 않는다. |
| **Parent / Source** | Glossary · Phase 3 |
| **Allowed Alias** | — |
| **Do Not Use** | Trajectory Generator, Geometry Engine(Foundation Context)과 혼동 |
| **Notes** | Foundation `geometry/` Context ≠ `search/geometry/` Metrics. |

#### Resolve

| Field | Value |
|-------|--------|
| **Official Name** | Resolve |
| **Kind** | Search Layer |
| **Definition** | `strategyRef` → Strategy 매핑. 성공 후에만 Modal 접근. |
| **Parent / Source** | Architecture Freeze §11 (Strategy Resolve) |
| **Allowed Alias** | Strategy Resolve |
| **Do Not Use** | Membership |
| **Notes** | Envelope에서 Modal 합성·추정 금지. |

#### SearchResult

| Field | Value |
|-------|--------|
| **Official Name** | SearchResult |
| **Kind** | Search Output Contract |
| **Definition** | Search Runtime / Enhancement orchestration의 최종 검색 결과 계약 산출물. |
| **Parent / Source** | Glossary · Foundation / Phase 3 contracts |
| **Allowed Alias** | — |
| **Do Not Use** | — |
| **Notes** | Resolve 게이트 이후 Modal 로드와 계약을 혼동하지 말 것. |

---

### 3.4 Legacy Separation

#### PositionRecord

| Field | Value |
|-------|--------|
| **Official Name** | PositionRecord `(Legacy)` |
| **Kind** | Legacy Authoring / Legacy Search Record |
| **Definition** | balls + slot strategies(Modal 포함 가능)를 담는 레거시 Position 단위 레코드. EnvelopeRecord가 아니다. |
| **Parent / Source** | Glossary (Legacy 표기) · frontend domain Position corpus |
| **Allowed Alias** | — |
| **Do Not Use** | EnvelopeRecord, PublishedDataset과 동의어 |
| **Notes** | NR-06 · NR-07. |

#### positions.json

| Field | Value |
|-------|--------|
| **Official Name** | positions.json `(Legacy leaf)` |
| **Kind** | Legacy Published Leaf File |
| **Definition** | `dataset/{shotType}/{systemLabel}/positions.json` 형태의 레거시 Position corpus 파일. Envelope PublishedDataset 파일과 동일 객체가 아니다. |
| **Parent / Source** | Glossary (Legacy) · `datasetPath` layout |
| **Allowed Alias** | — |
| **Do Not Use** | PublishedDataset |
| **Notes** | Production Legacy Search가 소비할 수 있음 · Envelope corpus와 분리. |

#### Legacy Position Corpus

| Field | Value |
|-------|--------|
| **Official Name** | Legacy Position Corpus |
| **Kind** | Legacy Dataset Concept |
| **Definition** | PositionRecord[] 기반의 레거시 published/working 검색·저장 corpus 총칭. |
| **Parent / Source** | Glossary |
| **Allowed Alias** | — |
| **Do Not Use** | PublishedDataset, Envelope Dataset |
| **Notes** | Product Dual-write / 이주 ADR과 연계 · 본 Glossary는 동의어 금지까지만 고정. |

#### Cue-Only Edit Snap

| Field | Value |
|-------|--------|
| **Official Name** | Cue-Only Edit Snap |
| **Kind** | Authoring Normalization Policy |
| **Definition** | History/Workspace에서 기존 Position을 Load한 **Edit Source** 편집 중, Target·Second가 Edit Source와 **Exact**이고 Cue Ball만 이동된 경우에 한해, Edit Source lineage의 Authoring `balls.cue` 후보 중 최근접점까지 Rg Euclidean 거리 **d ≤ 0.5**이면 Cue를 그 중심으로 SNAP하는 Authoring-side normalization. |
| **Parent / Source** | Glossary (Authoring policy) · `HISTORY/PROJECT_LOG_2026-08.md` (Phase 5 Preparation) · Code: `frontend/src/domain/cueEditSnap.ts` |
| **Allowed Alias** | Cue Edit Snap (서술) |
| **Do Not Use** | Search tolerance, Membership/KDTree/Ranking/Interpolation tolerance, cueSet Snap, 전역 Position proximity merge |
| **Notes** | **Cue Edit Snap Tolerance = 0.5 Rg** (inclusive). Edit Source 없으면 적용 금지. `cueSet` / Trajectory Sampling samples는 Snap 후보가 **아니다** (Freeze SP-C-* cite · 재정의 금지). |

#### Exact Position Replacement

| Field | Value |
|-------|--------|
| **Official Name** | Exact Position Replacement |
| **Kind** | Authoring Normalization Policy |
| **Definition** | Cue+Target+Second **Exact 6-coordinate** identity가 동일한 Authoring `PositionRecord`에 대해 신규 저장본이 기존 동일 Position을 대체하는 정책 (**Latest Write Wins**). 근접하나 Exact가 아닌 Position은 독립 보존한다. |
| **Parent / Source** | Glossary · Phase 5 Preparation LOG · `positionMergeEngine.ts` Exact upsert |
| **Allowed Alias** | Exact 3-Ball Position Replacement (서술) |
| **Do Not Use** | `createPositionId` 양자화만으로 equality 판정, 전역 `MERGE_EPSILON` proximity merge, PublishedDataset in-place patch/delete |
| **Notes** | SNAP 후 balls를 Exact로 확정한 뒤 `positionId`를 재계산한다. History는 append-only. Published corpus는 Export → Generator **Full Regenerate**로만 갱신. |

#### Edit Source

| Field | Value |
|-------|--------|
| **Official Name** | Edit Source |
| **Kind** | Authoring Session Concept |
| **Definition** | History/Workspace Snapshot Load 시 세션에 유지하는 편집 출처 context. `WorkspaceSnapshot.id` 기반 · load-time balls · lineage Cue candidates. Schema 필드가 아니다. |
| **Parent / Source** | Glossary · Cue-Only Edit Snap |
| **Allowed Alias** | — |
| **Do Not Use** | strategyRef, PublishedDataset identity와 동의어 |
| **Notes** | Cue-Only Edit Snap gate에 필수. |

---

## 4. Trajectory Sampling Detail

### 4.1 Official definition (재확인)

**Trajectory Sampling**은 원본 시스템의 계산된 실제 궤적을 Sampling Policy에 따라 분할하여 Search Engine이 소비할 파생 데이터인 **target**, **cueSet**, **secondSet**, **strategyRef**를 구성하는 과정이다.

- 기본 Sampling 간격: **1.5gr**
- **Target**은 Sampling 대상이 **아니다** — Strategy당 하나의 Authoring Target을 사용(복사)한다.
- Cue×Second **Cartesian Product**는 생성하거나 저장하지 않는다.

Sampling **Rule**의 규범 본문은 Architecture Freeze §6이다. 본 절은 표현·흐름만 고정한다.

### 4.2 Sampling Detail View (공식 흐름)

```text
관리자 입력
    ↓
원본 시스템
(볼 3개 위치 + 계산된 실제 궤적)
    ↓
Trajectory Sampling
    ├─ target        ← Authoring Target 복사 (Sampling 아님)
    ├─ cueSet        ← Cue→Impact 1/3 · 1.5gr (Freeze SP-C-*)
    ├─ secondSet     ← C3→Line of Score · 1.5gr (Freeze SP-S-*)
    └─ strategyRef   ← Strategy 논리 참조
    ↓
EnvelopeRecord
    ↓
PublishedDataset
```

### 4.3 Sampling Detail — 금지 표현

| Forbidden | Reason |
|-----------|--------|
| Cartesian Sampling / Cue×Second product 저장 | Freeze SP-D-01 |
| 전체 궤적(Cue→Impact 전체) Sampling | Freeze SP-C-02 |
| Target Sampling / targetSet | Freeze SP-T-01 |
| secondSet에 Trajectory Extension 포함 | Freeze SP-S-02 |
| Display Cap을 Envelope 상한으로 사용 | Freeze §6.4 |

---

## 5. Official Pipelines

Pipeline은 **하나로 합치지 않는다.** 다음 세 종류만 Official Pipeline이다.

### 5.1 Architecture Chain

**Source:** Architecture Freeze (cite · 의미 재정의 없음)

```text
Strategy
  → Strategy Envelope
  → Sampling Policy
  → Generator
  → Envelope Dataset / PublishedDataset
  → Search Runtime
  → Membership
  → Resolve
  → Modal
```

(Package → Manifest → Version → Loader는 Freeze/Architecture Index의 packaging·loader 구간이며, Search Representation 의미를 바꾸지 않는다.)

### 5.2 Product Pipeline — Phase 4

**Source:** Glossary (Product 원 정의) · Product Phase Handoff

```text
Authoring Save
  → Export
  → Product Host
  → Generator
  → PublishedDataset
  → Export Handoff Artifact
  → Package Builder
  → Deployment
```

### 5.3 Search Enhancement Pipeline — Phase 3 Complete

**Source:** Glossary (Phase 3 표현) · Search Quality Report cite

```text
PublishedDataset
  → Spatial Index
  → KDTree
  → Membership
  → Ranking
  → Interpolation
  → Geometry Metrics
  → Resolve
  → SearchResult
```

---

## 6. Forbidden Confusions

| ≠ | Statement |
|---|-----------|
| Strategy Envelope ≠ Envelope Dataset | Logical vs Search Representation |
| EnvelopeRecord ≠ PositionRecord | Envelope vs Legacy |
| PublishedDataset ≠ positions.json | Envelope corpus vs Legacy leaf |
| Product Host ≠ Search Runtime | Product orchestration vs Search orchestration |
| Generator ≠ Search Engine | Producer vs Consumer |
| Geometry Metrics ≠ Trajectory Generator | Metrics vs Trajectory production |
| Ranking ≠ Membership | Score order vs set membership |
| Interpolation ≠ Ranking | Refinement vs ranking |
| Resolve ≠ Membership | strategyRef→Strategy vs axis membership |
| Target ≠ targetSet | Single authoring point vs sampled set |
| cueSet ≠ Cartesian pair collection | PointSet axis ≠ Cue×Second pairs |
| secondSet ≠ Trajectory Extension sample | Line of Score only |
| Published Package ≠ PublishedDataset | Delivery wrap ≠ corpus |
| Sampling Policy ≠ Generator | Rule SSOT ≠ Producer |
| Envelope Dataset ≠ Strategy / Modal | Search Representation ≠ Authoring |
| Cue-Only Edit Snap ≠ Search / Interpolation tolerance | Authoring SAVE normalization only · 0.5 Rg not reusable as Search ε |
| Exact Position Replacement ≠ proximity merge | Exact 6-coordinate only · near Positions preserved |
| cueSet ≠ Cue Snap candidate | Freeze Sampling set ≠ Authoring lineage Cue centers |

---

## 7. Document Consume Rule

```text
All official terminology and Official Pipeline labels shall follow
작업관리/GLOSSARY_SSOT.md.

Envelope meaning, Sampling Policy, Membership, Resolve and Dataset
Must/Must-Not rules are defined by Architecture Freeze.
Glossary cites those rules and does not redefine them.

Do not paste full Glossary definitions into Handoff or Mission documents.
Use the official term and cite the relevant Glossary section.
```

권장 banner (신규·개정 문서 상단):

> 본 문서는 `작업관리/GLOSSARY_SSOT.md`의 공식 용어·Official Pipeline 표현을 따른다.

---

## 8. SSOT Governance Rule

새로운 SSOT 문서는 반드시 다음 Authority 중 **하나에** 속해야 한다.

| # | Authority | 예 |
|---|-----------|-----|
| 1 | **Status** | `PROJECT_MASTER_INDEX.md` |
| 2 | **Structure** | `Architecture/*` Freeze suite |
| 3 | **Terminology** | **본 문서 `GLOSSARY_SSOT.md`** |
| 4 | **Operations** | `CURSOR_SESSION_HANDOFF.md` · Product Phase Handoff |
| 5 | **History** | `HISTORY/PROJECT_LOG_YYYY-MM.md` |

### 금지 — Terminology 중복 SSOT

다음(및 유사) 문서를 **별도 SSOT로 신설하지 않는다.** 내용은 본 Glossary에 통합한다.

- `SEARCH_TERMINOLOGY.md`
- `PIPELINE_GLOSSARY.md`
- `DATASET_GLOSSARY.md`

---

## 9. Conflict Resolution

| Conflict domain | Priority |
|-----------------|----------|
| Envelope 의미 / Sampling Policy / Dataset Must–Must-Not | **Architecture Freeze** |
| Official Name / Pipeline Label / Alias / 금지 표현 | **GLOSSARY_SSOT** |
| Current Phase / Next Mission / Carry | **PROJECT_MASTER_INDEX** → `PROJECT_LOG` · `CURSOR_SESSION_HANDOFF`로 보강 |
| Session Checklist / Current Work | **CURSOR_SESSION_HANDOFF** |

Glossary는 Architecture Freeze를 무단으로 개정할 수 없다.  
Freeze와 용어 표현이 어긋나면 Glossary를 Freeze에 **맞춰** 개정한다.

---

## 10. Change Policy

| Allowed | Forbidden |
|---------|-----------|
| 본 Glossary 용어·Pipeline·Alias 개정 (Terminology Authority) | `Architecture/**` 본문 무단 수정 |
| Freeze cite 갱신 (Freeze 개정 **이후**) | Generator / Search / Runtime 책임 변경 문서화로 위장 |
| Legacy 표기 추가 | Schema / API를 Glossary만으로 변경 |

개정 시 Status/History 문서에 한 줄 기록하는 것을 권장한다 (본 Step 범위 밖).

---

## 11. Index — Official Names (quick list)

**Architecture / Sampling:** Strategy · Strategy Envelope · Sampling Policy · Trajectory Sampling · Target · cueSet · secondSet · Line of Score · strategyRef · EnvelopeRecord · PublishedDataset · AuthoringStrategy · Modal Data · Domain Rule  

**Generator / Product:** Generator · Product Host · Export Pipeline · Export Handoff Artifact · Published Package · Package Builder · Manifest · Version · Deployment Workflow · Cue-Only Edit Snap · Exact Position Replacement · Edit Source  

**Search Engine:** Search Engine · Search Runtime · Spatial Index · KDTree · Membership · Ranking · Interpolation · Geometry Metrics · Resolve · SearchResult  

**Legacy:** PositionRecord `(Legacy)` · positions.json `(Legacy leaf)` · Legacy Position Corpus  

**Official Pipelines:** Architecture Chain · Product Pipeline (Phase 4) · Search Enhancement Pipeline (Phase 3 Complete)

---

*End of GLOSSARY_SSOT.md — 2026-08-10 · Terminology Authority · Envelope meaning Parent = Architecture Freeze*
